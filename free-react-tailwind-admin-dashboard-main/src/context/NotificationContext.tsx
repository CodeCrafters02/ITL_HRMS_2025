import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { axiosInstance } from '../pages/Employee/api';

type NotificationType = 'notification' | 'calendar' | 'learning_corner';
interface Notification {
  id: number;
  title: string;
  description: string;
  date: string;
  type: NotificationType;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to get/set read notification IDs in localStorage
  const getReadIds = () => {
    const stored = localStorage.getItem('readNotificationIds');
    return stored ? JSON.parse(stored) as number[] : [];
  };
  const setReadIds = (ids: number[]) => {
    localStorage.setItem('readNotificationIds', JSON.stringify(ids));
  };

  // Fetch notifications from multiple APIs and merge
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all in parallel
      const [notifRes, calendarRes, learningRes] = await Promise.all([
        axiosInstance.get("/employee-notifications/"),
        axiosInstance.get("/employee-calendar/"),
        axiosInstance.get("/emp-learning-corner/")
      ]);

     

      // Tag each notification type
      const notifications: Notification[] = (notifRes.data || []).map((n: {
        id: number;
        title: string;
        description: string;
        date: string;
      }) => ({
        ...n,
        type: 'notification',
      }));

      // Flatten admin_events and personal_events from calendar weeks
      const calendarEvents: Notification[] = [];
      type CalendarDay = {
        day: number | '';
        date: string;
        admin_events?: { id: number; title: string }[];
        personal_events?: { id: number; title: string }[];
      };
      (Array.isArray(calendarRes.data?.weeks) ? calendarRes.data.weeks : []).forEach((week: CalendarDay[]) => {
        week.forEach((dayObj: CalendarDay) => {
          if (!dayObj.day) return;
          (dayObj.admin_events || []).forEach((event) => {
            calendarEvents.push({
              id: event.id,
              title: event.title,
              description: "Admin Event",
              date: dayObj.date,
              type: "calendar"
            });
          });
        });
      });

      const learningCorner: Notification[] = (learningRes.data || []).map((l: {
        id: number;
        title: string;
        description: string;
        date?: string;
        created_at?: string;
        updated_at?: string;
      }) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        date: l.date || l.created_at || l.updated_at || new Date().toISOString(),
        type: 'learning_corner',
      }));

      // Merge and sort by date descending
      const allNotifications: Notification[] = [...notifications, ...calendarEvents, ...learningCorner]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      

      setNotifications(allNotifications);
      const readIds = getReadIds();
      const unread = allNotifications.filter((n) => !readIds.includes(n.id)).length;
      setUnreadCount(unread);
      setError(null);
    } catch (err: unknown) {
      console.error("Error fetching notifications:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to fetch notifications"
          : "Failed to fetch notifications";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark a single notification as read in localStorage
  const markAsRead = (id: number) => {
    const readIds = getReadIds();
    if (!readIds.includes(id)) {
      setReadIds([...readIds, id]);
      fetchNotifications();
    }
  };

  // Mark all notifications as read in localStorage
  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    setUnreadCount(0);
  };

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Poll for new notifications every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchNotifications]);


  // Provide the correct context value object
  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
