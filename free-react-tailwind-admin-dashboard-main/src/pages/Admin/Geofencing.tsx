import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const Geofencing = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Geofencing Configuration'));
    });

    const [loading, setLoading] = useState(true);
    const [locations, setLocations] = useState<any[]>([]);
    const [editData, setEditData] = useState<any>({});

    const fetchLocations = async () => {
        try {
            const headers = {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            };
            const response = await fetch(`${API_BASE_URL}/app/office-locations/`, { headers });
            if (response.ok) {
                const result = await response.json();
                const locData = Array.isArray(result) ? result : result.results || [];
                setLocations(locData);
                
                // Initialize edit state
                const initialEdit: any = {};
                locData.forEach((loc: any) => {
                    initialEdit[loc.id] = { ...loc };
                });
                setEditData(initialEdit);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching locations:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const handleChange = (id: number, field: string, value: any) => {
        setEditData((prev: any) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value,
            },
        }));
    };

    const handleSave = async (id: number) => {
        try {
            setLoading(true);
            const rawData = editData[id];
            if (!rawData) return;

            // Clean the data: Convert empty strings to null for numeric fields
            // and only send the fields the backend needs to update.
            const cleanData = {
                name: rawData.name,
                address: rawData.address,
                latitude: rawData.latitude === '' ? null : rawData.latitude,
                longitude: rawData.longitude === '' ? null : rawData.longitude,
                radius: rawData.radius === '' ? 100 : parseInt(rawData.radius),
                allowed_ips: rawData.allowed_ips,
                is_active: rawData.is_active,
                enable_geofencing: rawData.enable_geofencing,
                enable_ip_restriction: rawData.enable_ip_restriction
            };

            const response = await fetch(`${API_BASE_URL}/app/office-locations/${id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: JSON.stringify(cleanData),
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Success',
                    text: 'Configuration updated successfully',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                });
                fetchLocations();
            } else {
                const errorData = await response.json();
                const errorMessage = Object.entries(errorData)
                    .map(([key, val]) => `${key}: ${val}`)
                    .join('\n');
                throw new Error(errorMessage || 'Update failed');
            }
        } catch (error: any) {
            Swal.fire('Error', `Failed to update configuration:\n${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkToggle = async (field: string, value: boolean) => {
        try {
            const result = await Swal.fire({
                title: `Are you sure?`,
                text: `This will ${value ? 'enable' : 'disable'} ${field.replace('enable_', '').replace('_', ' ')} for ALL office locations.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, apply to all',
                cancelButtonText: 'Cancel',
            });

            if (result.isConfirmed) {
                setLoading(true);
                const headers = {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                };

                // Update each location in parallel
                const updatePromises = locations.map((loc) =>
                    fetch(`${API_BASE_URL}/app/office-locations/${loc.id}/`, {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify({ [field]: value }),
                    })
                );

                const responses = await Promise.all(updatePromises);
                const allOk = responses.every(r => r.ok);

                if (allOk) {
                    Swal.fire({
                        title: 'Success',
                        text: 'All locations updated successfully',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                    });
                } else {
                    Swal.fire('Warning', 'Some locations failed to update', 'warning');
                }
                
                await fetchLocations();
            }
        } catch (error) {
            Swal.fire('Error', 'An error occurred during bulk update', 'error');
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="panel">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-[#ebedf2] dark:border-[#1b2e4b] pb-5">
                    <div>
                        <h5 className="font-semibold text-lg dark:text-white-light">Geofencing & WiFi Restriction</h5>
                        <p className="text-white-dark text-sm mt-1">Manage attendance access policies for all office-based employees.</p>
                    </div>
                    
                    {/* Bulk Actions / Master Toggles */}
                    {!loading && locations.length > 0 && (
                        <div className="flex flex-wrap items-center gap-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                            <span className="text-xs font-bold uppercase text-primary">Master Controls:</span>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-semibold cursor-pointer" htmlFor="master-gps">GPS (All)</label>
                                    <label className="w-10 h-5 relative">
                                        <input
                                            id="master-gps"
                                            type="checkbox"
                                            className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer"
                                            checked={locations.every(l => l.enable_geofencing)}
                                            onChange={(e) => handleBulkToggle('enable_geofencing', e.target.checked)}
                                        />
                                        <span className="bg-[#ebedf2] dark:bg-[#253b5c] block h-full rounded-full before:absolute before:left-1 before:bg-white before:bottom-1 before:w-3 before:h-3 before:rounded-full peer-checked:before:left-6 peer-checked:bg-primary before:transition-all duration-300"></span>
                                    </label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-semibold cursor-pointer" htmlFor="master-wifi">WiFi (All)</label>
                                    <label className="w-10 h-5 relative">
                                        <input
                                            id="master-wifi"
                                            type="checkbox"
                                            className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer"
                                            checked={locations.every(l => l.enable_ip_restriction)}
                                            onChange={(e) => handleBulkToggle('enable_ip_restriction', e.target.checked)}
                                        />
                                        <span className="bg-[#ebedf2] dark:bg-[#253b5c] block h-full rounded-full before:absolute before:left-1 before:bg-white before:bottom-1 before:w-3 before:h-3 before:rounded-full peer-checked:before:left-6 peer-checked:bg-primary before:transition-all duration-300"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <span className="animate-spin border-4 border-primary border-l-transparent rounded-full w-10 h-10 inline-block align-middle m-auto"></span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {locations.length === 0 && (
                            <div className="col-span-full text-center py-10 bg-gray-50 dark:bg-black/20 rounded-xl border border-dashed border-gray-300">
                                No office locations found. Please add locations in the Office Management section first.
                            </div>
                        )}
                        {locations.map((loc) => {
                            const data = editData[loc.id] || loc;
                            const isGpsGlobalEnabled = locations.some(l => l.enable_geofencing);
                            const isWifiGlobalEnabled = locations.some(l => l.enable_ip_restriction);

                            return (
                                <div key={loc.id} className="border border-[#ebedf2] dark:border-[#1b2e4b] rounded-xl p-5 bg-white dark:bg-[#0e1726] shadow-sm hover:shadow-md transition-shadow flex flex-col">
                                    <div className="flex items-center justify-between mb-4 border-b border-[#ebedf2] dark:border-[#1b2e4b] pb-3">
                                        <h6 className="text-base font-bold text-primary uppercase tracking-wider">{loc.name}</h6>
                                        <span className={`badge ${loc.is_active ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                            {loc.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="space-y-5 flex-1">
                                        {/* Geofencing Configuration */}
                                        <div className="flex items-center justify-between opacity-80">
                                            <div>
                                                <p className="font-bold text-sm">Geofencing (GPS)</p>
                                                <p className="text-xs text-white-dark">Status: {isGpsGlobalEnabled ? 'Global Restricted' : 'Not Restricted'}</p>
                                            </div>
                                            {isGpsGlobalEnabled && (
                                                <span className="text-success text-xs font-bold">Enabled</span>
                                            )}
                                        </div>

                                        {isGpsGlobalEnabled && (
                                            <div className="p-4 bg-gray-50 dark:bg-black/10 rounded-lg space-y-4 border-l-2 border-primary">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold uppercase text-white-dark">GPS Coordinates</span>
                                                    <button
                                                        type="button"
                                                        className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                                                        onClick={() => {
                                                            if (navigator.geolocation) {
                                                                navigator.geolocation.getCurrentPosition(
                                                                    (position) => {
                                                                        handleChange(loc.id, 'latitude', position.coords.latitude.toFixed(6));
                                                                        handleChange(loc.id, 'longitude', position.coords.longitude.toFixed(6));
                                                                    },
                                                                    (error) => {
                                                                        Swal.fire('Error', 'Unable to retrieve your location.', 'error');
                                                                    }
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        Fetch Current Location
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase text-white-dark">Latitude</label>
                                                        <input
                                                            type="number"
                                                            className="form-input text-sm"
                                                            value={data.latitude || ''}
                                                            onChange={(e) => handleChange(loc.id, 'latitude', e.target.value)}
                                                            placeholder="0.000000"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase text-white-dark">Longitude</label>
                                                        <input
                                                            type="number"
                                                            className="form-input text-sm"
                                                            value={data.longitude || ''}
                                                            onChange={(e) => handleChange(loc.id, 'longitude', e.target.value)}
                                                            placeholder="0.000000"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-white-dark">Radius (meters)</label>
                                                    <input
                                                        type="number"
                                                        className="form-input text-sm"
                                                        value={data.radius || ''}
                                                        onChange={(e) => handleChange(loc.id, 'radius', e.target.value)}
                                                        placeholder="100"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <hr className="border-[#ebedf2] dark:border-[#1b2e4b]" />

                                        {/* IP Restriction Configuration */}
                                        <div className="flex items-center justify-between opacity-80">
                                            <div>
                                                <p className="font-bold text-sm">WiFi (Public IP) Restriction</p>
                                                <p className="text-xs text-white-dark">Status: {isWifiGlobalEnabled ? 'Global Restricted' : 'Not Restricted'}</p>
                                            </div>
                                            {isWifiGlobalEnabled && (
                                                <span className="text-success text-xs font-bold">Enabled</span>
                                            )}
                                        </div>

                                        {isWifiGlobalEnabled && (
                                            <div className="p-4 bg-gray-50 dark:bg-black/10 rounded-lg space-y-2 border-l-2 border-secondary">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-bold uppercase text-white-dark">Allowed Public IPs</label>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold border border-primary/20 px-1.5 py-0.5 rounded bg-primary/5 hover:bg-primary/10"
                                                            onClick={async () => {
                                                                try {
                                                                    let currentIp = '';
                                                                    try {
                                                                        const res = await fetch('https://api.ipify.org?format=json');
                                                                        const data = await res.json();
                                                                        currentIp = data.ip;
                                                                    } catch (e) {
                                                                        const res = await fetch('https://ipapi.co/json/');
                                                                        const data = await res.json();
                                                                        currentIp = data.ip;
                                                                    }
                                                                    if (currentIp) {
                                                                        const existingIps = data.allowed_ips ? data.allowed_ips.split(',').map((ip: string) => ip.trim()) : [];
                                                                        if (!existingIps.includes(currentIp)) {
                                                                            const newList = [...existingIps, currentIp].filter(Boolean).join(', ');
                                                                            handleChange(loc.id, 'allowed_ips', newList);
                                                                        }
                                                                    }
                                                                } catch (err) {}
                                                            }}
                                                        >
                                                            Public IP
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="text-[10px] text-secondary hover:underline flex items-center gap-1 font-semibold border border-secondary/20 px-1.5 py-0.5 rounded bg-secondary/5 hover:bg-secondary/10"
                                                            onClick={() => {
                                                                const pc = new RTCPeerConnection({ iceServers: [] });
                                                                pc.createDataChannel("");
                                                                pc.createOffer().then(pc.setLocalDescription.bind(pc));
                                                                pc.onicecandidate = (ice) => {
                                                                    if (!ice || !ice.candidate || !ice.candidate.candidate) return;
                                                                    const myIP = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(ice.candidate.candidate)?.[1];
                                                                    if (myIP && myIP.includes('.')) {
                                                                        const existingIps = data.allowed_ips ? data.allowed_ips.split(',').map((ip: string) => ip.trim()) : [];
                                                                        if (!existingIps.includes(myIP)) {
                                                                            const newList = [...existingIps, myIP].filter(Boolean).join(', ');
                                                                            handleChange(loc.id, 'allowed_ips', newList);
                                                                        }
                                                                        pc.onicecandidate = null;
                                                                    }
                                                                };
                                                            }}
                                                        >
                                                            Local IP
                                                        </button>
                                                    </div>
                                                </div>
                                                <textarea
                                                    className="form-textarea text-sm mt-1"
                                                    value={data.allowed_ips || ''}
                                                    onChange={(e) => handleChange(loc.id, 'allowed_ips', e.target.value)}
                                                    placeholder="e.g. 115.110.12.34, 182.72.45.10"
                                                    rows={2}
                                                ></textarea>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-6">
                                        <button 
                                            type="button" 
                                            className="btn btn-primary w-full gap-2"
                                            onClick={() => handleSave(loc.id)}
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Save Configuration
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Geofencing;
