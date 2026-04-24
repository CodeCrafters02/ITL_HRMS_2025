import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { fetchReimbursements, fetchReimbursementStats, ReimbursementRequest } from './api';
import IconCalendar from '../../components/Icon/IconCalendar';
import IconSearch from '../../components/Icon/IconSearch';
import IconFile from '../../components/Icon/IconFile';
import IconUsers from '../../components/Icon/IconUsers';
import axios from 'axios';

const History = () => {
    const dispatch = useDispatch();
    const [requests, setRequests] = useState<ReimbursementRequest[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        dispatch(setPageTitle('Reimbursement History & Stats'));
        fetchEmployees();
    }, [dispatch]);

    useEffect(() => {
        loadData();
    }, [page, pageSize, search, statusFilter, employeeFilter, startDate, endDate]);

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/app/employee/?page_size=1000`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Handle both paginated and non-paginated responses
            setEmployees(response.data.results || response.data);
        } catch (error) {
            console.error('Failed to fetch employees', error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const params = {
                search,
                status: statusFilter,
                employee: employeeFilter,
                start_date: startDate,
                end_date: endDate,
                page,
                page_size: pageSize
            };

            const [requestsData, statsData] = await Promise.all([
                fetchReimbursements(params),
                fetchReimbursementStats(params)
            ]);

            setRequests(requestsData.results);
            setTotalCount(requestsData.count);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <span className="badge bg-success-light text-success border-0 capitalize px-3">Approved</span>;
            case 'rejected':
                return <span className="badge bg-danger-light text-danger border-0 capitalize px-3">Rejected</span>;
            default:
                return <span className="badge bg-warning-light text-warning border-0 capitalize px-3">Pending</span>;
        }
    };

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="panel bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-0 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
                            <IconUsers className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black">Reimbursement Master History</h1>
                            <p className="text-white/80 text-sm">Audit all claims and view expenditure statistics.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="panel bg-white dark:bg-[#0e1726] shadow-md border-0 border-l-4 border-primary">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Filtered Total</p>
                            <h3 className="text-2xl font-black mt-1">₹{stats?.overall?.total_amount?.toLocaleString() || 0}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">₹</div>
                    </div>
                </div>
                <div className="panel bg-white dark:bg-[#0e1726] shadow-md border-0 border-l-4 border-success">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Approved</p>
                            <h3 className="text-2xl font-black mt-1 text-success">₹{stats?.overall?.approved_amount?.toLocaleString() || 0}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success">✓</div>
                    </div>
                </div>
                <div className="panel bg-white dark:bg-[#0e1726] shadow-md border-0 border-l-4 border-warning">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Pending</p>
                            <h3 className="text-2xl font-black mt-1 text-warning">₹{stats?.overall?.pending_amount?.toLocaleString() || 0}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center text-warning">⏳</div>
                    </div>
                </div>
                <div className="panel bg-white dark:bg-[#0e1726] shadow-md border-0 border-l-4 border-info">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Claims Count</p>
                            <h3 className="text-2xl font-black mt-1 text-info">{totalCount}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center text-info">#</div>
                    </div>
                </div>
            </div>

            {/* Filters Panel */}
            <div className="panel border-white-light dark:border-[#1b2e4b]">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Search</label>
                        <div className="relative mt-1">
                            <input 
                                type="text" 
                                className="form-input text-black dark:text-white-dark" 
                                placeholder="Description..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Employee</label>
                        <select 
                            className="form-select mt-1 text-black dark:text-white-dark" 
                            value={employeeFilter}
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                        >
                            <option value="">All Employees</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.full_name || `${emp.first_name} ${emp.last_name}`}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                        <select 
                            className="form-select mt-1 text-black dark:text-white-dark" 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">From Date</label>
                        <input 
                            type="date" 
                            className="form-input mt-1 text-black dark:text-white-dark" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">To Date</label>
                        <input 
                            type="date" 
                            className="form-input mt-1 text-black dark:text-white-dark" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Table */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="panel p-0 border-0 shadow-lg overflow-hidden">
                        <div className="p-5 font-bold text-lg border-b border-gray-100 dark:border-gray-800">
                            Detailed Claim Records
                        </div>
                        <div className="table-responsive">
                            <table className="table-hover">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                                        <th>Employee</th>
                                        <th>Details</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={5} className="text-center py-10">Loading...</td></tr>
                                    ) : requests.length > 0 ? (
                                        requests.map(req => (
                                            <tr key={req.id}>
                                                <td>
                                                    <div className="font-bold">{req.employee_name}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase tracking-tighter">Approved by: {req.reporting_manager_name || 'Admin'}</div>
                                                </td>
                                                <td>
                                                    <div className="font-semibold text-primary text-xs">{req.category_name}</div>
                                                    <div className="text-xs text-gray-500 truncate max-w-[200px]" title={req.description}>{req.description}</div>
                                                </td>
                                                <td className="font-black">₹{req.amount}</td>
                                                <td>{getStatusBadge(req.status)}</td>
                                                <td>
                                                    {req.bill_attachment && (
                                                        <a href={req.bill_attachment} target="_blank" rel="noreferrer" className="text-primary hover:text-primary-dark transition-colors">
                                                            <IconFile className="w-5 h-5" />
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={5} className="text-center py-10">No records found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Simple Pagination */}
                        <div className="p-5 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <span className="text-xs font-bold text-gray-500">Page {page} of {Math.ceil(totalCount / pageSize) || 1}</span>
                            <div className="flex gap-2">
                                <button 
                                    className="btn btn-sm btn-outline-primary" 
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                >Previous</button>
                                <button 
                                    className="btn btn-sm btn-outline-primary"
                                    disabled={page >= Math.ceil(totalCount / pageSize)}
                                    onClick={() => setPage(p => p + 1)}
                                >Next</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Employee-wise Stats Panel */}
                <div className="space-y-6">
                    <div className="panel border-0 shadow-lg p-0 overflow-hidden">
                        <div className="p-5 font-bold text-lg border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                            <IconUsers className="w-5 h-5 text-primary" />
                            Employee Expenditure
                        </div>
                        <div className="max-h-[600px] overflow-y-auto">
                            {stats?.employee_wise?.length > 0 ? (
                                stats.employee_wise.map((item: any) => (
                                    <div key={item.employee_id} className="p-4 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-gray-800 dark:text-gray-200">{item.employee__first_name} {item.employee__last_name}</div>
                                                <div className="text-xs text-gray-400 font-semibold uppercase">{item.count} Claims</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-lg text-primary">₹{item.total.toLocaleString()}</div>
                                                <div className="text-[10px] text-success font-bold uppercase">₹{item.approved.toLocaleString()} Appr.</div>
                                            </div>
                                        </div>
                                        <div className="mt-2 w-full bg-gray-100 rounded-full h-1">
                                            <div 
                                                className="bg-primary h-1 rounded-full transition-all duration-500" 
                                                style={{ width: `${Math.min((item.approved / (item.total || 1)) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-10 text-center text-gray-400 font-medium">No stats available</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default History;
