import { useEffect, useRef } from 'react';
import { formatDate, formatRelative, formatTime } from '@/utils/date';
import { cx, eventCode } from '@/utils/format';
import { isFictionalRecord, isImportedRecord } from '@/utils/datasets';
import { SectorBadge, SourceBadge, StatusBadge } from '@/components/ui/Badges';
import { MarkerShape } from '@/components/map/MarkerShape';
import { EmptyState } from '@/components/ui/States';
export function RecentEventsList({ events, selectedId, onSelect, authorOf }) {
    const listRef = useRef(null);
    // 지도 선택과 목록을 동기화하되 문서 전체의 스크롤 위치는 유지합니다.
    useEffect(() => {
        const list = listRef.current;
        if (selectedId == null || !list)
            return;
        const el = list.querySelector(`[data-event-id="${selectedId}"]`);
        if (!el)
            return;
        const viewportTop = list.getBoundingClientRect().top + list.clientTop;
        const viewportBottom = viewportTop + list.clientHeight;
        const row = el.getBoundingClientRect();
        const delta = row.top < viewportTop ? row.top - viewportTop : row.bottom > viewportBottom ? row.bottom - viewportBottom : 0;
        if (!delta)
            return;
        list.scrollTo({
            top: list.scrollTop + delta,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        });
    }, [selectedId]);
    if (!events.length)
        return <EmptyState title="등록된 상황정보가 없습니다" message="새 상황정보를 등록하거나 가상 이벤트를 생성해 보세요."/>;
    return (<ul ref={listRef} className="max-h-[420px] divide-y divide-line overflow-y-auto">
      {events.map((e) => {
            const active = e.event_id === selectedId;
            return (<li key={e.event_id} data-event-id={e.event_id}>
            <button type="button" onClick={() => onSelect(e.event_id)} aria-pressed={active} className={cx('relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors', active ? 'bg-accent/[0.07]' : 'hover:bg-elevated/60')}>
              {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" aria-hidden/>}
              <div className="w-12 shrink-0 pt-0.5 text-right">
                <p className="font-mono text-sm text-ink">{formatTime(e.occurred_at)}</p>
                <p className="font-mono text-[10px] text-ink-muted">{formatDate(e.occurred_at).slice(5)}</p>
              </div>
              <div className="mt-1.5 shrink-0">
                <MarkerShape status={e.status} size={9}/>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <SectorBadge sector={e.sector}/>
                  <span className="text-sm font-medium text-ink">{e.title}</span>
                  {isFictionalRecord(e) && <span className="rounded bg-accent/10 px-1 text-[10px] text-accent">가상 데이터</span>}
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-ink-muted">{e.description}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <SourceBadge source={e.source_type} compact/>
                  <span className="text-2xs text-ink-muted">
                    {eventCode(e.event_id)} · {e.source_name || authorOf(e.member_id)} · {formatRelative(e.occurred_at)}
                  </span>
                </div>
              </div>
              {isImportedRecord(e) ? <span className="hidden text-2xs text-ink-muted sm:inline">읽기 전용</span> : <StatusBadge status={e.status} className="hidden sm:inline-flex"/>}
            </button>
          </li>);
        })}
    </ul>);
}
