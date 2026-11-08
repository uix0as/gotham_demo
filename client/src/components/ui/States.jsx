import { AlertOctagon, Inbox, Loader2, Lock } from 'lucide-react';
import { Button } from './Button';
export function LoadingState({ label = '데이터를 불러오는 중…', compact }) {
    return (<div className={`flex flex-col items-center justify-center gap-3 text-ink-muted ${compact ? 'py-6' : 'py-16'}`} role="status">
      <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden/>
      <p className="text-xs">{label}</p>
    </div>);
}
export function SkeletonRows({ rows = 6 }) {
    return (<div className="space-y-2 p-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (<div key={i} className="h-9 animate-pulse rounded-md bg-elevated/70" style={{ opacity: 1 - i * 0.12 }}/>))}
    </div>);
}
export function EmptyState({ title, message, action, icon }) {
    return (<div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink-muted">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden/>}
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {message && <p className="max-w-sm text-xs text-ink-muted">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>);
}
export function ErrorState({ message, onRetry }) {
    return (<div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center" role="alert">
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-danger-muted text-danger">
        <AlertOctagon className="h-5 w-5" aria-hidden/>
      </div>
      <p className="text-sm font-medium text-ink">데이터를 불러오지 못했습니다</p>
      <p className="max-w-md text-xs text-ink-muted">{message}</p>
      {onRetry && (<Button size="sm" className="mt-3" onClick={onRetry}>
          다시 시도
        </Button>)}
    </div>);
}
export function ForbiddenNotice({ children }) {
    return (<div className="flex items-start gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs text-ink-muted">
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden/>
      <span>{children}</span>
    </div>);
}
