import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, NotebookPen, Plus } from 'lucide-react';
import { useNavigate as useRouterNavigate } from 'react-router-dom';
import { api, errorMessage } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useEventEditor } from '@/hooks/useEventEditor';
import { useNoteEditor, noteCode } from '@/hooks/useNoteEditor';
import { formatDateTime } from '@/utils/date';
import { displayEventTitle, eventCode, memberCode } from '@/utils/format';
import { Button } from '@/components/ui/Button';
import { AssessmentTag, DataTable, PageBar, Pane, PropList, SeverityTag, StatTile, StatusTag, Tag, sortRows, useSort } from '@/components/gx/Explorer';

const JOIN_SQL = `-- JOIN 화면 2-a: 내가 등록한 훈련 사건 + 내 회원정보
SELECT i.id AS event_id, i.title, i.category, i.status, i.occurred_at,
       m.id AS member_id, m.username, m.email, m.created_at AS member_created_at
  FROM incidents AS i
 INNER JOIN members AS m ON i.author_id = m.id
 WHERE m.id = ?        -- 로그인 회원 ID (서버가 JWT에서 결정)
 ORDER BY i.occurred_at DESC, i.id DESC;

-- JOIN 화면 2-b: 내가 작성한 분석 기록 + 회원 + 대상 사건
SELECT n.id, n.title, n.assessment, m.username, i.title AS incident_title
  FROM analysis_notes AS n
 INNER JOIN members   AS m ON n.author_id   = m.id
 INNER JOIN incidents AS i ON n.incident_id = i.id
 WHERE n.author_id = ?;`;

/** JOIN 화면 2 — 로그인한 회원의 기록만 서버에서 JOIN해 가져옵니다 (GET /api/members/me/events, /me/notes). */
export default function MyJoinedRecords() {
    const { user } = useAuth();
    const { events, notes } = useEvents();
    const navigate = useRouterNavigate();
    const editor = useEventEditor();
    const noteEditor = useNoteEditor();
    const [tab, setTab] = useState('events');
    const [rows, setRows] = useState([]);
    const [myNotes, setMyNotes] = useState([]);
    const [state, setState] = useState('loading');
    const [err, setErr] = useState('');
    const [showSql, setShowSql] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [eSort, toggleE] = useSort('occurred_at', 'desc');
    const [nSort, toggleN] = useSort('created_at', 'desc');
    useEffect(() => {
        let alive = true;
        setState('loading');
        Promise.all([api.members.myEventsWithAuthor(), api.members.myNotes()]).then(([ev, nt]) => {
            if (alive) { setRows(ev); setMyNotes(nt); setState('ready'); }
        }).catch((e) => { if (alive) { setErr(errorMessage(e)); setState('error'); } });
        return () => { alive = false; };
    }, [events, notes, user, attempt]);
    const eventCols = useMemo(() => [
        { key: 'event_id', label: 'ID', width: 86, render: (r) => <span className="gx-code">{eventCode(r.event_id)}</span>, sortValue: (r) => r.event_id },
        { key: 'title', label: '사건명 / 유형', width: 260, render: (r) => <span className="gx-cell-title">{displayEventTitle(r.title)}<small>{r.event_type}</small></span> },
        { key: 'status', label: '상태', width: 104, render: (r) => <StatusTag status={r.status}/> },
        { key: 'severity', label: '중요도', width: 92, render: (r) => <SeverityTag severity={r.severity}/> },
        { key: 'sector', label: '구역', width: 70, render: (r) => <Tag>{r.sector}</Tag> },
        { key: 'username', label: '작성자 (m.username)', width: 150, render: (r) => <span className="gx-cell-title">{r.username}<small>{r.email}</small></span> },
        { key: 'occurred_at', label: '발생 시각', width: 146, render: (r) => <span className="gx-mono">{formatDateTime(r.occurred_at)}</span> },
    ], []);
    const noteCols = useMemo(() => [
        { key: 'note_id', label: 'ID', width: 86, render: (n) => <span className="gx-code">{noteCode(n.note_id)}</span>, sortValue: (n) => n.note_id },
        { key: 'title', label: '분석 제목', width: 240, render: (n) => <span className="gx-cell-title">{n.title}</span> },
        { key: 'assessment', label: '판단', width: 84, render: (n) => <AssessmentTag assessment={n.assessment}/> },
        { key: 'incident', label: '대상 사건', width: 230, render: (n) => <span className="gx-cell-title">{displayEventTitle(n.incident_title)}<small>{eventCode(n.incident_id)} · {n.incident_sector}</small></span>, sortValue: (n) => n.incident_id },
        { key: 'nickname', label: '작성자', width: 130 },
        { key: 'created_at', label: '작성 시각', width: 146, render: (n) => <span className="gx-mono">{formatDateTime(n.created_at)}</span> },
    ], []);
    const member = rows[0] ?? myNotes[0];
    const done = rows.filter((r) => r.status === '처리 완료').length;
    return <div className="gx-page">
      <PageBar code="JOIN-02" title="내 기록" description="로그인한 회원이 등록한 훈련 사건과 분석 기록만 서버에서 회원 테이블과 INNER JOIN해 보여줍니다. 화면에서 전체 목록을 거르는 방식이 아닙니다."
        actions={<><Button size="sm" variant="ghost" onClick={() => setShowSql(!showSql)} aria-expanded={showSql}>JOIN 쿼리<ChevronDown size={14} style={{ transform: showSql ? 'rotate(180deg)' : undefined }}/></Button><Button icon={<NotebookPen size={15}/>} onClick={() => noteEditor.openCreate()}>분석 기록</Button><Button variant="primary" icon={<Plus size={15}/>} onClick={editor.openCreate}>사건 등록</Button></>}/>
      {showSql && <pre className="sql-code">{JOIN_SQL}</pre>}
      <div className="gx-my-head">
        <Pane title="작성자 회원정보" meta="JOIN 결과의 members 열">
          <div className="gx-person is-lg"><span className="gx-avatar">{user.nickname.slice(0, 1)}</span><div><b>{member?.username ?? user.nickname}</b><small>{memberCode(user.member_id)} · {member?.email ?? user.email}</small></div></div>
          <PropList items={[['가입', formatDateTime(member?.member_created_at ?? user.created_at)]]}/>
        </Pane>
        <div className="gx-stats is-compact">
          <StatTile label="내 훈련 사건" value={state === 'loading' ? '—' : rows.length} sub="incidents ⨝ members"/>
          <StatTile label="처리 완료" value={state === 'loading' ? '—' : done} tone="ok"/>
          <StatTile label="미처리" value={state === 'loading' ? '—' : rows.length - done} tone="warn"/>
          <StatTile label="내 분석 기록" value={state === 'loading' ? '—' : myNotes.length} sub="analysis_notes ⨝ members ⨝ incidents"/>
        </div>
      </div>
      <div className="gx-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'events'} onClick={() => setTab('events')}>내 훈련 사건 <b>{rows.length}</b></button>
        <button type="button" role="tab" aria-selected={tab === 'notes'} onClick={() => setTab('notes')}>내 분석 기록 <b>{myNotes.length}</b></button>
      </div>
      {tab === 'events' ? <DataTable caption="내가 등록한 훈련 사건 JOIN 결과" columns={eventCols} rows={sortRows(rows, eventCols, eSort)} rowKey={(r) => r.event_id} sort={eSort} onSort={toggleE} onSelect={(r) => navigate(`/events?id=${r.event_id}`)}
          loading={state === 'loading'} error={state === 'error' ? <>{err} <button type="button" className="gx-link" onClick={() => setAttempt((a) => a + 1)}>다시 시도</button></> : null}
          empty={<>내가 등록한 훈련 사건이 없습니다. <button type="button" className="gx-link" onClick={editor.openCreate}>첫 사건 등록</button></>}/>
        : <DataTable caption="내가 작성한 분석 기록 JOIN 결과" columns={noteCols} rows={sortRows(myNotes, noteCols, nSort)} rowKey={(n) => n.note_id} sort={nSort} onSort={toggleN} onSelect={(n) => navigate(`/notes?id=${n.note_id}`)}
          loading={state === 'loading'} error={state === 'error' ? err : null} empty="내가 작성한 분석 기록이 없습니다."/>}
      {editor.modals}
      {noteEditor.modals}
    </div>;
}
