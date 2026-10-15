import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';

export interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    icon?: React.ReactNode;
    size?: ModalSize;
    footer?: React.ReactNode; // right-aligned action row, pinned to the bottom
    hideClose?: boolean;
    dismissible?: boolean; // false = backdrop click / Esc do not close
    bodyClassName?: string;
    children?: React.ReactNode;
}

const widths: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
};

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, icon, size = 'md', footer, hideClose = false, dismissible = true, bodyClassName = '', children }) => (
    <Transition appear show={open} as={Fragment}>
        <Dialog as="div" open={open} onClose={dismissible ? onClose : () => undefined} className="relative z-50">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center px-4 py-8">
                    <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                        <Dialog.Panel
                            className={`relative flex max-h-[calc(100vh-4rem)] w-full ${widths[size]} flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-slate-800 shadow-2xl dark:border-slate-800 dark:bg-[#0e1726] dark:text-slate-200`}
                        >
                            <div className="h-1 w-full shrink-0 bg-gradient-to-r from-brand via-brand-mid to-brand-accent" />

                            {(title || !hideClose) && (
                                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4 dark:border-slate-800/80 sm:px-6">
                                    <div className="flex min-w-0 items-center gap-3">
                                        {icon && (
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand dark:bg-brand-500/15 dark:text-brand-300 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
                                        )}
                                        <div className="min-w-0">
                                            {title && <Dialog.Title className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">{title}</Dialog.Title>}
                                            {subtitle && <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
                                        </div>
                                    </div>
                                    {!hideClose && (
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            aria-label="Close"
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 dark:hover:bg-slate-800 dark:hover:text-white"
                                        >
                                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className={`min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 ${bodyClassName}`}>{children}</div>

                            {footer && (
                                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-slate-200/80 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800/80 dark:bg-[#0b1320]/60 sm:px-6">{footer}</div>
                            )}
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </div>
        </Dialog>
    </Transition>
);

export default Modal;
