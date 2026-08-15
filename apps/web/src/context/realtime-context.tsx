import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  RealtimeSocket,
  type OutgoingPayload,
  type RealtimeEvent,
  type RealtimeEventType,
  type RealtimeStatus,
} from '../realtime/realtime-socket';
import { useAuth } from './auth-context';
import { messageService } from '../services/message-service';

type Handler = (event: RealtimeEvent) => void;

interface RealtimeContextType {
  connected: boolean;
  send: (payload: OutgoingPayload) => void;
  subscribe: <T extends RealtimeEventType>(
    type: T,
    handler: (event: Extract<RealtimeEvent, { type: T }>) => void,
  ) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

function clearSessionAndRedirect(): void {
  // WS_1008_POLICY_VIOLATION: the backend rejected the token. Mirror the
  // 401 handling in services/api.tsx.
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  window.location.assign('/login');
}

export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const socketRef = useRef<RealtimeSocket | null>(null);
  // Subscriptions live at provider level so they survive socket recreation
  // (reconnects) and exist before the socket opens.
  const listenersRef = useRef(new Map<RealtimeEventType, Set<Handler>>());

  const subscribe = useCallback(
    <T extends RealtimeEventType>(
      type: T,
      handler: (event: Extract<RealtimeEvent, { type: T }>) => void,
    ) => {
      let set = listenersRef.current.get(type);
      if (!set) {
        set = new Set();
        listenersRef.current.set(type, set);
      }
      const wrapped = handler as Handler;
      set.add(wrapped);
      return () => {
        set?.delete(wrapped);
      };
    },
    [],
  );

  const dispatchRef = useRef<(event: RealtimeEvent) => void>(() => {});
  dispatchRef.current = (event: RealtimeEvent) => {
    const handlers = listenersRef.current.get(event.type);
    if (!handlers) return;
    for (const handler of [...handlers]) {
      handler(event);
    }
  };

  useEffect(() => {
    if (!token) {
      socketRef.current?.close();
      socketRef.current = null;
      setStatus('disconnected');
      return;
    }
    const socket = new RealtimeSocket(messageService.getWsUrl(token), {
      onStatusChange: setStatus,
      onAuthFailure: clearSessionAndRedirect,
      onEvent: (event) => dispatchRef.current(event),
    });
    socketRef.current = socket;
    socket.connect();
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [token]);

  const value = useMemo<RealtimeContextType>(
    () => ({
      connected: status === 'connected',
      send: (payload) => socketRef.current?.send(payload),
      subscribe,
    }),
    [status, subscribe],
  );

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
