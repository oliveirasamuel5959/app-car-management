import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class ServicePart(Base):
    __tablename__ = "service_parts"
    __table_args__ = (Index("ix_service_parts_tenant_id_id", "tenant_id", "id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    service_order_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Part Info
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(
        Numeric(precision=10, scale=2), nullable=False
    )
    total_price: Mapped[float] = mapped_column(
        Numeric(precision=10, scale=2), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships (ORM)
    tenant = relationship("Tenant")
    service_order = relationship("Service", back_populates="parts")
