import uuid

from sqlalchemy import ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class WorkshopService(Base):
    """Service types a workshop declares it offers (the search catalog).

    Taxonomy reuses the schedule request types (`manutencao`, `reparo`,
    `inspecao`, `outro`). One row per (workshop, type); a workshop with no
    rows is simply excluded from service-type-filtered searches.
    """

    __tablename__ = "workshop_services"
    __table_args__ = (
        UniqueConstraint(
            "workshop_id", "service_type", name="uq_workshop_services_workshop_type"
        ),
        Index("ix_workshop_services_tenant_id_id", "tenant_id", "id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workshop_id: Mapped[int] = mapped_column(
        ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )
    service_type: Mapped[str] = mapped_column(String(20), nullable=False)
