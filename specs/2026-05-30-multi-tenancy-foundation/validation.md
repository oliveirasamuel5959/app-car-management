# ✅ Phase 1.1 Validation: Multi-Tenancy Foundation

Last Updated: 2026-06-01

Implementation Note: Validation for service orders maps to the current `services` table/module in this repository.

Branch Update: The current branch also requires validation of the frontend workshop signup flow that creates a workshop profile after registration and derives workshop coordinates from address lookup.

Branch Update: The current branch also requires validation of cross-tenant client/workshop service visibility and messaging when a real workshop service relationship exists.

**Purpose:** Define how to verify Phase 1.1 is complete and production-ready for Phase 1.2.

---

## 1. Functional Acceptance Criteria

### 1.1 Database Schema

**Criterion:** All models have `tenant_id` column with proper constraints

- [x] `tenants` table exists with columns: `id` (PK, UUID), `slug` (unique), `name`, `created_at`
- [x] `users` table has `tenant_id` column (UUID, NOT NULL, FK to tenants)
- [x] `vehicles` table has `tenant_id` column (UUID, NOT NULL, FK to tenants)
- [x] `workshops` table has `tenant_id` column (UUID, NOT NULL, FK to tenants)
- [x] `services` table has `tenant_id` column (UUID, NOT NULL, FK to tenants)
- [x] `service_orders` validation maps to the current `services` table/module in this repository
- [x] `workshop_clients` table has `tenant_id` column (UUID, NOT NULL, FK to tenants)
- [x] `messages` table has `tenant_id` column (UUID, NOT NULL, FK to tenants)
- [x] `notifications` table has `tenant_id` column (UUID, NOT NULL, FK to tenants)

**Verification:** Run SQL query:
```sql
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'tenant_id' 
  AND table_schema = 'public'
ORDER BY table_name;
```
**Expected Result:** 8 rows (one per table above) + tenants table

---

### 1.2 Unique Constraints

**Criterion:** Multi-tenant uniqueness constraints in place

- [x] `(tenant_id, email)` unique constraint on `users` table
- [x] `(tenant_id)` unique constraint on `workshops` table (one workshop per tenant)
- [x] `(tenant_id, email)` unique constraint on `workshops` table (optional, for workshop emails)

**Verification:** Insert test data:
```python
# Should succeed:
user_a = User(email="test@example.com", tenant_id=TENANT_A)
user_b = User(email="test@example.com", tenant_id=TENANT_B)  # Different tenant, same email
db.add_all([user_a, user_b])
db.commit()  # ✅ Should succeed

# Should fail:
user_c = User(email="test@example.com", tenant_id=TENANT_A)  # Duplicate email in same tenant
db.add(user_c)
db.commit()  # ❌ Should raise IntegrityError
```

---

### 1.3 Foreign Key Constraints

**Criterion:** All tenant_id columns reference tenants table

- [x] Foreign key constraint exists: `users.tenant_id → tenants.id`
- [x] Foreign key constraint exists: `vehicles.tenant_id → tenants.id`
- [x] Foreign key constraint exists on the tenant-owned tables in the current repository surface: `workshops`, `services`, `workshop_clients`, `messages`, `notifications`
- [x] Orphaned tenant_id values not possible (FK enforces)

**Verification:** Try to insert invalid tenant_id:
```python
user = User(email="test@example.com", tenant_id=uuid4())  # Random UUID
db.add(user)
db.commit()  # ❌ Should raise ForeignKeyViolationError
```

---

### 1.4 Composite Indexes

**Criterion:** Performance indexes created for query filtering

- [x] Index `(tenant_id, id)` exists on `users` table
- [x] Index `(tenant_id, id)` exists on `vehicles` table
- [x] Index `(tenant_id, id)` exists on the validated tenant-owned tables used by the current branch (`workshops`, `services`, `workshop_clients`, `messages`, `notifications`)
- [x] Index `(tenant_id, created_at)` exists where the current branch schema defines list-query sorting support
- [x] Schema inspection confirms the branch-critical indexes used by the validation surface

**Verification:** Run EXPLAIN ANALYZE:
```sql
EXPLAIN ANALYZE
SELECT * FROM vehicles 
WHERE tenant_id = 'UUID-A' AND id = 'vehicle-id';
```
**Expected Result:** Uses index scan, not seq scan

---

### 1.5 Migrations

**Criterion:** Alembic migrations run successfully in both directions

- [x] Migration file `0002_create_tenants_table.py` exists and passes
- [x] Migration file `0003_add_tenant_foundation.py` exists and passes
- [x] The current branch migration chain covers index and constraint creation through the idempotent revisions in `migrations/versions`
- [x] Upgrade path works: `alembic upgrade head` runs without errors
- [x] Downgrade path works: `alembic downgrade -1` runs without errors
- [x] No data loss observed in the downgrade/upgrade cycle used for branch validation
- [x] Initial tenant record created by migration

**Verification:**
```bash
cd backend
# Test fresh database
docker-compose down && docker-compose up -d postgres
# Wait for postgres to start
sleep 3
# Run migrations
alembic upgrade head
# Check tables exist
psql -U postgres -d app_db -c "\dt"  # List all tables
# Test rollback
alembic downgrade -1
alembic upgrade head  # Run again
```

---

## 2. Unit Tests (Test Coverage)

### 2.1 Repository Tenant Isolation Tests

**Criterion:** Repository methods enforce tenant_id filtering

```python
def test_user_repository_get_cross_tenant():
    """Cannot access user from another tenant"""
    user = create_user(tenant_id=TENANT_A)
    result = user_repo.get(user.id, tenant_id=TENANT_B)
    assert result is None  # Not 403, just returns None

def test_vehicle_repository_list_filters_by_tenant():
    """List only returns vehicles for specified tenant"""
    vehicle_a = create_vehicle(tenant_id=TENANT_A)
    vehicle_b = create_vehicle(tenant_id=TENANT_B)
    
    result_a = vehicle_repo.list(tenant_id=TENANT_A)
    assert len(result_a) == 1
    assert result_a[0].id == vehicle_a.id
    
    result_b = vehicle_repo.list(tenant_id=TENANT_B)
    assert len(result_b) == 1
    assert result_b[0].id == vehicle_b.id

def test_repository_rejects_queries_without_tenant_id():
    """Repository.get() requires tenant_id parameter"""
    user = create_user(tenant_id=TENANT_A)
    
    # This should raise TypeError or custom exception:
    with pytest.raises((TypeError, ValueError)):
        user_repo.get(user.id)  # Missing tenant_id
```

**Verification:** Run pytest:
```bash
cd backend
pytest tests/test_repositories/test_tenant_isolation.py -v
```
**Expected Result:** All 3+ tests pass ✅

---

### 2.2 Model Relationship Tests

**Criterion:** SQLAlchemy models load correctly with new relationships

```python
def test_tenant_relationships():
    """Tenant has relationships to all models"""
    tenant = create_tenant()
    user = create_user(tenant_id=tenant.id)
    vehicle = create_vehicle(tenant_id=tenant.id)
    
    assert len(tenant.users) == 1
    assert tenant.users[0].id == user.id
    
    assert len(tenant.vehicles) == 1
    assert tenant.vehicles[0].id == vehicle.id

def test_user_belongs_to_tenant():
    """User.tenant relationship works"""
    tenant = create_tenant()
    user = create_user(tenant_id=tenant.id)
    
    assert user.tenant.id == tenant.id
    assert user.tenant.slug == tenant.slug
```

**Verification:**
```bash
pytest tests/test_models/test_relationships.py -v
```
**Expected Result:** All tests pass ✅

---

### 2.3 Migration Tests

**Criterion:** Alembic migrations are reversible

```python
def test_migration_up_and_down():
    """Migrations can be applied and rolled back"""
    # Apply latest migration
    alembic_upgrade('head')
    
    # Verify tables exist
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    assert 'tenants' in tables
    assert all(t in tables for t in ['users', 'vehicles', 'workshops', ...])
    
    # Verify tenant_id columns exist
    columns = [c['name'] for c in inspector.get_columns('users')]
    assert 'tenant_id' in columns
    
    # Rollback migration
    alembic_downgrade('-1')
    
    # Re-apply (test idempotency)
    alembic_upgrade('head')
```

**Verification:**
```bash
pytest tests/test_migrations/ -v
```
**Expected Result:** All tests pass ✅

---

### 2.4 Index Performance Test (Optional)

**Criterion:** Composite indexes improve query performance

```python
def test_composite_index_performance():
    """Composite indexes reduce query time"""
    # Create 10,000 vehicles across 10 tenants
    for i in range(10):
        tenant = create_tenant()
        for j in range(1000):
            create_vehicle(tenant_id=tenant.id)
    
    # Query with tenant_id filter (should use index)
    start = time.time()
    result = db.query(Vehicle).filter(
        Vehicle.tenant_id == TENANT_A,
        Vehicle.id == specific_vehicle_id
    ).first()
    elapsed = time.time() - start
    
    assert elapsed < 0.01  # Should be < 10ms with index
```

---

## 3. Integration Tests (API Layer Preparation)

### 3.1 JWT Token Tests

**Criterion:** JWT tokens include tenant_id claim

```python
def test_jwt_token_includes_tenant_id():
    """Generated JWT includes tenant_id in claims"""
    user = create_user(tenant_id=TENANT_A)
    token = generate_jwt_token(user)
    
    decoded = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
    assert decoded['sub'] == str(user.id)
    assert decoded['tenant_id'] == str(TENANT_A)
    assert decoded['role'] == 'client'  # or 'workshop'

def test_jwt_token_with_invalid_tenant():
    """JWT validation fails if tenant_id tampered"""
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # Tampered token
    
    with pytest.raises(InvalidTokenError):
        validate_jwt_token(token)
```

**Verification:**
```bash
pytest tests/test_auth/test_jwt_tokens.py -v
```

Validated in current branch via `poetry run pytest tests/test_tenant_isolation.py -q`.

---

### 3.2 Request Context Tests

**Criterion:** TenantContext object created and used

```python
def test_tenant_context_extraction():
    """TenantContext created from user + request"""
    user = create_user(tenant_id=TENANT_A)
    
    context = TenantContext(
        tenant_id=user.tenant_id,
        tenant_slug="oficina-silva",
        user_id=user.id
    )
    
    assert context.tenant_id == TENANT_A
    assert context.user_id == user.id
```

Validated in current branch via `test_tenant_context_holds_user_and_tenant_values`.

---

### 3.3 Frontend Workshop Signup Validation

**Criterion:** Workshop signup creates both the tenant user and workshop profile using the current branch flow

- [x] Signup form exposes workshop-only onboarding fields when Account type = `WORKSHOP`
- [x] `Register` button remains disabled until workshop profile fields are complete
- [x] Address lookup returns selectable search results
- [x] Selected address populates valid `latitude` and `longitude` values in the eventual workshop payload
- [x] Frontend posts `/auth/register` first, then `/workshops/` for workshop accounts
- [x] Workshop signup completes without requiring manual coordinate entry

**Verification:**
```bash
cd apps/web
npm.cmd run check
```

**Manual Verification:**
1. Open `/signup` in the web app.
2. Select `Workshop` as Account type.
3. Confirm the workshop profile section is gated behind `Add workshop info`.
4. Confirm `Register` stays disabled until workshop name, workshop email, description, and address selection are complete.
5. Search for a workshop address and select one of the returned results.
6. Submit the form and verify the browser issues `/auth/register` followed by `/workshops/`.
7. Confirm the created workshop row contains the selected address coordinates.

**Expected Result:** Workshop onboarding persists a workshop-scoped user plus a `workshops` row in the same tenant and the frontend typecheck passes.

---

### 3.4 Cross-Tenant Client Service Visibility Validation

**Criterion:** A client can see workshop-created service orders across workshop tenants when linked by a real service relationship.

- [x] `/services/my` includes services linked by `vehicle.user_id`
- [x] `/services/my` includes services linked by `workshop_client.user_id`
- [x] `/services/my` includes legacy workshop-client rows linked by matching client email
- [x] `/client/dashboard` uses the client-owned service endpoint

**Verification:**
```bash
cd apps/backend
poetry run pytest tests/test_tenant_isolation.py -q
```

**Expected Result:** Client dashboard and client service pages can surface workshop-owned service orders when the workshop relationship is real, even across tenant boundaries.

---

### 3.5 Cross-Tenant Client/Workshop Messaging Validation

**Criterion:** Client/workshop messaging still works after tenant isolation.

- [x] Workshop-client rows are backfilled with `user_id` when a registered client email can be resolved
- [x] Client message lists can resolve workshop details across tenants through a shared service relationship
- [x] Message history uses a shared resolved conversation tenant instead of incorrectly forcing the sender tenant
- [x] New client/workshop messages persist and reload successfully in the resolved conversation tenant

**Verification:**
```bash
cd apps/backend
poetry run pytest tests/test_tenant_isolation.py -q
```

**Expected Result:** `/client/messages`, `/workshop/messages`, and their chat pages work again for valid client/workshop pairs after tenant_id implementation.

---

## 4. Current Branch Validation Commands

Use these commands against the current implementation surface:

```bash
cd apps/backend
poetry run pytest tests/test_tenant_isolation.py -q
poetry run alembic downgrade -1
poetry run alembic upgrade head

cd ..\web
npm.cmd run check
```

Validated on 2026-06-01:
- `poetry run pytest tests/test_tenant_isolation.py -q` → 17 passed
- `poetry run alembic downgrade -1` → success
- `poetry run alembic upgrade head` → success
- `npm.cmd run check` → success

---

## 4. Manual Testing Checklist

### 4.1 Database Verification

- [ ] Connect to local PostgreSQL database
- [ ] Run `\dt` to list all tables — 9 tables visible (tenants + 8 models)
- [ ] Run `\d users` to inspect users table structure
  - Expected: id, email, name, ..., tenant_id (NOT NULL)
- [ ] Run `\d tenants` to inspect tenants table
  - Expected: id, slug, name, created_at

### 4.2 Migration Testing

- [ ] Start fresh database: `docker-compose down && docker-compose up`
- [ ] Run migrations: `alembic upgrade head`
- [ ] Verify all tables created: `alembic current` shows latest version
- [ ] Seed test data: `python scripts/seed_test_data.py`
- [ ] Verify constraints: Try to insert duplicate (tenant_id, email) — should fail
- [ ] Test rollback: `alembic downgrade -1`
- [ ] Run upgrade again: `alembic upgrade head` — should succeed

### 4.3 Model Instantiation

- [ ] Python shell: `python -c "from app.models import *; print('Models load OK')"`
- [ ] No import errors
- [ ] No SQLAlchemy validation errors
- [ ] Relationships defined correctly

### 4.4 Code Review Checklist

**Before merging, verify:**

- [ ] All 8 models have `tenant_id` field with correct type (UUID, FK)
- [ ] All 8 repositories have `tenant_id` parameter on get/list/create/update/delete
- [ ] No hardcoded tenant IDs or test IDs left in production code
- [ ] Migration files are numbered and include both up/down code
- [ ] Comments in migration explain what's happening
- [ ] JWT token generation updated to include tenant_id claim
- [ ] TenantContext class defined and documented
- [ ] No missing imports (UUID, datetime, etc.)
- [ ] Docstrings added to Tenant model explaining its purpose
- [ ] ARCHITECTURE.md updated with multi-tenancy section

---

## 5. Smoke Test (Happy Path)

Run this after merging to verify everything still works:

```bash
# Backend
cd backend
docker-compose down && docker-compose up -d
sleep 3
alembic upgrade head
python -m pytest tests/ -v --tb=short

# Verify no import errors
python -c "
from app.models import *
from app.repositories import *
from app.services import *
print('✅ All imports successful')
print('✅ All models loaded')
print('✅ All repositories initialized')
"

# Frontend (should still build without errors)
cd ../frontend
npm run build
```

**Expected Result:** ✅ All commands succeed with no errors

---

## 6. Sign-Off Checklist

**DO NOT merge until ALL items are checked:**

- [ ] All functional criteria met (schema, constraints, indexes)
- [ ] All unit tests passing (>80% coverage for tenant isolation logic)
- [ ] All migration tests passing (up/down cycle verified)
- [ ] Manual testing completed (database verified)
- [ ] Code review approved by maintainer
- [ ] No hardcoded secrets or debugging code left
- [ ] Commit message clear and references this phase
- [ ] CHANGELOG.md updated with schema changes
- [ ] All team members notified (if applicable)

---

## 7. Deployment Readiness

**Production Migration Strategy (Document in backend/docs/migration-strategy.md):**

1. **Pre-migration backup:** `pg_dump app_db > backup-before-phase1.sql`
2. **Test migration on staging:** Run Alembic migrations on staging database
3. **Production deployment:**
   ```bash
   # SSH to production server
   pg_dump app_db > backup-production.sql
   alembic upgrade head
   # Monitor error logs
   ```
4. **Rollback procedure:**
   ```bash
   psql app_db < backup-production.sql  # Restore from backup
   alembic downgrade -1  # Or manual SQL restore
   ```

---

## 8. Definition of "Done"

✅ **Phase 1.1 is complete when:**

1. All database schema changes merged to `main`
2. All models updated with `tenant_id` and relationships
3. All repositories enforce tenant_id filtering
4. All migrations tested (up/down)
5. Unit test suite passes with >80% coverage
6. Code reviewed and approved
7. ARCHITECTURE.md and TECH-STACK.md updated
8. Next phase (Phase 1.2) can begin without blockers
9. No known security issues (multi-tenancy leaks prevented at DB layer)

✅ **Phase 1.1 is ready for Phase 1.2** when all items above are complete.

---

## 9. Known Risks & Mitigation

| Risk | Detected By | Mitigation |
|------|-------------|-----------|
| Migration breaks on large dataset | Integration test with 100k+ rows | Rollback tested before production |
| Queries still missing tenant_id | Code review + optional pre-commit hook | Second reviewer sign-off required |
| Index doesn't improve performance | Performance test (4.2) | Analyze query plans, adjust indexes if needed |
| JWT token parsing fails | JWT test (3.1) | Unit test must pass before merge |

---

## 10. Success Metrics (Phase 1.1 Complete)

| Metric | Target | Actual |
|--------|--------|--------|
| Test coverage (tenant isolation) | >80% | — |
| Migration time (1M rows) | <5 seconds | — |
| Query latency with index (p95) | <10ms | — |
| Cross-tenant data access possible? | No | — |
| All repositories require tenant_id? | Yes | — |

