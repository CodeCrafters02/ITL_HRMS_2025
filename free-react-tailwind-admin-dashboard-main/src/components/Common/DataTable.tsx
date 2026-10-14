import React, { useMemo, useState, useEffect } from 'react';
import IconSearch from '../Icon/IconSearch';
import IconRefresh from '../Icon/IconRefresh';
import Pagination from './Pagination';

export interface Column<T = any> {
    key: string;
    header?: string | React.ReactNode;
    title?: string | React.ReactNode; // Alias for header
    label?: string | React.ReactNode; // Alias for header
    accessor?: keyof T | ((row: T, index: number) => React.ReactNode);
    render?: (value: any, row: T, index: number) => React.ReactNode;
    className?: string;
    headerClassName?: string;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
    width?: string;
    sticky?: boolean; // pin column to the left while scrolling horizontally
    hideBelow?: 'sm' | 'md' | 'lg' | 'xl'; // hide column on smaller viewports
}

export interface DataTableProps<T = any> {
    // Columns & Data
    columns: Column<T>[];
    data: T[];
    rowKey?: (row: T, index: number) => string | number;

    // Backend Pagination
    page?: number;
    pageSize?: number;
    totalCount?: number;
    pageSizeOptions?: number[];
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;

    // Search
    search?: string;
    searchValue?: string; // Alias for search
    onSearchChange?: (search: string) => void;
    searchPlaceholder?: string;
    showSearch?: boolean;

    // Sorting
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    onSortChange?: (field: string, direction: 'asc' | 'desc') => void;

    // States
    loading?: boolean;
    emptyMessage?: string;
    emptySubtitle?: string;
    emptyIcon?: React.ReactNode;

    // Toolbar Slots
    title?: string | React.ReactNode;
    subtitle?: string;
    actions?: React.ReactNode;
    actionButton?: React.ReactNode; // Alias for actions
    filters?: React.ReactNode;
    onRefresh?: () => void | Promise<void>;

    // Styling & Callbacks
    onRowClick?: (row: T) => void;
    rowClassName?: (row: T, index: number) => string;
    renderSubRow?: (row: T, index: number) => React.ReactNode;
    className?: string;
    compact?: boolean;
    striped?: boolean;
    bordered?: boolean;
    stickyHeader?: boolean;
    maxHeight?: string; // e.g. '60vh' -> table body scrolls, header stays pinned
    entityLabel?: string; // 'entries' by default (e.g. 'employees')
}

export function DataTable<T = any>({
    columns,
    data = [],
    rowKey,
    page = 1,
    pageSize = 10,
    totalCount,
    pageSizeOptions = [10, 25, 50, 100],
    onPageChange,
    onPageSizeChange,
    search,
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Search records...',
    showSearch = true,
    sortField,
    sortDirection,
    onSortChange,
    loading = false,
    emptyMessage = 'No records found',
    emptySubtitle = 'Try adjusting your search query or filters to find what you are looking for.',
    emptyIcon,
    title,
    subtitle,
    actions,
    actionButton,
    filters,
    onRefresh,
    onRowClick,
    rowClassName,
    renderSubRow,
    className = '',
    compact = false,
    striped = false,
    bordered = false,
    stickyHeader = true,
    maxHeight,
    entityLabel = 'entries',
}: DataTableProps<T>) {
    // Resolve aliases
    const activeSearch = searchValue !== undefined ? searchValue : search;
    const activeActions = actionButton !== undefined ? actionButton : actions;

    const hideClass = (h?: Column['hideBelow']) =>
        h === 'sm' ? 'hidden sm:table-cell' : h === 'md' ? 'hidden md:table-cell' : h === 'lg' ? 'hidden lg:table-cell' : h === 'xl' ? 'hidden xl:table-cell' : '';

    // Local search state if not fully controlled from parent
    const [localSearch, setLocalSearch] = useState(activeSearch ?? '');

    useEffect(() => {
        if (activeSearch !== undefined) {
            setLocalSearch(activeSearch);
        }
    }, [activeSearch]);

    const handleSearchInput = (value: string) => {
        setLocalSearch(value);
        if (onSearchChange) {
            onSearchChange(value);
        }
    };

    // Strictly backend-driven: rows are shown exactly as the server returned them for this page/search.
    const effectiveTotalCount = totalCount !== undefined ? totalCount : data.length;
    const totalPages = Math.max(1, Math.ceil(effectiveTotalCount / pageSize));
    const effectivePage = Math.min(Math.max(1, page), totalPages);
    const displayData = data || [];

    const handleSort = (colKey: string, sortable?: boolean) => {
        if (!sortable || !onSortChange) return;
        if (sortField === colKey) {
            onSortChange(colKey, sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            onSortChange(colKey, 'asc');
        }
    };

    return (
        <div
            className={`relative isolate z-0 w-full rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0e1726] shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-200 ${className}`}
        >
            {/* Innovyx Signature Brand Accent Bar */}
            <div className="h-1 w-full bg-gradient-to-r from-brand via-brand-mid to-brand-accent" />

            {/* Top Header Row: Title & Primary Actions */}
            {(title || activeActions || onRefresh) && (
                <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0e1726] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    {/* Left: Title / Subtitle */}
                    {title ? (
                        <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                                <span className="h-2 w-2 rounded-full bg-brand dark:bg-brand-400 ring-4 ring-brand-500/20" />
                                <span>{title}</span>
                            </h3>
                            {subtitle && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal tracking-normal truncate">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div />
                    )}

                    {/* Right: Action Buttons & Refresh */}
                    <div className="flex items-center gap-2.5 sm:ml-auto flex-wrap">
                        {activeActions}

                        {onRefresh && (
                            <button
                                type="button"
                                onClick={() => onRefresh()}
                                className="h-9.5 w-9.5 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-brand dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#121e32] transition-all duration-150 shadow-xs hover:shadow-sm active:scale-95"
                                title="Refresh data"
                            >
                                <IconRefresh
                                    className={`w-4 h-4 transition-transform ${
                                        loading ? 'animate-spin text-brand dark:text-brand-400' : ''
                                    }`}
                                />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Filter & Search Toolbar Row */}
            {(showSearch || filters) && (
                <div className="px-5 py-3.5 sm:px-6 border-b border-slate-200/70 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0b1320]/60 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
                    {/* Search Input on the Left */}
                    {showSearch && (
                        <div className="relative w-full md:w-80 group flex-shrink-0">
                            <input
                                type="text"
                                className="form-input text-xs sm:text-sm pl-10 pr-9 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#121e32] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium shadow-xs transition-all duration-200 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15 hover:border-slate-300 dark:hover:border-slate-600"
                                placeholder={searchPlaceholder}
                                value={localSearch}
                                onChange={(e) => handleSearchInput(e.target.value)}
                            />
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand dark:group-focus-within:text-brand-400 transition-colors pointer-events-none">
                                <IconSearch className="w-4 h-4" />
                            </span>
                            {localSearch && (
                                <button
                                    type="button"
                                    onClick={() => handleSearchInput('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-xs transition-colors"
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    )}

                    {/* Filter Elements on the Right */}
                    {filters && (
                        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto md:ml-auto justify-start md:justify-end">
                            {filters}
                        </div>
                    )}
                </div>
            )}

            {/* Table Container */}
            <div
                style={maxHeight ? { maxHeight } : undefined}
                className={`relative w-full overflow-x-auto ${maxHeight ? 'overflow-y-auto' : ''} min-h-[160px] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent`}
            >
                {loading && displayData.length > 0 && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 z-20 overflow-hidden bg-brand-100 dark:bg-brand-950">
                        <div className="h-full w-1/3 bg-brand animate-[pulse_1s_ease-in-out_infinite]" />
                    </div>
                )}
                <table className={`w-full border-collapse ${bordered ? 'border-y border-slate-200 dark:border-slate-800' : ''}`}>
                    {/* Table Header */}
                    <thead>
                        <tr
                            className={`border-b-2 border-brand-200/90 dark:border-brand-900/60 !bg-brand-50 dark:!bg-[#0d1d36] ${
                                stickyHeader ? 'sticky top-0 z-10 backdrop-blur-sm' : ''
                            }`}
                        >
                            {columns.map((col, idx) => {
                                const alignClass =
                                    col.align === 'center'
                                        ? 'text-center'
                                        : col.align === 'right'
                                        ? 'text-right'
                                        : 'text-left';

                                return (
                                    <th
                                        key={col.key || idx}
                                        style={col.width ? { width: col.width } : undefined}
                                        className={`py-3.5 px-4 sm:px-5 font-bold text-[11px] sm:text-xs uppercase tracking-wider text-brand-950 dark:text-brand-200 !bg-brand-50 dark:!bg-[#0d1d36] select-none transition-colors ${alignClass} ${hideClass(col.hideBelow)} ${col.sticky ? 'sticky left-0 z-20' : ''} ${
                                            col.sortable
                                                ? 'cursor-pointer hover:text-brand dark:hover:text-brand-300 hover:!bg-brand-100 dark:hover:!bg-[#122849] group'
                                                : ''
                                        } ${col.headerClassName || ''}`}
                                        aria-sort={col.sortable && sortField === col.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                                        onClick={() => handleSort(col.key, col.sortable)}
                                    >
                                        <div
                                            className={`inline-flex items-center gap-2 ${
                                                col.align === 'center'
                                                    ? 'justify-center'
                                                    : col.align === 'right'
                                                    ? 'justify-end'
                                                    : 'justify-start'
                                            }`}
                                        >
                                            <span>{col.header ?? col.title ?? col.label}</span>
                                            {col.sortable && (
                                                <span className="inline-flex items-center text-xs transition-colors">
                                                    {sortField === col.key ? (
                                                        sortDirection === 'asc' ? (
                                                            <svg
                                                                className="w-3.5 h-3.5 text-brand dark:text-brand-400"
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                        ) : (
                                                            <svg
                                                                className="w-3.5 h-3.5 text-brand dark:text-brand-400"
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                        )
                                                    ) : (
                                                        <svg
                                                            className="w-3.5 h-3.5 text-brand-300 dark:text-brand-700/80 group-hover:text-brand-500"
                                                            viewBox="0 0 20 20"
                                                            fill="currentColor"
                                                        >
                                                            <path d="M5 8l5-5 5 5H5zM5 12l5 5 5-5H5z" />
                                                        </svg>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                        {loading && displayData.length === 0 ? (
                            // Skeleton loading rows
                            Array.from({ length: Math.min(pageSize, 5) }).map((_, rIdx) => (
                                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                                    {columns.map((col, cIdx) => (
                                        <td key={`skel-col-${cIdx}`} className={`py-4 px-4 sm:px-5 ${hideClass(col.hideBelow)}`}>
                                            <div
                                                className="h-3.5 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-md"
                                                style={{ width: `${Math.max(35, (cIdx * 25 + 40) % 90)}%` }}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : displayData.length > 0 ? (
                            displayData.map((row, rIdx) => {
                                const rowKeyVal = rowKey ? rowKey(row, rIdx) : (row as any)?.id ?? rIdx;
                                const customRowClass = rowClassName ? rowClassName(row, rIdx) : '';
                                const globalIndex = (effectivePage - 1) * pageSize + rIdx;
                                const subRowContent = renderSubRow ? renderSubRow(row, globalIndex) : null;

                                return (
                                    <React.Fragment key={rowKeyVal}>
                                        <tr
                                            onClick={() => onRowClick && onRowClick(row)}
                                            className={`transition-all duration-150 hover:!bg-brand-50/40 dark:hover:!bg-[#132247]/30 ${loading ? 'opacity-50 pointer-events-none' : ''} ${
                                                striped ? 'even:bg-slate-50/25 dark:even:bg-slate-900/15' : ''
                                            } ${onRowClick ? 'cursor-pointer' : ''} ${customRowClass}`}
                                        >
                                            {columns.map((col, cIdx) => {
                                                const alignClass =
                                                    col.align === 'center'
                                                        ? 'text-center'
                                                        : col.align === 'right'
                                                        ? 'text-right'
                                                        : 'text-left';

                                                let cellContent: React.ReactNode = null;
                                                const rawValue =
                                                    col.key && (row as any)[col.key] !== undefined
                                                        ? (row as any)[col.key]
                                                        : undefined;

                                                if (col.render) {
                                                    cellContent = col.render(
                                                        rawValue !== undefined ? rawValue : row,
                                                        row,
                                                        globalIndex
                                                    );
                                                } else if (typeof col.accessor === 'function') {
                                                    cellContent = col.accessor(row, globalIndex);
                                                } else if (col.accessor) {
                                                    cellContent = (row as any)[col.accessor];
                                                } else if (rawValue !== undefined) {
                                                    cellContent = rawValue;
                                                }

                                                return (
                                                    <td
                                                        key={`cell-${cIdx}`}
                                                        className={`${
                                                            compact ? 'py-2.5 px-3 sm:px-4' : 'py-3.5 px-4 sm:px-5'
                                                        } text-xs sm:text-[13px] text-slate-700 dark:text-slate-200 font-medium ${alignClass} ${hideClass(col.hideBelow)} ${
                                                            col.sticky ? 'sticky left-0 z-10 bg-white dark:bg-[#0e1726]' : ''
                                                        } ${col.className || ''}`}
                                                    >
                                                        {cellContent ?? '-'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        {subRowContent ? (
                                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
                                                <td colSpan={columns.length} className="p-4 sm:p-5 border-0">
                                                    {subRowContent}
                                                </td>
                                            </tr>
                                        ) : null}
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            // Empty State
                            <tr>
                                <td colSpan={columns.length} className="py-14 px-4 sm:px-6 text-center">
                                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100/70 dark:from-brand-950/40 dark:to-brand-950/30 border border-brand-200/60 dark:border-brand-900/40 flex items-center justify-center text-brand dark:text-brand-400 mb-3.5 shadow-sm">
                                            {emptyIcon || (
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={1.5}
                                                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                                    />
                                                </svg>
                                            )}
                                        </div>
                                        <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                                            {emptyMessage}
                                        </h4>
                                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                            {emptySubtitle}
                                        </p>
                                        {localSearch && (
                                            <button
                                                type="button"
                                                onClick={() => handleSearchInput('')}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-brand-200 dark:border-brand-900/60 bg-brand-50 dark:bg-brand-950/40 text-brand dark:text-brand-400 text-xs font-semibold hover:bg-brand-100 dark:hover:bg-brand-900/60 transition-colors shadow-xs"
                                            >
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                Clear Search Query
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination & Footer Controls (backend-driven) */}
            <Pagination
                page={page}
                pageSize={pageSize}
                totalCount={effectiveTotalCount}
                pageSizeOptions={pageSizeOptions}
                onPageChange={(p) => onPageChange && onPageChange(p)}
                onPageSizeChange={onPageSizeChange}
                entityLabel={entityLabel}
                loading={loading}
            />
        </div>
    );
}

export default DataTable;
