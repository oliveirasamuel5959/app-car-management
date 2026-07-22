# Validation: Agendamento de Serviços (Client ↔ Workshop)

Last Updated: 2026-07-22
Branch: feature/2026-07-22-agendamento-servicos
Status: Planned

Purpose: Define the evidence required to confirm the scheduling feature is
correct, tenant-safe, and ready to merge, and enumerate the tests to write and
run for both backend and frontend.

## 1. Functional Acceptance Criteria

### 1.1 Workshop fields (Phase 0)
- `GET /workshops/{id}` and `/workshops/me` return `opening_time`,
  `closing_time`, `work_days`, `employee_count`.
- A workshop user can update those fields; a non-workshop user cannot.
- Existing workshop rows remain valid after the migration (new columns nullable).

### 1.2 Persistence & schema (Phase 1)
- A `schedules` row persists both tenant ids, the request fields, `scheduled_at`,
  and defaults `status = "pendente"`.
- `workshop_ratings` exists with the unique + check constraints; nothing writes to
  it yet.
- `notifications.schedule_id` exists and is nullable.

### 1.3 Workshop-side lifecycle (Phase 2)
- `GET /schedules?workshop_tenant_id=me` returns only the caller-workshop's rows.
- `PATCH /view` sets `visualizado` + `viewed_at`; `PATCH /accept` sets `aceito` +
  `responded_at`; `PATCH /reject` sets `recusado` + `responded_at`.
- Accept/reject from a terminal state is rejected (`400`).
- A CLIENT calling any workshop action gets `403`.

### 1.4 Client-side flow (Phase 3)
- `GET /workshops` filters by `name` and by `lat`/`lng`/`radius_km`.
- `GET /workshops/{id}/agenda` marks a slot busy iff an `aceito` schedule occupies
  it, and reports days whose weekday is not in `work_days` as closed.
- `POST /schedules` (CLIENT) creates a `pendente` row; a WORKSHOP calling it gets
  `403`; a `scheduled_at` outside working hours is rejected (`400`).
- `GET /schedules?client_tenant_id=me` returns only the caller-client's rows.

### 1.5 Notifications (Phase 4)
- Creating a schedule persists exactly one notification for the workshop user with
  `schedule_id` set.
- Accepting/rejecting persists exactly one notification for the client user with
  the correct Portuguese status label and `schedule_id` set.

## 2. Backend Validation

### 2.1 Automated tests — write in `apps/backend/tests/test_schedule_lifecycle.py`

Mirror `test_service_order_lifecycle.py`: SQLite in-memory
(`Base.metadata.create_all`, `PRAGMA foreign_keys=ON`), a `seed_schedule_graph()`
helper building tenants → users (CLIENT + WORKSHOP) → workshop → vehicle, and
direct `ScheduleService` / `repo_*` calls (no HTTP TestClient — the repo has none).

Cases to cover:
1. `create` → status `pendente`, both tenant ids populated.
2. `view` → `visualizado` + `viewed_at` set.
3. `accept` from `pendente`/`visualizado` → `aceito` + `responded_at` + one client
   notification row with `schedule_id`.
4. `reject` → `recusado` + `responded_at` + one client notification row.
5. Transition from a terminal state raises `ValueError`.
6. Role gating: creating as WORKSHOP and accepting as CLIENT are rejected.
7. Dual-tenant isolation: `repo_get_schedules_for_workshop` /
   `repo_get_schedule_by_id` return `[]`/`None` for the wrong `workshop_tenant_id`;
   the client list returns `[]`/`None` for the wrong `client_tenant_id`.
8. `repo_*` called without a tenant id raises `TypeError`.
9. Agenda: a slot overlapping an `aceito` schedule is `busy`; a day whose weekday
   ∉ `work_days` is `closed`; a slot with no accepted schedule is `free`.
10. `POST` validation: `scheduled_at` outside `opening_time`–`closing_time` raises
    `ValueError`.

Command:
```bash
cd apps/backend && uv run pytest tests/test_schedule_lifecycle.py -q
```
Expected: all cases pass.

### 2.2 Migration verification
```bash
cd apps/backend && uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head
```
Expected: the schedules/workshop_ratings/notifications-column migration (and the
Phase 0 workshop-columns migration) apply, downgrade, and re-apply cleanly.

Note: `tests/test_tenant_isolation.py` currently fails to collect on some trees
due to a pre-existing `.env`/`Settings` validation error unrelated to this feature;
confirm that is not a regression introduced here (compare against the base tree).

## 3. Frontend Validation

### 3.1 Type safety (mandatory)
```bash
cd apps/web && npm run check
```
Expected: no TypeScript errors across the new service module, pages, and routes;
no use of `any`.

### 3.2 Automated tests — greenfield Vitest
There is no frontend test framework today, so this feature sets one up: add
`vitest` + `@testing-library/react` + `@testing-library/jest-dom` (dev deps) and a
minimal `vitest.config.ts`. Cases:
1. `schedule-service` builds correct query strings for
   `?workshop_tenant_id=me`, `?client_tenant_id=me`, and agenda `date_from`/`date_to`.
2. The booking modal blocks submit until `service_request_type`,
   `problem_description`, `contact_phone`, and `contact_email` are valid, and calls
   `POST /schedules` with the selected `scheduled_at` when valid.

Command:
```bash
cd apps/web && npm run test
```
(If the greenfield Vitest setup is deferred, `npm run check` + the manual QA script
below are the minimum gate, and the Vitest slice is tracked as follow-up.)

### 3.3 Manual QA script
1. As a workshop user, set operating hours + employee count in settings.
2. As a client, open `/client/scheduling`, filter by name and by "use my
   location", and open a workshop.
3. Pick an open day/time on the calendar; confirm booked (`aceito`) slots are
   greyed out; submit the booking modal.
4. As the workshop user, open `/workshop/schedules`, open the request (status
   flips to `Visualizado`), and Accept it.
5. As the client, confirm `/client/my-schedules` shows `Aceito` and a notification
   appears in the bell within ~30s.
6. Repeat with Reject; confirm the client sees `Recusado` + a notification.

## 4. Merge Gate

Merge-ready only when all are true:
- backend lifecycle test slice passes;
- migration upgrade/downgrade/upgrade cycle passes;
- `npm run check` passes (and the Vitest slice passes, or is explicitly tracked as
  follow-up);
- manual QA script completes end to end;
- no dual-tenant isolation regression (cross-tenant reads return empty/None);
- root `CHANGELOG.md` updated with a dated `## 2026-07-22` entry.

## 5. Non-Goals for Validation
- Rating submission (table is schema-only).
- WebSocket real-time delivery.
- Client-side cancellation of a created schedule.
