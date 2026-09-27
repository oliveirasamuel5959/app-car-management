# Requirements: Azure DevOps Deployment

Last Updated: 2026-09-27
Branch: feature/2026-09-27-azure-devops
Status: In Progress

## Context

This phase closes the deployment gap identified in `specs/ROADMAP.md` Phase 8.
The target platform is Azure using App Service for Containers, Azure Container
Registry, Azure Database for PostgreSQL Flexible Server, and GitHub Actions with
OpenID Connect.

The project will have separate staging and production environments. Default
Azure HTTPS hostnames are used initially. Blob Storage and custom domains are
explicitly deferred.

## 1. Scope

### In Scope

- Backend Dockerfile at `apps/backend/Dockerfile`.
- Frontend Dockerfile at `apps/web/Dockerfile`.
- Nginx reverse proxy template at `apps/web/nginx.conf.template`.
- Root `docker-compose.yml`, `.dockerignore`, and `.env.example`.
- Backend health endpoint, environment-driven CORS, and runtime migrations.
- Frontend environment-driven API and WebSocket URLs.
- Local PostgreSQL, backend, and frontend containers.
- Azure staging and production resource runbook.
- Azure Container Registry image publishing.
- GitHub Actions CI and Azure deployment workflows.
- Immutable image tags using the Git SHA.
- Azure managed identity for ACR image pulls.
- GitHub OIDC authentication.
- Azure logging, health checks, smoke tests, and rollback documentation.
- Updates to deployment architecture documentation and changelog.

### Out of Scope

- Azure Kubernetes Service or Azure Container Apps.
- Custom domains and certificates.
- Private VNet PostgreSQL networking.
- Azure Blob Storage migration.
- Redis or multi-instance WebSocket fan-out.
- Production deployment slots.
- Terraform or Bicep infrastructure-as-code in this phase.

## 2. Functional Requirements

### 2.1 Containerization

- The backend image runs FastAPI on port `5500`.
- The frontend image serves the Vite build through Nginx on port `4200`.
- Images use committed lockfiles and do not contain `.env` files or private secrets.
- Backend migrations use the runtime `DATABASE_URL`.
- Containers bind to `0.0.0.0`.

### 2.2 Local Compose

The root Compose file runs `db`, `backend`, and `frontend`. PostgreSQL 16 uses
a named volume and healthcheck. The backend waits for a healthy database. Nginx
proxies REST and WebSocket traffic to `BACKEND_URL`.

### 2.3 Environment Configuration

The root `.env.example` documents database, JWT, CORS, frontend, AI, Stripe,
Vite, and Nginx variables. Backend secrets are runtime variables. `VITE_*`
values are public build-time configuration.

### 2.4 Frontend and Proxy

Hardcoded `localhost:5500` references are removed from the frontend. Nginx
proxies backend routes, `/messages/` WebSockets, `/uploads/`, and `/images/`,
while preserving React Router fallback behavior.

### 2.5 Backend Runtime

FastAPI loads CORS from `Settings`, exposes `GET /health`, serves static files,
uses the runtime database URL, and supports WebSockets through App Service.

### 2.6 Azure Environments

Staging and production each receive a frontend App Service, backend App Service,
App Service Plan, PostgreSQL Flexible Server, and monitoring configuration.
ACR may be shared.

### 2.7 CI/CD

GitHub Actions runs backend tests, frontend checks/tests/build, Compose
validation, image builds, ACR publishing, staging deployment, production
approval, and post-deployment smoke tests.

## 3. Technical Decisions

### D1 — Azure App Service for Containers

App Service is used instead of AKS or Container Apps to keep operations small
while independently deploying frontend and backend containers.

### D2 — Separate Frontend and Backend Apps

The frontend Nginx container reverse-proxies API and WebSocket traffic to the
backend App Service.

### D3 — Azure Flexible Server

PostgreSQL is managed by Azure Flexible Server, with separate servers for
staging and production and SSL required in Azure connection strings.

### D4 — Immutable ACR Images

Images are tagged with the Git SHA. Deployment never depends on `latest`.

### D5 — GitHub OIDC

GitHub Actions uses short-lived OIDC credentials instead of publish profiles or
long-lived Azure client secrets.

### D6 — Same-Origin Browser Requests

The browser uses relative API paths. Nginx forwards them to FastAPI, keeping
local and Azure routing consistent.

### D7 — Runtime Versus Build-Time Variables

Backend variables are injected at runtime. Vite variables are Docker build
arguments because Vite embeds them in static assets.

### D8 — Startup Migrations

The initial release runs `alembic upgrade head` before Uvicorn. Scaling is kept
at one backend instance during migrations; a dedicated migration job is future
work.

### D9 — Temporary Upload Persistence

Blob Storage is deferred. Uploads use App Service persistent storage under
`/home`, and the limitation is documented.

## 4. Constraints

- Preserve the four-layer backend architecture and tenant isolation.
- Do not commit secrets or copy `.env` into images.
- New TypeScript code must not use `any`.
- Docker Compose is local-only and is not deployed to App Service.
- PostgreSQL production connections use `sslmode=require`.
- Existing backend, frontend, and tenant-isolation tests remain green.

## 5. Risks and Notes

- App Service filesystem uploads are a temporary solution, not Blob Storage.
- Startup migrations must not race across multiple backend instances.
- Vite variables cannot change after an image is built.
- Incorrect Nginx route matching can send SPA routes to FastAPI.
- The current Alembic configuration contains a hardcoded localhost URL and must
  be corrected before Azure migrations.

## 6. Success Definition

This phase is complete when local Compose works, staging and production Azure
resources are documented, GitHub Actions deploys immutable images, health and
WebSocket smoke tests pass, rollback is documented, existing tests remain green,
and `CHANGELOG.md`, `ROADMAP.md`, `ARCHITECTURE.md`, and `TECH-STACK.md` reflect
Azure as the deployment target.
