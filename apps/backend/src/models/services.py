from datetime import datetime
import uuid

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class Service(Base):
    __tablename__ = "services"
    __table_args__ = (
        Index("ix_services_tenant_id_id", "tenant_id", "id"),
        Index("ix_services_tenant_id_checkin_date", "tenant_id", "checkin_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)

    # Relationships
    workshop_id: Mapped[int] = mapped_column(
        ForeignKey("workshops.id", ondelete="CASCADE"),
        nullable=False
    )

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=True
    )

    workshop_client_id: Mapped[int] = mapped_column(
        ForeignKey("workshop_clients.id", ondelete="CASCADE"),
        nullable=True
    )

    # Basic Information
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # Service Tracking
    status: Mapped[str] = mapped_column(String(30), default="pending")
    """
    pending
    confirmed
    in_progress
    completed
    cancelled
    """

    progress_percentage: Mapped[int] = mapped_column(Integer, default=0)

    # Time Tracking
    checkin_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    estimated_finish_date: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    estimated_hours: Mapped[float] = mapped_column(Float, nullable=True)
    actual_hours: Mapped[float] = mapped_column(Float, nullable=True)

    # Financial
    estimated_cost: Mapped[float] = mapped_column(Float, nullable=True)
    final_cost: Mapped[float] = mapped_column(Float, nullable=True)

    # Notes
    workshop_notes: Mapped[str] = mapped_column(Text, nullable=True)

    # Relationships (ORM)
    tenant = relationship("Tenant", back_populates="services")
    workshop = relationship("Workshop", back_populates="services")
    vehicle = relationship("Vehicle", backref="services")
    workshop_client = relationship("WorkshopClient", backref="services")
    notifications = relationship("Notification", back_populates="service")
    
