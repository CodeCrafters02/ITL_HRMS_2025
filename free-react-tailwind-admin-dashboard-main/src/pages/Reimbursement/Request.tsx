import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { fetchCategories, createReimbursement, ReimbursementCategory } from './api';
import Swal from 'sweetalert2';
import IconCashBanknotes from '../../components/Icon/IconCashBanknotes';
import IconFile from '../../components/Icon/IconFile';

const Request = () => {
    const dispatch = useDispatch();
    const [categories, setCategories] = useState<ReimbursementCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        category: '',
        custom_category: '',
        amount: '',
        description: '',
        bill: null as File | null,
    });

    useEffect(() => {
        dispatch(setPageTitle('Request Reimbursement'));
        const loadCategories = async () => {
            try {
                const data = await fetchCategories({ page_size: 100 });
                setCategories(data.results);
            } catch (error) {
                console.error('Failed to load categories', error);
            }
        };
        loadCategories();
    }, [dispatch]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const isOther = formData.category === 'other';
        if ((!formData.category && !isOther) || (isOther && !formData.custom_category) || !formData.amount || !formData.description) {
            Swal.fire('Error', 'Please fill all required fields', 'error');
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();
            if (isOther) {
                data.append('custom_category', formData.custom_category);
            } else {
                data.append('category', formData.category);
            }
            data.append('amount', formData.amount);
            data.append('description', formData.description);
            if (formData.bill) {
                data.append('bill_attachment', formData.bill);
            }

            await createReimbursement(data);
            Swal.fire('Success', 'Reimbursement request submitted successfully', 'success');
            setFormData({ category: '', custom_category: '', amount: '', description: '', bill: null });
        } catch (error: any) {
            const message = error?.response?.data?.[0] || error?.response?.data?.error || error?.response?.data?.non_field_errors?.[0] || 'Failed to submit request';
            Swal.fire('Error', message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate__animated animate__fadeIn">
            {/* Header Banner */}
            <div className="panel bg-gradient-to-r from-[#0ea5e9] via-[#2563eb] to-[#1d4ed8] text-white border-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                            <IconCashBanknotes className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold">Reimbursement Request</h1>
                            <p className="mt-1 text-white/80">Submit your expenses for approval and reimbursement.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Request Form */}
            <div className="panel max-w-3xl mx-auto shadow-lg border-white-light dark:border-[#1b2e4b]">
                <div className="mb-6 flex items-center gap-2 border-b border-white-light dark:border-[#1b2e4b] pb-4">
                    <div className="w-8 h-8 rounded bg-primary-light text-primary flex items-center justify-center">
                        <IconFile className="w-4 h-4" />
                    </div>
                    <h5 className="font-bold text-lg">New Expense Claim</h5>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className={formData.category === 'other' ? 'md:col-span-1' : 'md:col-span-2'}>
                            <label className="form-label font-semibold">Expense Category <span className="text-danger">*</span></label>
                            <select
                                className="form-select"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                            >
                                <option value="">Select Category</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name} {cat.min_tenure_months > 0 ? `(${cat.min_tenure_months}m tenure req.)` : ''}
                                    </option>
                                ))}
                                <option value="other" className="text-primary font-bold">Other (Manual Entry)</option>
                            </select>
                        </div>
                        
                        {formData.category === 'other' && (
                            <div className="animate__animated animate__fadeInDown">
                                <label className="form-label font-semibold">Manual Category Name <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-input border-primary"
                                    placeholder="Enter category name"
                                    value={formData.custom_category}
                                    onChange={(e) => setFormData({ ...formData, custom_category: e.target.value })}
                                    required
                                />
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <label className="form-label font-semibold">Claim Amount (₹) <span className="text-danger">*</span></label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark">₹</span>
                                <input
                                    type="number"
                                    className="form-input pl-8"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="form-label font-semibold">Description / Purpose <span className="text-danger">*</span></label>
                        <textarea
                            className="form-textarea min-h-[120px]"
                            placeholder="Provide details about the expense (e.g., Client meeting at Hyatt, Stationery for HR)..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="form-label font-semibold text-primary">Supporting Document (Bill/Invoice)</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 dark:border-[#1b2e4b] rounded-md hover:border-primary transition-colors cursor-pointer relative">
                            <div className="space-y-1 text-center">
                                <IconFile className="mx-auto h-10 w-10 text-white-dark" />
                                <div className="flex text-sm text-gray-600">
                                    <label className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none">
                                        <span>{formData.bill ? formData.bill.name : 'Upload a file'}</span>
                                        <input
                                            type="file"
                                            className="sr-only"
                                            onChange={(e) => setFormData({ ...formData, bill: e.target.files?.[0] || null })}
                                        />
                                    </label>
                                    {!formData.bill && <p className="pl-1 text-white-dark">or drag and drop</p>}
                                </div>
                                <p className="text-xs text-white-dark">PNG, JPG, PDF up to 10MB</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button type="submit" className="btn btn-primary w-full py-3 text-lg font-bold shadow-primary-light" disabled={loading}>
                            {loading ? (
                                <span className="flex items-center gap-2 justify-center">
                                    <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-4 h-4" />
                                    Submitting Claim...
                                </span>
                            ) : 'Submit Claim Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Request;
