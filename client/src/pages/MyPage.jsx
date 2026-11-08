import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@/hooks/useNavigation';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ClipboardList, Pencil, Plus, ShieldAlert, UserRound, UserX } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage, isApiError } from '@/services/api';
import { formatDate, formatDateTime } from '@/utils/date';
import { memberCode } from '@/utils/format';
import { NICKNAME_MAX, validateNickname, validateEmail } from '@/utils/validation';
import { useEventEditor } from '@/hooks/useEventEditor';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, SkeletonRows } from '@/components/ui/States';
import { EventTable } from '@/components/events/EventTable';
import { EVENT_STATUSES } from '@/domain';
import { MarkerShape } from '@/components/map/MarkerShape';
export default function MyPage() {
    const { user, updateProfile, withdraw } = useAuth();
    const { events, status, reload, authorOf } = useEvents();
    const toast = useToast();
    const navigate = useNavigate();
    const editor = useEventEditor();
    const [editing, setEditing] = useState(false);
    const [nickname, setNickname] = useState(user?.nickname ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [emailError, setEmailError] = useState();
    const [nickError, setNickError] = useState();
    const [saving, setSaving] = useState(false);
    const [confirmWithdraw, setConfirmWithdraw] = useState(false);
    useEffect(() => {
        if (user && !editing) {
            setNickname(user.nickname);
            setEmail(user.email);
        }
    }, [user, editing]);
    const mine = useMemo(() => (user ? events.filter((e) => e.member_id === user.member_id) : []), [events, user]);
    if (!user)
        return null; // RequireAuth 가 보호
    const saveNickname = async (e) => {
        e.preventDefault();
        const err = validateNickname(nickname);
        setNickError(err);
        const mailErr = validateEmail(email);
        setEmailError(mailErr);
        if (err || mailErr)
            return;
        if (nickname.trim() === user.nickname && email.trim().toLowerCase() === user.email) {
            setEditing(false);
            return;
        }
        setSaving(true);
        try {
            await updateProfile({ nickname: nickname.trim(), email: email.trim().toLowerCase() });
            await reload(); // 작성자 아이디 표시 갱신
            toast.success('회원정보를 변경했습니다.');
            setEditing(false);
        }
        catch (e2) {
            if (isApiError(e2) && e2.details?.email)
                setEmailError(e2.details.email);
            setNickError(isApiError(e2) ? e2.details?.nickname ?? e2.message : '변경하지 못했습니다.');
        }
        finally {
            setSaving(false);
        }
    };
    return <div className="workspace-page account-page">
    <PageHeader title="내 계정" icon={<UserRound />} description="회원정보를 확인·수정하고 내가 등록한 상황정보를 관리합니다." actions={<span className="app-badge app-sector">회원 워크스페이스</span>}/>
    <div className="account-overview"><Panel title="회원정보" icon={<UserRound />} actions={!editing && <Button size="sm" icon={<Pencil size={14}/>} aria-label="회원정보 수정" onClick={() => setEditing(true)}>수정</Button>}>
      <div className="account-identity"><span className="app-avatar" aria-hidden>{user.nickname.slice(0, 1)}</span><div><strong>{user.nickname}</strong><small>회원번호 {memberCode(user.member_id)}</small></div></div>
      {editing ? <form className="account-form" onSubmit={saveNickname} noValidate><Field label="새 아이디" required error={nickError} hint={`최대 ${NICKNAME_MAX}자`}>{(props) => <TextInput {...props} autoFocus value={nickname} invalid={!!nickError} onChange={(event) => { setNickname(event.target.value); setNickError(undefined); }}/>}</Field><Field label="이메일" required error={emailError}>{(props) => <TextInput {...props} type="email" autoComplete="email" value={email} invalid={!!emailError} onChange={(event) => { setEmail(event.target.value); setEmailError(undefined); }}/>}</Field><div className="account-form-actions"><Button variant="ghost" onClick={() => { setEditing(false); setNickError(undefined); setEmailError(undefined); }} disabled={saving}>취소</Button><Button variant="primary" type="submit" loading={saving}>변경사항 저장</Button></div></form> : <dl className="account-info"><div><dt>아이디</dt><dd>{user.nickname}</dd></div><div><dt>이메일</dt><dd>{user.email}</dd></div><div><dt>가입일</dt><dd>{formatDate(user.created_at)}</dd></div><div><dt>최근 수정</dt><dd>{formatDateTime(user.updated_at)}</dd></div></dl>}
    </Panel><Panel title="내 상황정보 현황" icon={<ClipboardList />} bodyClassName="p-0"><div className="account-status">{EVENT_STATUSES.map((value) => <div key={value}><p><MarkerShape status={value} size={7}/>{value}</p><strong>{mine.filter((event) => event.status === value).length}</strong></div>)}</div><div className="account-status-foot"><span>전체 {mine.length}건의 등록 사건</span><Link to="/events/?mine=1">내 사건만 보기<ArrowUpRight size={14}/></Link></div></Panel></div>
    <Panel title="내가 등록한 상황정보" icon={<ClipboardList />} actions={<Button variant="primary" size="sm" icon={<Plus size={15}/>} onClick={editor.openCreate}>상황정보 등록</Button>} bodyClassName="p-0">
      {status === 'loading' ? <SkeletonRows /> : !mine.length ? <EmptyState title="아직 등록한 상황정보가 없습니다" message="새 상황정보를 등록하면 이곳에서 수정·삭제할 수 있습니다." action={<Button variant="primary" onClick={editor.openCreate}>상황정보 등록</Button>}/> : <EventTable events={mine} user={user} authorOf={authorOf} onEdit={editor.openEdit} onDelete={editor.requestDelete}/>}
      <div className="data-table-footer"><span>총 {mine.length}건 · 로그인한 회원이 작성한 사건</span><span>작성자 수정·삭제 가능</span></div>
    </Panel>
    <Panel title="계정 관리" icon={<ShieldAlert />}><div className="account-danger"><p>탈퇴하면 회원정보와 내가 등록한 상황정보 <strong>{mine.length}건</strong>이 모두 삭제되며 복구할 수 없습니다.</p><Button variant="danger" icon={<UserX size={15}/>} onClick={() => setConfirmWithdraw(true)}>회원탈퇴</Button></div></Panel>
      <ConfirmDialog open={confirmWithdraw} title="정말 탈퇴하시겠습니까?" confirmLabel="회원탈퇴" confirmText="탈퇴" message={<>
            <strong className="text-ink">{user.nickname}</strong> ({user.email}) 계정을 삭제합니다.
            <br />
            작성한 상황정보 {mine.length}건도 함께 삭제되며 복구할 수 없습니다.
          </>} onClose={() => setConfirmWithdraw(false)} onConfirm={async () => {
            try {
                await withdraw();
                await reload();
                setConfirmWithdraw(false);
                toast.info('회원탈퇴가 완료되었습니다.', '이용해 주셔서 감사합니다.');
                navigate('/', { replace: true });
            }
            catch (e) {
                toast.error('회원탈퇴를 처리하지 못했습니다.', errorMessage(e));
            }
        }}/>
    {editor.modals}
  </div>;
}
