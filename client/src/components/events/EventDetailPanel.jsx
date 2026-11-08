import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, GitBranch, Info, MapPin, Pencil, Trash2, User, X } from 'lucide-react';
import { EVENT_STATUSES } from '@/domain';
import { findRelatedEvents } from '@/analysis';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/services/api';
import { canModifyEvent } from '@/utils/permissions';
import { formatDateTime, formatMinutes, formatTime } from '@/utils/date';
import { cx, displayEventTitle, eventCode, memberCode } from '@/utils/format';
import { getSector } from '@/utils/sectors';
import { isFictionalRecord, isImportedRecord, safeSourceUrl } from '@/utils/datasets';
import { STATUS_META } from '@/utils/constants';
import { SeverityBadge, SectorBadge, SourceBadge, StatusBadge } from '@/components/ui/Badges';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { MarkerShape } from '@/components/map/MarkerShape';
function Row({ icon, label, children }) {
    return (<div className="event-detail-row">
      <dt className="flex items-center gap-1.5 text-ink-muted">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>);
}
export function EventDetailPanel({ event, windowMinutes, onSelect, onClose, onEdit, onDelete, className }) {
    const { user } = useAuth();
    const { analysisEvents: events, authorOf, update } = useEvents();
    const toast = useToast();
    const [savingStatus, setSavingStatus] = useState(null);
    if (!event) {
        return (<aside className={cx('panel event-detail-panel flex flex-col', className)} aria-label="사건 상세 정보">
        <div className="panel-header">
          <h2 className="panel-title">
            <Info className="h-4 w-4 text-accent" aria-hidden/>
            사건 상세
          </h2>
        </div>
        <EmptyState icon={<MapPin className="h-5 w-5" aria-hidden/>} title="선택된 사건이 없습니다" message="지도 마커나 목록에서 사건을 선택하면 상세 정보와 관련 사건이 표시됩니다."/>
      </aside>);
    }
    const imported = isImportedRecord(event);
    const sourceUrl = safeSourceUrl(event.source_url);
    const canModify = !imported && canModifyEvent(event, user);
    const related = findRelatedEvents(event, events, windowMinutes);
    const sector = getSector(event.sector);
    const changeStatus = async (s) => {
        if (s === event.status)
            return;
        setSavingStatus(s);
        try {
            await update(event.event_id, { status: s });
            toast.success('처리 상태를 변경했습니다.', `${eventCode(event.event_id)} → ${s}`);
        }
        catch (e) {
            toast.error('상태를 변경하지 못했습니다.', errorMessage(e));
        }
        finally {
            setSavingStatus(null);
        }
    };
    return (<aside className={cx('panel event-detail-panel flex min-w-0 flex-col', className)} aria-label="사건 상세 정보">
      <div className="panel-header">
        <div className="min-w-0">
          <h2 className="event-detail-title">{displayEventTitle(event.title)}</h2><span className="event-detail-code">{eventCode(event.event_id)}</span>
        </div>
        <div className="flex items-center gap-1">
          {imported ? <span className="rounded border border-line px-2 py-0.5 text-2xs text-ink-muted">수집 데이터 · 읽기 전용</span> : <StatusBadge status={event.status}/>}
          {onClose && (<button type="button" onClick={onClose} className="console-icon" aria-label="상세 패널 닫기">
              <X className="h-4 w-4"/>
            </button>)}
        </div>
      </div>

      <div className="event-detail-content min-h-0 flex-1 overflow-y-auto">
        {isFictionalRecord(event) && (<div className="mb-2">
            <span className="rounded border border-warn/30 bg-warn-muted px-2 py-0.5 text-2xs text-warn">가상 훈련·합성 데이터</span>
          </div>)}
        <dl className="divide-y divide-line/60">
          <Row label="사건 유형">{event.event_type}</Row>
          <Row label="중요도"><SeverityBadge severity={event.severity}/></Row>
          <Row label="데이터 출처">
            <SourceBadge source={event.source_type}/>
          </Row>
          <Row icon={<MapPin className="h-3 w-3" aria-hidden/>} label="발생 구역">
            <span className="flex flex-wrap items-center gap-1.5">
              <SectorBadge sector={event.sector}/>
              <span className="text-ink-secondary">{sector?.name}</span>
              <span className="text-2xs text-ink-muted">
                ({event.map_x}, {event.map_y})
              </span>
            </span>
          </Row>
          <Row icon={<Clock className="h-3 w-3" aria-hidden/>} label="발생 시각">
            <span>{formatDateTime(event.occurred_at)}</span>
          </Row>
          {imported && <>
            <Row label="원본 출처">{event.source_name || event.source_type}</Row>
            {event.latitude != null && event.longitude != null && <Row label="위도 · 경도"><span>{event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}</span></Row>}
            {event.magnitude != null && <Row label="규모"><span>M {event.magnitude.toFixed(1)}</span></Row>}
            {(event.collected_at || event.imported_at) && <Row label="수집 시각">{formatDateTime(event.collected_at || event.imported_at)} KST</Row>}
            {event.contributor && <Row label="기여 기관">{event.contributor}</Row>}
            {event.source_license && <Row label="이용 조건">{event.source_license}</Row>}
            {event.magnitude != null && <Row label="분류 기준">중요도는 규모로 분류한 화면 표시이며 위험도 평가가 아닙니다.</Row>}
          </>}
          {!imported && <Row icon={<User className="h-3 w-3" aria-hidden/>} label="작성자">
            {authorOf(event.member_id)} <span className="text-2xs text-ink-muted">{memberCode(event.member_id)}</span>
            {canModify && <span className="ml-1.5 rounded bg-accent/10 px-1 py-px text-2xs text-accent">본인</span>}
          </Row>}
        </dl>

        <div className="mt-3">
          <p className="mb-1.5 text-2xs font-medium text-ink-muted">상세 설명</p>
          <p className="event-detail-copy">
            {event.description}
          </p>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-2xs font-medium text-ink-muted">{imported ? '원본 관측 표시 상태' : '처리 상태'} {canModify ? '변경' : ''}</p>
          {canModify ? (<div className="event-detail-status grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="처리 상태 변경">
              {EVENT_STATUSES.map((s) => {
                const active = s === event.status;
                return (<button key={s} type="button" role="radio" aria-checked={active} disabled={!!savingStatus} onClick={() => changeStatus(s)} className={cx('flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-2xs font-medium transition-colors disabled:opacity-60', active ? `${STATUS_META[s].bg} ${STATUS_META[s].border} ${STATUS_META[s].text}` : 'border-line text-ink-muted hover:border-line-strong hover:text-ink')}>
                    <MarkerShape status={s} size={7}/>
                    {savingStatus === s ? '저장 중…' : s}
                  </button>);
            })}
            </div>) : (<p className="text-xs text-ink-muted">
              {imported ? '원본 관측의 표시 상태이며 재난 대응 진행 상태를 뜻하지 않습니다. 수집 데이터는 읽기 전용입니다.' : user ? '작성자 본인만 상태를 변경할 수 있습니다.' : '로그인한 작성자만 상태를 변경할 수 있습니다.'}
            </p>)}
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <GitBranch className="h-3.5 w-3.5 text-accent" aria-hidden/>
              관련 사건 <span className="text-ink-muted">{related.length}</span>
            </p>
            <span className="text-2xs text-ink-muted">예시 구역 · ±{windowMinutes}분</span>
          </div>
          {related.length === 0 ? (<p className="rounded-md border border-dashed border-line px-3 py-3 text-center text-xs text-ink-muted">
              조건을 만족하는 관련 사건이 없습니다.
            </p>) : (<ul className="event-related-list">
              {related.slice(0, 30).map(({ event: r, diff_minutes }) => (<li key={r.event_id}>
                  <button type="button" onClick={() => onSelect(r.event_id)} className="event-related-record">
                    <MarkerShape status={r.status} size={8}/>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-ink">{r.event_type}</span>
                      <span className="block truncate text-2xs text-ink-muted">
                        {eventCode(r.event_id)} · {formatTime(r.occurred_at)} · {r.source_type}
                      </span>
                    </span>
                    <span className="shrink-0 text-2xs text-accent">Δ {formatMinutes(diff_minutes)}</span>
                  </button>
                </li>))}
            </ul>)}
          <p className="mt-2 text-2xs leading-relaxed text-ink-muted">
            {related.length > 30 && `관련 후보 ${related.length}건 중 가까운 30건 표시. `}규칙 기반 연관 후보입니다. 시간·위치가 가깝다는 데이터상의 연관성일 뿐, 인과관계나 위험도를 의미하지 않습니다.
          </p>
        </div>
      </div>

      <div className="event-detail-footer flex flex-wrap items-center gap-2 border-t border-line">
        {!imported && <Link to={`/events/detail?id=${event.event_id}`} className="app-button is-small">
          상세 페이지 <ArrowUpRight className="h-3.5 w-3.5" aria-hidden/>
        </Link>}
        {imported && sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" className="app-button is-small">원본 관측 보기 <ArrowUpRight className="h-3.5 w-3.5" aria-hidden/></a>}
        {canModify && onEdit && (<Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5"/>} onClick={() => onEdit(event)}>
            수정
          </Button>)}
        {canModify && onDelete && (<Button size="sm" variant="ghost" className="text-danger hover:text-danger" icon={<Trash2 className="h-3.5 w-3.5"/>} onClick={() => onDelete(event)}>
            삭제
          </Button>)}
      </div>
    </aside>);
}
