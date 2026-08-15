# Validation: WebSocket Real-Time

Last Updated: 2026-08-15
Branch: feature/2026-08-15-websocket-realtime
Status: Planned

Purpose: Define the evidence required to confirm the WebSocket real-time feature
is correct, tenant-safe, and ready to merge, and enumerate the tests to write
and run for backend and frontend. References [requirements.md](requirements.md)
and the task groups of [plan.md](plan.md). Exit criterion of
[`specs/roadmap.md`](../../roadmap.md) Phase 5: live chat, live notifications,
and status-change events all delivered over a tenant-scoped WebSocket with no
cross-tenant leakage.

---

## V1 — Backend: tenant-scoped manager + heartbeat (TG1)

- [ ] **1.1** `apps/backend/src/core/websocket_manager.py` keys
  `active_connections` by `(tenant_id, user_id) → set[WebSocket]`;
  `connect`/`disconnect`/`is_online`/`send_to_user` all require `tenant_id`.
- [ ] **1.2** A single module-level `manager` instance in `core/` is imported by
  the WS route and by the services (no per-module instances).
- [ ] **1.3** The WS route answers `{"type": "ping"}` with `{"type": "pong"}`.
- [ ] **1.4** No `manager.` call site outside the WS route and core exists:
  ```bash
  cd apps/backend && grep -rn "manager\." src/api/routes/ | grep -v "messages.py"
  # expected: no output
  ```
- [ ] **1.5** Manager tests pass (multi-socket per user, per-socket disconnect,
  broadcast to all sockets, wrong-tenant key misses, dead-socket pruning):
  ```bash
  cd apps/backend && uv run pytest tests/test_websocket_manager.py -q
  ```

---

## V2 — Backend: WS event pushes from the service layer (TG2)

- [ ] **2.1** `new_message` is pushed from `MessageService.send_message`
  (not from the route); file-upload pushes go through the same service path.
- [ ] **2.2** `notification_new` is pushed after every notification persist in
  `apps/backend/src/services/notifications.py`.
- [ ] **2.3** `order_status_change` is pushed on every service-order lifecycle
  transition in `apps/backend/src/services/services.py` (create, accept, start,
  complete, cancel).
- [ ] **2.4** `schedule_status_change` is pushed from `ScheduleService`; the
  route-level helpers in `apps/backend/src/api/routes/schedules.py` (L160, L301)
  are removed from the route layer.
- [ ] **2.5** `rating_received` is pushed from `WorkshopRatingService`;
  `_notify_workshop_new_rating` no longer lives in the route.
- [ ] **2.6** Realtime event tests pass, including cross-tenant isolation:
  ```bash
  cd apps/backend && uv run pytest tests/test_realtime_events.py -q
  ```
  Cases covered (mirror `tests/test_tenant_isolation.py` style, SQLite
  in-memory):
  1. Notification creation → envelope present for the recipient's
     `(tenant_id, user_id)` key.
  2. Order status transition → `order_status_change` for both parties of the
     same tenant.
  3. Tenant A event never lands under a tenant B manager key.
  4. One end-to-end case: FastAPI `TestClient` `websocket_connect` on
     `/messages/ws?token=...` receives a pushed event.
- [ ] **2.7** Existing suites show no regression:
  ```bash
  cd apps/backend && uv run pytest -q
  ```

---

## V3 — Frontend: shared realtime infrastructure (TG3)

- [ ] **3.1** `RealtimeProvider` exists (typed `RealtimeEvent` union, no `any`)
  and is mounted in `apps/web/src/App.tsx` inside `AuthProvider`.
- [ ] **3.2** `useRealtime()` exposes `subscribe`/`unsubscribe` and connection
  status; reconnect uses exponential backoff (1s → 30s cap); `ping` sent every
  ~25s; close on logout; 1008/401 clears the token and redirects to `/login`.
- [ ] **3.3** `WS_BASE_URL` in `apps/web/src/services/message-service.tsx` reads
  `import.meta.env.VITE_WS_BASE_URL` with default `ws://localhost:5500`.
- [ ] **3.4** Neither chat page contains `new WebSocket`:
  ```bash
  cd apps/web && grep -rn "new WebSocket" src/ | grep -v realtime
  # expected: no output outside the realtime module
  ```
- [ ] **3.5** Type check and Vitest slice pass:
  ```bash
  cd apps/web && npm run check && npm run test
  ```

---

## V4 — Frontend: live surfaces (TG4)

- [ ] **4.1** The notification bell refetches on `notification_new` (30s
  polling retained as fallback).
- [ ] **4.2** MUI Snackbar toasts appear on `order_status_change`,
  `schedule_status_change`, and `rating_received`, with React Query invalidation
  of the affected orders / schedules / dashboard queries.
- [ ] **4.3** Build passes:
  ```bash
  cd apps/web && npm run build
  ```
- [ ] **4.4** Manual two-browser scenario passes:
  1. Start Postgres (`docker compose -f apps/docker/docker-compose.yml up -d
     db`), backend (`cd apps/backend && make run`), web (`cd apps/web && npm
     run dev`).
  2. Browser A: workshop user; Browser B: client user of the same tenant.
  3. Workshop sends a chat message → appears in B without refresh; typing
     indicator shows in B.
  4. Workshop creates/transitions a service order → B sees a toast + a new
     bell entry without refresh; B accepts → A sees the toast.
  5. Client submits a rating → workshop sees `rating_received` toast.
  6. Stop the backend: bell still refreshes via polling; chat pages degrade
     quietly (no error spam). Restart the backend: sockets reconnect without a
     page reload.
  7. Cross-tenant sanity: a user of a second tenant sees none of the events
     above.

---

## V5 — Records & gates (TG5)

- [ ] **5.1** `apps/web/WEBSOCKET_EVENTS.md` documents every event type
  (direction, payload fields, who receives, frontend reaction), and
  `apps/web/FRONTEND_API_GUIDE.md` links to it.
- [ ] **5.2** Root `CHANGELOG.md` has a dated `## 2026-08-15` entry for this
  phase.
- [ ] **5.3** `specs/roadmap.md` marks Phase 5 Complete with the spec link
  `specs/2026-08-15-websocket-realtime/` and the partial/in-progress section is
  refreshed.
- [ ] **5.4** Full bars green:
  ```bash
  cd apps/backend && uv run pytest -q
  cd apps/web && npm run check && npm run test && npm run build
  ```

---

## Full validation flow

```bash
# 1. Backend
cd apps/backend
uv run pytest tests/test_websocket_manager.py -q
uv run pytest tests/test_realtime_events.py -q
uv run pytest -q                       # no regression (tenant isolation + lifecycle + slices)

# 2. Frontend
cd ../web
npm run check
npm run test
npm run build

# 3. Route-layer push audit (expect no output)
cd ../backend && grep -rn "manager\." src/api/routes/ | grep -v "messages.py"

# 4. Manual two-browser scenario — V4.4
```

---

## Summary

| Verification | Description | Result |
|--------------|-------------|--------|
| V1 | Tenant-scoped manager, singleton, ping/pong (TG1) | ✅ / ❌ |
| V2 | Service-layer pushes + cross-tenant isolation tests (TG2) | ✅ / ❌ |
| V3 | Shared frontend provider/hook + chat page migration (TG3) | ✅ / ❌ |
| V4 | Live bell, toasts, invalidation, manual scenario (TG4) | ✅ / ❌ |
| V5 | Event contract doc, CHANGELOG, roadmap, full bars (TG5) | ✅ / ❌ |

> **Phase 5 closed when:** all checks V1–V5 = ✅, the cross-tenant isolation
> tests pass, the two-browser scenario succeeds, and the existing suite shows no
> regression. **Phases 1–4 must stay green.**
