import { cx } from '@/utils/format';
export function KpiCard({ label, value, icon, caption, loading, onClick, active }) {
    const Tag = onClick ? 'button' : 'div';
    return <Tag {...(onClick ? { type: 'button', onClick, 'aria-pressed': active } : {})} className={cx('summary-metric', active && 'is-active')}>
    <h2>{icon}{label}</h2><div className="summary-metric-body"><strong>{loading ? '—' : typeof value === 'number' ? value.toLocaleString() : value}</strong>{caption && <p>{caption}</p>}</div>
  </Tag>;
}
