import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../store/themeConfigSlice';

const Terms = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Terms and Conditions'));
    });

    return (
        <div className="panel flex items-center justify-center min-h-screen bg-gray-50 dark:bg-black p-4">
            <div className="max-w-[900px] w-full bg-white dark:bg-[#0e1726] rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate__animated animate__fadeIn">
                <div className="bg-primary p-8 text-white">
                    <h1 className="text-3xl font-black uppercase tracking-tight">Privacy Policy for People Suite</h1>
                    <p className="mt-2 text-white/80 font-bold">Last Updated: April 2026</p>
                </div>

                <div className="p-10 space-y-8 text-gray-600 dark:text-gray-400 leading-relaxed">
                    <p className="font-medium text-lg italic">
                        INNOVYX TECH LABS LLP ("we," "us," or "our") is committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, and safeguard the personal information of employees within organizations using the People Suite HRMS platform (available via Web and Mobile Application).
                    </p>

                    <section>
                        <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">01</span>
                            Information We Collect
                        </h2>
                        <div className="space-y-4 ltr:pl-11 rtl:pr-11">
                            <p>To provide a functional HRMS experience, we collect the following types of information:</p>
                            <ul className="list-disc space-y-2">
                                <li><span className="font-bold text-gray-700 dark:text-gray-300">Personal Identifiable Information (PII):</span> Name, Employee ID, email address, phone number, and emergency contact details.</li>
                                <li><span className="font-bold text-gray-700 dark:text-gray-300">Professional Data:</span> Job title, department, salary/payroll details, and tax information.</li>
                                <li><span className="font-bold text-gray-700 dark:text-gray-300">Attendance & Location Data:</span> When you use the mobile app to clock in/out, we may collect your precise GPS location to verify your presence at designated work sites (Geofencing).</li>
                                <li><span className="font-bold text-gray-700 dark:text-gray-300">Device Information:</span> IP address, device model, operating system, and unique device identifiers to ensure secure login and troubleshoot app performance.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">02</span>
                            How We Use Your Information
                        </h2>
                        <div className="space-y-4 ltr:pl-11 rtl:pr-11">
                            <p>We use the collected data strictly for the following HR functions:</p>
                            <ul className="list-disc space-y-2">
                                <li>Facilitating payroll processing and tax compliance.</li>
                                <li>Verifying attendance and leave management.</li>
                                <li>Enabling internal communication within your organization.</li>
                                <li>Ensuring the security of the portal by preventing unauthorized logins.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">03</span>
                            Data Access & Restriction
                        </h2>
                        <ul className="list-disc space-y-2 ltr:pl-11 rtl:pr-11">
                            <li><span className="font-bold text-gray-700 dark:text-gray-300">Internal Access Only:</span> People Suite is a closed-loop system. Access is strictly limited to active employees of your organization.</li>
                            <li>We do not sell or rent your personal data to third-party marketers.</li>
                            <li>Your data is accessible to your organization’s HR administrators and authorized management personnel as per your company’s internal hierarchy.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">04</span>
                            Background Location & Camera Permissions
                        </h2>
                        <div className="space-y-4 ltr:pl-11 rtl:pr-11">
                            <p>For the mobile application to function correctly, we may request:</p>
                            <ul className="list-disc space-y-2">
                                <li><span className="font-bold text-gray-700 dark:text-gray-300">Location:</span> Used only for attendance verification. Background location may be used if required by your employer's attendance policy during work hours.</li>
                                <li><span className="font-bold text-gray-700 dark:text-gray-300">Camera:</span> Used for profile picture uploads or "Selfie-Attendance" features if enabled.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">05</span>
                            Data Security
                        </h2>
                        <div className="space-y-4 ltr:pl-11 rtl:pr-11">
                            <p>We implement industry-standard security measures, including:</p>
                            <ul className="list-disc space-y-2">
                                <li><span className="font-bold text-gray-700 dark:text-gray-300">Encryption:</span> Data is encrypted at rest and during transit (SSL/TLS).</li>
                                <li><span className="font-bold text-gray-700 dark:text-gray-300">Access Control:</span> Role-based access ensures you only see data relevant to your position.</li>
                                <li><span className="font-bold text-gray-700 dark:text-gray-300">Server Security:</span> Data is hosted on secure servers with regular backups and firewalls.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase mb-4 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">06</span>
                            Data Retention
                        </h2>
                        <p className="ltr:pl-11 rtl:pr-11">
                            Your personal data is retained as long as you are an active employee of the organization. Upon your departure, data retention is governed by your Employer’s HR policy and applicable labor laws of India.
                        </p>
                    </section>

                    <section className="bg-primary/5 p-8 rounded-2xl border border-primary/10">
                        <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase mb-4">07. Contact Us</h2>
                        <div className="space-y-2 font-bold text-sm">
                            <p className="text-primary uppercase">INNOVYX TECH LABS LLP</p>
                            <p>Address: 35 K, 42/5, Vittasandra Main Rd, Vittasandra, Bengaluru, Karnataka 560100</p>
                            <p>Email: <a href="mailto:info@innovyxtechlabs.com" className="text-primary hover:underline">info@innovyxtechlabs.com</a></p>
                            <p>Phone: +91 9113263741</p>
                        </div>
                    </section>
                </div>

                <div className="p-8 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-gray-800 flex justify-center">
                    <button 
                        onClick={() => window.history.back()}
                        className="btn btn-primary font-black uppercase px-12 py-3 rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Terms;
