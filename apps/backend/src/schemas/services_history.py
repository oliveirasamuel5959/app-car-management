from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum
from uuid import UUID

class ServiceType(str, Enum):
    OIL_CHANGE = "oil_change"
    TIRE_ROTATION = "tire_rotation"
    TIRE_REPLACEMENT = "tire_replacement"
    BRAKE_SERVICE = "brake_service"
    BATTERY_REPLACEMENT = "battery_replacement"
    AIR_FILTER = "air_filter"
    TRANSMISSION_SERVICE = "transmission_service"
    COOLANT_FLUSH = "coolant_flush"
    BELT_REPLACEMENT = "belt_replacement"
    INSPECTION = "inspection"
    OTHER = "other"


class ServiceHistoryCreate(BaseModel):
    vehicle_id: int
    service_type: ServiceType
    description: Optional[str] = None
    current_mileage: Optional[int] = None
    labor_cost: Optional[float] = None
    parts_cost: Optional[float] = None
    invoice_number: Optional[str] = None
    warranty_until_date: Optional[datetime] = None
    warranty_mileage: Optional[int] = None
    serviced_at: datetime
    next_service_date: Optional[datetime] = None
    next_service_mileage: Optional[int] = None


class ServiceHistoryUpdate(BaseModel):
    vehicle_id: Optional[int] = None
    service_type: Optional[ServiceType] = None
    description: Optional[str] = None
    current_mileage: Optional[int] = None
    labor_cost: Optional[float] = None
    parts_cost: Optional[float] = None
    invoice_number: Optional[str] = None
    warranty_until_date: Optional[datetime] = None
    warranty_mileage: Optional[int] = None
    serviced_at: Optional[datetime] = None
    next_service_date: Optional[datetime] = None
    next_service_mileage: Optional[int] = None


class ServiceHistoryRead(BaseModel):
    id: int
    tenant_id: UUID
    vehicle_id: int
    workshop_id: Optional[int] = None
    status: str
    service_type: ServiceType
    description: Optional[str] = None
    current_mileage: Optional[int] = None
    next_service_mileage: Optional[int] = None
    labor_cost: Optional[float] = None
    parts_cost: Optional[float] = None
    invoice_number: Optional[str] = None
    warranty_until_date: Optional[datetime] = None
    warranty_mileage: Optional[int] = None
    serviced_at: datetime
    next_service_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
