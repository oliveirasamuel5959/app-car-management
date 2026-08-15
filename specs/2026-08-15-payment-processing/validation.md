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
- [x] `uv run pytest tests/test_payments.py::test_checkout_requires_completed_order -q` passes (rewritten for the Checkout revision, TG8)
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

- [x] `grep -n "createCheckout\|confirmPayment\|refundPayment" apps/web/src/services/payment-service.tsx` shows the four calls (createCheckout after the TG9 revision)
- [x] `cd apps/web && npm run test` — Vitest green (8 files, 32 tests), including `payment-service.test.ts` and `STATUS_META.paid/refunded`
- [x] `grep -rn "any" apps/web/src/components/payments/ apps/web/src/services/payment-service.tsx` returns nothing
- [x] `grep -n "serviceOrderId" apps/web/src/pages/client/rating-modal.tsx` shows the optional order link

## V6 — Frontend: workshop payment state + refund + status maps (TG6)

- [x] `cd apps/web && npm run check` (tsc) passes
- [x] `npm run build` passes (vite build, only pre-existing chunk-size warning)
- [x] `grep -n "paid\|refunded" apps/web/src/pages/client/service-status.ts apps/web/src/pages/workshop/orders-page.tsx apps/web/src/pages/workshop/client-orders-page.tsx apps/web/src/pages/workshop/dashboard-page.tsx apps/web/src/pages/client/dashboard-page.tsx` shows the statuses surfaced in every map

## V7 — Manual verification (local, mock provider)

- [x] Mock redirect flow (browser-driven): completed order → "Pagar" → dialog → "Pagar com Stripe" → redirect to `/payments/return?payment_id=&session_id=mock_...` → backend confirm → back to Meus Serviços → order "Pago", workshop notified
- [x] Client sees "Avaliar oficina" on the paid order → rating modal → submit → workshop "Avaliações" page shows it (duplicate rejection covered by backend tests)
- [x] WORKSHOP → paid order shows "PAID" → "Reembolsar" → ConfirmDialog → order "REFUNDED", client sees "Reembolsado" (browser-driven)
- [x] Stripe test mode (user, real browser, 2026-08-15): paid OS #31 with `4242 4242 4242 4242` → Stripe session `complete`/`paid`, PaymentIntent `succeeded` (30000 brl) → app returned to Meus Serviços with order `paid`; DB recorded 30000/3000/27000 cents (10% fee); transaction visible in the Stripe test dashboard.

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

---

## V8 — Backend: Checkout Session flow (TG8, D4 revision)

- [x] `grep -n "create_checkout_session\|retrieve_checkout_session" apps/backend/src/utils/payments.py` shows the session-based protocol
- [x] `grep -n "checkout" apps/backend/src/services/payments.py` shows `create_checkout` (same gates, row reuse, session id stored) and session-verified `confirm_payment`
- [x] `grep -n "checkout" apps/backend/src/api/routes/payments.py` shows `POST /service-orders/{service_order_id}/checkout`
- [x] `grep -n "FRONTEND_URL" apps/backend/src/core/config.py` shows the return-URL base
- [x] `cd apps/backend && uv run pytest tests/test_payments.py tests/test_realtime_events.py -q` — checkout slice green (31)
- [x] `cd apps/backend && uv run pytest -q` — full suite green (138)

## V9 — Frontend: Checkout redirect + return page (TG9)

- [x] `grep -n "createCheckout" apps/web/src/services/payment-service.tsx` shows the checkout call
- [x] `cd apps/web && npm run test` — Vitest green (30) including the updated payment-service slice
- [x] `cd apps/web && npm run check` (tsc) passes
- [x] `npm run build` passes
- [x] `grep -n "checkout_url" apps/web/src/components/payments/payment-dialog.tsx` shows the redirect
- [x] `grep -n "payments/return" apps/web/src/routes/routes.tsx` shows the return page registered (protected CLIENT)
- [x] Backend verified with real Stripe test keys: checkout returns genuine `cs_test_...` URLs (session created on the DrivePlus test account). Browser completion of the 4242 card remains a manual step (Stripe hCaptcha blocks headless bots).

## Summary

| Verification | Description | Result |
|--------------|-------------|--------|
| V1 | Settings, migration, model, schemas, repository | ✅ |
| V2 | Provider util, PaymentService, routes | ✅ |
| V3 | Order-anchored review gate | ✅ |
| V4 | Backend behavior tests (payment, lifecycle, reviews, realtime) | ✅ |
| V5 | Frontend adapter, PaymentDialog, review after payment | ✅ |
| V6 | Workshop payment state, refund, status maps, tsc/build | ✅ |
| V7 | Manual flows (mock redirect, refund, and real Stripe card payment all verified) | ✅ |
| V8 | Backend Checkout Session flow (revision) | ✅ |
| V9 | Frontend Checkout redirect + return page | ✅ |

> **Phase 6 closed when:** V1–V6 all ✅ (done) and V7 manual flows complete.
> Prior phases (1–5) show no regression: backend 138 passed, frontend 32 Vitest
> green, tsc + vite build green.
