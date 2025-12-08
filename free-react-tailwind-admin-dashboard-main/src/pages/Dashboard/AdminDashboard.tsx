import React, { useState, useEffect } from "react";
import { Users, Building2, Calendar, TrendingUp, Clock, DollarSign, Gift, UserCheck, UserX, UserPlus, LogOut, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "./api";
import { motion } from "framer-motion";

interface EmployeeOverview {
  total: number;
  active: number;
  inactive: number;
  new_joinees: number;
  exits_this_month: number;
}

interface AttendanceSnapshot {
  present: number;
  absent: number;
  on_leave: number;
}

interface Birthday {
  name: string;
  date_of_birth: string;
}

interface DashboardData {
  department_count: number;
  leaves_today: number;
  employee_overview: EmployeeOverview;
  upcoming_birthdays: Birthday[];
  attendance_snapshot: AttendanceSnapshot;
  payroll_status: string;
  next_salary_release_date: string | null;
}

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axiosInstance
      .get("app/admin-dashboard/")
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 dark:text-gray-300 font-medium">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 dark:text-red-400 text-xl font-semibold">Failed to load dashboard</div>
          <div className="text-gray-600 dark:text-gray-400 mt-2">Please try refreshing the page</div>
        </div>
      </div>
    );
  }

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    onClick,
    subtitle,
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    onClick?: () => void;
    subtitle?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`relative rounded-2xl p-6 shadow-lg border overflow-hidden group
        bg-gradient-to-br from-white to-gray-50 border-gray-200 
        dark:from-gray-800 dark:to-gray-900 dark:border-gray-700
        ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-50/50 dark:to-blue-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Animated background circle */}
      <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${color} opacity-10 group-hover:scale-150 transition-transform duration-700`}></div>
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2 tracking-wide uppercase">
            {title}
          </p>
          <p className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              {subtitle}
            </p>
          )}
        </div>
        <motion.div 
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 0.6 }}
          className={`p-4 rounded-2xl ${color} shadow-lg group-hover:shadow-xl transition-shadow`}
        >
          <Icon className="w-7 h-7 text-white" />
        </motion.div>
      </div>
      
      {onClick && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </motion.div>
  );

  const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 
                 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 
                 hover:shadow-2xl transition-all duration-500 backdrop-blur-sm
                 hover:border-blue-200 dark:hover:border-blue-800"
    >
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-5 flex items-center gap-2">
        <span className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></span>
        {title}
      </h3>
      {children}
    </motion.div>
  );

  const MetricRow = ({
    label,
    value,
    icon: Icon,
    color = "text-gray-700",
  }: {
    label: string;
    value: string | number;
    icon?: React.ElementType;
    color?: string;
  }) => (
    <motion.div 
      whileHover={{ x: 4, backgroundColor: "rgba(59, 130, 246, 0.05)" }}
      className="flex items-center justify-between py-3 px-2 rounded-lg border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-all duration-200"
    >
      <div className="flex items-center space-x-3">
        {Icon && (
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </motion.div>
        )}
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>
      </div>
      <motion.span 
        whileHover={{ scale: 1.1 }}
        className={`text-sm font-bold ${color} px-2 py-1 rounded`}
      >
        {value}
      </motion.span>
    </motion.div>
  );

  const attendanceTotal = data.employee_overview.total; // total employees
  const presentPercentage = attendanceTotal > 0 ? Math.round((data.attendance_snapshot.present / attendanceTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-950/20 dark:to-purple-950/20">
      {/* Header with gradient background */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-white via-blue-50/50 to-purple-50/50 dark:from-gray-800 dark:via-blue-900/20 dark:to-purple-900/20 
                   shadow-lg border-b border-gray-200 dark:border-gray-700 backdrop-blur-sm"
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400 ml-14">Welcome back! Here's what's happening with your organization.</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-end"
            >
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 px-4 py-2 rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Live • {new Date().toLocaleTimeString()}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics Cards with staggered animation */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
        >
          <StatCard
            title="Total Employees"
            value={data.employee_overview.total}
            icon={Users}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            onClick={() => navigate("/admin/employee-register")}
            subtitle={`${data.employee_overview.active} active`}
          />
          <StatCard
            title="Departments"
            value={data.department_count}
            icon={Building2}
            color="bg-gradient-to-br from-green-500 to-emerald-600"
            onClick={() => navigate("/admin/branch-mgt/department")}
          />
          <StatCard
            title="On Leave Today"
            value={data.leaves_today}
            icon={Calendar}
            color="bg-gradient-to-br from-amber-500 to-orange-600"
            onClick={() => navigate("/admin/approved-leaves")}
          />
          <StatCard
            title="Attendance Rate"
            value={presentPercentage + "%"}
            icon={TrendingUp}
            color="bg-gradient-to-br from-purple-500 to-pink-600"
            subtitle={`${data.attendance_snapshot.present} present today`}
          />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Employee Overview */}
          <InfoCard title="Employee Overview">
            <div className="space-y-1">
              <MetricRow
                label="Active Employees"
                value={data.employee_overview.active}
                icon={UserCheck}
                color="text-green-600"
              />
              <MetricRow
                label="Inactive Employees"
                value={data.employee_overview.inactive}
                icon={UserX}
                color="text-red-600"
              />
              <MetricRow
                label="New Joiners (This Month)"
                value={data.employee_overview.new_joinees}
                icon={UserPlus}
                color="text-blue-600"
              />
              <MetricRow
                label="Exits (This Month)"
                value={data.employee_overview.exits_this_month}
                icon={LogOut}
                color="text-orange-600"
              />
            </div>
          </InfoCard>

          {/* Attendance Breakdown */}
          <InfoCard title="Today's Attendance">
            <div className="space-y-4">
              <div className="space-y-1">
                <MetricRow
                  label="Present"
                  value={data.attendance_snapshot.present}
                  color="text-green-600"
                />
                <MetricRow
                  label="Absent"
                  value={data.attendance_snapshot.absent}
                  color="text-red-600"
                />
                <MetricRow
                  label="On Leave"
                  value={data.attendance_snapshot.on_leave}
                  color="text-yellow-600"
                />
              </div>
              
              {/* Attendance Visual with animation */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <span className="font-semibold">Attendance Overview</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{presentPercentage}% Present</span>
                </div>
                <div className="w-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full h-3 overflow-hidden shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${presentPercentage}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="bg-gradient-to-r from-green-400 via-green-500 to-emerald-600 dark:from-green-500 dark:via-green-600 dark:to-emerald-700 h-3 rounded-full relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  </motion.div>
                </div>
              </div>
            </div>
          </InfoCard>

          {/* Payroll Status */}
          <InfoCard title="Payroll & Finance">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Payroll Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  data.payroll_status === "completed" 
                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200" 
                    : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                }`}>
                  {data.payroll_status.charAt(0).toUpperCase() + data.payroll_status.slice(1)}
                </span>
              </div>
              
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Next Salary Release</span>
                </div>
                {data.next_salary_release_date ? (
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {new Date(data.next_salary_release_date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No upcoming release</p>
                )}
              </div>
            </div>
          </InfoCard>
        </div>

        {/* Upcoming Birthdays */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InfoCard title="Upcoming Birthdays">
            {data.upcoming_birthdays.length === 0 ? (
              <div className="text-center py-8">
                <Gift className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No upcoming birthdays</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.upcoming_birthdays.map((birthday: Birthday, idx: number) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ scale: 1.03, x: 8 }}
                    className="flex items-center space-x-4 p-4 bg-gradient-to-r from-pink-50 via-purple-50 to-pink-50 
                               dark:from-pink-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-xl 
                               border border-pink-200 dark:border-pink-800 shadow-md hover:shadow-lg 
                               transition-all duration-300 cursor-pointer group"
                  >
                    <motion.div 
                      whileHover={{ rotate: 360, scale: 1.2 }}
                      transition={{ duration: 0.6 }}
                      className="w-12 h-12 bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 rounded-full 
                                 flex items-center justify-center shadow-lg group-hover:shadow-xl"
                    >
                      <Gift className="w-6 h-6 text-white" />
                    </motion.div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 dark:text-white">{birthday.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(birthday.date_of_birth).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <Sparkles className="w-4 h-4 text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                ))}
              </div>
            )}
          </InfoCard>

          {/* Quick Actions with enhanced animations */}
          <InfoCard title="Quick Actions">
            <div className="grid grid-cols-2 gap-4">
              <motion.button 
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/admin/employee-register")}
                className="flex flex-col items-center p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 
                           hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/30 dark:hover:to-blue-800/40 
                           rounded-xl transition-all duration-300 shadow-md hover:shadow-xl border border-blue-200 dark:border-blue-800 group"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Users className="w-7 h-7 text-blue-600 dark:text-blue-400 mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300" />
                </motion.div>
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">Manage Employees</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/admin/approved-leaves")}
                className="flex flex-col items-center p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 
                           hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/30 dark:hover:to-green-800/40 
                           rounded-xl transition-all duration-300 shadow-md hover:shadow-xl border border-green-200 dark:border-green-800 group"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Calendar className="w-7 h-7 text-green-600 dark:text-green-400 mb-2 group-hover:text-green-700 dark:group-hover:text-green-300" />
                </motion.div>
                <span className="text-sm font-semibold text-green-900 dark:text-green-300">Leave Requests</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/admin/branch-mgt/department")}
                className="flex flex-col items-center p-5 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 
                           hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/30 dark:hover:to-purple-800/40 
                           rounded-xl transition-all duration-300 shadow-md hover:shadow-xl border border-purple-200 dark:border-purple-800 group"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Building2 className="w-7 h-7 text-purple-600 dark:text-purple-400 mb-2 group-hover:text-purple-700 dark:group-hover:text-purple-300" />
                </motion.div>
                <span className="text-sm font-semibold text-purple-900 dark:text-purple-300">Departments</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/admin/payroll-batches")}
                className="flex flex-col items-center p-5 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/30 
                           hover:from-amber-100 hover:to-amber-200 dark:hover:from-amber-900/30 dark:hover:to-amber-800/40 
                           rounded-xl transition-all duration-300 shadow-md hover:shadow-xl border border-amber-200 dark:border-amber-800 group"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <DollarSign className="w-7 h-7 text-amber-600 dark:text-amber-400 mb-2 group-hover:text-amber-700 dark:group-hover:text-amber-300" />
                </motion.div>
                <span className="text-sm font-semibold text-amber-900 dark:text-amber-300">Payroll</span>
              </motion.button>
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;