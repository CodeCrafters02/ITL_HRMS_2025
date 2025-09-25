import { axiosInstance } from "../../pages/Dashboard/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";
// Assume these icons are imported from an icon library
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
 
} from "../../icons";
import { useSidebar } from "../../context/SidebarContext";


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
    path: "/admin",
  },
  {
    icon: <BoxCubeIcon />,
    name: "Branch Mgt",
    path: "/admin/branch-mgt",
    subItems: [
      { name: "Department", path: "/admin/branch-mgt/department", pro: false },
      { name: "Level", path: "/admin/branch-mgt/level", pro: false },
      { name: "Designation", path: "/admin/branch-mgt/designation", pro: false },
    ],
  },
  {
    name: "Employee Mgt",
    icon: <UserCircleIcon />,
    subItems: [
      { name: "Employee Register", path: "/admin/employee-register", pro: false },
      { name: "Recruitment", path: "/admin/recruitment", pro: false },
      { name: "Relieved Employees", path: "/admin/relieved-employees", pro: false },
      { name: "Letter Templates", path: `/admin/letter-templates`, pro: false },
      ],
  },
  {
    name: "Leave Mgt",
    icon: <CalenderIcon />,
    subItems: [
      { name: "Approved Leaves", path: "/admin/approved-leaves", pro: false },
      { name: "Rejected Leaves", path: "/admin/rejected-leaves", pro: false },
    ],
  },
  {
    name: "Attendance Mgt",
    icon: <PieChartIcon />,
    subItems: [
      { name: "Attendance Logs", path: "/admin/attendance-logs", pro: false },
      { name: "Attendance Details", path: "/admin/attendance-details", pro: false },
    ],
  },
  {
    name: "Payroll Mgt",
    icon: <PageIcon />,
    subItems: [
      { name: "Salary Structure", path: "/admin/salary-structure", pro: false },
      { name: "Payroll Reports", path: "/admin/payroll-batches", pro: false },
      { name: "Income Config", path: "/admin/income-tax", pro: false },
    ],
  },
  {
    icon: <CalenderIcon />,
    name: "Assets & Inventory",
    path: "/admin/assets-inventory",
  },
  {
    name: "Configuration",
    icon: <PlugInIcon />,
    subItems: [
      { name: "Break Config", path: "/admin/configuration/break-config", pro: false },
      { name: "Shift", path: "/admin/configuration/shift", pro: false },
      { name: "Department Wise Working days", path: "/admin/configuration/department-wise-working-days", pro: false },
      { name: "Leave Count", path: "/admin/configuration/leave-count", pro: false },
      { name: "Company Policies", path: "/admin/configuration/company-policies", pro: false },
    ],
  },
  {
    icon: <CalenderIcon />,
    name: "Calendar",
    path: "/admin/calendar",
  },
  {
    name: "Notifications",
    icon: <ListIcon />,
    path: "/admin/admin-notifications",
  },
  {
    name: "Learning Corner",
    icon: <TableIcon />,
    path: "/admin/learning-corner",
  },
  {
    name: "System Tracking",
    icon: <PieChartIcon />,
    path: "/admin/system-tracking",
  },
];



const AdminSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Company info state
  const [companyLogo, setCompanyLogo] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  

  // Notification badge from context
  // Only one badge should be shown, overlapped on sidebar icon
  // Use unreadCount from NotificationContext
  const { unreadCount } = useNotifications();

  useEffect(() => {
    // Fetch company logo and name for admin
   axiosInstance.get("app/company-logo/")
      .then(res => {
        
        setCompanyLogo(res.data.logo_url || "");
        setCompanyName(res.data.name || "");
      })
      .catch(() => {
        setCompanyLogo("");
        setCompanyName("");
      });
  }, []);

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main"].forEach((menuType) => {
      const items = navItems;
      items.forEach((nav: NavItem, index: number) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size  ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
                {/* Only one notification badge, overlapped on sidebar icon */}
                {nav.name === "Notifications" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow-lg z-10">
                    {unreadCount}
                  </span>
                )}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
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
        {isExpanded || isHovered || isMobileOpen ? (
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Company Logo"
                width={40}
                height={40}
                className="rounded"
              />
            ) : (
              <div style={{ width: 40, height: 40 }} className="bg-gray-200 rounded" />
            )}
            <span className="font-bold text-lg">{companyName ? companyName : ""}</span>
          </div>
        ) : (
          companyLogo ? (
            <img
              src={companyLogo}
              alt="Logo"
              width={32}
              height={32}
              className="rounded"
            />
          ) : (
            <div style={{ width: 32, height: 32 }} className="bg-gray-200 rounded" />
          )
        )}
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
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
              {renderMenuItems(navItems, "main")}
            </div>
            {/* Others section removed */}
          </div>
        </nav>
        {/* SidebarWidget (tailwind card) removed */}
      </div>
    </aside>
  );
};

export default AdminSidebar;
