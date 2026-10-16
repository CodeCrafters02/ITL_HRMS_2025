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
import IconTrash from '../../components/Icon/IconTrash';
import Swal from 'sweetalert2';
import DataTable, { Column } from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';

import StatCard, { StatGrid } from '../../components/Common/StatCard';
import Button, { IconButton } from '../../components/Common/Button';
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
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPageSize, setHistoryPageSize] = useState(10);
    const [historyTotalCount, setHistoryTotalCount] = useState(0);

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
            const url = `${API_BASE_URL}/app/seat-bookings/?date=${date}&floor=${floorId}`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBookings(Array.isArray(data) ? data : (data.results || []));
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

    const handleSeatClick = async (seat: any) => {
        // Find if it's booked for the CURRENTLY SELECTED date
        const currentBooking = bookings.find(b => b.seat_details.seat_number === seat.name);
        
        let upcoming = [];
        try {
            const token = localStorage.getItem('access_token');
            // Fetch ALL active bookings for this seat to see the future schedule
            const res = await fetch(`${API_BASE_URL}/app/seat-bookings/?seat_number=${seat.name}&floor=${selectedFloor.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter out the one already shown as "current" if it exists
                upcoming = (data || []).filter((b: any) => b.id !== currentBooking?.id);
            }
        } catch (error) {
            console.error('Error fetching seat schedule:', error);
        }

        setSelectedSeat({ ...seat, booking: currentBooking, upcomingBookings: upcoming });
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const token = localStorage.getItem('access_token');
            const url = new URL(`${API_BASE_URL}/app/seat-bookings/`);
            url.searchParams.set('history', 'true');
            url.searchParams.set('page', String(historyPage));
            url.searchParams.set('page_size', String(historyPageSize));
            if (historySearch.trim()) url.searchParams.set('search', historySearch.trim());

            const res = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const list = data.results || (Array.isArray(data) ? data : []);
                setHistoryBookings(list);
                setHistoryTotalCount(data.count !== undefined ? data.count : list.length);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (showHistoryModal) {
            const timer = setTimeout(() => {
                fetchHistory();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [showHistoryModal, historyPage, historyPageSize, historySearch]);

    const handleCancelBooking = async (bookingId: number) => {
        try {
            const { isConfirmed } = await Swal.fire({
                title: 'Cancel Booking?',
                text: "Are you sure you want to cancel this seat booking? This action cannot be undone.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#3b82f6',
                confirmButtonText: 'Yes, Cancel it!',
                padding: '2em',
                customClass: {
                    popup: 'sweet-alerts',
                },
            });

            if (isConfirmed) {
                const token = localStorage.getItem('access_token');
                const res = await fetch(`${API_BASE_URL}/app/seat-bookings/${bookingId}/cancel/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    Swal.fire({
                        title: 'Cancelled!',
                        text: 'The booking has been successfully cancelled.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    
                    // Refresh data
                    if (selectedFloor) {
                        fetchBookings(selectedFloor.id, selectedDate);
                    }
                    if (showHistoryModal) {
                        fetchHistory();
                    }
                    if (selectedSeat) {
                        // Refresh selected seat data if it's the one cancelled
                        handleSeatClick(selectedSeat);
                    }
                } else {
                    const error = await res.json();
                    Swal.fire('Error', error.error || 'Failed to cancel booking', 'error');
                }
            }
        } catch (error) {
            Swal.fire('Error', 'An unexpected error occurred', 'error');
        }
    };

    const getSeatColor = (el: any) => {
        const booking = bookings.find(b => b.seat_details.seat_number === el.name);
        if (booking) {
            if (booking.status === 'pending') {
                return '#FBBF24'; // Yellow for Pending
            }
            return booking.booking_type === 'permanent' ? '#F472B6' : '#FB923C'; // Pink for Permanent, Orange for Temp/Weekly
        }
        return '#10B981'; // Green for Available
    };

    // Calculate Summary
    const bookedCount = bookings.length;
    const availableCount = totalSeats > bookedCount ? totalSeats - bookedCount : 0;
    const permanentCount = bookings.filter(b => b.booking_type === 'permanent').length;
    const weeklyCount = bookings.filter(b => b.booking_type === 'weekly').length;
    const dailyCount = bookings.filter(b => b.booking_type === 'daily').length;


    return (
        <div className="flex flex-col h-[calc(var(--app-vh)_-_90px)] space-y-4">
            {/* Executive Page Header */}
            <PageHeader
                title="Seat Management Insights"
                subtitle="Real-time office occupancy tracking, interactive floor plans, and employee workspace allocation."
                icon={<IconInfoCircle />}
                badge="Facilities & Seating"
                variant="emerald"
                className="mb-0"
                actions={
                    <button 
                        onClick={() => setShowHistoryModal(true)}
                        className="btn btn-outline-primary gap-2"
                    >
                        <IconClock className="w-4 h-4" />
                        View History
                    </button>
                }
            />

            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm gap-4 border border-gray-100 dark:border-gray-800">
                <div className="flex flex-wrap items-center gap-4 min-w-0 max-w-full">
                    {loadingLocations ? (
                        <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    ) : (
                        <select
                            className="form-select w-full sm:w-48 font-bold"
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
                            className="form-select w-full sm:w-48 font-bold"
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
                    <Button
                        onClick={() => {
                            setShowHistoryModal(true);
                            fetchHistory();
                        }}
                        
                        title="View All History"
                    >
                        <IconClock className="w-4 h-4" />
                        History
                    </Button>
                </div>
            </div>

            {/* Restored Analytics Cards */}
            <StatGrid cols={4}>
                <StatCard label="Total Capacity" value={totalSeats} tone="primary" icon={<IconUsers />} hint="seats" />
                <StatCard label="Available Now" value={availableCount} tone="success" icon={<IconChecks />} hint="free" />
                <StatCard label="Booked" value={bookedCount} tone="warning" icon={<IconInfoCircle />} hint={`${dailyCount}D | ${weeklyCount}W`} />
                <StatCard label="Permanent" value={permanentCount} tone="purple" icon={<IconInfoCircle />} hint="allocated" />
            </StatGrid>


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

                                    <Button variant="outline-danger" className="w-full mt-2" 
                                        onClick={() => handleCancelBooking(selectedSeat.booking.id)}
                                        
                                    >
                                        <IconTrash className="w-4 h-4" />
                                        Cancel This Booking
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <span className="badge badge-outline-success">Available</span>
                                    <div className="mt-4 opacity-70">
                                        <p className="font-bold text-sm">This seat is completely unoccupied for the selected date.</p>
                                    </div>
                                </div>
                            )}

                            {/* Upcoming Schedule Section */}
                            {selectedSeat.upcomingBookings && selectedSeat.upcomingBookings.length > 0 && (
                                <div className="mt-8 animate-fade-in-down">
                                    <h6 className="text-[10px] uppercase font-black text-gray-400 mb-4 border-b pb-1 border-gray-100 dark:border-gray-800 tracking-widest">Upcoming Schedule</h6>
                                    <div className="space-y-3">
                                        {selectedSeat.upcomingBookings.slice(0, 5).map((b: any) => (
                                            <div key={b.id} className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 relative group overflow-hidden">
                                                <div className="flex justify-between items-start mb-2 relative z-10">
                                                    <div>
                                                        <p className="font-bold text-xs">{b.employee_details.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{b.booking_type}</p>
                                                    </div>
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                        b.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-brand-100 text-brand-600'
                                                    }`}>
                                                        {b.status}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] space-y-0.5 relative z-10">
                                                    <p className="font-bold text-gray-600 dark:text-gray-400">{b.start_date} {b.end_date && ` to ${b.end_date}`}</p>
                                                    <p className="text-gray-400 italic">{b.start_time?.substring(0, 5)} - {b.end_time?.substring(0, 5)}</p>
                                                </div>
                                                
                                                {/* Quick Cancel for Admin */}
                                                <IconButton tone="danger" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCancelBooking(b.id);
                                                    }}
                                                    
                                                    title="Cancel Booking"
                                                >
                                                    <IconTrash className="w-3.5 h-3.5" />
                                                </IconButton>

                                                <div className="absolute right-[-10px] bottom-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <IconClock className="w-12 h-12" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Button variant="secondary" className="w-full mt-6" onClick={() => setSelectedSeat(null)} >
                                Close Details
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-50 text-center">
                            <IconInfoCircle className="w-12 h-12 mb-4 text-gray-400" />
                            <p className="font-bold">Select a seat</p>
                            <p className="text-xs">Click on any colored seat on the map to view its booking details</p>

                            <div className="mt-8 text-left w-full space-y-3">
                                <p className="text-xs uppercase font-bold border-b pb-1 dark:border-[#1b2e4b]">Legend</p>
                                <div className="flex items-center gap-2 text-sm font-bold"><span className="w-3 h-3 rounded-sm bg-[#10B981]"></span> Available</div>
                                <div className="flex items-center gap-2 text-sm font-bold"><span className="w-3 h-3 rounded-sm bg-[#FB923C]"></span> Daily/Weekly</div>
                                <div className="flex items-center gap-2 text-sm font-bold"><span className="w-3 h-3 rounded-sm bg-[#F472B6]"></span> Permanent</div>
                                <div className="flex items-center gap-2 text-sm font-bold"><span className="w-3 h-3 rounded-sm bg-[#FBBF24]"></span> Pending Approval</div>
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

                        <DataTable
                            columns={[
                                {
                                    key: 'index',
                                    title: '#',
                                    width: '60px',
                                    align: 'center',
                                    render: (_val: any, _b: any, idx: number) => (
                                        <span className="font-semibold text-gray-500">{(historyPage - 1) * historyPageSize + (idx ?? 0) + 1}</span>
                                    ),
                                },
                                {
                                    key: 'employee',
                                    title: 'Employee',
                                    sortable: true,
                                    render: (_val: any, b: any) => (
                                        <div>
                                            <div className="font-bold text-gray-800 dark:text-white-light">{b.employee_details?.name}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase">ID: {b.employee_details?.employee_id}</div>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'seat_number',
                                    title: 'Seat Info',
                                    sortable: true,
                                    render: (_val: any, b: any) => (
                                        <div>
                                            <div className="font-bold text-primary">Seat {b.seat_details?.seat_number}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase">Floor {b.seat_details?.floor} - {b.seat_details?.section}</div>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'start_date',
                                    title: 'Date & Time',
                                    sortable: true,
                                    render: (_val: any, b: any) => (
                                        <div>
                                            <div className="text-sm font-bold">{b.start_date} {b.end_date && ` to ${b.end_date}`}</div>
                                            <div className="text-[10px] text-gray-500 font-bold italic">
                                                {b.start_time?.substring(0, 5) || '00:00'} - {b.end_time?.substring(0, 5) || '23:59'}
                                            </div>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'booking_type',
                                    title: 'Type',
                                    sortable: true,
                                    render: (_val: any, b: any) => (
                                        <span className={`badge capitalize ${b.booking_type === 'permanent' ? 'badge-outline-secondary' : 'badge-outline-info'}`}>
                                            {b.booking_type}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'status',
                                    title: 'Status',
                                    sortable: true,
                                    render: (_val: any, b: any) => (
                                        <span className={`badge capitalize ${
                                            b.status === 'approved' ? 'badge-outline-success text-success bg-success/10' :
                                            b.status === 'rejected' ? 'badge-outline-danger text-danger bg-danger/10' :
                                            b.status === 'cancelled' ? 'badge-outline-dark text-dark dark:text-gray-400' :
                                            'badge-outline-warning text-warning bg-warning/10'
                                        }`}>
                                            {b.status === 'pending' ? 'Pending Approval' : b.status}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'actions',
                                    title: 'Action',
                                    align: 'center',
                                    width: '80px',
                                    render: (_val: any, b: any) => (
                                        (b.status === 'approved' || b.status === 'pending') ? (
                                             <IconButton tone="danger" 
                                                onClick={() => handleCancelBooking(b.id)}
                                                
                                                title="Cancel Booking"
                                            >
                                                <IconTrash className="w-4 h-4" />
                                            </IconButton>
                                        ) : null
                                    ),
                                },
                            ]}
                            data={historyBookings}
                            loading={loadingHistory}
                            page={historyPage}
                            pageSize={historyPageSize}
                            totalCount={historyTotalCount}
                            onPageChange={(p) => setHistoryPage(p)}
                            onPageSizeChange={(sz) => {
                                setHistoryPageSize(sz);
                                setHistoryPage(1);
                            }}
                            onRefresh={fetchHistory}
                            searchValue={historySearch}
                            onSearchChange={(val) => {
                                setHistorySearch(val);
                                setHistoryPage(1);
                            }}
                            searchPlaceholder="Search by employee or seat..."
                        />

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
