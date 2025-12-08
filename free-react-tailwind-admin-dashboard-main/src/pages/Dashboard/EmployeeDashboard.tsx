import React from "react";
import PageMeta from "../../components/common/PageMeta";
import { FaSyncAlt, FaCalendarAlt, FaMoneyBillWave, FaCoffee, FaChartLine, FaPause, FaUser, FaClock, FaTasks, FaUmbrellaBeach, FaCheckCircle, FaExclamationCircle, FaUsers, FaBell, FaFileAlt, FaGraduationCap, FaArrowRight, FaBuilding, FaChartPie } from 'react-icons/fa';
import { axiosInstance, axiosInstances } from "../Employee/api";
import Button from "../../components/ui/button/Button";
import Alert from "../../components/ui/alert/Alert";
import BreakIcons from "../UiElements/Break";
import { AxiosError } from 'axios';
import { Link } from 'react-router';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

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
  break_choice: string;
  start_time: string;
  break_config_id: number;
  duration_minutes?: number;
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
  total_work_duration_week?: string;
  today_work_duration?: string;
}

interface TaskStats {
  total: number;
  pending: number;
  completed: number;
  in_progress: number;
}

interface LeaveStats {
  total_leaves: number;
  used_leaves: number;
  remaining_leaves: number;
  pending_requests: number;
}

interface AttendanceStats {
  present_days: number;
  absent_days: number;
  late_days: number;
  total_days: number;
  attendance_percentage: number;
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
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  // Birthday wishes state
  const [birthdayCards, setBirthdayCards] = React.useState<{ id: number, title: string, description: string }[]>([]);
  const [employeeStatus, setEmployeeStatus] = React.useState<string | null>(null);

  // Additional stats state
  const [taskStats, setTaskStats] = React.useState<TaskStats>({ total: 0, pending: 0, completed: 0, in_progress: 0 });
  const [leaveStats, setLeaveStats] = React.useState<LeaveStats>({ total_leaves: 24, used_leaves: 0, remaining_leaves: 24, pending_requests: 0 });
  const [attendanceStats, setAttendanceStats] = React.useState<AttendanceStats>({ present_days: 0, absent_days: 0, late_days: 0, total_days: 22, attendance_percentage: 0 });
  const [weeklyHoursData, setWeeklyHoursData] = React.useState<number[]>([0, 0, 0, 0, 0, 0]);

  // Helper to get initials from employee name
  const getInitials = (name: string | null) => {
    if (!name || typeof name !== 'string') return '';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '';
    return ((parts[0][0] || '') + (parts[parts.length - 1][0] || '')).toUpperCase();
  };

  // Helper function to convert time string to total hours
  // Handles formats: "8h 30m", "HH:MM:SS", "0h 1m"
  const parseTimeStringToHours = (timeStr: string): number => {
    if (!timeStr || timeStr === '-' || timeStr === '00:00:00') return 0;

    // Format: "Xh Ym" or "Xh Yms" (e.g., "8h 30m", "0h 1m")
    if (timeStr.includes('h') || timeStr.includes('m')) {
      const hourMatch = timeStr.match(/(\d+)h/);
      const minuteMatch = timeStr.match(/(\d+)m/);
      const secondMatch = timeStr.match(/(\d+)s/);
      const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
      const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
      const seconds = secondMatch ? parseInt(secondMatch[1]) : 0;
      return hours + (minutes / 60) + (seconds / 3600);
    }

    // Format: "HH:MM:SS" or "HH:MM"
    if (timeStr.includes(':')) {
      const timeParts = timeStr.split(':');
      const hours = parseInt(timeParts[0]) || 0;
      const minutes = parseInt(timeParts[1]) || 0;
      const seconds = parseInt(timeParts[2]) || 0;
      return hours + (minutes / 60) + (seconds / 3600);
    }

    return 0;
  };

  // Calculate live weekly hours including current session
  const calculateLiveWeeklyHours = React.useCallback((): number => {
    if (!dashboardData) return 0;

    // Backend weekly hours = all completed checked-out attendances for the week (Sun-Sat)
    const baseWeeklyHours = parseTimeStringToHours(dashboardData.total_work_duration_week || "0h 0m");

    console.log('📊 Weekly Hours Calculation:');
    console.log('  - Backend total_work_duration_week:', dashboardData.total_work_duration_week);
    console.log('  - Parsed base weekly hours:', baseWeeklyHours);
    console.log('  - Checked in today?', !!dashboardData.checkin_time);
    console.log('  - Checked out today?', !!dashboardData.checkout_time);
    console.log('  - Today work duration:', dashboardData.today_work_duration);

    // Only add today's hours if currently working (not checked out yet)
    // If checked out, today's hours should already be in total_work_duration_week from backend
    if (dashboardData.checkin_time && !dashboardData.checkout_time && !dashboardData.active_break) {
      // Currently working: use live timer for today
      const currentSessionHours = localTimer / 3600;
      console.log('  - Adding live session hours:', currentSessionHours);
      return baseWeeklyHours + currentSessionHours;
    }

    // If checked out or not checked in: backend total already includes today
    console.log('  - Using backend total only (no live addition)');
    return baseWeeklyHours;
  }, [dashboardData, localTimer]);

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

        // Do not show payment notification on dashboard refresh
      } else {
        showNotification('Dashboard data has unexpected format', 'error');
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ detail?: string }>;

      // Show user-friendly error message
      const errorMessage = axiosError.response?.data?.detail ||
        axiosError.message ||
        'Unknown error occurred';

      showNotification(
        `Failed to load dashboard: ${errorMessage}`,
        'error'
      );
    }
  }, [showNotification]);

  // Fetch additional stats - pass currentDashboardData to use latest data
  const fetchAdditionalStats = React.useCallback(async (currentDashboardData?: DashboardData) => {
    // Use passed data or fall back to state
    const dashData = currentDashboardData || dashboardData;
    try {
      // Fetch task stats
      const tasksRes = await axiosInstance.get('/my-tasks/');
      if (tasksRes.data) {
        const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
        console.log('Task stats fetched:', tasks.length, 'tasks');
        setTaskStats({
          total: tasks.length,
          pending: tasks.filter((t: any) => t.status === 'todo').length,
          completed: tasks.filter((t: any) => t.status === 'done').length,
          in_progress: tasks.filter((t: any) => t.status === 'inprogress').length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch task stats:', error);
    }

    // Fetch leave types to get total leaves available
    let totalLeavesCount = 24; // Default fallback
    console.log('🔄 Starting to fetch leave types...');

    try {
      const leaveTypesRes = await axiosInstance.get('/leaves-list/');
      console.log('✅ Leave types API full response:', leaveTypesRes);
      console.log('📋 Response status:', leaveTypesRes.status);
      console.log('📋 Response data type:', typeof leaveTypesRes.data);
      console.log('📋 Response data:', JSON.stringify(leaveTypesRes.data, null, 2));

      // Check if data is directly an array or nested in results/data property
      let leaveTypesArray: any[] = [];

      if (Array.isArray(leaveTypesRes.data)) {
        leaveTypesArray = leaveTypesRes.data;
      } else if (leaveTypesRes.data?.results && Array.isArray(leaveTypesRes.data.results)) {
        leaveTypesArray = leaveTypesRes.data.results;
      } else if (leaveTypesRes.data?.data && Array.isArray(leaveTypesRes.data.data)) {
        leaveTypesArray = leaveTypesRes.data.data;
      }

      console.log('📋 Leave types array:', leaveTypesArray);
      console.log('📋 Number of leave types:', leaveTypesArray.length);

      if (leaveTypesArray.length > 0) {
        // Sum up all leave counts from different leave types
        totalLeavesCount = leaveTypesArray.reduce((sum: number, leaveType: any) => {
          const count = parseInt(leaveType.count) || 0;
          console.log(`  ➡️ ${leaveType.leave_name || leaveType.name || 'Unknown'}: ${count} days (raw value: ${leaveType.count}, type: ${typeof leaveType.count})`);
          return sum + count;
        }, 0);
        console.log('📊 Total leaves calculated from all leave types:', totalLeavesCount);

        // If sum is still 0, there might be an issue with the data
        if (totalLeavesCount === 0) {
          console.warn('⚠️ Sum is 0. First leave type object:', JSON.stringify(leaveTypesArray[0], null, 2));
        }
      } else {
        console.log('⚠️ No leave types found in response');
      }
    } catch (err: any) {
      console.error('❌ Error fetching leave types:', err);
      console.error('❌ Error message:', err.message);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
    }

    console.log('📊 Final total leaves count:', totalLeavesCount);

    // Now fetch leave requests to calculate used and pending
    let usedLeaves = 0;
    let pendingCount = 0;

    try {
      const leavesRes = await axiosInstance.get('/employee-leave-create/');
      console.log('📋 Leave requests API full response:', leavesRes);
      console.log('📋 Leave requests data:', leavesRes.data);
      console.log('📋 Leave requests data type:', typeof leavesRes.data);

      if (leavesRes.data) {
        const leaves = Array.isArray(leavesRes.data) ? leavesRes.data : [];
        console.log(`📊 Total leave requests found: ${leaves.length}`);

        if (leaves.length > 0) {
          console.log('📋 First leave request sample:', JSON.stringify(leaves[0], null, 2));
        }

        // Calculate used leaves - sum up days from approved leaves
        const approvedLeaves = leaves.filter((l: any) => l.status === 'Approved' || l.status === 'approved');
        console.log(`✅ Approved leaves count: ${approvedLeaves.length}`);
        console.log('✅ Approved leaves:', approvedLeaves);

        usedLeaves = approvedLeaves.reduce((sum: number, leave: any) => {
          // Calculate number of days between from_date and to_date
          if (leave.from_date && leave.to_date) {
            const fromDate = new Date(leave.from_date);
            const toDate = new Date(leave.to_date);
            const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
            console.log(`  ➡️ Leave from ${leave.from_date} to ${leave.to_date}: ${diffDays} days`);
            return sum + diffDays;
          }
          console.log(`  ⚠️ Leave missing dates, counting as 1 day`);
          return sum + 1; // Default to 1 day if dates not available
        }, 0);

        pendingCount = leaves.filter((l: any) => l.status === 'Pending' || l.status === 'pending').length;
      }
    } catch (error) {
      console.error('❌ Error fetching leave requests:', error);
    }

    // Always update leave stats with the total leaves count (even if leave requests fail)
    const remainingLeaves = Math.max(0, totalLeavesCount - usedLeaves);

    setLeaveStats({
      total_leaves: totalLeavesCount,
      used_leaves: usedLeaves,
      remaining_leaves: remainingLeaves,
      pending_requests: pendingCount,
    });

    console.log('✅ Leave stats updated and set in state:', {
      total: totalLeavesCount,
      used: usedLeaves,
      remaining: remainingLeaves,
      pending: pendingCount,
      percentage: totalLeavesCount > 0 ? ((remainingLeaves / totalLeavesCount) * 100).toFixed(1) + '%' : '0%'
    });

    try {
      // Fetch attendance stats from attendance-history API
      const today = new Date();
      console.log('Fetching attendance history for:', today.getMonth() + 1, today.getFullYear());

      const attendanceRes = await axiosInstance.get('/attendance-history/', {
        params: {
          month: today.getMonth() + 1,
          year: today.getFullYear()
        }
      });

      console.log('Attendance History Response:', attendanceRes.data);
      console.log('Full API Response Structure:', JSON.stringify(attendanceRes.data, null, 2));

      if (attendanceRes.data && attendanceRes.data.summary) {
        const summary = attendanceRes.data.summary;
        console.log('Summary data:', summary);
        console.log('Summary keys:', Object.keys(summary));
        console.log('Late value from API:', summary.late);
        console.log('Late value type:', typeof summary.late);

        const present = summary.present || 0;
        const absent = summary.absent || 0;
        const late = summary.late || 0;
        const leaves = summary.leave || 0;
        const total = summary.working_days || 22;

        console.log('Parsed Attendance Stats:', { present, absent, late, leaves, total });
        console.log('Late count being set:', late);

        setAttendanceStats({
          present_days: present,
          absent_days: absent,
          late_days: late,
          total_days: total,
          attendance_percentage: total > 0 ? ((present + leaves) / total) * 100 : 0,
        });
      } else {
        console.warn('No summary data in attendance response');
      }

      // Fetch weekly hours for chart
      if (attendanceRes.data && attendanceRes.data.monthly_data) {
        const records = attendanceRes.data.monthly_data;

        console.log('Attendance API Response:', attendanceRes.data);
        console.log('Monthly data records:', records);

        // Get current week start (Monday) - handle Sunday correctly
        const now = new Date();
        const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday, go back 6 days to get Monday
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysFromMonday);
        weekStart.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

        console.log('Week start date:', weekStart);
        console.log('Current day:', currentDay);

        const weeklyData = [0, 0, 0, 0, 0, 0]; // Mon-Sat

        records.forEach((record: any) => {
          const recordDate = new Date(record.date);
          recordDate.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

          console.log(`Processing record: ${record.date} (${record.day_name}), total_hours:`, record.total_hours, 'type:', typeof record.total_hours);

          // Check if record is within current week (Monday to Saturday)
          if (recordDate >= weekStart) {
            const recordDay = recordDate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

            // Map day to array index: Monday=0, Tuesday=1, ..., Saturday=5
            let dayIndex = -1;
            if (recordDay === 0) {
              // Skip Sunday records
              console.log(`Skipping Sunday: ${record.date}`);
              return;
            } else {
              dayIndex = recordDay - 1; // Monday=0, Saturday=5
            }

            if (dayIndex >= 0 && dayIndex < 6) {
              // Check for total_hours field - handle both number and string
              let hours = 0;
              if (typeof record.total_hours === 'number' && record.total_hours > 0) {
                hours = record.total_hours;
                console.log(`✅ Setting ${hours} hours for index ${dayIndex} (${record.day_name})`);
              } else if (typeof record.total_hours === 'string' && record.total_hours !== '-') {
                const parsed = parseFloat(record.total_hours);
                if (!isNaN(parsed) && parsed > 0) {
                  hours = parsed;
                  console.log(`✅ Setting ${hours} hours (parsed from string) for index ${dayIndex} (${record.day_name})`);
                } else {
                  console.log(`⚠️ Skipping invalid hours for ${record.day_name}: "${record.total_hours}"`);
                }
              } else {
                console.log(`⚠️ Skipping zero/invalid hours for ${record.day_name}: ${record.total_hours}`);
              }

              // Only store if hours > 0
              if (hours > 0) {
                weeklyData[dayIndex] = hours;
              }
            }
          } else {
            console.log(`Record ${record.date} is before week start ${weekStart.toISOString().split('T')[0]}`);
          }
        });

        console.log('📊 Final weekly data from backend:', weeklyData);
        console.log('📅 Weekly hours by day:', {
          Monday: weeklyData[0],
          Tuesday: weeklyData[1],
          Wednesday: weeklyData[2],
          Thursday: weeklyData[3],
          Friday: weeklyData[4],
          Saturday: weeklyData[5]
        });

        // CRITICAL FIX: Backend returns "-" for today, so use dashData.effective_time instead
        // This must happen BEFORE setWeeklyHoursData to ensure chart shows correct data
        // Use effective_time (actual worked time after breaks) for accuracy
        const todayDate = new Date();
        const todayDayOfWeek = todayDate.getDay();
        const workTimeToUse = dashData?.effective_time || dashData?.total_worked || dashData?.today_work_duration;
        console.log('🔧 ATTEMPTING TO FIX TODAY\'S HOURS IN fetchAdditionalStats');
        console.log('  - Today day of week:', todayDayOfWeek);
        console.log('  - dashData exists:', !!dashData);
        console.log('  - effective_time:', dashData?.effective_time);
        console.log('  - total_worked:', dashData?.total_worked);
        console.log('  - today_work_duration:', dashData?.today_work_duration);
        console.log('  - workTimeToUse selected:', workTimeToUse);

        if (todayDayOfWeek > 0 && todayDayOfWeek < 7) {
          const currentDayIndex = todayDayOfWeek - 1;
          let totalHours = 0;

          // Try formatted time field first
          if (workTimeToUse && workTimeToUse !== '-' && workTimeToUse !== '00:00:00') {
            console.log(`  - About to parse: "${workTimeToUse}"`);
            totalHours = parseTimeStringToHours(workTimeToUse);
            console.log(`  - Parsed time field result: ${totalHours} hours (${totalHours.toFixed(4)} precise)`);
          } else {
            console.log(`  - Skipping parsing, workTimeToUse check failed:`, {
              exists: !!workTimeToUse,
              value: workTimeToUse,
              isDash: workTimeToUse === '-',
              isZero: workTimeToUse === '00:00:00'
            });
          }

          // FALLBACK: Calculate from checkin/checkout timestamps if time field not ready
          if (totalHours === 0 && dashData?.checkin_time && dashData?.checkout_time) {
            console.log('  - Calculating from timestamps as fallback...');
            try {
              const checkinTime = new Date(dashData.checkin_time).getTime();
              const checkoutTime = new Date(dashData.checkout_time).getTime();

              if (!isNaN(checkinTime) && !isNaN(checkoutTime)) {
                const diffSeconds = (checkoutTime - checkinTime) / 1000;
                totalHours = diffSeconds / 3600;
                console.log(`  - Calculated ${totalHours.toFixed(2)} hours from timestamps`);
              }
            } catch (error) {
              console.log('  - Error calculating from timestamps:', error);
            }
          }

          if (totalHours > 0) {
            console.log(`🔧 FIXING TODAY'S HOURS: Setting ${totalHours.toFixed(2)} hours for today`);
            weeklyData[currentDayIndex] = parseFloat(totalHours.toFixed(2));
          }
        }

        console.log('📊 Final weekly data (after fixing today):', weeklyData);
        setWeeklyHoursData(weeklyData);
      } else {
        console.warn('No monthly_data in attendance response');
      }
    } catch (error: any) {
      console.error('Failed to fetch attendance stats:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set default values on error
      setAttendanceStats({
        present_days: 0,
        absent_days: 0,
        late_days: 0,
        total_days: 22,
        attendance_percentage: 0,
      });
      setWeeklyHoursData([0, 0, 0, 0, 0, 0]);
    }
  }, []);

  React.useEffect(() => {
    // Load initial data - fetch dashboard first, then pass to stats
    (async () => {
      try {
        const response = await axiosInstance.get("dashboard/");
        if (response.status === 200 && response.data.dashboard_data) {
          const dashData = response.data.dashboard_data;
          setDashboardData(dashData);

          // Now fetch additional stats with the dashboard data
          await fetchAdditionalStats(dashData);
        }
      } catch (error) {
        console.error('Failed to load initial dashboard data:', error);
        // Still try to fetch stats without dashboard data
        await fetchAdditionalStats();
      }
    })();

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
  }, [fetchAdditionalStats]);

  // Update today's hours in weekly data when dashboard data changes
  // This is critical because backend attendance API returns "-" for today until data is fully processed
  React.useEffect(() => {
    console.log('🔍 Dashboard data changed, checking if we need to update today\'s hours...');
    console.log('  - dashboardData exists:', !!dashboardData);
    console.log('  - Full dashboardData:', dashboardData);
    console.log('  - checkout_time:', dashboardData?.checkout_time);
    console.log('  - effective_time:', dashboardData?.effective_time);
    console.log('  - total_worked:', dashboardData?.total_worked);
    console.log('  - checkin_time:', dashboardData?.checkin_time);
    console.log('  - today_work_duration:', dashboardData?.today_work_duration);

    // Always use dashboardData.effective_time (or total_worked as fallback) for today if available
    // The attendance-history API often returns "-" for today, especially right after checkout
    // Use effective_time as it's the actual worked time after breaks are deducted
    // Also try today_work_duration which might have the actual worked hours
    const workTimeToUse = dashboardData?.effective_time || dashboardData?.total_worked || dashboardData?.today_work_duration;
    console.log('  - workTimeToUse selected:', workTimeToUse);

    const now = new Date();
    const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    console.log('  - Current day of week:', currentDay, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][currentDay]);

    if (dashboardData && currentDay > 0 && currentDay < 7) { // Monday to Saturday only
      const currentDayIndex = currentDay - 1; // Monday=0, Saturday=5
      let totalHours = 0;

      // Try to get hours from formatted time fields first
      if (workTimeToUse && workTimeToUse !== '-' && workTimeToUse !== '00:00:00') {
        console.log('  - Parsing work time:', workTimeToUse);
        totalHours = parseTimeStringToHours(workTimeToUse);
        console.log(`  - Calculated hours from time string: ${totalHours.toFixed(2)} total hours`);
      }

      // FALLBACK: If backend hasn't processed yet, calculate from checkin/checkout times
      if (totalHours === 0 && dashboardData.checkin_time && dashboardData.checkout_time) {
        console.log('  - Time fields not available, calculating from checkin/checkout times...');
        try {
          const checkinTime = new Date(dashboardData.checkin_time).getTime();
          const checkoutTime = new Date(dashboardData.checkout_time).getTime();

          if (!isNaN(checkinTime) && !isNaN(checkoutTime)) {
            const diffSeconds = (checkoutTime - checkinTime) / 1000;
            totalHours = diffSeconds / 3600;
            console.log(`  - Calculated from timestamps: checkin=${dashboardData.checkin_time}, checkout=${dashboardData.checkout_time}`);
            console.log(`  - Difference: ${diffSeconds} seconds = ${totalHours.toFixed(2)} hours`);
          }
        } catch (error) {
          console.log('  - Error calculating from timestamps:', error);
        }
      }

      if (totalHours > 0) {
        console.log(`✅ Updating today's weekly hours (index ${currentDayIndex}) with: ${totalHours.toFixed(2)} hours`);
        setWeeklyHoursData(prev => {
          console.log('  - Previous weekly data:', prev);
          const updated = [...prev];
          updated[currentDayIndex] = parseFloat(totalHours.toFixed(2));
          console.log('  - Updated weekly data:', updated);
          return updated;
        });
      } else {
        console.log('⚠️ Total hours is 0, not updating');
      }
    } else {
      console.log('⚠️ Dashboard data not available or today is Sunday');
    }
  }, [dashboardData]);


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
      // Check if already checked out for the day
      if (dashboardData?.checkin_time && dashboardData?.checkout_time) {
        showNotification("You have already checked out for today. Attendance for the day is complete.", "info");
        setLoading(false);
        return;
      }

      const endpoint = dashboardData?.checkin_time && !dashboardData?.checkout_time ? "checkout/" : "checkin/";
      const isCheckout = endpoint === "checkout/";
      const res = await axiosInstance.post(endpoint);
      if (res.status === 200) {
        const dashResponse = await fetchDashboardData();

        if (isCheckout) {
          // Add delay to ensure backend has fully processed the checkout and updated attendance records
          console.log('Checkout detected - waiting for backend to process...');
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Fetch dashboard data again to get updated values
          console.log('Final dashboard refresh to capture today\'s hours...');
          const response = await axiosInstance.get("dashboard/");
          if (response.status === 200 && response.data.dashboard_data) {
            const latestDashboardData = response.data.dashboard_data;
            setDashboardData(latestDashboardData);

            // Refresh attendance stats with the latest dashboard data
            console.log('Refreshing attendance stats after checkout with latest data...');
            await fetchAdditionalStats(latestDashboardData);
          } else if (dashboardData) {
            // Use existing dashboard data if refresh failed
            await fetchAdditionalStats(dashboardData);
          }
        }
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
      console.log("response of brak confif ", res)
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


  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const employeeId = localStorage.getItem("employee_id");
      if (!employeeId) return;

      const res = await axiosInstances.get("/employeestatus/");
      const employeeStatus = res.data.find(
        (item: any) => item.id.toString() === employeeId
      );

      if (!employeeStatus) {
        console.warn("Employee status not found for employee ID:", employeeId);
        return;
      }

      await axiosInstances.patch(
        `/employeestatus/${employeeStatus.id}/`,
        { status: newStatus }
      );

      setEmployeeStatus(newStatus); // ✅ Update local state immediately
      showNotification(`Status updated to ${newStatus}`, "success");
    } catch (error) {
      console.error("❌ Failed to update employee status:", error);
      showNotification("Failed to update employee status", "error");
    }
  };

  const isCheckedIn = dashboardData?.checkin_time && !dashboardData?.checkout_time;
  const hasActiveBreak = dashboardData?.active_break;

  // Calculate live weekly hours for display
  const liveWeeklyHours = calculateLiveWeeklyHours();
  const weeklyTargetHours = 48;
  const weeklyProgress = Math.min((liveWeeklyHours / weeklyTargetHours) * 100, 100);

  // Format weekly hours for display
  const formatWeeklyHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <>
      {/* Birthday wishes cards */}
      {birthdayCards.length > 0 && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-3 items-center">
          {birthdayCards.map((card, idx) => (
            <div
              key={card.id}
              className={`bg-gradient-to-r from-yellow-100 via-pink-100 to-purple-100 dark:from-yellow-900/90 dark:via-pink-900/90 dark:to-purple-900/90 border-2 border-yellow-400 dark:border-yellow-600 rounded-2xl shadow-2xl px-8 py-4 flex items-center gap-4 animate-fade-in-up animate-bounce-subtle hover-glow stagger-${idx + 1}`}
            >
              <span className="text-3xl animate-float">🎂</span>
              <div>
                <div className="font-bold text-lg text-yellow-800 dark:text-yellow-200">{card.title}</div>
                <div className="text-yellow-700 dark:text-yellow-300 text-sm font-medium">{card.description}</div>
              </div>
              <span className="text-3xl animate-bounce-subtle">🎉</span>
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
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full flex justify-center animate-fade-in-up">
          <div className="hover-lift">
            <Alert
              variant={notification.type}
              title={notification.type === 'success' ? 'Success' : notification.type === 'error' ? 'Error' : 'Information'}
              message={notification.message}
              showLink={false}
            />
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
        <div className="max-w-7xl mx-auto p-6">

          {/* Header Section with Birthday Theme */}
          <div
            className={
              `rounded-2xl shadow-2xl border mb-6 overflow-hidden animate-fade-in-up hover-lift ` +
              (dashboardData?.birthday_message
                ? 'bg-gradient-to-r from-pink-400 via-yellow-300 to-blue-400 border-yellow-400 animate-gradient'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700')
            }
          >
            <div className="p-6 relative">
              {/* Animated Background Pattern */}
              {!dashboardData?.birthday_message && (
                <div className="absolute inset-0 opacity-5 dark:opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                    backgroundSize: '40px 40px'
                  }}></div>
                </div>
              )}
              <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Employee Info */}
                <div className="flex items-center gap-4 animate-slide-in-left">
                  <div className="relative group">
                    {dashboardData?.employee_photo ? (
                      <img
                        src={dashboardData.employee_photo}
                        alt="Employee Photo"
                        className="rounded-full w-16 h-16 object-cover border-4 border-blue-500 dark:border-blue-400 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl"
                      />
                    ) : (
                      <div className="rounded-full w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-semibold border-4 border-blue-400 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl">
                        {getInitials(dashboardData?.employee_name ?? null)}
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white dark:border-gray-800 shadow-md ${isCheckedIn ? 'bg-green-500 animate-pulse-glow' : 'bg-gray-400'
                      }`}></div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Welcome, {dashboardData?.employee_name || 'Employee'}
                      {dashboardData?.birthday_message && (
                        <span className="ml-2 text-3xl animate-bounce-subtle" role="img" aria-label="birthday">🎂</span>
                      )}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <FaClock className="text-sm" />
                      {getCurrentDate()}
                    </p>
                    {dashboardData?.birthday_message && (
                      <div className="mt-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 dark:from-pink-900/80 dark:via-purple-900/80 dark:to-blue-900/80 text-pink-700 dark:text-pink-200 font-bold text-lg shadow-2xl animate-gradient border-2 border-pink-300 dark:border-pink-600 flex items-center justify-center gap-3 hover-glow">
                        <span role="img" aria-label="party" className="text-2xl animate-bounce-subtle">🎉</span>
                        <span className="animate-scale-in">{dashboardData.birthday_message}</span>
                        <span role="img" aria-label="party" className="text-2xl animate-bounce-subtle" style={{ animationDelay: '0.2s' }}>🎉</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status & Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-slide-in-right">
                  <div className="text-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 px-6 py-4 rounded-2xl border-2 border-blue-200 dark:border-blue-700 shadow-lg hover-glow">
                    <div className={
                      dashboardData?.birthday_message
                        ? 'text-2xl font-mono font-bold text-yellow-700 drop-shadow-lg tracking-wider'
                        : 'text-2xl font-mono font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-wider'
                    }>
                      {hasActiveBreak ? formatTime(breakTimer) : formatTime(localTimer)}
                    </div>
                    <div className={
                      dashboardData?.birthday_message
                        ? 'text-sm text-yellow-800 mt-1 font-medium'
                        : 'text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium flex items-center justify-center gap-2'
                    }>
                      {isCheckedIn && !hasActiveBreak && (
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      )}
                      {isCheckedIn ? (hasActiveBreak ?
                        `On Break${dashboardData?.active_break?.duration_minutes ? ` (${dashboardData.active_break.duration_minutes} min)` : ''}` :
                        'Working Time') : 'Ready to Start'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className="p-3 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-all duration-300 hover:scale-110 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl"
                      onClick={() => fetchDashboardData()}
                      title="Refresh"
                    >
                      <FaSyncAlt size={18} className="hover:rotate-180 transition-transform duration-500" />
                    </button>
                    <Button
                      className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 ${isCheckedIn
                        ? '!bg-gradient-to-r !from-red-600 !to-red-700 hover:!from-red-700 hover:!to-red-800 !text-white'
                        : '!bg-gradient-to-r !from-green-600 !to-green-700 hover:!from-green-700 hover:!to-green-800 !text-white'
                        } ${loading ? 'opacity-70 cursor-not-allowed animate-pulse' : ''}`}
                      onClick={handleCheckinClick}
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <FaSyncAlt className="animate-spin" />
                          Processing...
                        </span>
                      ) : (isCheckedIn ? 'Check Out' : 'Check In')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Break Controls */}
              {isCheckedIn && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 animate-fade-in-up stagger-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      {hasActiveBreak ? (
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="flex items-center px-5 py-3 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 text-orange-800 dark:text-orange-200 rounded-xl text-sm font-semibold border-2 border-orange-300 dark:border-orange-700 shadow-lg animate-pulse-glow">
                            <FaPause className="mr-2 animate-bounce-subtle" />
                            {dashboardData?.active_break?.type} Break - {formatTime(breakTimer)}
                          </span>
                          <button
                            className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl text-sm font-semibold hover:from-orange-700 hover:to-orange-800 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleBreakAction('end', dashboardData?.active_break?.break_config_id?.toString())}
                            disabled={breakLoading}
                          >
                            {breakLoading ? (
                              <span className="flex items-center gap-2">
                                <FaSyncAlt className="animate-spin" />
                                Ending...
                              </span>
                            ) : 'End Break'}
                          </button>
                        </div>
                      ) : (
                        <div className="w-full">
                          <BreakIcons
                            onBreakClick={handleBreakAction}
                            onStatusChange={handleStatusUpdate}
                            disabled={breakLoading || !!dashboardData?.active_break}
                            activeBreak={
                              dashboardData?.active_break?.break_choice === 'meal_break' ? 'meal' :
                                dashboardData?.active_break?.break_choice === 'short_break' ? 'short' :
                                  null
                            }
                            currentStatus={employeeStatus}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-fade-in-up stagger-2">
            <Link to="/employee/my-tasks" className="block hover:no-underline">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-2xl p-6 shadow-xl hover-lift cursor-pointer group">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <FaTasks className="text-white text-2xl" />
                  </div>
                  <FaArrowRight className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">My Tasks</h3>
                <p className="text-white/80 text-sm">{taskStats.pending} pending</p>
              </div>
            </Link>

            <Link to="/employee/leave-application" className="block hover:no-underline">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-2xl p-6 shadow-xl hover-lift cursor-pointer group">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <FaUmbrellaBeach className="text-white text-2xl" />
                  </div>
                  <FaArrowRight className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Apply Leave</h3>
                <p className="text-white/80 text-sm">{leaveStats.remaining_leaves} days left</p>
              </div>
            </Link>

            <Link to="/employee/attendance-history" className="block hover:no-underline">
              <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-2xl p-6 shadow-xl hover-lift cursor-pointer group">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <FaChartPie className="text-white text-2xl" />
                  </div>
                  <FaArrowRight className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Attendance</h3>
                <p className="text-white/80 text-sm">{attendanceStats.attendance_percentage.toFixed(0)}% this month</p>
              </div>
            </Link>

            <Link to="/employee/personal-calendar" className="block hover:no-underline">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-2xl p-6 shadow-xl hover-lift cursor-pointer group">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <FaCalendarAlt className="text-white text-2xl" />
                  </div>
                  <FaArrowRight className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Calendar</h3>
                <p className="text-white/80 text-sm">View holidays</p>
              </div>
            </Link>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Left Column - Today's Status & Performance */}
            <div className="space-y-4 animate-fade-in-up stagger-2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover-lift">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-blue-600 dark:bg-blue-500 rounded-xl shadow-lg">
                      <FaCalendarAlt className="text-white text-lg" />
                    </div>
                    Today's Status
                  </h2>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Shift Information */}
                    <div className="animate-fade-in-up stagger-3">
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-700 hover-glow">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <div className="p-2 bg-indigo-600 dark:bg-indigo-500 rounded-lg shadow-md">
                            <FaUser className="text-white text-sm" />
                          </div>
                          Shift Information
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between py-3 px-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-all duration-300">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Shift Name:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {dashboardData?.shift_name || 'Not assigned'}
                            </span>
                          </div>
                          <div className="flex justify-between py-3 px-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-all duration-300">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Timing:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {dashboardData?.shift_timing || '--:--'}
                            </span>
                          </div>
                          <div className="flex justify-between py-3 px-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-all duration-300">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Check-in:</span>
                            <span className="font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                              {dashboardData?.checkin_time ? (
                                <>
                                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                  {dashboardData.checkin_time}
                                </>
                              ) : '--:--'}
                            </span>
                          </div>
                          <div className="flex justify-between py-3 px-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-all duration-300">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Check-out:</span>
                            <span className="font-bold text-red-600 dark:text-red-400">
                              {dashboardData?.checkout_time || '--:--'}
                            </span>
                          </div>
                          {dashboardData?.is_late && (
                            <div className="px-4 py-2 bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 text-red-800 dark:text-red-200 text-sm rounded-lg font-semibold shadow-md animate-bounce-subtle">
                              ⚠️ Late arrival detected
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Time Tracking */}
                    <div className="animate-fade-in-up stagger-4">
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-700 hover-glow">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <div className="p-2 bg-blue-600 dark:bg-blue-500 rounded-lg shadow-md">
                            <FaClock className="text-white text-sm" />
                          </div>
                          Time Tracking
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between py-3 px-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-all duration-300">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Total Worked:</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {dashboardData?.total_worked || '0h 0m'}
                            </span>
                          </div>
                          <div className="flex justify-between py-3 px-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-all duration-300">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Effective Time:</span>
                            <span className="font-bold text-green-600 dark:text-green-400">
                              {dashboardData?.effective_time || '0h 0m'}
                            </span>
                          </div>
                          <div className="flex justify-between py-3 px-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-all duration-300">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Break Time:</span>
                            <span className="font-bold text-orange-600 dark:text-orange-400">
                              {dashboardData?.total_break_minutes || 0} minutes
                            </span>
                          </div>
                          <div className="flex justify-between py-3 px-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-all duration-300">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Overtime:</span>
                            <span className="font-bold text-purple-600 dark:text-purple-400">
                              {dashboardData?.overtime ? `${dashboardData.overtime.total}h` : '0h'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Card - Moved to left column */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover-lift animate-fade-in-up stagger-3">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-green-600 dark:bg-green-500 rounded-xl shadow-lg animate-bounce-subtle">
                      <FaChartLine className="text-white text-lg" />
                    </div>
                    Performance
                  </h2>
                </div>

                <div className="p-4 space-y-4">
                  {/* Weekly Performance Chart */}
                  <WeeklyPerformanceChart
                    weeklyHoursData={weeklyHoursData}
                    liveWeeklyHours={liveWeeklyHours}
                    isCheckedIn={!!isCheckedIn}
                    hasActiveBreak={!!hasActiveBreak}
                    localTimer={localTimer}
                  />

                  {/* Weekly Hours Progress */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
                    <div className="flex justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Weekly Hours</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">
                        {formatWeeklyHours(liveWeeklyHours)} / 48 hrs
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                        style={{ width: `${weeklyProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Progress Percentage */}
                  <div className="text-center py-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border-2 border-green-200 dark:border-green-700 shadow-lg hover-glow">
                    <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2 animate-scale-in">
                      {weeklyProgress.toFixed(1)}%
                    </div>
                    <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
                      of Weekly Target
                    </div>
                    {isCheckedIn && !hasActiveBreak && (
                      <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                        <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                          <span className="inline-block w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></span>
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Live updating</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Tasks & Leave */}
            <div className="space-y-4">

              {/* Task Summary Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover-lift animate-fade-in-up stagger-3">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-blue-600 dark:bg-blue-500 rounded-xl shadow-lg">
                      <FaTasks className="text-white text-lg" />
                    </div>
                    Task Overview
                  </h2>
                </div>

                <div className="p-4 space-y-3">
                  {/* Task Pie Chart */}
                  <TaskCompletionChart taskStats={taskStats} />

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{taskStats.total}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Tasks</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 p-4 rounded-xl border border-yellow-200 dark:border-yellow-700">
                      <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">{taskStats.pending}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Pending</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 p-4 rounded-xl border border-orange-200 dark:border-orange-700">
                      <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">{taskStats.in_progress}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">In Progress</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 p-4 rounded-xl border border-green-200 dark:border-green-700">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{taskStats.completed}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Completed</div>
                    </div>
                  </div>
                  <Link to="/employee/my-tasks" className="block mt-4">
                    <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2">
                      View All Tasks
                      <FaArrowRight />
                    </button>
                  </Link>
                </div>
              </div>

              {/* Leave Balance Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover-lift animate-fade-in-up stagger-4">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-purple-600 dark:bg-purple-500 rounded-xl shadow-lg">
                      <FaUmbrellaBeach className="text-white text-lg" />
                    </div>
                    Leave Balance
                  </h2>
                </div>

                <div className="p-4">
                  <div className="text-center mb-4">
                    <div className="relative inline-block w-36 h-36">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 144 144">
                        <circle
                          cx="72"
                          cy="72"
                          r="60"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="72"
                          cy="72"
                          r="60"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 60}`}
                          strokeDashoffset={`${2 * Math.PI * 60 * (1 - (leaveStats.total_leaves > 0 ? leaveStats.remaining_leaves / leaveStats.total_leaves : 0))}`}
                          className="text-purple-600 dark:text-purple-400 transition-all duration-1000"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">{leaveStats.remaining_leaves}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Days Left</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Total Leaves:</span>
                      <span className="font-bold text-gray-900 dark:text-white">{leaveStats.total_leaves} days</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Used:</span>
                      <span className="font-bold text-red-600 dark:text-red-400">{leaveStats.used_leaves} days</span>
                    </div>
                    {leaveStats.pending_requests > 0 && (
                      <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Pending:</span>
                        <span className="font-bold text-yellow-600 dark:text-yellow-400">{leaveStats.pending_requests} requests</span>
                      </div>
                    )}
                  </div>
                  <Link to="/employee/leave-application" className="block mt-4">
                    <button className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2">
                      Apply for Leave
                      <FaArrowRight />
                    </button>
                  </Link>
                </div>
              </div>

              {/* Performance Card */}
              {/* <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FaChartLine className="text-green-600 dark:text-green-400" />
                    Performance
                  </h2>
                </div>
                
                <div className="p-6 space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Weekly Hours</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {weeklyHours.toFixed(1)}/48 hrs
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{width: `${Math.min((weeklyHours / 40) * 100, 100)}%`}}
                      ></div>
                    </div>
                  </div>
                  
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
              </div> */}


              {/* Payroll Card */}
              {dashboardData?.latest_payroll && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover-lift animate-fade-in-up stagger-4">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                      <div className="p-2 bg-green-600 dark:bg-green-500 rounded-xl shadow-lg animate-float">
                        <FaMoneyBillWave className="text-white text-lg" />
                      </div>
                      Latest Payroll
                    </h2>
                  </div>

                  <div className="p-4">
                    <div className="text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl py-5 border-2 border-green-200 dark:border-green-700 hover-glow">
                      <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3 animate-scale-in">
                        ₹{dashboardData.latest_payroll.amount.toLocaleString()}
                      </div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 inline-block px-4 py-2 rounded-full shadow-sm">
                        Processed on {dashboardData.latest_payroll.date}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attendance Stats & Quick Links */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">

            {/* Attendance Visualization */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover-lift animate-fade-in-up stagger-5">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-green-600 dark:bg-green-500 rounded-xl shadow-lg">
                    <FaChartPie className="text-white text-lg" />
                  </div>
                  Attendance Stats
                </h2>
              </div>

              <div className="p-4">
                {/* Attendance Donut Chart */}
                <AttendanceDonutChart attendanceStats={attendanceStats} />

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl border border-green-200 dark:border-green-700 hover:shadow-lg transition-shadow">
                    <FaCheckCircle className="text-green-600 dark:text-green-400 text-2xl mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{attendanceStats.present_days.toFixed(1)}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Present</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-xl border border-yellow-200 dark:border-yellow-700 hover:shadow-lg transition-shadow">
                    <FaClock className="text-yellow-600 dark:text-yellow-400 text-2xl mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{attendanceStats.late_days}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Late Arrivals</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-xl border border-red-200 dark:border-red-700 hover:shadow-lg transition-shadow">
                    <FaExclamationCircle className="text-red-600 dark:text-red-400 text-2xl mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{attendanceStats.absent_days.toFixed(1)}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Absent</div>
                  </div>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-1000"
                    style={{ width: `${attendanceStats.attendance_percentage}%` }}
                  ></div>
                </div>

                <Link to="/employee/attendance-history" className="block mt-4">
                  <button className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2">
                    View Details
                    <FaArrowRight />
                  </button>
                </Link>
              </div>
            </div>

            {/* Quick Links Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover-lift animate-fade-in-up stagger-6">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 dark:bg-indigo-500 rounded-xl shadow-lg">
                    <FaFileAlt className="text-white text-lg" />
                  </div>
                  Quick Access
                </h2>
              </div>

              <div className="p-4 space-y-3">
                <Link to="/employee/learning-corner" className="flex items-center gap-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl hover:shadow-lg transition-all duration-300 border border-blue-200 dark:border-blue-700 group">
                  <div className="p-3 bg-blue-600 dark:bg-blue-500 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <FaGraduationCap className="text-white text-xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Learning Corner</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Training resources</p>
                  </div>
                  <FaArrowRight className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </Link>

                <Link to="/employee/company-policy" className="flex items-center gap-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl hover:shadow-lg transition-all duration-300 border border-purple-200 dark:border-purple-700 group">
                  <div className="p-3 bg-purple-600 dark:bg-purple-500 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <FaBuilding className="text-white text-xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Company Policies</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Guidelines & rules</p>
                  </div>
                  <FaArrowRight className="text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                </Link>

                <Link to="/employee/reportees" className="flex items-center gap-4 p-3 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl hover:shadow-lg transition-all duration-300 border border-green-200 dark:border-green-700 group">
                  <div className="p-3 bg-green-600 dark:bg-green-500 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <FaUsers className="text-white text-xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Team Members</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">View reportees</p>
                  </div>
                  <FaArrowRight className="text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
                </Link>

                <Link to="/employee/notifications" className="flex items-center gap-4 p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl hover:shadow-lg transition-all duration-300 border border-orange-200 dark:border-orange-700 group">
                  <div className="p-3 bg-orange-600 dark:bg-orange-500 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <FaBell className="text-white text-xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">View all updates</p>
                  </div>
                  <FaArrowRight className="text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" />
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-4 animate-fade-in-up stagger-7">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover-lift">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-orange-600 dark:bg-orange-500 rounded-xl shadow-lg animate-bounce-subtle">
                    <FaCoffee className="text-white text-lg" />
                  </div>
                  Recent Break Activity
                </h2>
              </div>

              <div className="p-4">
                {dashboardData?.recent_breaks && dashboardData.recent_breaks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dashboardData.recent_breaks.slice(0, 6).map((breakItem: BreakData, index: number) => (
                      <div
                        key={index}
                        className={`p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200 dark:border-orange-700 hover:shadow-lg transition-all duration-300 transform hover:scale-105 hover-glow animate-fade-in-up stagger-${index + 1}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-600 dark:bg-orange-500 rounded-lg shadow-md">
                            <FaCoffee className="text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white capitalize mb-1">
                              {breakItem.type} Break
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <FaClock className="text-xs" />
                              {breakItem.start_time} - {breakItem.end_time}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl">
                    <div className="animate-float">
                      <FaCoffee className="mx-auto text-gray-400 dark:text-gray-600 text-5xl mb-4" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">No recent break activity</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Your break history will appear here</p>
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

// Chart Components
const TaskCompletionChart: React.FC<{ taskStats: TaskStats }> = ({ taskStats }) => {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const options: ApexOptions = {
    chart: {
      type: 'donut',
      background: 'transparent',
    },
    labels: ['Completed', 'In Progress', 'Pending'],
    colors: ['#10b981', '#f59e0b', '#ef4444'],
    legend: {
      position: 'bottom',
      labels: {
        colors: isDark ? '#9ca3af' : '#374151',
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => Math.round(val) + '%',
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontSize: '14px',
              color: isDark ? '#9ca3af' : '#374151',
              formatter: () => taskStats.total.toString(),
            },
          },
        },
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: {
        formatter: (val: number) => val + ' tasks',
      },
    },
  };

  const series = [taskStats.completed, taskStats.in_progress, taskStats.pending];

  return (
    <div className="mb-3">
      <ReactApexChart
        key={`task-chart-${taskStats.total}-${taskStats.completed}-${taskStats.in_progress}-${taskStats.pending}`}
        options={options}
        series={series}
        type="donut"
        height={200}
      />
    </div>
  );
};

const WeeklyPerformanceChart: React.FC<{
  weeklyHoursData: number[];
  liveWeeklyHours: number;
  isCheckedIn: boolean;
  hasActiveBreak: boolean;
  localTimer: number;
}> = ({ weeklyHoursData, liveWeeklyHours, isCheckedIn, hasActiveBreak, localTimer }) => {
  const [isDark, setIsDark] = React.useState(false);
  const [chartData, setChartData] = React.useState<number[]>([...weeklyHoursData]);

  React.useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Update chart data when dependencies change using useEffect with state
  React.useEffect(() => {
    console.log('📊 Updating chart data...');
    console.log('  - weeklyHoursData:', weeklyHoursData);
    console.log('  - liveWeeklyHours:', liveWeeklyHours);
    console.log('  - isCheckedIn:', isCheckedIn);
    console.log('  - hasActiveBreak:', hasActiveBreak);
    console.log('  - localTimer (seconds):', localTimer);

    // Get current day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const now = new Date();
    const currentDay = now.getDay();

    console.log('  - Current day:', currentDay, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][currentDay]);

    // Map to our array index (0=Monday, 5=Saturday)
    let currentDayIndex = -1;
    if (currentDay === 0) {
      // Sunday - no work day, use original data
      console.log('  - Sunday detected, using original data');
      setChartData([...weeklyHoursData]);
      return;
    } else {
      currentDayIndex = currentDay - 1; // Monday=0, Saturday=5
      console.log('  - Current day index:', currentDayIndex);
    }

    // Clone the weekly data (this already has backend data after checkout)
    const liveData = [...weeklyHoursData];

    // If checked in and working (not on break), update current day with live hours from localTimer
    if (isCheckedIn && !hasActiveBreak && currentDayIndex >= 0 && currentDayIndex < 6) {
      console.log('  - User is checked in and working, using localTimer for today\'s hours...');

      // Convert localTimer (seconds) directly to hours - this is today's actual working time
      const todayLiveHours = localTimer / 3600;

      console.log('  - Today live hours from localTimer:', todayLiveHours.toFixed(2));
      console.log('  - Stored hours for today (from backend):', weeklyHoursData[currentDayIndex]);

      // Use the live timer value for today to show real-time progress
      // This ensures the chart updates every second while working
      liveData[currentDayIndex] = todayLiveHours;
      console.log('  - Updated today\'s hours to:', liveData[currentDayIndex].toFixed(2));
    } else {
      console.log('  - User is NOT checked in or on break, using stored data');
      console.log('  - Hours for today (index', currentDayIndex, '):', weeklyHoursData[currentDayIndex]);
    }
    // After checkout, just use weeklyHoursData as-is (which now has updated backend data)

    console.log('  - Setting chart data to:', liveData);
    setChartData([...liveData]);
  }, [weeklyHoursData, liveWeeklyHours, isCheckedIn, hasActiveBreak, localTimer]);

  // Calculate dynamic y-axis max based on data
  const maxDataValue = Math.max(...chartData, 0);
  const yAxisMax = maxDataValue > 8 ? Math.ceil(maxDataValue) : 10;

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      background: 'transparent',
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '60%',
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => {
        if (val === 0) return '';
        if (val < 0.1) return (val * 60).toFixed(0) + 'm'; // Show minutes if less than 0.1 hours
        return val.toFixed(1) + 'h';
      },
      offsetY: -20,
      style: {
        fontSize: '10px',
        colors: [isDark ? '#9ca3af' : '#374151'],
      },
    },
    xaxis: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      labels: {
        style: {
          colors: isDark ? '#9ca3af' : '#374151',
        },
      },
    },
    yaxis: {
      title: {
        text: 'Hours',
        style: {
          color: isDark ? '#9ca3af' : '#374151',
        },
      },
      labels: {
        style: {
          colors: isDark ? '#9ca3af' : '#374151',
        },
        formatter: (val: number) => val.toFixed(1),
      },
      max: yAxisMax,
      min: 0,
    },
    colors: ['#3b82f6'],
    grid: {
      borderColor: isDark ? '#374151' : '#e5e7eb',
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: {
        formatter: (val: number) => {
          if (val < 1) {
            return (val * 60).toFixed(0) + ' minutes';
          }
          return val.toFixed(1) + ' hours';
        },
      },
    },
  };

  // Use chart data state that updates via useEffect
  const series = React.useMemo(() => [{ name: 'Work Hours', data: chartData }], [chartData]);

  console.log('🔄 Chart rendering with series:', series);
  console.log('📊 Chart data values:', chartData);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-700 mb-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">This Week's Performance</h4>
      <ReactApexChart options={options} series={series} type="bar" height={180} />
      {isCheckedIn && !hasActiveBreak && (
        <div className="mt-2 text-center">
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center justify-center gap-1">
            <span className="inline-block w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></span>
            Live: {liveWeeklyHours.toFixed(1)}h total this week
          </span>
        </div>
      )}
    </div>
  );
};

const AttendanceDonutChart: React.FC<{ attendanceStats: AttendanceStats }> = ({ attendanceStats }) => {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Debug logging
  React.useEffect(() => {
    console.log('=== AttendanceDonutChart Debug ===');
    console.log('attendanceStats received:', attendanceStats);
    console.log('present_days:', attendanceStats.present_days);
    console.log('absent_days:', attendanceStats.absent_days);
    console.log('late_days:', attendanceStats.late_days);
    console.log('attendance_percentage:', attendanceStats.attendance_percentage);
  }, [attendanceStats]);

  // Calculate on-time vs late present days
  const onTimeDays = Math.max(0, attendanceStats.present_days - attendanceStats.late_days);
  const lateDays = attendanceStats.late_days;
  const absentDays = attendanceStats.absent_days;

  console.log('Chart calculation - onTimeDays:', onTimeDays, 'lateDays:', lateDays, 'absentDays:', absentDays);

  const options: ApexOptions = {
    chart: {
      type: 'donut',
      background: 'transparent',
    },
    labels: ['On Time', 'Late', 'Absent'],
    colors: ['#10b981', '#f59e0b', '#ef4444'],
    legend: {
      show: true,
      position: 'bottom',
      labels: {
        colors: isDark ? '#9ca3af' : '#374151',
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => Math.round(val) + '%',
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Attendance',
              fontSize: '16px',
              fontWeight: 'bold',
              color: isDark ? '#10b981' : '#059669',
              formatter: () => attendanceStats.attendance_percentage.toFixed(0) + '%',
            },
          },
        },
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: {
        formatter: (val: number) => val.toFixed(1) + ' days',
      },
    },
  };

  const series = [onTimeDays, lateDays, absentDays];

  // Check if there's any data to display
  const hasData = series.some(val => val > 0);

  return (
    <div className="mb-4">
      {hasData ? (
        <ReactApexChart options={options} series={series} type="donut" height={220} />
      ) : (
        <div className="flex flex-col items-center justify-center py-8">
          <FaChartPie className="text-gray-300 dark:text-gray-600 text-5xl mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No attendance data available</p>
        </div>
      )}
    </div>
  );
};