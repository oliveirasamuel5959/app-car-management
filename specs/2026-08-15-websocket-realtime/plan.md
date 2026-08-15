# Plan: WebSocket Real-Time

Last Updated: 2026-08-15
Branch: feature/2026-08-15-websocket-realtime
Status: Planned

Feature Context: Complete realtime delivery across chat, notifications, and
service-order/schedule status changes. Source: roadmap Phase 5
(`specs/roadmap.md`), reconciled with the codebase below. The chat WebSocket
(`/messages/ws?token=`) already works per chat page with JWT auth; this plan
makes the connection tenant-scoped and multi-tab-safe, adds keepalive/reconnect,
pushes notification and status-change events from the service layer, and
migrates the frontend onto one shared typed socket provider with a live bell and
toasts. Requirements and decisions: [requirements.md](requirements.md).

## Reconciliation with the codebase (why this plan differs from the roadmap brief)

- Roadmap 5.1 says "extend WebSocketManager (already exists)". It exists but is
  user_id-keyed only (`dict[int, WebSocket]` in
  `apps/backend/src/core/websocket_manager.py:14`): no tenant key, one socket
  per user, no heartbeat. This plan rekeys it to
  `(tenant_id, user_id) → set[WebSocket]` rather than rewriting it.
- Roadmap 5.2 proposes `WebSocket /messages/ws?tenant={slug}`. The endpoint
  already exists with `?token=<jwt>`, and the tenant is already in the JWT —
  the slug param is redundant. One endpoint stays; the client filters events by
  `type`.
- Roadmap 5.2's `workshop_accepted` event has no current flow (acceptance is a
  service-order lifecycle transition). Reconciled event set:
  `notification_new`, `order_status_change`, `schedule_status_change`,
  `rating_received` — matching the actual notification call sites.
- Roadmap 5.3's `useWebSocket` hook becomes `RealtimeProvider` + `useRealtime()`
  (one socket per user serving all pages). Both chat pages already open raw
  per-page sockets (`apps/web/src/pages/client/chat-page.tsx:56-114`,
  `apps/web/src/pages/workshop/chat-page.tsx`) and are migrated onto the hook.
- Chat pushes (`new_message`/`user_typing`) currently happen in the WS route
  (`apps/backend/src/api/routes/messages.py:88-89`). They move into the service
  layer (decision D3) — behavior preserved, single code path.
- The notification bell already exists with 30s polling
  (`apps/web/src/context/notifications-context.tsx:88-94`). Polling is kept as a
  fallback; WS push accelerates it. Missed events are covered by REST refetch
  (decision D7).

## Confirmed decisions (user)

1. Feature name `websocket-realtime`; branch `feature/2026-08-15-websocket-realtime`;
   specs in English.
2. Full Phase 5 scope — all four capability groups: tenant-scoped manager +
   reconnect, live notification push, status-change events, chat hardening.
3. Spec-writing deliverable commits: one commit + push per spec file. Below,
   each task group (TG) has its own verification + commit for implementation.

## Reference implementation to mirror

- Manager to extend: `apps/backend/src/core/websocket_manager.py`
- WS route + current envelopes: `apps/backend/src/api/routes/messages.py`
  (L34-118); incoming schema `apps/backend/src/schemas/messages.py`
  (`WSIncomingMessage`)
- Service templates: `apps/backend/src/services/notifications.py`,
  `apps/backend/src/services/messages.py`, `apps/backend/src/services/schedules.py`
- Status-change notification call sites: `apps/backend/src/services/services.py`
  (order lifecycle), `apps/backend/src/api/routes/schedules.py` (L160, L301 —
  route-level helpers to move into `ScheduleService`),
  `apps/backend/src/api/routes/workshop_ratings.py` (L36
  `_notify_workshop_new_rating` — move into `WorkshopRatingService`)
- Frontend context template: `apps/web/src/context/notifications-context.tsx`;
  provider mounting: `apps/web/src/App.tsx`
- Chat pages to migrate: `apps/web/src/pages/client/chat-page.tsx`,
  `apps/web/src/pages/workshop/chat-page.tsx`; WS URL helper:
  `apps/web/src/services/message-service.tsx` (`WS_BASE_URL`, `getWsUrl`)
- Test templates: `apps/backend/tests/test_tenant_isolation.py` (SQLite
  in-memory slice, direct service/repo calls), search Vitest slice in
  `apps/web`

## TG1 — Backend: tenant-scoped manager + heartbeat

- **1.1** Rekey `ConnectionManager` in
  `apps/backend/src/core/websocket_manager.py` to
  `dict[tuple[UUID, int], set[WebSocket]]`; update `connect`, `disconnect`,
  `is_online`, `send_to_user` to take `(tenant_id, user_id)`; `send_to_user`
  broadcasts to all sockets in the set and prunes ones whose send failed.
- **1.2** Move the singleton into `core/` as a module-level
  `manager = ConnectionManager()` so services and the route share one instance;
  the messages route imports it instead of instantiating its own.
- **1.3** Add application-level keepalive to the WS route: handle
  `{"type": "ping"}` → reply `{"type": "pong"}` (client-initiated, ~25s
  interval on the frontend).
- **1.4** Update all existing `manager.` call sites (messages route connect /
  disconnect / send) with the new signatures; grep to confirm no stragglers.
- **1.5** Tests `apps/backend/tests/test_websocket_manager.py`: two sockets for
  the same user coexist (set); disconnecting one keeps the other; `send_to_user`
  delivers to all of the user's sockets; a different `tenant_id` key misses;
  failed send prunes only the dead socket.
- **Verificação:** `cd apps/backend && uv run pytest tests/test_websocket_manager.py -q`
- **Commit:** `feat(ws): tenant-scoped multi-connection manager + ping/pong keepalive (Phase 5)`

## TG2 — Backend: WS event pushes from the service layer

- **2.1** Move the chat push into `MessageService.send_message`
  (`apps/backend/src/services/messages.py`): after persist, push the existing
  `new_message` envelope to receiver and sender with `tenant_id`. The WS route
  keeps only socket receive / typing relay; the file-upload push
  (`messages.py:179-180`) moves to the service path as well.
- **2.2** Push `notification_new` after persist in the notification creation
  helpers (`apps/backend/src/services/notifications.py`): envelope
  `{type, notification_id, title, text, timestamp}` to the recipient, keyed by
  the notification's tenant.
- **2.3** Push `order_status_change` in the service-order lifecycle transitions
  (`apps/backend/src/services/services.py`) to the same recipient list the
  notification fan-out uses: `{type, service_order_id, old_status, new_status,
  actor_role, timestamp}`.
- **2.4** Move the schedule notification creation helpers out of the route
  (`apps/backend/src/api/routes/schedules.py:160,301`) into
  `ScheduleService` and push `schedule_status_change` there.
- **2.5** Move `_notify_workshop_new_rating` (`workshop_ratings.py:36`) into
  `WorkshopRatingService` and push `rating_received`.
- **2.6** Tests `apps/backend/tests/test_realtime_events.py`: service-level
  calls result in envelopes on the manager registry for the right
  `(tenant_id, user_id)` keys; cross-tenant negative (tenant A event never
  lands under a tenant B key); one end-to-end case with FastAPI `TestClient`
  `websocket_connect`.
- **Verificação:** `cd apps/backend && uv run pytest tests/test_realtime_events.py -q`
- **Commit:** `feat(ws): service-layer pushes — notification_new + order/schedule/rating events (Phase 5)`

## TG3 — Frontend: shared realtime infrastructure

- **3.1** Make `WS_BASE_URL` env-driven in
  `apps/web/src/services/message-service.tsx`:
  `import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:5500"` (same convention
  as `VITE_GOOGLE_MAPS_API_KEY`).
- **3.2** Create the realtime context (`apps/web/src/context/`): a typed
  `RealtimeEvent` union (`new_message`, `user_typing`, `notification_new`,
  `order_status_change`, `schedule_status_change`, `rating_received`, `error`,
  `pong`), `RealtimeProvider` owning one socket per authenticated user (token
  from `localStorage`), and `useRealtime()` exposing
  `subscribe(type, handler)` / `unsubscribe` + connection status. Reconnect with
  exponential backoff (1s → 30s cap), `ping` every 25s, close on logout; on
  1008/401 clear token and redirect `/login`. No `any` — `unknown` + guards.
- **3.3** Mount `RealtimeProvider` in `apps/web/src/App.tsx` inside
  `AuthProvider`/`NotificationProvider`.
- **3.4** Refactor both chat pages onto the hook: delete per-page `new
  WebSocket` blocks, subscribe to `new_message` (dedupe by `message_id`) and
  `user_typing`, send `chat_message`/`typing_start`/`typing_stop` through the
  shared socket.
- **3.5** Vitest slice for the hook/provider with a mocked WebSocket
  (subscribe/unsubscribe registry, reconnect backoff, ping interval, 1008 →
  logout) — mirror the search Vitest slice setup.
- **Verificação:** `cd apps/web && npm run check && npm run test`
- **Commit:** `feat(web): shared RealtimeProvider + useRealtime hook with reconnect; chat pages migrated (Phase 5)`

## TG4 — Frontend: live surfaces

- **4.1** Bell + notifications context subscribe to `notification_new` and
  invalidate/refetch the list on event (30s polling stays as fallback).
- **4.2** MUI Snackbar toasts on `order_status_change`,
  `schedule_status_change`, `rating_received`, plus React Query invalidation of
  the affected orders / schedules / dashboard queries on both client and
  workshop sides.
- **4.3** Verify offline behavior: socket down → polling still refreshes bell;
  reconnect is silent (no error spam).
- **4.4** Document the manual two-browser verification scenario (client +
  workshop) in the validation checklist (see validation.md V4).
- **Verificação:** `cd apps/web && npm run check && npm run build`
- **Commit:** `feat(web): live bell, toasts, and query invalidation on realtime events (Phase 5)`

## TG5 — Records & gates

- **5.1** Write `apps/web/WEBSOCKET_EVENTS.md`: contract table per event type
  (direction, payload fields, who receives, frontend reaction). Extend
  `apps/web/FRONTEND_API_GUIDE.md` with a pointer.
- **5.2** Add a dated `## 2026-08-15` entry to the root `CHANGELOG.md` per repo
  convention.
- **5.3** Update `specs/roadmap.md`: Phase 5 marked Complete with spec link
  `specs/2026-08-15-websocket-realtime/` (mirror the Phase 3/4 status entry
  style); refresh the partial/in-progress section.
- **5.4** Full bars: `cd apps/backend && uv run pytest -q` (tenant isolation +
  lifecycle + new slices), `cd apps/web && npm run check && npm run test &&
  npm run build`.
- **Verificação:** all bars green; `git status` clean on the branch.
- **Commit:** `docs: WebSocket event contract + changelog and roadmap status (Phase 5)` → push
