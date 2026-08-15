# Requirements: Payment Processing (Stripe)

Last Updated: 2026-08-15
Branch: feature/2026-08-15-payment-processing
Status: Implemented (Phase 6 complete on 2026-08-15)

Context: Phase 6 of `specs/ROADMAP.md` — the last functional MVP gap. Today a
service order ends at `completed` and no money changes hands: the
service-order-costs work (`specs/2026-08-15-service-order-costs`) made the
workshop collect an `estimated_cost` at creation and derive `final_cost` at
completion (parts checklist + labor, fallback to the estimate), and Phase 2
explicitly deferred a `PAID` state to this phase, while Phase 3 deferred
order-anchored reviews ("PAID-gated reviews deferred to the payment phase").
This feature closes that loop: the client pays the final cost of a completed
order through Stripe, the order gains `paid` (and `refunded`) terminal states,
the platform records a 10% commission, and the client can review the workshop
after paying. Follows the service-order lifecycle
(`specs/2026-06-01-service-order-lifecycle`), service-order costs
(`specs/2026-08-15-service-order-costs`), reviews
(`specs/2026-08-14-reviews-ratings`), and realtime
(`specs/2026-08-15-websocket-realtime`).

## 1. Scope

### In Scope

- **`payments` table + domain**: new tenant-scoped table (one row per service
  order) with `id` PK, `tenant_id` FK, `service_order_id` FK (unique),
  `amount_cents`, `platform_fee_cents`, `workshop_amount_cents`, `status`
  (`pending` | `succeeded` | `refunded` | `failed`), `stripe_payment_intent_id`,
  `created_at`, `updated_at`. New backend domain `payments` across all five
  layers (routes/services/repositories/models/schemas), mounted in
  `src/routers.py`.
- **Stripe on the platform account**: PaymentIntents charged on the platform's
  own Stripe account (test mode). No connected accounts, no onboarding. The
  10% platform fee / 90% workshop share is computed and stored in DB columns
  (bookkeeping only — no transfers).
- **Provider abstraction with mock fallback**: a `PaymentProvider` protocol in
  `apps/backend/src/utils/payments.py` with two implementations — `StripeProvider`
  (used when `STRIPE_SECRET_KEY` is set) and `MockProvider` (used otherwise or
  when `PAYMENT_PROVIDER=mock`), so local dev and tests run without Stripe keys.
- **Payment flow (post-completion)**: client pays the `final_cost` of a
  `completed` order → order becomes `paid`. Endpoints:
  - `POST /payments/service-orders/{service_order_id}/intent` — **CLIENT**,
    own completed order. Creates (or reuses) the pending payment row and the
    provider intent; returns `{payment_id, client_secret, amount_cents}`.
    The amount is derived server-side from `final_cost` — the client never
    sends it.
  - `POST /payments/{payment_id}/confirm` — **CLIENT**, own payment. Backend
    verifies the intent with the provider (synchronous verification), marks the
    payment `succeeded`, transitions the order `completed → paid`, notifies the
    workshop (Notification + `order_status_change` WS push). Idempotent: a
    confirm on an already-succeeded payment returns the current state instead
    of double-processing.
  - `GET /payments/service-orders/{service_order_id}` — role-aware payment
    status (client owner or workshop tenant).
  - `POST /payments/{payment_id}/refund` — **WORKSHOP**, own tenant, full
    amount only. Provider refund → payment `refunded`, order `paid → refunded`
    (terminal), client notified (Notification + `order_status_change` WS push).
- **Order lifecycle extension**: new statuses `paid` (from `completed`, via
  payment confirm) and `refunded` (from `paid`, via workshop refund), both
  terminal, in `_validate_transition` (`apps/backend/src/services/services.py`)
  with role gates, surfaced across all status maps and dashboards.
- **Order-anchored reviews (Phase 3 leftover)**: `workshop_ratings` gains a
  nullable unique `service_order_id` FK; `POST /workshop-ratings` accepts an
  optional `service_order_id`, gated on: order exists, client owns it, order is
  `paid`, one review per paid order. `rating_avg` recompute, author CRUD, and
  the schedule-anchored path stay unchanged. Frontend: after a successful
  payment the client sees an "Avaliar oficina" action reusing the existing
  rating modal (`apps/web/src/pages/client/rating-modal.tsx`).
- **Frontend payment UI**: new `payment-service.tsx` adapter;
  `PaymentDialog` component (Stripe Elements CardElement when
  `VITE_STRIPE_PUBLISHABLE_KEY` is set, "Simular pagamento" mock button
  otherwise); "Pagar" action on completed orders (client services page);
  payment state + refund action on workshop orders; `paid`/`refunded` in
  `STATUS_META` and workshop label/color maps; PT-BR copy; `formatBRL`
  (`apps/web/src/pages/client/service-status.ts:21`) for amounts.
- **Env plumbing**: `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` on the
  backend `Settings` (`apps/backend/src/core/config.py`, optional fields);
  `VITE_STRIPE_PUBLISHABLE_KEY` on the web env; `.env.example` documents both.
- **Dependencies**: `stripe` Python SDK (backend), `@stripe/stripe-js` +
  `@stripe/react-stripe-js` (web).
- **Tests**: pytest slices (payment lifecycle, fee math, tenant isolation,
  refund, review gating) + Vitest slices (adapter payloads, status meta,
  dialog mock logic).

### Out of Scope (explicitly)

- Stripe Connect: connected accounts, onboarding/KYC, destination charges,
  automatic transfers. The workshop share is DB bookkeeping only.
- Stripe webhooks / async payment reconciliation (documented follow-up; the
  synchronous verification path is the source of truth for now).
- Partial refunds (full amount only) and client-initiated refunds.
- Deposits / paying the estimate upfront; re-payment after a refund (a new
  order is required).
- Payouts to workshops' bank accounts.
- Real money, production Stripe keys, or production deployment.
- Payment for anything other than service orders (e.g. schedules).

## 2. Decisions

### D1 — Platform account + fee bookkeeping, no Connect

PaymentIntents are created on the platform's Stripe account. The split is
computed and persisted as `platform_fee_cents` (10%) and
`workshop_amount_cents` (90%) on the payment row. Stripe Connect would require
connected accounts, onboarding, and KYC per workshop — disproportionate for
the MVP and impossible to exercise locally. The columns preserve the
commission model and make a later Connect migration a data + provider change,
not a schema change.

### D2 — Provider abstraction with mock fallback

`PaymentProvider` protocol with `create_intent(amount_cents, order_id)`,
`retrieve_intent(intent_id)`, and `refund(intent_id)`. Selection:
`PAYMENT_PROVIDER=mock` or missing `STRIPE_SECRET_KEY` → `MockProvider`
(deterministic fake intents that always succeed on confirm); otherwise
`StripeProvider` (test-mode PaymentIntent with `metadata={order_id}`). The
service layer only talks to the protocol — never to the Stripe SDK directly —
so tests exercise the real payment flow without network access. The frontend
mirrors this: no `VITE_STRIPE_PUBLISHABLE_KEY` → "Simular pagamento" button
that calls confirm directly; with the key → Stripe Elements.

### D3 — Amounts in cents, derived server-side

Payment amounts are stored as integer cents (Stripe-native, no float drift).
`amount_cents = round(final_cost * 100)` computed from the order's `final_cost`
at intent creation; the client never submits an amount. Missing/zero
`final_cost` → 400 ("no final cost for this order"). Fee math:
`platform_fee_cents = round(amount_cents * 0.10)`,
`workshop_amount_cents = amount_cents - platform_fee_cents`.

### D4 — Synchronous verification, webhook deferred

The frontend confirms the PaymentIntent client-side (Stripe.js Elements or
mock button), then the backend `confirm` endpoint re-verifies the intent
status with the provider before marking anything paid — the frontend claim is
never trusted. Webhook reconciliation (`/payments/webhook` + signature
verification) is a documented follow-up; it requires a public URL/tunnel that
local dev does not have.

### D5 — `paid` and `refunded` terminal states; no re-payment after refund

Transitions: `completed → paid` (CLIENT via payment confirm),
`paid → refunded` (WORKSHOP, full amount). Both terminal. A refunded order
does not return to `completed` and cannot be re-paid — re-proposing a new
order is the recovery path, matching how `rejected` works. `cancelled` and
`rejected` remain reachable exactly as today (a paid order cannot be
cancelled).

### D6 — One payment row per order, reused intent

`payments.service_order_id` is unique. A second intent request for an order
with a `pending` payment returns the same row + intent instead of creating a
new one; a `succeeded` payment returns the stored state; `failed` allows one
retry (new intent on the same row). `stripe_payment_intent_id` is recorded on
the row for the deferred webhook work.

### D7 — Order-anchored reviews reuse `workshop_ratings`

A new nullable, unique `service_order_id` FK on the existing `workshop_ratings`
table (mirroring `schedule_id`) instead of a new `reviews` table. All the
machinery — 0–5 scale, author CRUD, `rating_avg` recompute, dual-tenant
scoping, workshop "Avaliações" page — is reused. Gating lives in
`WorkshopRatingService`: when `service_order_id` is provided, the order must
be the client's own, in the workshop's tenant, with status `paid`, and no
existing rating may reference it.

### D8 — Reuse `order_status_change` for payment events

No new WebSocket event type. `paid` and `refunded` travel as
`order_status_change` (same payload: `service_order_id`, `old_status`,
`new_status`, `actor_role`, `timestamp` — see
`apps/web/WEBSOCKET_EVENTS.md`), pushed to the other party via the existing
`src/core/ws_push.py` helpers and `_notify_status_change`
(`apps/backend/src/services/services.py:276-321`). The frontend already
refetches dashboards/orders on this event.

## 3. Constraints

- Four-layer flow (`api/routes → services → repositories → models`) with
  Pydantic request/response schemas per endpoint; no logic in routes.
- Every `payments` query is tenant-scoped (`tenant_id` in WHERE), composite
  index `(tenant_id, id)`; cross-tenant access returns 404 (not 403).
- Alembic migration with explicit `downgrade()`, `down_revision` on the
  current head `a1b2c3d4e5f6`; verified up/down/up on Postgres.
- Backend: no `any`; `black` + `isort`. Frontend: no `any`/`as any` (typed
  `unknown` + guards), PT-BR UI copy, MUI + Tailwind, `formatBRL` for all
  money display.
- Stripe code confined to `apps/backend/src/utils/payments.py` (per CLAUDE.md
  utils convention) and the `PaymentDialog`; the service layer talks to the
  provider protocol only.
- Existing tests stay green (backend full suite + frontend Vitest + `tsc`).
- No production Stripe keys, no webhook, no deployment work in this phase.

## 4. Risks & Notes

- **Float → cents rounding**: `final_cost` is a Float BRL value; `round(x *
  100)` can round-to-even on `.5` cents. Accepted — display never changes, and
  the cent value is written once at intent creation.
- **Missing Stripe keys locally**: the mock provider makes the whole flow
  testable without keys, but the Stripe path itself needs a manual test-mode
  run with real test keys before merge (see validation V4).
- **Idempotency**: double-clicks on "Pagar"/confirm must not create duplicate
  intents or double-notify. Covered by D6 + confirm idempotency; explicit
  tests.
- **Status-map sprawl**: `paid`/`refunded` must land in every status map
  (client `STATUS_META`, workshop label/color maps, dashboards, order tables)
  or cards fall back to unstyled labels. The validation checklist enumerates
  them.
- **Refund of a `pending`/`failed` payment**: rejected with 400 — only
  `succeeded` payments refund.
- **Reviews after refund**: a review written while the order was `paid`
  survives a later refund (the service did happen); the gate is checked at
  review-creation time only.
- **`stripe` SDK + mock symmetry**: provider methods must return identical
  shapes (`(intent_id, client_secret)`, status strings) or the service layer
  drifts; one protocol, both implementations tested against it.
