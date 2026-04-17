import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconTrashLines from '../../components/Icon/IconTrashLines';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/break-config/`;

type BreakConfig = {
    id: number;
    break_choice: 'short_break' | 'meal_break' | 'dont_disturb' | string;
    break_choice_display?: string;
    duration_minutes: number | null;
    enabled: boolean;
};

const IconCoffee = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path
            d="M3 8h13v6a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V8Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
        />
        <path d="M16 10h2a3 3 0 0 1 0 6h-2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M7 3v3M11 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const IconMoon = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path
            d="M21 14.5A8.5 8.5 0 0 1 9.5 3a7.5 7.5 0 1 0 11.5 11.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
        />
    </svg>
);

const IconClock = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const AdminBreakConfig = () => {
    const dispatch = useDispatch();
    const [items, setItems] = useState<BreakConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState<number | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Break Config'));
    }, [dispatch]);

    const headers = (): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    };

    const fetchAll = async (): Promise<BreakConfig[]> => {
        setLoading(true);
        try {
            const resp = await fetch(API_URL, { headers: headers() });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to load break config');
            const arr: BreakConfig[] = Array.isArray(data) ? data : data?.results || [];
            setItems(arr);
            return arr;
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to load break config', 'error');
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const shortBreaks = useMemo(() => items.filter((b) => b.break_choice === 'short_break'), [items]);
    const mealBreak = useMemo(() => items.find((b) => b.break_choice === 'meal_break') || null, [items]);
    const dontDisturb = useMemo(() => items.find((b) => b.break_choice === 'dont_disturb') || null, [items]);

    const patch = async (id: number, payload: Partial<BreakConfig>) => {
        const current = items.find((x) => x.id === id);
        if (!current) return;
        try {
            setSavingId(id);
            const resp = await fetch(`${API_URL}${id}/`, {
                method: 'PATCH',
                headers: headers(),
                body: JSON.stringify({ ...current, ...payload }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to update');
            await fetchAll();
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to update', 'error');
        } finally {
            setSavingId((prev) => (prev === id ? null : prev));
        }
    };

    const setEnabledExclusive = async (targetId: number, enable: boolean, listOverride?: BreakConfig[]) => {
        const list = listOverride || items;
        const target = list.find((x) => x.id === targetId);
        if (!target) return;

        // If enabling, disable others in same break_choice first (so only one enabled per section)
        if (enable) {
            const siblings = list.filter((x) => x.break_choice === target.break_choice && x.id !== targetId && x.enabled);
            for (const s of siblings) {
                // eslint-disable-next-line no-await-in-loop
                await patch(s.id, { enabled: false });
            }
        }
        await patch(targetId, { enabled: enable });
    };

    const remove = async (id: number) => {
        const ok = await Swal.fire({ title: 'Delete break?', showCancelButton: true, confirmButtonText: 'Delete' });
        if (!ok.isConfirmed) return;
        try {
            const resp = await fetch(`${API_URL}${id}/`, { method: 'DELETE', headers: headers() });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({}));
                throw new Error(data?.detail || 'Failed to delete');
            }
            await fetchAll();
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to delete', 'error');
        }
    };

    const addShortBreak = async () => {
        try {
            const resp = await fetch(API_URL, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ break_choice: 'short_break', duration_minutes: 5, enabled: true }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to add');
            await fetchAll();
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to add', 'error');
        }
    };

    const addMealBreak = async () => {
        try {
            const resp = await fetch(API_URL, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ break_choice: 'meal_break', duration_minutes: 30, enabled: true }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to add');
            const fresh = await fetchAll();
            // Make the newly created meal break the active one
            if (data?.id) {
                await setEnabledExclusive(Number(data.id), true, fresh);
            }
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to add', 'error');
        }
    };

    const ensureDontDisturb = async () => {
        if (dontDisturb) return;
        try {
            const resp = await fetch(API_URL, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ break_choice: 'dont_disturb', duration_minutes: null, enabled: true }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to add');
            await fetchAll();
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to add', 'error');
        }
    };

    if (loading) {
        return (
            <div className="panel">
                <div className="text-white-dark">Loading break configuration...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="panel">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-xl font-bold">Break Configuration</div>
                        <div className="text-sm text-white-dark">
                            Set which breaks appear for employees, and control default durations.
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" className="btn btn-outline-primary" onClick={fetchAll}>
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div className="panel">
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                        <div className="text-lg font-bold flex items-center gap-2">
                            <IconClock className="w-5 h-5 text-primary" /> Short Breaks
                        </div>
                        <div className="text-sm text-white-dark">You can add multiple short breaks with different durations.</div>
                    </div>
                    <button type="button" className="btn btn-primary gap-2" onClick={addShortBreak}>
                        <IconPlus /> Add Short Break
                    </button>
                </div>
                {!shortBreaks.length ? (
                    <div className="p-6 rounded-lg border border-dashed border-[#e0e6ed] dark:border-[#1b2e4b] text-white-dark">
                        No short breaks configured yet.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {shortBreaks.map((b) => (
                            <div
                                key={b.id}
                                className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-[#e0e6ed] dark:border-[#1b2e4b] bg-white dark:bg-[#0e1726]"
                            >
                                <div className="min-w-[140px]">
                                    <div className="text-xs text-white-dark">Duration</div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            className="form-input w-24"
                                            type="number"
                                            min={1}
                                            max={180}
                                            value={b.duration_minutes ?? 5}
                                            onChange={(e) => patch(b.id, { duration_minutes: Math.max(1, Math.min(180, Number(e.target.value) || 0)) })}
                                        />
                                        <span className="text-sm text-white-dark">min</span>
                                    </div>
                                </div>

                                <div className="min-w-[140px]">
                                    <div className="text-xs text-white-dark">Status</div>
                                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                        <input type="checkbox" checked={!!b.enabled} onChange={(e) => setEnabledExclusive(b.id, e.target.checked)} />
                                        <span className={`text-sm font-semibold ${b.enabled ? 'text-success' : 'text-danger'}`}>{b.enabled ? 'Enabled' : 'Disabled'}</span>
                                    </label>
                                </div>

                                <div className="flex-1" />
                                <div className="flex items-center gap-2">
                                    {savingId === b.id && <span className="text-xs text-white-dark">Saving…</span>}
                                    <button type="button" className="btn btn-outline-danger gap-2" onClick={() => remove(b.id)}>
                                        <IconTrashLines /> Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="panel">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-lg font-bold flex items-center gap-2">
                            <IconCoffee className="w-5 h-5 text-warning" /> Meal Break
                        </div>
                        <div className="text-sm text-white-dark">Add a new meal break duration; it will become the active one.</div>
                    </div>
                    <button type="button" className="btn btn-primary gap-2" onClick={addMealBreak}>
                        <IconPlus /> Add Meal Break
                    </button>
                </div>
                {mealBreak ? (
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-[#e0e6ed] dark:border-[#1b2e4b] bg-white dark:bg-[#0e1726]">
                        <div className="min-w-[140px]">
                            <div className="text-xs text-white-dark">Duration</div>
                            <div className="flex items-center gap-2">
                                <input
                                    className="form-input w-24"
                                    type="number"
                                    min={1}
                                    max={240}
                                    value={mealBreak.duration_minutes ?? 30}
                                    onChange={(e) => patch(mealBreak.id, { duration_minutes: Math.max(1, Math.min(240, Number(e.target.value) || 0)) })}
                                />
                                <span className="text-sm text-white-dark">min</span>
                            </div>
                        </div>
                        <div className="min-w-[140px]">
                            <div className="text-xs text-white-dark">Status</div>
                            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={!!mealBreak.enabled} onChange={(e) => setEnabledExclusive(mealBreak.id, e.target.checked)} />
                                <span className={`text-sm font-semibold ${mealBreak.enabled ? 'text-success' : 'text-danger'}`}>{mealBreak.enabled ? 'Enabled' : 'Disabled'}</span>
                            </label>
                        </div>
                        <div className="flex-1" />
                        <div className="flex items-center gap-2">
                            {savingId === mealBreak.id && <span className="text-xs text-white-dark">Saving…</span>}
                            <button type="button" className="btn btn-outline-danger gap-2" onClick={() => remove(mealBreak.id)}>
                                <IconTrashLines /> Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-white-dark">No meal break configured.</div>
                )}
            </div>

            <div className="panel">
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                        <div className="text-lg font-bold flex items-center gap-2">
                            <IconMoon className="w-5 h-5 text-info" /> Do Not Disturb
                        </div>
                        <div className="text-sm text-white-dark">When enabled, employees can mark themselves as unavailable.</div>
                    </div>
                    <button type="button" className={`btn gap-2 ${dontDisturb ? 'btn-outline-primary' : 'btn btn-primary'}`} onClick={ensureDontDisturb} disabled={!!dontDisturb}>
                        <IconPlus /> {dontDisturb ? 'Do Not Disturb Added' : 'Add Do Not Disturb'}
                    </button>
                </div>
                {dontDisturb ? (
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-[#e0e6ed] dark:border-[#1b2e4b] bg-white dark:bg-[#0e1726]">
                        <div className="min-w-[140px]">
                            <div className="text-xs text-white-dark">Status</div>
                            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={!!dontDisturb.enabled} onChange={(e) => setEnabledExclusive(dontDisturb.id, e.target.checked)} />
                                <span className={`text-sm font-semibold ${dontDisturb.enabled ? 'text-success' : 'text-danger'}`}>{dontDisturb.enabled ? 'Enabled' : 'Disabled'}</span>
                            </label>
                        </div>
                        <div className="flex-1" />
                        {savingId === dontDisturb.id && <span className="text-xs text-white-dark">Saving…</span>}
                    </div>
                ) : (
                    <div className="p-6 rounded-lg border border-dashed border-[#e0e6ed] dark:border-[#1b2e4b] text-white-dark">Not configured.</div>
                )}
            </div>
        </div>
    );
};

export default AdminBreakConfig;

