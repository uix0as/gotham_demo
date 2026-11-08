import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
const ToastContext = createContext(null);
const ICONS = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };
const TONE = {
    success: 'border-ok/40 text-ok',
    error: 'border-danger/50 text-danger',
    info: 'border-accent/40 text-accent',
    warning: 'border-warn/40 text-warn',
};
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const seq = useRef(1);
    const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
    const notify = useCallback((tone, title, message) => {
        const id = seq.current++;
        setToasts((t) => [...t.slice(-3), { id, tone, title, message }]);
        window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3800);
    }, [dismiss]);
    const value = useMemo(() => ({
        notify,
        success: (t, m) => notify('success', t, m),
        error: (t, m) => notify('error', t, m),
        info: (t, m) => notify('info', t, m),
    }), [notify]);
    return (<ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" role="region" aria-label="알림 메시지" aria-live="polite">
        {toasts.map((t) => {
            const Icon = ICONS[t.tone];
            return (<div key={t.id} className={`pointer-events-auto flex animate-slide-up items-start gap-3 rounded-lg border bg-elevated/95 px-4 py-3 shadow-panel ${TONE[t.tone]}`} role={t.tone === 'error' ? 'alert' : 'status'}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden/>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{t.title}</p>
                {t.message && <p className="mt-0.5 text-xs text-ink-secondary">{t.message}</p>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="toast-dismiss" aria-label="알림 닫기">
                <X className="h-3.5 w-3.5"/>
              </button>
            </div>);
        })}
      </div>
    </ToastContext.Provider>);
}
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx)
        throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
