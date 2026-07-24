import datetime
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
    opening_time: datetime.time | None = None
    closing_time: datetime.time | None = None
    work_days: str | None = None
    employee_count: int | None = None
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
    opening_time: datetime.time | None = None
    closing_time: datetime.time | None = None
    work_days: str | None = None
    employee_count: int | None = None


# ---------------------------------------------------------------------------
# Agenda schemas (Phase 3)
# ---------------------------------------------------------------------------


class AgendaSlot(BaseModel):
    time: str  # "HH:MM"
    busy: bool


class AgendaDay(BaseModel):
    date: str  # "YYYY-MM-DD"
    day_of_week: int  # 1=Monday … 7=Sunday
    is_open: bool
    slots: list[AgendaSlot] = []


class WorkshopAgenda(BaseModel):
    days: list[AgendaDay]
