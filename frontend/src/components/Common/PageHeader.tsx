import React from 'react';

export type PageHeaderVariant = 
    | 'primary'   // Signature ITL Royal Blue / Navy
    | 'emerald'   // Workforce & Success
    | 'indigo'    // Attendance & Core Systems
    | 'purple'    // Learning & Development
    | 'amber'     // Finance & Requests
    | 'rose'      // Approvals & Compliance
    | 'cyan'      // Facilities & Analytics
    | 'slate';    // Neutral Minimal

export interface PageHeaderProps {
    title: string | React.ReactNode;
    subtitle?: string | React.ReactNode;
    icon?: React.ReactNode;
    badge?: string | React.ReactNode;
    actions?: React.ReactNode;
    stats?: React.ReactNode;
    variant?: PageHeaderVariant;
    className?: string;
    children?: React.ReactNode;
}

const variantStyles: Record<PageHeaderVariant, {
    bg: string;
    accentGlow: string;
    badgeBorder: string;
    badgeBg: string;
    badgeText: string;
    badgeDot: string;
    iconBoxBg: string;
}> = {
    primary: {
        bg: 'from-slate-950 via-[#0d1b2a] to-[#1b263b]',
        accentGlow: 'from-blue-600/30 via-indigo-500/15 to-transparent',
        badgeBorder: 'border-blue-400/30',
        badgeBg: 'bg-blue-500/15',
        badgeText: 'text-blue-200',
        badgeDot: 'bg-blue-400',
        iconBoxBg: 'bg-blue-500/20 text-blue-100 border-blue-400/30',
    },
    emerald: {
        bg: 'from-slate-950 via-[#062c21] to-[#0f3d2e]',
        accentGlow: 'from-emerald-500/30 via-teal-500/15 to-transparent',
        badgeBorder: 'border-emerald-400/30',
        badgeBg: 'bg-emerald-500/15',
        badgeText: 'text-emerald-200',
        badgeDot: 'bg-emerald-400',
        iconBoxBg: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30',
    },
    indigo: {
        bg: 'from-slate-950 via-[#1e1b4b] to-[#2e1065]',
        accentGlow: 'from-indigo-600/30 via-violet-500/15 to-transparent',
        badgeBorder: 'border-indigo-400/30',
        badgeBg: 'bg-indigo-500/15',
        badgeText: 'text-indigo-200',
        badgeDot: 'bg-indigo-400',
        iconBoxBg: 'bg-indigo-500/20 text-indigo-100 border-indigo-400/30',
    },
    purple: {
        bg: 'from-slate-950 via-[#2e1065] to-[#3b0764]',
        accentGlow: 'from-purple-600/30 via-fuchsia-500/15 to-transparent',
        badgeBorder: 'border-purple-400/30',
        badgeBg: 'bg-purple-500/15',
        badgeText: 'text-purple-200',
        badgeDot: 'bg-purple-400',
        iconBoxBg: 'bg-purple-500/20 text-purple-100 border-purple-400/30',
    },
    amber: {
        bg: 'from-slate-950 via-[#2a1b0c] to-[#3f2008]',
        accentGlow: 'from-amber-600/30 via-orange-500/15 to-transparent',
        badgeBorder: 'border-amber-400/30',
        badgeBg: 'bg-amber-500/15',
        badgeText: 'text-amber-200',
        badgeDot: 'bg-amber-400',
        iconBoxBg: 'bg-amber-500/20 text-amber-100 border-amber-400/30',
    },
    rose: {
        bg: 'from-slate-950 via-[#37111b] to-[#4c0519]',
        accentGlow: 'from-rose-600/30 via-pink-500/15 to-transparent',
        badgeBorder: 'border-rose-400/30',
        badgeBg: 'bg-rose-500/15',
        badgeText: 'text-rose-200',
        badgeDot: 'bg-rose-400',
        iconBoxBg: 'bg-rose-500/20 text-rose-100 border-rose-400/30',
    },
    cyan: {
        bg: 'from-slate-950 via-[#082f49] to-[#0c4a6e]',
        accentGlow: 'from-cyan-600/30 via-sky-500/15 to-transparent',
        badgeBorder: 'border-cyan-400/30',
        badgeBg: 'bg-cyan-500/15',
        badgeText: 'text-cyan-200',
        badgeDot: 'bg-cyan-400',
        iconBoxBg: 'bg-cyan-500/20 text-cyan-100 border-cyan-400/30',
    },
    slate: {
        bg: 'from-slate-950 via-[#0f172a] to-[#1e293b]',
        accentGlow: 'from-slate-600/30 via-slate-500/15 to-transparent',
        badgeBorder: 'border-slate-400/30',
        badgeBg: 'bg-slate-500/15',
        badgeText: 'text-slate-200',
        badgeDot: 'bg-slate-400',
        iconBoxBg: 'bg-slate-500/20 text-slate-100 border-slate-400/30',
    },
};

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    icon,
    badge,
    actions,
    stats,
    variant = 'primary',
    className = '',
    children,
}) => {
    const config = variantStyles[variant] || variantStyles.primary;

    return (
        <div
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${config.bg} p-5 sm:p-6 mb-6 text-white shadow-xl border border-white/10 dark:border-slate-800/80 transition-all duration-300 ${className}`}
        >
            {/* Ambient Corner Radial Glow */}
            <div
                className={`absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br ${config.accentGlow} blur-3xl pointer-events-none`}
            />

            {/* Subtle Tech Grid Overlay */}
            <div
                className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"
            />

            {/* Subtle Watermark Silhouette if icon is provided */}
            {icon && (
                <div className="absolute -right-6 -bottom-6 w-36 h-36 opacity-[0.06] pointer-events-none flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[1.2]">
                    {icon}
                </div>
            )}

            {/* Main Content Area */}
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                {/* Left: Icon, Badge, Title, Subtitle */}
                <div className="flex items-start gap-4">
                    {icon && (
                        <div
                            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${config.iconBoxBg} backdrop-blur-md border shadow-lg flex items-center justify-center shrink-0 [&>svg]:w-6 [&>svg]:h-6 sm:[&>svg]:w-7 sm:[&>svg]:h-7 transition-transform hover:scale-105`}
                        >
                            {icon}
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        {badge && (
                            <div className="mb-2">
                                <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-md border ${config.badgeBg} ${config.badgeBorder} ${config.badgeText} shadow-sm`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${config.badgeDot} animate-pulse`} />
                                    {badge}
                                </span>
                            </div>
                        )}

                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
                            {title}
                        </h1>

                        {subtitle && (
                            <p className="mt-1 text-xs sm:text-sm text-slate-300/90 font-medium max-w-3xl leading-relaxed">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: Actions or Custom Content */}
                {(actions || stats) && (
                    <div className="flex flex-wrap items-center gap-3 shrink-0 lg:self-center">
                        {stats && <div className="flex items-center gap-3 mr-2">{stats}</div>}
                        {actions}
                    </div>
                )}
            </div>

            {/* Bottom Injected Children (Tabs, custom filters, secondary stats) */}
            {children && <div className="relative z-10 mt-5 pt-4 border-t border-white/10">{children}</div>}
        </div>
    );
};

export default PageHeader;
