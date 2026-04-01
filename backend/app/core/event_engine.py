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
from app.modules.transfers.model import Transfer
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
    elif payload.entity == "transfer":
        await _handle_transfer(payload, db)
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
            existing.sub_type = data.get("sub_type")
            existing.to_recipient = data.get("to_recipient")
            existing.amount = data["amount"]
            existing.currency = data.get("currency", "BDT")
            existing.account_id = data["account_id"]
            existing.category = data.get("category")
            existing.note = data.get("note")
            existing.deleted_at = None
            existing.updated_at = datetime.utcnow()
        else:
            txn = Transaction(
                id=data["id"],
                type=data["type"],
                sub_type=data.get("sub_type"),
                to_recipient=data.get("to_recipient"),
                amount=data["amount"],
                currency=data.get("currency", "BDT"),
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
                    "type", "sub_type", "to_recipient",
                    "amount", "currency",
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


async def _handle_transfer(payload: EventPayload, db: AsyncSession):
    import uuid
    data = payload.data

    if payload.action == "insert":
        from_account_id = data["from_account_id"]
        to_account_id = data["to_account_id"]
        from_amount = float(data["from_amount"])
        to_amount = float(data["to_amount"])
        charge = float(data.get("charge", 0))
        from_currency = data.get("from_currency", "BDT")
        to_currency = data.get("to_currency", "BDT")
        note = data.get("note", "")
        transfer_id = data["id"]

        # Overspend check: sender pays amount + charge
        total_debit = from_amount + charge
        balance = await _get_account_balance(from_account_id, db)
        if total_debit > balance:
            raise ValueError(
                f"Insufficient balance: account has {balance:.2f}"
                f" but transfer needs {total_debit:.2f}"
                f" ({from_amount:.2f} + {charge:.2f} charge)"
            )

        debit_txn_id = str(uuid.uuid4())
        credit_txn_id = str(uuid.uuid4())

        # Debit sender: from_amount + charge
        db.add(Transaction(
            id=debit_txn_id,
            type="transfer",
            amount=total_debit,
            currency=from_currency,
            account_id=from_account_id,
            category="Transfer Out",
            note=f"Transfer to {to_account_id[:8]}… | {note}".strip(" |"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        ))

        # Credit receiver: to_amount
        db.add(Transaction(
            id=credit_txn_id,
            type="income",
            amount=to_amount,
            currency=to_currency,
            account_id=to_account_id,
            category="Transfer In",
            note=f"Transfer from {from_account_id[:8]}… | {note}".strip(" |"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        ))

        db.add(Transfer(
            id=transfer_id,
            from_account_id=from_account_id,
            to_account_id=to_account_id,
            from_amount=from_amount,
            from_currency=from_currency,
            to_amount=to_amount,
            to_currency=to_currency,
            charge=charge,
            note=note,
            debit_txn_id=debit_txn_id,
            credit_txn_id=credit_txn_id,
            created_at=datetime.utcnow(),
        ))

    elif payload.action == "delete":
        transfer = await db.get(Transfer, payload.target_id)
        if transfer and not transfer.deleted_at:
            # Soft-delete the transfer and reverse both transactions
            transfer.deleted_at = datetime.utcnow()
            debit = await db.get(Transaction, transfer.debit_txn_id)
            credit = await db.get(Transaction, transfer.credit_txn_id)
            now = datetime.utcnow()
            if debit:
                debit.deleted_at = now
                debit.updated_at = now
            if credit:
                credit.deleted_at = now
                credit.updated_at = now
