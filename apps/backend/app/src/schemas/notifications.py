from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NotificationCreate(BaseModel):
    """Schema for creating a new notification."""
    user_id: int
    service_id: Optional[int] = None
    title: str
    message: str
    notification_type: str


class NotificationRead(BaseModel):
    """Schema for reading notification information."""
    id: int
    user_id: int
    service_id: Optional[int] = None
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationUpdate(BaseModel):
    """Schema for updating notification status."""
    is_read: bool
