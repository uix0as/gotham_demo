import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from '@/hooks/useNavigation';
import { useSearchParams as useRouteSearchParams } from '@/hooks/useNavigation';
import { ArrowLeft, Clock, FileText, GitBranch, Lock, MapPin, Pencil, Trash2 } from 'lucide-react';
import { findRelatedEvents } from '@/analysis';
import { api, errorMessage, isApiError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { canModifyEvent } from '@/utils/permissions';
import { CORRELATION_WINDOWS, DEFAULT_CORRELATION_WINDOW } from '@/utils/constants';
import { formatDateTime, formatMinutes } from '@/utils/date';
import { displayEventTitle, eventCode, memberCode } from '@/utils/format';
import { getSector } from '@/utils/sectors';
import { isFictionalRecord } from '@/utils/datasets';
import { useEventEditor } from '@/hooks/useEventEditor';
import { Panel } from '@/components/ui/Panel';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { SeverityBadge, SectorBadge, SimBadge, SourceBadge, StatusBadge } from '@/components/ui/Badges';
import { TacticalMap } from '@/components/map/TacticalMap';
import { MarkerShape } from '@/components/map/MarkerShape';
export default function EventDetail() {
    const id = useRouteSearchParams().get('id');
    const eventId = Number(id);
    const validId = Number.isInteger(eventId) && eventId > 0;
    const { events, authorOf } = useEvents();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [state, setState] = useState(validId ? 'loading' : 'notfound');
    const [err, setErr] = useState('');
    const [win, setWin] = useState(DEFAULT_CORRELATION_WINDOW);
    const [attempt, setAttempt] = useState(0);
    const editor = useEventEditor({ onDeleted: () => navigate('/events') });
    // GET /events/:id — 컨텍스트 목록이 바뀌면(수정 등) 다시 조회
    useEffect(() => {
        if (!validId)
            return;
        let alive = true;
        api.events
            .get(eventId)
            .then((e) => {
            if (!alive)
                return;
            setEvent(e);
            setState('ready');
        })
            .catch((e) => {
            if (!alive)
                return;
            if (isApiError(e) && e.status === 404)
                setState('notfound');
            else {
                setErr(errorMessage(e));
                setState('error');
            }
        });
        return () => {
            alive = false;
        };
    }, [eventId, validId, events, attempt]);
    if (state === 'loading')
        return <LoadingState label="상황정보를 불러오는 중…"/>;
    if (state === 'error')
        return <ErrorState message={err} onRetry={() => {
                setState('loading');
                setAttempt((a) => a + 1);
            }}/>;
    if (state === 'notfound' || !event)
        return (<div className="panel">
        <EmptyState icon={<FileText className="h-5 w-5"/>} title="상황정보를 찾을 수 없습니다" message={`요청한 사건번호(${id})가 존재하지 않거나 삭제되었습니다.`} action={<Link to="/events" className="text-sm text-accent hover:underline">
              상황정보 목록으로 돌아가기
            </Link>}/>
      </div>);
    const canModify = canModifyEvent(event, user);
    const related = findRelatedEvents(event, events, win);
    const sector = getSector(event.sector);
    const mapEvents = [event, ...related.map((r) => r.event)];
    return (<div className="workspace-page detail-page">
      <div>
        <button type="button" onClick={() => navigate(-1)} className="page-back-link">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden/>
          이전 화면
        </button>
      </div>

      <PageHeader title={displayEventTitle(event.title)} icon={<FileText />} description={`${eventCode(event.event_id)} · ${formatDateTime(event.occurred_at)} 발생 · ${event.source_type}`} actions={canModify ? <><Button icon={<Pencil size={15}/>} onClick={() => editor.openEdit(event)}>수정</Button><Button variant="danger" icon={<Trash2 size={15}/>} onClick={() => editor.requestDelete(event)}>삭제</Button></> : <span className="app-badge app-sector"><Lock size={12}/>조회 전용</span>}/>
      <div className="detail-status-row"><StatusBadge status={event.status}/>{isFictionalRecord(event) && <SimBadge label="가상 훈련 데이터"/>}{!canModify && <span className="data-caption">{user ? '다른 회원이 작성한 상황정보입니다.' : '조회 전용입니다.'} 수정·삭제는 작성자 본인만 가능합니다.</span>}</div>

      <div className="detail-page-grid">
        <div className="workspace-stack">
          <Panel title="상황 내용" icon={<FileText className="h-4 w-4"/>}>
            <p className="detail-description">{event.description}</p>
          </Panel>

          <Panel title="기본 정보" bodyClassName="p-0">
            <dl className="metadata-grid">
              {[
            ['사건번호', <span>{eventCode(event.event_id)} </span>],
            ['사건명', event.title],
            ['중요도', <SeverityBadge severity={event.severity}/>],
            ['처리 상태', <StatusBadge status={event.status}/>],
            ['정보 출처', <SourceBadge source={event.source_type}/>],
            ['사건 유형', event.event_type],
            ['발생 구역', <span className="flex items-center gap-1.5"><SectorBadge sector={event.sector}/> {sector?.name}</span>],
            ['가상 좌표', <span>X {event.map_x} · Y {event.map_y}</span>],
            ['발생 시각', <span>{formatDateTime(event.occurred_at)}</span>],
            ['작성자', <span>{authorOf(event.member_id)} <span className="text-2xs text-ink-muted">{memberCode(event.member_id)}</span></span>],
            ['등록 시각', <span>{formatDateTime(event.created_at)}</span>],
            ['수정 시각', <span>{formatDateTime(event.updated_at)}</span>],
        ].map(([k, v], i) => (<div key={i}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>))}
            </dl>
          </Panel>
        </div>

        <div className="workspace-stack">
          <Panel title="가상 훈련구역" icon={<MapPin className="h-4 w-4"/>} subtitle="실제 지형이 아닌 정규화 좌표 · 선택 사건과 연관 후보 표시" bodyClassName="p-5">
            <TacticalMap compact events={mapEvents} selectedId={event.event_id} onSelect={(i) => i !== event.event_id && navigate(`/events/detail?id=${i}`)} links={related.map((r) => ({
            key: `${event.event_id}-${r.event.event_id}`, source: event.event_id, target: r.event.event_id, sector: event.sector, diff_minutes: r.diff_minutes, reasons: [],
        }))}/>
          </Panel>

          <Panel title="관련 사건" icon={<GitBranch className="h-4 w-4"/>} actions={<Segmented size="sm" label="시간 범위" value={win} onChange={setWin} options={CORRELATION_WINDOWS.map((w) => ({ value: w, label: `${w}분` }))}/>} bodyClassName="p-0">
            {related.length === 0 ? (<p className="px-4 py-6 text-center text-xs text-ink-muted">
                같은 구역({event.sector})에서 ±{win}분 이내에 발생한 다른 사건이 없습니다.
              </p>) : (<ul className="divide-y divide-line">
                {related.map(({ event: r, diff_minutes }) => (<li key={r.event_id}>
                    <Link to={`/events/detail?id=${r.event_id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated/60">
                      <MarkerShape status={r.status} size={9}/>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">{r.event_type}</p>
                        <p className="truncate text-2xs text-ink-muted">
                          {eventCode(r.event_id)} · {formatDateTime(r.occurred_at)} · {r.source_type}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-2xs text-accent">
                        <Clock className="h-3 w-3" aria-hidden/>Δ {formatMinutes(diff_minutes)}
                      </span>
                    </Link>
                  </li>))}
              </ul>)}
            <p className="border-t border-line px-4 py-2.5 text-2xs text-ink-muted">
              규칙: 같은 구역 + 발생 시각 차이 {win}분 이내. 데이터상의 연관 후보이며 인과관계를 의미하지 않습니다.
            </p>
          </Panel>


        </div>
      </div>

      {editor.modals}
    </div>);
}
