from datetime import datetime
from sqlalchemy import String, Enum, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(Enum("cash", "bank", "card"), nullable=False)
    parent_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
