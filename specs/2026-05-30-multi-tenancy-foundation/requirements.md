# 📋 Phase 1.1 Requirements: Multi-Tenancy Database Foundation

Last Updated: 2026-06-01

Implementation Note: The current codebase models service orders through the `services` table/module. Phase 1.1 is implemented against that existing surface.

Branch Update: The current feature branch extends the phase with frontend signup support for workshop tenants. The web client now collects workshop profile information, resolves workshop coordinates from address lookup, and creates the workshop record after successful user registration.

Branch Update: The current feature branch also restores client-facing service visibility and client/workshop messaging across tenant boundaries when the relationship is grounded by a real workshop service order.

**Phase:** Phase 1.1 (Database Schema & Foundation)  
**Timeline:** Flexible (as-needed)  
**Approach:** Aggressive refactor (breaking changes acceptable)  
**Start Date:** 2026-05-30

---

## 1. Scope

### In Scope ✅

**Core Deliverables:**
- Add `tenant_id` UUID column to all tenant-owned tables
- Create `Tenant` model and table (represents a workshop organization)
- Update all SQLAlchemy models to include tenant_id FK
- Update all Repository methods to require and enforce tenant_id filtering
- Create Alembic migrations for schema changes
- Add composite indexes `(tenant_id, id)` for query performance
- Update Pydantic schemas to include tenant_id in validation
- Add unique constraints: `(tenant_id, email)` on User and Workshop tables
- Update JWT token generation to include tenant_id claim
- Create `TenantContext` object for request-level tenant tracking
- Add frontend workshop signup flow that creates a tenant-owned workshop profile after registration
- Replace manual workshop coordinate entry with address lookup that resolves `latitude` and `longitude`
- Preserve client visibility into workshop-created service orders even when the workshop belongs to a different tenant
- Preserve client/workshop message discovery and transport for cross-tenant workshop relationships

**Data Integrity Guarantees:**
- All queries must explicitly filter by tenant_id
- Cannot query data from another tenant (queries return 0 rows)
- Database-level constraints prevent NULL tenant_id
- Migration maintains existing data (no loss during schema update)

**Testing:**
- Unit tests for repository tenant isolation (minimum 3 tests)
- Integration tests for migration up/down
- Test data seeding with multiple tenants
- No cross-tenant data leakage possible
- Frontend typecheck coverage for the workshop signup flow
- Manual signup validation for workshop registration and address selection

### Out of Scope ❌

**Deferred to Phase 1.2:**
- Middleware to extract tenant_id from request path
- Route-level tenant validation and injection
- Request authorization checks (403/404 responses)
- API integration tests with multi-tenant scenarios

**Deferred to Phase 1.3:**
- Service layer refactoring (comes after repos are updated)
- Route handler updates
- Frontend path-based routing enforcement beyond signup onboarding

**Not Included:**
- Payment processing (Phase 2)
- WebSocket multi-tenancy (Phase 6)
- Database replication per tenant tier (future post-MVP)

---

## 2. Key Technical Decisions

### Decision 1: Tenant Representation
**Decision:** Create a `Tenant` model/table to represent each workshop organization.

**Rationale:**
- ✅ Makes multi-tenancy explicit in code and data model
- ✅ Allows future tenant metadata (settings, tier, flags)
- ✅ Easier to audit and track tenant lifecycle
- ✅ Aligns with MISSION.md definition of tenants (workshops as primary tenant)

**Alternative Considered:**
- Store tenant directly on User model (no separate table)
- **Rejected:** Less flexible, harder to extend, audit trail poor

**Implementation:**
```python
class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(UUID, primary_key=True, default=uuid4)
    slug = Column(String, unique=True, index=True)  # e.g., "oficina-silva"
    name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
```

---

### Decision 2: Tenant Identifier in All Tables
**Decision:** Add `tenant_id` UUID column (NOT NULL, FK) to all models.

**Rationale:**
- ✅ Database-level enforcement of tenant boundaries
- ✅ Composite indexes `(tenant_id, id)` for fast filtering
- ✅ Foreign key constraints prevent orphaned records
- ✅ Aligns with PostgreSQL RLS (Row-Level Security) future path

**Constraint Strategy:**
- NOT NULL at database level (after migration)
- Unique index: `(tenant_id, id)` on all tables
- Composite index: `(tenant_id, created_at)` for list queries
- Foreign key: `tenant_id REFERENCES tenants(id)`

---

### Decision 3: Repository Layer Enforcement
**Decision:** Update `BaseRepository` to require `tenant_id` on all CRUD methods.

**Rationale:**
- ✅ Catch tenant leaks at repository level (earliest possible)
- ✅ No way to query without specifying tenant
- ✅ Repository becomes single source of truth for isolation
- ✅ Makes code review easier (missing tenant_id is obvious)

**Pattern:**
```python
# Old (insecure):
def get(self, id):
    return db.query(Model).filter(Model.id == id).one_or_none()

# New (secure):
def get(self, id, tenant_id):
    return db.query(Model).filter(
        Model.id == id,
        Model.tenant_id == tenant_id  # ← Always required
    ).one_or_none()
```

---

### Decision 4: Backward Compatibility
**Decision:** Aggressive refactor — breaking changes acceptable. Migrate existing code all at once.

**Rationale:**
- ✅ Cleaner codebase (no dual paths)
- ✅ Reduces technical debt
- ✅ Faster implementation (no compatibility shims)
- ✅ Project is pre-alpha, no production data to preserve
- ✅ Clear cut-over point for testing

**Migration Strategy:**
1. Update all models
2. Create & test migrations
3. Update all repositories
4. Phase 1.2 will update routes + services
5. Single deployment cut-over (no gradual rollout)

---

### Decision 5: Unique Constraints Per Tenant
**Decision:** Add `(tenant_id, email)` unique constraint on User and Workshop tables.

**Rationale:**
- ✅ Prevent duplicate emails within a tenant
- ✅ Allow same email across different tenants (e.g., user owns multiple workshops)
- ✅ Database enforces this (no application logic needed)

**Implementation:**
```python
# In Alembic migration:
op.create_unique_constraint(
    "uq_user_tenant_email",
    "users",
    ["tenant_id", "email"]
)
```

---

### Decision 6: JWT Token Claims
**Decision:** Include `tenant_id` in JWT token claims.

**Rationale:**
- ✅ Middleware can validate tenant_id matches path without extra DB query
- ✅ Prevents token reuse across tenants
- ✅ Easier debugging (JWT shows tenant context)

**JWT Structure:**
```json
{
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "role": "client|workshop",
  "exp": 1234567890,
  "iat": 1234567800
}
```

---

### Decision 7: Workshop Signup Creates the Workshop Profile Immediately
**Decision:** When a user registers with role `WORKSHOP`, the frontend performs a chained flow: `/auth/register` first, then `/workshops/` using the returned authenticated context.

**Rationale:**
- ✅ Keeps workshop creation aligned with the authenticated tenant context created during registration
- ✅ Ensures the `workshops` table is populated during onboarding rather than deferred to a later settings flow
- ✅ Avoids exposing workshop creation on an unauthenticated public endpoint
- ✅ Keeps tenant slug/name creation centered in backend registration while workshop profile details remain frontend-driven

**Implementation:**
```text
1. POST /auth/register
2. Save access_token from response
3. POST /workshops/ with workshop name, email, description, latitude, longitude
4. Clear temporary auth state and redirect to login
```

---

### Decision 8: Address Lookup Replaces Manual Coordinate Entry
**Decision:** Workshop signup collects an address query, presents lookup results, and persists coordinates from the selected result instead of requiring the user to type latitude/longitude manually.

**Rationale:**
- ✅ Reduces signup friction for workshop owners
- ✅ Produces more consistent coordinates for nearby-workshop queries
- ✅ Preserves backend workshop schema without adding a separate geocoding service inside the API

**Implementation Surface:**
- `apps/web/src/components/auth/signup-form.tsx`
- `apps/web/src/services/api.tsx` via `api.location.searchAddress()`
- Current lookup provider: OpenStreetMap Nominatim search API

---

### Decision 9: Client Access Can Cross Workshop Tenants When Backed by a Real Service Relationship
**Decision:** Although workshop staff remain tenant-scoped, client-facing service and workshop lookups may cross tenant boundaries when the client is actually linked to the workshop through a vehicle, a `workshop_client.user_id`, or a `workshop_client.email` match.

**Rationale:**
- ✅ Matches the business rule that clients can interact with multiple workshops
- ✅ Prevents tenant isolation from hiding legitimate workshop-created service orders from the client dashboard and client services pages
- ✅ Supports incremental migration of older workshop-client rows that may still be email-linked instead of fully user-linked

**Implementation Surface:**
- `apps/backend/src/repositories/services.py`
- `apps/backend/src/api/routes/services.py`
- `apps/backend/src/repositories/workshop.py`
- `apps/backend/src/api/routes/workshops.py`

---

### Decision 10: Cross-Tenant Client/Workshop Messages Use a Shared Conversation Tenant
**Decision:** Client/workshop messages are still stored with `tenant_id`, but the backend resolves a shared tenant context from existing messages or a shared service relationship rather than assuming both users live in the same tenant.

**Rationale:**
- ✅ Restores messaging after tenant isolation for the valid client/workshop cross-tenant case
- ✅ Keeps persisted message rows tenant-owned instead of dropping `tenant_id` entirely
- ✅ Avoids creating unauthorised conversations where no real workshop/service relationship exists

**Implementation Surface:**
- `apps/backend/src/services/messages.py`
- `apps/backend/src/api/routes/messages.py`
- `apps/backend/src/services/workshop_client.py`

---

## 3. Context & Business Rules

### Multi-Tenancy Model (from MISSION.md)

**Primary tenant type:** Workshops (unique per tenant)
- Each tenant represents one workshop organization
- A user (staff member) belongs to one tenant
- Clients can interact with multiple workshops (cross-tenant)

**Isolation guarantee:**
- No cross-tenant queries possible
- Tenant context must be on every request
- Database constraints prevent NULL tenant_id

---

### Database Schema Changes Summary

| Table | Old PK | New PK | New Columns | New Constraints |
|-------|--------|--------|-----------|-----------------|
| `users` | `id` | `id` | `tenant_id` (FK) | `(tenant_id, email) UNIQUE` |
| `vehicles` | `id` | `id` | `tenant_id` (FK) | `(tenant_id, id)` INDEX |
| `workshops` | `id` | `id` | `tenant_id` (FK) | `(tenant_id) UNIQUE`, `(tenant_id, email) UNIQUE` |
| `services` | `id` | `id` | `tenant_id` (FK) | `(tenant_id, id)` INDEX |
| `service_orders` | `id` | `id` | `tenant_id` (FK) | `(tenant_id, id)` INDEX |
| `workshop_clients` | `id` | `id` | `tenant_id` (FK) | `(tenant_id, id)` INDEX |
| `messages` | `id` | `id` | `tenant_id` (FK) | `(tenant_id, id)` INDEX |
| `notifications` | `id` | `id` | `tenant_id` (FK) | `(tenant_id, id)` INDEX |

---

### Current State vs. Post-Phase 1.1 State

**Before (Pre-Alpha):**
```
Users table:
  id=1, email=silva@example.com
  id=2, email=carlos@example.com
  
→ Both users can query all vehicles, workshops, etc. (no isolation)
→ No way to prevent cross-tenant access
```

**After Phase 1.1:**
```
Tenants table:
  id=UUID-A, slug="oficina-silva"
  id=UUID-B, slug="oficina-carlos"

Users table:
  id=1, email=silva@example.com, tenant_id=UUID-A
  id=2, email=carlos@example.com, tenant_id=UUID-B

Vehicles table:
  id=1, brand="Honda", tenant_id=UUID-A
  id=2, brand="Ford", tenant_id=UUID-B

→ Repository.get(vehicle_id=1, tenant_id=UUID-B) → None (cross-tenant access denied)
→ Repository.get(vehicle_id=1, tenant_id=UUID-A) → Returns Honda (same tenant)
```

**Current Branch Signup Flow:**
```
Workshop user selects Account type = WORKSHOP
→ Signup form reveals workshop profile section
→ User clicks "Add workshop info"
→ User searches and selects a workshop address
→ Frontend submits /auth/register with tenant_name = workshop name
→ Frontend submits /workshops/ with description + coordinates from address lookup
→ Workshop owner is redirected to login after successful onboarding
```

**Current Branch Client/Workshop Interaction Flow:**
```
Workshop creates a service order in the workshop tenant
→ Service may be linked by vehicle_id, workshop_client.user_id, or workshop_client.email
→ Client can see the service in /services/my even when the workshop belongs to another tenant
→ Client can resolve the workshop in /client/messages through the shared service relationship
→ Client and workshop can exchange messages persisted under the resolved shared conversation tenant
```

---

## 4. Dependencies & Assumptions

### Dependencies
- **Prerequisite:** All code reviewed and approved before Phase 1.2
- **Blocker:** Phase 1.2 cannot start until models + repositories fully updated
- **Database:** PostgreSQL must be available for migration testing

### Assumptions
- **User Role:** Assume users belong to exactly one tenant (not multiple)
- **Existing Data:** Existing users/workshops will be migrated to default tenant for MVP
- **Migration Timing:** Migrations can be re-run locally without data loss (dev-only assumption)

---

## 5. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Migration breaks existing data | High | Test migration up/down cycle locally before commit |
| Duplicate tenant_id in production | High | Add NOT NULL + FK constraints in migration |
| Queries still miss tenant_id filter | High | Code review checklist + optional pre-commit hook |
| Performance regression from indexes | Medium | Benchmark before/after queries (part of Phase 7) |
| JWT token size grows too large | Low | tenant_id is 36 bytes (acceptable) |

---

## 6. Success Definition

**See validation.md for detailed acceptance criteria.**

Quick checklist:
- ✅ `Tenant` model and table created
- ✅ All 8 models updated with `tenant_id` column
- ✅ All 8 repositories enforce tenant filtering
- ✅ Migrations run successfully (up and down)
- ✅ No cross-tenant data access possible at repository level
- ✅ JWT tokens include `tenant_id` claim
- ✅ Composite indexes created for query performance
- ✅ Unit tests pass (repository isolation tests)
- ✅ Workshop signup flow creates the corresponding workshop record for `WORKSHOP` accounts
- ✅ Workshop location is resolved from address lookup instead of manual coordinates
- ✅ Client-facing service visibility survives cross-tenant workshop ownership when backed by a real service relationship
- ✅ Client/workshop messages survive tenant isolation through shared conversation tenant resolution
- ✅ Code reviewed and approved

---

## 7. Timeline & Effort Estimate

**Flexible timeline** — Estimated effort: 15-20 hours (assuming some parallelization)

**Breakdown:**
- Database schema + migrations: 4 hours
- Model updates (8 models): 3 hours
- Repository refactoring (8 repos): 5 hours
- Testing + validation: 3 hours
- Documentation + code review: 2 hours

---

## 8. Reference Documents

- **MISSION.md:** Multi-tenancy strategy, tenant model definition
- **TECH-STACK.md:** PostgreSQL schema design, ORM patterns, multi-tenancy tech decisions
- **ROADMAP.md:** Full phase timeline and dependencies
- **ARCHITECTURE.md:** (Will be updated after Phase 1.1 complete)
