import { useEffect, useState } from 'react';
import { Pencil, UserX } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { useNavigate } from '@/hooks/useNavigation';
import { errorMessage, isApiError } from '@/services/api';
import { NICKNAME_MAX, validateEmail, validateNickname } from '@/utils/validation';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/** 본인 회원정보 수정(PATCH /api/members/me)과 탈퇴(DELETE /api/members/me) */
export function AccountEditor({ incidentCount, noteCount, onChanged }) {
    const { user, updateProfile, withdraw } = useAuth();
    const { reload } = useEvents();
    const toast = useToast();
    const navigate = useNavigate();
    const [editing, setEditing] = useState(false);
    const [nickname, setNickname] = useState(user?.nickname ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [confirm, setConfirm] = useState(false);
    useEffect(() => { if (user && !editing) { setNickname(user.nickname); setEmail(user.email); } }, [user, editing]);
    if (!user) return null;
    const save = async (e) => {
        e.preventDefault();
        const found = { nickname: validateNickname(nickname), email: validateEmail(email) };
        setErrors(found);
        if (found.nickname || found.email) return;
        if (nickname.trim() === user.nickname && email.trim().toLowerCase() === user.email) { setEditing(false); return; }
        setSaving(true);
        try {
            await updateProfile({ nickname: nickname.trim(), email: email.trim().toLowerCase() });
            await reload();
            onChanged?.();
            toast.success('회원정보를 변경했습니다.');
            setEditing(false);
        }
        catch (err) {
            setErrors(isApiError(err) && err.details ? err.details : { nickname: errorMessage(err, '변경하지 못했습니다.') });
        }
        finally {
            setSaving(false);
        }
    };
    return <div className="gx-account">
      {editing ? <form className="gx-form" onSubmit={save} noValidate>
          <Field label="아이디" required error={errors.nickname} hint={`한글·영문·숫자 2~${NICKNAME_MAX}자`}>{(p) => <TextInput {...p} autoFocus value={nickname} invalid={!!errors.nickname} onChange={(e) => setNickname(e.target.value)}/>}</Field>
          <Field label="이메일" required error={errors.email}>{(p) => <TextInput {...p} type="email" value={email} invalid={!!errors.email} onChange={(e) => setEmail(e.target.value)}/>}</Field>
          <div className="gx-form-actions"><Button variant="ghost" onClick={() => { setEditing(false); setErrors({}); }} disabled={saving}>취소</Button><Button variant="primary" type="submit" loading={saving}>변경사항 저장</Button></div>
        </form>
        : <div className="gx-account-actions">
          <Button size="sm" icon={<Pencil size={14}/>} onClick={() => setEditing(true)}>회원정보 수정</Button>
          <Button size="sm" variant="danger" icon={<UserX size={14}/>} onClick={() => setConfirm(true)}>회원탈퇴</Button>
        </div>}
      <ConfirmDialog open={confirm} title="정말 탈퇴하시겠습니까?" confirmLabel="회원탈퇴" confirmText="탈퇴"
        message={<><strong className="text-ink">{user.nickname}</strong> ({user.email}) 계정을 삭제합니다.<br/>작성한 훈련 사건 {incidentCount}건과 분석 기록 {noteCount}건도 함께 삭제되며 복구할 수 없습니다.</>}
        onClose={() => setConfirm(false)} onConfirm={async () => {
            try {
                await withdraw();
                await reload();
                setConfirm(false);
                toast.info('회원탈퇴가 완료되었습니다.');
                navigate('/', { replace: true });
            }
            catch (err) {
                toast.error('회원탈퇴를 처리하지 못했습니다.', errorMessage(err));
            }
        }}/>
    </div>;
}
