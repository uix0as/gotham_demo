import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
export function ConfirmDialog({ open, title, message, confirmLabel = '확인', tone = 'danger', confirmText, onConfirm, onClose }) {
    const [busy, setBusy] = useState(false);
    const [typed, setTyped] = useState('');
    const blocked = !!confirmText && typed.trim() !== confirmText;
    const handleClose = () => {
        setTyped('');
        onClose();
    };
    const handleConfirm = async () => {
        setBusy(true);
        try {
            await onConfirm();
            setTyped('');
        }
        finally {
            setBusy(false);
        }
    };
    return (<Modal open={open} onClose={handleClose} title={title} size="sm" busy={busy} footer={<>
          <Button variant="ghost" onClick={handleClose} disabled={busy}>
            취소
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={handleConfirm} loading={busy} disabled={blocked}>
            {confirmLabel}
          </Button>
        </>}>
      <div className="flex gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone === 'danger' ? 'bg-danger-muted text-danger' : 'bg-accent-muted text-accent'}`}>
          <AlertTriangle className="h-4 w-4" aria-hidden/>
        </div>
        <div className="min-w-0 flex-1 text-sm leading-relaxed text-ink-secondary">{message}</div>
      </div>
      {confirmText && (<div className="mt-4">
          <label htmlFor="confirm-text" className="text-xs text-ink-secondary">
            계속하려면 <strong className="font-mono text-ink">{confirmText}</strong> 를 입력하세요.
          </label>
          <input id="confirm-text" data-autofocus className="input mt-1.5" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off"/>
        </div>)}
    </Modal>);
}
