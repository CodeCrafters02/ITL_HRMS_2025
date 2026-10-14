import React from 'react';
import { useBranding } from '../../theme/brandingStore';

export interface HeroBannerProps {
    eyebrow?: React.ReactNode;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    leading?: React.ReactNode; // replaces the company logo tile (e.g. an emoji)
    showCompany?: boolean; // show company logo + name chip (default true)
    aside?: React.ReactNode; // right-hand slot (clock, quick pills, KPIs)
    children?: React.ReactNode; // bottom row inside the banner (links, tabs)
    className?: string;
}

/** Brand-coloured welcome banner for dashboards and hubs. Follows the company theme. */
export const HeroBanner: React.FC<HeroBannerProps> = ({ eyebrow, title, subtitle, leading, showCompany = true, aside, children, className = '' }) => {
    const { name, logoUrl } = useBranding();

    return (
        <div className={`relative isolate z-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand to-brand-mid text-white shadow-[0_12px_32px_-12px_rgb(var(--brand)/0.55)] ${className}`}>
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-accent/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff0d_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0d_1px,transparent_1px)] bg-[size:28px_28px]" />

            <div className="relative flex flex-col gap-5 p-5 sm:p-7 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                    {leading ? (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-2xl shadow-inner backdrop-blur-md sm:h-14 sm:w-14">{leading}</div>
                    ) : showCompany ? (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white shadow-lg sm:h-14 sm:w-14">
                            {logoUrl ? <img src={logoUrl} alt={name} className="h-full w-full object-contain p-1.5" /> : <span className="text-xl font-extrabold uppercase text-brand">{(name || 'C').charAt(0)}</span>}
                        </div>
                    ) : null}
                    <div className="min-w-0">
                        {(eyebrow || (showCompany && name)) && (
                            <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">{eyebrow || name}</p>
                        )}
                        <h1 className="mt-0.5 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">{title}</h1>
                        {subtitle && <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-white/80 sm:text-sm">{subtitle}</p>}
                    </div>
                </div>
                {aside && <div className="flex shrink-0 flex-wrap items-center gap-2.5 md:justify-end">{aside}</div>}
            </div>

            {children && <div className="relative flex flex-wrap items-center gap-2 border-t border-white/15 bg-black/10 px-5 py-3 sm:px-7">{children}</div>}
        </div>
    );
};

/** Frosted pill used inside HeroBanner `aside` / `children`. */
export const HeroPill: React.FC<React.HTMLAttributes<HTMLDivElement> & { as?: any; to?: string }> = ({ as: Tag = 'div', className = '', children, ...rest }) => (
    <Tag className={`inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/25 ${className}`} {...rest}>
        {children}
    </Tag>
);

export default HeroBanner;
