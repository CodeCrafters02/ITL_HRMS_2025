import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../store';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useEffect, useRef, useState } from 'react';
import IconPencilPaper from '../../components/Icon/IconPencilPaper';
import IconCoffee from '../../components/Icon/IconCoffee';
import IconMail from '../../components/Icon/IconMail';
import IconPhone from '../../components/Icon/IconPhone';
import IconMapPin from '../../components/Icon/IconMapPin';
import { authFetch } from '../../utils/authFetch';
import IconUsers from '../../components/Icon/IconUsers';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import IconX from '../../components/Icon/IconX';
import Swal from 'sweetalert2';

const Profile = () => {
    const dispatch = useDispatch();
    const [userData, setUserData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [hierarchyData, setHierarchyData] = useState<any[]>([]);
    const [reportingLineData, setReportingLineData] = useState<any[]>([]);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Profile'));
        fetchUserProfile();
        fetchHierarchy();
        fetchReportingLine();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/app/user-profile/`);
            if (response.ok) {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    console.log('User Profile Data Received:', data);
                    setUserData(data);
                } catch (e) {
                    console.error('Failed to parse profile JSON. Response was:', text);
                }
            } else {
                console.error('Profile fetch failed with status:', response.status);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const fetchHierarchy = async () => {
        try {
            const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/app/organization-hierarchy/`);
            if (response.ok) {
                const data = await response.json();
                setHierarchyData(data);
            }
        } catch (error) {
            console.error('Error fetching hierarchy:', error);
        }
    };

    const fetchReportingLine = async () => {
        try {
            const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/app/personal-reporting-line/`);
            if (response.ok) {
                const data = await response.json();
                setReportingLineData(data);
            }
        } catch (error) {
            console.error('Error fetching reporting line:', error);
        }
    };

    const HierarchyNode = ({ node, currentUserId, onNodeClick }: { node: any, currentUserId: any, onNodeClick: (node: any) => void }) => {
        const isYou = node.user_id === currentUserId;
        
        return (
            <div className="flex flex-col items-center">
                {/* The Node Box */}
                <div 
                    className={`p-4 rounded-xl border-2 flex flex-col items-center min-w-[160px] max-w-[220px] transition-all duration-300 relative cursor-pointer
                        ${isYou ? 'border-primary bg-primary/5 ring-4 ring-primary/10 z-[2] scale-105 shadow-xl' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1b2e4b] z-[1] shadow-md hover:border-primary/40 hover:scale-105'}
                    `}
                    onClick={() => onNodeClick(node)}
                >
                    <div className="relative mb-3">
                        <img 
                            src={node.photo || "/assets/images/profile-34.jpeg"} 
                            alt={node.name} 
                            className={`w-16 h-16 rounded-full object-cover border-4 ${isYou ? 'border-primary' : 'border-gray-200 dark:border-gray-700'}`} 
                        />
                        {isYou && (
                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                YOU
                            </span>
                        )}
                        {node.status && (
                            <span 
                                className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-[#1b2e4b] ${
                                    node.status === 'online' ? 'bg-success' :
                                    node.status === 'away' ? 'bg-warning' :
                                    node.status === 'dnd' ? 'bg-danger' :
                                    'bg-secondary'
                                }`}
                                title={node.status === 'dnd' ? 'Do Not Disturb' : node.status.charAt(0).toUpperCase() + node.status.slice(1)}
                            ></span>
                        )}
                    </div>
                    <span className={`font-bold text-sm text-center truncate w-full ${isYou ? 'text-primary' : 'dark:text-white-light'}`}>
                        {node.name}
                    </span>
                    <span className="text-[11px] text-white-dark text-center truncate w-full mt-1 font-medium bg-gray-100 dark:bg-gray-800/50 px-2 py-0.5 rounded">
                        {node.designation}
                    </span>
                </div>

                {/* Children Section with Connecting Lines */}
                {node.children && node.children.length > 0 && (
                    <div className="flex flex-col items-center pt-8 relative w-full">
                        {/* Parent Vertical Line (Down) */}
                        <div className="pointer-events-none absolute top-0 z-0 h-8 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
                        
                        <div className="flex gap-8 px-4">
                            {node.children.map((child: any, index: number) => (
                                <div key={child.id} className="relative pt-8">
                                    {/* Child Vertical Line (Up) */}
                                    <div className="pointer-events-none absolute top-0 left-1/2 z-0 h-8 w-0.5 -translate-x-1/2 bg-gray-300 dark:bg-gray-600"></div>
                                    
                                    {/* Horizontal Connector Bar */}
                                    {node.children.length > 1 && (
                                        <>
                                            {/* Left half of the horizontal bar */}
                                            {index > 0 && (
                                                <div className="pointer-events-none absolute top-0 left-0 right-1/2 z-0 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
                                            )}
                                            {/* Right half of the horizontal bar */}
                                            {index < node.children.length - 1 && (
                                                <div className="pointer-events-none absolute top-0 left-1/2 right-0 z-0 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
                                            )}
                                        </>
                                    )}
                                    
                                    <HierarchyNode node={child} currentUserId={currentUserId} onNodeClick={onNodeClick} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const handleNodeClick = (node: any) => {
        setSelectedNode(node);
        setIsInfoModalOpen(true);
    };

    const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const formData = new FormData();
        Object.entries(userData || {}).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            if (['photo', 'aadhar_card', 'pan_card'].includes(key)) return;
            if (typeof value === 'object') return;
            formData.append(key, String(value));
        });
        formData.append('photo', selectedFile);

        setIsUploadingPhoto(true);
        try {
            const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/app/updateusernamepassword/`, {
                method: 'PUT',
                body: formData,
            });

            const text = await response.text();
            let result: any = {};
            try {
                result = JSON.parse(text);
            } catch {
                // Ignore JSON parse failure and show fallback message.
            }

            if (response.ok) {
                await fetchUserProfile();
                Swal.fire({
                    title: 'Updated',
                    text: 'Profile photo updated successfully.',
                    icon: 'success',
                    customClass: {
                        popup: 'sweet-alerts',
                    },
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: result.detail || 'Failed to update profile photo.',
                    icon: 'error',
                    customClass: {
                        popup: 'sweet-alerts',
                    },
                });
            }
        } catch (error) {
            console.error('Error updating profile photo:', error);
            Swal.fire({
                title: 'Error',
                text: 'An unexpected error occurred while updating your profile photo.',
                icon: 'error',
                customClass: {
                    popup: 'sweet-alerts',
                },
            });
        } finally {
            setIsUploadingPhoto(false);
            e.target.value = '';
        }
    };

    return (
        <div>
            {/* <ul className="flex space-x-2 rtl:space-x-reverse">
              
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Profile</span>
                </li>
            </ul> */}
            <div className="pt-5">
                <div className="flex items-center gap-3 mb-5 border-b border-[#ebedf2] dark:border-[#191e3a]">
                    <button 
                        type="button" 
                        className={`${activeTab === 'profile' ? 'border-b-2 border-primary text-primary' : 'text-white-dark hover:text-primary'} pb-3 px-4 font-semibold text-sm transition-all duration-300`}
                        onClick={() => setActiveTab('profile')}
                    >
                        Profile Details
                    </button>
                    <button 
                        type="button" 
                        className={`${activeTab === 'hierarchy' ? 'border-b-2 border-primary text-primary' : 'text-white-dark hover:text-primary'} pb-3 px-4 font-semibold text-sm transition-all duration-300`}
                        onClick={() => setActiveTab('hierarchy')}
                    >
                        Organizational Hierarchy
                    </button>
                    <button 
                        type="button" 
                        className={`${activeTab === 'reporting-line' ? 'border-b-2 border-primary text-primary' : 'text-white-dark hover:text-primary'} pb-3 px-4 font-semibold text-sm transition-all duration-300`}
                        onClick={() => setActiveTab('reporting-line')}
                    >
                        My Reporting Line
                    </button>
                </div>

                {activeTab === 'profile' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
                        <div className="panel lg:col-span-1">
                            <div className="flex items-center justify-between mb-5">
                                <h5 className="font-semibold text-lg dark:text-white-light">Profile</h5>
                                <Link to="/users/user-account-settings" className="ltr:ml-auto rtl:mr-auto btn btn-primary p-2 rounded-full">
                                    <IconPencilPaper />
                                </Link>
                            </div>
                            <div className="mb-5">
                                <div className="flex flex-col justify-center items-center">
                                    <div className="relative mb-3">
                                        <img
                                            src={userData?.photo || "/assets/images/profile-34.jpeg"}
                                            alt="img"
                                            className="w-24 h-24 rounded-full object-cover border-2 border-primary p-0.5"
                                        />
                                        <button
                                            type="button"
                                            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 disabled:opacity-60"
                                            onClick={() => profilePhotoInputRef.current?.click()}
                                            disabled={isUploadingPhoto}
                                            title="Change profile photo"
                                        >
                                            <IconPencilPaper className="w-4 h-4" />
                                        </button>
                                        <input
                                            ref={profilePhotoInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleProfilePhotoChange}
                                        />
                                    </div>
                                    {/* <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary mb-2"
                                        onClick={() => profilePhotoInputRef.current?.click()}
                                        disabled={isUploadingPhoto}
                                    >
                                        {isUploadingPhoto ? 'Uploading...' : 'Edit Photo'}
                                    </button> */}
                                    <p className="font-bold text-primary text-2xl">
                                        {userData?.first_name || userData?.last_name 
                                            ? `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() 
                                            : userData?.username || 'User'}
                                    </p>
                                    <span className="badge badge-outline-primary mt-2 uppercase">{userData?.role || 'User'}</span>
                                </div>
                                <ul className="mt-7 flex flex-col space-y-4 font-semibold text-white-dark px-4">
                                    <li className="flex items-center gap-3">
                                        <IconCoffee className="shrink-0 text-primary" />
                                        <span className="text-sm">{userData?.designation || 'No Designation'}</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <IconMail className="w-5 h-5 shrink-0 text-primary" />
                                        <span className="text-sm truncate">{userData?.email || 'No Email'}</span>
                                    </li>
                                    {userData?.mobile && (
                                        <li className="flex items-center gap-3">
                                            <IconPhone className="w-5 h-5 shrink-0 text-primary" />
                                            <span className="text-sm">{userData.mobile}</span>
                                        </li>
                                    )}
                                    {userData?.location && (
                                        <li className="flex items-center gap-3">
                                            <IconMapPin className="w-5 h-5 shrink-0 text-primary" />
                                            <span className="text-sm">{userData.location}</span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                        <div className="panel lg:col-span-2">
                            <div className="flex items-center justify-between mb-5">
                                <h5 className="font-semibold text-lg dark:text-white-light uppercase tracking-wider">
                                    {userData?.role === 'employee' ? 'Employment Details' : 'Account Details'}
                                </h5>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-[#ebedf2] dark:border-[#1b2e4b] pb-2">
                                        <span className="text-white-dark">System Role</span>
                                        <span className="font-bold text-primary">{userData?.role === 'master' ? 'Super Administrator' : userData?.role.toUpperCase()}</span>
                                    </div>
                                    {userData?.role === 'master' ? (
                                        <>
                                            <div className="flex justify-between items-center border-b border-[#ebedf2] dark:border-[#1b2e4b] pb-2">
                                                <span className="text-white-dark">Platform Access</span>
                                                <span className="font-bold text-info">Full Access (All Companies)</span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-[#ebedf2] dark:border-[#1b2e4b] pb-2">
                                                <span className="text-white-dark">Account Status</span>
                                                <span className="font-bold text-success">Active (Owner)</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {userData?.employee_id && (
                                                <div className="flex justify-between items-center border-b border-[#ebedf2] dark:border-[#1b2e4b] pb-2">
                                                    <span className="text-white-dark">Employee ID</span>
                                                    <span className="font-bold text-primary">{userData.employee_id}</span>
                                                </div>
                                            )}
                                            {userData?.department_name && (
                                                <div className="flex justify-between items-center border-b border-[#ebedf2] dark:border-[#1b2e4b] pb-2">
                                                    <span className="text-white-dark">Department</span>
                                                    <span className="font-bold">{userData.department_name}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    {userData?.role !== 'master' && userData?.reporting_manager_name && (
                                        <div className="flex justify-between items-center border-b border-[#ebedf2] dark:border-[#1b2e4b] pb-2">
                                            <span className="text-white-dark">Reporting Manager</span>
                                            <span className="font-bold text-info">{userData.reporting_manager_name}</span>
                                        </div>
                                    )}
                                    {userData?.date_of_joining && (
                                        <div className="flex justify-between items-center border-b border-[#ebedf2] dark:border-[#1b2e4b] pb-2">
                                            <span className="text-white-dark">Date of Joining</span>
                                            <span className="font-bold">{new Date(userData.date_of_joining).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                    {userData?.gender && (
                                        <div className="flex justify-between items-center border-b border-[#ebedf2] dark:border-[#1b2e4b] pb-2">
                                            <span className="text-white-dark">Gender</span>
                                            <span className="font-bold text-capitalize">{userData.gender}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center border-b border-[#ebedf2] dark:border-[#1b2e4b] pb-2">
                                        <span className="text-white-dark">Status</span>
                                        <span className="badge badge-outline-success">Active</span>
                                    </div>
                                </div>
                            </div>
                            
                            {userData?.role === 'employee' && (
                                <>
                                    <div className="mt-8 border-t border-[#ebedf2] dark:border-[#1b2e4b] pt-6">
                                        <h6 className="text-md font-bold mb-4 text-primary uppercase">Identity & Documents</h6>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex flex-col bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-white-dark text-sm">Aadhar Number</span>
                                                    <span className="font-bold text-sm">{userData.aadhar_no || 'Not Verified'}</span>
                                                </div>
                                                {userData.aadhar_card && (
                                                    <a href={userData.aadhar_card} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline-primary w-fit">View Aadhar</a>
                                                )}
                                            </div>
                                            <div className="flex flex-col bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-white-dark text-sm">PAN Number</span>
                                                    <span className="font-bold text-sm">{userData.pan_no || 'Not Verified'}</span>
                                                </div>
                                                {userData.pan_card && (
                                                    <a href={userData.pan_card} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline-primary w-fit">View PAN</a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 border-t border-[#ebedf2] dark:border-[#1b2e4b] pt-6">
                                        <h6 className="text-md font-bold mb-4 text-primary uppercase">Banking Details</h6>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="panel bg-primary/5 border-none shadow-none p-3">
                                                <p className="text-white-dark text-xs mb-1">Bank Name</p>
                                                <p className="font-bold text-sm">{userData.bank_name || 'Not Set'}</p>
                                            </div>
                                            <div className="panel bg-primary/5 border-none shadow-none p-3">
                                                <p className="text-white-dark text-xs mb-1">Account Number</p>
                                                <p className="font-bold text-sm">{userData.account_no || 'Not Set'}</p>
                                            </div>
                                            <div className="panel bg-primary/5 border-none shadow-none p-3">
                                                <p className="text-white-dark text-xs mb-1">IFSC Code</p>
                                                <p className="font-bold text-sm">{userData.ifsc_code || 'Not Set'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <h6 className="text-md font-bold mb-4 text-primary">About Me</h6>
                                        <p className="text-white-dark leading-relaxed">
                                            Working as a {userData?.designation || 'professional'} in the {userData?.department_name || 'organization'}. 
                                            Dedicated to contributing to the company's growth and achieving professional excellence.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'hierarchy' && (
                    <div className="panel">
                        <div className="flex items-center gap-2 mb-5">
                            <IconUsers className="text-primary w-6 h-6" />
                            <h5 className="font-semibold text-lg dark:text-white-light uppercase tracking-wider">Organizational Hierarchy</h5>
                        </div>
                        
                        <div className="overflow-x-auto pb-4">
                            <div className="min-w-fit flex justify-center">
                                {hierarchyData.length > 0 ? (
                                    <div className="flex flex-col items-center gap-16 py-4">
                                        {hierarchyData.map((root) => (
                                            <HierarchyNode key={root.id} node={root} currentUserId={userData?.id} onNodeClick={handleNodeClick} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 text-white-dark">
                                        <IconUsers className="w-12 h-12 mb-3 opacity-20" />
                                        <p>No hierarchy data available for this company.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'reporting-line' && (
                    <div className="panel">
                        <div className="flex items-center gap-2 mb-5">
                            <IconUsers className="text-primary w-6 h-6" />
                            <h5 className="font-semibold text-lg dark:text-white-light uppercase tracking-wider">My Reporting Line</h5>
                        </div>
                        
                        <div className="overflow-x-auto pb-4">
                            <div className="min-w-fit flex justify-center">
                                {reportingLineData.length > 0 ? (
                                    <div className="flex flex-col items-center gap-16 py-4">
                                        {reportingLineData.map((root) => (
                                            <HierarchyNode key={root.id} node={root} currentUserId={userData?.id} onNodeClick={handleNodeClick} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 text-white-dark">
                                        <IconUsers className="w-12 h-12 mb-3 opacity-20" />
                                        <p>No reporting line data available.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Employee Info Modal */}
            <Transition appear show={isInfoModalOpen} as={Fragment}>
                <Dialog as="div" open={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} className="relative z-[80]">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-[black]/60" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center px-4 py-8">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="panel border-0 p-0 rounded-2xl overflow-hidden w-full max-w-lg text-black dark:text-white-dark shadow-2xl">
                                    <button
                                        type="button"
                                        onClick={() => setIsInfoModalOpen(false)}
                                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 outline-none transition-all duration-300 z-10"
                                    >
                                        <IconX />
                                    </button>
                                    
                                    <div className="relative h-32 bg-gradient-to-r from-primary to-info"></div>
                                    
                                    <div className="px-6 pb-8">
                                        <div className="relative -mt-16 mb-6 flex justify-center">
                                            <img 
                                                src={selectedNode?.photo || "/assets/images/profile-34.jpeg"} 
                                                alt={selectedNode?.name} 
                                                className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-[#191e3a] shadow-lg" 
                                            />
                                        </div>
                                        
                                        <div className="text-center mb-8">
                                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white-light">{selectedNode?.name}</h3>
                                            <p className="text-primary font-medium">{selectedNode?.designation}</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex flex-col p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                                <span className="text-xs text-white-dark mb-1 uppercase tracking-wider font-bold">Employee ID</span>
                                                <span className="font-semibold text-gray-900 dark:text-white-light">{selectedNode?.employee_id || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                                <span className="text-xs text-white-dark mb-1 uppercase tracking-wider font-bold">Department</span>
                                                <span className="font-semibold text-gray-900 dark:text-white-light">{selectedNode?.department || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 md:col-span-2">
                                                <span className="text-xs text-white-dark mb-1 uppercase tracking-wider font-bold">Email Address</span>
                                                <div className="flex items-center gap-2">
                                                    <IconMail className="w-4 h-4 text-primary" />
                                                    <span className="font-semibold text-gray-900 dark:text-white-light truncate">{selectedNode?.email || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 md:col-span-2">
                                                <span className="text-xs text-white-dark mb-1 uppercase tracking-wider font-bold">Mobile Number</span>
                                                <div className="flex items-center gap-2">
                                                    <IconPhone className="w-4 h-4 text-primary" />
                                                    <span className="font-semibold text-gray-900 dark:text-white-light">{selectedNode?.mobile || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/30 flex justify-end px-6">
                                        <button 
                                            type="button" 
                                            className="btn btn-outline-primary"
                                            onClick={() => setIsInfoModalOpen(false)}
                                        >
                                            Close Details
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

export default Profile;
