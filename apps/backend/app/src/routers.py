from fastapi import APIRouter
from app.src.api.routes.users import router as users
from app.src.api.routes.vehicles import router as vehicles
from app.src.api.routes.auth import router as auth
from app.src.api.routes.workshops import router as workshops
from app.src.api.routes.services import router as services

api_router = APIRouter()

api_router.include_router(auth, prefix="/auth", tags=["auth"])
api_router.include_router(users, prefix="/users", tags=["users"])
api_router.include_router(vehicles, prefix="/vehicles", tags=["vehicles"])
api_router.include_router(workshops, prefix="/workshops", tags=["workshops"])
api_router.include_router(services, prefix="/services", tags=["services"])