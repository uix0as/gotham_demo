import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate as useRouterNavigate, useSearchParams as useRouterSearchParams } from 'react-router-dom';

/** Return destinations stay in the URL so login deep links survive reloads. */
export function useNavigate() {
  const navigate = useRouterNavigate();
  return useCallback((destination, options = {}) => {
    if (typeof destination === 'number') { navigate(destination); return; }
    let href = destination;
    if (options.state?.from) href += `${href.includes('?') ? '&' : '?'}from=${encodeURIComponent(options.state.from)}`;
    navigate(href, { replace: !!options.replace });
  }, [navigate]);
}
export function useQueryParams() { return useRouterSearchParams(); }
export function useSearchParams() { return useRouterSearchParams()[0]; }
export function usePathname() { return useLocation().pathname.replace(/\/+$/, '') || '/'; }
export function useRouter() {
  const navigate = useRouterNavigate();
  return useMemo(() => ({ push: href => navigate(href), replace: href => navigate(href, { replace: true }), back: () => navigate(-1) }), [navigate]);
}
