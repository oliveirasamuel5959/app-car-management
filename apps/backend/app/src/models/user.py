import enum
from sqlalchemy import Boolean, DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from uuid import UUID, uuid4

from .base import Base


class UserRole(str, enum.Enum):
    CLIENT = "CLIENT"
    WORKSHOP = "WORKSHOP"


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    password_hash: Mapped[str] = mapped_column(nullable=False)

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole),
        nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    vehicles = relationship(
        "Vehicle",
        back_populates="owner",
        cascade="all, delete-orphan"
    )

    workshop = relationship(
        "Workshop",
        back_populates="user",
        uselist=False
    )
