from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NotificationCreate(BaseModel):
    """Schema for creating a new notification."""

    user_id: int
    service_id: int | None = None
    title: str
    message: str
    notification_type: str


class NotificationRead(BaseModel):
    """Schema for reading notification information."""

    id: int
    tenant_id: UUID
    user_id: int
    service_id: int | None = None
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime
    read_at: datetime | None = None

    class Config:
        from_attributes = True


class NotificationUpdate(BaseModel):
    """Schema for updating notification status."""

    is_read: bool
