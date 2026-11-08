import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import { AUTH_EXPIRED_EVENT } from '@/services/errors';
import { useToast } from './ToastContext';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);
    const toast = useToast();
    const refresh = useCallback(async () => {
        try {
            setUser(await api.auth.me());
        }
        catch {
            setUser(null);
        }
    }, []);
    useEffect(() => {
        refresh().finally(() => setInitializing(false));
    }, [refresh]);
    // 401 수신 시(세션 만료) 전역 로그아웃 처리
    useEffect(() => {
        const onExpired = () => {
            setUser((prev) => {
                if (prev)
                    toast.notify('warning', '로그인 세션이 만료되었습니다.', '다시 로그인해 주세요.');
                return null;
            });
        };
        window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
        return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
    }, [toast]);
    const value = useMemo(() => ({
        user,
        initializing,
        refresh,
        async login(input) {
            const m = await api.auth.login(input);
            setUser(m);
            return m;
        },
        async logout() {
            await api.auth.logout();
            setUser(null);
        },
        signup: (input) => api.auth.signup(input),
        async updateProfile(patch) {
            const m = await api.members.updateMe(patch);
            setUser(m);
            return m;
        },
        async withdraw() {
            await api.members.deleteMe();
            setUser(null);
        },
    }), [user, initializing, refresh]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
