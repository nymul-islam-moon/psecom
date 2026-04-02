from datetime import datetime
from sqlalchemy import String, Enum, DECIMAL, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    type: Mapped[str] = mapped_column(Enum("income", "expense", "transfer"), nullable=False)
    # sub_type refines the transaction:
    #   initial  — pre-existing balance, not real income/expense
    #   borrow   — income you received but owe back (debt tracking)
    #   sent_to  — expense sent to a specific external person/service
    sub_type: Mapped[str | None] = mapped_column(
        Enum("initial", "borrow", "lent", "sent_to", "adjustment"),
        nullable=True, default=None
    )
    # to_recipient: used with sent_to sub_type to name who received the money
    to_recipient: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    amount: Mapped[float] = mapped_column(DECIMAL(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="BDT")
    account_id: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, default=None)
