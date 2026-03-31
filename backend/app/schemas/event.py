from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


class EventPayload(BaseModel):
    event_id: str
    action: str        # insert | update | delete
    entity: str        # transaction | account
    target_id: Optional[str] = None
    data: dict[str, Any]
    source: str = "app"  # discord | app


class EventResponse(BaseModel):
    event_id: str
    source: str
    action: str
    entity: str
    target_id: Optional[str]
    payload: dict
    created_at: datetime

    model_config = {"from_attributes": True}
