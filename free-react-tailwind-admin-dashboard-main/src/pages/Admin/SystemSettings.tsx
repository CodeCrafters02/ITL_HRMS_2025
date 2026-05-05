import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSettings from '../../components/Icon/IconSettings';
import IconSave from '../../components/Icon/IconSave';
import IconRefresh from '../../components/Icon/IconRefresh';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/app/system-settings/`;
const DEMO_STATUS_URL = `${API_BASE_URL}/app/demo-status/`;

interface SystemSettings {
    id?: number;
    demo_mode_enabled: boolean;
    demo_username: string;
    demo_password: string;
    updated_at?: string;
}

const AdminSystemSettings = () => {
    const dispatch = useDispatch();
    const [settings, setSettings] = useState<SystemSettings>({
        demo_mode_enabled: false,
        demo_username: 'demo',
        demo_password: 'demo123',
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('System Settings'));
    }, [dispatch]);

    const getHeaders = (): Record<string, string> => {
        const token = localStorage.getItem('access_token');
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) h.Authorization = `Bearer ${token}`;
        return h;
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const resp = await fetch(API_URL, { headers: getHeaders() });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to load settings');
            
            // Handle both single object and array responses
            const settingData = Array.isArray(data) ? data[0] : data;
            if (settingData) {
                setSettings({
                    demo_mode_enabled: settingData.demo_mode_enabled || false,
                    demo_username: settingData.demo_username || 'demo',
                    demo_password: settingData.demo_password || 'demo123',
                    id: settingData.id,
                    updated_at: settingData.updated_at,
                });
            }
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to load settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            const method = settings.id ? 'PUT' : 'POST';
            const url = settings.id ? `${API_URL}${settings.id}/` : API_URL;
            
            const resp = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify({
                    demo_mode_enabled: settings.demo_mode_enabled,
                    demo_username: settings.demo_username,
                    demo_password: settings.demo_password,
                }),
            });
            
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.detail || 'Failed to save settings');
            
            setSettings(prev => ({ ...prev, id: data.id, updated_at: data.updated_at }));
            Swal.fire('Success', 'System settings saved successfully', 'success');
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    const testDemoMode = async () => {
        setTesting(true);
        try {
            const resp = await fetch(DEMO_STATUS_URL, { headers: getHeaders() });
            const data = await resp.json();
            
            if (data.demo_mode_enabled) {
                Swal.fire({
                    title: 'Demo Mode is Active',
                    html: `
                        <div style="text-align: left;">
                            <p><strong>Status:</strong> ✅ Enabled</p>
                            <p><strong>Username:</strong> ${data.demo_username}</p>
                            <p><strong>Password:</strong> demo123</p>
                            <hr style="margin: 10px 0;" />
                            <p style="font-size: 0.9em; color: #666;">
                                Reviewers can now login using these credentials from the mobile app.
                            </p>
                        </div>
                    `,
                    icon: 'info',
                });
            } else {
                Swal.fire({
                    title: 'Demo Mode is Inactive',
                    html: `
                        <div style="text-align: left;">
                            <p><strong>Status:</strong> ❌ Disabled</p>
                            <p>The mobile app will not show demo login option.</p>
                        </div>
                    `,
                    icon: 'warning',
                });
            }
        } catch (e: any) {
            Swal.fire('Error', e?.message || 'Failed to test demo mode', 'error');
        } finally {
            setTesting(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return (
        <div className="p-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <IconSettings className="w-8 h-8 text-primary" />
                    System Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Configure global system settings including demo mode for mobile app reviewers.
                </p>
            </div>

            {/* Demo Mode Section */}
            <div className="panel mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-warning/10 rounded-lg">
                        <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Demo Mode</h2>
                        <p className="text-sm text-gray-500">Allow reviewers to login with dummy credentials</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Enable/Disable Toggle */}
                    <div className="md:col-span-2">
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="form-checkbox h-5 w-5 text-primary rounded border-gray-300 focus:ring-primary"
                                checked={settings.demo_mode_enabled}
                                onChange={(e) => setSettings(prev => ({ ...prev, demo_mode_enabled: e.target.checked }))}
                            />
                            <span className="ml-3 text-gray-700 dark:text-gray-300 font-medium">
                                Enable Demo Mode
                            </span>
                        </label>
                        <p className="mt-2 text-sm text-gray-500 ml-8">
                            When enabled, the mobile app login page will show a "Try Demo Mode" button allowing reviewers 
                            to login with dummy credentials. Normal Google SSO login continues to work regardless of this setting.
                        </p>
                    </div>

                    {/* Demo Username */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Demo Username
                        </label>
                        <input
                            type="text"
                            className="form-input w-full"
                            value={settings.demo_username}
                            onChange={(e) => setSettings(prev => ({ ...prev, demo_username: e.target.value }))}
                            placeholder="demo"
                        />
                        <p className="mt-1 text-xs text-gray-500">Username for demo login</p>
                    </div>

                    {/* Demo Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Demo Password
                        </label>
                        <input
                            type="text"
                            className="form-input w-full"
                            value={settings.demo_password}
                            onChange={(e) => setSettings(prev => ({ ...prev, demo_password: e.target.value }))}
                            placeholder="demo123"
                        />
                        <p className="mt-1 text-xs text-gray-500">Password for demo login</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        className="btn btn-primary flex items-center gap-2"
                        onClick={saveSettings}
                        disabled={saving}
                    >
                        {saving ? (
                            <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-4 h-4" />
                        ) : (
                            <IconSave className="w-4 h-4" />
                        )}
                        Save Settings
                    </button>

                    <button
                        type="button"
                        className="btn btn-outline-primary flex items-center gap-2"
                        onClick={testDemoMode}
                        disabled={testing}
                    >
                        {testing ? (
                            <span className="animate-spin border-2 border-primary border-l-transparent rounded-full w-4 h-4" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        )}
                        Test Demo Mode
                    </button>

                    <button
                        type="button"
                        className="btn btn-outline-secondary flex items-center gap-2"
                        onClick={fetchSettings}
                        disabled={loading}
                    >
                        <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Info Panel */}
            <div className="panel bg-info/5 border-info/20">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                        <svg className="w-5 h-5 text-info" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-info mb-1">How Demo Mode Works</h3>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                            <li>When enabled, the mobile app login page displays a "Try Demo Mode" section</li>
                            <li>Reviewers can click the demo button to instantly login with dummy credentials</li>
                            <li>Demo users see sample data including profile, attendance, payroll, and tasks</li>
                            <li>A visual "Demo Mode" indicator is shown throughout the app</li>
                            <li>Regular Google SSO users are unaffected - they login normally</li>
                            <li>Demo mode is perfect for app store reviews, demos, and testing</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSystemSettings;
