import { Fragment, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dialog, Transition } from '@headlessui/react';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { authFetch } from '../../../utils/authFetch';
import IconPlus from '../../../components/Icon/IconPlus';
import IconPencil from '../../../components/Icon/IconPencil';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import IconX from '../../../components/Icon/IconX';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/employee/certificate-signatures/`;

type SignatureType = {
    id: number;
    signature_image_url?: string | null;
    signatory_name: string;
    signatory_title: string;
};

const CertificateSignature = () => {
    const dispatch = useDispatch();
    const [signature, setSignature] = useState<SignatureType | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({ signatory_name: '', signatory_title: '' });
    const [signatureFile, setSignatureFile] = useState<File | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Certificate Signature'));
        fetchSignature();
    }, [dispatch]);

    const getHeaders = (multipart = false) => {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (!multipart) headers['Content-Type'] = 'application/json';
        if (token) headers.Authorization = `Bearer ${token}`;
        return headers;
    };

    const fetchSignature = async () => {
        setLoading(true);
        try {
            const response = await authFetch(API_URL, { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                const list = data.results || data || [];
                setSignature(list.length > 0 ? list[0] : null);
            }
        } catch (error) {
            console.error('Error fetching certificate signature:', error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setFormData({ signatory_name: '', signatory_title: '' });
        setSignatureFile(null);
        setModalOpen(true);
    };

    const openEditModal = () => {
        if (!signature) return;
        setFormData({ signatory_name: signature.signatory_name || '', signatory_title: signature.signatory_title || '' });
        setSignatureFile(null);
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);

        const body = new FormData();
        body.append('signatory_name', formData.signatory_name);
        body.append('signatory_title', formData.signatory_title);
        if (signatureFile) body.append('signature_image', signatureFile);

        try {
            const url = signature ? `${API_URL}${signature.id}/` : API_URL;
            const method = signature ? 'PATCH' : 'POST';

            const response = await authFetch(url, {
                method,
                headers: getHeaders(true),
                body,
            });

            if (response.ok) {
                Swal.fire({
                    title: signature ? 'Updated!' : 'Added!',
                    text: signature ? 'Signature updated successfully.' : 'Signature added successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    customClass: { popup: 'sweet-alerts' },
                });
                setModalOpen(false);
                fetchSignature();
            } else {
                const err = await response.json().catch(() => null);
                Swal.fire('Error!', err ? Object.values(err).flat().join(' ') : 'Failed to save signature.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Server connection failed.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!signature) return;
        const result = await Swal.fire({
            title: 'Delete Signature?',
            text: 'Certificates generated after this will show a plain "Authorized Signatory" line until a new signature is uploaded.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            customClass: { popup: 'sweet-alerts' },
        });
        if (!result.isConfirmed) return;

        try {
            const response = await authFetch(`${API_URL}${signature.id}/`, { method: 'DELETE', headers: getHeaders() });
            if (response.ok || response.status === 204) {
                Swal.fire('Deleted!', 'Signature has been removed.', 'success');
                setSignature(null);
            } else {
                Swal.fire('Error!', 'Failed to delete signature.', 'error');
            }
        } catch {
            Swal.fire('Error!', 'Connection failure.', 'error');
        }
    };

    return (
        <div>
            <div className="mb-5">
                <h4 className="font-extrabold text-sm uppercase text-gray-400 tracking-wider">Authorized Signatory</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                    Upload a digital signature to embed in the "Authorized Signatory" line of auto-generated course-completion certificates.
                    Only one signature can be active at a time — edit or delete the existing one to replace it.
                </p>
            </div>

            {loading ? (
                <div className="panel text-center py-10">
                    <span className="animate-pulse text-gray-400">Loading signature...</span>
                </div>
            ) : !signature ? (
                <div className="panel text-center py-14 border border-dashed border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl">
                    <span className="text-4xl block mb-3">✍️</span>
                    <p className="text-gray-500 mb-4">No signature uploaded yet.</p>
                    <button type="button" className="btn btn-primary gap-2 mx-auto" onClick={openAddModal}>
                        <IconPlus /> Add Signature
                    </button>
                </div>
            ) : (
                <div className="panel border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-xl p-6 max-w-md">
                    <div className="bg-gray-50 dark:bg-[#0e1726]/20 border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-lg p-4 flex items-center justify-center min-h-[120px] mb-4">
                        {signature.signature_image_url ? (
                            <img src={signature.signature_image_url} alt="Signature" className="max-h-[100px] max-w-full object-contain" />
                        ) : (
                            <span className="text-gray-400 text-xs italic">No image</span>
                        )}
                    </div>
                    <div className="text-center mb-4">
                        <div className="font-bold text-gray-800 dark:text-white-light">{signature.signatory_name || 'Authorized Signatory'}</div>
                        {signature.signatory_title && <div className="text-xs text-gray-500">{signature.signatory_title}</div>}
                    </div>
                    <div className="flex gap-2 justify-center border-t border-[#f1f2f3] dark:border-[#191e3a] pt-4">
                        <button type="button" className="btn btn-outline-primary btn-sm gap-1" onClick={openEditModal}>
                            <IconPencil className="w-4 h-4" /> Edit
                        </button>
                        <button type="button" className="btn btn-outline-danger btn-sm gap-1" onClick={handleDelete}>
                            <IconTrashLines className="w-4 h-4" /> Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/65 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="panel border-0 p-0 rounded-xl overflow-hidden w-full max-w-lg text-black dark:text-white-dark shadow-2xl relative">
                                    <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-250 outline-none">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                    <div className="text-lg font-bold bg-[#fbfbfb] dark:bg-[#121c2c] py-4 px-6 border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        {signature ? 'Edit Signature' : 'Add Signature'}
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleSave} className="space-y-4">
                                            <div>
                                                <label className="font-semibold mb-1 block">Signature Image {!signature && <span className="text-danger">*</span>}</label>
                                                <input type="file" accept="image/*" required={!signature} className="form-input rounded-lg text-xs" onChange={(e) => setSignatureFile(e.target.files ? e.target.files[0] : null)} />
                                                {signature && (
                                                    <>
                                                        {signature.signature_image_url && (
                                                            <div className="mt-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center gap-3">
                                                                <span className="text-[11px] font-semibold text-gray-500 uppercase">Current:</span>
                                                                <img src={signature.signature_image_url} alt="Current Signature" className="max-h-[50px] max-w-[150px] object-contain border border-dashed border-gray-300 dark:border-gray-600 p-1 bg-white" />
                                                            </div>
                                                        )}
                                                        <p className="text-[11px] text-gray-400 mt-1">Leave empty to keep the current image.</p>
                                                    </>
                                                )}
                                            </div>
                                            <div>
                                                <label className="font-semibold mb-1 block">Signatory Name</label>
                                                <input className="form-input rounded-lg" placeholder="e.g. Rajesh Kumar" value={formData.signatory_name} onChange={(e) => setFormData({ ...formData, signatory_name: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="font-semibold mb-1 block">Signatory Title</label>
                                                <input className="form-input rounded-lg" placeholder="e.g. Director of Training" value={formData.signatory_title} onChange={(e) => setFormData({ ...formData, signatory_title: e.target.value })} />
                                            </div>
                                            <div className="flex justify-end gap-3 pt-4 border-t border-[#ebedf2] dark:border-[#1b2e4b] mt-6">
                                                <button type="button" className="btn btn-outline-danger rounded-lg" onClick={() => setModalOpen(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary rounded-lg px-5 shadow-md" disabled={saving}>
                                                    {saving ? 'Saving...' : signature ? 'Save Changes' : 'Add Signature'}
                                                </button>
                                            </div>
                                        </form>
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

export default CertificateSignature;
