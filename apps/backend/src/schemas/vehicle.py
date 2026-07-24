from uuid import UUID

from pydantic import BaseModel


class VehicleCreate(BaseModel):
    brand: str
    model: str
    year: int
    plate: str | None


class VehicleRead(BaseModel):
    id: int
    tenant_id: UUID
    brand: str
    model: str
    year: int
    plate: str | None

    class Config:
        from_attributes = True
