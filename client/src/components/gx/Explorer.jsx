import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, X } from 'lucide-react';
import { cx } from '@/utils/format';

/** 페이지 상단 바: 제목·식별 코드·설명·주요 동작 */
export function PageBar({ title, code, description, actions, children }) {
    return <header className="gx-pagebar">
      <div className="gx-pagebar-main">
        {code && <span className="gx-code">{code}</span>}
        <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      </div>
      {actions && <div className="gx-pagebar-actions">{actions}</div>}
      {children}
    </header>;
}

const TONES = { ok: 'is-ok', warn: 'is-warn', danger: 'is-danger', 'danger-soft': 'is-danger-soft', info: 'is-info', accent: 'is-accent', muted: '' };
/** 상태·우선순위 태그: 색 + 기호 + 텍스트로 구분 */
export function Tag({ tone = 'muted', children, glyph, className }) {
    return <span className={cx('gx-tag', TONES[tone], className)}>{glyph && <i aria-hidden>{glyph}</i>}{children}</span>;
}
export function statusTone(status) { return status === '접수' ? 'warn' : status === '검토 중' ? 'info' : 'ok'; }
export function statusGlyph(status) { return status === '접수' ? '●' : status === '검토 중' ? '◆' : '■'; }
export function StatusTag({ status }) { return <Tag tone={statusTone(status)} glyph={statusGlyph(status)}>{status}</Tag>; }
export function severityTone(sev) { return sev === '긴급' ? 'danger' : sev === '높음' ? 'danger-soft' : 'muted'; }
export function SeverityTag({ severity }) { return <Tag tone={severityTone(severity)} glyph={severity === '긴급' ? '▲▲' : severity === '높음' ? '▲' : severity === '보통' ? '—' : '▽'}>{severity}</Tag>; }
export function assessmentTone(a) { return a === '위험' ? 'danger' : a === '주의' ? 'warn' : 'info'; }
export function AssessmentTag({ assessment }) { return <Tag tone={assessmentTone(assessment)} glyph={assessment === '위험' ? '!' : assessment === '주의' ? '△' : '○'}>{assessment}</Tag>; }

/** 수치 타일 */
export function StatTile({ label, value, sub, tone, onClick, active }) {
    const Comp = onClick ? 'button' : 'div';
    return <Comp type={onClick ? 'button' : undefined} className={cx('gx-stat', tone && `is-${tone}`, active && 'is-active')} onClick={onClick} aria-pressed={onClick ? !!active : undefined}>
      <span className="gx-stat-label">{label}</span>
      <strong className="gx-stat-value">{value}</strong>
      {sub && <span className="gx-stat-sub">{sub}</span>}
    </Comp>;
}

/** 패널: 얇은 테두리, 머리글 한 줄 */
export function Pane({ title, meta, actions, children, className, bodyClassName, id }) {
    return <section className={cx('gx-pane', className)} id={id} aria-label={typeof title === 'string' ? title : undefined}>
      {(title || actions) && <div className="gx-pane-head"><h2>{title}</h2>{meta && <span className="gx-pane-meta">{meta}</span>}{actions && <div className="gx-pane-actions">{actions}</div>}</div>}
      <div className={cx('gx-pane-body', bodyClassName)}>{children}</div>
    </section>;
}

/** 속성 목록 (상세 패널용) */
export function PropList({ items }) {
    return <dl className="gx-props">{items.filter(Boolean).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl>;
}

/** 우측 상세 패널 (Selection preview) */
export function DetailPanel({ kicker, title, onClose, actions, children, empty }) {
    if (empty) return <aside className="gx-detail is-empty" aria-label="상세 정보"><div className="gx-detail-empty">{empty}</div></aside>;
    return <aside className="gx-detail" aria-label="선택 항목 상세">
      <div className="gx-detail-head">
        <div>{kicker && <span className="gx-detail-kicker">{kicker}</span>}<h2>{title}</h2></div>
        {onClose && <button type="button" className="gx-icon-btn" onClick={onClose} aria-label="상세 패널 닫기"><X size={16}/></button>}
      </div>
      {actions && <div className="gx-detail-actions">{actions}</div>}
      <div className="gx-detail-body">{children}</div>
    </aside>;
}
export function DetailSection({ title, children, meta }) {
    return <section className="gx-detail-section"><h3>{title}{meta && <span>{meta}</span>}</h3>{children}</section>;
}

/** 정렬 상태 */
export function useSort(initialKey, initialDir = 'desc') {
    const [sort, setSort] = useState({ key: initialKey, dir: initialDir });
    const toggle = useCallback((key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })), []);
    return [sort, toggle];
}
export function sortRows(rows, columns, sort) {
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const get = col.sortValue ?? ((row) => row[col.key]);
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
        const x = get(a), y = get(b);
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko')) * dir;
    });
}

/** 열별 검색 (ServiceNow형): 페이지 나누기 전에 전체 행에 적용합니다. */
export function useColumnFilters() {
    const [filters, setFilters] = useState({});
    const setFilter = useCallback((key, value) => setFilters((f) => ({ ...f, [key]: value })), []);
    const clear = useCallback(() => setFilters({}), []);
    return { filters, setFilter, clear };
}
export function applyColumnFilters(rows, columns, filters) {
    const active = columns.filter((c) => c.searchable !== false && (filters[c.key] ?? '').trim());
    if (!active.length) return rows;
    return rows.filter((row) => active.every((c) => {
        const text = c.searchText ? c.searchText(row) : (c.sortValue ? c.sortValue(row) : row[c.key]);
        return String(text ?? '').toLowerCase().includes(filters[c.key].trim().toLowerCase());
    }));
}

/**
 * 데이터 테이블: 열 정렬, 머리글 경계 드래그로 열 너비 조절, 행 선택.
 * columns: [{ key, label, width, render(row), sortValue(row), sortable, align }]
 */
export function DataTable({ columns, rows, rowKey, selectedKey, onSelect, sort, onSort, caption, empty, loading, error, footer, colFilter, scope = '전체' }) {
    const [widths, setWidths] = useState(() => Object.fromEntries(columns.map((c) => [c.key, c.width ?? 140])));
    const drag = useRef(null);
    const startResize = (key, event) => {
        event.preventDefault();
        event.stopPropagation();
        drag.current = { key, x: event.clientX, w: widths[key] };
        const move = (e) => {
            if (!drag.current) return;
            const next = Math.max(64, drag.current.w + e.clientX - drag.current.x);
            setWidths((w) => ({ ...w, [drag.current.key]: next }));
        };
        const up = () => { drag.current = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };
    const total = useMemo(() => columns.reduce((sum, c) => sum + (widths[c.key] ?? 140), 0), [columns, widths]);
    const activeFilters = colFilter ? columns.filter((c) => (colFilter.filters[c.key] ?? '').trim()) : [];
    return <div className="gx-table-wrap">
      {colFilter && <div className="gx-breadcrumb"><b>{scope}</b>{activeFilters.map((c) => <span key={c.key}>› {c.label} ⊃ “{colFilter.filters[c.key].trim()}”</span>)}
        {activeFilters.length > 0 && <button type="button" className="gx-link" onClick={colFilter.clear}>열 검색 지우기</button>}</div>}
      <div className="gx-table-scroll">
        <table className="gx-table" style={{ minWidth: total }}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <colgroup>{columns.map((c) => <col key={c.key} style={{ width: widths[c.key] }}/>)}</colgroup>
          <thead><tr>{columns.map((c) => {
                const active = sort?.key === c.key;
                const sortable = c.sortable !== false && onSort;
                return <th key={c.key} scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={c.align === 'right' ? 'is-right' : ''}>
                  {sortable ? <button type="button" onClick={() => onSort(c.key)}>{c.label}{active ? (sort.dir === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ChevronsUpDown size={12} className="gx-sort-idle"/>}</button> : <span>{c.label}</span>}
                  <span className="gx-col-resize" role="separator" aria-orientation="vertical" aria-label={`${c.label} 열 너비 조절`} onPointerDown={(e) => startResize(c.key, e)}/>
                </th>;
            })}</tr>
            {colFilter && <tr className="gx-col-search">{columns.map((c) => <th key={c.key}>{c.searchable === false ? null : <input type="search" value={colFilter.filters[c.key] ?? ''} placeholder="Search" aria-label={`${c.label} 열 검색`} onChange={(e) => colFilter.setFilter(c.key, e.target.value)}/>}</th>)}</tr>}
          </thead>
          <tbody>
            {loading ? [0, 1, 2, 3, 4, 5].map((i) => <tr key={`s${i}`} className="gx-skel-row">{columns.map((c) => <td key={c.key}><span className="gx-skel"/></td>)}</tr>)
            : error ? <tr><td colSpan={columns.length} className="gx-table-state is-error">{error}</td></tr>
            : !rows.length ? <tr><td colSpan={columns.length} className="gx-table-state">{empty ?? '조건에 맞는 기록이 없습니다.'}</td></tr>
            : rows.map((row) => {
                const key = rowKey(row);
                const selected = selectedKey === key;
                return <tr key={key} className={selected ? 'is-selected' : ''} aria-selected={selected} onClick={() => onSelect?.(row)} tabIndex={onSelect ? 0 : undefined} onKeyDown={(e) => { if (onSelect && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(row); } }}>
                  {columns.map((c) => <td key={c.key} className={c.align === 'right' ? 'is-right' : ''}>{c.render ? c.render(row) : row[c.key]}</td>)}
                </tr>;
            })}
          </tbody>
        </table>
      </div>
      {footer && <div className="gx-table-foot">{footer}</div>}
    </div>;
}

/** 단순 페이지 이동 */
export function usePaged(rows, size) {
    const [page, setPage] = useState(1);
    const count = Math.max(1, Math.ceil(rows.length / size));
    const current = Math.min(page, count);
    return { page: current, count, setPage, slice: rows.slice((current - 1) * size, current * size), from: rows.length ? (current - 1) * size + 1 : 0, to: Math.min(current * size, rows.length) };
}
export function Pager({ paged, total }) {
    return <div className="gx-pager"><span>{total.toLocaleString()}건 중 {paged.from}–{paged.to}</span>
      <div><button type="button" className="gx-icon-btn" disabled={paged.page === 1} onClick={() => paged.setPage(paged.page - 1)} aria-label="이전 페이지">‹</button><span>{paged.page} / {paged.count}</span><button type="button" className="gx-icon-btn" disabled={paged.page === paged.count} onClick={() => paged.setPage(paged.page + 1)} aria-label="다음 페이지">›</button></div>
    </div>;
}

/** 필터 바 */
export function FilterBar({ children }) { return <div className="gx-filterbar">{children}</div>; }
export function FilterSelect({ label, value, onChange, options, allLabel = '전체' }) {
    return <label className="gx-filter"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}><option value="">{allLabel}</option>{options.map((o) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
