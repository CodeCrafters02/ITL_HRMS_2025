import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";

import {
  CalenderIcon,
  GridIcon,
  HorizontaLDots,
  TaskIcon,
  FileIcon,
  ListIcon,
  PieChartIcon,
} from "../../icons";
import { useSidebar } from "../../context/SidebarContext";
import { useNotifications } from "../../context/NotificationContext";
import NotificationBadge from "../../components/ui/NotificationBadge";
import { axiosInstance } from "../../pages/Employee/api";
import { FolderCheckIcon,  LucideChevronUpSquare, SendIcon } from "lucide-react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  badge?: number;
  onClick?: () => void;
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/employee",
  },
  {
    icon: <TaskIcon />,
    name: "My Tasks",
    path: "/employee/my-tasks",
  },
  {
    icon: <LucideChevronUpSquare />,
    name: "Leave Application",
    path: "/employee/leave-application",
  },
  {
    icon: <PieChartIcon />,
    name: "Attendance History",
    path: "/employee/attendance-history",
  },
  {
    icon: <ListIcon />,
    name: "Notifications",
    path: "/employee/notifications",
  },
  {
    icon: <FileIcon />,
    name: "Learning Corner",
    path: "/employee/learning-corner",
  },
  {
    icon: <CalenderIcon />,
    name: "Calendar",
    path: "/employee/personal-calendar",
  },
  {
    icon: <FolderCheckIcon />,
    name: "Company policies",
    path: "/employee/company-policy",
  },
];

const EmployeeSidebar: React.FC = () => {
  // Reporting manager state (must be above badge logic)
  const [isReportingManager, setIsReportingManager] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  // Company info state (must be above badge logic)
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  // Reporting manager and company info state (must be above badge logic)
  // Leave Request badge logic for reporting manager
  const [leaveRequestCount, setLeaveRequestCount] = useState(0);
  const [leaveRequestBadge, setLeaveRequestBadge] = useState(0);

  useEffect(() => {
    if (!isReportingManager) return;
    let isMounted = true;
    const fetchLeaveRequests = () => {
      axiosInstance.get("emp-leaves/").then((res) => {
        // Adjust the endpoint and logic as per your API
        const currentCount = Array.isArray(res.data) ? res.data.length : 0;
        if (!isMounted) return;
        setLeaveRequestCount(currentCount);
        const lastSeen = Number(localStorage.getItem("leave_request_last_seen_count") || 0);
        setLeaveRequestBadge(currentCount > lastSeen ? currentCount - lastSeen : 0);
      });
    };
    fetchLeaveRequests();
    const interval = setInterval(fetchLeaveRequests, 60 * 1000); // Poll every 1 minute
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "leave_request_last_seen_count") {
        const lastSeen = Number(e.newValue || 0);
        setLeaveRequestBadge(leaveRequestCount > lastSeen ? leaveRequestCount - lastSeen : 0);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, [isReportingManager, leaveRequestCount]);

  const handleLeaveRequestClick = () => {
    localStorage.setItem("leave_request_last_seen_count", String(leaveRequestCount));
    setLeaveRequestBadge(0);
  };
  // Calendar badge logic
  const [calendarCount, setCalendarCount] = useState(0);
  const [calendarBadge, setCalendarBadge] = useState(0);

  // Leave Request badge logic
  const [leaveCount, setLeaveCount] = useState(0);
  const [leaveBadge, setLeaveBadge] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchCalendar = () => {
      axiosInstance.get("employee-calendar/").then((res) => {
        const currentCount = Array.isArray(res.data) ? res.data.length : 0;
        if (!isMounted) return;
        setCalendarCount(currentCount);
        const lastSeen = Number(localStorage.getItem("calendar_last_seen_count") || 0);
        setCalendarBadge(currentCount > lastSeen ? currentCount - lastSeen : 0);
      });
    };
    fetchCalendar();
    const interval = setInterval(fetchCalendar, 60 * 1000); // Poll every 1 minute
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "calendar_last_seen_count") {
        const lastSeen = Number(e.newValue || 0);
        setCalendarBadge(calendarCount > lastSeen ? calendarCount - lastSeen : 0);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, [calendarCount]);

  const handleCalendarClick = () => {
    localStorage.setItem("calendar_last_seen_count", String(calendarCount));
    setCalendarBadge(0);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchLeave = () => {
      axiosInstance.get("emp-leaves/").then((res) => {
        const currentCount = Array.isArray(res.data) ? res.data.length : 0;
        if (!isMounted) return;
        setLeaveCount(currentCount);
        const lastSeen = Number(localStorage.getItem("leave_last_seen_count") || 0);
        setLeaveBadge(currentCount > lastSeen ? currentCount - lastSeen : 0);
      });
    };
    fetchLeave();
    const interval = setInterval(fetchLeave, 60 * 1000); // Poll every 1 minute
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "leave_last_seen_count") {
        const lastSeen = Number(e.newValue || 0);
        setLeaveBadge(leaveCount > lastSeen ? leaveCount - lastSeen : 0);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, [leaveCount]);

  const handleLeaveClick = () => {
    localStorage.setItem("leave_last_seen_count", String(leaveCount));
    setLeaveBadge(0);
  };
  // Get unread notification count from context
  const { unreadCount } = useNotifications();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  // Learning Corner badge logic
  const [lcCount, setLcCount] = useState(0);
  const [lcBadge, setLcBadge] = useState(0);

  // My Tasks badge logic (unread count using localStorage)
  const [myTasksCount, setMyTasksCount] = useState(0);
  const [myTasksBadge, setMyTasksBadge] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchMyTasks = () => {
      axiosInstance.get("my-tasks/").then((res) => {
        let currentCount = 0;
        if (Array.isArray(res.data)) {
          currentCount = res.data.length;
        } else if (res.data && typeof res.data.count === 'number') {
          currentCount = res.data.count;
        }
        if (!isMounted) return;
        setMyTasksCount(currentCount);
        const lastSeen = Number(localStorage.getItem("my_tasks_last_seen_count") || 0);
        setMyTasksBadge(currentCount > lastSeen ? currentCount - lastSeen : 0);
      }).catch(() => {
        if (!isMounted) return;
        setMyTasksCount(0);
        setMyTasksBadge(0);
      });
    };
    fetchMyTasks();
    const interval = setInterval(fetchMyTasks, 60 * 1000); // Poll every 1 minute
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "my_tasks_last_seen_count") {
        const lastSeen = Number(e.newValue || 0);
        setMyTasksBadge(myTasksCount > lastSeen ? myTasksCount - lastSeen : 0);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, [myTasksCount]);

  const handleMyTasksClick = () => {
    localStorage.setItem("my_tasks_last_seen_count", String(myTasksCount));
    setMyTasksBadge(0);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchLearningCorner = () => {
      axiosInstance.get("emp-learning-corner/").then((res) => {
        const currentCount = Array.isArray(res.data) ? res.data.length : 0;
        if (!isMounted) return;
        setLcCount(currentCount);
        const lastSeen = Number(localStorage.getItem("lc_last_seen_count") || 0);
        setLcBadge(currentCount > lastSeen ? currentCount - lastSeen : 0);
      });
    };
    fetchLearningCorner();
    const interval = setInterval(fetchLearningCorner, 60 * 1000); // Poll every 1 minute
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "lc_last_seen_count") {
        const lastSeen = Number(e.newValue || 0);
        setLcBadge(lcCount > lastSeen ? lcCount - lastSeen : 0);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, [lcCount]);

  const handleLearningCornerClick = () => {
  localStorage.setItem("lc_last_seen_count", String(lcCount));
  setLcBadge(0);
  };

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav) =>
        nav.path ? (
          <li key={nav.name}>
            <Link
              to={nav.path}
              className={`menu-item group ${
                isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
              }`}
              onClick={
                nav.onClick
                  ? nav.onClick
                  : nav.name === "Learning Corner"
                  ? handleLearningCornerClick
                  : nav.name === "My Tasks"
                  ? handleMyTasksClick
                  : nav.name === "Calendar"
                  ? handleCalendarClick
                  : nav.name === "Leave Application"
                  ? handleLeaveClick
                  : undefined
              }
            >
              <span
                className={`menu-item-icon-size relative ${
                  isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
                {/* Learning Corner badge */}
                {nav.name === "Learning Corner" && lcBadge > 0 && (
                  <NotificationBadge count={lcBadge} className="bg-red-600 absolute -top-2 -right-2" />
                )}
                {/* Notifications badge */}
                {nav.name === "Notifications" && unreadCount > 0 && (
                  <NotificationBadge count={unreadCount} className="bg-red-600 absolute -top-2 -right-2" />
                )}
                {/* My Tasks badge */}
                {nav.name === "My Tasks" && myTasksBadge > 0 && (
                  <NotificationBadge count={myTasksBadge} className="bg-red-600 absolute -top-2 -right-2" />
                )}
                {/* Calendar badge */}
                {nav.name === "Calendar" && calendarBadge > 0 && (
                  <NotificationBadge count={calendarBadge} className="bg-red-600 absolute -top-2 -right-2" />
                )}
                {/* Leave Application badge */}
                {nav.name === "Leave Application" && leaveBadge > 0 && (
                  <NotificationBadge count={leaveBadge} className="bg-red-600 absolute -top-2 -right-2" />
                )}
                {/* Leave Request badge for reporting manager */}
                {nav.name === "Leave Request" && leaveRequestBadge > 0 && (
                  <NotificationBadge count={leaveRequestBadge} className="bg-red-600 absolute -top-2 -right-2" />
                )}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
            </Link>
          </li>
        ) : null
      )}
    </ul>
  );



  useEffect(() => {
    // Fetch company info for employee from new API endpoint
    axiosInstance.get("employee/company-info/").then((res) => {
      if (res.data) {
        setCompanyLogo(res.data.company_logo_url || null);
        setCompanyName(res.data.company_name || null);
      }
    });
    // Optionally, fetch employee id for other logic
    axiosInstance.get("employee-id/").then((res) => {
      const id = res.data?.employee_id ?? res.data?.id;
      if (id) {
        localStorage.setItem('employee_id', String(id));
        setEmployeeId(String(id));
      }
    });
  }, []);

  useEffect(() => {
    // Use employeeId from state (set by employee-id/ endpoint)
    if (!employeeId) return;
    axiosInstance.get("reporting-managers/").then((res) => {
      console.log('Reporting managers API response:', res.data);
      const managers = Array.isArray(res.data) ? res.data : res.data.reporting_managers || [];
      console.log('Managers used for check:', managers);
      const isManager = managers.some((mgr: {id: string|number, full_name?: string}) => String(mgr.id) === String(employeeId));
      console.log('Current employeeId:', employeeId, 'Is reporting manager:', isManager);
      setIsReportingManager(isManager);
    });
  }, [employeeId]);

  // Add Assign Task nav item if reporting manager
  const navItemsWithManager = isReportingManager
    ? [
        ...navItems,
        {
          icon: <TaskIcon />, 
          name: 'Assign Task',
          path: '/employee/assign-task',
        },
        {
          icon: <SendIcon />, 
          name: 'Leave Request',
          path: '/employee/leave-request',
          badge: leaveRequestBadge,
          onClick: handleLeaveRequestClick,
        },
      ]
    : navItems;

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center p-0 m-0" style={{gap: 0, width: '100%'}}>
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={companyName || "Company Logo"}
                  width={40}
                  height={40}
                  style={{objectFit: 'contain', maxHeight: 40, marginRight: 0, paddingRight: 0, display: 'block'}}
                />
              ) : (
                <img
                  src="/images/logo/logo.svg"
                  alt="Logo"
                  width={40}
                  height={40}
                  style={{display: 'block'}}
                />
              )}
              {companyName && (
                <span
                  className="font-bold text-lg text-gray-900 dark:text-white whitespace-normal break-words"
                  style={{marginLeft: 0, paddingLeft: 0, maxWidth: 'calc(100% - 40px)', lineHeight: '1.1', wordBreak: 'break-word', display: 'block'}}
                >
                  {companyName}
                </span>
              )}
            </div>
          ) : (
            companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName || "Company Logo"}
                width={32}
                height={32}
                style={{objectFit: 'contain', maxHeight: 32}}
              />
            ) : (
              <img
                src="/images/logo/logo-icon.svg"
                alt="Logo"
                width={32}
                height={32}
              />
            )
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div>
            <h2
              className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
              }`}
            >
              {isExpanded || isHovered || isMobileOpen ? (
                "Menu"
              ) : (
                <HorizontaLDots className="size-6" />
              )}
            </h2>
            {renderMenuItems(navItemsWithManager)}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default EmployeeSidebar;
