import { useMemo, useState } from 'react';
import { SOURCE_META, STATUS_META, sourceMeta } from '@/utils/constants';
import { formatMinutes, formatTime } from '@/utils/date';
import { eventCode } from '@/utils/format';
import { SourceIcon } from '@/components/ui/Badges';
import { GRAPH_H, GRAPH_W, computeLayout, sectorHalos } from './graphLayout';
const NODE_R = 19;
/**
 * 사건 관계 그래프 — 노드: 개별 훈련 이벤트 / 연결선: 같은 구역·지정 시간 범위 내 연관 후보.
 * 노드 색 = 정보 출처(대시보드 범주색) + 출처 아이콘, 노드 하단 작은 마커 = 처리 상태(모양).
 */
export function CorrelationGraph({ events, links, selectedId, onSelect }) {
    const [hoverId, setHoverId] = useState(null);
    const [hoverLink, setHoverLink] = useState(null);
    const layout = useMemo(() => computeLayout(events, links), [events, links]);
    const focusId = hoverId ?? selectedId;
    const neighbors = useMemo(() => {
        const set = new Set();
        if (focusId == null)
            return set;
        set.add(focusId);
        for (const l of links) {
            if (l.source === focusId)
                set.add(l.target);
            if (l.target === focusId)
                set.add(l.source);
        }
        return set;
    }, [focusId, links]);
    // 이웃이 있는 노드에 초점이 있을 때만 나머지를 흐리게 (고립 노드 선택 시 전체가 흐려지지 않도록)
    const dimmed = (id) => focusId != null && neighbors.size > 1 && !neighbors.has(id);
    const linkedIds = useMemo(() => new Set(links.flatMap((l) => [l.source, l.target])), [links]);
    const halos = useMemo(() => sectorHalos(events, layout), [events, layout]);
    const onKey = (e, id) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(id);
        }
    };
    return (<div className="relative">
      <svg viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} className="h-auto w-full" role="img" aria-label={`사건 관계 그래프: 노드 ${events.length}개, 연관 후보 연결선 ${links.length}개`}>
        <defs>
          <pattern id="gdots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="var(--border)"/>
          </pattern>
        </defs>
        <rect width={GRAPH_W} height={GRAPH_H} fill="url(#gdots)"/>

        {/* 구역 영역 */}
        {halos.map((h) => (<g key={h.id} aria-hidden>
            <circle cx={h.cx} cy={h.cy} r={h.r} fill="var(--sidebar)" stroke="var(--border)" strokeDasharray="4 5"/>
            <rect x={h.cx - 22} y={h.cy - h.r - 11} width={44} height={20} rx={4} fill="var(--panel)" stroke="var(--border-strong)"/>
            <text x={h.cx} y={h.cy - h.r + 3.5} textAnchor="middle" className="fill-ink-secondary" fontSize="12" fontWeight={600} letterSpacing="1">
              {h.id}
            </text>
          </g>))}

        {/* 연결선 */}
        {links.map((l) => {
            const a = layout.get(l.source);
            const b = layout.get(l.target);
            if (!a || !b)
                return null;
            const active = focusId != null && (l.source === focusId || l.target === focusId);
            const faded = focusId != null && !active;
            const isHover = hoverLink === l.key;
            return (<g key={l.key} onMouseEnter={() => setHoverLink(l.key)} onMouseLeave={() => setHoverLink(null)}>
              {/* 넓은 투명 히트 영역 */}
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={14}/>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={active || isHover ? 'var(--teal)' : 'var(--border-strong)'} strokeWidth={active || isHover ? 2.5 : 1.5} opacity={faded ? 0.15 : 1}/>
              {isHover && (<g transform={`translate(${(a.x + b.x) / 2}, ${(a.y + b.y) / 2})`}>
                  <rect x={-26} y={-10} width={52} height={20} rx={4} fill="var(--panel)" stroke="var(--border-strong)"/>
                  <text textAnchor="middle" dy="4" fontSize="11" className="fill-ink">
                    Δ{formatMinutes(l.diff_minutes)}
                  </text>
                </g>)}
            </g>);
        })}

        {/* 노드 */}
        {events.map((e) => {
            const n = layout.get(e.event_id);
            if (!n)
                return null;
            const m = sourceMeta(e.source_type);
            const sel = e.event_id === selectedId;
            const isolated = !linkedIds.has(e.event_id);
            const op = dimmed(e.event_id) ? 0.25 : isolated && !sel ? 0.5 : 1;
            const showLabel = sel || e.event_id === hoverId;
            const st = STATUS_META[e.status];
            return (<g key={e.event_id} transform={`translate(${n.x}, ${n.y})`} opacity={op} className="cursor-pointer outline-none [&:focus-visible>circle.ring]:stroke-accent" role="button" tabIndex={0} aria-pressed={sel} aria-label={`${eventCode(e.event_id)} ${e.sector} ${e.event_type} ${formatTime(e.occurred_at)} ${e.source_type} ${e.status}${isolated ? ', 연관 후보 없음' : ''}`} onClick={() => onSelect(e.event_id)} onKeyDown={(ev) => onKey(ev, e.event_id)} onMouseEnter={() => setHoverId(e.event_id)} onMouseLeave={() => setHoverId(null)} style={{ transition: 'opacity 160ms ease' }}>
              {sel && <circle r={NODE_R + 8} fill="none" stroke="var(--teal)" strokeWidth={2} opacity={0.9}/>}
              <circle className="ring" r={NODE_R + 2.5} fill="var(--panel)" stroke={sel ? 'var(--teal)' : 'var(--border)'} strokeWidth={1.5}/>
              <circle r={NODE_R} fill={m.color}/>
              <SourceIcon source={e.source_type} x={-10} y={-10} size={20} color="#fff"/>
              {/* 상태 마커 (모양 + 색) */}
              <g transform={`translate(${NODE_R * 0.78}, ${NODE_R * 0.78})`} aria-hidden>
                {st.shape === 'circle' && <circle r={6} fill={st.color} stroke="var(--panel)" strokeWidth={2}/>}
                {st.shape === 'diamond' && <rect x={-5} y={-5} width={10} height={10} transform="rotate(45)" fill={st.color} stroke="var(--panel)" strokeWidth={2}/>}
                {st.shape === 'square' && <rect x={-5.5} y={-5.5} width={11} height={11} rx={1.5} fill={st.color} stroke="var(--panel)" strokeWidth={2}/>}
              </g>
              {showLabel && <text y={NODE_R + 16} textAnchor="middle" fontSize="12.5" className="fill-ink-secondary" aria-hidden>{formatTime(e.occurred_at)}</text>}
              {showLabel && (<g aria-hidden>
                  <rect x={-62} y={-NODE_R - 32} width={124} height={22} rx={4} fill="var(--panel)" stroke="var(--border-strong)"/>
                  <text y={-NODE_R - 16.5} textAnchor="middle" fontSize="12.5" className="fill-ink">
                    {e.event_type.length > 10 ? e.event_type.slice(0, 10) + '…' : e.event_type}
                  </text>
                </g>)}
            </g>);
        })}
      </svg>
    </div>);
}
export function GraphLegend({ sources = Object.keys(SOURCE_META) }) {
    return <div className="graph-legend flex flex-wrap items-center gap-x-4 gap-y-2 text-ink-secondary"><span className="text-ink-muted">출처</span>{[...new Set(sources)].map((source) => <span key={source} className="inline-flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: sourceMeta(source).color }} aria-hidden><SourceIcon source={source} size={12} color="#fff"/></span>{source}</span>)}<span className="inline-flex items-center gap-1.5"><span className="block w-5 border-t-2" style={{ borderColor: 'var(--teal)' }} aria-hidden/>연관 후보</span><span className="text-ink-muted">노드를 선택하면 상세 정보를 확인할 수 있습니다.</span></div>;
}
