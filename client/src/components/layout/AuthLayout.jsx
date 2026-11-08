import { Link } from 'react-router-dom';
import { ArrowLeft, UserRound } from 'lucide-react';
import { Logo } from './Logo';
export function AuthLayout({ children, title, subtitle, icon }) {
    return <div className="auth-page relative flex min-h-screen flex-col items-center justify-center px-5 py-10"><div className="auth-frame">
    <div className="auth-brand"><Link to="/" aria-label="통합 대시보드로 이동"><Logo /></Link><Link to="/"><ArrowLeft size={14} aria-hidden/>대시보드로</Link></div>
    <main id="main" className="auth-card"><header className="auth-heading"><span className="auth-heading-symbol" aria-hidden>{icon ?? <UserRound size={21} strokeWidth={1.6}/>}</span><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></header><div className="auth-content">{children}</div></main>
    <p className="auth-footnote">DEFENSE NEXUS · 사건·관측 분석 워크스페이스</p>
  </div></div>;
}
