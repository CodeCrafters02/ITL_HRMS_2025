import { ReactNode } from 'react';

import PageHeader from '../Common/PageHeader';
import CommonStatCard, { StatGrid as CommonStatGrid, StatTone } from '../Common/StatCard';
import IconServer from '../Icon/IconServer';

const CARD = 'rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0e1726]';

interface MasterPageProps {
    title: string;
    description?: string;
    /** Buttons shown on the right of the page header */
    actions?: ReactNode;
    children: ReactNode;
}

/** Standard page shell for every Master Console screen: the shared PageHeader, then the content. */
export const MasterPage = ({ title, description, actions, children }: MasterPageProps) => (
    <div className="space-y-6">
        <PageHeader title={title} subtitle={description} badge="Master Console" icon={<IconServer />} actions={actions} />
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
    primary: { soft: 'bg-brand/10 text-brand', text: 'text-brand', dot: 'bg-brand' },
    success: { soft: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    warning: { soft: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    danger: { soft: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
    info: { soft: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400', text: 'text-brand-600 dark:text-brand-400', dot: 'bg-brand-500' },
    violet: { soft: 'bg-brand-50 text-brand-accent dark:bg-brand-accent/10 dark:text-brand-accent', text: 'text-brand-accent dark:text-brand-accent', dot: 'bg-brand-accent' },
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

const STAT_TONE: Record<Tone, StatTone> = { primary: 'primary', success: 'success', warning: 'warning', danger: 'danger', info: 'info', violet: 'purple', neutral: 'slate' };

export const StatCard = ({ label, value, icon, tone = 'primary', hint, to, loading }: StatCardProps) => (
    <CommonStatCard label={label} value={value ?? '–'} icon={icon} tone={STAT_TONE[tone]} hint={hint} to={to} loading={loading} />
);

export const StatGrid = ({ children }: { children: ReactNode }) => <CommonStatGrid cols={4}>{children}</CommonStatGrid>;
