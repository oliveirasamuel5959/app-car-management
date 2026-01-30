from pydantic import BaseModel, Field
from typing import Annotated
from app.src.schemas.user import UserCreate


class VehicleCreate(BaseModel):
    brand: str
    model: str
    year: int
    plate: str | None
    user: Annotated[UserCreate, Field(description="Nome do usuario", nullable=False)]


class VehicleRead(BaseModel):
    id: int
    brand: str
    model: str
    year: int
    plate: str | None

    class Config:
        from_attributes = True
