import { useEffect } from 'react';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { EventsProvider } from '@/context/EventsContext';
export function Providers({ children }) {
    useEffect(() => {
        try {
            document.documentElement.dataset.theme = localStorage.getItem('nexus-theme') || 'light';
        }
        catch { /* Storage may be unavailable. */ }
    }, []);
    return <ToastProvider><AuthProvider><EventsProvider>{children}</EventsProvider></AuthProvider></ToastProvider>;
}
