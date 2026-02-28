from pydantic import BaseModel
from uuid import UUID

class WorkshopCreate(BaseModel):
    name: str
    description: str | None
    latitude: float
    longitude: float
    rating_avg: float
    user_id: int | None = None  # will be set in backend from current_user

class WorkshopRead(BaseModel):
    id: int
    name: str
    description: str | None
    latitude: float
    longitude: float
    rating_avg: float

    class Config:
        from_attributes = True
