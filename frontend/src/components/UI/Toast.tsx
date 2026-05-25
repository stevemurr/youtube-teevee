import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'error' | 'progress';
  message: string;
  detail?: string;
  progress?: number;
  autoDismiss?: number;
}

const colors: Record<Toast['type'], string> = {
  info: 'text-blue-400',
  success: 'text-green-400',
  error: 'text-red-400',
  progress: 'text-blue-400',
};

function Icon({ type }: { type: Toast['type'] }) {
  if (type === 'progress') {
    return <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin flex-shrink-0 mt-0.5" />;
  }
  if (type === 'success') {
    return (
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (type === 'error') {
    return (
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    if (toast.autoDismiss) {
      const timer = setTimeout(() => onRemove(toast.id), toast.autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.autoDismiss, onRemove]);

  return (
    <div className={clsx(
      'flex items-start gap-3 p-4 rounded-xl w-80',
      'bg-gray-900/95 backdrop-blur-xl border border-white/10',
      'shadow-2xl shadow-black/60',
      'animate-fade-in'
    )}>
      <span className={colors[toast.type]}>
        <Icon type={toast.type} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white leading-tight">{toast.message}</p>
        {toast.detail && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{toast.detail}</p>
        )}
        {toast.type === 'progress' && toast.progress !== undefined && (
          <div className="mt-2 w-full bg-white/10 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${toast.progress}%` }}
            />
          </div>
        )}
      </div>
      {toast.type !== 'progress' && (
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors -mt-0.5"
          aria-label="Dismiss"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>,
    document.body
  );
};
