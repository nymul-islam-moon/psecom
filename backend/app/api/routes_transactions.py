from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.modules.transactions.model import Transaction
from app.schemas.transaction import TransactionResponse

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/", response_model=list[TransactionResponse])
async def list_transactions(
    include_deleted: bool = False,
    type: Optional[str] = Query(None),
    account_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    q = select(Transaction)
    if not include_deleted:
        q = q.where(Transaction.deleted_at == None)
    if type:
        q = q.where(Transaction.type == type)
    if account_id:
        q = q.where(Transaction.account_id == account_id)
    if category:
        q = q.where(Transaction.category == category)
    q = q.order_by(Transaction.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/deleted", response_model=list[TransactionResponse])
async def list_deleted_transactions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Transaction).where(Transaction.deleted_at != None).order_by(Transaction.deleted_at.desc())
    )
    return result.scalars().all()


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(transaction_id: str, db: AsyncSession = Depends(get_db)):
    txn = await db.get(Transaction, transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn
