import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate as useRouterNavigate } from 'react-router-dom';
import { api, errorMessage } from '@/services/api';
import { useEvents } from '@/context/EventsContext';
import { formatDateTime } from '@/utils/date';
import { displayEventTitle, eventCode, memberCode } from '@/utils/format';
import { Button } from '@/components/ui/Button';
import { DataTable, FilterBar, FilterSelect, PageBar, Pager, SeverityTag, StatTile, StatusTag, Tag, sortRows, usePaged, useSort, useColumnFilters, applyColumnFilters } from '@/components/gx/Explorer';

const JOIN_SQL = `SELECT i.id AS event_id, i.title, i.category AS event_type,
       i.severity, i.status, i.occurred_at,
       m.id AS member_id, m.username, m.email
  FROM incidents AS i
 INNER JOIN members AS m ON i.author_id = m.id
 ORDER BY i.occurred_at DESC, i.id DESC;`;

/** JOIN 화면 1 — 전체 훈련 사건 + 등록자 정보 (GET /api/events-with-authors, 서버 INNER JOIN) */
export default function JoinedRecords() {
    const { events } = useEvents();
    const navigate = useRouterNavigate();
    const [rows, setRows] = useState([]);
    const [state, setState] = useState('loading');
    const [err, setErr] = useState('');
    const [q, setQ] = useState('');
    const [author, setAuthor] = useState('');
    const [showSql, setShowSql] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [sort, toggleSort] = useSort('occurred_at', 'desc');
    useEffect(() => {
        let alive = true;
        setState('loading');
        api.events.listWithAuthors().then((r) => { if (alive) { setRows(r); setState('ready'); } }).catch((e) => { if (alive) { setErr(errorMessage(e)); setState('error'); } });
        return () => { alive = false; };
    }, [events, attempt]);
    const authors = useMemo(() => [...new Map(rows.map((r) => [r.member_id, r])).values()].sort((a, b) => a.member_id - b.member_id), [rows]);
    const columns = useMemo(() => [
        { key: 'event_id', label: 'i.id', width: 86, render: (r) => <span className="gx-code">{eventCode(r.event_id)}</span>, sortValue: (r) => r.event_id, searchText: (r) => eventCode(r.event_id) },
        { key: 'title', label: '사건명 / 유형', width: 260, render: (r) => <span className="gx-cell-title">{displayEventTitle(r.title)}<small>{r.event_type}</small></span> },
        { key: 'status', label: '상태', width: 104, render: (r) => <StatusTag status={r.status}/> },
        { key: 'severity', label: '중요도', width: 92, render: (r) => <SeverityTag severity={r.severity}/> },
        { key: 'sector', label: '구역', width: 70, render: (r) => <Tag>{r.sector}</Tag> },
        { key: 'occurred_at', label: '발생 시각', width: 146, render: (r) => <span className="gx-mono">{formatDateTime(r.occurred_at)}</span>, searchText: (r) => formatDateTime(r.occurred_at) },
        { key: 'member_id', label: 'm.id', width: 84, render: (r) => <span className="gx-code">{memberCode(r.member_id)}</span>, searchText: (r) => memberCode(r.member_id) },
        { key: 'username', label: '등록자 m.username', width: 140 },
        { key: 'email', label: 'm.email', width: 190 },
    ], []);
    const colFilter = useColumnFilters();
    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return sortRows(applyColumnFilters(rows, columns, colFilter.filters).filter((r) => (!author || String(r.member_id) === author) && (!term || [eventCode(r.event_id), r.title, r.event_type, r.username, r.email, r.sector, r.status].join(' ').toLowerCase().includes(term))), columns, sort);
    }, [rows, q, author, columns, sort, colFilter.filters]);
    const paged = usePaged(filtered, 15);
    return <div className="gx-page">
      <PageBar code="JOIN-01" title="전체 사건·작성자" description="incidents와 members를 author_id = id로 INNER JOIN한 결과입니다. 사건 정보와 등록 회원의 아이디·이메일이 한 행에 함께 나옵니다."
        actions={<Button size="sm" variant="ghost" onClick={() => setShowSql(!showSql)} aria-expanded={showSql}>JOIN 쿼리<ChevronDown size={14} style={{ transform: showSql ? 'rotate(180deg)' : undefined }}/></Button>}/>
      {showSql && <pre className="sql-code">{JOIN_SQL}</pre>}
      <div className="gx-stats is-compact">
        <StatTile label="JOIN 결과 행" value={state === 'loading' ? '—' : rows.length}/>
        <StatTile label="등록 회원" value={state === 'loading' ? '—' : authors.length}/>
        <StatTile label="현재 조회" value={filtered.length} sub={author ? '선택한 등록자' : '전체 등록자'}/>
      </div>
      <FilterBar>
        <label className="gx-filter gx-filter-search"><span>검색</span><input type="search" value={q} placeholder="사건명·아이디·이메일" onChange={(e) => { setQ(e.target.value); paged.setPage(1); }}/></label>
        <FilterSelect label="등록자" value={author} onChange={(v) => { setAuthor(v); paged.setPage(1); }} options={authors.map((a) => ({ value: String(a.member_id), label: `${a.username} (${memberCode(a.member_id)})` }))}/>
      </FilterBar>
      <DataTable caption="훈련 사건과 등록자 INNER JOIN 결과" colFilter={colFilter} columns={columns} rows={paged.slice} rowKey={(r) => r.event_id} sort={sort} onSort={toggleSort} onSelect={(r) => navigate(`/events?id=${r.event_id}`)}
        loading={state === 'loading'} error={state === 'error' ? <>{err} <button type="button" className="gx-link" onClick={() => setAttempt((a) => a + 1)}>다시 시도</button></> : null}
        empty={rows.length ? '조건에 맞는 결과가 없습니다.' : '등록된 훈련 사건이 없습니다.'} footer={<Pager paged={paged} total={filtered.length}/>}/>
    </div>;
}
