import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconChecks from '../../components/Icon/IconChecks';
import IconX from '../../components/Icon/IconX';
import IconCalendar from '../../components/Icon/IconCalendar';
import IconClock from '../../components/Icon/IconClock';
import DataTable, { Column } from '../../components/Common/DataTable';

import PageHeader from '../../components/Common/PageHeader';
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
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState('');

    useEffect(() => {
        dispatch(setPageTitle('Conference Room Approvals'));
    }, [dispatch]);

    const fetchPendingBookings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const url = new URL(`${API_BASE_URL}/app/conference-room-bookings/`);
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

    const columns: Column<RoomBooking>[] = [
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
            key: 'room',
            title: 'Room / Floor',
            sortable: true,
            render: (_val, booking) => (
                <div>
                    <p className="font-bold text-sm text-gray-700 dark:text-white-light">{booking.room_details.name}</p>
                    <p className="text-[10px] uppercase text-gray-400 font-bold">{booking.room_details.floor}</p>
                </div>
            ),
        },
        {
            key: 'schedule',
            title: 'Schedule',
            sortable: true,
            render: (_val, booking) => (
                <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-gray-300">
                        <IconCalendar className="w-3.5 h-3.5 text-primary" />
                        <span>{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-semibold text-gray-500">
                        <IconClock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'purpose',
            title: 'Purpose',
            render: (val) => (
                <div className="max-w-[220px] truncate italic text-xs text-gray-600 dark:text-gray-300" title={val}>
                    {val || 'No purpose provided'}
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
            <PageHeader
                icon={<IconChecks />}
                title="Room Booking Approvals"
                subtitle="Review and manage conference room requests that exceed the auto-approval time limit."
                variant="rose"
            />

            {/* Reusable Data Table */}
            <DataTable
                title="Pending Room Requests"
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
                searchPlaceholder="Search by employee, room, purpose..."
                emptyMessage="No pending room requests found."
                emptySubtitle="All conference room requests are currently processed."
            />
        </div>
    );
};

export default ConferenceRoomApproval;
