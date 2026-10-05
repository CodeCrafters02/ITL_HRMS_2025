import { FC } from 'react';
import { Link } from 'react-router-dom';
import IconOutlook from '../Icon/IconOutlook';
import { useOutlookInbox } from '../../services/outlookService';
import { outlookPath } from '../../services/outlookMail';

const OutlookHeaderButton: FC<{ isRtl?: boolean }> = () => {
    const { data } = useOutlookInbox();
    const unread = data?.connected ? data.unread_count : 0;

    return (
        <Link
            to={outlookPath()}
            title={unread > 0 ? `Outlook mail (${unread} unread)` : 'Outlook mail'}
            aria-label="Outlook mail"
            className="relative block shrink-0 rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 dark:bg-dark/40 dark:hover:bg-dark/60"
        >
            <IconOutlook />
            {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] leading-[18px] text-center font-semibold">{unread > 99 ? '99+' : unread}</span>
            )}
        </Link>
    );
};

export default OutlookHeaderButton;
