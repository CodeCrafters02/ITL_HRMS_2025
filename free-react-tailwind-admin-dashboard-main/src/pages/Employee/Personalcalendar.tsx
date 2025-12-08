import React, { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import { FaCalendarAlt, FaGlobe, FaSync, FaBell, FaClock, FaUsers, FaChartLine, FaStar } from "react-icons/fa";

const PersonalCalendar: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState('Asia/Kolkata');

  // Common time zones
  const timeZones = [
    { value: 'Asia/Kolkata', label: 'IST (Asia/Kolkata)', short: 'IST' },
    { value: 'America/New_York', label: 'EST (America/New_York)', short: 'EST' },
    { value: 'America/Los_Angeles', label: 'PST (America/Los_Angeles)', short: 'PST' },
    { value: 'Europe/London', label: 'GMT (Europe/London)', short: 'GMT' },
    { value: 'Europe/Paris', label: 'CET (Europe/Paris)', short: 'CET' },
    { value: 'Asia/Tokyo', label: 'JST (Asia/Tokyo)', short: 'JST' },
    { value: 'Australia/Sydney', label: 'AEST (Australia/Sydney)', short: 'AEST' },
    { value: 'Asia/Dubai', label: 'GST (Asia/Dubai)', short: 'GST' },
    { value: 'Asia/Shanghai', label: 'CST (Asia/Shanghai)', short: 'CST' },
  ];

  // Load saved time zone from localStorage
  useEffect(() => {
    const savedTimeZone = localStorage.getItem('selectedTimeZone');
    if (savedTimeZone) {
      setSelectedTimeZone(savedTimeZone);
    }
  }, []);

  // Save time zone to localStorage when changed
  useEffect(() => {
    localStorage.setItem('selectedTimeZone', selectedTimeZone);
  }, [selectedTimeZone]);

  // Detect dark mode from document
  useEffect(() => {
    const checkDarkMode = () => {
      const htmlElement = document.documentElement;
      const hasDarkClass = htmlElement.classList.contains('dark');
      setIsDark(hasDarkClass);
    };

    // Initial check
    checkDarkMode();

    // Watch for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Update current time every second for live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: selectedTimeZone
    });
  };
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: selectedTimeZone
    });
  };

  // Google Calendar embed URL
  const calendarSrc = `https://calendar.google.com/calendar/embed?src=en.indian%23holiday%40group.v.calendar.google.com&ctz=${encodeURIComponent(selectedTimeZone)}&showTitle=0&showPrint=0&showTabs=1&showCalendars=0&mode=MONTH`;

  return (
    <>
      <PageMeta
        title="Personal Calendar | HRMS Employee Dashboard"
        description="View holidays and important dates"
      />
      
      <div className="space-y-6">
        {/* Animated Header Section with Live Clock */}
        <div className={`rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isDark 
            ? 'bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900' 
            : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600'
        }`}>
          <div className="relative p-8">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '40px 40px'
              }}></div>
            </div>
            
            <div className="relative">
              {/* Top Section - Title and Clock */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-6">
                {/* Left side - Title */}
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/10' : 'bg-white/20'} backdrop-blur-sm shadow-lg animate-pulse`}>
                    <FaCalendarAlt className="text-white text-4xl" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
                      Team Calendar
                    </h1>
                    <p className="text-white/90 text-sm sm:text-base font-medium">
                      Stay synced with company events and holidays
                    </p>
                  </div>
                </div>

                {/* Right side - Live Clock and Refresh */}
                <div className="flex items-center gap-4">
                  {/* Live Clock Card */}
                  <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/10' : 'bg-white/20'} backdrop-blur-sm shadow-lg min-w-[220px]`}>
                    <div className="flex items-center gap-3">
                      <FaClock className="text-white text-2xl" />
                      <div>
                        <div className="text-white font-bold text-xl tracking-wider">
                          {formatTime(currentTime)}
                        </div>
                        <div className="text-white/80 text-xs mt-1">
                          {timeZones.find(tz => tz.value === selectedTimeZone)?.short || 'IST'} ({selectedTimeZone})
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={`p-4 rounded-2xl transition-all duration-300 hover:scale-110 shadow-lg ${
                      isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-white/20 hover:bg-white/30'
                    } ${isRefreshing ? 'animate-spin' : ''}`}
                    title="Refresh Calendar"
                  >
                    <FaSync className="text-white text-xl" />
                  </button>
                </div>
              </div>

              {/* Bottom Section - Date banner */}
              <div className={`pt-4 border-t ${isDark ? 'border-white/20' : 'border-white/30'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-white/90 text-sm font-medium">
                    {formatDate(currentTime)}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-500/30 text-white'
                    }`}>
                      ● Live
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Upcoming Events */}
          <div className={`group p-5 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer ${
            isDark 
              ? 'bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700' 
              : 'bg-gradient-to-br from-blue-500 to-blue-600'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <FaBell className="text-white text-2xl group-hover:animate-bounce" />
              <h3 className="text-white font-bold text-lg">Upcoming</h3>
            </div>
            <p className="text-white/90 text-sm">Track your upcoming events</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <span className="text-white/80 text-xs font-semibold">View Details →</span>
            </div>
          </div>

          {/* Team Schedule */}
          <div className={`group p-5 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer ${
            isDark 
              ? 'bg-gradient-to-br from-purple-900 to-purple-800 border border-purple-700' 
              : 'bg-gradient-to-br from-purple-500 to-purple-600'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <FaUsers className="text-white text-2xl group-hover:animate-bounce" />
              <h3 className="text-white font-bold text-lg">Team</h3>
            </div>
            <p className="text-white/90 text-sm">View team schedules</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <span className="text-white/80 text-xs font-semibold">Explore →</span>
            </div>
          </div>

          {/* Holidays */}
          <div className={`group p-5 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer ${
            isDark 
              ? 'bg-gradient-to-br from-pink-900 to-pink-800 border border-pink-700' 
              : 'bg-gradient-to-br from-pink-500 to-pink-600'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <FaStar className="text-white text-2xl group-hover:animate-bounce" />
              <h3 className="text-white font-bold text-lg">Holidays</h3>
            </div>
            <p className="text-white/90 text-sm">Official holidays listed</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <span className="text-white/80 text-xs font-semibold">See All →</span>
            </div>
          </div>

          {/* Analytics */}
          <div className={`group p-5 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer ${
            isDark 
              ? 'bg-gradient-to-br from-indigo-900 to-indigo-800 border border-indigo-700' 
              : 'bg-gradient-to-br from-indigo-500 to-indigo-600'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <FaChartLine className="text-white text-2xl group-hover:animate-bounce" />
              <h3 className="text-white font-bold text-lg">Insights</h3>
            </div>
            <p className="text-white/90 text-sm">Calendar analytics</p>
            <div className="mt-3 pt-3 border-t border-white/20">
              <span className="text-white/80 text-xs font-semibold">Learn More →</span>
            </div>
          </div>
        </div>

        {/* Main Calendar Card with Glass Morphism */}
        <div className={`rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isDark 
            ? 'bg-gray-800/50 backdrop-blur-xl border border-gray-700' 
            : 'bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl'
        }`}>
          {/* Enhanced Card Header */}
          <div className={`px-6 py-5 border-b ${
            isDark ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl shadow-lg ${
                  isDark ? 'bg-blue-500/20' : 'bg-gradient-to-br from-blue-500 to-blue-600'
                }`}>
                  <FaCalendarAlt className={`text-2xl ${isDark ? 'text-blue-400' : 'text-white'}`} />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Indian Holidays Calendar
                  </h2>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    View official holidays and observances
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedTimeZone}
                  onChange={(e) => setSelectedTimeZone(e.target.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-400' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  {timeZones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Calendar Content with Enhanced Loading */}
          <div className="p-6">
            <div className="relative">
              {/* Enhanced Loading overlay */}
              <div className={`absolute inset-0 rounded-2xl flex items-center justify-center z-0 ${
                isDark ? 'bg-gray-900' : 'bg-gray-100'
              } animate-pulse`}>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className={`w-20 h-20 border-4 rounded-full ${
                      isDark ? 'border-gray-700' : 'border-gray-300'
                    }`}></div>
                    <div className="w-20 h-20 border-4 border-purple-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
                  </div>
                  <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    Loading Calendar...
                  </p>
                  <div className="flex gap-2">
                    <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
              
              {/* Calendar iframe with enhanced dark mode styling */}
              <div className={`rounded-2xl overflow-hidden shadow-2xl ${isDark ? 'dark-calendar-wrapper' : ''}`}>
                <style>
                  {isDark && `
                    .dark-calendar-wrapper iframe {
                      filter: invert(0.85) hue-rotate(180deg) brightness(0.9) contrast(1.1);
                    }
                    .dark-calendar-wrapper {
                      background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
                      border: 1px solid #4b5563;
                    }
                  `}
                </style>
                <iframe
                  src={calendarSrc}
                  style={{ border: 0, position: 'relative', zIndex: 1 }}
                  width="100%"
                  height="700"
                  frameBorder="0"
                  scrolling="no"
                  className="rounded-2xl bg-white"
                  title="Google Calendar"
                  onLoad={(e) => {
                    // Hide loading overlay when loaded
                    const iframe = e.currentTarget;
                    const container = iframe.parentElement;
                    const loadingDiv = container?.previousElementSibling;
                    if (loadingDiv) {
                      (loadingDiv as HTMLElement).style.display = 'none';
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Enhanced Card Footer */}
          <div className={`px-6 py-4 border-t ${
            isDark ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100'
          }`}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </div>
                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                  <span className="font-semibold">Live calendar</span> - Auto-updates
                </span>
              </div>
              <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Powered by Google Calendar
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default PersonalCalendar;
