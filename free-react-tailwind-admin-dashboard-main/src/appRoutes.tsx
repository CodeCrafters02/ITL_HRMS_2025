import { Route, Routes } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import MasterDashboard from "./pages/Dashboard/MasterDashboard";
import AdminDashboard from "./pages/Dashboard/AdminDashboard";
import AdminPage from "./pages/Master/Adminpage";
import CompanyList from "./pages/Master/Companypage";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import AdminCalendar from "./pages/Admin/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import EmployeeLayout from "./layout/EmployeeLayout/EmployeeLayout";
import MasterLayout from "./layout/MasterLayout/MasterLayout";
import Home from "./pages/Dashboard/Home";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AdminLayout from "./layout/AdminLayout/AdminLayout";
import Department from "./pages/Admin/Department";
import Level from "./pages/Admin/Level";
import CreateAdmin from "./pages/Forms/CreateAdmin";
import CreateCompany from "./pages/Forms/CreateCompany";
import Designation from "./pages/Admin/Designation";
import AssetsInventory from "./pages/Admin/Assets&Inventory";
import LearningCornerPage from "./pages/Admin/LearningCorner";
import ShiftPolicyList from "./pages/Admin/Shift";
import LeaveCountPage from "./pages/Admin/LeaveCount";
import EmployeeRegister from "./pages/Admin/EmployeeRegister";
import RecruitmentPage from "./pages/Admin/Recruitment";
import DepartmentWorkingDays from "./pages/Admin/DepartmentWiseWorking";
import DepartmentForm from "./pages/Forms/DepartmentForm";
import LevelForm from "./pages/Forms/LevelForm";
import DesignationForm from "./pages/Forms/DesignationForm";
import SalaryStructureList from "./pages/Admin/SalaryStructure";
import SalaryStructureForm from "./pages/Forms/SalaryStructureForm";
import IncomeTax from "./pages/Admin/IncomeTax";
import IncomeTaxForm from "./pages/Forms/IncomeTaxForm";
import AssetsInventoryForm from "./pages/Forms/AssetsInventoryForm";
import AdminNotifications from "./pages/Admin/AdminNotifications";
import ShiftConfigForm from "./pages/Forms/ShiftConfigForm";
import DepartmentWorkingForm from "./pages/Forms/DepartmentWorkingForm";
import RecruitmentForm from "./pages/Forms/RecruitmentForm";
import EmployeeRegisterForm from "./pages/Forms/EmployeeRegisterForm";
import LearningCornerForm from "./pages/Forms/LearningCornerForm";
import ApprovedLeave from "./pages/Admin/ApprovedLeaves";
import RejectedLeave from "./pages/Admin/RejectedLeaves";
import Attendance from "./pages/Admin/AttendanceDetails";
import AttendanceLog from "./pages/Admin/Attendance_log";
import CompanyPolicy from "./pages/Admin/CompanyPolicy";
import PayrollBatches from "./pages/Admin/PayrollBatches";
import CompanyPolicyForm from "./pages/Forms/CompanyPolicyForm";
import GeneratePayroll from "./pages/Admin/GeneratePayroll";
import EmployeeDashboard from "./pages/Dashboard/EmployeeDashboard";
import LeaveApply from "./pages/Employee/LeaveApply";
import AttendanceHistory from "./pages/Employee/AttendanceHistory";
import PersonalCalendar from "./pages/Employee/Personalcalendar";
import Notifications from "./pages/Employee/Notifications";
import LearningCorner from "./pages/Employee/EmployeeLearningCorner";


export function appRoutes() {
  return (
    <Routes>
          {/* Dashboard Layout */}
          <Route element={<MasterLayout />}>
            <Route index path="/" element={<Home />} />

            <Route path="/master-dashboard" element={<MasterDashboard />} />
            <Route path="/master/admin" element={<AdminPage />} />
            <Route path="/master/admin/create" element={<CreateAdmin />} />
            <Route path="/master/company" element={<CompanyList />} />
            <Route path="/master/company/create" element={<CreateCompany />} />

            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />
            
            {/* Tables */}
            <Route path="/basic-tables" element={<BasicTables />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
          </Route>

        {/* Admin Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          
            <Route index element={<AdminDashboard />} />
           
            <Route path="branch-mgt/department" element={<Department />} />
            <Route path="branch-mgt/level" element={<Level />} />
            <Route path="branch-mgt/designation" element={<Designation />} />
            <Route path="salary-structure" element={<SalaryStructureList />} />
            <Route path="income-tax" element={<IncomeTax />} />
            <Route path="payroll-batches" element={<PayrollBatches />} />
            <Route path="generate-payroll" element={<GeneratePayroll />} />
            <Route path="assets-inventory" element={<AssetsInventory />} />
            <Route path="learning-corner" element={<LearningCornerPage />} />
            <Route path="configuration/shift" element={<ShiftPolicyList />} />
            <Route path="configuration/leave-count" element={<LeaveCountPage />} />
            <Route path="configuration/department-wise-working-days" element={<DepartmentWorkingDays />} />
            <Route path="employee-register" element={<EmployeeRegister />} />
            <Route path="recruitment" element={<RecruitmentPage />} />
            <Route path="approved-leaves" element={<ApprovedLeave/>} />
            <Route path="rejected-leaves" element={<RejectedLeave/>} />
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="attendance-logs" element={<AttendanceLog />} />
            <Route path="configuration/company-policies" element={<CompanyPolicy />} />
            <Route path="attendance-details" element={<Attendance />} />
            <Route path="admin-notifications" element={<AdminNotifications />} />


            {/* Admin Forms */}
            <Route path="form-department" element={<DepartmentForm />} />
            <Route path="form-level" element={<LevelForm />} />
            <Route path="form-designation" element={<DesignationForm />} />
            <Route path="form-salary-structure" element={<SalaryStructureForm />} />
            <Route path="form-income-tax" element={<IncomeTaxForm />} />
            <Route path="form-learning-corner" element={<LearningCornerForm />} />
            <Route path="form-assets-inventory" element={<AssetsInventoryForm />} />
            <Route path="form-shift-config" element={<ShiftConfigForm />} />
            <Route path="form-department-working" element={<DepartmentWorkingForm />} />
            <Route path="form-recruitment" element={<RecruitmentForm />} />
            <Route path="form-employee-register" element={<EmployeeRegisterForm />} />
            <Route path="form-company-policy" element={<CompanyPolicyForm />} />
            <Route path="form-company-policy/:id" element={<CompanyPolicyForm />} />

            {/* Other Admin Pages */}
            <Route path="profile" element={<UserProfiles />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="blank" element={<Blank />} />
            <Route path="form-elements" element={<FormElements />} />
        </Route>

        {/* Direct Admin Dashboard Route with AdminLayout */}
        <Route path="/admin-dashboard" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
        </Route>

            {/* Admin Management */}
            {/* Create Admin */}

            {/* Tables */}

            {/* Admin Management */}
            {/* Create Admin */}

            {/* Tables */}
            <Route path="basic-tables" element={<BasicTables />} />

            {/* Ui Elements */}
            <Route path="alerts" element={<Alerts />} />
            <Route path="avatars" element={<Avatars />} />
            <Route path="badge" element={<Badges />} />
            <Route path="buttons" element={<Buttons />} />
            <Route path="images" element={<Images />} />
            <Route path="videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />

            {/* Auth Routes */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Employee Routes */}
            <Route path="/employee" element={<EmployeeLayout />}>
                <Route index element={<EmployeeDashboard />} />
                <Route path="/employee/leave-application" element={<LeaveApply />} />
                <Route path="/employee/attendance-history" element={<AttendanceHistory />} />
                <Route path="/employee/personal-calendar" element={<PersonalCalendar />} />
                <Route path="/employee/notifications" element={<Notifications />} />
                <Route path="/employee/learning-corner" element={<LearningCorner />} />
            </Route>

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

