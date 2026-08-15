# WebSocket Event Contract (Phase 5)

Single endpoint: `WS /messages/ws?token=<jwt>` (backend on `:5500`). The JWT is
validated per connection (`authenticate_websocket`); an invalid/missing token
closes the socket with `1008` (policy violation). One socket per authenticated
user serves every feature — clients filter events by `type`. Frames are flat
JSON objects with a `type` discriminator and camelCase payload fields.

The frontend consumes these through `RealtimeProvider` / `useRealtime()`
(`src/context/realtime-context.tsx`), implemented by the framework-free
`RealtimeSocket` (`src/realtime/realtime-socket.ts`): reconnect with
exponential backoff (1s → 30s cap, reset on successful open), an
application-level `ping` every 25s, and session cleanup + redirect to `/login`
on close code `1008`.

## Server → client events

| Type | Payload | Who receives | Frontend reaction |
|------|---------|--------------|-------------------|
| `new_message` | `message_id`, `sender_id`, `sender_name?`, `receiver_id`, `content`, `timestamp` (ISO-8601), `message_type`, `file_url?`, `file_name?`, `file_size?`, `mime_type?` | Recipient and sender (echo), keyed by each user's own tenant | Chat pages append the message (dedupe by `message_id`) |
| `user_typing` | `sender_id`, `sender_name?`, `typing` (bool) | Chat counterpart | Chat pages show/hide the "digitando..." indicator |
| `notification_new` | `notification_id`, `title`, `text`, `timestamp` | The notification's recipient | Notification context refetches `/notifications` (bell); 30s polling stays as fallback |
| `order_status_change` | `service_order_id`, `old_status`, `new_status`, `actor_role`, `timestamp` | The other party of the service order (same tenant) | Global toast ("Pedido #N atualizado para: …") + dashboards/orders pages refetch |
| `schedule_status_change` | `schedule_id`, `new_status`, `timestamp` | Workshop owner (new request) or the client (accept/reject) | Global toast + both schedules pages refetch |
| `rating_received` | `schedule_id`, `rating`, `timestamp` | Workshop owner | Global toast ("Nova avaliação recebida: N estrelas") |
| `error` | `message` | The socket that sent an invalid frame | Currently no subscriber; frames are logged by the backend |
| `pong` | — | The socket that pinged | Keepalive only; no UI |

All pushes are best effort: events are persisted first (message / notification
rows) and the WS push never fails the HTTP request. Missed events are covered
by REST refetch (fetch on socket open, polling fallback).

## Client → server messages

| Type | Payload | Effect |
|------|---------|--------|
| `chat_message` | `receiver_id`, `content` (required, ≤4000 chars), `message_type?` (`text` default) | Persists the message and pushes `new_message` to both parties |
| `typing_start` / `typing_stop` | `receiver_id` | Relays `user_typing` to the counterpart |
| `ping` | — | Server replies `pong` (application-level keepalive) |

## Backend delivery rules

- The connection registry is keyed by `(tenant_id, user_id)` with a set of
  sockets per user (multi-tab safe). Sends broadcast to all of the user's
  sockets; a failed socket is pruned.
- Every push is tenant-scoped: recipients are resolved from the event's
  tenant, and a user of another tenant can never receive it (covered by
  `tests/test_realtime_events.py`).
- Pushes live in the service layer (`src/core/ws_push.py` helper, used by
  `services/messages.py`, `services/notifications.py`, `services/services.py`,
  `services/schedules.py`, `services/workshop_rating.py`).
- Single backend instance: no Redis pub/sub or outbox (future work,
  tech-stack §4).
