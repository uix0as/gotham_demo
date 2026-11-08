import { Link } from 'react-router-dom';
import { useNavigate } from '@/hooks/useNavigation';
import { canModifyEvent } from '@/utils/permissions';
import { formatDate, formatDateTime, formatTime } from '@/utils/date';
import { displayEventTitle, eventCode } from '@/utils/format';
import { SeverityBadge, SectorBadge, SourceBadge, StatusBadge } from '@/components/ui/Badges';
import { RecordActions } from '@/components/dashboard/RecordActions';
export function EventTable({ events, user, authorOf, onEdit, onDelete }) {
    const navigate = useNavigate();
    const actions = (event) => <RecordActions event={event} editable={canModifyEvent(event, user)} onView={() => navigate(`/events/detail/?id=${event.event_id}`)} onEdit={() => onEdit(event)} onDelete={() => onDelete(event)}/>;
    return <>
    <div className="app-table-scroll is-desktop"><table className="app-data-table events-data-table"><caption className="sr-only">회원 상황정보 목록</caption><thead><tr>{['사건 ID', '상황정보 / 유형', '구역', '상태 / 중요도', '발생 시각', '작성자', '관리'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{events.map((event) => <tr key={event.event_id}>
      <td><Link to={`/events/detail/?id=${event.event_id}`} className="table-record-link">{eventCode(event.event_id)}</Link></td>
      <td><Link to={`/events/detail/?id=${event.event_id}`} className="table-record-title">{displayEventTitle(event.title)}</Link><span className="record-meta">{event.event_type} · <SourceBadge source={event.source_type} compact/></span><p className="record-meta record-description" title={event.description}>{event.description}</p></td>
      <td><SectorBadge sector={event.sector}/></td>
      <td><div className="record-state-cell"><StatusBadge status={event.status}/><SeverityBadge severity={event.severity}/></div></td>
      <td><span className="record-date">{formatDate(event.occurred_at)}<span>{formatTime(event.occurred_at)}</span></span></td>
      <td><span>{authorOf(event.member_id)}</span>{canModifyEvent(event, user) && <small className="record-meta">내가 작성한 사건</small>}</td>
      <td>{actions(event)}</td>
    </tr>)}</tbody></table></div>
    <ul className="app-record-cards">{events.map((event) => <li key={event.event_id}><div className="record-card-top"><Link to={`/events/detail/?id=${event.event_id}`} className="table-record-link">{eventCode(event.event_id)}</Link><SectorBadge sector={event.sector}/><StatusBadge status={event.status}/></div><Link to={`/events/detail/?id=${event.event_id}`} className="record-card-title">{displayEventTitle(event.title)}</Link><p className="record-card-description">{event.description}</p><div className="record-card-meta"><span>{event.event_type}</span><SeverityBadge severity={event.severity}/></div><div className="record-card-footer"><div><span>{formatDateTime(event.occurred_at)} · {authorOf(event.member_id)}</span><SourceBadge source={event.source_type}/>{canModifyEvent(event, user) && <span>내가 작성한 사건</span>}</div>{actions(event)}</div></li>)}</ul>
  </>;
}
