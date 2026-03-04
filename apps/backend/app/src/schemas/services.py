from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ServiceCreate(BaseModel):
    """Schema for creating a new service."""
    workshop_client_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    status: str = "pending"
    progress_percentage: int = 0
    checkin_date: datetime
    estimated_finish_date: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    estimated_cost: Optional[float] = None
    final_cost: Optional[float] = None
    workshop_notes: Optional[str] = None


class ServiceRead(BaseModel):
    """Schema for reading service information."""
    id: int
    workshop_id: int
    workshop_client_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    status: str
    progress_percentage: int
    checkin_date: datetime
    estimated_finish_date: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    estimated_cost: Optional[float] = None
    final_cost: Optional[float] = None
    workshop_notes: Optional[str] = None

    class Config:
        from_attributes = True


class ServiceUpdate(BaseModel):
    workshop_notes: Optional[str] = None
    status: Optional[str] = None
