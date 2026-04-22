import React, { useState, useEffect } from "react";
import {
  Users,
  Building2,
  Calendar,
  TrendingUp,
  Clock,
  Gift,
  UserCheck,
  UserX,
  UserPlus,
  LogOut,
  ArrowRight,
  Sun,
  Moon,
  CloudSun,
  CalendarDays,
  ClipboardList,
  DollarSign,
  Briefcase,
  Bell,
  ChevronRight,
  Layers,
  FileText,
  Settings,
  BarChart3,
  CircleDot,
} from "lucide-react";
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
  half_day: number;
  full_day_leave: number;
}

interface Birthday {
  name: string;
  date_of_birth: string;
}

interface CalendarEventType {
  id: number;
  name: string;
  date: string;
  description: string;
  is_holiday: boolean;
}

interface DashboardData {
  department_count: number;
  leaves_today: number;
  employee_overview: EmployeeOverview;
  upcoming_birthdays: Birthday[];
  attendance_snapshot: AttendanceSnapshot;
  pending_leave_requests: number;
  payroll_status: string;
  next_salary_release_date: string | null;
}

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<CalendarEventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      axiosInstance.get("app/admin-dashboard/"),
      axiosInstance.get("app/calendar-events/").catch(() => ({ data: { results: [] } })),
    ])
      .then(([dashRes, eventsRes]) => {
        setData(dashRes.data);
        const evList = Array.isArray(eventsRes.data)
          ? eventsRes.data
          : eventsRes.data?.results || [];
        // Sort events by date and take upcoming ones
        const today = new Date().toISOString().split("T")[0];
        const upcoming = evList
          .filter((e: CalendarEventType) => e.date >= today)
          .sort((a: CalendarEventType, b: CalendarEventType) => a.date.localeCompare(b.date))
          .slice(0, 5);
        setEvents(upcoming);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-violet-200 dark:border-violet-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-600 animate-spin"></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
          <div className="text-red-500 text-xl font-semibold">Failed to load dashboard</div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  // Time-based greeting
  const hour = currentTime.getHours();
  let greeting = "Good Morning";
  let GreetingIcon = Sun;
  if (hour >= 12 && hour < 17) {
    greeting = "Good Afternoon";
    GreetingIcon = CloudSun;
  } else if (hour >= 17) {
    greeting = "Good Evening";
    GreetingIcon = Moon;
  }

  const adminName = (() => {
    try {
      const token = localStorage.getItem("access_token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.username || payload.first_name || "Admin";
      }
    } catch { /* ignore */ }
    return "Admin";
  })();

  const attendanceTotal = data.employee_overview.total;
  const presentPercentage =
    attendanceTotal > 0
      ? Math.round((data.attendance_snapshot.present / attendanceTotal) * 100)
      : 0;
  const absentPercentage =
    attendanceTotal > 0
      ? Math.round((data.attendance_snapshot.absent / attendanceTotal) * 100)
      : 0;
  const leavePercentage =
    attendanceTotal > 0
      ? Math.round((data.attendance_snapshot.on_leave / attendanceTotal) * 100)
      : 0;

  // Find next upcoming holiday from events
  const nextHoliday = events.find((e) => e.is_holiday);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDateLong = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return `in ${diff} days`;
  };

  return (
    <div className="min-h-screen bg-[#f5f3ff] dark:bg-gray-900">
      {/* ─── Greeting Banner ─── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Left – greeting */}
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Hello, {adminName}
                </p>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {greeting}
                  <GreetingIcon className="w-8 h-8 text-amber-400" />
                </h1>
              </div>
            </div>

            {/* Right – Quick stats pills */}
            <div className="flex flex-wrap gap-3">
              {/* Upcoming Holiday */}
              <div
                className="flex items-center gap-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-2xl px-4 py-3 cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate("/admin/calendar")}
              >
                <div className="p-2 bg-violet-100 dark:bg-violet-800 rounded-xl">
                  <CalendarDays className="w-5 h-5 text-violet-600 dark:text-violet-300" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                    Upcoming Holiday
                  </p>
                  {nextHoliday ? (
                    <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                      {formatDate(nextHoliday.date)}{" "}
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                        {getDaysUntil(nextHoliday.date)}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                      None upcoming
                    </p>
                  )}
                </div>
              </div>

              {/* Leaves today */}
              <div
                className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl px-4 py-3 cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate("/admin/approved-leaves")}
              >
                <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-xl">
                  <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                    Leaves Today
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    {data.leaves_today}{" "}
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      employees
                    </span>
                  </p>
                </div>
              </div>

              {/* Pending requests */}
              <div
                className="flex items-center gap-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl px-4 py-3 cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate("/admin/approved-leaves")}
              >
                <div className="p-2 bg-rose-100 dark:bg-rose-800 rounded-xl">
                  <Bell className="w-5 h-5 text-rose-600 dark:text-rose-300" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                    Pending Requests
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    {data.pending_leave_requests}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Attendance Strip ─── */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Today's Attendance Overview
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Attendance counters */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {data.attendance_snapshot.present}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                Present
              </div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500 dark:text-red-400">
                {data.attendance_snapshot.absent}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                Absent
              </div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500 dark:text-amber-400">
                {data.attendance_snapshot.on_leave}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                On Leave
              </div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                {presentPercentage}%
              </div>
              <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
                Rate
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/admin/attendance-details")}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-md shadow-violet-200 dark:shadow-violet-900/30"
          >
            View Details
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Key Metrics Row ─── */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Employees */}
          <div
            className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 cursor-pointer hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-700 transition-all duration-300"
            onClick={() => navigate("/admin/employee-register")}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-violet-500 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {data.employee_overview.total}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Employees</p>
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full font-medium">
                <CircleDot className="w-3 h-3" />
                {data.employee_overview.active} active
              </span>
            </div>
          </div>

          {/* Departments */}
          <div
            className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 cursor-pointer hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-700 transition-all duration-300"
            onClick={() => navigate("/admin/branch-mgt/department")}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-violet-500 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {data.department_count}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Departments</p>
          </div>

          {/* New Joiners */}
          <div
            className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 cursor-pointer hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-700 transition-all duration-300"
            onClick={() => navigate("/admin/employee-register")}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-violet-50 dark:bg-violet-900/20 rounded-xl group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                <UserPlus className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-violet-500 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {data.employee_overview.new_joinees}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">New Joinees This Month</p>
          </div>

          {/* Attendance Rate */}
          <div
            className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 cursor-pointer hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-700 transition-all duration-300"
            onClick={() => navigate("/admin/attendance-logs")}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-colors">
                <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-violet-500 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {presentPercentage}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Attendance Rate</p>
            {/* Mini progress bar */}
            <div className="mt-3 w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${presentPercentage}%`,
                  background: "linear-gradient(90deg, #8b5cf6, #6d28d9)",
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content Grid ─── */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Employee Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1 h-5 bg-violet-500 rounded-full"></span>
                Employee Overview
              </h3>
              <button
                onClick={() => navigate("/admin/employee-register")}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium"
              >
                View all
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active Employees</span>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {data.employee_overview.active}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <UserX className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Inactive Employees</span>
                </div>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  {data.employee_overview.inactive}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">New Joinees</span>
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {data.employee_overview.new_joinees}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <LogOut className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Exits This Month</span>
                </div>
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                  {data.employee_overview.exits_this_month}
                </span>
              </div>
            </div>
          </div>

          {/* Attendance Breakdown – Visual */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1 h-5 bg-emerald-500 rounded-full"></span>
                Today's Attendance
              </h3>
              <button
                onClick={() => navigate("/admin/attendance-details")}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium"
              >
                Details
              </button>
            </div>

            {/* Donut-like visual */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-gray-100 dark:text-gray-700"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={`${(presentPercentage / 100) * 314.16} 314.16`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="12"
                    strokeDasharray={`${(absentPercentage / 100) * 314.16} 314.16`}
                    strokeDashoffset={`-${(presentPercentage / 100) * 314.16}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="12"
                    strokeDasharray={`${(leavePercentage / 100) * 314.16} 314.16`}
                    strokeDashoffset={`-${((presentPercentage + absentPercentage) / 100) * 314.16}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {presentPercentage}%
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Present</span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mx-auto mb-1"></div>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {data.attendance_snapshot.present}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Present
                </p>
              </div>
              <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <div className="w-2 h-2 bg-red-500 rounded-full mx-auto mb-1"></div>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {data.attendance_snapshot.absent}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Absent
                </p>
              </div>
              <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <div className="w-2 h-2 bg-amber-500 rounded-full mx-auto mb-1"></div>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {data.attendance_snapshot.on_leave}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Leave
                </p>
              </div>
            </div>
          </div>

          {/* Payroll & Finance */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1 h-5 bg-amber-500 rounded-full"></span>
                Payroll & Finance
              </h3>
              <button
                onClick={() => navigate("/admin/payroll-batches")}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium"
              >
                Manage
              </button>
            </div>

            <div className="space-y-4">
              {/* Payroll Status Badge */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Payroll Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      data.payroll_status === "completed"
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {data.payroll_status === "completed" ? "✓ Completed" : "⏳ Pending"}
                  </span>
                </div>
              </div>

              {/* Next Salary */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Next Salary Release</span>
                </div>
                {data.next_salary_release_date ? (
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {new Date(data.next_salary_release_date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Not scheduled</p>
                )}
              </div>

              {/* Pending Leave Requests */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Pending Leaves</span>
                  </div>
                  <span className="text-lg font-bold text-violet-600 dark:text-violet-400">
                    {data.pending_leave_requests}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Grid: Birthdays, Quick Actions, Events ─── */}
      <div className="max-w-7xl mx-auto px-6 mt-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Upcoming Birthdays */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1 h-5 bg-pink-500 rounded-full"></span>
                Upcoming Birthdays
              </h3>
            </div>

            {data.upcoming_birthdays.length === 0 ? (
              <div className="text-center py-8">
                <Gift className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No upcoming birthdays</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {data.upcoming_birthdays.map((birthday, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 rounded-xl border border-pink-100 dark:border-pink-800/30 hover:shadow-md transition-all"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Gift className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {birthday.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(birthday.date_of_birth).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="text-lg">🎂</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                Quick Actions
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate("/admin/employee-register")}
                className="flex flex-col items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/15 rounded-xl border border-blue-100 dark:border-blue-800/30 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all group"
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Employees</span>
              </button>

              <button
                onClick={() => navigate("/admin/approved-leaves")}
                className="flex flex-col items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/15 rounded-xl border border-emerald-100 dark:border-emerald-800/30 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700 transition-all group"
              >
                <div className="p-2 bg-emerald-100 dark:bg-emerald-800/30 rounded-lg group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 transition-colors">
                  <ClipboardList className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Leaves</span>
              </button>

              <button
                onClick={() => navigate("/admin/attendance-logs")}
                className="flex flex-col items-center gap-2 p-4 bg-violet-50 dark:bg-violet-900/15 rounded-xl border border-violet-100 dark:border-violet-800/30 hover:shadow-md hover:border-violet-200 dark:hover:border-violet-700 transition-all group"
              >
                <div className="p-2 bg-violet-100 dark:bg-violet-800/30 rounded-lg group-hover:bg-violet-200 dark:group-hover:bg-violet-800/50 transition-colors">
                  <BarChart3 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Attendance</span>
              </button>

              <button
                onClick={() => navigate("/admin/payroll-batches")}
                className="flex flex-col items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/15 rounded-xl border border-amber-100 dark:border-amber-800/30 hover:shadow-md hover:border-amber-200 dark:hover:border-amber-700 transition-all group"
              >
                <div className="p-2 bg-amber-100 dark:bg-amber-800/30 rounded-lg group-hover:bg-amber-200 dark:group-hover:bg-amber-800/50 transition-colors">
                  <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Payroll</span>
              </button>

              <button
                onClick={() => navigate("/admin/branch-mgt/department")}
                className="flex flex-col items-center gap-2 p-4 bg-rose-50 dark:bg-rose-900/15 rounded-xl border border-rose-100 dark:border-rose-800/30 hover:shadow-md hover:border-rose-200 dark:hover:border-rose-700 transition-all group"
              >
                <div className="p-2 bg-rose-100 dark:bg-rose-800/30 rounded-lg group-hover:bg-rose-200 dark:group-hover:bg-rose-800/50 transition-colors">
                  <Layers className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Departments</span>
              </button>

              <button
                onClick={() => navigate("/admin/configuration/shift")}
                className="flex flex-col items-center gap-2 p-4 bg-cyan-50 dark:bg-cyan-900/15 rounded-xl border border-cyan-100 dark:border-cyan-800/30 hover:shadow-md hover:border-cyan-200 dark:hover:border-cyan-700 transition-all group"
              >
                <div className="p-2 bg-cyan-100 dark:bg-cyan-800/30 rounded-lg group-hover:bg-cyan-200 dark:group-hover:bg-cyan-800/50 transition-colors">
                  <Settings className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Settings</span>
              </button>
            </div>
          </div>

          {/* Events */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1 h-5 bg-indigo-500 rounded-full"></span>
                Upcoming Events
              </h3>
              <button
                onClick={() => navigate("/admin/calendar")}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium"
              >
                View all
              </button>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        event.is_holiday
                          ? "bg-gradient-to-br from-amber-400 to-orange-500"
                          : "bg-gradient-to-br from-indigo-400 to-violet-500"
                      }`}
                    >
                      {event.is_holiday ? (
                        <Sun className="w-5 h-5 text-white" />
                      ) : (
                        <Calendar className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {event.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateLong(event.date)}
                        {event.is_holiday && (
                          <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                            Holiday
                          </span>
                        )}
                      </p>
                      {event.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap mt-0.5">
                      {getDaysUntil(event.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;