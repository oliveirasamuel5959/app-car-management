# 🗺 Implementation Roadmap

**Current Status:** Pre-Alpha (Phase 2 Complete)  
**Target:** MVP Ready in ~8 weeks  
**Scale:** Hundreds of tenants with tenant-scoped isolation

---

## 1. Current State: What's Been Built

### ✅ Backend (FastAPI)

**Core Infrastructure:**
- ✅ FastAPI app with CORS, middleware, security headers, rate limiting
- ✅ SQLAlchemy 2.0 ORM with async support
- ✅ Alembic migration framework (empty, needs population)
- ✅ JWT authentication (register/login/me endpoints)
- ✅ Auth middleware with public route exclusions
- ✅ Error handling and custom exceptions
- ✅ Database session management
- ✅ Config management via environment variables

**Models & Database:**
- ✅ User model (id, name, age, sex, email, password_hash, role, is_active, created_at)
- ✅ Vehicle model (id, brand, model, year, plate, user_id)
- ✅ Workshop model (id, name, description, latitude, longitude, rating_avg, user_id)
- ✅ Service model
- ✅ ServiceOrder model
- ✅ WorkshopClient model (relationship between workshops and clients)
- ✅ Message model with sender/receiver relationships
- ✅ Notification model

**Routes & Endpoints:**
- ✅ `/auth/register` — User registration
- ✅ `/auth/login` — User login
- ✅ `/auth/me` — Get current user
- ✅ `/users/*` — User CRUD operations
- ✅ `/vehicles/*` — Vehicle CRUD operations
- ✅ `/workshops/*` — Workshop CRUD operations
- ✅ `/services/*` — Service CRUD operations
- ✅ `/service-orders/*` — Service order lifecycle (create, list, summary, accept, start, complete, cancel)
- ✅ `/services-history/*` — Vehicle service-history CRUD (client-only)
- ✅ `/workshop-clients/*` — Workshop-client relationship management
- ✅ `/messages/*` — Message endpoints + WebSocket support
- ✅ `/notifications/*` — Notification endpoints

**Services & Repositories:**
- ✅ UserService, VehicleService, WorkshopService, MessageService, NotificationService
- ✅ Repository layer for data access
- ✅ WebSocket manager for real-time chat

### ✅ Frontend (React + TypeScript)

**Framework & Setup:**
- ✅ React 18 with TypeScript
- ✅ Vite build tool
- ✅ React Router for navigation
- ✅ Tailwind CSS + Material-UI for styling
- ✅ React Query for server state management
- ✅ Zustand for global state
- ✅ Theme context (dark/light mode)
- ✅ Auth context for user session management
- ✅ Notification context

**Pages & Components:**
- ✅ HomePage (landing page)
- ✅ LoginPage / SignUpPage (auth flow)
- ✅ Client Dashboard (with sidebar, protected route)
- ✅ Workshop Dashboard (with sidebar, protected route)
- ✅ Add Car Page / Car Detail Page
- ✅ Workshop Search Page (geolocation-based)
- ✅ Workshop Detail Page
- ✅ Service Orders Pages (client & workshop views)
- ✅ Messages / Chat Pages (for both client and workshop)
- ✅ Services Management Page (workshop)
- ✅ Client Orders Page (workshop)
- ✅ Clients List Page (workshop)
- ✅ Users Management Page (workshop)
- ✅ Responsive Navbar, Sidebar, Footer components
- ✅ Theme toggle, notification bell, dropdowns
- ✅ Protected client/workshop route map already registered in `apps/web/src/routes/routes.tsx`

**API Integration:**
- ✅ API service layer for HTTP requests
- ✅ Car service, workshop service, message service, workshop-client service, service service
- ✅ Error handling in API calls
- ✅ Existing frontend-to-backend integration surface already includes auth, vehicles, workshops, services, workshop-clients, and messages
- ⚠️ Some frontend service adapters still need contract cleanup where endpoint paths or response handling diverge from the current backend API

### ✅ Recently Completed (Phase 2)

- ✅ **Service order lifecycle** (full state machine: PENDING → CONFIRMED → IN_PROGRESS → COMPLETED, plus role-aware cancellation)
- ✅ **Vehicle service history** (client-only CRUD with derived next-service predictions)
- ✅ **Persisted notifications** on order creation and status changes, surfaced via the frontend notification bell

### ⚠️ Partial / In-Progress

- ⚠️ **Reviews & ratings** (model exists, UI not complete)
- ⚠️ **Real-time chat over WebSocket** (notifications now persisted + delivered to the bell; live chat transport integration still incomplete)
- ⚠️ **Database migrations** (tenant foundation + `services_history` feature migrations implemented; future feature migrations still pending)
- ⚠️ **Backend/frontend contract consistency** (many pages and routes already exist, but some service modules still need response/path normalization)

### ❌ Not Yet Implemented

- ❌ **Payment processing** (Stripe integration, split payments)
- ❌ **Search with filters** (service types, rating, availability)
- ❌ **Broader unit & integration coverage beyond tenant foundation**
- ❌ **Deployment pipeline** (Docker, CI/CD)
- ❌ **Production database** (using local PostgreSQL)
- ❌ **Analytics & audit logging**

---

## 2. MVP Requirements (From Specs)

**Functional:**
- FR-00: Multi-tenancy & tenant management ✅
- FR-01: Authentication ✅
- FR-02: User profiles ✅ (partial)
- FR-03: Vehicle management ✅
- FR-04: Workshop management ✅ (partial)
- FR-05: Workshop search ✅ (partial - no filtering)
- FR-06: Scheduling ✅ (service-order lifecycle complete; appointment scheduling out of scope for Phase 2)
- FR-07: Reviews & ratings ⚠️ (UI incomplete)
- FR-08: Messaging ✅ (WebSocket needs integration)

**Non-Functional:**
- Security ✅ (tenant-aware auth and route protection implemented)
- Data isolation ✅ (tenant_id filtering and FK constraints implemented)
- Performance ⚠️ (no caching, no indexing strategy)
- Scalability ⚠️ (no load testing)
- Testing ⚠️ (tenant foundation covered; wider suite still incomplete)
- Observability ⚠️ (logging exists, no centralized monitoring)

---

## 3. Implementation Phases (Detailed)

**Cross-Phase Delivery Rule:** Every feature phase must ship backend and frontend changes together. That includes API routes, request/response schemas, frontend service adapters, pages, cards, forms, route registration, loading/error states, and any contract updates required for the UI to consume the new backend behavior.

**Existing Frontend Baseline:** The application already has a non-trivial frontend surface connected to the backend, including route registration for client/workshop areas and existing pages for dashboard, vehicles, workshop search, workshop detail, services, orders, clients, users, and messaging. Future phases should default to extending and synchronizing these surfaces before creating net-new pages.

### Phase 1: Multi-Tenancy Foundation (Weeks 1-1.5)

**Objective:** Add tenant isolation to all layers without breaking existing code.

**Status:** Complete on 2026-06-01

#### 1.1 Database Schema Update
- Add `tenant_id` UUID column to all tenant-owned tables:
  - users (users who belong to a workshop)
  - vehicles
  - workshops
  - services
  - service_orders
  - workshop_clients
  - messages
  - notifications
- Create migration file for tenant_id columns
- Create composite indexes: `(tenant_id, id)` for fast filtering
- Update relationships to include tenant_id

**Deliverables:**
- Alembic migration: `Add tenant_id to all models`
- Updated SQLAlchemy models with tenant_id
- Test migration locally

**Completed:**
- `tenants` table plus tenant-owned `tenant_id` foreign keys added to the active backend models
- Idempotent Alembic revisions created in `apps/backend/migrations/versions/0001_initial_core_schema.py`, `0002_create_tenants_table.py`, and `0003_add_tenant_foundation.py`
- Composite indexes and uniqueness constraints validated for users, workshops, and services

#### 1.2 Tenant Context Middleware
- Extract tenant context from authenticated JWT claims
- Create tenant context object (tenant_id, tenant_slug)
- Auth dependencies validate tenant_id against the authenticated user
- Attach tenant context to route/service access paths

**Deliverables:**
- JWT-backed tenant context helpers
- Request context helper functions
- Tests for tenant extraction and validation

**Completed:**
- `TenantContext` and tenant helper utilities implemented in the backend core layer
- JWT generation/validation now carries `tenant_id` and `tenant_slug`
- Websocket and HTTP auth paths validate tenant-aware access

#### 1.3 Repository Layer Update
- Update repository functions to accept and enforce tenant_id
- Apply tenant-filtered query patterns across repositories
- Ensure tenant-owned `select()` queries include tenant-aware filters
- Document tenant filtering pattern for future repositories

**Deliverables:**
- Updated repository methods with tenant filtering
- Linting rule to catch queries without tenant filter (pre-commit hook)

**Completed:**
- User, vehicle, workshop, service, message, and notification repository paths were updated to enforce tenant ownership
- Client-facing service and messaging flows now use explicit, relationship-backed cross-tenant exceptions where required by the product behavior

#### 1.4 Route Protection
- Update all route handlers to extract tenant_id from context
- Pass tenant_id to service layer
- Services validate ownership before returning data
- Return 404 for cross-tenant access (not 403, to avoid leaking tenant existence)

**Deliverables:**
- Updated route handlers (auth.py, vehicles.py, workshops.py, etc.)
- Tests for cross-tenant access prevention

**Completed:**
- Route/service propagation updated for `/services`, `/create-services-orders`, `/workshops`, `/messages`, and auth-backed paths
- Client dashboard, service visibility, workshop lookup, and messaging were repaired after tenant scoping changes
- Frontend auth, signup, dashboard, messaging, and workshop-client flows were synchronized with the tenant-aware backend contracts

**Tests:**
- ✅ User cannot access other tenant's vehicles
- ✅ Tenant context extracted correctly from JWT/auth context
- ✅ Auth layer validates tenant ownership
- ✅ 404 returned for cross-tenant resource access
- ✅ `poetry run pytest tests/test_tenant_isolation.py -q` passed with 17 tests on 2026-06-01
- ✅ `poetry run alembic downgrade -1` and `poetry run alembic upgrade head` succeeded on 2026-06-01
- ✅ `npm.cmd run check` succeeded for the frontend branch changes on 2026-06-01

**Phase Outcome:** Phase 1 implementation is complete; the next active roadmap phase is Phase 2 (Service Order Lifecycle).

---

### Phase 2: Service Order Lifecycle (Weeks 1.5-3)

**Objective:** Complete service order workflow with status transitions.

**Status:** Complete on 2026-06-10

#### 2.1 Service Order Model & Status Enum
- Lifecycle states (the order workflow reuses the existing `services` model/table — no new order table was introduced):
  - PENDING (workshop created the order, awaiting client acceptance)
  - CONFIRMED (client accepted)
  - IN_PROGRESS (workshop started the work)
  - COMPLETED (workshop finished the work)
  - CANCELLED (either party cancelled, within the allowed states)
- State machine logic prevents invalid transitions
- `PAID` was deliberately deferred to the later payment phase (Phase 6); it is not part of the lifecycle on this branch

**Deliverables:**
- Lifecycle status enum on the `services` model
- Status transition validation
- (No new database migration — implemented on the existing services table)

**Completed:**
- Status constants and the transition matrix live in `apps/backend/src/services/services.py`
- Invalid transitions and role-mismatched actions are rejected with `400`/`403`

#### 2.2 Service Order API Endpoints

All endpoints are mounted under `/service-orders` and use `PATCH` for lifecycle transitions.

- `POST /service-orders/` — **Workshop** creates a service order
  - Output: service_order with PENDING status
- `GET /service-orders/` — Role-aware list (workshop sees its orders; client sees its own)
- `GET /service-orders/summary` — **Client** dashboard summary (counts by status + recent orders, `ServiceSummaryRead`)
- `GET /service-orders/{id}` — Retrieve a single order (role-aware access)
- `PATCH /service-orders/{id}/accept` — **Client** accepts (PENDING → CONFIRMED)
- `PATCH /service-orders/{id}/start` — **Workshop** starts work (CONFIRMED → IN_PROGRESS)
- `PATCH /service-orders/{id}/complete` — **Workshop** marks complete (IN_PROGRESS → COMPLETED)
- `PATCH /service-orders/{id}/cancel` — Either party cancels (client: PENDING only; workshop: PENDING/CONFIRMED/IN_PROGRESS)

**Deliverables:**
- Expanded ServiceOrderService with state machine
- Updated ServiceOrderRepository
- API routes with proper authorization
- Real-time notification on status change (via WebSocket)
- Frontend service adapters updated for the new lifecycle endpoints and response payloads
- Existing workshop/client service and order pages extended to consume the lifecycle endpoints instead of introducing duplicate flows

**Completed:**
- All eight endpoints above shipped in `apps/backend/src/api/routes/service_orders.py` with role-based authorization and tenant scoping
- Persisted notifications fire on creation and on every status change (`apps/backend/src/services/notifications.py`)

#### 2.3 Service Order UI
- **Client View:**
  - Create new service order form
  - My Service Orders list with status badges
  - Order detail page with lifecycle status and completion summary
  - Cancel order option
  
- **Workshop View:**
  - Incoming service orders list
  - Accept/reject order buttons
  - Start work / Mark complete buttons
  - View estimated cost before accepting

**Deliverables:**
- ServiceOrderCreate page/form
- ServiceOrdersList component
- ServiceOrderDetail page
- Status badge component with color coding
- Frontend route registration for the new service-order pages in both client and workshop areas
- Card/list/table updates so lifecycle fields from the backend are rendered consistently
- Reuse and evolve the existing workshop orders, create-orders, client-orders, and client services pages where possible

**Completed:**
- Client services page exposes the accept flow (`PATCH /service-orders/{id}/accept`) with status badges
- Workshop orders page exposes start / complete / cancel actions wired to the lifecycle endpoints
- Client dashboard renders a service-order summary widget (active/pending/confirmed/in-progress counts + recent orders) from `GET /service-orders/summary`
- Existing pages were extended in place rather than introducing duplicate flows

#### 2.4 Backend/Frontend Synchronization
- Keep service-order response schemas stable across backend and frontend
- Update frontend API clients when route names, request payloads, or response bodies change
- Align status enums, labels, and badge colors with backend status values
- Ensure workshop and client dashboards reflect the same lifecycle state model returned by the API

**Deliverables:**
- Updated frontend service-order service layer
- Synced backend schemas and frontend types/interfaces
- End-to-end navigation flow from list page to detail page to lifecycle action
- Audit of existing `service-service.tsx` consumers against the final backend route/response contract

**Completed:**
- `service-service.tsx` aligned to the canonical `/service-orders` routes and `PATCH` lifecycle verbs
- Workshop dashboard identity resolved via `getMe()` (`GET /workshops/me`) so orders are scoped to the correct tenant workshop profile
- Status enums, labels, and badge colors aligned between backend and frontend

#### 2.5 Vehicle Service History (added on this branch)

A companion maintenance-log feature was delivered alongside the lifecycle work. It is a separate, append-only record keyed to a vehicle (not an order workflow state).

- New `services_history` table and `ServiceHistory` model with `tenant_id` FK and composite indexes `(tenant_id, id)` and `(tenant_id, vehicle_id)`; `vehicle_id` is a `CASCADE` FK to `vehicles`.
- Full client-only CRUD under `/services-history` (all routes reject non-client roles with `403` and are tenant + vehicle-owner scoped):
  - `POST /services-history/` — record a completed maintenance event.
    - Input: vehicle_id, service_type, current_mileage, cost, serviced_at, description (optional)
    - Auto-derives `next_service_mileage` and `next_service_date` from the current mileage, service date, and a per-service-type interval table.
    - Missing `current_mileage` or `serviced_at` rejected with `400`.
  - `GET /services-history/` — list own records (optional `service_type` / `vehicle_id` filters).
  - `GET /services-history/{id}` — retrieve a single record.
  - `PUT /services-history/{id}` — update a record (re-derives next-service fields when mileage/type/date change).
  - `DELETE /services-history/{id}` — delete a record (`204 No Content`).
- Service-type catalog (11 types): oil change, tire rotation, tire replacement, brake service, battery replacement, air filter, transmission service, coolant flush, belt replacement, inspection, other.

**Deliverables:**
- `ServiceHistory` model, `ServiceHistoryService`, repository, and Pydantic schemas
- Alembic migrations creating and evolving `services_history` (head revision `3060d85944b0`)
- Next-service interval table and calculation utils in `src/utils/services_history.py`

**Completed:**
- Full GET/PUT/DELETE CRUD endpoints shipped alongside the original POST (`apps/backend/src/api/routes/services_history.py`)
- Frontend adapter `service-history-service.tsx` covering the full CRUD surface
- Service History page at `/client/service-history` (create/edit modal, service-type filter, per-row edit/delete) plus the client sidebar entry "Histórico de Manutenção"

**Follow-up (not yet done):**
- Focused automated test slice for the service-history endpoints

**Tests:**
- ✅ Valid status transitions allowed
- ✅ Invalid transitions rejected
- ✅ Only workshop can start/complete; only client can accept
- ✅ Notifications sent on creation and status change
- ✅ Cross-tenant orders cannot be accessed
- ✅ `poetry run pytest tests/test_service_order_lifecycle.py` passed with 5 tests
- ✅ `npm run check` (frontend type check) passed
- ⚠️ Service-history endpoints: no automated test slice yet (manual verification + follow-up)

**Phase Outcome:** Phase 2 implementation is complete; the next active roadmap phase is Phase 3 (Reviews & Ratings).

---

### Phase 3: Reviews & Ratings (Weeks 3-3.5)

**Objective:** Enable client feedback on completed service orders.

#### 3.1 Review Model & Schema
- Create Review model:
  - id (UUID)
  - service_order_id (FK, unique)
  - workshop_id (FK)
  - client_id (FK)
  - rating (1-5 stars)
  - comment (optional)
  - created_at
  
- Add constraint: review only after service order PAID status
- Workshop rating_avg auto-updated on each review

**Deliverables:**
- Review model in SQLAlchemy
- ReviewSchema in Pydantic
- Database migration with constraints

#### 3.2 Review API Endpoints
- `POST /reviews/create` — Client creates review (only after PAID)
  - Input: service_order_id, rating, comment
  - Auto-update workshop.rating_avg
  
- `GET /workshops/{id}/reviews` — Get all reviews for a workshop
- `GET /reviews/my-reviews` — User's own reviews
- `PUT /reviews/{id}` — Update own review
- `DELETE /reviews/{id}` — Delete own review

**Deliverables:**
- ReviewService with average rating calculation
- ReviewRepository
- Review routes with proper authorization
- Cascade delete review if service order deleted
- Frontend review data contracts aligned with backend review and workshop rating responses

#### 3.3 Review UI
- ReviewForm component (star picker, comment field)
- ReviewCard component (display review with rating)
- Reviews list on workshop detail page
- Average rating display on workshop card/search results

**Deliverables:**
- ReviewForm component
- ReviewsList component
- Rating display updates on workshop cards
- Review creation form on service order completion
- Workshop detail and search cards updated to consume the new rating fields returned by the backend
- Extend the existing workshop detail/search pages rather than introducing parallel review pages

#### 3.4 Backend/Frontend Synchronization
- Sync review payloads, rating aggregates, and workshop detail responses across backend and frontend
- Update cards, detail pages, and post-service flows to display rating changes without manual data reshaping
- Ensure frontend validation and backend validation use the same review rules

**Deliverables:**
- Updated frontend review service/types
- Workshop card/detail contract alignment
- Review submission and refresh flow verified against backend responses

**Tests:**
- ✅ Review only creatable after PAID status
- ✅ One review per service order
- ✅ Workshop rating_avg updates correctly
- ✅ Cannot review other tenant's workshop
- ✅ Cannot create multiple reviews per order

---

### Phase 4: Search & Filtering (Weeks 3.5-4.5)

**Objective:** Enable clients to discover workshops by services, rating, location.

#### 4.1 Search API Endpoint
- `GET /workshops/search?lat={lat}&lng={lng}&radius=10&services={id,id}&min_rating=4` — Search workshops
  - Input: latitude, longitude, radius (km), service IDs, min rating
  - Output: paginated list of workshops with distance, services, rating
  - Distance calculated via PostGIS (future) or client-side for MVP

**Deliverables:**
- Enhanced workshop search endpoint
- Filtering logic for services and rating
- Distance calculation (Haversine formula in Python)
- Pagination support
- Response contract that includes the frontend fields needed for cards, filter chips, and pagination controls

#### 4.2 Frontend Search
- SearchWorkshopsPage improvements:
  - Add filter sidebar (services, min_rating)
  - Map view with workshop pins (optional for MVP)
  - List view with distance, rating, services
  - Sort by distance / rating / reviews

**Deliverables:**
- Enhanced SearchWorkshopsPage
- FilterPanel component
- WorkshopCard with all info
- Pagination component
- Extend the existing client search and workshop detail pages already registered in the router

#### 4.3 Backend/Frontend Synchronization
- Keep filter query parameters aligned between the backend search endpoint and frontend URL/query-state handling
- Ensure workshop search responses include all fields needed by cards, list rows, and optional map pins
- Update empty, loading, and error states when the backend search contract changes

**Deliverables:**
- Synced search request parameter handling
- Updated workshop cards/list rendering for new backend response fields
- Frontend search service and backend search schema aligned

**Tests:**
- ✅ Search filters by service type
- ✅ Search filters by min rating
- ✅ Distance calculation accurate
- ✅ Pagination works
- ✅ Only active workshops returned

---

### Phase 5: WebSocket Real-Time (Weeks 4.5-5)

**Objective:** Enable real-time notifications and live chat updates.

#### 5.1 WebSocket Connection Manager
- Extend WebSocketManager (already exists) to:
  - Track connections by tenant_id + user_id
  - Ensure messages only broadcast within tenant
  - Handle reconnection logic
  - Send heartbeat to detect stale connections

**Deliverables:**
- Enhanced WebSocketManager class
- Tenant-scoped connection tracking
- Graceful disconnection handling

#### 5.2 Real-Time Notifications
- `WebSocket /messages/ws?tenant={slug}` — Connect to real-time channel
  - Events:
    - `message_new` — New chat message
    - `order_status_change` — Service order status update
    - `notification_new` — General notification
    - `workshop_accepted` — Workshop accepted service order
  - Client can subscribe/unsubscribe from channels

**Deliverables:**
- WebSocket event types and schema
- Broadcast logic for notifications
- Frontend WebSocket connection + event handlers

#### 5.3 Frontend Real-Time
- Connect to WebSocket on app load (after auth)
- Update UI in real-time:
  - New messages appear instantly
  - Service order status changes refresh
  - Notifications appear in bell icon
  - Toast notification on new events

**Deliverables:**
- WebSocket hook (useWebSocket)
- Event listener setup
- Real-time message list updates
- Notification toast system
- Extend the existing client/workshop messages and chat pages already wired in the frontend router

#### 5.4 Backend/Frontend Synchronization
- Define shared event payload shapes for messages, notifications, and service-order status changes
- Keep websocket event names and payload fields synchronized with frontend listeners
- Ensure pages, chat panels, dashboard cards, and notification UI react to the same backend event contract

**Deliverables:**
- Documented websocket event contract
- Updated frontend real-time adapters for backend event payloads
- UI refresh strategy for cards, lists, and detail pages driven by websocket events

**Tests:**
- ✅ WebSocket connection scoped to tenant
- ✅ Messages broadcast to both parties only
- ✅ Status change notifications sent
- ✅ Connection persists through browser refresh
- ✅ Stale connections cleaned up

---

### Phase 6: Payment Processing (Weeks 5-5.5)

**Objective:** Integrate Stripe split payment API only after the core marketplace workflow is operational end to end.

#### 6.1 Stripe Account Setup
- Create Stripe marketplace account
- Configure split payment rules (10% platform fee)
- Test in Stripe sandbox environment

**Deliverables:**
- Stripe API keys in .env
- Stripe connected account IDs for test workshops

#### 6.2 Payment Schema & Model
- Create Payment model:
  - id (UUID)
  - service_order_id (FK)
  - amount_cents
  - platform_fee_cents (10%)
  - workshop_amount_cents (90%)
  - status (pending, completed, failed, refunded)
  - stripe_payment_intent_id
  - created_at, updated_at
- Create PaymentSchema for API responses

**Deliverables:**
- Payment model in SQLAlchemy
- Payment schema in Pydantic
- Database migration

#### 6.3 Payment API Endpoints
- `POST /payments/create-payment-intent` — Create Stripe payment intent
  - Input: service_order_id, amount
  - Output: client_secret (for frontend)
  - Deduct platform fee automatically
  
- `POST /payments/confirm-payment` — Confirm payment after client pays
  - Input: payment_intent_id, service_order_id
  - Verify payment with Stripe
  - Trigger split payment to workshop
  - Update service order status to CONFIRMED

- `GET /payments/{service_order_id}` — Get payment status

**Deliverables:**
- Payment routes with Stripe integration
- PaymentService with Stripe API calls
- PaymentRepository for data persistence
- Error handling for payment failures
- Payment response contract aligned with frontend order detail and payment state UI

#### 6.4 Frontend Payment Integration
- Create PaymentModal component
- Integrate Stripe.js library
- Add "Pay Now" button to service order detail page
- Handle payment success/failure UI states

**Deliverables:**
- PaymentModal component
- payment-service.tsx for API calls
- Stripe library integration
- Payment status display on order page
- Payment UI integrated into the existing service-order detail and workshop/client lifecycle pages

#### 6.5 Backend/Frontend Synchronization
- Keep payment intent, confirmation, and payment-status responses aligned with frontend payment flows
- Update service-order detail pages and status cards to reflect backend payment states without custom per-page mapping
- Ensure backend payment failures map to actionable frontend error messages

**Deliverables:**
- Synced payment API contracts and frontend payment service
- Updated order detail/status UI for payment states
- Backend error payloads consumed cleanly by frontend modals and pages

**Tests:**
- ✅ Payment intent created in Stripe sandbox
- ✅ Platform fee calculated correctly (10%)
- ✅ Split payment routed to workshop account
- ✅ Payment status persisted in database
- ✅ Frontend captures payment confirmation

---

### Phase 7: Testing & Polish (Weeks 5.5-6.5)

**Objective:** Add test coverage and fix bugs found in integration testing.

#### 7.1 Backend Tests
- Unit tests for services (UserService, WorkshopService, etc.)
- Integration tests for API endpoints
- Multi-tenancy isolation tests
- Payment flow tests
- WebSocket tests

**Deliverables:**
- pytest test suite (aim for 70%+ coverage)
- Test fixtures for common data
- CI/CD workflow to run tests on push

#### 7.2 Frontend Tests
- Component tests (Vitest)
- E2E tests (Playwright)
- Authentication flow tests
- Service order lifecycle tests

**Deliverables:**
- Vitest test suite for components
- Playwright E2E scenarios
- CI/CD step to run browser tests
- Contract-focused tests covering backend/frontend response compatibility for the main user journeys

#### 7.3 Bug Fixes & Polish
- Fix any UI/UX issues found in manual testing
- Performance optimization (remove N+1 queries, add indexes)
- Improve error messages
- Add loading states / skeletons
- Mobile responsiveness improvements

**Deliverables:**
- Bug fixes PR
- Performance audit report
- Mobile testing checklist passed

#### 7.4 Backend/Frontend Synchronization Audit
- Review every active frontend page against the backend routes it depends on
- Verify new routes are registered in frontend navigation and app routing
- Verify cards, tables, detail views, and forms consume the current backend response shape without ad hoc field patching
- Fix drift between backend naming and frontend naming before release
- Normalize existing frontend service modules where they still use stale endpoint shapes or inconsistent response assumptions

**Deliverables:**
- Backend/frontend route matrix
- UI contract audit for pages, cards, forms, and tables
- Release checklist confirming synchronized backend/frontend behavior
- Cleanup list for existing frontend API adapters that need to be aligned with the backend

---

### Phase 8: Deployment & Documentation (Weeks 6.5-8)

**Objective:** Prepare for production deployment and document the system.

#### 8.1 Deployment Infrastructure
- Docker configuration for backend
- Docker Compose for local development
- Railway / Fly.io deployment setup
- Environment configuration for staging/prod
- Database backup strategy

**Deliverables:**
- Dockerfile for backend
- docker-compose.yml
- Deployment guide
- Environment templates (.env.example)

#### 8.2 Database Migrations
- Run all Alembic migrations in staging
- Test rollback scenarios
- Document migration strategy

**Deliverables:**
- Migration scripts tested
- Rollback procedures documented

#### 8.3 Monitoring & Logging
- Sentry integration for error tracking
- CloudWatch / DataDog for performance monitoring
- Application logging improvements
- Health check endpoint

**Deliverables:**
- Sentry project created and integrated
- Monitoring dashboard setup
- Health check endpoint implemented

#### 8.4 Documentation
- Update ARCHITECTURE.md with multi-tenancy implementation details
- API endpoint documentation (Swagger/OpenAPI)
- Setup guide for new developers
- Deployment runbook

**Deliverables:**
- Updated ARCHITECTURE.md
- API documentation complete
- README.md with setup steps
- Deployment guide
- Frontend integration notes documenting how pages, routes, and service adapters map to backend endpoints

---

## 4. MVP Acceptance Criteria

### Functional
- ✅ User can register and login (any role)
- ✅ Workshops can create profile and list services
- ✅ Clients can search nearby workshops
- ✅ Clients can create service request (schedule)
- ✅ Workshops can accept/reject requests
- ✅ Both parties can communicate via real-time chat
- ✅ Workshop marks work complete
- ✅ Client can pay via Stripe
- ✅ Client can leave review/rating
- ✅ Data is completely isolated per tenant
- ✅ Backend feature changes are reflected in the corresponding frontend pages, routes, cards, and forms

### Non-Functional
- ✅ All database queries enforce tenant isolation
- ✅ No cross-tenant data leakage possible
- ✅ 99%+ uptime in staging
- ✅ API response time <200ms p95
- ✅ Zero critical security vulnerabilities
- ✅ Test coverage >70%
- ✅ Can scale to 100+ simultaneous tenants

### Security
- ✅ Tenant context validated on every request
- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens validated
- ✅ Rate limiting enabled
- ✅ CORS properly configured
- ✅ No tenant can access another's data
- ✅ Payment data encrypted in transit (Stripe)

---

## 5. Post-MVP Enhancements (Not MVP)

### Phase 9: Advanced Search
- PostGIS for geo queries (replaces Haversine)
- Elasticsearch for complex filtering
- Saved searches

### Phase 10: Mobile App
- React Native or Flutter
- Native push notifications
- Offline message queue

### Phase 11: Enterprise Features
- Separate database per tenant tier
- Multi-user workshop accounts
- Advanced reporting / analytics
- Integration marketplace
- API for third-party developers

### Phase 12: Parts Supplier Integration
- Third tenant type: Autopeças suppliers
- Supplier integration into workshop orders
- Parts marketplace

---

## 6. Current Issues & Blockers

### 🔴 Critical
1. **No tenant_id on models** — All data currently mixed in single user space
2. **No multi-tenancy enforcement** — Users can theoretically access all data
3. **No payment integration** — Cannot charge for service orders
4. **WebSocket not fully integrated** — Real-time messages not working
5. **Existing frontend/backend contract drift** — some pages already exist but still assume outdated endpoint paths or response shapes

### 🟡 Important
1. **No database migrations written** — Cannot initialize empty database
2. **No tests** — No confidence in code quality
3. **Authentication doesn't track tenant** — JWT should include tenant_id
4. **Search endpoint missing filters** — Can only search by location, not services/rating
5. **Existing UI surfaces need reuse-first planning** — roadmap work should extend current pages/routes before adding duplicates

### 🟢 Nice to Have
1. Analytics dashboard for workshops
2. SMS notifications
3. Advanced caching strategy
4. Rate limiting per tenant

---

## 7. Week-by-Week Timeline

| Week | Phase | Key Deliverables | Status |
|------|-------|-----------------|--------|
| 1 | 1 | Tenant context, multi-tenancy schema | 🚧 |
| 1.5 | 2 | Service order model and workflow foundation | ✅ |
| 2.5 | 2 | Service order lifecycle complete | ✅ |
| 3 | 3 | Reviews & ratings | 🚧 |
| 3.5 | 4 | Search and filtering | 🚧 |
| 4.5 | 5 | WebSocket real-time | 🚧 |
| 5.5 | 6 | Stripe integration and payment flow | 🚧 |
| 6.5 | 7 | Test suite complete and polish pass | 🚧 |
| 7.5 | 8 | Deployment and documentation | 🚧 |
| **8** | **MVP Ready** | **All systems tested in staging** | 🎯 |

---

## 8. Resource Requirements

### Backend
- Python 3.11+
- FastAPI, SQLAlchemy, Alembic
- PostgreSQL 14+
- Stripe API (sandbox)
- Docker

### Frontend
- Node.js 18+
- React 18, TypeScript, Vite
- Tailwind CSS, Material-UI
- Stripe.js library

### Infrastructure
- Vercel account (frontend)
- Railway / Fly.io account (backend)
- PostgreSQL managed service (Supabase, Neon, or RDS)
- Stripe account (payments)
- GitHub for version control

---

## 9. Success Metrics

### Technical
- 70%+ test coverage (backend & frontend)
- Zero cross-tenant data leakage in security audit
- <200ms p95 API latency
- 99.5%+ uptime in staging

### Product
- 50+ test workshops registered
- 10+ service orders completed with payment
- 80% message delivery rate (WebSocket)
- 0 critical bugs in first week of staging

### Team
- All code reviewed before merge
- No production incidents
- Documentation up-to-date
- Daily standup on progress
- Backend and frontend contracts reviewed together before release

---

## 10. Document Status

**Status:** Active  
**Scope:** MVP Implementation (Weeks 1-8)  
**Ownership:** Engineering Team  
**Last Updated:** 2026-06-10  
**Next Review:** Weekly on Friday standup
