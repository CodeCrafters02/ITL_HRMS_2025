import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconCircleCheck from '../../components/Icon/IconCircleCheck';
import IconChecks from '../../components/Icon/IconChecks';
import IconX from '../../components/Icon/IconX';
import IconRefresh from '../../components/Icon/IconRefresh';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

interface SeatBooking {
    id: number;
    seat_details: {
        seat_number: string;
        section: string;
        floor: string;
    };
    employee_details: {
        name: string;
        employee_id: string;
    };
    booking_type: string;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    status: string;
    created_at: string;
}

const SeatApprovals = () => {
    const dispatch = useDispatch();
    const [bookings, setBookings] = useState<SeatBooking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dispatch(setPageTitle('Seat Booking Approvals'));
        fetchPendingBookings();
    }, []);

    const fetchPendingBookings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_BASE_URL}/app/seat-bookings/?status=pending`, {
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
            text: `You are about to ${action} this seat booking request.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: `Yes, ${action} it!`,
            confirmButtonColor: action === 'approve' ? '#10B981' : '#EF4444',
        });

        if (confirm.isConfirmed) {
            try {
                const token = localStorage.getItem('access_token');
                const res = await fetch(`${API_BASE_URL}/app/seat-bookings/${id}/${action}/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    Swal.fire('Success', `Booking ${action}ed successfully!`, 'success');
                    fetchPendingBookings();
                } else {
                    const err = await res.json().catch(() => ({}));
                    let errorMsg = `Failed to ${action} booking`;
                    if (err.detail) {
                        errorMsg = Array.isArray(err.detail) ? err.detail[0] : err.detail;
                    } else if (err.error) {
                        errorMsg = Array.isArray(err.error) ? err.error[0] : err.error;
                    } else if (typeof err === 'string' && err.length > 0) {
                        errorMsg = err;
                    } else if (res.status === 403) {
                         errorMsg = 'You do not have permission to perform this action.';
                    }
                    Swal.fire('Error', String(errorMsg), 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'An error occurred', 'error');
            }
        }
    };

    return (
        <div className="panel flex flex-col h-[calc(100vh-150px)]">
            <div className="flex items-center justify-between mb-6">
                <h5 className="font-bold text-xl dark:text-white-light">Pending Seat Requests</h5>
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
                            <IconCircleCheck className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="font-bold text-lg">No pending requests</p>
                        <p className="text-sm">All caught up!</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table-hover table-striped">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Location / Floor</th>
                                    <th>Seat</th>
                                    <th>Type</th>
                                    <th>Schedule</th>
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
                                            <p className="font-bold text-sm">{booking.seat_details.floor}</p>
                                            <p className="text-[10px] uppercase text-gray-400 font-bold">{booking.seat_details.section}</p>
                                        </td>
                                        <td>
                                            <span className="badge badge-outline-primary font-bold">#{booking.seat_details.seat_number}</span>
                                        </td>
                                        <td>
                                            <span className="capitalize text-sm font-bold">{booking.booking_type}</span>
                                        </td>
                                        <td>
                                            <div className="text-xs space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400">Dates:</span>
                                                    <span className="font-bold">{booking.start_date} {booking.end_date ? `to ${booking.end_date}` : '(Permanent)'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400">Times:</span>
                                                    <span className="font-bold">
                                                        {booking.start_time ? booking.start_time.substring(0, 5) : '00:00'} - {booking.end_time ? booking.end_time.substring(0, 5) : '23:59'}
                                                    </span>
                                                </div>
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
    );
};

export default SeatApprovals;
