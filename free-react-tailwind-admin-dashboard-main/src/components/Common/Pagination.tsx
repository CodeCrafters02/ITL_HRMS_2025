import React, { useEffect, useMemo } from 'react';

export interface PaginationProps {
    page: number;
    pageSize: number;
    totalCount: number; // total rows on the SERVER for the current search/filters
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    entityLabel?: string;
    loading?: boolean;
    className?: string;
}

const navBtn =
    'h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#121e32] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-brand dark:hover:text-brand-400 hover:border-brand-200 dark:hover:border-brand-900/60 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-[#121e32] disabled:hover:border-slate-200 transition-all font-semibold text-xs flex items-center gap-1.5 shadow-xs';

const pageBtn = 'min-w-[34px] h-8 px-2.5 rounded-xl text-xs font-bold transition-all duration-150';

/** Backend-driven pager: shows ‹ Prev  … 4 5 6 …  Next ›. It never slices data; it only reports the requested page. */
export const Pagination: React.FC<PaginationProps> = ({ page, pageSize, totalCount, pageSizeOptions = [10, 25, 50, 100], onPageChange, onPageSizeChange, entityLabel = 'entries', loading, className = '' }) => {
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const current = Math.min(Math.max(1, page), totalPages);
    const from = totalCount === 0 ? 0 : (current - 1) * pageSize + 1;
    const to = Math.min(current * pageSize, totalCount);

    // If the current page no longer exists on the server (e.g. last row deleted), step back
    useEffect(() => {
        if (!loading && page > totalPages) onPageChange(totalPages);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, page, totalPages]);

    const items = useMemo(() => {
        const out: (number | 'left' | 'right')[] = [];
        const start = Math.max(1, Math.min(current - 1, totalPages - 2));
        const end = Math.min(totalPages, start + 2);
        if (start > 1) out.push('left');
        for (let i = start; i <= end; i++) out.push(i);
        if (end < totalPages) out.push('right');
        return out;
    }, [current, totalPages]);

    if (totalCount <= 0) return null;

    return (
        <div className={`flex flex-col items-center justify-between gap-3.5 border-t border-slate-200/80 bg-slate-50/70 px-5 py-4 text-xs backdrop-blur-sm dark:border-slate-800/80 dark:bg-[#0b1320]/60 sm:flex-row sm:px-6 ${className}`}>
            <div className="flex flex-wrap items-center justify-center gap-3 text-slate-600 dark:text-slate-400 sm:justify-start">
                <span>
                    Showing <span className="font-semibold text-slate-900 dark:text-white">{from}</span> to <span className="font-semibold text-slate-900 dark:text-white">{to}</span> of{' '}
                    <span className="inline-flex items-center rounded-full border border-brand-200/60 bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand dark:border-brand-900/50 dark:bg-brand-950/60 dark:text-brand-400">{totalCount}</span> {entityLabel}
                </span>

                {onPageSizeChange && (
                    <div className="ml-1 flex items-center gap-1.5 border-slate-200 pl-2 dark:border-slate-700 sm:ml-2 sm:border-l">
                        <span className="text-slate-500 dark:text-slate-400">Show</span>
                        <select
                            className="form-select cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-[#121e32] dark:text-slate-200"
                            value={pageSize}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        >
                            {Array.from(new Set([...pageSizeOptions, pageSize])).sort((a, b) => a - b).map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                        <span className="text-slate-500 dark:text-slate-400">per page</span>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => onPageChange(current - 1)} disabled={current <= 1} className={navBtn} title="Previous page">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Prev</span>
                    </button>

                    <div className="hidden items-center gap-1.5 sm:flex">
                        {items.map((it) =>
                            it === 'left' || it === 'right' ? (
                                <button
                                    key={it}
                                    type="button"
                                    title={it === 'left' ? 'Back 2 pages' : 'Forward 2 pages'}
                                    onClick={() => onPageChange(it === 'left' ? Math.max(1, current - 2) : Math.min(totalPages, current + 2))}
                                    className={`${pageBtn} border border-slate-200 bg-white text-slate-500 shadow-xs hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand dark:border-slate-700/80 dark:bg-[#121e32] dark:hover:bg-slate-800 dark:hover:text-brand-400`}
                                >
                                    …
                                </button>
                            ) : (
                                <button
                                    key={it}
                                    type="button"
                                    onClick={() => onPageChange(it)}
                                    aria-current={it === current ? 'page' : undefined}
                                    className={`${pageBtn} ${
                                        it === current
                                            ? 'scale-105 bg-gradient-to-r from-brand to-brand-dark text-white shadow-md shadow-brand/25 ring-2 ring-brand/20'
                                            : 'border border-slate-200 bg-white text-slate-600 shadow-xs hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand dark:border-slate-700/80 dark:bg-[#121e32] dark:text-slate-300 dark:hover:border-brand-800 dark:hover:bg-slate-800 dark:hover:text-brand-400'
                                    }`}
                                >
                                    {it}
                                </button>
                            )
                        )}
                    </div>

                    <span className="px-2 text-xs font-bold text-brand dark:text-brand-400 sm:hidden">
                        {current} / {totalPages}
                    </span>

                    <button type="button" onClick={() => onPageChange(current + 1)} disabled={current >= totalPages} className={navBtn} title="Next page">
                        <span>Next</span>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default Pagination;
