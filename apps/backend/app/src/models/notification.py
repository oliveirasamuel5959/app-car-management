from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy import Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional
from app.src.db.base import Base

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    service_id: Mapped[Optional[int]] = mapped_column(ForeignKey("services.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'status_change', 'message', etc.
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    read_at: Mapped[Optional[DateTime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user = relationship("User", backref="notifications")
    service = relationship("Service", backref="notifications")
