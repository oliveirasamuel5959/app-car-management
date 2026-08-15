# Validation: Search & Filtering (Client Discovery)

Last Updated: 2026-08-14
Branch: feature/2026-08-14-search-filtering
Status: Planned

Purpose: Define the evidence required to confirm the search & filtering feature is
correct, tenant-safe, and ready to merge, and enumerate the tests to write and run
for backend and frontend. References `requirements.md` and the task groups of
`plan.md`.

## V1 — Backend catalog (TG1)

- [ ] **1.1** `src/models/workshop_service.py` exists with table
  `workshop_services`, unique `(workshop_id, service_type)`, FK → `workshops`
  (CASCADE), FK → `tenants`, composite index `(tenant_id, id)`.
- [ ] **1.2** Alembic migration applies clean at head:
  ```bash
  cd apps/backend && uv run alembic upgrade head
  ```
- [ ] **1.3** `src/repositories/workshop_service.py` exists; both `repo_*`
  require an explicit tenant id and raise when missing.
- [ ] **1.4** `src/services/workshop_service.py` resolves the caller's workshop
  tenant-scoped; missing workshop → `ValueError`.
- [ ] **1.5** Routes exist: `GET /workshop-services/me` and
  `PUT /workshop-services/me` (WORKSHOP only, 403 otherwise), registered in
  `src/routers.py`.
- [ ] **1.6** Tests pass:
  ```bash
  cd apps/backend && uv run pytest tests/test_workshop_catalog_lifecycle.py -q
  ```

Cases covered by the test slice (mirror `test_workshop_rating_lifecycle.py`:
SQLite in-memory, direct service/repo calls):
1. Replace with `[manutencao, reparo]` → exactly 2 rows persisted.
2. Replace again with `[inspecao]` → old rows removed, exactly 1 row remains
   (bulk-replace semantics).
3. Duplicate values in the payload → single row per type (unique pair holds).
4. Catalog rows of tenant A are invisible to tenant B (`repo_list` with the
   wrong tenant returns `[]`).
5. `repo_*` called without a tenant id raises.
6. Invalid service type in the payload → Pydantic `ValidationError`.

## V2 — Backend search (TG2)

- [ ] **2.1** `src/utils/workshops.py` has `haversine_km`; the known pair
  (0°N 0°E) → (0°N 1°E) yields ≈ 111.19 km (unit test asserts within ±0.5 km).
- [ ] **2.2** `GET /workshops/` accepts `min_rating`, `service_types`, `sort`,
  `radius_km` and returns `list[WorkshopSearchItem]` (no `tenant_id`,
  `user_id`, `email`, or opening-hours fields in the response).
- [ ] **2.3** `min_rating=4` returns only workshops with `rating_avg >= 4`.
- [ ] **2.4** `service_types=manutencao,reparo` returns workshops offering any of
  the two (OR semantics); a workshop offering none is excluded; unknown value →
  `400`.
- [ ] **2.5** `sort=rating` orders by `rating_avg` desc; `sort=reviews` by
  `ratings_count` desc; `sort=distance` asc — and `sort=distance` without
  `lat`/`lng` → `400`.
- [ ] **2.6** With `lat`/`lng`, every item has `distance_km` and results are
  within the requested `radius_km` (Haversine, not the bbox); without coords,
  `distance_km` is `None`.
- [ ] **2.7** `ratings_count` matches the workshop's `workshop_ratings` row count
  (including 0); `service_types` lists the catalog values.
- [ ] **2.8** `skip`/`limit` pagination honored after sorting.
- [ ] **2.9** Full backend suite green:
  ```bash
  cd apps/backend && uv run pytest -q
  ```

## V3 — Client search UI (TG3)

- [ ] **3.1** Type safety (mandatory):
  ```bash
  cd apps/web && npm run check
  ```
  Expected: no TypeScript errors across the new service module, pages, and
  components; no use of `any`.
- [ ] **3.2** Vitest slice: `searchWorkshops` builds the correct query string
  (filters, CSV `serviceTypes`, `sort`, `skip`/`limit`); catalog update payload
  shape matches `PUT /workshop-services/me`.
- [ ] **3.3** No Overpass/OpenStreetMap call remains in
  `search-workshops-page.tsx` (grep for `overpass` returns nothing).
- [ ] **3.4** Manual QA script:
  1. As a workshop user, open "Serviços Oferecidos", check Manutenção + Reparo,
     save; reload → still checked.
  2. As a client with geolocation allowed, open the search page → map centered on
     the user; the list shows app workshops (not OSM shops) with distance.
  3. Set min rating to 4 → only workshops ≥ 4.0 remain; the map pins match the
     list.
  4. Check "Manutenção" → only workshops offering it; check "Reparo" too → union
     (more or equal results).
  5. Switch sort between distância / avaliação / nº de avaliações → order changes
     accordingly.
  6. Pagination prev/next works and the "showing X of …" counter updates.
  7. Click a card → the workshop detail page opens.
  8. Deny geolocation (or clear it) → the page still lists workshops without a
     distance column.
  9. As a second workshop tenant, open "Serviços Oferecidos" → only its own
     catalog is shown (never another tenant's).

## V4 — Migration & no-regression gates (TG5)

- [ ] **4.1** `alembic upgrade head` applies clean; `workshop_services` exists
  with `workshop_id` FK and unique pair constraint:
  ```bash
  cd apps/backend && uv run alembic upgrade head
  ```
- [ ] **4.2** Backend: tenant-isolation, schedule-lifecycle, and rating-lifecycle
  suites remain green (no prior-phase regression).
- [ ] **4.3** Frontend Vitest suite green:
  ```bash
  cd apps/web && npx vitest run
  ```

## V5 — Merge gate

Merge-ready only when all are true:

- the catalog and search backend slices pass and the full backend suite is green;
- `alembic upgrade head` applies clean with the new `workshop_services`
  revision;
- `npm run check` passes and the Vitest slice passes;
- the manual QA script (V3.4) completes end to end;
- no tenant-isolation regression: catalog writes are tenant-scoped and
  `WorkshopSearchItem` leaks no tenant/owner identifiers;
- root `CHANGELOG.md` has a dated `## 2026-08-14` entry and roadmap Phase 4
  status is updated;
- the user has reviewed the result.

## V6 — Non-goals (not validated here)

- `is_active` workshops / "only active workshops" filtering (user-confirmed
  defer).
- PostGIS / Elasticsearch / saved searches.
- Offered services on the workshop detail page (`workshop-page.tsx`).
- A separate `/workshops/search` route.

---

## Summary

| Verification | Description | Result |
|--------------|-------------|--------|
| V1 | Backend catalog (model, migration, repo, service, routes, tests) | ✅ / ❌ |
| V2 | Backend search (Haversine, filters, sort, search-item response, tests) | ✅ / ❌ |
| V3 | Client search UI (type check, Vitest, no Overpass, manual QA) | ✅ / ❌ |
| V4 | Migration & no-regression gates | ✅ / ❌ |
| V5 | Merge gate (suites green, changelog, roadmap, user review) | ✅ / ❌ |
| V6 | Non-goals stay out of scope | — |

> **Phase closed when:** V1–V5 = ✅ and no prior-phase regression
> (tenant isolation, schedule lifecycle, and rating lifecycle suites stay green).
