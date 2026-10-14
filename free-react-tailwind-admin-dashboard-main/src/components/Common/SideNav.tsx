import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export interface SideNavSubItem {
    label: string;
    to: string;
    end?: boolean;
    badge?: number | string;
}

export interface SideNavItem {
    key?: string; // stable id for groups (defaults to label)
    label: string;
    icon?: React.ReactNode;
    to?: string; // leaf link
    action?: () => void; // click handler instead of a route (e.g. open Teams chat in a new tab)
    end?: boolean;
    badge?: number | string;
    children?: SideNavSubItem[]; // makes the item an expandable group
    variant?: 'default' | 'back'; // 'back' = highlighted "return" link
}

export interface SideNavSection {
    title?: string;
    items: SideNavItem[];
}

export interface SideNavProps {
    sections: SideNavSection[];
    header?: React.ReactNode; // scope / context row above the search box
    searchable?: boolean;
    searchPlaceholder?: string;
    emptyText?: string;
    onNavigate?: () => void;
    className?: string;
}

const matches = (pathname: string, to: string, end?: boolean) => (end ? pathname === to : pathname === to || pathname.startsWith(to + '/'));

const Badge = ({ value }: { value: number | string }) => {
    if (value === 0 || value === '' || value === undefined || value === null) return null;
    return (
        <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-sm shadow-rose-500/30">
            {typeof value === 'number' && value > 99 ? '99+' : value}
        </span>
    );
};

const Chevron = ({ open }: { open: boolean }) => (
    <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-90 text-brand dark:text-brand-400' : ''}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
);

const IconTile = ({ active, children }: { active: boolean; children: React.ReactNode }) => (
    <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 [&>svg]:h-[18px] [&>svg]:w-[18px] ${
            active
                ? 'bg-gradient-to-br from-brand to-brand-mid text-white shadow-md shadow-brand/30 [&>svg]:!text-white'
                : 'bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand dark:bg-slate-800/70 dark:text-slate-400 dark:group-hover:bg-brand-950/50 dark:group-hover:text-brand-300 [&>svg]:!text-current'
        }`}
    >
        {children}
    </span>
);

export const SideNav: React.FC<SideNavProps> = ({ sections, header, searchable = true, searchPlaceholder = 'Search menu…', emptyText = 'No matching menu items', onNavigate, className = '' }) => {
    const { pathname } = useLocation();
    const [query, setQuery] = useState('');
    const [openKeys, setOpenKeys] = useState<string[]>([]);

    const q = query.trim().toLowerCase();

    // Filter by search: keep leaf matches, groups whose label or any child matches
    const visibleSections = useMemo(() => {
        if (!q) return sections;
        return sections
            .map((sec) => ({
                ...sec,
                items: sec.items
                    .map((it) => {
                        if (it.children) {
                            const labelHit = it.label.toLowerCase().includes(q);
                            const kids = labelHit ? it.children : it.children.filter((c) => c.label.toLowerCase().includes(q));
                            return kids.length ? { ...it, children: kids } : null;
                        }
                        return it.label.toLowerCase().includes(q) ? it : null;
                    })
                    .filter(Boolean) as SideNavItem[],
            }))
            .filter((sec) => sec.items.length > 0);
    }, [sections, q]);

    // Open the group that contains the current route whenever the route changes
    useEffect(() => {
        const active: string[] = [];
        sections.forEach((s) =>
            s.items.forEach((it) => {
                if (it.children?.some((c) => matches(pathname, c.to, c.end))) active.push(it.key || it.label);
            })
        );
        if (active.length) setOpenKeys((prev) => Array.from(new Set([...prev, ...active])));
    }, [pathname, sections]);

    const toggle = (key: string) => setOpenKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

    return (
        <div className={`flex h-full min-h-0 flex-col ${className}`}>
            {header && <div className="px-4 pt-3">{header}</div>}

            {searchable && (
                <div className="px-4 pb-2 pt-2">
                    <div className="group relative">
                        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                        </svg>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs font-medium text-slate-700 placeholder:text-slate-400 transition-all focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/10 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-200 dark:focus:bg-slate-900"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-[10px] text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700" title="Clear">
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            )}

            <nav aria-label="Sidebar" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.300)_transparent] dark:[scrollbar-color:theme(colors.slate.700)_transparent]">
                {visibleSections.length === 0 && <p className="px-3 py-8 text-center text-xs font-medium text-slate-400">{emptyText}</p>}

                {visibleSections.map((section, si) => (
                    <div key={section.title || si} className={si === 0 ? 'pt-1' : 'pt-4'}>
                        {section.title && (
                            <div className="mb-1.5 flex select-none items-center gap-2 px-3">
                                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{section.title}</span>
                                <span className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-800" />
                            </div>
                        )}

                        <ul className="space-y-0.5">
                            {section.items.map((item) => {
                                const key = item.key || item.label;

                                // ── Leaf link ──
                                if (!item.children && item.action) {
                                    return (
                                        <li key={key}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    item.action?.();
                                                    onNavigate?.();
                                                }}
                                                className="group relative flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-[13px] font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-100/80 hover:text-slate-900"
                                            >
                                                {item.icon && <IconTile active={false}>{item.icon}</IconTile>}
                                                <span className="truncate">{item.label}</span>
                                                <svg className="ml-auto h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-brand" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                                </svg>
                                            </button>
                                        </li>
                                    );
                                }
                                if (!item.children) {
                                    if (!item.to) return null;
                                    const active = matches(pathname, item.to, item.end);
                                    if (item.variant === 'back') {
                                        return (
                                            <li key={key} className="mb-2">
                                                <NavLink
                                                    to={item.to}
                                                    onClick={onNavigate}
                                                    className="group flex items-center gap-2.5 rounded-xl border border-brand/20 bg-brand/[0.06] px-3 py-2.5 text-sm font-bold text-brand transition-all hover:bg-brand/10 dark:border-brand-400/20 dark:bg-brand-500/10 dark:text-brand-300"
                                                >
                                                    <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="truncate">{item.label}</span>
                                                </NavLink>
                                            </li>
                                        );
                                    }
                                    return (
                                        <li key={key}>
                                            <NavLink
                                                to={item.to}
                                                end={item.end}
                                                onClick={onNavigate}
                                                className={`group relative flex items-center gap-3 rounded-xl px-2 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
                                                    active ? 'bg-brand/[0.08] text-brand dark:bg-brand-500/10 dark:text-brand-300' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                                                }`}
                                            >
                                                {active && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand dark:bg-brand-400" />}
                                                {item.icon && <IconTile active={active}>{item.icon}</IconTile>}
                                                <span className="truncate">{item.label}</span>
                                                {item.badge !== undefined && <Badge value={item.badge} />}
                                            </NavLink>
                                        </li>
                                    );
                                }

                                // ── Expandable group ──
                                const groupActive = item.children.some((c) => matches(pathname, c.to, c.end));
                                const open = !!q || openKeys.includes(key);
                                return (
                                    <li key={key}>
                                        <button
                                            type="button"
                                            aria-expanded={open}
                                            onClick={() => toggle(key)}
                                            className={`group relative flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-[13px] font-semibold transition-all duration-200 ${
                                                groupActive ? 'text-brand dark:text-brand-300' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                                            } ${open && !groupActive ? 'bg-slate-50 dark:bg-slate-800/30' : ''} ${groupActive ? 'bg-brand/[0.05] dark:bg-brand-500/[0.07]' : ''}`}
                                        >
                                            {groupActive && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand dark:bg-brand-400" />}
                                            {item.icon && <IconTile active={groupActive}>{item.icon}</IconTile>}
                                            <span className="truncate">{item.label}</span>
                                            {item.badge !== undefined && <Badge value={item.badge} />}
                                            <span className={item.badge !== undefined ? '' : 'ml-auto'}>
                                                <Chevron open={open} />
                                            </span>
                                        </button>

                                        <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                            <div className="overflow-hidden">
                                                <ul className="relative ml-[22px] mt-1 space-y-0.5 border-l border-slate-200 pb-1 pl-3 dark:border-slate-700/70">
                                                    {item.children.map((c) => {
                                                        const subActive = matches(pathname, c.to, c.end);
                                                        return (
                                                            <li key={c.to} className="relative">
                                                                <span className={`absolute -left-[15.5px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ring-2 ring-white transition-colors dark:ring-[#060818] ${subActive ? 'bg-brand dark:bg-brand-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                                <NavLink
                                                                    to={c.to}
                                                                    end={c.end}
                                                                    onClick={onNavigate}
                                                                    tabIndex={open ? 0 : -1}
                                                                    className={`flex items-center rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-all duration-150 ${
                                                                        subActive ? 'bg-brand/[0.08] font-bold text-brand dark:bg-brand-500/10 dark:text-brand-300' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                                                                    }`}
                                                                >
                                                                    <span className="truncate">{c.label}</span>
                                                                    {c.badge !== undefined && <Badge value={c.badge} />}
                                                                </NavLink>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>
        </div>
    );
};

export default SideNav;
