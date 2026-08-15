# Plan: Service Order Costs, Accept/Deny & Maintenance Breakdown

Last Updated: 2026-08-15
Branch: feature/2026-08-15-service-order-costs
Status: Planned

Feature Context: Refactor the service-order flow around money: workshop sends an
estimated cost + finish date at creation, client accepts or rejects the
estimate, completion collects a parts checklist + labor, and the maintenance
history (both roles) drills down per order to a part-by-part cost breakdown.
Requirements and decisions: [requirements.md](requirements.md).

## Reconciliation with the codebase (why this plan differs from the naive approach)

- `estimated_cost` / `final_cost` / `estimated_finish_date` already exist on the
  `Service` model (`apps/backend/src/models/services.py:53-61`) and in
  `ServiceCreate` — the gap is the create form never sends cost and nothing
  validates it. This plan makes them required instead of adding new columns.
- The client already renders "Custo estimado"/"Custo final" on the service cards
  (`apps/web/src/pages/client/services-page.tsx:252-257`) and has an
  "Aceitar orçamento" button; the missing piece is the reject path. The
  schedules domain already models deny (`recusado`,
  `apps/backend/src/models/schedule.py:59-65`); orders gain a parallel
  `rejected` status instead of a new mechanism.
- Parts/labor exist only as aggregates on `services_history`
  (`labor_cost`/`parts_cost`). A new `service_parts` line-item table is the
  minimal addition; the aggregates stay as copies so the existing history
  columns keep working (D3).
- The history pages are plain MUI tables with no drill-down precedent; the
  workshop-authored rows are already read-only for clients
  (`ServiceHistoryReadOnlyError`). Rows gain clickability only when
  `service_order_id` is set; manual client entries are untouched.
- The close flow already exists twice: `orders-page.tsx` (notes only) and
  `client-orders-page.tsx` (aggregate floats + service_type/mileage/NF/warranty).
  Both converge on one shared `PartsForm`; the per-client dialog keeps its extra
  fields.

## Confirmed decisions (user)

1. Rejection is terminal (`rejected`); workshop re-proposes with a new order.
2. Completion deadline is the estimated finish date (already collected; becomes
   required alongside `estimated_cost`).
3. Parts are dynamic rows (description, quantity, unit price) with the total
   auto-computed (qty × unit); labor is a single description + value.
4. History drill-down opens a modal per order, on both client and workshop
   sides.

## Reference implementation to mirror

- Status transitions + notifications: `apps/backend/src/services/services.py`
  (`_validate_transition` L216-246, `accept_service_order_for_client` L395-425,
  `_notify_status_change` L276-321)
- Completion + history auto-create:
  `apps/backend/src/services/services.py:323-393` and
  `apps/backend/src/services/services_history.py:77-135`
- Accept/deny precedent: `apps/backend/src/api/routes/schedules.py` (reject
  route) + `apps/backend/src/services/schedules.py:102`
- Migration style: `apps/backend/migrations/versions/f87ec4fd3f5c_add_workshop_services_catalog.py`
  (head; plain create_table/add_column with explicit downgrade)
- Test templates: `apps/backend/tests/test_service_order_lifecycle.py`
  (`build_session`/`seed_service_graph`), `apps/backend/tests/test_services_history.py`
  (`complete_order` helper), `apps/backend/tests/test_realtime_events.py:343`
  (accept push case)
- Frontend dialog + confirm patterns: `apps/web/src/components/ui/confirm-dialog.tsx`;
  currency: `formatBRL` (`apps/web/src/pages/client/service-status.ts:20-24`)

## TG1 — Backend: migration, models, schemas, repository

- **1.1** Migration `apps/backend/migrations/versions/<12hex>_add_service_parts_and_order_link.py`
  (`down_revision='f87ec4fd3f5c'`): create `service_parts`
  (id PK, tenant_id FK tenants NOT NULL, service_order_id FK services CASCADE
  NOT NULL, description String(255) NOT NULL, quantity Integer NOT NULL,
  unit_price Numeric(10,2) NOT NULL, total_price Numeric(10,2) NOT NULL,
  created_at DateTime NOT NULL) + indexes on tenant_id and service_order_id;
  add `service_order_id` (FK services SET NULL, nullable) and
  `labor_description` (String(255) nullable) to `services_history`; explicit
  `downgrade()`.
- **1.2** Model `apps/backend/src/models/service_part.py` (`ServicePart`,
  composite index `ix_service_parts_tenant_id_id`); `services.py` adds
  `parts = relationship("ServicePart", back_populates="service_order",
  cascade="all, delete-orphan")` and `rejected` in the status docstring;
  `services_history.py` adds the two columns; export `ServicePart` in
  `models/__init__.py`.
- **1.3** Schemas `apps/backend/src/schemas/services.py`: `ServiceCreate`
  requires `estimated_cost`/`estimated_finish_date`; new `ServicePartCreate`
  (description min_length 1, quantity gt 0, unit_price ge 0), `ServicePartRead`,
  `ServiceBreakdownRead`; `ServiceActionUpdate` gains
  `parts: list[ServicePartCreate] | None` and `labor_description`. Schemas
  `services_history.py`: `ServiceHistoryRead` gains `service_order_id` +
  `labor_description`.
- **1.4** Repository `apps/backend/src/repositories/service_parts.py`:
  `repo_create_service_part(db, tenant_id, *, service_order_id, description,
  quantity, unit_price, total_price)` and
  `repo_get_service_parts_for_order(db, tenant_id, service_order_id)` — both
  filtered by `tenant_id`.
- **Verificação:** `cd apps/backend && uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head`
- **Commit:** `feat(api): service_parts table + services_history order link (service-order costs)`

## TG2 — Backend: service layer + routes

- **2.1** `services/services.py`: add `SERVICE_STATUS_REJECTED = "rejected"` to
  constants + `VALID_SERVICE_STATUSES`; `pending → rejected` for CLIENT in
  `_validate_transition` (+ terminal entry); add `parts`/`labor_description` to
  `SERVICE_HISTORY_ONLY_FIELDS`.
- **2.2** `create_service`: validate `estimated_cost`/`estimated_finish_date`
  present → `ValueError`.
- **2.3** New `reject_service_order_for_client` (clone of accept: resolve via
  `_get_client_owned_service`, validate transition, update status, notify).
- **2.4** Completion branch of `transition_service_order_for_workshop`: pop
  `parts`/`labor_description` with the history fields; persist part rows
  (tenant-scoped, `total_price = round(quantity * unit_price, 2)`); derive
  `parts_cost`; set `final_cost = parts_cost + labor_cost` when parts/labor
  supplied (before the `estimated_cost` fallback); pass `service_order_id`,
  derived `parts_cost`, and `labor_description` to
  `create_service_history_from_completion`.
- **2.5** `services/services_history.py` `create_service_history_from_completion`:
  add `service_order_id`/`labor_description` params; drop the
  service_type/mileage skip (keep vehicle_id skip); default `service_type` to
  `"other"`; compute `next_service_mileage` only when mileage present.
- **2.6** New `get_service_order_breakdown` in `ServiceService` (role-aware
  fetch + `repo_get_service_parts_for_order`, floats cast from Decimal).
- **2.7** Routes `api/routes/service_orders.py`: `PATCH /{service_id}/reject`
  (CLIENT gate, ValueError→400, None→404) and `GET /{service_id}/breakdown`
  (auth only; ownership enforced in the service).
- **Verificação:** `cd apps/backend && uv run pytest tests/test_service_order_lifecycle.py tests/test_services_history.py tests/test_realtime_events.py -q`
- **Commit:** `feat(api): client reject flow + parts/labor completion with derived costs`

## TG3 — Backend: tests (written first, then green with TG1-2)

- **3.1** `tests/test_service_order_lifecycle.py`: reject notifies only the
  workshop; rejected is terminal (accept/start/complete/cancel raise);
  create requires cost + finish date.
- **3.2** `tests/test_services_history.py`: rewrite the skip test → history is
  created with `service_type="other"` and `service_order_id` linked; new test
  completing with 2 parts + labor → part rows persisted (tenant + order FKs),
  `parts_cost`/`final_cost` derived; fallback without parts → `final_cost ==
  estimated_cost`; breakdown access for client, workshop, and cross-tenant None.
- **3.3** `tests/test_realtime_events.py`: client reject pushes
  `order_status_change` with `new_status="rejected"` to the workshop.
- **Verificação:** `cd apps/backend && uv run pytest -q` (full suite)
- **Commit:** `test(api): reject lifecycle, parts cost derivation, breakdown access`

## TG4 — Frontend: service adapters + shared parts components

- **4.1** `apps/web/src/services/service-service.tsx`: `ServicePartInput`,
  `ServicePart`, `ServiceBreakdown` types; `rejectServiceOrder(id)`;
  `getServiceOrderBreakdown(id)`; `completeServiceOrder` payload gains
  `parts`/`labor_description`; `'rejected'` in the status union; `createService`
  requires `estimated_cost` + `estimated_finish_date`.
  `service-history-service.tsx`: `ServiceHistory` gains `service_order_id` +
  `labor_description`.
- **4.2** Vitest `apps/web/src/services/service-service.test.ts` (mirror
  `workshop-service.test.ts` mocking style): reject/breakdown calls and the
  completion payload; extend
  `apps/web/src/pages/client/service-status.test.ts` with `STATUS_META.rejected`.
- **4.3** Components `apps/web/src/components/service-orders/`:
  `parts-form.tsx` (dynamic rows: Peças substituídas / Quantidade / Valor
  unitário (R$) / Valor total auto via `formatBRL`; "Adicionar peça"; Mão de
  obra description + value; live total preview; `normalizePartsValue` drops
  empty rows), `parts-breakdown-table.tsx` (read-only per-part + totals
  Peças / Mão de obra / Total do serviço), `parts-breakdown-dialog.tsx`
  (fetches breakdown, order header via `STATUS_META` + table).
- **Verificação:** `cd apps/web && npm run check && npm run test`
- **Commit:** `feat(web): service-order adapters + PartsForm/PartsBreakdown components`

## TG5 — Frontend: workshop flows (create + close)

- **5.1** `pages/workshop/create-orders-page.tsx`: "Custo estimado (R$)"
  required field + validation; make estimated finish date validated as
  required; send `estimated_cost`.
- **5.2** `pages/workshop/orders-page.tsx`: `getStatusColor` gains `rejected`;
  `PartsForm` rendered in the dialog when `in_progress`; completion payload
  `{workshop_notes, parts, labor_description, labor_cost}`; `catch (err: any)`
  → `unknown` + guard.
- **5.3** `pages/workshop/client-orders-page.tsx`: replace the
  `labor_cost`/`parts_cost` float fields with `PartsForm`; keep
  service_type/mileage/NF/warranty; `getStatusColor` gains `rejected`.
- **Verificação:** `cd apps/web && npm run check && npm run build`
- **Commit:** `feat(web): estimated cost on create + parts checklist on workshop close dialogs`

## TG6 — Frontend: client reject + status maps + history drill-down

- **6.1** `pages/client/services-page.tsx`: "Recusar orçamento" button →
  `ConfirmDialog` → `rejectServiceOrder`; emphasize estimated cost + finish
  date on pending cards; `'rejected'` in the local union.
- **6.2** `pages/client/service-status.ts`: `STATUS_META.rejected = { label:
  'Recusado', color: '#B91C1C', bg: '#FEE2E2' }`.
- **6.3** `pages/workshop/services-page.tsx` (`statusLabelMap`/`statusColorMap`
  + open-services grouping), `pages/workshop/dashboard-page.tsx` (activity
  ternaries), `pages/client/dashboard-page.tsx` (local union): surface
  `rejected`.
- **6.4** History pages: clickable rows (when `service_order_id != null`) →
  `PartsBreakdownDialog` in `pages/client/service-history-page.tsx` and
  `pages/workshop/service-history-page.tsx`; optional Total column
  (`labor_cost + parts_cost`).
- **Verificação:** `cd apps/web && npm run check && npm run build && npm run test`
- **Commit:** `feat(web): client reject flow + maintenance history per-order breakdown`

## TG7 — Records & gates

- **7.1** `CHANGELOG.md`: dated `## 2026-08-15` entry (FEAT/DB/TEST bullets
  per repo convention).
- **7.2** Backfill `validation.md` with the evidence below.
- **7.3** Full bars: `cd apps/backend && uv run pytest -q`;
  `cd apps/web && npm run check && npm run test && npm run build`.
- **Verificação:** all bars green; `git status` clean on the branch.
- **Commit:** `docs: changelog + validation for service-order costs refactor`
