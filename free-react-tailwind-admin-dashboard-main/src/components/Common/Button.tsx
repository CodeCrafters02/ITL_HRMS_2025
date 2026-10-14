import React from 'react';

export type ButtonVariant = 'primary' | 'outline' | 'secondary' | 'danger' | 'outline-danger' | 'success' | 'outline-success' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const base =
    'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] [&>svg]:shrink-0';

const sizes: Record<ButtonSize, string> = {
    xs: 'h-7 rounded-lg px-2.5 text-[11px] [&>svg]:h-3 [&>svg]:w-3',
    sm: 'h-8 rounded-lg px-3 text-xs [&>svg]:h-3.5 [&>svg]:w-3.5',
    md: 'h-10 rounded-xl px-4 text-sm [&>svg]:h-4 [&>svg]:w-4',
    lg: 'h-11 rounded-xl px-6 text-sm [&>svg]:h-5 [&>svg]:w-5',
};

const variants: Record<ButtonVariant, string> = {
    primary: 'bg-gradient-to-r from-brand to-brand-mid text-white shadow-sm shadow-brand/25 hover:shadow-md hover:shadow-brand/30 hover:brightness-110 focus-visible:ring-brand/25',
    secondary: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-300/40 dark:border-slate-700 dark:bg-[#121e32] dark:text-slate-200 dark:hover:bg-slate-800',
    outline: 'border border-brand/40 bg-transparent text-brand hover:bg-brand hover:text-white focus-visible:ring-brand/20 dark:border-brand-400/40 dark:text-brand-300 dark:hover:bg-brand-500 dark:hover:text-white',
    danger: 'bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-sm shadow-rose-600/25 hover:shadow-md hover:brightness-110 focus-visible:ring-rose-500/25',
    'outline-danger': 'border border-rose-500/40 bg-transparent text-rose-600 hover:bg-rose-600 hover:text-white focus-visible:ring-rose-500/20 dark:text-rose-400',
    success: 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm shadow-emerald-600/25 hover:shadow-md hover:brightness-110 focus-visible:ring-emerald-500/25',
    'outline-success': 'border border-emerald-500/40 bg-transparent text-emerald-600 hover:bg-emerald-600 hover:text-white focus-visible:ring-emerald-500/20 dark:text-emerald-400',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300/40 dark:text-slate-300 dark:hover:bg-slate-800',
};

const Spinner = () => <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, fullWidth, className = '', disabled, children, type = 'button', ...rest }, ref) => (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
            {...rest}
        >
            {loading ? <Spinner /> : leftIcon}
            {children}
            {!loading && rightIcon}
        </button>
    )
);
Button.displayName = 'Button';

/* Compact square icon button for table rows / toolbars */
export type IconButtonTone = 'primary' | 'danger' | 'success' | 'warning' | 'neutral';

const tones: Record<IconButtonTone, string> = {
    primary: 'text-brand hover:bg-brand hover:text-white dark:text-brand-300',
    danger: 'text-rose-600 hover:bg-rose-600 hover:text-white dark:text-rose-400',
    success: 'text-emerald-600 hover:bg-emerald-600 hover:text-white dark:text-emerald-400',
    warning: 'text-amber-600 hover:bg-amber-500 hover:text-white dark:text-amber-400',
    neutral: 'text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white',
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    tone?: IconButtonTone;
    size?: 'sm' | 'md';
    label?: string; // accessible name; also used as tooltip
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({ tone = 'primary', size = 'md', label, title, className = '', type = 'button', children, ...rest }, ref) => (
    <button
        ref={ref}
        type={type}
        aria-label={label || (typeof title === 'string' ? title : undefined)}
        title={title || label}
        className={`inline-flex items-center justify-center rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-40 ${
            size === 'sm' ? 'h-7 w-7 [&>svg]:h-3.5 [&>svg]:w-3.5' : 'h-8 w-8 [&>svg]:h-4 [&>svg]:w-4'
        } ${tones[tone]} ${className}`}
        {...rest}
    >
        {children}
    </button>
));
IconButton.displayName = 'IconButton';

export default Button;
