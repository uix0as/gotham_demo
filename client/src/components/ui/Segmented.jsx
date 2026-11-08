import { cx } from '@/utils/format';
export function Segmented({ value, options, onChange, label, size = 'md' }) {
    function move(event, index) {
        const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
        if (!direction && event.key !== 'Home' && event.key !== 'End')
            return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + direction + options.length) % options.length;
        onChange(options[next].value);
        event.currentTarget.parentElement?.querySelectorAll('button')[next]?.focus();
    }
    return <div role="radiogroup" aria-label={label} className={cx('app-segmented', size === 'sm' && 'is-small')}>
    {options.map((option, index) => <button key={String(option.value)} type="button" role="radio" aria-checked={value === option.value} tabIndex={value === option.value ? 0 : -1} onKeyDown={(event) => move(event, index)} onClick={() => onChange(option.value)} className={value === option.value ? 'is-selected' : undefined}>{option.label}</button>)}
  </div>;
}
