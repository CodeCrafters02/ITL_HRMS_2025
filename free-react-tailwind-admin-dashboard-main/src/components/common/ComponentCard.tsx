interface ComponentCardProps {
  title?: React.ReactNode;
  desc?: React.ReactNode;
  className?: string; // Additional custom classes for styling
  children?: React.ReactNode;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  desc,
  className = "",
  children,
}) => {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {/* Card Header */}
      <div className="px-6 py-5">
        {title && (
          <div className="mb-2 text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {title}
          </div>
        )}
        {desc && (
          <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {desc}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
