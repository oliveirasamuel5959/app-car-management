<<<<<<< HEAD
import uuid
from datetime import datetime

from sqlalchemy import (DateTime, ForeignKey, Index, Integer, String,
                        UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from src.db.base import Base


class WorkshopClient(Base):
    __tablename__ = "workshop_clients"

    __table_args__ = (
        UniqueConstraint(
            "workshop_id", "vehicle_plate", name="uq_workshop_vehicle_plate"
        ),
        Index("ix_workshop_clients_tenant_id_id", "tenant_id", "id"),
        Index("ix_workshop_clients_tenant_id_created_at", "tenant_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )

    workshop_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False
    )

    # Client info
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(30), nullable=True)

    # Vehicle info
    vehicle_brand: Mapped[str] = mapped_column(String(100), nullable=False)
    vehicle_model: Mapped[str] = mapped_column(String(100), nullable=False)
    vehicle_year: Mapped[int] = mapped_column(Integer, nullable=False)
    vehicle_plate: Mapped[str] = mapped_column(String(20), nullable=False)

    # Optional link to a registered user account
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    tenant = relationship("Tenant", back_populates="workshop_clients")
    workshop = relationship("Workshop", back_populates="workshop_clients")
    user = relationship("User", back_populates="workshop_client_profiles")
=======
from datetime import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from src.db.base import Base


class WorkshopClient(Base):
    __tablename__ = "workshop_clients"

    __table_args__ = (
        UniqueConstraint("workshop_id", "vehicle_plate", name="uq_workshop_vehicle_plate"),
        Index("ix_workshop_clients_tenant_id_id", "tenant_id", "id"),
        Index("ix_workshop_clients_tenant_id_created_at", "tenant_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)

    workshop_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False
    )

    # Client info
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(30), nullable=True)

    # Vehicle info
    vehicle_brand: Mapped[str] = mapped_column(String(100), nullable=False)
    vehicle_model: Mapped[str] = mapped_column(String(100), nullable=False)
    vehicle_year: Mapped[int] = mapped_column(Integer, nullable=False)
    vehicle_plate: Mapped[str] = mapped_column(String(20), nullable=False)

    # Optional link to a registered user account
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    tenant = relationship("Tenant", back_populates="workshop_clients")
    workshop = relationship("Workshop", back_populates="workshop_clients")
    user = relationship("User", back_populates="workshop_client_profiles")
>>>>>>> c5ef6a45 (WIP: salva alterações locais)
