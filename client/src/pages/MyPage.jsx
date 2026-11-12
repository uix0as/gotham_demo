import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { formatDateTime } from '@/utils/date';
import { memberCode } from '@/utils/format';
import { AccountEditor } from '@/components/members/AccountEditor';
import { PageBar, Pane, PropList, StatTile } from '@/components/gx/Explorer';
import { EVENT_STATUSES } from '@/domain';

/** 내 계정 — 회원 READ(GET /api/auth/me) · UPDATE · DELETE */
export default function MyPage() {
    const { user } = useAuth();
    const { events, notes } = useEvents();
    if (!user) return null;
    const mine = events.filter((e) => e.member_id === user.member_id);
    const myNotes = notes.filter((n) => n.member_id === user.member_id);
    return <div className="gx-page gx-account-page">
      <PageBar code="SYS-ME" title="내 계정" description="members 테이블의 내 행입니다. 아이디·이메일 수정과 회원탈퇴는 로그인 쿠키(JWT)의 회원 ID로만 처리됩니다."/>
      <div className="gx-account-grid">
        <Pane title="회원정보" meta="GET /api/auth/me">
          <div className="gx-person is-lg"><span className="gx-avatar">{user.nickname.slice(0, 1)}</span><div><b>{user.nickname}</b><small>회원번호 {memberCode(user.member_id)}</small></div></div>
          <PropList items={[['아이디', user.nickname], ['이메일', user.email], ['가입', formatDateTime(user.created_at)], ['최근 수정', formatDateTime(user.updated_at)]]}/>
          <AccountEditor incidentCount={mine.length} noteCount={myNotes.length}/>
          <p className="gx-hint">탈퇴하면 members 행이 삭제되고, 외래키 ON DELETE CASCADE로 내 훈련 사건과 분석 기록도 함께 삭제됩니다.</p>
        </Pane>
        <Pane title="내 활동 요약">
          <div className="gx-stats is-compact">
            {EVENT_STATUSES.map((s) => <StatTile key={s} label={s} value={mine.filter((e) => e.status === s).length} tone={s === '접수' ? 'warn' : s === '처리 완료' ? 'ok' : undefined}/>)}
            <StatTile label="분석 기록" value={myNotes.length}/>
          </div>
          <div className="gx-link-row"><Link className="gx-link" to="/my-events">내 기록 (JOIN 화면 2) →</Link><Link className="gx-link" to={`/members?id=${user.member_id}`}>회원 목록에서 보기 →</Link><Link className="gx-link" to={`/graph?member=${user.member_id}`}>내 관계 그래프 →</Link></div>
        </Pane>
      </div>
    </div>;
}
