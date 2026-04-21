from fastapi import APIRouter
from app.src.api.routes.users import router as users
from app.src.api.routes.vehicles import router as vehicles
from app.src.api.routes.auth import router as auth
from app.src.api.routes.workshops import router as workshops
from app.src.api.routes.services import router as services
from app.src.api.routes.service_orders import router as service_orders
from app.src.api.routes.workshop_clients import router as workshop_clients
from app.src.api.routes.messages import router as messages
from app.src.api.routes.notifications import router as notifications

api_router = APIRouter()

api_router.include_router(auth, prefix="/auth", tags=["auth"])
api_router.include_router(users, prefix="/users", tags=["users"])
api_router.include_router(vehicles, prefix="/vehicles", tags=["vehicles"])
api_router.include_router(workshops, prefix="/workshops", tags=["workshops"])
api_router.include_router(services, prefix="/services", tags=["services"])
api_router.include_router(service_orders, prefix="/create-services-orders", tags=["service-orders"])
api_router.include_router(workshop_clients, prefix="/workshop-clients", tags=["workshop-clients"])
api_router.include_router(messages, prefix="/messages", tags=["messages"])
api_router.include_router(notifications, tags=["notifications"])