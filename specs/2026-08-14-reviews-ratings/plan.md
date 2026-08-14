# Plan: Reviews & Ratings (Client → Workshop)

Last Updated: 2026-08-14
Branch: feature/2026-08-14-reviews-ratings
Status: Planned

Feature Context: After a workshop accepts a schedule, the client can rate the
workshop (0–5 stars + optional comment). Ratings appear on the workshop's public
page, feed the workshop's average rating, and are visible to the workshop on a
dedicated page. Source: roadmap Phase 3
(`specs/roadmap.md`), reconciled with the codebase below.

## Reconciliation with the codebase (why this plan differs from the roadmap brief)

- Roadmap Phase 3 anchors reviews to service orders and gates on `PAID`; `PAID`
  does not exist (deferred to the payment phase). This plan anchors ratings to
  **accepted schedules** (`aceito`) — the client-initiated flow delivered by the
  scheduling feature.
- The `workshop_ratings` table already exists (schema-only) with
  `uq_workshop_ratings_schedule_id`, `ck_workshop_ratings_rating_range` (0–5), and
  both tenant FKs. **No migration is needed**; the roadmap's new Review
  model/table is replaced by this existing table.
- The rating scale stays **0–5** (existing constraint + current star UI); the
  roadmap's 1–5 is overridden.
- `Workshop.rating_avg` already exists and is displayed read-only on cards and the
  workshop detail page; this phase makes it live.

## Confirmed decisions (user)

1. Anchor = accepted schedules; reuse `workshop_ratings` unchanged.
2. Scale 0–5 (keep the existing constraint).
3. Author CRUD: CLIENT creates/updates/deletes own ratings; `rating_avg`
   recomputed on every write; workshops can never write.
4. Gate: schedule `aceito` only (no date-in-past requirement).
5. Full UI set: My Schedules form, workshop detail reviews + avg, cards/search
   live avg, workshop "Avaliações" page.
6. Specs in English; feature name `reviews-ratings`.

## Reference implementation to mirror

- Model (exists, no changes): `apps/backend/src/models/workshop_rating.py`
- Schema template: `apps/backend/src/schemas/schedules.py`
- Repository template (tenant-scoped `repo_*`, commit/refresh in repo):
  `apps/backend/src/repositories/schedules.py`
- Service template (class `__init__(self, db)`, `ValueError` for invalid state):
  `apps/backend/src/services/schedules.py`
- Route template (`Depends(get_current_user)`, `_require_role`, inline 403):
  `apps/backend/src/api/routes/schedules.py`
- Registration: `apps/backend/src/routers.py`
- Notification helper: `create_schedule_status_notification` in
  `apps/backend/src/services/notifications.py`; workshop-user resolution via
  `repo_find_user_by_tenant_and_role` (already used in the schedules routes)
- Test template: `apps/backend/tests/test_schedule_lifecycle.py`
- Frontend service template: `apps/web/src/services/schedule-service.tsx`
- Client pages to extend: `apps/web/src/pages/client/my-schedules-page.tsx`,
  `apps/web/src/pages/client/workshop-page.tsx`
- Workshop page template: `apps/web/src/pages/workshop/schedules-page.tsx`
- Sidebars: `apps/web/src/components/navigation/{client,workshop}-sidebar.tsx`
- Routes: `apps/web/src/routes/routes.tsx`

---

## Task Groups

### TG1 — Backend foundations (schemas + repository + service + tests)

Status: Planned

1. Create `apps/backend/src/schemas/workshop_rating.py`:
   `WorkshopRatingCreate` (`schedule_id` int; `rating` int with `ge=0, le=5`;
   `comment` optional str), `WorkshopRatingUpdate`, and `WorkshopRatingRead` with
   `model_config = ConfigDict(from_attributes=True)` (match repo style).
2. Create `apps/backend/src/repositories/workshop_rating.py`:
   `repo_create_rating`, `repo_get_rating_by_id` (tenant-scoped),
   `repo_list_ratings_for_workshop_tenant`, `repo_list_ratings_for_client_tenant`,
   `repo_update_rating`, `repo_delete_rating`,
   `repo_average_for_workshop_tenant`. All take an explicit tenant id; missing →
   raise. Commit/refresh inside the repo.
3. Create `apps/backend/src/services/workshop_rating.py`:
   `WorkshopRatingService(db)` enforcing the `aceito` gate, caller ownership of
   the schedule, duplicate-per-schedule rejection, author-only update/delete, and
   `rating_avg` recompute (`0.0` when empty; update `Workshop.rating_avg` via the
   workshop repository).
4. Create `apps/backend/tests/test_workshop_rating_lifecycle.py` mirroring
   `test_schedule_lifecycle.py` (SQLite in-memory, `Base.metadata.create_all`,
   `PRAGMA foreign_keys=ON`, seed tenants → users (CLIENT + WORKSHOP) → workshop →
   schedules; direct service/repo calls). Cases enumerated in `validation.md` §V1.

**Verification:** `cd apps/backend && uv run pytest tests/test_workshop_rating_lifecycle.py -q`

**Commit:** `feat: rating schemas, repository, service, and lifecycle tests (Phase 3 reviews)` → push.

### TG2 — API routes + notifications

Status: Planned

1. Create `apps/backend/src/api/routes/workshop_ratings.py` with the seven
   endpoints from `requirements.md` §2 Phase 2:
   - `POST /workshop-ratings` (CLIENT)
   - `GET /workshop-ratings/mine` (CLIENT)
   - `GET /workshop-ratings?workshop_id=N&skip=&limit=` (any authenticated role)
   - `GET /workshop-ratings/me` (WORKSHOP)
   - `GET /workshop-ratings/{id}` (either owning tenant)
   - `PUT /workshop-ratings/{id}` (CLIENT, own)
   - `DELETE /workshop-ratings/{id}` (CLIENT, own)
   Static paths (`/mine`, `/me`) registered before `/{id}`; `_require_role`
   gating; `ValueError → 400`; 404 on missing.
2. Register in `apps/backend/src/routers.py`:
   `api_router.include_router(workshop_ratings, prefix="/workshop-ratings",
   tags=["workshop-ratings"])`.
3. On create, persist a notification for the workshop's user (mirror
   `create_schedule_status_notification`, PT label, `schedule_id` set).

**Verification:** `cd apps/backend && uv run pytest -q` (new slice + no regressions)

**Commit:** `feat: workshop-ratings API routes + workshop notification on new rating (Phase 3 reviews)` → push.

### TG3 — Client frontend (service + form + detail + cards)

Status: Planned

1. Create `apps/web/src/services/workshop-rating-service.tsx` (typed, no `any`):
   `WorkshopRating` interface and `createWorkshopRating`, `getMyRatings`,
   `getWorkshopRatings(workshopId)`, `getWorkshopRating`, `updateWorkshopRating`,
   `deleteWorkshopRating` — `URLSearchParams` + `api.tsx` like
   `schedule-service.tsx`.
2. Extend `apps/web/src/pages/client/my-schedules-page.tsx`: `aceito` rows get an
   "Avaliar" action opening a modal (0–5 star picker, optional comment) →
   `POST /workshop-ratings`; when the client already rated the schedule (from
   `getMyRatings`), show edit (`PUT`) and remove (`DELETE`) instead.
3. Extend `apps/web/src/pages/client/workshop-page.tsx`: reviews list from
   `GET /workshop-ratings?workshop_id=` (stars + comment + date) plus the live
   average from the detail's `rating_avg`; remove the hardcoded mock `rating_avg`
   fallback (6.8 sample) so the page consumes the API value.
4. `workshop-card.tsx` / search cards: no structural change — the
   already-rendered `rating_avg` becomes live via recompute.

**Verification:** `cd apps/web && npm run check`

**Commit:** `feat: client rating UI — form on My Schedules, reviews on workshop detail (Phase 3 reviews)` → push.

### TG4 — Workshop frontend (received ratings page)

Status: Planned

1. Create `apps/web/src/pages/workshop/ratings-page.tsx` (mirror the
   `schedules-page.tsx` table pattern): date, stars, comment, related schedule;
   data from `GET /workshop-ratings/me`; loading/error/empty states.
2. Add "Avaliações" to `apps/web/src/components/navigation/workshop-sidebar.tsx`
   → `/workshop/ratings`.
3. Register the route in `apps/web/src/routes/routes.tsx` (ProtectedRoute,
   `requiredRole` WORKSHOP).

**Verification:** `cd apps/web && npm run check`

**Commit:** `feat: workshop ratings page + sidebar entry (Phase 3 reviews)` → push.

### TG5 — Gates: tests, changelog, validation

Status: Planned

1. Vitest slice: `workshop-rating-service` query building + rating-modal
   validation (0–5 range required, comment optional) — extend the Vitest setup
   introduced by the scheduling feature.
2. Run the full backend suite, `npm run check`, and Vitest.
3. Confirm no migration is needed: `uv run alembic upgrade head` applies clean;
   `workshop_ratings` exists (created by `db89f1a0944a`).
4. Execute `validation.md` (including the manual QA script).
5. Update root `CHANGELOG.md` (dated `## 2026-08-14`, newest first) and mark
   roadmap Phase 3 with its completion date.

**Verification:** all gates green per `validation.md`

**Commit:** `test: rating Vitest slice + changelog and roadmap status (Phase 3 reviews)` → push.

---

## Suggested implementation order

TG1 → TG2 → TG3 → TG4 → TG5. TG1–TG2 are backend-only; TG3/TG4 consume them.
Each task group ends in its own commit and push (per the repo's delivery rule).
