# 🛠 Tech Stack

This document defines the **technology choices** for SaaS Oficina and the **rationale** behind each decision.

---

## 1. Technology Overview

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18+ / Next.js | Modern UI framework |
| Backend | FastAPI + Python 3.11+ | REST API, async support |
| Database | PostgreSQL 14+ | ACID compliance, multi-tenant isolation |
| Real-time | WebSockets + FastAPI | Live chat, instant notifications |
| State Management | Zustand + React Query | Client and server state |
| Hosting | Vercel (frontend), Railway/Fly.io (backend) | Scalable, multi-tenant ready |
| Authentication | JWT + Refresh Tokens | Stateless, distributed auth |
| Payment | Stripe (split payment API) | Secure processing, marketplace support |
| Monitoring | Sentry + CloudWatch | Error tracking, performance |
| Database Migration | Alembic | Version control for schema changes |

---

## 2. Frontend Stack

### Framework: React 18 + Next.js 13+

**Why:**
- Component-based, reusable UI
- Server-side rendering for performance
- Built-in API routes (future auth endpoints)
- Vercel deployment (1-click scaling)
- Strong TypeScript support

**Multi-tenancy implications:**
- Path-based routing maps to tenant context: `/oficina-xyz/` → extract tenant
- Tenant context passed via context API or state management
- All API calls include tenant identifier in path

### State Management

**React Query (TanStack Query)**
- Server state synchronization
- Automatic refetch/invalidation
- Built-in error handling and retry logic
- Deduplication of requests

**Zustand**
- Lightweight global state (theme, auth context, tenant context)
- Persist tenant identifier across navigation
- Simple, no boilerplate

### UI Library

**Lucide React** (icons)  
**Tailwind CSS** (styling)  
**Shadcn/ui** (component library, optional)

### Build & Tooling

- **TypeScript** — Type safety, better DX
- **ESLint + Prettier** — Code quality
- **Vitest** — Fast unit testing
- **Playwright** — E2E testing

---

## 3. Backend Stack

### Framework: FastAPI + Python 3.11

**Why:**
- Built-in async support (perfect for concurrent requests, chat)
- Automatic OpenAPI/Swagger docs
- Pydantic for request/response validation
- High performance (comparable to Go/Node)
- Simple, explicit code (great for multi-tenant isolation enforcement)

**Multi-tenancy implications:**
- Middleware extracts tenant from path, validates, attaches to request context
- Services receive tenant context and enforce isolation
- Repositories filter all queries by tenant_id

### Database Layer: PostgreSQL 14+

**Why:**
- ACID transactions (critical for multi-tenancy)
- Composite indexes on (tenant_id, field) for efficient filtering
- JSON support for flexible schemas (workshops' custom fields)
- PostGIS for geospatial queries (future)
- Built-in row-level security (RLS) for tenant isolation

**Multi-tenancy schema design:**
```sql
-- All tables include tenant_id
CREATE TABLE workshops (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR,
  location_lat FLOAT,
  location_lon FLOAT,
  created_at TIMESTAMP,
  CONSTRAINT workshop_tenant_unique UNIQUE (tenant_id),
  INDEX idx_tenant (tenant_id)
);

-- Composite index for efficient filtering
CREATE INDEX idx_tenant_created ON workshops(tenant_id, created_at);
```

### ORM: SQLAlchemy 2.0

**Why:**
- Powerful, flexible ORM
- Explicit query control (enforce tenant filtering)
- Works seamlessly with async
- Type hints support

**Multi-tenancy pattern:**
```python
# Base repository enforces tenant filtering
class BaseRepository:
  def get(self, id: UUID, tenant_id: UUID):
    return db.query(Model).filter(
      Model.id == id,
      Model.tenant_id == tenant_id  # ← Always included
    ).one_or_none()
```

### Migration Tool: Alembic

**Why:**
- Version-controlled schema changes
- Support for data migrations
- Downgrade capability (rollback)

**Multi-tenancy consideration:**
- All migrations must account for tenant_id columns
- Initial tables seeded with default tenant

### Authentication: JWT

**Why:**
- Stateless (scales horizontally)
- Works with multi-tenant setup
- Short-lived tokens + refresh tokens
- No server-side session storage needed

**Multi-tenancy flow:**
```
1. User logs in to /oficina-silva/login
2. Backend returns JWT containing:
   - user_id
   - user.tenant_id (from database)
   - exp (1h), iat
3. Client stores JWT
4. Every request includes JWT + tenant path
5. Middleware validates:
   - JWT signature
   - JWT tenant_id matches path tenant_id
```

---

## 4. Real-time Communication

### WebSockets + FastAPI

**Why:**
- Low latency (<100ms) for chat messages
- Reduce HTTP overhead
- Server can push updates to clients
- FastAPI has built-in WebSocket support

**Multi-tenancy considerations:**
- WebSocket connections scoped to tenant
- Message recipient must be in same tenant
- Server maintains connection map: (tenant_id, user_id) → websocket
- No cross-tenant message delivery

### Message Queue (Future)

**Redis Pub/Sub** or **RabbitMQ**
- For scaling beyond single server
- Broadcast messages to all server instances
- Enable horizontal scaling

---

## 5. Deployment & Infrastructure

### Frontend: Vercel

**Why:**
- 1-click deployment from Git
- Global edge network (fast cold starts)
- Automatic HTTPS, CDN
- Built-in scaling
- Free tier for small projects
- Native Next.js optimization

**Multi-tenancy setup:**
- Single Vercel deployment serves all tenants
- Path-based routing: vercel-domain.com/oficina-xyz/

### Backend: Railway or Fly.io

**Why (Railway):**
- Simple, Git-based deployment
- Managed PostgreSQL database
- Redis add-on (future caching)
- Simple environment management

**Why (Fly.io):**
- Multi-region deployment (if needed later)
- Generous free tier
- Global load balancing

**Multi-tenancy deployment:**
- Single backend instance serves all tenants
- Database contains all tenant data
- Horizontal scaling: multiple backend instances behind load balancer

### Database: Managed PostgreSQL (Supabase, Neon, or RDS)

**Why:**
- No operational overhead
- Automatic backups
- Connection pooling
- Metrics and monitoring included

**Multi-tenancy hosting:**
- Shared database for all tenants (MVP)
- Migration path to separate databases per tenant tier (future)

---

## 6. Monitoring & Observability

### Error Tracking: Sentry

**Why:**
- Captures backend and frontend errors
- Groups similar issues
- Provides context (user, request, session)
- Source map support

**Multi-tenancy logging:**
- Include tenant_id in Sentry context
- Search errors by tenant for debugging

### Performance Monitoring: CloudWatch or DataDog

**Why:**
- Monitor API latency, database queries
- Alert on performance degradation
- Cost tracking per tenant (future)

---

## 7. Security & Compliance

### Password Hashing: bcrypt

**Why:**
- Industry standard
- Slow by design (prevents brute force)
- Built-in salt generation

### Environment Variables: .env files + secrets manager

**Why:**
- API keys, database URLs, secrets separated from code
- Different configs per environment (dev, staging, prod)
- Secret rotation capability

**Sensitive data requiring encryption:**
- Payment tokens (Stripe)
- API keys
- PII (workshop owner contact info)
- Sensitive fields (encrypted at rest)

---

## 8. Testing Stack

### Unit Tests: Pytest + Pytest-asyncio

**Why:**
- Fast, simple assertions
- Built-in fixtures
- Great async support
- Parametrized tests for edge cases

**Multi-tenancy test pattern:**
```python
def test_get_workshop_cross_tenant():
  workshop = create_workshop(tenant_id=TENANT_A)
  result = workshop_service.get(workshop.id, tenant_id=TENANT_B)
  assert result is None  # Cannot access other tenant's data
```

### Integration Tests: Pytest + TestClient

**Why:**
- Test full request-response cycle
- Includes database interactions
- Validate tenant isolation at API level

### E2E Tests: Playwright

**Why:**
- Real browser testing
- Cross-browser support
- Capture screenshots on failure

---

## 9. Development Tools

### Package Manager: uv (Python) + npm/yarn (Node.js)

**Why:**
- Fast, reliable dependency management
- Lock files for reproducible builds

### Code Quality: Pre-commit hooks

**Why:**
- Enforce linting, formatting before commit
- Catch tenant-context bugs early

### Local Development: Docker Compose

**Why:**
- Replicate production environment locally
- Services: FastAPI, PostgreSQL, Redis (future)
- Simple `docker-compose up` to start

---

## 10. Key Design Decisions

### Single Database (Multi-tenancy)

**Decision:** Shared everything with row-level tenant filtering

**Rationale:**
- ✅ Lower operational cost (MVP)
- ✅ Faster deployment and testing
- ✅ Simpler cross-tenant features (future: marketplace recommendations)
- ❌ Requires strict tenant context enforcement in code

**Upgrade path:**
- Can migrate to separate schemas per tenant tier (semi-isolated)
- Can migrate to separate databases for large tenants

### Path-based Routing

**Decision:** Tenant identified via URL path (`/oficina-xyz/`)

**Rationale:**
- ✅ No DNS changes required
- ✅ Works with wildcard SSL certs
- ✅ Simple to implement and test
- ❌ Less "SaaS-like" than subdomain approach (for early adopters, this is fine)

### FastAPI over Django

**Decision:** FastAPI instead of Django + DRF

**Rationale:**
- ✅ Native async support (great for WebSockets)
- ✅ Faster performance
- ✅ Simpler API code (less magic)
- ❌ Smaller ecosystem, fewer packages

### PostgreSQL over MongoDB

**Decision:** PostgreSQL instead of MongoDB

**Rationale:**
- ✅ ACID transactions (critical for payment processing)
- ✅ Better for multi-tenancy (relational + RLS)
- ✅ Easier complex queries (joins across tenants, analytics)
- ❌ Less flexible schema evolution

---

## 11. Future Technology Decisions (Post-MVP)

- **GraphQL API** — If frontend query complexity grows
- **Redis caching** — For search and frequently accessed data
- **Elasticsearch** — For advanced search and filtering
- **Message Queue** — For background jobs (invoicing, notifications)
- **Kubernetes** — If scaling to many servers
- **Multi-region** — Separate deployments per geography
- **Mobile app** — React Native or Flutter

---

## 12. Technology Versioning

| Component | Version | Support Until |
|-----------|---------|---|
| Python | 3.11+ | 2027-10 |
| PostgreSQL | 14+ | 2026-10 |
| Node.js | 18+ | 2025-10 |
| React | 18+ | As released |
| FastAPI | 0.100+ | As released |

---

## 13. Implementation Status (Pre-Alpha)

### ✅ What's Already Built

**Backend:**
- FastAPI application with middleware (Auth, Security Headers, Rate Limiting)
- SQLAlchemy 2.0 ORM models for: User, Vehicle, Workshop, Service, ServiceOrder, WorkshopClient, Message, Notification
- JWT-based authentication (register, login, get current user)
- Repository pattern for data access
- WebSocket manager for real-time chat
- Exception handling and logging
- Database session management

**Frontend:**
- React 18 with TypeScript and Vite
- Auth context and protected routes
- Multiple page views: client & workshop dashboards
- Vehicle management UI
- Workshop search and discovery
- Service order pages
- Chat/messaging pages
- Theme context (dark/light mode)
- Responsive layouts with sidebars and navigation

**Infrastructure:**
- Docker Compose for local development
- PostgreSQL database setup
- Static file serving (images)
- CORS and security middleware

### ⚠️ Critical Gaps for MVP

1. **Multi-tenancy NOT IMPLEMENTED**
   - No tenant_id columns on models
   - No path-based routing enforcement
   - No tenant context middleware active
   - Users can access all data (security risk)

2. **Payment Processing NOT STARTED**
   - No Stripe integration
   - No Payment model or endpoints
   - No split payment logic

3. **Database Migrations**
   - Alembic structure exists but empty
   - No migration files written
   - Cannot initialize fresh database

4. **Testing**
   - No test suite
   - No CI/CD pipeline
   - Code coverage: 0%

### 📋 Next Priorities (See ROADMAP.md)

1. **Phase 1 (Week 1-1.5):** Add tenant_id to all models, implement multi-tenancy isolation
2. **Phase 2 (Week 1.5-2.5):** Stripe payment integration
3. **Phase 3 (Week 2.5-3.5):** Complete service order lifecycle
4. **Phase 4 (Week 3.5-4):** Reviews and ratings
5. **Phase 5 (Week 4-4.5):** Search with filtering
6. **Phase 6 (Week 4.5-5):** Real-time WebSocket integration
7. **Phase 7 (Week 5-5.5):** Comprehensive testing
8. **Phase 8 (Week 5.5-6):** Deployment and documentation

---

## 14. Document Status

**Status:** Active  
**Scope:** MVP and early-stage evolution  
**Ownership:** Engineering Team  
**Last Updated:** 2026-05-30
