from datetime import datetime
from enum import Enum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, field_validator


class MessageType(str, Enum):
    text = "text"
    image = "image"
    video = "video"
    audio = "audio"
    file = "file"


# ─── Message ──────────────────────────────────────────────────────────────────


class MessageRead(BaseModel):
    id: int
    uuid: str
    tenant_id: UUID
    sender_id: int
    receiver_id: int
    content: str | None = None
    message_type: str
    file_url: str | None = None
    file_name: str | None = None
    file_size: int | None = None
    mime_type: str | None = None
    is_edited: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── WebSocket Payloads ───────────────────────────────────────────────────────


class WSIncomingMessage(BaseModel):
    """Payload sent by the client over WebSocket."""

    type: Literal["chat_message", "typing_start", "typing_stop"]
    receiver_id: int
    content: str | None = None
    message_type: MessageType = MessageType.text

    @field_validator("content")
    @classmethod
    def content_required_for_chat(cls, v: str | None, info) -> str | None:
        if info.data.get("type") == "chat_message" and not v:
            raise ValueError("content is required for chat_message type")
        if v is not None:
            v = v.strip()
            if len(v) == 0:
                raise ValueError("content cannot be empty")
            if len(v) > 4000:
                raise ValueError("content cannot exceed 4000 characters")
        return v


# ─── File Upload ──────────────────────────────────────────────────────────────


class FileUploadResponse(BaseModel):
    success: bool
    file_url: str
    file_name: str
    file_size: int
    mime_type: str
    file_type: str
    message_id: str | None = None
    message: str = "File uploaded successfully"
