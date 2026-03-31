from datetime import datetime
from sqlalchemy import String, Enum, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Event(Base):
    __tablename__ = "events"

    event_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    source: Mapped[str] = mapped_column(Enum("discord", "app"), nullable=False)
    action: Mapped[str] = mapped_column(Enum("insert", "update", "delete"), nullable=False)
    entity: Mapped[str] = mapped_column(Enum("transaction", "account"), nullable=False)
    target_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
