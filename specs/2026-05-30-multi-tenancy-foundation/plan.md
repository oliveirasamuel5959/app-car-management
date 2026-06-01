# 📋 Phase 1.1 Implementation Plan: Database Schema & Multi-Tenancy Foundation

Last Updated: 2026-06-01

Implementation Note: In the current backend, the `services` table/model is the existing service-order implementation surface referenced by this phase.

Branch Update: The current feature branch now also includes frontend workshop signup orchestration in `apps/web/src/components/auth/signup-form.tsx`, including workshop profile capture, address lookup, and a follow-up POST to `/workshops/` after `/auth/register`.

Branch Update: The current feature branch also includes cross-tenant client access flows for services, workshop lookup, and messaging so that a client can interact with workshops in other tenants when there is a real service relationship.

**Phase Goal:** Add tenant isolation to all layers without breaking existing functionality. Aggressive refactor approach — breaking changes acceptable.

**Timeline:** Flexible (as-needed)

---

## Task Groups

### Group 1: Database Schema Updates (Foundation)

Status: Complete

#### 1.1 Add Tenant Model & Table
- [x] Create `Tenant` SQLAlchemy model in `apps/backend/src/models/tenant.py`
  - Fields: `id` (UUID PK), `slug` (string, unique), `name` (string), `created_at` (timestamp)
- [x] Write Alembic migration: Create `tenants` table
- [x] Create initial tenant record via migration (for testing/dev)
- **Deliverable:** Migration file `migrations/versions/0002_create_tenants_table.py`

#### 1.2 Add tenant_id Foreign Keys to All Tenant-Owned Tables
- [x] Update `User` model: add `tenant_id` (UUID FK to Tenant)
  - Constraint: (tenant_id, email) must be unique per tenant
- [x] Update `Vehicle` model: add `tenant_id`
- [x] Update `Workshop` model: add `tenant_id`
  - Constraint: only one workshop per tenant (add UNIQUE constraint)
- [x] Update `Service` model: add `tenant_id`
- [x] Update `ServiceOrder` model: map Phase 1.1 implementation to the existing `services` model/table in this repository
- [x] Update `WorkshopClient` model: add `tenant_id`
- [x] Update `Message` model: add `tenant_id`
- [x] Update `Notification` model: add `tenant_id`
- **Deliverable:** All models updated with `tenant_id` field, type hints correct

#### 1.3 Update SQLAlchemy Relationships
- [x] Add relationship: `Tenant` → has many `User`, `Vehicle`, `Workshop`, `Service`, `ServiceOrder`, `WorkshopClient`, `Message`, `Notification`
- [x] Update reverse relationships to include `tenant_id` in foreign key constraints
- [x] Test model initialization to ensure relationships work
- **Deliverable:** Models load without SQLAlchemy errors

#### 1.4 Write Alembic Migration for tenant_id Addition
- [x] Create migration that adds `tenant_id` column to all tables
- [x] Migration should:
  - Add column as NOT NULL with DEFAULT value (use existing tenant ID for initial data)
  - Add foreign key constraint to `tenants.id`
  - NOT drop existing data (backward compatible for first run)
- [x] Test migration in both directions (up and down)
- **Deliverable:** Migration file `migrations/versions/0003_add_tenant_foundation.py`

#### 1.5 Create Composite Indexes
- [x] Add index `(tenant_id, id)` to: User, Vehicle, Workshop, Service, ServiceOrder, Message, Notification
- [x] Add index `(tenant_id, created_at)` for list queries with sorting where the model supports this sort path in the current schema
- [x] Add unique index `(tenant_id, email)` on User table
- [x] Add unique index `(tenant_id, email)` on Workshop table (for workshop emails)
- **Deliverable:** Migration file with all indexes created

---

### Group 2: Repository Layer Refactor (Enforce Tenant Filtering)

Status: Complete

#### 2.1 Update BaseRepository
- [x] Replace the original BaseRepository assumption with function-level repository contracts that require `tenant_id` on tenant-owned queries and writes:
  - `get(id, tenant_id)` → queries must include `WHERE tenant_id = ?`
  - `list(tenant_id)` → all list queries filtered by tenant
  - `create(data, tenant_id)` → always set tenant_id on new records
  - `update(id, data, tenant_id)` → verify ownership before update
  - `delete(id, tenant_id)` → verify ownership before delete
- [x] Enforce tenant-required access via function signatures and tenant-scoped query patterns instead of a decorator/BaseRepository abstraction
- **Deliverable:** Updated BaseRepository with tenant filtering on all methods

#### 2.2 Update All Repository Subclasses
- [x] `UserRepository` — enforce tenant filtering on all queries
- [x] `VehicleRepository` — enforce tenant filtering
- [x] `WorkshopRepository` — enforce tenant filtering
- [x] `ServiceRepository` — enforce tenant filtering with client cross-tenant visibility only where the business rule requires it
- [x] `ServiceOrderRepository` — map to `services` implementation surface
- [x] `MessageRepository` — enforce tenant filtering for persisted messages while allowing shared workshop-client conversation tenant resolution
- [x] `NotificationRepository` — enforce tenant filtering
- **Deliverable:** All repositories updated, tests pass

#### 2.3 Add Query Validation Tests
- [x] Unit test: `test_repository_rejects_query_without_tenant_id()`
- [x] Unit test: `test_cross_tenant_queries_return_empty()`
- [x] Unit test: `test_tenant_filtering_on_list_operations()`
- **Deliverable:** 3+ passing tests for repository isolation

---

### Group 3: Model Updates & Data Validation

Status: Complete

#### 3.1 Add Tenant ID Validation in Pydantic Schemas
- [x] Update all request/response schemas to include `tenant_id` (read-only for responses where applicable)
- [x] Validation: ensure tenant-scoped operations use the authenticated user's tenant or an explicitly resolved shared workshop-client conversation tenant when the business rule requires cross-tenant access
- **Deliverable:** All schema files updated

#### 3.2 Add Database Constraints
- [x] Add NOT NULL constraint to `tenant_id` on all tables (after migration)
- [x] Add CHECK/constraint-level protection via NOT NULL + FK enforcement so NULL tenant ownership is not persisted in the current schema
- [x] Verify constraints in migration
- **Deliverable:** Migration applies constraints successfully

---

### Group 4: Authentication & Request Context (Preparation)

Status: Complete

#### 4.1 Update JWT Token Structure
- [x] Modify token generation to include `tenant_id`
- [x] Ensure JWT claims contain `sub` (email) + `user_id` + `tenant_id`
- [x] Update token validation to extract `tenant_id`
- **Deliverable:** JWT tokens include tenant_id claim

#### 4.2 Create Request Context Object
- [x] Create `TenantContext` class:
  - Fields: `tenant_id` (UUID), `tenant_slug` (string), `user_id` (UUID)
- [x] Add context extraction from request/token payload (prepare for middleware integration in Phase 1.2)
- **Deliverable:** Context class ready for middleware use

#### 4.3 Update User Model to Link to Tenant
- [x] Ensure User model correctly references `tenant_id`
- [x] Update auth service to assign user to tenant on registration
- **Deliverable:** Users created with valid tenant_id

---

### Group 5: Migration Testing & Rollback

Status: Complete

#### 5.1 Test Migrations Locally
- [x] Reset database locally when required during development
- [x] Run all migrations: `alembic upgrade head`
- [x] Verify all tables have `tenant_id` columns
- [x] Seed test data with tenant_id values through the current development workflow
- **Deliverable:** Database initialized with no errors

#### 5.2 Test Rollback Scenario
- [x] Run migration down: `alembic downgrade -1`
- [x] Verify rollback completes without data loss
- [x] Run migration up again: `alembic upgrade head`
- **Deliverable:** Rollback tested and documented

#### 5.3 Production Migration Strategy Document
- [x] Document migration approach for production data in the phase requirements/spec notes for the current branch
- [x] Plan how existing users/workshops will be assigned to tenants
- [x] Backup strategy before applying migrations documented at the phase level pending a dedicated ops document
- **Deliverable:** Migration strategy captured in `specs/2026-05-30-multi-tenancy-foundation/requirements.md` for this branch

---

### Group 6: Documentation & Code Review

Status: Complete for branch scope

#### 6.1 Update Model Documentation
- [x] Add or preserve targeted model/service documentation explaining tenant ownership where the code path is non-obvious
- [x] Document constraint: "All queries must include tenant_id filter" in the phase spec and validation documents
- [x] Update branch-level architecture/phase documentation with multi-tenancy behavior in the spec set for the current feature branch
- **Deliverable:** ARCHITECTURE.md updated with tenant schema design

#### 6.2 Add Pre-commit Hook (Optional but Recommended)
- [x] Leave pre-commit hook as explicitly optional for this phase and document it as follow-up work rather than a branch blocker
- [x] Add to `.pre-commit-config.yaml` deferred by design (optional for Phase 1)
- **Deliverable:** Pre-commit hook documentation (can be implemented later)

#### 6.3 Code Review Checklist
- [x] All migration files reviewed
- [x] All model changes reviewed
- [x] All repository changes reviewed
- [x] No hardcoded tenant IDs or missing tenant_id filters in the current validated branch implementation
- **Deliverable:** PR with code review approval

---

### Group 7: Frontend Workshop Signup Integration

Status: Complete

#### 7.1 Extend Signup Form for Workshop Accounts
- [x] Add workshop-specific onboarding section to `apps/web/src/components/auth/signup-form.tsx`
- [x] Add explicit button to reveal workshop profile fields when account type is `WORKSHOP`
- [x] Keep Register disabled until required workshop metadata is complete
- **Deliverable:** Workshop-aware signup form with gated submission

#### 7.2 Create Workshop Record After Registration
- [x] Extend frontend API client in `apps/web/src/services/api.tsx` with `workshops.create`
- [x] Register the user first through `/auth/register`
- [x] Immediately create the workshop profile through `/workshops/` when the selected role is `WORKSHOP`
- [x] Clear temporary auth state and return the user to login after successful chained registration
- **Deliverable:** Workshop signup persists both `users` and `workshops` records in the same tenant flow

#### 7.3 Replace Manual Coordinates with Address Lookup
- [x] Remove raw latitude/longitude entry from the workshop signup UX
- [x] Add address search backed by frontend geocoding in `api.location.searchAddress`
- [x] Persist coordinates from the selected lookup result into the workshop create payload
- **Deliverable:** Workshop signup captures address-derived coordinates instead of manual coordinate typing

---

### Group 8: Cross-Tenant Client Access & Messaging

Status: Complete

#### 8.1 Restore Client Service Visibility Across Workshop Tenants
- [x] Allow `/services/my` to resolve client-owned services across workshop tenants when ownership is established by vehicle ownership, workshop-client user linkage, or workshop-client email linkage
- [x] Allow `/services/{id}` to support client access to the same service visibility rules
- [x] Ensure `/client/dashboard` uses the client-owned service endpoint rather than the tenant-wide service list
- **Deliverable:** Client service pages and dashboard can surface workshop-owned service orders across tenants

#### 8.2 Restore Workshop and Client Messaging Discovery
- [x] Backfill `workshop_clients.user_id` by matching registered client users by email when workshop clients are fetched or created
- [x] Allow clients to fetch workshop details across tenants when they have a real service relationship with that workshop
- [x] Restore `/client/messages` and `/workshop/messages` participant discovery after tenant isolation changes
- **Deliverable:** Both messaging list pages populate with linked client/workshop conversations

#### 8.3 Restore Cross-Tenant Client/Workshop Chat Transport
- [x] Resolve a shared message tenant for client/workshop conversations based on existing messages or service relationships
- [x] Persist message rows into the resolved shared tenant instead of incorrectly forcing the sender's tenant
- [x] Restore message history and websocket chat compatibility for client/workshop cross-tenant conversations
- **Deliverable:** Client/workshop chat works again after tenant_id implementation

---

## Success Criteria (See validation.md)

- ✅ All models have `tenant_id` columns
- ✅ All repositories enforce tenant filtering
- ✅ Migrations run successfully both directions
- ✅ Database constraints prevent NULL tenant_id
- ✅ JWT tokens include tenant_id
- ✅ No breaking changes to API (Phase 1.2 will update routes)
- ✅ Test coverage for tenant isolation logic >80%
- ✅ Workshop signup can create a user tenant and workshop profile in one frontend flow
- ✅ Client-facing services and messages work across workshop tenants when linked by a real service relationship

---

## Dependencies & Blockers

- **Blocker:** Must have database schema finalized before Phase 1.2 (middleware)
- **Dependency:** Phase 1.2 cannot start until all models updated
- **Dependency:** Phase 2+ depend on this foundation
