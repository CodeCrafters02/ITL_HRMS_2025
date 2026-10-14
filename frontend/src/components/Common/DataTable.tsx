import React, { useMemo, useState, useEffect } from 'react';
import IconSearch from '../Icon/IconSearch';
import IconRefresh from '../Icon/IconRefresh';

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

    // Calculate effective counts
    const isServerPaginated = (totalCount !== undefined && onPageChange !== undefined) || onSearchChange !== undefined;
    const effectiveTotalCount = totalCount !== undefined ? totalCount : data.length;
    const totalPages = Math.max(1, Math.ceil(effectiveTotalCount / pageSize));
    const effectivePage = Math.min(Math.max(1, page), totalPages);

    // Data resolution: strictly display backend data when server callbacks or totalCount are used
    const displayData = useMemo(() => {
        // If server pagination, server search, or totalCount is provided, data is strictly backend-driven
        if (isServerPaginated) {
            return data || [];
        }
        // Fallback for purely static, client-only tables with no backend handlers
        let filtered = data || [];
        if (localSearch.trim()) {
            const query = localSearch.toLowerCase();
            filtered = (data || []).filter((row: any) =>
                Object.values(row).some((val) =>
                    String(val ?? '').toLowerCase().includes(query)
                )
            );
        }
        const start = (effectivePage - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [data, isServerPaginated, localSearch, effectivePage, pageSize]);

    // Page range calculation
    const fromRecord = effectiveTotalCount === 0 ? 0 : (effectivePage - 1) * pageSize + 1;
    const toRecord = Math.min(effectivePage * pageSize, effectiveTotalCount);

    // Windowed pagination: 1 … (p-1) p (p+1) … N
    const paginationItems = useMemo(() => {
        const items: (number | 'ellipsis-left' | 'ellipsis-right')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) items.push(i);
            return items;
        }
        const start = Math.max(2, effectivePage - 1);
        const end = Math.min(totalPages - 1, effectivePage + 1);
        items.push(1);
        if (start > 2) items.push('ellipsis-left');
        for (let i = start; i <= end; i++) items.push(i);
        if (end < totalPages - 1) items.push('ellipsis-right');
        items.push(totalPages);
        return items;
    }, [totalPages, effectivePage]);

    // Backend-driven: if the current page no longer exists (e.g. last row deleted), step back
    useEffect(() => {
        if (!loading && totalCount !== undefined && onPageChange && page > totalPages) {
            onPageChange(totalPages);
        }
    }, [loading, totalCount, page, totalPages]);

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
            className={`w-full rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0e1726] shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-200 ${className}`}
        >
            {/* Innovyx Signature Brand Accent Bar */}
            <div className="h-1 w-full bg-gradient-to-r from-[#0062E0] via-[#2563eb] to-[#38bdf8]" />

            {/* Top Header Row: Title & Primary Actions */}
            {(title || activeActions || onRefresh) && (
                <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0e1726] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    {/* Left: Title / Subtitle */}
                    {title ? (
                        <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                                <span className="h-2 w-2 rounded-full bg-[#0062E0] dark:bg-blue-400 ring-4 ring-blue-500/20" />
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
                                className="h-9.5 w-9.5 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-[#0062E0] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#121e32] transition-all duration-150 shadow-xs hover:shadow-sm active:scale-95"
                                title="Refresh data"
                            >
                                <IconRefresh
                                    className={`w-4 h-4 transition-transform ${
                                        loading ? 'animate-spin text-[#0062E0] dark:text-blue-400' : ''
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
                                className="form-input text-xs sm:text-sm pl-10 pr-9 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#121e32] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium shadow-xs transition-all duration-200 focus:outline-none focus:border-[#0062E0] focus:ring-4 focus:ring-[#0062E0]/15 hover:border-slate-300 dark:hover:border-slate-600"
                                placeholder={searchPlaceholder}
                                value={localSearch}
                                onChange={(e) => handleSearchInput(e.target.value)}
                            />
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0062E0] dark:group-focus-within:text-blue-400 transition-colors pointer-events-none">
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
                    <div className="absolute top-0 left-0 right-0 h-0.5 z-20 overflow-hidden bg-blue-100 dark:bg-blue-950">
                        <div className="h-full w-1/3 bg-[#0062E0] animate-[pulse_1s_ease-in-out_infinite]" />
                    </div>
                )}
                <table className={`w-full border-collapse ${bordered ? 'border-y border-slate-200 dark:border-slate-800' : ''}`}>
                    {/* Table Header */}
                    <thead>
                        <tr
                            className={`border-b-2 border-blue-200/90 dark:border-blue-900/60 !bg-[#eaf2fd] dark:!bg-[#0d1d36] ${
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
                                        className={`py-3.5 px-4 sm:px-5 font-bold text-[11px] sm:text-xs uppercase tracking-wider text-blue-950 dark:text-blue-200 !bg-[#eaf2fd] dark:!bg-[#0d1d36] select-none transition-colors ${alignClass} ${hideClass(col.hideBelow)} ${col.sticky ? 'sticky left-0 z-20' : ''} ${
                                            col.sortable
                                                ? 'cursor-pointer hover:text-[#0062E0] dark:hover:text-blue-300 hover:!bg-[#dce9fc] dark:hover:!bg-[#122849] group'
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
                                                                className="w-3.5 h-3.5 text-[#0062E0] dark:text-blue-400"
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
                                                                className="w-3.5 h-3.5 text-[#0062E0] dark:text-blue-400"
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
                                                            className="w-3.5 h-3.5 text-blue-300 dark:text-blue-700/80 group-hover:text-blue-500"
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
                                            className={`transition-all duration-150 hover:!bg-blue-50/40 dark:hover:!bg-[#132247]/30 ${loading ? 'opacity-50 pointer-events-none' : ''} ${
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
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100/70 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center text-[#0062E0] dark:text-blue-400 mb-3.5 shadow-sm">
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
                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 text-[#0062E0] dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-xs"
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

            {/* Pagination & Footer Controls */}
            {effectiveTotalCount > 0 && (
                <div className="px-5 py-4 sm:px-6 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0b1320]/60 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-3.5 text-xs">
                    {/* Left: Entries Info & Page Size */}
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 flex-wrap justify-center sm:justify-start">
                        <span>
                            Showing <span className="font-semibold text-slate-900 dark:text-white">{fromRecord}</span> to{' '}
                            <span className="font-semibold text-slate-900 dark:text-white">{toRecord}</span> of{' '}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#0062E0] dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50">
                                {effectiveTotalCount}
                            </span> {entityLabel}
                        </span>

                        {onPageSizeChange && (
                            <div className="flex items-center gap-1.5 ml-1 sm:ml-2 pl-2 sm:border-l border-slate-200 dark:border-slate-700">
                                <span className="text-slate-500 dark:text-slate-400">Show</span>
                                <select
                                    className="form-select text-xs py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121e32] text-slate-700 dark:text-slate-200 font-semibold shadow-xs focus:border-[#0062E0] focus:ring-2 focus:ring-[#0062E0]/20 transition-all cursor-pointer"
                                    value={pageSize}
                                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                                >
                                    {pageSizeOptions.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-slate-500 dark:text-slate-400">per page</span>
                            </div>
                        )}
                    </div>

                    {/* Right: Page Navigation Buttons */}
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                            {/* Previous Button */}
                            <button
                                type="button"
                                onClick={() => onPageChange && onPageChange(effectivePage - 1)}
                                disabled={effectivePage <= 1}
                                className="h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#121e32] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0062E0] dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-900/60 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-[#121e32] disabled:hover:border-slate-200 transition-all font-semibold text-xs flex items-center gap-1.5 shadow-xs"
                                title="Previous page"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                        fillRule="evenodd"
                                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span>Prev</span>
                            </button>

                            {/* Page Numbers */}
                            <div className="hidden sm:flex items-center gap-1.5">
                                {paginationItems.map((item) => {
                                    if (item === 'ellipsis-left') {
                                        const prevJump = Math.max(1, effectivePage - 3);
                                        return (
                                            <button
                                                key="ellipsis-left"
                                                type="button"
                                                onClick={() => onPageChange && onPageChange(prevJump)}
                                                className="min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#121e32] text-slate-500 hover:text-[#0062E0] dark:hover:text-blue-400 hover:bg-blue-50/50 hover:border-blue-200 dark:hover:bg-slate-800 transition-all select-none shadow-xs"
                                                title={`Jump to page ${prevJump}`}
                                            >
                                                …
                                            </button>
                                        );
                                    }

                                    if (item === 'ellipsis-right') {
                                        const nextJump = Math.min(totalPages, effectivePage + 3);
                                        return (
                                            <button
                                                key="ellipsis-right"
                                                type="button"
                                                onClick={() => onPageChange && onPageChange(nextJump)}
                                                className="min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#121e32] text-slate-500 hover:text-[#0062E0] dark:hover:text-blue-400 hover:bg-blue-50/50 hover:border-blue-200 dark:hover:bg-slate-800 transition-all select-none shadow-xs"
                                                title={`Jump to page ${nextJump}`}
                                            >
                                                …
                                            </button>
                                        );
                                    }

                                    const isCurrent = item === effectivePage;
                                    return (
                                        <button
                                            key={`page-${item}`}
                                            type="button"
                                            onClick={() => onPageChange && onPageChange(item as number)}
                                            className={`min-w-[34px] h-8 px-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                                                isCurrent
                                                    ? 'bg-gradient-to-r from-[#0062E0] to-[#1d4ed8] text-white shadow-md shadow-[#0062E0]/25 ring-2 ring-[#0062E0]/20 scale-105'
                                                    : 'border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#121e32] text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-800 hover:text-[#0062E0] dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 shadow-xs'
                                            }`}
                                        >
                                            {item}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Mobile Page indicator */}
                            <span className="sm:hidden px-2 text-xs font-bold text-[#0062E0] dark:text-blue-400">
                                {effectivePage} / {totalPages}
                            </span>

                            {/* Next Button */}
                            <button
                                type="button"
                                onClick={() => onPageChange && onPageChange(effectivePage + 1)}
                                disabled={effectivePage >= totalPages}
                                className="h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#121e32] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0062E0] dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-900/60 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-[#121e32] disabled:hover:border-slate-200 transition-all font-semibold text-xs flex items-center gap-1.5 shadow-xs"
                                title="Next page"
                            >
                                <span>Next</span>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                        fillRule="evenodd"
                                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default DataTable;
