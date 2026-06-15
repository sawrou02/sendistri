import { useState, useCallback } from 'react';
import type { SseNotification } from '../hooks/useNotifications';

interface Toast extends SseNotification {
  visible: boolean;
}

const EVENT_LABELS: Record<string, { title: string; color: string; icon: string }> = {
  'encaissement:pending': {
    title: 'Nouvel encaissement',
    color: 'border-amber-400 bg-amber-50',
    icon: '💰',
  },
  'versement:pending': {
    title: 'Nouveau versement',
    color: 'border-blue-400 bg-blue-50',
    icon: '🏦',
  },
};

const fmtAmount = (n: unknown) =>
  typeof n === 'number' ? new Intl.NumberFormat('fr-FR').format(n) + ' F' : '';

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((n: SseNotification) => {
    if (n.event === 'connected') return;
    const toast: Toast = { ...n, visible: true };
    setToasts((prev) => [...prev.slice(-4), toast]); // max 5 toasts

    // Auto-dismiss after 6s
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === toast.id ? { ...t, visible: false } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 300);
    }, 6000);
  }, []);

  return { toasts, addToast };
}

interface Props {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function NotificationToast({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => {
        const meta = EVENT_LABELS[toast.event] ?? { title: toast.event, color: 'border-gray-300 bg-white', icon: '🔔' };
        const montant = fmtAmount(toast.data.montant);
        return (
          <div
            key={toast.id}
            className={`flex min-w-[280px] max-w-xs items-start gap-3 rounded-xl border-l-4 p-3 shadow-lg transition-all duration-300 ${
              meta.color
            } ${toast.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
          >
            <span className="text-xl">{meta.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">{meta.title}</p>
              {montant && <p className="text-xs text-gray-600">{montant}</p>}
              <p className="text-xs text-gray-400">En attente de validation</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
