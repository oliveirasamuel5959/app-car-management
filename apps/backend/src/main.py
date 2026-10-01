from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.core.config import settings
from src.core.middleware import (
    AuthMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
)
from src.core.ws_push import capture_ws_loop
from src.routers import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Remember the loop that owns the WebSocket connections so sync services
    # running in the threadpool can hand pushes to it (see core/ws_push.py).
    capture_ws_loop()
    yield


servers = [
    {"url": "http://localhost:5500", "description": "Staging environment"},
    {"url": "https://prod.example.com", "description": "Production environment"},
]

tags_metadata = [
    {
        "name": "users",
        "description": "Operations to add users",
    },
    {
        "name": "auth",
        "description": "Authentication operations",
    },
]

app = FastAPI(
    lifespan=lifespan,
    title="Account API",
    version="1.0.0",
    summary="API for banck account transactions control",
    description="""
Banck account transactions management.

## Client

* **Add users**.
* **List users**.
* **List user by ID**.
* **Delete user by ID**.
  """,
    openapi_tags=tags_metadata,
    # openapi_url=None, # disable docs
    servers=servers,
)

APP_ROOT = Path(__file__).resolve().parent.parent
STATIC_IMAGES_DIRECTORY = APP_ROOT / "static" / "images"
UPLOAD_DIRECTORY = Path(settings.UPLOAD_DIRECTORY)
UPLOAD_DIRECTORY.mkdir(exist_ok=True, parents=True)

app.mount("/images", StaticFiles(directory=STATIC_IMAGES_DIRECTORY), name="images")

# Serve user-uploaded files (avatars, workshop logos, chat attachments)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIRECTORY), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.cors_methods_list,
    allow_headers=[header.strip() for header in settings.CORS_ALLOW_HEADERS.split(",")],
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

# Add security middlewares
app.add_middleware(
    AuthMiddleware,
    public_routes=[
        "/",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/health",
        "/auth/register",
        "/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/messages/ws",
        "/api/v1/messages/ws",
    ],
)

app.include_router(api_router)


@app.get("/health", include_in_schema=False)
def health() -> dict[str, str]:
    """Expose a lightweight liveness probe for containers and App Service."""
    return {"status": "ok"}
