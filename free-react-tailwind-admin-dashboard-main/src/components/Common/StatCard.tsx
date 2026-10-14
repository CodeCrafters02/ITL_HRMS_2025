import React from 'react';
import { Link } from 'react-router-dom';

export type StatTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'slate';

export interface StatCardProps {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
    tone?: StatTone;
    hint?: React.ReactNode; // small line under the value
    trend?: { value: string; direction?: 'up' | 'down' | 'flat' }; // e.g. { value: '+12%', direction: 'up' }
    loading?: boolean;
    onClick?: () => void;
    to?: string; // renders the card as a router link
    progress?: number; // optional 0–100 bar under the value
    active?: boolean; // highlight when used as a filter
    className?: string;
}

const tones: Record<StatTone, { tile: string; bar: string; ring: string }> = {
    primary: { tile: 'bg-brand/10 text-brand dark:bg-brand-500/15 dark:text-brand-300', bar: 'bg-brand', ring: 'ring-brand/30' },
    success: { tile: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300', bar: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
    warning: { tile: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300', bar: 'bg-amber-500', ring: 'ring-amber-500/30' },
    danger: { tile: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300', bar: 'bg-rose-500', ring: 'ring-rose-500/30' },
    info: { tile: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300', bar: 'bg-sky-500', ring: 'ring-sky-500/30' },
    purple: { tile: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300', bar: 'bg-purple-500', ring: 'ring-purple-500/30' },
    slate: { tile: 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300', bar: 'bg-slate-500', ring: 'ring-slate-500/30' },
};

const trendCls = { up: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300', down: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-300', flat: 'text-slate-500 bg-slate-100 dark:bg-slate-700/40 dark:text-slate-300' };

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, tone = 'primary', hint, trend, loading, onClick, to, progress, active, className = '' }) => {
    const t = tones[tone];
    const Tag: any = to ? Link : onClick ? 'button' : 'div';
    const interactive = !!(onClick || to);
    return (
        <Tag
            {...(to ? { to } : { type: onClick ? 'button' : undefined })}
            onClick={onClick}
            className={`group relative w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] transition-all duration-200 dark:border-slate-800/90 dark:bg-[#0e1726] sm:p-5 ${
                interactive ? 'block cursor-pointer hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20' : ''
            } ${active ? `ring-2 ${t.ring}` : ''} ${className}`}
        >
            <span className={`absolute inset-y-0 left-0 w-1 ${t.bar} opacity-80`} />
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
                    {loading ? (
                        <div className="mt-2 h-7 w-20 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
                    ) : (
                        <p className="mt-1.5 truncate text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">{value}</p>
                    )}
                    {typeof progress === 'number' && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${t.bar} transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
                        </div>
                    )}
                    {(hint || trend) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {trend && (
                                <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${trendCls[trend.direction || 'flat']}`}>
                                    {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '•'} {trend.value}
                                </span>
                            )}
                            {hint && <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{hint}</span>}
                        </div>
                    )}
                </div>
                {icon && <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 [&>svg]:h-5 [&>svg]:w-5 ${t.tile}`}>{icon}</span>}
            </div>
        </Tag>
    );
};

export interface StatGridProps {
    cols?: 2 | 3 | 4 | 5;
    className?: string;
    children: React.ReactNode;
}

const gridCols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4', 5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' };

export const StatGrid: React.FC<StatGridProps> = ({ cols = 4, className = '', children }) => <div className={`mb-6 grid grid-cols-1 gap-4 ${gridCols[cols]} ${className}`}>{children}</div>;

export default StatCard;
