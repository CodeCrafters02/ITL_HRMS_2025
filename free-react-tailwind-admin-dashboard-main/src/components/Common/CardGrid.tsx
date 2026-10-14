import React, { useEffect, useState } from 'react';
import Pagination from './Pagination';
import IconSearch from '../Icon/IconSearch';
import IconRefresh from '../Icon/IconRefresh';

export interface CardGridProps<T = any> {
    items: T[];
    renderCard: (item: T, index: number) => React.ReactNode;
    rowKey?: (item: T, index: number) => string | number;

    // Backend pagination (rows are shown exactly as returned for this page)
    page: number;
    pageSize: number;
    totalCount: number;
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;

    // Backend search
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    showSearch?: boolean;

    // States
    loading?: boolean;
    emptyMessage?: string;
    emptySubtitle?: string;
    emptyIcon?: React.ReactNode;

    // Toolbar slots
    title?: React.ReactNode;
    subtitle?: string;
    actions?: React.ReactNode;
    filters?: React.ReactNode;
    onRefresh?: () => void | Promise<void>;

    // Layout
    cols?: 1 | 2 | 3 | 4;
    entityLabel?: string;
    className?: string;
    gridClassName?: string;
}

const colClass = { 1: 'grid-cols-1', 2: 'grid-cols-1 md:grid-cols-2', 3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3', 4: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' };

/** Card-based list with the same toolbar + backend pagination contract as DataTable. */
export function CardGrid<T = any>({
    items,
    renderCard,
    rowKey,
    page,
    pageSize,
    totalCount,
    pageSizeOptions = [6, 9, 12, 24, 48],
    onPageChange,
    onPageSizeChange,
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Search…',
    showSearch = true,
    loading = false,
    emptyMessage = 'No records found',
    emptySubtitle = 'Try adjusting your search or filters.',
    emptyIcon,
    title,
    subtitle,
    actions,
    filters,
    onRefresh,
    cols = 3,
    entityLabel = 'entries',
    className = '',
    gridClassName = '',
}: CardGridProps<T>) {
    const [local, setLocal] = useState(searchValue ?? '');
    useEffect(() => {
        if (searchValue !== undefined) setLocal(searchValue);
    }, [searchValue]);

    const onInput = (v: string) => {
        setLocal(v);
        onSearchChange?.(v);
    };

    const initialLoad = loading && items.length === 0;

    return (
        <div className={`relative isolate z-0 w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] dark:border-slate-800/90 dark:bg-[#0e1726] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] ${className}`}>
            <div className="h-1 w-full bg-gradient-to-r from-brand via-brand-mid to-brand-accent" />

            {(title || actions || onRefresh) && (
                <div className="flex flex-col justify-between gap-3.5 border-b border-slate-200/80 px-5 py-4 dark:border-slate-800/80 sm:flex-row sm:items-center sm:px-6">
                    {title ? (
                        <div className="min-w-0">
                            <h3 className="flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">
                                <span className="h-2 w-2 rounded-full bg-brand ring-4 ring-brand-500/20 dark:bg-brand-400" />
                                <span>{title}</span>
                            </h3>
                            {subtitle && <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
                        </div>
                    ) : (
                        <div />
                    )}
                    <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
                        {actions}
                        {onRefresh && (
                            <button
                                type="button"
                                onClick={() => onRefresh()}
                                title="Refresh data"
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-xs transition-all hover:bg-brand-50 hover:text-brand active:scale-95 dark:border-slate-700/80 dark:bg-[#121e32] dark:text-slate-400 dark:hover:bg-brand-950/40 dark:hover:text-brand-400"
                            >
                                <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin text-brand' : ''}`} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {(showSearch || filters) && (
                <div className="flex flex-col justify-between gap-3 border-b border-slate-200/70 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800/80 dark:bg-[#0b1320]/60 sm:px-6 md:flex-row md:items-center">
                    {showSearch && (
                        <div className="group relative w-full flex-shrink-0 md:w-80">
                            <input
                                type="text"
                                value={local}
                                onChange={(e) => onInput(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="form-input h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs font-medium text-slate-800 shadow-xs transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 dark:border-slate-700/80 dark:bg-[#121e32] dark:text-slate-100 sm:text-sm"
                            />
                            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand">
                                <IconSearch className="h-4 w-4" />
                            </span>
                            {local && (
                                <button type="button" onClick={() => onInput('')} title="Clear search" className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600">
                                    ✕
                                </button>
                            )}
                        </div>
                    )}
                    {filters && <div className="flex w-full flex-wrap items-center justify-start gap-2.5 md:ml-auto md:w-auto md:justify-end">{filters}</div>}
                </div>
            )}

            <div className={`relative min-h-[180px] p-5 sm:p-6 ${loading && !initialLoad ? 'opacity-60 transition-opacity' : ''}`}>
                {loading && !initialLoad && <div className="absolute left-0 right-0 top-0 h-0.5 animate-pulse bg-brand" />}

                {initialLoad ? (
                    <div className={`grid gap-5 ${colClass[cols]} ${gridClassName}`}>
                        {Array.from({ length: Math.min(pageSize, cols * 2) }).map((_, i) => (
                            <div key={i} className="h-44 animate-pulse rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-100 to-slate-50 dark:border-slate-800 dark:from-slate-800/60 dark:to-slate-900/40" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center py-12 text-center">
                        <div className="mb-3.5 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50 to-brand-100/70 text-brand shadow-sm dark:border-brand-900/40 dark:from-brand-950/40 dark:to-brand-950/30 dark:text-brand-400">
                            {emptyIcon || (
                                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm4 4h8M8 14h5" />
                                </svg>
                            )}
                        </div>
                        <h4 className="mb-1 text-base font-bold text-slate-900 dark:text-white">{emptyMessage}</h4>
                        <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm">{emptySubtitle}</p>
                        {local && (
                            <button type="button" onClick={() => onInput('')} className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand shadow-xs transition-colors hover:bg-brand-100 dark:border-brand-900/60 dark:bg-brand-950/40 dark:text-brand-400">
                                Clear Search Query
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={`grid gap-5 ${colClass[cols]} ${gridClassName}`}>
                        {items.map((item, i) => (
                            <React.Fragment key={rowKey ? rowKey(item, i) : (item as any)?.id ?? i}>{renderCard(item, i)}</React.Fragment>
                        ))}
                    </div>
                )}
            </div>

            <Pagination page={page} pageSize={pageSize} totalCount={totalCount} pageSizeOptions={pageSizeOptions} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} entityLabel={entityLabel} loading={loading} />
        </div>
    );
}

export default CardGrid;
