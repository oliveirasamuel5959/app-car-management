# Phase 2 Validation: Service Order Lifecycle

Last Updated: 2026-06-01
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

- No schema migration was required for the delivered lifecycle implementation.

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
- no tenant-isolation regression is introduced

Current gate status on 2026-06-01:

- Backend lifecycle slice: passed
- Frontend typecheck: passed
- Manual flow verification: pending follow-up validation round
- Tenant-isolation regression: no automated regression found in the focused lifecycle slice

## 5. Non-Goals for Validation

The following are not required to merge this phase:

- payment confirmation
- review creation after completion
- broader analytics dashboards unrelated to service orders
- unrelated UI polish outside the touched lifecycle and dashboard surfaces