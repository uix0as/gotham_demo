import { useMemo, useRef, useState } from 'react';
import { SECTORS, polygonPoints, sectorAt } from '@/utils/sectors';
import { STATUS_META } from '@/utils/constants';
import { formatTime } from '@/utils/date';
import { cx, eventCode } from '@/utils/format';
import { MarkerShape } from './MarkerShape';
/**
 * 가상 훈련구역 지도.
 * - 배경: SVG (viewBox 0~100 정규화 좌표, 실제 지형 아님)
 * - 마커/라벨: HTML 오버레이(%) — 비율이 변해도 마커 모양이 찌그러지지 않음
 */
export function TacticalMap({ events, selectedId, onSelect, links = [], highlightSector, pickMode, picked, onPick, compact, className, ariaLabel = '가상 훈련구역 지도', }) {
    const ref = useRef(null);
    const [hover, setHover] = useState(null);
    const byId = useMemo(() => new Map(events.map((e) => [e.event_id, e])), [events]);
    const selected = selectedId != null ? byId.get(selectedId) : undefined;
    const activeSector = highlightSector ?? selected?.sector ?? null;
    const toCoord = (e) => {
        const rect = ref.current.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
        const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
        return { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
    };
    const handleClick = (e) => {
        if (!pickMode || !onPick)
            return;
        const { x, y } = toCoord(e);
        onPick(x, y, sectorAt(x, y));
    };
    const selectedLinks = selected ? links.filter((l) => l.source === selected.event_id || l.target === selected.event_id) : [];
    return (<div ref={ref} className={cx('relative w-full select-none overflow-hidden rounded-lg border border-line bg-panel', compact ? 'aspect-[16/11]' : 'aspect-[16/11] lg:aspect-[16/10]', pickMode && 'cursor-crosshair', className)} onClick={handleClick} onMouseMove={pickMode ? (e) => setHover(toCoord(e)) : undefined} onMouseLeave={pickMode ? () => setHover(null) : undefined} role={pickMode ? 'application' : 'group'} aria-label={pickMode ? `${ariaLabel} — 클릭하여 좌표 선택` : ariaLabel}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id="hatch" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="2" stroke="var(--border)" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
          </pattern>

        </defs>

        {/* 격자 */}
        {Array.from({ length: 21 }).map((_, i) => (<g key={i}>
            <line x1={i * 5} y1={0} x2={i * 5} y2={100} stroke={'var(--border)'} strokeWidth="1" vectorEffect="non-scaling-stroke"/>
            <line x1={0} y1={i * 5} x2={100} y2={i * 5} stroke={'var(--border)'} strokeWidth="1" vectorEffect="non-scaling-stroke"/>
          </g>))}

        {/* 구역 */}
        {SECTORS.map((s) => {
            const active = s.id === activeSector;
            return (<g key={s.id}>
              <polygon points={polygonPoints(s.polygon)} fill={active ? 'var(--teal-soft)' : 'transparent'}/>
              {active && <polygon points={polygonPoints(s.polygon)} fill="url(#hatch)"/>}
              <polygon points={polygonPoints(s.polygon)} fill="none" stroke={active ? 'var(--teal)' : 'var(--border-strong)'} strokeWidth={active ? 1.6 : 1} strokeDasharray={active ? undefined : '4 3'} vectorEffect="non-scaling-stroke"/>
            </g>);
        })}

        {/* 연관선 */}
        {links.map((l) => {
            const a = byId.get(l.source);
            const b = byId.get(l.target);
            if (!a || !b)
                return null;
            const hl = selectedLinks.includes(l);
            return (<line key={l.key} x1={a.map_x} y1={a.map_y} x2={b.map_x} y2={b.map_y} stroke={hl ? 'var(--teal)' : 'var(--border-strong)'} strokeWidth={hl ? 2 : 1.25} strokeDasharray={hl ? undefined : '3 3'} vectorEffect="non-scaling-stroke"/>);
        })}


        {/* 좌표 선택 십자선 */}
        {pickMode && hover && (<g stroke="var(--text-muted)" strokeWidth="1" vectorEffect="non-scaling-stroke">
            <line x1={hover.x} y1={0} x2={hover.x} y2={100} vectorEffect="non-scaling-stroke"/>
            <line x1={0} y1={hover.y} x2={100} y2={hover.y} vectorEffect="non-scaling-stroke"/>
          </g>)}
      </svg>

      {/* 좌표 눈금 */}
      {!compact && (<>
          {[20, 40, 60, 80].map((v) => (<span key={`x${v}`} className="pointer-events-none absolute top-1 -translate-x-1/2 text-[11px] text-ink-muted" style={{ left: `${v}%` }}>
              {v}
            </span>))}
          {[20, 40, 60, 80].map((v) => (<span key={`y${v}`} className="pointer-events-none absolute left-1 -translate-y-1/2 text-[11px] text-ink-muted" style={{ top: `${v}%` }}>
              {v}
            </span>))}
        </>)}

      {/* 구역 라벨 */}
      {SECTORS.map((s) => (<div key={s.id} className="pointer-events-none absolute -translate-x-1/2 text-center" style={{ left: `${s.label[0]}%`, top: `${s.label[1]}%` }}>
          <span className={cx('block font-semibold tracking-wider', compact ? 'text-[11px]' : 'text-xs', s.id === activeSector ? 'text-accent' : 'text-ink-secondary')}>
            {s.id}
          </span>
          {!compact && <span className="hidden text-[11px] text-ink-muted sm:block">{s.name}</span>}
        </div>))}

      {/* 사건 마커 */}
      {events.map((e) => {
            const isSel = e.event_id === selectedId;
            return (<button key={e.event_id} type="button" onClick={(ev) => {
                    ev.stopPropagation();
                    onSelect?.(e.event_id);
                }} disabled={!onSelect} className={cx('console-icon map-event-marker group absolute -translate-x-1/2 -translate-y-1/2 rounded-full', isSel ? 'z-30' : 'z-20 hover:z-30 focus-visible:z-30', !onSelect && 'cursor-default')} style={{ left: `${e.map_x}%`, top: `${e.map_y}%` }} aria-label={`${eventCode(e.event_id)} ${e.event_type}, ${e.sector} 구역, ${formatTime(e.occurred_at)}, 상태 ${e.status}`} aria-pressed={onSelect ? isSel : undefined}>

            <span className={cx('relative flex items-center justify-center rounded-full', isSel && 'rounded-full')}>
              <MarkerShape status={e.status} size={compact ? 9 : 12}/>
            </span>
            {!compact && (<span className={cx('pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded border border-line-strong bg-elevated/95 px-1.5 py-0.5 text-[11px] text-ink shadow-panel', isSel ? 'block' : 'hidden group-hover:block group-focus-visible:block')}>
                <span className="text-ink-muted">{formatTime(e.occurred_at)}</span> {e.event_type}
              </span>)}
          </button>);
        })}

      {/* 선택 좌표 */}
      {pickMode && picked && (<div className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2" style={{ left: `${picked.x}%`, top: `${picked.y}%` }}>
          <span className="block h-5 w-5 rounded-full border-2 border-accent bg-accent/25 "/>
          <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-accent-ink">
            {picked.x}, {picked.y}
          </span>
        </div>)}
      {pickMode && hover && (<div className="pointer-events-none absolute right-2 top-2 z-40 rounded border border-line-strong bg-elevated/90 px-2 py-1 text-[11px] text-ink-secondary">
          X {hover.x} · Y {hover.y} · {sectorAt(hover.x, hover.y) ?? '경계'}
        </div>)}

      <div className="pointer-events-none absolute bottom-1.5 right-2 text-[11px] tracking-wider text-ink-muted">
        예시 구역 · 정규화 좌표 · 실제 지형 아님
      </div>
    </div>);
}
export function MapLegend({ showLinks }) {
    return (<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-2xs text-ink-secondary">
      {Object.keys(STATUS_META).map((s) => (<span key={s} className="inline-flex items-center gap-1.5">
          <MarkerShape status={s} size={9}/>
          {s}
        </span>))}
      {showLinks && (<span className="inline-flex items-center gap-1.5">
          <span className="block h-px w-4 border-t border-dashed border-accent" aria-hidden/>
          연관 후보
        </span>)}
    </div>);
}
