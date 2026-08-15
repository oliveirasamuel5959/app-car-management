# Requirements: Service Order Costs, Accept/Deny & Maintenance Breakdown

Last Updated: 2026-08-15
Branch: feature/2026-08-15-service-order-costs
Status: Planned

Context: Refactors the service-order flow around money. Today the workshop can
create an order but the create form never sends `estimated_cost`; the client can
only accept or cancel a pending order (no deny path, no `rejected` status); when
the workshop completes an order the dialog collects only workshop notes, and the
optional `labor_cost`/`parts_cost` floats land as two aggregates on
`services_history` with no line-item breakdown and no link back to the order.
The maintenance history (client and workshop) is a flat table with no
drill-down. This feature: (1) makes the workshop send an estimated cost + finish
date on creation, (2) lets the client accept or reject the estimate, (3)
replaces the close flow with a parts checklist (description, quantity, unit
price, auto total) plus labor (description + value), and (4) turns the
maintenance history into a per-order table where clicking a row opens a modal
with the existing details plus the part-by-part cost, labor cost, and service
total. Follows the service-order lifecycle
(`specs/2026-06-01-service-order-lifecycle`), multi-tenancy foundation
(`specs/2026-05-30-multi-tenancy-foundation`), and realtime
(`specs/2026-08-15-websocket-realtime`).

## 1. Scope

### In Scope

- **Workshop creation** (`apps/web/src/pages/workshop/create-orders-page.tsx`,
  backend `POST /service-orders`): new required "Custo estimado (R$)" field; the
  existing `estimated_finish_date`/time fields become required. Backend
  `ServiceCreate` (`apps/backend/src/schemas/services.py:7-23`) makes
  `estimated_cost` and `estimated_finish_date` required and
  `ServiceService.create_service` (`apps/backend/src/services/services.py:71-138`)
  rejects missing values (`ValueError` → 400).
- **Client reject**: new terminal status `rejected`. Transition
  `pending → rejected` allowed for `CLIENT` only (extend
  `_validate_transition`, `apps/backend/src/services/services.py:216-246`). New
  endpoint `PATCH /service-orders/{id}/reject` (CLIENT-only, mirrors
  `/accept` at `apps/backend/src/api/routes/service_orders.py:142-174`) calling
  a new `reject_service_order_for_client` that transitions, notifies the
  workshop (Notification + `order_status_change` WS push via the existing
  `_notify_status_change`), and leaves the order terminal. The client UI
  (`apps/web/src/pages/client/services-page.tsx`) gains a "Recusar orçamento"
  button behind the shared `ConfirmDialog`
  (`apps/web/src/components/ui/confirm-dialog.tsx`), and the pending card
  emphasizes estimated cost + finish date (the decision inputs).
- **Parts + labor on completion**: new table `service_parts` (`id`, `tenant_id`
  FK tenants, `service_order_id` FK services CASCADE, `description` String(255),
  `quantity` Integer, `unit_price` Numeric(10,2), `total_price` Numeric(10,2),
  `created_at`), tenant-scoped queries. `PATCH /service-orders/{id}/complete`
  accepts `parts: [{description, quantity, unit_price}]` (total computed
  server-side = quantity × unit_price) and `labor_description` + existing
  `labor_cost`. On completion the service layer persists the part rows, derives
  `parts_cost = Σ totals`, sets `final_cost = parts_cost + labor_cost` when
  parts/labor were supplied (existing fallback to `estimated_cost` stays when
  nothing is supplied), and always auto-creates the `services_history` record
  (when the order has a vehicle) linked via a new `service_order_id` column;
  `service_type` defaults to `"other"`, mileage optional.
- **History drill-down (both roles)**: `services_history` gains
  `service_order_id` (FK services, SET NULL, nullable) and `labor_description`
  (String(255) nullable), both exposed in `ServiceHistoryRead`. New endpoint
  `GET /service-orders/{id}/breakdown` (workshop-scoped or client-owned, same
  access rules as `GET /service-orders/{id}`) returning the order fields plus
  `parts[]`, `labor_description`, `labor_cost`, `parts_cost`, `final_cost`.
  History tables (client `apps/web/src/pages/client/service-history-page.tsx`,
  workshop `apps/web/src/pages/workshop/service-history-page.tsx`) make rows
  with `service_order_id` clickable and open a shared
  `PartsBreakdownDialog` showing the existing details plus the part-by-part
  table, labor, and total. Client manual entries (no order link) keep their
  current behavior.
- **Workshop close dialogs**: the main orders dialog
  (`apps/web/src/pages/workshop/orders-page.tsx`) and the per-client dialog
  (`apps/web/src/pages/workshop/client-orders-page.tsx`) collect the parts
  checklist + labor via a shared `PartsForm` component (dynamic rows, auto
  totals, PT-BR labels). The per-client dialog keeps service_type, mileage,
  invoice, and warranty fields; its `labor_cost`/`parts_cost` floats are
  replaced by the parts form.
- **Status surfacing**: `rejected` added to frontend status maps
  (`STATUS_META` in `apps/web/src/pages/client/service-status.ts:12-18`,
  workshop `statusLabelMap`/`statusColorMap`/`getStatusColor`, dashboard
  ternaries). No realtime contract change: `order_status_change` already
  carries `new_status: string`.
- **Tests and records**: backend pytest slices for reject lifecycle, parts
  persistence + cost derivation, breakdown access (both roles + cross-tenant
  negative), and a realtime reject push; frontend Vitest slice for the service
  adapter functions and `STATUS_META.rejected`; CHANGELOG entry.

### Out of Scope (explicitly)

- Re-sending an estimate after rejection (workshop creates a new order).
- Editing parts/labor after completion.
- Payment processing / Stripe (Phase 6); `PAID` status remains deferred.
- Parts catalog / inventory management (parts are free-text rows).
- Deleting or re-running a completion.
- The legacy `/services` router and its debug-logged update path (unchanged; it
  simply inherits the tightened `ServiceCreate` contract, documented in the
  CHANGELOG).
- Client manual history entries gaining parts rows (they keep aggregate floats
  only).

## 2. Decisions

### D1 — Rejection is terminal

`rejected` has no outgoing transitions (like `completed`/`cancelled`). A
workshop that wants to re-propose creates a new service order. Simplest
traceable flow; matches the schedules precedent
(`pendente/aceito/recusado`, `apps/backend/src/models/schedule.py:59-65`).

### D2 — Estimated cost and finish date are required at creation

The client decides on cost + date, so both must exist on every order from the
workshop. `ServiceCreate` fields become required; `create_service` validates
(`ValueError` → 400). The legacy `POST /services` route shares the schema and
inherits the requirement (the web app never calls it — documented).

### D3 — Parts are line items on a dedicated table, totals computed server-side

`service_parts` rows are owned by the service order and never trusted from the
client: `total_price` is always recomputed as `round(quantity × unit_price, 2)`.
`services_history.parts_cost` stays as the aggregate copy (existing history
columns/UI keep working); `labor_description`/`labor_cost` live on the history
record. `final_cost` on the order is `parts_cost + labor_cost` when supplied,
else falls back to `estimated_cost` (existing behavior).

### D4 — Breakdown endpoint instead of embedding parts in `ServiceRead`

`GET /service-orders/{id}/breakdown` keeps list endpoints (`GET /service-orders/`,
`/summary`) free of joins/N+1 and gives the drill-down modal a single fetch.
Access mirrors `GET /service-orders/{id}`: workshop-scoped via
`repo_get_service_for_workshop_user`, client-owned via
`repo_get_service_by_user_id` (cross-tenant email access preserved).

### D5 — Completion always creates the history record (when a vehicle exists)

The previous skip (missing `service_type`/`current_mileage` →
`apps/backend/src/services/services_history.py:106-110`) is removed so every
completed order appears in the history tables. `service_type` defaults to
`"other"` (column is NOT NULL); `next_service_mileage` is only computed when
mileage is present (`calculate_next_service_mileage` raises on `None`,
`apps/backend/src/utils/services_history.py:20-21`).

### D6 — One shared frontend parts UI

`PartsForm` (editable, close dialogs), `PartsBreakdownTable` (read-only), and
`PartsBreakdownDialog` (history drill-down) live in
`apps/web/src/components/service-orders/`, PT-BR labels, MUI only, no `any`.

### D7 — No realtime contract change

`order_status_change` already carries `new_status: string`
(`apps/web/src/realtime/realtime-socket.ts:44-49`), so `rejected` flows through
`_notify_status_change` untouched; the realtime test only adds a reject push
case.

## 3. Constraints

- **Multi-tenancy (critical):** `service_parts` rows carry `tenant_id` and every
  query filters `tenant_id` + `service_order_id`; the breakdown endpoint
  re-checks ownership server-side (no cross-tenant leak). Extend the isolation
  patterns of `tests/test_tenant_isolation.py`.
- **Four-layer flow:** controllers → services → repositories; new
  `repositories/service_parts.py` with `repo_*` free functions; no DB access
  outside repositories; business logic (validation, cost derivation) in
  `ServiceService`/`ServiceHistoryService`.
- **Backend rules** (`apps/.claude/rules/backend-api.md`): new endpoints carry
  request/response schemas (`ServicePartCreate`, `ServiceBreakdownRead`);
  failures logged with the shared logger.
- **Frontend:** no `any` (`unknown` + guards); reuse MUI Dialog/Table and the
  existing `ConfirmDialog`; currency via the existing `formatBRL`
  (`apps/web/src/pages/client/service-status.ts:20-24`).
- **Existing suites stay green:** `tests/test_tenant_isolation.py`,
  `tests/test_service_order_lifecycle.py`, realtime slices, web Vitest slice —
  except the deliberately rewritten history-skip test (behavior change is the
  feature, see D5).

## 4. Risks & Observations

- **Blind setattr crash:** `parts`/`labor_description` must be added to
  `SERVICE_HISTORY_ONLY_FIELDS` (`apps/backend/src/services/services.py:56-64`)
  or `repo_update_service` (`apps/backend/src/repositories/services.py:200-206`)
  tries to set non-existent columns.
- **Numeric → Decimal:** `total_price` reads must be cast with `float()` in
  serializers/tests (existing pattern for `labor_cost`,
  `tests/test_services_history.py:242`).
- **`final_cost` precedence:** the derived parts+labor total must win over the
  existing `estimated_cost` fallback (`services.py:355-356`); a payload with
  `parts` but no labor still sets `final_cost = parts_cost`.
- **Frontend status unions:** `'rejected'` must be added to the literal unions
  in `service-service.tsx:12`, `client/services-page.tsx:28`, and
  `client/dashboard-page.tsx:25`, or those pages won't compile.
- **Duplicate workshop pages:** the `/workshop/orders` English table and the
  `/workshop/services` PT-BR cards are parallel implementations; both must
  surface `rejected` and both close flows must collect parts.
