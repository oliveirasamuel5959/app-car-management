<<<<<<< HEAD
from uuid import UUID

from pydantic import BaseModel


class WorkshopCreate(BaseModel):
    name: str
    email: str | None = None
    description: str | None
    latitude: float
    longitude: float
    rating_avg: float
    user_id: int | None = None  # will be set in backend from current_user


class WorkshopRead(BaseModel):
    id: int
    tenant_id: UUID
    name: str
    email: str | None
    description: str | None
    latitude: float
    longitude: float
    rating_avg: float
    user_id: int

    class Config:
        from_attributes = True
=======
from pydantic import BaseModel
from uuid import UUID

class WorkshopCreate(BaseModel):
    name: str
    email: str | None = None
    description: str | None
    latitude: float
    longitude: float
    rating_avg: float
    user_id: int | None = None  # will be set in backend from current_user

class WorkshopRead(BaseModel):
    id: int
    tenant_id: UUID
    name: str
    email: str | None
    description: str | None
    latitude: float
    longitude: float
    rating_avg: float
    user_id: int

    class Config:
        from_attributes = True
>>>>>>> c5ef6a45 (WIP: salva alterações locais)
