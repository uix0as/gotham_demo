import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useNoteEditor, noteCode } from '@/hooks/useNoteEditor';
import { useQueryParams } from '@/hooks/useNavigation';
import { ASSESSMENTS, CONFIDENCES } from '@/components/notes/NoteFormModal';
import { formatDateTime } from '@/utils/date';
import { displayEventTitle, eventCode, memberCode } from '@/utils/format';
import { Button } from '@/components/ui/Button';
import { AssessmentTag, DataTable, DetailPanel, DetailSection, FilterBar, FilterSelect, PageBar, Pager, PropList, SeverityTag, StatusTag, Tag, sortRows, usePaged, useSort, useColumnFilters, applyColumnFilters } from '@/components/gx/Explorer';

const NOTES_SQL = `SELECT n.id, n.title, n.assessment, n.confidence, n.content,
       m.username, m.email,                -- 작성 회원
       i.title AS incident_title, i.location, i.status  -- 대상 사건
  FROM analysis_notes AS n
 INNER JOIN members   AS m ON n.author_id   = m.id
 INNER JOIN incidents AS i ON n.incident_id = i.id
 ORDER BY n.created_at DESC, n.id DESC;`;
const RANK = { 위험: 2, 주의: 1, 관찰: 0, 높음: 2, 보통: 1, 낮음: 0 };

export default function Notes() {
    const { user } = useAuth();
    const { notes, notesStatus, reloadNotes } = useEvents();
    const [params, setParams] = useQueryParams();
    const [q, setQ] = useState('');
    const [filters, setFilters] = useState({ assessment: '', confidence: '', author: '', mine: false });
    const [showSql, setShowSql] = useState(false);
    const [sort, toggleSort] = useSort('created_at', 'desc');
    const selectedId = Number(params.get('id')) || null;
    const select = (id) => { const next = new URLSearchParams(params); if (id) next.set('id', String(id)); else next.delete('id'); setParams(next, { replace: true }); };
    const editor = useNoteEditor({ onSaved: (saved) => select(saved.note_id), onDeleted: () => select(null) });
    const authors = useMemo(() => [...new Map(notes.map((n) => [n.member_id, n.nickname])).entries()].map(([value, label]) => ({ value: String(value), label })), [notes]);
    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return notes.filter((n) => (!filters.assessment || n.assessment === filters.assessment) && (!filters.confidence || n.confidence === filters.confidence)
            && (!filters.author || String(n.member_id) === filters.author) && (!filters.mine || (user && n.member_id === user.member_id))
            && (!term || [noteCode(n.note_id), n.title, n.content, n.nickname, n.incident_title, n.incident_sector].join(' ').toLowerCase().includes(term)));
    }, [notes, filters, q, user]);
    const columns = useMemo(() => [
        { key: 'note_id', label: 'ID', width: 86, render: (n) => <span className="gx-code">{noteCode(n.note_id)}</span>, sortValue: (n) => n.note_id, searchText: (n) => noteCode(n.note_id) },
        { key: 'title', label: '분석 제목', width: 260, render: (n) => <span className="gx-cell-title">{n.title}<small>{n.content.slice(0, 48)}{n.content.length > 48 ? '…' : ''}</small></span> },
        { key: 'assessment', label: '판단', width: 84, render: (n) => <AssessmentTag assessment={n.assessment}/>, sortValue: (n) => RANK[n.assessment] },
        { key: 'confidence', label: '신뢰도', width: 80, sortValue: (n) => RANK[n.confidence] },
        { key: 'incident', label: '대상 사건', width: 220, render: (n) => <span className="gx-cell-title">{displayEventTitle(n.incident_title)}<small>{eventCode(n.incident_id)} · {n.incident_sector}</small></span>, sortValue: (n) => n.incident_id, searchText: (n) => `${eventCode(n.incident_id)} ${n.incident_title} ${n.incident_sector}` },
        { key: 'author', label: '작성자', width: 120, render: (n) => n.nickname, sortValue: (n) => n.nickname },
        { key: 'created_at', label: '작성 시각', width: 146, render: (n) => <span className="gx-mono">{formatDateTime(n.created_at)}</span>, searchText: (n) => formatDateTime(n.created_at) },
    ], []);
    const colFilter = useColumnFilters();
    const sorted = useMemo(() => sortRows(applyColumnFilters(filtered, columns, colFilter.filters), columns, sort), [filtered, columns, sort, colFilter.filters]);
    const paged = usePaged(sorted, 15);
    const selected = notes.find((n) => n.note_id === selectedId);
    const canEdit = selected && user && selected.member_id === user.member_id;

    return <div className="gx-page gx-explorer-page">
      <PageBar code="DATA-AN" title="분석 기록" description="analysis_notes 테이블 · 사건 하나에 대한 판단을 기록합니다. 목록은 기록·작성 회원·대상 사건 3개 테이블 INNER JOIN 결과입니다."
        actions={<><Button size="sm" variant="ghost" onClick={() => setShowSql(!showSql)} aria-expanded={showSql}>JOIN 쿼리<ChevronDown size={14} style={{ transform: showSql ? 'rotate(180deg)' : undefined }}/></Button><Button variant="primary" icon={<Plus size={15}/>} onClick={() => editor.openCreate()}>분석 기록 작성</Button></>}/>
      {showSql && <pre className="sql-code">{NOTES_SQL}</pre>}
      <FilterBar>
        <label className="gx-filter gx-filter-search"><span>검색</span><input type="search" value={q} placeholder="제목·내용·사건·작성자" onChange={(e) => { setQ(e.target.value); paged.setPage(1); }}/></label>
        <FilterSelect label="판단" value={filters.assessment} onChange={(v) => setFilters((f) => ({ ...f, assessment: v }))} options={ASSESSMENTS}/>
        <FilterSelect label="신뢰도" value={filters.confidence} onChange={(v) => setFilters((f) => ({ ...f, confidence: v }))} options={CONFIDENCES}/>
        <FilterSelect label="작성자" value={filters.author} onChange={(v) => setFilters((f) => ({ ...f, author: v }))} options={authors}/>
        <label className="gx-check"><input type="checkbox" checked={filters.mine} disabled={!user} onChange={(e) => setFilters((f) => ({ ...f, mine: e.target.checked }))}/>내 기록만</label>
      </FilterBar>
      <div className={`gx-explorer ${selected ? 'has-detail' : ''}`}>
        <DataTable caption="분석 기록 목록" colFilter={colFilter} columns={columns} rows={paged.slice} rowKey={(n) => n.note_id} selectedKey={selectedId} onSelect={(n) => select(n.note_id === selectedId ? null : n.note_id)}
          sort={sort} onSort={toggleSort} loading={notesStatus === 'loading'} error={notesStatus === 'error' ? <>분석 기록을 불러오지 못했습니다. <button type="button" className="gx-link" onClick={reloadNotes}>다시 시도</button></> : null}
          empty={notes.length ? '조건에 맞는 분석 기록이 없습니다.' : '아직 분석 기록이 없습니다. 사건을 선택해 첫 분석을 작성하세요.'} footer={<Pager paged={paged} total={sorted.length}/>}/>
        {selected && <DetailPanel kicker={`${noteCode(selected.note_id)} · 분석 기록`} title={selected.title} onClose={() => select(null)}
          actions={canEdit ? <><Button size="sm" icon={<Pencil size={14}/>} onClick={() => editor.openEdit(selected)}>수정</Button><Button size="sm" variant="danger" icon={<Trash2 size={14}/>} onClick={() => editor.requestDelete(selected)}>삭제</Button></>
                : <span className="gx-readonly"><Lock size={13}/>{user ? '다른 회원의 기록 · 조회 전용' : '로그인하면 본인 기록을 관리할 수 있습니다'}</span>}>
          <div className="gx-detail-tags"><AssessmentTag assessment={selected.assessment}/><Tag>신뢰도 {selected.confidence}</Tag></div>
          <p className="gx-detail-text">{selected.content}</p>
          <DetailSection title="대상 사건 (incidents)">
            <Link to={`/events?id=${selected.incident_id}`} className="gx-linked-card"><span className="gx-code">{eventCode(selected.incident_id)}</span><b>{displayEventTitle(selected.incident_title)}</b>
              <span className="gx-detail-tags"><StatusTag status={selected.incident_status}/>{selected.incident_severity && <SeverityTag severity={selected.incident_severity}/>}<Tag>{selected.incident_sector}</Tag><Tag>{selected.incident_type}</Tag></span></Link>
          </DetailSection>
          <DetailSection title="작성자 (members)">
            <PropList items={[['회원', `${selected.nickname} · ${memberCode(selected.member_id)}`], ['이메일', selected.email], ['작성', formatDateTime(selected.created_at)], ['수정', formatDateTime(selected.updated_at)]]}/>
            <Link className="gx-link" to={`/members?id=${selected.member_id}`}>회원 상세 보기 →</Link>
          </DetailSection>
        </DetailPanel>}
      </div>
      {editor.modals}
    </div>;
}
