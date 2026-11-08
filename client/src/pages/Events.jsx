import { useEffect, useMemo, useState } from 'react';
import { useQueryParams as useSearchParams } from '@/hooks/useNavigation';
import { ChevronLeft, ChevronRight, ListChecks, Plus, SearchX, Table2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { formatDateTime } from '@/utils/date';
import { eventCode } from '@/utils/format';
import { useEventEditor } from '@/hooks/useEventEditor';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';
import { EventFilters } from '@/components/events/EventFilters';
import { EventTable } from '@/components/events/EventTable';
const PAGE_SIZE = 12;
const DEFAULT_FILTERS = { q: '', status: '', type: '', sector: '', sort: 'occurred_desc', mine: false };
function readFilters(p) {
    const sort = p.get('sort');
    return {
        q: p.get('q') ?? '',
        status: p.get('status') ?? '',
        type: p.get('type') ?? '',
        sector: p.get('sector') ?? '',
        sort: sort && ['occurred_desc', 'occurred_asc', 'created_desc'].includes(sort) ? sort : 'occurred_desc',
        mine: p.get('mine') === '1',
    };
}
export default function Events() {
    const { events, status, error, reload, authorOf } = useEvents();
    const { user } = useAuth();
    const [params, setParams] = useSearchParams();
    const filters = readFilters(params);
    const [page, setPage] = useState(1);
    const editor = useEventEditor();
    const updateFilters = (patch) => {
        const next = { ...filters, ...patch };
        const p = new URLSearchParams();
        if (next.q)
            p.set('q', next.q);
        if (next.status)
            p.set('status', next.status);
        if (next.type)
            p.set('type', next.type);
        if (next.sector)
            p.set('sector', next.sector);
        if (next.sort !== 'occurred_desc')
            p.set('sort', next.sort);
        if (next.mine)
            p.set('mine', '1');
        setParams(p, { replace: true });
        setPage(1);
    };
    const filtered = useMemo(() => {
        const q = filters.q.trim().toLowerCase();
        const list = events.filter((e) => {
            if (filters.status && e.status !== filters.status)
                return false;
            if (filters.type && e.event_type !== filters.type)
                return false;
            if (filters.sector && e.sector !== filters.sector)
                return false;
            if (filters.mine && (!user || e.member_id !== user.member_id))
                return false;
            if (q) {
                const hay = [eventCode(e.event_id), e.event_type, e.sector, e.source_type, e.title, e.severity, e.description, e.status, authorOf(e.member_id), formatDateTime(e.occurred_at)]
                    .join(' ')
                    .toLowerCase();
                if (!hay.includes(q))
                    return false;
            }
            return true;
        });
        const by = {
            occurred_desc: (a, b) => b.occurred_at.localeCompare(a.occurred_at) || b.event_id - a.event_id,
            occurred_asc: (a, b) => a.occurred_at.localeCompare(b.occurred_at) || a.event_id - b.event_id,
            created_desc: (a, b) => b.created_at.localeCompare(a.created_at) || b.event_id - a.event_id,
        }[filters.sort];
        return [...list].sort(by);
    }, [events, filters.q, filters.status, filters.type, filters.sector, filters.sort, filters.mine, user, authorOf]);
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    useEffect(() => {
        if (page > pageCount)
            setPage(pageCount);
    }, [page, pageCount]);
    const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const types = useMemo(() => [...new Set(events.map((e) => e.event_type))], [events]);
    return <div className="workspace-page events-page">
    <PageHeader title="상황정보" icon={<Table2 />} description="회원이 등록한 가상 훈련 사건을 확인하고, 작성한 상황정보를 관리합니다." actions={<Button variant="primary" icon={<Plus size={16}/>} onClick={editor.openCreate}>상황정보 등록</Button>}/>
    <Panel title="회원 상황정보" icon={<ListChecks />} bodyClassName="p-0">
      <div className="data-toolbar"><EventFilters value={filters} onChange={updateFilters} onReset={() => updateFilters(DEFAULT_FILTERS)} types={types} canFilterMine={!!user}/></div>
      <div className="filter-result"><span><ListChecks size={15}/>검색 결과 <strong>{filtered.length}</strong>건 / 전체 {events.length}건</span><span>{user ? '작성자만 수정·삭제할 수 있습니다.' : '로그인하면 상황정보를 등록할 수 있습니다.'}</span></div>
      {status === 'loading' ? <SkeletonRows rows={8}/> : status === 'error' ? <ErrorState message={error ?? ''} onRetry={reload}/> : !filtered.length ? !events.length ? <EmptyState title="등록된 상황정보가 없습니다" message="첫 번째 가상 훈련 상황정보를 등록해 보세요." action={<Button variant="primary" onClick={editor.openCreate}>상황정보 등록</Button>}/> : <EmptyState icon={<SearchX size={20}/>} title="조건에 맞는 상황정보가 없습니다" message="검색어나 필터를 조정해 보세요." action={<Button onClick={() => updateFilters(DEFAULT_FILTERS)}>필터 초기화</Button>}/> : <EventTable events={pageItems} user={user} authorOf={authorOf} onEdit={editor.openEdit} onDelete={editor.requestDelete}/>}
      <nav className="data-table-footer" aria-label="페이지 이동"><span>총 {filtered.length}건 중 {filtered.length ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)}` : 0}건</span><div className="pagination-buttons"><Button size="sm" aria-label="이전 페이지" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16}/></Button>{Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" aria-current={page === index + 1 ? 'page' : undefined} aria-label={`${index + 1}페이지`} className="pagination-page" onClick={() => setPage(index + 1)}>{index + 1}</button>)}<Button size="sm" aria-label="다음 페이지" disabled={page === pageCount} onClick={() => setPage(page + 1)}><ChevronRight size={16}/></Button></div></nav>
    </Panel>
    {editor.modals}
  </div>;
}
