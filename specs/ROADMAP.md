# 🗺 Implementation Roadmap

**Current Status:** Pre-Alpha (Foundation Built)  
**Target:** MVP Ready in ~6-8 weeks  
**Scale:** Hundreds of tenants with path-based routing isolation

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
- ✅ `/create-services-orders/*` — Service order creation
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

**API Integration:**
- ✅ API service layer for HTTP requests
- ✅ Car service, workshop service, message service, workshop-client service, service service
- ✅ Error handling in API calls

### ⚠️ Partial / In-Progress

- ⚠️ **Service order lifecycle** (created, not fully implemented)
- ⚠️ **Reviews & ratings** (model exists, UI not complete)
- ⚠️ **Real-time notifications** (model/endpoints exist, WebSocket integration incomplete)
- ⚠️ **Database migrations** (Alembic structure exists, no migrations written)

### ❌ Not Yet Implemented

- ❌ **Multi-tenancy enforcement** (no tenant_id column on models, no path-based routing context)
- ❌ **Payment processing** (Stripe integration, split payments)
- ❌ **Search with filters** (service types, rating, availability)
- ❌ **Unit & integration tests**
- ❌ **Deployment pipeline** (Docker, CI/CD)
- ❌ **Production database** (using local PostgreSQL)
- ❌ **Analytics & audit logging**

---

## 2. MVP Requirements (From Specs)

**Functional:**
- FR-00: Multi-tenancy & tenant management ❌
- FR-01: Authentication ✅
- FR-02: User profiles ✅ (partial)
- FR-03: Vehicle management ✅
- FR-04: Workshop management ✅ (partial)
- FR-05: Workshop search ✅ (partial - no filtering)
- FR-06: Scheduling ⚠️ (model exists, lifecycle incomplete)
- FR-07: Reviews & ratings ⚠️ (UI incomplete)
- FR-08: Messaging ✅ (WebSocket needs integration)

**Non-Functional:**
- Security ✅ (partial - multi-tenancy isolation missing)
- Data isolation ❌ (no tenant_id filtering)
- Performance ⚠️ (no caching, no indexing strategy)
- Scalability ⚠️ (no load testing)
- Testing ❌ (no test suite)
- Observability ⚠️ (logging exists, no centralized monitoring)

---

## 3. Implementation Phases (Detailed)

### Phase 1: Multi-Tenancy Foundation (Weeks 1-1.5)

**Objective:** Add tenant isolation to all layers without breaking existing code.

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

#### 1.2 Tenant Context Middleware
- Extract tenant slug from request path: `/oficina-xyz/` → `oficina-xyz`
- Create tenant context object (tenant_id, tenant_slug)
- Middleware validates tenant_id against user's assigned tenant
- Attach tenant_id to request scope for access in routes

**Deliverables:**
- `TenantMiddleware` class
- Request context helper functions
- Tests for tenant extraction and validation

#### 1.3 Repository Layer Update
- Update BaseRepository to accept and enforce tenant_id
- Add `@tenant_filtered` decorator for all queries
- Ensure all `select()` queries include `WHERE tenant_id = $1`
- Document tenant filtering pattern for future repositories

**Deliverables:**
- Updated repository methods with tenant filtering
- Linting rule to catch queries without tenant filter (pre-commit hook)

#### 1.4 Route Protection
- Update all route handlers to extract tenant_id from context
- Pass tenant_id to service layer
- Services validate ownership before returning data
- Return 404 for cross-tenant access (not 403, to avoid leaking tenant existence)

**Deliverables:**
- Updated route handlers (auth.py, vehicles.py, workshops.py, etc.)
- Tests for cross-tenant access prevention

**Tests:**
- ✅ User cannot access other tenant's vehicles
- ✅ Tenant context extracted correctly from path
- ✅ Middleware validates tenant ownership
- ✅ 404 returned for cross-tenant resource access

---

### Phase 2: Payment Processing (Weeks 1.5-2.5)

**Objective:** Integrate Stripe split payment API for marketplace commission model.

#### 2.1 Stripe Account Setup
- Create Stripe marketplace account
- Configure split payment rules (10% platform fee)
- Test in Stripe sandbox environment

**Deliverables:**
- Stripe API keys in .env
- Stripe connected account IDs for test workshops

#### 2.2 Payment Schema & Model
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

#### 2.3 Payment API Endpoints
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

#### 2.4 Frontend Payment Integration
- Create PaymentModal component
- Integrate Stripe.js library
- Add "Pay Now" button to service order detail page
- Handle payment success/failure UI states

**Deliverables:**
- PaymentModal component
- payment-service.tsx for API calls
- Stripe library integration
- Payment status display on order page

**Tests:**
- ✅ Payment intent created in Stripe sandbox
- ✅ Platform fee calculated correctly (10%)
- ✅ Split payment routed to workshop account
- ✅ Payment status persisted in database
- ✅ Frontend captures payment confirmation

---

### Phase 3: Service Order Lifecycle (Weeks 2.5-3.5)

**Objective:** Complete service order workflow with status transitions.

#### 3.1 Service Order Model & Status Enum
- Update ServiceOrder model with lifecycle states:
  - PENDING (client created, awaiting workshop response)
  - CONFIRMED (workshop accepted)
  - IN_PROGRESS (work started)
  - COMPLETED (work done, awaiting payment)
  - PAID (payment confirmed)
  - CANCELLED (either party cancelled)
- Add state machine logic to prevent invalid transitions

**Deliverables:**
- ServiceOrder model with status enum
- Status transition validation
- Database migration

#### 3.2 Service Order API Endpoints
- `POST /service-orders/create` — Client creates service request
  - Input: workshop_id, vehicle_id, description, preferred_date
  - Output: service_order with PENDING status
  
- `PUT /service-orders/{id}/confirm` — Workshop accepts (requires auth)
  - Input: estimated_cost
  - Output: status → CONFIRMED, cost set
  
- `PUT /service-orders/{id}/start-work` — Workshop marks work in progress
  
- `PUT /service-orders/{id}/complete` — Workshop marks work complete
  - Triggers payment flow
  
- `PUT /service-orders/{id}/pay` — Client confirms payment
  - Via Stripe payment intent (Phase 2)
  
- `PUT /service-orders/{id}/cancel` — Either party cancels
- `GET /service-orders/my-orders` — List all orders for current user (client or workshop)

**Deliverables:**
- Expanded ServiceOrderService with state machine
- Updated ServiceOrderRepository
- API routes with proper authorization
- Real-time notification on status change (via WebSocket)

#### 3.3 Service Order UI
- **Client View:**
  - Create new service order form
  - My Service Orders list with status badges
  - Order detail page with payment button (after COMPLETED)
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

**Tests:**
- ✅ Valid status transitions allowed
- ✅ Invalid transitions rejected
- ✅ Only workshop can confirm order
- ✅ Only client can pay
- ✅ Notifications sent on status change
- ✅ Cross-tenant orders cannot be accessed

---

### Phase 4: Reviews & Ratings (Weeks 3.5-4)

**Objective:** Enable client feedback on completed service orders.

#### 4.1 Review Model & Schema
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

#### 4.2 Review API Endpoints
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

#### 4.3 Review UI
- ReviewForm component (star picker, comment field)
- ReviewCard component (display review with rating)
- Reviews list on workshop detail page
- Average rating display on workshop card/search results

**Deliverables:**
- ReviewForm component
- ReviewsList component
- Rating display updates on workshop cards
- Review creation form on service order completion

**Tests:**
- ✅ Review only creatable after PAID status
- ✅ One review per service order
- ✅ Workshop rating_avg updates correctly
- ✅ Cannot review other tenant's workshop
- ✅ Cannot create multiple reviews per order

---

### Phase 5: Search & Filtering (Weeks 4-4.5)

**Objective:** Enable clients to discover workshops by services, rating, location.

#### 5.1 Search API Endpoint
- `GET /workshops/search?lat={lat}&lng={lng}&radius=10&services={id,id}&min_rating=4` — Search workshops
  - Input: latitude, longitude, radius (km), service IDs, min rating
  - Output: paginated list of workshops with distance, services, rating
  - Distance calculated via PostGIS (future) or client-side for MVP

**Deliverables:**
- Enhanced workshop search endpoint
- Filtering logic for services and rating
- Distance calculation (Haversine formula in Python)
- Pagination support

#### 5.2 Frontend Search
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

**Tests:**
- ✅ Search filters by service type
- ✅ Search filters by min rating
- ✅ Distance calculation accurate
- ✅ Pagination works
- ✅ Only active workshops returned

---

### Phase 6: WebSocket Real-Time (Weeks 4.5-5)

**Objective:** Enable real-time notifications and live chat updates.

#### 6.1 WebSocket Connection Manager
- Extend WebSocketManager (already exists) to:
  - Track connections by tenant_id + user_id
  - Ensure messages only broadcast within tenant
  - Handle reconnection logic
  - Send heartbeat to detect stale connections

**Deliverables:**
- Enhanced WebSocketManager class
- Tenant-scoped connection tracking
- Graceful disconnection handling

#### 6.2 Real-Time Notifications
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

#### 6.3 Frontend Real-Time
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

**Tests:**
- ✅ WebSocket connection scoped to tenant
- ✅ Messages broadcast to both parties only
- ✅ Status change notifications sent
- ✅ Connection persists through browser refresh
- ✅ Stale connections cleaned up

---

### Phase 7: Testing & Polish (Weeks 5-5.5)

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

---

### Phase 8: Deployment & Documentation (Weeks 5.5-6)

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

### 🟡 Important
1. **No database migrations written** — Cannot initialize empty database
2. **No tests** — No confidence in code quality
3. **Authentication doesn't track tenant** — JWT should include tenant_id
4. **Search endpoint missing filters** — Can only search by location, not services/rating

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
| 1.5 | 2 | Stripe integration, payment model | 🚧 |
| 2 | 2 | Payment endpoints, frontend integration | 🚧 |
| 2.5 | 3 | Service order lifecycle complete | 🚧 |
| 3 | 4 | Reviews & ratings | 🚧 |
| 3.5 | 4 | Review UI | 🚧 |
| 4 | 5 | Search with filtering | 🚧 |
| 4.5 | 6 | WebSocket real-time | 🚧 |
| 5 | 7 | Test suite complete | 🚧 |
| 5.5 | 8 | Deployment & documentation | 🚧 |
| **6** | **MVP Ready** | **All systems tested in staging** | 🎯 |

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

---

## 10. Document Status

**Status:** Active  
**Scope:** MVP Implementation (Weeks 1-6)  
**Ownership:** Engineering Team  
**Last Updated:** 2026-05-30  
**Next Review:** Weekly on Friday standup
