import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ToastContainer, type Toast } from '../components/UI/Toast';

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => string;
  updateToast: (id: string, update: Partial<Omit<Toast, 'id'>>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast-${++counterRef.current}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const updateToast = useCallback((id: string, update: Partial<Omit<Toast, 'id'>>) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, ...update } : t));
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, updateToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
