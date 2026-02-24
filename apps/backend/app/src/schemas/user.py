from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID
from enum import Enum
from datetime import datetime


class UserRole(str, Enum):
    CLIENT = "CLIENT"
    WORKSHOP = "WORKSHOP"


class UserCreate(BaseModel):
    name: str
    age: int
    sex: str
    email: EmailStr
    password: str
    role: UserRole


class UserRead(BaseModel):
    id: int
    email: EmailStr
    name: str
    age: int
    sex: str
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


# Auth-specific schemas
class UserRegister(BaseModel):
    """Schema for user registration endpoint."""
    name: str
    age: int
    sex: str
    email: EmailStr
    password: str
    password_confirm: str
    role: UserRole = UserRole.CLIENT

    @field_validator('age')
    @classmethod
    def validate_age(cls, v):
        if v < 18:
            raise ValueError('User must be at least 18 years old')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        return v

    @field_validator('password_confirm')
    @classmethod
    def validate_password_match(cls, v, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Passwords do not match')
        return v


class UserLogin(BaseModel):
    """Schema for user login endpoint."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class UserResponse(BaseModel):
    """Schema for user response."""
    id: int
    email: EmailStr
    name: str
    age: int
    sex: str
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True

