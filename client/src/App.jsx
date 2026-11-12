import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ConsoleShell } from '@/components/layout/ConsoleShell';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { LoadingState } from '@/components/ui/States';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Events = lazy(() => import('@/pages/Events'));
const Notes = lazy(() => import('@/pages/Notes'));
const Members = lazy(() => import('@/pages/Members'));
const Graph = lazy(() => import('@/pages/Graph'));
const Analysis = lazy(() => import('@/pages/Analysis'));
const JoinedRecords = lazy(() => import('@/pages/JoinedRecords'));
const MyJoinedRecords = lazy(() => import('@/pages/MyJoinedRecords'));
const Sources = lazy(() => import('@/pages/Sources'));
const MyPage = lazy(() => import('@/pages/MyPage'));
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function Page({ children }) { return <Suspense fallback={<LoadingState label="화면을 불러오는 중…" />}>{children}</Suspense>; }
function Workspace() { return <ConsoleShell><Page><Outlet /></Page></ConsoleShell>; }
function LegacyEventRedirect() {
  const { id } = useParams();
  return /^\d+$/.test(id || '') ? <Navigate replace to={`/events?id=${id}`} /> : <Page><NotFound /></Page>;
}
function DetailRedirect() {
  const [params] = useSearchParams();
  const id = params.get('id');
  return <Navigate replace to={/^\d+$/.test(id || '') ? `/events?id=${id}` : '/events'} />;
}
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    const route = pathname.replace(/\/+$/, '') || '/';
    const titles = { '/': '작전 상황판', '/events': '훈련 사건', '/notes': '분석 기록', '/members': '회원', '/graph': '관계 분석', '/analysis': '구역·시간 연관', '/joined': '전체 사건·작성자', '/my-events': '내 기록', '/sources': '데이터 소스', '/mypage': '내 계정', '/login': '로그인', '/signup': '회원가입' };
    document.title = `${titles[route] || '페이지를 찾을 수 없음'} · GOTHAM`;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
export default function App() {
  return <><RouteEffects /><Routes>
    <Route element={<Workspace />}>
      <Route index element={<Dashboard />} />
      <Route path="events" element={<Events />} />
      <Route path="events/detail" element={<DetailRedirect />} />
      <Route path="notes" element={<Notes />} />
      <Route path="members" element={<Members />} />
      <Route path="graph" element={<Graph />} />
      <Route path="analysis" element={<Analysis />} />
      <Route path="joined" element={<JoinedRecords />} />
      <Route path="my-events" element={<RequireAuth><MyJoinedRecords /></RequireAuth>} />
      <Route path="sources" element={<Sources />} />
      <Route path="mypage" element={<RequireAuth><MyPage /></RequireAuth>} />
    </Route>
    <Route path="events/:id" element={<LegacyEventRedirect />} />
    <Route path="login" element={<Page><Login /></Page>} />
    <Route path="signup" element={<Page><Signup /></Page>} />
    <Route path="*" element={<Page><NotFound /></Page>} />
  </Routes></>;
}
