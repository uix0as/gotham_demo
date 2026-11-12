import { forwardRef, useId } from 'react';
import { cx } from '@/utils/format';
/** 라벨·오류·도움말을 접근성 속성과 함께 연결하는 래퍼 */
export function Field({ label, error, hint, required, children, className }) {
    const id = useId();
    const descId = `${id}-desc`;
    return (<div className={cx('app-field flex flex-col gap-2', className)}>
      <label htmlFor={id} className="app-field-label">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error || hint ? descId : undefined })}
      {error ? (<p id={descId} className="text-xs text-danger" role="alert">
          {error}
        </p>) : hint ? (<p id={descId} className="text-xs text-ink-muted">
          {hint}
        </p>) : null}
    </div>);
}
export const TextInput = forwardRef(function TextInput({ invalid, className, ...rest }, ref) {
    return <input ref={ref} className={cx('input', invalid && 'input-invalid', className)} {...rest}/>;
});
export function SelectInput({ invalid, className, children, ...rest }) {
    return (<select className={cx('input input-select', invalid && 'input-invalid', className)} {...rest}>
      {children}
    </select>);
}
export function TextArea({ invalid, className, ...rest }) {
    return <textarea className={cx('input h-auto min-h-24 resize-y py-2 leading-relaxed', invalid && 'input-invalid', className)} {...rest}/>;
}
