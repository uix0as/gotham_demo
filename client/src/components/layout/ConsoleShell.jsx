import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Database, FileSearch, FileUser, GitBranch, Globe2, LogIn, LogOut, Menu, Network, NotebookPen, RefreshCw, Search, Table2, UserRound, Users, X } from 'lucide-react';
import { usePathname, useRouter } from '@/hooks/useNavigation';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/services/api';
import { formatTime } from '@/utils/date';
import { memberCode } from '@/utils/format';
import { LogoMark } from './Logo';

/** 상단 메뉴 — 아이콘은 모두 같은 회색, 활성 메뉴만 한 단계 밝은 표면으로 표시합니다. */
const NAV = [
    { to: '/', label: '상황판', icon: Globe2, end: true },
    { to: '/events', label: '훈련 사건', icon: Table2 },
    { to: '/notes', label: '분석 기록', icon: NotebookPen },
    { to: '/members', label: '회원', icon: Users },
    { to: '/graph', label: '관계 분석', icon: Network },
    { to: '/joined', label: 'JOIN 전체', icon: Database },
    { to: '/my-events', label: '내 기록', icon: FileUser },
    { to: '/analysis', label: '연관', icon: GitBranch },
    { to: '/sources', label: '소스', icon: FileSearch },
];

function useApiHealth() {
    const [health, setHealth] = useState({ state: 'checking' });
    useEffect(() => {
        let alive = true;
        fetch('/api/health', { credentials: 'include' }).then((r) => r.json()).then((j) => {
            if (alive) setHealth(j.data?.status === 'ok' ? { state: 'ok', db: j.data.database } : { state: 'error' });
        }).catch(() => alive && setHealth({ state: 'error' }));
        return () => { alive = false; };
    }, []);
    return health;
}
function useClock() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
    return now;
}
const kst = (d, opts) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', ...opts }).format(d);

export function ConsoleShell({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const { events, status, reload, reloadDataset } = useEvents();
    const toast = useToast();
    const health = useApiHealth();
    const now = useClock();
    const searchRef = useRef(null);
    const [menu, setMenu] = useState(false);
    const [query, setQuery] = useState('');
    const [syncedAt, setSyncedAt] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    useEffect(() => { if (status === 'ready') setSyncedAt(new Date().toISOString()); }, [status, events]);
    useEffect(() => { setMenu(false); }, [pathname]);
    useEffect(() => {
        const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    const refresh = async () => {
        setRefreshing(true);
        try { await Promise.all([reload(), reloadDataset()]); toast.success('MySQL에서 데이터를 다시 불러왔습니다.'); }
        catch (e) { toast.error('새로고침 실패', errorMessage(e)); }
        finally { setRefreshing(false); }
    };
    const onSearch = (e) => { e.preventDefault(); const q = query.trim(); router.push(q ? `/events?q=${encodeURIComponent(q)}` : '/events'); };
    const doLogout = async () => {
        try { await logout(); toast.info('로그아웃했습니다.'); router.push('/'); }
        catch (e) { toast.error('로그아웃하지 못했습니다.', errorMessage(e)); }
    };
    return <div className="cx-app">
      <header className="cx-header">
        <Link to="/" className="cx-brand" aria-label="GOTHAM 상황판"><LogoMark size={26}/><span><b>GOTHAM</b><small>국방 훈련 정보 분석 시스템</small></span></Link>
        <button type="button" className="cx-round cx-menu-btn" aria-label={menu ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X size={16} strokeWidth={1.5}/> : <Menu size={16} strokeWidth={1.5}/>}</button>
        <nav className={`cx-nav ${menu ? 'is-open' : ''}`} aria-label="주 메뉴">
          {NAV.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} aria-label={label} title={label} className={({ isActive }) => `cx-nav-item ${isActive ? 'is-active' : ''}`}>
              <span className="cx-nav-icon"><Icon size={16} strokeWidth={1.5} aria-hidden/></span><span className="cx-nav-label">{label}</span>
            </NavLink>)}
        </nav>
        <div className="cx-header-right">
          <div className="cx-clock" aria-label="현재 시각 (KST)"><span>{kst(now, { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\s/g, '')}</span><b>{kst(now, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</b></div>
          <form className="cx-search" role="search" onSubmit={onSearch}>
            <Search size={16} strokeWidth={1.5} aria-hidden/><input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="사건 검색" aria-label="훈련 사건 검색"/><kbd>Ctrl K</kbd>
          </form>
          <span className={`cx-status ${health.state === 'ok' ? 'is-ok' : health.state === 'error' ? 'is-err' : ''}`} title={`Express API → MySQL · 마지막 동기화 ${syncedAt ? formatTime(syncedAt) : '—'} (자동 갱신 아님)`}>
            <i aria-hidden/>{health.state === 'ok' ? health.db : health.state === 'error' ? 'DB 연결 오류' : 'DB 확인 중'}
          </span>
          <button type="button" className="cx-round" onClick={refresh} disabled={refreshing} aria-label="MySQL에서 다시 불러오기" title="다시 불러오기"><RefreshCw size={16} strokeWidth={1.5} className={refreshing ? 'animate-spin' : ''}/></button>
          {user ? <>
              <Link to="/mypage" className="cx-user" title="내 계정"><span className="gx-avatar">{user.nickname.slice(0, 1)}</span><span><b>{user.nickname}</b><small>{memberCode(user.member_id)}</small></span></Link>
              <button type="button" className="cx-round" onClick={doLogout} aria-label="로그아웃" title="로그아웃"><LogOut size={16} strokeWidth={1.5}/></button>
            </> : <Link to={`/login?from=${encodeURIComponent(pathname)}`} className="app-button is-primary is-small"><LogIn size={16} strokeWidth={1.5}/>로그인</Link>}
          {user && <Link to="/mypage" className="cx-round cx-account-link" aria-label="내 계정"><UserRound size={16} strokeWidth={1.5}/></Link>}
        </div>
      </header>
      <main id="main" className="cx-main" tabIndex={-1}>{children}</main>
    </div>;
}
