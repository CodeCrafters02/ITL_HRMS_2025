import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconChecks from '../../components/Icon/IconChecks';
import IconX from '../../components/Icon/IconX';
import DataTable, { Column } from '../../components/Common/DataTable';

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
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState('');

    useEffect(() => {
        dispatch(setPageTitle('Seat Booking Approvals'));
    }, [dispatch]);

    const fetchPendingBookings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const url = new URL(`${API_BASE_URL}/app/seat-bookings/`);
            url.searchParams.append('status', 'pending');
            url.searchParams.append('page', String(page));
            url.searchParams.append('page_size', String(pageSize));
            if (search.trim()) url.searchParams.append('search', search.trim());

            const res = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.results) {
                    setBookings(data.results);
                    setTotalCount(data.count ?? 0);
                } else {
                    const arr = Array.isArray(data) ? data : [];
                    setBookings(arr);
                    setTotalCount(arr.length);
                }
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchPendingBookings();
        }, 300);
        return () => clearTimeout(handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, search]);

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

    const columns: Column<SeatBooking>[] = [
        {
            key: 'employee',
            title: 'Employee',
            sortable: true,
            render: (_val, booking) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {booking.employee_details.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 dark:text-white-light">{booking.employee_details.name}</p>
                        <p className="text-xs text-gray-400 font-mono">ID: {booking.employee_details.employee_id}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'location',
            title: 'Location / Floor',
            sortable: true,
            render: (_val, booking) => (
                <div>
                    <p className="font-bold text-sm text-gray-700 dark:text-white-light">{booking.seat_details.floor}</p>
                    <p className="text-[10px] uppercase text-gray-400 font-bold">{booking.seat_details.section}</p>
                </div>
            ),
        },
        {
            key: 'seat_number',
            title: 'Seat',
            align: 'center',
            render: (_val, booking) => (
                <span className="badge badge-outline-primary font-mono font-bold">
                    #{booking.seat_details.seat_number}
                </span>
            ),
        },
        {
            key: 'booking_type',
            title: 'Type',
            render: (val) => <span className="capitalize text-sm font-semibold text-gray-600 dark:text-gray-300">{val}</span>,
        },
        {
            key: 'schedule',
            title: 'Schedule',
            render: (_val, booking) => (
                <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-medium">Dates:</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300">
                            {booking.start_date} {booking.end_date ? `to ${booking.end_date}` : '(Permanent)'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-medium">Times:</span>
                        <span className="font-semibold text-gray-500">
                            {booking.start_time ? booking.start_time.substring(0, 5) : '00:00'} - {booking.end_time ? booking.end_time.substring(0, 5) : '23:59'}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'actions',
            title: 'Actions',
            align: 'center',
            width: '120px',
            render: (_val, booking) => (
                <div className="flex items-center justify-center gap-2">
                    <button 
                        type="button"
                        onClick={() => handleAction(booking.id, 'approve')}
                        className="p-2 bg-success/10 text-success rounded-lg hover:bg-success hover:text-white transition-all shadow-sm"
                        title="Approve"
                    >
                        <IconChecks className="w-4 h-4" />
                    </button>
                    <button 
                        type="button"
                        onClick={() => handleAction(booking.id, 'reject')}
                        className="p-2 bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-all shadow-sm"
                        title="Reject"
                    >
                        <IconX className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-xl p-6 text-white shadow-lg overflow-hidden relative">
                <div className="relative z-10">
                    <h2 className="text-3xl font-extrabold mb-1">Seat Booking Approvals</h2>
                    <p className="text-white/80 text-sm font-medium">Review and manage pending seat requests. Approve or reject applications to ensure optimal office utilization.</p>
                </div>
                <div className="absolute right-[-20px] top-[-20px] opacity-10">
                    <IconChecks className="w-48 h-48" />
                </div>
            </div>

            {/* Reusable Data Table */}
            <DataTable
                title="Pending Seat Requests"
                columns={columns}
                data={bookings}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(sz) => {
                    setPageSize(sz);
                    setPage(1);
                }}
                searchValue={search}
                onSearchChange={(val) => {
                    setSearch(val);
                    setPage(1);
                }}
                onRefresh={fetchPendingBookings}
                searchPlaceholder="Search by employee, seat, section..."
                emptyMessage="No pending seat requests found."
                emptySubtitle="All seat booking requests are currently processed."
            />
        </div>
    );
};

export default SeatApprovals;
