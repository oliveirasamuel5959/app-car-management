# Validation: Service Order Costs, Accept/Deny & Maintenance Breakdown

Purpose: Evidence gates for `feature/2026-08-15-service-order-costs`, mapped 1:1
to the task groups in [plan.md](plan.md). Check each box with a real command /
observation while implementing.

## V1 — Backend: migration, models, schemas, repository (TG1)

- [ ] `cd apps/backend && uv run alembic upgrade head` succeeds on a clean DB
- [ ] `uv run alembic downgrade -1 && uv run alembic upgrade head` succeeds (up/down idempotent)
- [ ] `uv run python -c "from src.models import ServicePart, Service, ServiceHistory; print('ok')"` imports without error
- [ ] `grep -n "parts" apps/backend/src/schemas/services.py` shows `ServicePartCreate`/`ServicePartRead`/`ServiceBreakdownRead` and `parts` on `ServiceActionUpdate`
- [ ] `grep -n "service_order_id\|labor_description" apps/backend/src/schemas/services_history.py` shows both fields on `ServiceHistoryRead`

## V2 — Backend: service layer + routes (TG2)

- [ ] `grep -n "rejected" apps/backend/src/services/services.py` shows the constant, matrix entries, and `reject_service_order_for_client`
- [ ] `grep -n "parts\b\|\"parts\"\|'parts'" apps/backend/src/services/services.py` shows `parts` in `SERVICE_HISTORY_ONLY_FIELDS`
- [ ] `grep -n "reject\|breakdown" apps/backend/src/api/routes/service_orders.py` shows both new endpoints
- [ ] `cd apps/backend && uv run pytest tests/test_service_order_lifecycle.py tests/test_services_history.py tests/test_realtime_events.py -q` — all green

## V3 — Backend: behavior tests (TG3)

- [ ] `uv run pytest tests/test_service_order_lifecycle.py::test_client_can_reject_pending_service_order_and_notify_workshop -q` passes (was RED before TG2)
- [ ] `uv run pytest tests/test_service_order_lifecycle.py::test_rejected_order_is_terminal -q` passes
- [ ] `uv run pytest tests/test_service_order_lifecycle.py::test_create_requires_estimated_cost_and_finish_date -q` passes
- [ ] `uv run pytest tests/test_services_history.py::test_completion_creates_history_with_defaults_when_type_or_mileage_missing -q` passes (rewritten skip test)
- [ ] `uv run pytest tests/test_services_history.py::test_completion_with_parts_creates_part_rows_and_derives_costs -q` passes
- [ ] `uv run pytest tests/test_services_history.py::test_completion_without_parts_keeps_estimated_cost_fallback -q` passes
- [ ] `uv run pytest tests/test_services_history.py::test_breakdown_access_client_and_workshop_and_cross_tenant -q` passes
- [ ] `uv run pytest tests/test_realtime_events.py::test_client_reject_pushes_order_status_change_to_workshop -q` passes
- [ ] `cd apps/backend && uv run pytest -q` — full suite green (watch `test_tenant_isolation.py`)

## V4 — Frontend: adapters + shared components (TG4)

- [ ] `grep -n "rejectServiceOrder\|getServiceOrderBreakdown\|ServicePart" apps/web/src/services/service-service.tsx` shows the new functions/types
- [ ] `grep -n "service_order_id\|labor_description" apps/web/src/services/service-history-service.tsx` shows the new fields
- [ ] `cd apps/web && npm run test` — Vitest green, including `service-service.test.ts` and the `STATUS_META.rejected` assertion
- [ ] `grep -rn "any" apps/web/src/components/service-orders/` returns nothing (no `any` in new components)

## V5 — Frontend: workshop flows (TG5)

- [ ] `cd apps/web && npm run check` (tsc) passes
- [ ] `npm run build` passes
- [ ] Manual: `/workshop/orders/new` — "Custo estimado (R$)" required; submitting without it shows the PT-BR validation error; with cost + date the OS is created
- [ ] Manual: `/workshop/orders` — open an `in_progress` order → dialog shows the parts checklist; add 2 parts (qty/unit) → totals auto-computed; add mão de obra; Complete → order becomes `completed`

## V6 — Frontend: client reject + status maps + history drill-down (TG6)

- [ ] Manual (client): pending order card shows estimated cost + finish date emphasized; "Recusar orçamento" opens the confirm dialog; confirming → status "Recusado", order closed, workshop notified (bell + WS)
- [ ] Manual (client): accepting still works → "Confirmado"
- [ ] Manual (client): `/client/service-history` — completed order row is clickable → modal shows existing details + part-by-part table + mão de obra + total
- [ ] Manual (workshop): `/workshop/service-history` — same drill-down works; manual client entries (no order link) are not clickable
- [ ] Manual (client): manual "Adicionar Manutenção" entries still create/edit/delete as before

## V7 — Records & gates (TG7)

- [ ] `CHANGELOG.md` has a `## 2026-08-15` entry mentioning service order costs (FEAT/DB/TEST)
- [ ] `cd apps/backend && uv run pytest -q` — full backend suite green
- [ ] `cd apps/web && npm run check && npm run test && npm run build` — all green
- [ ] `git status --short` on `feature/2026-08-15-service-order-costs` shows only intended files

## Full validation flow

1. `cd apps/backend && uv run pytest -q`
2. `cd apps/backend && uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head`
3. `cd apps/web && npm run check && npm run test && npm run build`
4. Manual two-role walkthrough (V5 + V6 above), recorded here.

## Summary

Filled in at the end of the branch with the observed results of each gate.
