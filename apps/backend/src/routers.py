from fastapi import APIRouter

from src.api.routes.auth import router as auth
from src.api.routes.messages import router as messages
from src.api.routes.notifications import router as notifications
from src.api.routes.schedules import router as schedules
from src.api.routes.service_orders import router as service_orders
from src.api.routes.services import router as services
from src.api.routes.services_history import router as services_history
from src.api.routes.users import router as users
from src.api.routes.vehicles import router as vehicles
from src.api.routes.workshop_clients import router as workshop_clients
from src.api.routes.workshop_ratings import router as workshop_ratings
from src.api.routes.workshops import router as workshops

api_router = APIRouter()

api_router.include_router(auth, prefix="/auth", tags=["auth"])
api_router.include_router(users, prefix="/users", tags=["users"])
api_router.include_router(vehicles, prefix="/vehicles", tags=["vehicles"])
api_router.include_router(workshops, prefix="/workshops", tags=["workshops"])
api_router.include_router(services, prefix="/services", tags=["services"])
api_router.include_router(
    service_orders, prefix="/service-orders", tags=["service-orders"]
)
api_router.include_router(
    workshop_clients, prefix="/workshop-clients", tags=["workshop-clients"]
)
api_router.include_router(messages, prefix="/messages", tags=["messages"])
api_router.include_router(
    notifications, prefix="/notifications", tags=["notifications"]
)
api_router.include_router(
    services_history, prefix="/services-history", tags=["services-history"]
)
api_router.include_router(schedules, prefix="/schedules", tags=["schedules"])
api_router.include_router(
    workshop_ratings, prefix="/workshop-ratings", tags=["workshop-ratings"]
)
