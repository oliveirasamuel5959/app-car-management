# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SaaS platform connecting vehicle owners (CLIENT) with mechanical workshops (WORKSHOP). Turborepo monorepo with a FastAPI backend and a Vite/React frontend. The product is **multi-tenant**: every workshop is a tenant, and tenant isolation is enforced in the data layer (see Multi-tenancy below).

## Layout

- `apps/backend` — FastAPI + SQLAlchemy + Alembic (Python ≥ 3.12, Poetry).
- `apps/web` — React 18 + TypeScript + Vite.
- `apps/docker` — `docker-compose.yml` for the local Postgres only.
- `apps/packages/*` and `apps/web/shared/*` — mostly empty stubs / vestigial (e.g. the `drizzle.config.ts` + `shared/schema.ts` in `web` are **not** the real schema; Alembic in the backend owns the database). Don't treat these as source of truth.
- `specs/<YYYY-MM-DD>-<feature>/` — each feature has `requirements.md`, `plan.md`, `validation.md`. Branches follow `feature/<YYYY-MM-DD>-<name>`.

> The root `README.md` is aspirational in places — it claims async SQLAlchemy and a `packages/` with shared types/UI. The actual backend is **synchronous** SQLAlchemy and those packages are empty. Trust the code over the README.

## Stack

- Frontend, React 18+, Next.js, Modern UI framework
- Backend, FastAPI + Python 3.11+, REST API, async support
- Database, PostgreSQL 14+, ACID compliance, multi-tenant isolation
- Real-time, WebSockets + FastAPI, Live chat, instant notifications
- State Management, Zustand + React Query, Client and server state
- Hosting, Vercel (frontend) + Railway/Fly.io (backend), Scalable, multi-tenant ready
- Authentication, JWT + Refresh Tokens, Stateless, distributed auth
- Payment, Stripe (split payment API), Secure processing, marketplace support
- Monitoring, Sentry + CloudWatch, Error tracking, performance
- Database Migration, Alembic, Version control for schema changes
  
- Tests: Pytest, Vitest

## Constraints

- Never use `any`. Use `unknown` + type guards.

- Controllers call Services. Services call Repository. Repository call DB. Never bypass.

- In backend use utils/<domain_name_convention>.py to add utils functions to use in Services Layer, separeted by domain.

## Commands

Root (Turbo fans out to workspaces): `npm run dev | build | lint | test`.

Backend (`cd apps/backend`, uses uv — run via `uv run` ):
- `make run` — uvicorn on **port 5500** with `--reload`.
- `make migrate` — `alembic upgrade head`.
- `make migrations msg="..."` — autogenerate a migration.
- `make downgrade` — `alembic downgrade -1`.
- `pytest` — run tests; single test: `pytest tests/test_service_order_lifecycle.py::test_name`.
- Format with `black` + `isort` (both are project deps).

Web (`cd apps/web`): `npm run dev` (Vite on **port 5173**), `npm run build` (`tsx script/build.ts`), `npm run check` (`tsc`).

Local DB: `docker compose -f apps/docker/docker-compose.yml up -d db` → Postgres 16, db `car_db`, user/pass `saas`/`saas`, port 5432. `alembic.ini` hardcodes this URL; the app reads `DATABASE_URL` from `.env`.

## Backend architecture

Strict four-layer flow, one module per domain (user, vehicle, workshop, services, service_orders, workshop_client, messages, notifications, services_history):

```
api/routes/*.py   → HTTP, auth checks, role gating, HTTPException mapping
services/*.py     → business logic (e.g. ServiceService), orchestrates repos
repositories/*.py → ALL DB access, free functions named repo_* — every query is tenant-scoped
models/*.py       → SQLAlchemy models
schemas/*.py      → Pydantic request/response DTOs
```

Routers are assembled in `src/routers.py` and mounted in `src/main.py`. Add a new domain by creating the file in each of the five layers and registering its router there.

DB sessions: `src/db/database.py` exposes a **synchronous** `get_session()` generator injected via `Depends(get_session)`. Repositories call `db.commit()`/`db.refresh()` themselves — don't double-commit in the service layer.

### Auth & authorization

JWT Bearer tokens. The decoded payload carries `user_id`, `role`, `email`, `tenant_id`, `tenant_slug`. Two interchangeable styles exist in the codebase (both valid):
- **Dependency injection** (most routes): `current_user: dict = Depends(get_current_user)` from `src/core/auth.py`, then manual role checks (`if current_user.get("role") != "WORKSHOP": raise 403`). Helpers: `get_user_by_role`, `get_optional_user`, `verify_user_id_ownership`.
- **Decorators**: `@auth_middleware`, `@role_protected([...])`, `@owner_protected` from `src/core/middleware.py`, reading from `request.state.{user, user_id, email, tenant_id}`. Order must be `@router.method` → `@auth_middleware` → role/owner. See `apps/backend/DECORATOR_AUTH_GUIDE.md`.

Roles: `CLIENT`, `WORKSHOP`, `ADMIN`. Global middleware stack (in `main.py`): `AuthMiddleware` (validates JWT, attaches `request.state`, skips `PUBLIC_ROUTES`), `RateLimitMiddleware` (~60 req/min/user), `SecurityHeadersMiddleware`.

### Multi-tenancy (critical)

`tenant_id` (a UUID) lives in the JWT and is threaded **all the way down**: route reads it from `current_user`/`request.state` → passes to the service → service passes to every `repo_*` call → every repository query filters `Model.tenant_id == tenant_id`. When adding any query or new model, it **must** carry and filter by `tenant_id`, or you leak data across tenants. `src/core/tenant.py` defines `TenantContext` and `slugify_tenant_name`. `tests/test_tenant_isolation.py` guards this.

### Realtime

WebSocket chat/notifications via `src/core/websocket_manager.py` and the `messages`/`notifications` domains. WS connections authenticate with a JWT passed as a query param (`authenticate_websocket` in `core/auth.py`), which also requires `tenant_id` in the token.

### Gotcha

`main.py` currently hardcodes CORS to `http://localhost:5173` (the settings-driven `cors_origins_list` block is commented out). Change CORS there, not just in config.

## Frontend architecture

- Routing: `src/App.tsx` wraps everything in `AuthProvider` + `NotificationProvider`, then renders `publicRoutes` / `protectedRoutes` from `src/routes/routes.tsx`. `protectedRoutes` are gated by `ProtectedRoute` with an optional `requiredRole`. Pages are split by audience under `src/pages/client` and `src/pages/workshop`.
- API calls: one service module per domain under `src/services/*.tsx`, all built on `api.tsx`. Base URL is hardcoded to `http://localhost:5500`. The JWT is stored in `localStorage` (`access_token`) and auto-attached; a `401` clears it and redirects to `/login`. See `apps/web/FRONTEND_API_GUIDE.md`.
- Path aliases (`vite.config.ts`): `@` → `src`, `@shared` → `shared`, `@assets` → `attached_assets`.
- UI stack: MUI (`@mui/material`) + Tailwind, Leaflet and `@react-google-maps/api` for workshop maps (`VITE_GOOGLE_MAPS_API_KEY` required).

## Conventions

- Before merging a branch, update the root `CHANGELOG.md` (dated `## YYYY-MM-DD` sections, newest first) — there's an `/update-changelog` skill for this.
- New work is spec-driven: add/update the `specs/<date>-<feature>/` trio before/while implementing.
