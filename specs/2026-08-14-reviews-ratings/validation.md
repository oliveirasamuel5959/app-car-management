# Validation: Reviews & Ratings (Client → Workshop)

Last Updated: 2026-08-14
Branch: feature/2026-08-14-reviews-ratings
Status: Planned

Purpose: Define the evidence required to confirm the rating feature is correct,
tenant-safe, and ready to merge, and enumerate the tests to write and run for
backend and frontend. References `requirements.md` and the task groups of
`plan.md`.

## V1 — Backend foundations (TG1)

- [ ] **1.1** `src/schemas/workshop_rating.py` exists: `WorkshopRatingCreate`
  (`rating` with `ge=0, le=5`), `WorkshopRatingUpdate`, `WorkshopRatingRead`.
- [ ] **1.2** `src/repositories/workshop_rating.py` exists; every `repo_*`
  requires an explicit tenant id and raises when missing.
- [ ] **1.3** `src/services/workshop_rating.py` enforces: `aceito` gate, author
  ownership, duplicate-per-schedule rejection, `rating_avg` recompute.
- [ ] **1.4** Tests pass:
  ```bash
  cd apps/backend && uv run pytest tests/test_workshop_rating_lifecycle.py -q
  ```

Cases covered by the test slice (mirror `test_schedule_lifecycle.py`: SQLite
in-memory, direct service/repo calls):
1. Create on an `aceito` schedule → row with both tenant ids copied from the
   schedule.
2. Create on `pendente`/`visualizado`/`recusado` → `ValueError`.
3. Duplicate rating for the same schedule → `ValueError`.
4. `rating` outside 0–5 → Pydantic `ValidationError`.
5. Update own rating → fields change and `rating_avg` recomputes.
6. Delete own rating → row removed and `rating_avg` recomputes.
7. Cross-tenant: `mine` and `me` lists return `[]`/`None` for the wrong tenant.
8. `repo_*` called without a tenant id raises.
9. WORKSHOP write attempts are rejected.
10. Avg math: ratings 2 and 4 → `rating_avg == 3.0`; deleting one recomputes from
    the remainder; zero ratings → `0.0`.

## V2 — API routes + notifications (TG2)

- [ ] **2.1** `GET /workshop-ratings/mine` (CLIENT) returns only the caller's
  rows, newest first, `skip`/`limit` honored.
- [ ] **2.2** `GET /workshop-ratings?workshop_id=N` returns that workshop's
  ratings for any authenticated role.
- [ ] **2.3** `GET /workshop-ratings/me` (WORKSHOP) returns ratings addressed to
  the caller's workshop only.
- [ ] **2.4** `POST /workshop-ratings` (CLIENT) → `201`; WORKSHOP → `403`;
  non-`aceito` schedule → `400`.
- [ ] **2.5** `PUT` / `DELETE /workshop-ratings/{id}` succeed only for the
  authoring client; anyone else → `403`/`404`.
- [ ] **2.6** Creating a rating persists exactly one notification for the
  workshop's user with `schedule_id` set and a Portuguese label.
- [ ] **2.7** Static routes (`/mine`, `/me`) resolve before `/{id}` (no path
  capture bug).
- [ ] **2.8** Full backend suite green:
  ```bash
  cd apps/backend && uv run pytest -q
  ```

## V3 — No-migration verification

- [ ] **3.1** `uv run alembic upgrade head` applies clean; this phase adds no
  revision.
  ```bash
  cd apps/backend && uv run alembic upgrade head
  ```
- [ ] **3.2** `workshop_ratings` exists with `uq_workshop_ratings_schedule_id`
  and `ck_workshop_ratings_rating_range` (created by `db89f1a0944a`).

## V4 — Frontend (TG3/TG4)

- [ ] **4.1** Type safety (mandatory):
  ```bash
  cd apps/web && npm run check
  ```
  Expected: no TypeScript errors across the new service module, pages, and route;
  no use of `any`.
- [ ] **4.2** Vitest slice (extend the scheduling feature's setup): the
  `workshop-rating-service` builds correct query strings; the rating modal blocks
  submit until a 0–5 rating is selected (comment optional).
- [ ] **4.3** Manual QA script:
  1. As a workshop user, accept a schedule.
  2. As the client, open My Schedules → the accepted row shows "Avaliar"; submit
     4 stars + a comment.
  3. Open the workshop detail page → the review appears in the list and the
     average updated; search cards show the same average.
  4. As the workshop user, open "Avaliações" in the sidebar → the rating row
     appears; the notification bell shows the new-rating notification.
  5. The client edits the rating → average and workshop page update. The client
     deletes it → average recomputes.
  6. A second client sees the rating in the public list but cannot edit/delete
     it.

## V5 — Merge gate

Merge-ready only when all are true:

- the backend lifecycle test slice passes and the full backend suite is green;
- `alembic upgrade head` applies clean with no new revision;
- `npm run check` passes and the Vitest slice passes;
- the manual QA script completes end to end;
- no dual-tenant isolation regression (cross-tenant reads return empty/None);
- root `CHANGELOG.md` has a dated `## 2026-08-14` entry and roadmap Phase 3
  status is updated;
- the user has reviewed the result.

## V6 — Non-goals (not validated here)

- Ratings for service orders / PAID gating (future payment phase).
- Workshop replies to ratings, moderation, or admin tools.
- Real-time (WebSocket) delivery of ratings.

---

## Summary

| Verification | Description | Result |
|--------------|-------------|--------|
| V1 | Backend foundations (schemas, repository, service, lifecycle tests) | ✅ / ❌ |
| V2 | API routes + workshop notification on new rating | ✅ / ❌ |
| V3 | No-migration verification (`workshop_ratings` already at head) | ✅ / ❌ |
| V4 | Frontend (type check, Vitest, manual QA) | ✅ / ❌ |
| V5 | Merge gate (suites green, changelog, roadmap, user review) | ✅ / ❌ |
| V6 | Non-goals stay out of scope | — |

> **Phase closed when:** V1–V5 = ✅ and no prior-phase regression
> (tenant isolation and schedule lifecycle suites stay green).
