# Changelog

Chronological project changes grouped by commit date. Newest entries appear first.

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