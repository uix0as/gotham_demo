import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, MessageSquarePlus, NotebookPen, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useEventEditor } from '@/hooks/useEventEditor';
import { useNoteEditor, noteCode } from '@/hooks/useNoteEditor';
import { canModifyEvent } from '@/utils/permissions';
import { TacticalMap } from '@/components/map/TacticalMap';
import { MarkerShape } from '@/components/map/MarkerShape';
import { EVENT_STATUSES } from '@/domain';
import { STATUS_META } from '@/utils/constants';
import { SECTORS, getSector } from '@/utils/sectors';
import { formatDateTime, formatRelative, kstHour } from '@/utils/date';
import { displayEventTitle, eventCode, memberCode } from '@/utils/format';

const SEV_RANK = { 긴급: 3, 높음: 2, 보통: 1, 낮음: 0 };
/** 심각도는 빨강 계열로만 구분합니다. 상태색(호박·연보라·초록)과 겹치지 않도록. */
const SEV_CHIP = { 긴급: 'is-crit', 높음: 'is-high', 보통: 'is-med', 낮음: 'is-low' };
const ASSESS_CHIP = { 위험: 'is-crit', 주의: 'is-high', 관찰: 'is-med' };
const ICON = { size: 16, strokeWidth: 1.5, 'aria-hidden': true };
const CHART_INK = { tick: 'rgb(133 133 139)', grid: 'rgb(237 237 237 / .06)', bar: 'rgb(133 133 139 / .5)', peak: 'rgb(237 237 237)' };

function Chip({ tone, children }) { return <span className={`gx-chip ${tone ?? ''}`}>{children}</span>; }
/** 상태 표식: 지도 핀과 같은 모양(원·마름모·사각) + 라벨 */
function StatusMark({ status }) {
    return <span className="cx-status-mark"><span><MarkerShape status={status} size={8}/></span>{status}</span>;
}
function Card({ title, meta, metaMono, actions, children, className = '' }) {
    return <section className={`cx-card ${className}`}>
      <header className="cx-card-head"><h2>{title}</h2>{meta != null && <span className={`cx-card-meta ${metaMono ? 'is-mono' : ''}`}>{meta}</span>}{actions && <div className="cx-card-actions-top">{actions}</div>}</header>
      <div className="cx-card-body">{children}</div>
    </section>;
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
    const sectorMax = Math.max(1, ...bySector.map((s) => s.total));
    const statusShare = EVENT_STATUSES.map((st) => ({ status: st, value: scoped.filter((e) => e.status === st).length }));
    const hourly = useMemo(() => Array.from({ length: 24 }, (_, h) => ({ hour: String(h).padStart(2, '0'), count: scoped.filter((e) => kstHour(e.occurred_at) === h).length })), [scoped]);
    const peak = hourly.reduce((best, h) => (h.count > best.count ? h : best), hourly[0]);
    const selected = events.find((e) => e.event_id === selectedId);
    const selectedNotes = selected ? notes.filter((n) => n.incident_id === selected.event_id) : [];
    const canEdit = selected && canModifyEvent(selected, user);
    const select = (id) => setSelectedId(id === selectedId ? null : id);
    const scopeLabel = sector ? `${sector} 구역` : '전체 구역';
    const fig = (v) => (loading ? '—' : v.toLocaleString());
    const stats = [
        { label: '훈련 사건', value: scoped.length },
        { label: '진행 중', value: unresolved.length },
        { label: '긴급·높음 미처리', value: critical.length, danger: critical.length > 0 },
        { label: '처리 완료', value: done },
        { label: '분석 기록', value: notes.length },
        { label: '작성 회원', value: new Set(events.map((e) => e.member_id)).size },
    ];

    return <div className="cx-dash">
      {/* 왼쪽 열 */}
      <div className="cx-col">
        <Card title="훈련 현황" meta={scopeLabel}>
          <dl className="cx-stat-grid">{stats.map(({ label, value, danger }) => <div key={label} className="cx-stat">
              <dt>{label}</dt><dd className={danger ? 'is-danger' : ''}>{fig(value)}</dd>
            </div>)}</dl>
        </Card>
        <Card title="구역별 현황" meta={sector ? `${sector} 선택됨` : '눌러서 필터'}>
          <ul className="cx-sector-list">{bySector.map((s) => <li key={s.id}>
              <button type="button" className={`cx-sector ${sector === s.id ? 'is-active' : ''}`} aria-pressed={sector === s.id} onClick={() => setSector(sector === s.id ? '' : s.id)}
                aria-label={`${s.id} ${s.name}, 전체 ${s.total}건, ${EVENT_STATUSES.map((st, i) => `${st} ${s.counts[i]}`).join(', ')}${s.hot ? ', 긴급·높음 미처리 있음' : ''}`}>
                <span className="cx-sector-id">{s.id}{s.hot && <i title="긴급·높음 미처리"/>}</span>
                <span className="cx-sector-name">{s.name}</span>
                <b>{s.total}</b>
                <span className="cx-sector-bar" aria-hidden>{EVENT_STATUSES.map((st, i) => s.counts[i] > 0 && <span key={st} style={{ width: `${(s.counts[i] / sectorMax) * 100}%`, background: STATUS_META[st].color }}/>)}</span>
              </button>
            </li>)}</ul>
        </Card>
        <Card title="처리 상태" meta="incidents.status" metaMono>
          <div className="cx-share-figure"><b>{loading ? '—' : `${pct}%`}</b><span>처리 완료율</span></div>
          <div className="cx-share-bar" role="img" aria-label={statusShare.map((s) => `${s.status} ${s.value}건`).join(', ')}>
            {statusShare.map((s) => s.value > 0 && <span key={s.status} style={{ flexGrow: s.value, background: STATUS_META[s.status].color }}/>)}
          </div>
          <ul className="cx-share-legend">{statusShare.map((s) => <li key={s.status}>
              <MarkerShape status={s.status} size={8}/><span>{s.status}</span><b>{s.value}</b><small>{scoped.length ? Math.round((s.value / scoped.length) * 100) : 0}%</small>
            </li>)}</ul>
        </Card>
      </div>

      {/* 가운데: 지도 */}
      <div className="cx-center">
        <section className="cx-map-card">
          <div className="cx-hero">
            <div className="cx-hero-main">
              <span className="cx-hero-kicker">GOTHAM 가상 훈련구역 · {scopeLabel}</span>
              <h1><strong>{fig(unresolved.length)}</strong>건 진행 중<span>전체 {fig(scoped.length)}건</span></h1>
            </div>
            <div className="cx-hero-side">
              {sector && <button type="button" className="gx-chip is-sel" onClick={() => setSector('')}>{sector} 구역만 보기<X size={12} strokeWidth={1.5} aria-label="필터 해제"/></button>}
              <p>분석 기록 {notes.length}건 · 공개 관측 {dataset.length.toLocaleString()}건 보관</p>
            </div>
            {error && <p className="cx-error">{error} <button type="button" className="gx-link" onClick={reload}>다시 시도</button></p>}
          </div>
          <TacticalMap events={scoped} selectedId={selectedId} onSelect={select} highlightSector={sector || undefined} className="cx-dash-map"/>
          <ul className="cx-map-legend">{EVENT_STATUSES.map((st) => <li key={st}><MarkerShape status={st} size={8}/>{st}</li>)}</ul>
        </section>
        <Card title="시간대별 발생" meta={`KST · ${scopeLabel}`} className="cx-chart-card">
          <div className="cx-chart-head">{peak.count > 0 ? <span>가장 많은 시간 <b>{peak.hour}시 · {peak.count}건</b></span> : <span>발생 기록 없음</span>}</div>
          <div className="cx-chart">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={hourly} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
              <CartesianGrid vertical={false} stroke={CHART_INK.grid}/>
              <XAxis dataKey="hour" tick={{ fill: CHART_INK.tick, fontSize: 11, fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={{ stroke: CHART_INK.grid }} interval={1}/>
              <YAxis allowDecimals={false} tick={{ fill: CHART_INK.tick, fontSize: 11, fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false}/>
              <Tooltip cursor={{ fill: 'rgb(237 237 237 / .04)' }} contentStyle={{ background: '#232325', border: '1px solid rgb(237 237 237 / .1)', borderRadius: 8, fontSize: 12, color: '#ededed' }} labelStyle={{ color: '#a1a1a6' }} itemStyle={{ color: '#ededed' }} labelFormatter={(h) => `${h}:00`} formatter={(v) => [`${v}건`, '사건']}/>
              <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={16}>
                {hourly.map((h) => <Cell key={h.hour} fill={peak.count > 0 && h.count === peak.count ? CHART_INK.peak : CHART_INK.bar}/>)}
              </Bar>
            </BarChart></ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 오른쪽 열 */}
      <div className="cx-col">
        <Card title={selected ? '선택한 사건' : '사건 선택'} meta={selected ? eventCode(selected.event_id) : '지도 핀이나 대기열에서'} metaMono={!!selected} actions={selected && <button type="button" className="gx-tool" onClick={() => setSelectedId(null)} aria-label="선택 해제"><X {...ICON}/></button>}>
          {!selected ? <div className="cx-quick">
              <p>지도 핀이나 대기열에서 사건을 고르면 상세와 연결된 분석 기록이 여기에 표시됩니다.</p>
              <div><button type="button" className="app-button is-primary is-small" onClick={editor.openCreate}><Plus {...ICON}/>사건 등록</button><button type="button" className="app-button is-small" onClick={() => noteEditor.openCreate()}><NotebookPen {...ICON}/>분석 기록</button></div>
            </div> : <div className="cx-selected">
              <h3>{displayEventTitle(selected.title)}</h3>
              <div className="cx-tags"><StatusMark status={selected.status}/><Chip tone={SEV_CHIP[selected.severity]}>{selected.severity}</Chip><Chip>{selected.sector} · {getSector(selected.sector)?.name}</Chip></div>
              <dl className="gx-kv is-rows"><div><dt>유형</dt><dd>{selected.event_type}</dd></div><div><dt>발생</dt><dd>{formatDateTime(selected.occurred_at)}</dd></div><div><dt>작성</dt><dd>{authorOf(selected.member_id)} · {memberCode(selected.member_id)}</dd></div></dl>
              <p className="gx-desc">{selected.description}</p>
              <div className="cx-btn-row">
                {canEdit ? <><button type="button" className="app-button is-small" onClick={() => editor.openEdit(selected)}><Pencil {...ICON}/>수정</button><button type="button" className="app-button is-danger is-small" onClick={() => editor.requestDelete(selected)}><Trash2 {...ICON}/>삭제</button></>
                    : <span className="gx-muted"><Lock size={12} strokeWidth={1.5} aria-hidden/> {user ? '다른 회원의 사건 · 조회 전용' : '로그인하면 본인 사건을 관리합니다'}</span>}
                <button type="button" className="app-button is-small" onClick={() => noteEditor.openCreate(selected.event_id)}><MessageSquarePlus {...ICON}/>분석 기록</button>
              </div>
              <div className="cx-sub-head"><span>분석 기록</span><small>{selectedNotes.length}건</small></div>
              {selectedNotes.length ? <ul className="gx-reqs">{selectedNotes.map((n) => <li key={n.note_id}><Link to={`/notes?id=${n.note_id}`}><Chip tone={ASSESS_CHIP[n.assessment]}>{n.assessment}</Chip><span><b>{n.title}</b><small>{n.nickname} · 신뢰도 {n.confidence}</small></span></Link></li>)}</ul> : <p className="gx-muted">아직 분석이 없습니다.</p>}
              <Link to={`/events?id=${selected.event_id}`} className="gx-link">사건 목록에서 열기 →</Link>
            </div>}
        </Card>
        <Card title="우선 처리 대기열" meta={`미처리 ${unresolved.length}건`}>
          {!queue.length ? <p className="gx-muted">미처리 사건이 없습니다.</p> : <ul className="cx-rows">{queue.map((e) => <li key={e.event_id}>
              <button type="button" className={selectedId === e.event_id ? 'is-active' : ''} onClick={() => select(e.event_id)}>
                <Chip tone={SEV_CHIP[e.severity]}>{e.severity}</Chip>
                <span className="cx-row-text"><b>{displayEventTitle(e.title)}</b><small><span className="cx-mono">{e.sector}</span><StatusMark status={e.status}/><span>{formatRelative(e.occurred_at)}</span></small></span>
              </button></li>)}</ul>}
        </Card>
        <Card title="최근 활동" meta="등록 시각순">
          <ul className="cx-rows">{feed.map(({ kind, key, item, at }) => <li key={key}>
              {kind === 'AN' ? <Link to={`/notes?id=${item.note_id}`}><span className="cx-kind">분석</span><span className="cx-row-text"><b>{item.title}</b><small>{item.nickname}<span className="cx-mono">{noteCode(item.note_id)} → {eventCode(item.incident_id)}</span><span>{formatRelative(at)}</span></small></span></Link>
                  : <button type="button" onClick={() => select(item.event_id)}><span className="cx-kind">사건</span><span className="cx-row-text"><b>{displayEventTitle(item.title)}</b><small>{authorOf(item.member_id)}<span className="cx-mono">{item.sector}</span><span>{formatRelative(at)}</span></small></span></button>}
            </li>)}</ul>
        </Card>
      </div>
      {editor.modals}
      {noteEditor.modals}
    </div>;
}
