import uuid

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from src.db.base import Base


class Schedule(Base):
    __tablename__ = "schedules"
    __table_args__ = (
        Index(
            "ix_schedules_workshop_tenant_id_scheduled_at",
            "workshop_tenant_id",
            "scheduled_at",
        ),
        Index(
            "ix_schedules_client_tenant_id_status",
            "client_tenant_id",
            "status",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Dual-tenant isolation: each schedule belongs to exactly two tenants
    client_tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    workshop_tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )

    workshop_id: Mapped[int] = mapped_column(
        ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True
    )

    service_request_type: Mapped[str] = mapped_column(String(20), nullable=False)
    problem_description: Mapped[str] = mapped_column(Text, nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)

    scheduled_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pendente", index=True
    )

    viewed_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    responded_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    # Relationships — use foreign_keys to disambiguate dual FK to tenants
    client_tenant = relationship(
        "Tenant", foreign_keys=[client_tenant_id], back_populates="client_schedules"
    )
    workshop_tenant = relationship(
        "Tenant", foreign_keys=[workshop_tenant_id], back_populates="workshop_schedules"
    )
    workshop = relationship("Workshop", back_populates="schedules")
    vehicle = relationship("Vehicle", back_populates="schedules")
    workshop_ratings = relationship("WorkshopRating", back_populates="schedule")
    notifications = relationship("Notification", back_populates="schedule")
