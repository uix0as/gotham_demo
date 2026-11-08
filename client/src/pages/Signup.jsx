import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from '@/hooks/useNavigation';
import { Check, UserPlus, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { isApiError } from '@/services/api';
import { NICKNAME_MAX, NICKNAME_MIN, PASSWORD_MIN, hasErrors, validateSignup } from '@/utils/validation';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
const EMPTY = { nickname: '', email: '', password: '', passwordConfirm: '' };
function Rule({ ok, children }) {
    return (<li className={`flex items-center gap-1 ${ok ? 'text-ok' : 'text-ink-muted'}`}>
      {ok ? <Check className="h-3 w-3" aria-hidden/> : <X className="h-3 w-3" aria-hidden/>}
      {children}
    </li>);
}
export default function Signup() {
    const { signup } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [form, setForm] = useState(EMPTY);
    const [touched, setTouched] = useState({});
    const [serverErrors, setServerErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const clientErrors = validateSignup(form);
    const show = (k) => (submitted || touched[k] ? clientErrors[k] : undefined) ?? serverErrors[k];
    const set = (k, v) => {
        setForm((f) => ({ ...f, [k]: v }));
        setServerErrors((e) => ({ ...e, [k]: undefined }));
    };
    const blur = (k) => setTouched((t) => ({ ...t, [k]: true }));
    const onSubmit = async (e) => {
        e.preventDefault();
        setSubmitted(true);
        setFormError(null);
        if (hasErrors(clientErrors))
            return;
        setLoading(true);
        try {
            // 비밀번호는 평문으로 서버에 전송되고, 서버가 bcrypt 로 해시합니다(HTTPS 필수).
            const m = await signup({ nickname: form.nickname.trim(), email: form.email.trim(), password: form.password });
            toast.success('회원가입이 완료되었습니다.', '가입한 이메일로 로그인해 주세요.');
            navigate(`/login?email=${encodeURIComponent(m.email)}`, { replace: true });
        }
        catch (err) {
            if (isApiError(err) && err.details)
                setServerErrors(err.details);
            setFormError(isApiError(err) ? err.message : '회원가입하지 못했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    const pw = form.password;
    return (<AuthLayout title="회원가입" subtitle="가상 훈련 상황정보를 등록하려면 회원가입이 필요합니다.">
      <form onSubmit={onSubmit} noValidate className="auth-form">
        <Field label="아이디" required error={show('nickname')} hint={`${NICKNAME_MIN}~${NICKNAME_MAX}자 · 중복 불가 · 작성자 아이디로 표시됩니다.`}>
          {(p) => <TextInput {...p} autoFocus autoComplete="username" value={form.nickname} invalid={!!show('nickname')} onChange={(e) => set('nickname', e.target.value)} onBlur={() => blur('nickname')} maxLength={NICKNAME_MAX + 5} placeholder="예: 찰리 관제관"/>}
        </Field>
        <Field label="이메일" required error={show('email')}>
          {(p) => <TextInput {...p} type="email" autoComplete="email" value={form.email} invalid={!!show('email')} onChange={(e) => set('email', e.target.value)} onBlur={() => blur('email')} placeholder="name@example.com"/>}
        </Field>
        <Field label="비밀번호" required error={show('password')}>
          {(p) => <TextInput {...p} type="password" autoComplete="new-password" value={pw} invalid={!!show('password')} onChange={(e) => set('password', e.target.value)} onBlur={() => blur('password')} placeholder={`${PASSWORD_MIN}자 이상, 영문+숫자`}/>}
        </Field>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="비밀번호 조건">
          <Rule ok={pw.length >= PASSWORD_MIN}>{`${PASSWORD_MIN}자 이상`}</Rule>
          <Rule ok={/[A-Za-z]/.test(pw)}>영문 포함</Rule>
          <Rule ok={/[0-9]/.test(pw)}>숫자 포함</Rule>
        </ul>
        <Field label="비밀번호 확인" required error={show('passwordConfirm')}>
          {(p) => <TextInput {...p} type="password" autoComplete="new-password" value={form.passwordConfirm} invalid={!!show('passwordConfirm')} onChange={(e) => set('passwordConfirm', e.target.value)} onBlur={() => blur('passwordConfirm')} placeholder="비밀번호 재입력"/>}
        </Field>

        {formError && (<p className="rounded-md border border-danger/40 bg-danger-muted px-3 py-2 text-xs text-danger" role="alert">
            {formError}
          </p>)}

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading} icon={<UserPlus className="h-4 w-4"/>}>
          회원가입
        </Button>
      </form>

      <p className="auth-switch">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">
          로그인
        </Link>
      </p>

    </AuthLayout>);
}
