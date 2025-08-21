import { useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useNotifications } from "../../context/NotificationContext";

const ViewallNotification: React.FC = () => {
	const { notifications, loading, error, fetchNotifications } = useNotifications();

	useEffect(() => {
		fetchNotifications();
		// eslint-disable-next-line
	}, []);

	// Local Notification type for grouping
	type NotificationType = 'notification' | 'calendar' | 'learning_corner';
	type Notification = {
		id: number;
		title: string;
		description: string;
		date: string;
		type: NotificationType;
	};
	type GroupedNotifications = { label: string; items: Notification[] };

	const groupByDate = (notifications: Notification[]): GroupedNotifications[] => {
		const groups: { [label: string]: Notification[] } = {};
		const today = new Date();
		const yesterday = new Date();
		yesterday.setDate(today.getDate() - 1);

		notifications.forEach((n: Notification) => {
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
		return sortedLabels.map(label => ({ label, items: groups[label].sort((a: Notification, b: Notification) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
	};

	const getTypeIcon = (type: NotificationType) => {
		switch (type) {
			case 'calendar':
				return (
					<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
					</svg>
				);
			case 'learning_corner':
				return (
					<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				);
			default:
				return (
					<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
					</svg>
				);
		}
	};

	const getTypeColor = (type: NotificationType) => {
		switch (type) {
			case 'calendar':
				return 'text-green-600 dark:text-green-400';
			case 'learning_corner':
				return 'text-purple-600 dark:text-purple-400';
			default:
				return 'text-blue-600 dark:text-blue-400';
		}
	};

	if (loading) {
		return (
			<div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
				<div className="flex-1">
					<div className="mx-auto max-w-4xl px-6 py-8">
						<div className="animate-pulse space-y-6">
							<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
							<div className="space-y-4">
								{[1, 2, 3].map(i => (
									<div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
										<div className="flex items-center space-x-3">
											<div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
											<div className="flex-1 space-y-2">
												<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
												<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
						</svg>
						<h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Something went wrong</h3>
						<p className="mt-2 text-gray-500 dark:text-gray-400">{error}</p>
					</div>
				</div>
			</div>
		);
	}

	const grouped = groupByDate(notifications);

	return (
		<div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
			<PageMeta title="Activity" description="All your notifications and activity feed" />
			
			{/* Header */}
			<div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
				<div className="mx-auto max-w-4xl px-6 py-6">
					<div className="flex items-center justify-between">
						<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Activity</h1>
						<div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
							<span>{notifications.length} items</span>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1">
				<div className="mx-auto max-w-4xl px-6 py-6">
					{notifications.length === 0 ? (
						<div className="text-center py-16">
							<div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
								<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-5 5-5-5h5v-6a7.5 7.5 0 00-15 0v6h5l-5 5-5-5h5V12a9 9 0 0110-10z" />
								</svg>
							</div>
							<h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No activity yet</h2>
							<p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
								When you have notifications and activity, they'll show up here to keep you updated.
							</p>
						</div>
					) : (
						<div className="space-y-8">
							{grouped.map(group => (
								<div key={group.label} className="space-y-1">
									{/* Date Header */}
									<div className="sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10">
										<h2 className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
											{group.label}
										</h2>
									</div>

									{/* Notifications */}
									<div className="space-y-1">
										{group.items.map((notification) => (
											<div key={`${notification.id}-${notification.type}-${notification.date}`} 
											     className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 cursor-pointer group">
												<div className="px-4 py-3">
													<div className="flex items-start space-x-3">
														{/* Icon */}
														<div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mt-0.5 ${getTypeColor(notification.type)}`}>
															{getTypeIcon(notification.type)}
														</div>

														{/* Content */}
														<div className="flex-1 min-w-0">
															<div className="flex items-start justify-between">
																<div className="flex-1 min-w-0">
																	<h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
																		{notification.title}
																	</h3>
																	<p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
																		{notification.description}
																	</p>
																</div>
																<div className="flex-shrink-0 ml-4">
																	<time className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
																		{new Date(notification.date).toLocaleTimeString([], { 
																			hour: 'numeric', 
																			minute: '2-digit',
																			hour12: true 
																		})}
																	</time>
																</div>
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
				</div>
			</div>
		</div>
	);
};

export default ViewallNotification;