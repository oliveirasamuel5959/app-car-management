# Phase 2 Plan: Service Order Lifecycle

Last Updated: 2026-06-01
Branch: feature/2026-06-01-service-order-lifecycle

Phase Context: The next active roadmap phase is Phase 2, Service Order Lifecycle. This plan follows the product direction in `specs/MISSION.md`, the existing implementation roadmap in `specs/ROADMAP.md`, and the current backend/frontend stack documented in `specs/TECH-STACK.md`.

Implementation Note: The backend already exposes a `/service-orders` router, but some service-order behavior still leaks through `services` schemas and service modules. This phase should complete the lifecycle on the existing route surface and remove naming drift where it affects the public contract.

## Task Groups

### 1. Canonical Workflow and Contract Alignment
1. Confirm the lifecycle vocabulary used across backend and frontend: `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
2. Normalize the public API contract around the existing `/service-orders` resource and remove branch-scope use of inconsistent route names such as `create-services-orders` where they still appear in adapters or pages.
3. Lock the role workflow for this phase:
   - Workshop creates the service order in `PENDING`.
   - Client accepts the service order and moves it to `CONFIRMED`.
   - Workshop moves the order to `IN_PROGRESS` and then `COMPLETED`.
   - `PAID` is explicitly out of scope for this phase and deferred to Phase 6.
4. Define the transition matrix and shared status labels used by API schemas, frontend badges, filters, and dashboard summary cards.

### 2. Backend Domain and Persistence
1. Audit the current service-order implementation surface in the backend route, schema, service, model, and repository layers.
2. Update the data model and schemas to support the finalized lifecycle fields required for this phase:
   - status
   - estimated cost
   - preferred date or scheduled date, if already supported by the current model
   - timestamps needed to audit status changes where the existing model supports them
3. Add or update the Alembic migration needed for any new columns, enum constraints, or indexes introduced by the lifecycle changes.
4. Keep tenant isolation intact on all service-order reads and writes.

### 3. Backend Authorization and Lifecycle Endpoints
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

### 4. Notifications and Dashboard Summary
1. Trigger a persisted notification on each meaningful status transition.
2. Reuse the existing notification model and delivery surface where possible instead of creating a parallel notification path.
3. Add a client-facing service-order summary for the dashboard with, at minimum:
   - count of current orders by status
   - active order count
   - a recent orders slice for quick navigation
4. Expose the summary through a backend response shape that can be consumed without frontend-only aggregation hacks.

### 5. Frontend Service-Order Experience
1. Update the frontend service adapters to consume the normalized `/service-orders` contract.
2. Reuse and extend existing workshop and client pages before introducing new pages.
3. Implement or repair the workshop flow for creating a service order.
4. Implement or repair the client flow for accepting a pending order and reviewing status progression.
5. Add consistent status badges, empty states, loading states, and mutation feedback across list and detail views.
6. Update the client dashboard to surface the current user's service-order summary.

### 6. Testing, Type Safety, and Merge Preparation
1. Add backend tests for valid transitions, invalid transitions, role restrictions, and tenant isolation.
2. Add frontend type-safety coverage and any targeted component or integration tests already supported by the repo.
3. Run the backend test slice for service-order behavior.
4. Run frontend typechecking via `npm.cmd run check` in `apps/web`.
5. Perform manual verification of the workshop create flow, client accept flow, workshop progress flow, and client dashboard summary.
6. Document any remaining follow-up work that belongs to later phases, especially payment coupling and review gating.