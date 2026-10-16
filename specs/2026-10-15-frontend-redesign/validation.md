# Validation: Frontend Redesign — DrivePluss Design System

Last Updated: 2026-10-15
Branch: feature/2026-10-15-frontend-redesign
Status: Planned

Purpose: Define the evidence required to confirm the redesign is complete,
faithful to the PDF, accessible and mergeable. References the task groups of
[plan.md](plan.md) and the decisions of [requirements.md](requirements.md).

Run the sections in order after completing every task group.

---

## V1 — Tokens and typography (TG1)

- [ ] **1.1** The old brand hex is gone from source and markup:
  ```bash
  cd apps/web
  grep -rn "0E71AE" src/ index.html
  ```
  Expected: no output.
- [ ] **1.2** Inter and Outfit are gone; Plus Jakarta Sans and JetBrains Mono load:
  ```bash
  grep -rn "Outfit" src/ index.html
  grep -n "fonts.googleapis" index.html
  ```
- [ ] **1.3** Every token the PDF names exists in both `:root` and `.dark`:
  brand blue, text, background, card, border, the four badge tints, the
  active-menu pair, the 13/15/18/22/30 scale, the 4/8/12/16/24/32 spacing scale,
  and radii 10 and 16.
- [ ] **1.4** Each text-on-surface token carries its measured contrast ratio in a
  comment, as the existing tokens do. Verify no text pair is below 4.5:1.
- [ ] **1.5** No component hardcodes a hex:
  ```bash
  grep -rnE "#[0-9A-Fa-f]{6}" src/ --include=*.tsx | grep -v "\.test\."
  ```
  Expected: only values that legitimately cannot be tokens (none expected).
- [ ] **1.6** `npm run build` passes, and the real type gate reports no *new*
  errors:
  ```bash
  cd apps/web && npx tsc -p tsconfig.app.json --noEmit | wc -l
  ```
  See requirements §6.1: `npm run check` checks nothing. Record the count and
  compare against the previous group. Baseline at the start of this phase: **149**.
- [ ] **1.7** Both themes inspected in the browser: header, sidebar, cards,
  badges and buttons all read from the new tokens in light **and** dark.

---

## V2 — Route map (TG2)

- [ ] **2.1** The legacy inventory in this spec's directory matches fresh counts:
  ```bash
  cd apps/web/src
  grep -rl "@mui/material" . | wc -l        # 49 at audit time
  grep -ro "sx={" . | wc -l                 # 420 at audit time
  ```
  Numbers differing is fine; the file records the actual baseline.
- [ ] **2.2** The route map covers every path in `routes.tsx`, marking each as
  kept, moved or retired.
- [ ] **2.3** The current `/cars/new` behaviour is recorded.

---

## V3 — Components (TG3)

- [ ] **3.1** All six exist: Button, StatusBadge, StatsBar, MenuItem,
  EmptyState, CurrentServiceCard.
- [ ] **3.2** Button renders default, hover, focus, disabled and loading.
- [ ] **3.3** StatusBadge always renders the label text, never colour alone
  (requirements §2.3).
- [ ] **3.4** `EmptyState` cannot be rendered without an action — omitting it is a
  TypeScript error:
  ```bash
  # The action prop must be required, not optional
  grep -n "action" src/components/**/empty-state.tsx
  ```
- [ ] **3.5** The catalogue route renders every state of every component.
- [ ] **3.6** The six components introduce no new type errors (requirements §6.1).

---

## V4 — Status module (TG4)

- [ ] **4.1** One module owns the labels:
  ```bash
  cd apps/web/src
  grep -rn "STATUS_CONFIG\|STATUS_LABELS" .
  ```
  Expected: no output (all six maps are gone).
- [ ] **4.2** Schedule statuses and service-order statuses are separate exports —
  `pendente` and `pending` cannot resolve to the same entry.
- [ ] **4.3** Label spellings are consistent: "Em andamento", "Pendente",
  "Concluído", "Recusado", "Cancelado".
- [ ] **4.4** `service-status.test.ts` covers both domains and passes:
  ```bash
  npm run test
  ```

---

## V5 — Shell (TG5)

- [ ] **5.1** The wordmark appears once in the authenticated shell.
- [ ] **5.2** The sidebar has 6 items in groups.
- [ ] **5.3** Active state follows the route prefix — a sub-route keeps its parent
  highlighted:
  ```
  /client/appointments/<id>  →  "Agendamentos" is highlighted
  ```
- [ ] **5.4** The content band is ~960px with a consistent gutter on every screen.
- [ ] **5.5** Below 768px the five-item bottom bar replaces the sidebar; at
  1024px the sidebar is present and the bottom bar is not.
- [ ] **5.6** **Role gating is enforced.** As a CLIENT user, navigate to
  `/workshop/dashboard` → redirected, not rendered. As a WORKSHOP user, navigate
  to `/client/dashboard` → redirected.
  ```bash
  # The live component must read requiredRole
  grep -n "requiredRole" src/components/routing/protected-route.tsx
  ```
- [ ] **5.7** No menu item links to a non-existent route (the `/client/settings`
  and `/workshop/settings` links are resolved one way or the other).

---

## V6 — Agendamentos (TG6)

- [ ] **6.1** The page has both tabs, and the 4-step indicator matches the decided
  flow: Oficina → Serviço → Data e horário → Confirmar (`requirements.md` §8, D-OPEN-1).
- [ ] **6.2** The three former screens are reachable from this page alone — the
  workshop search, the filters and the booking flow are all here.
- [ ] **6.3** The card action reads "Agendar aqui".
- [ ] **6.4** The map renders inside the tab at desktop width and does not assume
  a `100vh` parent. A map mounted in a hidden tab is correctly sized once shown.
- [ ] **6.5** Filters work end to end: radius, minimum rating, service type, sort.
- [ ] **6.6** The Próximos / Concluídos / Cancelados tabs follow the presentation
  buckets defined in `requirements.md` §8, D-OPEN-2, and an empty tab offers the next step.
- [ ] **6.7** A schedule created through the flow appears in Meus agendamentos
  **without a manual refresh** (list reload on successful create and live reload preserved).
- [ ] **6.8** A deep link from the old `/client/scheduling/:workshopId` still lands
  on that workshop.
- [ ] **6.9** The booking timezone handling is unchanged — a slot booked
  for 14:00 shows as 14:00.

---

## V7 — Meu Carro and Histórico (TG7)

- [ ] **7.1** Meu Carro shows Última manutenção, Próxima revisão and Gasto
  registrado.
- [ ] **7.2** A vehicle with history records shows the correct last-service date,
  next-service date and accumulated cost.
- [ ] **7.3** A vehicle with **no** records shows the empty state, not `R$ 0,00`
  and a blank date.
- [ ] **7.4** Histórico has no Veículo column.
- [ ] **7.5** Row actions are text buttons, not icon-only.
- [ ] **7.6** The create/edit dialog and the parts-breakdown drill-down still work.
- [ ] **7.7** No new backend endpoint was needed (requirements §D4).

---

## V8 — Appointment detail (TG8)

- [ ] **8.1** The Andamento track marks the correct step for each order status:
  `pending`, `confirmed`, `in_progress`, `completed`.
- [ ] **8.2** Steps already passed are marked complete; the current step is
  distinct from both.
- [ ] **8.3** `paid` and `refunded` render sensibly rather than as a broken track.
- [ ] **8.4** "Enviar mensagem" opens the conversation with the right workshop.
- [ ] **8.5** "Ver no mapa" reaches the workshop's location.
- [ ] **8.6** A cancelled or rejected order does not render a misleading track.

---

## V9 — Dashboard and the flag (TG9)

- [ ] **9.1** With the flag off, the previous Dashboard renders unchanged.
- [ ] **9.2** With the flag on, the new Dashboard matches the PDF's page-1 render.
- [ ] **9.3** Each of the four stats numbers filters Meus Agendamentos.
- [ ] **9.4** "Seu serviço atual" and "Meu carro" show real data, including next
  service on the car card.
- [ ] **9.5** Empty states offer their next step.
- [ ] **9.6** Both Dashboard variants survive while the flag exists; the flag
  choice from requirements §D-OPEN-3 is recorded.

---

## V10 — Routes (TG10)

- [ ] **10.1** Each retired path redirects rather than 404s:
  `/client/scheduling`, `/client/scheduling/:workshopId`,
  `/client/my-schedules`, `/client/search-workshops`, `/client/services`,
  `/client/services/:serviceId`, `/client/my-workshops`.
- [ ] **10.2** `/cars/new` resolves unambiguously (`/client/cars/new`).
- [ ] **10.3** Redirects use `replace`, so the back button does not trap the user
  in a redirect loop.
- [ ] **10.4** No route renders with no element (no React Router warning in the
  console).
- [ ] **10.5** The dead `publicRoutes` array and the unreachable second
  `ProtectedRoute` are gone:
  ```bash
  grep -rn "publicRoutes" src/
  grep -c "ProtectedRoute" src/routes/routes.tsx
  ```

---

## V11 — Workshop area (TG11)

- [ ] **11.1** Every workshop page renders in light and dark without a styling
  regression.
- [ ] **11.2** The workshop menu has 6 items and each resolves.
- [ ] **11.3** Workshop pages no longer define their own status maps.
- [ ] **11.4** The workshop orders table, badges and progress display match the
  client side's treatment.
- [ ] **11.5** The workshop migration did not increase the type-error count.

---

## V12 — MUI removed (TG12)

- [ ] **12.1** No MUI or Emotion import remains:
  ```bash
  cd apps/web
  grep -rn "@mui\|@emotion" src/
  ```
  Expected: no output.
- [ ] **12.2** The packages are out of `package.json`:
  ```bash
  grep -n "mui\|emotion\|react-google-maps" package.json
  ```
  Expected: no output.
- [ ] **12.3** `src/theme.ts` is deleted and `main.tsx` no longer wires
  `ThemeProvider` / `CssBaseline`.
- [ ] **12.4** The override wall is gone — `index.css` no longer contains
  `.Mui*` selectors or `!important`:
  ```bash
  grep -c "Mui\|!important" src/index.css
  ```
  Expected: `0`.
- [ ] **12.5** The orphans are deleted: `navbar.tsx`, `footer.tsx`,
  `dashboard-layout.tsx`, `services-timeline.tsx`.
- [ ] **12.6** Dark mode still works **without** the overrides — check every
  surface in both themes.
- [ ] **12.7** `npm run build` passes and `dist/` is smaller than the baseline
  recorded before TG12. Both numbers are recorded in this file.

  | | Size |
  | --- | --- |
  | Baseline (before TG12) | |
  | After TG12 | |

---

## V13 — Tests and accessibility (continuous)

- [ ] **13.1** All 8 pre-existing tests still pass and none were deleted:
  ```bash
  cd apps/web && npm run test
  ```
  `rating-validation`, `service-status`, `realtime-socket`, `api`,
  `payment-service`, `service-service`, `workshop-rating-service`,
  `workshop-service`.
- [ ] **13.2** Touch targets are at least 44px on the bottom bar, the sidebar and
  every row action.
- [ ] **13.3** Keyboard: every interactive element is reachable and focused by
  Tab, with a visible focus ring.
- [ ] **13.4** Contrast: every text/background pair meets AA (4.5:1 body,
  3:1 large). The badge tints are checked against their text colour.
- [ ] **13.5** Colour is never the only status signal (requirements §2.3).
- [ ] **13.6** `prefers-reduced-motion: reduce` removes non-essential motion.
- [ ] **13.7** `lang` is correct on `<html>` and every image has an `alt`.
  (`index.html:2` currently sets `lang="en"`; the product is pt-BR.)

---

## V14 — Manual QA script

The PDF names four measures; this script exercises all four. Run it with the flag
on, in a fresh browser profile.

1. **Clicks to the first booking.** Starting logged out: count the clicks from the
   landing page to a confirmed appointment. Record the number and compare it to
   the same count on the current build. The redesign must not increase it.
2. **Booking as a new client.** Sign up fresh → Dashboard → Agendamentos → Novo
   agendamento → pick a workshop → pick date and time → confirm → the appointment
   appears under Meus agendamentos without a refresh.
3. **Completing on mobile.** At a 390px viewport, repeat step 2 using the bottom
   bar. The primary action is full width, cards stack, the stats band is 2×2, and
   nothing scrolls horizontally.
4. **Accessibility audit.** Run an automated audit on Dashboard, Agendamentos,
   Meu Carro, Histórico and the appointment detail, in both themes. Zero
   critical findings; then keyboard-only through the booking flow.
5. **The PDF's own diagnosis, re-checked.** Each item of requirements §2.6 is now
   false: one width and margin, one logo, no ALL-CAPS buttons, empty states with a
   next step, one scheduling flow, Meu Carro showing what Histórico knows,
   Histórico without the repeated column, and a 6-item menu.

---

## V15 — Merge gate

Merge-ready only when all are true:

- `npm run test`, `npm run build` and `npx tsc -p tsconfig.app.json --noEmit`
  all pass, with the type-error count no higher than the 149 it started at;
- the 8 pre-existing tests are green and unmodified in intent;
- MUI is fully removed and `dist/` is measurably smaller;
- role gating is enforced and verified with a cross-role navigation attempt;
- every retired route redirects and every menu item resolves;
- one status module owns both domains;
- the manual QA script completes, including the accessibility audit and the
  390px pass;
- both light and dark themes reviewed on every screen;
- `CHANGELOG.md` has a dated `## 2026-10-15` entry, `specs/ROADMAP.md` reflects
  the phase, and `apps/web/frontend-changes.md` records the pass;
- no `any` was introduced;
- the user has reviewed the result.

---

## V16 — Non-goals (not validated here)

- Backend changes, including `next_service_*` on the service-order summary.
- The landing page and auth screens (migrated on 2026-10-09).
- Charts and any new data visualisation.
- Redesigned workshop layouts — presentation only.
- `@tanstack/react-query` or `zustand` wiring.
- Admin area, native apps, offline/PWA behaviour.

---

## Summary

| Verification | Description | Result |
|--------------|-------------|--------|
| V1 | Tokens and typography (old hex/fonts gone, both themes) | ✅ / ❌ |
| V2 | Route map and legacy inventory | ✅ / ❌ |
| V3 | The six components with all states | ✅ / ❌ |
| V4 | One status module covering both domains | ✅ / ❌ |
| V5 | Shell, 6-item menu, bottom bar, role gating fixed | ✅ / ❌ |
| V6 | Agendamentos merged page and map | ✅ / ❌ |
| V7 | Meu Carro and Histórico | ✅ / ❌ |
| V8 | Appointment detail with the Andamento track | ✅ / ❌ |
| V9 | Dashboard behind the flag | ✅ / ❌ |
| V10 | Redirects and route table | ✅ / ❌ |
| V11 | Workshop area migrated | ✅ / ❌ |
| V12 | MUI removed, `dist/` smaller | ✅ / ❌ |
| V13 | Tests, accessibility, reduced motion | ✅ / ❌ |
| V14 | Manual QA script and the four PDF measures | ✅ / ❌ |
| V15 | Merge gate | ✅ / ❌ |
| V16 | Non-goals stay out of scope | — |

> **Phase closed when:** V1–V15 = ✅ and no prior-phase regression (the 8
> existing tests stay green, and tenant isolation on the backend is untouched).
