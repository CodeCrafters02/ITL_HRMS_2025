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
  TableIcon,
} from "../../icons";
import { useSidebar } from "../../context/SidebarContext";
import { useNotifications } from "../../context/NotificationContext";
import NotificationBadge from "../../components/ui/NotificationBadge";
import { axiosInstance } from "../../pages/Employee/api";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
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
    icon: <TableIcon />,
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
];

const EmployeeSidebar: React.FC = () => {
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

  useEffect(() => {
    // Fetch learning corner items and update badge
    axiosInstance.get("emp-learning-corner/").then((res) => {
      const currentCount = Array.isArray(res.data) ? res.data.length : 0;
      setLcCount(currentCount);
      // Only update badge if lastSeen is less than currentCount
      const lastSeen = Number(localStorage.getItem("lc_last_seen_count") || 0);
      setLcBadge(currentCount > lastSeen ? currentCount - lastSeen : 0);
    });
    // Listen for changes to localStorage from other tabs/windows
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "lc_last_seen_count") {
        const lastSeen = Number(e.newValue || 0);
        setLcBadge(lcCount > lastSeen ? lcCount - lastSeen : 0);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
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
              onClick={nav.name === "Learning Corner" ? handleLearningCornerClick : undefined}
            >
              <span
                className={`menu-item-icon-size relative ${
                  isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
                {nav.name === "Learning Corner" && lcBadge > 0 && (
                  <NotificationBadge count={lcBadge} className="bg-red-600 absolute -top-2 -right-2" />
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

  const [isReportingManager, setIsReportingManager] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch employee id from new endpoint and set in localStorage
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
    ? (() => {
              return [
          ...navItems,
          {
            icon: <TaskIcon />, 
            name: 'Assign Task',
            path: '/employee/assign-task',
          },
        ];
      })()
    : (() => {
              return navItems;
      })();

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
            <>
              <img
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
              />
              <img
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <img
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
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
