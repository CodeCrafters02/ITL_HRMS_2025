import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Row = { status: string; label: string; seconds: number };
export type Summary = {
    locked?: { checkin: boolean; checkout: boolean };
    punch?: { in: string | null; out: string | null; live: boolean };
    current: { availability: string; activity: string; since: string | null } | null;
    attendance: { check_in: string | null; check_out: string | null; source: string } | null;
    working: { label: string; seconds: number } | null;
    overtime: { label: string; seconds: number } | null;
    statuses: Row[];
    sessions: { start: string; end: string }[];
    shift?: {
        assigned: boolean;
        type?: string;
        start?: string;
        end?: string;
        working?: { label: string; seconds?: number };
        outside?: { label: string };
        full_day?: { label: string };
    };
    timeline?: { status: string; start: string; end: string; label: string }[];
};

const COLORS: Record<string, string> = {
    Available: '#00ab55', AvailableIdle: '#00ab55', Busy: '#e7515a', BusyIdle: '#e7515a', DoNotDisturb: '#e7515a',
    Away: '#e2a03f', BeRightBack: '#e2a03f', Offline: '#888ea8',
};

export const Dot = ({ c }: { c: string }) => (
    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[c] || '#888ea8' }} />
);

export const PresenceDetailsBody = ({ s }: { s: Summary }) => (
        <div className="p-5 space-y-5">
            <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-gray-100 dark:bg-white/5 py-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Working</p>
                    <p className="text-lg font-black">{s.working?.label || '0h 00m'}</p>
                </div>
                <div className="rounded-xl bg-gray-100 dark:bg-white/5 py-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Overtime</p>
                    <p className="text-lg font-black">{s.overtime?.label || '0h 00m'}</p>
                </div>
                <div className="rounded-xl bg-gray-100 dark:bg-white/5 py-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Punch</p>
                    <p className="text-sm font-bold mt-1.5">
                        {s.punch?.in || '--:--'} / {s.punch?.live ? 'Live' : s.punch?.out || '--:--'}
                    </p>
                </div>
            </div>

            {s.shift && (
                <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Shift</h4>
                    {s.shift.assigned ? (
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span>{s.shift.type || 'Shift'}</span>
                                <b>{s.shift.start} – {s.shift.end}</b>
                            </div>
                            <div className="flex justify-between">
                                <span>Working hours in shift</span>
                                <b>{s.shift.working?.label}</b>
                            </div>
                            <div className="flex justify-between">
                                <span>Outside shift timings</span>
                                <b>{s.shift.outside?.label}</b>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span>Expected per day</span>
                                <span>{s.shift.full_day?.label}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-amber-600 dark:text-amber-300">Not assigned to any shift</p>
                    )}
                </section>
            )}

            {s.statuses.length > 0 && (
                <section>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Time by status</h4>
                    <div className="space-y-1.5">
                        {s.statuses.map((r) => (
                            <div key={r.status} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2"><Dot c={r.status} /> {r.status}</span>
                                <b>{r.label}</b>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {!!s.timeline?.length && (
                <section>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Status timeline</h4>
                    <div className="space-y-1.5">
                        {s.timeline.map((t, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2"><Dot c={t.status} /> {t.status}</span>
                                <span className="text-gray-600 dark:text-gray-300">
                                    {t.start} – {t.end} <span className="text-gray-400">({t.label})</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {s.sessions.length > 0 && (
                <section>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Working sessions</h4>
                    <div className="flex flex-wrap gap-2">
                        {s.sessions.map((x, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5">
                                {x.start} – {x.end}
                            </span>
                        ))}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2">Working time counts Available, Busy and Do Not Disturb only.</p>
                </section>
            )}
        </div>
);

const PresenceCard = ({ apiBase, headers, onLoad }: { apiBase: string; headers: Record<string, string>; onLoad?: (s: Summary) => void }) => {
    const [s, setS] = useState<Summary | null>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        let stop = false;
        const load = async () => {
            if (document.hidden) return;
            try {
                const r = await fetch(`${apiBase}/employee/presence-summary/`, { headers });
                if (r.ok && !stop) {
                    const j = await r.json();
                    setS(j);
                    onLoad?.(j);
                }
            } catch {}
        };
        load();
        const t = setInterval(load, 15000);
        return () => {
            stop = true;
            clearInterval(t);
        };
    }, [apiBase]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    if (!s || (!s.current && !s.attendance && !s.timeline?.length)) return null;
    const cur = s.current?.availability || 'Unknown';

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full text-left rounded-xl border border-white/30 bg-white/10 hover:bg-white/15 transition-colors px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1"
            >
                <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Dot c={cur} /> Teams: {cur}
                    {s.current?.since && <span className="text-[11px] font-normal text-blue-100">since {s.current.since}</span>}
                </span>
                {s.working && (
                    <span className="text-sm text-white">
                        <span className="text-[10px] uppercase tracking-wide text-blue-100 mr-1">Working</span>
                        <b>{s.working.label}</b>
                    </span>
                )}
                {s.shift && (
                    <span className="text-sm text-white">
                        {s.shift.assigned ? (
                            <>
                                <span className="text-[10px] uppercase tracking-wide text-blue-100 mr-1">
                                    In shift {s.shift.start}–{s.shift.end}
                                </span>
                                <b>{s.shift.working?.label}</b>
                            </>
                        ) : (
                            <span className="text-[11px] text-amber-200">Not assigned to any shift</span>
                        )}
                    </span>
                )}
                {s.overtime && s.overtime.seconds > 0 && (
                    <span className="text-sm text-white">
                        <span className="text-[10px] uppercase tracking-wide text-blue-100 mr-1">Overtime</span>
                        <b>{s.overtime.label}</b>
                    </span>
                )}
                <span className="ml-auto text-[11px] text-blue-100 underline">View details</span>
            </button>

            {open && createPortal(
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
                    <div
                        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0e1726] text-gray-800 dark:text-gray-100 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h3 className="text-base font-bold">Teams activity — today</h3>
                                <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                    <Dot c={cur} /> {cur}
                                    {s.current?.since && <>since {s.current.since}</>}
                                </p>
                            </div>
                            <button type="button" className="text-2xl leading-none px-2 text-gray-500 hover:text-gray-800 dark:hover:text-white" onClick={() => setOpen(false)}>
                                ×
                            </button>
                        </div>

                        <PresenceDetailsBody s={s} />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default PresenceCard;
