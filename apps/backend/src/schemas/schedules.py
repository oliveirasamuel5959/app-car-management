import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel


class ScheduleStatus(str, Enum):
    PENDENTE = "pendente"
    VISUALIZADO = "visualizado"
    ACEITO = "aceito"
    RECUSADO = "recusado"


class ServiceRequestType(str, Enum):
    MANUTENCAO = "manutencao"
    REPARO = "reparo"
    INSPECAO = "inspecao"
    OUTRO = "outro"


class ScheduleCreate(BaseModel):
    workshop_id: int
    vehicle_id: int | None = None
    service_request_type: ServiceRequestType
    problem_description: str
    contact_phone: str
    contact_email: str
    scheduled_at: datetime.datetime


class ScheduleRead(BaseModel):
    id: int
    client_tenant_id: UUID
    workshop_tenant_id: UUID
    workshop_id: int
    vehicle_id: int | None = None
    service_request_type: ServiceRequestType
    problem_description: str
    contact_phone: str
    contact_email: str
    scheduled_at: datetime.datetime
    status: ScheduleStatus
    viewed_at: datetime.datetime | None = None
    responded_at: datetime.datetime | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime | None = None

    class Config:
        from_attributes = True


class ScheduleUpdate(BaseModel):
    """Workshop-side partial update — status transitions are handled by dedicated endpoints."""

    status: ScheduleStatus | None = None
