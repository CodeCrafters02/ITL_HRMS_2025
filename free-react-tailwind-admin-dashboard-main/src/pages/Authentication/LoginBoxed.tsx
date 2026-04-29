import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../store';
import { useEffect, useState } from 'react';
import { setPageTitle, toggleRTL } from '../../store/themeConfigSlice';
import IconCaretDown from '../../components/Icon/IconCaretDown';
import IconMail from '../../components/Icon/IconMail';
import IconLockDots from '../../components/Icon/IconLockDots';
import IconGoogle from '../../components/Icon/IconGoogle';
import { GoogleLogin } from '@react-oauth/google';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

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
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const role = localStorage.getItem('user_role');
        if (token) {
            const isRemembered = localStorage.getItem('remember_me') === 'true';
            const sessionActive = document.cookie.includes('session_active=true');
            if (isRemembered || sessionActive) {
                if (role === 'master') navigate('/master/dashboard');
                else if (role === 'admin') navigate('/admin/dashboard');
                else if (role === 'employee') navigate('/employee/dashboard');
            }
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
                body: JSON.stringify({ username, password }),
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
                
                localStorage.setItem('remember_me', rememberMe ? 'true' : 'false');
                document.cookie = "session_active=true; path=/";
                
                // Navigate based on role
                if (data.role === 'master') {
                    navigate('/master/dashboard');
                } else if (data.role === 'admin') {
                    navigate('/admin/dashboard');
                } else if (data.role === 'employee') {
                    navigate('/employee/dashboard');
                } else {
                    navigate('/master/dashboard');
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

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setLoading(true);
        setError('');
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${API_BASE_URL}/app/google-login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: credentialResponse.credential }),
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
                
                localStorage.setItem('remember_me', rememberMe ? 'true' : 'false');
                document.cookie = "session_active=true; path=/";
                
                if (data.role === 'master') {
                    navigate('/master/dashboard');
                } else if (data.role === 'admin') {
                    navigate('/admin/dashboard');
                } else if (data.role === 'employee') {
                    navigate('/employee/dashboard');
                } else {
                    navigate('/master/dashboard');
                }
            } else {
                const err = await response.json();
                setError(err.detail || 'Google Login failed on server.');
            }
        } catch (error) {
            setError('Server error during Google Login.');
        } finally {
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
                                        <span className="text-white-dark">I agree to the <button type="button" onClick={() => setIsTermsModalOpen(true)} className="text-primary hover:underline ml-1">Terms and Conditions</button></span>
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
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => {
                                        setError('Google Login failed on client.');
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms and Conditions Modal */}
            <Transition appear show={isTermsModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[51]" onClose={() => setIsTermsModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="panel border-0 p-0 rounded-2xl overflow-hidden w-full max-w-2xl text-black dark:text-white-dark bg-white dark:bg-[#0e1726]">
                                    <button
                                        type="button"
                                        onClick={() => setIsTermsModalOpen(false)}
                                        className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 outline-none"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <div className="text-lg font-black bg-[#fbfbfb] dark:bg-[#121c2c] ltr:pl-5 rtl:pr-5 py-5 ltr:pr-[50px] rtl:pl-[50px] uppercase tracking-tight text-primary">
                                        Privacy Policy for People Suite
                                    </div>
                                    <div className="p-8 max-h-[70vh] overflow-y-auto leading-relaxed text-sm">
                                        <div className="space-y-6">
                                            <div>
                                                <p className="font-bold text-gray-400 mb-2">Last Updated: April 2026</p>
                                                <p>
                                                    INNOVYX TECH LABS LLP ("we," "us," or "our") is committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, and safeguard the personal information of employees within organizations using the People Suite HRMS platform (available via Web and Mobile Application).
                                                </p>
                                            </div>

                                            <section>
                                                <h3 className="font-black text-base text-gray-800 dark:text-white uppercase mb-2">1. Information We Collect</h3>
                                                <p className="mb-2">To provide a functional HRMS experience, we collect the following types of information:</p>
                                                <ul className="list-disc ltr:pl-5 rtl:pr-5 space-y-2">
                                                    <li><span className="font-bold">Personal Identifiable Information (PII):</span> Name, Employee ID, email address, phone number, and emergency contact details.</li>
                                                    <li><span className="font-bold">Professional Data:</span> Job title, department, salary/payroll details, and tax information.</li>
                                                    <li><span className="font-bold">Attendance & Location Data:</span> When you use the mobile app to clock in/out, we may collect your precise GPS location to verify your presence at designated work sites (Geofencing).</li>
                                                    <li><span className="font-bold">Device Information:</span> IP address, device model, operating system, and unique device identifiers to ensure secure login and troubleshoot app performance.</li>
                                                </ul>
                                            </section>

                                            <section>
                                                <h3 className="font-black text-base text-gray-800 dark:text-white uppercase mb-2">2. How We Use Your Information</h3>
                                                <p className="mb-2">We use the collected data strictly for the following HR functions:</p>
                                                <ul className="list-disc ltr:pl-5 rtl:pr-5 space-y-2">
                                                    <li>Facilitating payroll processing and tax compliance.</li>
                                                    <li>Verifying attendance and leave management.</li>
                                                    <li>Enabling internal communication within your organization.</li>
                                                    <li>Ensuring the security of the portal by preventing unauthorized logins.</li>
                                                </ul>
                                            </section>

                                            <section>
                                                <h3 className="font-black text-base text-gray-800 dark:text-white uppercase mb-2">3. Data Access & Restriction</h3>
                                                <ul className="list-disc ltr:pl-5 rtl:pr-5 space-y-2">
                                                    <li><span className="font-bold">Internal Access Only:</span> People Suite is a closed-loop system. Access is strictly limited to active employees of your organization.</li>
                                                    <li>We do not sell or rent your personal data to third-party marketers.</li>
                                                    <li>Your data is accessible to your organization’s HR administrators and authorized management personnel as per your company’s internal hierarchy.</li>
                                                </ul>
                                            </section>

                                            <section>
                                                <h3 className="font-black text-base text-gray-800 dark:text-white uppercase mb-2">4. Background Location & Camera Permissions</h3>
                                                <p className="mb-2">For the mobile application to function correctly, we may request:</p>
                                                <ul className="list-disc ltr:pl-5 rtl:pr-5 space-y-2">
                                                    <li><span className="font-bold">Location:</span> Used only for attendance verification. Background location may be used if required by your employer's attendance policy during work hours.</li>
                                                    <li><span className="font-bold">Camera:</span> Used for profile picture uploads or "Selfie-Attendance" features if enabled.</li>
                                                </ul>
                                            </section>

                                            <section>
                                                <h3 className="font-black text-base text-gray-800 dark:text-white uppercase mb-2">5. Data Security</h3>
                                                <p className="mb-2">We implement industry-standard security measures, including:</p>
                                                <ul className="list-disc ltr:pl-5 rtl:pr-5 space-y-2">
                                                    <li><span className="font-bold">Encryption:</span> Data is encrypted at rest and during transit (SSL/TLS).</li>
                                                    <li><span className="font-bold">Access Control:</span> Role-based access ensures you only see data relevant to your position.</li>
                                                    <li><span className="font-bold">Server Security:</span> Data is hosted on secure servers with regular backups and firewalls.</li>
                                                </ul>
                                            </section>

                                            <section>
                                                <h3 className="font-black text-base text-gray-800 dark:text-white uppercase mb-2">6. Data Retention</h3>
                                                <p>
                                                    Your personal data is retained as long as you are an active employee of the organization. Upon your departure, data retention is governed by your Employer’s HR policy and applicable labor laws of India.
                                                </p>
                                            </section>

                                            <section className="bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-gray-100 dark:border-gray-800">
                                                <h3 className="font-black text-base text-gray-800 dark:text-white uppercase mb-3">7. Contact Us</h3>
                                                <div className="space-y-1 text-xs font-bold text-gray-500">
                                                    <p className="text-gray-800 dark:text-white uppercase">INNOVYX TECH LABS LLP</p>
                                                    <p>Address: 35 K, 42/5, Vittasandra Main Rd, Vittasandra, Bengaluru, Karnataka 560100</p>
                                                    <p>Email: <a href="mailto:info@innovyxtechlabs.com" className="text-primary hover:underline">info@innovyxtechlabs.com</a></p>
                                                    <p>Phone: +91 9113263741</p>
                                                </div>
                                            </section>
                                        </div>
                                    </div>
                                    <div className="flex justify-end items-center p-5 bg-[#fbfbfb] dark:bg-[#121c2c]">
                                        <button 
                                            type="button" 
                                            className="btn btn-primary font-black uppercase tracking-widest text-xs px-8" 
                                            onClick={() => {
                                                setAcceptedTerms(true);
                                                setIsTermsModalOpen(false);
                                            }}
                                        >
                                            I Accept
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default LoginBoxed;
