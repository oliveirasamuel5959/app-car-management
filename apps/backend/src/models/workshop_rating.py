import uuid

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from src.db.base import Base


class WorkshopRating(Base):
    __tablename__ = "workshop_ratings"
    __table_args__ = (
        UniqueConstraint("schedule_id", name="uq_workshop_ratings_schedule_id"),
        UniqueConstraint(
            "service_order_id", name="uq_workshop_ratings_service_order_id"
        ),
        CheckConstraint(
            "rating >= 0 AND rating <= 5", name="ck_workshop_ratings_rating_range"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    workshop_tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    client_tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )

    schedule_id: Mapped[int | None] = mapped_column(
        ForeignKey("schedules.id", ondelete="SET NULL"), nullable=True, index=True
    )
    service_order_id: Mapped[int | None] = mapped_column(
        ForeignKey("services.id", ondelete="SET NULL"), nullable=True, index=True
    )

    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    workshop_tenant = relationship(
        "Tenant", foreign_keys=[workshop_tenant_id], back_populates="workshop_ratings"
    )
    client_tenant = relationship(
        "Tenant", foreign_keys=[client_tenant_id], back_populates="client_ratings"
    )
    schedule = relationship("Schedule", back_populates="workshop_ratings")
