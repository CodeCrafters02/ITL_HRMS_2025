import { Fragment, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import IconX from '../Icon/IconX';

interface MasterModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    size?: 'md' | 'lg' | 'xl';
    children: ReactNode;
}

const SIZES = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

/** Dialog shell. Closes with the X button or Escape; clicking the backdrop is ignored so forms are not lost by accident. */
export const MasterModal = ({ open, onClose, title, description, size = 'lg', children }: MasterModalProps) => (
    <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => {}}>
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                <div className="fixed inset-0 bg-slate-900/60" aria-hidden="true" />
            </Transition.Child>
            <div className="fixed inset-0 overflow-y-auto" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
                <div className="flex min-h-full items-center justify-center p-4">
                    <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                        <div className={`w-full ${SIZES[size]} overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-xl dark:border-[#1b2e4b] dark:bg-[#0e1726] dark:text-slate-300`}>
                            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-white/5">
                                <div className="min-w-0">
                                    <Dialog.Title className="text-base font-bold text-slate-900 dark:text-white">{title}</Dialog.Title>
                                    {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
                                </div>
                                <button type="button" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white" onClick={onClose} aria-label="Close">
                                    <IconX className="h-5 w-5" />
                                </button>
                            </div>
                            {children}
                        </div>
                    </Transition.Child>
                </div>
            </div>
        </Dialog>
    </Transition>
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
                            state === 'todo' ? 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400' : 'bg-primary text-white'
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
