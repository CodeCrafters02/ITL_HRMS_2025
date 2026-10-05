import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Tone, TONES } from './Layout';

const AVATAR_TONES = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700'];

interface AvatarProps {
    name: string;
    src?: string | null;
    size?: 'sm' | 'md';
    square?: boolean;
}

/** Image when available, otherwise initials on a colour picked from the name. */
export const Avatar = ({ name, src, size = 'md', square }: AvatarProps) => {
    const label = (name || '?').trim();
    const initials =
        label
            .split(/[\s._@-]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join('') || '?';
    const tone = AVATAR_TONES[[...label].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES.length];
    const dimensions = size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-10 w-10 text-xs';
    const shape = square ? 'rounded-lg' : 'rounded-full';
    return src ? (
        <img src={src} alt={label} className={`${dimensions} ${shape} shrink-0 object-cover ring-1 ring-slate-200 dark:ring-white/10`} />
    ) : (
        <span className={`${dimensions} ${shape} ${tone} flex shrink-0 items-center justify-center font-bold`}>{initials}</span>
    );
};

/** Avatar plus a primary line and an optional secondary line, for table cells and lists. */
export const Identity = ({ name, secondary, src, square }: { name: string; secondary?: ReactNode; src?: string | null; square?: boolean }) => (
    <div className="flex min-w-0 items-center gap-3">
        <Avatar name={name} src={src} square={square} />
        <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900 dark:text-white">{name}</p>
            {secondary && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{secondary}</p>}
        </div>
    </div>
);

export const Badge = ({ tone = 'neutral', dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) => (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONES[tone].soft}`}>
        {dot && <span className={`h-1.5 w-1.5 rounded-full ${TONES[tone].dot}`} />}
        {children}
    </span>
);

const ROLE_TONES: Record<string, Tone> = { master: 'violet', admin: 'primary', employee: 'neutral' };

export const RoleBadge = ({ role }: { role: string }) => <Badge tone={ROLE_TONES[role] || 'neutral'}>{role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown'}</Badge>;

export const StatusBadge = ({ active }: { active: boolean }) => (
    <Badge tone={active ? 'success' : 'danger'} dot>
        {active ? 'Active' : 'Inactive'}
    </Badge>
);

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
    tone?: 'primary' | 'danger';
}

/** Small square action button for table rows. `label` is the tooltip and the accessible name. */
export const IconButton = ({ label, tone = 'primary', className = '', children, ...props }: IconButtonProps) => (
    <button
        type="button"
        title={label}
        aria-label={label}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 ${
            tone === 'danger' ? 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10' : 'hover:bg-primary/10 hover:text-primary'
        } ${className}`}
        {...props}
    >
        {children}
    </button>
);

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: ReactNode;
    action?: ReactNode;
}

export const EmptyState = ({ title, description, icon, action }: EmptyStateProps) => (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        {icon && <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">{icon}</div>}
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);
