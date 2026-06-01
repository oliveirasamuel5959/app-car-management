from uuid import UUID

from pydantic import BaseModel, Field
from typing import Annotated

from src.schemas.user import UserCreate


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
