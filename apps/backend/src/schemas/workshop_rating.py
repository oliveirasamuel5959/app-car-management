import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class WorkshopRatingCreate(BaseModel):
    schedule_id: int
    rating: int = Field(ge=0, le=5)
    comment: str | None = None


class WorkshopRatingUpdate(BaseModel):
    """Author-only partial update — rating and/or comment may change."""

    rating: int | None = Field(default=None, ge=0, le=5)
    comment: str | None = None


class WorkshopRatingRead(BaseModel):
    id: int
    schedule_id: int | None = None
    workshop_tenant_id: UUID
    client_tenant_id: UUID
    rating: int
    comment: str | None = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True
