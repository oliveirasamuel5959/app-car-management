import uuid as _uuid
from sqlalchemy import Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional
from app.src.db.base import Base


def generate_uuid() -> str:
    return str(_uuid.uuid4())


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    uuid: Mapped[str] = mapped_column(String(36), default=generate_uuid, unique=True, index=True)
    sender_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    message_type: Mapped[str] = mapped_column(String(20), default="text")  # text, image, video, file, audio
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")

