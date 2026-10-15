import { ReactNode } from 'react';
import Modal from '../Common/Modal';

interface MasterModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    size?: 'md' | 'lg' | 'xl';
    children: ReactNode;
}

const SIZES = { md: 'lg', lg: '2xl', xl: '4xl' } as const;

/** Shared Modal shell; the body is padded by ModalBody / ModalFooter so forms can pin their own button row. */
export const MasterModal = ({ open, onClose, title, description, size = 'lg', children }: MasterModalProps) => (
    <Modal open={open} onClose={onClose} title={title} subtitle={description} size={SIZES[size]} dismissible={false} bodyClassName="!p-0">
        {children}
    </Modal>
);

export const ModalBody = ({ children }: { children: ReactNode }) => <div className="px-6 py-5">{children}</div>;

/** Button row at the bottom of a modal. `start` holds a secondary action on the left (e.g. Back). */
export const ModalFooter = ({ start, children }: { start?: ReactNode; children: ReactNode }) => (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
        <div>{start}</div>
        <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
);

interface FormFieldProps {
    label: string;
    htmlFor: string;
    required?: boolean;
    hint?: string;
    /** Span both columns of a FormGrid */
    wide?: boolean;
    children: ReactNode;
}

export const FormField = ({ label, htmlFor, required, hint, wide, children }: FormFieldProps) => (
    <div className={wide ? 'sm:col-span-2' : ''}>
        <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label}
            {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
        {children}
        {hint && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
);

export const FormGrid = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;

export const FormSectionTitle = ({ children }: { children: ReactNode }) => <p className="mb-3 mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{children}</p>;

/** Step indicator for multi-step forms. */
export const Steps = ({ steps, current }: { steps: string[]; current: number }) => (
    <ol className="mb-5 flex items-center gap-3">
        {steps.map((step, index) => {
            const state = index + 1 === current ? 'current' : index + 1 < current ? 'done' : 'todo';
            return (
                <li key={step} className="flex flex-1 items-center gap-2">
                    <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                            state === 'todo' ? 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400' : 'bg-brand text-white'
                        }`}
                    >
                        {state === 'done' ? '✓' : index + 1}
                    </span>
                    <span className={`truncate text-xs font-semibold ${state === 'todo' ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>{step}</span>
                    {index < steps.length - 1 && <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />}
                </li>
            );
        })}
    </ol>
);
