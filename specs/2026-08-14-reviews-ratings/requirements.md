# Requirements: Reviews & Ratings (Client → Workshop)

Last Updated: 2026-08-14
Branch: feature/2026-08-14-reviews-ratings
Status: Planned

Context: Turns roadmap Phase 3 (Reviews & Ratings) into executable requirements,
reconciled with the current codebase. The roadmap's Phase 3 text predates the
scheduling feature; the `workshop_ratings` table it anticipated now exists
(schema-only, from `specs/2026-07-22-agendamento-servicos`) and is the target of
this delivery. The roadmap's order-anchored model ("review only after PAID") is
deferred: `PAID` does not exist (payment phase), so ratings anchor to **accepted
schedules** (`aceito`). Follows the multi-tenancy foundation
(`specs/2026-05-30-multi-tenancy-foundation`) and the four-layer backend
architecture documented in `CLAUDE.md`.

## 1. Scope

### In Scope

- Rating write path: CLIENT creates one rating (0–5 stars + optional comment) per
  **accepted** schedule (`aceito`), stored in the existing `workshop_ratings`
  table. No schema change.
- Author CRUD: the authoring client can update or delete their own rating.
- `Workshop.rating_avg` recomputed (AVG over that workshop's ratings) after every
  create/update/delete; `0.0` when the workshop has no ratings.
- Read endpoints: the client's own ratings, a workshop's public ratings (for the
  workshop detail page), and the workshop-side list of received ratings.
- Notification to the workshop's user when a new rating arrives (reuse the
  `notifications` table, `schedule_id` link).
- Frontend: rating form on My Schedules (accepted rows), reviews list + live
  average on the workshop detail page, average stars on workshop cards/search
  results (already rendered read-only — becomes live), and a workshop-side
  "Avaliações" page.
- Backend lifecycle test slice, frontend type check, greenfield Vitest slice,
  `CHANGELOG.md` entry, and roadmap Phase 3 status update.

### Out of Scope

- Ratings anchored to service orders (`services` table) — deferred until payments
  exist (roadmap's PAID gate).
- Rating submission for any schedule status other than `aceito`.
- Workshop replies to ratings, moderation, or admin tools.
- Rating writes by the WORKSHOP role (read-only for workshops).
- Schema/migration changes (the existing table already satisfies this phase).
- Real-time (WebSocket) delivery of ratings.

## 2. Functional Requirements by Phase

### Phase 1 — Backend foundations (TG1)

- `src/schemas/workshop_rating.py`:
  - `WorkshopRatingCreate` — `schedule_id` (int), `rating` (int, `ge=0, le=5`),
    `comment` (optional str).
  - `WorkshopRatingUpdate` — `rating` (int, `ge=0, le=5`), `comment` (optional
    str).
  - `WorkshopRatingRead` — `id`, `schedule_id`, `workshop_tenant_id`,
    `client_tenant_id`, `rating`, `comment`, `created_at`
    (`model_config = ConfigDict(from_attributes=True)`).
- `src/repositories/workshop_rating.py` — `repo_*` free functions, commit/refresh
  in the repo (never in the service): `repo_create_rating`, `repo_get_rating_by_id`
  (tenant-scoped), `repo_list_ratings_for_workshop_tenant`,
  `repo_list_ratings_for_client_tenant`, `repo_update_rating`, `repo_delete_rating`,
  `repo_average_for_workshop_tenant`. Every function requires an explicit tenant id
  and raises when it is missing (mirror the schedules repository contract).
- `src/services/workshop_rating.py` — `WorkshopRatingService(db)` enforcing:
  - create: the schedule must belong to the caller's client tenant and be `aceito`;
    duplicate rating for the same schedule is rejected (explicit check +
    `uq_workshop_ratings_schedule_id`); both tenant ids are copied from the
    schedule; recompute `Workshop.rating_avg`.
  - update/delete: only the authoring client tenant.
  - role guard: WORKSHOP writes are rejected.
- Test slice `apps/backend/tests/test_workshop_rating_lifecycle.py` (cases in
  `validation.md`).

### Phase 2 — API routes + notifications (TG2)

- `src/api/routes/workshop_ratings.py`, registered in `src/routers.py`
  (`prefix="/workshop-ratings"`, `tags=["workshop-ratings"]`):
  - `POST /workshop-ratings` — CLIENT; creates the rating; `201` with
    `WorkshopRatingRead`.
  - `GET /workshop-ratings/mine` — CLIENT; own ratings (`client_tenant_id == me`),
    `skip`/`limit`, newest first.
  - `GET /workshop-ratings?workshop_id=N&skip=&limit=` — any authenticated role;
    ratings for a workshop, resolved via the workshop's tenant.
  - `GET /workshop-ratings/me` — WORKSHOP; ratings received by the caller's
    workshop (`workshop_tenant_id == me`).
  - `GET /workshop-ratings/{id}` — either owning tenant (client or workshop side).
  - `PUT /workshop-ratings/{id}` — CLIENT, own only; recompute avg.
  - `DELETE /workshop-ratings/{id}` — CLIENT, own only; `204`; recompute avg.
  - Static paths (`/mine`, `/me`) are registered before `/{id}`.
- Role gating inline (mirror `_require_role` in `schedules.py` routes): wrong role
  → `403`; `ValueError` → `400`; not found → `404`.
- On create, persist a notification for the workshop's user (mirror
  `create_schedule_status_notification` in `src/services/notifications.py`, resolve
  the workshop user via `repo_find_user_by_tenant_and_role`) with a Portuguese
  label (e.g. "Nova avaliação recebida") and `schedule_id` set. Update/delete do
  not notify.

### Phase 3 — Client frontend (TG3)

- `apps/web/src/services/workshop-rating-service.tsx` — typed module on `api.tsx`,
  no `any`: a `WorkshopRating` interface and `createWorkshopRating`,
  `getMyRatings`, `getWorkshopRatings(workshopId)`, `getWorkshopRating`,
  `updateWorkshopRating`, `deleteWorkshopRating` (query building via
  `URLSearchParams`, `err instanceof Error` narrowing like `schedule-service.tsx`).
- `my-schedules-page.tsx`: `aceito` rows get an "Avaliar" action that opens a modal
  (0–5 star picker + optional comment → `POST /workshop-ratings`); if the client
  already rated that schedule, show edit (`PUT`) and remove (`DELETE`) instead.
- `workshop-page.tsx`: reviews list from `GET /workshop-ratings?workshop_id=` +
  the live average from the detail response's `rating_avg`; remove the hardcoded
  mock `rating_avg` fallback (6.8 sample) so the page consumes the API value.
- `workshop-card.tsx` / search results: no structural change — the already-rendered
  `rating_avg` becomes live via recompute.
- UI copy in Portuguese (the app's language).

### Phase 4 — Workshop frontend (TG4)

- New `apps/web/src/pages/workshop/ratings-page.tsx`: table of received ratings
  (date, stars, comment, related schedule) from `GET /workshop-ratings/me`, with
  loading/error/empty states (mirror `schedules-page.tsx`).
- Workshop sidebar entry "Avaliações" → `/workshop/ratings`
  (`workshop-sidebar.tsx`).
- Route registration in `apps/web/src/routes/routes.tsx` (ProtectedRoute,
  `requiredRole` WORKSHOP).

### Phase 5 — Gates (TG5)

- Full backend pytest suite green.
- `npm run check` green; Vitest slice green (see `validation.md`).
- Root `CHANGELOG.md` gains a dated `## 2026-08-14` entry; roadmap Phase 3 marked
  with its completion date.
- Run `validation.md` end to end; push.

## 3. Cross-Cutting Requirements

### 3.1 Dual-tenant isolation (critical)

- Every `repo_*` for `workshop_ratings` filters on the correct tenant column:
  `client_tenant_id` for CLIENT reads/writes, `workshop_tenant_id` for WORKSHOP
  reads.
- A rating is only ever visible to its two owning tenants; a request scoped to any
  other tenant returns empty/`None` (never leaks).
- No `repo_*` may run a ratings query without a tenant id.

### 3.2 Role matrix

- CLIENT: create/update/delete own ratings; list own (`/mine`); list a workshop's
  public ratings (`?workshop_id=`).
- WORKSHOP: list received (`/me`); read single ratings addressed to its workshop;
  cannot write.
- Any cross-role write → `403`.

### 3.3 One rating per accepted schedule

- Enforced by the existing `uq_workshop_ratings_schedule_id` constraint plus an
  explicit service-level check; duplicate attempts return `400`.

## 4. Technical Decisions

1. **Reuse `workshop_ratings` as-is** — no migration. The scheduling phase
   delivered exactly the columns this phase needs (both tenant FKs, unique
   `schedule_id`, 0–5 check, `comment`); a new `reviews` table would duplicate it.
2. **Anchor: accepted schedules** — the roadmap's order-anchored, PAID-gated model
   is deferred until payments exist. `aceito` is the terminal acceptance state of
   the schedule lifecycle, and the table was built for it.
3. **0–5 scale kept** — matches the table's
   `CheckConstraint(rating BETWEEN 0 AND 5)` and the current read-only star UI;
   the roadmap's 1–5 is overridden.
4. **Author CRUD** — the client can fix or retract a rating; every write
   recomputes `rating_avg`.
5. **Route naming `/workshop-ratings`** — matches the table/domain name, not the
   roadmap's `/reviews` (same convention call the scheduling spec made for
   `/schedules`).
6. **Average recompute** — SQL AVG over `workshop_tenant_id` after each write;
   `0.0` when empty. No stored count column.
7. **No migration** — verify `workshop_ratings` exists at alembic head (created by
   `db89f1a0944a`); this phase adds no revision.
8. **Notifications reuse** — mirror the existing schedule-status notification
   pattern; notify only on create, not on update/delete.

## 5. Success Definition

Ready for merge when:

- a client can rate an accepted schedule once, and edit or remove that rating;
- `Workshop.rating_avg` recomputes correctly on every write;
- the workshop detail page shows the reviews list + live average, and cards/search
  reflect the same value;
- the workshop sees received ratings on a dedicated page and is notified of new
  ones;
- invalid transitions, duplicate ratings, and cross-role/cross-tenant actions are
  rejected;
- backend lifecycle tests pass, `npm run check` passes, and the Vitest slice
  passes;
- `CHANGELOG.md` is updated, roadmap Phase 3 status is updated, and the
  `validation.md` gates pass with the user having reviewed the result.
