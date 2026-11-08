import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from '@/hooks/useNavigation';
import { useQueryParams as useSearchParams } from '@/hooks/useNavigation';
import { ClientRedirect } from '@/components/layout/ClientRedirect';
import { useSearchParams as useRouteSearchParams } from '@/hooks/useNavigation';
import { ChevronDown, KeyRound, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/services/api';
const DEMO_ACCOUNTS = [{ nickname: '알파 관제관', email: 'alpha@demo.local', password: 'demo1234' }, { nickname: '브라보 분석관', email: 'bravo@demo.local', password: 'demo1234' }];
import { validateEmail } from '@/utils/validation';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
export default function Login() {
    const { user, login, initializing } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const returnParams = useRouteSearchParams();
    const [params] = useSearchParams();
    const candidate = returnParams.get('from') || '/';
    const from = candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/';
    const [email, setEmail] = useState(params.get('email') ?? '');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [loading, setLoading] = useState(false);
    if (!initializing && user && !loading)
        return <ClientRedirect href={from}/>;
    const doLogin = async (em, pw) => {
        setFormError(null);
        setLoading(true);
        try {
            const m = await login({ email: em, password: pw });
            toast.success(`${m.nickname} 님, 환영합니다.`);
            navigate(from, { replace: true });
        }
        catch (e) {
            setFormError(errorMessage(e, '로그인하지 못했습니다.'));
            setLoading(false);
        }
    };
    const onSubmit = (e) => {
        e.preventDefault();
        const next = {};
        const em = validateEmail(email);
        if (em)
            next.email = em;
        if (!password)
            next.password = '비밀번호를 입력해 주세요.';
        setErrors(next);
        if (Object.keys(next).length)
            return;
        void doLogin(email, password);
    };
    return (<AuthLayout title="로그인" subtitle="상황정보 등록·수정은 로그인한 회원만 가능합니다.">
      <form onSubmit={onSubmit} noValidate className="auth-form">
        <Field label="이메일" required error={errors.email}>
          {(p) => (<TextInput {...p} type="email" autoComplete="email" value={email} invalid={!!errors.email} onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: undefined })); }} placeholder="name@example.com" autoFocus/>)}
        </Field>
        <Field label="비밀번호" required error={errors.password}>
          {(p) => (<TextInput {...p} type="password" autoComplete="current-password" value={password} invalid={!!errors.password} onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: undefined })); }} placeholder="비밀번호"/>)}
        </Field>

        {formError && (<p className="rounded-md border border-danger/40 bg-danger-muted px-3 py-2 text-xs text-danger" role="alert">
            {formError}
          </p>)}

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading} icon={<LogIn className="h-4 w-4"/>}>
          로그인
        </Button>
      </form>

      <p className="auth-switch">아직 회원이 아니신가요? <Link to="/signup">회원가입</Link></p>
      <details className="auth-demo"><summary>시연 계정으로 로그인<ChevronDown size={15} aria-hidden/></summary><p>초기 데이터 생성 후 사용할 수 있습니다. 서로 다른 계정으로 작성자 수정·삭제 권한을 확인하세요.</p><ul>{DEMO_ACCOUNTS.map((account) => <li key={account.email}><div><p>{account.nickname}</p><small>{account.email} / {account.password}</small></div><Button size="sm" variant="outline" icon={<KeyRound size={14}/>} disabled={loading} onClick={() => { setEmail(account.email); setPassword(account.password); void doLogin(account.email, account.password); }}>{account.nickname.slice(0, 2)} 로그인</Button></li>)}</ul></details>
    </AuthLayout>);
}
