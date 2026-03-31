from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TransactionCreate(BaseModel):
    id: str
    type: str  # income | expense | transfer
    amount: float
    currency: str = "USD"
    account_id: str
    category: Optional[str] = None
    note: Optional[str] = None


class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    account_id: Optional[str] = None
    category: Optional[str] = None
    note: Optional[str] = None


class TransactionResponse(BaseModel):
    id: str
    type: str
    amount: float
    currency: str
    account_id: str
    category: Optional[str]
    note: Optional[str]
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]

    model_config = {"from_attributes": True}
