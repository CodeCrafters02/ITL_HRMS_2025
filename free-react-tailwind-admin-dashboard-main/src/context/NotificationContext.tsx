import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { axiosInstance } from '../pages/Employee/api';

type NotificationType = 'notification' | 'calendar' | 'learning_corner' | 'admin' | 'task' | 'leave' | string;
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

  // Fetch notifications from unified all-notifications endpoint
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("all-notifications/");
      const allNotifications: Notification[] = (res.data || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        date: n.date,
        type: n.type,
      }));
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

  // SSE: Listen for live notifications
  const eventSourceRef = useRef<EventSource | null>(null);
  useEffect(() => {
    // Only connect if user is authenticated (optional: add your own auth check)
    // Use absolute or relative path as needed
  const sseUrl = axiosInstance.defaults.baseURL
  ? `${axiosInstance.defaults.baseURL.replace(/\/$/, '')}/sse/`
  : '/employee/sse/';
const eventSource = new window.EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.id) return; // Ignore messages that are not notifications
        // Map backend fields to Notification type
        const newNotification = {
          id: data.id,
          title: data.title,
          description: data.message,
          date: data.created_at,
          type: data.type || 'notification',
        };
        setNotifications((prev) => {
          // Avoid duplicates
          if (prev.some((n) => n.id === newNotification.id)) return prev;
          return [newNotification, ...prev];
        });
        // Update unread count
        const readIds = getReadIds();
        setUnreadCount((prev) => readIds.includes(newNotification.id) ? prev : prev + 1);
      } catch {
        // Ignore parse errors
      }
    };
    eventSource.onerror = () => {
      // Optionally handle errors
      // eventSource.close();
    };
    return () => {
      eventSource.close();
    };
  }, []);


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
