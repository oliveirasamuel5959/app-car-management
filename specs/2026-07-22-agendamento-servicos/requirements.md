# Requirements: Agendamento de Serviços (Client ↔ Workshop)

Last Updated: 2026-07-22
Branch: feature/2026-07-22-agendamento-servicos
Status: Planned

Context: This requirements set turns `feature-agendamento-servicos.md` into
executable requirements, reconciled with the actual codebase (see `plan.md` for
the reconciliation notes). It follows the multi-tenancy foundation
(`specs/2026-05-30-multi-tenancy-foundation`) and the four-layer backend
architecture documented in `CLAUDE.md`.

## 1. Scope

### In Scope
- Client-facing workshop discovery (list + name/location filter), workshop detail,
  and an availability calendar derived from accepted schedules.
- Client creation of a service-scheduling request (`pendente`).
- Workshop review of received requests: view, accept, reject.
- Persisted notifications on create/accept/reject reusing the `notifications` table.
- Structured `Workshop` operating-hours + employee-count fields.
- A schema-only `workshop_ratings` table (no endpoints/UI this delivery).
- Tenant-safe, role-safe behavior on every read and write.

### Out of Scope
- Rating submission UI and `POST /workshop-ratings` endpoint (table only).
- WebSocket/real-time delivery (reuse existing polling).
- Client-side cancellation of a schedule after it is created (would require a new
  `cancelado_pelo_cliente` status).
- Payment, invoicing, or coupling to the `services` order lifecycle.

## 2. Functional Requirements by Phase

### Phase 0 — Workshop model extension
- `Workshop` gains `opening_time` (Time), `closing_time` (Time), `work_days`
  (String CSV of ISO weekday ints, `1`=Monday … `7`=Sunday), `employee_count`
  (Integer). All nullable to keep existing rows valid.
- `GET /workshops/{id}` and `GET /workshops/me` return the new fields.
- A workshop user can edit these fields via the existing workshop profile/settings
  surface; `WorkshopUpdate` accepts them.
- The migration adds the columns without dropping/rewriting existing data.

### Phase 1 — Schedule persistence
- `schedules` stores both `client_tenant_id` and `workshop_tenant_id` (dual-tenant
  model), plus `workshop_id`, optional `vehicle_id`, the request fields
  (`service_request_type`, `problem_description`, `contact_phone`,
  `contact_email`), `scheduled_at`, `status`, `viewed_at`, `responded_at`, and
  audit timestamps.
- `status` values are exactly `pendente`, `visualizado`, `aceito`, `recusado`
  (String column; validated via schema `str, Enum`). Default `pendente`.
- `service_request_type` values are exactly `manutencao`, `reparo`, `inspecao`,
  `outro`.
- `workshop_ratings` exists with `UniqueConstraint(schedule_id)` and
  `CheckConstraint(rating BETWEEN 0 AND 5)` but is not read/written by any endpoint.
- `notifications` gains a nullable `schedule_id` FK (`ON DELETE SET NULL`).
- Both new models are imported in `src/models/__init__.py`; `Tenant` gets a
  `schedules` relationship.

### Phase 2 — Workshop-side endpoints
- `GET /schedules?workshop_tenant_id=me` returns only schedules whose
  `workshop_tenant_id` matches the caller's tenant, newest `scheduled_at` first,
  with `skip`/`limit`.
- `GET /schedules/{id}` returns a single schedule owned by the caller's workshop
  tenant, else `404`.
- `PATCH /schedules/{id}/view` moves `pendente → visualizado` and sets `viewed_at`;
  a no-op-safe transition from later states must not regress status.
- `PATCH /schedules/{id}/accept` moves to `aceito` and sets `responded_at`.
- `PATCH /schedules/{id}/reject` moves to `recusado` and sets `responded_at`.
- All four are WORKSHOP-role only; any other role → `403`.

### Phase 3 — Client-side endpoints
- `GET /workshops` supports `name` (case-insensitive contains) and
  `lat`/`lng`/`radius_km` location filtering, with `skip`/`limit`.
- `GET /workshops/{id}` exposes hours, `employee_count`, and `rating_avg`.
- `GET /workshops/{workshop_id}/agenda?date_from=&date_to=` returns, per day in
  range: whether the workshop is open (weekday ∈ `work_days`) and the list of time
  slots between `opening_time` and `closing_time`, each flagged busy iff an
  `aceito` schedule for that workshop occupies it.
- `POST /schedules` is CLIENT-role only, creates a `pendente` schedule, sets
  `client_tenant_id` from the caller and `workshop_tenant_id` from the target
  workshop, and rejects a `scheduled_at` outside the workshop's working hours with
  a validation error (`400`).
- `GET /schedules?client_tenant_id=me` returns only the caller-client's schedules.

### Phase 4 — Notifications
- Creating a schedule persists a notification for the workshop's user with
  `schedule_id` set.
- Accepting/rejecting persists a notification for the client's user with a
  Portuguese status label and `schedule_id` set.
- Notification content identifies the workshop/schedule and the new status.

### Phase 5 — Frontend
- Client sidebar shows "Novo Agendamento" → `/client/scheduling`; workshop sidebar
  shows "Agendamentos" → `/workshop/schedules`.
- `/client/scheduling` lists workshops with a name filter and a "use my location"
  filter (browser geolocation → backend location params); rows are clickable.
- `/client/scheduling/:workshopId` shows the info block (hours, employees,
  read-only 0–5 stars from `rating_avg`), a `react-day-picker` calendar bound to
  the agenda endpoint, and a booking modal that POSTs a schedule.
- `/client/my-schedules` lists the client's schedules with a colored status badge
  and refreshes via the existing 30s poll.
- `/workshop/schedules` lists received requests with status, and a detail modal
  offering Accept / Reject / Cancel; opening the modal marks the request viewed.
- No `any`: the service module and pages use typed interfaces and
  `err instanceof Error` narrowing.

### Phase 6 — Tests & changelog
- A backend lifecycle test slice exists and passes (see `validation.md`).
- Frontend `npm run check` passes with no TS errors; a greenfield Vitest slice
  covers the service module + modal validation.
- Root `CHANGELOG.md` gains a dated `## 2026-07-22` entry.

## 3. Cross-Cutting Requirements

### 3.1 Dual-tenant isolation (critical)
- Every `repo_*` for `schedules` filters on the caller's tenant via the correct
  column: `client_tenant_id` for CLIENT reads/writes, `workshop_tenant_id` for
  WORKSHOP reads/writes.
- A schedule is only ever visible to its two owning tenants; a request scoped to
  any other tenant returns empty/`None` (never leaks).
- No `repo_*` may run a schedules query without a tenant id.

### 3.2 Status transition matrix
```
pendente ──view──▶ visualizado ──accept──▶ aceito   (terminal)
                                └─reject──▶ recusado (terminal)
```
- Accept/reject are allowed from `pendente` or `visualizado`.
- `aceito` and `recusado` are terminal; further transitions → `ValueError` → `400`.

### 3.3 Role matrix
- CLIENT: create schedules, list own (`client_tenant_id=me`), read workshops/agenda.
- WORKSHOP: list received (`workshop_tenant_id=me`), read one, view/accept/reject.
- Any cross-role action → `403`.

## 4. Technical Decisions

1. **String columns, schema enums** — persist `status`/`service_request_type` as
   `String`, validate with Pydantic `str, Enum`, normalize to `.value` before
   persistence (matches `services_history`). No SQLAlchemy DB enums.
2. **Structured Workshop fields** — real `opening_time`/`closing_time`/`work_days`/
   `employee_count` rather than parsing the free-text `opening_hours`.
3. **Agenda = accepted schedules only** — availability is derived from `aceito`
   schedules within working hours; it does not consult the `services` order
   lifecycle (whose timing is loosely modeled).
4. **`notifications.schedule_id`** — a dedicated nullable FK, parallel to the
   existing `service_id`, for a clean typed link.
5. **Route naming** — `/client/*` and `/workshop/*` (codebase convention), not the
   brief's PT route names.
6. **`workshop_ratings` schema-only** — the table lands now so the rating feature
   has a stable target; no endpoints/UI this delivery. Read-side display uses the
   pre-existing `Workshop.rating_avg` column.
7. **Simple list params** — `skip`/`limit` returning plain lists (mirrors
   `messages.py`/`notifications.py`); no pagination envelope exists in the repo.

## 5. Success Definition

Ready for merge when:
- a client can discover a workshop, view its agenda, and submit a `pendente`
  schedule;
- a workshop can list, view, accept, and reject its received schedules;
- accept/reject and create each persist a `schedule_id`-linked notification;
- invalid transitions and cross-role/cross-tenant actions are rejected;
- the migration applies/downgrades/re-applies cleanly;
- backend lifecycle tests pass and `npm run check` passes;
- `CHANGELOG.md` is updated and no tenant-isolation regression is introduced;
- validations in `validation.md` pass and the user has reviewed the result.
