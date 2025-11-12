import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";
import { ThemeToggleButton } from "../../components/common/ThemeToggleButton";
import MasterUserDropdown from "../../components/header/MasterUserDropdown";
import { onMessage } from "firebase/messaging";
import { messaging } from "../../firebase";

const MasterHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ title: string; body: string }[]>([]);
  const [hasNew, setHasNew] = useState(false);

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ✅ Listen for foreground messages from Firebase
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("📩 New FCM message:", payload);
      if (payload.notification) {
        setNotifications((prev) => [
          { title: payload.notification.title || "Notification", body: payload.notification.body || "" },
          ...prev,
        ]);
        setHasNew(true);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 flex w-full bg-white border-gray-200 z-99999 dark:border-gray-800 dark:bg-gray-900 lg:border-b">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg z-99999 dark:border-gray-800 lg:flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              // Cross icon
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // Menu icon
              <svg width="16" height="12" fill="none" stroke="currentColor" viewBox="0 0 16 12">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1h14M1 6h14M1 11h14" />
              </svg>
            )}
          </button>

          <Link to="/" className="lg:hidden flex items-center">
            <span className="font-bold text-lg text-gray-900 dark:text-white">Innovyx HRMS</span>
          </Link>

          <button
            onClick={toggleApplicationMenu}
            className="flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg z-99999 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path
                d="M6 12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } items-center justify-between w-full gap-4 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none`}
        >
          <div className="flex items-center gap-2 2xsm:gap-3">
            {/* 🌗 Dark Mode Toggle */}
            <ThemeToggleButton />

            {/* 🔔 Notification Icon */}
            <div className="relative">
              <button
                onClick={() => setHasNew(false)}
                className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="w-6 h-6 text-gray-700 dark:text-gray-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.657a1.657 1.657 0 01-1.657 1.657H10.8a1.657 1.657 0 01-1.657-1.657M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9z"
                  />
                </svg>
                {hasNew && (
                  <span className="absolute top-2 right-2 inline-flex h-2 w-2 rounded-full bg-red-600"></span>
                )}
              </button>

              {/* Optional: Dropdown with notifications */}
              {notifications.length > 0 && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <ul className="max-h-64 overflow-auto">
                    {notifications.slice(0, 5).map((n, index) => (
                      <li key={index} className="p-3 border-b border-gray-100 dark:border-gray-800">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{n.body}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 👤 User Dropdown */}
          <MasterUserDropdown />
        </div>
      </div>
    </header>
  );
};

export default MasterHeader;
