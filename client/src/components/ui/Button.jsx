import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cx } from '@/utils/format';
const VARIANTS = {
    primary: 'is-primary',
    secondary: 'is-secondary',
    outline: 'is-outline',
    ghost: 'is-ghost',
    danger: 'is-danger',
};
const SIZES = {
    sm: 'is-small',
    md: 'is-medium',
    lg: 'is-large',
};
export const Button = forwardRef(function Button({ variant = 'secondary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest }, ref) {
    return (<button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cx('app-button', VARIANTS[variant], SIZES[size], className)} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden/> : icon}
      {children}
    </button>);
});
