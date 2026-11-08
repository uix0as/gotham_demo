import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '@/utils/format';
const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
export function Modal({ open, onClose, title, description, children, footer, size = 'md', busy }) {
    const overlayRef = useRef(null);
    const dialogRef = useRef(null);
    const lastFocus = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        lastFocus.current = document.activeElement;
        const controls = () => [...(dialogRef.current?.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])].filter(element => element.getClientRects().length > 0);
        const focusFirst = () => (controls()[0] ?? dialogRef.current)?.focus({ preventScroll: true });
        const background = [...document.body.children]
            .filter((element) => element instanceof HTMLElement && element !== overlayRef.current)
            .map(element => ({ element, inert: element.inert }));
        background.forEach(({ element }) => { element.inert = true; });
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (!busy)
                    onClose();
            }
            if (e.key === 'Tab' && dialogRef.current) {
                const f = controls();
                if (!f.length) {
                    e.preventDefault();
                    dialogRef.current.focus();
                    return;
                }
                const first = f[0];
                const last = f[f.length - 1];
                const outside = !dialogRef.current.contains(document.activeElement) || document.activeElement === dialogRef.current;
                if (e.shiftKey && (document.activeElement === first || outside)) {
                    e.preventDefault();
                    last.focus();
                }
                else if (!e.shiftKey && (document.activeElement === last || outside)) {
                    e.preventDefault();
                    first.focus();
                }
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        };
        const containFocus = (event) => {
            if (event.target instanceof Node && !dialogRef.current?.contains(event.target))
                focusFirst();
        };
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('focusin', containFocus);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const t = window.setTimeout(() => {
            const target = dialogRef.current?.querySelector('[data-autofocus]');
            if (target)
                target.focus({ preventScroll: true });
            else
                focusFirst();
        }, 20);
        return () => {
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('focusin', containFocus);
            background.forEach(({ element, inert }) => { element.inert = inert; });
            document.body.style.overflow = prevOverflow;
            window.clearTimeout(t);
            lastFocus.current?.focus?.();
        };
    }, [open, onClose, busy]);
    if (!open)
        return null;
    return createPortal(<div ref={overlayRef} className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-black/45" onClick={() => !busy && onClose()} aria-hidden/>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} className={cx('app-modal relative flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-2xl border border-line bg-panel focus:outline-none sm:rounded-2xl', SIZES[size])}>
        <header className="app-modal-header flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-ink">
              {title}
            </h2>
            {description && <div className="mt-1 text-xs text-ink-muted">{description}</div>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="console-icon" aria-label="닫기">
            <X className="h-4 w-4"/>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>, document.body);
}
