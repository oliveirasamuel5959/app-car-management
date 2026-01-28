from pydantic import BaseModel, EmailStr
from uuid import UUID
from enum import Enum
from datetime import datetime


class UserRole(str, Enum):
    CLIENT = "CLIENT"
    WORKSHOP = "WORKSHOP"


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole


class UserRead(BaseModel):
    id: UUID
    email: EmailStr
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True
