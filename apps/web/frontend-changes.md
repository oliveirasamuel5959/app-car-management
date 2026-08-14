# Frontend Changes — Reviews & Ratings (Phase 3)

Feature branch: `feature/2026-08-14-reviews-ratings`
Spec: `specs/2026-08-14-reviews-ratings/`

## New files

- `src/services/workshop-rating-service.tsx` — typed API module for
  `/workshop-ratings`: `listForWorkshop`, `listMine`, `listReceived`, `getById`,
  `create`, `update`, `remove`. Interfaces `WorkshopRating`,
  `WorkshopRatingCreate`, `WorkshopRatingUpdate` (no `any`).
- `src/pages/client/rating-modal.tsx` — create/edit rating modal (0–5 star
  picker, optional comment, delete when editing). Exports pure
  `validateRating(rating)` used by the Vitest slice.
- `src/pages/workshop/ratings-page.tsx` — workshop-side "Avaliações" page
  (received ratings: stars, comment, date, schedule link) at `/workshop/ratings`.

## Modified files

- `src/pages/client/my-schedules-page.tsx` — `aceito` rows now show an
  "Avaliar" action (opens `RatingModal`); after rating, shows "Editar Avaliação"
  + read-only stars. Refreshes schedules and ratings after save/delete.
- `src/pages/client/scheduling-workshop-page.tsx` — added an "Avaliações"
  section (reviews list + date) below the workshop info card; the `rating_avg`
  chip now reflects the recomputed live average.
- `src/pages/client/workshop-page.tsx` — replaced the hardcoded mock workshop
  (fake `rating_avg: 6.8`) with a real list fetched from `GET /workshops`
  (`workshopService.listWorkshops`); empty/loading/error states added.
- `src/components/workshops/workshop-card.tsx` — fixed star scaling from
  `floor(rating_avg / 1.36)` to a proper 0–5 mapping
  (`round` clamped to `[0, 5]`).
- `src/services/workshop-service.tsx` — added `listWorkshops(skip, limit)`.
- `src/components/navigation/workshop-sidebar.tsx` — "Avaliações" entry
  (StarIcon) → `/workshop/ratings`.
- `src/routes/routes.tsx` — registered `/workshop/ratings` (WORKSHOP-only
  protected route).

## Backend contract consumed

| Frontend call | Endpoint | Role |
|---|---|---|
| `listForWorkshop(workshopId)` | `GET /workshop-ratings?workshop_id=` | any authenticated |
| `listMine()` | `GET /workshop-ratings/mine` | CLIENT |
| `listReceived()` | `GET /workshop-ratings/me` | WORKSHOP |
| `create(data)` | `POST /workshop-ratings` | CLIENT |
| `update(id, data)` | `PUT /workshop-ratings/{id}` | CLIENT (author) |
| `remove(id)` | `DELETE /workshop-ratings/{id}` | CLIENT (author) |
