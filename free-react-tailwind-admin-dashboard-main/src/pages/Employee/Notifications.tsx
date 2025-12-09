import { useEffect, useState, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useNotifications } from "../../context/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell,
    Search,
    Clock,
    Info,
    Calendar,
    BookOpen,
    AlertTriangle,
    X,
    RefreshCw,
} from "lucide-react";

const Notifications = () => {
    const { notifications, loading, error, fetchNotifications, markAllAsRead } = useNotifications();
    const [searchQuery, setSearchQuery] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (notifications.length > 0) {
            markAllAsRead();
        }
    }, [notifications.length, markAllAsRead]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchNotifications();
        setTimeout(() => setIsRefreshing(false), 800);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return "Today";
        if (diffDays === 2) return "Yesterday";
        if (diffDays <= 7) return `${diffDays - 1} days ago`;
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getIconForType = (type: string | undefined, title: string) => {
        const lowerTitle = title.toLowerCase();
        const lowerType = type?.toLowerCase() || "";

        if (lowerType === 'calendar' || lowerTitle.includes('calendar')) return <Calendar className="w-5 h-5 text-green-500" />;
        if (lowerType === 'learning_corner' || lowerTitle.includes('learning')) return <BookOpen className="w-5 h-5 text-purple-500" />;
        if (lowerType === 'admin' || lowerTitle.includes('admin')) return <AlertTriangle className="w-5 h-5 text-orange-500" />;
        if (lowerTitle.includes('reminder') || lowerTitle.includes('due') || lowerTitle.includes('deadline')) return <Clock className="w-5 h-5 text-yellow-500" />;

        return <Info className="w-5 h-5 text-blue-500" />;
    };

    const getGradientForType = (type: string | undefined, title: string) => {
        const lowerTitle = title.toLowerCase();
        const lowerType = type?.toLowerCase() || "";

        if (lowerType === 'calendar' || lowerTitle.includes('calendar')) return "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800";
        if (lowerType === 'learning_corner' || lowerTitle.includes('learning')) return "from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20 border-purple-200 dark:border-purple-800";
        if (lowerType === 'admin' || lowerTitle.includes('admin')) return "from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800";
        if (lowerTitle.includes('reminder') || lowerTitle.includes('due') || lowerTitle.includes('deadline')) return "from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800";

        return "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800";
    };

    const filteredNotifications = useMemo(() => {
        return notifications.filter((notification) => {
            const matchesSearch =
                notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                notification.description.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesSearch;
        });
    }, [notifications, searchQuery]);

    // Deduplicate for display
    const uniqueNotifications = useMemo(() => {
        return filteredNotifications.filter((notif, index, self) =>
            index === self.findIndex(n =>
                n.id === notif.id &&
                n.title === notif.title &&
                n.description === notif.description
            )
        );
    }, [filteredNotifications]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 15
            }
        },
        exit: {
            x: -20,
            opacity: 0,
            transition: { duration: 0.2 }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
            <PageMeta
                title="Notifications"
                description="Stay updated with your latest activities and alerts"
            />

            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Bell className="w-8 h-8 text-brand-500" />
                            Notifications
                            <span className="text-sm font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 px-3 py-1 rounded-full">
                                {uniqueNotifications.length}
                            </span>
                        </h1>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                            Manage your alerts and stay informed about important updates.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className={`p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                            title="Refresh notifications"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Controls Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search notifications..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-gray-900 dark:text-white placeholder-gray-400"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="relative min-h-[400px]">
                    {loading && !isRefreshing ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                            <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading updates...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center p-8 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-800">
                            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Unable to load notifications</h3>
                            <p className="text-red-600 dark:text-red-300 mb-6">{error}</p>
                            <button
                                onClick={() => fetchNotifications()}
                                className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : uniqueNotifications.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center h-96 text-center"
                        >
                            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                                <Bell className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                All caught up!
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                                {searchQuery
                                    ? "No notifications match your search criteria."
                                    : "You have no new notifications at the moment."}
                            </p>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="mt-6 text-brand-600 dark:text-brand-400 font-medium hover:underline"
                                >
                                    Clear search
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="space-y-4"
                        >
                            <AnimatePresence mode="popLayout">
                                {uniqueNotifications.map((notification, index) => (
                                    <motion.div
                                        key={`${notification.id}-${index}`}
                                        layout
                                        variants={itemVariants as any}
                                        className={`group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg dark:hover:shadow-gray-900/50 ${getGradientForType(notification.type, notification.title)
                                            } border-l-4`}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Icon Container */}
                                            <div className="flex-shrink-0 p-3 bg-white/80 dark:bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-sm">
                                                {getIconForType(notification.type, notification.title)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 pt-1">
                                                <div className="flex items-start justify-between gap-4">
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                        {notification.title}
                                                    </h3>
                                                    <span className="flex-shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-700/50 px-2.5 py-1 rounded-full border border-gray-100 dark:border-gray-600">
                                                        {formatDate(notification.date)}
                                                    </span>
                                                </div>
                                                <p className="mt-1.5 text-gray-600 dark:text-gray-300 leading-relaxed">
                                                    {notification.description}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notifications;
