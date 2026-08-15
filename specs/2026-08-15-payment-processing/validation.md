# Validation: Payment Processing (Stripe)

Purpose: Evidence gates for `feature/2026-08-15-payment-processing`, mapped
1:1 to the task groups in [plan.md](plan.md). Reference of requirements:
[requirements.md](requirements.md). Roadmap exit criterion: a client can pay
the final cost of a completed service order, the order reaches `paid`, the
10% fee is recorded, the workshop can refund, and the client can review the
workshop after paying. Checked during implementation on 2026-08-15.

## V1 — Backend: settings, migration, model, schemas, repository (TG1)

- [x] `grep -n "STRIPE_SECRET_KEY\|STRIPE_PUBLISHABLE_KEY\|PAYMENT_PROVIDER" apps/backend/src/core/config.py` shows all three on `Settings`
- [x] `cd apps/backend && uv run alembic upgrade head` succeeds on a clean DB (new head `894ad4d4a168` above `a1b2c3d4e5f6`)
- [x] `uv run alembic downgrade -1 && uv run alembic upgrade head` succeeds (up/down idempotent) — cycle verified
- [x] `uv run python -c "from src.models import Payment, WorkshopRating; print('ok')"` imports without error
- [x] `grep -n "service_order_id" apps/backend/src/models/workshop_rating.py` shows the new nullable unique FK
- [x] `grep -n "amount_cents\|platform_fee_cents\|workshop_amount_cents" apps/backend/src/models/payment.py` shows the three cent columns
- [x] `grep -n "class Payment" apps/backend/src/schemas/payments.py` shows `PaymentIntentRead`/`PaymentRead`/`PaymentRefundRead`
- [x] `grep -rn "tenant_id" apps/backend/src/repositories/payments.py` — every repo function filters by `tenant_id`

## V2 — Backend: provider, PaymentService, routes (TG2)

- [x] `grep -n "class PaymentProvider\|class StripeProvider\|class MockProvider" apps/backend/src/utils/payments.py` shows the protocol + both implementations
- [x] `grep -rn "import stripe" apps/backend/src/services/` returns nothing (SDK confined to `utils/payments.py`)
- [x] `grep -n "paid\|refunded" apps/backend/src/services/services.py` shows the constants, `VALID_SERVICE_STATUSES` entries, matrix entries, and `pay_service_order`/`refund_service_order`
- [x] `grep -n "intent\|confirm\|refund" apps/backend/src/api/routes/payments.py` shows all four endpoints
- [x] `grep -n "payments" apps/backend/src/routers.py` shows the router registered
- [x] `cd apps/backend && uv run pytest tests/test_service_order_lifecycle.py -q` — no regression from the matrix change

## V3 — Backend: order-anchored review gate (TG3)

- [x] `grep -n "service_order_id" apps/backend/src/services/workshop_rating.py` shows the paid-gate validation (ownership, `paid` status, no duplicates)
- [x] `cd apps/backend && uv run pytest tests/test_workshop_rating_lifecycle.py -q` — 17 passed, existing rating tests stay green

## V4 — Backend: behavior tests (TG4)

- [x] `uv run pytest tests/test_payments.py -q` — 18 passed
- [x] `uv run pytest tests/test_payments.py::test_intent_requires_completed_order -q` passes (was RED before TG2)
- [x] `uv run pytest tests/test_payments.py::test_fee_math_ten_percent -q` passes (100.50 → 10050/1005/9045 cents)
- [x] `uv run pytest tests/test_payments.py::test_confirm_pays_order_and_notifies_workshop -q` passes
- [x] `uv run pytest tests/test_payments.py::test_confirm_is_idempotent -q` passes (no double notification)
- [x] `uv run pytest tests/test_payments.py::test_refund_requires_succeeded_payment -q` passes (pending payments rejected)
- [x] `uv run pytest tests/test_payments.py::test_refund_workshop_flow_notifies_client -q` passes
- [x] `uv run pytest tests/test_payments.py::test_cross_tenant_payment_denied -q` passes
- [x] `uv run pytest tests/test_service_order_lifecycle.py -q` — `completed → paid` and `paid → refunded` allowed; `pending → paid` and `paid → completed` rejected
- [x] `uv run pytest tests/test_workshop_rating_lifecycle.py -q` — review with `service_order_id` gated on `paid` + ownership; duplicate order review rejected
- [x] `uv run pytest tests/test_realtime_events.py -q` — `paid`/`refunded` WS pushes to the right party
- [x] `cd apps/backend && uv run pytest -q` — full suite green: **138 passed**

## V5 — Frontend: adapter + dialog + review after payment (TG5)

- [x] `grep -n "createPaymentIntent\|confirmPayment\|refundPayment" apps/web/src/services/payment-service.tsx` shows the four calls
- [x] `cd apps/web && npm run test` — Vitest green (8 files, 32 tests), including `payment-service.test.ts` and `STATUS_META.paid/refunded`
- [x] `grep -rn "any" apps/web/src/components/payments/ apps/web/src/services/payment-service.tsx` returns nothing
- [x] `grep -n "serviceOrderId" apps/web/src/pages/client/rating-modal.tsx` shows the optional order link

## V6 — Frontend: workshop payment state + refund + status maps (TG6)

- [x] `cd apps/web && npm run check` (tsc) passes
- [x] `npm run build` passes (vite build, only pre-existing chunk-size warning)
- [x] `grep -n "paid\|refunded" apps/web/src/pages/client/service-status.ts apps/web/src/pages/workshop/orders-page.tsx apps/web/src/pages/workshop/client-orders-page.tsx apps/web/src/pages/workshop/dashboard-page.tsx apps/web/src/pages/client/dashboard-page.tsx` shows the statuses surfaced in every map

## V7 — Manual verification (local, mock provider)

- [ ] `/login` as CLIENT → order reaches `completed` (workshop closes it with the parts checklist) → "Pagar" shows `final_cost` → PaymentDialog shows "Simular pagamento" (no publishable key) → confirm → order shows "Pago", workshop bell + toast fire
- [ ] Client sees "Avaliar oficina" on the paid order → rating modal → submit → workshop "Avaliações" page shows it; submitting a second time for the same order is rejected
- [ ] `/login` as WORKSHOP → paid order shows "Pago" → "Reembolsar" → ConfirmDialog → order shows "Reembolsado", client bell + toast fire; refund on a non-paid order shows the 400 message
- [ ] Stripe test mode (with real test keys in `.env`): PaymentDialog renders the CardElement, `4242 4242 4242 4242` completes the payment, backend verifies the intent

## Full validation flow

```bash
# 1. Backend gates
cd apps/backend
uv run alembic downgrade -1 && uv run alembic upgrade head   # migration round-trip
uv run pytest -q                                             # full suite
# 2. Frontend gates
cd ../web
npm run check && npm run build && npm run test
# 3. Manual flows (V7) against the running stack (mock provider, then Stripe test mode)
```

## Summary

| Verification | Description | Result |
|--------------|-------------|--------|
| V1 | Settings, migration, model, schemas, repository | ✅ |
| V2 | Provider util, PaymentService, routes | ✅ |
| V3 | Order-anchored review gate | ✅ |
| V4 | Backend behavior tests (payment, lifecycle, reviews, realtime) | ✅ |
| V5 | Frontend adapter, PaymentDialog, review after payment | ✅ |
| V6 | Workshop payment state, refund, status maps, tsc/build | ✅ |
| V7 | Manual flows (mock provider + Stripe test mode) | ⬜ |

> **Phase 6 closed when:** V1–V6 all ✅ (done) and V7 manual flows complete.
> Prior phases (1–5) show no regression: backend 138 passed, frontend 32 Vitest
> green, tsc + vite build green.
