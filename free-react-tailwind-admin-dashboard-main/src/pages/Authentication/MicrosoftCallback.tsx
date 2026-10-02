import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import IconMicrosoft from '../../components/Icon/IconMicrosoft';
import { recordLoginSuccess } from '../../utils/sessionManager';

const MicrosoftCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState<string>('');
    const [status, setStatus] = useState<string>('Authenticating with Microsoft...');
    const processedRef = useRef(false);

    useEffect(() => {
        if (processedRef.current) return;
        processedRef.current = true;

        const code = searchParams.get('code');
        const oauthError = searchParams.get('error');
        const oauthErrorDesc = searchParams.get('error_description');
        const state = searchParams.get('state');

        // Check if this callback was opened as a popup
        const isPopup =
            state === 'ms_popup' ||
            window.name === 'ms_login_popup' ||
            !!window.opener ||
            localStorage.getItem('ms_auth_in_progress') === 'true' ||
            (window.outerWidth > 0 && window.outerWidth < 800) ||
            (window.innerWidth > 0 && window.innerWidth < 800);

        if (isPopup) {
            const errorMsg = oauthErrorDesc || oauthError || '';
            const payload = errorMsg
                ? { error: errorMsg }
                : { code: code || '' };

            // 1. Store auth result in localStorage for parent window polling
            try {
                localStorage.setItem('ms_auth_result', JSON.stringify({ ...payload, timestamp: Date.now() }));
            } catch (e) {}

            // 2. BroadcastChannel to notify parent window
            try {
                const channel = new BroadcastChannel('ms_auth_channel');
                channel.postMessage(payload);
                // Keep channel open briefly for message dispatch before closing
                setTimeout(() => {
                    try {
                        channel.close();
                    } catch (e) {}
                }, 2000);
            } catch (e) {}

            // 3. postMessage to window.opener if available
            try {
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage(
                        { type: errorMsg ? 'MS_AUTH_ERROR' : 'MS_AUTH_CODE', ...payload },
                        window.location.origin
                    );
                }
            } catch (e) {}

            // 4. Close popup immediately so main window can resume
            try {
                window.close();
            } catch (e) {}

            const closeInterval = setInterval(() => {
                try {
                    window.close();
                } catch (e) {}
            }, 50);

            setTimeout(() => {
                clearInterval(closeInterval);
            }, 3000);

            // Popups stop here - NEVER navigate anywhere from the popup
            return;
        }

        // Full-page fallback (only if user opened callback directly without a popup)
        if (oauthError) {
            setError(oauthErrorDesc || oauthError || 'Microsoft sign-in was canceled or failed.');
            return;
        }

        if (!code) {
            setError('No authorization code was received from Microsoft.');
            return;
        }

        const exchangeCode = async () => {
            try {
                setStatus('Exchanging credentials and verifying your account...');
                const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
                const redirect_uri = window.location.origin + '/auth/callback/microsoft';

                const response = await fetch(`${API_BASE_URL}/app/microsoft-login/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        redirect_uri,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('access_token', data.access);
                    localStorage.setItem('refresh_token', data.refresh);
                    localStorage.setItem('user_role', data.role);
                    localStorage.setItem('user_id', data.id);
                    localStorage.setItem('username', data.username);
                    localStorage.setItem('is_reporting_manager', data.is_reporting_manager ? 'true' : 'false');
                    if (data.username && String(data.username).includes('@')) {
                        localStorage.setItem('user_email', String(data.username));
                    }
                    if (data.first_name !== undefined) localStorage.setItem('first_name', data.first_name || '');
                    if (data.last_name !== undefined) localStorage.setItem('last_name', data.last_name || '');
                    if (data.ms_access_token) {
                        localStorage.setItem('ms_calendar_token', data.ms_access_token);
                        if (data.ms_refresh_token) localStorage.setItem('ms_refresh_token', data.ms_refresh_token);
                    }

                    recordLoginSuccess(false);

                    if (data.role === 'master') {
                        navigate('/master/dashboard', { replace: true });
                    } else if (data.role === 'admin') {
                        navigate('/admin/hub', { replace: true });
                    } else if (data.role === 'employee') {
                        const uid = String(data.id ?? '');
                        if (uid && !localStorage.getItem(`hrms_leave_intro_ack_${uid}`)) {
                            sessionStorage.setItem('hrms_leave_intro_pulse', '1');
                        }
                        if (uid && !localStorage.getItem(`hrms_checkin_intro_ack_${uid}`)) {
                            sessionStorage.setItem('hrms_checkin_intro_pulse', '1');
                        }
                        navigate('/employee/hub', { replace: true });
                    } else {
                        navigate('/master/dashboard', { replace: true });
                    }
                } else {
                    const err = await response.json();
                    setError(err.detail || 'Microsoft Login failed on the server.');
                }
            } catch (err: any) {
                setError('A network or server error occurred while connecting to the HRMS backend.');
            }
        };

        exchangeCode();
    }, [searchParams, navigate]);

    return (
        <div>
            <div className="absolute inset-0">
                <img src="/assets/images/auth/bg-gradient.png" alt="background" className="h-full w-full object-cover" />
            </div>

            <div className="relative flex min-h-screen items-center justify-center bg-[url(/assets/images/auth/map.png)] bg-cover bg-center bg-no-repeat px-6 py-10 dark:bg-[#060818] sm:px-16">
                <div className="relative w-full max-w-[480px] rounded-md bg-[linear-gradient(45deg,#fff9f9_0%,rgba(255,255,255,0)_25%,rgba(255,255,255,0)_75%,_#fff9f9_100%)] p-2 dark:bg-[linear-gradient(52.22deg,#0E1726_0%,rgba(14,23,38,0)_18.66%,rgba(14,23,38,0)_51.04%,rgba(14,23,38,0)_80.07%,#0E1726_100%)]">
                    <div className="relative flex flex-col justify-center items-center rounded-md bg-white/70 backdrop-blur-lg dark:bg-black/60 px-8 py-12 text-center">
                        <div className="mb-5 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 p-4 shadow-md">
                            <IconMicrosoft size={36} />
                        </div>

                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                            Microsoft Entra ID
                        </h2>

                        {!error ? (
                            <div className="flex flex-col items-center space-y-3 my-4">
                                <div className="animate-spin rounded-full h-9 w-9 border-4 border-primary border-t-transparent"></div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Authentication complete!</p>
                                <p className="text-xs text-gray-400">Closing window and returning to application...</p>
                                <button
                                    type="button"
                                    onClick={() => window.close()}
                                    className="btn btn-outline-primary btn-sm mt-3"
                                >
                                    Close Window
                                </button>
                            </div>
                        ) : (
                            <div className="my-4 w-full">
                                <div className="p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm text-left mb-6">
                                    <p className="font-bold mb-1">Sign-in Error:</p>
                                    <p>{error}</p>
                                </div>
                                <Link
                                    to="/"
                                    className="btn btn-gradient w-full uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]"
                                >
                                    Back to Sign In
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MicrosoftCallback;
