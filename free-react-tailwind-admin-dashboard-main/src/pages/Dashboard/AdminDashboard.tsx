import React, { useState, useEffect } from "react";
import { Users, Building2, Calendar, TrendingUp, Clock, DollarSign, Gift, UserCheck, UserX, UserPlus, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "./api";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 font-medium">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl font-semibold">Failed to load dashboard</div>
          <div className="text-gray-600 mt-2">Please try refreshing the page</div>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, onClick, subtitle }: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    onClick?: () => void;
    subtitle?: string;
  }) => (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        {title}
      </h3>
      {children}
    </div>
  );

  const MetricRow = ({ label, value, icon: Icon, color = "text-gray-700" }: {
    label: string;
    value: string | number;
    icon?: React.ElementType;
    color?: string;
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0">
      <div className="flex items-center space-x-3">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );

  const attendanceTotal = data.attendance_snapshot.present + data.attendance_snapshot.absent + data.attendance_snapshot.on_leave;
  const presentPercentage = attendanceTotal > 0 ? Math.round((data.attendance_snapshot.present / attendanceTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your organization.</p>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Employees"
            value={data.employee_overview.total}
            icon={Users}
            color="bg-blue-500"
            onClick={() => navigate("/admin/employee-register")}
            subtitle={`${data.employee_overview.active} active`}
          />
          <StatCard
            title="Departments"
            value={data.department_count}
            icon={Building2}
            color="bg-green-500"
            onClick={() => navigate("/admin/department")}
          />
          <StatCard
            title="On Leave Today"
            value={data.leaves_today}
            icon={Calendar}
            color="bg-amber-500"
            onClick={() => navigate("/admin/approved-leaves")}
          />
          <StatCard
            title="Attendance Rate"
            value={presentPercentage}
            icon={TrendingUp}
            color="bg-purple-500"
            subtitle={`${data.attendance_snapshot.present} present today`}
          />
        </div>

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
              
              {/* Attendance Visual */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>Attendance Overview</span>
                  <span>{presentPercentage}% Present</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${presentPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </InfoCard>

          {/* Payroll Status */}
          <InfoCard title="Payroll & Finance">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Payroll Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  data.payroll_status === "completed" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-yellow-100 text-yellow-800"
                }`}>
                  {data.payroll_status.charAt(0).toUpperCase() + data.payroll_status.slice(1)}
                </span>
              </div>
              
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">Next Salary Release</span>
                </div>
                {data.next_salary_release_date ? (
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(data.next_salary_release_date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                ) : (
                  <p className="text-gray-500">No upcoming release</p>
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
                <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No upcoming birthdays</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.upcoming_birthdays.map((birthday: Birthday, idx: number) => (
                  <div key={idx} className="flex items-center space-x-4 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Gift className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{birthday.name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(birthday.date_of_birth).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </InfoCard>

          {/* Quick Actions */}
          <InfoCard title="Quick Actions">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => navigate("/admin/employee-register")}
                className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Users className="w-6 h-6 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-blue-900">Manage Employees</span>
              </button>
              <button 
                onClick={() => navigate("/admin/approved-leaves")}
                className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <Calendar className="w-6 h-6 text-green-600 mb-2" />
                <span className="text-sm font-medium text-green-900">Leave Requests</span>
              </button>
              <button 
                onClick={() => navigate("/admin/branch-mgt/department")}
                className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <Building2 className="w-6 h-6 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-purple-900">Departments</span>
              </button>
              <button 
               onClick={() => navigate("/admin/payroll-batches")}
               className="flex flex-col items-center p-4 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
               >
                <DollarSign className="w-6 h-6 text-amber-600 mb-2" />
                <span className="text-sm font-medium text-amber-900">Payroll</span>
              </button>
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;