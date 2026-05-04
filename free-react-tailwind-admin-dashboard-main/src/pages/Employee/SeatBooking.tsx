import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Arc } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { IRootState } from '../../store';
import Swal from 'sweetalert2';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import IconChecks from '../../components/Icon/IconChecks';
import IconClock from '../../components/Icon/IconClock';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const SeatBooking = () => {
    const dispatch = useDispatch();
    const [locations, setLocations] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [loadingLocations, setLoadingLocations] = useState(true);

    const [floors, setFloors] = useState<any[]>([]);
    const [selectedFloor, setSelectedFloor] = useState<any>(null);
    const [loadingFloors, setLoadingFloors] = useState(false);
    const [elements, setElements] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [targetStartTime, setTargetStartTime] = useState('09:00');
    const [targetEndTime, setTargetEndTime] = useState('18:00');
    const [selectedSeat, setSelectedSeat] = useState<any>(null);

    // Booking Form State
    const [bookingType, setBookingType] = useState('daily');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');

    useEffect(() => {
        setStartDate(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        dispatch(setPageTitle('Book a Seat'));
        fetchLocations();
    }, []);

    useEffect(() => {
        if (selectedFloor) {
            fetchBookings(selectedFloor.id, selectedDate, targetStartTime, targetEndTime);
        }
    }, [selectedFloor, selectedDate, targetStartTime, targetEndTime]);

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

    const fetchBookings = async (floorId: number, date: string, startTime?: string, endTime?: string) => {
        try {
            const token = localStorage.getItem('access_token');
            let url = `${API_BASE_URL}/app/seat-bookings/?date=${date}&floor=${floorId}`;
            if (startTime && endTime) {
                url += `&start_time=${startTime}&end_time=${endTime}`;
            }
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

    const handleFloorSelect = (floor: any) => {
        setSelectedFloor(floor);
        setElements(floor.layout_data?.elements || []);
    };

    const stageSize = useMemo(() => {
        if (!selectedFloor || !elements || elements.length === 0) return { width: 1500, height: 1200 };
        const maxX = Math.max(...elements.map(el => (el.x || 0) + (el.width || 0)));
        const maxY = Math.max(...elements.map(el => (el.y || 0) + (el.height || 0)));
        return {
            width: Math.max(1500, maxX + 500),
            height: Math.max(1200, maxY + 500)
        };
    }, [elements, selectedFloor]);

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

    const handleBook = async () => {
        if (!selectedSeat) return;
        try {
            const token = localStorage.getItem('access_token');
            // We need the numeric Seat ID. In our simple JSON layout, we use 'name' as seat_id.
            // In a real app, we'd sync these to model IDs. 
            // For now, let's assume we can find the seat by its number/label.

            // First, find the seat in the backend to get its ID
            const seatRes = await fetch(`${API_BASE_URL}/app/office-seats/?floor=${selectedFloor.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const seatsData = await seatRes.json();
            const seatsList = Array.isArray(seatsData) ? seatsData : (seatsData.results || []);
            const backendSeat = seatsList.find((s: any) => s.seat_number === selectedSeat.name);

            if (!backendSeat) {
                Swal.fire('Error', 'Seat not registered in system', 'error');
                return;
            }

            // Date validation
            const actualStartDate = bookingType === 'daily' ? selectedDate : startDate;
            const actualEndDate = bookingType === 'daily' ? selectedDate : (bookingType === 'weekly' ? endDate : null);

            if (actualEndDate && actualStartDate && actualEndDate < actualStartDate) {
                Swal.fire('Error', 'End date cannot be before start date', 'warning');
                return;
            }

            const res = await fetch(`${API_BASE_URL}/app/seat-bookings/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    seat: backendSeat.id,
                    start_date: bookingType === 'daily' ? selectedDate : startDate,
                    end_date: bookingType === 'daily' ? selectedDate : (bookingType === 'weekly' ? endDate : null),
                    start_time: startTime,
                    end_time: endTime,
                    booking_type: bookingType
                })
            });

            if (res.ok) {
                Swal.fire('Success', 'Seat booked successfully!', 'success');
                fetchBookings(selectedFloor.id, selectedDate);
                setSelectedSeat(null);
            } else {
                const err = await res.json();
                let errorMsg = 'Failed to book seat';
                if (err.detail) {
                    errorMsg = Array.isArray(err.detail) ? err.detail[0] : err.detail;
                } else if (err.non_field_errors) {
                    errorMsg = Array.isArray(err.non_field_errors) ? err.non_field_errors[0] : err.non_field_errors;
                } else if (typeof err === 'object' && Object.keys(err).length > 0) {
                    const firstError = Object.values(err)[0];
                    if (Array.isArray(firstError)) {
                        errorMsg = firstError[0] as string;
                    } else if (typeof firstError === 'string') {
                        errorMsg = firstError;
                    }
                } else if (typeof err === 'string') {
                    errorMsg = err;
                }

                Swal.fire('Error', String(errorMsg), 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'An error occurred', 'error');
        }
    };

    const handleCancel = async (bookingId?: number) => {
        const idToCancel = bookingId || selectedSeat?.booking?.id;
        if (!idToCancel) return;

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to cancel this booking?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, cancel it!'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('access_token');
                const res = await fetch(`${API_BASE_URL}/app/seat-bookings/${idToCancel}/cancel/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    Swal.fire('Cancelled!', 'Your booking has been cancelled.', 'success');
                    fetchBookings(selectedFloor.id, selectedDate);
                    setSelectedSeat(null);
                } else {
                    const err = await res.json();
                    let errorMsg = 'Failed to cancel booking';
                    if (err.detail) {
                        errorMsg = Array.isArray(err.detail) ? err.detail[0] : err.detail;
                    } else if (err.error) {
                        errorMsg = Array.isArray(err.error) ? err.error[0] : err.error;
                    } else if (typeof err === 'object' && Object.keys(err).length > 0) {
                        const firstError = Object.values(err)[0];
                        if (Array.isArray(firstError)) {
                            errorMsg = firstError[0] as string;
                        } else if (typeof firstError === 'string') {
                            errorMsg = firstError;
                        }
                    }
                    Swal.fire('Error', String(errorMsg), 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'An error occurred while cancelling', 'error');
            }
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

    return (
        <div className="flex flex-col h-[calc(100vh-90px)] space-y-4">
            {/* Header Banner - Employee Style */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-xl p-4 text-white shadow-lg overflow-hidden relative">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-extrabold mb-0.5 tracking-tight">Reserve Your Workspace</h2>
                        <p className="text-white/80 text-sm font-medium">Select a seat on the interactive map below to reserve it for the day or week.</p>
                    </div>
                </div>
                <div className="absolute right-[-20px] top-[-20px] opacity-10">
                    <IconChecks className="w-48 h-48" />
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 pr-4 border-r border-gray-200 dark:border-gray-700">
                    <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400 whitespace-nowrap">Select Office</span>
                    <select
                        className="form-select bg-gray-50 dark:bg-[#1b2e4b] border-gray-200 dark:border-gray-700 rounded-lg pr-10 font-bold text-sm min-w-[180px] cursor-pointer hover:border-primary transition-colors focus:ring-primary shadow-sm"
                        value={selectedLocation?.id || ''}
                        onChange={(e) => {
                            const loc = locations.find(l => l.id === parseInt(e.target.value));
                            if (loc) handleLocationSelect(loc);
                        }}
                    >
                        <option value="" disabled>Choose Location...</option>
                        {locations.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-3 pr-4 border-r border-gray-200 dark:border-gray-700">
                    <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400 whitespace-nowrap">Select Floor</span>
                    <select
                        className="form-select bg-gray-50 dark:bg-[#1b2e4b] border-gray-200 dark:border-gray-700 rounded-lg pr-10 font-bold text-sm min-w-[180px] cursor-pointer hover:border-primary transition-colors focus:ring-primary shadow-sm"
                        value={selectedFloor?.id || ''}
                        disabled={!selectedLocation}
                        onChange={(e) => {
                            const floor = floors.find(f => f.id === parseInt(e.target.value));
                            if (floor) handleFloorSelect(floor);
                        }}
                    >
                        <option value="" disabled>Choose Floor...</option>
                        {floors.map(f => (
                            <option key={f.id} value={f.id}>
                                F{f.floor_number}: {f.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <label className="font-bold text-[10px] uppercase text-gray-400">Target Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="form-input w-40 h-9 font-bold"
                        />
                    </div>
                    <div className="flex items-center gap-3 border-l border-gray-200 dark:border-gray-700 pl-6">
                        <label className="font-bold text-[10px] uppercase text-gray-400">Target Time</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="time"
                                value={targetStartTime}
                                onChange={(e) => setTargetStartTime(e.target.value)}
                                className="form-input w-24 h-9 font-bold"
                            />
                            <span className="text-gray-400">to</span>
                            <input
                                type="time"
                                value={targetEndTime}
                                onChange={(e) => setTargetEndTime(e.target.value)}
                                className="form-input w-24 h-9 font-bold"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Main View */}
                <div className="flex-1 bg-gray-100 dark:bg-black/20 rounded-2xl overflow-auto border border-gray-200 dark:border-gray-800 relative shadow-inner">
                    <Stage
                        width={stageSize.width}
                        height={stageSize.height}
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
                            {elements.map((el) => {
                                if (el.type === 'zone' || el.type === 'room') {
                                    return (
                                        <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation}>
                                            <Rect
                                                width={el.width}
                                                height={el.height}
                                                fill={el.type === 'room' ? el.color + '11' : el.color + '11'}
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
                                    return (
                                        <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation} onClick={() => handleSeatClick(el)} className="cursor-pointer">
                                            <Rect
                                                width={el.width}
                                                height={el.height}
                                                fill={color}
                                                cornerRadius={6}
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
                                            {/* Hit Area for easier interaction */}
                                            <Rect
                                                width={el.width}
                                                height={el.width}
                                                y={-el.width}
                                                fill="transparent"
                                            />
                                            {/* Threshold / Wall segment */}
                                            <Rect
                                                width={el.width}
                                                height={2}
                                                y={-1}
                                                fill="#9CA3AF"
                                                opacity={0.5}
                                            />
                                            {/* Door Jambs */}
                                            <Rect width={3} height={6} x={0} y={-3} fill="#6B7280" />
                                            <Rect width={3} height={6} x={el.width - 3} y={-3} fill="#6B7280" />

                                            {/* The Door Leaf - Open 90 degrees */}
                                            <Rect
                                                width={3}
                                                height={el.width}
                                                x={0}
                                                y={-el.width}
                                                fill="#9CA3AF"
                                                stroke="#6B7280"
                                                strokeWidth={1}
                                            />

                                            {/* The Swing Arc - 90 degrees */}
                                            <Arc
                                                x={0}
                                                y={0}
                                                innerRadius={el.width - 1}
                                                outerRadius={el.width}
                                                angle={90}
                                                rotation={-90}
                                                fill="#9CA3AF"
                                                opacity={0.2}
                                            />
                                            <Arc
                                                x={0}
                                                y={0}
                                                innerRadius={el.width}
                                                outerRadius={el.width}
                                                angle={90}
                                                rotation={-90}
                                                stroke="#9CA3AF"
                                                strokeWidth={0.5}
                                                dash={[3, 3]}
                                            />
                                        </Group>
                                    );
                                }
                                if (el.type === 'label') {
                                    return (
                                        <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation}>
                                            <Text
                                                text={el.name}
                                                fontSize={16}
                                                fontStyle="bold"
                                                fill={el.color}
                                                width={el.width}
                                                align="center"
                                            />
                                        </Group>
                                    );
                                }
                                return null;
                            })}
                        </Layer>
                    </Stage>
                </div>

                {/* Sidebar: Details / Booking */}
                <div className="w-80 panel bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm overflow-y-auto">
                    {selectedSeat ? (
                        <div className="animate-fade-in-right">
                            <h5 className="font-bold text-lg mb-2">Seat {selectedSeat.name}</h5>
                            <hr className="my-4 border-white-light dark:border-[#1b2e4b]" />

                            {selectedSeat.booking ? (
                                <div className="space-y-4">
                                    <span className="badge badge-outline-danger">Booked</span>
                                    {selectedSeat.booking.status === 'pending' && (
                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 p-3 rounded-lg text-xs font-bold border border-yellow-200 dark:border-yellow-800 flex items-center gap-2">
                                            <span className="animate-pulse w-2 h-2 rounded-full bg-yellow-500"></span>
                                            Waiting for Admin Approval
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Occupant</p>
                                        <p className="font-bold">{selectedSeat.booking.employee_details.name}</p>
                                    </div>
                                    <div className="flex justify-between gap-4">
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
                                    {selectedSeat.booking.is_mine && (
                                        <button onClick={() => handleCancel()} className="btn btn-danger w-full mt-4 h-11 font-bold">
                                            Cancel Booking
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <span className="badge badge-outline-success">Available</span>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold uppercase mb-2 block">Booking Type</label>
                                            <select
                                                className="form-select font-bold"
                                                value={bookingType}
                                                onChange={(e) => setBookingType(e.target.value)}
                                            >
                                                <option value="daily">Daily (One Day)</option>
                                                <option value="weekly">Weekly (7 Days)</option>
                                                <option value="permanent">Permanent</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold uppercase mb-2 block">Start Time</label>
                                            <input
                                                type="time"
                                                className="form-input font-bold"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase mb-2 block">End Time</label>
                                            <input
                                                type="time"
                                                className="form-input font-bold"
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                            />
                                        </div>

                                        {bookingType === 'weekly' && (
                                            <div className="grid grid-cols-2 gap-4 col-span-2">
                                                <div>
                                                    <label className="text-xs font-bold uppercase mb-2 block">Start Date</label>
                                                    <input
                                                        type="date"
                                                        className="form-input font-bold text-xs"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold uppercase mb-2 block">End Date</label>
                                                    <input
                                                        type="date"
                                                        className="form-input font-bold text-xs"
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {(bookingType === 'weekly' || bookingType === 'permanent') && (
                                        <div className="bg-primary/10 text-primary p-3 rounded-lg text-[10px] font-bold uppercase tracking-wider leading-relaxed">
                                            Note: Weekly and Permanent bookings require Administrator approval.
                                        </div>
                                    )}

                                    <button onClick={handleBook} className="btn btn-primary w-full mt-4 h-11 font-bold">
                                        Confirm Booking
                                    </button>
                                </div>
                            )}

                            {/* Upcoming Schedule Section for Employees */}
                            {selectedSeat.upcomingBookings && selectedSeat.upcomingBookings.length > 0 && (
                                <div className="mt-8 animate-fade-in-down">
                                    <h6 className="text-[10px] uppercase font-black text-gray-400 mb-4 border-b pb-1 border-gray-100 dark:border-gray-800 tracking-widest">Upcoming Bookings</h6>
                                    <div className="space-y-3">
                                        {selectedSeat.upcomingBookings.slice(0, 3).map((b: any) => (
                                            <div key={b.id} className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 relative group overflow-hidden">
                                                <div className="flex justify-between items-start mb-2 relative z-10">
                                                    <div>
                                                        <p className="font-bold text-xs">{b.employee_details.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{b.booking_type}</p>
                                                    </div>
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                        b.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                                                    }`}>
                                                        {b.status}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] space-y-0.5 relative z-10">
                                                    <p className="font-bold text-gray-600 dark:text-gray-400">{b.start_date} {b.end_date && ` to ${b.end_date}`}</p>
                                                    <p className="text-gray-400 italic">{b.start_time?.substring(0, 5)} - {b.end_time?.substring(0, 5)}</p>
                                                </div>
                                                {b.is_mine && (
                                                    <div className="mt-3 relative z-10 flex justify-end">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCancel(b.id);
                                                            }}
                                                            className="text-[10px] font-bold text-danger hover:underline flex items-center gap-1 bg-danger/5 px-2 py-1 rounded-md transition-colors hover:bg-danger/10"
                                                        >
                                                            Cancel This Slot
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="absolute right-[-10px] bottom-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <IconClock className="w-12 h-12" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <button onClick={() => setSelectedSeat(null)} className="btn btn-outline-secondary w-full mt-2">
                                Close
                            </button>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                <span className="text-2xl font-bold">?</span>
                            </div>
                            <p className="text-sm font-bold">Select a seat on the map <br /> to view details or book</p>
                            <div className="flex flex-col gap-2 mt-6 w-full text-left">
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded bg-[#10B981]"></div>
                                    <span>Available</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded bg-[#FB923C]"></div>
                                    <span>Booked (Daily/Weekly)</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded bg-[#F472B6]"></div>
                                    <span>Permanent Seat</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded bg-[#FBBF24]"></div>
                                    <span>Pending Approval</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SeatBooking;
