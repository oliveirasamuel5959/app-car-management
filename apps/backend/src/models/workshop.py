import uuid

from sqlalchemy import ForeignKey, Index, Integer, String, Text, UniqueConstraint
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

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), name="user_id", nullable=False
    )
    tenant = relationship("Tenant", back_populates="workshops")
    user = relationship("User", back_populates="workshops")
    workshop_clients = relationship("WorkshopClient", back_populates="workshop")
    services = relationship("Service", back_populates="workshop")
    services_history = relationship("ServiceHistory", back_populates="workshop")
