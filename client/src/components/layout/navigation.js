import { Database, GitBranch, LayoutDashboard, ListChecks, UserRound } from 'lucide-react';
export const NAV_ITEMS = [
    { to: '/', label: '종합 상황판', icon: LayoutDashboard, description: '가상 훈련구역 지도 · 현황 요약', end: true },
    { to: '/events', label: '상황정보 목록', icon: ListChecks, description: '상황정보 조회 · 등록 · 수정 · 삭제' },
    { to: '/analysis', label: '연관 분석', icon: GitBranch, description: '구역 · 시간 기반 규칙 연관 분석' },
    { to: '/joined', label: '사건·작성자 통합 분석', icon: Database, description: '회원 ⨝ 상황정보 JOIN 조회' },
    { to: '/mypage', label: '마이페이지', icon: UserRound, description: '회원정보 · 내 상황정보' },
];
export function pageTitle(pathname) {
    if (pathname.startsWith('/events/'))
        return '상황정보 상세';
    const hit = NAV_ITEMS.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));
    return hit?.label ?? '페이지를 찾을 수 없음';
}
