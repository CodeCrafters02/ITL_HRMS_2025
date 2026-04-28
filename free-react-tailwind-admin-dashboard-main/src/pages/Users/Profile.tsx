import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../store';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useEffect, useState } from 'react';
import IconPencilPaper from '../../components/Icon/IconPencilPaper';
import IconCoffee from '../../components/Icon/IconCoffee';
import IconMail from '../../components/Icon/IconMail';
import IconPhone from '../../components/Icon/IconPhone';
import IconMapPin from '../../components/Icon/IconMapPin';
import { authFetch } from '../../utils/authFetch';

const Profile = () => {
    const dispatch = useDispatch();
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        dispatch(setPageTitle('Profile'));
        fetchUserProfile();
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

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="#" className="text-primary hover:underline">
                        Users
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Profile</span>
                </li>
            </ul>
            <div className="pt-5">
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
                                <img 
                                    src={userData?.photo || "/assets/images/profile-34.jpeg"} 
                                    alt="img" 
                                    className="w-24 h-24 rounded-full object-cover mb-5 border-2 border-primary p-0.5" 
                                />
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
            </div>
        </div>
    );
};

export default Profile;
