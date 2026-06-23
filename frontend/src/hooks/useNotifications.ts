import { useEffect, useCallback, useRef } from 'react';
import { getAccessToken } from '../api/client';

export interface SseNotification {
  id: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
}

type Handler = (n: SseNotification) => void;

export function useNotifications(onNotification: Handler, enabled = true) {
  const esRef = useRef<EventSource | null>(null);
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();

    const token = getAccessToken();
    if (!token) return;

    const url = `/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    const handle = (event: MessageEvent, eventName: string) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;
        handlerRef.current({
          id: `${eventName}-${Date.now()}`,
          event: eventName,
          data,
          timestamp: Date.now(),
        });
      } catch { /* ignore parse errors */ }
    };

    es.addEventListener('encaissement:pending', (e) => handle(e as MessageEvent, 'encaissement:pending'));
    es.addEventListener('versement:pending', (e) => handle(e as MessageEvent, 'versement:pending'));

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Reconnect after 5s
      setTimeout(connect, 5000);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // Small delay to let auth context settle
    const t = setTimeout(connect, 1000);
    return () => {
      clearTimeout(t);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect, enabled]);
}
