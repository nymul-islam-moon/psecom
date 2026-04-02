from datetime import datetime
from sqlalchemy import String, DECIMAL, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Transfer(Base):
    __tablename__ = "transfers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    from_account_id: Mapped[str] = mapped_column(String(64), nullable=False)
    to_account_id: Mapped[str] = mapped_column(String(64), nullable=False)
    from_amount: Mapped[float] = mapped_column(DECIMAL(12, 2), nullable=False)
    from_currency: Mapped[str] = mapped_column(String(10), default="BDT")
    to_amount: Mapped[float] = mapped_column(DECIMAL(12, 2), nullable=False)
    to_currency: Mapped[str] = mapped_column(String(10), default="BDT")
    charge: Mapped[float] = mapped_column(DECIMAL(12, 2), default=0)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # IDs of the two auto-generated transactions
    debit_txn_id: Mapped[str] = mapped_column(String(64), nullable=False)
    credit_txn_id: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, default=None
    )
