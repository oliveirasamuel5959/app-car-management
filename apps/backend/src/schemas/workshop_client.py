from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class WorkshopClientCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    vehicle_brand: str
    vehicle_model: str
    vehicle_year: int
    vehicle_plate: str


class WorkshopClientRead(BaseModel):
    id: int
    tenant_id: UUID
    workshop_id: int
    name: str
    email: str | None = None
    phone: str | None = None
    vehicle_brand: str
    vehicle_model: str
    vehicle_year: int
    vehicle_plate: str
    user_id: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class WorkshopClientUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    vehicle_brand: str | None = None
    vehicle_model: str | None = None
    vehicle_year: int | None = None
    vehicle_plate: str | None = None
