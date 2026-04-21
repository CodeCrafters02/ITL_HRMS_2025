import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Arc } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconUsers from '../../components/Icon/IconUsers';
import IconChecks from '../../components/Icon/IconChecks';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import IconRefresh from '../../components/Icon/IconRefresh';
import IconSearch from '../../components/Icon/IconSearch';
import IconX from '../../components/Icon/IconX';
import IconClock from '../../components/Icon/IconClock';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const AdminSeatBookingsOverview = () => {
    const dispatch = useDispatch();
    const isDarkMode = useSelector((state: any) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const [locations, setLocations] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [loadingLocations, setLoadingLocations] = useState(true);

    const [floors, setFloors] = useState<any[]>([]);
    const [selectedFloor, setSelectedFloor] = useState<any>(null);
    const [loadingFloors, setLoadingFloors] = useState(false);

    const [elements, setElements] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [totalSeats, setTotalSeats] = useState<number>(0);

    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedSeat, setSelectedSeat] = useState<any>(null);

    // History Modal State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyBookings, setHistoryBookings] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historySearch, setHistorySearch] = useState('');

    const stageRef = useRef<any>(null);

    useEffect(() => {
        dispatch(setPageTitle('Seat Bookings Overview'));
        fetchLocations();
    }, []);

    useEffect(() => {
        if (selectedFloor) {
            fetchBookings(selectedFloor.id, selectedDate);
            fetchTotalSeats(selectedFloor.id);
            setSelectedSeat(null);
        }
    }, [selectedFloor, selectedDate]);

    const stageSize = useMemo(() => {
        if (!selectedFloor || !elements || elements.length === 0) return { width: 1500, height: 1200 };
        const maxX = Math.max(...elements.map(el => (el.x || 0) + (el.width || 0)));
        const maxY = Math.max(...elements.map(el => (el.y || 0) + (el.height || 0)));
        return {
            width: Math.max(1500, maxX + 500),
            height: Math.max(1200, maxY + 500)
        };
    }, [elements, selectedFloor]);

    const fetchLocations = async () => {
        setLoadingLocations(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/office-locations/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const locList = Array.isArray(data) ? data : (data.results || []);
                setLocations(locList);
                if (locList.length > 0 && !selectedLocation) {
                    handleLocationSelect(locList[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        } finally {
            setLoadingLocations(false);
        }
    };

    const handleLocationSelect = (location: any) => {
        setSelectedLocation(location);
        setSelectedFloor(null);
        setFloors([]);
        fetchFloors(location.id);
    };

    const fetchFloors = async (locationId?: number) => {
        const locId = locationId || selectedLocation?.id;
        if (!locId) return;

        setLoadingFloors(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/office-floors/?location=${locId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const floorList = Array.isArray(data) ? data : (data.results || []);
                setFloors(floorList);
                if (floorList.length > 0) {
                    handleFloorSelect(floorList[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching floors:', error);
        } finally {
            setLoadingFloors(false);
        }
    };

    const handleFloorSelect = (floor: any) => {
        setSelectedFloor(floor);
        setElements(floor.layout_data?.elements || []);
    };

    const fetchBookings = async (floorId: number, date: string) => {
        try {
            const token = localStorage.getItem('access_token');
            const url = `${API_BASE_URL}/app/seat-bookings/?date=${date}&floor=${floorId}&status=approved`;
            const res = await fetch(url, {
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

    const fetchTotalSeats = async (floorId: number) => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/office-seats/?floor=${floorId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const seatsList = Array.isArray(data) ? data : (data.results || []);
                setTotalSeats(seatsList.length);
            }
        } catch (error) {
            console.error('Error fetching seats', error);
        }
    };

    const handleSeatClick = (seat: any) => {
        const booking = bookings.find(b => b.seat_details.seat_number === seat.name);
        setSelectedSeat({ ...seat, booking });
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/seat-bookings/?history=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistoryBookings(data || []);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const getSeatColor = (el: any) => {
        const booking = bookings.find(b => b.seat_details.seat_number === el.name);
        if (booking) {
            return booking.booking_type === 'permanent' ? '#F472B6' : '#FB923C';
        }
        return '#10B981';
    };

    // Calculate Summary
    const bookedCount = bookings.length;
    const availableCount = totalSeats > bookedCount ? totalSeats - bookedCount : 0;
    const permanentCount = bookings.filter(b => b.booking_type === 'permanent').length;
    const weeklyCount = bookings.filter(b => b.booking_type === 'weekly').length;
    const dailyCount = bookings.filter(b => b.booking_type === 'daily').length;

    const filteredHistory = historyBookings.filter(b =>
        b.employee_details.name.toLowerCase().includes(historySearch.toLowerCase()) ||
        b.seat_details.seat_number.toLowerCase().includes(historySearch.toLowerCase())
    );

    return (
        <div className="flex flex-col h-[calc(100vh-90px)] space-y-4">
            {/* Header Banner - Restored with better spacing */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-lg overflow-hidden relative">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-extrabold mb-0.5 tracking-tight">Seat Management Insights</h2>
                        <p className="text-white/80 text-sm font-medium">Real-time office occupancy tracking and booking history.</p>
                    </div>
                     <button 
                        onClick={() => setShowHistoryModal(true)}
                        className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-5 py-2 rounded-xl font-bold transition-all border border-white/20 flex items-center gap-2"
                    >
                        <IconClock className="w-4 h-4" />
                        View History
                    </button>
                </div>
                <div className="absolute right-[-20px] top-[-20px] opacity-10">
                    <IconInfoCircle className="w-48 h-48" />
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm gap-4 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    {loadingLocations ? (
                        <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    ) : (
                        <select
                            className="form-select w-48 font-bold"
                            value={selectedLocation?.id || ''}
                            onChange={(e) => {
                                const loc = locations.find(l => l.id === parseInt(e.target.value));
                                if (loc) handleLocationSelect(loc);
                            }}
                        >
                            <option value="" disabled>Select Office</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    )}

                    {loadingFloors ? (
                        <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    ) : (
                        <select
                            className="form-select w-48 font-bold"
                            value={selectedFloor?.id || ''}
                            onChange={(e) => {
                                const fl = floors.find(f => f.id === parseInt(e.target.value));
                                if (fl) handleFloorSelect(fl);
                            }}
                            disabled={!floors.length}
                        >
                            <option value="" disabled>{floors.length ? 'Select Floor' : 'No Floors Available'}</option>
                            {floors.map(fl => (
                                <option key={fl.id} value={fl.id}>Floor {fl.floor_number}: {fl.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        className="form-input w-40 font-bold text-center"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                    <button
                        onClick={() => {
                            setShowHistoryModal(true);
                            fetchHistory();
                        }}
                        className="btn btn-primary flex items-center gap-2"
                        title="View All History"
                    >
                        <IconClock className="w-4 h-4" />
                        History
                    </button>
                </div>
            </div>

            {/* Restored Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="panel bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-4 rounded-xl shadow-md border-none">
                    <div className="flex justify-between items-center mb-1">
                        <h5 className="font-bold text-xs uppercase opacity-80 tracking-wider">Total Capacity</h5>
                        <IconUsers className="w-4 h-4 opacity-50" />
                    </div>
                    <div className="flex items-baseline gap-1">
                        <div className="text-2xl font-black">{totalSeats}</div>
                        <span className="text-[10px] font-bold opacity-60">SEATS</span>
                    </div>
                </div>
                <div className="panel bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 rounded-xl shadow-md border-none">
                    <div className="flex justify-between items-center mb-1">
                        <h5 className="font-bold text-xs uppercase opacity-80 tracking-wider">Available Now</h5>
                        <IconChecks className="w-4 h-4 opacity-50" />
                    </div>
                    <div className="flex items-baseline gap-1">
                        <div className="text-2xl font-black">{availableCount}</div>
                        <span className="text-[10px] font-bold opacity-60">FREE</span>
                    </div>
                </div>
                <div className="panel bg-gradient-to-br from-orange-400 to-orange-600 text-white p-4 rounded-xl shadow-md border-none">
                    <div className="flex justify-between items-center mb-1">
                        <h5 className="font-bold text-xs uppercase opacity-80 tracking-wider">Booked</h5>
                        <IconInfoCircle className="w-4 h-4 opacity-50" />
                    </div>
                    <div className="flex items-baseline gap-1">
                        <div className="text-2xl font-black">{bookedCount}</div>
                        <span className="text-[10px] font-bold opacity-60">{dailyCount}D | {weeklyCount}W</span>
                    </div>
                </div>
                <div className="panel bg-gradient-to-br from-pink-500 to-rose-600 text-white p-4 rounded-xl shadow-md border-none">
                    <div className="flex justify-between items-center mb-1">
                        <h5 className="font-bold text-xs uppercase opacity-80 tracking-wider">Permanent</h5>
                        <IconInfoCircle className="w-4 h-4 opacity-50" />
                    </div>
                    <div className="flex items-baseline gap-1">
                        <div className="text-2xl font-black">{permanentCount}</div>
                        <span className="text-[10px] font-bold opacity-60">ALLOCATED</span>
                    </div>
                </div>
            </div>


            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Main View Area with Scrolling Canvas */}
                <div className="flex-1 bg-gray-100 dark:bg-black/20 rounded-2xl overflow-auto border border-gray-200 dark:border-gray-800 relative shadow-inner">
                    {!selectedFloor ? (
                        <div className="h-full flex justify-center items-center">
                            <div className="text-center opacity-50">
                                <IconInfoCircle className="w-12 h-12 mx-auto mb-4" />
                                <p className="font-bold">Select a location and floor to view the map.</p>
                            </div>
                        </div>
                    ) : elements.length === 0 ? (
                        <div className="h-full flex justify-center items-center">
                            <div className="text-center opacity-50">
                                <IconInfoCircle className="w-12 h-12 mx-auto mb-4" />
                                <p className="font-bold">No layout mapped for this floor.</p>
                            </div>
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
                                minHeight: stageSize.height,
                                display: 'block'
                            }}
                        >
                            <Layer>
                                {elements.map((el: any) => {
                                    if (el.type === 'zone' || el.type === 'room') {
                                        return (
                                            <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation}>
                                                <Rect
                                                    width={el.width}
                                                    height={el.height}
                                                    fill={el.color + '11'}
                                                    stroke={el.color}
                                                    strokeWidth={el.type === 'room' ? 2 : 1}
                                                    dash={el.type === 'room' ? [] : [5, 5]}
                                                />
                                                <Text text={el.name} fontSize={12} fill={el.color} padding={5} />
                                            </Group>
                                        );
                                    }
                                    if (el.type === 'seat') {
                                        const color = getSeatColor(el);
                                        const isSelected = selectedSeat?.id === el.id;
                                        return (
                                            <Group
                                                key={el.id}
                                                x={el.x}
                                                y={el.y}
                                                rotation={el.rotation}
                                                onClick={() => handleSeatClick(el)}
                                                onTap={() => handleSeatClick(el)}
                                                onMouseEnter={(e) => {
                                                    const container = e.target.getStage()?.container();
                                                    if (container) container.style.cursor = 'pointer';
                                                }}
                                                onMouseLeave={(e) => {
                                                    const container = e.target.getStage()?.container();
                                                    if (container) container.style.cursor = 'default';
                                                }}
                                            >
                                                <Rect
                                                    width={el.width}
                                                    height={el.height}
                                                    fill={color}
                                                    stroke={isSelected ? '#3b82f6' : 'white'}
                                                    strokeWidth={isSelected ? 3 : 1}
                                                    cornerRadius={6}
                                                    shadowColor="black"
                                                    shadowBlur={3}
                                                    shadowOpacity={0.2}
                                                    shadowOffset={{ x: 1, y: 1 }}
                                                />
                                                <Text
                                                    width={el.width}
                                                    height={el.height}
                                                    text={el.name}
                                                    fontSize={10}
                                                    fill="white"
                                                    align="center"
                                                    verticalAlign="middle"
                                                    fontStyle="bold"
                                                />
                                            </Group>
                                        );
                                    }
                                    if (el.type === 'door') {
                                        return (
                                            <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation}>
                                                <Rect width={el.width} height={2} y={-1} fill="#9CA3AF" opacity={0.5} />
                                                <Rect width={3} height={6} x={0} y={-3} fill="#6B7280" />
                                                <Rect width={3} height={6} x={el.width - 3} y={-3} fill="#6B7280" />
                                                <Rect width={3} height={el.width} x={0} y={-el.width} fill="#9CA3AF" stroke="#6B7280" strokeWidth={1} />
                                                <Arc x={0} y={0} innerRadius={el.width - 1} outerRadius={el.width} angle={90} rotation={-90} fill="#9CA3AF" opacity={0.2} />
                                            </Group>
                                        );
                                    }
                                    if (el.type === 'label') {
                                        return (
                                            <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation}>
                                                <Text text={el.name} fontSize={16} fontStyle="bold" fill={el.color || '#374151'} width={el.width} align="center" />
                                            </Group>
                                        );
                                    }
                                    return null;
                                })}
                            </Layer>
                        </Stage>
                    )
                }
                </div>

                {/* Sidebar: Details */}
                <div className="w-80 panel bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm overflow-y-auto">
                    {selectedSeat ? (
                        <div className="animate-fade-in-right">
                            <h5 className="font-bold text-lg mb-2">Seat {selectedSeat.name}</h5>
                            <hr className="my-4 border-white-light dark:border-[#1b2e4b]" />

                            {selectedSeat.booking ? (
                                <div className="space-y-4">
                                    <span className={`badge ${selectedSeat.booking.booking_type === 'permanent' ? 'badge-outline-secondary' : 'badge-outline-warning'}`}>
                                        Booked
                                    </span>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Occupant</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                                {selectedSeat.booking.employee_details.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{selectedSeat.booking.employee_details.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">ID: {selectedSeat.booking.employee_details.employee_id}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold">Type</p>
                                            <p className="font-bold capitalize text-sm">{selectedSeat.booking.booking_type}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold">Time</p>
                                            <p className="font-bold text-sm">
                                                {selectedSeat.booking.start_time ? selectedSeat.booking.start_time.substring(0, 5) : '00:00'} - {selectedSeat.booking.end_time ? selectedSeat.booking.end_time.substring(0, 5) : '23:59'}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedSeat.booking.end_date && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold">Date Range</p>
                                            <p className="font-bold text-sm">{selectedSeat.booking.start_date} to {selectedSeat.booking.end_date}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <span className="badge badge-outline-success">Available</span>
                                    <div className="mt-4 opacity-70">
                                        <p className="font-bold text-sm">This seat is completely unoccupied for the selected date.</p>
                                    </div>
                                </div>
                            )}

                            <button onClick={() => setSelectedSeat(null)} className="btn btn-outline-secondary w-full mt-6">
                                Close Details
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-50 text-center">
                            <IconInfoCircle className="w-12 h-12 mb-4 text-gray-400" />
                            <p className="font-bold">Select a seat</p>
                            <p className="text-xs">Click on any colored seat on the map to view its booking details</p>

                            <div className="mt-8 text-left w-full space-y-3">
                                <p className="text-xs uppercase font-bold border-b pb-1 dark:border-[#1b2e4b]">Legend</p>
                                <div className="flex items-center gap-2 text-sm font-bold"><span className="w-3 h-3 rounded-sm bg-[#10B981]"></span> Available</div>
                                <div className="flex items-center gap-2 text-sm font-bold"><span className="w-3 h-3 rounded-sm bg-[#FB923C]"></span> Temp Booking</div>
                                <div className="flex items-center gap-2 text-sm font-bold"><span className="w-3 h-3 rounded-sm bg-[#F472B6]"></span> Permanent</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 overflow-y-auto pt-20 pb-10">
                    <div className="panel w-full max-w-5xl animate-fade-in-down mx-4">
                        <div className="flex items-center justify-between mb-6">
                            <h5 className="font-bold text-xl flex items-center gap-2">
                                <IconClock className="text-primary w-6 h-6" />
                                All Seat Booking History
                            </h5>
                            <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600">
                                <IconX className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    className="form-input pl-10"
                                    placeholder="Search by employee or seat..."
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <IconSearch className="w-4 h-4" />
                                </div>
                            </div>
                            <button onClick={fetchHistory} className="btn btn-primary flex items-center gap-2">
                                <IconRefresh className={loadingHistory ? 'animate-spin' : ''} />
                                Refresh Data
                            </button>
                        </div>

                        <div className="table-responsive h-[500px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
                            {loadingHistory ? (
                                <div className="flex items-center justify-center h-40">
                                    <span className="animate-spin border-4 border-primary border-l-transparent rounded-full w-10 h-10"></span>
                                </div>
                            ) : (
                                <table className="table-hover">
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Seat Info</th>
                                            <th>Date & Time</th>
                                            <th>Type</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredHistory.length > 0 ? (
                                            filteredHistory.map((b: any) => (
                                                <tr key={b.id}>
                                                    <td>
                                                        <div className="font-bold">{b.employee_details.name}</div>
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase">ID: {b.employee_details.employee_id}</div>
                                                    </td>
                                                    <td>
                                                        <div className="font-bold text-primary">Seat {b.seat_details.seat_number}</div>
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase">Floor {b.seat_details.floor} - {b.seat_details.section}</div>
                                                    </td>
                                                    <td>
                                                        <div className="text-sm font-bold">{b.start_date} {b.end_date && ` to ${b.end_date}`}</div>
                                                        <div className="text-[10px] text-gray-500 font-bold italic">
                                                            {b.start_time?.substring(0, 5) || '00:00'} - {b.end_time?.substring(0, 5) || '23:59'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge capitalize ${b.booking_type === 'permanent' ? 'badge-outline-secondary' : 'badge-outline-info'}`}>
                                                            {b.booking_type}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge capitalize ${b.status === 'approved' ? 'badge-outline-success' :
                                                                b.status === 'rejected' ? 'badge-outline-danger' :
                                                                    b.status === 'cancelled' ? 'badge-outline-dark' :
                                                                        'badge-outline-warning'
                                                            }`}>
                                                            {b.status === 'pending' ? 'Pending Approval' : b.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="text-center py-10 opacity-50 font-bold">No booking history found matching your filters.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setShowHistoryModal(false)} className="btn btn-secondary">Close History</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSeatBookingsOverview;
