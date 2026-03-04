from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WorkshopClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    vehicle_brand: str
    vehicle_model: str
    vehicle_year: int
    vehicle_plate: str


class WorkshopClientRead(BaseModel):
    id: int
    workshop_id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    vehicle_brand: str
    vehicle_model: str
    vehicle_year: int
    vehicle_plate: str
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WorkshopClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    vehicle_brand: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_plate: Optional[str] = None
