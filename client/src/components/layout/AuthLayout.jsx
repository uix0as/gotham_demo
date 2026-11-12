import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';

const FACTS = [
    ['회원', 'members · bcrypt 해시 · JWT 쿠키'],
    ['훈련 사건', 'incidents · 작성자만 수정·삭제'],
    ['분석 기록', 'analysis_notes · 사건·회원과 JOIN'],
];

export function AuthLayout({ children, title, subtitle }) {
    return <div className="gx-auth">
      <div className="gx-auth-grid">
        <aside className="gx-auth-brand">
          <Logo />
          <div className="gx-auth-copy">
            <p className="gx-eyebrow">DEFENSE TRAINING INTELLIGENCE</p>
            <h2>훈련 상황을 기록하고,<br/>사건과 분석을 연결합니다.</h2>
            <p>가상 훈련구역에서 보고된 사건을 등록하고, 분석 기록과 작성 회원의 관계를 MySQL JOIN으로 추적하는 학교 데이터베이스 프로젝트입니다.</p>
          </div>
          <dl className="gx-auth-facts">{FACTS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          <svg className="gx-auth-grid-art" viewBox="0 0 400 220" aria-hidden="true">
            <g stroke="var(--line)" strokeWidth="1">{[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="220"/>)}{[0, 1, 2, 3, 4].map((i) => <line key={`h${i}`} x1="0" y1={i * 55} x2="400" y2={i * 55}/>)}</g>
            <path d="M0 120 L110 105 L165 140 L230 92 L300 118 L400 80" fill="none" stroke="var(--line-strong)" strokeDasharray="4 4"/>
            <rect x="160" y="135" width="10" height="10" fill="none" stroke="var(--warn)"/><circle cx="230" cy="92" r="5" fill="none" stroke="var(--accent)"/><path d="M296 114h8v8h-8z" fill="var(--ok)"/>
          </svg>
        </aside>
        <div className="gx-auth-panel">
          <Link to="/" className="gx-auth-back"><ArrowLeft size={14} aria-hidden/>작전 상황판으로</Link>
          <main id="main" className="gx-auth-card">
            <header><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</header>
            {children}
          </main>
        </div>
      </div>
    </div>;
}
