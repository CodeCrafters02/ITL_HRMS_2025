import { useState, useEffect, memo } from 'react';
import { axiosInstance } from '../Dashboard/api';
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";
import { FaCalendarAlt, FaChair, FaBuilding, FaCheckCircle, FaTimes, FaSearch, FaFilter, FaClock, FaUsers, FaMapMarkerAlt, FaTrash, FaPlus } from 'react-icons/fa';

// Separate LiveClock component to prevent re-rendering the entire page
const LiveClock = memo(() => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg min-w-[220px]">
            <div className="flex items-center gap-3">
                <FaClock className="text-white text-2xl" />
                <div>
                    <div className="text-white font-bold text-xl tracking-wider">
                        {formatTime(currentTime)}
                    </div>
                    <div className="text-white/80 text-xs mt-1">
                        Live Time
                    </div>
                </div>
            </div>
        </div>
    );
});

interface Floor {
    id: number;
    name: string;
    floor_number: number;
    description: string;
    sections: Section[];
}

interface Section {
    id: number;
    name: string;
    department: number | null;
    department_name: string | null;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    color: string;
    seats: Seat[];
    floor: number;
    rotation?: number;
}

interface Seat {
    id: number;
    seat_number: string;
    employee: number | null;
    employee_details: any;
    position_x: number;
    position_y: number;
    is_available: boolean;
    section: number;
    rotation?: number;
}

interface SeatBooking {
    id: number;
    seat: number;
    employee: number;
    booking_date: string;
    employee_details: {
        id: number;
        name: string;
        employee_id: string;
    };
    seat_details?: {
        seat_number: string;
        section_name?: string;
    };
}

const DeskBooking = () => {
    const [floors, setFloors] = useState<Floor[]>([]);
    const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
    const [bookings, setBookings] = useState<SeatBooking[]>([]);
    const [myBookings, setMyBookings] = useState<SeatBooking[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; seat: Seat | null }>({ isOpen: false, seat: null });
    const [successModal, setSuccessModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'occupied'>('all');
    const [showMyBookings, setShowMyBookings] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

    useEffect(() => {
        fetchFloors();
        fetchMyBookings();
    }, []);

    useEffect(() => {
        if (selectedDate) {
            fetchBookings();
        }
    }, [selectedDate]);

    const fetchFloors = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get('app/office-floors/');
            setFloors(response.data);
            if (response.data.length > 0 && !selectedFloor) {
                setSelectedFloor(response.data[0]);
            }
        } catch (error) {
            console.error('Error fetching floors:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBookings = async () => {
        try {
            // Use local date to avoid timezone issues
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const response = await axiosInstance.get(`app/seat-bookings/?booking_date=${dateStr}`);
            setBookings(response.data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

    const fetchMyBookings = async () => {
        try {
            const response = await axiosInstance.get('app/seat-bookings/');
            // Filter to get only current user's bookings
            setMyBookings(response.data);
        } catch (error) {
            console.error('Error fetching my bookings:', error);
        }
    };

    const handleSeatClick = (seat: Seat) => {
        // Check if permanently assigned
        if (seat.employee) {
            alert(`This seat is permanently assigned to ${seat.employee_details?.name || 'an employee'}.`);
            return;
        }

        // Check if booked for the selected date
        const booking = bookings.find(b => b.seat === seat.id);
        if (booking) {
            alert(`This seat is already booked by ${booking.employee_details?.name || 'someone'} for ${selectedDate.toDateString()}.`);
            return;
        }

        // Ignore door seats
        if (seat.seat_number.startsWith('D-') || seat.seat_number.startsWith('DOOR')) return;

        // Show confirmation modal for available seats
        setConfirmModal({ isOpen: true, seat });
    };

    const confirmBooking = async () => {
        if (!confirmModal.seat) return;

        try {
            // Use local date to avoid timezone issues
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            await axiosInstance.post('app/seat-bookings/', {
                seat: confirmModal.seat.id,
                booking_date: dateStr,
            });

            setSuccessModal({
                isOpen: true,
                message: `Successfully booked ${confirmModal.seat.seat_number} for ${selectedDate.toDateString()}!`
            });
            setConfirmModal({ isOpen: false, seat: null });
            fetchBookings();
            fetchMyBookings();

            setTimeout(() => {
                setSuccessModal({ isOpen: false, message: '' });
            }, 3000);
        } catch (error: any) {
            console.error('Error booking desk:', error);
            console.error('Error response:', error.response);

            // Extract error message - check multiple possible locations
            let errorMessage = 'Unknown error';

            if (error.response?.data) {
                const data = error.response.data;
                // Check common error field locations
                errorMessage = data.detail ||
                    data.error ||
                    data.message ||
                    (data.seat && Array.isArray(data.seat) ? data.seat[0] : null) ||
                    (data.booking_date && Array.isArray(data.booking_date) ? data.booking_date[0] : null) ||
                    (data.employee && Array.isArray(data.employee) ? data.employee[0] : null) ||
                    (data.non_field_errors && Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : null) ||
                    JSON.stringify(data);
            }

            alert(`Failed to book desk: ${errorMessage}`);
            setConfirmModal({ isOpen: false, seat: null });
        }
    };

    const cancelBooking = async (bookingId: number) => {
        if (!confirm('Are you sure you want to cancel this booking?')) return;

        try {
            await axiosInstance.delete(`app/seat-bookings/${bookingId}/`);
            setSuccessModal({ isOpen: true, message: 'Booking cancelled successfully!' });

            // Refresh both the floor layout and my bookings section
            fetchBookings();  // Update floor chart to show seat as available
            fetchMyBookings(); // Update My Bookings section


            setTimeout(() => {
                setSuccessModal({ isOpen: false, message: '' });
            }, 3000);
        } catch (error: any) {
            console.error('Error cancelling booking:', error);
            alert(`Failed to cancel booking: ${error.response?.data?.detail || 'Unknown error'}`);
        }
    };

    // Statistics calculations
    const totalSeats = selectedFloor?.sections?.reduce((acc, section) => {
        if (section.name === '_FLOOR_ASSETS_') return acc;
        return acc + (section.seats?.filter(s => !s.seat_number.startsWith('D-') && !s.seat_number.startsWith('DOOR')).length || 0);
    }, 0) || 0;

    const occupiedSeats = selectedFloor?.sections?.reduce((acc, section) => {
        if (section.name === '_FLOOR_ASSETS_') return acc;
        return acc + (section.seats?.filter(s => s.employee !== null && !s.seat_number.startsWith('D-') && !s.seat_number.startsWith('DOOR')).length || 0);
    }, 0) || 0;

    const bookedSeatsCount = bookings.length;
    const availableSeats = totalSeats - occupiedSeats - bookedSeatsCount;

    const today = new Date().toISOString().split('T')[0];
    const activeBookings = myBookings.filter(b => b.booking_date >= today);
    const pastBookings = myBookings.filter(b => b.booking_date < today);

    const displayedBookings = activeTab === 'active' ? activeBookings : pastBookings;


    // Icons
    const ChairIcon = ({ color, status }: { color: string; status: 'available' | 'occupied' | 'booked' }) => {
        let fill = '#F3F4F6';

        if (status === 'occupied') fill = '#9CA3AF';
        if (status === 'booked') fill = '#FB923C';

        return (
            <svg width="60" height="70" viewBox="0 0 60 70" fill="none" className="drop-shadow-sm">
                <rect x="5" y="18" width="50" height="35" rx="4"
                    fill={fill}
                    stroke={color}
                    strokeWidth="2.5"
                    className="transition-all duration-300"
                />
                <rect x="12" y="56" width="36" height="10" rx="3"
                    fill={fill}
                    opacity="0.9"
                />
                <rect x="14" y="48" width="32" height="10" rx="3"
                    fill={fill}
                    opacity="0.7"
                />
                {status !== 'available' && (
                    <circle cx="30" cy="30" r="4" fill="white" opacity="0.8" />
                )}
            </svg>
        );
    };

    const DoorIcon = ({ color }: { color: string }) => (
        <svg width="60" height="80" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="5" width="40" height="70" rx="2" fill={color} opacity="0.9" stroke="#333" strokeWidth="2" />
            <rect x="15" y="10" width="30" height="30" rx="1" fill="white" opacity="0.2" />
            <rect x="15" y="45" width="30" height="20" rx="1" fill="white" opacity="0.2" />
            <circle cx="42" cy="40" r="3" fill="#FFD700" stroke="#333" strokeWidth="1" />
        </svg>
    );

    const renderDesk = (seat: Seat, sectionColor: string, isFloorAsset: boolean = false) => {
        if (seat.seat_number.startsWith('FLOOR-DOOR')) return null;

        const isPermanent = seat.employee !== null;
        const booking = bookings.find(b => b.seat === seat.id);
        const isBooked = !!booking;

        let status: 'available' | 'occupied' | 'booked' = 'available';
        let label = seat.seat_number;
        let title = "Available - Click to book";

        if (isPermanent) {
            status = 'occupied';
            label = seat.employee_details?.name || 'Occupied';
            title = `Permanently assigned to ${seat.employee_details?.name}`;
        } else if (isBooked) {
            status = 'booked';
            label = booking.employee_details?.name || 'Booked';
            title = `Booked by ${booking.employee_details?.name} for ${selectedDate.toDateString()}`;
        }

        const isDoor = isFloorAsset;

        return (
            <div
                key={seat.id}
                className={`absolute flex flex-col items-center group transition-all duration-200 ${!isDoor && status === 'available' ? 'cursor-pointer hover:z-20 hover:scale-110 animate-pulse-slow' : 'cursor-not-allowed'}`}
                style={{
                    left: seat.position_x,
                    top: seat.position_y,
                    transform: `rotate(${seat.rotation || 0}deg)`,
                    transformOrigin: 'center center',
                }}
                onClick={() => !isDoor && handleSeatClick(seat)}
                title={isDoor ? 'Door' : title}
            >
                <div className="relative">
                    <div
                        className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm border whitespace-nowrap overflow-hidden max-w-[100px] text-ellipsis ${status === 'available' ? 'bg-green-100 border-green-300 text-green-700' :
                            status === 'booked' ? 'bg-orange-100 border-orange-300 text-orange-700' :
                                'bg-gray-100 border-gray-300 text-gray-700'
                            }`}
                    >
                        {isDoor ? '🚪' : label}
                    </div>

                    {isDoor ? (
                        <DoorIcon color={sectionColor} />
                    ) : (
                        <ChairIcon color={sectionColor} status={status} />
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg font-semibold">Loading desk booking...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 pb-8">
            {/* Hero Header Section */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900 rounded-b-3xl shadow-2xl overflow-hidden mb-6">
                <div className="relative p-8">
                    {/* Animated background pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0" style={{
                            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                            backgroundSize: '40px 40px'
                        }}></div>
                    </div>

                    <div className="relative">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-6">
                            {/* Left side - Title */}
                            <div className="flex items-center gap-4 flex-1">
                                <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg animate-pulse">
                                    <FaChair className="text-white text-4xl" />
                                </div>
                                <div>
                                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
                                        Desk Booking
                                    </h1>
                                    <p className="text-white/90 text-sm sm:text-base font-medium">
                                        Reserve your workspace for the day
                                    </p>
                                </div>
                            </div>

                            {/* Right side - Live Clock and Date Picker */}
                            <div className="flex items-center gap-4">
                                {/* Live Clock Card */}
                                <LiveClock />

                                {/* Date Picker */}
                                <div className="flex items-center gap-3 bg-white/20 backdrop-blur-md p-3 rounded-xl shadow-sm">
                                    <FaCalendarAlt className="text-white text-xl" />
                                    <Flatpickr
                                        className="bg-transparent border-none outline-none font-medium cursor-pointer text-white placeholder-white/70"
                                        value={selectedDate}
                                        onChange={([date]) => setSelectedDate(date)}
                                        options={{
                                            minDate: "today",
                                            dateFormat: "Y-m-d",
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section - Date banner */}
                        <div className="pt-4 border-t border-white/30">
                            <div className="flex items-center justify-between">
                                <p className="text-white/90 text-sm font-medium">
                                    {selectedDate.toLocaleDateString('en-IN', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/30 text-white">
                                        ● Live
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="max-w-7xl mx-auto px-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Available Desks */}
                    <div className="group p-5 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-700 dark:to-emerald-800">
                        <div className="flex items-center gap-3 mb-2">
                            <FaCheckCircle className="text-white text-3xl group-hover:animate-bounce" />
                            <div>
                                <h3 className="text-white font-bold text-2xl">{availableSeats}</h3>
                                <p className="text-white/90 text-sm">Available Today</p>
                            </div>
                        </div>
                    </div>

                    {/* Occupied Desks */}
                    <div className="group p-5 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer bg-gradient-to-br from-red-500 to-pink-600 dark:from-red-700 dark:to-pink-800">
                        <div className="flex items-center gap-3 mb-2">
                            <FaUsers className="text-white text-3xl group-hover:animate-bounce" />
                            <div>
                                <h3 className="text-white font-bold text-2xl">{occupiedSeats}</h3>
                                <p className="text-white/90 text-sm">Permanently Occupied</p>
                            </div>
                        </div>
                    </div>

                    {/* Booked Today */}
                    <div className="group p-5 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer bg-gradient-to-br from-orange-500 to-amber-600 dark:from-orange-700 dark:to-amber-800">
                        <div className="flex items-center gap-3 mb-2">
                            <FaCalendarAlt className="text-white text-3xl group-hover:animate-bounce" />
                            <div>
                                <h3 className="text-white font-bold text-2xl">{bookedSeatsCount}</h3>
                                <p className="text-white/90 text-sm">Booked Today</p>
                            </div>
                        </div>
                    </div>

                    {/* My Bookings */}
                    <div className="group p-5 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-700 dark:to-indigo-800">
                        <div className="flex items-center gap-3 mb-2">
                            <FaMapMarkerAlt className="text-white text-3xl group-hover:animate-bounce" />
                            <div>
                                <h3 className="text-white font-bold text-2xl">{activeBookings.length}</h3>
                                <p className="text-white/90 text-sm">My Active Bookings</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* My Bookings Section */}
            {showMyBookings && myBookings.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 mb-6">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <FaBuilding className="text-blue-600" />
                                My Bookings
                            </h2>
                            <button
                                onClick={() => setShowMyBookings(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <FaTimes className="text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setActiveTab('active')}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'active'
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                Active ({activeBookings.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('past')}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'past'
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                Past ({pastBookings.length})
                            </button>
                        </div>

                        {/* Bookings List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {displayedBookings.length === 0 ? (
                                <div className="col-span-full text-center py-8">
                                    <FaCalendarAlt className="text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {activeTab === 'active' ? 'No active bookings' : 'No past bookings'}
                                    </p>
                                </div>
                            ) : (
                                displayedBookings.map(booking => (
                                    <div
                                        key={booking.id}
                                        className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 border border-blue-200 dark:border-gray-500 hover:shadow-lg transition-all"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <FaChair className="text-blue-600 dark:text-blue-400 text-xl" />
                                                <h3 className="font-bold text-gray-900 dark:text-white">
                                                    Seat {booking.seat}
                                                </h3>
                                            </div>
                                            {activeTab === 'active' && (
                                                <button
                                                    onClick={() => cancelBooking(booking.id)}
                                                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-all"
                                                    title="Cancel Booking"
                                                >
                                                    <FaTrash />
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <FaCalendarAlt className="text-gray-500" />
                                                <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex gap-6">
                    {/* Sidebar */}
                    <div className="w-72 flex-shrink-0 flex flex-col gap-3">
                        {/* Search & Filter */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-4">
                            <h3 className="font-bold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                                <FaSearch className="text-blue-600" />
                                Search & Filter
                            </h3>
                            <div className="space-y-3">
                                <div className="relative">
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search sections..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div className="relative">
                                    <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value as any)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white cursor-pointer"
                                    >
                                        <option value="all">All Seats</option>
                                        <option value="available">Available Only</option>
                                        <option value="occupied">Occupied Only</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-4">
                            <h3 className="font-bold mb-3 text-gray-900 dark:text-white">Status Legend</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-500"></div>
                                    <span className="text-gray-700 dark:text-gray-300">Available</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-gray-400 border-2 border-gray-600"></div>
                                    <span className="text-gray-700 dark:text-gray-300">Permanent</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-orange-100 border-2 border-orange-500"></div>
                                    <span className="text-gray-700 dark:text-gray-300">Booked</span>
                                </div>
                            </div>
                        </div>

                        {/* Floors List */}
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-4 flex flex-col flex-1">
                            <h3 className="font-bold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                                <FaBuilding className="text-blue-600" />
                                Floors
                            </h3>
                            <div className="space-y-2 overflow-y-auto custom-scrollbar">
                                {floors.map((floor) => (
                                    <div
                                        key={floor.id}
                                        className={`p-3 rounded-xl cursor-pointer transition-all duration-300 ${selectedFloor?.id === floor.id
                                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                                            : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                                            }`}
                                        onClick={() => setSelectedFloor(floor)}
                                    >
                                        <div className="font-semibold">{floor.name}</div>
                                        <div className="text-xs opacity-80">Floor {floor.floor_number}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Canvas */}
                    <div className="flex-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/40 relative overflow-hidden flex items-center justify-center min-h-[600px]">
                        {selectedFloor ? (
                            <div className="relative w-full h-full overflow-auto custom-scrollbar">
                                <div className="absolute min-w-[1200px] min-h-[800px]" style={{ transform: 'scale(0.8)', transformOrigin: 'top left' }}>
                                    {selectedFloor.sections?.map((section) => {
                                        if (section.name === '_FLOOR_ASSETS_') {
                                            return (
                                                <div key={section.id} className="absolute pointer-events-none" style={{ left: 0, top: 0 }}>
                                                    {section.seats?.map((seat) => (
                                                        <div key={seat.id} className="pointer-events-auto">
                                                            {renderDesk(seat, '#FB923C', true)}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={section.id}
                                                className="absolute rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-2xl"
                                                style={{
                                                    left: section.position_x,
                                                    top: section.position_y,
                                                    width: section.width,
                                                    height: section.height,
                                                    background: `linear-gradient(135deg, ${section.color}20, ${section.color}35)`,
                                                    borderColor: section.color,
                                                    transform: `rotate(${section.rotation || 0}deg)`,
                                                }}
                                            >
                                                {/* Header */}
                                                <div
                                                    className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center rounded-t-xl overflow-hidden shadow-sm"
                                                    style={{ background: `linear-gradient(90deg, ${section.color}40, ${section.color}20)` }}
                                                >
                                                    <span className="font-bold text-sm uppercase tracking-wider" style={{ color: section.color }}>
                                                        {section.name}
                                                    </span>
                                                </div>

                                                {/* Desks */}
                                                {section.seats?.map((seat) => renderDesk(seat, section.color, false))}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-400 text-center">
                                <FaBuilding className="text-6xl mx-auto mb-4 opacity-50" />
                                <p className="text-lg">Select a floor to view layout</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && confirmModal.seat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaChair className="text-white text-3xl" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Confirm Booking</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Book seat <strong className="text-blue-600 dark:text-blue-400">{confirmModal.seat.seat_number}</strong> for <strong className="text-blue-600 dark:text-blue-400">{selectedDate.toDateString()}</strong>?
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal({ isOpen: false, seat: null })}
                                className="flex-1 px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-semibold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmBooking}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <FaPlus />
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {successModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                <FaCheckCircle className="text-white text-3xl" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Success!</h3>
                            <p className="text-gray-600 dark:text-gray-400">{successModal.message}</p>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .animate-pulse-slow {
                    animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulse-slow {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.8;
                    }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(59, 130, 246, 0.5);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(59, 130, 246, 0.7);
                }
            `}</style>
        </div>
    );
};

export default DeskBooking;
