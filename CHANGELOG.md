# Changelog

Chronological project changes grouped by commit date. Newest entries appear first.

## 2026-08-14
- FEAT: Reviews & ratings (Phase 3) — clients rate accepted schedules (0–5 stars + optional comment) via the existing `workshop_ratings` table (no migration); one rating per schedule, author can edit/delete
- FEAT: `Workshop.rating_avg` recomputed on every rating write; workshop detail page, workshop cards, and the client workshop list show the live average
- FEAT: `/workshop-ratings` API — POST (CLIENT), GET `?workshop_id=` (public), GET `/mine` (CLIENT), GET `/me` (WORKSHOP), GET/PUT/DELETE `/{id}` (author-only), all dual-tenant scoped
- FEAT: Workshop notification on new rating ("Nova Avaliação", `schedule_id` linked)
- FEAT: Frontend — rating modal on My Schedules (create/edit/delete), reviews list on workshop detail page, workshop-side "Avaliações" page + sidebar entry
- FEAT: Client workshop list page (`/client/my-workshops`) now fetches real workshops (removed hardcoded mock); workshop-card star display fixed for the 0–5 scale
- FEAT: Rating responses include the authoring client's full name (`client_name`), shown on the workshop "Avaliações" page and the workshop-detail reviews list
- TEST: 11 backend rating lifecycle tests (aceito gate, duplicates, author CRUD, avg recompute, dual-tenant isolation, TypeError guards); frontend Vitest setup (7 tests: service query building + modal validation)

## 2026-07-22
- FEAT: Client↔Workshop service scheduling — clients browse workshops, view agenda calendars, book service appointments; workshops receive, view, accept, or reject requests with notifications
- FEAT: Structured workshop operating-hours fields (`opening_time`, `closing_time`, `work_days` CSV, `employee_count`) replacing free-text `opening_hours`; editable via profile settings
- FEAT: Agenda endpoint `GET /workshops/{id}/agenda` computes 30-min time slots with busy/free from accepted schedules
- FEAT: Schedule persistence with dual-tenant isolation (`client_tenant_id` + `workshop_tenant_id`), status transition matrix (pendente→visualizado→aceito|recusado), and role-gated endpoints
- FEAT: Schema-only `workshop_ratings` table (UniqueConstraint + CheckConstraint 0–5) for future rating feature
- FEAT: `notifications.schedule_id` FK for clean typed link between notifications and schedules
- FEAT: Workshop search extended with name filter (case-insensitive), optional lat/lng, and skip/limit pagination
- FEAT: Frontend — client scheduling flow (workshop search → detail + calendar → time-slot picker → booking modal), my-schedules list, workshop schedules management with accept/reject
- FEAT: Status chips standardized to outlined variant across all pages for cleaner visual consistency
- FIX: Schedule datetime sends local timezone offset to avoid UTC shift on display
- DB: Alembic migrations `b6d608d083d6` (workshop hours fields) and `db89f1a0944a` (schedules + workshop_ratings + notifications FK), both reversible
- TEST: 12 backend lifecycle tests covering schedule CRUD, dual-tenant isolation, transition matrix, agenda computation, and TypeError guards
- FEAT: Workshop client rows are now clickable and open a client detail page (contact, vehicle, "cliente desde", last-service summary)
- FEAT: Services history page can filter by client (with a deep link from the client detail page)
- FEAT: Add profile fields — User (phone, address, city, state, avatar, updated_at), Workshop (phone, address, city, state, opening hours, logo), WorkshopClient (notes, status)
- FEAT: Link `services_history` records to a workshop client (`workshop_client_id`) so history groups per client
- FEAT: New shared profile page at `/client/profile` and `/workshop/profile` with avatar/logo upload; serve uploads under `/uploads`
- FEAT: New endpoints `GET/PUT /users/me`, `POST /users/me/avatar`, `PUT /workshops/me`, `POST /workshops/me/logo`
- UI: Unify all primary blues on the brand `#0E71AE` (MUI theme + Tailwind design tokens)
- UI: Fix double header offset (single 64px), sidebar label alignment, dark-mode drawer backgrounds, dead nav links, and the broken header search style; reduce oversized base font
- UI: Add a reusable ConfirmDialog and replace native confirm() for client deletion
- DB: Alembic migration `7d2e9f4a1c8b_add_profile_and_client_fields` (reversible)

## 2026-06-01
- UPDATE: Revise roadmap phases and objectives for clarity and accuracy
- FIX: Fix create workshop clients after tenant feature merge
- Merge branch 'phase-1-multi-tenancy-foundation'
- Complete phase 1 multi-tenancy foundation

## 2026-05-30
- Start SDD and created the constitution and specification of the first feature

## 2026-04-21
- Add notification

## 2026-04-09
- Fix: Client chat message error fix
- Add chat messages endpoint and websockets connection for one to one conversation between user and workshop

## 2026-03-23
- Add HomePage route and component for landing page
- Refactor login form to use Lucide icons
- Refactor signup form and auth layout for improved responsiveness and UI consistency
- Refactor login and signup forms for improved user experience and validation; update AuthLayout with new design elements
- Change sidebar fontsize
- Update sidebar padding and adjust navbar height for improved layout consistency
- Refactor sidebar and header styles for improved UI consistency
- Refactor navigation handling in clients and dashboard pages
- Update dashboard page to display clients services cards summary
- Change service page layout to handle input form into sections

## 2026-03-13
- Correct login and signup page styles
- Correct main layout content to increase text and components size in the page
- Update color pallet and car-page layout
- Add side-bar colapse ui

## 2026-03-11
- Fix header class style
- Correct frontend header dashboard links using authContext
- Fix bug: Create service with client vehicle_id in the database
- Fix bug create service with vehicle id - not fixed

## 2026-03-05
- Corrigindo rotas do dashboard client e workshop

## 2026-03-03
- Created a migration script to add the workshop_clients table and link it to the services table.

## 2026-03-01
- Refactor layout components to use Header instead of Navbar; add theme context and utility functions

## 2026-02-28
- Update routes for clients orders
- Update route for workshops update services
- Update tables for multiuser

## 2026-02-27
- Update services routes to retrieve all services from current user logged in
- Add routes based role for renderization if WORKSHOP or CLIENT

## 2026-02-26
- feat: add workshop management pages and services integration
- feat: Implement service management features including CRUD operations and database schema

## 2026-02-25
- refactor: Comment out unused service cards in dashboard for cleaner layout
- fix: Ensure consistent margin for root elements in CSS and improve drawer layout in dashboard
- feat: Add service status cards and vehicle info component to dashboard
- refactor: Remove workshop ID display and update dashboard links for accuracy
- feat: Add workshop management features
- Create page to add car for current user if not exists in the database
- Refactor code structure for improved readability and maintainability

## 2026-02-24
- Add user register middleware
- feat(api): Update API client for JWT token handling and add comprehensive error management; feat(routes): Enable protected route for dashboard and clean up routing logic; fix(login): Change token reference to access_token for consistency; docs: Add Frontend API Integration Guide with usage examples and error handling
- feat(auth): Enhance vehicle creation with user authentication and CORS configuration
- feat(auth): Implement user registration and login endpoints with JWT authentication

## 2026-02-18
- Merge pull request #2 from oliveirasamuel5959/feature/auth-page
- Refactor frontend code to use mui materials and minimum dev dependencies

## 2026-02-06
- Merge pull request #1 from oliveirasamuel5959/feature/auth-page
- Remove ai from auth-page login form and signup form console.log working
- Add auth-page with no ai content
- Update node_modules in the root folder
- Merge branch 'main' of https://github.com/oliveirasamuel5959/app-car-management
- Update git repo

## 2026-02-05
- chore: add root .gitignore and remove tracked build artifacts
- Change latitude and logitude to Brazil location

## 2026-02-02
- Create react app with vite and replit ai
- Criado frontend react app with replit e rodando npm run dev ok

## 2026-01-30
- Merge branch 'main' of https://github.com/oliveirasamuel5959/app-car-management
- Add react-best-practices doc

## 2026-01-29
- Created validation for vehicle creation
- Add vehicle to database
- Add to gitignore .env
- Add gitignore
- User create restrict to age greater than 18
- Add mock user data to database
- Merge branch 'main' of https://github.com/oliveirasamuel5959/app-car-management
- Create alembic migrations and upgraded head

## 2026-01-28
- Update documentes
- Add architecture and requisitos documentation
- Update README.md
- Update README for project documentation
- Adicionado schemas and models for users, workshops and vehicles
- Start poetry as a package manager for python
- Create the backend and web apps to start the project
- First commit