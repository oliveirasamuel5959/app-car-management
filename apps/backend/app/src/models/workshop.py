from typing import List
from sqlalchemy import ForeignKey, Integer, String, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.src.db.base import Base
class Workshop(Base):
    __tablename__ = "workshops"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    latitude: Mapped[float] = mapped_column(nullable=False)
    longitude: Mapped[float] = mapped_column(nullable=False)
    rating_avg: Mapped[float] = mapped_column(default=0.0)
    
    owner_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), name="user_id", nullable=False)
    user = relationship("User", back_populates="workshops")
