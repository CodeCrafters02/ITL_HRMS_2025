interface NotificationBadgeProps {
  count: number;
  className?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count, className = "" }) => {
  if (count === 0) return null;

  return (
    <span
      className={`absolute -top-1 -right-1 inline-flex items-center justify-center h-5 w-5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};

export default NotificationBadge;
