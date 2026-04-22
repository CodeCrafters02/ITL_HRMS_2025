import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Group, Transformer } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconUsers from '../../components/Icon/IconUsers';
import IconChecks from '../../components/Icon/IconChecks';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import IconRefresh from '../../components/Icon/IconRefresh';
import IconClock from '../../components/Icon/IconClock';
import IconSave from '../../components/Icon/IconSave';
import Swal from 'sweetalert2';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const ConferenceRoomOverview = () => {
    const dispatch = useDispatch();
    const isDarkMode = useSelector((state: any) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    
    const [locations, setLocations] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [floors, setFloors] = useState<any[]>([]);
    const [selectedFloor, setSelectedFloor] = useState<any>(null);
    const [elements, setElements] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);

    // Config state
    const [config, setConfig] = useState<any>({ approval_limit_minutes: 120 });
    const [savingConfig, setSavingConfig] = useState(false);

    const stageRef = useRef<any>(null);

    useEffect(() => {
        dispatch(setPageTitle('Conference Room Overview'));
        fetchLocations();
        fetchConfig();
    }, []);

    useEffect(() => {
        if (selectedFloor) {
            fetchBookings(selectedFloor.id, selectedDate);
        }
    }, [selectedFloor, selectedDate]);

    const fetchLocations = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/office-locations/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const locList = Array.isArray(data) ? data : (data.results || []);
                setLocations(locList);
                if (locList.length > 0) handleLocationSelect(locList[0]);
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    };

    const handleLocationSelect = (location: any) => {
        setSelectedLocation(location);
        setSelectedFloor(null);
        fetchFloors(location.id);
    };

    const fetchFloors = async (locationId: number) => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/office-floors/?location=${locationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const floorList = Array.isArray(data) ? data : (data.results || []);
                setFloors(floorList);
                if (floorList.length > 0) handleFloorSelect(floorList[0]);
            }
        } catch (error) {
            console.error('Error fetching floors:', error);
        }
    };

    const handleFloorSelect = (floor: any) => {
        setSelectedFloor(floor);
        setElements(floor.layout_data?.elements || []);
    };

    const fetchBookings = async (floorId: number, date: string) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/conference-room-bookings/?date=${date}&floor=${floorId}&status=approved`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBookings(data || []);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/conference-room-config/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    setConfig(data[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    };

    const handleSaveConfig = async () => {
        setSavingConfig(true);
        try {
            const token = localStorage.getItem('access_token');
            const method = config.id ? 'PATCH' : 'POST';
            const url = config.id ? `${API_BASE_URL}/app/conference-room-config/${config.id}/` : `${API_BASE_URL}/app/conference-room-config/`;
            
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ approval_limit_minutes: config.approval_limit_minutes })
            });

            if (res.ok) {
                const data = await res.json();
                setConfig(data);
                Swal.fire({ title: 'Saved!', text: 'Configuration updated.', icon: 'success', timer: 1500, showConfirmButton: false });
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save configuration', 'error');
        } finally {
            setSavingConfig(false);
        }
    };

    const stageSize = useMemo(() => {
        if (!elements || elements.length === 0) return { width: 1500, height: 1200 };
        const maxX = Math.max(...elements.map(el => (el.x || 0) + (el.width || 0)));
        const maxY = Math.max(...elements.map(el => (el.y || 0) + (el.height || 0)));
        return {
            width: Math.max(1500, maxX + 500),
            height: Math.max(1200, maxY + 500)
        };
    }, [elements]);

    const getRoomColor = (el: any) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Find if a meeting is CURRENTLY in progress
        const isCurrentlyBooked = bookings.some(b => {
            if (b.room_details.layout_element_id !== el.id) return false;
            if (b.status === 'rejected' || b.status === 'cancelled') return false;
            if (b.date !== todayStr) return false;
            
            const [startH, startM] = b.start_time.split(':').map(Number);
            const [endH, endM] = b.end_time.split(':').map(Number);
            
            const startTimeDate = new Date();
            startTimeDate.setHours(startH, startM, 0, 0);
            
            const endTimeDate = new Date();
            endTimeDate.setHours(endH, endM, 0, 0);
            
            return now >= startTimeDate && now <= endTimeDate;
        });

        if (isCurrentlyBooked) return '#FB923C'; // Orange for "Occupied Now"
        return '#10B981'; // Green for "Available"
    };

    const handleRoomClick = (el: any) => {
        const roomBookings = bookings.filter(b => b.room_details.layout_element_id === el.id);
        setSelectedRoom({ ...el, bookings: roomBookings });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-90px)] space-y-4">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-xl p-4 text-white shadow-lg overflow-hidden relative">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-extrabold mb-0.5">Conference Room Overview</h2>
                        <p className="text-white/80 text-sm font-medium">Monitor room occupancy and manage booking policies.</p>
                    </div>
                </div>
                <div className="absolute right-[-20px] top-[-20px] opacity-10">
                    <IconUsers className="w-48 h-48" />
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                {/* Map Filters */}
                <div className="flex-1 flex flex-col sm:flex-row items-center bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm gap-4 border border-gray-100 dark:border-gray-800">
                    <select
                        className="form-select w-48 font-bold"
                        value={selectedLocation?.id || ''}
                        onChange={(e) => handleLocationSelect(locations.find(l => l.id === parseInt(e.target.value)))}
                    >
                        <option value="" disabled>Select Office</option>
                        {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                    </select>

                    <select
                        className="form-select w-48 font-bold"
                        value={selectedFloor?.id || ''}
                        onChange={(e) => handleFloorSelect(floors.find(f => f.id === parseInt(e.target.value)))}
                        disabled={!floors.length}
                    >
                        <option value="" disabled>{floors.length ? 'Select Floor' : 'No Floors'}</option>
                        {floors.map(fl => <option key={fl.id} value={fl.id}>Floor {fl.floor_number}: {fl.name}</option>)}
                    </select>

                    <input
                        type="date"
                        className="form-input w-40 font-bold text-center"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>

                {/* Booking Policy Config */}
                <div className="w-80 flex flex-col bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <h6 className="font-bold text-xs uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                        <IconClock className="w-4 h-4" /> Booking Policy
                    </h6>
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Auto-Approval Limit (Mins)</label>
                            <input
                                type="number"
                                className="form-input text-sm font-bold"
                                value={config.approval_limit_minutes}
                                onChange={(e) => setConfig({ ...config, approval_limit_minutes: parseInt(e.target.value) })}
                            />
                        </div>
                        <button 
                            onClick={handleSaveConfig} 
                            disabled={savingConfig}
                            className="bg-primary hover:bg-primary-dark text-white p-2.5 rounded-lg mt-5 transition-colors shadow-sm"
                            title="Save Policy"
                        >
                            <IconSave className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 italic font-medium">Bookings longer than this require Admin approval.</p>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                <div className="flex-1 bg-gray-100 dark:bg-black/20 rounded-2xl overflow-auto border border-gray-200 dark:border-gray-800 shadow-inner relative">
                    {!selectedFloor ? (
                        <div className="h-full flex justify-center items-center opacity-30 text-center flex-col">
                            <IconInfoCircle className="w-16 h-16 mb-4" />
                            <p className="font-bold">Select a location and floor to view occupancy</p>
                        </div>
                    ) : (
                        <Stage
                            width={stageSize.width}
                            height={stageSize.height}
                            ref={stageRef}
                            className="bg-white dark:bg-[#1a2233]"
                            style={{ 
                                backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)', 
                                backgroundSize: '20px 20px',
                                minWidth: stageSize.width,
                                minHeight: stageSize.height
                            }}
                        >
                            <Layer>
                                {elements.map((el: any) => {
                                    const isRoom = el.type === 'room';
                                    const color = isRoom ? getRoomColor(el) : '#E5E7EB';
                                    const opacity = isRoom ? 0.8 : 0.2;

                                    return (
                                        <Group 
                                            key={el.id} 
                                            x={el.x} 
                                            y={el.y} 
                                            rotation={el.rotation}
                                            onClick={() => isRoom && handleRoomClick(el)}
                                            onMouseEnter={(e) => {
                                                if (isRoom) e.target.getStage()!.container().style.cursor = 'pointer';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (isRoom) e.target.getStage()!.container().style.cursor = 'default';
                                            }}
                                        >
                                            <Rect
                                                width={el.width}
                                                height={el.height}
                                                fill={color}
                                                opacity={opacity}
                                                stroke={isRoom ? color : '#9CA3AF'}
                                                strokeWidth={isRoom ? 3 : 1}
                                                cornerRadius={isRoom ? 10 : 0}
                                                shadowColor="black"
                                                shadowBlur={isRoom ? 5 : 0}
                                                shadowOpacity={0.1}
                                            />
                                            <Text
                                                text={el.name}
                                                fontSize={isRoom ? 16 : 10}
                                                fontStyle="bold"
                                                fill={isRoom ? (isDarkMode ? '#fff' : '#000') : '#9CA3AF'}
                                                padding={10}
                                                width={el.width}
                                                align="center"
                                            />
                                            {isRoom && (
                                                <Text
                                                    text={(() => {
                                                        const now = new Date();
                                                        const todayStr = now.toISOString().split('T')[0];
                                                        const dayBookings = bookings.filter(b => b.room_details.layout_element_id === el.id && b.status !== 'rejected' && b.status !== 'cancelled');
                                                        
                                                        const isNow = dayBookings.some(b => {
                                                            if (b.date !== todayStr) return false;
                                                            const [sH, sM] = b.start_time.split(':').map(Number);
                                                            const [eH, eM] = b.end_time.split(':').map(Number);
                                                            const s = new Date(); s.setHours(sH, sM, 0, 0);
                                                            const e = new Date(); e.setHours(eH, eM, 0, 0);
                                                            return now >= s && now <= e;
                                                        });

                                                        if (isNow) return 'OCCUPIED NOW';

                                                        const upcoming = dayBookings.filter(b => {
                                                            if (b.date > todayStr) return true;
                                                            if (b.date < todayStr) return false;
                                                            const [eH, eM] = b.end_time.split(':').map(Number);
                                                            const e = new Date(); e.setHours(eH, eM, 0, 0);
                                                            return e > now;
                                                        }).length;

                                                        return upcoming > 0 ? `${upcoming} Upcoming Today` : 'Available';
                                                    })()}
                                                    fontSize={10}
                                                    fill={isDarkMode ? '#ccc' : '#666'}
                                                    y={el.height - 25}
                                                    width={el.width}
                                                    align="center"
                                                />
                                            )}
                                        </Group>
                                    );
                                })}
                            </Layer>
                        </Stage>
                    )}
                </div>

                <div className="w-80 panel bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm overflow-y-auto">
                    {selectedRoom ? (
                        <div className="animate-fade-in-right">
                            <h5 className="font-bold text-xl mb-4">{selectedRoom.name}</h5>
                            <div className="space-y-4">
                               <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                                    <p className="text-[10px] font-black uppercase text-blue-500 tracking-wider mb-1">Capacity</p>
                                    <p className="font-bold text-lg">{selectedRoom.capacity || 'N/A'} Persons</p>
                               </div>

                               <h6 className="text-[10px] uppercase font-black text-gray-400 mt-6 mb-2 border-b pb-1">Today's Schedule</h6>
                               {selectedRoom.bookings.length > 0 ? (
                                   <div className="space-y-3">
                                        {selectedRoom.bookings.map((b: any) => {
                                            const now = new Date();
                                            const todayStr = now.toISOString().split('T')[0];
                                            const [endH, endM] = b.end_time.split(':').map(Number);
                                            const endTimeDate = new Date();
                                            endTimeDate.setHours(endH, endM, 0, 0);
                                            const isCompleted = b.date < todayStr || (b.date === todayStr && endTimeDate < now);

                                            return (
                                                <div key={b.id} className={`p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 relative group overflow-hidden ${isCompleted ? 'opacity-50 grayscale' : ''}`}>
                                                     <div className="flex justify-between items-start mb-1">
                                                         <p className="font-bold text-xs">{b.employee_details.name}</p>
                                                         {isCompleted && <span className="text-[8px] font-black bg-gray-200 px-1 rounded text-gray-600">COMPLETED</span>}
                                                     </div>
                                                     <p className="text-[10px] text-gray-500 font-bold italic mb-2">
                                                         {b.start_time.substring(0, 5)} - {b.end_time.substring(0, 5)}
                                                     </p>
                                                     <div className="max-w-full truncate text-[10px] text-gray-400" title={b.purpose}>
                                                         {b.purpose || 'No purpose mentioned'}
                                                     </div>
                                                </div>
                                            );
                                        })}
                                   </div>
                               ) : (
                                   <div className="text-center py-10 opacity-40">
                                       <IconCalendar className="w-8 h-8 mx-auto mb-2" />
                                       <p className="text-xs font-bold">No bookings for this date</p>
                                   </div>
                               )}
                            </div>
                            <button onClick={() => setSelectedRoom(null)} className="btn btn-outline-secondary w-full mt-8 font-bold">Close Details</button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-50 text-center">
                            <IconInfoCircle className="w-12 h-12 mb-4 text-gray-400" />
                            <p className="font-bold">Select a room</p>
                            <p className="text-xs">Click on any room on the map to view its schedule and details</p>

                            <div className="mt-10 text-left w-full space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                <p className="text-[10px] uppercase font-black border-b pb-1 dark:border-gray-700 tracking-wider opacity-60">Status Legend</p>
                                <div className="flex items-center gap-2 text-xs font-bold"><span className="w-4 h-4 rounded bg-[#10B981]"></span> Available Now</div>
                                <div className="flex items-center gap-2 text-sm font-bold font-['Outfit']"><span className="w-4 h-4 rounded bg-[#FB923C]"></span> Occupied Now</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const IconCalendar = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);

export default ConferenceRoomOverview;
