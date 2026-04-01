from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.modules.transfers.model import Transfer
from app.schemas.transfer import TransferResponse

router = APIRouter(prefix="/transfers", tags=["transfers"])


@router.get("/", response_model=list[TransferResponse])
async def list_transfers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Transfer)
        .where(Transfer.deleted_at == None)  # noqa: E711
        .order_by(Transfer.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{transfer_id}", response_model=TransferResponse)
async def get_transfer(transfer_id: str, db: AsyncSession = Depends(get_db)):
    transfer = await db.get(Transfer, transfer_id)
    if not transfer or transfer.deleted_at:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return transfer
