# Requirements: Frontend Design Refactor & Profile Fields

Last Updated: 2026-07-22
Branch: feature/frontend-design
Status: Implemented

Context: The client and workshop UIs accumulated styling inconsistencies (three different "primary blues", an oversized base font, a double top-offset layout bug, hardcoded colors, dead links, native `confirm()` dialogs), the workshop client table did not navigate anywhere, and the domain data was thin (User had no contact/photo fields, Workshop no contact/address/logo, `services_history` could not be grouped per client). This work makes the clients flow navigable, unifies styling on the brand palette, and adds useful fields end to end (model → schema → migration → API → UI).

## 1. Scope

### In Scope
- Keep both the **Clientes** and **Histórico de Manutenção** sidebar buttons for workshops.
- Clients table rows are clickable and open a **client detail page** (name, vehicle brand/model/year/plate, first-connected date, contact, status, notes, last-service summary).
- Services History page gains a **filter by client** (and honors a `?client=` deep link from the detail page).
- Unify all "primary blue" usage on the brand blue `#0E71AE` (MUI theme + Tailwind tokens + sidebars + header).
- Fix font sizing, the double layout offset, sidebar label alignment, dark-mode drawer backgrounds, dead nav links, and the broken header search style.
- Replace native `confirm()` with a reusable `ConfirmDialog`.
- Add profile fields: User (`phone`, `address`, `city`, `state`, `avatar_url`, `updated_at`), Workshop (`phone`, `address`, `city`, `state`, `opening_hours`, `logo_url`), WorkshopClient (`notes`, `status`), ServiceHistory (`workshop_client_id`).
- Add a shared profile page at `/client/profile` and `/workshop/profile` with avatar/logo upload.
- One Alembic migration; keep every query tenant-scoped.

### Out of Scope
- Appointments/scheduling, payments, reviews.
- Pagination of collection endpoints (existing endpoints remain unpaginated; flagged as follow-up).
- Rewriting the legacy `dashboard-layout.tsx`/`navbar.tsx` (dead code left untouched beyond removing the unused import in `main-layout.tsx`).

## 2. Functional Requirements

1. A workshop user sees Clientes and Histórico de Manutenção in the sidebar.
2. Clicking a client row navigates to `/workshop/clients/:clientId` showing that client's details and a last-service summary derived from `services_history`.
3. The services-history page lists the workshop's records and can be filtered by client and by service type; selecting a client updates the URL (`?client=<id>`).
4. `services_history` records created on service-order completion carry the order's `workshop_client_id`, enabling per-client grouping.
5. Users can view/edit their profile (name, phone, address, city, state) and upload an avatar. Workshop users additionally edit workshop contact/address/hours/description and upload a logo.
6. Uploaded avatars/logos are served under `/uploads` and render in the header/detail/profile.
7. All primary-colored UI uses the brand blue; sidebar labels align; content sits directly under the 64px header with no double offset.

## 3. Non-Functional Requirements
- Tenant isolation preserved: new `workshop_client_id` filter and all update queries are tenant-scoped.
- New endpoints declare request and response schemas.
- Business logic stays in the service layer; repositories own DB access.
- The migration is reversible.
