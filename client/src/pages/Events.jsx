import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useEventEditor } from '@/hooks/useEventEditor';
import { useNoteEditor, noteCode } from '@/hooks/useNoteEditor';
import { useQueryParams } from '@/hooks/useNavigation';
import { canModifyEvent } from '@/utils/permissions';
import { EVENT_SEVERITIES, EVENT_STATUSES } from '@/domain';
import { EVENT_TYPES } from '@/utils/constants';
import { SECTORS, getSector } from '@/utils/sectors';
import { formatDate, formatDateTime } from '@/utils/date';
import { displayEventTitle, eventCode, memberCode } from '@/utils/format';
import { TacticalMap } from '@/components/map/TacticalMap';
import { Button } from '@/components/ui/Button';
import { AssessmentTag, DataTable, DetailPanel, DetailSection, FilterBar, FilterSelect, PageBar, Pager, PropList, SeverityTag, StatusTag, Tag, sortRows, usePaged, useSort, useColumnFilters, applyColumnFilters } from '@/components/gx/Explorer';

const SEV_RANK = { 긴급: 3, 높음: 2, 보통: 1, 낮음: 0 };

export default function Events() {
    const { user } = useAuth();
    const { events, notes, status, error, reload, authorOf } = useEvents();
    const [params, setParams] = useQueryParams();
    const [q, setQ] = useState(params.get('q') ?? '');
    const [filters, setFilters] = useState({ status: '', type: '', sector: '', severity: '', from: '', to: '', mine: params.get('mine') === '1' });
    const [sort, toggleSort] = useSort('occurred_at', 'desc');
    const selectedId = Number(params.get('id')) || null;
    const select = (id) => { const next = new URLSearchParams(params); if (id) next.set('id', String(id)); else next.delete('id'); setParams(next, { replace: true }); };
    const editor = useEventEditor({ onCreated: (saved) => select(saved.event_id), onDeleted: () => select(null) });
    const noteEditor = useNoteEditor();
    useEffect(() => { setQ(params.get('q') ?? ''); }, [params]);
    const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return events.filter((e) => (!filters.status || e.status === filters.status) && (!filters.type || e.event_type === filters.type) && (!filters.sector || e.sector === filters.sector)
            && (!filters.severity || e.severity === filters.severity) && (!filters.mine || (user && e.member_id === user.member_id))
            && (!filters.from || formatDate(e.occurred_at).replaceAll('.', '-') >= filters.from) && (!filters.to || formatDate(e.occurred_at).replaceAll('.', '-') <= filters.to)
            && (!term || [eventCode(e.event_id), e.title, e.event_type, e.sector, e.source_type, e.description, authorOf(e.member_id)].join(' ').toLowerCase().includes(term)));
    }, [events, filters, q, user, authorOf]);
    const columns = useMemo(() => [
        { key: 'event_id', label: 'ID', width: 86, render: (e) => <span className="gx-code">{eventCode(e.event_id)}</span>, sortValue: (e) => e.event_id, searchText: (e) => eventCode(e.event_id) },
        { key: 'title', label: '사건명', width: 280, render: (e) => <span className="gx-cell-title">{displayEventTitle(e.title)}<small>{e.event_type}</small></span>, searchText: (e) => `${e.title} ${e.event_type}` },
        { key: 'severity', label: '중요도', width: 96, render: (e) => <SeverityTag severity={e.severity}/>, sortValue: (e) => SEV_RANK[e.severity] },
        { key: 'status', label: '상태', width: 106, render: (e) => <StatusTag status={e.status}/> },
        { key: 'sector', label: '구역', width: 78, render: (e) => <Tag>{e.sector}</Tag> },
        { key: 'author', label: '작성자', width: 130, render: (e) => authorOf(e.member_id), sortValue: (e) => authorOf(e.member_id) },
        { key: 'notes', label: '분석', width: 64, align: 'right', render: (e) => notes.filter((n) => n.incident_id === e.event_id).length || '—', sortValue: (e) => notes.filter((n) => n.incident_id === e.event_id).length },
        { key: 'occurred_at', label: '발생 시각 (KST)', width: 150, render: (e) => <span className="gx-mono">{formatDateTime(e.occurred_at)}</span>, searchText: (e) => formatDateTime(e.occurred_at) },
    ], [authorOf, notes]);
    const colFilter = useColumnFilters();
    const sorted = useMemo(() => sortRows(applyColumnFilters(filtered, columns, colFilter.filters), columns, sort), [filtered, columns, sort, colFilter.filters]);
    const paged = usePaged(sorted, 15);
    const selected = events.find((e) => e.event_id === selectedId);
    const canEdit = selected && canModifyEvent(selected, user);
    const linkedNotes = selected ? notes.filter((n) => n.incident_id === selected.event_id) : [];
    const active = Object.entries(filters).filter(([, v]) => v).length + (q ? 1 : 0);

    return <div className="gx-page gx-explorer-page">
      <PageBar code="DATA-EV" title="훈련 사건" description="incidents 테이블 · 모든 회원의 사건을 조회하고, 로그인한 회원은 등록하며 작성자만 수정·삭제할 수 있습니다."
        actions={<Button variant="primary" icon={<Plus size={15}/>} onClick={editor.openCreate}>사건 등록</Button>}/>
      <FilterBar>
        <label className="gx-filter gx-filter-search"><span>검색</span><input type="search" value={q} placeholder="ID·사건명·유형·작성자" onChange={(e) => { setQ(e.target.value); paged.setPage(1); }}/></label>
        <FilterSelect label="상태" value={filters.status} onChange={(v) => set('status', v)} options={EVENT_STATUSES}/>
        <FilterSelect label="중요도" value={filters.severity} onChange={(v) => set('severity', v)} options={EVENT_SEVERITIES}/>
        <FilterSelect label="유형" value={filters.type} onChange={(v) => set('type', v)} options={EVENT_TYPES}/>
        <FilterSelect label="구역" value={filters.sector} onChange={(v) => set('sector', v)} options={SECTORS.map((s) => ({ value: s.id, label: `${s.id} ${s.name}` }))}/>
        <label className="gx-filter"><span>발생일 부터</span><input type="date" value={filters.from} onChange={(e) => set('from', e.target.value)}/></label>
        <label className="gx-filter"><span>까지</span><input type="date" value={filters.to} onChange={(e) => set('to', e.target.value)}/></label>
        <label className="gx-check"><input type="checkbox" checked={filters.mine} disabled={!user} onChange={(e) => set('mine', e.target.checked)}/>내 사건만</label>
        {active > 0 && <button type="button" className="gx-link" onClick={() => { setQ(''); setFilters({ status: '', type: '', sector: '', severity: '', from: '', to: '', mine: false }); }}>필터 초기화 ({active})</button>}
      </FilterBar>
      <div className={`gx-explorer ${selected ? 'has-detail' : ''}`}>
        <DataTable caption="훈련 사건 목록" colFilter={colFilter} columns={columns} rows={paged.slice} rowKey={(e) => e.event_id} selectedKey={selectedId} onSelect={(e) => select(e.event_id === selectedId ? null : e.event_id)}
          sort={sort} onSort={toggleSort} loading={status === 'loading'} error={status === 'error' ? <>{error} <button type="button" className="gx-link" onClick={reload}>다시 시도</button></> : null}
          empty={events.length ? '조건에 맞는 사건이 없습니다. 필터를 줄여 보세요.' : '등록된 사건이 없습니다. 로그인 후 사건을 등록하세요.'}
          footer={<Pager paged={paged} total={sorted.length}/>}/>
        {selected && <DetailPanel kicker={`${eventCode(selected.event_id)} · 훈련 사건`} title={displayEventTitle(selected.title)} onClose={() => select(null)}
          actions={canEdit ? <><Button size="sm" icon={<Pencil size={14}/>} onClick={() => editor.openEdit(selected)}>수정</Button><Button size="sm" variant="danger" icon={<Trash2 size={14}/>} onClick={() => editor.requestDelete(selected)}>삭제</Button></>
                : <span className="gx-readonly"><Lock size={13}/>{user ? '다른 회원의 사건 · 조회 전용' : '로그인하면 본인 사건을 관리할 수 있습니다'}</span>}>
          <div className="gx-detail-tags"><StatusTag status={selected.status}/><SeverityTag severity={selected.severity}/><Tag>{selected.event_type}</Tag></div>
          <p className="gx-detail-text">{selected.description}</p>
          <DetailSection title="속성">
            <PropList items={[['구역', `${selected.sector} · ${getSector(selected.sector)?.name ?? ''}`], ['출처', selected.source_type], ['가상 좌표', `X ${selected.map_x} · Y ${selected.map_y}`], ['발생', formatDateTime(selected.occurred_at)], ['등록', formatDateTime(selected.created_at)], ['수정', formatDateTime(selected.updated_at)]]}/>
          </DetailSection>
          <DetailSection title="작성자 (members)">
            <PropList items={[['회원', `${authorOf(selected.member_id)} · ${memberCode(selected.member_id)}`]]}/>
            <Link className="gx-link" to={`/members?id=${selected.member_id}`}>회원 상세 보기 →</Link>
          </DetailSection>
          <DetailSection title="위치">
            <TacticalMap events={[selected]} selectedId={selected.event_id} compact className="gx-map is-small"/>
          </DetailSection>
          <DetailSection title="분석 기록" meta={`${linkedNotes.length}건`}>
            {linkedNotes.length ? <ul className="gx-linked">{linkedNotes.map((n) => <li key={n.note_id}><Link to={`/notes?id=${n.note_id}`}><AssessmentTag assessment={n.assessment}/><span><b>{n.title}</b><small>{noteCode(n.note_id)} · {n.nickname} · {formatDateTime(n.created_at)}</small></span></Link></li>)}</ul>
                : <p className="gx-hint">이 사건에 대한 분석 기록이 없습니다.</p>}
            <Button size="sm" icon={<NotebookPen size={14}/>} onClick={() => noteEditor.openCreate(selected.event_id)}>이 사건 분석 기록 작성</Button>
          </DetailSection>
        </DetailPanel>}
      </div>
      {editor.modals}
      {noteEditor.modals}
    </div>;
}
