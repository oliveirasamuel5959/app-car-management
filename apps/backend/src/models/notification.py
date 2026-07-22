import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from src.db.base import Base


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_tenant_id_id", "tenant_id", "id"),
        Index("ix_notifications_tenant_id_created_at", "tenant_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    service_id: Mapped[int | None] = mapped_column(
        ForeignKey("services.id"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    notification_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # 'status_change', 'message', etc.
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    read_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    tenant = relationship("Tenant", back_populates="notifications")
    user = relationship("User", back_populates="notifications")
    service = relationship("Service", back_populates="notifications")
