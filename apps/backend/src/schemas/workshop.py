from uuid import UUID

from pydantic import BaseModel


class WorkshopCreate(BaseModel):
    name: str
    email: str | None = None
    description: str | None
    latitude: float
    longitude: float
    rating_avg: float
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    opening_hours: str | None = None
    logo_url: str | None = None
    user_id: int | None = None  # will be set in backend from current_user


class WorkshopRead(BaseModel):
    id: int
    tenant_id: UUID
    name: str
    email: str | None
    description: str | None
    latitude: float
    longitude: float
    rating_avg: float
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    opening_hours: str | None = None
    logo_url: str | None = None
    user_id: int

    class Config:
        from_attributes = True


class WorkshopUpdate(BaseModel):
    """Schema for updating the current user's workshop profile."""

    name: str | None = None
    email: str | None = None
    description: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    opening_hours: str | None = None
    logo_url: str | None = None
