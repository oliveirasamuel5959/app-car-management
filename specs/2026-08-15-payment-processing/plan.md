# Plan: Payment Processing (Stripe)

Last Updated: 2026-08-15
Branch: feature/2026-08-15-payment-processing
Status: Implemented (Phase 6 complete on 2026-08-15)

Feature Context: Phase 6 of the roadmap. The client pays the `final_cost` of a
completed service order through Stripe (platform account, test mode, mock
provider fallback); the order gains `paid`/`refunded` terminal states; the
payment row records the 10% platform fee / 90% workshop share; workshops can
issue full refunds; and clients can review the workshop after a paid order
(the Phase 3 leftover). Requirements and decisions:
[requirements.md](requirements.md).

## Reconciliation with the codebase (why this plan differs from the naive approach)

- `final_cost` already exists and is derived at completion
  (`apps/backend/src/services/services.py`, completion branch of
  `transition_service_order_for_workshop`) — the payment amount is read, never
  recomputed. No new cost columns.
- No `Payment` model exists anywhere (grepped — zero Stripe/payment
  references). The `payments` domain is net-new across all five layers,
  registered in `src/routers.py`.
- Lifecycle constants live in `apps/backend/src/services/services.py:51-63`
  and the transition matrix in `_validate_transition` (~L216). Only two
  matrix entries are added: `completed → paid` (CLIENT) and
  `paid → refunded` (WORKSHOP).
- `workshop_ratings` (`apps/backend/src/models/workshop_rating.py`) already
  has a nullable unique `schedule_id` FK — `service_order_id` mirrors it
  exactly (D7). The rating creation gate extends the existing
  `WorkshopRatingService`, and the workshop "Avaliações" page needs no
  changes.
- Real-time: `order_status_change` (payload in `apps/web/WEBSOCKET_EVENTS.md`)
  is reused for `paid`/`refunded` (D8). Notifications reuse the existing
  `_notify_status_change` / Notification patterns.
- Frontend: the client services page already renders status cards and
  `formatBRL` amounts (`apps/web/src/pages/client/services-page.tsx`,
  `apps/web/src/pages/client/service-status.ts`); the rating modal exists at
  `apps/web/src/pages/client/rating-modal.tsx`; workshop close/pay surfaces
  live in `apps/web/src/pages/workshop/orders-page.tsx` and
  `client-orders-page.tsx`.
- Migration style: `a1b2c3d4e5f6_add_service_parts_and_order_link.py` is the
  current head — new migration chains from it (`down_revision='a1b2c3d4e5f6'`),
  plain `create_table`/`add_column` with explicit `downgrade()`.
- Test templates: `apps/backend/tests/test_service_order_lifecycle.py`
  (`build_session`/`seed_service_graph`), `tests/test_workshop_ratings.py`
  (rating gates), `tests/test_realtime_events.py` (WS push cases); frontend
  Vitest mirrors `apps/web/src/pages/client/service-status.test.ts`.
- Backend settings: `src/core/config.py` (`Settings(BaseSettings)`) gains two
  optional fields — no new config mechanism.

## Confirmed decisions (user)

1. Stripe on the **platform account**; 10%/90% split is DB bookkeeping — no
   connected accounts, no onboarding.
2. Client pays the **final cost after completion**; orders gain `paid`
   (terminal, deferred from Phase 2).
3. **Synchronous verification** of the intent on the backend confirm; Stripe
   webhooks deferred (documented follow-up).
4. Extras in scope: **order-anchored reviews** (PAID-gated, Phase 3 leftover)
   and a **refund flow** (workshop-initiated, full amount).
5. **Revision (2026-08-15, user review):** payment UX switched from inline
   Stripe Elements to **Stripe Checkout redirect** (Stripe-hosted payment
   page). The intent endpoint is replaced by a checkout-session endpoint;
   the frontend drops the Stripe SDK entirely and redirects to the session
   URL; TGs 8-9 below implement the revision.

## Reference implementation to mirror

- Status transitions + notifications: `apps/backend/src/services/services.py`
  (`_validate_transition` ~L216, `accept_service_order_for_client` L395-425,
  `_notify_status_change` L276-321)
- Dual-tenant rating service: `apps/backend/src/services/workshop_rating.py`
  (schedule gate + `rating_avg` recompute)
- Route patterns (role gates, ValueError→400, None→404):
  `apps/backend/src/api/routes/service_orders.py`,
  `apps/backend/src/api/routes/workshop_ratings.py`
- Repository template (tenant-scoped): `apps/backend/src/repositories/service_parts.py`
- Migration style: `apps/backend/migrations/versions/a1b2c3d4e5f6_add_service_parts_and_order_link.py`
- Frontend adapter template: `apps/web/src/services/service-service.tsx`; dialogs:
  `apps/web/src/components/ui/confirm-dialog.tsx`,
  `apps/web/src/pages/client/rating-modal.tsx`; currency: `formatBRL`
  (`apps/web/src/pages/client/service-status.ts:21`)

## TG1 — Backend: settings, migration, model, schemas, repository

- **1.1** `apps/backend/src/core/config.py`: add optional
  `STRIPE_SECRET_KEY: str | None`, `STRIPE_PUBLISHABLE_KEY: str | None`,
  `PAYMENT_PROVIDER: str = "stripe"` to `Settings`. Update `.env.example`
  (backend) documenting all three.
- **1.2** Add `stripe` to backend dependencies (`uv add stripe`).
- **1.3** Migration
  `apps/backend/migrations/versions/<12hex>_add_payments_and_rating_order_link.py`
  (`down_revision='a1b2c3d4e5f6'`): create `payments`
  (id Integer PK autoincrement, tenant_id FK tenants NOT NULL,
  service_order_id FK services ondelete RESTRICT NOT NULL UNIQUE,
  amount_cents Integer NOT NULL, platform_fee_cents Integer NOT NULL,
  workshop_amount_cents Integer NOT NULL, status String(30) NOT NULL
  default 'pending', stripe_payment_intent_id String(255) nullable,
  created_at/updated_at DateTime NOT NULL) + composite index
  `ix_payments_tenant_id_id`; add `service_order_id` (FK services SET NULL,
  nullable, unique constraint `uq_workshop_ratings_service_order_id`) to
  `workshop_ratings`; explicit `downgrade()`.
- **1.4** Model `apps/backend/src/models/payment.py` (`Payment`) with status
  constants docstring; `workshop_rating.py` adds the `service_order_id` column
  + relationship; export `Payment` in `models/__init__.py`.
- **1.5** Schemas `apps/backend/src/schemas/payments.py`:
  `PaymentIntentRead` (payment_id, client_secret, amount_cents),
  `PaymentRead` (all fields, Decimal→int cast), `PaymentRefundRead` (status);
  `workshop_rating.py` schema gains optional `service_order_id: int | None`.
- **1.6** Repository `apps/backend/src/repositories/payments.py`:
  `repo_create_payment(db, tenant_id, *, service_order_id, amount_cents,
  platform_fee_cents, workshop_amount_cents, stripe_payment_intent_id)`,
  `repo_get_payment_for_order(db, tenant_id, service_order_id)`,
  `repo_get_payment_by_id(db, tenant_id, payment_id)`,
  `repo_update_payment_status(db, payment, status, *, intent_id=None)` — all
  tenant-filtered.
- **Verificação:** `cd apps/backend && uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head`
- **Commit:** `feat(api): payments table + workshop_ratings.service_order_id link (payment processing)`

## TG2 — Backend: provider util, PaymentService, routes

- **2.1** `apps/backend/src/utils/payments.py`: `PaymentProvider` protocol
  (`create_intent(amount_cents, order_id) -> tuple[str, str]`,
  `retrieve_intent(intent_id) -> str`, `refund(intent_id) -> None`);
  `StripeProvider` (test-mode PaymentIntent, `metadata={"service_order_id"}`)
  and `MockProvider` (fake ids `mock_...`, retrieve → `"succeeded"`);
  `get_payment_provider(settings)` selecting by `PAYMENT_PROVIDER`/missing key.
- **2.2** `apps/backend/src/services/payments.py` (`PaymentService`):
  `create_payment_intent` (resolve client-owned order via
  `ServiceService.get_service_order_for_client`; 400 unless status
  `completed` and `final_cost` set; cents + fee math per D3; reuse pending
  intent per D6; provider call; persist row),
  `confirm_payment` (verify intent status via provider == `succeeded` else
  mark payment `failed` (400) — a `failed` payment allows one retry through
  create-intent per D6; on success mark payment succeeded, transition order
  `completed → paid` via a new `pay_service_order`, notify workshop;
  idempotent when already succeeded),
  `get_payment_for_order` (role-aware: client owner or workshop tenant),
  `refund_payment` (WORKSHOP tenant; only `succeeded`; provider refund;
  payment → `refunded`; order `paid → refunded`; notify client). All repos
  tenant-scoped; no Stripe SDK imports outside `utils/payments.py`.
- **2.3** `apps/backend/src/services/services.py`: constants
  `SERVICE_STATUS_PAID = "paid"` / `SERVICE_STATUS_REFUNDED = "refunded"` in
  `VALID_SERVICE_STATUSES` + docstring; matrix entries `completed → paid`
  (CLIENT) and `paid → refunded` (WORKSHOP) in `_validate_transition`; new
  `pay_service_order` and `refund_service_order` service methods (transition +
  `_notify_status_change`).
- **2.4** Routes `apps/backend/src/api/routes/payments.py`:
  `POST /service-orders/{service_order_id}/intent` (CLIENT gate),
  `POST /{payment_id}/confirm` (CLIENT gate),
  `GET /service-orders/{service_order_id}` (auth, role-aware),
  `POST /{payment_id}/refund` (WORKSHOP gate) — with
  request/response schemas, ValueError→400, None→404. Register in
  `src/routers.py` with the `payments` prefix.
- **Verificação:** `cd apps/backend && uv run pytest tests/test_service_order_lifecycle.py -q` (no regression from matrix changes)
- **Commit:** `feat(api): payment provider + PaymentService + /payments endpoints`

## TG3 — Backend: order-anchored review gate

- **3.1** `apps/backend/src/services/workshop_rating.py`: accept optional
  `service_order_id`; gate per D7 — order exists in the workshop's tenant,
  client owns it, status `paid`, no existing rating with that
  `service_order_id` (else 400/403); pass through to repository on create.
- **3.2** Repository `apps/backend/src/repositories/workshop_rating.py`:
  accept and store `service_order_id`; add
  `repo_get_rating_by_service_order_id(db, tenant_id, service_order_id)`.
- **3.3** Routes `apps/backend/src/api/routes/workshop_ratings.py`: extend the
  create schema/payload handling for the optional `service_order_id`.
- **Verificação:** `cd apps/backend && uv run pytest tests/test_workshop_ratings.py -q` (existing rating tests stay green)
- **Commit:** `feat(api): order-anchored paid-gated reviews on workshop_ratings`

## TG4 — Backend: tests (payment + review slices)

- **4.1** `apps/backend/tests/test_payments.py` (new, reuse
  `build_session`/`seed_service_graph`): intent creation gated on `completed`
  (pending/in_progress → 400) and ownership (cross-tenant → 404); amount/fee
  math (`final_cost=100.50 → 10050 / 1005 / 9045`); pending-intent reuse;
  mock confirm flow marks payment + order `paid` and notifies workshop;
  confirm idempotency (second confirm no double-notify); refund flow
  (workshop-only, succeeded-only, payment `refunded` + order `refunded`,
  client notified); `paid` is terminal (cancel/accept raise).
- **4.2** `apps/backend/tests/test_service_order_lifecycle.py`: extend with
  `completed → paid` and `paid → refunded` transitions + invalid transitions
  (`pending → paid`, `paid → completed` rejected).
- **4.3** `apps/backend/tests/test_workshop_ratings.py`: extend — review with
  `service_order_id` requires `paid` order + ownership; duplicate
  service_order_id rejected; schedule-anchored path unchanged.
- **4.4** `apps/backend/tests/test_realtime_events.py`: extend — payment
  confirm pushes `order_status_change` (`new_status="paid"`) to the workshop;
  refund pushes `new_status="refunded"` to the client.
- **Verificação:** `cd apps/backend && uv run pytest -q` (full suite green)
- **Commit:** `test(api): payment lifecycle, fee math, refund, paid-gated reviews`

## TG5 — Frontend: payment adapter + PaymentDialog + review after payment

- **5.1** `apps/web/src/services/payment-service.tsx` (new, built on
  `api.tsx`): `PaymentIntent`, `Payment`, `PaymentStatus` types;
  `createPaymentIntent(serviceOrderId)`, `confirmPayment(paymentId)`,
  `getPaymentForOrder(serviceOrderId)`, `refundPayment(paymentId)`.
- **5.2** `apps/web/src/components/payments/payment-dialog.tsx` (new):
  reads `VITE_STRIPE_PUBLISHABLE_KEY` — present: Stripe Elements CardElement
  (`@stripe/react-stripe-js`, `stripe.confirmCardPayment`); absent:
  "Simular pagamento" button. Both paths → `confirmPayment`, success state,
  PT-BR error surface for failed confirm.
- **5.3** `apps/web/src/pages/client/services-page.tsx`: "Pagar" button on
  `completed` cards (shows `final_cost` via `formatBRL`) → PaymentDialog; on
  success refetch + "Avaliar oficina" action (reuses
  `rating-modal.tsx` with `service_order_id`); `paid`/`refunded` in the local
  status union + `STATUS_META` (`apps/web/src/pages/client/service-status.ts`:
  "Pago", "Reembolsado").
- **5.4** `apps/web/src/pages/client/rating-modal.tsx`: accept optional
  `serviceOrderId` and send it on create.
- **Verificação:** `cd apps/web && npm run check && npm run test`
- **Commit:** `feat(web): payment adapter + PaymentDialog + review after payment`

## TG6 — Frontend: workshop payment state + refund + status maps

- **6.1** `apps/web/src/pages/workshop/orders-page.tsx` and
  `client-orders-page.tsx`: payment state display on paid/refunded orders
  ("Pago"/"Reembolsado" via `getPaymentForOrder`); "Reembolsar" button on
  paid orders behind `ConfirmDialog` → `refundPayment` → refetch; status
  label/color maps gain `paid`/`refunded`.
- **6.2** `apps/web/src/pages/workshop/dashboard-page.tsx` and
  `apps/web/src/pages/client/dashboard-page.tsx`: surface `paid`/`refunded`
  in activity/status ternaries.
- **6.3** Realtime: verify the existing `order_status_change` refetch covers
  the new statuses on both dashboards and orders pages (no new event wiring).
- **Verificação:** `cd apps/web && npm run check && npm run build`
- **Commit:** `feat(web): workshop payment state + refund action + paid/refunded status maps`

## TG7 — Frontend: Vitest slices + final gates

- **7.1** `apps/web/src/services/payment-service.test.ts` (mirror
  `service-service.test.ts` mocking style): adapter payloads/URLs for the
  four endpoints; `service-status.test.ts` extended with
  `STATUS_META.paid/refunded`.
- **7.2** Dialog logic test: mock mode renders "Simular pagamento" when no
  publishable key; confirm flow calls `confirmPayment` with the payment id.
- **7.3** Run the [validation.md](validation.md) procedure end-to-end and
  tick the checkboxes; manual Stripe test-mode pass with real test keys (V4).
- **Verificação:** `cd apps/web && npm run check && npm run build && npm run test`
- **Commit:** `test(web): payment adapter + dialog mock-mode + status meta`

## TG8 — Backend: Checkout Session flow (replaces intent, D4 revision)

- **8.1** `apps/backend/src/utils/payments.py`: protocol becomes
  `create_checkout_session(amount_cents, order_id, success_url, cancel_url)
  -> tuple[str, str]`, `retrieve_checkout_session(session_id) -> str`
  (`complete`/`open`), `refund(reference) -> None`. `MockProvider`: synthetic
  session id + success URL (replaces the `{CHECKOUT_SESSION_ID}` template in
  `success_url`), retrieve always `complete`, refund no-op. `StripeProvider`:
  `stripe.checkout.Session.create(mode="payment", line_items=[price_data
  brl, unit_amount], metadata={service_order_id}, success_url, cancel_url)`
  → (session.id, session.url); retrieve → session.status; refund → refund the
  session's `payment_intent`.
- **8.2** `apps/backend/src/core/config.py`: add `FRONTEND_URL: str =
  "http://localhost:5173"`.
- **8.3** `apps/backend/src/schemas/payments.py`: `PaymentCheckoutRead`
  (payment_id, checkout_url, amount_cents) replaces `PaymentIntentRead`.
- **8.4** `apps/backend/src/services/payments.py`: `create_payment_intent` →
  `create_checkout` (same completed/final-cost gates and row reuse; builds
  `success_url = {FRONTEND_URL}/payments/return?payment_id={id}&session_id={CHECKOUT_SESSION_ID}`
  and `cancel_url = {FRONTEND_URL}/payments/return?canceled=1`; stores the
  session id on the row). `confirm_payment` verifies via
  `retrieve_checkout_session` (`complete` → succeeded, else failed);
  `refund_payment` passes the stored session id.
- **8.5** `apps/backend/src/api/routes/payments.py`: `POST
  /service-orders/{service_order_id}/checkout` replaces the intent route
  (same CLIENT gate, ValueError→400, None→404).
- **8.6** Tests: rewrite the intent slice as checkout tests
  (`test_checkout_requires_completed_order`, `test_checkout_requires_final_cost`,
  `test_fee_math_ten_percent`, `test_checkout_reuses_pending_payment_row`,
  `test_checkout_raises_when_order_already_paid`,
  `test_checkout_blocks_when_succeeded_payment_row_exists`,
  `test_confirm_pays_order_and_notifies_workshop`,
  `test_confirm_is_idempotent`,
  `test_confirm_marks_failed_when_session_not_complete` — stub provider
  returning `open`, `test_refund_requires_succeeded_payment`,
  `test_refund_workshop_flow_notifies_client`,
  `test_cross_tenant_payment_denied`); realtime tests call `create_checkout`.
- **Verificação:** `cd apps/backend && uv run pytest tests/test_payments.py tests/test_realtime_events.py tests/test_service_order_lifecycle.py -q`
- **Commit:** `feat(api): Stripe Checkout Session flow replaces payment intent (payment processing)`

## TG9 — Frontend: Checkout redirect + return page (D4 revision)

- **9.1** `apps/web/src/services/payment-service.tsx`: `createCheckout(serviceOrderId)
  -> {payment_id, checkout_url, amount_cents}` replaces `createPaymentIntent`;
  `confirmPayment`/`getPaymentForOrder`/`refundPayment` unchanged; test
  updated (RED first).
- **9.2** `apps/web/src/components/payments/payment-dialog.tsx`: on open call
  `createCheckout`, render the amount + a "Pagar com Stripe" button that sets
  `window.location.href = checkout_url`; loading/error states stay. Remove the
  Stripe Elements card form, the mock button, `payment-mode.ts` + its test,
  and the `@stripe/stripe-js`/`@stripe/react-stripe-js` dependencies.
- **9.3** New `apps/web/src/pages/payment-return-page.tsx` at
  `/payments/return?payment_id=&session_id=&canceled=`: canceled →
  redirect `/client/services`; otherwise calls `confirmPayment(payment_id)`
  then navigates to `/client/services` (PT-BR loading/error states). Register
  in `src/routes/routes.tsx` as a protected CLIENT route.
- **Verificação:** `cd apps/web && npm run check && npm run build && npm run test`
- **Commit:** `feat(web): Stripe Checkout redirect + payment return page (payment processing)`
