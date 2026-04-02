from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TransferResponse(BaseModel):
    id: str
    from_account_id: str
    to_account_id: str
    from_amount: float
    from_currency: str
    to_amount: float
    to_currency: str
    charge: float
    note: Optional[str]
    debit_txn_id: str
    credit_txn_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime]

    model_config = {"from_attributes": True}
