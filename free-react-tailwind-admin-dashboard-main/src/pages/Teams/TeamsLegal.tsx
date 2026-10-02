const CONTENT = {
    privacy: {
        title: 'Privacy Statement — HRMS for Microsoft Teams',
        body: [
            'The HRMS Teams app signs you in with your Microsoft work account and shows the same HR data you can already access in the HRMS web portal.',
            'With your organisation’s consent, HRMS reads your Outlook mail and calendar through Microsoft Graph to display them on your dashboard. This data is shown to you only and is not stored by HRMS, except an encrypted Microsoft refresh token used to keep the connection active.',
            'You can disconnect at any time by signing out of HRMS. For data requests contact your HR administrator.',
        ],
    },
    terms: {
        title: 'Terms of Use — HRMS for Microsoft Teams',
        body: [
            'The HRMS Teams app is provided by Innovyx Tech Labs for use by employees of organisations licensed to use HRMS.',
            'Use of the app is subject to your organisation’s HR and IT policies. Do not share information shown in the app outside your organisation.',
        ],
    },
};

const TeamsLegal = ({ kind }: { kind: keyof typeof CONTENT }) => {
    const c = CONTENT[kind];
    return (
        <div className="mx-auto min-h-screen max-w-2xl bg-white p-8 dark:bg-[#060818] dark:text-white-light">
            <h1 className="mb-4 text-2xl font-bold">{c.title}</h1>
            {c.body.map((p) => (
                <p key={p} className="mb-3 text-sm leading-6">
                    {p}
                </p>
            ))}
        </div>
    );
};

export default TeamsLegal;
