import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Background, Controls, Handle, MiniMap, Position, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api, errorMessage } from '@/services/api';
import { useEvents } from '@/context/EventsContext';
import { useQueryParams } from '@/hooks/useNavigation';
import { noteCode } from '@/hooks/useNoteEditor';
import { SECTORS } from '@/utils/sectors';
import { formatDateTime } from '@/utils/date';
import { displayEventTitle, eventCode, memberCode } from '@/utils/format';
import { AssessmentTag, DetailPanel, DetailSection, FilterBar, FilterSelect, PageBar, PropList, SeverityTag, StatusTag, Tag } from '@/components/gx/Explorer';

const KIND = { member: { label: '회원', code: memberCode }, incident: { label: '훈련 사건', code: eventCode }, note: { label: '분석 기록', code: noteCode } };

function GraphNode({ data, selected }) {
    return <div className={`gx-node is-${data.kind} ${selected ? 'is-selected' : ''} ${data.dim ? 'is-dim' : ''}`}>
      <Handle type="target" position={Position.Left} isConnectable={false}/>
      <span className="gx-node-kind">{KIND[data.kind].label} · {KIND[data.kind].code(data.id)}</span>
      <strong>{data.label}</strong>
      {data.sub && <small>{data.sub}</small>}
      <Handle type="source" position={Position.Right} isConnectable={false}/>
    </div>;
}
const nodeTypes = { gx: GraphNode };

export default function Graph() {
    const { notes, notesStatus, events } = useEvents();
    const [params, setParams] = useQueryParams();
    const [joined, setJoined] = useState([]);
    const [state, setState] = useState('loading');
    const [err, setErr] = useState('');
    const [sector, setSector] = useState('');
    const [selected, setSelected] = useState(null);
    const focusMember = params.get('member') ?? '';
    useEffect(() => {
        let alive = true;
        api.events.listWithAuthors().then((rows) => { if (alive) { setJoined(rows); setState('ready'); } }).catch((e) => { if (alive) { setErr(errorMessage(e)); setState('error'); } });
        return () => { alive = false; };
    }, [events]);
    const members = useMemo(() => {
        const map = new Map();
        joined.forEach((r) => map.set(r.member_id, { id: r.member_id, nickname: r.nickname, email: r.email }));
        notes.forEach((n) => { if (!map.has(n.member_id)) map.set(n.member_id, { id: n.member_id, nickname: n.nickname, email: n.email }); });
        return [...map.values()].sort((a, b) => a.id - b.id);
    }, [joined, notes]);
    const graph = useMemo(() => {
        let incidents = joined.filter((r) => !sector || r.sector === sector);
        let shownNotes = notes.filter((n) => incidents.some((i) => i.event_id === n.incident_id));
        let shownMembers = members;
        if (focusMember) {
            const id = Number(focusMember);
            const touched = new Set([...incidents.filter((i) => i.member_id === id).map((i) => i.event_id), ...shownNotes.filter((n) => n.member_id === id).map((n) => n.incident_id)]);
            incidents = incidents.filter((i) => touched.has(i.event_id));
            shownNotes = shownNotes.filter((n) => touched.has(n.incident_id));
            const people = new Set([id, ...incidents.map((i) => i.member_id), ...shownNotes.map((n) => n.member_id)]);
            shownMembers = members.filter((m) => people.has(m.id));
        }
        else {
            const people = new Set([...incidents.map((i) => i.member_id), ...shownNotes.map((n) => n.member_id)]);
            shownMembers = members.filter((m) => people.has(m.id));
        }
        const memberOrder = new Map(shownMembers.map((m, i) => [m.id, i]));
        incidents = [...incidents].sort((a, b) => (memberOrder.get(a.member_id) - memberOrder.get(b.member_id)) || a.event_id - b.event_id);
        const incidentOrder = new Map(incidents.map((i, idx) => [i.event_id, idx]));
        shownNotes = [...shownNotes].sort((a, b) => incidentOrder.get(a.incident_id) - incidentOrder.get(b.incident_id));
        // 사건이 많으면 7행마다 열을 나눠 가로로 배치합니다 (화면 비율에 맞추기 위함).
        const rowH = 78;
        const perCol = 7;
        const incCols = Math.max(1, Math.ceil(incidents.length / perCol));
        const colW = 260;
        const incX = (i) => 300 + Math.floor(i / perCol) * colW;
        const incRows = Math.min(perCol, incidents.length);
        const noteX = 300 + incCols * colW + 60;
        const span = Math.max(incRows, shownMembers.length, Math.min(shownNotes.length, perCol + 3)) * rowH;
        const place = (count, i) => (span - count * rowH) / 2 + i * rowH;
        const noteRows = Math.ceil(shownNotes.length / Math.max(1, Math.ceil(shownNotes.length / (perCol + 3))));
        const nodes = [
            ...shownMembers.map((m, i) => ({ id: `m${m.id}`, type: 'gx', position: { x: 0, y: place(shownMembers.length, i) }, data: { kind: 'member', id: m.id, label: m.nickname, sub: m.email, record: m } })),
            ...incidents.map((r, i) => ({ id: `i${r.event_id}`, type: 'gx', position: { x: incX(i), y: place(incRows, i % perCol) }, data: { kind: 'incident', id: r.event_id, label: displayEventTitle(r.title), sub: `${r.sector} · ${r.status} · ${r.severity}`, record: r } })),
            ...shownNotes.map((n, i) => ({ id: `n${n.note_id}`, type: 'gx', position: { x: noteX + Math.floor(i / noteRows) * colW, y: place(Math.min(noteRows, shownNotes.length), i % noteRows) }, data: { kind: 'note', id: n.note_id, label: n.title, sub: `${n.assessment} · 신뢰도 ${n.confidence}`, record: n } })),
        ];
        const edge = (id, source, target, label, cls) => ({ id, source, target, label, className: cls, labelStyle: { fill: 'var(--ink-muted)', fontSize: 10 }, labelBgStyle: { fill: 'var(--base)' } });
        const edges = [
            ...incidents.map((r) => edge(`a${r.event_id}`, `m${r.member_id}`, `i${r.event_id}`, '작성', 'is-authored')),
            ...shownNotes.map((n) => edge(`t${n.note_id}`, `i${n.incident_id}`, `n${n.note_id}`, '분석 대상', 'is-target')),
            ...shownNotes.map((n) => edge(`w${n.note_id}`, `m${n.member_id}`, `n${n.note_id}`, '작성', 'is-wrote')),
        ];
        return { nodes, edges, counts: { members: shownMembers.length, incidents: incidents.length, notes: shownNotes.length } };
    }, [joined, notes, members, sector, focusMember]);
    const neighbor = useMemo(() => {
        if (!selected) return null;
        const set = new Set([selected.id]);
        graph.edges.forEach((e) => { if (e.source === selected.id) set.add(e.target); if (e.target === selected.id) set.add(e.source); });
        return set;
    }, [selected, graph.edges]);
    const nodes = useMemo(() => graph.nodes.map((n) => ({ ...n, selected: selected?.id === n.id, data: { ...n.data, dim: neighbor ? !neighbor.has(n.id) : false } })), [graph.nodes, selected, neighbor]);
    const edges = useMemo(() => graph.edges.map((e) => ({ ...e, animated: false, className: `${e.className} ${neighbor && !(neighbor.has(e.source) && neighbor.has(e.target) && (e.source === selected.id || e.target === selected.id)) ? 'is-dim' : ''}` })), [graph.edges, neighbor, selected]);
    const setFocus = (v) => { const next = new URLSearchParams(params); if (v) next.set('member', v); else next.delete('member'); setParams(next, { replace: true }); setSelected(null); };
    const rec = selected?.data.record;
    const linked = selected ? graph.edges.filter((e) => e.source === selected.id || e.target === selected.id).map((e) => graph.nodes.find((n) => n.id === (e.source === selected.id ? e.target : e.source))).filter(Boolean) : [];
    const loading = state === 'loading' || notesStatus === 'loading';

    return <div className="gx-page gx-graph-page">
      <PageBar code="ANL-REL" title="관계 분석" description="회원 → 작성한 훈련 사건 → 분석 기록. 모든 연결선은 incidents.author_id, analysis_notes.incident_id / author_id 외래키를 JOIN한 실제 API 결과입니다."/>
      <FilterBar>
        <FilterSelect label="회원 중심" value={focusMember} onChange={setFocus} options={members.map((m) => ({ value: String(m.id), label: `${m.nickname} (${memberCode(m.id)})` }))} allLabel="전체 회원"/>
        <FilterSelect label="구역" value={sector} onChange={(v) => { setSector(v); setSelected(null); }} options={SECTORS.map((s) => ({ value: s.id, label: `${s.id} ${s.name}` }))}/>
        <span className="gx-filter-note">노드 {graph.nodes.length} · 회원 {graph.counts.members} · 사건 {graph.counts.incidents} · 분석 {graph.counts.notes} · 연결 {graph.edges.length}</span>
        <ul className="gx-graph-legend"><li className="is-member">회원</li><li className="is-incident">훈련 사건</li><li className="is-note">분석 기록</li></ul>
      </FilterBar>
      <div className={`gx-explorer gx-graph-wrap ${selected ? 'has-detail' : ''}`}>
        <div className="gx-graph">
          {loading ? <div className="gx-graph-state">관계 데이터를 불러오는 중…</div>
            : state === 'error' ? <div className="gx-graph-state is-error">{err}</div>
            : !graph.nodes.length ? <div className="gx-graph-state">표시할 관계가 없습니다. 필터를 해제하거나 사건을 등록하세요.</div>
            : <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.12 }} minZoom={0.2} maxZoom={1.8} nodesConnectable={false} nodesDraggable elementsSelectable
                onNodeClick={(_, node) => setSelected(selected?.id === node.id ? null : node)} onPaneClick={() => setSelected(null)} proOptions={{ hideAttribution: false }} colorMode="dark">
                <Background gap={24} color="var(--line)"/>
                <Controls showInteractive={false} position="bottom-left"/>
                <MiniMap pannable zoomable position="bottom-right" nodeColor={(n) => (n.data.kind === 'member' ? '#8b9bd8' : n.data.kind === 'incident' ? '#4fb3e3' : '#d9a441')} maskColor="rgba(8,12,18,.7)" style={{ background: 'var(--surface)' }}/>
              </ReactFlow>}
        </div>
        {selected && rec && <DetailPanel kicker={`${KIND[selected.data.kind].label} · ${KIND[selected.data.kind].code(selected.data.id)}`} title={selected.data.label} onClose={() => setSelected(null)}>
          {selected.data.kind === 'member' && <><PropList items={[['이메일', rec.email], ['연결', `${linked.length}개`]]}/><Link className="gx-link" to={`/members?id=${rec.id}`}>회원 상세 →</Link></>}
          {selected.data.kind === 'incident' && <><div className="gx-detail-tags"><StatusTag status={rec.status}/><SeverityTag severity={rec.severity}/><Tag>{rec.sector}</Tag></div><p className="gx-detail-text">{rec.description}</p>
            <PropList items={[['작성자', `${rec.nickname} · ${rec.email}`], ['발생', formatDateTime(rec.occurred_at)], ['유형', rec.event_type]]}/><Link className="gx-link" to={`/events?id=${rec.event_id}`}>사건 열기 →</Link></>}
          {selected.data.kind === 'note' && <><div className="gx-detail-tags"><AssessmentTag assessment={rec.assessment}/><Tag>신뢰도 {rec.confidence}</Tag></div><p className="gx-detail-text">{rec.content}</p>
            <PropList items={[['작성자', `${rec.nickname} · ${rec.email}`], ['대상 사건', `${eventCode(rec.incident_id)} ${displayEventTitle(rec.incident_title)}`], ['작성', formatDateTime(rec.created_at)]]}/><Link className="gx-link" to={`/notes?id=${rec.note_id}`}>분석 기록 열기 →</Link></>}
          <DetailSection title="연결된 객체" meta={`${linked.length}`}>
            <ul className="gx-linked">{linked.map((n) => <li key={n.id}><button type="button" onClick={() => setSelected(n)}><Tag>{KIND[n.data.kind].label}</Tag><span><b>{n.data.label}</b><small>{KIND[n.data.kind].code(n.data.id)}</small></span></button></li>)}</ul>
          </DetailSection>
        </DetailPanel>}
      </div>
    </div>;
}
