from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TransactionCreate(BaseModel):
    id: str
    type: str  # income | expense | transfer
    sub_type: Optional[str] = None  # initial | borrow | lent | sent_to
    to_recipient: Optional[str] = None  # used with sent_to sub_type
    amount: float
    currency: str = "BDT"
    account_id: str
    category: Optional[str] = None
    note: Optional[str] = None


class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    sub_type: Optional[str] = None
    to_recipient: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    account_id: Optional[str] = None
    category: Optional[str] = None
    note: Optional[str] = None
    restore: Optional[bool] = None


class TransactionResponse(BaseModel):
    id: str
    type: str
    sub_type: Optional[str]
    to_recipient: Optional[str]
    amount: float
    currency: str
    account_id: str
    category: Optional[str]
    note: Optional[str]
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]

    model_config = {"from_attributes": True}
