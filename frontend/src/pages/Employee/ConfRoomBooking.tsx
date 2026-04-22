import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Group, Arc } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconChecks from '../../components/Icon/IconChecks';
import IconClock from '../../components/Icon/IconClock';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import IconCalendar from '../../components/Icon/IconCalendar';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const ConfRoomBooking = () => {
    const dispatch = useDispatch();
    const isDarkMode = useSelector((state: any) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    const [locations, setLocations] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [floors, setFloors] = useState<any[]>([]);
    const [selectedFloor, setSelectedFloor] = useState<any>(null);
    const [elements, setElements] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [purpose, setPurpose] = useState('');
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [config, setConfig] = useState<any>(null);
    const [currentEmployee, setCurrentEmployee] = useState<any>(null);

    const stageRef = useRef<any>(null);

    useEffect(() => {
        dispatch(setPageTitle('Book a Room'));
        fetchLocations();
        fetchConfig();
        fetchCurrentEmployee();
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
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/conference-room-bookings/?date=${date}&floor=${floorId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBookings(data || []);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
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
                if (data && data.length > 0) setConfig(data[0]);
            }
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    };

    const fetchCurrentEmployee = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/employees/me/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentEmployee(data);
            }
        } catch (error) {
            console.error('Error fetching current employee:', error);
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

        if (isCurrentlyBooked) return '#FB923C'; // Orange for "Currently Occupied"
        return '#10B981'; // Green for "Available"
    };

    const handleRoomClick = (el: any) => {
        const roomBookings = bookings.filter(b => b.room_details.layout_element_id === el.id && b.status !== 'rejected');
        setSelectedRoom({ ...el, bookings: roomBookings });
    };

    const handleBook = async () => {
        if (!selectedRoom) return;
        try {
            const token = localStorage.getItem('access_token');

            // 1. Find room ID in backend
            const roomsRes = await fetch(`${API_BASE_URL}/app/conference-rooms/?floor=${selectedFloor.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const roomsData = await roomsRes.json();
            const backendRoom = roomsData.find((r: any) => r.layout_element_id === selectedRoom.id);

            if (!backendRoom) {
                Swal.fire('Error', 'Room not found in registry', 'error');
                return;
            }

            // 2. Submit booking
            const res = await fetch(`${API_BASE_URL}/app/conference-room-bookings/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    room: backendRoom.id,
                    date: selectedDate,
                    start_time: startTime,
                    end_time: endTime,
                    purpose: purpose
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.status === 'pending') {
                    Swal.fire('Pending Approval', 'Your booking exceeds the time limit and has been sent for admin approval.', 'warning');
                } else {
                    Swal.fire('Success', 'Room booked successfully!', 'success');
                }
                fetchBookings(selectedFloor.id, selectedDate);
                setSelectedRoom(null);
                setPurpose('');
            } else {
                const err = await res.json();
                Swal.fire('Booking Failed', err.non_field_errors?.[0] || err.detail || 'Overlap or invalid data', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to submit booking', 'error');
        }
    };

    const handleCancelBooking = async (bookingId: number) => {
        const result = await Swal.fire({
            title: 'Cancel Booking?',
            text: 'Are you sure you want to cancel this meeting room booking?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, cancel it!',
            cancelButtonText: 'No, keep it'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('access_token');
                const res = await fetch(`${API_BASE_URL}/app/conference-room-bookings/${bookingId}/cancel/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    Swal.fire('Cancelled!', 'Your booking has been cancelled.', 'success');
                    fetchBookings(selectedFloor.id, selectedDate);
                    // Update the selectedRoom bookings in real-time
                    if (selectedRoom) {
                        const updatedRoomBookings = selectedRoom.bookings.map((b: any) =>
                            b.id === bookingId ? { ...b, status: 'cancelled' } : b
                        );
                        setSelectedRoom({ ...selectedRoom, bookings: updatedRoomBookings });
                    }
                } else {
                    Swal.fire('Error', 'Failed to cancel booking', 'error');
                }
            } catch (error) {
                console.error('Error cancelling booking:', error);
            }
        }
    };

    const isExceedingLimit = useMemo(() => {
        if (!config) return false;
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const duration = (endH * 60 + endM) - (startH * 60 + startM);
        return duration > config.approval_limit_minutes;
    }, [startTime, endTime, config]);

    return (
        <div className="flex flex-col h-[calc(100vh-90px)] space-y-4">
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-xl p-4 text-white shadow-lg overflow-hidden relative">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-extrabold mb-0.5">Book a Conference Room</h2>
                        <p className="text-white/80 text-sm font-medium">Select a room and schedule your meeting. Time limits apply for auto-approval.</p>
                    </div>
                </div>
                <div className="absolute right-[-20px] top-[-20px] opacity-10">
                    <IconCalendar className="w-48 h-48" />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm gap-4 border border-gray-100 dark:border-gray-800">
                <select
                    className="form-select w-48 font-bold"
                    value={selectedLocation?.id || ''}
                    onChange={(e) => handleLocationSelect(locations.find(l => l.id === parseInt(e.target.value)))}
                >
                    <option value="" disabled>Choose Location</option>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>

                <select
                    className="form-select w-48 font-bold"
                    value={selectedFloor?.id || ''}
                    onChange={(e) => handleFloorSelect(floors.find(f => f.id === parseInt(e.target.value)))}
                    disabled={!floors.length}
                >
                    <option value="" disabled>{floors.length ? 'Choose Floor' : 'No Floors'}</option>
                    {floors.map(fl => <option key={fl.id} value={fl.id}>Floor {fl.floor_number}: {fl.name}</option>)}
                </select>

                <input
                    type="date"
                    className="form-input w-40 font-bold"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                <div className="flex-1 bg-gray-100 dark:bg-black/20 rounded-2xl overflow-auto border border-gray-200 dark:border-gray-800 relative shadow-inner">
                    {!selectedFloor ? (
                        <div className="h-full flex justify-center items-center opacity-30 text-center flex-col">
                            <IconInfoCircle className="w-16 h-16 mb-4" />
                            <p className="font-bold">Select a floor to view available rooms</p>
                        </div>
                    ) : (
                        <Stage
                            width={stageSize.width}
                            height={stageSize.height}
                            ref={stageRef}
                            className="bg-white dark:bg-[#1a2233]"
                            style={{
                                backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)',
                                backgroundSize: '15px 15px',
                                minWidth: stageSize.width,
                                minHeight: stageSize.height
                            }}
                        >
                            <Layer>
                                {elements.map((el: any) => {
                                    if (el.type === 'zone') {
                                        return (
                                            <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation}>
                                                <Rect
                                                    width={el.width}
                                                    height={el.height}
                                                    fill={el.color + '11'}
                                                    stroke={el.color}
                                                    strokeWidth={1}
                                                    dash={[5, 5]}
                                                />
                                                <Text text={el.name} fontSize={10} fill={el.color} padding={5} opacity={0.5} />
                                            </Group>
                                        );
                                    }
                                    if (el.type === 'room') {
                                        const color = getRoomColor(el);
                                        const isSelected = selectedRoom?.id === el.id;
                                        return (
                                            <Group
                                                key={el.id}
                                                x={el.x}
                                                y={el.y}
                                                rotation={el.rotation}
                                                onClick={() => handleRoomClick(el)}
                                                onMouseEnter={(e) => {
                                                    e.target.getStage()!.container().style.cursor = 'pointer';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.getStage()!.container().style.cursor = 'default';
                                                }}
                                            >
                                                <Rect
                                                    width={el.width}
                                                    height={el.height}
                                                    fill={color}
                                                    opacity={0.8}
                                                    stroke={color}
                                                    strokeWidth={isSelected ? 4 : 2}
                                                    cornerRadius={12}
                                                    shadowBlur={isSelected ? 10 : 0}
                                                    shadowColor="black"
                                                    shadowOpacity={0.2}
                                                />
                                                <Text
                                                    text={el.name}
                                                    fontSize={14}
                                                    fontStyle="bold"
                                                    fill={isDarkMode ? '#fff' : '#000'}
                                                    padding={10}
                                                    width={el.width}
                                                    align="center"
                                                />
                                                <Text
                                                    text={(el.capacity || 'N/A') + ' PPL'}
                                                    fontSize={9}
                                                    fill={isDarkMode ? '#fff' : '#000'}
                                                    opacity={0.6}
                                                    y={el.height - 20}
                                                    width={el.width}
                                                    align="center"
                                                />
                                            </Group>
                                        );
                                    }
                                    if (el.type === 'seat') {
                                        return (
                                            <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation}>
                                                <Rect
                                                    width={el.width}
                                                    height={el.height}
                                                    fill={isDarkMode ? '#1b2e4b' : '#f1f2f3'}
                                                    stroke={isDarkMode ? '#253b5c' : '#e0e6ed'}
                                                    strokeWidth={1}
                                                    cornerRadius={4}
                                                    opacity={0.6}
                                                />
                                                <Text
                                                    width={el.width}
                                                    height={el.height}
                                                    text={el.name}
                                                    fontSize={8}
                                                    fill="#9CA3AF"
                                                    align="center"
                                                    verticalAlign="middle"
                                                />
                                            </Group>
                                        );
                                    }
                                    if (el.type === 'door') {
                                        return (
                                            <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation} opacity={0.4}>
                                                <Rect width={el.width} height={2} y={-1} fill="#9CA3AF" />
                                                <Rect width={3} height={6} x={0} y={-3} fill="#6B7280" />
                                                <Rect width={3} height={6} x={el.width - 3} y={-3} fill="#6B7280" />
                                                <Rect width={2} height={el.width} x={0} y={-el.width} fill="#9CA3AF" />
                                                <Arc x={0} y={0} innerRadius={el.width - 1} outerRadius={el.width} angle={90} rotation={-90} fill="#9CA3AF" opacity={0.2} />
                                            </Group>
                                        );
                                    }
                                    if (el.type === 'label') {
                                        return (
                                            <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation} opacity={0.5}>
                                                <Text text={el.name} fontSize={12} fontStyle="bold" fill={isDarkMode ? '#888ea8' : '#3b3f5c'} width={el.width} align="center" />
                                            </Group>
                                        );
                                    }
                                    return null;
                                })}
                            </Layer>
                        </Stage>
                    )}
                </div>

                <div className="w-80 panel bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm overflow-y-auto">
                    {selectedRoom ? (
                        <div className="animate-fade-in-right">
                            <h5 className="font-bold text-xl mb-1">{selectedRoom.name}</h5>
                            <div className="flex items-center gap-2 mb-4 opacity-70">
                                <span className="badge badge-outline-primary text-xs tracking-widest uppercase py-1">Max Capacity: {selectedRoom.capacity || 'N/A'}</span>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Booking Date</label>
                                    <input
                                        type="date"
                                        className="form-input font-bold"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Start Time</label>
                                        <input type="time" className="form-input font-bold" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">End Time</label>
                                        <input type="time" className="form-input font-bold" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Purpose of Meeting</label>
                                    <textarea
                                        className="form-textarea font-bold text-sm h-24"
                                        placeholder="Meeting details..."
                                        value={purpose}
                                        onChange={(e) => setPurpose(e.target.value)}
                                    ></textarea>
                                </div>

                                {isExceedingLimit && config && (
                                    <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 p-3 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-orange-200 dark:border-orange-800 flex items-center gap-2">
                                        <IconInfoCircle className="w-4 h-4" />
                                        Exceeds {config.approval_limit_minutes}m limit. Requires Admin Approval.
                                    </div>
                                )}

                                <button onClick={handleBook} className="btn btn-primary w-full h-11 font-bold mt-4">Confirm Booking</button>

                                <div className="mt-8">
                                    <h6 className="text-[10px] uppercase font-black text-gray-400 mb-2 border-b pb-1">Room Schedule ({selectedDate})</h6>
                                    {selectedRoom.bookings.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedRoom.bookings.map((b: any) => {
                                                const now = new Date();
                                                const todayStr = now.toISOString().split('T')[0];
                                                const [endH, endM] = b.end_time.split(':').map(Number);
                                                const endTimeDate = new Date();
                                                endTimeDate.setHours(endH, endM, 0, 0);
                                                const isCompleted = b.date < todayStr || (b.date === todayStr && endTimeDate < now);

                                                const isMyBooking = currentEmployee && b.employee === currentEmployee.id;
                                                const canCancel = isMyBooking && (b.status === 'pending' || b.status === 'approved') && !isCompleted;

                                                return (
                                                    <div key={b.id} className={`p-2 bg-gray-50 dark:bg-gray-800/40 rounded border dark:border-gray-800 text-[10px] flex items-center justify-between group ${isCompleted ? 'opacity-50 grayscale' : ''}`}>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-black text-gray-700 dark:text-gray-300">{b.start_time.substring(0, 5)} - {b.end_time.substring(0, 5)}</span>
                                                                <span className={`px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter text-[8px] ${isCompleted ? 'bg-gray-200 text-gray-700' :
                                                                        b.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                                            b.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                                                'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                    {isCompleted ? 'COMPLETED' : b.status}
                                                                </span>
                                                            </div>
                                                            <div className="opacity-60 flex items-center gap-1 italic">
                                                                <span className="truncate max-w-[120px]">{b.purpose || 'No purpose'}</span>
                                                                {isMyBooking && <span className="text-primary font-black ml-1">(YOU)</span>}
                                                            </div>
                                                        </div>
                                                        {canCancel && (
                                                            <button
                                                                onClick={() => handleCancelBooking(b.id)}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-2 py-1 rounded font-bold uppercase text-[8px]"
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] opacity-50 italic">No other bookings today.</p>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setSelectedRoom(null)} className="btn btn-outline-secondary w-full mt-6 text-xs font-bold uppercase">Back to Map</button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-50 text-center">
                            <IconInfoCircle className="w-12 h-12 mb-4 text-gray-400" />
                            <p className="font-bold">Select a room</p>
                            <p className="text-xs">Select a room from the map to see its availability and book a slot.</p>

                            <div className="mt-10 text-left w-full space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                <p className="text-[10px] uppercase font-black border-b pb-1 dark:border-gray-700 tracking-wider">Legend</p>
                                <div className="flex items-center gap-2 text-xs font-bold"><span className="w-4 h-4 rounded bg-[#10B981]"></span> Available Now</div>
                                <div className="flex items-center gap-2 text-xs font-bold"><span className="w-4 h-4 rounded bg-[#FB923C]"></span> Currently Occupied</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConfRoomBooking;
