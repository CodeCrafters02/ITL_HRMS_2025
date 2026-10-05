import { ReactNode } from 'react';
import { EmptyState } from './Bits';

export interface Column<T> {
    key: string;
    header: string;
    render: (row: T) => ReactNode;
    /** Backend ordering field. When set, the header becomes a sort toggle. */
    sortKey?: string;
    align?: 'left' | 'center' | 'right';
    className?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T) => string | number;
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
    /** Current backend ordering, e.g. `name` or `-name` */
    ordering?: string;
    onOrderingChange?: (ordering: string) => void;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyIcon?: ReactNode;
    emptyAction?: ReactNode;
    skeletonRows?: number;
    /** Renders the pagination bar under the table. Page changes are requested from the server. */
    pagination?: PaginationProps;
}

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' };

const SortIcon = ({ state }: { state: 'asc' | 'desc' | 'none' }) => (
    <svg className="h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <path d="M6 1.5 9.5 5h-7L6 1.5Z" opacity={state === 'asc' ? 1 : 0.3} />
        <path d="M6 10.5 2.5 7h7L6 10.5Z" opacity={state === 'desc' ? 1 : 0.3} />
    </svg>
);

/** Table with built-in pagination. Sorting and paging only report what was requested; the data itself comes from the server. */
export function DataTable<T>({
    columns,
    rows,
    rowKey,
    loading,
    error,
    onRetry,
    ordering = '',
    onOrderingChange,
    emptyTitle = 'Nothing to show',
    emptyDescription,
    emptyIcon,
    emptyAction,
    skeletonRows = 6,
    pagination,
}: DataTableProps<T>) {
    const sortState = (sortKey: string) => (ordering === sortKey ? 'asc' : ordering === `-${sortKey}` ? 'desc' : 'none');
    const toggleSort = (sortKey: string) => {
        const state = sortState(sortKey);
        onOrderingChange?.(state === 'none' ? sortKey : state === 'asc' ? `-${sortKey}` : '');
    };

    if (error) {
        return (
            <EmptyState
                title="Could not load this list"
                description={error}
                action={
                    onRetry && (
                        <button type="button" className="btn btn-outline-primary btn-sm" onClick={onRetry}>
                            Try again
                        </button>
                    )
                }
            />
        );
    }

    if (!loading && rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} action={emptyAction} />;

    const showSkeleton = loading && rows.length === 0;

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-white/5 dark:bg-white/[0.02]">
                            {columns.map((column) => {
                                const state = column.sortKey ? sortState(column.sortKey) : 'none';
                                return (
                                    <th
                                        key={column.key}
                                        scope="col"
                                        aria-sort={state === 'asc' ? 'ascending' : state === 'desc' ? 'descending' : undefined}
                                        className={`whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${ALIGN[column.align || 'left']}`}
                                    >
                                        {column.sortKey && onOrderingChange ? (
                                            <button
                                                type="button"
                                                className={`inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-primary ${state !== 'none' ? 'text-primary' : ''}`}
                                                onClick={() => toggleSort(column.sortKey!)}
                                            >
                                                {column.header}
                                                <SortIcon state={state} />
                                            </button>
                                        ) : (
                                            column.header
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className={`divide-y divide-slate-100 dark:divide-white/5 ${loading && !showSkeleton ? 'opacity-50 transition-opacity' : ''}`}>
                        {showSkeleton
                            ? Array.from({ length: skeletonRows }).map((_, index) => (
                                  <tr key={index}>
                                      {columns.map((column) => (
                                          <td key={column.key} className="px-5 py-4">
                                              <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-white/5" style={{ width: `${55 + ((index + column.key.length) % 4) * 12}%` }} />
                                          </td>
                                      ))}
                                  </tr>
                              ))
                            : rows.map((row) => (
                                  <tr key={rowKey(row)} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                                      {columns.map((column) => (
                                          <td key={column.key} className={`px-5 py-3.5 align-middle text-slate-700 dark:text-slate-300 ${ALIGN[column.align || 'left']} ${column.className || ''}`}>
                                              {column.render(row)}
                                          </td>
                                      ))}
                                  </tr>
                              ))}
                    </tbody>
                </table>
            </div>
            {pagination && <Pagination {...pagination} />}
        </>
    );
}

interface PaginationProps {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageSizeOptions?: number[];
    /** Plural noun for the count text, e.g. "users" */
    noun?: string;
}

const WINDOW_SIZE = 3;

/** Sliding window of page numbers around the current page: … 4 5 6 … */
const pageWindow = (page: number, totalPages: number) => {
    const start = Math.max(1, Math.min(page - Math.floor(WINDOW_SIZE / 2), totalPages - WINDOW_SIZE + 1));
    const end = Math.min(totalPages, start + WINDOW_SIZE - 1);
    return { start, end, pages: Array.from({ length: end - start + 1 }, (_, index) => start + index) };
};

const IDLE_PAGE = 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5';

const PAGE_BUTTON = 'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40';

export const Pagination = ({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions = [10, 20, 50, 100], noun = 'results' }: PaginationProps) => {
    if (total === 0) return null;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    const windowed = pageWindow(page, totalPages);

    return (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3.5 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                    Showing <span className="font-semibold text-slate-900 dark:text-white">{from}</span>–<span className="font-semibold text-slate-900 dark:text-white">{to}</span> of{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">{total}</span> {noun}
                </span>
                <label className="flex items-center gap-2">
                    Rows per page
                    <select className="form-select h-8 w-[4.5rem] rounded-lg py-0 text-xs font-semibold" value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
                        {pageSizeOptions.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <nav className="flex items-center gap-1" aria-label="Pagination">
                <button
                    type="button"
                    className={`${PAGE_BUTTON} text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5`}
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                >
                    Previous
                </button>
                {windowed.start > 1 && (
                    <button type="button" className={`${PAGE_BUTTON} ${IDLE_PAGE}`} title="Earlier pages" aria-label="Earlier pages" onClick={() => onPageChange(Math.max(1, page - WINDOW_SIZE))}>
                        …
                    </button>
                )}
                {windowed.pages.map((item) => (
                    <button key={item} type="button" aria-current={item === page ? 'page' : undefined} className={`${PAGE_BUTTON} ${item === page ? 'bg-primary text-white shadow-sm' : IDLE_PAGE}`} onClick={() => onPageChange(item)}>
                        {item}
                    </button>
                ))}
                {windowed.end < totalPages && (
                    <button type="button" className={`${PAGE_BUTTON} ${IDLE_PAGE}`} title="Later pages" aria-label="Later pages" onClick={() => onPageChange(Math.min(totalPages, page + WINDOW_SIZE))}>
                        …
                    </button>
                )}
                <button
                    type="button"
                    className={`${PAGE_BUTTON} text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5`}
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                >
                    Next
                </button>
            </nav>
        </div>
    );
};
