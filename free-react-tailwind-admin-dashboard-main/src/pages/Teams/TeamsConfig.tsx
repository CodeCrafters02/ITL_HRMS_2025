import { useEffect, useState } from 'react';
import { pages } from '@microsoft/teams-js';
import { initTeams, TeamsPage } from '../../utils/teams';

const OPTIONS: { value: TeamsPage; label: string }[] = [
    { value: 'home', label: 'HRMS Home' },
    { value: 'calendar', label: 'Company Calendar' },
    { value: 'leave', label: 'Leave' },
    { value: 'attendance', label: 'Attendance' },
];

const TeamsConfig = () => {
    const [page, setPage] = useState<TeamsPage>('home');
    const [ready, setReady] = useState(false);

    useEffect(() => {
        initTeams().then((ok) => {
            if (!ok) return;
            setReady(true);
            pages.config.setValidityState(true);
        });
    }, []);

    useEffect(() => {
        if (!ready) return;
        pages.config.registerOnSaveHandler((evt) => {
            const label = OPTIONS.find((o) => o.value === page)?.label || 'HRMS';
            const url = `${window.location.origin}/teams/launch?page=${page}&inTeams=1`;
            pages.config
                .setConfig({ entityId: `hrms-${page}`, contentUrl: url, websiteUrl: `${window.location.origin}/teams/launch?page=${page}`, suggestedDisplayName: label })
                .then(() => evt.notifySuccess())
                .catch((e) => evt.notifyFailure(String(e)));
        });
    }, [ready, page]);

    return (
        <div className="min-h-screen bg-white p-6 dark:bg-[#060818]">
            <h2 className="mb-1 text-lg font-bold dark:text-white">Add HRMS to this channel</h2>
            <p className="mb-5 text-sm text-gray-500">Choose which HRMS page this tab should show.</p>
            {!ready && <p className="mb-4 text-sm text-warning">Open this page from Microsoft Teams to configure the tab.</p>}
            <div className="space-y-2">
                {OPTIONS.map((o) => (
                    <label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-md border border-white-light p-3 dark:border-[#1b2e4b] dark:text-white-light">
                        <input type="radio" name="hrms-page" className="form-radio" checked={page === o.value} onChange={() => setPage(o.value)} />
                        {o.label}
                    </label>
                ))}
            </div>
        </div>
    );
};

export default TeamsConfig;
