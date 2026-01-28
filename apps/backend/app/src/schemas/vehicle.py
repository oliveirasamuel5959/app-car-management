from pydantic import BaseModel
from uuid import UUID


class VehicleCreate(BaseModel):
    brand: str
    model: str
    year: int
    plate: str | None


class VehicleRead(BaseModel):
    id: UUID
    brand: str
    model: str
    year: int
    plate: str | None

    class Config:
        from_attributes = True
