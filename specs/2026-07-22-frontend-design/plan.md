# Plan: Frontend Design Refactor & Profile Fields

Last Updated: 2026-07-22
Branch: feature/frontend-design
Status: Implemented

## Backend

### Models (`src/models/`)
- `user.py`: `phone`, `address`, `city`, `state`, `avatar_url`, `updated_at` (all nullable).
- `workshop.py`: `phone`, `address`, `city`, `state`, `opening_hours`, `logo_url` (all nullable).
- `workshop_client.py`: `notes` (nullable), `status` (`String(20)`, server_default `active`).
- `services_history.py`: `workshop_client_id` FK → `workshop_clients.id` (`ondelete SET NULL`, nullable) + index `ix_services_history_tenant_id_workshop_client_id`.

### Schemas (`src/schemas/`)
- `user.py`: new fields on `UserRead`/`UserResponse`; new `UserUpdate` (partial).
- `workshop.py`: new fields on `WorkshopCreate`/`WorkshopRead`; new `WorkshopUpdate` (partial).
- `workshop_client.py`: `notes`/`status` on Create/Read/Update (`status` defaults to `active` on create).
- `services_history.py`: `workshop_client_id` on Read + optional on Create.

### Routes / services / repos
- `users.py`: `GET /users/me`, `PUT /users/me`, `POST /users/me/avatar`; `UserService.update_user` + `repo_update_user`.
- `workshops.py`: `PUT /workshops/me`, `POST /workshops/me/logo`; `WorkshopService.update_workshop` + `repo_update_workshop`; `repo_create_workshop` extended with new fields.
- `services_history.py`: `workshop_client_id` query param on `GET /services-history/workshop`, threaded through service + repo; `create_service_history_from_completion` now records `workshop_client_id` (passed from `services.py` completion flow).
- `main.py`: mount `/uploads` static; `middleware.py`: add `/images` + `/uploads` to public prefixes so `<img>` loads without a token.

### Migration
- `migrations/versions/7d2e9f4a1c8b_add_profile_and_client_fields.py`, `down_revision = 6b1f2a9c4d3e`. Applied and verified reversible against the local Postgres.

## Frontend (`apps/web/src`)

### Styling
- `theme.ts`: `primary` → `#0E71AE` family; base `fontSize` 18 → 14; explicit h4–h6 weights.
- `index.css`: define the shadcn design tokens (`--primary` etc., light + dark) mapped to the brand blue; recolor dark-mode button/selected blues.
- `tailwind.config.ts`: unchanged (tokens now resolve via the new CSS variables).
- `main-layout.tsx`: full-bleed main (no extra offset); dropped dead `navbar` import.
- `app-layout.tsx`: `NAVBAR_HEIGHT = 64`; drawers use `background.paper`/`divider` instead of hardcoded white.
- `workshop-sidebar.tsx` / `client-sidebar.tsx`: theme tokens instead of hex; removed the `28px` label indent hack.
- `header.tsx`: brand-consistent styling, avatar rendering, profile links fixed to `/client|workshop/profile`, removed dead appointment links, fixed `bg-gray` search class.

### Pages / components / services
- New `components/ui/confirm-dialog.tsx`; used for client delete.
- `pages/workshop/clients-page.tsx`: clickable rows → detail, status chip, Portuguese labels, ConfirmDialog.
- New `pages/workshop/client-detail-page.tsx`.
- `pages/workshop/service-history-page.tsx`: client + service-type filters, `?client=` deep link.
- New `pages/shared/profile-page.tsx` (`/client/profile`, `/workshop/profile`).
- `context/auth-context.tsx`: `avatar_url` on `User`, new `updateUser`.
- Services: `api.tsx` (`upload` helper, `/users/me` profile + avatar), `workshop-service.tsx` (`Workshop` type, `updateCurrentWorkshop`, `uploadLogo`), `workshop-client-service.tsx` (`notes`/`status`), `service-history-service.tsx` (`workshop_client_id`).
- `routes/routes.tsx`: `/workshop/clients/:clientId`, `/workshop/profile`, `/client/profile`.
