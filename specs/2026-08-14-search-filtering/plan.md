# Plan: Search & Filtering (Client Discovery)

Last Updated: 2026-08-14
Branch: feature/2026-08-14-search-filtering
Status: Planned

Feature Context: Clients discover app workshops by rating, service type, and
location. Source: roadmap Phase 4 (`specs/roadmap.md`), reconciled with the
codebase below. A workshop declares the service types it offers (new
`workshop_services` catalog); the extended `GET /workshops/` filters and sorts by
rating, service type, and Haversine distance; the client search page is rebuilt
on the backend API with a filter sidebar, card list, and Leaflet map.

## Reconciliation with the codebase (why this plan differs from the roadmap brief)

- Roadmap's `/workshops/search` route already exists in spirit: `GET /workshops/`
  serves name + location + `skip`/`limit`. It is extended in place instead of
  adding a duplicate route.
- Roadmap's `services={id,id}` filter assumed a Service catalog; the `services`
  table holds service orders and no catalog exists. A new `workshop_services`
  table is added, using the 4-value schedule request-type taxonomy
  (`manutencao`, `reparo`, `inspecao`, `outro`).
- Roadmap's "only active workshops returned" test is dropped: `Workshop` has no
  `is_active` flag (user-confirmed defer).
- The current location filter is a bounding-box approximation, and the response
  has no distance. This phase adds exact Haversine distance + `distance_km`.
- The frontend search page (`search-workshops-page.tsx`) queries OpenStreetMap's
  Overpass API and never calls the backend. It is rebuilt on `GET /workshops/`;
  the Overpass query is removed.
- `rating_avg` is already live (reviews phase), so `min_rating` is a simple
  predicate; `ratings_count` comes from the existing `workshop_ratings` table
  via the workshop's tenant.

## Confirmed decisions (user)

1. Feature name `search-filtering`; branch `feature/2026-08-14-search-filtering`;
   specs in English.
2. Service filter anchors to a new `workshop_services` catalog (4 schedule
   request types), managed by the workshop on a dedicated page.
3. Client search page rebuilt on the backend API; Overpass removed; layout =
   filter sidebar + card list + Leaflet map.
4. No `is_active` flag this phase.
5. Catalog UI: new workshop sidebar page "Serviços Oferecidos".

## Reference implementation to mirror

- Model template: `apps/backend/src/models/workshop_rating.py`,
  `apps/backend/src/models/schedule.py` (index/uniqueness style)
- Migration: autogenerate via `make migrations msg="..."` (see CLAUDE.md)
- Schema template: `apps/backend/src/schemas/workshop_rating.py` +
  `ServiceRequestType` in `apps/backend/src/schemas/schedules.py`
- Repository template (tenant-scoped `repo_*`, commit/refresh in repo):
  `apps/backend/src/repositories/workshop_rating.py`
- Service template (class `__init__(self, db)`, `ValueError` for invalid state):
  `apps/backend/src/services/workshop_rating.py`
- Route template (`Depends(get_current_user)`, `_require_role`, inline 403):
  `apps/backend/src/api/routes/schedules.py`
- Search repository to extend: `repo_search_workshops` in
  `apps/backend/src/repositories/workshop.py`; util convention:
  `apps/backend/src/utils/services_history.py`
- Registration: `apps/backend/src/routers.py`
- Test template: `apps/backend/tests/test_workshop_rating_lifecycle.py`
- Frontend service template: `apps/web/src/services/workshop-rating-service.tsx`;
  module to extend: `apps/web/src/services/workshop-service.tsx`
- Client page to rebuild: `apps/web/src/pages/client/search-workshops-page.tsx`
  (keep Leaflet setup and geolocation)
- Card to extend: `apps/web/src/components/workshops/workshop-card.tsx`
- Workshop page template: `apps/web/src/pages/workshop/ratings-page.tsx`
- Sidebar: `apps/web/src/components/navigation/workshop-sidebar.tsx`
- Routes: `apps/web/src/routes/routes.tsx`

---

## Task Groups

### TG1 — Backend catalog (model + migration + schemas + repo + service + routes + tests)

Status: Planned

1. Create `apps/backend/src/models/workshop_service.py` — `WorkshopService`:
   table `workshop_services`; `id` int PK; `workshop_id` FK → `workshops.id`
   (CASCADE); `tenant_id` FK → `tenants.id` (not null, index); `service_type`
   String(20) not null; `UniqueConstraint("workshop_id", "service_type")` +
   composite index `("tenant_id", "id")`. Register in
   `apps/backend/src/models/__init__.py`.
2. Generate the migration: `make migrations msg="add workshop_services catalog"`;
   review it manually (unique constraint + FK + index present).
3. Create `apps/backend/src/schemas/workshop_service.py`: `WorkshopServiceRead`
   (`id`, `workshop_id`, `service_type`, `from_attributes`),
   `WorkshopServicesUpdate` (`service_types: list[ServiceRequestType]` imported
   from `src/schemas/schedules.py`).
4. Create `apps/backend/src/repositories/workshop_service.py`:
   `repo_list_workshop_services(db, tenant_id, workshop_id)` and
   `repo_replace_workshop_services(db, tenant_id, workshop_id, service_types)`
   (delete-then-insert in one transaction; commit/refresh in the repo). Both
   require an explicit tenant id; missing → raise.
5. Create `apps/backend/src/services/workshop_service.py`:
   `WorkshopServiceService(db)` resolving the caller's workshop via the
   tenant-scoped workshop repository (`repo_get_workshop_for_user`); `ValueError`
   when missing.
6. Create `apps/backend/src/api/routes/workshop_services.py`:
   `GET /workshop-services/me` (WORKSHOP) and `PUT /workshop-services/me`
   (WORKSHOP, bulk-replace, `200` + resulting list); `_require_role` gating;
   `ValueError → 404`.
7. Register in `apps/backend/src/routers.py`:
   `api_router.include_router(workshop_services, prefix="/workshop-services",
   tags=["workshop-services"])`.
8. Create `apps/backend/tests/test_workshop_catalog_lifecycle.py` (SQLite
   in-memory, `Base.metadata.create_all`, direct service/repo calls; mirror
   `test_workshop_rating_lifecycle.py`). Cases in `validation.md` §V1.

**Verification:** `cd apps/backend && uv run pytest tests/test_workshop_catalog_lifecycle.py -q`

**Commit:** `feat: workshop_services catalog — model, migration, and bulk-replace CRUD (Phase 4 search)` → push.

### TG2 — Backend search (Haversine + search-item schema + filters/sort + tests)

Status: Planned

1. Create `apps/backend/src/utils/workshops.py` with
   `haversine_km(lat1, lon1, lat2, lon2) -> float` (radius 6371.0).
2. Add `WorkshopSearchItem` to `apps/backend/src/schemas/workshop.py`: public
   fields only — `id`, `name`, `description`, `latitude`, `longitude`,
   `rating_avg`, `phone`, `address`, `city`, `state`, `logo_url`,
   `distance_km: float | None`, `service_types: list[str]`,
   `ratings_count: int`. No `tenant_id`/`user_id`/`email`/opening fields.
3. Extend `repo_search_workshops` in
   `apps/backend/src/repositories/workshop.py`:
   - `min_rating` predicate on `Workshop.rating_avg`;
   - `service_types` join on `workshop_services` (OR semantics; only valid enum
     values reach the repo — the route validates);
   - `ratings_count` correlated subquery over `workshop_ratings`
     (`workshop_tenant_id == Workshop.tenant_id`);
   - `service_types` list per workshop (catalog rows);
   - bbox prefilter (existing) + `haversine_km` per row when `lat`/`lng` given;
   - sort: `distance` asc / `rating_avg` desc / `ratings_count` desc; default
     distance with coords, rating without; sorting applied before
     `skip`/`limit`; return `list[WorkshopSearchItem]`.
4. Update `WorkshopService.search_workshops` (passthrough) and the
   `GET /workshops/` route in `apps/backend/src/api/routes/workshops.py`:
   new Query params `min_rating` (`ge=0, le=5`), `service_types` (CSV, validated
   against `ServiceRequestType` → invalid = `400`), `sort` (Literal
   `distance|rating|reviews`; `distance` without `lat`/`lng` → `400`),
   `radius_km` (`ge=0, le=100`); `response_model=list[WorkshopSearchItem]`.
5. Create `apps/backend/tests/test_workshop_search.py` (SQLite in-memory): cases
   in `validation.md` §V2.

**Verification:** `cd apps/backend && uv run pytest tests/test_workshop_search.py -q` plus the catalog slice and full suite.

**Commit:** `feat: workshop search filters — min rating, service types, sorting, Haversine distance (Phase 4 search)` → push.

### TG3 — Client search UI (service + page rebuild + card + filter panel + pagination)

Status: Planned

1. Update `apps/web/src/services/workshop-service.tsx`: `WorkshopSearchItem`
   interface and `searchWorkshops` params (`name`, `lat`, `lng`, `radiusKm`,
   `minRating`, `serviceTypes`, `sort`, `skip`, `limit`) via `URLSearchParams`;
   no `any`.
2. Create `apps/web/src/pages/client/search-filter-panel.tsx` (beside the page):
   radius input, min-rating selector (0–5), service-type checkboxes (4 types, PT
   labels), sort select (distância / avaliação / nº de avaliações). Emits the
   current filter state to the page.
3. Rebuild `apps/web/src/pages/client/search-workshops-page.tsx`:
   - keep geolocation to seed `lat`/`lng`; on denial → search without location
     (sort falls back to rating);
   - layout: filter panel (left) + `WorkshopCard` list (center) + Leaflet map
     (right) with pins from the same backend response;
   - pagination: prev/next + "showing X of …" using `skip`/`limit`;
   - loading/error/empty states; PT copy;
   - delete the Overpass/OpenStreetMap query.
4. Extend `apps/web/src/components/workshops/workshop-card.tsx`: `distance_km`,
   `service_types` chips, `ratings_count`, `city`/`address`, `onClick` →
   workshop detail page; keep the existing visual language (stars, header).

**Verification:** `cd apps/web && npm run check`

**Commit:** `feat: client search rebuild — filters, card list, map on the backend API (Phase 4 search)` → push.

### TG4 — Workshop catalog page (services offered)

Status: Planned

1. Extend `apps/web/src/services/workshop-service.tsx` with
   `getMyWorkshopServices` and `updateMyWorkshopServices` (typed, no `any`).
2. Create `apps/web/src/pages/workshop/services-offered-page.tsx` (mirror
   `ratings-page.tsx` patterns): checkbox list of the 4 service types with PT
   labels, loads `GET /workshop-services/me`, saves via
   `PUT /workshop-services/me`; loading/error/success states.
3. Add "Serviços Oferecidos" to
   `apps/web/src/components/navigation/workshop-sidebar.tsx` →
   `/workshop/services-offered`.
4. Register the route in `apps/web/src/routes/routes.tsx` (ProtectedRoute,
   `requiredRole` WORKSHOP).

**Verification:** `cd apps/web && npm run check`

**Commit:** `feat: workshop services-offered page + sidebar entry (Phase 4 search)` → push.

### TG5 — Gates: tests, changelog, validation

Status: Planned

1. Vitest slice: `workshop-service` search query-string building (filters/sort
   encoded correctly; `serviceTypes` CSV) + catalog update payload — extend the
   Vitest setup introduced by the scheduling/reviews phases.
2. Run the full backend suite, `npm run check`, and Vitest.
3. Confirm the migration: `uv run alembic upgrade head` applies clean;
   `workshop_services` exists with `uq`/FKs.
4. Execute `validation.md` (including the manual QA script).
5. Update root `CHANGELOG.md` (dated `## 2026-08-14`, newest first) and mark
   roadmap Phase 4 with its completion date.

**Verification:** all gates green per `validation.md`

**Commit:** `test: search Vitest slice + changelog and roadmap status (Phase 4 search)` → push.

---

## Suggested implementation order

TG1 → TG2 → TG3 → TG4 → TG5. TG1–TG2 are backend-only; TG3/TG4 consume them.
Each task group ends in its own commit and push (per the repo's delivery rule).
