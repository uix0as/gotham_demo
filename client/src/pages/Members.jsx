import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { api, errorMessage } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useQueryParams } from '@/hooks/useNavigation';
import { noteCode } from '@/hooks/useNoteEditor';
import { formatDate, formatDateTime } from '@/utils/date';
import { displayEventTitle, eventCode, memberCode } from '@/utils/format';
import { AccountEditor } from '@/components/members/AccountEditor';
import { AssessmentTag, DataTable, DetailPanel, DetailSection, PageBar, PropList, StatusTag, Tag, sortRows, useSort, useColumnFilters, applyColumnFilters } from '@/components/gx/Explorer';

export default function Members() {
    const { user } = useAuth();
    const { events, notes } = useEvents();
    const [params, setParams] = useQueryParams();
    const [rows, setRows] = useState([]);
    const [state, setState] = useState('loading');
    const [err, setErr] = useState('');
    const [q, setQ] = useState('');
    const [sort, toggleSort] = useSort('member_id', 'asc');
    const [records, setRecords] = useState(null);
    const [recordsState, setRecordsState] = useState('idle');
    const selectedId = Number(params.get('id')) || null;
    const select = (id) => { const next = new URLSearchParams(params); if (id) next.set('id', String(id)); else next.delete('id'); setParams(next, { replace: true }); };
    const load = useCallback(() => {
        setState('loading');
        api.members.list().then((list) => { setRows(list); setState('ready'); }).catch((e) => { setErr(errorMessage(e)); setState('error'); });
    }, []);
    useEffect(() => { if (user) load(); }, [user, load, events, notes]);
    useEffect(() => {
        if (!user || !selectedId) { setRecords(null); return; }
        let alive = true;
        setRecordsState('loading');
        api.members.records(selectedId).then((r) => { if (alive) { setRecords(r); setRecordsState('ready'); } }).catch((e) => { if (alive) { setErr(errorMessage(e)); setRecordsState('error'); } });
        return () => { alive = false; };
    }, [user, selectedId, events, notes]);
    const columns = useMemo(() => [
        { key: 'member_id', label: '회원번호', width: 96, render: (m) => <span className="gx-code">{memberCode(m.member_id)}</span>, searchText: (m) => memberCode(m.member_id) },
        { key: 'nickname', label: '아이디', width: 170, render: (m) => <span className="gx-person"><span className="gx-avatar">{m.nickname.slice(0, 1)}</span>{m.nickname}{user?.member_id === m.member_id && <Tag tone="accent">나</Tag>}</span> },
        { key: 'email', label: '이메일', width: 220 },
        { key: 'incident_count', label: '사건', width: 72, align: 'right' },
        { key: 'note_count', label: '분석', width: 72, align: 'right' },
        { key: 'created_at', label: '가입일', width: 110, render: (m) => <span className="gx-mono">{formatDate(m.created_at)}</span>, searchText: (m) => formatDate(m.created_at) },
    ], [user]);
    const colFilter = useColumnFilters();
    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return sortRows(applyColumnFilters(rows, columns, colFilter.filters).filter((m) => !term || [memberCode(m.member_id), m.nickname, m.email].join(' ').toLowerCase().includes(term)), columns, sort);
    }, [rows, q, columns, sort, colFilter.filters]);

    if (!user) return <div className="gx-page"><PageBar code="DATA-MB" title="회원" description="members 테이블"/>
      <div className="gx-gate"><Lock size={18}/><div><b>로그인한 회원만 회원 목록을 볼 수 있습니다.</b><p>회원 이메일이 포함되어 있어 서버가 로그인 쿠키(JWT)를 확인한 뒤에만 반환합니다.</p></div><Link to="/login?from=%2Fmembers" className="app-button is-primary is-small">로그인</Link></div></div>;

    const member = records?.member;
    const isMe = member && member.member_id === user.member_id;
    return <div className="gx-page gx-explorer-page">
      <PageBar code="DATA-MB" title="회원" description="members 테이블 · 회원별 작성 사건·분석 수는 LEFT JOIN + GROUP BY로 계산합니다. 회원정보 수정·탈퇴는 본인만 가능합니다."/>
      <div className="gx-filterbar"><label className="gx-filter gx-filter-search"><span>검색</span><input type="search" value={q} placeholder="회원번호·아이디·이메일" onChange={(e) => setQ(e.target.value)}/></label><span className="gx-filter-note">총 {rows.length}명</span></div>
      <div className={`gx-explorer ${selectedId ? 'has-detail' : ''}`}>
        <DataTable caption="회원 목록" colFilter={colFilter} columns={columns} rows={filtered} rowKey={(m) => m.member_id} selectedKey={selectedId} onSelect={(m) => select(m.member_id === selectedId ? null : m.member_id)}
          sort={sort} onSort={toggleSort} loading={state === 'loading' && !rows.length} error={state === 'error' ? err : null} empty="조건에 맞는 회원이 없습니다."/>
        {selectedId && (recordsState === 'loading' && !member ? <DetailPanel empty="회원 정보를 불러오는 중…"/>
            : recordsState === 'error' ? <DetailPanel empty={err}/>
            : member && <DetailPanel kicker={`${memberCode(member.member_id)} · 회원`} title={member.nickname} onClose={() => select(null)}
              actions={isMe ? null : <span className="gx-readonly"><Lock size={13}/>다른 회원 · 조회 전용</span>}>
              <DetailSection title="회원정보">
                <PropList items={[['이메일', member.email], ['가입', formatDateTime(member.created_at)], ['최근 수정', formatDateTime(member.updated_at)], ['작성 사건', `${records.incidents.length}건`], ['분석 기록', `${records.notes.length}건`]]}/>
                {isMe && <AccountEditor incidentCount={records.incidents.length} noteCount={records.notes.length}/>}
              </DetailSection>
              <DetailSection title="작성한 훈련 사건" meta="incidents ⨝ members">
                {records.incidents.length ? <ul className="gx-linked">{records.incidents.map((e) => <li key={e.event_id}><Link to={`/events?id=${e.event_id}`}><StatusTag status={e.status}/><span><b>{displayEventTitle(e.title)}</b><small>{eventCode(e.event_id)} · {e.sector} · {formatDateTime(e.occurred_at)}</small></span></Link></li>)}</ul> : <p className="gx-hint">작성한 사건이 없습니다.</p>}
              </DetailSection>
              <DetailSection title="작성한 분석 기록" meta="analysis_notes ⨝ members ⨝ incidents">
                {records.notes.length ? <ul className="gx-linked">{records.notes.map((n) => <li key={n.note_id}><Link to={`/notes?id=${n.note_id}`}><AssessmentTag assessment={n.assessment}/><span><b>{n.title}</b><small>{noteCode(n.note_id)} → {eventCode(n.incident_id)}</small></span></Link></li>)}</ul> : <p className="gx-hint">작성한 분석 기록이 없습니다.</p>}
              </DetailSection>
              <Link to={`/graph?member=${member.member_id}`} className="gx-link">관계 그래프에서 보기 →</Link>
            </DetailPanel>)}
      </div>
    </div>;
}
