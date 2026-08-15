import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RealtimeSocket,
  type NotificationNewEvent,
  type OrderStatusChangeEvent,
} from './realtime-socket';

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  static readonly OPEN = 1;

  readyState = 0;

  sent: string[] = [];

  onopen: (() => void) | null = null;

  onclose: ((ev: { code: number }) => void) | null = null;

  onerror: (() => void) | null = null;

  onmessage: ((ev: { data: string }) => void) | null = null;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code = 1000): void {
    this.readyState = 3;
    this.onclose?.({ code });
  }

  // ── test helpers ────────────────────────────────────────────────────────

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  receive(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

function makeSocket(overrides: Partial<ConstructorParameters<typeof RealtimeSocket>[1]> = {}) {
  const handlers = {
    onEvent: vi.fn(),
    onStatusChange: vi.fn(),
    onAuthFailure: vi.fn(),
    ...overrides,
  };
  const socket = new RealtimeSocket('ws://test/messages/ws?token=t', handlers);
  return { socket, handlers };
}

const notificationEvent: NotificationNewEvent = {
  type: 'notification_new',
  notification_id: 7,
  title: 'Título',
  text: 'Corpo',
  timestamp: '2026-08-15T00:00:00Z',
};

const orderEvent: OrderStatusChangeEvent = {
  type: 'order_status_change',
  service_order_id: 1,
  old_status: 'pending',
  new_status: 'confirmed',
  actor_role: 'CLIENT',
  timestamp: '2026-08-15T00:00:00Z',
};

describe('RealtimeSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    // Node ≥22 ships a global WebSocket; the socket under test must use ours.
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('delivers events to subscribers of the matching type only', () => {
    const { socket } = makeSocket();
    const onNotification = vi.fn();
    const onOrder = vi.fn();
    socket.subscribe('notification_new', onNotification);
    socket.subscribe('order_status_change', onOrder);

    socket.connect();
    const ws = MockWebSocket.instances[0];
    ws.open();
    ws.receive(notificationEvent);
    ws.receive(orderEvent);

    expect(onNotification).toHaveBeenCalledTimes(1);
    expect(onNotification).toHaveBeenCalledWith(notificationEvent);
    expect(onOrder).toHaveBeenCalledTimes(1);
    expect(onOrder).toHaveBeenCalledWith(orderEvent);
  });

  it('stops delivery after unsubscribe', () => {
    const { socket } = makeSocket();
    const onNotification = vi.fn();
    const unsubscribe = socket.subscribe('notification_new', onNotification);
    socket.connect();
    const ws = MockWebSocket.instances[0];
    ws.open();

    unsubscribe();
    ws.receive(notificationEvent);

    expect(onNotification).not.toHaveBeenCalled();
  });

  it('reconnects with exponential backoff after an abnormal close', () => {
    const { socket, handlers } = makeSocket();
    socket.connect();
    const ws1 = MockWebSocket.instances[0];
    ws1.open();

    // A successful open resets the backoff: first abnormal close → base delay.
    ws1.close(1006); // server went away
    vi.advanceTimersByTime(999);
    expect(MockWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(2);

    const ws2 = MockWebSocket.instances[1];
    ws2.open();
    ws2.close(1006);
    vi.advanceTimersByTime(999);
    expect(MockWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(3);

    // Repeated failures WITHOUT a successful open double the delay:
    // 2s, 4s, 8s, 16s, capped at 30s.
    const closeAndWait = (delay: number) => {
      const current = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      current.close(1006);
      const before = MockWebSocket.instances.length;
      vi.advanceTimersByTime(delay - 1);
      expect(MockWebSocket.instances).toHaveLength(before);
      vi.advanceTimersByTime(1);
      expect(MockWebSocket.instances).toHaveLength(before + 1);
    };
    closeAndWait(2_000);
    closeAndWait(4_000);
    closeAndWait(8_000);
    closeAndWait(16_000);
    closeAndWait(30_000);

    expect(handlers.onStatusChange).toHaveBeenCalledWith('disconnected');
  });

  it('sends an application-level ping every ping interval', () => {
    const { socket } = makeSocket();
    socket.connect();
    const ws = MockWebSocket.instances[0];
    ws.open();

    vi.advanceTimersByTime(25_000);
    expect(JSON.parse(ws.sent[0])).toEqual({ type: 'ping' });
    vi.advanceTimersByTime(25_000);
    expect(ws.sent).toHaveLength(2);
    expect(JSON.parse(ws.sent[1])).toEqual({ type: 'ping' });
  });

  it('fires onAuthFailure on close code 1008 and does not reconnect', () => {
    const { socket, handlers } = makeSocket();
    socket.connect();
    const ws = MockWebSocket.instances[0];
    ws.open();

    ws.close(1008); // WS_1008_POLICY_VIOLATION from the backend

    expect(handlers.onAuthFailure).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('sends payloads only while the socket is open', () => {
    const { socket } = makeSocket();
    socket.connect();
    expect(MockWebSocket.instances).toHaveLength(1);
    const ws = MockWebSocket.instances[0];

    socket.send({ type: 'chat_message', receiver_id: 2, content: 'oi' });
    expect(ws.sent).toHaveLength(0);

    ws.open();
    socket.send({ type: 'chat_message', receiver_id: 2, content: 'oi' });
    expect(JSON.parse(ws.sent[0])).toEqual({
      type: 'chat_message',
      receiver_id: 2,
      content: 'oi',
    });
  });

  it('close() stops any pending reconnect', () => {
    const { socket } = makeSocket();
    socket.connect();
    const ws = MockWebSocket.instances[0];
    ws.open();
    ws.close(1006); // schedules a reconnect

    socket.close();
    vi.advanceTimersByTime(60_000);

    expect(MockWebSocket.instances).toHaveLength(1);
  });
});
