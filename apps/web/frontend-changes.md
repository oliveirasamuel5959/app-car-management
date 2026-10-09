# Frontend changes — UI/UX pass on the public surfaces

Implements the priority issues from `.impeccable/critique/2026-10-09T18-13-32Z__src-pages-home-page-tsx.md`
(landing `/`, `/login`, `/signup`). Scope agreed with the user: **all P0–P2** issues, auth
identity first, unified onto the landing design tokens.

Verified: `npm run check` (tsc) clean · `npm run build` clean · Impeccable detector `[]`
(0 findings) · all routes return 200 and every changed module transforms without error.

---

## P0 — Auth surfaces are a different product

**`src/layouts/auth-layout.tsx`** — rewritten. Was MUI `Box` with hardcoded `#0E71AE` /
`#FFFFFF` and no dark-mode support.

- Now Tailwind, token-driven (`bg-primary`, `bg-background`, `text-foreground`,
  `border-border`, `text-muted-foreground`) so light **and dark** both hold.
- Replaced the 2.86 MB `login-image.jpg` with responsive WebP (`srcset` 640w/1240w),
  explicit `width`/`height` (no layout shift), real `alt`.
- Added the chrome the surface was missing: brand mark wrapped in `Link to="/"`,
  `ThemeToggle`, and a "Back to home" link. Previously `/login` had **no path back to `/`**.

**`src/components/brand/brand-logo.tsx`** — the `brand` tone wordmark was
`text-slate-900 dark:text-white`, which rendered **invisible white-on-white** on a light
panel in dark mode. Now uses the `foreground` token.

**`src/components/auth/login-form.tsx`**, **`signup-form.tsx`** — all raw
`bg-blue-600` / `text-gray-*` / `border-gray-300` replaced with semantic tokens; headings
now use `font-display` (Outfit), matching the landing.

**`src/components/theme-toggle.tsx`** — accepts a `className`, hover/tooltip moved to
tokens, amber/sky icons replace the raw orange/blue.

**Brand spelling** — auth headings no longer say "Drive Plus" / "Drive Pluss"
(three spellings for one brand); they now read "Welcome back" / "Create your account".

## P1 — Register was disabled with no explanation

**`signup-form.tsx`** — removed `disabled={!isFormValid}`. The button stays enabled and
validates on submit; on failure it scrolls to and focuses the first `[aria-invalid="true"]`
field. The previously unreachable `acceptTerms` error (`"Please accept the Terms and
Privacy Policy to continue"`) now surfaces live, with `role="alert"`.

## P1 — Recovery and efficiency

- **New password-reset flow** (user chose "build the full flow now"):
  - `src/components/auth/forgot-password-form.tsx` — request a reset link.
  - `src/components/auth/reset-password-form.tsx` — set a new password from
    `/reset-password?token=…`, with an explicit invalid-link state.
  - `src/pages/forgot-password-page.tsx`, `src/pages/reset-password-page.tsx`.
  - Routes `/forgot-password` and `/reset-password` added in `src/App.tsx`.
  - `api.auth.forgotPassword()` / `api.auth.resetPassword()` added in `src/services/api.tsx`.
- **`autoComplete` on every field** (`email`, `current-password`, `new-password`,
  `given-name`, `family-name`, `tel`, `organization`, `street-address`) — autofill and
  password managers now work.
- **Password policy aligned to the backend contract.** `UserRegister` requires ≥8 chars,
  one uppercase, one digit. Signup previously demanded 12 + lowercase + special (stricter
  than the API); login accepted 6 (looser). All three now agree.
- **Manual coordinate fallback** in the workshop path — the address lookup is no longer a
  hard dependency; an `aria-expanded` disclosure lets the owner enter lat/long directly.

> ⚠️ **Backend dependency.** `/auth/forgot-password` and `/auth/reset-password` do not
> exist yet — the backend currently has `/auth/register`, `/auth/login`, `/auth/me` only,
> and no mail service. The reset UI is complete and type-checked but will error until those
> routes ship. This was a knowing trade-off of the "build the full flow now" choice.

## P1 — Landing lacked proof and dropped the two-sided promise

- **New `src/pages/home/proof.tsx`** (rendered after Features) — verifiable product facts
  (ratings from completed orders, unlimited vehicles, full history for the workshop,
  all workshop sizes). Deliberately **no invented numbers**: the original critique flagged
  fabricated proof, so these state capabilities, not statistics. Swap in real metrics when
  they are measured.
- **`src/pages/home/features.tsx`** — rebuilt off the six-card icon grid onto the real
  `ServiceType` service categories (oil, brakes, tires, battery, air filter, transmission,
  coolant, belts, inspection), presented as a chip row plus an editorial list. The cards
  are no longer category-interchangeable.
- **`src/pages/home/hero.tsx`** — the two **invented fake-UI chips** ("Next service / in 12
  days", "Booking / Confirmed") are gone, replaced with a real service strip. Added
  `width`/`height` to the hero image.
- **`src/pages/home/cta.tsx`** — now carries the two-sided split as two paths to
  `/signup?role=client` and `/signup?role=workshop`, instead of one generic "Get started".
- **`signup-form.tsx`** reads `?role=` and presets the account type; the role control is
  relabelled "Vehicle owner" / "Workshop" to match landing language.

## P2 — Accessibility

Both auth forms plus the two new ones:

- Every `<label>` wired via `htmlFor`/`id` (previously none — fields announced unnamed).
- Password toggles given `aria-label` + `aria-pressed`.
- Error containers given `role="alert"` / `aria-live`; inputs given `aria-invalid` +
  `aria-describedby`.
- Password requirement rows: state is announced in text (`sr-only` "— met"/"— not met"),
  not conveyed by colour alone.
- **Contrast retokenised.** Error red `#EF4444` (3.7:1) and green-600 (3.3:1) failed AA as
  small text. Added `--destructive-text` (light `#B91C1C` 6.1:1 / dark `#F87171` 5.9:1) and
  `--success-text` (light `#15803D` 4.9:1 / dark `#4ADE80` 9.2:1). Also nudged
  `--muted-foreground` from 47% to 45% lightness — the shadcn default sat at **4.49:1**,
  a hair under AA, and it is the most-used secondary text colour.
- Full-width primary submit (was right-aligned and small), with a spinner and
  `aria-live` status.

## Also addressed (minor observations)

- **`index.html`** — Google Fonts trimmed from **25 families to 3** (Inter, Outfit,
  JetBrains Mono). The other 22 were never used.
- **`src/index.css`** — removed the latent `body { font-family: Arial }` override; added
  `-webkit-font-smoothing`. Themed the browser surfaces: `::selection`, `caret-color`,
  and `scrollbar-*` from the palette. Added `scroll-behavior: smooth` with a
  `prefers-reduced-motion` guard. Declared `--font-family-primary` (the bridge MUI's
  palette override emits).
- **`tailwind.config.ts`** — registered `destructive-text`, `success`/`success-text` tokens;
  gave `display` a real fallback (was `sans-serif`, i.e. a system font); added an
  `ease-brand` timing token to clear an ambiguous-arbitrary-value build warning.
- **`.gitignore`** — the Python-template `lib/` rule was silently ignoring
  `apps/web/src/lib/`; negated it so the web app's own source directory is tracked again.

> **Not done (out of the agreed P0–P2 scope):** the P3 workshop-onboarding split into a
> labelled second step, and the fabricated `age: 25, sex: 'M'` payload — those fields are
> **required** by the backend `UserRegister` schema, so removing them would break
> registration; they need a backend change first, tracked in the critique as P3.

## Files

**New:** `components/auth/forgot-password-form.tsx`, `components/auth/reset-password-form.tsx`,
`pages/forgot-password-page.tsx`, `pages/reset-password-page.tsx`, `pages/home/proof.tsx`,
`lib/errors.ts`, `assets/login-image-640.webp`, `assets/login-image-1240.webp`

**Changed:** `layouts/auth-layout.tsx`, `components/auth/login-form.tsx`,
`components/auth/signup-form.tsx`, `components/brand/brand-logo.tsx`,
`components/theme-toggle.tsx`, `pages/home/{hero,features,cta,audiences,landing-header}.tsx`,
`pages/home-page.tsx`, `services/api.tsx`, `index.css`, `tailwind.config.ts`, `App.tsx`,
`index.html`, root `.gitignore`


---

# Archived: Frontend Changes — Reviews & Ratings (Phase 3)

> Preserved from the previous version of this file, which the 2026-10-09 public-surface
> pass replaced. Retained verbatim so the Reviews & Ratings record is not lost.
> Feature branch: `feature/2026-08-14-reviews-ratings` · Spec: `specs/2026-08-14-reviews-ratings/`


Feature branch: `feature/2026-08-14-reviews-ratings`
Spec: `specs/2026-08-14-reviews-ratings/`

## New files

- `src/services/workshop-rating-service.tsx` — typed API module for
  `/workshop-ratings`: `listForWorkshop`, `listMine`, `listReceived`, `getById`,
  `create`, `update`, `remove`. Interfaces `WorkshopRating`,
  `WorkshopRatingCreate`, `WorkshopRatingUpdate` (no `any`).
- `src/pages/client/rating-modal.tsx` — create/edit rating modal (0–5 star
  picker, optional comment, delete when editing).
- `src/pages/client/rating-validation.ts` — pure `validateRating(rating)` rule
  used by the modal and the Vitest slice.
- `src/pages/workshop/ratings-page.tsx` — workshop-side "Avaliações" page
  (received ratings: stars, comment, date, schedule link, client name) at
  `/workshop/ratings`.
- `vitest.config.ts` + test files — greenfield Vitest setup (`npm run test`):
  `src/services/workshop-rating-service.test.ts` (mocked `api`, query building)
  and `src/pages/client/rating-validation.test.ts`.

## Modified files

- `src/pages/client/my-schedules-page.tsx` — `aceito` rows now show an
  "Avaliar" action (opens `RatingModal`); after rating, shows "Editar Avaliação"
  + read-only stars. Refreshes schedules and ratings after save/delete.
- `src/pages/client/scheduling-workshop-page.tsx` — added an "Avaliações"
  section (reviews list + date + client name) below the workshop info card;
  the `rating_avg` chip now reflects the recomputed live average.
- `src/pages/client/workshop-page.tsx` — replaced the hardcoded mock workshop
  (fake `rating_avg: 6.8`) with a real list fetched from `GET /workshops`
  (`workshopService.listWorkshops`); empty/loading/error states added.
- `src/components/workshops/workshop-card.tsx` — fixed star scaling from
  `floor(rating_avg / 1.36)` to a proper 0–5 mapping
  (`round` clamped to `[0, 5]`).
- `src/services/workshop-service.tsx` — added `listWorkshops(skip, limit)`.
- `src/components/navigation/workshop-sidebar.tsx` — "Avaliações" entry
  (StarIcon) → `/workshop/ratings`.
- `src/routes/routes.tsx` — registered `/workshop/ratings` (WORKSHOP-only
  protected route).

## Backend contract consumed

| Frontend call | Endpoint | Role |
|---|---|---|
| `listForWorkshop(workshopId)` | `GET /workshop-ratings?workshop_id=` | any authenticated |
| `listMine()` | `GET /workshop-ratings/mine` | CLIENT |
| `listReceived()` | `GET /workshop-ratings/me` | WORKSHOP |
| `create(data)` | `POST /workshop-ratings` | CLIENT |
| `update(id, data)` | `PUT /workshop-ratings/{id}` | CLIENT (author) |
| `remove(id)` | `DELETE /workshop-ratings/{id}` | CLIENT (author) |

---

# Frontend Changes — Payment Processing (Phase 6)

Feature branch: `feature/2026-08-15-payment-processing`
Spec: `specs/2026-08-15-payment-processing/`

> Revised after user review: the payment UX is a **Stripe Checkout redirect**
> (Stripe-hosted payment page) — the frontend carries no Stripe SDK.

## New files

- `src/services/payment-service.tsx` — typed API module for `/payments`:
  `createCheckout` (POST `/service-orders/{id}/checkout` → `{payment_id,
  checkout_url, amount_cents}`), `confirmPayment`, `getPaymentForOrder`,
  `refundPayment`. Interfaces `PaymentCheckout`, `Payment`, `PaymentRefund`,
  `PaymentStatus` (no `any`).
- `src/components/payments/payment-dialog.tsx` — creates the Checkout Session
  on open and shows "Pagar com Stripe" (amount via `formatBRL`); clicking it
  redirects the browser to `checkout_url`. PT-BR loading/error states.
- `src/components/payments/refund-payment-button.tsx` — workshop-side full
  refund: fetches the order payment, renders only for `succeeded` payments,
  `ConfirmDialog` flow calling `refundPayment`, PT-BR copy.
- `src/pages/payment-return-page.tsx` — `/payments/return` landing page
  (protected CLIENT, no layout): confirms the payment on the backend
  (`confirmPayment`) and returns to `/client/services`; `canceled=1` skips
  the confirm; PT-BR loading/error states.
- `src/services/payment-service.test.ts` — Vitest slice (mocked `api`
  endpoint building for checkout/confirm/status/refund).

## Modified files

- `src/pages/client/services-page.tsx` — "Pagar" button on completed orders
  (with `final_cost`) opens `PaymentDialog`; paid orders show "Avaliar
  oficina" reusing `RatingModal` with `serviceOrderId`; both refresh the list
  after success.
- `src/pages/client/rating-modal.tsx` — accepts optional `serviceOrderId` and
  sends `service_order_id` on create (order-anchored review).
- `src/pages/client/service-status.ts` — `STATUS_META` gains `paid` ("Pago")
  and `refunded` ("Reembolsado") entries (+ test coverage).
- `src/services/service-service.tsx` — `ServiceOrder.status` union gains
  `paid`/`refunded`.
- `src/services/workshop-rating-service.tsx` — `WorkshopRatingCreate` accepts
  optional `service_order_id` (+ test coverage for the order payload).
- `src/pages/workshop/orders-page.tsx` / `client-orders-page.tsx` — payment
  state captions in the order dialog, `RefundPaymentButton` on paid orders,
  `paid`/`refunded` in `getStatusColor`.
- `src/pages/workshop/dashboard-page.tsx` — activity badges render Pago /
  Reembolsado with matching colors; `src/pages/client/dashboard-page.tsx`
  status union gains `paid`/`refunded` (STATUS_META-driven).
- `src/routes/routes.tsx` — `/payments/return` registered as a protected
  CLIENT route.

## Removed (Checkout revision)

- `src/components/payments/payment-mode.ts` + test, the Stripe Elements card
  form and mock button in `payment-dialog.tsx`, and the
  `@stripe/stripe-js`/`@stripe/react-stripe-js` dependencies.
