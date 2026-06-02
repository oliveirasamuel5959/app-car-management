from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum
from decimal import Decimal


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
    SUSPENSION = "suspension"
    ELECTRICAL = "electrical"
    INSPECTION = "inspection"
    BODYWORK = "bodywork"
    OTHER = "other"


class ServiceStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    WAITING_PARTS = "waiting_parts"
    WAITING_APPROVAL = "waiting_approval"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PartCondition(str, Enum):
    OEM = "oem"
    AFTERMARKET = "aftermarket"
    REMANUFACTURED = "remanufactured"
    USED = "used"


class ServicePart(BaseModel):
    """Structured representation of a part used in a service."""
    name: str
    part_number: Optional[str] = None
    quantity: int = 1
    unit_cost: Optional[Decimal] = None
    condition: PartCondition = PartCondition.OEM
    warranty_months: Optional[int] = None  # Part-level warranty


class ServiceHistoryRead(BaseModel):
    id: int
    tenant_id: UUID
    workshop_id: int
    workshop_client_id: int

    # ── Vehicle identification ──────────────────────────────────────────
    vehicle_id: int                          # FK to a Vehicle table
    license_plate: str                       # Denormalized for quick display
    vin: Optional[str] = None               # Vehicle Identification Number

    # ── Service classification ──────────────────────────────────────────
    service_type: ServiceType
    service_order_number: str               # Human-readable reference (e.g. "WO-2024-00342")
    status: ServiceStatus

    # ── Odometer ───────────────────────────────────────────────────────
    mileage_in: Optional[int] = None        # Km/miles when vehicle arrived
    mileage_out: Optional[int] = None       # Km/miles when vehicle left
    next_service_mileage: Optional[int] = None  # Trigger for next visit by km

    # ── Parts & labor ──────────────────────────────────────────────────
    parts: List[ServicePart] = []
    labor_hours: Optional[Decimal] = None
    labor_cost: Optional[Decimal] = None
    parts_cost: Optional[Decimal] = None
    total_cost: Optional[Decimal] = None
    currency: str = "BRL"

    # ── Personnel ──────────────────────────────────────────────────────
    technician_id: Optional[int] = None     # Who performed the work
    technician_notes: Optional[str] = None  # Internal workshop notes
    customer_complaint: Optional[str] = None  # Verbatim issue reported by customer

    # ── Diagnostics ────────────────────────────────────────────────────
    diagnostic_codes: List[str] = []        # OBD-II codes (e.g. ["P0301", "P0420"])
    description: Optional[str] = None       # General service description

    # ── Warranty ───────────────────────────────────────────────────────
    warranty_months: Optional[int] = None   # Service-level warranty duration
    warranty_expires_at: Optional[datetime] = None

    # ── Scheduling ─────────────────────────────────────────────────────
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_finish_date: Optional[datetime] = None
    next_service_date: Optional[datetime] = None

    # ── Audit ──────────────────────────────────────────────────────────
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ServiceHistoryCreate(BaseModel):
    workshop_id: int
    workshop_client_id: int
    vehicle_id: int
    license_plate: str
    vin: Optional[str] = None

    service_type: ServiceType
    status: ServiceStatus = ServiceStatus.SCHEDULED
    customer_complaint: Optional[str] = None
    description: Optional[str] = None

    mileage_in: Optional[int] = None
    next_service_mileage: Optional[int] = None

    parts: List[ServicePart] = []
    labor_hours: Optional[Decimal] = None
    labor_cost: Optional[Decimal] = None
    parts_cost: Optional[Decimal] = None
    currency: str = "BRL"

    technician_id: Optional[int] = None
    diagnostic_codes: List[str] = []

    warranty_months: Optional[int] = None

    scheduled_at: Optional[datetime] = None
    estimated_finish_date: Optional[datetime] = None
    next_service_date: Optional[datetime] = None

    @field_validator("diagnostic_codes")
    @classmethod
    def validate_obd_codes(cls, v: List[str]) -> List[str]:
        import re
        pattern = re.compile(r'^[PBCU][0-9]{4}$', re.IGNORECASE)
        for code in v:
            if not pattern.match(code):
                raise ValueError(f"Invalid OBD-II code format: {code}")
        return [c.upper() for c in v]