from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


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
    tenant_id: UUID
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


class ServiceActionUpdate(BaseModel):
    workshop_notes: Optional[str] = None
    estimated_cost: Optional[float] = None
    final_cost: Optional[float] = None


class ServiceSummaryItem(BaseModel):
    id: int
    name: str
    status: str
    checkin_date: datetime
    estimated_finish_date: Optional[datetime] = None
    workshop_id: int
    estimated_cost: Optional[float] = None
    progress_percentage: int

    class Config:
        from_attributes = True


class ServiceSummaryRead(BaseModel):
    total_orders: int = Field(default=0)
    active_orders: int = Field(default=0)
    pending_orders: int = Field(default=0)
    confirmed_orders: int = Field(default=0)
    in_progress_orders: int = Field(default=0)
    completed_orders: int = Field(default=0)
    cancelled_orders: int = Field(default=0)
    recent_orders: list[ServiceSummaryItem] = Field(default_factory=list)
