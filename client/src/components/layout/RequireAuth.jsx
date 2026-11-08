import { usePathname } from '@/hooks/useNavigation';
import { useAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/ui/States';
import { ClientRedirect } from './ClientRedirect';
export function RequireAuth({ children }) {
    const { user, initializing } = useAuth();
    const pathname = usePathname();
    if (initializing)
        return <LoadingState label="로그인 상태 확인 중…"/>;
    if (!user)
        return <ClientRedirect href={`/login?from=${encodeURIComponent(pathname)}`}/>;
    return <>{children}</>;
}
