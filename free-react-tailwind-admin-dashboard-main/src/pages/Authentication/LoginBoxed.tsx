import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconLoader from '../../components/Icon/IconLoader';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import IconX from '../../components/Icon/IconX';
import peopleSuiteLogo from '../../assets/logo/hrms-logo.png';
import { isSessionValid, initTabSession, recordLoginSuccess, clearAllSessionData } from '../../utils/sessionManager';

const LoginBoxed = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        dispatch(setPageTitle('Sign In'));
    }, [dispatch]);

    // Check existing session on load
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const role = localStorage.getItem('user_role');
        const valid = isSessionValid();

        if (token && valid) {
            initTabSession();
            if (role === 'master') navigate('/master/dashboard', { replace: true });
            else if (role === 'admin') navigate('/admin/hub', { replace: true });
            else if (role === 'employee') navigate('/employee/hub', { replace: true });
        } else if (token && !valid) {
            clearAllSessionData();
        }
    }, [navigate]);

    const processMicrosoftAuthCode = async (code: string) => {
        setLoading(true);
        setError('');
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            const redirectUri = window.location.origin + '/auth/callback/microsoft';

            const response = await fetch(`${API_BASE_URL}/app/microsoft-login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    redirect_uri: redirectUri,
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

                recordLoginSuccess(true);

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
                setError(err.detail || 'Microsoft authentication failed on server.');
            }
        } catch (err) {
            setError('Server connection error during Microsoft Login.');
        } finally {
            setLoading(false);
        }
    };

    const handleMicrosoftLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            const redirectUri = window.location.origin + '/auth/callback/microsoft';
            const state = 'ms_popup';

            const response = await fetch(`${API_BASE_URL}/app/microsoft-auth-url/?redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`);
            if (!response.ok) {
                const err = await response.json();
                setError(err.detail || 'Failed to initialize Microsoft Sign-in.');
                setLoading(false);
                return;
            }

            const data = await response.json();
            if (!data.auth_url) {
                setError('Microsoft authorization URL not provided by server.');
                setLoading(false);
                return;
            }

            const width = 600;
            const height = 720;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            localStorage.removeItem('ms_auth_result');
            localStorage.setItem('ms_auth_in_progress', 'true');

            const popup = window.open(
                data.auth_url,
                'ms_login_popup',
                `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
            );

            if (!popup) {
                setError('Popup window was blocked by your browser. Please allow popups for this site to sign in with Microsoft.');
                setLoading(false);
                localStorage.removeItem('ms_auth_in_progress');
                return;
            }

            let handled = false;
            let checkClosedInterval: any = null;
            let pollStorageInterval: any = null;
            let channel: BroadcastChannel | null = null;

            const cleanup = () => {
                if (checkClosedInterval) clearInterval(checkClosedInterval);
                if (pollStorageInterval) clearInterval(pollStorageInterval);
                if (channel) {
                    try {
                        channel.close();
                    } catch (e) {}
                }
                window.removeEventListener('storage', handleStorage);
                window.removeEventListener('message', handleMessage);
                localStorage.removeItem('ms_auth_in_progress');
                localStorage.removeItem('ms_auth_result');
            };

            const onAuthReceived = (code?: string, errorMsg?: string) => {
                if (handled) return;
                handled = true;
                cleanup();

                const closePopupSafely = () => {
                    try {
                        if (popup && !popup.closed) {
                            popup.close();
                        }
                    } catch (e) {}
                };
                closePopupSafely();
                setTimeout(closePopupSafely, 50);
                setTimeout(closePopupSafely, 150);
                setTimeout(closePopupSafely, 300);
                setTimeout(closePopupSafely, 600);
                setTimeout(closePopupSafely, 1000);

                if (code) {
                    processMicrosoftAuthCode(code);
                } else if (errorMsg) {
                    setError(errorMsg);
                    setLoading(false);
                } else {
                    setLoading(false);
                }
            };

            try {
                channel = new BroadcastChannel('ms_auth_channel');
                channel.onmessage = (event) => {
                    if (event.data?.code) {
                        onAuthReceived(event.data.code);
                    } else if (event.data?.error) {
                        onAuthReceived(undefined, event.data.error);
                    }
                };
            } catch (e) {}

            const handleStorage = (event: StorageEvent) => {
                if (event.key === 'ms_auth_result' && event.newValue) {
                    try {
                        const parsed = JSON.parse(event.newValue);
                        if (parsed.code) {
                            onAuthReceived(parsed.code);
                        } else if (parsed.error) {
                            onAuthReceived(undefined, parsed.error);
                        }
                    } catch (e) {}
                }
            };
            window.addEventListener('storage', handleStorage);

            const handleMessage = (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;
                if (event.data?.type === 'MS_AUTH_CODE' && event.data?.code) {
                    onAuthReceived(event.data.code);
                } else if (event.data?.type === 'MS_AUTH_ERROR' && event.data?.error) {
                    onAuthReceived(undefined, event.data.error);
                }
            };
            window.addEventListener('message', handleMessage);

            pollStorageInterval = setInterval(() => {
                const raw = localStorage.getItem('ms_auth_result');
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (parsed.code) {
                            onAuthReceived(parsed.code);
                        } else if (parsed.error) {
                            onAuthReceived(undefined, parsed.error);
                        }
                    } catch (e) {}
                }
            }, 50);

            const startTime = Date.now();
            checkClosedInterval = setInterval(() => {
                if (Date.now() - startTime > 3500) {
                    try {
                        if (popup.closed) {
                            setTimeout(() => {
                                const raw = localStorage.getItem('ms_auth_result');
                                if (raw) {
                                    try {
                                        const parsed = JSON.parse(raw);
                                        if (parsed.code) {
                                            onAuthReceived(parsed.code);
                                            return;
                                        }
                                    } catch (e) {}
                                }
                                if (!handled) {
                                    onAuthReceived(undefined, undefined);
                                }
                            }, 600);
                        }
                    } catch (e) {}
                }
            }, 1000);
        } catch (err) {
            setError('Server connection error while initiating Microsoft Sign-in.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row overflow-x-hidden font-sans m-0 p-0 bg-white">
            
            {/* ========================================================
                LEFT PANEL: Exact Matching Brand Showcase from Image
               ======================================================== */}
            <div className="w-full lg:w-[58%] xl:w-[60%] min-h-[460px] sm:min-h-[580px] lg:min-h-screen relative overflow-hidden bg-slate-100 flex items-center justify-center">
                <img
                    src="/assets/images/auth/hrms-banner.jpg"
                    alt="People Suite - Building a better workplace together"
                    className="w-full h-full object-cover object-center"
                />
            </div>

            {/* ========================================================
                RIGHT PANEL: Matching Soft Gradient & Pure White Card
               ======================================================== */}
            <div className="w-full lg:w-[42%] xl:w-[40%] min-h-[520px] lg:min-h-screen relative flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-gradient-to-br from-[#ebf3fc] via-[#f2f7fd] to-[#e4eefb] overflow-hidden">
                
                {/* Soft decorative background curves */}
                <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-blue-100/70 blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-32 -left-32 w-[420px] h-[420px] rounded-full bg-indigo-100/60 blur-3xl pointer-events-none"></div>

                {/* Floating Clean White Card */}
                <div className="relative z-10 w-full max-w-[380px] sm:max-w-[400px] rounded-3xl bg-white p-8 sm:p-10 shadow-[0_20px_50px_-10px_rgba(20,50,140,0.12),0_4px_16px_-2px_rgba(0,0,0,0.04)] border border-slate-100 text-center">
                    
                    {/* People Suite logo */}
                    <div className="flex justify-center mb-4">
                        <img src={peopleSuiteLogo} alt="People Suite" className="h-24 w-24 rounded-2xl object-cover shadow-[0_10px_24px_-6px_rgba(20,50,140,0.35)]" />
                    </div>

                    {/* Title & Subtitle */}
                    <h2 className="text-2xl font-black text-[#0f172a] tracking-tight">People Suite</h2>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8] mt-1">Powered by Innovyx</p>
                    <p className="text-xs sm:text-sm font-semibold text-[#64748b] mt-4 mb-8">
                        Sign in to your account
                    </p>

                    {/* Error Alert (if any) */}
                    {error && (
                        <div className="mb-5 flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-left">
                            <IconInfoCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                            <span className="flex-1">{error}</span>
                            <button
                                type="button"
                                onClick={() => setError('')}
                                className="text-rose-400 hover:text-rose-700 transition-colors"
                            >
                                <IconX className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Primary Sign In with Microsoft Button */}
                    <button
                        type="button"
                        onClick={handleMicrosoftLogin}
                        disabled={loading}
                        className={`w-full group relative flex items-center justify-between px-5 py-3.5 rounded-xl bg-[#0062E0] hover:bg-[#0051ba] active:scale-[0.99] text-white font-bold text-sm shadow-[0_8px_20px_-4px_rgba(0,98,224,0.38)] hover:shadow-[0_12px_24px_-4px_rgba(0,98,224,0.5)] transition-all duration-200 ${
                            loading ? 'opacity-85 cursor-wait' : ''
                        }`}
                        title="Sign in with Microsoft SSO"
                    >
                        {loading ? (
                            <div className="w-full flex items-center justify-center gap-2">
                                <IconLoader className="w-5 h-5 animate-spin text-white" />
                                <span>Connecting to Microsoft...</span>
                            </div>
                        ) : (
                            <>
                                {/* Microsoft 4-Square Color Logo */}
                                <div className="grid grid-cols-2 gap-0.5 w-4 h-4 shrink-0 p-0.5">
                                    <span className="w-1.5 h-1.5 bg-[#F25022]"></span>
                                    <span className="w-1.5 h-1.5 bg-[#7FBA00]"></span>
                                    <span className="w-1.5 h-1.5 bg-[#00A4EF]"></span>
                                    <span className="w-1.5 h-1.5 bg-[#FFB900]"></span>
                                </div>

                                {/* Button Text */}
                                <span className="tracking-tight text-white font-bold text-sm">
                                    Sign in with Microsoft
                                </span>

                                {/* Arrow Right Icon */}
                                <svg
                                    className="w-5 h-5 text-white shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                            </>
                        )}
                    </button>

                    {/* Divider Line: Secure Login */}
                    <div className="relative my-7 text-center">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <span className="relative bg-white px-3 text-[11px] font-semibold text-[#94a3b8]">
                            Secure Login
                        </span>
                    </div>

                    {/* Bottom Shield & Security Notice */}
                    <div className="flex flex-col items-center justify-center space-y-2 pt-1">
                        <div className="h-8 w-8 flex items-center justify-center text-[#0062E0]">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>
                        </div>
                        <p className="text-[11px] sm:text-xs text-[#64748b] leading-tight font-medium">
                            Your data is secure and protected<br />
                            with Microsoft.
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LoginBoxed;
