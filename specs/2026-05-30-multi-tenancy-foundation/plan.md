# 📋 Phase 1.1 Implementation Plan: Database Schema & Multi-Tenancy Foundation

**Phase Goal:** Add tenant isolation to all layers without breaking existing functionality. Aggressive refactor approach — breaking changes acceptable.

**Timeline:** Flexible (as-needed)

---

## Task Groups

### Group 1: Database Schema Updates (Foundation)

#### 1.1 Add Tenant Model & Table
- [ ] Create `Tenant` SQLAlchemy model in `backend/app/models/tenant.py`
  - Fields: `id` (UUID PK), `slug` (string, unique), `name` (string), `created_at` (timestamp)
- [ ] Write Alembic migration: Create `tenants` table
- [ ] Create initial tenant record via migration (for testing/dev)
- **Deliverable:** Migration file `versions/001_create_tenants_table.py`

#### 1.2 Add tenant_id Foreign Keys to All Tenant-Owned Tables
- [ ] Update `User` model: add `tenant_id` (UUID FK to Tenant)
  - Constraint: (tenant_id, email) must be unique per tenant
- [ ] Update `Vehicle` model: add `tenant_id`
- [ ] Update `Workshop` model: add `tenant_id`
  - Constraint: only one workshop per tenant (add UNIQUE constraint)
- [ ] Update `Service` model: add `tenant_id`
- [ ] Update `ServiceOrder` model: add `tenant_id`
- [ ] Update `WorkshopClient` model: add `tenant_id`
- [ ] Update `Message` model: add `tenant_id`
- [ ] Update `Notification` model: add `tenant_id`
- **Deliverable:** All models updated with `tenant_id` field, type hints correct

#### 1.3 Update SQLAlchemy Relationships
- [ ] Add relationship: `Tenant` → has many `User`, `Vehicle`, `Workshop`, `Service`, `ServiceOrder`, `WorkshopClient`, `Message`, `Notification`
- [ ] Update reverse relationships to include `tenant_id` in foreign key constraints
- [ ] Test model initialization to ensure relationships work
- **Deliverable:** Models load without SQLAlchemy errors

#### 1.4 Write Alembic Migration for tenant_id Addition
- [ ] Create migration that adds `tenant_id` column to all tables
- [ ] Migration should:
  - Add column as NOT NULL with DEFAULT value (use existing tenant ID for initial data)
  - Add foreign key constraint to `tenants.id`
  - NOT drop existing data (backward compatible for first run)
- [ ] Test migration in both directions (up and down)
- **Deliverable:** Migration file `versions/002_add_tenant_id_to_all_tables.py`

#### 1.5 Create Composite Indexes
- [ ] Add index `(tenant_id, id)` to: User, Vehicle, Workshop, Service, ServiceOrder, Message, Notification
- [ ] Add index `(tenant_id, created_at)` for list queries with sorting
- [ ] Add unique index `(tenant_id, email)` on User table
- [ ] Add unique index `(tenant_id, email)` on Workshop table (for workshop emails)
- **Deliverable:** Migration file with all indexes created

---

### Group 2: Repository Layer Refactor (Enforce Tenant Filtering)

#### 2.1 Update BaseRepository
- [ ] Modify `BaseRepository` class to require `tenant_id` parameter in all methods:
  - `get(id, tenant_id)` → queries must include `WHERE tenant_id = ?`
  - `list(tenant_id)` → all list queries filtered by tenant
  - `create(data, tenant_id)` → always set tenant_id on new records
  - `update(id, data, tenant_id)` → verify ownership before update
  - `delete(id, tenant_id)` → verify ownership before delete
- [ ] Add `@tenant_required` decorator (raises exception if tenant_id not provided)
- **Deliverable:** Updated BaseRepository with tenant filtering on all methods

#### 2.2 Update All Repository Subclasses
- [ ] `UserRepository` — enforce tenant filtering on all queries
- [ ] `VehicleRepository` — enforce tenant filtering
- [ ] `WorkshopRepository` — enforce tenant filtering
- [ ] `ServiceRepository` — enforce tenant filtering
- [ ] `ServiceOrderRepository` — enforce tenant filtering
- [ ] `MessageRepository` — enforce tenant filtering
- [ ] `NotificationRepository` — enforce tenant filtering
- **Deliverable:** All repositories updated, tests pass

#### 2.3 Add Query Validation Tests
- [ ] Unit test: `test_repository_rejects_query_without_tenant_id()`
- [ ] Unit test: `test_cross_tenant_queries_return_empty()`
- [ ] Unit test: `test_tenant_filtering_on_list_operations()`
- **Deliverable:** 3+ passing tests for repository isolation

---

### Group 3: Model Updates & Data Validation

#### 3.1 Add Tenant ID Validation in Pydantic Schemas
- [ ] Update all request/response schemas to include `tenant_id` (read-only for responses)
- [ ] Validation: ensure `tenant_id` matches authenticated user's tenant
- **Deliverable:** All schema files updated

#### 3.2 Add Database Constraints
- [ ] Add NOT NULL constraint to `tenant_id` on all tables (after migration)
- [ ] Add CHECK constraint: ensure no NULL tenant_id values
- [ ] Verify constraints in migration
- **Deliverable:** Migration applies constraints successfully

---

### Group 4: Authentication & Request Context (Preparation)

#### 4.1 Update JWT Token Structure
- [ ] Modify token generation to include `tenant_id`
- [ ] Ensure JWT claims contain `sub` (user_id) + `tenant_id`
- [ ] Update token validation to extract `tenant_id`
- **Deliverable:** JWT tokens include tenant_id claim

#### 4.2 Create Request Context Object
- [ ] Create `TenantContext` class:
  - Fields: `tenant_id` (UUID), `tenant_slug` (string), `user_id` (UUID)
- [ ] Add context extraction from request (prepare for middleware integration in Phase 1.2)
- **Deliverable:** Context class ready for middleware use

#### 4.3 Update User Model to Link to Tenant
- [ ] Ensure User model correctly references `tenant_id`
- [ ] Update auth service to assign user to tenant on registration
- **Deliverable:** Users created with valid tenant_id

---

### Group 5: Migration Testing & Rollback

#### 5.1 Test Migrations Locally
- [ ] Reset database locally: `docker-compose down && docker-compose up`
- [ ] Run all migrations: `alembic upgrade head`
- [ ] Verify all tables have `tenant_id` columns
- [ ] Seed test data with tenant_id values
- **Deliverable:** Database initialized with no errors

#### 5.2 Test Rollback Scenario
- [ ] Run migration down: `alembic downgrade -1`
- [ ] Verify rollback completes without data loss
- [ ] Run migration up again: `alembic upgrade head`
- **Deliverable:** Rollback tested and documented

#### 5.3 Production Migration Strategy Document
- [ ] Document migration approach for production data
- [ ] Plan how existing users/workshops will be assigned to tenants
- [ ] Backup strategy before applying migrations
- **Deliverable:** Migration strategy doc in `backend/docs/migration-strategy.md`

---

### Group 6: Documentation & Code Review

#### 6.1 Update Model Documentation
- [ ] Add docstrings to all models explaining tenant_id purpose
- [ ] Document constraint: "All queries must include tenant_id filter"
- [ ] Update ARCHITECTURE.md with multi-tenancy section
- **Deliverable:** ARCHITECTURE.md updated with tenant schema design

#### 6.2 Add Pre-commit Hook (Optional but Recommended)
- [ ] Create linting rule to catch queries missing `tenant_id` filter
- [ ] Add to `.pre-commit-config.yaml` (optional for Phase 1)
- **Deliverable:** Pre-commit hook documentation (can be implemented later)

#### 6.3 Code Review Checklist
- [ ] All migration files reviewed
- [ ] All model changes reviewed
- [ ] All repository changes reviewed
- [ ] No hardcoded tenant IDs or missing tenant_id filters
- **Deliverable:** PR with code review approval

---

## Success Criteria (See validation.md)

- ✅ All models have `tenant_id` columns
- ✅ All repositories enforce tenant filtering
- ✅ Migrations run successfully both directions
- ✅ Database constraints prevent NULL tenant_id
- ✅ JWT tokens include tenant_id
- ✅ No breaking changes to API (Phase 1.2 will update routes)
- ✅ Test coverage for tenant isolation logic >80%

---

## Dependencies & Blockers

- **Blocker:** Must have database schema finalized before Phase 1.2 (middleware)
- **Dependency:** Phase 1.2 cannot start until all models updated
- **Dependency:** Phase 2+ depend on this foundation
