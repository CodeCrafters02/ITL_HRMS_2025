import { useCallback } from "react";
import { Link, useLocation } from "react-router";

import {
  CalenderIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  TableIcon,
} from "../../icons";
import { useSidebar } from "../../context/SidebarContext";
import { useNotifications } from "../../context/NotificationContext";
import NotificationBadge from "../../components/ui/NotificationBadge";

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
    icon: <ListIcon />,
    name: "My Tasks",
    path: "/employee/form-elements",
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
    icon: <PageIcon />,
    name: "Notifications",
    path: "/employee/notifications",
  },
  {
    icon: <CalenderIcon />,
    name: "Calendar",
    path: "/employee/personal-calendar",
  },
];


const EmployeeSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav) => (
        nav.path ? (
          <li key={nav.name}>
            <Link
              to={nav.path}
              className={`menu-item group ${
                isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
              }`}
            >
              <span
                className={`menu-item-icon-size relative ${
                  isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
                {nav.name === "Notifications" && unreadCount > 0 && (
                  <NotificationBadge count={unreadCount} />
                )}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <div className="flex items-center justify-between flex-1">
                  <span className="menu-item-text">{nav.name}</span>
                  {nav.name === "Notifications" && unreadCount > 0 && (
                    <NotificationBadge count={unreadCount} className="relative top-0 right-0 transform-none ml-2" />
                  )}
                </div>
              )}
            </Link>
          </li>
        ) : null
      ))}
    </ul>
  );

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
            {renderMenuItems(navItems)}
          </div>
        </nav>
        
      </div>
    </aside>
  );
};

export default EmployeeSidebar;
