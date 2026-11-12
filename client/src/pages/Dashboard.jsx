import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle2, FileText, Lock, MessageSquarePlus, NotebookPen, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useEventEditor } from '@/hooks/useEventEditor';
import { useNoteEditor, noteCode } from '@/hooks/useNoteEditor';
import { canModifyEvent } from '@/utils/permissions';
import { TacticalMap } from '@/components/map/TacticalMap';
import { EVENT_STATUSES } from '@/domain';
import { SECTORS, getSector } from '@/utils/sectors';
import { formatDateTime, formatRelative, kstHour } from '@/utils/date';
import { displayEventTitle, eventCode, memberCode } from '@/utils/format';

const SEV_RANK = { 긴급: 3, 높음: 2, 보통: 1, 낮음: 0 };
const SEV_CHIP = { 긴급: 'is-crit', 높음: 'is-high', 보통: 'is-med', 낮음: 'is-low' };
const STATUS_CHIP = { 접수: 'is-high', '검토 중': 'is-med', '처리 완료': 'is-low' };
const ASSESS_CHIP = { 위험: 'is-crit', 주의: 'is-high', 관찰: 'is-med' };
const STATUS_STROKE = { 접수: 'var(--warn)', '검토 중': 'var(--info)', '처리 완료': 'var(--ok)' };

function Chip({ tone, children }) { return <span className={`gx-chip ${tone ?? ''}`}>{children}</span>; }
function Card({ title, meta, actions, children, className = '' }) {
    return <section className={`cx-card ${className}`}>
      <header className="cx-card-head"><h2>{title}</h2>{meta != null && <span className="cx-card-meta">{meta}</span>}{actions && <div className="cx-card-actions-top">{actions}</div>}</header>
      <div className="cx-card-body">{children}</div>
    </section>;
}
/** 도넛 차트: 상태별 비율 + 가운데 처리 완료율 */
function Donut({ items, center, label }) {
    const r = 15.9155, total = items.reduce((t, i) => t + i.value, 0) || 1;
    let offset = 25;
    return <div className="gx-donut-wrap">
      <svg viewBox="0 0 42 42" className="gx-donut" role="img" aria-label={`${label} ${center}`}>
        <circle cx="21" cy="21" r={r} fill="none" stroke="rgb(255 255 255 / .08)" strokeWidth="5"/>
        {items.map((it) => { const len = (it.value / total) * 100; const el = <circle key={it.label} cx="21" cy="21" r={r} fill="none" stroke={it.color} strokeWidth="5" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={offset}/>; offset -= len; return el; })}
        <text x="21" y="22" textAnchor="middle" className="gx-donut-value">{center}</text>
        <text x="21" y="27.5" textAnchor="middle" className="gx-donut-label">{label}</text>
      </svg>
      <ul className="gx-donut-legend">{items.map((it) => <li key={it.label}><i style={{ background: it.color }}/>{it.label}<b>{it.value}</b></li>)}</ul>
    </div>;
}

export default function Dashboard() {
    const { user } = useAuth();
    const { events, notes, dataset, status, error, reload, authorOf } = useEvents();
    const [selectedId, setSelectedId] = useState(null);
    const editor = useEventEditor({ onCreated: (saved) => setSelectedId(saved.event_id), onDeleted: () => setSelectedId(null) });
    const noteEditor = useNoteEditor();
    const [sector, setSector] = useState('');
    const loading = status === 'loading';
    const scoped = useMemo(() => (sector ? events.filter((e) => e.sector === sector) : events), [events, sector]);
    const unresolved = scoped.filter((e) => e.status !== '처리 완료');
    const done = scoped.length - unresolved.length;
    const pct = scoped.length ? Math.round((done / scoped.length) * 100) : 0;
    const critical = unresolved.filter((e) => SEV_RANK[e.severity] >= 2);
    const queue = useMemo(() => [...unresolved].sort((a, b) => (SEV_RANK[b.severity] - SEV_RANK[a.severity]) || b.occurred_at.localeCompare(a.occurred_at)).slice(0, 5), [unresolved]);
    const feed = useMemo(() => [
        ...events.map((e) => ({ kind: 'EV', at: e.created_at, key: `e${e.event_id}`, item: e })),
        ...notes.map((n) => ({ kind: 'AN', at: n.created_at, key: `n${n.note_id}`, item: n })),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6), [events, notes]);
    const bySector = useMemo(() => SECTORS.map((s) => {
        const rows = events.filter((e) => e.sector === s.id);
        return { ...s, total: rows.length, counts: EVENT_STATUSES.map((st) => rows.filter((e) => e.status === st).length), hot: rows.some((e) => e.status !== '처리 완료' && SEV_RANK[e.severity] >= 2) };
    }), [events]);
    const hourly = useMemo(() => Array.from({ length: 24 }, (_, h) => ({ hour: String(h).padStart(2, '0'), count: scoped.filter((e) => kstHour(e.occurred_at) === h).length })), [scoped]);
    const selected = events.find((e) => e.event_id === selectedId);
    const selectedNotes = selected ? notes.filter((n) => n.incident_id === selected.event_id) : [];
    const canEdit = selected && canModifyEvent(selected, user);
    const select = (id) => setSelectedId(id === selectedId ? null : id);
    const stats = [
        { icon: FileText, tone: 'h-blue', label: '훈련 사건', value: scoped.length },
        { icon: Activity, tone: 'h-amber', label: '진행 중', value: unresolved.length },
        { icon: AlertTriangle, tone: 'h-pink', label: '긴급·높음', value: critical.length },
        { icon: CheckCircle2, tone: 'h-green', label: '처리 완료', value: done },
        { icon: NotebookPen, tone: 'h-violet', label: '분석 기록', value: notes.length },
        { icon: Users, tone: 'h-cyan', label: '작성 회원', value: new Set(events.map((e) => e.member_id)).size },
    ];

    return <div className="cx-dash">
      {/* 왼쪽 열 */}
      <div className="cx-col">
        <Card title="훈련 현황" meta={sector ? `${sector} 구역` : '전체 구역'}>
          <div className="cx-stat-grid">{stats.map(({ icon: Icon, tone, label, value }) => <div key={label} className="cx-stat">
              <span className={`cx-stat-icon ${tone}`}><Icon size={16} strokeWidth={2} aria-hidden/></span>
              <span className="cx-stat-label">{label}</span><b className="cx-stat-value">{loading ? '—' : value}</b>
            </div>)}</div>
        </Card>
        <Card title="구역별 현황" meta="눌러서 구역 선택">
          <div className="cx-sector-grid">{bySector.map((s) => <button key={s.id} type="button" className={`cx-sector ${sector === s.id ? 'is-active' : ''}`} aria-pressed={sector === s.id} onClick={() => setSector(sector === s.id ? '' : s.id)}>
              <span className="cx-sector-id">{s.id}{s.hot && <i title="긴급·높음 미처리"/>}</span><span className="cx-sector-name">{s.name}</span>
              <b>{s.total}</b>
              <span className="cx-sector-counts"><em className="t-warn">●{s.counts[0]}</em><em className="t-info">◆{s.counts[1]}</em><em className="t-ok">■{s.counts[2]}</em></span>
            </button>)}</div>
        </Card>
        <Card title="처리 상태" meta="incidents.status">
          <Donut items={EVENT_STATUSES.map((st) => ({ label: st, value: scoped.filter((e) => e.status === st).length, color: STATUS_STROKE[st] }))} center={`${pct}%`} label="처리 완료율"/>
        </Card>
      </div>

      {/* 가운데: 지도 */}
      <div className="cx-center">
        <section className="cx-map-card">
          <div className="cx-hero">
            <p>현재 <b>GOTHAM 가상 훈련구역</b>의</p>
            <h1><strong>{loading ? '—' : unresolved.length}</strong>건 진행 중 <span>/ 전체 {loading ? '—' : scoped.length}건</span></h1>
            <p>분석 기록 {notes.length}건 · 공개 관측 {dataset.length.toLocaleString()}건 보관</p>
            {sector && <button type="button" className="gx-chip is-sel" onClick={() => setSector('')}>{sector} 구역만 보기<X size={12}/></button>}
            {error && <p className="cx-error">{error} <button type="button" className="gx-link" onClick={reload}>다시 시도</button></p>}
          </div>
          <TacticalMap events={scoped} selectedId={selectedId} onSelect={select} highlightSector={sector || undefined} className="cx-dash-map"/>
          <ul className="cx-map-legend"><li><i className="st-c"/>접수</li><li><i className="st-d"/>검토 중</li><li><i className="st-s"/>처리 완료</li></ul>
        </section>
        <Card title="시간대별 발생 (KST)" meta={sector ? `${sector} 구역` : '전체 구역'} className="cx-chart-card">
          <div className="cx-chart">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={hourly} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs><linearGradient id="cx-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgb(45 224 208)"/><stop offset="1" stopColor="rgb(56 120 255)" stopOpacity=".55"/></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="rgb(120 180 255 / .12)"/>
              <XAxis dataKey="hour" tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgb(120 180 255 / .2)' }} interval={1}/>
              <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} tickLine={false} axisLine={false}/>
              <Tooltip cursor={{ fill: 'rgb(56 182 255 / .08)' }} contentStyle={{ background: 'rgb(10 30 60 / .95)', border: '1px solid rgb(120 180 255 / .3)', borderRadius: 8, fontSize: 12 }} labelFormatter={(h) => `${h}:00`} formatter={(v) => [`${v}건`, '사건']}/>
              <Bar dataKey="count" fill="url(#cx-bar)" radius={[4, 4, 0, 0]} maxBarSize={14}/>
            </BarChart></ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 오른쪽 열 */}
      <div className="cx-col">
        <Card title={selected ? '선택한 사건' : '사건 선택'} meta={selected ? eventCode(selected.event_id) : '지도 핀을 누르세요'} actions={selected && <button type="button" className="gx-tool" onClick={() => setSelectedId(null)} aria-label="선택 해제"><X size={15}/></button>}>
          {!selected ? <div className="cx-quick">
              <p className="gx-muted">지도 핀이나 대기열에서 사건을 고르면 상세와 연결된 분석 기록이 여기에 표시됩니다.</p>
              <div><button type="button" className="app-button is-primary is-small" onClick={editor.openCreate}><Plus size={14}/>사건 등록</button><button type="button" className="app-button is-small" onClick={() => noteEditor.openCreate()}><NotebookPen size={14}/>분석 기록</button></div>
            </div> : <div className="cx-selected">
              <h3>{displayEventTitle(selected.title)}</h3>
              <div className="cx-tags"><Chip tone={STATUS_CHIP[selected.status]}>{selected.status}</Chip><Chip tone={SEV_CHIP[selected.severity]}>{selected.severity}</Chip><Chip>{selected.sector} · {getSector(selected.sector)?.name}</Chip></div>
              <dl className="gx-kv is-rows"><div><dt>유형</dt><dd>{selected.event_type}</dd></div><div><dt>발생</dt><dd>{formatDateTime(selected.occurred_at)}</dd></div><div><dt>작성</dt><dd>{authorOf(selected.member_id)} · {memberCode(selected.member_id)}</dd></div></dl>
              <p className="gx-desc">{selected.description}</p>
              <div className="cx-btn-row">
                {canEdit ? <><button type="button" className="app-button is-small" onClick={() => editor.openEdit(selected)}><Pencil size={14}/>수정</button><button type="button" className="app-button is-danger is-small" onClick={() => editor.requestDelete(selected)}><Trash2 size={14}/>삭제</button></>
                    : <span className="gx-muted"><Lock size={12}/> {user ? '다른 회원의 사건 · 조회 전용' : '로그인하면 본인 사건을 관리합니다'}</span>}
                <button type="button" className="app-button is-small" onClick={() => noteEditor.openCreate(selected.event_id)}><MessageSquarePlus size={14}/>분석 기록</button>
              </div>
              <div className="cx-sub-head"><span>분석 기록</span><Chip tone={selectedNotes.length ? 'is-low' : undefined}>{selectedNotes.length}건</Chip></div>
              {selectedNotes.length ? <ul className="gx-reqs">{selectedNotes.map((n) => <li key={n.note_id}><Link to={`/notes?id=${n.note_id}`}><Chip tone={ASSESS_CHIP[n.assessment]}>{n.assessment}</Chip><span><b>{n.title}</b><small>{n.nickname} · 신뢰도 {n.confidence}</small></span></Link></li>)}</ul> : <p className="gx-muted">아직 분석이 없습니다.</p>}
              <Link to={`/events?id=${selected.event_id}`} className="gx-link">사건 목록에서 열기 →</Link>
            </div>}
        </Card>
        <Card title="우선 처리 대기열" meta={`미처리 ${unresolved.length}건`}>
          {!queue.length ? <p className="gx-muted">미처리 사건이 없습니다.</p> : <ul className="cx-rows">{queue.map((e) => <li key={e.event_id}>
              <button type="button" className={selectedId === e.event_id ? 'is-active' : ''} onClick={() => select(e.event_id)}>
                <Chip tone={SEV_CHIP[e.severity]}>{e.severity}</Chip><span><b>{displayEventTitle(e.title)}</b><small>{e.sector} · {e.status} · {formatRelative(e.occurred_at)}</small></span>
              </button></li>)}</ul>}
        </Card>
        <Card title="최근 활동" meta="등록 시각순">
          <ul className="cx-rows">{feed.map(({ kind, key, item, at }) => <li key={key}>
              {kind === 'AN' ? <Link to={`/notes?id=${item.note_id}`}><span className="cx-kind is-note">AN</span><span><b>{item.title}</b><small>{item.nickname} · {noteCode(item.note_id)} → {eventCode(item.incident_id)} · {formatRelative(at)}</small></span></Link>
                  : <button type="button" onClick={() => select(item.event_id)}><span className="cx-kind">EV</span><span><b>{displayEventTitle(item.title)}</b><small>{authorOf(item.member_id)} · {item.sector} · {formatRelative(at)}</small></span></button>}
            </li>)}</ul>
        </Card>
      </div>
      {editor.modals}
      {noteEditor.modals}
    </div>;
}
