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
    return (<div ref={ref} className={cx('cx-map', compact && 'is-compact', pickMode && 'is-pick', className)} onClick={handleClick} onMouseMove={pickMode ? (e) => setHover(toCoord(e)) : undefined} onMouseLeave={pickMode ? () => setHover(null) : undefined} role={pickMode ? 'application' : 'group'} aria-label={pickMode ? `${ariaLabel} — 클릭하여 좌표 선택` : ariaLabel}>
      {/* 배경: 공개 위성사진 (NASA Earth Observatory / USGS Landsat, Public domain) */}
      <img src="/map/terrain-marlborough.jpg" alt="" className="cx-map-photo" draggable="false"/>
      <div className="cx-map-shade" aria-hidden/>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="cx-map-svg" aria-hidden>
        {SECTORS.map((s) => {
            const active = s.id === activeSector;
            return <polygon key={s.id} points={polygonPoints(s.polygon)} className={cx('cx-zone', active && 'is-active')} vectorEffect="non-scaling-stroke"/>;
        })}
        {links.map((l) => {
            const a = byId.get(l.source);
            const b = byId.get(l.target);
            if (!a || !b) return null;
            const hl = selectedLinks.includes(l);
            return <line key={l.key} x1={a.map_x} y1={a.map_y} x2={b.map_x} y2={b.map_y} className={cx('cx-link', hl && 'is-hl')} vectorEffect="non-scaling-stroke"/>;
        })}
        {pickMode && hover && <g className="cx-crosshair">
            <line x1={hover.x} y1={0} x2={hover.x} y2={100} vectorEffect="non-scaling-stroke"/>
            <line x1={0} y1={hover.y} x2={100} y2={hover.y} vectorEffect="non-scaling-stroke"/>
          </g>}
      </svg>

      {/* 구역 라벨 (알약) */}
      {SECTORS.map((s) => <div key={s.id} className={cx('cx-sector-label', s.id === activeSector && 'is-active')} style={{ left: `${s.label[0]}%`, top: `${s.label[1]}%` }}>
          <b>{s.id}</b>{!compact && <span>{s.name}</span>}
        </div>)}

      {/* 사건 핀 */}
      {events.map((e) => {
            const isSel = e.event_id === selectedId;
            return <button key={e.event_id} type="button" onClick={(ev) => { ev.stopPropagation(); onSelect?.(e.event_id); }} disabled={!onSelect}
              className={cx('cx-pin', `st-${STATUS_META[e.status]?.shape ?? 'circle'}`, isSel && 'is-selected', !onSelect && 'is-static')} style={{ left: `${e.map_x}%`, top: `${e.map_y}%` }}
              aria-label={`${eventCode(e.event_id)} ${e.event_type}, ${e.sector} 구역, ${formatTime(e.occurred_at)}, 상태 ${e.status}`} aria-pressed={onSelect ? isSel : undefined}>
              <span className="cx-pin-dot"><MarkerShape status={e.status} size={compact ? 8 : 10}/></span>
              {!compact && <span className="cx-pin-label"><em>{formatTime(e.occurred_at)}</em>{e.event_type}</span>}
            </button>;
        })}

      {pickMode && picked && <div className="cx-picked" style={{ left: `${picked.x}%`, top: `${picked.y}%` }}><span/><b>{picked.x}, {picked.y}</b></div>}
      {pickMode && hover && <div className="cx-pick-readout">X {hover.x} · Y {hover.y} · {sectorAt(hover.x, hover.y) ?? '경계'}</div>}

      <div className="cx-map-credit">배경 NASA Earth Observatory · USGS Landsat (Public domain) · 사건 위치는 가상 좌표</div>
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
