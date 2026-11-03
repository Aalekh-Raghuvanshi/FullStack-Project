import { createContext, useCallback, useContext, useState } from 'react';
import { CircleCheck, CircleAlert, X } from 'lucide-react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const notify = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite" aria-atomic="false">
        {toasts.map(({ id, message, type }) => (
          <div key={id} role={type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border bg-white p-3.5 text-sm shadow-lg ${type === 'error' ? 'border-rose-200 text-rose-800' : 'border-emerald-200 text-emerald-800'}`}>
            {type === 'error' ? <CircleAlert size={18} className="mt-0.5 shrink-0" /> : <CircleCheck size={18} className="mt-0.5 shrink-0" />}
            <span className="min-w-0 flex-1">{message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => setToasts((current) => current.filter((toast) => toast.id !== id))} className="rounded p-0.5 hover:bg-slate-100"><X size={15} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// The hook intentionally shares the provider's context module.
// eslint-disable-next-line react-refresh/only-export-components
export function useNotify() {
  return useContext(ToastContext);
}
