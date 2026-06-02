from src.db.base import Base
from datetime import datetime
import uuid
from sqlalchemy import (
    DateTime, ForeignKey, Integer, String, Numeric, 
    Text, ARRAY, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB


class ServicesHistory(Base):
    __tablename__ = "services_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    service_id: Mapped[int] = mapped_column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)

    # ── Vehicle identification ──────────────────────────────────────────
    vehicle_id: Mapped[int] = mapped_column(Integer, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True)
    license_plate: Mapped[str] = mapped_column(String(20), nullable=False)
    vin: Mapped[str | None] = mapped_column(String(17), nullable=True)

    # ── Service classification ──────────────────────────────────────────
    workshop_id: Mapped[int] = mapped_column(Integer, nullable=False)
    client_id: Mapped[int] = mapped_column(Integer, nullable=False)
    service_order_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    service_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)

    # ── Odometer ───────────────────────────────────────────────────────
    mileage_in: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mileage_out: Mapped[int | None] = mapped_column(Integer, nullable=True)
    next_service_mileage: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ── Parts & labor (JSONB for structured part list) ─────────────────
    parts: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    labor_hours: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    labor_cost: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    parts_cost: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    total_cost: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="BRL")

    # ── Personnel ──────────────────────────────────────────────────────
    technician_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    technician_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    customer_complaint: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Diagnostics ────────────────────────────────────────────────────
    diagnostic_codes: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)

    # ── Warranty ───────────────────────────────────────────────────────
    warranty_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    warranty_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Scheduling ─────────────────────────────────────────────────────
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    estimated_finish_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_service_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Audit ──────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # ── Relationships ──────────────────────────────────────────────────
    tenant = relationship("Tenant", lazy="select")
    service = relationship("Service", lazy="select")
    vehicle = relationship("Vehicle", lazy="select")
    technician = relationship("User", lazy="select")