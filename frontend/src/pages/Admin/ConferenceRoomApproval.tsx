import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconChecks from '../../components/Icon/IconChecks';
import IconX from '../../components/Icon/IconX';
import IconRefresh from '../../components/Icon/IconRefresh';
import IconCalendar from '../../components/Icon/IconCalendar';
import IconClock from '../../components/Icon/IconClock';
import IconUsers from '../../components/Icon/IconUsers';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

interface RoomBooking {
    id: number;
    room_details: {
        name: string;
        floor: string;
    };
    employee_details: {
        name: string;
        employee_id: string;
    };
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    purpose: string;
    created_at: string;
}

const ConferenceRoomApproval = () => {
    const dispatch = useDispatch();
    const [bookings, setBookings] = useState<RoomBooking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dispatch(setPageTitle('Conference Room Approvals'));
        fetchPendingBookings();
    }, []);

    const fetchPendingBookings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/conference-room-bookings/?status=pending`, {
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

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        const confirm = await Swal.fire({
            title: `Are you sure?`,
            text: `You are about to ${action} this conference room booking.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: `Yes, ${action} it!`,
            confirmButtonColor: action === 'approve' ? '#10B981' : '#EF4444',
        });

        if (confirm.isConfirmed) {
            try {
                const token = localStorage.getItem('access_token');
                const res = await fetch(`${API_BASE_URL}/app/conference-room-bookings/${id}/${action}/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    Swal.fire('Success', `Booking ${action}ed successfully!`, 'success');
                    fetchPendingBookings();
                } else {
                    Swal.fire('Error', `Failed to ${action} booking`, 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'An error occurred', 'error');
            }
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-90px)] space-y-4">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg overflow-hidden relative">
                <div className="relative z-10">
                    <h2 className="text-3xl font-extrabold mb-0.5">Room Booking Approvals</h2>
                    <p className="text-white/80 text-sm font-medium">Review and manage conference room requests that exceed the auto-approval time limit.</p>
                </div>
                <div className="absolute right-[-20px] top-[-20px] opacity-10">
                    <IconChecks className="w-48 h-48" />
                </div>
            </div>

            <div className="panel flex flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <h5 className="font-bold text-xl dark:text-white-light">Pending Requests</h5>
                    <button onClick={fetchPendingBookings} className="btn btn-outline-primary btn-sm flex items-center gap-2">
                        <IconRefresh className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <span className="animate-spin border-4 border-primary border-t-transparent rounded-full w-10 h-10"></span>
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-50">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <IconCalendar className="w-10 h-10 text-gray-400" />
                            </div>
                            <p className="font-bold text-lg">No pending requests</p>
                            <p className="text-sm">All room bookings are up to date!</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table-hover table-striped">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Room / Floor</th>
                                        <th>Schedule</th>
                                        <th>Purpose</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings.map((booking) => (
                                        <tr key={booking.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                                        {booking.employee_details.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold">{booking.employee_details.name}</p>
                                                        <p className="text-xs text-gray-400">ID: {booking.employee_details.employee_id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <p className="font-bold text-sm">{booking.room_details.name}</p>
                                                <p className="text-[10px] uppercase text-gray-400 font-bold">{booking.room_details.floor}</p>
                                            </td>
                                            <td>
                                                <div className="text-xs space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <IconCalendar className="w-3 h-3 text-gray-400" />
                                                        <span className="font-bold">{booking.date}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <IconClock className="w-3 h-3 text-gray-400" />
                                                        <span className="font-bold">
                                                            {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="max-w-[200px] truncate" title={booking.purpose}>
                                                    <span className="text-xs">{booking.purpose || 'No purpose provided'}</span>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleAction(booking.id, 'approve')}
                                                        className="p-2 bg-success/10 text-success rounded-lg hover:bg-success hover:text-white transition-all shadow-sm"
                                                        title="Approve"
                                                    >
                                                        <IconChecks className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAction(booking.id, 'reject')}
                                                        className="p-2 bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-all shadow-sm"
                                                        title="Reject"
                                                    >
                                                        <IconX className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConferenceRoomApproval;
