# Audit: legacy frontend inventory and route map

Last Updated: 2026-10-15
Branch: feature/2026-10-15-frontend-redesign
Status: In Progress

Deliverable of TG2 in [plan.md](plan.md). This is the measured baseline the
migration groups (TG11, TG12) are checked off against. Every number below was
produced by a command, not estimated; the command is given with each table so it
can be re-run rather than trusted.

## 1. Design-system split

```bash
cd apps/web/src
grep -rl "@mui/material\|@mui/icons-material" . | wc -l   # 49
grep -rl "lucide-react" . | wc -l                          # 17
grep -ro "sx={" . | wc -l                                  # 420
grep -ro "className=" . | wc -l                            # 520
grep -rn "@mui\|@emotion" . | wc -l                        # 49 files, 0 in index.css
```

| Metric | Count |
| --- | --- |
| Files importing MUI | 49 |
| Files importing `lucide-react` | 17 |
| `sx={` occurrences | 420 |
| `className=` occurrences | 520 |
| `styled()` occurrences | 0 |
| CSS modules | 0 |
| `src/index.css` total lines | 415 |
| — of which the MUI override wall | 213 (lines 203-415) |
| `!important` in `index.css` | 16 |

Two icon libraries coexist. Every file that uses `sx` also imports MUI, so the
49-file list below is the migration worklist; `lucide-react` is already the
target for TG12's icon swap.

## 2. MUI worklist (49 files)

```bash
grep -rl "@mui/material\|@mui/icons-material" .
```

Sorted by `sx` density — highest first is where the migration costs most.

| File | `sx` |
| --- | --- |
| `pages/client/scheduling-workshop-page.tsx` | 36 |
| `pages/client/dashboard-page.tsx` | 25 |
| `pages/client/services-page.tsx` | 24 |
| `pages/workshop/client-detail-page.tsx` | 21 |
| `pages/shared/profile-page.tsx` | 19 |
| `pages/workshop/create-orders-page.tsx` | 17 |
| `pages/client/car-page.tsx` | 16 |
| `pages/workshop/dashboard-page.tsx` | 15 |
| `pages/client/scheduling-page.tsx` | 14 |
| `pages/workshop/services-page.tsx` | 13 |
| `pages/workshop/schedules-page.tsx` | 13 |
| `pages/client/service-history-page.tsx` | 12 |
| `pages/workshop/service-history-page.tsx` | 11 |
| `pages/client/search-workshops-page.tsx` | 11 |
| `pages/workshop/clients-page.tsx` | 10 |
| `layouts/dashboard-layout.tsx` | 10 |
| `components/service-orders/parts-form.tsx` | 10 |
| `pages/workshop/client-orders-page.tsx` | 9 |
| `pages/client/rating-modal.tsx` | 8 |
| `pages/client/my-schedules-page.tsx` | 8 |
| *(remaining 29 files, ≤4 each)* | |

**Deleted rather than migrated** (zero importers — see §4):
`components/navigation/navbar.tsx`, `components/navigation/footer.tsx`,
`layouts/dashboard-layout.tsx`, `components/workshops/services-timeline.tsx`.

**Absorbed then deleted** by TG6: `pages/client/scheduling-page.tsx`,
`pages/client/search-workshops-page.tsx`, `pages/client/search-filter-panel.tsx`,
`pages/client/scheduling-workshop-page.tsx`, `pages/client/my-schedules-page.tsx`.

**Absorbed then deleted** by TG7/TG8: `pages/client/services-page.tsx`.

So of the 49, roughly 9 leave by deletion and the rest migrate in place.

## 3. Status maps to unify (TG4)

```bash
grep -rn "STATUS_CONFIG\|STATUS_META\|STATUS_LABELS\|STATUS_MAP" .
```

| File | Domain | Note |
| --- | --- | --- |
| `pages/client/service-status.ts` | service orders | Canonical; hex + bg; 8 statuses; has `service-status.test.ts`. |
| `pages/client/my-schedules-page.tsx:32-37` | schedules | 4 statuses; MUI chip colour names. |
| `pages/client/messages-page.tsx:74-80` | service orders | `in_progress` → `"Em Andamento"`. |
| `components/realtime/realtime-toasts.tsx:6-16` | both | `in_progress` → `"Em Progresso"`. |
| `pages/workshop/services-page.tsx:40-56` | service orders | `pending` → `"Pendente - Aguardando Confirmação"`. |
| `pages/workshop/client-orders-page.tsx:77-95` | service orders | Workshop-side duplicate. |

Four different spellings exist for the same `in_progress` state. The target is
one module exporting the two domains separately (§D7 of
[requirements.md](requirements.md)).

## 4. Dead code to delete (TG12)

| Path | Evidence |
| --- | --- |
| `components/navigation/navbar.tsx` | Only importer is `layouts/dashboard-layout.tsx`. |
| `components/navigation/footer.tsx` | Imported by `layouts/main-layout.tsx:2`, but its render is inside a comment block at line 30. |
| `layouts/dashboard-layout.tsx` | Zero importers. 194 lines. Still says "CarKeep"; routes to `/dashboard`, `/my-car`, `/services/:serviceId`, `/settings`, none of which exist. |
| `components/workshops/services-timeline.tsx` | Zero importers. Demo props (`sampleCarInWorkshop`). |
| `publicRoutes` in `routes/routes.tsx:46-59` | Filtered at `App.tsx:43` against paths the outer `<Routes>` already handles. |
| `src/App.css` | 0 bytes. |

## 5. Route map

Current paths verified with `grep -oE "path: '[^']+'" routes/routes.tsx` (33
paths). New column is the target after TG6–TG10.

### Client

| Current | Target | Group |
| --- | --- | --- |
| `/client/dashboard` | kept (new UI behind the flag) | TG9 |
| `/client/my-car` | kept, gains the three tiles | TG7 |
| `cars/new` ⚠️ | `/client/cars/new` | TG10 |
| `/client/service-history` | kept, columns trimmed | TG7 |
| `/client/profile` | kept | — |
| `/client/messages` | kept | — |
| `/client/messages/chat/:workshopUserId` | kept | — |
| `/payments/return` | kept | — |
| `/client/search-workshops` | → `/client/appointments?tab=novo` | TG6/TG10 |
| `/client/scheduling` | → `/client/appointments?tab=novo` | TG6/TG10 |
| `/client/scheduling/:workshopId` | → `/client/appointments?tab=novo&oficina=:id` | TG6/TG10 |
| `/client/my-schedules` | → `/client/appointments?tab=meus` | TG6/TG10 |
| `/client/my-workshops` | → `/client/appointments?tab=novo` | TG10 |
| `/client/services` | → `/client/dashboard` (Meus Serviços stops being a page) | TG10 |
| `/client/services/:serviceId` | → `/client/appointments/:serviceId` | TG8/TG10 |

**New client paths** introduced by this phase:

- `/client/appointments` — Agendamentos, with `tab` (`meus` \| `novo`)
- `/client/appointments/:orderId` — appointment detail with the Andamento track
- `/client/cars/new` — replaces the relative `cars/new`
- `/client/settings` — **currently linked by the sidebar and does not exist**

⚠️ `routes.tsx:74` declares `path: 'cars/new'` — relative, no leading slash —
while `car-page.tsx:70,113` and `car-card.tsx:84` navigate to the absolute
`/cars/new`. Under the `*` catch-all in `App.tsx:40` the relative path resolves
against the parent route, so `/cars/new` does not match it. **Recorded as
reproduced by reading the route table; a runtime confirmation is part of TG10's
verification.** TG10 makes it unambiguous either way.

### Workshop

| Current | Target | Group |
| --- | --- | --- |
| `/workshop/dashboard` | kept | TG11 |
| `/workshop/services` | kept (Ordens de Serviço) | TG11 |
| `/workshop/orders` | kept | TG11 |
| `/workshop/orders/new` | kept (Criar Orçamento) | TG11 |
| `/workshop/schedules` | kept (Agendamentos) | TG11 |
| `/workshop/clients` | kept | TG11 |
| `/workshop/clients/:clientId` | kept | TG11 |
| `/workshop/clients/:clientId/orders` | kept | TG11 |
| `/workshop/ratings` | kept (Avaliações) | TG11 |
| `/workshop/services-offered` | kept | TG11 |
| `/workshop/service-history` | kept | TG11 |
| `/workshop/profile` | kept | — |
| `/workshop/messages` | kept | — |
| `/workshop/messages/chat/:clientUserId` | kept | — |
| `/workshop/:workshopId/clients` | → `/workshop/clients` | TG11 |
| *(none)* | `/workshop/settings` — linked by the sidebar, does not exist | TG5 |

`/workshop/:workshopId/clients` renders `workshop/users-page.tsx` (99 lines),
which duplicates `clients-page.tsx` and takes its workshop from the URL rather
than the session. It retires in TG11.

## 6. Menu inventory (TG5, TG11)

Both sidebars select by **exact match** (`client-sidebar.tsx:115`:
`location.pathname === item.path`), so no sub-route highlights its parent.
TG5 switches to prefix matching.

### Client — 9 items today → 6

```bash
grep -oE "path: '[^']+'" components/navigation/client-sidebar.tsx
```

| Today | Target menu item | Target path |
| --- | --- | --- |
| Dashboard | Dashboard | `/client/dashboard` |
| Meus Serviços | *retired* — progress moves to Dashboard + detail | — |
| Meu Carro | Meu Carro | `/client/my-car` |
| Novo Agendamento | Agendamentos (merged) | `/client/appointments` |
| Meus Agendamentos | Agendamentos (merged) | `/client/appointments` |
| Histórico de Manutenção | Manutenção | `/client/service-history` |
| Encontrar Oficinas | *merged into* Agendamentos | — |
| Mensagens | Mensagens | `/client/messages` |
| Configurações | Configurações | `/client/settings` **(route missing)** |

Proposed grouping, per the design's "grupos com título": Dashboard and
Agendamentos ungrouped at the top; then **MEU VEÍCULO** (Meu Carro, Manutenção);
then **CONTA** (Mensagens, Configurações).

### Workshop — 10 items today → 6

| Today | Target menu item |
| --- | --- |
| Dashboard | Dashboard |
| Ordens de Serviço, Criar Orçamento | Ordens de Serviço |
| Agendamentos | Agendamentos |
| Clientes Oficina | Clientes |
| Mensagens | Mensagens |
| Serviços Oferecidos, Avaliações, Histórico de Manutenção, Configurações | Mais (grouped) |

The workshop grouping is **provisional and still 10 items** — see
[implemented-tg1-tg5.md](implemented-tg1-tg5.md). TG5 regrouped them into three
sections but kept one entry per existing page, because the design draws no
workshop screen and collapsing to 6 would have made four real pages unreachable.
TG11 finalises the grouping.

## 7. Re-check

```bash
cd apps/web/src
grep -rl "@mui/material\|@mui/icons-material" . | wc -l   # → 0 at TG12
grep -ro "sx={" . | wc -l                                  # → 0 at TG12
grep -rn "STATUS_CONFIG\|STATUS_LABELS" .                  # → empty at TG4
grep -rn "0E71AE\|Outfit" . ../index.html                  # → empty at TG1 ✅
```

TG1 is already complete: the last line returns nothing.
