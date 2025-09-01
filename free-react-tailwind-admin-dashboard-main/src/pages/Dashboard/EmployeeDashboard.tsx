import React from "react";
import PageMeta from "../../components/common/PageMeta";
import { FaSyncAlt, FaCalendarAlt, FaMoneyBillWave, FaCoffee, FaChartLine, FaPause, FaUser, FaClock } from 'react-icons/fa';
import { axiosInstance } from "../Employee/api";
import Button from "../../components/ui/button/Button";
import Alert from "../../components/ui/alert/Alert";
import BreakIcons from "../UiElements/Break";
import { AxiosError } from 'axios';

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
  break_config_id: number;
}

interface DashboardData {
  employee_name: string | null;
  employee_photo?: string | null;
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
  birthday_message?: string | null;
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
  const [breakTimer, setBreakTimer] = React.useState<number>(0);
  const breakTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [notification, setNotification] = React.useState<NotificationState | null>(null);
  const [weeklyHours, setWeeklyHours] = React.useState<number>(0);
  const [attendanceScore, setAttendanceScore] = React.useState<number>(100);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  // Birthday wishes state
  const [birthdayCards, setBirthdayCards] = React.useState<{id:number,title:string,description:string}[]>([]);

  // Helper to get initials from employee name
  const getInitials = (name: string | null) => {
    if (!name || typeof name !== 'string') return '';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '';
    return ((parts[0][0] || '') + (parts[parts.length - 1][0] || '')).toUpperCase();
  };

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

  // Fetch dashboard data with enhanced error handling
  const fetchDashboardData = React.useCallback(async () => {
    try {
      const response = await axiosInstance.get("dashboard/");
      
      if (response.status === 200 && response.data.dashboard_data) {
        const dashboardData = response.data.dashboard_data;
               
        setDashboardData(dashboardData);
        // Calculate dynamic values
        calculateWeeklyHours(dashboardData);
        calculateAttendanceScore(dashboardData);
        
        // Do not show payment notification on dashboard refresh
      } else {
        showNotification('Dashboard data has unexpected format', 'error');
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{detail?: string}>;
      
      // Show user-friendly error message
      const errorMessage = axiosError.response?.data?.detail || 
                          axiosError.message || 
                          'Unknown error occurred';
      
      showNotification(
        `Failed to load dashboard: ${errorMessage}`,
        'error'
      );
    }
  }, [calculateWeeklyHours, calculateAttendanceScore, showNotification]);

  React.useEffect(() => {
    fetchDashboardData();
    // Show birthday wishes only once per session
    if (!sessionStorage.getItem('birthdayWishesShown')) {
      (async () => {
        try {
          const res = await axiosInstance.get('/all-notifications/');
          if (Array.isArray(res.data)) {
            // Use a more specific type for n
            const birthdays = res.data.filter((n: { type: string }) => n.type === 'birthday');
            if (birthdays.length > 0) {
              setBirthdayCards(birthdays);
              setTimeout(() => setBirthdayCards([]), 10000);
              sessionStorage.setItem('birthdayWishesShown', '1');
            }
          }
        } catch (err) {
          // Optionally log error for debugging
          // console.error('Failed to fetch birthday notifications', err);
        }
      })();
    }
  }, [fetchDashboardData]);

  // Local timer for real-time updates (working time)
  React.useEffect(() => {
    const shouldBeRunning = dashboardData?.checkin_time && !dashboardData?.checkout_time && !dashboardData?.active_break;

    if (shouldBeRunning && dashboardData?.checkin_time) {
      let checkinTime: number;
      checkinTime = new Date(dashboardData.checkin_time).getTime();
      if (isNaN(checkinTime)) {
        const today = new Date();
        const timeParts = dashboardData.checkin_time.split(":");
        const hours = parseInt(timeParts[0]) || 0;
        const minutes = parseInt(timeParts[1]) || 0;
        const seconds = parseInt(timeParts[2]) || 0;
        today.setHours(hours, minutes, seconds, 0);
        checkinTime = today.getTime();
      }
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - checkinTime) / 1000));
      setLocalTimer(elapsed);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
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
        timerRef.current = null;
      }
    };
  }, [dashboardData?.checkin_time, dashboardData?.checkout_time, dashboardData?.active_break]);

  // Timer for active break
  React.useEffect(() => {
    if (dashboardData?.active_break && dashboardData?.active_break.start_time) {
      let breakStart: number = new Date(dashboardData.active_break.start_time).getTime();
      if (isNaN(breakStart)) {
        const today = new Date();
        const timeParts = dashboardData.active_break.start_time.split(":");
        const hours = parseInt(timeParts[0]) || 0;
        const minutes = parseInt(timeParts[1]) || 0;
        const seconds = parseInt(timeParts[2]) || 0;
        today.setHours(hours, minutes, seconds, 0);
        breakStart = today.getTime();
      }
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - breakStart) / 1000));
      setBreakTimer(elapsed);
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current);
      }
      breakTimerRef.current = setInterval(() => {
        setBreakTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current);
        breakTimerRef.current = null;
      }
      setBreakTimer(0);
    }
    return () => {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current);
        breakTimerRef.current = null;
      }
    };
  }, [dashboardData?.active_break]);

  const formatTime = (seconds: number) => {
    // Safety check for invalid values (but allow 0 as a valid value)
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
      return '00:00:00';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
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

  const handleCheckinClick = async () => {
    setLoading(true);
    try {
      const endpoint = dashboardData?.checkin_time && !dashboardData?.checkout_time ? "checkout/" : "checkin/";
      const res = await axiosInstance.post(endpoint);
      if (res.status === 200) {
        await fetchDashboardData();
      } else {
        showNotification(res.data.detail || "Operation failed", "error");
      }
    } catch {
      showNotification("Network error occurred", "error");
    }
    setLoading(false);
  };

  // Handles both start and end break actions, expects break_config_id and action
  const handleBreakAction = async (breakConfigOrAction: string | number, actionOverride?: string) => {
    setBreakLoading(true);
    try {
      let payload;
      // If called from dropdown, breakConfigOrAction is break_config_id (number or string)
      if (typeof breakConfigOrAction === 'number' || !isNaN(Number(breakConfigOrAction))) {
        payload = { break_config_id: Number(breakConfigOrAction), action: "start" };
      } else if (actionOverride) {
        // For end action, pass break_config_id and action: "end"
        payload = { break_config_id: actionOverride, action: "end" };
      } else {
        // fallback for legacy usage
        payload = { action: breakConfigOrAction };
      }
      const res = await axiosInstance.post("/employee-breaks/", payload);
      if (res.status === 200 || res.status === 201) {
        await fetchDashboardData();
        showNotification("Break action successful", "success");
      } else {
        showNotification(res.data.detail || "Break action failed", "error");
      }
    } catch {
      showNotification("Network error occurred", "error");
    }
    setBreakLoading(false);
  };

  const isCheckedIn = dashboardData?.checkin_time && !dashboardData?.checkout_time;
  const hasActiveBreak = dashboardData?.active_break;

  return (
    <>
      {/* Birthday wishes cards */}
      {birthdayCards.length > 0 && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-3 items-center">
          {birthdayCards.map(card => (
            <div key={card.id} className="bg-yellow-100 border border-yellow-400 rounded-lg shadow px-6 py-3 flex items-center gap-3 animate-fade-in-out">
            
              <div>
                <div className="font-bold text-yellow-800">{card.title}</div>
                <div className="text-yellow-700 text-sm">{card.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <PageMeta
        title="Employee Dashboard"
        description="Employee dashboard overview"
      />
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full flex justify-center">
          <Alert
            variant={notification.type}
            title={notification.type === 'success' ? 'Success' : notification.type === 'error' ? 'Error' : 'Information'}
            message={notification.message}
            showLink={false}
          />
        </div>
      )}
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto p-6">
          
          {/* Header Section with Birthday Theme */}
          <div
            className={
              `rounded-lg shadow-sm border mb-6 ` +
              (dashboardData?.birthday_message
                ? 'bg-gradient-to-r from-pink-400 via-yellow-300 to-blue-400 border-yellow-400 animate-pulse'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700')
            }
          >
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Employee Info */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {dashboardData?.employee_photo ? (
                      <img
                        src={dashboardData.employee_photo}
                        alt="Employee Photo"
                        className="rounded-full w-16 h-16 object-cover border-2 border-gray-200 dark:border-gray-600"
                      />
                    ) : (
                      <div className="rounded-full w-16 h-16 bg-blue-600 flex items-center justify-center text-white text-xl font-semibold border-2 border-gray-200 dark:border-gray-600">
                        {getInitials(dashboardData?.employee_name ?? null)}
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                      isCheckedIn ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Welcome, {dashboardData?.employee_name || 'Employee'}
                      {dashboardData?.birthday_message && (
                        <span className="ml-2 text-3xl" role="img" aria-label="birthday">🎂</span>
                      )}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">{getCurrentDate()}</p>
                    {dashboardData?.birthday_message && (
                      <div className="mt-2 px-4 py-2 rounded-lg bg-white/80 text-pink-700 font-semibold text-lg shadow animate-bounce border border-pink-300 flex items-center gap-2">
                        <span role="img" aria-label="party">🎉</span>
                        {dashboardData.birthday_message}
                        <span role="img" aria-label="party">🎉</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status & Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="text-center">
                    <div className={
                      dashboardData?.birthday_message
                        ? 'text-lg font-mono font-bold text-yellow-700 drop-shadow-lg'
                        : 'text-lg font-mono font-bold text-gray-600 dark:text-white'
                    }>
                      {hasActiveBreak ? formatTime(breakTimer) : formatTime(localTimer)}
                    </div>
                    <div className={
                      dashboardData?.birthday_message
                        ? 'text-sm text-yellow-800'
                        : 'text-sm text-gray-600 dark:text-gray-400'
                    }>
                      {isCheckedIn ? (hasActiveBreak ? 'On Break' : 'Working Time') : 'Ready to Start'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      onClick={() => fetchDashboardData()}
                      title="Refresh"
                    >
                      <FaSyncAlt size={16} />
                    </button>
                    <Button
                      className={`px-6 py-2 rounded-md font-medium transition-colors ${
                        isCheckedIn
                          ? '!bg-red-600 hover:!bg-red-700 !text-white'
                          : '!bg-green-600 hover:!bg-green-700 !text-white'
                      } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      onClick={handleCheckinClick}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : (isCheckedIn ? 'Check Out' : 'Check In')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Break Controls */}
              {isCheckedIn && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {hasActiveBreak ? (
                        <div className="flex items-center gap-3">
                          <span className="flex items-center px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-md text-sm font-medium">
                            <FaPause className="mr-2" />
                            {dashboardData?.active_break?.type} Break - {formatTime(breakTimer)}
                          </span>
                          <button
                            className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700 transition-colors"
                            onClick={() => handleBreakAction('end', dashboardData?.active_break?.break_config_id?.toString())}
                            disabled={breakLoading}
                          >
                            End Break
                          </button>
                        </div>
                      ) : (
                        <BreakIcons 
                          onBreakClick={handleBreakAction}
                          disabled={breakLoading || !!dashboardData?.active_break}
                          activeBreak={dashboardData?.active_break?.type || null}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column - Today's Status */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FaCalendarAlt className="text-blue-600" />
                    Today's Status
                  </h2>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Shift Information */}
                    <div>
                     <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <FaUser className="text-indigo-600" />
                          Shift Information
                        </h3>
                        <div className="space-y-3">
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600 dark:text-gray-400">Shift Name:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {dashboardData?.shift_name || 'Not assigned'}
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600 dark:text-gray-400">Timing:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {dashboardData?.shift_timing || '--:--'}
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600 dark:text-gray-400">Check-in:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {dashboardData?.checkin_time || '--:--'}
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600 dark:text-gray-400">Check-out:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            {dashboardData?.checkout_time || '--:--'}
                          </span>
                        </div>
                        {dashboardData?.is_late && (
                          <div className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm rounded-md">
                            Late arrival detected
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Time Tracking */}
                    <div>
                     <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <FaClock className="text-blue-600" />
                          Time Tracking
                        </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600 dark:text-gray-400">Total Worked:</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {dashboardData?.total_worked || '0h 0m'}
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600 dark:text-gray-400">Effective Time:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {dashboardData?.effective_time || '0h 0m'}
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600 dark:text-gray-400">Break Time:</span>
                          <span className="font-medium text-orange-600 dark:text-orange-400">
                            {dashboardData?.total_break_minutes || 0} minutes
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600 dark:text-gray-400">Overtime:</span>
                          <span className="font-medium text-purple-600 dark:text-purple-400">
                            {dashboardData?.overtime ? `${dashboardData.overtime.total}h` : '0h'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              
              {/* Performance Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FaChartLine className="text-green-600" />
                    Performance
                  </h2>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Weekly Hours Progress */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Weekly Hours</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {weeklyHours.toFixed(1)}/40 hrs
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{width: `${Math.min((weeklyHours / 40) * 100, 100)}%`}}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Attendance Score */}
                  <div className="text-center py-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Attendance Score</div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                      {attendanceScore}%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {attendanceScore >= 90 ? 'Excellent' : attendanceScore >= 80 ? 'Good' : 'Needs Improvement'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payroll Card */}
              {dashboardData?.latest_payroll && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <FaMoneyBillWave className="text-green-600" />
                      Latest Payroll
                    </h2>
                  </div>
                  
                  <div className="p-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                        ₹{dashboardData.latest_payroll.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Processed on {dashboardData.latest_payroll.date}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaCoffee className="text-orange-600" />
                  Recent Break Activity
                </h2>
              </div>
              
              <div className="p-6">
                {dashboardData?.recent_breaks && dashboardData.recent_breaks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dashboardData.recent_breaks.slice(0, 6).map((breakItem: BreakData, index: number) => (
                      <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FaCoffee className="text-orange-600" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white capitalize">
                              {breakItem.type} Break
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {breakItem.start_time} - {breakItem.end_time}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FaCoffee className="mx-auto text-gray-400 text-4xl mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No recent break activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}