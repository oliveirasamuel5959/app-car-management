from fastapi import APIRouter
from app.src.api.routes.users import router as users
from app.src.api.routes.vehicles import router as vehicles

api_router = APIRouter()
api_router.include_router(users, prefix="/users", tags=["users"])
api_router.include_router(vehicles, prefix="/vehicles", tags=["vehicles"])