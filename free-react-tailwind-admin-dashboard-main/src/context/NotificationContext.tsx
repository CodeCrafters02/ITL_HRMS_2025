import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { axiosInstance } from '../pages/Employee/api';

interface Notification {
  id: number;
  title: string;
  description: string;
  date: string;
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

  // const fetchNotifications = useCallback(async () => {
  //   try {
  //     setLoading(true);
  //     const response = await axiosInstance.get("/employee-notifications/");
  //     setNotifications(response.data);
  //     const readIds = getReadIds();
  //     // Only count notifications not marked as read in localStorage
  //     const unread = response.data.filter((n: Notification) => !readIds.includes(n.id)).length;
  //     setUnreadCount(unread);
  //     setError(null);
  //   } catch (err: unknown) {
  //     const errorMessage = err instanceof Error 
  //       ? err.message 
  //       : typeof err === 'object' && err !== null && 'response' in err
  //         ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to fetch notifications"
  //         : "Failed to fetch notifications";
  //     setError(errorMessage);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);

  // const markAsRead = (id: number) => {
  //   // Mark a single notification as read in localStorage
  //   const readIds = getReadIds();
  //   if (!readIds.includes(id)) {
  //     setReadIds([...readIds, id]);
  //     fetchNotifications();
  //   }
  // };

  // const markAllAsRead = () => {
  //   // Mark all notifications as read in localStorage
  //   const allIds = notifications.map(n => n.id);
  //   setReadIds(allIds);
  //   setUnreadCount(0);
  // };

  // // Fetch notifications on mount
  // useEffect(() => {
  //   fetchNotifications();
  // }, [fetchNotifications]);

  // // Poll for new notifications every 5 minutes
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     fetchNotifications();
  //   }, 5 * 60 * 1000); // 5 minutes

  //   return () => clearInterval(interval);
  // }, [fetchNotifications]);

  // const value: NotificationContextType = {
  //   notifications,
  //   unreadCount,
  //   loading,
  //   error,
  //   fetchNotifications,
  //   markAsRead,
  //   markAllAsRead,
  // };

  return (
    <NotificationContext.Provider value={2}>
      {children}
    </NotificationContext.Provider>
  );
};
