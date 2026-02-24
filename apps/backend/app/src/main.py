from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.src.routers import api_router
from app.src.core.middleware import AuthMiddleware, SecurityHeadersMiddleware, RateLimitMiddleware
from app.src.core.config import settings

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

# CORS Configuration for React frontend (from environment variables)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.cors_methods_list,
    allow_headers=settings.CORS_ALLOW_HEADERS.split(","),
)

# Add security middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)
app.add_middleware(AuthMiddleware, public_routes=["/", "/docs", "/redoc", "/openapi.json"])

app.include_router(api_router)

