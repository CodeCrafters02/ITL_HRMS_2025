import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { fetchPayslips, Payslip } from '../Payroll/payslipApi';
import IconFile from '../../components/Icon/IconFile';
import IconDownload from '../../components/Icon/IconDownload';
import IconEye from '../../components/Icon/IconEye';

const MyPayslips = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('My Payslips'));
    }, [dispatch]);

    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPayslips();
    }, []);

    const loadPayslips = async () => {
        setLoading(true);
        try {
            const data = await fetchPayslips({ page_size: 100 });
            const results = Array.isArray(data) ? data : (data.results || []);
            setPayslips(results);
        } catch (error) {
            console.error('Failed to load payslips', error);
        } finally {
            setLoading(false);
        }
    };

    const months = [
        '', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#4338ca] to-[#6366f1] p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">My Payslips</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">View and download your monthly salary statements.</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    <div className="col-span-full flex items-center justify-center py-20">
                        <span className="animate-spin border-4 border-primary border-l-transparent rounded-full w-12 h-12"></span>
                    </div>
                ) : payslips.length === 0 ? (
                    <div className="col-span-full panel flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <IconFile className="w-16 h-16 mb-4 text-gray-400" />
                        <h3 className="text-xl font-bold">No Payslips Yet</h3>
                        <p className="text-gray-500 mt-2">Your payslips will appear here once they are rolled out by HR.</p>
                    </div>
                ) : (
                    payslips.map((payslip) => (
                        <div key={payslip.id} className="panel p-0 overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-800 flex flex-col">
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-5 flex items-center justify-between">
                                <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                                    <IconFile className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{months[payslip.month]}</p>
                                    <p className="text-2xl font-black text-gray-800 dark:text-white">{payslip.year}</p>
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col justify-between">
                                <div className="mb-4">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Payslip ID</h4>
                                    <p className="font-mono font-bold text-gray-700 dark:text-gray-300 text-sm">{payslip.payslip_id}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-auto">
                                    <a 
                                        href={payslip.file ? `${import.meta.env.VITE_API_BASE_URL}${payslip.file}` : '#'} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="btn btn-outline-primary btn-sm flex items-center justify-center gap-2 py-2"
                                    >
                                        <IconEye className="w-4 h-4" />
                                        View
                                    </a>
                                    <a 
                                        href={payslip.file ? `${import.meta.env.VITE_API_BASE_URL}${payslip.file}` : '#'} 
                                        download
                                        className="btn btn-primary btn-sm flex items-center justify-center gap-2 py-2 shadow-md"
                                    >
                                        <IconDownload className="w-4 h-4" />
                                        Download
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MyPayslips;
