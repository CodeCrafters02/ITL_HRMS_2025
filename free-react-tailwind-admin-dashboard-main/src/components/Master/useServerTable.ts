import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, ApiError, QueryParams } from './api';

interface Options {
    /** API path of a paginated DRF list endpoint, e.g. `/app/usermanagement/` */
    endpoint: string;
    pageSize?: number;
    filters?: Record<string, string>;
    ordering?: string;
    /** Extra query params always sent with the request */
    params?: QueryParams;
}

const SEARCH_DEBOUNCE_MS = 400;

/**
 * State for a list whose search, filters, sorting and pagination are all done by the backend.
 * Every change sends a new request; nothing is filtered or sliced in the browser.
 */
export function useServerTable<T = any>({ endpoint, pageSize: initialPageSize = 10, filters: initialFilters = {}, ordering: initialOrdering = '', params }: Options) {
    const [rows, setRows] = useState<T[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [page, setPage] = useState(1);
    const [pageSize, setPageSizeState] = useState(initialPageSize);
    const [search, setSearchState] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
    const [ordering, setOrderingState] = useState(initialOrdering);
    const [reloadKey, setReloadKey] = useState(0);

    const initial = useRef({ filters: initialFilters, ordering: initialOrdering });
    const extraParams = useRef(params);
    extraParams.current = params;

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError('');
        apiRequest<any>(endpoint, {
            signal: controller.signal,
            params: { ...extraParams.current, ...filters, page, page_size: pageSize, search: debouncedSearch, ordering },
        })
            .then((data) => {
                const list = Array.isArray(data) ? data : data?.results || [];
                setRows(list);
                setTotal(Array.isArray(data) ? data.length : data?.count ?? list.length);
                setLoading(false);
            })
            .catch((err) => {
                if (err?.name === 'AbortError') return;
                // The last row of the last page was removed: step back instead of showing an error
                if (err instanceof ApiError && err.status === 404 && page > 1) {
                    setPage((current) => Math.max(1, current - 1));
                    return;
                }
                setRows([]);
                setTotal(0);
                setError(err?.message || 'Failed to load data.');
                setLoading(false);
            });
        return () => controller.abort();
    }, [endpoint, page, pageSize, debouncedSearch, filters, ordering, reloadKey]);

    const setSearch = useCallback((value: string) => {
        setSearchState(value);
        setPage(1);
    }, []);

    const setFilter = useCallback((key: string, value: string) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setPage(1);
    }, []);

    const setPageSize = useCallback((value: number) => {
        setPageSizeState(value);
        setPage(1);
    }, []);

    const setOrdering = useCallback((value: string) => {
        setOrderingState(value);
        setPage(1);
    }, []);

    const reset = useCallback(() => {
        setSearchState('');
        setDebouncedSearch('');
        setFilters(initial.current.filters);
        setOrderingState(initial.current.ordering);
        setPage(1);
    }, []);

    const reload = useCallback(() => setReloadKey((key) => key + 1), []);

    const hasActiveFilters = !!search || Object.entries(filters).some(([key, value]) => value !== (initial.current.filters[key] ?? ''));

    return { rows, total, loading, error, page, pageSize, search, filters, ordering, setPage, setPageSize, setSearch, setFilter, setOrdering, reset, reload, hasActiveFilters };
}
