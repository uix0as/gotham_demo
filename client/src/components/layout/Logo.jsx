/** GOTHAM 표지: 사각 조준선 모양의 자체 제작 마크 (외부 상표와 무관) */
export function LogoMark({ size = 28 }) {
    return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="gx-mark">
      <rect x="1.5" y="1.5" width="29" height="29" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 5v6M16 21v6M5 16h6M21 16h6" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="12.5" y="12.5" width="7" height="7" fill="var(--accent)"/>
    </svg>;
}
export function Logo({ subtitle = '국방 훈련 정보 분석 시스템' }) {
    return <span className="gx-logo"><LogoMark /><span><strong>GOTHAM</strong>{subtitle && <small>{subtitle}</small>}</span></span>;
}
