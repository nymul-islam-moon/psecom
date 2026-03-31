from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.modules.accounts.model import Account
from app.schemas.account import AccountResponse

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/", response_model=list[AccountResponse])
async def list_accounts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Account)
        .where(Account.deleted_at == None)  # noqa: E711
        .order_by(Account.created_at)
    )
    return result.scalars().all()


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str, db: AsyncSession = Depends(get_db)
):
    account = await db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


class BalanceResponse(BaseModel):
    account_id: str
    balance: float
    income: float
    expense: float


@router.get("/{account_id}/balance", response_model=BalanceResponse)
async def get_account_balance(
    account_id: str, db: AsyncSession = Depends(get_db)
):
    from app.modules.transactions.model import Transaction

    account = await db.get(Account, account_id)
    if not account or account.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Account not found")

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
    income  = float(income_r.scalar() or 0)
    expense = float(expense_r.scalar() or 0)
    return BalanceResponse(account_id=account_id, balance=income - expense, income=income, expense=expense)
