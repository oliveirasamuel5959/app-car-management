from pydantic import BaseModel, ConfigDict

from src.schemas.schedules import ServiceRequestType


class WorkshopServiceRead(BaseModel):
    id: int
    workshop_id: int
    service_type: ServiceRequestType

    model_config = ConfigDict(from_attributes=True)


class WorkshopServicesUpdate(BaseModel):
    """Bulk-replace payload for a workshop's offered service types."""

    service_types: list[ServiceRequestType]
