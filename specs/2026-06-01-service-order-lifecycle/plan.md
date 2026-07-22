# Phase 2 Plan: Service Order Lifecycle

Last Updated: 2026-06-05
Branch: feature/2026-06-01-service-order-lifecycle
Status: Implemented

Phase Context: The next active roadmap phase is Phase 2, Service Order Lifecycle. This plan follows the product direction in `specs/MISSION.md`, the existing implementation roadmap in `specs/ROADMAP.md`, and the current backend/frontend stack documented in `specs/TECH-STACK.md`.

Implementation Note: The backend already exposes a `/service-orders` router, but some service-order behavior still leaks through `services` schemas and service modules. This phase should complete the lifecycle on the existing route surface and remove naming drift where it affects the public contract.

Implementation Result: The order lifecycle was implemented against the existing `services` model/table and normalized around the `/service-orders` API contract, with no schema migration required for that scope. The branch additionally delivered a companion vehicle service-history feature (`POST /services-history`) that did introduce a new `services_history` table and Alembic migrations.

## Task Groups

### 1. Canonical Workflow and Contract Alignment
Status: Complete

1. Confirm the lifecycle vocabulary used across backend and frontend: `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
2. Normalize the public API contract around the existing `/service-orders` resource and remove branch-scope use of inconsistent route names such as `create-services-orders` where they still appear in adapters or pages.
3. Lock the role workflow for this phase:
   - Workshop creates the service order in `PENDING`.
   - Client accepts the service order and moves it to `CONFIRMED`.
   - Workshop moves the order to `IN_PROGRESS` and then `COMPLETED`.
   - `PAID` is explicitly out of scope for this phase and deferred to Phase 6.
4. Define the transition matrix and shared status labels used by API schemas, frontend badges, filters, and dashboard summary cards.

Delivered:
- Backend and frontend now use `pending`, `confirmed`, `in_progress`, `completed`, and `cancelled` consistently.
- Frontend adapters and active pages use `/service-orders` instead of the legacy create-order route naming.

### 2. Backend Domain and Persistence
Status: Complete for branch scope

1. Audit the current service-order implementation surface in the backend route, schema, service, model, and repository layers.
2. Update the data model and schemas to support the finalized lifecycle fields required for this phase:
   - status
   - estimated cost
   - preferred date or scheduled date, if already supported by the current model
   - timestamps needed to audit status changes where the existing model supports them
3. Add or update the Alembic migration needed for any new columns, enum constraints, or indexes introduced by the lifecycle changes.
4. Keep tenant isolation intact on all service-order reads and writes.

Delivered:
- `ServiceActionUpdate`, `ServiceSummaryItem`, and `ServiceSummaryRead` were added to the schema layer.
- The service layer now enforces the lifecycle transition matrix and role-specific actions without adding a migration.
- Repository support was extended for workshop-owned service-order lookups and direct updates.

### 3. Backend Authorization and Lifecycle Endpoints
Status: Complete

1. Finalize the canonical endpoint set under `/service-orders`:
   - `POST /service-orders`
   - `GET /service-orders`
   - `GET /service-orders/{id}`
   - `PATCH /service-orders/{id}/accept`
   - `PATCH /service-orders/{id}/start`
   - `PATCH /service-orders/{id}/complete`
   - `PATCH /service-orders/{id}/cancel`
2. Enforce role-based permissions per transition:
   - Workshop-only create, start, complete
   - Client-only accept
   - Cancel only when the current status allows it
3. Return stable request and response payloads so the frontend does not need route-specific reshaping logic.
4. Preserve existing auth and tenant context rules from Phase 1.

Delivered:
- `POST /service-orders`, `GET /service-orders`, `GET /service-orders/{id}`, `GET /service-orders/summary`, `PATCH /service-orders/{id}/accept`, `PATCH /service-orders/{id}/start`, `PATCH /service-orders/{id}/complete`, and `PATCH /service-orders/{id}/cancel` are implemented.
- CORS support was updated to allow `PATCH` preflight for lifecycle endpoints.

### 4. Notifications and Dashboard Summary
Status: Complete for persisted notifications and summary delivery

1. Trigger a persisted notification on each meaningful status transition.
2. Reuse the existing notification model and delivery surface where possible instead of creating a parallel notification path.
3. Add a client-facing service-order summary for the dashboard with, at minimum:
   - count of current orders by status
   - active order count
   - a recent orders slice for quick navigation
4. Expose the summary through a backend response shape that can be consumed without frontend-only aggregation hacks.

Delivered:
- Persisted notifications are now created for both workshop and client recipients on order creation and on lifecycle status changes.
- Notification routes were corrected to resolve at `/notifications`, `/notifications/unread-count`, and related update endpoints.
- The client dashboard now consumes `/service-orders/summary`.
- The frontend notification bell now fetches live data on open and reacts to auth state changes.

### 5. Frontend Service-Order Experience
Status: Complete for branch scope

1. Update the frontend service adapters to consume the normalized `/service-orders` contract.
2. Reuse and extend existing workshop and client pages before introducing new pages.
3. Implement or repair the workshop flow for creating a service order.
4. Implement or repair the client flow for accepting a pending order and reviewing status progression.
5. Add consistent status badges, empty states, loading states, and mutation feedback across list and detail views.
6. Update the client dashboard to surface the current user's service-order summary.

Delivered:
- Workshop pages now create orders and execute start, complete, and cancel transitions against the canonical lifecycle routes.
- Client pages now accept and cancel pending orders and render the normalized status set.
- Workshop dashboard identity was corrected to use the tenant workshop profile through `/workshops/me`.
- Workshop dashboard, client/workshop messages, and client car page were widened to use the full app content width.

### 6. Vehicle Service History
Status: Complete for branch scope (full CRUD + frontend); automated test slice deferred

1. Add a `services_history` persistence surface to track completed maintenance per vehicle, kept separate from the order lifecycle. — Done
2. Model the service-type catalog and a predictive next-service interval table (mileage and days per service type). — Done
3. Expose a client-only `POST /services-history` endpoint that validates inputs and persists a tenant-scoped record. — Done
4. Auto-calculate `next_service_mileage` and `next_service_date` on creation from the current mileage, the service date, and the interval table. — Done
5. Document the schema through Alembic migrations and keep tenant isolation intact. — Done
6. Complete the CRUD surface with client-only `GET`, `PUT`, and `DELETE` endpoints, all tenant-scoped and restricted to the client's own vehicles. — Done
7. Deliver the frontend service-history experience: sidebar entry, list page with service-type filter, create/edit modal, and per-row update/delete. — Done

Delivered:
- New `ServiceHistory` model and `services_history` table with a `tenant_id` foreign key and composite indexes on `(tenant_id, id)` and `(tenant_id, vehicle_id)`; `vehicle_id` is a `CASCADE` foreign key to `vehicles`.
- `POST /services-history` creates a record for the authenticated client; non-client roles receive `403`, and missing `current_mileage` or `serviced_at` returns `400`.
- `GET /services-history` lists the client's own records (joined through `vehicles.user_id`) with an optional `service_type` and `vehicle_id` filter, ordered by `serviced_at` descending.
- `GET /services-history/{id}` returns a single owned record or `404`.
- `PUT /services-history/{id}` updates an owned record and re-derives `next_service_mileage`/`next_service_date` when `current_mileage`, `service_type`, or `serviced_at` change.
- `DELETE /services-history/{id}` removes an owned record and returns `204`; a missing or non-owned record returns `404`. All read/write paths stay tenant- and owner-scoped.
- `calculate_next_service_mileage` and `calculate_next_service_date` in `src/utils/services_history.py` derive predictions from the service-type interval table.
- Alembic migrations create and evolve the table (`be80440e36bd` create, `89fceb537d51` add `tenant_id` and tighten types/indexes, `81977476ee57` rename `mileage` to `current_mileage`, `3060d85944b0` widen mileage columns to `Float`), with `3060d85944b0` as the current head.
- Frontend: a `Histórico de Manutenção` client sidebar entry routes to `/client/service-history`. The page (`apps/web/src/pages/client/service-history-page.tsx`) renders a header with title/description and an `Adicionar Manutenção` button, a service-type filter, and a formatted table of all records with per-row edit and delete actions. The create/edit modal posts and updates records through `apps/web/src/services/service-history-service.tsx`.
- A focused automated test slice for the service-history endpoints remains tracked as follow-up.

### 7. Testing, Type Safety, and Merge Preparation
Status: Automated checks complete; manual QA deferred

1. Add backend tests for valid transitions, invalid transitions, role restrictions, and tenant isolation.
2. Add frontend type-safety coverage and any targeted component or integration tests already supported by the repo.
3. Run the backend test slice for service-order behavior.
4. Run frontend typechecking via `npm.cmd run check` in `apps/web`.
5. Perform manual verification of the workshop create flow, client accept flow, workshop progress flow, and client dashboard summary.
6. Document any remaining follow-up work that belongs to later phases, especially payment coupling and review gating.

Delivered:
- Focused backend lifecycle coverage was added in `apps/backend/tests/test_service_order_lifecycle.py`.
- Frontend typechecking passes for the updated branch.
- Manual QA is intentionally deferred for the later validation round requested by the user.
- The `services_history` feature has no dedicated automated test slice yet; its migration chain and the `POST /services-history` endpoint are follow-up coverage items.

### 8. Extension (2026-07-03): Workshop-Aware Service History
Status: Complete

Connects `services_history` to the service-order lifecycle and gives workshops read access to their own contributions, closing the previously-tracked "no automated test slice" gap at the same time.

1. Migration `6b1f2a9c4d3e` (down_revision `2cfd483fe51f`) adds `workshop_id` (FK `workshops.id`, `ON DELETE SET NULL`), `status` (default `"completed"`), `labor_cost`/`parts_cost` (replacing `cost`, with a data-copy step), `invoice_number`, `warranty_until_date`, `warranty_mileage`, `updated_at`, and a `(tenant_id, workshop_id)` composite index.
2. `ServiceHistory` model, `ServiceHistoryCreate`/`Update`/`Read` schemas, and the service/repository layers were updated accordingly; `ServiceHistoryRead` is now a standalone schema (no longer inherits `Create`) so read-only fields can't leak onto the write schemas.
3. `ServiceHistoryService` gained `create_service_history_from_completion` (skips row creation when `vehicle_id`, or `service_type`+`current_mileage`, are missing) and `get_services_history_for_workshop`; `update_service_history`/`delete_service_history` now raise `ServiceHistoryReadOnlyError` when `workshop_id is not None`, mapped to `409 Conflict` at the route layer.
4. New `GET /services-history/workshop` route (workshop-role only, declared before `GET /{history_id}` for route-matching order).
5. `ServiceActionUpdate` (used by `/service-orders/{id}/complete`) gained optional `service_type`, `current_mileage`, `labor_cost`, `parts_cost`, `invoice_number`, `warranty_until_date`, `warranty_mileage` fields. `ServiceService.transition_service_order_for_workshop` pops these into a separate `history_fields` dict *before* calling `repo_update_service` (which does a blind `setattr` with no column allowlist — leaving them in `update_data` would have set bogus non-mapped attributes on the `Service` ORM object) and only uses them, inside the `completed` branch, to call `create_service_history_from_completion`.
6. Fixed a latent bug surfaced by the new tests: `calculate_next_service_date` (`apps/backend/src/utils/services_history.py`) returned an ISO **string** instead of a `datetime`, which only worked by accident on Postgres (implicit text→timestamp cast) and failed outright under SQLite. Now returns a `datetime`, matching its schema/model type annotations.
7. New `apps/backend/tests/test_services_history.py` (13 cases) covers manual-create forcing, auto-create-on-completion (present/skipped-missing-fields/skipped-null-vehicle), workshop-scoped listing isolation, and read-only enforcement — closing the test-debt item from section 6 above.
8. Frontend: `service-history-service.tsx` types updated (drop `cost`, add the new fields; new `workshopServiceHistoryService.list()`; lifted shared formatters). Client `service-history-page.tsx` disables edit/delete and shows an "Adicionado pela oficina" chip for workshop-authored rows. New `pages/workshop/service-history-page.tsx` (read-only list), `/workshop/service-history` route, and a workshop sidebar entry. `client-orders-page.tsx`'s complete-order dialog gained an optional "Dados da Manutenção" section, shown only while the order is `in_progress`.

Delivered:
- `uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head` passed cleanly.
- `uv run pytest tests/test_services_history.py tests/test_service_order_lifecycle.py -q` — 13 passed.
- `npm run check` in `apps/web` — passed with no errors.