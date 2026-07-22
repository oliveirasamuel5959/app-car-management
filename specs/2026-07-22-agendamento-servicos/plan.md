# Plan: Agendamento de Serviços (Client ↔ Workshop)

Last Updated: 2026-07-22
Branch: feature/2026-07-22-agendamento-servicos
Status: Planned

Feature Context: A client browses workshops, opens a workshop's availability
calendar, picks a day/time, and submits a service request. The workshop receives
the request, views it, and accepts or rejects it. Both sides are notified through
the existing `notifications` surface. Source brief: `feature-agendamento-servicos.md`.

## Reconciliation with the codebase (why this plan differs from the brief)

Three exploration passes over the current tree established these facts, and the
plan is built on them rather than on the brief's assumptions:

- The `Workshop` model has **no structured hours and no employee count** — only a
  free-text `opening_hours String(255)`. It already carries `rating_avg: float`.
- The codebase persists status/type as **`String` columns, not SQLAlchemy DB
  enums**. Python `str, Enum` classes exist only in Pydantic schemas and are
  normalized to `.value` before persistence. The brief's `Enum(...)` columns are
  therefore replaced by `String` columns + schema-level enums.
- `notifications` links only to a nullable `service_id` FK.
- `src/api/routes/schedules.py` exists but is **empty and unregistered** in
  `src/routers.py`.
- Alembic head is `7d2e9f4a1c8b`; the tenant-scoping template to follow is
  `migrations/versions/0003_add_tenant_foundation.py`.
- Frontend has **no calendar library, no React Query/Zustand, and no test
  framework**; data fetching is plain `useState`/`useEffect` + a typed service
  module on `api.tsx`. Routes are `/client/*` and `/workshop/*`. The notification
  bell already polls every 30s.

## Confirmed decisions

1. Add structured `Workshop` fields (`opening_time`, `closing_time`, `work_days`,
   `employee_count`) via migration — enables real hourly-slot computation.
2. Agenda "busy" = accepted (`aceito`) schedules only, within working hours.
3. Add `react-day-picker` for date selection + a custom time-slot list.
4. Add a nullable `schedule_id` FK to `notifications` for a clean typed link.

Additional convention-matching calls: `String` columns with schema `str, Enum`
typing; routes `/client/scheduling`, `/client/scheduling/:workshopId`,
`/client/my-schedules`, `/workshop/schedules`; `workshop_ratings` created
schema-only (no endpoints/UI); client-side cancellation out of scope; list
endpoints use simple `skip`/`limit` query params returning plain lists.

## Reference implementation to mirror

The `services_history` / `service_orders` domain is the template for every layer:

- Model: `apps/backend/src/models/services_history.py`
- Schema: `apps/backend/src/schemas/services_history.py`
- Repository (free `repo_*` fns, commit/refresh in repo): `apps/backend/src/repositories/services_history.py`
- Service (class `__init__(self, db)`): `apps/backend/src/services/services_history.py`
- Route (`Depends(get_current_user)`, inline role 403, `ValueError→400`): `apps/backend/src/api/routes/service_orders.py`
- Registration: `apps/backend/src/routers.py`
- Test template: `apps/backend/tests/test_service_order_lifecycle.py`
- Migration tenant pattern: `apps/backend/migrations/versions/0003_add_tenant_foundation.py`
- Frontend list+table page: `apps/web/src/pages/workshop/clients-page.tsx`
- Frontend service module: `apps/web/src/services/workshop-client-service.tsx`
- Sidebars: `apps/web/src/components/navigation/{client,workshop}-sidebar.tsx`
- Notifications reuse: `apps/backend/src/services/notifications.py`, `apps/web/src/context/notifications-context.tsx`

---

## Task Groups (phases)

### Phase 0 — Workshop model extension (prerequisite)
Status: Planned

1. Add to `apps/backend/src/models/workshop.py`: `opening_time` (`Time`,
   nullable), `closing_time` (`Time`, nullable), `work_days` (`String(20)`,
   nullable — CSV of ISO weekday ints, e.g. `"1,2,3,4,5"`), `employee_count`
   (`Integer`, nullable).
2. Alembic migration (`down_revision = "7d2e9f4a1c8b"`) adding the four columns;
   idempotent inspector guards like `0003_add_tenant_foundation.py`.
3. Extend `WorkshopRead` / `WorkshopUpdate` schemas with the new fields; surface
   them on `GET /workshops/{id}` and `GET /workshops/me`, and allow editing on
   the existing workshop profile/settings surface.

### Phase 1 — Schedule persistence
Status: Planned

1. Schema-level enums in `apps/backend/src/schemas/schedules.py`:
   `ScheduleStatus` (`pendente|visualizado|aceito|recusado`) and
   `ServiceRequestType` (`manutencao|reparo|inspecao|outro`), both `str, Enum`.
2. New model `apps/backend/src/models/schedule.py`, table `schedules`:
   `id` (int PK), `client_tenant_id` / `workshop_tenant_id` (UUID FK
   `tenants.id`), `workshop_id` (FK `workshops.id` CASCADE),
   `vehicle_id` (FK `vehicles.id` SET NULL, nullable), `service_request_type`
   (`String(20)`), `problem_description` (`Text`), `contact_phone` (`String(20)`),
   `contact_email` (`String(255)`), `scheduled_at` (`DateTime(timezone=True)`),
   `status` (`String(20)`, default `"pendente"`), `viewed_at` / `responded_at`
   (nullable), `created_at` / `updated_at`. Composite indexes
   `ix_schedules_workshop_tenant_id_scheduled_at` and
   `ix_schedules_client_tenant_id_status`. Relationships use explicit
   `foreign_keys=[...]` because two FKs point at `tenants.id`.
3. New model `apps/backend/src/models/workshop_rating.py`, table
   `workshop_ratings` (schema-only): `id`, `workshop_tenant_id`,
   `client_tenant_id`, `schedule_id` (FK `schedules.id` SET NULL, nullable),
   `rating` (`Integer`), `comment` (`Text`, nullable), `created_at`;
   `UniqueConstraint(schedule_id)` and `CheckConstraint(0 <= rating <= 5)`.
4. Add nullable `schedule_id` FK to `notifications`
   (`apps/backend/src/models/notification.py`).
5. Register both new models in `apps/backend/src/models/__init__.py` (so Alembic
   autogenerate sees them) and add a `schedules` relationship on `Tenant`.
6. One Alembic migration (`down_revision = "7d2e9f4a1c8b"`, chained after
   Phase 0's) creating `schedules`, `workshop_ratings`, and the
   `notifications.schedule_id` column, following the `0003` tenant pattern
   (`UUID(as_uuid=False)`, `fk_<table>_tenant_id`, composite indexes).

### Phase 2 — Workshop-side endpoints (build first; no agenda math)
Status: Planned

1. `apps/backend/src/repositories/schedules.py` — `repo_*` free functions,
   commit/refresh in the repo, filtering on `workshop_tenant_id`:
   `repo_create_schedule`, `repo_get_schedules_for_workshop`,
   `repo_get_schedule_by_id` (tenant-scoped), `repo_update_schedule`.
2. `apps/backend/src/services/schedules.py` — `ScheduleService(db)` enforcing the
   transition matrix (`pendente → visualizado → {aceito|recusado}`; terminal
   states immutable; illegal → `ValueError`).
3. `apps/backend/src/api/routes/schedules.py` (fill the empty stub) — WORKSHOP-
   gated, inline 403:
   - `GET /schedules?workshop_tenant_id=me&skip=&limit=` — received requests.
   - `GET /schedules/{id}`.
   - `PATCH /schedules/{id}/view` — `pendente → visualizado`, set `viewed_at`.
   - `PATCH /schedules/{id}/accept` — `→ aceito`, set `responded_at`.
   - `PATCH /schedules/{id}/reject` — `→ recusado`, set `responded_at`.
4. Register the router in `apps/backend/src/routers.py`
   (`prefix="/schedules", tags=["schedules"]`).

### Phase 3 — Client-side endpoints
Status: Planned

1. `GET /workshops?name=&lat=&lng=&radius_km=&skip=&limit=` — extend the existing
   workshops route / `api.workshops` with name and location filtering.
2. `GET /workshops/{id}` — detail with hours, `employee_count`, `rating_avg`.
3. `GET /workshops/{workshop_id}/agenda?date_from=&date_to=` — for each day in
   range, if the weekday is in `work_days`, emit slots between `opening_time` and
   `closing_time`, marking a slot busy when an `aceito` schedule occupies it.
4. `POST /schedules` — CLIENT-gated create; status defaults to `pendente`;
   populates `client_tenant_id` from the caller and `workshop_tenant_id` from the
   target workshop.
5. `GET /schedules?client_tenant_id=me&skip=&limit=` — "Meus Agendamentos".

### Phase 4 — Notifications integration
Status: Planned

1. On `POST /schedules`, create a notification for the workshop's user
   (new request received), passing `schedule_id`.
2. On accept/reject, create a notification for the client's user with a
   Portuguese status label (mirror `create_status_change_notification` in
   `apps/backend/src/services/notifications.py`), passing `schedule_id`.

### Phase 5 — Frontend
Status: Planned

1. Add `react-day-picker` to `apps/web/package.json`.
2. `apps/web/src/services/schedule-service.tsx` — typed module mirroring
   `workshop-client-service.tsx`: string-literal union statuses, `URLSearchParams`
   query building, no `any`. Extend the workshop service with `agenda` + detail.
3. Sidebar entries: client "Novo Agendamento" → `/client/scheduling`
   (`client-sidebar.tsx`); workshop "Agendamentos" → `/workshop/schedules`
   (`workshop-sidebar.tsx`).
4. Pages:
   - `/client/scheduling` — workshop table with name + browser-geolocation filter
     (reuse `api.location`); each row navigates to the detail page.
   - `/client/scheduling/:workshopId` — header, info block (hours, employees,
     read-only 0–5 star rating from `rating_avg`), `react-day-picker` calendar
     bound to the agenda endpoint, and a booking modal
     (`service_request_type` select, `problem_description` textarea,
     `contact_phone`, `contact_email`) → `POST /schedules`.
   - `/client/my-schedules` — status-badge table; reuse the 30s poll pattern.
   - `/workshop/schedules` — requests table + detail modal with
     Accept / Reject / Cancel (Cancel just closes); opening the modal fires
     `PATCH /schedules/{id}/view`.
5. Register all four routes in `apps/web/src/routes/routes.tsx`.

### Phase 6 — Tests, validation, changelog
Status: Planned

1. Backend `apps/backend/tests/test_schedule_lifecycle.py` — SQLite in-memory,
   direct service/repo calls, `create_access_token` for claims (mirror
   `test_service_order_lifecycle.py`). Cases enumerated in `validation.md`.
2. Frontend: `npm run check` (mandatory) + a greenfield Vitest slice (set up
   Vitest + React Testing Library) covering `schedule-service` query building and
   booking-modal validation.
3. Migration up/down/up verification.
4. Update root `CHANGELOG.md` (dated `## 2026-07-22` section, newest first).

---

## Suggested implementation order

Phase 0 → 1 → 2 → 3 → 4 → 5 → 6. Phases 0–1 are pure schema; Phase 2 (workshop
side) is simplest and validates the model before the agenda math in Phase 3.
