from pydantic import BaseModel
from uuid import UUID


class WorkshopCreate(BaseModel):
    name: str
    description: str | None
    latitude: float
    longitude: float


class WorkshopRead(BaseModel):
    id: UUID
    name: str
    description: str | None
    latitude: float
    longitude: float
    rating_avg: float

    class Config:
        from_attributes = True
