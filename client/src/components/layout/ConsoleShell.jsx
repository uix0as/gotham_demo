import { Link } from 'react-router-dom';
import { usePathname, useRouter } from '@/hooks/useNavigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Bell, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, Database, GitBranch, LayoutDashboard, LogIn, LogOut, Menu, Moon, PanelLeft, RefreshCw, Search, Settings2, Sun, Table2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/services/api';
import { formatTime } from '@/utils/date';
import { Modal } from '@/components/ui/Modal';
import { Logo } from './Logo';
const sections = [
    { label: '대시보드', items: [
            { href: '/', label: '통합 대시보드', icon: LayoutDashboard },
            { href: '/analysis', label: '연관 분석', icon: GitBranch },
        ] },
    { label: '데이터 관리', items: [
            { href: '/events', label: '상황정보', icon: Table2 },
            { href: '/joined', label: '사건·작성자 조회', icon: Database },
            { href: '/sources', label: '데이터 소스', icon: Database },
        ] },
    { label: '워크스페이스', items: [
            { href: '/mypage', label: '내 계정', icon: Settings2 },
        ] },
];
export function ConsoleShell({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const { events, analysisEvents, status, datasetStatus, reload, reloadDataset } = useEvents();
    const toast = useToast();
    const [drawer, setDrawer] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [dark, setDark] = useState(false);
    const [notifications, setNotifications] = useState(false);
    const [help, setHelp] = useState(false);
    const [query, setQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const searchRef = useRef(null);
    const notificationRef = useRef(null);
    const navigationRef = useRef(null);
    const menuRef = useRef(null);
    const pending = events.filter((event) => event.status === '접수');
    const publicCount = analysisEvents.filter((event) => event.event_id < 0 && !event.is_synthetic && event.data_source !== 'synthetic').length;
    const publicShare = analysisEvents.length ? publicCount / analysisEvents.length * 100 : 0;
    const ready = status === 'ready' && datasetStatus === 'ready';
    useEffect(() => {
        try {
            setDark(localStorage.getItem('nexus-theme') === 'dark');
        }
        catch {
            setDark(document.documentElement.dataset.theme === 'dark');
        }
        const onKey = (event) => {
            if (document.querySelector('.app-modal[aria-modal="true"]'))
                return;
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                searchRef.current?.focus();
            }
            if (event.key === 'Escape') {
                setNotifications(false);
                setDrawer(false);
            }
        };
        const onPointer = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target))
                setNotifications(false);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onPointer);
        return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); };
    }, []);
    useEffect(() => { setDrawer(false); setNotifications(false); }, [pathname]);
    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 1024px)');
        const closeOnDesktop = (event) => {
            if (event.matches)
                setDrawer(false);
        };
        if (desktop.matches)
            setDrawer(false);
        desktop.addEventListener('change', closeOnDesktop);
        return () => desktop.removeEventListener('change', closeOnDesktop);
    }, []);
    useEffect(() => {
        if (!drawer)
            return;
        const overflow = document.body.style.overflow;
        const menuButton = menuRef.current;
        document.body.style.overflow = 'hidden';
        navigationRef.current?.querySelector('a,button')?.focus();
        const trap = (event) => {
            if (event.key !== 'Tab')
                return;
            const controls = navigationRef.current?.querySelectorAll('a[href],button:not([disabled])');
            if (!controls?.length)
                return;
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', trap);
        return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', trap); menuButton?.focus(); };
    }, [drawer]);
    function toggleTheme() {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? 'dark' : 'light';
        try {
            localStorage.setItem('nexus-theme', next ? 'dark' : 'light');
        }
        catch { /* Theme switching works without storage. */ }
    }
    function submitSearch(event) {
        event.preventDefault();
        router.push(`/events${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
    }
    async function refresh() {
        setRefreshing(true);
        try {
            await Promise.all([reload(), reloadDataset()]);
        }
        finally {
            setRefreshing(false);
        }
    }
    return <div className={`console-shell${collapsed ? ' console-compact' : ''}${drawer ? ' console-drawer-open' : ''}`}>
    {drawer && <button className="console-scrim" aria-label="배경을 눌러 메뉴 닫기" onClick={() => setDrawer(false)}/>}
    <aside ref={navigationRef} className="console-rail" aria-label="주 탐색" {...(drawer ? { role: 'dialog', 'aria-modal': true } : {})}>
      <div className="console-brand"><Link to="/" aria-label="DEFENSE NEXUS 대시보드"><Logo /></Link><button className="console-icon console-drawer-close" onClick={() => setDrawer(false)} aria-label="메뉴 닫기"><X size={20}/></button></div>
      <nav className="console-navigation" aria-label="워크스페이스 메뉴">{sections.map((section) => <div className="console-nav-group" key={section.label}>
        <span className="console-nav-label">{section.label}</span>
        {section.items.map(({ href, label, icon: Icon }) => {
                const selected = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return <Link key={href} to={href} title={label} aria-label={label} aria-current={selected ? 'page' : undefined} className={`console-nav-link${selected ? ' is-current' : ''}`}><Icon size={19} strokeWidth={1.65}/><span>{label}</span>{href === '/events' && pending.length > 0 && <small>{pending.length}</small>}</Link>;
            })}
      </div>)}</nav>
      <div className="console-rail-bottom">
        <div className="console-data-card"><div><strong>공개 관측 데이터</strong><b>{ready ? `${publicShare.toFixed(0)}%` : '—'}</b></div><div className="console-data-track"><span style={{ width: `${publicShare}%` }}/></div><p>전체 {analysisEvents.length.toLocaleString()}건 중 {publicCount.toLocaleString()}건</p><Link to="/sources" className="console-data-action">데이터 소스 보기<ArrowUpRight size={16}/></Link></div>
        <button className="console-guide-link" onClick={() => setHelp(true)} aria-label="사용 가이드"><CircleHelp size={19}/><span>사용 가이드</span></button>
        <div className="console-user"><span className="console-avatar">{user?.nickname.slice(0, 1) || 'G'}</span><div><strong>{user?.nickname || '게스트 사용자'}</strong><span>{user ? '회원 워크스페이스' : '공개 데이터 열람'}</span></div>{user ? <button className="console-icon" disabled={loggingOut} aria-label="로그아웃" onClick={async () => {
                setLoggingOut(true);
                try {
                    await logout();
                }
                catch (error) {
                    toast.error('로그아웃하지 못했습니다.', errorMessage(error));
                }
                finally {
                    setLoggingOut(false);
                }
            }}><LogOut size={18}/></button> : <Link className="console-icon" to="/login" aria-label="로그인"><LogIn size={18}/></Link>}</div>
      </div>
    </aside>

    <div className="console-surface" inert={drawer || undefined}>
      <header className="console-toolbar"><button className="console-icon console-desktop-menu" aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'} onClick={() => setCollapsed(!collapsed)}><PanelLeft size={19}/></button><button ref={menuRef} className="console-icon console-mobile-menu" aria-label="메뉴 열기" aria-expanded={drawer} onClick={() => setDrawer(true)}><Menu size={21}/></button><span className="console-toolbar-divider"/>
        <form role="search" className="console-search" onSubmit={submitSearch}><Search size={17}/><label className="sr-only" htmlFor="console-search">전체 상황정보 검색</label><input ref={searchRef} id="console-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상황정보 검색..." autoComplete="off"/><kbd>⌘ K</kbd></form>
        <div className="console-utilities"><button className="console-icon" aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'} onClick={toggleTheme}>{dark ? <Sun size={20}/> : <Moon size={20}/>}</button><button className="console-icon console-refresh" disabled={refreshing} aria-label="데이터 새로고침" onClick={() => void refresh()}><RefreshCw size={19} className={refreshing ? 'animate-spin' : ''}/></button>
          <div ref={notificationRef} className="console-notifications"><button className="console-icon" aria-label={`접수 알림 ${pending.length}건`} aria-expanded={notifications} onClick={() => setNotifications(!notifications)}><Bell size={20}/>{pending.length > 0 && <i />}</button>{notifications && <div className="console-notification-menu"><div><strong>접수된 상황정보</strong><span>{pending.length}건</span></div>{pending.length ? pending.slice(0, 4).map((event) => <Link to={`/?event=${event.event_id}`} key={event.event_id} onClick={() => setNotifications(false)}><span className="console-notification-symbol"><Bell size={16}/></span><span><strong>{event.title.replace(/^\[가상 훈련 \d+\]\s*/, '')}</strong><small>{event.sector} · {formatTime(event.occurred_at)}</small></span><ChevronRight size={15}/></Link>) : <p className="console-notification-empty"><Check size={20}/>접수 상태의 사건이 없습니다.</p>}<Link to="/events?status=접수" className="console-notification-all" onClick={() => setNotifications(false)}>모든 접수 사건 보기<ArrowUpRight size={15}/></Link></div>}</div>
          <button className="console-icon console-help" aria-label="사용 가이드 열기" onClick={() => setHelp(true)}><BookOpen size={19}/></button><Link className="console-profile" to={user ? '/mypage' : '/login'} aria-label={user ? '내 계정 보기' : '로그인'}><span className="console-avatar">{user?.nickname.slice(0, 1) || 'G'}</span><ChevronDown size={13}/></Link>
        </div>
      </header>
      <main id="main" className="console-content" tabIndex={-1}>{children}</main>
      <footer className="console-footer"><span>© 2026 <strong>DEFENSE NEXUS</strong></span><div><span>교육용 사건·관측 분석</span><Link to="/sources">데이터 출처<ArrowUpRight size={13}/></Link><button onClick={() => setHelp(true)}>사용 가이드</button></div></footer>
    </div>

    <Modal open={help} onClose={() => setHelp(false)} title="DEFENSE NEXUS 사용 가이드" size="md"><div className="console-help-content"><p>가상 훈련 사건과 공개 관측 자료를 함께 살펴보는 분석 워크스페이스입니다.</p><ol><li><strong>현황 확인.</strong> 대시보드의 구역 선택으로 통계와 목록을 함께 좁혀 볼 수 있습니다.</li><li><strong>사건 관리.</strong> 로그인 후 상황정보를 등록할 수 있으며, 작성자만 수정·삭제할 수 있습니다.</li><li><strong>연관 분석.</strong> 같은 구역에서 가까운 시간에 발생한 자료를 연결합니다. 연결은 원인 관계를 뜻하지 않습니다.</li></ol><Link to="/sources" className="app-button" onClick={() => setHelp(false)}>데이터 출처 확인<ArrowUpRight size={15}/></Link></div></Modal>
  </div>;
}
