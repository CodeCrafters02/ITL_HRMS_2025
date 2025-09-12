import { useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useNotifications } from "../../context/NotificationContext";

interface Notification {
  id: string | number; // Allow both string and number IDs to match backend
  title: string;
  description: string;
  date: string;
}

const Notifications: React.FC = () => {
  const { notifications, loading, error, fetchNotifications, markAllAsRead } = useNotifications();

  useEffect(() => {
    // Mark all as read when the notifications page is visited
    if (notifications.length > 0) {
      markAllAsRead();
    }
  }, [notifications.length, markAllAsRead]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "Today";
    } else if (diffDays === 2) {
      return "Yesterday";
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    // Determine if it's a reminder based on title keywords
    const isReminder = notification.title.toLowerCase().includes('reminder') || 
                      notification.title.toLowerCase().includes('deadline') ||
                      notification.title.toLowerCase().includes('due') ||
                      notification.title.toLowerCase().includes('expire') ||
                      notification.description.toLowerCase().includes('reminder');
    
    if (isReminder) {
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 ring-2 ring-yellow-200 dark:ring-yellow-700">
          <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    } else {
      // Default to info notification
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    }
  };

  const getNotificationStyle = (notification: Notification) => {
    const isReminder = notification.title.toLowerCase().includes('reminder') || 
                      notification.title.toLowerCase().includes('deadline') ||
                      notification.title.toLowerCase().includes('due') ||
                      notification.title.toLowerCase().includes('expire') ||
                      notification.description.toLowerCase().includes('reminder');
    
    if (isReminder) {
      return "group rounded-lg border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 p-6 shadow-lg transition-all duration-200 hover:border-yellow-400 hover:shadow-xl dark:border-yellow-600 dark:from-yellow-900/20 dark:to-orange-900/20 dark:hover:border-yellow-500";
    } else {
      return "group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600";
    }
  };

  const getNotificationBadge = (notification: Notification) => {
    const isReminder = notification.title.toLowerCase().includes('reminder') || 
                      notification.title.toLowerCase().includes('deadline') ||
                      notification.title.toLowerCase().includes('due') ||
                      notification.title.toLowerCase().includes('expire') ||
                      notification.description.toLowerCase().includes('reminder');
    
    if (isReminder) {
      return (
        <div className="flex items-center space-x-2">
         
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            {formatDate(notification.date)}
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-2">
          
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            {formatDate(notification.date)}
          </span>
        </div>
      );
    }
  };

  // Group notifications by Today, Yesterday, or date
  const groupByDate = (notifications: Notification[]) => {
    const groups: { [label: string]: Notification[] } = {};
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    // Enhanced deduplication logic - remove duplicates based on multiple criteria
    const uniqueNotifications = notifications.filter((notification, index, self) => {
      const isDuplicate = self.findIndex((n) => {
        // Check for exact duplicates (same ID, title, description)
        const exactMatch = n.id === notification.id && 
                          n.title === notification.title && 
                          n.description === notification.description;
        
        // Special handling for learning corner notifications
        const isLearningCorner = notification.title.toLowerCase().includes('learning') || 
                               notification.description.toLowerCase().includes('learning') ||
                               String(notification.id).includes('learning');
        
        const otherIsLearningCorner = n.title.toLowerCase().includes('learning') || 
                                    n.description.toLowerCase().includes('learning') ||
                                    String(n.id).includes('learning');
        
        if (isLearningCorner && otherIsLearningCorner) {
          // For learning corner notifications, check if they're about the same content
          const sameTitle = n.title.trim().toLowerCase() === notification.title.trim().toLowerCase();
          const sameDay = new Date(n.date).toDateString() === new Date(notification.date).toDateString();
          
          // If same title and same day, consider them duplicates regardless of description differences
          if (sameTitle && sameDay) {
            console.log(`Duplicate learning corner found: ${n.id} and ${notification.id}`);
            return true;
          }
        }
        
        // Standard content match for non-learning corner notifications
        const contentMatch = n.title.trim().toLowerCase() === notification.title.trim().toLowerCase() && 
                            n.description.trim().toLowerCase() === notification.description.trim().toLowerCase();
        
        return exactMatch || contentMatch;
      });
      
      return isDuplicate === index; // Keep only the first occurrence
    });

    // Debug logging
    const learningCornerCount = notifications.filter(n => 
      n.title.toLowerCase().includes('learning') || n.description.toLowerCase().includes('learning')
    ).length;
    const uniqueLearningCornerCount = uniqueNotifications.filter(n => 
      n.title.toLowerCase().includes('learning') || n.description.toLowerCase().includes('learning')
    ).length;
    
    console.log(`Learning Corner - Original: ${learningCornerCount}, After deduplication: ${uniqueLearningCornerCount}`);
    console.log(`Total - Original: ${notifications.length}, After deduplication: ${uniqueNotifications.length}`);

    uniqueNotifications.forEach((n: Notification) => {
      const nDate = new Date(n.date);
      let label = nDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      if (
        nDate.getDate() === today.getDate() &&
        nDate.getMonth() === today.getMonth() &&
        nDate.getFullYear() === today.getFullYear()
      ) {
        label = "Today";
      } else if (
        nDate.getDate() === yesterday.getDate() &&
        nDate.getMonth() === yesterday.getMonth() &&
        nDate.getFullYear() === yesterday.getFullYear()
      ) {
        label = "Yesterday";
      }
      if (!groups[label]) groups[label] = [];
      groups[label].push(n);
    });

    // Sort groups by date descending
    const sortedLabels = Object.keys(groups).sort((a, b) => {
      if (a === "Today") return -1;
      if (b === "Today") return 1;
      if (a === "Yesterday") return -1;
      if (b === "Yesterday") return 1;
      return new Date(b).getTime() - new Date(a).getTime();
    });
    return sortedLabels.map(label => ({
      label,
      items: groups[label].sort((a: Notification, b: Notification) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }));
  };

  const grouped = groupByDate(notifications);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
        <PageMeta 
          title="Notifications" 
          description="Stay updated with company announcements and important information" 
        />
        
        <div className="flex-1 p-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Stay updated with company announcements and important information
              </p>
            </div>

            {/* Loading Skeleton */}
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start space-x-4">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="h-5 w-1/3 rounded bg-gray-200 dark:bg-gray-700"></div>
                        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
                        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
        <PageMeta title="Notifications" description="Stay updated with company announcements" />
        
        <div className="flex-1 p-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h1>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center space-x-3">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                    Error loading notifications
                  </h3>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-300">{error}</p>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchNotifications}
                  className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <PageMeta 
        title="Notifications" 
        description="Stay updated with company announcements and important information" 
      />
      
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Notifications
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Stay updated with important information and reminders
                </p>
              </div>
              <button
                onClick={fetchNotifications}
                className="inline-flex items-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center space-x-6 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Information</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 ring-1 ring-yellow-200 dark:ring-yellow-700">
                  <svg className="h-4 w-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reminders (Action Required)</span>
              </div>
            </div>
          </div>

          {/* Notifications List - Grouped by Today, Yesterday, Date */}
          {notifications.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 00-15 0v5h5l-5 5-5-5h5V7a9.966 9.966 0 0110-10z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                No notifications yet
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                When you receive notifications, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map((group) => (
                <div key={group.label} className="space-y-1">
                  {/* Date Header */}
                  <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10">
                    <h2 className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      {group.label}
                    </h2>
                  </div>
                  {/* Notifications for this group */}
                  <div className="space-y-4">
                    {group.items.map((notification: Notification, index: number) => (
                      <div
                        key={`${notification.id}-${index}`}
                        className={getNotificationStyle(notification)}
                      >
                        <div className="flex items-start space-x-4">
                          {/* Notification Icon */}
                          {getNotificationIcon(notification)}
                          {/* Notification Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {notification.title}
                                </h3>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                  {notification.description}
                                </p>
                              </div>
                              <div className="ml-4 flex-shrink-0">
                                {getNotificationBadge(notification)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats Footer */}
          {notifications.length > 0 && (
            <div className="mt-8 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Total notifications: {notifications.length}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Last updated: {new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
