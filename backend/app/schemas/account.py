from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AccountCreate(BaseModel):
    id: str
    name: str
    type: str  # cash | bank | card
    parent_id: Optional[str] = None
    currency: str = "USD"
    meta: Optional[dict] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    parent_id: Optional[str] = None
    currency: Optional[str] = None
    meta: Optional[dict] = None


class AccountResponse(BaseModel):
    id: str
    name: str
    type: str
    parent_id: Optional[str]
    currency: str
    meta: Optional[dict]
    created_at: datetime
    deleted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
