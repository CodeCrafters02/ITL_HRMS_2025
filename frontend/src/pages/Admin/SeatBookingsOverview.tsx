import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Arc } from 'react-konva';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconUsers from '../../components/Icon/IconUsers';
import IconChecks from '../../components/Icon/IconChecks';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const AdminSeatBookingsOverview = () => {
    const dispatch = useDispatch();
    const [locations, setLocations] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [loadingLocations, setLoadingLocations] = useState(true);
    
    const [floors, setFloors] = useState<any[]>([]);
    const [selectedFloor, setSelectedFloor] = useState<any>(null);
    const [loadingFloors, setLoadingFloors] = useState(false);
    
    const [elements, setElements] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [totalSeats, setTotalSeats] = useState<number>(0);
    
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedSeat, setSelectedSeat] = useState<any>(null);
    
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
            // We only need approved bookings for the map
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

    const getSeatColor = (el: any) => {
        const booking = bookings.find(b => b.seat_details.seat_number === el.name);
        if (booking) {
            return booking.booking_type === 'permanent' ? '#F472B6' : '#FB923C'; // Pink for Permanent, Orange for Temp
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-[#0e1726] p-4 rounded-xl shadow-sm gap-4">
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

                <div className="flex items-center gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase mb-1 block">Filter Date</label>
                        <input 
                            type="date" 
                            className="form-input w-40 font-bold"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Summary Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="panel bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <h5 className="font-bold text-lg">Total Seats</h5>
                        <IconUsers className="w-6 h-6 opacity-80" />
                    </div>
                    <div className="text-3xl font-extrabold">{totalSeats}</div>
                </div>
                <div className="panel bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-5 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <h5 className="font-bold text-lg">Available</h5>
                        <IconChecks className="w-6 h-6 opacity-80" />
                    </div>
                    <div className="text-3xl font-extrabold">{availableCount}</div>
                </div>
                <div className="panel bg-gradient-to-r from-orange-400 to-orange-500 text-white p-5 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <h5 className="font-bold text-lg">Booked</h5>
                        <IconInfoCircle className="w-6 h-6 opacity-80" />
                    </div>
                    <div className="text-3xl font-extrabold">{bookedCount}</div>
                    <div className="text-xs mt-2 opacity-90 font-bold tracking-wide">
                        {dailyCount} Daily | {weeklyCount} Weekly
                    </div>
                </div>
                <div className="panel bg-gradient-to-r from-pink-500 to-pink-600 text-white p-5 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <h5 className="font-bold text-lg">Permanent</h5>
                        <IconInfoCircle className="w-6 h-6 opacity-80" />
                    </div>
                    <div className="text-3xl font-extrabold">{permanentCount}</div>
                    <div className="text-xs mt-2 opacity-90 font-bold tracking-wide">
                        Long-Term Allocation
                    </div>
                </div>
            </div>

            <div className="flex gap-6 h-[700px]">
                {/* Main Map Area */}
                {!selectedFloor ? (
                    <div className="flex-1 panel bg-gray-50 dark:bg-[#0e1726]/50 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 flex justify-center items-center">
                        <div className="text-center opacity-50">
                            <IconInfoCircle className="w-12 h-12 mx-auto mb-4" />
                            <p className="font-bold">Select a location and floor to view the map.</p>
                        </div>
                    </div>
                ) : elements.length === 0 ? (
                    <div className="flex-1 panel bg-gray-50 dark:bg-[#0e1726]/50 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 flex justify-center items-center">
                        <div className="text-center opacity-50">
                            <IconInfoCircle className="w-12 h-12 mx-auto mb-4" />
                            <p className="font-bold">No layout mapped for this floor.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 bg-gray-100 dark:bg-black/20 rounded-2xl overflow-auto border border-gray-200 dark:border-gray-800 relative shadow-inner">
                        <Stage 
                            width={1000} 
                            height={800} 
                            ref={stageRef}
                            className="bg-white dark:bg-[#1a2233]"
                            style={{ backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)', backgroundSize: '20px 20px' }}
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
                    </div>
                )}

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
        </div>
    );
};

export default AdminSeatBookingsOverview;
