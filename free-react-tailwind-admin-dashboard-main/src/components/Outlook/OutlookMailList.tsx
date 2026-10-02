import { FC } from 'react';
import { Link } from 'react-router-dom';
import { clearAllSessionData } from '../../utils/sessionManager';
import { OutlookInbox, formatMailTime } from '../../services/outlookService';

interface Props {
    data: OutlookInbox | null;
    loading: boolean;
    error: string;
    limit?: number;
}

export const OutlookConnectPrompt: FC = () => (
    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p className="mb-3">Sign in again with Microsoft so your Outlook inbox can show here.</p>
        <Link to="/auth/boxed-signin" onClick={() => clearAllSessionData()} className="btn btn-primary btn-sm mx-auto w-fit">
            Reconnect with Microsoft
        </Link>
    </div>
);

const OutlookMailList: FC<Props> = ({ data, loading, error, limit = 10 }) => {
    if (!data && loading) return <div className="p-4 text-center text-sm text-gray-500">Loading mail…</div>;
    if (error && !data) return <div className="p-4 text-center text-sm text-danger">{error}</div>;
    if (!data?.connected) return <OutlookConnectPrompt />;
    if (!data.messages.length) return <div className="p-4 text-center text-sm text-gray-500">Your inbox is empty.</div>;

    return (
        <ul className="divide-y divide-white-light dark:divide-[#1b2e4b]">
            {data.messages.slice(0, limit).map((m) => (
                <li key={m.id}>
                    <a href={m.web_link} target="_blank" rel="noopener noreferrer" className="flex gap-3 px-4 py-3 hover:bg-primary/5 dark:hover:bg-[#1b2e4b]/60">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${m.is_read ? 'bg-transparent' : 'bg-primary'}`} />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                                <span className={`truncate text-sm ${m.is_read ? 'text-gray-600 dark:text-gray-400' : 'font-semibold text-dark dark:text-white'}`}>
                                    {m.from_name}
                                </span>
                                <span className="shrink-0 text-[11px] text-gray-400">{formatMailTime(m.received_at)}</span>
                            </div>
                            <p className={`truncate text-[13px] ${m.is_read ? 'text-gray-500' : 'font-medium text-dark dark:text-white-light'}`}>
                                {m.importance === 'high' && <span className="text-danger">! </span>}
                                {m.has_attachments && '📎 '}
                                {m.subject}
                            </p>
                            <p className="truncate text-xs text-gray-400">{m.preview}</p>
                        </div>
                    </a>
                </li>
            ))}
        </ul>
    );
};

export default OutlookMailList;
