import { Layers } from 'lucide-react';
export function PageHeader({ title, description, actions, icon }) {
    return <header className="page-header">
    <span className="page-header-symbol" aria-hidden>{icon ?? <Layers size={22} strokeWidth={1.65}/>}</span>
    <div className="page-header-copy"><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="page-header-actions">{actions}</div>}
  </header>;
}
