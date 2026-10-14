import { FC } from 'react';
import { Link } from 'react-router-dom';
import { outlookPath } from '../../services/outlookMail';
import IconOutlook from '../Icon/IconOutlook';
import OutlookMailList from './OutlookMailList';
import { useOutlookInbox } from '../../services/outlookService';

interface OutlookInboxWidgetProps {
    className?: string;
    showLoggedInUser?: boolean;
    maxHeight?: string;
    limit?: number;
}

const OutlookInboxWidget: FC<OutlookInboxWidgetProps> = ({
    className = '',
    showLoggedInUser = true,
    maxHeight = 'max-h-[460px]',
    limit = 10,
}) => {
    const { data, loading, error, refresh } = useOutlookInbox();

    const fullName = [localStorage.getItem('first_name'), localStorage.getItem('last_name')].filter(Boolean).join(' ');
    const username = localStorage.getItem('username') || '';
    const userEmail = localStorage.getItem('user_email') || (username.includes('@') ? username : '');
    const userRole = (localStorage.getItem('user_role') || 'Admin').toUpperCase();
    const displayName = fullName || username.split('@')[0] || 'Administrator';
    const initials = (fullName || username)
        .split(/[.\s@_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('') || 'A';

    return (
        <div className={`panel !p-0 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm bg-white dark:bg-[#0e1726] flex flex-col justify-between ${className}`}>
            {/* Header: Title, Unread Count & Actions */}
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0b1320]/60">
                <h5 className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white">
                    <IconOutlook size={22} />
                    <span>Outlook Inbox</span>
                    {data?.connected && (
                        <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                data.unread_count > 0
                                    ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                        >
                            {data.unread_count > 0 ? `${data.unread_count} unread` : 'Inbox clear'}
                        </span>
                    )}
                </h5>
                <div className="flex items-center gap-3 text-xs">
                    <button
                        type="button"
                        onClick={() => refresh()}
                        disabled={loading}
                        className="text-slate-500 hover:text-primary disabled:opacity-50 font-medium flex items-center gap-1 transition-colors"
                        title="Refresh inbox"
                    >
                        <svg
                            className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
                    </button>
                    {data?.connected && (
                        <Link
                            to={outlookPath()}
                            className="text-primary hover:underline font-semibold flex items-center gap-0.5"
                        >
                            <span>Open Mailbox</span>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    )}
                </div>
            </div>

            {/* Logged-in User Profile Bar */}
            {showLoggedInUser && (
                <div className="px-5 py-3.5 bg-gradient-to-r from-brand-50/70 via-brand-50/40 to-slate-50/50 dark:from-slate-900/60 dark:via-slate-800/40 dark:to-slate-900/40 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white dark:ring-slate-800">
                                {initials}
                            </div>
                            <span
                                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800"
                                title="Active session"
                            />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {displayName}
                                </h4>
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">
                                    {userRole}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={userEmail}>
                                {userEmail || 'Active session'}
                            </p>
                        </div>
                    </div>
                    {data?.connected && (
                        <Link
                            to={`${outlookPath()}?compose=1`}
                            className="btn btn-sm btn-primary rounded-xl px-3 py-1.5 flex items-center gap-1.5 shrink-0 shadow-xs hover:shadow-sm text-xs font-semibold"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Compose</span>
                        </Link>
                    )}
                </div>
            )}

            {/* Email Message List */}
            <div className={`flex-1 min-h-0 ${maxHeight} overflow-y-auto`}>
                <OutlookMailList data={data} loading={loading} error={error} limit={limit} />
            </div>

            {/* Footer Status */}
            <div className="p-3 px-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b1320]/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="truncate">
                    Connected: <strong className="text-slate-700 dark:text-slate-300">{userEmail || displayName}</strong>
                </span>
                <span className="shrink-0 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Sync
                </span>
            </div>
        </div>
    );
};

export default OutlookInboxWidget;
