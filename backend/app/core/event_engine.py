"""
Event Engine: processes incoming events and dispatches to the correct handler.
Enforces idempotency (duplicate event_id = ignore) and routes
insert/update/delete.
"""
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.events.model import Event
from app.modules.accounts.model import Account
from app.modules.transactions.model import Transaction
from app.schemas.event import EventPayload


async def _get_account_balance(account_id: str, db: AsyncSession, exclude_txn_id: str | None = None) -> float:
    """Calculate current balance for an account."""
    income_q = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.account_id == account_id,
        Transaction.type == "income",
        Transaction.deleted_at == None,  # noqa: E711
    )
    expense_q = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.account_id == account_id,
        Transaction.type.in_(["expense", "transfer"]),
        Transaction.deleted_at == None,  # noqa: E711
    )
    if exclude_txn_id:
        income_q  = income_q.where(Transaction.id != exclude_txn_id)
        expense_q = expense_q.where(Transaction.id != exclude_txn_id)
    income  = float((await db.execute(income_q)).scalar() or 0)
    expense = float((await db.execute(expense_q)).scalar() or 0)
    return income - expense


class DuplicateEventError(Exception):
    pass


async def process_event(
    payload: EventPayload, db: AsyncSession
) -> Event:
    # Idempotency: ignore if event_id already exists
    existing = await db.get(Event, payload.event_id)
    if existing:
        raise DuplicateEventError(
            f"Event {payload.event_id} already processed"
        )

    # Record the event
    event = Event(
        event_id=payload.event_id,
        source=payload.source,
        action=payload.action,
        entity=payload.entity,
        target_id=payload.target_id,
        payload=payload.data,
        created_at=datetime.utcnow(),
    )
    db.add(event)

    # Dispatch to entity handler
    if payload.entity == "transaction":
        await _handle_transaction(payload, db)
    elif payload.entity == "account":
        await _handle_account(payload, db)
    else:
        raise ValueError(f"Unknown entity: {payload.entity}")

    await db.commit()
    await db.refresh(event)
    return event


async def _handle_transaction(payload: EventPayload, db: AsyncSession):
    data = payload.data

    if payload.action == "insert":
        # Overspend check for expense/transfer
        if data.get("type") in ("expense", "transfer") and data.get("account_id"):
            balance = await _get_account_balance(data["account_id"], db)
            amount  = float(data.get("amount", 0))
            if amount > balance:
                raise ValueError(
                    f"Insufficient balance: account has {balance:.2f} but expense is {amount:.2f}"
                )

        existing = await db.get(Transaction, data["id"])
        if existing:
            # Was soft-deleted — restore and update fields
            existing.type = data["type"]
            existing.amount = data["amount"]
            existing.currency = data.get("currency", "USD")
            existing.account_id = data["account_id"]
            existing.category = data.get("category")
            existing.note = data.get("note")
            existing.deleted_at = None
            existing.updated_at = datetime.utcnow()
        else:
            txn = Transaction(
                id=data["id"],
                type=data["type"],
                amount=data["amount"],
                currency=data.get("currency", "USD"),
                account_id=data["account_id"],
                category=data.get("category"),
                note=data.get("note"),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(txn)

    elif payload.action == "update":
        txn = await db.get(Transaction, payload.target_id)
        if txn:
            if data.get("restore"):
                txn.deleted_at = None
            else:
                # Overspend check if changing to expense/transfer
                new_type   = data.get("type", txn.type)
                new_amount = float(data.get("amount", txn.amount))
                acct_id    = data.get("account_id", txn.account_id)
                if new_type in ("expense", "transfer"):
                    balance = await _get_account_balance(acct_id, db, exclude_txn_id=txn.id)
                    if new_amount > balance:
                        raise ValueError(
                            f"Insufficient balance: account has {balance:.2f} but expense is {new_amount:.2f}"
                        )
                for field in (
                    "type", "amount", "currency",
                    "account_id", "category", "note"
                ):
                    if field in data:
                        setattr(txn, field, data[field])
            txn.updated_at = datetime.utcnow()

    elif payload.action == "delete":
        txn = await db.get(Transaction, payload.target_id)
        if txn:
            txn.deleted_at = datetime.utcnow()
            txn.updated_at = datetime.utcnow()


async def _handle_account(payload: EventPayload, db: AsyncSession):
    data = payload.data

    if payload.action == "insert":
        existing = await db.get(Account, data["id"])
        if existing:
            # Was soft-deleted — restore and update fields
            existing.name = data["name"]
            existing.type = data["type"]
            existing.parent_id = data.get("parent_id")
            existing.currency = data.get("currency", "USD")
            existing.meta = data.get("meta")
            existing.deleted_at = None
        else:
            account = Account(
                id=data["id"],
                name=data["name"],
                type=data["type"],
                parent_id=data.get("parent_id"),
                currency=data.get("currency", "USD"),
                meta=data.get("meta"),
                created_at=datetime.utcnow(),
            )
            db.add(account)

    elif payload.action == "update":
        account = await db.get(Account, payload.target_id)
        if account:
            for field in ("name", "type", "parent_id", "currency", "meta"):
                if field in data:
                    setattr(account, field, data[field])

    elif payload.action == "delete":
        account = await db.get(Account, payload.target_id)
        if account:
            account.deleted_at = datetime.utcnow()
