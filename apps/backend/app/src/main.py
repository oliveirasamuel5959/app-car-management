from fastapi import FastAPI
from app.src.routers import api_router

servers = [
  {"url": "http://localhost:5500", "description": "Staging environment"},
  {"url": "https://prod.example.com", "description": "Production environment"},
]

tags_metadata = [
  {
    "name": "users",
    "description": "Operations to add users",
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

app.include_router(api_router)
