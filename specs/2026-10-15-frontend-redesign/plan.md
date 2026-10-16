# Plan: Frontend Redesign — DrivePluss Design System

Last Updated: 2026-10-15
Branch: feature/2026-10-15-frontend-redesign
Status: Planned

Feature Context: Unify the frontend onto the DrivePluss design system from
`DrivePluss Client Dashboard — Redesign.pdf`, redraw the six client screens, and
remove MUI entirely. Requirements, decisions and the defect list are in
[requirements.md](requirements.md).

## Reconciliation with the codebase

Measured, not assumed. Every number below was checked against the working tree.

### Design system

| Fact | Value |
| --- | --- |
| Files importing `@mui/material` | 49 |
| Files importing `@mui/icons-material` | 27 |
| Files importing `lucide-react` | 17 |
| Files with `sx={` | 45 (420 occurrences) |
| Files with `className=` | 34 (520 occurrences) |
| Files using `styled()` | 0 |
| CSS modules | 0 |
| `src/index.css` total | 415 lines, of which 203-415 (213 lines) are MUI `!important` overrides |
| `!important` occurrences in `index.css` | 16 |

- `src/theme.ts` — `createTheme`, `primary #0E71AE`, `borderRadius: 8`,
  `fontFamily: Inter`. Its header comment states the drift is by design.
- `tailwind.config.ts` — radii `lg 9px / md 6px / sm 3px`, which **differ from
  MUI's `borderRadius: 8`**; `font-display: Outfit`; `--chart-1..5` declared but
  never defined in CSS and never consumed.
- `index.html:12` loads Inter, JetBrains Mono and Outfit.
- Two icon libraries coexist: `@mui/icons-material` (27 files) and
  `lucide-react` (17 files).
- **No charting library is installed.** Neither dashboard has charts today.

### Routes and shell

- `App.tsx` — `<Route path="*">` wraps `MainLayout`, which renders `Header` and
  a full-bleed `main`. `AppLayout` (DRAWER_WIDTH 240, COLLAPSED_WIDTH 64,
  NAVBAR_HEIGHT 64) is applied per-route inside the route table.
- Header height is `h-16` (64px) with `bg-[#0E71AE]` hardcoded at
  `header.tsx:55` and again at `:155`.
- Client sidebar: 9 items (`client-sidebar.tsx:45-53`). Workshop: 10 items.
- Active state: `location.pathname === item.path` (`client-sidebar.tsx:115`) —
  exact match, so sub-routes highlight nothing.
- Sidebars link to `/client/settings` and `/workshop/settings`; **neither route
  exists**.

### Status maps (six files, four spellings for `in_progress`)

| File | Note |
| --- | --- |
| `pages/client/service-status.ts` | Canonical, hex + bg, has a test. 8 service-order statuses. |
| `pages/client/my-schedules-page.tsx:32-37` | 4 schedule statuses, MUI chip colours. |
| `pages/client/messages-page.tsx:74-80` | `in_progress` → `"Em Andamento"`. |
| `components/realtime/realtime-toasts.tsx:6-16` | `in_progress` → `"Em Progresso"`. |
| `pages/workshop/services-page.tsx:40-56` | `pending` → `"Pendente - Aguardando Confirmação"`. |
| `pages/workshop/client-orders-page.tsx:77-95` | Workshop-side duplicate. |

### Scheduling surface (three screens to merge)

- `scheduling-page.tsx` — inline workshop search (name + geolocation) calling
  `scheduleService.searchWorkshops`; navigates to `/client/scheduling/:workshopId`.
  Duplicates the discovery role of the search page.
- `search-workshops-page.tsx` — `react-leaflet` + OpenStreetMap (not Google
  Maps), map fixed at `{md:360, lg:420}`, filter panel `xs:hidden md:block`,
  layout `height: calc(100vh - 64px)`. Filters: radius slider 1–100 (default
  10), rating `any|4|3|2|1`, types `manutencao|reparo|inspecao|outro`, sort
  `distance|rating|reviews`. Card action reads **"Ver Detalhes"**.
- `scheduling-workshop-page.tsx` (607 lines) — **no wizard**. Day → time slot →
  `Dialog` (type, description, phone, e-mail) → `POST /schedules/`.
- `my-schedules-page.tsx` — list + `RatingModal`, live reload on
  `schedule_status_change`.
- `services-page.tsx` (409 lines) — reads `:serviceId` only to float the matching
  order to the top; **there is no detail screen**.

### Progress track

No client screen renders a stepper or timeline. `progress_percentage` exists on
the backend and in the frontend's local interface, but is only ever rendered on
workshop pages as a plain `{n}%` string. `components/workshops/services-timeline.tsx`
is dead code with demo props.

### "Próxima revisão"

Read by exactly two pages — `client/service-history-page.tsx:326-331` and
`workshop/service-history-page.tsx:193-196` — via `GET /services-history/`.
Neither the Dashboard (which calls `GET /service-orders/summary`) nor Meu Carro
(which calls `GET /vehicles`) reads it. See requirements §D4.

### Orphans and dead code

`components/navigation/navbar.tsx`, `components/navigation/footer.tsx` (imported
by `main-layout.tsx:2`, but rendered at line 30 only inside a comment block),
`layouts/dashboard-layout.tsx` (zero importers), `components/workshops/services-timeline.tsx`
(zero importers), and the `publicRoutes` array (`routes.tsx:46-59`).

## Confirmed decisions

1. Scope: client and workshop in one spec, in separate task groups.
2. Tailwind tokens replace MUI as the single source of truth.
3. Plus Jakarta Sans (13/15/18/22/30); Inter and Outfit are removed.
4. The PDF's information architecture, with redirects for retired routes.
5. Rollout behind a flag, as the PDF's Phase 4 requires.
6. MUI removed completely in this phase, not deferred.
7. The workshop keeps its content structure; only presentation changes.
8. "Próxima revisão" derives from `GET /services-history/`; no backend change.

Full reasoning for each is in requirements §4.

## Reference implementation

Files to read before each group rather than re-derive:

- `src/index.css` — the token layer, and the override wall to delete (203-415).
- `tailwind.config.ts` — radii, fonts, the chart tokens that go unused.
- `src/theme.ts` — the MUI palette to fold into the tokens.
- `src/main.tsx` — `ThemeProvider` + `CssBaseline` to remove.
- `src/components/ui/button.tsx` and `src/components/ui/field.tsx` — the existing
  Tailwind primitives to build on rather than replace.
- `src/components/navigation/header.tsx` — the live header, with the two
  hardcoded hexes.
- `src/layouts/app-layout.tsx` — drawer widths and the header offset.
- `src/routes/routes.tsx` and `src/App.tsx` — the route table to restructure.
- `src/pages/client/service-status.ts` — the canonical status module to extend.
- `src/pages/client/search-workshops-page.tsx` — the map and filter panel to
  absorb.
- `src/components/brand/brand-logo.tsx` — the single wordmark source.

## TG1 — Tokens and typography

- Rewrite the token block in `src/index.css` for light and dark against the PDF's
  values: brand `#0B6BA8`, text `#14202B`, background `#F6F8FA`, card `#FFFFFF`,
  border `#E1E6EC`, the four badge tints, the active-menu pair.
- Keep the existing discipline: a fill value and a text value stay separate where
  the contrast demands it, each with its measured ratio in a comment.
- Update `tailwind.config.ts`: radii 10/16, the 13/15/18/22/30 type scale, badge
  colours, and the bottom-bar breakpoint. Remove `font-display: Outfit`.
- Swap the Google Fonts request in `index.html` to Plus Jakarta Sans; keep
  JetBrains Mono.
- Replace `#0E71AE` in `header.tsx:55` and `:155` with the token.

Verification: `grep -rn "#0E71AE\|Outfit" src/ index.html` returns nothing;
the real type gate does not increase its error count (see requirements §6.1);
`npm run build` passes; both themes inspected in the
browser for the new tokens.

Commit: `feat(web): adotar tokens, tipografia e raios do design system DrivePluss`

## TG2 — Audit and the route map

- Inventory the 49 MUI files, the 420 `sx` usages, the six status maps and the
  orphan list, into a table in this spec's directory so TG11/TG12 can be checked
  off against it.
- Produce the new/old route map, including which retired path redirects where and
  how a workshop deep link is preserved (§D9).
- Confirm the `/cars/new` behaviour at runtime and record what it does today.

Verification: the inventory's counts match fresh greps; the route map covers every
path in `routes.tsx`.

Commit: `docs(web): inventariar o frontend legado e mapear as rotas do redesign`

## TG3 — The six components

- `Button` — primary and secondary, with default, hover, focus, disabled and
  `loading`. Extend the existing `components/ui/button.tsx` rather than adding a
  second button.
- `StatusBadge` — takes the shared `StatusMeta` shape; always renders the label.
- `StatsBar` — four numbers in one card; each is a filter control.
- `MenuItem` / `MenuGroup` — grouped menu with a heading.
- `EmptyState` — description plus a **required** action; the action prop is not
  optional.
- `CurrentServiceCard` — steps, workshop, delivery estimate; composes the
  progress track.
- A catalogue route rendering every state of all six.

Verification: the catalogue renders in the browser and each
state is visible.

Commit: `feat(web): adicionar os seis componentes reutilizáveis do design system`

## TG4 — One status module

- Extend `pages/client/service-status.ts` (it already has a test) into the single
  status module for the app.
- Export the schedule domain and the service-order domain **separately**, over one
  shared `StatusMeta` shape (§D7), so `pendente` and `pending` cannot be confused.
- Resolve the label disagreements to one spelling: `"Em andamento"` (not
  "Em Andamento" / "Em Progresso"), `"Pendente"` (not "Pendente - Aguardando
  Confirmação").
- Delete the five duplicate maps.
- Extend `service-status.test.ts` to cover both domains and the label spellings.

Verification: `grep -rn "STATUS_CONFIG\|STATUS_LABELS" src/` returns nothing and
`STATUS_META` resolves to one module; `npm run test` green.

Commit: `refactor(web): unificar os mapas de status dos dois domínios`

## TG5 — Shell

- One header, wordmark only there.
- 6-item grouped sidebar; active state by route **prefix**, not exact match.
- The five-item bottom bar below 768px.
- A shared ~960px content band with the standard gutter, applied to every screen.
- **Fix the role gating**: make the live `components/routing/protected-route.tsx`
  enforce `requiredRole`, and remove the unreachable duplicate in `routes.tsx`.
- Resolve the two dead settings links — either a real route or the item goes.

Verification: a CLIENT user navigating to a `/workshop/*` route is redirected;
every menu item resolves; the bottom bar appears at 390px and not at 1024px;
the role-gating probe in validation V5.6 passes.

Commit: `fix(web): corrigir o gate de papel e unificar o shell de navegação`

## TG6 — Agendamentos (the merged page)

- Tabs "Meus agendamentos" / "Novo agendamento".
- The 4-step indicator ahead of the new-appointment flow, per §D-OPEN-1.
- Absorb `scheduling-page`, `search-workshops-page` and
  `scheduling-workshop-page`.
- Filters as a panel; result count; workshop cards whose action reads
  "Agendar aqui".
- The map becomes an in-page panel. Handle the two Leaflet specifics: it must not
  assume a `100vh` parent, and a container that mounts hidden needs an explicit
  size invalidation.
- The status tabs Próximos / Concluídos / Cancelados, with the empty state
  offering the next step.
- Keep the live reload on `schedule_status_change`, the `RatingModal`, and the
  timezone handling already in `scheduling-workshop-page.tsx`.

Verification: the deep link to a workshop still lands on that workshop; a
schedule created end to end appears in Meus agendamentos without a manual
refresh; the map renders inside the tab at desktop and stays hidden on mobile.

Commit: `feat(web): unificar as telas de agendamento numa página com abas`

## TG7 — Meu Carro and Histórico

- Meu Carro gains Última manutenção, Próxima revisão and Gasto registrado,
  derived from `GET /services-history/` (§D4).
- Meu Carro's actions: Agendar serviço, Ver histórico.
- Histórico drops the Veículo column and the icon-only actions (text buttons
  instead), and keeps the create/edit dialog and the parts-breakdown drill-down.
- Both screens use the tokens; no new fetch endpoints.

Verification: a vehicle with a history record shows the right last-service date,
next-service date and accumulated cost; a vehicle with no records shows the empty
state rather than zeros.

Commit: `feat(web): mostrar próxima revisão e gasto acumulado no carro e no histórico`

## TG8 — Appointment detail

- New route with the Andamento track (Pendente ✓, Confirmado ✓, Em andamento ●,
  Concluído ○), derived from the order status.
- Delivery-estimate card and workshop card with "Enviar mensagem" and
  "Ver no mapa".
- This screen takes over the progress display that Meus Serviços had.

Verification: each order status renders the correct step marked; "Enviar
mensagem" opens the right conversation; a paid/refunded order does not render a
broken track.

Commit: `feat(web): adicionar a tela de detalhe do agendamento com a trilha de andamento`

## TG9 — Dashboard behind the flag

- The new Dashboard at the PDF's layout: greeting, primary action, "Seu serviço
  atual" + "Meu carro", the stats band, "Pedidos recentes", Mensagens and
  Manutenção cards.
- Each stats number filters Meus Agendamentos, per the component's rule.
- Behind the flag (§D10), so the old Dashboard stays reachable until TG11 lands.

Verification: toggling the flag switches between old and new Dashboard; each
stats number lands on Meus Agendamentos filtered; the empty states offer their
next step.

Commit: `feat(web): novo dashboard atrás de flag de rollout`

## TG10 — Route table and redirects

- Retire and redirect: `/client/scheduling`, `/client/scheduling/:workshopId`,
  `/client/my-schedules`, `/client/search-workshops`, `/client/services`,
  `/client/services/:serviceId`, `/client/my-workshops`.
- Fix `/cars/new` → `/client/cars/new`.
- Remove the dead `publicRoutes` array and the unreachable `ProtectedRoute`.
- Every redirect uses `replace`; a workshop deep link keeps its target.

Verification: each retired path redirects; no console warning about a route with
no element; `npm run build` passes.

Commit: `refactor(web): aposentar e redirecionar as rotas substituídas`

## TG11 — Workshop area

- The 14 workshop pages adopt the tokens, shell and components, keeping their
  content structure (§D6).
- Workshop menu regrouped into sections and **finalised** — TG5 shipped it
  provisional at 10 items (one per existing page) because the design draws no
  workshop screen and cutting to 6 would have orphaned real pages. Keeping every
  page reachable is the constraint; the grouping itself is what TG11 decides.
- `/workshop/orders` becomes a redirect to `/workshop/services` (both list orders).
- `/workshop/:workshopId/clients` retires in favour of `/workshop/clients` — it
  duplicate  `users-page.tsx` and takes its workshop from the URL rather than the
  session.
- Replace the workshop-side status maps with the TG4 module.
- Migrate `sx` to Tailwind class by class. This is the largest group; verify in
  both themes as it goes, since until TG12 completes both systems render.

Verification: every workshop page renders without an MUI-only style regression in
light and dark; every workshop page is still reachable from the menu; the route
count in `audit.md` §5 is reconciled; `npx tsc -p tsconfig.app.json --noEmit`
does not increase its error count.

Commit: `refactor(web): migrar a área do workshop para o design system`

## TG12 — Remove MUI

- Delete `src/theme.ts` and the `ThemeProvider` / `CssBaseline` wiring in
  `main.tsx`.
- Delete `index.css:203-415` (the override wall) and the now-dead `App.css`.
- Delete the four orphans and the dead `services-timeline.tsx`.
- Replace remaining `@mui/icons-material` usages with `lucide-react`.
- Remove `@mui/material`, `@mui/icons-material`, `@emotion/react`,
  `@emotion/styled`, and the unused `@react-google-maps/api` from
  `package.json`.
- **Measure `dist/` before and after** and record both numbers.

Verification: `grep -rn "@mui\|@emotion" src/` is empty; the five packages are
absent from `package.json`; `npm run build` passes and `dist/` is smaller than
the recorded baseline.

Commit: `refactor(web): remover MUI e Emotion, consolidando o design system`

## TG13 — Records and final gates

- `CHANGELOG.md` — a dated `## 2026-10-15` section, following the existing
  `FEAT` / `FIX` / `PERF` prefix style, and stating plainly what changed.
- `specs/ROADMAP.md` — reflect this phase.
- `apps/web/frontend-changes.md` — the companion record for this pass, as the
  2026-10-09 pass did.
- Decide §D-OPEN-2 on the flag.
- Execute [validation.md](validation.md) end to end.

Verification: all validation gates pass; both themes reviewed; the accessibility
audit and the 390px pass complete.

Commit: `docs: registrar o redesign do frontend e fechar a spec`

## Suggested implementation order

TG1 → TG2 → TG3 → TG4 → TG5 → TG6 → TG7 → TG8 → TG9 → TG10 → TG11 → TG12 → TG13.

TG1–TG5 are the foundation and must land before any screen work; TG9 (Dashboard)
comes before TG10 so the flag has something to gate; TG11 before TG12 because
MUI cannot be removed while workshop pages still import it.
