# Phase 2 Validation: Service Order Lifecycle

Last Updated: 2026-06-05
Branch: feature/2026-06-01-service-order-lifecycle
Status: Automated validation passed on 2026-06-01

Purpose: Define the evidence required to confirm the service-order lifecycle implementation is correct, tenant-safe, and ready to merge.

## 1. Functional Acceptance Criteria

### 1.1 Lifecycle Creation and Transitions

- A workshop user can create a service order through the canonical `/service-orders` endpoint.
- New service orders are persisted in `PENDING`.
- The client tied to the order can accept it and move it to `CONFIRMED`.
- A workshop user can move a confirmed order to `IN_PROGRESS`.
- A workshop user can move an in-progress order to `COMPLETED`.
- Valid transitions succeed and return the updated order payload.

### 1.2 Authorization and Tenant Safety

- A client cannot create a service order.
- A workshop cannot accept an order on behalf of the client.
- A client cannot start or complete work.
- Cross-tenant reads return not found or equivalent non-leaking behavior.
- Cross-tenant writes are rejected and do not mutate data.

### 1.3 Cancellation Rules

- A client can cancel a `PENDING` order.
- A workshop can cancel `PENDING`, `CONFIRMED`, or `IN_PROGRESS` orders.
- No actor can cancel a `COMPLETED` order.
- Cancelled orders reject further lifecycle mutations.

### 1.4 Dashboard and Notifications

- The client dashboard shows active order count, status counts, and recent orders for the authenticated client.
- Status changes create persisted notification records.
- Notification content identifies the order and the new status.

### 1.5 Vehicle Service History

- A client user can create a vehicle service-history record through `POST /services-history`.
- A non-client role is rejected (`403`) when attempting to create a service-history record.
- A request missing `current_mileage` or `serviced_at` is rejected with a validation error (`400`).
- The created record persists the derived `next_service_mileage` and `next_service_date`.
- A client can list (`GET /services-history`, with optional `service_type`/`vehicle_id` filters), read (`GET /services-history/{id}`), update (`PUT /services-history/{id}`), and delete (`DELETE /services-history/{id}`) only their own records.
- Updating `current_mileage`, `service_type`, or `serviced_at` re-derives the next-service predictions; `DELETE` returns `204` and a missing or non-owned record returns `404`.
- Service-history reads and writes remain tenant-scoped.

## 2. Backend Validation

### 2.1 Automated Tests

The backend test slice for this phase should cover at least:

- workshop create succeeds
- client accept succeeds only from `PENDING`
- invalid transition matrix is rejected
- role-restricted transitions are rejected
- cancellation rules are enforced
- cross-tenant access is blocked
- notification side effects are persisted

Recommended command from `apps/backend`:

```bash
poetry run pytest tests/test_service_order_lifecycle.py -q
```

If the test suite is too broad during active development, the PR should still include a focused service-order test slice that exercises the cases above.

Recorded result on 2026-06-01:

```text
5 passed in focused lifecycle coverage
```

Validated behaviors in the focused test slice:

- service-order creation notifies both workshop and client users
- client acceptance creates persisted notifications for both actors
- invalid workshop transitions are rejected
- client cancellation of a confirmed order is rejected
- client summary counts reflect the current lifecycle state

Service-history note: the `/services-history` endpoints (now a full client-only CRUD surface) do not yet have a dedicated automated test slice. The behaviors in section 1.5 require manual verification for now, and a focused test slice is tracked as follow-up coverage.

### 2.2 Migration Verification

If lifecycle fields or constraints change the schema:

```bash
poetry run alembic upgrade head
poetry run alembic downgrade -1
poetry run alembic upgrade head
```

Expected result:

- migration applies cleanly
- downgrade succeeds
- re-upgrade succeeds

Recorded result for this branch scope:

- The order-lifecycle implementation required no schema migration.
- The companion service-history feature added migrations that create and evolve the `services_history` table (`be80440e36bd` → `89fceb537d51` → `aa3043742a82` → `81977476ee57` → `3060d85944b0`, with `3060d85944b0` as head). These should be exercised with the upgrade/downgrade/upgrade cycle above to confirm the table applies, downgrades, and re-applies cleanly.

## 3. Frontend Validation

### 3.1 Type Safety

Run from `apps/web`:

```bash
npm.cmd run check
```

Expected result:

- no TypeScript errors in the updated service-order flows
- dashboard summary integration typechecks cleanly

Recorded result on 2026-06-01:

```text
TypeScript check passed in apps/web
```

### 3.2 UI Behavior Checks

Manual verification should confirm:

- workshop can create an order from the intended workshop flow
- client can see pending orders and accept one
- workshop can see the accepted order and progress it through work states
- status badges and labels are consistent across list, detail, and dashboard surfaces
- client dashboard summary updates after mutations or refresh
- error states are shown when a disallowed action is attempted

Current status:

- Manual UI validation is intentionally deferred to the next validation round.
- The branch is being committed and pushed based on passing executable checks only.

## 4. Merge Gate

The branch is merge-ready only if all of the following are true:

- backend lifecycle behavior matches the requirements in `requirements.md`
- no legacy route naming remains on the active frontend path for this feature
- backend tests for the lifecycle slice pass
- frontend typecheck passes
- manual flow verification is completed for workshop create, client accept, workshop progress, and dashboard summary
- the `POST /services-history` endpoint creates tenant-scoped records with derived next-service fields and enforces the client-only and required-field rules
- no tenant-isolation regression is introduced

Current gate status on 2026-06-01:

- Backend lifecycle slice: passed
- Frontend typecheck: passed
- Manual flow verification: pending follow-up validation round
- Service-history endpoints: full client-only CRUD backend delivered and frontend (sidebar + `/client/service-history` page) delivered; automated test slice pending follow-up
- Tenant-isolation regression: no automated regression found in the focused lifecycle slice

## 5. Non-Goals for Validation

The following are not required to merge this phase:

- payment confirmation
- review creation after completion
- broader analytics dashboards unrelated to service orders

## 6. Extension (2026-07-03): Workshop-Aware Service History

### 6.1 Functional Acceptance Criteria

- Manual client creation always persists `workshop_id = null` and `status = "completed"`, regardless of request body.
- Completing a service order with `service_type` + `current_mileage` supplied creates exactly one `services_history` row with `workshop_id` set to the completing workshop and `status = "completed"`; optional `labor_cost`/`parts_cost`/`invoice_number`/`warranty_until_date`/`warranty_mileage` persist when supplied.
- Completing an order without `service_type`/`current_mileage`, or whose `vehicle_id` is null, completes normally and creates zero history rows.
- `GET /services-history/workshop` returns only the authenticated workshop's own rows (excludes other tenants' rows and same-tenant client-manual rows).
- `PUT`/`DELETE /services-history/{id}` on a workshop-authored row (`workshop_id is not None`) return `409 Conflict`; manual rows remain fully editable/deletable.

### 6.2 Backend Validation

Automated tests: `apps/backend/tests/test_services_history.py` (13 cases — manual-create forcing, completion auto-create present/skipped-missing-fields/skipped-null-vehicle, workshop-scoped listing isolation, read-only enforcement on update/delete, manual-row regression).

Recorded result on 2026-07-03:

```text
cd apps/backend && uv run pytest tests/test_services_history.py tests/test_service_order_lifecycle.py -q
13 passed
```

Migration verification:

```text
cd apps/backend && uv run alembic upgrade head && uv run alembic downgrade -1 && uv run alembic upgrade head
```

Recorded result: migration `6b1f2a9c4d3e` (down_revision `2cfd483fe51f`) applied, downgraded, and re-applied cleanly against the local Postgres instance, including the `cost` → `labor_cost` data-copy step.

Note: `apps/backend/tests/test_tenant_isolation.py` fails to collect on this branch due to a pre-existing, unrelated `.env`/`Settings` validation error (extra `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` fields) — confirmed present on the unmodified tree via `git stash` before this extension's changes, so it is not a regression introduced here.

### 6.3 Frontend Validation

```text
cd apps/web && npm run check
```

Recorded result on 2026-07-03: passed with no TypeScript errors.

### 6.4 Merge Gate Addendum

- Backend `services_history` extension test slice: passed (13/13)
- Migration upgrade/downgrade/upgrade cycle: passed
- Frontend typecheck: passed
- Manual UI verification (workshop completing an order with maintenance data, viewing `/workshop/service-history`, client seeing a read-only workshop-authored row): deferred to the same follow-up validation round as the rest of this phase's manual QA
- unrelated UI polish outside the touched lifecycle and dashboard surfaces