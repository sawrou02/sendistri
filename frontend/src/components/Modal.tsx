import { ReactNode } from 'react';
import { IconX } from './icons';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ open, title, onClose, children }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl p-6 animate-pop"
        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>{title}</h2>
          <button onClick={onClose} className="flex rounded-lg p-1" style={{ color: 'var(--text-3)' }}>
            <IconX size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
