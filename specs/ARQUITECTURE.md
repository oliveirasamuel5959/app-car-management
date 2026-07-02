# 🏗 System Architecture

This document describes the **architecture, design principles, and technical decisions** of the SaaS Car Platform.  
It serves as a reference for developers and contributors to understand **how the system is structured and why**.

---

## 1. Architectural Overview

The SaaS Car Platform is a **multi-tenant SaaS marketplace application** connecting **clients (vehicle owners)** and **mechanical workshops**.

The architecture is designed with:
- **Multi-tenancy** (shared everything model)
- Monorepo structure
- Modular backend
- Stateless services
- API-first approach
- MVP-driven evolution
- **Tenant isolation via tenant-scoped application queries and constraints**

---

## 2. Multi-Tenancy Architecture

The platform uses a **shared everything** multi-tenant model optimized for MVP and early growth.

### Multi-Tenancy Model

**Shared Everything** approach:
- **Single database instance** serving all tenants
- **Shared application** serving all tenants
- **Separate schemas not used** initially (path to upgrade in future if needed)
- Data isolation through **row-level security** and **tenant context filtering**

**Trade-offs:**
- **Pros:** Lower operational cost, simpler deployment, faster MVP, easier cross-tenant features
- **Cons:** Requires strict enforcement of tenant context, more complex query filtering, one noisy neighbor can impact all tenants
- **Upgrade path:** Can migrate to separate schemas or databases per tenant tier if needed post-MVP

### Tenant Identification & Routing

**JWT-backed tenant routing:**
- Tenant identified primarily from authenticated JWT claims (`tenant_id`, `tenant_slug`)
- No DNS or path rewriting is required for the current application flow
- Tenant context is extracted from auth dependencies and propagated through services/repositories
- Compatible with the current frontend login/signup flow

**Tenant Context Flow:**
1. User authenticates and receives JWT claims including `tenant_id`
2. FastAPI auth dependencies validate the token and expose the tenant context
3. Services and repositories apply tenant-scoped filters to tenant-owned resources
4. Database constraints and foreign keys enforce valid tenant ownership
5. A small set of client-facing flows may resolve a shared tenant context for legitimate cross-tenant workshop relationships

### Data Isolation Strategy

**Row-level filtering via tenant_id column:**
- Every business table has `tenant_id` UUID foreign key
- All queries implicitly filter by current tenant: `WHERE tenant_id = $1`
- Cross-tenant access is only allowed for specific client/workshop flows backed by an existing service relationship
- Repositories enforce tenant isolation in code

**Schema Evolution:**
- All new entities must include `tenant_id` field
- Composite indexes on `(tenant_id, field)` for efficient filtering
- Migrations must include tenant_id in seed data

**Tenant-Isolated Tables:**
- Users (per-tenant users, separate from authentication)
- Workshops
- Clients
- Vehicles
- Service Orders
- Messages

**Current branch exception:**
- Workshop-side management remains tenant-scoped
- Client-side service visibility, workshop lookup, and messaging may cross tenant boundaries when linked by a real service order or workshop-client relationship

---

## 2. High-Level Architecture


---

## 3. Monorepo Architecture

The project uses a **monorepo** to centralize frontend, backend, and shared packages.

### Benefits
- Single source of truth
- Shared contracts and types
- Simplified CI/CD
- Easier refactoring and coordination

### Structure


---

## 4. Backend Architecture (FastAPI)

### 4.1 Layered Architecture

The backend follows a **layered (clean) architecture** with **tenant context propagation**:


### Responsibilities
- **Routers**: HTTP layer, request/response validation, authentication, **tenant context extraction**
- **Services**: Business rules and workflows, **enforce tenant ownership**, resolve the limited shared-tenant cases used by client/workshop interactions
- **Repositories**: Database access only, **filter all queries by tenant_id** unless a service explicitly authorizes the current client/workshop cross-tenant access path
- **Models**: ORM entities (SQLAlchemy)
- **Schemas**: API contracts (Pydantic)

**Golden Rule:** 
- Business logic must never live in routers
- **All database queries must implicitly filter by current tenant context**
- Services must not return data from other tenants unless the access path is an explicitly modelled client/workshop relationship

---

### 4.2 Stateless Design

- No server-side sessions
- Authentication via JWT
- Horizontal scaling supported
- All state stored in database or external services

---

### 4.3 Tenant Context & Security

- **Tenant context** extracted from JWT/auth dependencies
- Propagated through dependency injection or request locals
- All database queries scoped to `tenant_id` from context
- Cross-tenant access is blocked by default
- Services validate tenant ownership before returning data and may resolve a shared conversation/service tenant for specific client/workshop flows

**Critical:** Repositories must always filter by tenant context. Queries without tenant filter indicate a bug.

---

### 4.4 Authentication & Authorization

- JWT-based authentication (cross-tenant)
- Short-lived access tokens
- Refresh tokens
- Role-based access control (RBAC) within tenant
- Ownership checks to prevent IDOR (cross-tenant AND within-tenant)

---

## 5. Frontend Architecture (React)

### Principles
- Feature-oriented folder structure
- Clear separation of concerns
- API-driven UI

### Structure


### State Management
- **React Query (TanStack)** for server state
- **Zustand** for client/global state

---

## 6. Data Architecture

### Database
- PostgreSQL as primary database
- UUID as primary keys
- Alembic for migrations

### Geolocation
- MVP: latitude / longitude
- Planned: PostGIS (`geography(Point)`)
- GIST indexes for spatial queries

---

## 7. Communication Patterns

### REST API
- CRUD operations
- Authentication
- Search
- Scheduling

### WebSockets
- Real-time messaging
- Authenticated connections only
- Used primarily for chat and live updates

---

## 8. Scalability Strategy

### Horizontal Scaling
- Stateless API containers
- Load balancing via Nginx
- Independent scaling of frontend and backend

### Future Enhancements
- Redis for caching and pub/sub
- Background jobs (Celery / RQ)
- Event-driven processing

---

## 9. DevOps & Deployment Architecture

### CI/CD
- GitHub Actions
- Automated tests
- Linting and build pipelines

### Containerization
- Docker for all services
- Docker Compose for local development
- Environment-based configuration

### Deployment Targets
- Frontend: Vercel
- Backend: Railway / Fly.io / AWS
- Database: Managed PostgreSQL (Neon, Supabase, RDS)

---

## 10. Observability

### Logging
- Structured logs (JSON)
- Correlation ID per request
- Centralized error handling

### Monitoring
- Healthcheck endpoint: `GET /health`
- Ready for integration with monitoring tools

---

## 11. Security Architecture

- bcrypt password hashing
- JWT validation and expiration
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- Secure defaults (deny by default)

### Multi-Tenancy Security

- **Tenant context validation:** Every request must have valid tenant context
- **Implicit tenant filtering:** All queries include `WHERE tenant_id = current_tenant_id`
- **No admin override:** Admins cannot access other tenants' data
- **Cross-tenant checks:** Services verify resource belongs to current tenant before returning
- **Audit logging:** Log all data access attempts across tenant boundaries
- **Column-level encryption:** Sensitive fields (payment data, PII) encrypted at rest

---

## 12. Architectural Trade-offs

### Monolith First
- Faster MVP delivery
- Lower operational complexity
- Easier debugging and iteration

### Microservices (Deferred)
- Not justified at MVP stage
- Higher operational cost and complexity

The architecture is designed to **evolve into microservices if and when required**.

---

## 13. Evolution Strategy

- Start simple
- Measure usage and bottlenecks
- Introduce complexity only when justified
- Document major decisions via ADRs

---

## 15. Current Implementation Status

### ✅ Implemented

- JWT-based authentication layer
- Layered architecture (routers → services → repositories)
- WebSocket support for chat
- Basic multi-tenant schema structure (not enforced yet)
- Repository pattern
- Error handling and logging

### ⚠️ In Progress

- Tenant context extraction and enforcement
- Database models initialization

### ❌ Not Yet Implemented

- **CRITICAL:** Tenant context filtering in repositories
- **CRITICAL:** Tenant ownership validation in services
- **CRITICAL:** Multi-tenancy enforcement at API level
- Payment processing (Stripe integration)
- Database migrations
- Tests and CI/CD

### 🎯 Next Steps

See `ROADMAP.md` for detailed implementation phases:
1. Add `tenant_id` UUID to all models
2. Implement `TenantMiddleware` to extract and validate tenant context
3. Update all repositories to filter by `tenant_id`
4. Add tenant ownership checks in all services
5. Write tests to prevent cross-tenant data access

---

## 16. Document Status

**Status:** Active  
**Scope:** MVP and early growth phase  
**Ownership:** Engineering Team
