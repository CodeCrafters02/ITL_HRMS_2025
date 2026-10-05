import { ReactNode } from 'react';
import IconSearch from '../Icon/IconSearch';
import IconX from '../Icon/IconX';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const SearchInput = ({ value, onChange, placeholder = 'Search...' }: SearchInputProps) => (
    <div className="relative w-full sm:w-72">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="text" className="form-input h-10 w-full rounded-lg !pl-9 !pr-9" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} aria-label={placeholder} />
        {value && (
            <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white" onClick={() => onChange('')} aria-label="Clear search">
                <IconX className="h-4 w-4" />
            </button>
        )}
    </div>
);

export interface FilterOption {
    value: string;
    label: string;
}

interface FilterSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    /** Text of the "no filter" option. Defaults to `All`. */
    allLabel?: string;
}

/** Dropdown filter. The empty value means "no filter". */
export const FilterSelect = ({ label, value, onChange, options, allLabel = 'All' }: FilterSelectProps) => (
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span className="whitespace-nowrap">{label}</span>
        <select className={`form-select h-10 w-auto min-w-[8.5rem] rounded-lg py-0 text-sm font-medium ${value ? '!border-primary/60 !text-primary' : ''}`} value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">{allLabel}</option>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    </label>
);

interface TableToolbarProps {
    /** Search box and filters */
    children: ReactNode;
    /** Shows a "Clear" link when any search or filter is applied */
    onReset?: () => void;
    canReset?: boolean;
    /** Result count text shown on the right, e.g. "57 users" */
    summary?: ReactNode;
}

export const TableToolbar = ({ children, onReset, canReset, summary }: TableToolbarProps) => (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
            {children}
            {onReset && canReset && (
                <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={onReset}>
                    Clear filters
                </button>
            )}
        </div>
        {summary && <div className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{summary}</div>}
    </div>
);
