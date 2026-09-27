# Plan: Azure DevOps Deployment

Last Updated: 2026-09-27
Branch: feature/2026-09-27-azure-devops
Status: In Progress

Feature Context: Containerize the FastAPI and React applications, provide a
local PostgreSQL Compose stack, and deploy immutable images to Azure App Service
through GitHub Actions. Requirements and decisions are in
[requirements.md](requirements.md).

## Reconciliation with the codebase

- `apps/backend/Dockerfile` exists but is empty.
- No frontend Dockerfile exists.
- The root `.env.example` is empty.
- Existing Docker files under `apps/docker/` are incomplete and currently
  deleted in the worktree.
- The backend uses synchronous SQLAlchemy.
- FastAPI CORS is hardcoded to localhost.
- Several frontend files hardcode `http://localhost:5500`.
- WebSocket support exists at `/messages/ws`.
- `alembic.ini` contains a hardcoded localhost URL.
- The backend has no health endpoint.
- Uploads currently use the container filesystem.

## Confirmed decisions

1. Azure App Service for Containers.
2. Azure Flexible Server for PostgreSQL.
3. Azure Container Registry for images.
4. Separate staging and production environments.
5. Default Azure HTTPS URLs initially.
6. GitHub Actions with OIDC.
7. Nginx reverse proxy for REST and WebSockets.
8. Blob Storage deferred.
9. Compose remains local-only.

## Reference implementation

- Backend app: `apps/backend/src/main.py`.
- Backend settings: `apps/backend/src/core/config.py`.
- Database: `apps/backend/src/db/database.py`.
- Alembic: `apps/backend/migrations/env.py` and `apps/backend/alembic.ini`.
- Frontend API: `apps/web/src/services/api.tsx`.
- WebSocket URL: `apps/web/src/services/message-service.tsx`.
- Frontend build: `apps/web/vite.config.ts`.
- Backend tests: `apps/backend/tests/`.
- Frontend tests: `apps/web/src/**/*.test.ts`.

## TG1 — Container foundation

- Create `apps/backend/Dockerfile` and `apps/backend/entrypoint.sh`.
- Create `apps/web/Dockerfile` and `apps/web/nginx.conf.template`.
- Create root `.dockerignore`.
- Use `uv.lock` and `package-lock.json` for reproducible builds.
- Expose backend port `5500` and frontend port `4200`.
- Do not copy `.env` files into images.

Verification: both Docker images build successfully.

Commit: `build: add backend and frontend production containers`

## TG2 — Backend runtime configuration

- Add `GET /health`.
- Replace hardcoded CORS with `settings.cors_origins_list`.
- Correct Alembic to use runtime `DATABASE_URL`.
- Make the upload directory configurable for App Service storage.
- Ensure static directories exist in the image.
- Run migrations before Uvicorn.
- Add focused health and migration configuration tests where practical.

Verification: backend tests and Alembic upgrade pass.

Commit: `feat(api): add health endpoint and production runtime configuration`

## TG3 — Frontend configuration and Nginx

- Replace hardcoded backend URLs with relative or environment-driven URLs.
- Make upload and WebSocket URLs deployment-safe.
- Proxy all backend route prefixes through Nginx.
- Add WebSocket upgrade headers.
- Add React Router fallback.
- Pass public Vite values as Docker build arguments.

Verification: frontend check, tests, and build pass.

Commit: `feat(web): make API and WebSocket URLs deployment configurable`

## TG4 — Local Compose stack

- Create root `docker-compose.yml` with `db`, `backend`, and `frontend`.
- Add PostgreSQL 16, named volume, and healthcheck.
- Configure backend dependency on healthy PostgreSQL.
- Pass root `.env` values to containers.
- Verify REST, WebSockets, uploads, and migrations locally.

Verification: `docker compose config`, startup, `/health`, and frontend smoke
test pass.

Commit: `build: add local PostgreSQL and application Compose stack`

## TG5 — Azure provisioning runbook

- Document resource groups for platform, staging, and production.
- Document ACR creation.
- Document one PostgreSQL Flexible Server per environment.
- Document App Service Plans and four App Services.
- Document managed identities and `AcrPull`.
- Document `WEBSITES_PORT`, CORS, database, JWT, Stripe, and frontend settings.
- Document Azure logging and health checks.

Verification: commands and required Azure portal settings are reviewed against
the selected architecture.

Commit: `docs: add Azure resource provisioning runbook`

## TG6 — GitHub Actions

- Create `.github/workflows/ci.yml`.
- Create `.github/workflows/deploy.yml`.
- Configure GitHub `staging` and `production` environments.
- Configure Azure OIDC federated credentials.
- Build and push SHA-tagged images.
- Deploy staging automatically.
- Require production approval.
- Run health smoke tests after deployment.

Verification: CI runs on pull requests and deployment workflow references only
configured secrets and variables.

Commit: `ci: add GitHub Actions build and Azure deployment pipelines`

## TG7 — Migration, monitoring, and rollback

- Verify migrations against staging PostgreSQL.
- Document one-instance migration behavior.
- Add deployment health polling.
- Document App Service log inspection.
- Document image rollback and database migration limitations.
- Document deferred Blob Storage and private networking work.

Verification: staging health and log commands work after deployment.

Commit: `docs: add Azure migration, monitoring, and rollback runbook`

## TG8 — Records and final gates

- Update `CHANGELOG.md`.
- Update Phase 8 in `specs/ROADMAP.md`.
- Update Azure deployment architecture in `specs/ARCHITECTURE.md`.
- Update hosting in `specs/TECH-STACK.md`.
- Add local and Azure deployment instructions to `README.md`.
- Execute [validation.md](validation.md).

Verification: all validation gates pass and no secrets are tracked.

Commit: `docs: complete Azure DevOps deployment records`

## Suggested implementation order

TG1 → TG2 → TG3 → TG4 → TG5 → TG6 → TG7 → TG8.
