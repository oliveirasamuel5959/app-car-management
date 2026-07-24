import uuid

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from src.db.base import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    users = relationship("User", back_populates="tenant")
    vehicles = relationship("Vehicle", back_populates="tenant")
    workshops = relationship("Workshop", back_populates="tenant")
    services = relationship("Service", back_populates="tenant")
    workshop_clients = relationship("WorkshopClient", back_populates="tenant")
    messages = relationship("Message", back_populates="tenant")
    notifications = relationship("Notification", back_populates="tenant")
    services_history = relationship("ServiceHistory", back_populates="tenant")
    client_schedules = relationship(
        "Schedule", foreign_keys="Schedule.client_tenant_id", back_populates="client_tenant"
    )
    workshop_schedules = relationship(
        "Schedule", foreign_keys="Schedule.workshop_tenant_id", back_populates="workshop_tenant"
    )
    workshop_ratings = relationship(
        "WorkshopRating", foreign_keys="WorkshopRating.workshop_tenant_id", back_populates="workshop_tenant"
    )
    client_ratings = relationship(
        "WorkshopRating", foreign_keys="WorkshopRating.client_tenant_id", back_populates="client_tenant"
    )
