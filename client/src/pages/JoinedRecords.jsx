import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Code2, Database, FileText, Search, Users } from 'lucide-react';
import { api, errorMessage } from '@/services/api';
import { useEvents } from '@/context/EventsContext';
import { formatDate, formatDateTime, formatTime } from '@/utils/date';
import { displayEventTitle, eventCode, memberCode } from '@/utils/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { KpiCard } from '@/components/ui/KpiCard';
import { SelectInput } from '@/components/ui/Field';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';
import { SeverityBadge, SectorBadge, SourceBadge, StatusBadge } from '@/components/ui/Badges';
const JOIN_SQL = `SELECT i.id AS event_id, i.title, i.category AS event_type,
       i.severity, i.status, i.author_id AS member_id,
       m.username, m.email, i.created_at
  FROM incidents AS i
 INNER JOIN members AS m ON i.author_id = m.id
 ORDER BY i.occurred_at DESC, i.id DESC;`;
const PAGE_SIZE = 10;
export default function JoinedRecords() {
    const { events } = useEvents();
    const [rows, setRows] = useState([]);
    const [state, setState] = useState('loading');
    const [err, setErr] = useState('');
    const [q, setQ] = useState('');
    const [author, setAuthor] = useState('');
    const [showSql, setShowSql] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [page, setPage] = useState(1);
    useEffect(() => {
        let alive = true;
        setState('loading');
        api.events.listWithAuthors().then((result) => {
            if (alive) {
                setRows(result);
                setState('ready');
            }
        }).catch((error) => {
            if (alive) {
                setErr(errorMessage(error));
                setState('error');
            }
        });
        return () => { alive = false; };
    }, [events, attempt]);
    const authors = useMemo(() => {
        const totals = new Map();
        for (const row of rows)
            totals.set(row.member_id, { nickname: row.nickname, email: row.email, count: (totals.get(row.member_id)?.count ?? 0) + 1 });
        return [...totals.entries()].sort((a, b) => a[0] - b[0]);
    }, [rows]);
    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return rows.filter((row) => (!author || String(row.member_id) === author) && (!term || [eventCode(row.event_id), memberCode(row.member_id), row.nickname, row.username, row.email, row.title, row.severity, row.source_type, row.event_type, row.sector, row.description, row.status].join(' ').toLowerCase().includes(term)));
    }, [rows, q, author]);
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    function chooseAuthor(value) { setAuthor(value); setPage(1); }
    return <div className="workspace-page joined-page">
    <PageHeader title="사건·작성자 조회" icon={<Database />} description="사건과 회원을 작성자 ID로 연결해 상황정보와 작성자 아이디·이메일을 함께 확인합니다." actions={<span className="app-badge app-sector"><Database size={12}/>INNER JOIN</span>}/>
    <div className="summary-strip is-three">
      <KpiCard label="연결된 사건" value={rows.length} icon={<FileText />} caption="실제 회원 사건 조회 결과" loading={state === 'loading'}/>
      <KpiCard label="참여 작성자" value={authors.length} icon={<Users />} caption="사건을 등록한 회원" loading={state === 'loading'}/>
      <KpiCard label="현재 조회 결과" value={filtered.length} icon={<Search />} caption={author ? '선택한 작성자의 사건' : '전체 작성자 기준'} loading={state === 'loading'}/>
    </div>

    <Panel title="사건과 작성자" icon={<Database />} actions={<span className="data-caption"><strong>{filtered.length}</strong>건</span>} bodyClassName="p-0">
      <div className="data-toolbar"><div className="data-search"><Search aria-hidden/><input type="search" className="input" placeholder="사건명, 작성자 아이디, 이메일 검색..." value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} aria-label="JOIN 결과 검색"/></div><SelectInput aria-label="작성자 필터" value={author} onChange={(event) => chooseAuthor(event.target.value)}><option value="">모든 작성자</option>{authors.map(([id, record]) => <option key={id} value={id}>{record.nickname} ({memberCode(id)})</option>)}</SelectInput>{(q || author) && <Button variant="ghost" onClick={() => { setQ(''); chooseAuthor(''); }}>초기화</Button>}</div>
      {state === 'loading' ? <SkeletonRows rows={6}/> : state === 'error' ? <ErrorState message={err} onRetry={() => setAttempt((value) => value + 1)}/> : !filtered.length ? <EmptyState title="JOIN 결과가 없습니다" message={rows.length ? '검색어나 작성자 조건을 변경해 보세요.' : '등록된 상황정보가 없습니다.'}/> : <>
        <div className="app-table-scroll is-desktop"><table className="app-data-table joined-data-table"><caption className="sr-only">회원과 상황정보 INNER JOIN 결과</caption><thead><tr>{['사건 ID', '상황정보 / 유형', '작성자', '구역 / 출처', '상태 / 중요도', '발생 / 등록 시각', '상세'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{visible.map((row) => <tr key={row.event_id}>
          <td><Link to={`/events/detail/?id=${row.event_id}`} className="table-record-link">{eventCode(row.event_id)}</Link></td>
          <td><Link to={`/events/detail/?id=${row.event_id}`} className="table-record-title">{displayEventTitle(row.title)}</Link><span className="record-meta">{row.event_type}</span><p className="record-meta record-description" title={row.description}>{row.description}</p></td>
          <td><div className="person-cell"><span className="app-avatar" aria-hidden>{row.nickname.slice(0, 1)}</span><div><strong>{row.username}</strong><small>{memberCode(row.member_id)}</small><small>{row.email}</small></div></div></td>
          <td><SectorBadge sector={row.sector}/><div className="record-meta"><SourceBadge source={row.source_type} compact/></div></td>
          <td><div className="record-state-cell"><StatusBadge status={row.status}/><SeverityBadge severity={row.severity}/></div></td>
          <td><span className="record-date">{formatDate(row.occurred_at).slice(5)} · {formatTime(row.occurred_at)}<span>등록 {formatDateTime(row.created_at)}</span></span></td>
          <td><Link to={`/events/detail/?id=${row.event_id}`} className="console-icon" aria-label={`${eventCode(row.event_id)} 상세 보기`}><ArrowUpRight size={17}/></Link></td>
        </tr>)}</tbody></table></div>
        <ul className="app-record-cards">{visible.map((row) => <li key={row.event_id}><div className="record-card-top"><Link to={`/events/detail/?id=${row.event_id}`} className="table-record-link">{eventCode(row.event_id)}</Link><SectorBadge sector={row.sector}/><StatusBadge status={row.status}/></div><Link to={`/events/detail/?id=${row.event_id}`} className="record-card-title">{displayEventTitle(row.title)}</Link><p className="record-card-description">{row.description}</p><div className="record-card-meta"><span>{row.event_type}</span><SeverityBadge severity={row.severity}/><SourceBadge source={row.source_type}/></div><div className="record-card-author"><span className="app-avatar" aria-hidden>{row.nickname.slice(0, 1)}</span><div><strong>{row.username} · {memberCode(row.member_id)}</strong><small>{row.email}</small></div></div><div className="record-card-meta"><span>발생 {formatDateTime(row.occurred_at)}</span><span>등록 {formatDateTime(row.created_at)}</span></div></li>)}</ul>
      </>}
      <div className="data-table-footer"><span>총 {filtered.length}건 중 {filtered.length ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)}` : 0}건</span><div className="pagination-buttons"><Button size="sm" variant="outline" aria-label="이전 페이지" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16}/></Button><span>{currentPage} / {pageCount}</span><Button size="sm" variant="outline" aria-label="다음 페이지" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16}/></Button></div></div>
    </Panel>

    <div className="joined-support-grid"><Panel title="작성자별 등록 현황" icon={<Users />} bodyClassName="p-0">{!authors.length ? <EmptyState title="표시할 작성자가 없습니다"/> : <ul className="author-list">{authors.map(([id, record]) => <li key={id}><button type="button" onClick={() => chooseAuthor(author === String(id) ? '' : String(id))} aria-pressed={author === String(id)}><span className="app-avatar" aria-hidden>{record.nickname.slice(0, 1)}</span><div><strong>{record.nickname}</strong><small>{memberCode(id)} · 전체의 {rows.length ? Math.round(record.count / rows.length * 100) : 0}%</small><div className="author-track" aria-hidden><span style={{ width: `${rows.length ? record.count / rows.length * 100 : 0}%` }}/></div></div><b>{record.count}<small>건</small></b></button></li>)}</ul>}</Panel>
    <Panel title="INNER JOIN 조회 쿼리" icon={<Code2 />} actions={<Button size="sm" variant="ghost" aria-expanded={showSql} onClick={() => setShowSql(!showSql)}>{showSql ? '쿼리 접기' : '쿼리 보기'}<ChevronDown size={14} style={{ transform: showSql ? 'rotate(180deg)' : undefined }}/></Button>} bodyClassName="p-0">{showSql ? <pre className="sql-code"><code>{JOIN_SQL}</code></pre> : <div className="sql-summary"><Code2 size={19} className="shrink-0 mt-1"/><p>사건의 작성자 ID와 회원 ID를 연결합니다. 실제 MySQL 조회 결과이며 작성자 아이디·이메일이 사건 정보와 함께 표시됩니다.</p></div>}</Panel></div>
  </div>;
}
