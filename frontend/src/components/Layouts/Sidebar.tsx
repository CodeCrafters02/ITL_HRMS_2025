import PerfectScrollbar from 'react-perfect-scrollbar';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import { toggleSidebar } from '../../store/themeConfigSlice';
import AnimateHeight from 'react-animate-height';
import { IRootState } from '../../store';
import { useState, useEffect } from 'react';
import IconCaretsDown from '../Icon/IconCaretsDown';
import IconCaretDown from '../Icon/IconCaretDown';
import IconMenuDashboard from '../Icon/Menu/IconMenuDashboard';
import IconMinus from '../Icon/IconMinus';
import IconMenuContacts from '../Icon/Menu/IconMenuContacts';
import IconMenuCalendar from '../Icon/Menu/IconMenuCalendar';
import IconMenuChat from '../Icon/Menu/IconMenuChat';
import IconMenuCharts from '../Icon/Menu/IconMenuCharts';
import IconMenuTables from '../Icon/Menu/IconMenuTables';
import IconMenuForms from '../Icon/Menu/IconMenuForms';
import IconMenuUsers from '../Icon/Menu/IconMenuUsers';
import IconMenuPages from '../Icon/Menu/IconMenuPages';
import IconMenuAuthentication from '../Icon/Menu/IconMenuAuthentication';
import IconMenuDocumentation from '../Icon/Menu/IconMenuDocumentation';
import IconMenuComponents from '../Icon/Menu/IconMenuComponents';
import IconMenuElements from '../Icon/Menu/IconMenuElements';
import IconMenuInvoice from '../Icon/Menu/IconMenuInvoice';
import IconMenuNotes from '../Icon/Menu/IconMenuNotes';

const Sidebar = () => {
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const [errorSubMenu, setErrorSubMenu] = useState(false);
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const location = useLocation();
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const userRole = localStorage.getItem('user_role') || '';

    const toggleMenu = (value: string) => {
        setCurrentMenu((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };

    useEffect(() => {
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
                if (ele.length) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele.click();
                    });
                }
            }
        }
    }, []);

    useEffect(() => {
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location]);

    return (
        <div className={semidark ? 'dark' : ''}>
            <nav
                className={`sidebar fixed min-h-screen h-full top-0 bottom-0 w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] z-50 transition-all duration-300 ${semidark ? 'text-white-dark' : ''}`}
            >
                <div className="bg-white dark:bg-black h-full">
                    <div className="flex justify-between items-center px-4 py-3">
                        <NavLink to="/" className="main-logo flex items-center shrink-0">
                            <img className="w-8 ml-[5px] flex-none" src="/assets/images/logo.svg" alt="logo" />
                            <span className="text-2xl ltr:ml-1.5 rtl:mr-1.5 font-semibold align-middle lg:inline dark:text-white-light">{t('VRISTO')}</span>
                        </NavLink>

                        <button
                            type="button"
                            className="collapse-icon w-8 h-8 rounded-full flex items-center hover:bg-gray-500/10 dark:hover:bg-dark-light/10 dark:text-white-light transition duration-300 rtl:rotate-180"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconCaretsDown className="m-auto rotate-90" />
                        </button>
                    </div>
                    <PerfectScrollbar className="h-[calc(100vh-80px)] relative">
                        <ul className="relative font-semibold space-y-0.5 p-4 py-0">

                            {/* ===== MASTER SIDEBAR ===== */}
                            {userRole === 'master' && (
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>{t('Master Dashboard')}</span>
                                    </h2>
                                    <li className="menu nav-item">
                                        <NavLink to="/master/dashboard" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Dashboard')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/master/company" className="group">
                                            <div className="flex items-center">
                                                <IconMenuContacts className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Company')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/master/user-management" className="group">
                                            <div className="flex items-center">
                                                <IconMenuUsers className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('User Management')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* ===== EMPLOYEE SIDEBAR ===== */}
                            {userRole === 'employee' && (
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>{t('Employee Dashboard')}</span>
                                    </h2>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/dashboard" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Dashboard')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/my-tasks" className="group">
                                            <div className="flex items-center">
                                                <IconMenuNotes className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('My Tasks')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/leave-application" className="group">
                                            <div className="flex items-center">
                                                <IconMenuCalendar className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Leave Application')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/attendance-history" className="group">
                                            <div className="flex items-center">
                                                <IconMenuCharts className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Attendance History')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/notifications" className="group">
                                            <div className="flex items-center">
                                                <IconMenuPages className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Notifications')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/learning-corner" className="group">
                                            <div className="flex items-center">
                                                <IconMenuTables className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Learning Corner')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/company-policy" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDocumentation className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Company policies')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/references" className="group">
                                            <div className="flex items-center">
                                                <IconMenuForms className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('References')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/reportees" className="group">
                                            <div className="flex items-center">
                                                <IconMenuUsers className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Reportees')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/desk-booking" className="group">
                                            <div className="flex items-center">
                                                <IconMenuComponents className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Desk Booking')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/chat" className="group">
                                            <div className="flex items-center">
                                                <IconMenuChat className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Chat')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/calendar" className="group">
                                            <div className="flex items-center">
                                                <IconMenuCalendar className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Calendar')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="menu nav-item">
                                        <NavLink to="/employee/asset-requests" className="group">
                                            <div className="flex items-center">
                                                <IconMenuNotes className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Asset Requests')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            {/* ===== ADMIN SIDEBAR ===== */}
                            {userRole === 'admin' && (
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>{t('Admin Dashboard')}</span>
                                    </h2>

                                    {/* Dashboard */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/dashboard" className="group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Dashboard')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Configurator */}
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'configurator' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('configurator')}>
                                            <div className="flex items-center">
                                                <IconMenuElements className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Configurator')}</span>
                                            </div>
                                            <div className={currentMenu !== 'configurator' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'configurator' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li><NavLink to="/admin/branch-mgt/department">{t('Department')}</NavLink></li>
                                                <li><NavLink to="/admin/branch-mgt/level">{t('Level')}</NavLink></li>
                                                <li><NavLink to="/admin/branch-mgt/designation">{t('Designation')}</NavLink></li>
                                                <li><NavLink to="/admin/configuration/break-config">{t('Break Config')}</NavLink></li>
                                                <li><NavLink to="/admin/configuration/shift">{t('Shift')}</NavLink></li>
                                                <li><NavLink to="/admin/configuration/department-wise-working-days">{t('Dept Working Days')}</NavLink></li>
                                                <li><NavLink to="/admin/configuration/leave-count">{t('Leave Count')}</NavLink></li>
                                                <li><NavLink to="/admin/configuration/company-policies">{t('Company Policies')}</NavLink></li>
                                                <li><NavLink to="/admin/configuration/office-structure">{t('Office Structure')}</NavLink></li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>

                                    {/* Employee Management */}
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'employee-mgt' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('employee-mgt')}>
                                            <div className="flex items-center">
                                                <IconMenuUsers className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Employee Mgt')}</span>
                                            </div>
                                            <div className={currentMenu !== 'employee-mgt' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'employee-mgt' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li><NavLink to="/admin/employee-register">{t('Employee Register')}</NavLink></li>
                                                <li><NavLink to="/admin/assign-shifts">{t('Assign Shifts')}</NavLink></li>
                                                <li><NavLink to="/admin/recruitment">{t('Recruitment')}</NavLink></li>
                                                <li><NavLink to="/admin/relieved-employees">{t('Relieved Employees')}</NavLink></li>
                                                <li><NavLink to="/admin/letter-templates">{t('Letter Templates')}</NavLink></li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>

                                    {/* Leave Management */}
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'leave-mgt' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('leave-mgt')}>
                                            <div className="flex items-center">
                                                <IconMenuCalendar className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Leave Mgt')}</span>
                                            </div>
                                            <div className={currentMenu !== 'leave-mgt' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'leave-mgt' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li><NavLink to="/admin/approved-leaves">{t('Approved Leaves')}</NavLink></li>
                                                <li><NavLink to="/admin/rejected-leaves">{t('Rejected Leaves')}</NavLink></li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>

                                    {/* Attendance Management */}
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'attendance-mgt' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('attendance-mgt')}>
                                            <div className="flex items-center">
                                                <IconMenuCharts className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Attendance Mgt')}</span>
                                            </div>
                                            <div className={currentMenu !== 'attendance-mgt' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'attendance-mgt' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li><NavLink to="/admin/attendance-logs">{t('Attendance Logs')}</NavLink></li>
                                                <li><NavLink to="/admin/attendance-details">{t('Attendance Details')}</NavLink></li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>

                                    {/* Payroll Management */}
                                    <li className="menu nav-item">
                                        <button type="button" className={`${currentMenu === 'payroll-mgt' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('payroll-mgt')}>
                                            <div className="flex items-center">
                                                <IconMenuInvoice className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Payroll Mgt')}</span>
                                            </div>
                                            <div className={currentMenu !== 'payroll-mgt' ? 'rtl:rotate-90 -rotate-90' : ''}>
                                                <IconCaretDown />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'payroll-mgt' ? 'auto' : 0}>
                                            <ul className="sub-menu text-gray-500">
                                                <li><NavLink to="/admin/salary-structure">{t('Salary Structure')}</NavLink></li>
                                                <li><NavLink to="/admin/payroll-batches">{t('Payroll Reports')}</NavLink></li>
                                                <li><NavLink to="/admin/income-tax">{t('Income Config')}</NavLink></li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>

                                    {/* Assets & Inventory */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/assets-inventory" className="group">
                                            <div className="flex items-center">
                                                <IconMenuNotes className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Assets & Inventory')}</span>
                                            </div>
                                        </NavLink>
                                    </li>


                                    {/* Calendar */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/calendar" className="group">
                                            <div className="flex items-center">
                                                <IconMenuCalendar className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Calendar')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Chat */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/chat" className="group">
                                            <div className="flex items-center">
                                                <IconMenuChat className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Chat')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Notifications */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/notifications" className="group">
                                            <div className="flex items-center">
                                                <IconMenuPages className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Notifications')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Learning Corner */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/learning-corner" className="group">
                                            <div className="flex items-center">
                                                <IconMenuTables className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Learning Corner')}</span>
                                            </div>
                                        </NavLink>
                                    </li>

                                    {/* Employee References */}
                                    <li className="menu nav-item">
                                        <NavLink to="/admin/employee-references" className="group">
                                            <div className="flex items-center">
                                                <IconMenuForms className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Employee References')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                        </ul>
                    </PerfectScrollbar>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
