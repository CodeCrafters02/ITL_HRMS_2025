import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { initTeams, landingPath, teamsSignIn, TeamsPage } from '../../utils/teams';
import { isSessionValid } from '../../utils/sessionManager';

const PAGES: TeamsPage[] = ['home', 'leave', 'payslips', 'attendance', 'calendar'];

const TeamsLaunch = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [error, setError] = useState(sessionStorage.getItem('teams_sso_error') || '');
    const [busy, setBusy] = useState(false);
    const page = (PAGES.includes(params.get('page') as TeamsPage) ? params.get('page') : 'home') as TeamsPage;

    const go = () => navigate(landingPath(page, localStorage.getItem('user_role')), { replace: true });

    useEffect(() => {
        if (localStorage.getItem('access_token') && isSessionValid()) go();
    }, []);

    const retry = async () => {
        setBusy(true);
        setError('');
        try {
            if (!(await initTeams())) throw new Error('This page must be opened from the HRMS app in Microsoft Teams.');
            await teamsSignIn();
            sessionStorage.removeItem('teams_sso_error');
            go();
        } catch (e: any) {
            setError(e?.message || 'Sign-in failed');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-white px-6 dark:bg-[#060818]">
            <div className="w-full max-w-md rounded-lg border border-white-light p-8 text-center dark:border-[#1b2e4b]">
                <h2 className="mb-2 text-xl font-bold dark:text-white">HRMS for Microsoft Teams</h2>
                {error ? (
                    <>
                        <div className="mb-5 rounded-md border border-danger/20 bg-danger/10 p-3 text-left text-sm text-danger">{error}</div>
                        <button type="button" className="btn btn-primary w-full" onClick={retry} disabled={busy}>
                            {busy ? 'Signing in…' : 'Try again'}
                        </button>
                        <Link to="/auth/boxed-signin" className="mt-3 block text-xs text-primary hover:underline">
                            Use another sign-in method
                        </Link>
                    </>
                ) : (
                    <div className="my-4 flex flex-col items-center gap-3">
                        <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-sm text-gray-500">Signing you in with your Teams account…</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamsLaunch;
