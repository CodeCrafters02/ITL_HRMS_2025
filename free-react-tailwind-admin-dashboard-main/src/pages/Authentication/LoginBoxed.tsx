import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../store';
import { useEffect, useState } from 'react';
import { setPageTitle, toggleRTL } from '../../store/themeConfigSlice';
import IconCaretDown from '../../components/Icon/IconCaretDown';
import IconMail from '../../components/Icon/IconMail';
import IconLockDots from '../../components/Icon/IconLockDots';
import IconMicrosoft from '../../components/Icon/IconMicrosoft';
import { isSessionValid, initTabSession, recordLoginSuccess, clearAllSessionData } from '../../utils/sessionManager';

const LoginBoxed = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Login Boxed'));
    });
    const navigate = useNavigate();
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);

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


    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${API_BASE_URL}/app/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    username, 
                    password
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
                
                recordLoginSuccess(rememberMe);
                
                // Navigate based on role (replace: true prevents browser back from returning to login)
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
                setError(err.detail || 'Login failed. Please check credentials.');
            }
        } catch (error) {
            setError('Server error during login.');
        } finally {
            setLoading(false);
        }
    };

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

                recordLoginSuccess(rememberMe);

                // Navigate based on role (replace: true prevents browser back from returning to login)
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
                setError(err.detail || 'Microsoft Login failed on server.');
            }
        } catch (error) {
            setError('Server connection error during Microsoft Login.');
        } finally {
            setLoading(false);
        }
    };

    const handleMicrosoftLogin = async () => {
        if (!acceptedTerms) {
            setError('Please accept the Terms and Conditions to proceed.');
            return;
        }

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

            // Clear any old auth state and set in-progress marker
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

                // Aggressively close the popup window from the main window that opened it
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

            // 1. BroadcastChannel listener (direct same-origin channel)
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

            // 2. Storage event listener (fires across tabs/popups on the same origin)
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

            // 3. postMessage listener (fallback for direct opener postMessage)
            const handleMessage = (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;
                if (event.data?.type === 'MS_AUTH_CODE' && event.data?.code) {
                    onAuthReceived(event.data.code);
                } else if (event.data?.type === 'MS_AUTH_ERROR' && event.data?.error) {
                    onAuthReceived(undefined, event.data.error);
                }
            };
            window.addEventListener('message', handleMessage);

            // 4. Active polling of localStorage (100% reliable regardless of COOP / window.opener loss)
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

            // 5. Watch for popup closure by user (with grace period to avoid false positives during cross-origin auth)
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

            return;
        } catch (error) {
            setError('Server connection error while initiating Microsoft Sign-in.');
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="absolute inset-0">
                <img src="/assets/images/auth/bg-gradient.png" alt="image" className="h-full w-full object-cover" />
            </div>

            <div className="relative flex min-h-screen items-center justify-center bg-[url(/assets/images/auth/map.png)] bg-cover bg-center bg-no-repeat px-6 py-10 dark:bg-[#060818] sm:px-16">
                <img src="/assets/images/auth/coming-soon-object1.png" alt="image" className="absolute left-0 top-1/2 h-full max-h-[893px] -translate-y-1/2" />
                <img src="/assets/images/auth/coming-soon-object2.png" alt="image" className="absolute left-24 top-0 h-40 md:left-[30%]" />
                <img src="/assets/images/auth/coming-soon-object3.png" alt="image" className="absolute right-0 top-0 h-[300px]" />
                <img src="/assets/images/auth/polygon-object.svg" alt="image" className="absolute bottom-0 end-[28%]" />
                <div className="relative w-full max-w-[870px] rounded-md bg-[linear-gradient(45deg,#fff9f9_0%,rgba(255,255,255,0)_25%,rgba(255,255,255,0)_75%,_#fff9f9_100%)] p-2 dark:bg-[linear-gradient(52.22deg,#0E1726_0%,rgba(14,23,38,0)_18.66%,rgba(14,23,38,0)_51.04%,rgba(14,23,38,0)_80.07%,#0E1726_100%)]">
                    <div className="relative flex flex-col justify-center rounded-md bg-white/60 backdrop-blur-lg dark:bg-black/50 px-6 lg:min-h-[758px] py-20">

                        <div className="mx-auto w-full max-w-[440px]">
                            <div className="mb-10">
                                <h1 className="text-3xl font-extrabold uppercase !leading-snug text-primary md:text-4xl">Sign in</h1>
                                <p className="text-base font-bold leading-normal text-white-dark">Enter your username and password to login</p>
                            </div>
                            <form className="space-y-5 dark:text-white" onSubmit={submitForm}>
                                <div>
                                    <label htmlFor="Username">Username / Email</label>
                                    <div className="relative text-white-dark">
                                        <input 
                                            id="Username" 
                                            type="text" 
                                            placeholder="Enter Username" 
                                            className="form-input ps-10 placeholder:text-white-dark" 
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                        />
                                        <span className="absolute start-4 top-1/2 -translate-y-1/2">
                                            <IconMail fill={true} />
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="Password">Password</label>
                                    <div className="relative text-white-dark">
                                        <input 
                                            id="Password" 
                                            type="password" 
                                            placeholder="Enter Password" 
                                            className="form-input ps-10 placeholder:text-white-dark" 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <span className="absolute start-4 top-1/2 -translate-y-1/2">
                                            <IconLockDots fill={true} />
                                        </span>
                                    </div>
                                </div>
                                {error && <div className="text-danger font-semibold">{error}</div>}
                                <div>
                                    <label className="flex cursor-pointer items-center">
                                        <input 
                                            type="checkbox" 
                                            className="form-checkbox bg-white dark:bg-black" 
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                        />
                                        <span className="text-white-dark">Remember me</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="flex cursor-pointer items-center">
                                        <input 
                                            type="checkbox" 
                                            className="form-checkbox bg-white dark:bg-black" 
                                            checked={acceptedTerms}
                                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                                            required
                                        />
                                        <span className="text-white-dark">I agree to the <Link to="/privacy-policy" className="text-primary hover:underline ml-1">Terms and Conditions</Link></span>
                                    </label>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={loading || !acceptedTerms} 
                                    className={`btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)] ${(!acceptedTerms) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {loading ? 'Signing in...' : 'Sign in'}
                                </button>
                            </form>
                            <div className="relative my-7 text-center md:mb-9">
                                <span className="absolute inset-x-0 top-1/2 h-px w-full -translate-y-1/2 bg-white-light dark:bg-white-dark"></span>
                                <span className="relative bg-white px-2 font-bold uppercase text-white-dark dark:bg-dark dark:text-white-light">or</span>
                            </div>
                            <div className={`mb-10 md:mb-[60px] flex justify-center ${!acceptedTerms ? 'pointer-events-none opacity-50' : ''}`}>
                                <button
                                    type="button"
                                    onClick={handleMicrosoftLogin}
                                    disabled={loading || !acceptedTerms}
                                    className="flex items-center justify-center gap-3 px-5 py-2.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1b2e4b] hover:bg-gray-50 dark:hover:bg-[#233857] text-[#5e5e5e] dark:text-white font-semibold text-sm shadow-sm transition-all duration-200"
                                    title="Sign in with Microsoft"
                                >
                                    <IconMicrosoft size={20} />
                                    <span>{loading ? 'Signing in with Microsoft...' : 'Sign in with Microsoft'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginBoxed;
