from fastapi import APIRouter
from app.src.api.routes.users import router as users

api_router = APIRouter()
api_router.include_router(users, prefix="/users", tags=["users"])