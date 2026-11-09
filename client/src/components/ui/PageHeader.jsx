import { Layers } from 'lucide-react';
export function PageHeader({ title, description, actions, icon, status, className = '' }) {
    return <header className={`page-header ${className}`}>
    <span className="page-header-symbol" aria-hidden>{icon ?? <Layers size={22} strokeWidth={1.65}/>}</span>
    <div className="page-header-copy"><div className="page-header-title"><h1>{title}</h1>{status}</div>{description && <p>{description}</p>}</div>
    {actions && <div className="page-header-actions">{actions}</div>}
  </header>;
}
