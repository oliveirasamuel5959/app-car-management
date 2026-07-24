from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ServiceCreate(BaseModel):
    """Schema for creating a new service."""

    workshop_client_id: int | None = None
    vehicle_id: int | None = None
    name: str
    description: str | None = None
    status: str = "pending"
    progress_percentage: int = 0
    checkin_date: datetime
    estimated_finish_date: datetime | None = None
    finished_at: datetime | None = None
    estimated_hours: float | None = None
    actual_hours: float | None = None
    estimated_cost: float | None = None
    final_cost: float | None = None
    workshop_notes: str | None = None


class ServiceRead(BaseModel):
    """Schema for reading service information."""

    id: int
    tenant_id: UUID
    workshop_id: int
    workshop_client_id: int | None = None
    vehicle_id: int | None = None
    name: str
    description: str | None = None
    status: str
    progress_percentage: int
    checkin_date: datetime
    estimated_finish_date: datetime | None = None
    finished_at: datetime | None = None
    estimated_hours: float | None = None
    actual_hours: float | None = None
    estimated_cost: float | None = None
    final_cost: float | None = None
    workshop_notes: str | None = None

    class Config:
        from_attributes = True


class ServiceUpdate(BaseModel):
    workshop_notes: str | None = None
    status: str | None = None


class ServiceActionUpdate(BaseModel):
    workshop_notes: str | None = None
    estimated_cost: float | None = None
    final_cost: float | None = None
    # Optional service-history fields, only used when completing an order
    # (next_status == "completed"). Ignored on /start and /cancel.
    service_type: str | None = None
    current_mileage: int | None = None
    labor_cost: float | None = None
    parts_cost: float | None = None
    invoice_number: str | None = None
    warranty_until_date: datetime | None = None
    warranty_mileage: int | None = None


class ServiceSummaryItem(BaseModel):
    id: int
    name: str
    status: str
    checkin_date: datetime
    estimated_finish_date: datetime | None = None
    workshop_id: int
    estimated_cost: float | None = None
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
