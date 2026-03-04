from datetime import datetime
from sqlalchemy import Integer, String, Text, ForeignKey, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.src.db.base import Base

class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

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
    approved
    in_progress
    waiting_parts
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
    workshop = relationship("Workshop", backref="services")
    vehicle = relationship("Vehicle", backref="services")
    workshop_client = relationship("WorkshopClient", backref="services")
    