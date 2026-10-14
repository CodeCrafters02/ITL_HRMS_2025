import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Common/Button';
import PageHeader from '../../components/Common/PageHeader';
import IconMenuChat from '../../components/Icon/Menu/IconMenuChat';
import { openTeamsChat } from '../../utils/teams';

/** Old in-app chat URLs (/admin/chat, /employee/chat, bookmarks) now send people to Microsoft Teams. */
const TeamsChatRedirect = ({ fallback }: { fallback: string }) => {
    const navigate = useNavigate();
    const [blocked, setBlocked] = useState(false);

    useEffect(() => {
        const opened = openTeamsChat();
        if (opened) navigate(fallback, { replace: true });
        else setBlocked(true); // popup blocker: let the user click
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            <PageHeader title="Chat has moved to Microsoft Teams" subtitle="Team conversations now happen in Teams." icon={<IconMenuChat />} />
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <p className="max-w-md text-sm font-medium text-slate-600">{blocked ? 'Your browser blocked the new tab. Use the button to open Teams.' : 'Opening Microsoft Teams…'}</p>
                <div className="flex gap-3">
                    <Button leftIcon={<IconMenuChat />} onClick={() => { openTeamsChat(); navigate(fallback, { replace: true }); }}>
                        Open Teams chat
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(fallback, { replace: true })}>
                        Back to dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TeamsChatRedirect;
