import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#1b2e4b] dark:bg-[#0e1726]';

interface MasterPageProps {
    title: string;
    description?: string;
    /** Buttons shown on the right of the page header */
    actions?: ReactNode;
    children: ReactNode;
}

/** Standard page shell for every Master Console screen: eyebrow, title, description, actions. */
export const MasterPage = ({ title, description, actions, children }: MasterPageProps) => (
    <div className="mx-auto w-full max-w-[90rem] space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Master Console</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
                {description && <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
    </div>
);

interface SectionCardProps {
    title?: string;
    description?: string;
    /** Link or button shown on the right of the card header */
    action?: ReactNode;
    /** Remove the body padding (tables, lists that run edge to edge) */
    flush?: boolean;
    className?: string;
    children: ReactNode;
}

export const SectionCard = ({ title, description, action, flush, className = '', children }: SectionCardProps) => (
    <section className={`${CARD} ${className}`}>
        {(title || action) && (
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/5">
                <div className="min-w-0">
                    {title && <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>}
                    {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
                </div>
                {action && <div className="shrink-0 text-xs font-semibold text-primary">{action}</div>}
            </div>
        )}
        <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
);

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'neutral';

export const TONES: Record<Tone, { soft: string; text: string; dot: string }> = {
    primary: { soft: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
    success: { soft: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    warning: { soft: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    danger: { soft: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
    info: { soft: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400', text: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
    violet: { soft: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400', text: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500' },
    neutral: { soft: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
};

interface StatCardProps {
    label: string;
    value: number | string | undefined;
    icon: ReactNode;
    tone?: Tone;
    hint?: string;
    /** Makes the whole card a link */
    to?: string;
    loading?: boolean;
}

export const StatCard = ({ label, value, icon, tone = 'primary', hint, to, loading }: StatCardProps) => {
    const body = (
        <>
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone].soft}`}>{icon}</div>
            </div>
            {loading ? (
                <div className="mt-3 h-8 w-20 animate-pulse rounded-md bg-slate-100 dark:bg-white/5" />
            ) : (
                <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">{value ?? '–'}</p>
            )}
            {hint && <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
        </>
    );
    const className = `${CARD} block p-5 ${to ? 'transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md' : ''}`;
    return to ? (
        <Link to={to} className={className}>
            {body}
        </Link>
    ) : (
        <div className={className}>{body}</div>
    );
};

export const StatGrid = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
