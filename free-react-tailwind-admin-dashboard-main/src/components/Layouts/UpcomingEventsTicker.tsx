import { FC, Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import IconX from '../Icon/IconX';
import IconCalendar from '../Icon/IconCalendar';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const ROTATE_MS = 3000;
const DAY_MS = 86400000;

type CalendarEvent = { id: number; name: string; date: string; description?: string; is_holiday: boolean };

const parseDate = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day);
};
const startOfToday = () => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};
const daysFromToday = (d: string) => Math.round((parseDate(d).getTime() - startOfToday().getTime()) / DAY_MS);
const relLabel = (d: string) => {
    const n = daysFromToday(d);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    return n > 0 ? `In ${n} days` : `${-n} days ago`;
};
const fmtLong = (d: string) => parseDate(d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const tone = (e: CalendarEvent) => (e.is_holiday ? 'from-amber-400 to-orange-500' : 'from-brand-500 to-brand-accent');

const DateChip: FC<{ event: CalendarEvent; size?: 'sm' | 'md' }> = ({ event, size = 'sm' }) => {
    const d = parseDate(event.date);
    return (
        <span
            className={`flex shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br ${tone(event)} text-white shadow-sm leading-none ${
                size === 'sm' ? 'h-8 w-8' : 'h-12 w-12 rounded-xl'
            }`}
        >
            <span className={`font-semibold uppercase tracking-wide opacity-90 ${size === 'sm' ? 'text-[8px]' : 'text-[10px]'}`}>{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
            <span className={`font-extrabold ${size === 'sm' ? 'text-[13px]' : 'text-lg'}`}>{d.getDate()}</span>
        </span>
    );
};

const EventRow: FC<{ event: CalendarEvent; muted?: boolean }> = ({ event, muted }) => (
    <div className={`flex items-center gap-3 rounded-xl border border-gray-100 dark:border-[#1b2e4b] p-3 transition-colors hover:bg-primary/5 dark:hover:bg-primary/10 ${muted ? 'opacity-70' : ''}`}>
        <DateChip event={event} size="md" />
        <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-white">{event.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{fmtLong(event.date)}</p>
            {event.description && <p className="mt-0.5 line-clamp-2 text-xs text-gray-400 dark:text-gray-500">{event.description}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${daysFromToday(event.date) === 0 ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'}`}>{relLabel(event.date)}</span>
            {event.is_holiday && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">Holiday</span>}
        </div>
    </div>
);

const UpcomingEventsTicker: FC<{ calendarRoute: string }> = ({ calendarRoute }) => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        let cancelled = false;
        fetch(`${API_BASE_URL}/app/calendar-events/`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => !cancelled && setEvents(Array.isArray(data) ? data : data?.results || []))
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    const { upcoming, recent } = useMemo(() => {
        const sorted = [...events].filter((e) => e?.date).sort((a, b) => a.date.localeCompare(b.date));
        return {
            upcoming: sorted.filter((e) => daysFromToday(e.date) >= 0),
            recent: sorted.filter((e) => daysFromToday(e.date) < 0 && daysFromToday(e.date) >= -30).reverse(),
        };
    }, [events]);

    useEffect(() => {
        if (paused || open || upcoming.length < 2) return;
        const t = setInterval(() => setIndex((i) => (i + 1) % upcoming.length), ROTATE_MS);
        return () => clearInterval(t);
    }, [paused, open, upcoming.length]);

    if (!upcoming.length && !recent.length) return null;
    const current = upcoming[index % (upcoming.length || 1)];

    return (
        <>
            <style>{`@keyframes evt-ticker-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <button
                type="button"
                onClick={() => setOpen(true)}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                title="View all events"
                className="group relative hidden lg:flex w-64 xl:w-72 items-center gap-2.5 overflow-hidden rounded-full border border-primary/15 bg-gradient-to-r from-primary/10 via-brand-accent/10 to-amber-400/10 py-1 ltr:pl-1 ltr:pr-3 rtl:pr-1 rtl:pl-3 text-left shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md"
            >
                {current ? (
                    <span key={current.id} className="flex min-w-0 flex-1 items-center gap-2.5" style={{ animation: 'evt-ticker-in 450ms ease-out' }}>
                        <DateChip event={current} />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-bold text-gray-800 dark:text-white">{current.name}</span>
                            <span className="block truncate text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                {relLabel(current.date)}
                                {current.is_holiday && <span className="text-warning"> • Holiday</span>}
                            </span>
                        </span>
                    </span>
                ) : (
                    <span className="flex min-w-0 flex-1 items-center gap-2.5 ltr:pl-2 rtl:pr-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        <IconCalendar className="h-4 w-4" /> No upcoming events
                    </span>
                )}
                {upcoming.length > 1 && (
                    <span className="shrink-0 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-bold text-primary dark:bg-black/30">
                        {(index % upcoming.length) + 1}/{upcoming.length}
                    </span>
                )}
            </button>

            <Transition appear show={open} as={Fragment}>
                <Dialog as="div" open={open} onClose={() => setOpen(false)} className="relative z-[60]">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel w-full max-w-xl overflow-hidden rounded-2xl border-0 p-0 text-black dark:text-white-dark">
                                    <div className="relative overflow-hidden bg-gradient-to-r from-brand-600 via-brand-accent to-amber-500 px-6 py-5">
                                        <div className="absolute -top-10 ltr:-right-10 rtl:-left-10 h-40 w-40 rounded-full bg-white opacity-10 blur-2xl" />
                                        <Dialog.Title className="relative text-xl font-extrabold tracking-tight text-white">Events</Dialog.Title>
                                        <p className="relative mt-0.5 text-xs font-medium text-white/80">
                                            {upcoming.length} upcoming · {recent.length} in the last 30 days
                                        </p>
                                        <button type="button" onClick={() => setOpen(false)} className="absolute top-4 ltr:right-4 rtl:left-4 text-white/80 hover:text-white">
                                            <IconX />
                                        </button>
                                    </div>
                                    <div className="max-h-[60vh] space-y-5 overflow-y-auto p-5">
                                        <section>
                                            <h4 className="mb-2.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Upcoming</h4>
                                            {upcoming.length ? (
                                                <div className="space-y-2.5">
                                                    {upcoming.map((e) => (
                                                        <EventRow key={e.id} event={e} />
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="py-4 text-center text-sm text-gray-400">No upcoming events</p>
                                            )}
                                        </section>
                                        {!!recent.length && (
                                            <section>
                                                <h4 className="mb-2.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Recent</h4>
                                                <div className="space-y-2.5">
                                                    {recent.map((e) => (
                                                        <EventRow key={e.id} event={e} muted />
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                    <div className="flex justify-end border-t border-gray-100 px-5 py-3 dark:border-[#1b2e4b]">
                                        <Link to={calendarRoute} onClick={() => setOpen(false)} className="btn btn-primary btn-sm gap-1.5">
                                            <IconCalendar className="h-4 w-4" /> Open calendar
                                        </Link>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
};

export default UpcomingEventsTicker;
