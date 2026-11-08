import { CloudSun, FileText, FlaskConical, Globe2, Radio, Settings2 } from 'lucide-react';
import { sourceMeta } from '@/utils/constants';
import { cx } from '@/utils/format';
export function StatusBadge({ status, className }) {
    return <span className={cx('app-badge app-status', status === '접수' ? 'is-received' : status === '검토 중' ? 'is-review' : 'is-complete', className)}>{status}</span>;
}
export function SourceIcon({ source, ...props }) {
    const Icon = source === '훈련 상황보고' ? FileText : source.includes('기상') ? CloudSun : source.includes('장비') ? Settings2 : source.includes('레이더') ? Radio : source.includes('USGS') || source.includes('지진') ? Globe2 : FileText;
    return <Icon size={14} strokeWidth={1.7} aria-hidden {...props}/>;
}
export function SourceBadge({ source, compact }) {
    const meta = sourceMeta(source);
    return <span className="app-source"><SourceIcon source={source}/><span>{compact ? meta.short : source}</span></span>;
}
export function SectorBadge({ sector }) {
    return <span className="app-badge app-sector">{sector}</span>;
}
export function SimBadge({ label = '가상 생성' }) {
    return <span className="app-badge app-simulation"><FlaskConical size={12} aria-hidden/>{label}</span>;
}
export function SeverityBadge({ severity }) {
    return <span className={cx('app-badge app-severity', severity === '긴급' ? 'is-urgent' : severity === '높음' ? 'is-high' : '')}>{severity}</span>;
}
