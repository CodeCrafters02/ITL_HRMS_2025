import { useState, useEffect } from 'react';
import { axiosInstance } from '../Dashboard/api';
import PageBreadCrumb from '../../components/common/PageBreadCrumb';
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/airbnb.css";

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
    employee: number | null; // Permanent employee
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
    employee: number; // Booker
    booking_date: string;
    employee_details: {
        id: number;
        name: string;
        employee_id: string;
    };
}

const DeskBooking = () => {
    const [floors, setFloors] = useState<Floor[]>([]);
    const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
    const [bookings, setBookings] = useState<SeatBooking[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    //     const [loading, setLoading] = useState(false);
    //     const [hoveredSection, setHoveredSection] = useState<number | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; seat: Seat | null }>({ isOpen: false, seat: null });

    // User info
    //     const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        fetchFloors();
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        if (selectedDate) {
            fetchBookings();
        }
    }, [selectedDate]);

    const fetchCurrentUser = async () => {
        // Assuming we can get current user info from an endpoint or passed via context
        // For now, we'll try to get it from profile or just rely on backend to handle booking user
    };

    const fetchFloors = async () => {
        try {
            //             setLoading(true);
            const response = await axiosInstance.get('app/office-floors/');
            setFloors(response.data);
            if (response.data.length > 0 && !selectedFloor) {
                setSelectedFloor(response.data[0]);
            }
        } catch (error) {
            console.error('Error fetching floors:', error);
        } finally {
            //             setLoading(false);
        }
    };

    const fetchBookings = async () => {
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const response = await axiosInstance.get(`app/seat-bookings/?booking_date=${dateStr}`);
            setBookings(response.data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

    const handleSeatClick = (seat: Seat) => {
        if (seat.employee) {
            alert(`This seat is permanently assigned to ${seat.employee_details?.name || 'an employee'}.`);
            return;
        }

        const isBooked = bookings.find(b => b.seat === seat.id);
        if (isBooked) {
            alert(`This seat is already booked by ${isBooked.employee_details?.name || 'someone'} for this date.`);
            return;
        }

        if (seat.seat_number.startsWith('D-') || seat.seat_number.startsWith('DOOR')) return; // Ignore doors

        setConfirmModal({ isOpen: true, seat });
    };

    const confirmBooking = async () => {
        if (!confirmModal.seat) return;

        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            await axiosInstance.post('app/seat-bookings/', {
                seat: confirmModal.seat.id,
                booking_date: dateStr,
                // employee is handled by backend from request.user
            });

            alert('Desk booked successfully!');
            setConfirmModal({ isOpen: false, seat: null });
            fetchBookings(); // Refresh bookings
        } catch (error: any) {
            console.error('Error booking desk:', error);
            alert(`Failed to book desk: ${error.response?.data?.detail || 'Unknown error'}`);
        }
    };

    // --- Icons ---
    const ChairIcon = ({ color, status }: { color: string; status: 'available' | 'occupied' | 'booked' }) => {
        let fill = '#F3F4F6'; // Default available
        //         let opacity = 0.9;

        if (status === 'occupied') fill = '#9CA3AF'; // Gray/Red for permanent
        if (status === 'booked') fill = '#FB923C'; // Orange for booked

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
        // Filter out legacy "FLOOR-DOOR" artifacts that shouldn't be visible
        if (seat.seat_number.startsWith('FLOOR-DOOR')) return <></>;

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
            title = `Booked by ${booking.employee_details?.name}`;
        }

        const isDoor = isFloorAsset;

        return (
            <div
                key={seat.id}
                className={`absolute flex flex-col items-center group transition-all duration-200 ${!isDoor ? 'cursor-pointer hover:z-20 hover:scale-110' : ''}`}
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
                    {/* Label */}
                    <div
                        className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm bg-white/90 backdrop-blur-sm border border-gray-200 whitespace-nowrap overflow-hidden max-w-[100px] text-ellipsis"
                        style={{ color: status === 'available' ? sectionColor : '#4B5563' }}
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

    return (
        <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 flex flex-col">
            <div className="flex justify-between items-center p-4">
                <PageBreadCrumb pageTitle="Desk Booking" />
                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-2 rounded-xl shadow-sm">
                    <span className="font-semibold text-gray-700">Date:</span>
                    <Flatpickr
                        className="bg-transparent border-none outline-none font-medium cursor-pointer"
                        value={selectedDate}
                        onChange={([date]) => setSelectedDate(date)}
                        options={{
                            minDate: "today",
                            dateFormat: "Y-m-d",
                        }}
                    />
                </div>
            </div>

            <div className="flex-1 flex gap-4 px-4 pb-4 overflow-hidden">
                {/* Sidebar */}
                <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-hidden">
                    {/* Legend */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-4">
                        <h3 className="font-bold mb-3">Status Legend</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-[#F3F4F6] border border-blue-500"></div>
                                <span>Available</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-[#9CA3AF] border border-blue-500"></div>
                                <span>Permanent (Occupied)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-[#FB923C] border border-blue-500"></div>
                                <span>Booked (Temporary)</span>
                            </div>
                        </div>
                    </div>

                    {/* Floors List */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-4 flex flex-col flex-1">
                        <h3 className="font-bold mb-3">Floors</h3>
                        <div className="space-y-2 overflow-y-auto custom-scrollbar">
                            {floors.map((floor) => (
                                <div
                                    key={floor.id}
                                    className={`p-3 rounded-xl cursor-pointer transition-all duration-300 ${selectedFloor?.id === floor.id
                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                                        : 'bg-gray-50 hover:bg-gray-100'
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
                <div className="flex-1 bg-white/50 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/40 relative overflow-hidden flex items-center justify-center">
                    {selectedFloor ? (
                        <div className="relative w-full h-full overflow-auto custom-scrollbar">
                            <div className="absolute min-w-[1200px] min-h-[800px]" style={{ transform: 'scale(0.8)', transformOrigin: 'top left' }}>
                                {/* Sections */}
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
                                            className="absolute rounded-2xl shadow-sm border-2 transition-all duration-300"
                                            style={{
                                                left: section.position_x,
                                                top: section.position_y,
                                                width: section.width,
                                                height: section.height,
                                                background: `linear-gradient(135deg, ${section.color}15, ${section.color}25)`,
                                                borderColor: section.color,
                                                transform: `rotate(${section.rotation || 0}deg)`,
                                            }}
                                        >
                                            {/* Header */}
                                            <div
                                                className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center rounded-t-xl overflow-hidden"
                                                style={{ background: `linear-gradient(90deg, ${section.color}20, ${section.color}10)` }}
                                            >
                                                <span className="font-bold text-xs uppercase tracking-wider" style={{ color: section.color }}>
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
                        <div className="text-gray-400">Select a floor to view layout</div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && confirmModal.seat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-4">Confirm Booking</h3>
                        <p className="mb-6 text-gray-600">
                            Book seat <strong>{confirmModal.seat.seat_number}</strong> for <strong>{selectedDate.toDateString()}</strong>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmModal({ isOpen: false, seat: null })}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmBooking}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Confirm Booking
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeskBooking;
