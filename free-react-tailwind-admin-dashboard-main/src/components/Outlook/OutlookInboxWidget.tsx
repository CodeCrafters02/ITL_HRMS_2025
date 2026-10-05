import { FC } from 'react';
import { Link } from 'react-router-dom';
import { outlookPath } from '../../services/outlookMail';
import IconOutlook from '../Icon/IconOutlook';
import OutlookMailList from './OutlookMailList';
import { useOutlookInbox } from '../../services/outlookService';

const OutlookInboxWidget: FC<{ className?: string }> = ({ className = '' }) => {
    const { data, loading, error, refresh } = useOutlookInbox();

    return (
        <div className={`panel !p-0 ${className}`}>
            <div className="flex items-center justify-between border-b border-white-light px-5 py-4 dark:border-[#1b2e4b]">
                <h5 className="flex items-center gap-2 text-lg font-semibold dark:text-white-light">
                    <IconOutlook size={22} /> Outlook Inbox
                    {data?.connected && data.unread_count > 0 && <span className="badge bg-primary/10 text-primary">{data.unread_count} unread</span>}
                </h5>
                <div className="flex items-center gap-3 text-xs">
                    <button type="button" onClick={refresh} disabled={loading} className="text-gray-500 hover:text-primary disabled:opacity-50">
                        {loading ? 'Refreshing…' : 'Refresh'}
                    </button>
                    {data?.connected && (
                        <Link to={outlookPath()} className="text-primary hover:underline">
                            Open mailbox
                        </Link>
                    )}
                </div>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
                <OutlookMailList data={data} loading={loading} error={error} limit={10} />
            </div>
        </div>
    );
};

export default OutlookInboxWidget;
