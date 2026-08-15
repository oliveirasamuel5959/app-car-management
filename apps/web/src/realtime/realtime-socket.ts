/**
 * Framework-free WebSocket client used by RealtimeProvider.
 *
 * One socket per authenticated user serves every page. Events are delivered to
 * typed subscribers; the socket reconnects with exponential backoff after
 * abnormal closes and treats a WS_1008_POLICY_VIOLATION close as an
 * authentication failure (no reconnect). See WEBSOCKET_EVENTS.md for the
 * backend event contract.
 */

// ─── Server → client events ──────────────────────────────────────────────────

export interface NewMessageEvent {
  type: 'new_message';
  message_id: string;
  sender_id: number;
  sender_name?: string;
  receiver_id: number;
  content: string | null;
  timestamp: string;
  message_type: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
}

export interface UserTypingEvent {
  type: 'user_typing';
  sender_id: number;
  sender_name?: string;
  typing: boolean;
}

export interface NotificationNewEvent {
  type: 'notification_new';
  notification_id: number;
  title: string;
  text: string;
  timestamp: string;
}

export interface OrderStatusChangeEvent {
  type: 'order_status_change';
  service_order_id: number;
  old_status: string;
  new_status: string;
  actor_role: string;
  timestamp: string;
}

export interface ScheduleStatusChangeEvent {
  type: 'schedule_status_change';
  schedule_id: number;
  new_status: string;
  timestamp: string;
}

export interface RatingReceivedEvent {
  type: 'rating_received';
  schedule_id: number;
  rating: number;
  timestamp: string;
}

export interface RealtimeErrorEvent {
  type: 'error';
  message: string;
}

export interface PongEvent {
  type: 'pong';
}

export type RealtimeEvent =
  | NewMessageEvent
  | UserTypingEvent
  | NotificationNewEvent
  | OrderStatusChangeEvent
  | ScheduleStatusChangeEvent
  | RatingReceivedEvent
  | RealtimeErrorEvent
  | PongEvent;

export type RealtimeEventType = RealtimeEvent['type'];

type Handler = (event: RealtimeEvent) => void;

const EVENT_TYPES = [
  'new_message',
  'user_typing',
  'notification_new',
  'order_status_change',
  'schedule_status_change',
  'rating_received',
  'error',
  'pong',
] as const;

export function isRealtimeEvent(value: unknown): value is RealtimeEvent {
  if (typeof value !== 'object' || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return (
    typeof type === 'string' &&
    (EVENT_TYPES as readonly string[]).includes(type)
  );
}

// ─── Client → server payloads ────────────────────────────────────────────────

export type OutgoingPayload =
  | { type: 'chat_message'; receiver_id: number; content: string; message_type?: string }
  | { type: 'typing_start' | 'typing_stop'; receiver_id: number }
  | { type: 'ping' };

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected';

// ─── Socket ──────────────────────────────────────────────────────────────────

export interface RealtimeSocketOptions {
  onStatusChange: (status: RealtimeStatus) => void;
  /** Close code 1008 (policy violation) means the JWT was rejected. */
  onAuthFailure: () => void;
  /** Optional global listener (used by RealtimeProvider to fan out to hooks). */
  onEvent?: (event: RealtimeEvent) => void;
  pingIntervalMs?: number;
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
}

export class RealtimeSocket {
  private ws: WebSocket | null = null;

  private statusValue: RealtimeStatus = 'disconnected';

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private pingTimer: ReturnType<typeof setInterval> | null = null;

  private reconnectAttempt = 0;

  private closed = false;

  private readonly handlers = new Map<RealtimeEventType, Set<Handler>>();

  private readonly url: string;

  private readonly options: RealtimeSocketOptions;

  constructor(url: string, options: RealtimeSocketOptions) {
    this.url = url;
    this.options = options;
  }

  get status(): RealtimeStatus {
    return this.statusValue;
  }

  connect(): void {
    if (this.closed) return;
    this.setStatus('connecting');
    this.ws = new WebSocket(this.url);
    const ws = this.ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.setStatus('connected');
      this.startPing();
    };

    ws.onmessage = (event) => {
      try {
        const data: unknown = JSON.parse(String(event.data));
        if (isRealtimeEvent(data)) this.dispatch(data);
      } catch {
        // ignore malformed frames
      }
    };

    // No onerror handling: browsers fire onclose after an error, and the
    // close handler owns the reconnect logic.

    ws.onclose = (event) => {
      this.stopPing();
      if (this.closed) return;
      if (event.code === 1008) {
        // JWT rejected by the backend — do not reconnect.
        this.closed = true;
        this.setStatus('disconnected');
        this.options.onAuthFailure();
        return;
      }
      this.setStatus('disconnected');
      this.scheduleReconnect();
    };
  }

  send(payload: OutgoingPayload): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
    this.ws?.close();
    this.ws = null;
  }

  subscribe<T extends RealtimeEventType>(
    type: T,
    handler: (event: Extract<RealtimeEvent, { type: T }>) => void,
  ): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    const wrapped = handler as Handler;
    set.add(wrapped);
    return () => {
      set?.delete(wrapped);
    };
  }

  private setStatus(status: RealtimeStatus): void {
    this.statusValue = status;
    this.options.onStatusChange(status);
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer) return;
    const base = this.options.reconnectBaseMs ?? 1_000;
    const max = this.options.reconnectMaxMs ?? 30_000;
    const delay = Math.min(base * 2 ** this.reconnectAttempt, max);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    const interval = this.options.pingIntervalMs ?? 25_000;
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, interval);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private dispatch(event: RealtimeEvent): void {
    this.options.onEvent?.(event);
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;
    for (const handler of [...handlers]) {
      handler(event);
    }
  }
}
