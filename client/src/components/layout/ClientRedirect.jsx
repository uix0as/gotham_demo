import { useEffect } from 'react';
import { useRouter } from '@/hooks/useNavigation';
export function ClientRedirect({ href }) {
    const router = useRouter();
    useEffect(() => { router.replace(href); }, [href, router]);
    return <p className="p-6 text-sm text-ink-muted" role="status">화면을 이동하는 중…</p>;
}
