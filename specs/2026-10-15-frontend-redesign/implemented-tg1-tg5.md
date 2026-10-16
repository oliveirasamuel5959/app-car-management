# Implemented: TG1–TG5

Last Updated: 2026-10-15
Branch: feature/2026-10-15-frontend-redesign
Status: TG1–TG5 complete; TG6–TG13 not started

What each group actually did, with the evidence that it works. Anything that
diverged from [plan.md](plan.md) is called out with the reason.

## TG1 — Tokens and typography ✅

- Rewrote the token block in `src/index.css` for light and dark.
- `tailwind.config.ts`: radii 10/16, the 13/15/18/22/30 type scale, `maxWidth.content`
  (960px), `width.sidebar` (256px), a `nav` breakpoint at 768px, and new
  `header` / `nav` / `track` / `status` colour groups.
- `index.html`: Plus Jakarta Sans replaces Inter and Outfit; JetBrains Mono kept.
  Also corrected `lang="en"` → `lang="pt-BR"` — the product is Brazilian
  Portuguese and the attribute was wrong.
- `src/theme.ts` updated to match, since MUI still renders until TG12 and the two
  blues are close enough that a mismatch would be visible on one screen.

**Tokens are stored as HSL triplets, and that costs up to 1/255 per channel.**
Tailwind v3 needs the triplet form for the opacity modifier (`bg-primary/90`)
that the UI already uses, and an integer HSL triplet cannot represent every 24-bit
colour. Each token is the *closest* triplet to the design's hex; worst case is
1.29/255 (0.5%), measured across the whole block, with the design's hex quoted
beside each value in a comment. Verified by rendering the tokens in a browser and
sampling the pixels:

| Token | Design | Rendered | Δ |
| --- | --- | --- | --- |
| `--primary` | `#0B6BA8` | `#0B6CA8` | 1/255 |
| `--background` | `#F6F8FA` | `#F5F9F9` | 1/255 |
| `--foreground` | `#14202B` | `#13212A` | 1/255 |
| `--header` | `#0A6AA7` | `#0B69A8` | 1/255 |
| `--border` | `#E1E6EC` | `#E0E7EB` | 1/255 |
| `--nav-active` | `#E1EEF7` | `#E2EFF8` | 1/255 |
| `--status-completed-bg` | `#E3F5E9` | `#E4F6E8` | 1/255 |

Evidence: `grep -rn "0E71AE\|Outfit" src/ index.html` → nothing.
`npm run build` passes; the tokens appear in the built CSS.

## TG2 — Audit and route map ✅

[audit.md](audit.md). The 49-file MUI worklist sorted by `sx` density, the six
status maps, the four orphans, and the full new/old route map. Every number came
from a command, and the command is given beside it.

## TG3 — The six components ✅

| Component | File |
| --- | --- |
| Button | `components/ui/button.tsx` (extended, not duplicated) |
| StatusBadge | `components/ui/status-badge.tsx` |
| StatsBar | `components/ui/stats-bar.tsx` |
| MenuItem / MenuGroup | `components/navigation/menu-item.tsx` |
| EmptyState | `components/ui/empty-state.tsx` |
| CurrentServiceCard | `components/service-orders/current-service-card.tsx` |

Rules the design states, and how each is enforced rather than merely intended:

- **One primary per screen** — two variants exist (`default`, `outline`) and
  nothing else is filled.
- **Colour never acts alone** — `StatusBadge` takes a `StatusMeta` whose `label` is
  required, so a colour-only badge is not expressible.
- **Every empty state offers a next step** — `EmptyState`'s props intersect a union
  requiring `onAction` or `actionHref`. Verified by compiling a probe:
  `<EmptyState title="Nada aqui" />` fails with
  `Type '{ title: string; }' is not assignable to ... (EmptyStateProps & EmptyStateAction)`.
- **44px targets** — the default button height is `h-11` (44px).
- **Bottom bar below 768px** — `MenuItem` has a `compact` form; the bar is in TG5.

Catalogue at `/design/components`, rendering every state. Dev surface only, not in
the menu.

## TG4 — One status module ✅

`pages/client/service-status.ts` → **`lib/status.ts`** (with its test). It is no
longer client-page-specific: the workshop pages use it too.

- `STATUS_META` (8 service-order statuses) and `SCHEDULE_STATUS_META` (4 schedule
  statuses) are **separate exports over one shared `StatusMeta` shape**. Merging
  them would have been a latent bug: "Pendente" and "Recusado" exist in both
  domains with different meanings and different API strings. A test asserts they
  are not the same object.
- Colours are keyed by a **semantic tone** (`pending` / `confirmed` / `progress` /
  `completed` / `cancelled`), not by status name, so one token pair serves both
  domains.
- Hex `color`/`bg` are kept and marked `@deprecated` for the three MUI `sx`
  consumers that have not migrated; they are derived from a shared tone table so
  they cannot drift. TG12 removes them.

Spellings resolved to one each: `"Em andamento"` (was also "Em Andamento", "Em
Progresso", "Em progresso"), `"Pendente"` (was also "Pendente - Aguardando
Confirmação"), `"Recusado"`, `"Cancelado"`, `"Concluído"`.

Six maps removed: `my-schedules-page`, `messages-page`, `realtime-toasts`,
`workshop/services-page`, `workshop/client-orders-page`, `workshop/orders-page`,
`workshop/dashboard-page`, `workshop/schedules-page`. Two defects fell out of
this: `client-orders-page` and `orders-page` were rendering the raw API status in
English uppercase (`service.status.replace('_',' ').toUpperCase()`), and the
workshop dashboard carried a 14-branch inline ternary with its own spelling.

**Also fixed here:** `vitest.config.ts` had no `resolve.alias`, so no test could
import a module that uses `@`. Every existing test worked around it with relative
paths. The aliases now mirror `vite.config.ts`.

## TG5 — Shell ✅

- **One header**, rendered by `AppLayout`. `MainLayout` no longer renders one —
  it was a second brand bar, which the design's diagnosis flags as a duplicated
  logo.
- Sidebar of 6 grouped destinations for the client, replacing 9 flat.
- Active state by **route prefix** (`isPathActive`), so `/client/appointments/42`
  keeps "Agendamentos" highlighted. The old sidebars compared the pathname
  exactly, so no sub-route highlighted anything.
- Bottom bar below 768px with 5 destinations, the last opening the full menu — so
  no destination becomes phone-unreachable.
- Content band `max-w-content` (960px) with one gutter, applied by the shell
  rather than per page.
- `client-sidebar.tsx` and `workshop-sidebar.tsx` deleted.

### The role-gating defect is fixed

`components/routing/protected-route.tsx` now enforces `requiredRole`, and the
unreachable duplicate in `routes.tsx` is deleted. A signed-in user lacking the
role is sent to **their own dashboard**, not to `/login`, so they are not logged
out of a valid session. `protectedRoutes` is typed with `role: UserRole`, which
turns a typo in a role into a compile error instead of a string that silently
never matches — the exact failure mode that let this defect survive.

### The two dead menu links

`/client/settings` and `/workshop/settings` now exist, rendering the profile page.
That is the decision the plan left open ("either a real route or the item goes"):
settings live on the profile page, so the label and the destination now agree, and
no link is dead. `nav-routes.test.ts` asserts every menu path resolves to a
declared route and would fail if one went dead again.

## Divergences from the plan

**The workshop menu has 10 items, not 6.** The plan said "10 → 6". A test I wrote
asserting 6 caught it: the workshop area has ten distinct destinations
(`services`, `services-offered`, `service-history`, `orders/new`, `clients`,
`schedules`, `ratings`, `messages`, `dashboard`, `settings`), and collapsing to 6
would have deleted menu entries for pages that still exist — making them
unreachable. Since the design does not draw the workshop area, there is no
reference for which four to cut. They are now grouped into 3 sections instead
(primary / Oficina / Conta), every page stays reachable, and the grouping is
marked **provisional** for TG11 in both the code and the tests. `/workshop/orders`
is left out because it duplicates `/workshop/services`; it becomes a redirect in
TG11.

This also corrects [plan.md](plan.md), whose phase table said 6 for the workshop
by analogy with the client, and [audit.md](audit.md) §6.

**`npm run check` is not a working gate.** See requirements §6.1. It type-checks
zero files and always exits 0. The real gate is
`npx tsc -p tsconfig.app.json --noEmit`, which reports 149 pre-existing errors.
The count is now **132**, and every file these groups touched is clean.

## Evidence

```
npx tsc -p tsconfig.app.json --noEmit   →  132 errors (baseline 149)
npm run test                            →  10 files, 74 tests, all pass
npm run build                           →  ok
grep -rn "0E71AE\|Outfit" src/ index.html          →  nothing
grep -rn "STATUS_CONFIG\|STATUS_LABELS" src/       →  nothing
grep -rn "'Em Progresso'\|'Em Andamento'" src/     →  nothing
```

### `dist/` baseline for TG12

Measured after TG5, before any MUI removal, so V12's size claim has something to
compare against:

| Asset | Size |
| --- | --- |
| `index.js` | 1,059.43 kB |
| `index.css` | 71.13 kB |

The JS is slightly *larger* than the 1,095.10 kB / 69.25 kB recorded at the end of
TG1 (measured before the six components and the navigation config were added) —
expected, since this phase adds code. The MUI-removal group is where it should
drop.

Rendered in Chrome for Testing 156 at 1440×900 and 390×2400: the catalogue renders
all six components, the tokens resolve to the design's colours, all badge classes
are token-driven with no inline hex, the six client destinations are the only
`/client/*` hrefs, the stats bar wraps to 2×2 at 390px with no horizontal scroll,
and `/client/dashboard` redirects to `/login` without a session.

## Not yet done (TG6–TG13)

- The merged **Agendamentos** page and `/client/appointments` (the nav points at it
  and `nav-routes.test.ts` exempts it as pending).
- Meu Carro / Histórico tiles, appointment detail, the new Dashboard and its flag.
- Route redirects, the workshop area's Tailwind migration, MUI removal.
- `npm run check` still points at the solution config.
