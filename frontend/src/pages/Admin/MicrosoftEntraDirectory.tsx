import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import PageHeader from '../../components/Common/PageHeader';
import DataTable, { Column } from '../../components/Common/DataTable';
import Modal from '../../components/Common/Modal';
import IconMicrosoft from '../../components/Icon/IconMicrosoft';
import IconRefresh from '../../components/Icon/IconRefresh';
import IconCloudDownload from '../../components/Icon/IconCloudDownload';
import IconUsers from '../../components/Icon/IconUsers';
import IconUsersGroup from '../../components/Icon/IconUsersGroup';
import IconCircleCheck from '../../components/Icon/IconCircleCheck';
import IconUserPlus from '../../components/Icon/IconUserPlus';
import IconEye from '../../components/Icon/IconEye';
import IconMail from '../../components/Icon/IconMail';
import IconPhone from '../../components/Icon/IconPhone';
import IconMapPin from '../../components/Icon/IconMapPin';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import IconShare from '../../components/Icon/IconShare';
import IconFolder from '../../components/Icon/IconFolder';
import IconAward from '../../components/Icon/IconAward';
import IconSearch from '../../components/Icon/IconSearch';
import IconCaretDown from '../../components/Icon/IconCaretDown';
import IconChecks from '../../components/Icon/IconChecks';
import IconPlus from '../../components/Icon/IconPlus';
import IconMinus from '../../components/Icon/IconMinus';
import { authFetch } from '../../utils/authFetch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

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
    hrms_reporting_manager_id?: number | null;
    hrms_reporting_manager_name?: string | null;
    hrms_is_active: boolean | null;
    hrms_user_id: number | null;
}

interface DirectoryStats {
    total_entra: number;
    synced_count: number;
    pending_count: number;
    active_count: number;
    disabled_count: number;
}

interface HierarchyTreeNode {
    user: EntraUserRecord;
    children: HierarchyTreeNode[];
    depth: number;
}

export const MicrosoftEntraDirectory: React.FC = () => {
    const dispatch = useDispatch();

    // Primary View Tabs: 'list' (Directory Table) | 'hierarchy' (Org Chart) | 'department' (Departments) | 'role' (Designations)
    const [activeMainTab, setActiveMainTab] = useState<'list' | 'hierarchy' | 'department' | 'role'>('list');

    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [users, setUsers] = useState<EntraUserRecord[]>([]);
    const [stats, setStats] = useState<DirectoryStats>({
        total_entra: 0,
        synced_count: 0,
        pending_count: 0,
        active_count: 0,
        disabled_count: 0,
    });

    // Directory List states
    const [search, setSearch] = useState('');
    const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'synced'>('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [detailUser, setDetailUser] = useState<EntraUserRecord | null>(null);

    // Hierarchy view states
    const [hierarchySearch, setHierarchySearch] = useState('');
    const [hierarchyDeptFilter, setHierarchyDeptFilter] = useState('ALL');
    const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>({});

    // Department view states
    const [deptSearch, setDeptSearch] = useState('');
    const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

    // Role / Designation view states
    const [roleSearch, setRoleSearch] = useState('');
    const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});

    useEffect(() => {
        dispatch(setPageTitle('Microsoft Entra Directory | ITL HRMS'));
        loadDirectory();
    }, [dispatch]);

    const loadDirectory = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_BASE_URL}/app/microsoft-entra/users/`);

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Failed to fetch directory records.');
            }

            const data = await res.json();
            const fetchedUsers: EntraUserRecord[] = data.users || [];
            setUsers(fetchedUsers);
            if (data.stats) {
                setStats(data.stats);
            }

            // By default expand top nodes in hierarchy and departments
            const initialExpand: Record<string, boolean> = {};
            fetchedUsers.forEach((u) => {
                initialExpand[u.entra_id] = true;
            });
            setExpandedNodeIds(initialExpand);
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Directory Fetch Error',
                text: err.message || 'Unable to connect to Microsoft Entra ID.',
                customClass: { popup: 'sweet-alerts' },
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async (idsToSync: string[], customTitle?: string) => {
        if (!idsToSync.length) return;

        const confirm = await Swal.fire({
            title: customTitle || `Sync ${idsToSync.length} Employee(s)?`,
            text: 'This will create or update HRMS employee profiles, designations, departments, and reporting manager relationships directly from Microsoft Entra.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Sync to HRMS',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#0891b2',
            customClass: { popup: 'sweet-alerts' },
        });

        if (!confirm.isConfirmed) return;

        setSyncing(true);
        try {
            const res = await authFetch(`${API_BASE_URL}/app/microsoft-entra/sync/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_ids: idsToSync,
                    auto_create_meta: true,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || 'Synchronization failed.');
            }

            Swal.fire({
                icon: 'success',
                title: 'Synchronization Complete',
                html: `<b>${data.imported_count}</b> new employee(s) imported.<br/><b>${data.updated_count}</b> existing profile(s) updated.<br/><b>${data.skipped_count || 0}</b> unchanged.`,
                customClass: { popup: 'sweet-alerts' },
            });

            setSelectedIds([]);
            await loadDirectory();
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Sync Failed',
                text: err.message || 'Could not complete synchronization.',
                customClass: { popup: 'sweet-alerts' },
            });
        } finally {
            setSyncing(false);
        }
    };

    // Filter users by tab and search for the main Directory Table
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            if (filterTab === 'pending' && u.sync_status !== 'pending_import') return false;
            if (filterTab === 'synced' && u.sync_status === 'pending_import') return false;

            if (search.trim()) {
                const q = search.toLowerCase();
                const matchName = u.display_name?.toLowerCase().includes(q);
                const matchEmail = u.primary_email?.toLowerCase().includes(q);
                const matchTitle = u.job_title?.toLowerCase().includes(q);
                const matchDept = u.department?.toLowerCase().includes(q);
                const matchCode = u.hrms_employee_code?.toLowerCase().includes(q);
                return matchName || matchEmail || matchTitle || matchDept || matchCode;
            }
            return true;
        });
    }, [users, filterTab, search]);

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredUsers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredUsers.map((u) => u.entra_id));
        }
    };

    const toggleSelectOne = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    // -------------------------------------------------------------
    // 1. ORG HIERARCHY TREE CONSTRUCTION
    // -------------------------------------------------------------
    const { hierarchyRoots, unassignedNodes, allDeptsList, totalHierarchyNodes } = useMemo(() => {
        const userMap = new Map<string, EntraUserRecord>();
        const emailMap = new Map<string, EntraUserRecord>();
        const deptsSet = new Set<string>();

        users.forEach((u) => {
            if (u.entra_id) userMap.set(u.entra_id, u);
            if (u.primary_email) emailMap.set(u.primary_email.toLowerCase(), u);
            if (u.mail) emailMap.set(u.mail.toLowerCase(), u);
            if (u.user_principal_name) emailMap.set(u.user_principal_name.toLowerCase(), u);
            if (u.department) deptsSet.add(u.department);
        });

        const childrenMap = new Map<string, EntraUserRecord[]>();
        const hasParent = new Set<string>();

        users.forEach((u) => {
            let parent: EntraUserRecord | undefined;
            if (u.manager_id && userMap.has(u.manager_id)) {
                parent = userMap.get(u.manager_id);
            } else if (u.manager_email && emailMap.has(u.manager_email.toLowerCase())) {
                parent = emailMap.get(u.manager_email.toLowerCase());
            }

            if (parent && parent.entra_id !== u.entra_id) {
                const list = childrenMap.get(parent.entra_id) || [];
                list.push(u);
                childrenMap.set(parent.entra_id, list);
                hasParent.add(u.entra_id);
            }
        });

        const buildSubtree = (u: EntraUserRecord, depth = 0, visited = new Set<string>()): HierarchyTreeNode => {
            visited.add(u.entra_id);
            const directReports = childrenMap.get(u.entra_id) || [];
            const children: HierarchyTreeNode[] = [];
            for (const child of directReports) {
                if (!visited.has(child.entra_id)) {
                    children.push(buildSubtree(child, depth + 1, new Set(visited)));
                }
            }
            return { user: u, children, depth };
        };

        const roots: HierarchyTreeNode[] = [];
        const standalone: EntraUserRecord[] = [];

        users.forEach((u) => {
            if (!hasParent.has(u.entra_id)) {
                const treeNode = buildSubtree(u, 0);
                // If has reports or has leadership role, put in primary hierarchy
                if (treeNode.children.length > 0 || u.job_title) {
                    roots.push(treeNode);
                } else {
                    standalone.push(u);
                }
            }
        });

        // Sort roots: Leadership first
        roots.sort((a, b) => {
            const aTitle = (a.user.job_title || '').toLowerCase();
            const bTitle = (b.user.job_title || '').toLowerCase();
            if (aTitle.includes('chief') || aTitle.includes('director') || aTitle.includes('leader')) return -1;
            if (bTitle.includes('chief') || bTitle.includes('director') || bTitle.includes('leader')) return 1;
            return b.children.length - a.children.length;
        });

        return {
            hierarchyRoots: roots,
            unassignedNodes: standalone,
            allDeptsList: Array.from(deptsSet).sort(),
            totalHierarchyNodes: users.length,
        };
    }, [users]);

    const toggleNodeExpand = (nodeId: string) => {
        setExpandedNodeIds((prev) => ({
            ...prev,
            [nodeId]: !prev[nodeId],
        }));
    };

    const expandAllNodes = () => {
        const all: Record<string, boolean> = {};
        users.forEach((u) => {
            all[u.entra_id] = true;
        });
        setExpandedNodeIds(all);
    };

    const collapseAllNodes = () => {
        setExpandedNodeIds({});
    };

    // -------------------------------------------------------------
    // 2. DEPARTMENT GROUPS CALCULATION
    // -------------------------------------------------------------
    const departmentGroups = useMemo(() => {
        const map = new Map<string, EntraUserRecord[]>();
        users.forEach((u) => {
            const deptName = u.department?.trim() || 'General / Unassigned';
            const list = map.get(deptName) || [];
            list.push(u);
            map.set(deptName, list);
        });

        const list = Array.from(map.entries()).map(([deptName, members]) => {
            const synced = members.filter((m) => m.sync_status === 'synced').length;
            const pending = members.filter((m) => m.sync_status === 'pending_import').length;
            const needsUpdate = members.filter((m) => m.sync_status === 'needs_update').length;
            const percent = members.length > 0 ? Math.round(((synced + needsUpdate) / members.length) * 100) : 0;
            return {
                name: deptName,
                members,
                total: members.length,
                synced,
                pending,
                needsUpdate,
                percent,
            };
        });

        list.sort((a, b) => b.total - a.total);
        return list;
    }, [users]);

    const filteredDepartmentGroups = useMemo(() => {
        if (!deptSearch.trim()) return departmentGroups;
        const q = deptSearch.toLowerCase();
        return departmentGroups.filter((g) => {
            const matchDept = g.name.toLowerCase().includes(q);
            const matchMember = g.members.some(
                (m) =>
                    m.display_name?.toLowerCase().includes(q) ||
                    m.job_title?.toLowerCase().includes(q) ||
                    m.primary_email?.toLowerCase().includes(q)
            );
            return matchDept || matchMember;
        });
    }, [departmentGroups, deptSearch]);

    const toggleDeptExpand = (deptName: string) => {
        setExpandedDepts((prev) => ({
            ...prev,
            [deptName]: !prev[deptName],
        }));
    };

    // -------------------------------------------------------------
    // 3. DESIGNATION / ROLE GROUPS CALCULATION
    // -------------------------------------------------------------
    const designationGroups = useMemo(() => {
        const map = new Map<string, EntraUserRecord[]>();
        users.forEach((u) => {
            const roleName = u.job_title?.trim() || 'Unassigned Role';
            const list = map.get(roleName) || [];
            list.push(u);
            map.set(roleName, list);
        });

        const list = Array.from(map.entries()).map(([roleName, members]) => {
            const depts = Array.from(new Set(members.map((m) => m.department || 'General')));
            const synced = members.filter((m) => m.sync_status === 'synced').length;
            const pending = members.filter((m) => m.sync_status === 'pending_import').length;
            const needsUpdate = members.filter((m) => m.sync_status === 'needs_update').length;
            const percent = members.length > 0 ? Math.round(((synced + needsUpdate) / members.length) * 100) : 0;
            return {
                title: roleName,
                members,
                departments: depts,
                total: members.length,
                synced,
                pending,
                needsUpdate,
                percent,
            };
        });

        list.sort((a, b) => b.total - a.total);
        return list;
    }, [users]);

    const filteredDesignationGroups = useMemo(() => {
        if (!roleSearch.trim()) return designationGroups;
        const q = roleSearch.toLowerCase();
        return designationGroups.filter((g) => {
            const matchTitle = g.title.toLowerCase().includes(q);
            const matchDept = g.departments.some((d) => d.toLowerCase().includes(q));
            const matchMember = g.members.some(
                (m) => m.display_name?.toLowerCase().includes(q) || m.primary_email?.toLowerCase().includes(q)
            );
            return matchTitle || matchDept || matchMember;
        });
    }, [designationGroups, roleSearch]);

    const toggleRoleExpand = (roleTitle: string) => {
        setExpandedRoles((prev) => ({
            ...prev,
            [roleTitle]: !prev[roleTitle],
        }));
    };

    // -------------------------------------------------------------
    // DIRECTORY TABLE COLUMNS
    // -------------------------------------------------------------
    const columns: Column<EntraUserRecord>[] = [
        {
            key: 'select',
            header: (
                <input
                    type="checkbox"
                    className="form-checkbox rounded text-cyan-600 focus:ring-cyan-500"
                    checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length}
                    onChange={toggleSelectAll}
                />
            ),
            width: '45px',
            render: (_, row) => (
                <input
                    type="checkbox"
                    className="form-checkbox rounded text-cyan-600 focus:ring-cyan-500"
                    checked={selectedIds.includes(row.entra_id)}
                    onChange={() => toggleSelectOne(row.entra_id)}
                />
            ),
        },
        {
            key: 'employee',
            header: 'Personnel Details',
            accessor: 'display_name',
            sortable: true,
            render: (_, row) => {
                const initials = (row.display_name || row.primary_email || 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm border border-cyan-400/20">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate text-sm">
                                {row.display_name || `${row.given_name} ${row.surname}`.trim() || 'Unnamed Entra User'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                <IconMail className="w-3 h-3 shrink-0" />
                                {row.primary_email}
                            </p>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'role',
            header: 'Role & Department',
            accessor: 'job_title',
            sortable: true,
            render: (_, row) => (
                <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        {row.job_title || <span className="text-slate-400 italic">No job title specified</span>}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {row.department || 'General'}
                    </p>
                </div>
            ),
        },
        {
            key: 'manager',
            header: 'Reports To (Manager)',
            accessor: 'manager_name',
            sortable: true,
            render: (_, row) => (
                <div className="min-w-0 text-xs">
                    {row.manager_name ? (
                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                            {row.manager_name}
                        </span>
                    ) : (
                        <span className="text-slate-400 italic">Top Level / Unassigned</span>
                    )}
                </div>
            ),
        },
        {
            key: 'location',
            header: 'Office Location',
            accessor: 'office_location',
            sortable: true,
            render: (_, row) => (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <IconMapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{row.office_location || 'Not Specified'}</span>
                </div>
            ),
        },
        {
            key: 'sync_status',
            header: 'HRMS Status',
            accessor: 'sync_status',
            sortable: true,
            align: 'center',
            render: (_, row) => {
                if (row.sync_status === 'synced') {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <IconCircleCheck className="w-3 h-3" />
                            Synced ({row.hrms_employee_code || 'Linked'})
                        </span>
                    );
                }
                if (row.sync_status === 'needs_update') {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <IconRefresh className="w-3 h-3" />
                            Update Avail.
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                        <IconUserPlus className="w-3 h-3" />
                        Pending Import
                    </span>
                );
            },
        },
        {
            key: 'account_enabled',
            header: 'Entra Status',
            accessor: 'account_enabled',
            align: 'center',
            render: (_, row) => (
                <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        row.account_enabled
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}
                >
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${row.account_enabled ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    />
                    {row.account_enabled ? 'Active' : 'Disabled'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (_, row) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => setDetailUser(row)}
                        className="btn btn-sm btn-outline-primary p-1.5 rounded-lg hover:shadow-sm"
                        title="View Entra Profile Details"
                    >
                        <IconEye className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSync([row.entra_id], `Sync ${row.display_name}?`)}
                        disabled={syncing}
                        className={`btn btn-sm gap-1.5 rounded-lg font-semibold text-xs ${
                            row.sync_status === 'synced'
                                ? 'btn-outline-secondary'
                                : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs'
                        }`}
                        title={row.sync_status === 'synced' ? 'Re-sync profile' : 'Import into HRMS'}
                    >
                        <IconCloudDownload className="w-3.5 h-3.5" />
                        {row.sync_status === 'synced' ? 'Re-sync' : 'Sync'}
                    </button>
                </div>
            ),
        },
    ];

    // -------------------------------------------------------------
    // RECURSIVE HIERARCHY TREE NODE COMPONENT
    // -------------------------------------------------------------
    const renderHierarchyNode = (node: HierarchyTreeNode) => {
        const u = node.user;
        const isExpanded = !!expandedNodeIds[u.entra_id];
        const hasChildren = node.children.length > 0;

        // Check if matches hierarchy filter
        const matchesDept =
            hierarchyDeptFilter === 'ALL' || (u.department && u.department.toLowerCase() === hierarchyDeptFilter.toLowerCase());
        const matchesSearch =
            !hierarchySearch.trim() ||
            u.display_name?.toLowerCase().includes(hierarchySearch.toLowerCase()) ||
            u.job_title?.toLowerCase().includes(hierarchySearch.toLowerCase()) ||
            u.primary_email?.toLowerCase().includes(hierarchySearch.toLowerCase());

        const isVisible = matchesDept && matchesSearch;

        const initials = (u.display_name || u.primary_email || 'U')
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

        return (
            <div key={u.entra_id} className="relative group">
                {/* Node Card */}
                <div
                    className={`p-4 rounded-2xl transition-all duration-200 border ${
                        isVisible
                            ? 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-cyan-500/50'
                            : 'opacity-40 bg-slate-50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-800'
                    }`}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Identity & Role */}
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md border-2 border-white dark:border-slate-800">
                                    {initials}
                                </div>
                                {node.depth === 0 && (
                                    <span
                                        className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-white uppercase shadow-xs"
                                        title="Top Leadership Level"
                                    >
                                        Lead
                                    </span>
                                )}
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                                        {u.display_name}
                                    </h4>
                                    {u.hrms_employee_code && (
                                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400">
                                            {u.hrms_employee_code}
                                        </span>
                                    )}
                                </div>

                                <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 truncate mt-0.5">
                                    {u.job_title || 'No Job Title'}
                                </p>

                                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                                        {u.department || 'General'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <IconMail className="w-3 h-3" />
                                        {u.primary_email}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Status Badges & Action Buttons */}
                        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                            {/* Direct Reports Count Badge / Toggle */}
                            {hasChildren && (
                                <button
                                    type="button"
                                    onClick={() => toggleNodeExpand(u.entra_id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        isExpanded
                                            ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-500/20'
                                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    <IconUsers className="w-3.5 h-3.5" />
                                    <span>{node.children.length} Reports</span>
                                    <IconCaretDown
                                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                            isExpanded ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                            )}

                            {/* HRMS Status */}
                            {u.sync_status === 'synced' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <IconCircleCheck className="w-3 h-3" />
                                    Synced
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                                    <IconUserPlus className="w-3 h-3" />
                                    Pending
                                </span>
                            )}

                            {/* Quick View Profile Button */}
                            <button
                                type="button"
                                onClick={() => setDetailUser(u)}
                                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                title="View Details"
                            >
                                <IconEye className="w-4 h-4" />
                            </button>

                            {/* Quick Sync Button */}
                            <button
                                type="button"
                                onClick={() => handleSync([u.entra_id], `Sync ${u.display_name}?`)}
                                disabled={syncing}
                                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs gap-1.5 flex items-center ${
                                    u.sync_status === 'synced'
                                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                        : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs'
                                }`}
                                title={u.sync_status === 'synced' ? 'Re-sync profile' : 'Import into HRMS'}
                            >
                                <IconCloudDownload className="w-3.5 h-3.5" />
                                {u.sync_status === 'synced' ? 'Re-sync' : 'Sync'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Subordinates Branch Container */}
                {hasChildren && isExpanded && (
                    <div className="pl-6 sm:pl-10 border-l-2 border-cyan-500/30 dark:border-cyan-500/20 space-y-3 mt-3 relative ml-5">
                        {node.children.map((childNode) => renderHierarchyNode(childNode))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Generalized Enterprise Page Header */}
            <PageHeader
                variant="cyan"
                badge="MICROSOFT ENTRA ID • LIVE ENTERPRISE DIRECTORY"
                icon={<IconMicrosoft className="w-7 h-7 text-cyan-200" />}
                title="Microsoft Entra Employee Directory"
                subtitle="Fetch, inspect, organize, and synchronize enterprise personnel records from Microsoft Entra ID (Azure AD) with hierarchy, departments, and designations."
                actions={
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={loadDirectory}
                            disabled={loading || syncing}
                            className="btn btn-outline-white border-white/20 text-white hover:bg-white/10 gap-2 backdrop-blur-md rounded-xl"
                        >
                            <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Fetching...' : 'Refresh Directory'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSync(selectedIds)}
                            disabled={syncing || selectedIds.length === 0}
                            className="btn bg-cyan-500 hover:bg-cyan-600 text-white font-bold gap-2 shadow-lg shadow-cyan-500/20 border-none rounded-xl disabled:opacity-50"
                        >
                            <IconCloudDownload className="w-4 h-4" />
                            Sync Selected ({selectedIds.length})
                        </button>
                    </div>
                }
            />

            {/* KPI Metric Summary Cards (Always Visible) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total in Entra</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total_entra}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Azure AD tenant directory</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                        <IconUsersGroup className="w-6 h-6" />
                    </div>
                </div>

                <div className="panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Synced in HRMS</p>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.synced_count}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Profiles active in HRMS</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <IconCircleCheck className="w-6 h-6" />
                    </div>
                </div>

                <div className="panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Import</p>
                        <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.pending_count}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Ready for 1-click sync</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <IconUserPlus className="w-6 h-6" />
                    </div>
                </div>

                <div className="panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Directory</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.active_count}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">{stats.disabled_count} disabled in Entra</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <IconMicrosoft className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* PRIMARY VIEW NAVIGATION TABS (Directory List | Org Hierarchy | Departments | Designations) */}
            <div className="panel p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveMainTab('list')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                            activeMainTab === 'list'
                                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/25'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <IconUsers className="w-4 h-4" />
                        Directory List
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            activeMainTab === 'list' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                            {users.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveMainTab('hierarchy')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                            activeMainTab === 'hierarchy'
                                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/25'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <IconShare className="w-4 h-4" />
                        Hierarchy
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            activeMainTab === 'hierarchy' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                            {hierarchyRoots.length} Branches
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveMainTab('department')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                            activeMainTab === 'department'
                                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/25'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <IconFolder className="w-4 h-4" />
                        Department
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            activeMainTab === 'department' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                            {departmentGroups.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveMainTab('role')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                            activeMainTab === 'role'
                                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/25'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <IconAward className="w-4 h-4" />
                        Designation (Role)
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            activeMainTab === 'role' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                            {designationGroups.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* ============================================================= */}
            {/* TAB 1: DIRECTORY LIST TABLE VIEW                              */}
            {/* ============================================================= */}
            {activeMainTab === 'list' && (
                <div className="space-y-4">
                    {/* Quick Filter Sub-Tabs */}
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <button
                            type="button"
                            onClick={() => setFilterTab('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                filterTab === 'all'
                                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            All Directory Users ({stats.total_entra})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterTab('pending')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                filterTab === 'pending'
                                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            Pending Import ({stats.pending_count})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterTab('synced')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                filterTab === 'synced'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Synced in HRMS ({stats.synced_count})
                        </button>
                    </div>

                    {/* Generalized DataTable */}
                    <div className="panel p-0 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                        <DataTable
                            columns={columns}
                            data={filteredUsers}
                            loading={loading}
                            search={search}
                            onSearchChange={setSearch}
                            searchPlaceholder="Search by name, email, job title, department, or EMP ID..."
                            emptyMessage="No Microsoft Entra records found matching your filters."
                            emptyIcon={<IconMicrosoft className="w-12 h-12 text-slate-300 dark:text-slate-600" />}
                            pageSize={10}
                            pageSizeOptions={[10, 25, 50]}
                        />
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* TAB 2: ORG HIERARCHY TREE VIEW                                */}
            {/* ============================================================= */}
            {activeMainTab === 'hierarchy' && (
                <div className="space-y-6">
                    {/* Hierarchy Toolbar & Search Filters */}
                    <div className="panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-72">
                                <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={hierarchySearch}
                                    onChange={(e) => setHierarchySearch(e.target.value)}
                                    placeholder="Filter by name, title, or email..."
                                    className="form-input pl-9 rounded-xl text-xs py-2 w-full"
                                />
                            </div>

                            <select
                                value={hierarchyDeptFilter}
                                onChange={(e) => setHierarchyDeptFilter(e.target.value)}
                                className="form-select rounded-xl text-xs py-2 w-48"
                            >
                                <option value="ALL">All Departments</option>
                                {allDeptsList.map((d) => (
                                    <option key={d} value={d}>
                                        {d}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                            <button
                                type="button"
                                onClick={expandAllNodes}
                                className="btn btn-sm btn-outline-secondary rounded-xl gap-1 text-xs"
                            >
                                <IconPlus className="w-3.5 h-3.5" />
                                Expand All
                            </button>
                            <button
                                type="button"
                                onClick={collapseAllNodes}
                                className="btn btn-sm btn-outline-secondary rounded-xl gap-1 text-xs"
                            >
                                <IconMinus className="w-3.5 h-3.5" />
                                Collapse All
                            </button>
                        </div>
                    </div>

                    {/* Hierarchy Tree Branches */}
                    {loading ? (
                        <div className="p-12 text-center text-slate-400">
                            <IconRefresh className="w-8 h-8 animate-spin mx-auto text-cyan-600 mb-2" />
                            <p className="text-xs font-semibold">Building organization hierarchy tree...</p>
                        </div>
                    ) : hierarchyRoots.length === 0 ? (
                        <div className="panel p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
                            <IconShare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No hierarchy tree nodes found.</p>
                            <p className="text-xs text-slate-400 mt-1">Ensure users have reporting manager links configured in Microsoft Entra.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {hierarchyRoots.map((rootNode) => renderHierarchyNode(rootNode))}

                            {/* Standalone / Unassigned Accounts Deck */}
                            {unassignedNodes.length > 0 && (
                                <div className="panel p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 mt-8">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                Standalone & Service Accounts ({unassignedNodes.length})
                                            </h4>
                                            <p className="text-xs text-slate-400">
                                                Accounts with no manager or direct reports in Microsoft Entra
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {unassignedNodes.map((u) => (
                                            <div
                                                key={u.entra_id}
                                                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs"
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                        {u.display_name}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 truncate">{u.primary_email}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setDetailUser(u)}
                                                    className="btn btn-sm btn-outline-secondary p-1 rounded-lg"
                                                >
                                                    <IconEye className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================= */}
            {/* TAB 3: DEPARTMENTS VIEW                                       */}
            {/* ============================================================= */}
            {activeMainTab === 'department' && (
                <div className="space-y-6">
                    {/* Department Header & Search */}
                    <div className="panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative flex-1 md:w-80 w-full">
                            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={deptSearch}
                                onChange={(e) => setDeptSearch(e.target.value)}
                                placeholder="Search departments or members..."
                                className="form-input pl-9 rounded-xl text-xs py-2 w-full"
                            />
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <span>Showing <b>{filteredDepartmentGroups.length}</b> department units</span>
                        </div>
                    </div>

                    {/* Department Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {filteredDepartmentGroups.map((group) => {
                            const isExpanded = !!expandedDepts[group.name];
                            const pendingMembers = group.members.filter((m) => m.sync_status === 'pending_import');

                            return (
                                <div
                                    key={group.name}
                                    className="panel p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Card Title & Headcount */}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                                                    <IconFolder className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                                                        {group.name}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {group.total} personnel in Microsoft Entra
                                                    </p>
                                                </div>
                                            </div>

                                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-500/20 shrink-0">
                                                {group.total} Members
                                            </span>
                                        </div>

                                        {/* Metrics Row */}
                                        <div className="grid grid-cols-3 gap-2 my-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                                                    Synced
                                                </span>
                                                <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                                                    {group.synced}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                                                    Pending
                                                </span>
                                                <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                                                    {group.pending}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400">
                                                    Coverage
                                                </span>
                                                <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                                                    {group.percent}%
                                                </p>
                                            </div>
                                        </div>

                                        {/* Sync Progress Bar */}
                                        <div className="space-y-1.5 mb-4">
                                            <div className="flex items-center justify-between text-xs font-semibold">
                                                <span className="text-slate-500">HRMS Sync Progress</span>
                                                <span className="text-cyan-600 dark:text-cyan-400 font-bold">{group.percent}%</span>
                                            </div>
                                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 ${
                                                        group.percent === 100
                                                            ? 'bg-emerald-500'
                                                            : group.percent > 50
                                                            ? 'bg-cyan-500'
                                                            : 'bg-amber-500'
                                                    }`}
                                                    style={{ width: `${group.percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between gap-2">
                                            <button
                                                type="button"
                                                onClick={() => toggleDeptExpand(group.name)}
                                                className="btn btn-sm btn-outline-secondary rounded-xl text-xs gap-1.5"
                                            >
                                                <IconUsers className="w-3.5 h-3.5" />
                                                {isExpanded ? 'Hide Members' : `View Members (${group.members.length})`}
                                                <IconCaretDown
                                                    className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleSync(
                                                        pendingMembers.map((m) => m.entra_id),
                                                        `Sync All ${pendingMembers.length} in ${group.name}?`
                                                    )
                                                }
                                                disabled={syncing || pendingMembers.length === 0}
                                                className={`btn btn-sm rounded-xl font-bold text-xs gap-1.5 ${
                                                    pendingMembers.length === 0
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs'
                                                }`}
                                            >
                                                {pendingMembers.length === 0 ? (
                                                    <>
                                                        <IconChecks className="w-3.5 h-3.5" />
                                                        All Synced
                                                    </>
                                                ) : (
                                                    <>
                                                        <IconCloudDownload className="w-3.5 h-3.5" />
                                                        Sync Dept ({pendingMembers.length})
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Expandable Member Roster */}
                                        {isExpanded && (
                                            <div className="space-y-2 mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 max-h-72 overflow-y-auto pr-1">
                                                {group.members.map((m) => (
                                                    <div
                                                        key={m.entra_id}
                                                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-900 dark:text-white truncate">
                                                                {m.display_name}
                                                            </p>
                                                            <p className="text-[11px] text-cyan-600 dark:text-cyan-400 truncate">
                                                                {m.job_title || 'No Job Title'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 truncate">{m.primary_email}</p>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {m.sync_status === 'synced' ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                                                                    Synced
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSync([m.entra_id], `Sync ${m.display_name}?`)}
                                                                    disabled={syncing}
                                                                    className="btn btn-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg gap-1"
                                                                >
                                                                    <IconCloudDownload className="w-3 h-3" />
                                                                    Sync
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => setDetailUser(m)}
                                                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                                                            >
                                                                <IconEye className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ============================================================= */}
            {/* TAB 4: DESIGNATION / ROLES VIEW                               */}
            {/* ============================================================= */}
            {activeMainTab === 'role' && (
                <div className="space-y-6">
                    {/* Role Header & Search */}
                    <div className="panel p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative flex-1 md:w-80 w-full">
                            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={roleSearch}
                                onChange={(e) => setRoleSearch(e.target.value)}
                                placeholder="Search designations, roles, or members..."
                                className="form-input pl-9 rounded-xl text-xs py-2 w-full"
                            />
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <span>Showing <b>{filteredDesignationGroups.length}</b> distinct designations</span>
                        </div>
                    </div>

                    {/* Designation Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {filteredDesignationGroups.map((group) => {
                            const isExpanded = !!expandedRoles[group.title];
                            const pendingMembers = group.members.filter((m) => m.sync_status === 'pending_import');

                            return (
                                <div
                                    key={group.title}
                                    className="panel p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Card Title & Headcount */}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                    <IconAward className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                                                        {group.title}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                                        {group.departments.map((d) => (
                                                            <span
                                                                key={d}
                                                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                                            >
                                                                {d}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-500/20 shrink-0">
                                                {group.total} {group.total === 1 ? 'Person' : 'Personnel'}
                                            </span>
                                        </div>

                                        {/* Metrics Row */}
                                        <div className="grid grid-cols-3 gap-2 my-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                                                    Synced
                                                </span>
                                                <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                                                    {group.synced}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                                                    Pending
                                                </span>
                                                <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                                                    {group.pending}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                                                    Rate
                                                </span>
                                                <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                                                    {group.percent}%
                                                </p>
                                            </div>
                                        </div>

                                        {/* Sync Progress Bar */}
                                        <div className="space-y-1.5 mb-4">
                                            <div className="flex items-center justify-between text-xs font-semibold">
                                                <span className="text-slate-500">Designation Sync Progress</span>
                                                <span className="text-blue-600 dark:text-blue-400 font-bold">{group.percent}%</span>
                                            </div>
                                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 ${
                                                        group.percent === 100
                                                            ? 'bg-emerald-500'
                                                            : group.percent > 50
                                                            ? 'bg-blue-500'
                                                            : 'bg-amber-500'
                                                    }`}
                                                    style={{ width: `${group.percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between gap-2">
                                            <button
                                                type="button"
                                                onClick={() => toggleRoleExpand(group.title)}
                                                className="btn btn-sm btn-outline-secondary rounded-xl text-xs gap-1.5"
                                            >
                                                <IconUsers className="w-3.5 h-3.5" />
                                                {isExpanded ? 'Hide Roster' : `View Roster (${group.members.length})`}
                                                <IconCaretDown
                                                    className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleSync(
                                                        pendingMembers.map((m) => m.entra_id),
                                                        `Sync All ${pendingMembers.length} ${group.title}?`
                                                    )
                                                }
                                                disabled={syncing || pendingMembers.length === 0}
                                                className={`btn btn-sm rounded-xl font-bold text-xs gap-1.5 ${
                                                    pendingMembers.length === 0
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs'
                                                }`}
                                            >
                                                {pendingMembers.length === 0 ? (
                                                    <>
                                                        <IconChecks className="w-3.5 h-3.5" />
                                                        All Synced
                                                    </>
                                                ) : (
                                                    <>
                                                        <IconCloudDownload className="w-3.5 h-3.5" />
                                                        Sync All ({pendingMembers.length})
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Expandable Designation Member Roster */}
                                        {isExpanded && (
                                            <div className="space-y-2 mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 max-h-72 overflow-y-auto pr-1">
                                                {group.members.map((m) => (
                                                    <div
                                                        key={m.entra_id}
                                                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-900 dark:text-white truncate">
                                                                {m.display_name}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                                {m.department || 'General'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 truncate">{m.primary_email}</p>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {m.sync_status === 'synced' ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                                                                    Synced
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSync([m.entra_id], `Sync ${m.display_name}?`)}
                                                                    disabled={syncing}
                                                                    className="btn btn-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg gap-1"
                                                                >
                                                                    <IconCloudDownload className="w-3 h-3" />
                                                                    Sync
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => setDetailUser(m)}
                                                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                                                            >
                                                                <IconEye className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Profile Detail Modal (Accessible from any tab) */}
            <Modal
                open={!!detailUser}
                onClose={() => setDetailUser(null)}
                title="Microsoft Entra Personnel Profile"
                size="lg"
            >
                {detailUser && (
                    <div className="space-y-5">
                        {/* User Identity Header */}
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-900/10 via-slate-900/5 to-transparent border border-cyan-500/20">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 text-white font-extrabold text-lg flex items-center justify-center shrink-0 shadow-md">
                                {(detailUser.display_name || detailUser.primary_email || 'U')
                                    .split(' ')
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                                    {detailUser.display_name}
                                </h4>
                                <p className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold truncate">
                                    {detailUser.job_title || 'No Job Title'} • {detailUser.department || 'General'}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                    Entra Object ID: {detailUser.entra_id}
                                </p>
                            </div>
                            <div>
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                                        detailUser.hrms_synced
                                            ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                                            : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                                    }`}
                                >
                                    {detailUser.hrms_synced ? 'Synced in HRMS' : 'Pending Import'}
                                </span>
                            </div>
                        </div>

                        {/* Attribute Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Primary Email</span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 break-all">{detailUser.primary_email}</p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">User Principal Name (UPN)</span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 break-all">{detailUser.user_principal_name}</p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Reporting Manager</span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">
                                    {detailUser.manager_name || detailUser.hrms_reporting_manager_name || (
                                        <span className="text-slate-400 italic">None / Top Level</span>
                                    )}
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Office Location</span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{detailUser.office_location || 'Not Specified'}</p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Contact Mobile</span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{detailUser.mobile_phone || 'None recorded'}</p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">HRMS Employee Code</span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">
                                    {detailUser.hrms_employee_code ? (
                                        <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{detailUser.hrms_employee_code}</span>
                                    ) : (
                                        <span className="text-slate-400 italic">Not created yet</span>
                                    )}
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Directory Account Status</span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">
                                    {detailUser.account_enabled ? 'Enabled in Entra' : 'Disabled in Entra'}
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">HRMS Sync Status</span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                                    {detailUser.sync_status.replace('_', ' ')}
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setDetailUser(null)}
                                className="btn btn-outline-secondary"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const id = detailUser.entra_id;
                                    setDetailUser(null);
                                    handleSync([id], `Sync ${detailUser.display_name}?`);
                                }}
                                disabled={syncing}
                                className="btn bg-cyan-600 hover:bg-cyan-700 text-white font-bold gap-2"
                            >
                                <IconCloudDownload className="w-4 h-4" />
                                {detailUser.hrms_synced ? 'Re-sync Profile' : 'Import to HRMS'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MicrosoftEntraDirectory;
