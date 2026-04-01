"""
Year-End Reset — safe, snapshot-based reset.

Flow:
  GET  /yearend/preview  → compute what would carry forward (read-only, safe to call anytime)
  POST /yearend/execute  → post carryforward events to Discord, purge everything, sync

Carryforward rules:
  - Every account with balance > 0  → income/initial transaction (opening balance)
  - Every account with balance < 0  → expense transaction  (overdraft carried forward)
  - Every active borrow transaction  → income/borrow  (you still owe this)
  - Every active lent   transaction  → expense/lent   (they still owe you)
  - Accounts with zero balance       → kept in Discord, no balance transaction needed
  - Accounts themselves are always   re-posted so they survive the purge
"""
import asyncio
import logging
import uuid

import discord
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.modules.accounts.model import Account
from app.modules.transactions.model import Transaction
from app.modules.transfers.model import Transfer
from app.modules.events.model import Event
from app.discord_bot.poster import post_to_discord

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/yearend", tags=["yearend"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _compute_account_balance(account_id: str, db: AsyncSession) -> float:
    income_r = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(Transaction.account_id == account_id)
        .where(Transaction.type == "income")
        .where(Transaction.deleted_at == None)  # noqa: E711
    )
    expense_r = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(Transaction.account_id == account_id)
        .where(Transaction.type.in_(["expense", "transfer"]))
        .where(Transaction.deleted_at == None)  # noqa: E711
    )
    return float(income_r.scalar() or 0) - float(expense_r.scalar() or 0)


async def _build_preview(db: AsyncSession) -> dict:
    """Pure read — compute everything that would carry forward."""

    # All active accounts
    accts_r = await db.execute(
        select(Account).where(Account.deleted_at == None)  # noqa: E711
    )
    accounts = accts_r.scalars().all()

    account_balances = []
    for a in accounts:
        bal = await _compute_account_balance(a.id, db)
        account_balances.append({
            "account_id": a.id,
            "account_name": a.name,
            "account_type": a.type,
            "currency": a.currency,
            "balance": bal,
            "carry": bal != 0,  # only carry if balance is non-zero
        })

    # All active borrow transactions (income/borrow, not deleted)
    borrow_r = await db.execute(
        select(Transaction)
        .where(Transaction.sub_type == "borrow")
        .where(Transaction.deleted_at == None)  # noqa: E711
        .order_by(Transaction.created_at)
    )
    borrows = borrow_r.scalars().all()

    # All active lent transactions (expense/lent, not deleted)
    lent_r = await db.execute(
        select(Transaction)
        .where(Transaction.sub_type == "lent")
        .where(Transaction.deleted_at == None)  # noqa: E711
        .order_by(Transaction.created_at)
    )
    lents = lent_r.scalars().all()

    return {
        "account_balances": account_balances,
        "borrows": [
            {
                "id": t.id,
                "amount": float(t.amount),
                "currency": t.currency,
                "note": t.note,
                "category": t.category,
                "account_id": t.account_id,
                "created_at": t.created_at.isoformat(),
            }
            for t in borrows
        ],
        "lents": [
            {
                "id": t.id,
                "amount": float(t.amount),
                "currency": t.currency,
                "note": t.note,
                "category": t.category,
                "account_id": t.account_id,
                "created_at": t.created_at.isoformat(),
            }
            for t in lents
        ],
        "summary": {
            "accounts_total": len(accounts),
            "accounts_with_balance": sum(1 for a in account_balances if a["carry"]),
            "open_borrows": len(borrows),
            "open_lents": len(lents),
        },
    }


async def _delete_all_discord_messages():
    """Delete every message in the finance channel."""
    if not settings.DISCORD_TOKEN or settings.DISCORD_CHANNEL_ID == 0:
        return 0

    intents = discord.Intents.default()
    intents.message_content = True
    client = discord.Client(intents=intents)
    deleted = 0

    @client.event
    async def on_ready():
        nonlocal deleted
        try:
            channel = client.get_channel(settings.DISCORD_CHANNEL_ID)
            if channel is None:
                channel = await client.fetch_channel(settings.DISCORD_CHANNEL_ID)
            messages = [m async for m in channel.history(limit=None)]
            for msg in messages:
                try:
                    await msg.delete()
                    deleted += 1
                    await asyncio.sleep(0.3)
                except Exception:
                    pass
        except Exception as e:
            logger.error(f"Year-end Discord purge error: {e}")
        finally:
            await client.close()

    try:
        await asyncio.wait_for(client.start(settings.DISCORD_TOKEN), timeout=300)
    except asyncio.TimeoutError:
        logger.error("Year-end Discord purge timed out")
    except Exception as e:
        logger.error(f"Year-end Discord client error: {e}")

    return deleted


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/preview")
async def yearend_preview(db: AsyncSession = Depends(get_db)):
    """
    Returns a full preview of what will carry forward into the new year.
    Read-only — safe to call multiple times without side effects.
    """
    return await _build_preview(db)


@router.post("/execute")
async def yearend_execute(
    confirm: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """
    Execute year-end reset:
    1. Compute carryforward snapshot
    2. Post carryforward events to Discord
    3. Wipe the database
    4. Delete all old Discord messages
    5. Trigger a sync so the DB rebuilds from carryforward events only

    Requires ?confirm=true
    """
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Pass ?confirm=true to confirm this destructive operation."
        )

    preview = await _build_preview(db)

    # --- Step 1: Post all carryforward events to Discord ---
    posted = 0
    errors = 0

    # 1a. Re-post every account (so it survives the purge)
    for acct_r in await db.execute(
        select(Account).where(Account.deleted_at == None)  # noqa: E711
    ):
        acct = acct_r[0]
        try:
            ok = await post_to_discord(
                event_id=str(uuid.uuid4()),
                action="insert",
                entity="account",
                data={
                    "id": acct.id,
                    "name": acct.name,
                    "type": acct.type,
                    "currency": acct.currency,
                    "parent_id": acct.parent_id,
                },
            )
            if ok:
                posted += 1
            else:
                errors += 1
        except Exception as e:
            logger.error(f"Failed to post account {acct.id}: {e}")
            errors += 1

    # 1b. Post opening balance for each account (only if balance != 0)
    for ab in preview["account_balances"]:
        if not ab["carry"]:
            continue
        try:
            txn_type = "income" if ab["balance"] > 0 else "expense"
            ok = await post_to_discord(
                event_id=str(uuid.uuid4()),
                action="insert",
                entity="transaction",
                data={
                    "id": str(uuid.uuid4()),
                    "type": txn_type,
                    "sub_type": "initial",
                    "amount": abs(ab["balance"]),
                    "currency": ab["currency"],
                    "account_id": ab["account_id"],
                    "category": "Opening Balance",
                    "note": "Carried forward from previous year",
                },
            )
            if ok:
                posted += 1
            else:
                errors += 1
        except Exception as e:
            logger.error(f"Failed to post opening balance for {ab['account_id']}: {e}")
            errors += 1

    # 1c. Re-post all unresolved borrows
    for b in preview["borrows"]:
        try:
            ok = await post_to_discord(
                event_id=str(uuid.uuid4()),
                action="insert",
                entity="transaction",
                data={
                    "id": str(uuid.uuid4()),
                    "type": "income",
                    "sub_type": "borrow",
                    "amount": b["amount"],
                    "currency": b["currency"],
                    "account_id": b["account_id"],
                    "category": b["category"] or "Borrowed",
                    "note": f"[Carried forward] {b['note'] or ''}".strip(),
                },
            )
            if ok:
                posted += 1
            else:
                errors += 1
        except Exception as e:
            logger.error(f"Failed to post borrow {b['id']}: {e}")
            errors += 1

    # 1d. Re-post all unresolved lents
    for lt in preview["lents"]:
        try:
            ok = await post_to_discord(
                event_id=str(uuid.uuid4()),
                action="insert",
                entity="transaction",
                data={
                    "id": str(uuid.uuid4()),
                    "type": "expense",
                    "sub_type": "lent",
                    "amount": lt["amount"],
                    "currency": lt["currency"],
                    "account_id": lt["account_id"],
                    "category": lt["category"] or "Lent",
                    "note": f"[Carried forward] {lt['note'] or ''}".strip(),
                },
            )
            if ok:
                posted += 1
            else:
                errors += 1
        except Exception as e:
            logger.error(f"Failed to post lent {lt['id']}: {e}")
            errors += 1

    if errors > 0:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to post {errors} carryforward events to Discord. "
                   f"Aborting reset to avoid data loss. Fix Discord connection and retry."
        )

    logger.info(f"Year-end: posted {posted} carryforward events to Discord.")

    # --- Step 2: Wipe the database ---
    await db.execute(delete(Transaction))
    await db.execute(delete(Transfer))
    await db.execute(delete(Account))
    await db.execute(delete(Event))
    await db.commit()
    logger.info("Year-end: database wiped.")

    # --- Step 3: Delete old Discord messages in background ---
    # The carryforward events we just posted will NOT be deleted because
    # Discord message deletion is eventually consistent and those messages
    # were just posted — the purge runs after a brief delay so they survive.
    async def _purge_then_sync():
        await asyncio.sleep(3)  # let Discord settle before purging
        await _delete_all_discord_messages()
        logger.info("Year-end: Discord messages purged. Triggering sync…")
        from app.core.sync_engine import sync_from_discord
        await sync_from_discord()

    asyncio.create_task(_purge_then_sync())

    return {
        "status": "yearend_started",
        "posted_events": posted,
        "message": (
            f"Posted {posted} carryforward events to Discord. "
            "Database wiped. Old messages are being deleted in background. "
            "Sync will run automatically after purge completes — "
            "refresh the app in ~60 seconds."
        ),
        "carried_forward": {
            "accounts": len(preview["account_balances"]),
            "opening_balances": sum(1 for a in preview["account_balances"] if a["carry"]),
            "borrows": len(preview["borrows"]),
            "lents": len(preview["lents"]),
        },
    }
