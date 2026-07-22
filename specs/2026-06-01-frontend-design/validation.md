# Validation: Frontend Design Refactor & Profile Fields

Last Updated: 2026-07-22
Branch: feature/frontend-design
Status: Backend migration + typecheck verified; UI verified via typecheck (manual visual pass pending on the user's machine)

## 1. Automated checks performed

- **Migration**: `alembic upgrade head` applied `7d2e9f4a1c8b` on the local Postgres; `downgrade -1` then `upgrade head` confirmed it is reversible. `alembic current` → `7d2e9f4a1c8b (head)`.
- **ORM mappings**: importing the models confirms the new columns/index exist on `users`, `workshops`, `workshop_clients`, `services_history`.
- **Backend tests**: `pytest tests/test_services_history.py tests/test_service_order_lifecycle.py` → 13 passed (covers the workshop-scoped history list and completion auto-create paths that were changed). NOTE: `tests/test_tenant_isolation.py` fails to *collect* due to a pre-existing bad import (`repo_get_vehicles_by_user_id`, plural) that references a function name the vehicle repo never defined; unrelated to this change.
- **Frontend typecheck**: `npm run check` (tsc) passes with no errors.

## 2. Manual acceptance criteria (to confirm in the running app)

Backend (`make run`, JWT required):
- `PUT /users/me` updates profile fields and returns them.
- `POST /users/me/avatar` (multipart) stores a file, sets `avatar_url`, and the file is reachable at `GET /uploads/...` without a token.
- `PUT /workshops/me` and `POST /workshops/me/logo` behave analogously for WORKSHOP users; non-workshops get 403.
- `GET /services-history/workshop?workshop_client_id=<id>` returns only that client's records, tenant-scoped.
- Completing a service order with a linked client creates a history row carrying `workshop_client_id`.

Frontend (`npm run dev`):
- Single 64px header offset — sidebar top aligns with the header bottom; no double gap; sidebar flush-left.
- One brand blue across header, sidebars, buttons, selected states (light and dark).
- Sidebar labels aligned; both Clientes and Histórico de Manutenção present.
- Clicking a client row opens the detail page with contact, vehicle, "Cliente desde", and last-service summary.
- Services History page filters by client (and by type); opening it via the detail page's "Ver Histórico" pre-selects the client from `?client=`.
- Deleting a client shows the ConfirmDialog (not native `confirm`).
- `/client/profile` and `/workshop/profile` load, save, and upload avatar/logo; the header avatar updates immediately.
- Dark mode: drawers/cards render with the dark palette (no forced white).

## 3. Known follow-ups
- Collection endpoints remain unpaginated (per existing codebase pattern).
- Pre-existing broken import in `tests/test_tenant_isolation.py` should be fixed separately (`repo_get_vehicles_by_user_id` → `repo_get_vehicle_by_user_id`).
