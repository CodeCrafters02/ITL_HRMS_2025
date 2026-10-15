import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import PageHeader from '../../components/Common/PageHeader';
import DataTable, { Column } from '../../components/Common/DataTable';
import CardGrid from '../../components/Common/CardGrid';
import Pagination from '../../components/Common/Pagination';
import Modal from '../../components/Common/Modal';
import Button, { IconButton } from '../../components/Common/Button';
import StatCard, { StatGrid } from '../../components/Common/StatCard';
import IconMicrosoft from '../../components/Icon/IconMicrosoft';
import IconRefresh from '../../components/Icon/IconRefresh';
import IconCloudDownload from '../../components/Icon/IconCloudDownload';
import IconUsers from '../../components/Icon/IconUsers';
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import IconCircleCheck from '../../components/Icon/IconCircleCheck';
import IconUserPlus from '../../components/Icon/IconUserPlus';
import IconEye from '../../components/Icon/IconEye';
import IconMail from '../../components/Icon/IconMail';
import IconMapPin from '../../components/Icon/IconMapPin';
import IconShare from '../../components/Icon/IconShare';
import IconFolder from '../../components/Icon/IconFolder';
import IconAward from '../../components/Icon/IconAward';
import IconSearch from '../../components/Icon/IconSearch';
import IconCaretDown from '../../components/Icon/IconCaretDown';
import IconChecks from '../../components/Icon/IconChecks';
import { authFetch } from '../../utils/authFetch';

const API = `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/app/microsoft-entra`;

/* ───────────────────────── types ───────────────────────── */

export interface EntraUserRecord {
    entra_id: string;
    display_name: string;
    given_name: string;
    surname: string;
    primary_email: string;
    mail: string;
    user_principal_name: string;
    job_title: string;
    department: string;
    office_location: string;
    mobile_phone: string;
    account_enabled: boolean;
    sync_status: 'synced' | 'pending_import' | 'needs_update';
    manager_id?: string | null;
    manager_name?: string | null;
    manager_email?: string | null;
    hrms_synced: boolean;
    hrms_employee_id: number | null;
    hrms_employee_code: string | null;
    hrms_department: string;
    hrms_designation: string;
    hrms_reporting_manager_name?: string | null;
    reports_count?: number;
    level?: number;
    level_name?: string;
    hrms_level?: string;
}

interface DirectoryStats {
    total_entra: number;
    synced_count: number;
    pending_count: number;
    active_count: number;
    disabled_count: number;
}

interface GroupRow {
    name: string;
    total: number;
    synced: number;
    pending: number;
    needs_update: number;
    percent: number;
    departments?: string[];
    department_count?: number;
    level?: number;
}

interface SyncDetails {
    departments: string[];
    locations: string[];
    levels: string[];
    designations: { name: string; department: string; level: string }[];
    designation_levels: { name: string; department: string; from: string; to: string }[];
    employees_new: { name: string; email: string; department: string; designation: string; level: string }[];
    employees_updated: { name: string; email: string; changes: string[] }[];
    managers: { employee: string; manager: string; from: string }[];
}

interface JobState {
    state: 'running' | 'done' | 'error';
    percent: number;
    phase: string;
    done: number;
    total: number;
    result?: SyncResult;
    error?: string;
}

interface SyncResult {
    details?: SyncDetails;
    imported_count: number;
    updated_count: number;
    skipped_count: number;
    departments_created: number;
    locations_created: number;
    levels_created: number;
    designations_created: number;
    designations_level_changed: number;
    employee_levels_changed: number;
    managers_linked: number;
    max_level: number;
    total: number;
    errors: string[];
}

interface AutoSyncState {
    enabled: boolean;
    last_sync_at: string | null;
    last_checked_at: string | null;
}

type MainTab = 'list' | 'hierarchy' | 'department' | 'role';
type StatusFilter = 'all' | 'pending' | 'synced' | 'update';
type SyncFilters = { status?: string; department?: string; designation?: string; search?: string; account?: string };

const EMPTY_STATS: DirectoryStats = { total_entra: 0, synced_count: 0, pending_count: 0, active_count: 0, disabled_count: 0 };

/* ───────────────────────── helpers ───────────────────────── */

const initialsOf = (u: Pick<EntraUserRecord, 'display_name' | 'primary_email'>) =>
    (u.display_name || u.primary_email || 'U')
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

const query = (params: Record<string, string | number | boolean | undefined | null>) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '' && v !== 'all') sp.set(k, String(v));
    });
    return sp.toString();
};

const getJson = async (qs: string, signal?: AbortSignal) => {
    const res = await authFetch(`${API}/users/?${qs}`, { signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Failed to load the Microsoft Entra directory.');
    return data;
};

/** Debounced copy of a value (keeps server calls off every keystroke). */
const useDebounced = <T,>(value: T, ms = 350) => {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
};

const Section = ({ title, count, shown, children }: { title: string; count: number; shown?: number; children: React.ReactNode }) =>
    count === 0 ? null : (
        <div className="overflow-hidden rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2">
                <h5 className="text-xs font-bold text-slate-700">{title}</h5>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-extrabold text-brand">{count}</span>
            </div>
            <ul className="max-h-52 divide-y divide-slate-100 overflow-auto text-xs">{children}</ul>
            {shown !== undefined && count > shown && <p className="border-t border-slate-100 bg-slate-50 px-3.5 py-1.5 text-[11px] font-semibold text-slate-500">+ {count - shown} more not listed</p>}
        </div>
    );

const LevelBadge = ({ name }: { name?: string }) =>
    name ? <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-extrabold text-brand">{name}</span> : null;

const Avatar = ({ user, size = 'md' }: { user: Pick<EntraUserRecord, 'display_name' | 'primary_email'>; size?: 'sm' | 'md' | 'lg' }) => (
    <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-mid font-bold text-white shadow-sm ${
            size === 'lg' ? 'h-14 w-14 text-lg' : size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-10 w-10 text-xs'
        }`}
    >
        {initialsOf(user)}
    </div>
);

const SyncBadge = ({ user, compact }: { user: Pick<EntraUserRecord, 'sync_status' | 'hrms_employee_code'>; compact?: boolean }) => {
    if (user.sync_status === 'synced') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                <IconCircleCheck className="h-3 w-3" />
                {compact ? 'Synced' : `Synced (${user.hrms_employee_code || 'Linked'})`}
            </span>
        );
    }
    if (user.sync_status === 'needs_update') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand">
                <IconRefresh className="h-3 w-3" />
                Update available
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600">
            <IconUserPlus className="h-3 w-3" />
            {compact ? 'Pending' : 'Pending import'}
        </span>
    );
};

const EntraStatus = ({ enabled }: { enabled: boolean }) => (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        {enabled ? 'Active' : 'Disabled'}
    </span>
);

/* ───────────────────────── org-chart node (lazy children) ───────────────────────── */

interface TreeNodeProps {
    node: EntraUserRecord;
    depth: number;
    expanded: Record<string, boolean>;
    cache: Record<string, EntraUserRecord[]>;
    loadingIds: Record<string, boolean>;
    onToggle: (node: EntraUserRecord) => void;
    onView: (u: EntraUserRecord) => void;
    onSync: (u: EntraUserRecord) => void;
    syncing: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = memo(({ node, depth, expanded, cache, loadingIds, onToggle, onView, onSync, syncing }) => {
    const reports = node.reports_count || 0;
    const isOpen = !!expanded[node.entra_id];
    const kids = cache[node.entra_id] || [];

    return (
        <div>
            <div className="group rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-brand/40 hover:shadow-md">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-center gap-3.5">
                        <div className="relative">
                            <Avatar user={node} size="md" />
                            {depth === 0 && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">Lead</span>}
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="truncate text-sm font-bold text-slate-900">{node.display_name}</h4>
                                <LevelBadge name={node.level_name} />
                                {node.hrms_employee_code && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand">{node.hrms_employee_code}</span>}
                                {!node.account_enabled && <EntraStatus enabled={false} />}
                            </div>
                            <p className="mt-0.5 truncate text-xs font-semibold text-brand">{node.job_title || 'No job title'}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium">{node.department || 'General'}</span>
                                <span className="flex items-center gap-1">
                                    <IconMail className="h-3 w-3" />
                                    {node.primary_email}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                        {reports > 0 && (
                            <button
                                type="button"
                                onClick={() => onToggle(node)}
                                aria-expanded={isOpen}
                                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${isOpen ? 'border-brand/25 bg-brand/10 text-brand' : 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                                <IconUsers className="h-3.5 w-3.5" />
                                {reports} {reports === 1 ? 'report' : 'reports'}
                                <IconCaretDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                        <SyncBadge user={node} compact />
                        <IconButton tone="neutral" label="View profile" onClick={() => onView(node)}>
                            <IconEye />
                        </IconButton>
                        <Button size="sm" variant={node.sync_status === 'synced' ? 'secondary' : 'primary'} leftIcon={<IconCloudDownload />} disabled={syncing} onClick={() => onSync(node)}>
                            {node.sync_status === 'synced' ? 'Re-sync' : 'Sync'}
                        </Button>
                    </div>
                </div>
            </div>

            {isOpen && reports > 0 && (
                <div className="relative ml-5 mt-3 space-y-3 border-l-2 border-brand/25 pl-5 sm:pl-8">
                    {loadingIds[node.entra_id] && kids.length === 0 ? (
                        <div className="flex items-center gap-2 py-3 text-xs font-semibold text-slate-400">
                            <IconRefresh className="h-4 w-4 animate-spin text-brand" />
                            Loading {reports} direct report{reports === 1 ? '' : 's'}…
                        </div>
                    ) : (
                        kids.map((child) => <TreeNode key={child.entra_id} node={child} depth={depth + 1} expanded={expanded} cache={cache} loadingIds={loadingIds} onToggle={onToggle} onView={onView} onSync={onSync} syncing={syncing} />)
                    )}
                </div>
            )}
        </div>
    );
});
TreeNode.displayName = 'TreeNode';

/* ───────────────────────── page ───────────────────────── */

export const MicrosoftEntraDirectory: React.FC = () => {
    const dispatch = useDispatch();
    const [tab, setTab] = useState<MainTab>('list');
    const [stats, setStats] = useState<DirectoryStats>(EMPTY_STATS);
    const [cachedAt, setCachedAt] = useState<number | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [reloadKey, setReloadKey] = useState(0); // bump to refetch whatever tab is open
    const [detailUser, setDetailUser] = useState<EntraUserRecord | null>(null);
    const [syncAllOpen, setSyncAllOpen] = useState(false);
    const [preview, setPreview] = useState<SyncResult | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [autoSync, setAutoSync] = useState<AutoSyncState | null>(null);
    const [syncStage, setSyncStage] = useState<'preview' | 'running' | 'done'>('preview');
    const [previewTab, setPreviewTab] = useState<'create' | 'edit' | 'managers'>('create');
    const [job, setJob] = useState<JobState | null>(null);
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true; // StrictMode re-runs effects: re-arm after the simulated unmount
        return () => {
            alive.current = false;
        };
    }, []);
    const [membersOf, setMembersOf] = useState<{ kind: 'department' | 'designation'; name: string } | null>(null);

    // ── list tab ──
    const [rows, setRows] = useState<EntraUserRecord[]>([]);
    const [listTotal, setListTotal] = useState(0);
    const [listLoading, setListLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<StatusFilter>('all');
    const [dept, setDept] = useState('all');
    const [account, setAccount] = useState('all');
    const [sort, setSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'display_name', dir: 'asc' });
    const [deptOptions, setDeptOptions] = useState<string[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [matching, setMatching] = useState<{ filters: SyncFilters; count: number } | null>(null);

    const debouncedSearch = useDebounced(search);
    const filtersNow: SyncFilters = useMemo(() => ({ status, department: dept === 'all' ? undefined : dept, account: account === 'all' ? undefined : account, search: debouncedSearch.trim() || undefined }), [status, dept, account, debouncedSearch]);

    const fail = (title: string, err: unknown): void => {
        Swal.fire({ icon: 'error', title, text: err instanceof Error ? err.message : 'Unable to reach Microsoft Entra ID.', customClass: { popup: 'sweet-alerts' } });
    };

    useEffect(() => {
        dispatch(setPageTitle('Microsoft Entra Directory'));
    }, [dispatch]);

    // Fetch the list page (server does search / filter / sort / paging); stale responses are aborted.
    useEffect(() => {
        if (tab !== 'list') return;
        const ctl = new AbortController();
        setListLoading(true);
        getJson(query({ view: 'list', page, page_size: pageSize, ordering: `${sort.dir === 'desc' ? '-' : ''}${sort.field}`, ...filtersNow }), ctl.signal)
            .then((d) => {
                setRows(d.results || []);
                setListTotal(d.count || 0);
                setStats(d.stats || EMPTY_STATS);
                setCachedAt(d.cached_at || null);
                setDeptOptions(d.departments || []);
                if (d.page && d.page !== page) setPage(d.page);
            })
            .catch((e) => e?.name !== 'AbortError' && fail('Directory fetch error', e))
            .finally(() => !ctl.signal.aborted && setListLoading(false));
        return () => ctl.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, page, pageSize, sort, filtersNow, reloadKey]);

    // Any filter change resets paging and clears a "select all matching" selection
    useEffect(() => {
        setPage(1);
        setMatching(null);
    }, [status, dept, account, debouncedSearch]);

    // Stats are cheap and shown on every tab; load them when another tab is open
    useEffect(() => {
        if (tab === 'list') return;
        getJson(query({ view: 'departments', page: 1, page_size: 1 }))
            .then((d) => {
                setStats(d.stats || EMPTY_STATS);
                setCachedAt(d.cached_at || null);
            })
            .catch(() => undefined);
    }, [tab, reloadKey]);

    useEffect(() => {
        authFetch(`${API}/auto-sync/`)
            .then((r) => r.json())
            .then(setAutoSync)
            .catch(() => undefined);
    }, [reloadKey]);

    const postJson = async (url: string, body: unknown) => {
        const res = await authFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || 'Request failed.');
        return data;
    };

    const toggleAutoSync = async () => {
        if (!autoSync) return;
        try {
            setAutoSync(await postJson(`${API}/auto-sync/`, { enabled: !autoSync.enabled }));
        } catch (e) {
            fail('Auto-sync', e);
        }
    };

    const openSyncAll = async () => {
        setSyncAllOpen(true);
        setSyncStage('preview');
        setPreviewTab('create');
        setJob(null);
        setSyncResult(null);
        setPreview(null);
        setPreviewLoading(true);
        try {
            setPreview(await postJson(`${API}/sync/`, { scope: 'all', dry_run: true }));
        } catch (e) {
            setSyncAllOpen(false);
            fail('Sync preview failed', e);
        } finally {
            setPreviewLoading(false);
        }
    };

    const confirmSyncAll = async () => {
        setSyncStage('running');
        setJob({ state: 'running', percent: 0, phase: 'Reading Microsoft Entra directory', done: 0, total: preview?.total || 0 });
        setSyncing(true);
        try {
            const { job_id } = await postJson(`${API}/sync/`, { scope: 'all', async: true, total: preview?.total || 0 });
            for (;;) {
                await new Promise((r) => setTimeout(r, 400));
                if (!alive.current) return;
                const res = await authFetch(`${API}/sync/status/?job=${job_id}`);
                const j: JobState = await res.json();
                if (!res.ok) throw new Error((j as unknown as { detail?: string }).detail || 'Lost track of the sync job.');
                setJob(j);
                if (j.state === 'error') throw new Error(j.error || 'Synchronization failed.');
                if (j.state === 'done') {
                    setSyncResult(j.result || null);
                    setSyncStage('done');
                    setSelected([]);
                    setMatching(null);
                    setReloadKey((k) => k + 1);
                    return;
                }
            }
        } catch (e) {
            setSyncAllOpen(false);
            fail('Sync failed', e);
        } finally {
            setSyncing(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await getJson(query({ view: 'departments', page: 1, page_size: 1, refresh: 1 }));
            setReloadKey((k) => k + 1);
        } catch (e) {
            fail('Refresh failed', e);
        } finally {
            setRefreshing(false);
        }
    };

    /** payload = specific ids or a filter set resolved on the server */
    const runSync = async (payload: { user_ids?: string[]; filters?: SyncFilters }, title: string, count: number) => {
        const ok = await Swal.fire({
            title,
            text: `This will create or update ${count} HRMS employee profile${count === 1 ? '' : 's'} (designations, departments and reporting managers) from Microsoft Entra.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, sync to HRMS',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'sweet-alerts' },
        });
        if (!ok.isConfirmed) return;
        setSyncing(true);
        try {
            const res = await authFetch(`${API}/sync/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, auto_create_meta: true }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Synchronization failed.');
            Swal.fire({
                icon: data.errors?.length ? 'warning' : 'success',
                title: 'Synchronization complete',
                html: `<b>${data.imported_count}</b> imported · <b>${data.updated_count}</b> updated · <b>${data.skipped_count || 0}</b> unchanged<br/><small>${data.departments_created || 0} departments · ${data.designations_created || 0} designations · ${data.levels_created || 0} levels created · ${data.managers_linked || 0} manager links</small>${data.errors?.length ? `<br/><small>${data.errors.length} issue(s): ${data.errors.slice(0, 2).join('; ')}</small>` : ''}`,
                customClass: { popup: 'sweet-alerts' },
            });
            setSelected([]);
            setMatching(null);
            setReloadKey((k) => k + 1);
        } catch (e) {
            fail('Sync failed', e);
        } finally {
            setSyncing(false);
        }
    };

    const syncOne = useCallback((u: EntraUserRecord) => runSync({ user_ids: [u.entra_id] }, `Sync ${u.display_name}?`, 1), []); // eslint-disable-line react-hooks/exhaustive-deps
    const syncSelected = () => (matching ? runSync({ filters: matching.filters }, `Sync ${matching.count} matching employees?`, matching.count) : runSync({ user_ids: selected }, `Sync ${selected.length} employee(s)?`, selected.length));
    const selectedCount = matching ? matching.count : selected.length;

    const selectAllMatching = async () => {
        try {
            const d = await getJson(query({ view: 'list', ids_only: 'true', ...filtersNow }));
            setMatching({ filters: filtersNow, count: d.count });
            setSelected(d.ids || []);
        } catch (e) {
            fail('Could not select all', e);
        }
    };

    const pageIds = rows.map((r) => r.entra_id);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
    const toggleOne = (id: string) => {
        setMatching(null);
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };
    const togglePage = () => {
        setMatching(null);
        setSelected((prev) => (allPageSelected ? prev.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...prev, ...pageIds]))));
    };

    const columns: Column<EntraUserRecord>[] = [
        {
            key: 'select',
            header: <input type="checkbox" className="form-checkbox rounded" aria-label="Select all on this page" checked={allPageSelected} onChange={togglePage} />,
            width: '44px',
            render: (_v, r) => <input type="checkbox" className="form-checkbox rounded" aria-label={`Select ${r.display_name}`} checked={selected.includes(r.entra_id)} onChange={() => toggleOne(r.entra_id)} />,
        },
        {
            key: 'display_name',
            title: 'Personnel',
            sortable: true,
            render: (_v, r) => (
                <div className="flex items-center gap-3">
                    <Avatar user={r} />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{r.display_name || `${r.given_name} ${r.surname}`.trim() || 'Unnamed user'}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                            <IconMail className="h-3 w-3 shrink-0" />
                            {r.primary_email}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: 'job_title',
            title: 'Role & department',
            sortable: true,
            hideBelow: 'md',
            render: (_v, r) => (
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <LevelBadge name={r.level_name} />
                        {r.job_title || <span className="italic text-slate-400">No job title</span>}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">{r.department || 'General'}</p>
                </div>
            ),
        },
        {
            key: 'manager_name',
            title: 'Reports to',
            sortable: true,
            hideBelow: 'lg',
            render: (_v, r) =>
                r.manager_name ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                        {r.manager_name}
                    </span>
                ) : (
                    <span className="text-xs italic text-slate-400">Top level</span>
                ),
        },
        {
            key: 'office_location',
            title: 'Office',
            sortable: true,
            hideBelow: 'xl',
            render: (_v, r) => (
                <span className="flex items-center gap-1.5 text-xs text-slate-600">
                    <IconMapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {r.office_location || 'Not specified'}
                </span>
            ),
        },
        { key: 'sync_status', title: 'HRMS status', sortable: true, align: 'center', render: (_v, r) => <SyncBadge user={r} /> },
        { key: 'account_enabled', title: 'Entra', sortable: true, align: 'center', hideBelow: 'lg', render: (_v, r) => <EntraStatus enabled={r.account_enabled} /> },
        {
            key: 'actions',
            title: 'Actions',
            align: 'right',
            render: (_v, r) => (
                <div className="flex items-center justify-end gap-2">
                    <IconButton tone="neutral" label="View profile" onClick={() => setDetailUser(r)}>
                        <IconEye />
                    </IconButton>
                    <Button size="sm" variant={r.sync_status === 'synced' ? 'secondary' : 'primary'} leftIcon={<IconCloudDownload />} disabled={syncing} onClick={() => syncOne(r)}>
                        {r.sync_status === 'synced' ? 'Re-sync' : 'Sync'}
                    </Button>
                </div>
            ),
        },
    ];

    /* ── hierarchy tab ── */
    const [roots, setRoots] = useState<EntraUserRecord[]>([]);
    const [rootsTotal, setRootsTotal] = useState(0);
    const [rootsPage, setRootsPage] = useState(1);
    const [standalone, setStandalone] = useState(0);
    const [treeLoading, setTreeLoading] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [childCache, setChildCache] = useState<Record<string, EntraUserRecord[]>>({});
    const [childLoading, setChildLoading] = useState<Record<string, boolean>>({});
    const [treeSearch, setTreeSearch] = useState('');
    const [searchHits, setSearchHits] = useState<EntraUserRecord[]>([]);
    const debouncedTree = useDebounced(treeSearch);
    const loadedChildren = useRef(new Set<string>());

    useEffect(() => {
        if (tab !== 'hierarchy') return;
        const ctl = new AbortController();
        setTreeLoading(true);
        const q = debouncedTree.trim();
        getJson(q ? query({ view: 'hierarchy', search: q }) : query({ view: 'hierarchy', page: rootsPage, page_size: 8 }), ctl.signal)
            .then((d) => {
                if (q) {
                    setSearchHits(d.results || []);
                } else {
                    setSearchHits([]);
                    setRoots(d.results || []);
                    setRootsTotal(d.count || 0);
                    setStandalone(d.standalone_count || 0);
                    setStats(d.stats || EMPTY_STATS);
                }
            })
            .catch((e) => e?.name !== 'AbortError' && fail('Could not build the hierarchy', e))
            .finally(() => !ctl.signal.aborted && setTreeLoading(false));
        return () => ctl.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, rootsPage, debouncedTree, reloadKey]);

    useEffect(() => {
        // a directory change invalidates anything we lazily fetched
        loadedChildren.current.clear();
        setChildCache({});
        setExpanded({});
    }, [reloadKey]);

    const toggleNode = useCallback((node: EntraUserRecord) => {
        setExpanded((prev) => ({ ...prev, [node.entra_id]: !prev[node.entra_id] }));
        if (loadedChildren.current.has(node.entra_id)) return;
        loadedChildren.current.add(node.entra_id);
        setChildLoading((p) => ({ ...p, [node.entra_id]: true }));
        getJson(query({ view: 'hierarchy', parent: node.entra_id }))
            .then((d) => setChildCache((p) => ({ ...p, [node.entra_id]: d.results || [] })))
            .catch((e) => {
                loadedChildren.current.delete(node.entra_id);
                fail('Could not load direct reports', e);
            })
            .finally(() => setChildLoading((p) => ({ ...p, [node.entra_id]: false })));
    }, []);

    /* ── department / designation tabs ── */
    const [groups, setGroups] = useState<GroupRow[]>([]);
    const [groupTotal, setGroupTotal] = useState(0);
    const [groupLoading, setGroupLoading] = useState(false);
    const [groupPage, setGroupPage] = useState(1);
    const [groupSize, setGroupSize] = useState(6);
    const [groupSearch, setGroupSearch] = useState('');
    const debouncedGroup = useDebounced(groupSearch);

    useEffect(() => {
        setGroupPage(1);
    }, [tab, debouncedGroup]);

    useEffect(() => {
        if (tab !== 'department' && tab !== 'role') return;
        const ctl = new AbortController();
        setGroupLoading(true);
        getJson(query({ view: tab === 'department' ? 'departments' : 'designations', page: groupPage, page_size: groupSize, search: debouncedGroup.trim() }), ctl.signal)
            .then((d) => {
                setGroups(d.results || []);
                setGroupTotal(d.count || 0);
                setStats(d.stats || EMPTY_STATS);
            })
            .catch((e) => e?.name !== 'AbortError' && fail('Could not load groups', e))
            .finally(() => !ctl.signal.aborted && setGroupLoading(false));
        return () => ctl.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, groupPage, groupSize, debouncedGroup, reloadKey]);

    const groupFilter = (g: GroupRow): SyncFilters => (tab === 'department' ? { department: g.name } : { designation: g.name });

    const renderGroupCard = (g: GroupRow) => {
        const isDept = tab === 'department';
        return (
            <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div>
                    <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">{isDept ? <IconFolder className="h-5 w-5" /> : <IconAward className="h-5 w-5" />}</div>
                            <div className="min-w-0">
                                <h3 className="truncate text-base font-bold text-slate-900" title={g.name}>
                                    {g.name}
                                </h3>
                                {!isDept && g.departments && (
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {g.departments.map((d) => (
                                            <span key={d} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                                {d}
                                            </span>
                                        ))}
                                        {(g.department_count || 0) > g.departments.length && <span className="text-[10px] font-semibold text-slate-400">+{(g.department_count || 0) - g.departments.length}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                        {!isDept && g.level ? <LevelBadge name={`L${g.level}`} /> : null}
                        <span className="shrink-0 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-extrabold text-brand">
                            {g.total} {g.total === 1 ? 'person' : 'people'}
                        </span>
                    </div>

                    <div className="my-3.5 grid grid-cols-3 gap-2 rounded-xl border border-slate-200/60 bg-slate-50 p-3 text-center">
                        <div>
                            <span className="text-[10px] font-bold uppercase text-emerald-600">Synced</span>
                            <p className="mt-0.5 text-base font-black text-slate-900">{g.synced}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase text-amber-600">Pending</span>
                            <p className="mt-0.5 text-base font-black text-slate-900">{g.pending}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase text-brand">Coverage</span>
                            <p className="mt-0.5 text-base font-black text-slate-900">{g.percent}%</p>
                        </div>
                    </div>

                    <div className="mb-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-500">HRMS sync progress</span>
                            <span className="font-bold text-brand">{g.percent}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full transition-all duration-500 ${g.percent === 100 ? 'bg-emerald-500' : g.percent > 50 ? 'bg-brand' : 'bg-amber-500'}`} style={{ width: `${g.percent}%` }} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <Button size="sm" variant="secondary" leftIcon={<IconUsers />} onClick={() => setMembersOf({ kind: isDept ? 'department' : 'designation', name: g.name })}>
                        View members
                    </Button>
                    {g.pending === 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                            <IconChecks className="h-3.5 w-3.5" /> All synced
                        </span>
                    ) : (
                        <Button size="sm" leftIcon={<IconCloudDownload />} disabled={syncing} onClick={() => runSync({ filters: { ...groupFilter(g), status: 'pending' } }, `Sync ${g.pending} pending in ${g.name}?`, g.pending)}>
                            Sync pending ({g.pending})
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    /* ── members modal (department / designation) ── */
    const [memberRows, setMemberRows] = useState<EntraUserRecord[]>([]);
    const [memberTotal, setMemberTotal] = useState(0);
    const [memberLoading, setMemberLoading] = useState(false);
    const [memberPage, setMemberPage] = useState(1);
    const [memberSize, setMemberSize] = useState(10);
    const [memberSearch, setMemberSearch] = useState('');
    const debouncedMember = useDebounced(memberSearch);

    useEffect(() => {
        setMemberPage(1);
    }, [membersOf, debouncedMember]);

    useEffect(() => {
        if (!membersOf) return;
        const ctl = new AbortController();
        setMemberLoading(true);
        getJson(query({ view: 'list', page: memberPage, page_size: memberSize, search: debouncedMember.trim(), [membersOf.kind]: membersOf.name }), ctl.signal)
            .then((d) => {
                setMemberRows(d.results || []);
                setMemberTotal(d.count || 0);
            })
            .catch((e) => e?.name !== 'AbortError' && fail('Could not load members', e))
            .finally(() => !ctl.signal.aborted && setMemberLoading(false));
        return () => ctl.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [membersOf, memberPage, memberSize, debouncedMember, reloadKey]);

    const memberColumns: Column<EntraUserRecord>[] = [
        {
            key: 'display_name',
            title: 'Member',
            render: (_v, r) => (
                <div className="flex items-center gap-2.5">
                    <Avatar user={r} size="sm" />
                    <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900">{r.display_name}</p>
                        <p className="truncate text-[11px] text-slate-500">{membersOf?.kind === 'department' ? r.job_title || 'No job title' : r.department || 'General'}</p>
                    </div>
                </div>
            ),
        },
        { key: 'sync_status', title: 'Status', align: 'center', render: (_v, r) => <SyncBadge user={r} compact /> },
        {
            key: 'actions',
            title: '',
            align: 'right',
            render: (_v, r) => (
                <div className="flex items-center justify-end gap-1.5">
                    {r.sync_status !== 'synced' && (
                        <Button size="xs" disabled={syncing} onClick={() => syncOne(r)}>
                            Sync
                        </Button>
                    )}
                    <IconButton tone="neutral" size="sm" label="View profile" onClick={() => setDetailUser(r)}>
                        <IconEye />
                    </IconButton>
                </div>
            ),
        },
    ];

    /* ───────────────────────── render ───────────────────────── */

    const tabs: { key: MainTab; label: string; icon: React.ReactNode }[] = [
        { key: 'list', label: 'Directory list', icon: <IconUsers className="h-4 w-4" /> },
        { key: 'hierarchy', label: 'Hierarchy', icon: <IconShare className="h-4 w-4" /> },
        { key: 'department', label: 'Departments', icon: <IconFolder className="h-4 w-4" /> },
        { key: 'role', label: 'Designations', icon: <IconAward className="h-4 w-4" /> },
    ];

    const goList = (s: StatusFilter) => {
        setTab('list');
        setStatus(s);
    };

    const ageLabel = cachedAt ? `Updated ${Math.max(0, Math.round((Date.now() / 1000 - cachedAt) / 60))} min ago` : undefined;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Microsoft Entra Directory"
                subtitle="Browse your Microsoft Entra ID (Azure AD) directory by list, org chart, department and designation, and sync people into HRMS with their managers."
                badge="Live enterprise directory"
                icon={<IconMicrosoft />}
                actions={
                    <>
                        <Button variant="secondary" leftIcon={<IconRefresh className={refreshing ? 'animate-spin' : ''} />} onClick={handleRefresh} disabled={refreshing || syncing} title={ageLabel}>
                            {refreshing ? 'Fetching…' : 'Refresh directory'}
                        </Button>
                        <Button variant="outline" leftIcon={<IconChecks />} onClick={openSyncAll} disabled={syncing || refreshing}>
                            Sync everything
                        </Button>
                        <Button leftIcon={<IconCloudDownload />} onClick={syncSelected} disabled={syncing || selectedCount === 0} loading={syncing}>
                            Sync selected ({selectedCount})
                        </Button>
                    </>
                }
            />

            <StatGrid cols={4} className="!mb-0">
                <StatCard label="Total in Entra" value={stats.total_entra} tone="primary" icon={<IconUsersGroup />} hint="Azure AD tenant" onClick={() => goList('all')} active={tab === 'list' && status === 'all'} />
                <StatCard label="Synced in HRMS" value={stats.synced_count} tone="success" icon={<IconCircleCheck />} hint="Profiles linked" onClick={() => goList('synced')} active={tab === 'list' && status === 'synced'} />
                <StatCard label="Pending import" value={stats.pending_count} tone="warning" icon={<IconUserPlus />} hint="Ready for one-click sync" onClick={() => goList('pending')} active={tab === 'list' && status === 'pending'} />
                <StatCard label="Active accounts" value={stats.active_count} tone="info" icon={<IconMicrosoft />} hint={`${stats.disabled_count} disabled in Entra`} />
            </StatGrid>

            {autoSync && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-5 py-3.5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${autoSync.enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            <IconRefresh className={`h-5 w-5 ${autoSync.enabled ? 'animate-[spin_6s_linear_infinite]' : ''}`} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">Auto-sync every 5 minutes</p>
                            <p className="text-xs text-slate-500">
                                {autoSync.enabled
                                    ? `Departments, designations, L1–Ln levels, employees and managers follow Entra; nothing is written unless Entra changed. ${autoSync.last_sync_at ? `Last change applied ${new Date(autoSync.last_sync_at).toLocaleString()}.` : 'Waiting for the first run.'}`
                                    : 'Off. Turn on to keep HRMS in step with Microsoft Entra automatically.'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={autoSync.enabled}
                        aria-label="Toggle auto-sync"
                        onClick={toggleAutoSync}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 ${autoSync.enabled ? 'bg-brand' : 'bg-slate-300'}`}
                    >
                        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${autoSync.enabled ? 'translate-x-5' : ''}`} />
                    </button>
                </div>
            )}

            <div role="tablist" className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-sm">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 ${
                            tab === t.key ? 'bg-gradient-to-r from-brand to-brand-mid text-white shadow-md shadow-brand/25' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ───────────── list ───────────── */}
            {tab === 'list' && (
                <div className="space-y-3">
                    {allPageSelected && listTotal > rows.length && !matching && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand/20 bg-brand/5 px-4 py-2.5 text-xs font-semibold text-slate-700">
                            <span>All {rows.length} people on this page are selected.</span>
                            <Button size="xs" variant="outline" onClick={selectAllMatching}>
                                Select all {listTotal} matching
                            </Button>
                        </div>
                    )}
                    {matching && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand/20 bg-brand/5 px-4 py-2.5 text-xs font-semibold text-slate-700">
                            <span>All {matching.count} matching people are selected.</span>
                            <Button size="xs" variant="ghost" onClick={() => { setMatching(null); setSelected([]); }}>
                                Clear selection
                            </Button>
                        </div>
                    )}
                    <DataTable
                        columns={columns}
                        data={rows}
                        rowKey={(r) => r.entra_id}
                        loading={listLoading}
                        page={page}
                        pageSize={pageSize}
                        totalCount={listTotal}
                        onPageChange={setPage}
                        onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                        searchValue={search}
                        onSearchChange={setSearch}
                        sortField={sort.field}
                        sortDirection={sort.dir}
                        onSortChange={(field, dir) => { setSort({ field, dir }); setPage(1); }}
                        onRefresh={() => setReloadKey((k) => k + 1)}
                        searchPlaceholder="Search by name, email, title, department, manager or EMP ID…"
                        entityLabel="people"
                        emptyMessage="No Microsoft Entra records match your filters"
                        emptyIcon={<IconMicrosoft className="h-10 w-10" />}
                        filters={
                            <>
                                <select className="form-select h-10 w-44 rounded-xl text-xs" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
                                    <option value="all">All HRMS statuses</option>
                                    <option value="pending">Pending import</option>
                                    <option value="synced">Synced</option>
                                    <option value="update">Update available</option>
                                </select>
                                <select className="form-select h-10 w-44 rounded-xl text-xs" value={dept} onChange={(e) => setDept(e.target.value)}>
                                    <option value="all">All departments</option>
                                    {deptOptions.map((d) => (
                                        <option key={d} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                                <select className="form-select h-10 w-36 rounded-xl text-xs" value={account} onChange={(e) => setAccount(e.target.value)}>
                                    <option value="all">All accounts</option>
                                    <option value="active">Active</option>
                                    <option value="disabled">Disabled</option>
                                </select>
                            </>
                        }
                    />
                </div>
            )}

            {/* ───────────── hierarchy ───────────── */}
            {tab === 'hierarchy' && (
                <div className="space-y-4">
                    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm md:flex-row">
                        <div className="relative w-full md:w-96">
                            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input type="text" value={treeSearch} onChange={(e) => { setTreeSearch(e.target.value); setRootsPage(1); }} placeholder="Find anyone by name, title or email…" className="form-input h-10 w-full rounded-xl pl-9 text-xs" />
                        </div>
                        <p className="text-xs font-semibold text-slate-500">
                            {debouncedTree.trim() ? `${searchHits.length} match${searchHits.length === 1 ? '' : 'es'}` : `${rootsTotal} top-level branch${rootsTotal === 1 ? '' : 'es'} · ${standalone} standalone account${standalone === 1 ? '' : 's'}`} · open a branch to load its direct reports
                        </p>
                    </div>

                    {treeLoading && roots.length === 0 && searchHits.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-sm">
                            <IconRefresh className="mx-auto mb-2 h-8 w-8 animate-spin text-brand" />
                            <p className="text-xs font-semibold text-slate-400">Building the organization chart…</p>
                        </div>
                    ) : debouncedTree.trim() ? (
                        <div className="space-y-3">
                            {searchHits.length === 0 ? (
                                <div className="rounded-2xl border border-slate-200/90 bg-white p-10 text-center text-sm font-semibold text-slate-500 shadow-sm">No one matches “{debouncedTree}”.</div>
                            ) : (
                                searchHits.map((u) => <TreeNode key={u.entra_id} node={u} depth={1} expanded={expanded} cache={childCache} loadingIds={childLoading} onToggle={toggleNode} onView={setDetailUser} onSync={syncOne} syncing={syncing} />)
                            )}
                        </div>
                    ) : roots.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-sm">
                            <IconShare className="mx-auto mb-2 h-12 w-12 text-slate-300" />
                            <p className="text-sm font-bold text-slate-700">No hierarchy found.</p>
                            <p className="mt-1 text-xs text-slate-400">Make sure reporting managers are configured in Microsoft Entra.</p>
                        </div>
                    ) : (
                        <>
                            <div className={`space-y-4 transition-opacity ${treeLoading ? 'opacity-60' : ''}`}>
                                {roots.map((r) => (
                                    <TreeNode key={r.entra_id} node={r} depth={0} expanded={expanded} cache={childCache} loadingIds={childLoading} onToggle={toggleNode} onView={setDetailUser} onSync={syncOne} syncing={syncing} />
                                ))}
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                                <Pagination page={rootsPage} pageSize={8} totalCount={rootsTotal} onPageChange={setRootsPage} entityLabel="branches" loading={treeLoading} className="!border-t-0" />
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ───────────── departments / designations ───────────── */}
            {(tab === 'department' || tab === 'role') && (
                <CardGrid
                    items={groups}
                    rowKey={(g) => g.name}
                    loading={groupLoading}
                    page={groupPage}
                    pageSize={groupSize}
                    pageSizeOptions={[6, 12, 24]}
                    totalCount={groupTotal}
                    onPageChange={setGroupPage}
                    onPageSizeChange={(sz) => { setGroupSize(sz); setGroupPage(1); }}
                    searchValue={groupSearch}
                    onSearchChange={setGroupSearch}
                    onRefresh={() => setReloadKey((k) => k + 1)}
                    searchPlaceholder={tab === 'department' ? 'Search departments or members…' : 'Search designations or members…'}
                    emptyMessage={tab === 'department' ? 'No departments found' : 'No designations found'}
                    entityLabel={tab === 'department' ? 'departments' : 'designations'}
                    cols={2}
                    renderCard={renderGroupCard}
                />
            )}

            {/* ───────────── sync everything: preview → progress → result ───────────── */}
            <Modal
                open={syncAllOpen}
                onClose={() => setSyncAllOpen(false)}
                dismissible={syncStage !== 'running'}
                hideClose={syncStage === 'running'}
                title="Sync everything from Microsoft Entra"
                subtitle={syncStage === 'preview' ? 'Review exactly what will be created and changed' : syncStage === 'running' ? 'Importing, please keep this window open' : 'Synchronization finished'}
                icon={<IconChecks />}
                size="3xl"
                footer={
                    syncStage === 'preview' ? (
                        <>
                            <Button variant="secondary" onClick={() => setSyncAllOpen(false)}>
                                Cancel
                            </Button>
                            <Button leftIcon={<IconCloudDownload />} disabled={!preview || previewLoading} onClick={confirmSyncAll}>
                                Confirm &amp; sync
                            </Button>
                        </>
                    ) : syncStage === 'done' ? (
                        <Button onClick={() => setSyncAllOpen(false)}>Close</Button>
                    ) : undefined
                }
            >
                {syncStage === 'running' && job && (
                    <div className="space-y-5 py-4">
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-900">{job.phase}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{job.total ? `${job.done} of ${job.total} people processed` : 'Reading the Microsoft Entra directory…'}</p>
                            </div>
                            <span className="text-3xl font-black text-brand">{job.percent}%</span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={job.percent} aria-valuemin={0} aria-valuemax={100}>
                            <div className="relative h-full rounded-full bg-gradient-to-r from-brand to-brand-mid transition-all duration-500" style={{ width: `${Math.max(job.percent, 2)}%` }}>
                                <span className="absolute inset-0 animate-pulse rounded-full bg-white/25" />
                            </div>
                        </div>
                        <ol className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                            {[
                                ['Read directory', job.percent >= 3],
                                ['Create & update records', job.percent >= 85],
                                ['Link managers', job.percent >= 100],
                            ].map(([label, doneStep], i) => (
                                <li key={String(label)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 font-semibold ${doneStep ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${doneStep ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{doneStep ? '✓' : i + 1}</span>
                                    {label}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {syncStage === 'done' && syncResult && (
                    <div className="space-y-4">
                        <div className={`flex items-center gap-3 rounded-2xl border p-4 ${syncResult.errors.length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                            <IconCircleCheck className={`h-8 w-8 ${syncResult.errors.length ? 'text-amber-600' : 'text-emerald-600'}`} />
                            <div>
                                <p className="text-sm font-bold text-slate-900">{syncResult.errors.length ? 'Completed with issues' : 'Everything is in sync'}</p>
                                <p className="text-xs text-slate-600">
                                    {syncResult.imported_count} imported · {syncResult.updated_count} updated · {syncResult.skipped_count} unchanged · {syncResult.managers_linked} manager links
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                            {(
                                [
                                    ['Departments', syncResult.departments_created],
                                    ['Locations', syncResult.locations_created],
                                    ['Levels', syncResult.levels_created],
                                    ['Designations', syncResult.designations_created],
                                    ['Level changes', syncResult.employee_levels_changed + syncResult.designations_level_changed],
                                ] as [string, number][]
                            ).map(([label, n]) => (
                                <div key={label} className="rounded-xl border border-slate-200/60 bg-slate-50 p-3 text-center">
                                    <p className="text-xl font-black text-slate-900">{n}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label} {label === 'Level changes' ? '' : 'created'}</p>
                                </div>
                            ))}
                        </div>
                        {syncResult.errors.length > 0 && (
                            <ul className="max-h-32 list-disc space-y-1 overflow-auto rounded-xl border border-amber-200 bg-amber-50 p-3 pl-6 text-xs text-amber-800">
                                {syncResult.errors.slice(0, 10).map((er) => (
                                    <li key={er}>{er}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {syncStage === 'preview' &&
                    (previewLoading || !preview ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-xs font-semibold text-slate-400">
                            <IconRefresh className="h-4 w-4 animate-spin text-brand" /> Calculating changes…
                        </div>
                    ) : (
                        (() => {
                            const det = preview.details;
                            const createN = preview.departments_created + preview.locations_created + preview.levels_created + preview.designations_created + preview.imported_count;
                            const editN = preview.designations_level_changed + preview.updated_count;
                            const tabsDef: { key: 'create' | 'edit' | 'managers'; label: string; n: number; tone: string }[] = [
                                { key: 'create', label: 'To create', n: createN, tone: 'text-emerald-600' },
                                { key: 'edit', label: 'To update', n: editN, tone: 'text-brand' },
                                { key: 'managers', label: 'Reporting managers', n: preview.managers_linked, tone: 'text-amber-600' },
                            ];
                            return (
                                <div className="space-y-4">
                                    <p className="rounded-xl border border-brand/20 bg-brand/5 p-3 text-xs font-semibold text-slate-700">
                                        Levels follow the reporting chain: the top of each hierarchy is <b>L1</b>, their direct reports <b>L2</b>, and so on (deepest: <b>L{preview.max_level}</b>). A level that changes in Entra is updated on the employee and designation too.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                        {tabsDef.map((t) => (
                                            <div key={t.key} className="rounded-xl border border-slate-200/60 bg-slate-50 p-3 text-center">
                                                <p className={`text-2xl font-black ${t.tone}`}>{t.n}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t.label}</p>
                                            </div>
                                        ))}
                                        <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-3 text-center">
                                            <p className="text-2xl font-black text-slate-700">{preview.skipped_count}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Already up to date</p>
                                        </div>
                                    </div>

                                    <div role="tablist" className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
                                        {tabsDef.map((t) => (
                                            <button key={t.key} type="button" role="tab" aria-selected={previewTab === t.key} onClick={() => setPreviewTab(t.key)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${previewTab === t.key ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                                {t.label} ({t.n})
                                            </button>
                                        ))}
                                    </div>

                                    {det && (
                                        <div className="space-y-3">
                                            {previewTab === 'create' && (
                                                <>
                                                    {createN === 0 && <p className="py-6 text-center text-xs font-semibold text-slate-400">Nothing new to create.</p>}
                                                    <Section title="Departments" count={preview.departments_created} shown={det.departments.length}>
                                                        <li className="flex flex-wrap gap-1.5 p-3">
                                                            {det.departments.map((x) => (
                                                                <span key={x} className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                                                                    {x}
                                                                </span>
                                                            ))}
                                                        </li>
                                                    </Section>
                                                    <Section title="Office locations" count={preview.locations_created} shown={det.locations.length}>
                                                        <li className="flex flex-wrap gap-1.5 p-3">
                                                            {det.locations.map((x) => (
                                                                <span key={x} className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                                                                    {x}
                                                                </span>
                                                            ))}
                                                        </li>
                                                    </Section>
                                                    <Section title="Levels" count={preview.levels_created} shown={det.levels.length}>
                                                        <li className="flex flex-wrap gap-1.5 p-3">
                                                            {det.levels.map((x) => (
                                                                <LevelBadge key={x} name={x} />
                                                            ))}
                                                        </li>
                                                    </Section>
                                                    <Section title="Designations" count={preview.designations_created} shown={det.designations.length}>
                                                        {det.designations.map((x) => (
                                                            <li key={`${x.name}|${x.department}`} className="flex items-center justify-between gap-3 px-3.5 py-2">
                                                                <span className="font-semibold text-slate-800">
                                                                    {x.name} <span className="font-normal text-slate-400">· {x.department}</span>
                                                                </span>
                                                                <LevelBadge name={x.level} />
                                                            </li>
                                                        ))}
                                                    </Section>
                                                    <Section title="Employees to import" count={preview.imported_count} shown={det.employees_new.length}>
                                                        {det.employees_new.map((x) => (
                                                            <li key={x.email} className="flex items-center justify-between gap-3 px-3.5 py-2">
                                                                <span className="min-w-0">
                                                                    <span className="block truncate font-semibold text-slate-800">{x.name}</span>
                                                                    <span className="block truncate text-[11px] text-slate-500">
                                                                        {x.designation} · {x.department} · {x.email}
                                                                    </span>
                                                                </span>
                                                                <LevelBadge name={x.level} />
                                                            </li>
                                                        ))}
                                                    </Section>
                                                </>
                                            )}
                                            {previewTab === 'edit' && (
                                                <>
                                                    {editN === 0 && <p className="py-6 text-center text-xs font-semibold text-slate-400">No existing records need changes.</p>}
                                                    <Section title="Designation level changes" count={preview.designations_level_changed} shown={det.designation_levels.length}>
                                                        {det.designation_levels.map((x) => (
                                                            <li key={`${x.name}|${x.department}`} className="flex items-center justify-between gap-3 px-3.5 py-2">
                                                                <span className="font-semibold text-slate-800">
                                                                    {x.name} <span className="font-normal text-slate-400">· {x.department}</span>
                                                                </span>
                                                                <span className="flex items-center gap-1.5">
                                                                    <LevelBadge name={x.from} /> → <LevelBadge name={x.to} />
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </Section>
                                                    <Section title="Employees to update" count={preview.updated_count} shown={det.employees_updated.length}>
                                                        {det.employees_updated.map((x) => (
                                                            <li key={x.email} className="px-3.5 py-2">
                                                                <p className="font-semibold text-slate-800">
                                                                    {x.name} <span className="font-normal text-slate-400">· {x.email}</span>
                                                                </p>
                                                                <div className="mt-1 flex flex-wrap gap-1.5">
                                                                    {x.changes.map((c) => (
                                                                        <span key={c} className="rounded-md bg-brand/5 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                                                            {c}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </Section>
                                                </>
                                            )}
                                            {previewTab === 'managers' && (
                                                <>
                                                    {preview.managers_linked === 0 && <p className="py-6 text-center text-xs font-semibold text-slate-400">All reporting managers are already linked.</p>}
                                                    <Section title="Reporting manager links" count={preview.managers_linked} shown={det.managers.length}>
                                                        {det.managers.map((x) => (
                                                            <li key={x.employee} className="flex flex-wrap items-center gap-2 px-3.5 py-2">
                                                                <span className="font-semibold text-slate-800">{x.employee}</span>
                                                                <span className="text-slate-400">reports to</span>
                                                                <span className="font-semibold text-brand">{x.manager}</span>
                                                                {x.from !== '—' && <span className="text-[11px] text-slate-400">(was {x.from})</span>}
                                                            </li>
                                                        ))}
                                                    </Section>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {preview.errors.length > 0 && (
                                        <ul className="max-h-32 list-disc space-y-1 overflow-auto rounded-xl border border-amber-200 bg-amber-50 p-3 pl-6 text-xs text-amber-800">
                                            {preview.errors.slice(0, 10).map((er) => (
                                                <li key={er}>{er}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            );
                        })()
                    ))}
            </Modal>

            {/* ───────────── members of a department / designation ───────────── */}
            <Modal open={!!membersOf} onClose={() => setMembersOf(null)} title={membersOf?.name} subtitle={membersOf ? (membersOf.kind === 'department' ? 'Department members' : 'People with this designation') : undefined} icon={membersOf?.kind === 'department' ? <IconFolder /> : <IconAward />} size="3xl" bodyClassName="!p-0">
                <DataTable
                    className="!rounded-none !border-0 !shadow-none"
                    columns={memberColumns}
                    data={memberRows}
                    rowKey={(r) => r.entra_id}
                    loading={memberLoading}
                    page={memberPage}
                    pageSize={memberSize}
                    totalCount={memberTotal}
                    onPageChange={setMemberPage}
                    onPageSizeChange={(sz) => { setMemberSize(sz); setMemberPage(1); }}
                    searchValue={memberSearch}
                    onSearchChange={setMemberSearch}
                    searchPlaceholder="Search members…"
                    entityLabel="members"
                    emptyMessage="No members found"
                    compact
                    stickyHeader={false}
                />
            </Modal>

            {/* ───────────── profile detail ───────────── */}
            <Modal
                open={!!detailUser}
                onClose={() => setDetailUser(null)}
                title="Microsoft Entra profile"
                icon={<IconMicrosoft />}
                size="lg"
                footer={
                    detailUser && (
                        <>
                            <Button variant="secondary" onClick={() => setDetailUser(null)}>
                                Close
                            </Button>
                            <Button
                                leftIcon={<IconCloudDownload />}
                                disabled={syncing}
                                onClick={() => {
                                    const u = detailUser;
                                    setDetailUser(null);
                                    syncOne(u);
                                }}
                            >
                                {detailUser.hrms_synced ? 'Re-sync profile' : 'Import to HRMS'}
                            </Button>
                        </>
                    )
                }
            >
                {detailUser && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-4 rounded-2xl border border-brand/20 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-4">
                            <Avatar user={detailUser} size="lg" />
                            <div className="min-w-0 flex-1">
                                <h4 className="truncate text-lg font-bold text-slate-900">{detailUser.display_name}</h4>
                                <p className="truncate text-xs font-semibold text-brand">
                                    {detailUser.job_title || 'No job title'} • {detailUser.department || 'General'}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-slate-400">Entra object ID: {detailUser.entra_id}</p>
                            </div>
                            <SyncBadge user={detailUser} compact />
                        </div>

                        <dl className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                            {[
                                ['Primary email', detailUser.primary_email],
                                ['User principal name', detailUser.user_principal_name],
                                ['Reporting manager', detailUser.manager_name || detailUser.hrms_reporting_manager_name || 'None / top level'],
                                ['Office location', detailUser.office_location || 'Not specified'],
                                ['Mobile', detailUser.mobile_phone || 'None recorded'],
                                ['HRMS employee code', detailUser.hrms_employee_code || 'Not created yet'],
                                ['Directory account', detailUser.account_enabled ? 'Enabled in Entra' : 'Disabled in Entra'],
                                ['HRMS sync status', detailUser.sync_status.replace('_', ' ')],
                            ].map(([label, value]) => (
                                <div key={label} className="space-y-1 rounded-xl border border-slate-200/60 bg-slate-50 p-3.5">
                                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
                                    <dd className="break-all font-semibold capitalize-none text-slate-800">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MicrosoftEntraDirectory;
