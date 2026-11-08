import { STATUS_META } from '@/utils/constants';
import { cx } from '@/utils/format';
/** 상태별 마커 모양: 접수=원, 검토 중=마름모, 처리 완료=사각 (색 + 모양 이중 인코딩) */
export function MarkerShape({ status, size = 12, className }) {
    const m = STATUS_META[status];
    const base = 'block shrink-0 ring-1 ring-panel';
    const shape = m.shape === 'circle' ? 'rounded-full' : m.shape === 'diamond' ? 'rotate-45 rounded-[2px]' : 'rounded-[3px]';
    const s = m.shape === 'diamond' ? size * 0.82 : size;
    return <span className={cx(base, shape, className)} style={{ width: s, height: s, backgroundColor: m.color }} aria-hidden/>;
}
