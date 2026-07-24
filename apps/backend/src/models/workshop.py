import uuid

from sqlalchemy import ForeignKey, Index, Integer, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class Workshop(Base):
    __tablename__ = "workshops"
    __table_args__ = (
        UniqueConstraint("tenant_id", name="uq_workshops_tenant_id"),
        UniqueConstraint("tenant_id", "email", name="uq_workshops_tenant_email"),
        Index("ix_workshops_tenant_id_id", "tenant_id", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    latitude: Mapped[float] = mapped_column(nullable=False)
    longitude: Mapped[float] = mapped_column(nullable=False)
    rating_avg: Mapped[float] = mapped_column(default=0.0)

    # Contact / address / branding
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    opening_hours: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Structured operating-hours fields (Phase 0 — agendamento)
    opening_time: Mapped[str | None] = mapped_column(Time, nullable=True)
    closing_time: Mapped[str | None] = mapped_column(Time, nullable=True)
    work_days: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # CSV of ISO weekday ints, e.g. "1,2,3,4,5"
    employee_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), name="user_id", nullable=False
    )
    tenant = relationship("Tenant", back_populates="workshops")
    user = relationship("User", back_populates="workshops")
    workshop_clients = relationship("WorkshopClient", back_populates="workshop")
    services = relationship("Service", back_populates="workshop")
    services_history = relationship("ServiceHistory", back_populates="workshop")
    schedules = relationship("Schedule", back_populates="workshop")
