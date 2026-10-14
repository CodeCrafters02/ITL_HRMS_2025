import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import IconChecks from '../../components/Icon/IconChecks';
import IconX from '../../components/Icon/IconX';
import IconCalendar from '../../components/Icon/IconCalendar';
import IconClock from '../../components/Icon/IconClock';
import DataTable, { Column } from '../../components/Common/DataTable';

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
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        dispatch(setPageTitle('Conference Room Approvals'));
    }, []);

    useEffect(() => {
        const t = setTimeout(fetchPendingBookings, 400);
        return () => clearTimeout(t);
    }, [search, page, pageSize]);

    const fetchPendingBookings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const url = new URL(`${API_BASE_URL}/app/conference-room-bookings/`);
            url.searchParams.set('status', 'pending');
            url.searchParams.set('page', String(page));
            url.searchParams.set('page_size', String(pageSize));
            if (search.trim()) url.searchParams.set('search', search.trim());
            const res = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : data?.results || [];
                setBookings(list);
                setTotalCount(Array.isArray(data) ? list.length : data?.count ?? list.length);
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

    const columns: Column<RoomBooking>[] = [
        {
            key: 'employee_details', title: 'Employee',
            render: (_v, b) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">{b.employee_details.name.charAt(0)}</div>
                    <div>
                        <p className="font-bold">{b.employee_details.name}</p>
                        <p className="text-xs text-gray-400">ID: {b.employee_details.employee_id}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'room_details', title: 'Room / Floor',
            render: (_v, b) => (
                <div>
                    <p className="font-bold text-sm">{b.room_details.name}</p>
                    <p className="text-[10px] uppercase text-gray-400 font-bold">{b.room_details.floor}</p>
                </div>
            ),
        },
        {
            key: 'date', title: 'Schedule',
            render: (_v, b) => (
                <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2"><IconCalendar className="w-3 h-3 text-gray-400" /><span className="font-bold">{b.date}</span></div>
                    <div className="flex items-center gap-2"><IconClock className="w-3 h-3 text-gray-400" /><span className="font-bold">{b.start_time.substring(0, 5)} - {b.end_time.substring(0, 5)}</span></div>
                </div>
            ),
        },
        { key: 'purpose', title: 'Purpose', render: (v) => <div className="max-w-[200px] truncate text-xs" title={v}>{v || 'No purpose provided'}</div> },
        {
            key: 'actions', title: 'Actions', align: 'center',
            render: (_v, b) => (
                <div className="flex items-center justify-center gap-2">
                    <button onClick={() => handleAction(b.id, 'approve')} className="p-2 bg-success/10 text-success rounded-lg hover:bg-success hover:text-white transition-all" title="Approve"><IconChecks className="w-4 h-4" /></button>
                    <button onClick={() => handleAction(b.id, 'reject')} className="p-2 bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-all" title="Reject"><IconX className="w-4 h-4" /></button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg overflow-hidden relative">
                <div className="relative z-10">
                    <h2 className="text-3xl font-extrabold mb-0.5">Room Booking Approvals</h2>
                    <p className="text-white/80 text-sm font-medium">Review and manage conference room requests that exceed the auto-approval time limit.</p>
                </div>
                <div className="absolute right-[-20px] top-[-20px] opacity-10">
                    <IconChecks className="w-48 h-48" />
                </div>
            </div>

            <DataTable
                title="Pending Requests"
                columns={columns}
                data={bookings}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPage}
                onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
                searchValue={search}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                onRefresh={fetchPendingBookings}
                searchPlaceholder="Search by employee, room or purpose..."
                emptyMessage="No pending requests"
                emptySubtitle="All room bookings are up to date!"
            />
        </div>
    );
};

export default ConferenceRoomApproval;
