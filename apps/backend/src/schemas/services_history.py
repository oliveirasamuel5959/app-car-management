from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel


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
    description: str | None = None
    current_mileage: int | None = None
    labor_cost: float | None = None
    parts_cost: float | None = None
    invoice_number: str | None = None
    warranty_until_date: datetime | None = None
    warranty_mileage: int | None = None
    serviced_at: datetime
    next_service_date: datetime | None = None
    next_service_mileage: int | None = None


class ServiceHistoryUpdate(BaseModel):
    vehicle_id: int | None = None
    service_type: ServiceType | None = None
    description: str | None = None
    current_mileage: int | None = None
    labor_cost: float | None = None
    parts_cost: float | None = None
    invoice_number: str | None = None
    warranty_until_date: datetime | None = None
    warranty_mileage: int | None = None
    serviced_at: datetime | None = None
    next_service_date: datetime | None = None
    next_service_mileage: int | None = None


class ServiceHistoryRead(BaseModel):
    id: int
    tenant_id: UUID
    vehicle_id: int
    workshop_id: int | None = None
    status: str
    service_type: ServiceType
    description: str | None = None
    current_mileage: int | None = None
    next_service_mileage: int | None = None
    labor_cost: float | None = None
    parts_cost: float | None = None
    invoice_number: str | None = None
    warranty_until_date: datetime | None = None
    warranty_mileage: int | None = None
    serviced_at: datetime
    next_service_date: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
