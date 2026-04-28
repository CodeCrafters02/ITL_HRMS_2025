import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import IconHome from '../../components/Icon/IconHome';
import IconDollarSignCircle from '../../components/Icon/IconDollarSignCircle';
import IconUser from '../../components/Icon/IconUser';
import IconPhone from '../../components/Icon/IconPhone';
import IconLinkedin from '../../components/Icon/IconLinkedin';
import IconTwitter from '../../components/Icon/IconTwitter';
import IconFacebook from '../../components/Icon/IconFacebook';
import IconGithub from '../../components/Icon/IconGithub';
import { authFetch } from '../../utils/authFetch';
import Swal from 'sweetalert2';

const AccountSetting = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Account Setting'));
        fetchUserProfile();
    }, []);

    const [tabs, setTabs] = useState<string>('home');
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        mobile: '',
        address: '',
        location: '',
        new_password: '',
        role: '',
        designation: '',
        department_name: '',
        employee_id: '',
        reporting_manager_name: '',
        aadhar_no: '',
        pan_no: '',
        guardian_name: '',
        guardian_mobile: '',
        gender: '',
        date_of_birth: '',
        bank_name: '',
        account_no: '',
        ifsc_code: '',
        payment_method: '',
        photo: '',
        aadhar_card: '',
        pan_card: '',
    });

    const [files, setFiles] = useState({
        photo: null as File | null,
        aadhar_card: null as File | null,
        pan_card: null as File | null,
    });

    const fetchUserProfile = async () => {
        try {
            const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/app/user-profile/`);
            if (response.ok) {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    setUserData({
                        username: data.username || '',
                        first_name: data.first_name || '',
                        last_name: data.last_name || '',
                        email: data.email || '',
                        mobile: data.mobile || '',
                        address: data.address || '',
                        location: data.location || '',
                        new_password: '',
                        role: data.role || '',
                        designation: data.designation || '',
                        department_name: data.department_name || '',
                        employee_id: data.employee_id || '',
                        reporting_manager_name: data.reporting_manager_name || '',
                        aadhar_no: data.aadhar_no || '',
                        pan_no: data.pan_no || '',
                        guardian_name: data.guardian_name || '',
                        guardian_mobile: data.guardian_mobile || '',
                        gender: data.gender || '',
                        date_of_birth: data.date_of_birth || '',
                        bank_name: data.bank_name || '',
                        account_no: data.account_no || '',
                        ifsc_code: data.ifsc_code || '',
                        payment_method: data.payment_method || '',
                        photo: data.photo || '',
                        aadhar_card: data.aadhar_card || '',
                        pan_card: data.pan_card || '',
                    });
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        if (e.target.files && e.target.files[0]) {
            setFiles({ ...files, [field]: e.target.files[0] });
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            Object.keys(userData).forEach((key) => {
                if (key === 'new_password' && !userData.new_password) return;
                if (['photo', 'aadhar_card', 'pan_card'].includes(key)) return;
                formData.append(key, (userData as any)[key]);
            });

            if (files.photo) formData.append('photo', files.photo);
            if (files.aadhar_card) formData.append('aadhar_card', files.aadhar_card);
            if (files.pan_card) formData.append('pan_card', files.pan_card);

            const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/app/updateusernamepassword/`, {
                method: 'PUT',
                body: formData,
            });

            const text = await response.text();
            let result: any = {};
            try {
                result = JSON.parse(text);
            } catch (e) {
                console.error('Failed to parse update response JSON. Response was:', text);
            }

            if (response.ok) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Profile updated successfully.',
                    icon: 'success',
                    customClass: {
                        popup: 'sweet-alerts',
                    },
                });
                setUserData((prev) => ({ ...prev, new_password: '' }));
                setFiles({ photo: null, aadhar_card: null, pan_card: null });
            } else {
                const errorMsg = result.detail || 'Failed to update profile';
                Swal.fire({
                    title: 'Error!',
                    text: errorMsg,
                    icon: 'error',
                    customClass: {
                        popup: 'sweet-alerts',
                    },
                });
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            Swal.fire({
                title: 'Error!',
                text: 'An unexpected error occurred.',
                icon: 'error',
                customClass: {
                    popup: 'sweet-alerts',
                },
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleTabs = (name: string) => {
        setTabs(name);
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
                    <span>Account Settings</span>
                </li>
            </ul>
            <div className="pt-5">
                <div className="flex items-center justify-between mb-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">Settings</h5>
                </div>
                <div>
                    <div className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black">
                        <h6 className="text-lg font-bold mb-5">General Information</h6>
                        <div className="flex flex-col sm:flex-row">
                            <div className="ltr:sm:mr-4 rtl:sm:ml-4 w-full sm:w-2/12 mb-5">
                                <img 
                                    src={userData?.photo || "/assets/images/profile-34.jpeg"} 
                                    alt="img" 
                                    className="w-20 h-20 md:w-32 md:h-32 rounded-full object-cover mx-auto" 
                                />
                            </div>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label htmlFor="username">Username</label>
                                    <input
                                        id="username"
                                        type="text"
                                        value={userData.username}
                                        onChange={(e) => setUserData({ ...userData, username: e.target.value })}
                                        className="form-input"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email">Email</label>
                                    <input id="email" type="email" value={userData.email} className="form-input bg-gray-100 dark:bg-gray-800 cursor-not-allowed" readOnly />
                                </div>
                                <div>
                                    <label htmlFor="first_name">First Name</label>
                                    <input
                                        id="first_name"
                                        type="text"
                                        value={userData.first_name}
                                        onChange={(e) => setUserData({ ...userData, first_name: e.target.value })}
                                        className="form-input"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="last_name">Last Name</label>
                                    <input
                                        id="last_name"
                                        type="text"
                                        value={userData.last_name}
                                        onChange={(e) => setUserData({ ...userData, last_name: e.target.value })}
                                        className="form-input"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone">Phone</label>
                                    <input
                                        id="phone"
                                        type="text"
                                        value={userData.mobile}
                                        onChange={(e) => setUserData({ ...userData, mobile: e.target.value })}
                                        className="form-input"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="address">Address</label>
                                    <input
                                        id="address"
                                        type="text"
                                        value={userData.address}
                                        onChange={(e) => setUserData({ ...userData, address: e.target.value })}
                                        className="form-input"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="location">Location</label>
                                    <input
                                        id="location"
                                        type="text"
                                        value={userData.location}
                                        onChange={(e) => setUserData({ ...userData, location: e.target.value })}
                                        className="form-input"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="password">New Password (Leave blank to keep current)</label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={userData.new_password}
                                        onChange={(e) => setUserData({ ...userData, new_password: e.target.value })}
                                        placeholder="Enter new password"
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black">
                        <h6 className="text-lg font-bold mb-5">Personal & Family Details</h6>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label htmlFor="dob">Date of Birth</label>
                                <input id="dob" type="date" value={userData.date_of_birth} onChange={(e) => setUserData({ ...userData, date_of_birth: e.target.value })} className="form-input" />
                            </div>
                            <div>
                                <label htmlFor="gender">Gender</label>
                                <select id="gender" value={userData.gender} onChange={(e) => setUserData({ ...userData, gender: e.target.value })} className="form-select">
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="aadhar_no">Aadhar Number</label>
                                <input id="aadhar_no" type="text" value={userData.aadhar_no} onChange={(e) => setUserData({ ...userData, aadhar_no: e.target.value })} className="form-input" />
                            </div>
                            <div>
                                <label htmlFor="pan_no">PAN Number</label>
                                <input id="pan_no" type="text" value={userData.pan_no} onChange={(e) => setUserData({ ...userData, pan_no: e.target.value })} className="form-input" />
                            </div>
                            <div>
                                <label htmlFor="guardian">Guardian Name</label>
                                <input id="guardian" type="text" value={userData.guardian_name} onChange={(e) => setUserData({ ...userData, guardian_name: e.target.value })} className="form-input" />
                            </div>
                            <div>
                                <label htmlFor="g_mobile">Guardian Mobile</label>
                                <input id="g_mobile" type="text" value={userData.guardian_mobile} onChange={(e) => setUserData({ ...userData, guardian_mobile: e.target.value })} className="form-input" />
                            </div>
                        </div>
                    </div>

                    <div className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black">
                        <h6 className="text-lg font-bold mb-5">Bank & Payment Details</h6>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label htmlFor="bank_name">Bank Name</label>
                                <input id="bank_name" type="text" value={userData.bank_name} onChange={(e) => setUserData({ ...userData, bank_name: e.target.value })} className="form-input" />
                            </div>
                            <div>
                                <label htmlFor="acc_no">Account Number</label>
                                <input id="acc_no" type="text" value={userData.account_no} onChange={(e) => setUserData({ ...userData, account_no: e.target.value })} className="form-input" />
                            </div>
                            <div>
                                <label htmlFor="ifsc">IFSC Code</label>
                                <input id="ifsc" type="text" value={userData.ifsc_code} onChange={(e) => setUserData({ ...userData, ifsc_code: e.target.value })} className="form-input" />
                            </div>
                            <div>
                                <label htmlFor="pay_method">Payment Method</label>
                                <select id="pay_method" value={userData.payment_method} onChange={(e) => setUserData({ ...userData, payment_method: e.target.value })} className="form-select">
                                    <option value="">Select Method</option>
                                    <option value="bank">Bank Transfer</option>
                                    <option value="cash">Cash</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black">
                        <h6 className="text-lg font-bold mb-5">Profile & Documents</h6>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <div>
                                <label htmlFor="photo">Profile Photo</label>
                                <input id="photo" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} className="form-input p-1" />
                                {userData.photo && <p className="text-xs mt-1 text-primary"><a href={userData.photo} target="_blank" rel="noreferrer">View Current Photo</a></p>}
                            </div>
                            <div>
                                <label htmlFor="aadhar">Aadhar Card</label>
                                <input id="aadhar" type="file" onChange={(e) => handleFileChange(e, 'aadhar_card')} className="form-input p-1" />
                                {userData.aadhar_card && <p className="text-xs mt-1 text-primary"><a href={userData.aadhar_card} target="_blank" rel="noreferrer">View Current Aadhar</a></p>}
                            </div>
                            <div>
                                <label htmlFor="pan">PAN Card</label>
                                <input id="pan" type="file" onChange={(e) => handleFileChange(e, 'pan_card')} className="form-input p-1" />
                                {userData.pan_card && <p className="text-xs mt-1 text-primary"><a href={userData.pan_card} target="_blank" rel="noreferrer">View Current PAN</a></p>}
                            </div>
                        </div>
                    </div>

                    {userData.role === 'employee' && (
                        <div className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-gray-50 dark:bg-gray-900/20">
                            <h6 className="text-lg font-bold mb-5 text-warning">Employment Information (Read-Only)</h6>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label>Employee ID</label>
                                    <input type="text" value={userData.employee_id} className="form-input cursor-not-allowed bg-gray-100 dark:bg-gray-800" readOnly />
                                </div>
                                <div>
                                    <label>Designation</label>
                                    <input type="text" value={userData.designation} className="form-input cursor-not-allowed bg-gray-100 dark:bg-gray-800" readOnly />
                                </div>
                                <div>
                                    <label>Department</label>
                                    <input type="text" value={userData.department_name} className="form-input cursor-not-allowed bg-gray-100 dark:bg-gray-800" readOnly />
                                </div>
                                <div>
                                    <label>Reporting Manager</label>
                                    <input type="text" value={userData.reporting_manager_name} className="form-input cursor-not-allowed bg-gray-100 dark:bg-gray-800" readOnly />
                                </div>
                            </div>
                            <p className="text-xs text-white-dark mt-4">* Please contact HR or your Manager to update these fields.</p>
                        </div>
                    )}

                    <div className="flex justify-end mt-5">
                        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={loading}>
                            {loading ? 'Saving...' : 'Save All Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountSetting;
