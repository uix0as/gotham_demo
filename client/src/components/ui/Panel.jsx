import { cx } from '@/utils/format';
export function Panel({ title, icon, actions, subtitle, children, className, bodyClassName, as: Tag = 'section' }) {
    return (<Tag className={cx('panel flex min-w-0 flex-col', className)}>
      {(title || actions) && (<header className="panel-header">
          <div className="min-w-0">
            {title && (<h2 className="panel-title">
                {icon && <span className="panel-heading-icon">{icon}</span>}
                <span>{title}</span>
              </h2>)}
            {subtitle && <p className="panel-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>)}
      <div className={cx('panel-body min-h-0 flex-1', bodyClassName ?? 'p-5')}>{children}</div>
    </Tag>);
}
