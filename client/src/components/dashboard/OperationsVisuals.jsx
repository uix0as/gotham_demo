import { Layers } from 'lucide-react';
import { SECTORS, polygonPoints } from '@/utils/sectors';
export function TinyHistogram({ values }) {
    const max = Math.max(...values, 1);
    return <div className="tiny-histogram" aria-hidden="true">{values.map((value, index) => <span key={index} style={{ height: `${Math.max(9, value / max * 100)}%`, opacity: index === values.length - 2 ? 1 : 0.2 + index * 0.04 }}/>)}</div>;
}
export function TinyLine({ values }) {
    const max = Math.max(...values, 1), min = Math.min(...values, 0);
    const points = values.map((value, index) => `${index / Math.max(values.length - 1, 1) * 90 + 3},${39 - (value - min) / Math.max(max - min, 1) * 30}`).join(' ');
    return <svg className="tiny-line" viewBox="0 0 96 48" aria-hidden="true"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/></svg>;
}
export function CompletionRing({ rate }) {
    const circumference = 2 * Math.PI * 22;
    return <svg className="completion-ring" viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="22" fill="none" stroke="var(--border)" strokeWidth="4"/><circle cx="27" cy="27" r="22" fill="none" stroke="var(--chart-ink)" strokeWidth="4" strokeDasharray={`${circumference * rate / 100} ${circumference}`} transform="rotate(-90 27 27)"/></svg>;
}
export function Barcode({ items }) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return <div className="data-barcode" aria-hidden="true">{Array.from({ length: 58 }, (_, index) => {
            let cumulative = 0;
            const item = items.find((entry) => { cumulative += total ? entry.value / total : 0; return (index + 0.5) / 58 <= cumulative; });
            return <span key={index} style={{ background: item?.color || 'var(--border)' }}/>;
        })}</div>;
}
export function StatusGauge({ items }) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return <div className="status-gauge"><svg viewBox="0 0 220 220" role="img" aria-label={items.map((item) => `${item.label} ${item.value}건`).join(', ')}>{Array.from({ length: 72 }, (_, index) => {
            let cumulative = 0;
            const item = items.find((entry) => { cumulative += total ? entry.value / total : 0; return (index + 0.5) / 72 <= cumulative; });
            const angle = index / 72 * 2 * Math.PI - Math.PI / 2;
            return <line key={index} x1={110 + Math.cos(angle) * 88} y1={110 + Math.sin(angle) * 88} x2={110 + Math.cos(angle) * 99} y2={110 + Math.sin(angle) * 99} stroke={item?.color || 'var(--border)'} strokeWidth="2.8" strokeLinecap="round"/>;
        })}</svg><div><span className="gauge-symbol"><Layers size={18}/></span><span>회원 사건</span><strong>{total.toLocaleString()}</strong></div></div>;
}
export function SectorColumns({ events, sector, onSector }) {
    const totals = SECTORS.map((entry) => ({ ...entry, count: events.filter((event) => event.sector === entry.id).length }));
    const max = Math.max(...totals.map((entry) => entry.count), 1);
    return <><div className="sector-columns">{totals.map((entry, index) => <button key={entry.id} aria-label={`${entry.id} ${entry.name} ${entry.count}건 보기`} aria-pressed={sector === entry.id} onClick={() => onSector(sector === entry.id ? '' : entry.id)}><div className="sector-column-stack">{Array.from({ length: 19 }, (_, block) => <i key={block} className={block < Math.round(entry.count / max * 19) ? 'filled' : ''} style={{ opacity: index === 0 || index === 2 ? 1 : 0.55 }}/>)}</div><span>{entry.id}</span></button>)}</div><div className="sector-column-legend">{totals.map((entry, index) => <button key={entry.id} onClick={() => onSector(sector === entry.id ? '' : entry.id)} aria-pressed={sector === entry.id}><i style={{ opacity: index === 0 || index === 2 ? 1 : 0.5 }}/><span>{entry.id}</span><strong>{entry.count}<small>건</small></strong></button>)}</div></>;
}
export function ObservationMap({ events, onSelect, selectedId }) {
    const selected = events.find((event) => event.event_id === selectedId);
    return <div className="observation-map" role="group" aria-label="정규화한 6개 가상 훈련구역 지도"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="observation-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="var(--border)" strokeWidth="0.16"/></pattern></defs><rect width="100" height="100" fill="var(--panel)"/><rect width="100" height="100" fill="url(#observation-grid)"/>{SECTORS.map((entry) => <polygon key={entry.id} points={polygonPoints(entry.polygon)} fill={selected?.sector === entry.id ? 'var(--teal-soft)' : 'transparent'} stroke="var(--border-strong)" strokeWidth="0.3" strokeDasharray="1 1"/>)}{events.slice(0, 80).map((event) => <circle key={event.event_id} cx={event.map_x} cy={event.map_y} r="0.6" fill="var(--teal)" opacity="0.5"/>)}</svg>{SECTORS.map((entry) => {
            const records = events.filter((event) => event.sector === entry.id);
            return <div key={entry.id} className="observation-sector" style={{ left: `${entry.anchor[0]}%`, top: `${entry.anchor[1]}%` }}><button disabled={!records.length} onClick={() => records[0] && onSelect(records[0].event_id)} aria-pressed={selected?.sector === entry.id} aria-label={`${entry.id} ${entry.name}, ${records.length}건 중 최신 자료 확인`}>{records.length}</button><span>{entry.id} · {entry.name}</span></div>;
        })}</div>;
}
