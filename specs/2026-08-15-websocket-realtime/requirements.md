# Requirements: WebSocket Real-Time

Last Updated: 2026-08-15
Branch: feature/2026-08-15-websocket-realtime
Status: Planned

Context: Turns roadmap Phase 5 (WebSocket Real-Time) into executable requirements,
reconciled with the current codebase. Real-time already partially exists: chat
works over `WS /messages/ws?token=<jwt>` with per-connection JWT auth
(`authenticate_websocket`), the two chat pages open their own raw sockets, and
messages are persisted-then-pushed. But the `ConnectionManager` is keyed by
user_id only (no tenant scoping, one socket per user, no heartbeat/reconnect),
all notification pushes are DB-only (the bell polls every 30s), and no
service-order / schedule / rating events reach the client live. This phase
completes realtime: a tenant-scoped, multi-connection manager with keepalive,
service-layer WS pushes for notifications and status changes, a shared typed
frontend provider with reconnect, and live bell/toast/refresh surfaces. Follows
the multi-tenancy foundation (`specs/2026-05-30-multi-tenancy-foundation`), the
service-order lifecycle (`specs/2026-06-01-service-order-lifecycle`), scheduling
(`specs/2026-07-22-agendamento-servicos`), reviews
(`specs/2026-08-14-reviews-ratings`), and search
(`specs/2026-08-14-search-filtering`).

## 1. Scope

### In Scope

- **Tenant-scoped `ConnectionManager`** (`apps/backend/src/core/websocket_manager.py`):
  rekey from `dict[int, WebSocket]` to `(tenant_id, user_id) → set[WebSocket]`,
  supporting multiple connections per user (multiple tabs). `send_to_user`
  becomes tenant-aware and broadcasts to all of a user's connections. Adds
  application-level `ping`/`pong` keepalive and prunes connections whose send
  failed. The singleton moves to a module-level instance in `core/` so services
  can import it (the messages route currently owns the only instance).
- **Service-layer WS event pushes** (routes stop touching the manager except the
  WS route itself):
  - `notification_new` — pushed by the notification creation path
    (`apps/backend/src/services/notifications.py`) for every persisted
    notification.
  - `order_status_change` — pushed by the service-order lifecycle transitions in
    `apps/backend/src/services/services.py` (create, accept, start, complete,
    cancel).
  - `schedule_status_change` — pushed by schedule status notification paths
    (`apps/backend/src/api/routes/schedules.py` call sites move to the service
    layer).
  - `rating_received` — pushed when a workshop rating is created
    (`apps/backend/src/api/routes/workshop_ratings.py` call site).
  - The existing chat push (currently in the route,
    `apps/backend/src/api/routes/messages.py:88-89`) moves into
    `MessageService.send_message`.
  - All pushes carry the sender's `tenant_id`; recipients are resolved
    tenant-scoped. No cross-tenant broadcast.
- **Shared event envelope**: reuse the existing flat `{"type": ..., ...payload}`
  shape (`new_message`, `user_typing`, `error` already exist). New types:
  `notification_new`, `order_status_change`, `schedule_status_change`,
  `rating_received`, plus `ping`/`pong`. Payload fields camelCase with an ISO-8601
  `timestamp`. Existing type names and payloads stay backward compatible.
- **Frontend shared realtime infrastructure**:
  - `RealtimeProvider` context mounted inside `AuthProvider`
    (`apps/web/src/App.tsx`): one socket per authenticated user, token from
    `localStorage`, closed on logout.
  - `useRealtime()` hook exposing typed `subscribe(type, handler)` /
    `unsubscribe` plus connection status; exponential-backoff reconnect (1s →
    30s cap); on WS 1008/401 the session is cleared and the user redirected to
    `/login`.
  - `WS_BASE_URL` in `apps/web/src/services/message-service.tsx` becomes
    Vite-env driven (`VITE_WS_BASE_URL`, default `ws://localhost:5500`), same
    convention as `VITE_GOOGLE_MAPS_API_KEY`.
- **Live frontend surfaces**:
  - Notification bell (`apps/web/src/components/navigation/notification-bell.tsx`
    + `notifications-context.tsx`) subscribes to `notification_new` and refetches
    on event; the existing 30s polling stays as fallback/backstop.
  - MUI Snackbar toasts on `order_status_change`, `schedule_status_change`, and
    `rating_received`, plus React Query invalidation of the affected
    orders/schedules/dashboard queries.
  - Both chat pages (`apps/web/src/pages/client/chat-page.tsx`,
    `apps/web/src/pages/workshop/chat-page.tsx`) are refactored onto the shared
    hook: per-page raw sockets removed, message dedupe by `message_id`, typing
    events preserved.
- **Tests and records**: backend pytest slices for the manager and event pushes
  (including cross-tenant negative cases), a Vitest slice for the provider/hook
  and bell subscription, a WebSocket event contract doc, CHANGELOG entry, and
  roadmap Phase 5 status update.

### Out of Scope (explicitly)

- Conversations-list endpoint and unread counts / read receipts (messages list
  pages keep deriving conversations from services/workshop-client data).
- Online presence indicators (`is_online` remains server-internal).
- Offline outbox / message queue; offline delivery stays DB persistence +
  refetch-on-open (existing pattern).
- Redis pub/sub or multi-instance fan-out (single backend instance assumption,
  documented).
- Native push / SMS notifications.
- Payment events (Phase 6).
- Server-side mid-connection re-auth (auth at connect only, per D6).
- Protocol-level ping/pong frames (application-level JSON `ping`/`pong` only).

## 2. Decisions

### D1 — Manager keyed by (tenant_id, user_id), set of sockets

`ConnectionManager.active_connections: dict[tuple[UUID, int], set[WebSocket]]`.
`connect(websocket, tenant_id, user_id)` adds to the set; `disconnect` removes
one socket, keeping the others. `send_to_user(tenant_id, user_id, payload)`
iterates the set, sending to each live socket and pruning failed ones. Tenant is
a first-class key, not a payload field, so a missing tenant_id is impossible to
forget at the call site.

### D2 — Single WS endpoint reused

`/messages/ws?token=` remains the only socket; the client filters by `type` on
one connection instead of opening per-feature sockets. No new
`/notifications/ws` endpoint. The route stays whitelisted in
`AuthMiddleware.public_routes` (`apps/backend/src/main.py:85`) since WS auth is
handled inside the handler.

### D3 — All pushes from the service layer

Routes stop importing/using the manager directly (except the WS route). The chat
push moves from the route into `MessageService.send_message`; notification
creation helpers in `services/notifications.py` push after persist; the
service-order transition paths push after status change; schedule and rating
creation paths push after their notifications are persisted. This keeps the
four-layer flow (controller → service) intact and gives every future caller the
push for free.

### D4 — Flat envelope with `type` discriminator

New events follow the existing shape:
`{"type": "notification_new", <payload>, "timestamp": "<ISO-8601>"}`. The four
new types carry the minimum the UI needs (e.g. `notification_new` carries
`notification_id` plus the notification's display fields `title`/`text`;
`order_status_change` carries `service_order_id`, `old_status`, `new_status`,
`actor_role`). Existing
`new_message`/`user_typing`/`error` types and payloads are untouched — frontend
listeners migrate without backend breaking changes.

### D5 — Application-level heartbeat

Client sends `{"type": "ping"}` every ~25s; server answers
`{"type": "pong"}`. A send failure or unanswered ping marks the socket dead on
the client (triggering reconnect); the server prunes a connection when its send
fails. Starlette does not expose protocol-level ping frames portably, so JSON
ping/pong is the pragmatic choice.

### D6 — Auth at connect only; reconnect handles expiry

Long-lived sockets may outlive the JWT. The server keeps the current
connect-time check (`authenticate_websocket`, close with `WS_1008_POLICY_VIOLATION`
on failure) and does not re-validate mid-connection (MVP). The client treats any
close (including 1008) as a session/connection problem: clear token, redirect to
`/login`, reconnect with exponential backoff otherwise. This is the same
trust-after-connect model the existing chat already uses.

### D7 — Single instance, no queue

No Redis pub/sub, no outbox. Delivery guarantees are: persist first, push best
effort; missed events are covered by REST refetch (polling fallback and
fetch-on-open). Multi-instance fan-out is documented as future work (tech-stack
§4 Redis Pub/Sub).

## 3. Constraints

- **Multi-tenancy (critical):** every push is tenant-scoped. The manager key
  carries tenant_id; recipient resolution uses the event's tenant; the
  cross-tenant isolation test pattern from `tests/test_tenant_isolation.py` is
  extended to realtime events (tenant A user never receives tenant B events).
- **Four-layer flow:** controllers → services → repositories; WS pushes live in
  services (D3). No new DB access outside repositories.
- **Frontend:** no `any` — typed event union + payload types for every new event
  (`unknown` + guards per project convention). No new npm dependencies (MUI
  Snackbar already present).
- **Backend rules** (`apps/.claude/rules/backend-api.md`): new endpoints keep
  request/response schemas (the WS envelope is the schema); delivery failures
  logged with the shared logger (already the case in
  `websocket_manager.py:45`).
- **No new backend dependencies.** Everything ships on FastAPI/SQLAlchemy +
  the existing `core/websocket_manager.py`.
- Existing suites stay green: `tests/test_tenant_isolation.py`,
  `tests/test_service_order_lifecycle.py`, the search and ratings slices, and
  the frontend Vitest slice.

## 4. Risks & Observations

- **Singleton ownership:** the manager instance currently lives in
  `api/routes/messages.py:28`. Moving it to a module-level instance in
  `core/websocket_manager.py` (or a `core/ws.py` re-export) must be done so
  every service imports the same object; the WS route keeps using it.
- **Circular imports:** `core/websocket_manager.py` must keep importing only
  stdlib/FastAPI — never `services` or `models`. Services import core; core never
  imports services (already true today).
- **Multiple tabs:** the set-based registry means one tab closing must not kill
  the user's other sockets. `send_to_user` failures prune only the dead socket.
- **Test environment:** existing backend slices run on SQLite in-memory and call
  services/repos directly. Event-push tests can follow that pattern (call the
  service, assert on the manager registry) and/or use FastAPI `TestClient`
  `websocket_connect` for an end-to-end socket assertion.
- **`services.py` notification fan-out:** order status changes notify both
  parties; the push must iterate the same recipient list the notification
  creation uses, all within one tenant.
- **Race with polling:** the bell may receive an event before/after the 30s
  poll refetch — dedupe by notification id (the REST list is the source of
  truth; the WS event only triggers a refetch/invalidation, per scope above).
