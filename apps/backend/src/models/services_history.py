import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Index, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base

class ServiceType(str, Enum):
    OIL_CHANGE = "oil_change"
    TIRE_ROTATION = "tire_rotation"
    TIRE_REPLACEMENT = "tire_replacement"
    BRAKE_SERVICE = "brake_service"
    BATTERY_REPLACEMENT = "battery_replacement"
    AIR_FILTER = "air_filter"
    TRANSMISSION_SERVICE = "transmission_service"
    COOLANT_FLUSH = "coolant_flush"
    BELT_REPLACEMENT = "belt_replacement"
    INSPECTION = "inspection"
    OTHER = "other"


class ServiceHistory(Base):
    __tablename__ = "services_history"
    __table_args__ = (
        Index("ix_services_history_tenant_id_id", "tenant_id", "id"),
        Index("ix_services_history_tenant_id_vehicle_id", "tenant_id", "vehicle_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)

    # Relationships
    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False
    )

    # workshop_id: Mapped[int] = mapped_column(
    #     ForeignKey("workshops.id", ondelete="CASCADE"),
    #     nullable=False
    # )

    # Service Info
    service_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # Odometer
    current_mileage: Mapped[int] = mapped_column(Integer, nullable=True)
    next_service_mileage: Mapped[int] = mapped_column(Integer, nullable=True)

    # Financial
    cost: Mapped[float] = mapped_column(Numeric(precision=10, scale=2), nullable=True)

    # Scheduling
    serviced_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    next_service_date: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Audit
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships (ORM)
    tenant = relationship("Tenant", back_populates="services_history")
    vehicle = relationship("Vehicle", backref="services_history")
    # workshop = relationship("Workshop", backref="services_history")
