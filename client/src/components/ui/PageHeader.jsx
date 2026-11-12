/** 기존 화면용 머리글 — 새 PageBar와 같은 모양으로 렌더링합니다. */
export function PageHeader({ title, description, actions, status, code }) {
    return <header className="gx-pagebar">
    <div className="gx-pagebar-main">
      {code && <span className="gx-code">{code}</span>}
      <div><h1>{title}{status && <span className="gx-pagebar-status">{status}</span>}</h1>{description && <p>{description}</p>}</div>
    </div>
    {actions && <div className="gx-pagebar-actions">{actions}</div>}
  </header>;
}
