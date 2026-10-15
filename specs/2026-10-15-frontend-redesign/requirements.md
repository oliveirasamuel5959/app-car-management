# Requirements: Frontend Redesign — DrivePluss Design System

Last Updated: 2026-10-15
Branch: feature/2026-10-15-frontend-redesign
Status: Planned

## Context

The client dashboard was redesigned in Claude Design and delivered as
`DrivePluss Client Dashboard — Redesign.pdf` (9 pages, 1020×675pt). It defines a
single visual system, draws six client screens, specifies a catalogue of six
reusable components, and carries a four-phase refactoring plan plus a diagnosis
of the current frontend.

The frontend has **two parallel palettes that already disagree**:

- `apps/web/src/theme.ts` — MUI `createTheme`, static hex. 49 files import
  `@mui/material`; 45 files use `sx` (420 occurrences).
- `apps/web/src/index.css` — Tailwind/shadcn HSL tokens in `:root` / `.dark`.
  29 files are Tailwind-only.

The file's own header comment admits the drift: MUI's colours "do not read the
CSS custom properties in src/index.css, so the two can drift". MUI also does not
follow the `.dark` class, which forced **214 lines of `!important` overrides**
(`src/index.css:203-415`) to make dark mode work at all.

The public surfaces (landing, `/login`, `/signup`) were already migrated to
Tailwind in the 2026-10-09 pass recorded in `apps/web/frontend-changes.md`. The
authenticated application is the half that never moved. This phase finishes that
migration and applies the PDF's design system to it.

## 1. Scope

### In Scope

- Design tokens: brand blue, text, background, surfaces, status tints, the type
  scale, the spacing scale and the two radii, in both light and dark themes.
- Plus Jakarta Sans as the single typeface, replacing Inter and Outfit.
- One application shell: a single header, a 6-item grouped menu, a max-width
  content band, and a bottom bar below 768px.
- Six reusable components with a visible catalogue: Button, StatsBar,
  StatusBadge, MenuItem, EmptyState, CurrentServiceCard.
- The six client screens redrawn to the PDF: Dashboard, Agendamentos,
  Meus Agendamentos, Meu Carro, Histórico de Manutenção, appointment detail.
- A real service-order progress track (Pendente → Confirmado → Em andamento →
  Concluído), which no client screen has today.
- Unifying six duplicate status maps into one module covering both status
  domains (schedules and service orders).
- The workshop area translated onto the same tokens, shell and components,
  keeping its existing content structure.
- Complete removal of MUI: `@mui/material`, `@mui/icons-material`,
  `@emotion/react`, `@emotion/styled`, `src/theme.ts`, the `ThemeProvider` /
  `CssBaseline` wiring, and the 214-line override wall.
- Route redirects so no existing link breaks, plus the information-architecture
  change the PDF calls for.
- The `ProtectedRoute` role-gating defect (§5) and the two dead menu links.
- Rollout behind a flag, as the PDF's Phase 4 requires.

### Out of Scope

- **Backend changes of any kind.** "Próxima revisão" on Dashboard and Meu Carro
  is served by `GET /services-history/`, which already returns the field
  (§D4). Adding `next_service_*` to `GET /service-orders/summary` is registered
  as follow-up, not done here.
- The landing page and the auth screens — already migrated on 2026-10-09.
- Charts. No charting library is installed and the PDF does not ask for one; the
  `--chart-1..5` tokens in `tailwind.config.ts` stay unused.
- The `recharts`/`d3` question, analytics, and any new data visualisation.
- Admin area, native mobile apps, PWA/offline work.
- The workshops' *content* — only their presentation changes (§D6).
- `@tanstack/react-query` wiring and `zustand`. Both are installed and neither
  is mounted; this phase does not change the data-fetching approach.

## 2. What the PDF specifies

### 2.1 Tokens (page 7, stated verbatim)

| Token | Value |
| --- | --- |
| Brand blue | `#0B6BA8` |
| Text | `#14202B` |
| Background | `#F6F8FA` |
| Type | Plus Jakarta Sans — 13 / 15 / 18 / 22 / 30 |
| Space | 4 · 8 · 12 · 16 · 24 · 32 |
| Radius | 10 · 16 |

Values derived by sampling the rendered pages, to be confirmed visually during
implementation:

| Surface | Value |
| --- | --- |
| Header blue / brand bar | `#0A6AA7` |
| Card surface | `#FFFFFF` |
| Card border | `#E1E6EC` |
| Progress track | `#E1E6EC` |
| Active menu item | bg `#E1EEF7`, text `#0C4573` |
| Badge — Pendente | `#FDF0DF` |
| Badge — Confirmado | `#E1EEF7` |
| Badge — Em andamento | `#ECE9FE` |
| Badge — Concluído | `#E3F5E9` |

### 2.2 Geometry (measured on page 1, rendered at 1559px → scale 0.924 to 1440)

- Blue header: full height ≈ **67px**.
- Sidebar: ≈ **255px**, starting at the top of the page.
- Content band: ≈ **960px max-width**, ≈ 32px gutter each side.
- The greeting sits left and the primary action right — **the primary action
  belongs at the top right of the page, not in the header**.

### 2.3 The six components (page 7)

| Component | Rule the PDF states |
| --- | --- |
| Button | Primary and secondary. Default, hover, focus, disabled, loading. **One primary per screen.** |
| StatsBar | Four numbers in one card. Each one filters Meus Agendamentos. |
| StatusBadge | Pendente / Confirmado / Em andamento / Concluído. **"The text always states the status; colour never acts alone."** |
| MenuItem | Groups with headings. **Becomes a bottom bar below 768px.** |
| EmptyState | **"Every empty list explains and offers a next step."** |
| CurrentServiceCard | Service steps, workshop and delivery estimate. |

### 2.4 The six client screens

1. **Dashboard** — greeting + primary action; "Seu serviço atual" and "Meu carro"
   side by side; a four-number stats band; "Pedidos recentes" plus Mensagens and
   Manutenção cards.
2. **Agendamentos** — header, tabs "Meus agendamentos" / "Novo agendamento", a
   4-step indicator (Oficina · Serviço · Data e horário · Confirmar), filters
   (radius, minimum rating, service type, sort), a result count, workshop cards
   whose action reads "Agendar aqui", and the map as a right-hand panel.
3. **Meus agendamentos** — tabs "Próximos / Concluídos / Cancelados", cards with
   a badge and Reagendar / Ver detalhes / Cancelar, and an empty state that
   offers the next step.
4. **Meu Carro** — vehicle card (plate, make, year, actions) and three cards:
   Última manutenção / Próxima revisão / Gasto registrado.
5. **Histórico de Manutenção** — three summary tiles and a narrow table (Data,
   Serviço, KM, Custo, Próxima revisão, Ações), vehicle and type filters, and
   "+ Adicionar manutenção".
6. **Appointment detail** — an "Andamento" track (Pendente ✓, Confirmado ✓,
   Em andamento ●, Concluído ○) beside a delivery-estimate card and a workshop
   card with "Enviar mensagem" and "Ver no mapa".

### 2.5 Mobile (page 9)

Blue brand bar only; greeting; full-width primary action; stacked cards; the
stats band as a 2×2 grid; **a five-item bottom bar** (Início, Agendar, Carro,
Manutenção, Mais).

### 2.6 The PDF's diagnosis (these become acceptance criteria)

- Different widths and margins per screen; duplicated logo; buttons in ALL CAPS.
- Empty states with no next step.
- Three screens for one scheduling flow.
- "Meu Carro" does not show what Histórico already knows (last service, next
  service).
- Histórico with 9 columns, icon-only edit/delete, and a repeated Veículo column.
- A flat menu of 9 items.

## 3. Functional Requirements

### 3.1 Tokens and typography

- Every design value lives once, as a CSS custom property in `src/index.css`,
  consumed through `tailwind.config.ts`. No component hardcodes a hex.
- Light and dark both define the full set. Each text-on-surface pair is a
  deliberate value with its measured contrast ratio recorded in a comment, as
  the existing tokens already do.
- Radius scale is 10 and 16. The current Tailwind radii (`lg 9px / md 6px /
  sm 3px`) and MUI's `borderRadius: 8` both go away.
- Plus Jakarta Sans replaces Inter and Outfit in `index.html`. JetBrains Mono
  stays. The type scale is 13 / 15 / 18 / 22 / 30.
- No uppercase-transformed body or button text. See §D8.

### 3.2 Shell

- **One** header. The wordmark appears there and nowhere else.
- Sidebar with **6 items in groups**, not a flat list of 9 or 10.
- The active item is derived from the route **prefix**, so sub-routes keep their
  parent highlighted. Today the comparison is exact-match
  (`client-sidebar.tsx:115`), so no sub-route highlights anything.
- Content band is ~960px with a consistent gutter on every screen.
- Below 768px the sidebar is replaced by the five-item bottom bar.
- Every menu item resolves to a route that exists. Two do not today (§5).

### 3.3 Components

Each of the six is a single component with a documented prop contract and all
the states the PDF lists. `EmptyState` requires an action — a next step is not
optional, and omitting it must be a type error.

The components ship with a catalogue view that renders every state, so the
design can be reviewed without navigating the app.

### 3.4 Screens

The six client screens are redrawn to §2.4, at the geometry of §2.2. Specifically:

- **Agendamentos** replaces three screens (scheduling, workshop search, and the
  workshop booking detail) with one tabbed page. The map becomes a panel inside
  the page rather than a `height: calc(100vh - 64px)` full-height layout.
- **Meus Serviços stops being a page.** Progress moves to the Dashboard's
  "Seu serviço atual" card and to the appointment detail screen.
- **Appointment detail** is a real route with the Andamento track.
- **Meu Carro** shows Última manutenção, Próxima revisão and Gasto registrado,
  which it does not today.
- **Histórico** drops the Veículo column, drops icon-only actions, and keeps the
  existing create/edit dialog and parts-breakdown drill-down.

### 3.5 Status presentation

- One module owns every status label and tint, for **both** domains (§D7).
- Colour never carries meaning alone: the badge always contains the label.
- The label disagreements between the six current maps are resolved to one
  spelling each.

### 3.6 Workshop area

The 14 workshop pages adopt the tokens, the shell and the six components. Their
content structure stays as it is — this phase does not redesign layouts the PDF
never drew (§D6).

### 3.7 Rollout

The new Dashboard ships behind a flag, as the PDF's Phase 4 requires, so it can
be reviewed in the browser and rolled back without reverting code. The remaining
screens migrate group by group.

## 4. Technical Decisions

Numbered decisions the user confirmed, each with its reason.

### D1 — Tailwind tokens become the single source of truth

MUI's `createTheme` is deleted rather than synced. Two palettes maintained by
hand is what produced the drift in the first place; a bridge that makes MUI read
the CSS variables would keep the second system alive without removing the
override wall, since MUI still would not follow `.dark`.

### D2 — The PDF's blue wins

The PDF's `#0B6BA8` replaces the brand's `#0E71AE` as `--primary`. The two are
close enough that a partial swap would leave both on screen — a card in one blue
next to a button in the other reads as a rendering bug, not a design. So the swap
is all-or-nothing, and part of TG1's verification is grepping `#0E71AE` to zero.

### D3 — Plus Jakarta Sans, and Inter and Outfit leave

The PDF names one family and one scale (13/15/18/22/30). Keeping Outfit for
display and Inter for body would preserve a distinction the PDF does not draw.
JetBrains Mono stays because the token layer has a `font-mono` consumer.

### D4 — "Próxima revisão" reads `GET /services-history/`, not a new backend field

The Dashboard calls `GET /service-orders/summary`, whose `ServiceSummaryItem`
schema (`apps/backend/src/schemas/services.py:113-121`) has no `next_service_*`,
and Meu Carro calls `GET /vehicles`. The data exists only on the service-history
endpoints. This phase derives it client-side from `GET /services-history/` —
already fetched by the Histórico page via `serviceHistoryService.list()` — so the
backend stays untouched. Adding `next_service_*` to the summary is registered as
follow-up: it would remove a fetch per page.

### D5 — The map stays Leaflet with OpenStreetMap

`react-leaflet` is what the search page actually renders. `@react-google-maps/api`
is installed but unused, and `VITE_GOOGLE_MAPS_API_KEY` would be a new
deployment dependency for no gain. The unused Google Maps dependency is removed
in TG12.

### D6 — The workshop area gets the system, not new layouts

The PDF draws no workshop screen. Applying its tokens, shell and components to
the 14 existing workshop pages makes the two areas read as one product while
inventing nothing. Redesigning those layouts would be a design decision with no
reference to judge it against, so it is out of scope.

### D7 — Schedules and service orders keep separate status modules, sharing one shape

These are two different domains whose Portuguese labels collide: `pendente` /
`pending` are both "Pendente" and `recusado` / `rejected` are both "Recusado".
Merging them into one map would be a latent bug — the same string would mean two
things. They stay separate exports in one module, over one shared `StatusMeta`
shape, so the badge component takes either.

### D8 — Uppercase is a defect to remove, not a style to keep

The PDF's diagnosis lists "todos os botões em CAIXA ALTA" as a problem, and the
design renders sentence case throughout. `text-transform: uppercase` on labels
and buttons comes out. This is called out because it will look like an
unrequested change to anyone reading the diff file by file.

### D9 — Route redirects, not route deletion

Every superseded path becomes `<Navigate replace>` to its new home. The three
scheduling paths collapse into the tabbed page, so the redirect carries a query
parameter or an equivalent so that a deep link to a workshop still lands on that
workshop. Removing paths outright would break bookmarks and any link already
sent to a user.

### D10 — The flag is a build-time constant checked at the route boundary

The PDF asks for the new Dashboard behind a flag. A Vite environment flag read
where the route is defined keeps the check in one place and lets the flag be
dropped with the route table, rather than threaded through the Dashboard
component.

## 5. Defects this phase fixes

Found while reconciling; they are in scope because the redesign touches the same
files.

**Two `ProtectedRoute` components exist and the wrong one is live.**

- `src/components/routing/protected-route.tsx` — the one `App.tsx:4` imports.
  It takes only `children` and **ignores `requiredRole` entirely**.
- `src/routes/routes.tsx:221-233` — a second implementation that does check
  `user?.role !== requiredRole`. It is the module's default export and **is
  never imported**.

So `App.tsx:56` passes `requiredRole={route.role}` and it is silently dropped.
Role isolation currently rests on individual pages, not on routing. TG5 makes the
live component enforce the role.

**Two dead menu links.** Both sidebars link to `/client/settings` and
`/workshop/settings`, and neither route exists (`routes.tsx` has no matching
entry). Every menu item must resolve after this phase.

**One broken route.** `routes.tsx:74` declares `path: 'cars/new'` — relative,
no leading slash — while `car-page.tsx` and `car-card.tsx` navigate to the
absolute `/cars/new`. Under the `*` catch-all this needs a runtime check; the new
route table must make it unambiguous.

**Four orphan files**, zero importers, safe to delete in TG12:
`components/navigation/navbar.tsx` (used only by the dead layout below),
`components/navigation/footer.tsx` (imported by `main-layout.tsx` but its render
is commented out at line 30), `layouts/dashboard-layout.tsx` (194 lines, still
says "CarKeep", routes to paths that do not exist), and
`components/workshops/services-timeline.tsx` (demo props, never imported).

**Dead data**: the `publicRoutes` array in `routes.tsx:46-59` is filtered at
`App.tsx:43` against paths the outer `<Routes>` already handles, so it
contributes nothing.

## 6. Constraints

- No `any`. Project rule (`AGENTS.md`).
- Page-specific components live beside their route where possible. Project rule
  (`.claude/rules/frontend.md`); `search-filter-panel.tsx` and `rating-modal.tsx`
  already follow it.
- The 8 existing test files stay green and are not deleted:
  `rating-validation`, `service-status` (now `lib/status`), `realtime-socket`,
  `api`, `payment-service`, `service-service`, `workshop-rating-service`,
  `workshop-service`.
- Vitest runs with `environment: 'node'` (`vitest.config.ts`), so component
  rendering tests need that environment extended before they can be written. Its
  `resolve.alias` was also missing, so no test could import a module that uses the
  `@` alias — fixed as part of TG4.
- Accessibility: 44px minimum touch targets, AA contrast, visible focus, and
  `prefers-reduced-motion` respected. The repo has an established habit here —
  the 2026-10-09 pass added `--destructive-text` and `--success-text`
  specifically because the fill colours failed AA as small text.
- No new runtime dependency without a written justification. The direction here
  is removal: four packages leave.
- Conventional Commits in Portuguese, scoped to `web` (root `AGENTS.md`).
- No documentation files beyond the CHANGELOG entry and the roadmap update the
  repo's own conventions require.

### 6.1 The type-check gate does not work (§7, found during TG2)

`npm run check` is `tsc` against `apps/web/tsconfig.json`, which is a
solution-style config with `"files": []` and only project `references`. It
type-checks **zero files** and always exits 0 — a file containing
`export const x: number = "not a number";` passes it.

The real gate is `npx tsc -p apps/web/tsconfig.app.json --noEmit`, which reports
**149 errors across 26 files** today. Those are pre-existing and are not this
phase's to fix wholesale, but:

- the phase must not **increase** that count;
- every file a task group touches must be left with **no** error of its own;
- the count is recorded after each group, so the trend is visible.

Fixing `npm run check` to point at the app config is a one-line change that would
break every other branch's build, so it is **registered as follow-up** rather
than done here. Until then, every "`npm run check` clean" instruction in
`plan.md` should be read as the real gate above.

Two relationships the diagnosis predicted are confirmed by that gate:
`App.tsx(56,43)` — `requiredRole` passed to a component whose props do not
declare it, which is §5's role-gating defect; and the `routes.tsx` route table
being untyped, so a typo in a `role` would never be caught (now fixed by typing
`protectedRoutes`).


## 7. Risks

- **Scale.** 49 files import MUI and 45 use `sx` across ~13,000 lines. Doing this
  in one commit is unreviewable; the task groups exist to keep each step
  reviewable, and TG11's workshop work is the largest single group.
- **A partial blue swap.** `#0B6BA8` and `#0E71AE` differ by ~3% lightness. If
  the swap lands in some files and not others the app shows two blues at once
  and it reads as a bug. TG1 must leave zero occurrences of the old hex.
- **The map inside a tab.** The search layout is a fixed-height three-column
  grid with the filter panel hidden below `md`. As a tab inside a padded content
  band its sizing assumptions are all wrong. Leaflet also needs its container
  dimensions at mount, so a tab that starts hidden needs an explicit invalidate.
- **The 4-step indicator has no third step today.** The PDF's steps are Oficina ·
  Serviço · Data e horário · Confirmar, but the current booking flow is
  day → time slot → dialog (type, description, phone, e-mail) and has **no
  service-catalogue step**. Either the indicator reflects the flow that exists
  (4 steps with a different third label) or a catalogue step is added. This is
  the one place where the PDF's information architecture does not map onto the
  API, and §D-OPEN-1 below must be decided before TG6 starts.
- **Dark mode regressions.** Removing MUI removes the override wall, but until
  TG12 completes, both systems render. The intermediate states need checking in
  both themes, not just the final one.
- **`dist/` is expected to shrink** (four packages leave, and MUI's emotion
  runtime with them). Measure the baseline before TG12 and compare after, or the
  claim is unverifiable.

## 8. Open decisions

### D-OPEN-1 — The third step of the booking indicator

The PDF's 4 steps include "Serviço" (a service-catalogue choice). The current
flow has no such step: the request type is picked inside the confirmation dialog.
Either the indicator's third step is relabelled to match reality, or a catalogue
step is introduced. Introducing it is a product change with backend
implications, not a visual one.

**Recommendation:** relabel the third step to "Data e horário" and keep the
type/description fields in the confirmation dialog, which is what step 4 is.
Decide before TG6.

### D-OPEN-2 — Whether the flag outlives the migration

The PDF asks for a flag around the new Dashboard. Whether the flag is removed
once all screens have migrated, or kept as a permanent escape hatch, is a
decision for the end of TG13.

**Recommendation:** remove it. A flag whose two branches have both been migrated
is dead code, and the route table is the natural place to drop it.

## 9. Success Definition

This phase is complete when:

- every token, typeface, radius and spacing value in the app comes from one
  place, and `#0E71AE`, `Inter` and `Outfit` return nothing in a source grep;
- the six client screens match the PDF's renders, at the geometry the PDF
  specifies;
- the six components exist with every state the PDF lists, and `EmptyState`
  cannot be rendered without a next step;
- MUI is fully gone — no import in `src/`, four packages out of `package.json`,
  the override wall deleted, and `dist/` smaller than the measured baseline;
- the role-gating defect is fixed and verified with a CLIENT user hitting a
  WORKSHOP route;
- every retired route redirects and every menu item resolves;
- six duplicate status maps are one module covering both domains;
- `npm run check`, `npm run test` and `npm run build` all pass, with the 8
  existing tests still green;
- the manual QA script in `validation.md` completes, including its accessibility
  audit and the mobile pass at 390px;
- `CHANGELOG.md` carries a dated `## 2026-10-15` entry and `specs/ROADMAP.md`
  reflects the phase.
