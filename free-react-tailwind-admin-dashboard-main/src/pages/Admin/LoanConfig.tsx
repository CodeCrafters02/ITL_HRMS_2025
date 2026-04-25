import { useEffect, useState, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import { Dialog, Transition, Tab } from '@headlessui/react';
import IconX from '../../components/Icon/IconX';
import IconPlus from '../../components/Icon/IconPlus';
import IconSave from '../../components/Icon/IconSave';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconEdit from '../../components/Icon/IconEdit';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type Level = { id: number; level_name: string };
type InterestSlab = { id?: number; min_amount: string|number; max_amount: string|number; interest_rate: string|number };
type LoanCategory = {
    id?: number;
    name: string;
    description: string;
    is_active: boolean;
    min_tenure_months: number;
    max_repayment_months: number;
    max_loan_limit: string|number;
    allowed_levels: number[];
    allowed_levels_display?: Level[];
    interest_slabs?: InterestSlab[];
};

const LoanConfig = () => {
    const dispatch = useDispatch();
    const [categories, setCategories] = useState<LoanCategory[]>([]);
    const [levels, setLevels] = useState<Level[]>([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(false);
    const [editData, setEditData] = useState<LoanCategory | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [minTenure, setMinTenure] = useState(0);
    const [maxRepayment, setMaxRepayment] = useState(12);
    const [maxLimit, setMaxLimit] = useState<string|number>(0);
    const [isActive, setIsActive] = useState(true);
    const [selectedLevels, setSelectedLevels] = useState<number[]>([]);
    const [slabs, setSlabs] = useState<InterestSlab[]>([]);

    const hdr = () => {
        const token = localStorage.getItem('access_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    useEffect(() => {
        dispatch(setPageTitle('Loan Configuration'));
        fetchData();
    }, [dispatch]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [catRes, levelRes] = await Promise.all([
                fetch(`${API_BASE_URL}/app/loan-categories/`, { headers: hdr() }),
                fetch(`${API_BASE_URL}/app/levels/?page_size=1000`, { headers: hdr() })
            ]);
            if (catRes.ok) {
                const data = await catRes.json();
                setCategories(data.results || data);
            }
            if (levelRes.ok) {
                const data = await levelRes.json();
                setLevels(data.results || data);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleEdit = (cat: LoanCategory | null) => {
        setEditData(cat);
        if (cat) {
            setName(cat.name);
            setDescription(cat.description);
            setMinTenure(cat.min_tenure_months);
            setMaxRepayment(cat.max_repayment_months);
            setMaxLimit(cat.max_loan_limit);
            setIsActive(cat.is_active);
            setSelectedLevels(cat.allowed_levels);
            setSlabs(cat.interest_slabs || []);
        } else {
            setName('');
            setDescription('');
            setMinTenure(0);
            setMaxRepayment(12);
            setMaxLimit(0);
            setIsActive(true);
            setSelectedLevels([]);
            setSlabs([]);
        }
        setModal(true);
    };

    const addSlab = () => {
        setSlabs([...slabs, { min_amount: 0, max_amount: 0, interest_rate: 0 }]);
    };

    const removeSlab = (index: number) => {
        setSlabs(slabs.filter((_, i) => i !== index));
    };

    const updateSlab = (index: number, field: keyof InterestSlab, value: string|number) => {
        const newSlabs = [...slabs];
        newSlabs[index] = { ...newSlabs[index], [field]: value };
        setSlabs(newSlabs);
    };

    const handleSave = async () => {
        if (!name) {
            Swal.fire('Error', 'Please enter a loan category name.', 'error');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name,
                description,
                min_tenure_months: Number(minTenure) || 0,
                max_repayment_months: Number(maxRepayment) || 12,
                max_loan_limit: parseFloat(String(maxLimit)) || 0,
                allowed_levels: selectedLevels,
                is_active: isActive
            };

            const method = editData?.id ? 'PUT' : 'POST';
            const url = editData?.id ? `${API_BASE_URL}/app/loan-categories/${editData.id}/` : `${API_BASE_URL}/app/loan-categories/`;

            const res = await fetch(url, {
                method,
                headers: hdr(),
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const savedCat = await res.json();
                // Save slabs
                await saveSlabs(savedCat.id);
                Swal.fire('Success', 'Loan configuration saved successfully.', 'success');
                setModal(false);
                fetchData();
            } else {
                Swal.fire('Error', 'Failed to save loan configuration.', 'error');
            }
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const saveSlabs = async (catId: number) => {
        // Simple approach: delete existing and re-create for simplicity if editing
        const existingRes = await fetch(`${API_BASE_URL}/app/loan-interest-slabs/?category_id=${catId}`, { headers: hdr() });
        if (existingRes.ok) {
            const existing = await existingRes.json();
            const existingList = existing.results || existing;
            for (const s of existingList) {
                await fetch(`${API_BASE_URL}/app/loan-interest-slabs/${s.id}/`, { method: 'DELETE', headers: hdr() });
            }
        }

        // 2. Create new slabs
        for (const slab of slabs) {
            await fetch(`${API_BASE_URL}/app/loan-interest-slabs/`, {
                method: 'POST',
                headers: hdr(),
                body: JSON.stringify({ 
                    category: catId,
                    min_amount: parseFloat(String(slab.min_amount)) || 0,
                    max_amount: parseFloat(String(slab.max_amount)) || 0,
                    interest_rate: parseFloat(String(slab.interest_rate)) || 0
                })
            });
        }
    };

    const toggleLevel = (id: number) => {
        setSelectedLevels(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
    };

    return (
        <div className="pb-10">
            {/* Header Banner */}
            <div className="bg-[#4f46e5] bg-gradient-to-r from-[#1e3a5f] via-[#4f46e5] to-[#14b8a6] p-10 rounded-2xl shadow-2xl mb-10 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-white tracking-tight uppercase italic drop-shadow-md">Loan Configurator</h1>
                    <p className="text-white/90 mt-3 text-lg font-semibold max-w-2xl leading-relaxed drop-shadow-sm">
                        Architect and manage employee loan policies. Define tiered interest rates, set specific eligibility rules, and establish global borrowing limits.
                    </p>
                    <button 
                        onClick={() => handleEdit(null)}
                        className="mt-8 bg-white text-[#1e3a5f] px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-indigo-50 transition-all shadow-xl hover:shadow-white/20 active:scale-95"
                    >
                        <IconPlus className="w-5 h-5" /> Create Loan Product
                    </button>
                </div>
                {/* Decorative elements for premium feel */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-emerald-400/20 rounded-full blur-2xl"></div>
                <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-indigo-300/10 rounded-full blur-xl animate-bounce" style={{ animationDuration: '4s' }}></div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <span className="animate-spin border-4 border-primary border-l-transparent rounded-full w-12 h-12"></span>
                    <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">Fetching Configurations...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.length === 0 ? (
                        <div className="col-span-full panel flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50">
                            <div className="bg-white dark:bg-black p-4 rounded-full shadow-sm mb-4">
                                <IconPlus className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-400">No loan categories defined yet.</h3>
                            <p className="text-sm text-gray-400 max-w-xs mt-1">Start by adding your first loan category like "Personal Loan" or "Emergency Fund".</p>
                        </div>
                    ) : (
                        categories.map(cat => (
                            <div key={cat.id} className="panel group hover:shadow-2xl transition-all duration-300 border-t-4 border-indigo-500 flex flex-col h-full bg-white dark:bg-[#0e1726]">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-800 dark:text-white-light leading-tight">{cat.name}</h3>
                                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} mt-1 inline-block tracking-tighter`}>
                                            {cat.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <button onClick={() => handleEdit(cat)} className="p-2 text-gray-400 hover:text-indigo-500 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors group-hover:scale-110">
                                        <IconEdit className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-gray-500 text-sm line-clamp-2 mb-6 flex-grow italic">{cat.description || 'No description provided.'}</p>
                                
                                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Eligibility</span>
                                        <span className="text-xs font-black text-indigo-600">{cat.min_tenure_months}M Tenure</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Repayment</span>
                                        <span className="text-xs font-black text-rose-600">Max {cat.max_repayment_months} Months</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Max Limit</span>
                                        <span className="text-xs font-black text-emerald-600">₹{Number(cat.max_loan_limit).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Interest Tiers</span>
                                        <span className="text-xs font-black text-amber-600">{cat.interest_slabs?.length || 0} Slabs</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal */}
            <Transition appear show={modal} as={Fragment}>
                <Dialog as="div" open={modal} onClose={() => setModal(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-2xl overflow-hidden w-full max-w-4xl bg-white dark:bg-[#0e1726] shadow-2xl">
                                    <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                                        <h5 className="text-xl font-black text-indigo-600 uppercase tracking-tight italic">{editData ? 'Edit Loan Category' : 'Create New Loan Category'}</h5>
                                        <button onClick={() => setModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                            <IconX />
                                        </button>
                                    </div>
                                    
                                    <div className="p-0">
                                        <Tab.Group>
                                            <Tab.List className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
                                                {['General Info', 'Interest Slabs', 'Eligibility'].map((t) => (
                                                    <Tab key={t} as={Fragment}>
                                                        {({ selected }) => (
                                                            <button className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all outline-none ${selected ? 'text-indigo-600 border-b-4 border-indigo-600 bg-white dark:bg-[#0e1726]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                                                                {t}
                                                            </button>
                                                        )}
                                                    </Tab>
                                                ))}
                                            </Tab.List>
                                            <Tab.Panels className="p-6 h-[500px] overflow-y-auto">
                                                {/* Panel 1: General */}
                                                <Tab.Panel className="space-y-5 animate-fade-in-up">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Loan Name</label>
                                                        <input type="text" className="form-input text-lg font-bold border-gray-200 focus:border-indigo-500" placeholder="e.g. Home Improvement Loan" value={name} onChange={e => setName(e.target.value)} />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Description</label>
                                                        <textarea className="form-textarea min-h-[100px] border-gray-200 focus:border-indigo-500" placeholder="Briefly describe the purpose and details of this loan..." value={description} onChange={e => setDescription(e.target.value)}></textarea>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Max Loan Limit (₹)</label>
                                                            <input type="number" className="form-input font-bold text-emerald-600" value={maxLimit} onChange={e => setMaxLimit(e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Min Co. Tenure (Months)</label>
                                                            <input type="number" className="form-input font-bold text-indigo-600" value={minTenure} onChange={e => setMinTenure(Number(e.target.value))} />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Max Repayment Period (Months)</label>
                                                            <input type="number" className="form-input font-bold text-rose-600" placeholder="e.g. 12" value={maxRepayment} onChange={e => setMaxRepayment(Number(e.target.value))} />
                                                        </div>
                                                    </div>

                                                    <div className="pt-2">
                                                        <label className="flex items-center gap-3 cursor-pointer group">
                                                            <div className="relative inline-flex">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="sr-only" 
                                                                    checked={isActive} 
                                                                    onChange={() => setIsActive(!isActive)} 
                                                                />
                                                                <div className={`w-11 h-6 rounded-full transition-all duration-300 ${isActive ? 'bg-indigo-600 shadow-lg shadow-indigo-200' : 'bg-gray-300'}`}></div>
                                                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-all duration-300 shadow-sm ${isActive ? 'translate-x-5' : ''}`}></div>
                                                            </div>
                                                            <span className={`text-xs font-black uppercase tracking-widest transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                                {isActive ? 'Category is Active' : 'Category is Inactive'}
                                                            </span>
                                                        </label>
                                                    </div>
                                                </Tab.Panel>

                                                {/* Panel 2: Slabs */}
                                                <Tab.Panel className="animate-fade-in-up">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="text-sm font-black text-gray-700 dark:text-white-light uppercase tracking-tighter">Interest Rate Slabs</h4>
                                                        <button onClick={addSlab} className="btn btn-outline-primary btn-sm flex items-center gap-1 font-bold">
                                                            <IconPlus className="w-4 h-4" /> Add Slab
                                                        </button>
                                                    </div>
                                                    <div className="table-responsive border rounded-xl overflow-hidden">
                                                        <table className="table-hover">
                                                            <thead>
                                                                <tr className="bg-gray-50 dark:bg-gray-800">
                                                                    <th className="text-[10px] uppercase font-black">Min Amt (₹)</th>
                                                                    <th className="text-[10px] uppercase font-black">Max Amt (₹)</th>
                                                                    <th className="text-[10px] uppercase font-black">Rate (%)</th>
                                                                    <th className="text-center"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {slabs.length === 0 ? (
                                                                    <tr><td colSpan={4} className="text-center py-8 text-gray-400 italic text-sm">No interest slabs added. Add one to define rates.</td></tr>
                                                                ) : slabs.map((s, i) => (
                                                                    <tr key={i} className="group">
                                                                        <td><input type="number" className="form-input form-input-sm font-bold" value={s.min_amount} onChange={e => updateSlab(i, 'min_amount', e.target.value)} /></td>
                                                                        <td><input type="number" className="form-input form-input-sm font-bold" value={s.max_amount} onChange={e => updateSlab(i, 'max_amount', e.target.value)} /></td>
                                                                        <td><input type="number" className="form-input form-input-sm font-bold text-amber-600" value={s.interest_rate} onChange={e => updateSlab(i, 'interest_rate', e.target.value)} /></td>
                                                                        <td className="text-center">
                                                                            <button onClick={() => removeSlab(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                                                <IconTrashLines className="w-4 h-4" />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </Tab.Panel>

                                                {/* Panel 3: Eligibility */}
                                                <Tab.Panel className="space-y-6 animate-fade-in-up">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">Allowed Levels</label>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                            {levels.map(lvl => (
                                                                <label key={lvl.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedLevels.includes(lvl.id) ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                                                    <input type="checkbox" className="form-checkbox text-emerald-500" checked={selectedLevels.includes(lvl.id)} onChange={() => toggleLevel(lvl.id)} />
                                                                    <span className={`text-xs font-bold ${selectedLevels.includes(lvl.id) ? 'text-emerald-700' : 'text-gray-500'}`}>{lvl.level_name}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </Tab.Panel>
                                            </Tab.Panels>
                                        </Tab.Group>
                                    </div>

                                    <div className="flex items-center justify-end px-6 py-4 bg-gray-50/50 dark:bg-gray-900/20 gap-3 border-t border-gray-100 dark:border-gray-800">
                                        <button onClick={() => setModal(false)} className="btn btn-outline-danger font-bold uppercase tracking-widest text-[10px] px-6">Cancel</button>
                                        <button onClick={handleSave} disabled={saving} className="btn btn-primary font-bold uppercase tracking-widest text-[10px] px-8 shadow-indigo-500/20 shadow-lg">
                                            {saving ? <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-3 h-3 mr-2"></span> : <IconSave className="w-4 h-4 mr-2" />}
                                            {editData ? 'Update Config' : 'Create Category'}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default LoanConfig;
