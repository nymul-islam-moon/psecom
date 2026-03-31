"""
Event Engine: processes incoming events and dispatches to the correct handler.
Enforces idempotency (duplicate event_id = ignore) and routes insert/update/delete.
"""
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.events.model import Event
from app.modules.accounts.model import Account
from app.modules.transactions.model import Transaction
from app.schemas.event import EventPayload


class DuplicateEventError(Exception):
    pass


async def process_event(payload: EventPayload, db: AsyncSession) -> Event:
    # Idempotency: ignore if event_id already exists
    existing = await db.get(Event, payload.event_id)
    if existing:
        raise DuplicateEventError(f"Event {payload.event_id} already processed")

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
            # Special restore flag: clear deleted_at
            if data.get("restore"):
                txn.deleted_at = None
            else:
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
        # Accounts don't have deleted_at — remove from state (event log still has it)
        account = await db.get(Account, payload.target_id)
        if account:
            await db.delete(account)
