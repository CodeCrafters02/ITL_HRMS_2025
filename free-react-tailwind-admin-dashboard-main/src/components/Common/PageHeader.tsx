import React from 'react';

export type PageHeaderVariant =
    | 'primary' // Innovyx royal blue (default)
    | 'emerald' // Workforce & success
    | 'indigo' // Attendance & core systems
    | 'purple' // Learning & development
    | 'amber' // Finance & requests
    | 'rose' // Approvals & compliance
    | 'cyan' // Facilities & analytics
    | 'slate'; // Neutral

export interface PageHeaderProps {
    title: string | React.ReactNode;
    subtitle?: string | React.ReactNode;
    icon?: React.ReactNode;
    badge?: string | React.ReactNode;
    actions?: React.ReactNode;
    stats?: React.ReactNode;
    variant?: PageHeaderVariant;
    className?: string;
    children?: React.ReactNode;
}

// One consistent look across every page. `variant` is kept only so existing callers still compile.
const brand = {
    bar: 'from-brand via-brand-mid to-brand-accent',
    tile: 'from-brand to-brand-mid shadow-brand/30',
    badge: 'bg-brand-50 text-brand border-brand-200/70 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-900/60',
    dot: 'bg-brand dark:bg-brand-400',
    wash: 'from-brand-100/70 dark:from-brand-500/10',
};

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    icon,
    badge,
    actions,
    stats,
    variant: _variant,
    className = '',
    children,
}) => {
    const v = brand;

    return (
        <div
            className={`relative isolate z-0 w-full overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0e1726] shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] mb-6 ${className}`}
        >
            <div className={`h-1 w-full bg-gradient-to-r ${v.bar}`} />

            {/* Soft corner wash */}
            <div className={`pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-gradient-to-br ${v.wash} to-transparent blur-2xl`} />

            <div className="relative px-5 py-5 sm:px-6 sm:py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                <div className="flex items-center gap-4 min-w-0">
                    {icon && (
                        <div
                            className={`h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-2xl bg-gradient-to-br ${v.tile} text-white shadow-lg flex items-center justify-center [&>svg]:h-6 [&>svg]:w-6 sm:[&>svg]:h-7 sm:[&>svg]:w-7`}
                        >
                            {icon}
                        </div>
                    )}

                    <div className="min-w-0">
                        {badge && (
                            <span className={`mb-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${v.badge}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
                                {badge}
                            </span>
                        )}
                        <h1 className="text-xl sm:text-2xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">{title}</h1>
                        {subtitle && <p className="mt-1 max-w-3xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>}
                    </div>
                </div>

                {(actions || stats) && (
                    <div className="flex flex-wrap items-center gap-3 lg:justify-end shrink-0">
                        {stats && <div className="flex items-center gap-3">{stats}</div>}
                        {actions}
                    </div>
                )}
            </div>

            {children && (
                <div className="relative border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0b1320]/60 px-5 py-3.5 sm:px-6">{children}</div>
            )}
        </div>
    );
};

export default PageHeader;
