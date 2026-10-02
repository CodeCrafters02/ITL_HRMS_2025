import { FC } from 'react';
import Dropdown from '../Dropdown';
import IconOutlook from '../Icon/IconOutlook';
import OutlookMailList from './OutlookMailList';
import { useOutlookInbox } from '../../services/outlookService';

const OutlookHeaderButton: FC<{ isRtl?: boolean }> = ({ isRtl }) => {
    const { data, loading, error, refresh } = useOutlookInbox();
    const unread = data?.connected ? data.unread_count : 0;

    return (
        <div className="dropdown shrink-0">
            <Dropdown
                offset={[0, 8]}
                placement={isRtl ? 'bottom-start' : 'bottom-end'}
                btnClassName="relative block p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:bg-white-light/90 dark:hover:bg-dark/60"
                button={
                    <span title="Outlook mail" onClick={refresh}>
                        <IconOutlook />
                        {unread > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] leading-[18px] text-center font-semibold">
                                {unread > 99 ? '99+' : unread}
                            </span>
                        )}
                    </span>
                }
            >
                <div className="w-[340px] max-w-[calc(100vw-32px)] !py-0 text-dark dark:text-white-dark">
                    <div className="flex items-center justify-between border-b border-white-light px-4 py-3 dark:border-[#1b2e4b]">
                        <span className="flex items-center gap-2 font-semibold">
                            <IconOutlook size={18} /> Outlook
                            {unread > 0 && <span className="badge bg-primary/10 text-primary">{unread} unread</span>}
                        </span>
                        {data?.connected && (
                            <a href={data.inbox_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                Open inbox
                            </a>
                        )}
                    </div>
                    <div className="max-h-[380px] overflow-y-auto">
                        <OutlookMailList data={data} loading={loading} error={error} limit={8} />
                    </div>
                </div>
            </Dropdown>
        </div>
    );
};

export default OutlookHeaderButton;
