import React from "react";
import PageMeta from "../../components/common/PageMeta";
import { FaSyncAlt, FaCalendarAlt, FaMoneyBillWave, FaCoffee, FaChartLine, FaPlay, FaPause, FaUser, FaClock } from 'react-icons/fa';
import { axiosInstance } from "../Employee/api";
import NewComponentCard from "../../components/common/NewComponentCard";
import Button from "../../components/ui/button/Button";
import Alert from "../../components/ui/alert/Alert";

// Enhanced TypeScript interfaces
interface OvertimeData {
  hours: number;
  minutes: number;
  total: number;
}

interface PayrollData {
  amount: number;
  date: string;
}

interface BreakData {
  type: string;
  start_time: string;
  end_time: string;
}

interface ActiveBreakData {
  type: string;
  start_time: string;
}

interface DashboardData {
  checkin_time: string | null;
  checkout_time: string | null;
  is_late: boolean;
  total_worked: string;
  effective_time: string;
  total_break_minutes: number;
  shift_name: string;
  shift_timing: string;
  server_time: string;
  active_break: ActiveBreakData | null;
  recent_breaks: BreakData[] | null;
  overtime: OvertimeData | null;
  latest_payroll: PayrollData | null;
}

interface NotificationState {
  message: string;
  type: 'success' | 'info' | 'error';
}

export default function EmployeeDashboard(): React.JSX.Element {
  const [loading, setLoading] = React.useState<boolean>(false);
  const [dashboardData, setDashboardData] = React.useState<DashboardData | null>(null);
  const [localTimer, setLocalTimer] = React.useState<number>(0);
  const [breakLoading, setBreakLoading] = React.useState<boolean>(false);
  const [notification, setNotification] = React.useState<NotificationState | null>(null);
  const [weeklyHours, setWeeklyHours] = React.useState<number>(0);
  const [attendanceScore, setAttendanceScore] = React.useState<number>(100);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate weekly hours dynamically
  const calculateWeeklyHours = React.useCallback((data: DashboardData): void => {
    if (data.total_worked) {
      const worked = data.total_worked.split(' ');
      const hours = parseInt(worked[0]) || 0;
      const minutes = parseInt(worked[1]) || 0;
      setWeeklyHours(hours + (minutes / 60));
    }
  }, []);

  // Calculate attendance score
  const calculateAttendanceScore = React.useCallback((data: DashboardData): void => {
    let score = 100;
    if (data.is_late) score -= 10;
    if (data.total_break_minutes > 60) score -= 5; // Deduct for long breaks
    setAttendanceScore(Math.max(score, 0));
  }, []);

  // Show live notifications
  const showNotification = React.useCallback((message: string, type: 'success' | 'info' | 'error'): void => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = React.useCallback(async () => {
    try {
      const response = await axiosInstance.get("/dashboard/");
      if (response.status === 200) {
        setDashboardData(response.data.dashboard_data);
        // Calculate dynamic values
        calculateWeeklyHours(response.data.dashboard_data);
        calculateAttendanceScore(response.data.dashboard_data);
        
        // Show payment notification if there's a new payroll
        if (response.data.dashboard_data.latest_payroll) {
          showNotification(
            `Latest payroll: ₹${response.data.dashboard_data.latest_payroll.amount}`,
            'success'
          );
        }
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  }, [calculateWeeklyHours, calculateAttendanceScore, showNotification]);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Local timer for real-time updates
  React.useEffect(() => {
    if (dashboardData?.checkin_time && !dashboardData?.checkout_time) {
      const checkinTime = new Date(dashboardData.checkin_time).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - checkinTime) / 1000);
      setLocalTimer(elapsed);
      
      timerRef.current = setInterval(() => {
        setLocalTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setLocalTimer(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [dashboardData?.checkin_time, dashboardData?.checkout_time]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return now.toLocaleDateString('en-US', options);
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleCheckinClick = async () => {
    setLoading(true);
    try {
      const endpoint = dashboardData?.checkin_time && !dashboardData?.checkout_time ? "checkout/" : "checkin/";
      const res = await axiosInstance.post(endpoint);
      
      if (res.status === 200) {
        await fetchDashboardData();
      } else {
        alert(res.data.detail || "Operation failed");
      }
    } catch {
      alert("Network error occurred");
    }
    setLoading(false);
  };

  const handleBreakAction = async (action: string) => {
    setBreakLoading(true);
    try {
      const res = await axiosInstance.post("break/", { action });
      if (res.status === 200) {
        await fetchDashboardData();
        alert(res.data.detail);
      } else {
        alert(res.data.detail || "Break action failed");
      }
    } catch {
      alert("Network error occurred");
    }
    setBreakLoading(false);
  };

  const isCheckedIn = dashboardData?.checkin_time && !dashboardData?.checkout_time;
  const hasActiveBreak = dashboardData?.active_break;

  return (
    <>
      <PageMeta
        title="Employee Dashboard"
        description="Employee dashboard overview"
      />
      
      {/* Enhanced Toast Notification using Alert component */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Alert
            variant={notification.type}
            title={notification.type === 'success' ? 'Success' : notification.type === 'error' ? 'Error' : 'Information'}
            message={notification.message}
            showLink={false}
          />
        </div>
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-6xl mx-auto p-6">
          {/* MetaCard container with enhanced styling */}
          <div className="border border-slate-200 rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-700 p-6 shadow-xl backdrop-blur-sm">
            {/* Enhanced Profile Card with Break Buttons */}
            <NewComponentCard title=" " className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 border-indigo-200 dark:border-gray-600">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <img
                      src="https://ui-avatars.com/api/?name=Priya+Ammu+Reji&background=4F46E5&color=fff&size=80"
                      alt="Avatar"
                      className="rounded-full w-20 h-20 shadow-lg ring-4 ring-indigo-100 dark:ring-indigo-900"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white ${
                      isCheckedIn ? 'bg-emerald-500' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="font-bold text-xl text-gray-800 dark:text-white mb-1">Hello Priya Ammu Reji</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {dashboardData?.shift_name || 'No shift assigned'}
                    </div>
                    
                    {/* Break Buttons in Profile */}
                    {isCheckedIn && (
                      <div className="flex gap-2 mt-3">
                        {hasActiveBreak ? (
                          <button
                            className="px-3 py-1 bg-orange-600 text-white rounded-full text-xs hover:bg-orange-700 transition-colors flex items-center gap-1"
                            onClick={() => handleBreakAction(hasActiveBreak.type === 'short' ? 'shortbreak' : 'meal')}
                            disabled={breakLoading}
                          >
                            <FaPause className="text-xs" />
                            End {hasActiveBreak.type} Break
                          </button>
                        ) : (
                          <>
                            <button
                              className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                              onClick={() => handleBreakAction('shortbreak')}
                              disabled={breakLoading}
                            >
                              <FaCoffee className="text-xs" />
                              Short Break
                            </button>
                            <button
                              className="px-3 py-1 bg-amber-600 text-white rounded-full text-xs hover:bg-amber-700 transition-colors flex items-center gap-1"
                              onClick={() => handleBreakAction('meal')}
                              disabled={breakLoading}
                            >
                              <FaCoffee className="text-xs" />
                              Meal Break
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Live Timer Display */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                      {isCheckedIn ? formatTime(localTimer) : getCurrentTime()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {isCheckedIn ? 'Working Time' : 'Current Time'}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => fetchDashboardData()}
                      title="Refresh"
                    >
                      <FaSyncAlt size={14} />
                    </button>
                    
                    <Button
                      className={`px-6 py-3 rounded-xl font-semibold transition-all shadow-lg ${
                        isCheckedIn
                          ? '!bg-gradient-to-r !from-red-500 !to-red-600 hover:!from-red-600 hover:!to-red-700 !text-white'
                          : '!bg-gradient-to-r !from-emerald-500 !to-emerald-600 hover:!from-emerald-600 hover:!to-emerald-700 !text-white'
                      } ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-xl transform hover:-translate-y-1'}`}
                      onClick={handleCheckinClick}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : (isCheckedIn ? 'Check Out' : 'Check In')}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-indigo-100 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {getCurrentDate()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Status: <span className={`font-medium ${isCheckedIn ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {isCheckedIn ? 'Active' : 'Offline'}
                  </span>
                </div>
              </div>
            </NewComponentCard>
            {/* Enhanced Main Content Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Today's Status - Large Card with enhanced styling */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-slate-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FaCalendarAlt className="text-white text-xl" />
                        <h2 className="text-xl font-bold text-white">Today's Status</h2>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        isCheckedIn 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {isCheckedIn ? '● Active' : '○ Offline'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Enhanced Shift Details */}
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <FaUser className="text-indigo-600" />
                          Shift Details
                        </h3>
                        <div className="space-y-4">
                          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Shift:</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {dashboardData?.shift_name || 'Not assigned'}
                            </span>
                          </div>
                          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Timing:</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {dashboardData?.shift_timing || '--:--'}
                            </span>
                          </div>
                          <div className="flex justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                            <span className="text-emerald-700 dark:text-emerald-300 font-medium">Check-in:</span>
                            <span className="font-bold text-emerald-800 dark:text-emerald-200">
                              {dashboardData?.checkin_time || '--:--'}
                            </span>
                          </div>
                          <div className="flex justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <span className="text-red-700 dark:text-red-300 font-medium">Check-out:</span>
                            <span className="font-bold text-red-800 dark:text-red-200">
                              {dashboardData?.checkout_time || '--:--'}
                            </span>
                          </div>
                          <div className="flex justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <span className="text-amber-700 dark:text-amber-300 font-medium">Overtime:</span>
                            <span className="font-bold text-amber-800 dark:text-amber-200">
                              {dashboardData?.overtime ? `${dashboardData.overtime.total}h` : '--'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Enhanced Time Tracking */}
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <FaClock className="text-blue-600" />
                          Time Tracking
                        </h3>
                        <div className="space-y-4">
                          <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="text-blue-700 dark:text-blue-300 font-medium">Time Worked:</span>
                            <span className="font-bold text-blue-800 dark:text-blue-200">
                              {dashboardData?.total_worked || '0h 0m'}
                            </span>
                          </div>
                          <div className="flex justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <span className="text-orange-700 dark:text-orange-300 font-medium">Break Time:</span>
                            <span className="font-bold text-orange-800 dark:text-orange-200">
                              {dashboardData?.total_break_minutes || 0}m
                            </span>
                          </div>
                          <div className="flex justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                            <span className="text-emerald-700 dark:text-emerald-300 font-medium">Effective Hours:</span>
                            <span className="font-bold text-emerald-800 dark:text-emerald-200">
                              {dashboardData?.effective_time || '0h 0m'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Enhanced Live Timer */}
                        <div className="mt-6 p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border-2 border-indigo-200 dark:border-gray-600">
                          <h4 className="font-bold text-indigo-900 dark:text-indigo-200 mb-3 flex items-center gap-2">
                            <FaPlay className="text-indigo-600" />
                            Live Timer
                          </h4>
                          <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 font-mono text-center">
                            {isCheckedIn ? formatTime(localTimer) : '00:00:00'}
                          </div>
                          <div className="text-center text-sm text-indigo-600 dark:text-indigo-400 mt-2 font-medium">
                            {isCheckedIn ? '🟢 Currently working' : '⭕ Not checked in'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Performance Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-slate-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4">
                  <div className="flex items-center gap-3">
                    <FaChartLine className="text-white text-xl" />
                    <h2 className="text-xl font-bold text-white">Performance</h2>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Weekly Hours</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{weeklyHours.toFixed(1)}/40 hrs</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                        style={{width: `${Math.min((weeklyHours / 40) * 100, 100)}%`}}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-gray-800 dark:to-gray-700 rounded-xl">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Attendance Score</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">This Month</div>
                    <div className="text-5xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">{attendanceScore}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {attendanceScore >= 90 ? 'Excellent!' : attendanceScore >= 80 ? 'Good' : 'Needs Improvement'}
                    </div>
                  </div>
                  
                  {/* Enhanced Payroll Info */}
                  {dashboardData?.latest_payroll && (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-green-200 dark:border-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <FaMoneyBillWave className="text-green-600 text-lg" />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Latest Payroll</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ₹{dashboardData.latest_payroll.amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Processed on {dashboardData.latest_payroll.date}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Enhanced Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Enhanced Break Status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-slate-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-4">
                  <div className="flex items-center gap-3">
                    <FaCoffee className="text-white text-xl" />
                    <h2 className="text-xl font-bold text-white">Break Status</h2>
                  </div>
                </div>
                
                <div className="p-6">
                  {hasActiveBreak ? (
                    <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-orange-800 dark:text-orange-200 text-lg capitalize flex items-center gap-2">
                            <FaPause className="text-orange-600" />
                            {hasActiveBreak.type} Break Active
                          </div>
                          <div className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                            Started at {hasActiveBreak.start_time}
                          </div>
                        </div>
                        <Button
                          className="px-4 py-2 !bg-gradient-to-r !from-orange-600 !to-amber-600 !text-white rounded-xl font-semibold hover:!from-orange-700 hover:!to-amber-700 transition-all shadow-lg hover:shadow-xl"
                          onClick={() => handleBreakAction(hasActiveBreak.type === 'short' ? 'shortbreak' : 'meal')}
                          disabled={breakLoading}
                        >
                          End Break
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FaCoffee className="mx-auto text-gray-400 text-3xl mb-4" />
                      <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">No active break</p>
                      {isCheckedIn && (
                        <div className="flex gap-3">
                          <Button
                            className="flex-1 px-4 py-3 !bg-gradient-to-r !from-blue-500 !to-indigo-600 !text-white rounded-xl hover:!from-blue-600 hover:!to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                            onClick={() => handleBreakAction('shortbreak')}
                            disabled={breakLoading}
                          >
                            Short Break
                          </Button>
                          <Button
                            className="flex-1 px-4 py-3 !bg-gradient-to-r !from-amber-500 !to-orange-600 !text-white rounded-xl hover:!from-amber-600 hover:!to-orange-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                            onClick={() => handleBreakAction('meal')}
                            disabled={breakLoading}
                          >
                            Meal Break
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Enhanced Recent Activity */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-slate-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
                  <div className="flex items-center gap-3">
                    <FaSyncAlt className="text-white text-xl" />
                    <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                  </div>
                </div>
                
                <div className="p-6">
                  {dashboardData?.recent_breaks && dashboardData.recent_breaks.length > 0 ? (
                    <div className="space-y-3">
                      {dashboardData.recent_breaks.slice(0, 3).map((breakItem: BreakData, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-gray-600 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center gap-3">
                            <FaCoffee className="text-orange-600 text-lg" />
                            <div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                                {breakItem.type} Break
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {breakItem.start_time} - {breakItem.end_time}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FaSyncAlt className="mx-auto text-gray-400 text-3xl mb-4" />
                      <p className="text-gray-600 dark:text-gray-400 font-medium">No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}