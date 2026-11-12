import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { EventsProvider } from '@/context/EventsContext';
export function Providers({ children }) {
    return <ToastProvider><AuthProvider><EventsProvider>{children}</EventsProvider></AuthProvider></ToastProvider>;
}
