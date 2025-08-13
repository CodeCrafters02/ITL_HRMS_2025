import { Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
const SignIn = lazy(() => import("./pages/AuthPages/SignIn"));
const SignUp = lazy(() => import("./pages/AuthPages/SignUp"));
const MasterDashboard = lazy(() => import("./pages/Dashboard/MasterDashboard"));
const AdminDashboard = lazy(() => import("./pages/Dashboard/AdminDashboard"));
const AdminPage = lazy(() => import("./pages/Master/Adminpage"));
const CompanyList = lazy(() => import("./pages/Master/Companypage"));
const NotFound = lazy(() => import("./pages/OtherPage/NotFound"));
const UserProfiles = lazy(() => import("./pages/UserProfiles"));
const Videos = lazy(() => import("./pages/UiElements/Videos"));
const Images = lazy(() => import("./pages/UiElements/Images"));
const Alerts = lazy(() => import("./pages/UiElements/Alerts"));
const Badges = lazy(() => import("./pages/UiElements/Badges"));
const Avatars = lazy(() => import("./pages/UiElements/Avatars"));
const Buttons = lazy(() => import("./pages/UiElements/Buttons"));
const LineChart = lazy(() => import("./pages/Charts/LineChart"));
const BarChart = lazy(() => import("./pages/Charts/BarChart"));
const Calendar = lazy(() => import("./pages/Calendar"));
const AdminCalendar = lazy(() => import("./pages/Admin/Calendar"));
const BasicTables = lazy(() => import("./pages/Tables/BasicTables"));
const EmployeeLayout = lazy(() => import("./layout/EmployeeLayout/EmployeeLayout"));
const MasterLayout = lazy(() => import("./layout/MasterLayout/MasterLayout"));
const Home = lazy(() => import("./pages/Dashboard/Home"));
const FormElements = lazy(() => import("./pages/Forms/FormElements"));
const Blank = lazy(() => import("./pages/Blank"));
const AdminLayout = lazy(() => import("./layout/AdminLayout/AdminLayout"));
const Department = lazy(() => import("./pages/Admin/Department"));
const Level = lazy(() => import("./pages/Admin/Level"));
const CreateAdmin = lazy(() => import("./pages/Forms/CreateAdmin"));
const CreateCompany = lazy(() => import("./pages/Forms/CreateCompany"));
const Designation = lazy(() => import("./pages/Admin/Designation"));
const AssetsInventory = lazy(() => import("./pages/Admin/Assets&Inventory"));
const LearningCornerPage = lazy(() => import("./pages/Admin/LearningCorner"));
const ShiftPolicyList = lazy(() => import("./pages/Admin/Shift"));
const LeaveCountPage = lazy(() => import("./pages/Admin/LeaveCount"));
const EmployeeRegister = lazy(() => import("./pages/Admin/EmployeeRegister"));
const RecruitmentPage = lazy(() => import("./pages/Admin/Recruitment"));
const DepartmentWorkingDays = lazy(() => import("./pages/Admin/DepartmentWiseWorking"));
const DepartmentForm = lazy(() => import("./pages/Forms/DepartmentForm"));
const LevelForm = lazy(() => import("./pages/Forms/LevelForm"));
const DesignationForm = lazy(() => import("./pages/Forms/DesignationForm"));
const SalaryStructureList = lazy(() => import("./pages/Admin/SalaryStructure"));
const SalaryStructureForm = lazy(() => import("./pages/Forms/SalaryStructureForm"));
const IncomeTax = lazy(() => import("./pages/Admin/IncomeTax"));
const IncomeTaxForm = lazy(() => import("./pages/Forms/IncomeTaxForm"));
const AssetsInventoryForm = lazy(() => import("./pages/Forms/AssetsInventoryForm"));
const AdminNotifications = lazy(() => import("./pages/Admin/AdminNotifications"));
const ShiftConfigForm = lazy(() => import("./pages/Forms/ShiftConfigForm"));
const DepartmentWorkingForm = lazy(() => import("./pages/Forms/DepartmentWorkingForm"));
const RecruitmentForm = lazy(() => import("./pages/Forms/RecruitmentForm"));
const EmployeeRegisterForm = lazy(() => import("./pages/Forms/EmployeeRegisterForm"));
const LearningCornerForm = lazy(() => import("./pages/Forms/LearningCornerForm"));
const ApprovedLeave = lazy(() => import("./pages/Admin/ApprovedLeaves"));
const RejectedLeave = lazy(() => import("./pages/Admin/RejectedLeaves"));
const Attendance = lazy(() => import("./pages/Admin/AttendanceDetails"));
const AttendanceLog = lazy(() => import("./pages/Admin/Attendance_log"));
const CompanyPolicy = lazy(() => import("./pages/Admin/CompanyPolicy"));
const PayrollBatches = lazy(() => import("./pages/Admin/PayrollBatches"));
const CompanyPolicyForm = lazy(() => import("./pages/Forms/CompanyPolicyForm"));
const GeneratePayroll = lazy(() => import("./pages/Admin/GeneratePayroll"));
const EmployeeDashboard = lazy(() => import("./pages/Dashboard/EmployeeDashboard"));
const LeaveApply = lazy(() => import("./pages/Employee/LeaveApply"));
const AttendanceHistory = lazy(() => import("./pages/Employee/AttendanceHistory"));
const PersonalCalendar = lazy(() => import("./pages/Employee/Personalcalendar"));
const Notifications = lazy(() => import("./pages/Employee/Notifications"));
const LearningCorner = lazy(() => import("./pages/Employee/EmployeeLearningCorner"));
const MyTask = lazy(() => import("./pages/Employee/MyTask"));
const AssignTask = lazy(() => import("./pages/Employee/AssignTask"));
const CreateTask = lazy(() => import("./pages/Forms/CreateTask"));
const UpdateTaskForm = lazy(() => import("./pages/Forms/UpdateTaskForm"));
const EmployeeProfiles = lazy(() => import("./pages/Employee/Profile"));

const UserManagementPage = lazy(() => import("./pages/UserManagement/index"));
const ProductPage = lazy(() => import("./pages/Products/index"));
const ServicePage = lazy(() => import("./pages/Services/index"));
const SubServicePage = lazy(() => import("./pages/SubService/index"));
const DemoRequestPage = lazy(() => import("./pages/DemoRequests/index"));
const ContactRequestPage = lazy(() => import("./pages/ContactRequests/index"));

const MainPage = lazy(() => import("./Website/Pages/Home"));
const Service = lazy(() => import("./Website/Pages/Service"));
const Services = lazy(() => import("./Website/Pages/Services"));
const Team = lazy(() => import("./Website/Pages/Team"));
const Contact = lazy(() => import("./Website/Pages/Contact"));
const AboutUs = lazy(() => import("./Website/Pages/AboutUs"));
const Products = lazy(() => import("./Website/Pages/Products"));
const DigitalMarketing = lazy(() => import("./Website/Pages/DigitalMarketing"));
const SoftwareSolutions = lazy(() => import("./Website/Pages/SoftwareSolutions"));
const AnalyticsSolution = lazy(() => import("./Website/Pages/AnalyticsSolution"));
const BookDemo = lazy(() => import("./Website/Pages/BookDemo"));
const ProductDetailsPage = lazy(() => import("./Website/Pages/ProductDetailsPage"));
const PrivacyPolicy = lazy(() => import("./Website/Pages/PrivacyPolicy"));
const Terms = lazy(() => import("./Website/Pages/Terms"));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// interface RoutesComponentProps {
//     hasPreloaderShown: boolean;
// }

// export function appRoutes({ hasPreloaderShown }: RoutesComponentProps) {

export function appRoutes() {
  return (

  <Suspense fallback={<LoadingSpinner />}>

    <Routes>
          {/* Dashboard Layout */}
          <Route element={<MasterLayout />}>
            <Route index path="/home" element={<Home />} />

            <Route path="/master-dashboard" element={<MasterDashboard />} />
            <Route path="/master/admin" element={<AdminPage />} />
            <Route path="/master/admin/create" element={<CreateAdmin />} />
            <Route path="/master/company" element={<CompanyList />} />
            <Route path="/master/company/create" element={<CreateCompany />} />
            <Route path="/master/products" element={<ProductPage />} />
            <Route path="/master/services" element={<ServicePage />} />
            <Route path="/master/subservices" element={<SubServicePage />} />
            <Route path="/master/usermanagement" element={<UserManagementPage />} />
            <Route path="/master/demorequest" element={<DemoRequestPage />} />
            <Route path="/master/contactrequest" element={<ContactRequestPage />} />

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
         <Route path="/update-form/:id" element={<UpdateTaskForm />} />
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
            <Route path="/" element={<MainPage />} />
            {/* <Route path="/" element={<MainPage hasPreloaderShown={hasPreloaderShown} />} /> */}
            <Route path="/service" element={<Service />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/service" element={<Service />} />
            <Route path="/services" element={<Services />} />
            <Route path="/team" element={<Team />} />
            <Route path="/products" element={<Products />} />
            <Route path="/digitalmarketing" element={<DigitalMarketing />} />
            <Route path="/softwaresolution" element={<SoftwareSolutions />} />
            <Route path="/analyticssolution" element={<AnalyticsSolution />} />
            <Route path="/bookdemo" element={<BookDemo/>} />  
            <Route path="/product/:id" element={<ProductDetailsPage />} />
            <Route path="/privacypolicy" element={<PrivacyPolicy/>} />  
            <Route path="/terms" element={<Terms/>} />  


            {/* Employee Routes */}
            <Route path="/employee" element={<EmployeeLayout />}>
                <Route index element={<EmployeeDashboard />} />
                <Route path="/employee/leave-application" element={<LeaveApply />} />
                <Route path="/employee/attendance-history" element={<AttendanceHistory />} />
                <Route path="/employee/personal-calendar" element={<PersonalCalendar />} />
                <Route path="/employee/notifications" element={<Notifications />} />
                <Route path="/employee/learning-corner" element={<LearningCorner />} />
                <Route path="/employee/my-tasks" element={<MyTask />} />
                <Route path="/employee/assign-task" element={<AssignTask />} />
                <Route path="/employee/create-tasks" element={<CreateTask />} />
                <Route path="/employee/profile" element={<EmployeeProfiles />} />
            </Route>

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>

  );
}

