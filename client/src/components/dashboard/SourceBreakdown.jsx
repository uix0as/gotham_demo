import { SOURCE_TYPES } from '@/utils/constants';
import { SourceBadge } from '@/components/ui/Badges';
/** 출처별 분포 — 단일 막대 목록 (텍스트 라벨 + 수치 직접 표기) */
export function SourceBreakdown({ events }) {
    const total = events.length || 1;
    const sources = [...new Set([...SOURCE_TYPES, ...events.map((e) => e.source_type)])];
    return (<ul className="space-y-2.5">
      {sources.map((s) => {
            const n = events.filter((e) => e.source_type === s).length;
            const pct = Math.round((n / total) * 100);
            return (<li key={s}>
            <div className="mb-1 flex items-center justify-between">
              <SourceBadge source={s}/>
              <span className="font-mono text-2xs text-ink-secondary">
                {n}건 · {pct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface" role="presentation">
              <div className="h-full rounded-full bg-[#3987e5]" style={{ width: `${pct}%` }}/>
            </div>
          </li>);
        })}
    </ul>);
}
