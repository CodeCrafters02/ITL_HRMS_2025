import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../models/task_model.dart';
import '../../services/employee_service.dart';
import '../../services/notification_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';

class MyTasksPage extends StatefulWidget {
  const MyTasksPage({super.key});

  @override
  State<MyTasksPage> createState() => _MyTasksPageState();
}

class _MyTasksPageState extends State<MyTasksPage>
    with SingleTickerProviderStateMixin {
  List<Task> _tasks = [];
  bool _isLoading = true;
  String? _error;
  int? _expandedTaskId;
  late AnimationController _animationController;
  final Set<int> _updatingAssignmentIds = {};

  final List<Map<String, String>> _assignmentStatuses = const [
    {'value': 'todo', 'label': 'To Do'},
    {'value': 'inprogress', 'label': 'In Progress'},
    {'value': 'inreview', 'label': 'In Review'},
    {'value': 'done', 'label': 'Done'},
  ];

  final List<String> _dateCategories = ['OVERDUE', 'TODAY', 'TOMORROW', 'THIS WEEK', 'UPCOMING', 'LATER'];

  String _getDateCategory(String deadlineStr) {
    if (deadlineStr.isEmpty) return 'LATER';
    try {
      final deadline = DateTime.parse(deadlineStr);
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final tomorrow = today.add(const Duration(days: 1));
      final nextWeek = today.add(const Duration(days: 7));
      final taskDate = DateTime(deadline.year, deadline.month, deadline.day);

      if (taskDate.isBefore(today)) return 'OVERDUE';
      if (taskDate.isAtSameMomentAs(today)) return 'TODAY';
      if (taskDate.isAtSameMomentAs(tomorrow)) return 'TOMORROW';
      if (taskDate.isBefore(nextWeek)) return 'THIS WEEK';
      return 'UPCOMING';
    } catch (_) {
      return 'LATER';
    }
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'OVERDUE': return Colors.redAccent;
      case 'TODAY': return AppStitchTheme.primary;
      case 'TOMORROW': return Colors.orangeAccent;
      case 'THIS WEEK': return Colors.tealAccent;
      default: return AppStitchTheme.lightOnSurfaceMuted;
    }
  }

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _fetchTasks();
    NotificationService.updateLastSeen('my_tasks');
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _fetchTasks() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await EmployeeService.getMyTasks();
      if (mounted) {
        setState(() {
          _isLoading = false;
          if (response.success && response.data != null) {
            _tasks = response.data!;
          } else {
            _error = response.message ?? 'Failed to load tasks';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = 'An error occurred: ${e.toString()}';
        });
      }
    }
  }

  void _toggleExpand(int taskId) {
    setState(() {
      if (_expandedTaskId == taskId) {
        _expandedTaskId = null;
        _animationController.reverse();
      } else {
        _expandedTaskId = taskId;
        _animationController.forward();
      }
    });
  }

  Future<void> _handleAssignmentStatusChange(
    int assignmentId,
    String newStatus, {
    int? parentId,
    bool isSubtask = false,
  }) async {
    if (_updatingAssignmentIds.contains(assignmentId)) return;

    setState(() {
      _updatingAssignmentIds.add(assignmentId);
    });

    try {
      final response = await EmployeeService.updateAssignmentStatus(
        assignmentId,
        newStatus,
      );

      if (mounted) {
        setState(() {
          _updatingAssignmentIds.remove(assignmentId);
        });
        HapticFeedback.mediumImpact();

        if (response.success) {
          setState(() {
            if (!isSubtask) {
              _tasks = _tasks.map((task) {
                if (task.assignments.any((a) => a.id == assignmentId)) {
                  return Task(
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    contributors: task.contributors,
                    createdBy: task.createdBy,
                    createdAt: task.createdAt,
                    deadline: task.deadline,
                    priority: task.priority,
                    status: task.status,
                    subtaskDetails: task.subtaskDetails,
                    assignments: task.assignments.map((a) {
                      if (a.id == assignmentId) {
                        return Assignment(
                          id: a.id,
                          task: a.task,
                          employee: a.employee,
                          role: a.role,
                          status: newStatus,
                          isSeen: a.isSeen,
                          employeeName: a.employeeName,
                          avatarUrl: a.avatarUrl,
                        );
                      }
                      return a;
                    }).toList(),
                    progress: task.progress,
                  );
                }
                return task;
              }).toList();
            } else if (parentId != null) {
              _tasks = _tasks.map((task) {
                if (task.id == parentId) {
                  return Task(
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    contributors: task.contributors,
                    createdBy: task.createdBy,
                    createdAt: task.createdAt,
                    deadline: task.deadline,
                    priority: task.priority,
                    status: task.status,
                    subtaskDetails: task.subtaskDetails.map((st) {
                      return Subtask(
                        id: st.id,
                        title: st.title,
                        description: st.description,
                        deadline: st.deadline,
                        priority: st.priority,
                        status: st.status,
                        assignments: st.assignments.map((a) {
                          if (a.id == assignmentId) {
                            return Assignment(
                              id: a.id,
                              task: a.task,
                              employee: a.employee,
                              role: a.role,
                              status: newStatus,
                              isSeen: a.isSeen,
                              employeeName: a.employeeName,
                              avatarUrl: a.avatarUrl,
                            );
                          }
                          return a;
                        }).toList(),
                        progress: st.progress,
                      );
                    }).toList(),
                    assignments: task.assignments,
                    progress: task.progress,
                  );
                }
                return task;
              }).toList();
            }
          });

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Status updated successfully'),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              duration: const Duration(seconds: 2),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to update status'),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _updatingAssignmentIds.remove(assignmentId);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        );
      }
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        return const Color(0xFFEF4444);
      case 'medium':
        return const Color(0xFFF59E0B);
      case 'low':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF6B7280);
    }
  }

  IconData _getPriorityIcon(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        return Icons.priority_high;
      case 'medium':
        return Icons.remove;
      case 'low':
        return Icons.arrow_downward;
      default:
        return Icons.circle;
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'done':
        return const Color(0xFF10B981);
      case 'inprogress':
        return const Color(0xFF3B82F6);
      case 'inreview':
        return const Color(0xFF8B5CF6);
      case 'todo':
        return const Color(0xFF6B7280);
      default:
        return const Color(0xFF6B7280);
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'done':
        return Icons.check_circle;
      case 'inprogress':
        return Icons.play_circle;
      case 'inreview':
        return Icons.rate_review;
      case 'todo':
        return Icons.radio_button_unchecked;
      default:
        return Icons.circle;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: StitchBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              children: [
                _FrostHeader(
                  title: 'My tasks',
                  subtitle: 'Assignments & subtasks',
                  trailing: _CountPill(count: _tasks.length),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: _isLoading
                      ? const Center(
                          child: CircularProgressIndicator(),
                        )
                      : _error != null
                          ? _buildErrorState()
                          : _tasks.isEmpty
                              ? _buildEmptyState()
                              : RefreshIndicator(
                                  onRefresh: _fetchTasks,
                                  color: AppStitchTheme.primary,
                                  child: CustomScrollView(
                                    physics: const AlwaysScrollableScrollPhysics(),
                                    slivers: [
                                      const SliverToBoxAdapter(child: SizedBox(height: 8)),
                                      ..._dateCategories.map((category) {
                                        final groupTasks = _tasks.where((t) => _getDateCategory(t.deadline) == category).toList();
                                        if (groupTasks.isEmpty) return const SliverToBoxAdapter(child: SizedBox.shrink());
                                        
                                        return SliverMainAxisGroup(
                                          slivers: [
                                            SliverToBoxAdapter(
                                              child: _buildDateGroupHeader(category, groupTasks.length),
                                            ),
                                            SliverPadding(
                                              padding: const EdgeInsets.only(bottom: 16),
                                              sliver: SliverList(
                                                delegate: SliverChildBuilderDelegate(
                                                  (context, index) {
                                                    return Padding(
                                                      padding: const EdgeInsets.only(bottom: 12),
                                                      child: _buildTaskCard(groupTasks[index], index),
                                                    );
                                                  },
                                                  childCount: groupTasks.length,
                                                ),
                                              ),
                                            ),
                                          ],
                                        );
                                      }),
                                    ],
                                  ),
                                ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDateGroupHeader(String title, int count) {
    final color = _getCategoryColor(title);
    return Padding(
      padding: const EdgeInsets.only(bottom: 14, left: 4),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: color.withValues(alpha: 0.4), blurRadius: 6, spreadRadius: 1),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
              color: AppStitchTheme.lightOnSurface.withValues(alpha: 0.8),
            ),
          ),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: AppStitchTheme.lightOutline.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                color: AppStitchTheme.lightOnSurfaceMuted.withValues(alpha: 0.7),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Divider(
              color: AppStitchTheme.lightOutline.withValues(alpha: 0.08),
              thickness: 1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: GlassCard(
        padding: const EdgeInsets.all(18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFEF4444).withValues(alpha: 0.10),
                border: Border.all(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.20),
                ),
              ),
              child: const Icon(
                Icons.error_outline_rounded,
                color: Color(0xFFEF4444),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Couldn’t load tasks',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: AppStitchTheme.lightOnSurface,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              _error!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppStitchTheme.lightOnSurfaceMuted,
                    fontWeight: FontWeight.w600,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _fetchTasks,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Retry'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: GlassCard(
        padding: const EdgeInsets.all(18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppStitchTheme.primary.withValues(alpha: 0.10),
                border: Border.all(
                  color: AppStitchTheme.primary.withValues(alpha: 0.22),
                ),
              ),
              child: const Icon(
                Icons.task_alt_rounded,
                color: AppStitchTheme.primary,
                size: 28,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'No tasks yet',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: AppStitchTheme.lightOnSurface,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              'You don’t have any assignments right now.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppStitchTheme.lightOnSurfaceMuted,
                    fontWeight: FontWeight.w600,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskCard(Task task, int index) {
    final isExpanded = _expandedTaskId == task.id;
    final firstAssignment = task.assignments.isNotEmpty ? task.assignments[0] : null;
    final isDone = firstAssignment?.status == 'done' || task.status == 'done';
    final isUpdating = firstAssignment != null && _updatingAssignmentIds.contains(firstAssignment.id);

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 300 + (index * 50)),
      curve: Curves.easeOut,
      builder: (context, value, child) {
        return Transform.translate(
          offset: Offset(0, 20 * (1 - value)),
          child: Opacity(opacity: value, child: child),
        );
      },
      child: GlassCard(
        padding: EdgeInsets.zero,
        child: InkWell(
          onTap: () {
            _toggleExpand(task.id);
            HapticFeedback.selectionClick();
          },
          borderRadius: BorderRadius.circular(28),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
            child: AnimatedSize(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeInOut,
              alignment: Alignment.topCenter,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // --- COMPACT HEADER (Always visible) ---
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Status Icon / Loader
                      if (isUpdating)
                        const SizedBox(
                          width: 26,
                          height: 26,
                          child: CircularProgressIndicator(strokeWidth: 2.5),
                        )
                      else if (firstAssignment != null)
                        GestureDetector(
                          onTap: () => _handleAssignmentStatusChange(
                            firstAssignment.id,
                            isDone ? 'todo' : 'done',
                          ),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            width: 26,
                            height: 26,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isDone 
                                ? const Color(0xFF10B981) 
                                : Colors.white.withValues(alpha: 0.8),
                              border: Border.all(
                                color: isDone
                                    ? const Color(0xFF10B981)
                                    : AppStitchTheme.lightOutline.withValues(alpha: 0.8),
                                width: 2,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.05),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: isDone
                                ? const Icon(Icons.check, size: 16, color: Colors.white)
                                : null,
                          ),
                        ),
                      const SizedBox(width: 14),
                      // Title
                      Expanded(
                        child: Text(
                          task.title,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.3,
                            color: isDone
                                ? AppStitchTheme.lightOnSurfaceMuted
                                : AppStitchTheme.lightOnSurface,
                            decoration: isDone ? TextDecoration.lineThrough : null,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 10),
                      // Priority Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _getPriorityColor(task.priority).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: _getPriorityColor(task.priority).withValues(alpha: 0.15),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _getPriorityIcon(task.priority),
                              size: 10,
                              color: _getPriorityColor(task.priority),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              task.priority.toUpperCase(),
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                color: _getPriorityColor(task.priority),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Icon(
                        isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                        size: 22,
                        color: AppStitchTheme.lightOnSurfaceMuted.withValues(alpha: 0.6),
                      ),
                    ],
                  ),

                  // --- PROGRESS BAR ---
                  const SizedBox(height: 18),
                  Stack(
                    children: [
                      Container(
                        height: 6,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 500),
                        curve: Curves.easeOut,
                        height: 6,
                        width: (MediaQuery.of(context).size.width - 68) * (task.progress / 100),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              _getStatusColor(task.status).withValues(alpha: 0.8),
                              _getStatusColor(task.status),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(3),
                          boxShadow: [
                            BoxShadow(
                              color: _getStatusColor(task.status).withValues(alpha: 0.2),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  // Progress % Text
                  if (isExpanded) ...[
                    const SizedBox(height: 6),
                    Align(
                      alignment: Alignment.centerRight,
                      child: Text(
                        '${task.progress}% Complete',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: _getStatusColor(task.status),
                        ),
                      ),
                    ),
                  ],

                  // --- EXPANDABLE DETAILS ---
                  if (isExpanded) ...[
                    const SizedBox(height: 16),
                    // Description
                    if (task.description.isNotEmpty)
                      Text(
                        task.description,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppStitchTheme.lightOnSurfaceVariant,
                          height: 1.5,
                        ),
                      ),
                    const SizedBox(height: 16),
                    // Metadata Chips (Deadline, Status Dropdown)
                    Row(
                      children: [
                        _buildInfoChip(
                          Icons.calendar_today_rounded,
                          task.deadline,
                          AppStitchTheme.primary,
                        ),
                        const Spacer(),
                        if (firstAssignment != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.6),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: AppStitchTheme.lightOutline.withValues(alpha: 0.4),
                              ),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: firstAssignment.status,
                                isDense: true,
                                icon: const Icon(Icons.arrow_drop_down, size: 20),
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  color: _getStatusColor(firstAssignment.status),
                                ),
                                items: _assignmentStatuses.map((status) {
                                  return DropdownMenuItem<String>(
                                    value: status['value'],
                                    child: Text(status['label']!),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  if (value != null) {
                                    _handleAssignmentStatusChange(
                                      firstAssignment.id,
                                      value,
                                    );
                                  }
                                },
                              ),
                            ),
                          ),
                      ],
                    ),

                    // Contributors
                    if (task.contributors.isNotEmpty || task.assignments.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      Text(
                        'TEAM',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
                          color: AppStitchTheme.lightOnSurfaceMuted.withValues(alpha: 0.8),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          ...task.contributors.map((name) => _buildAvatarChip(name)),
                          ...task.assignments.map((a) => _buildAvatarChip(a.employeeName, a.avatarUrl)),
                        ],
                      ),
                    ],

                    // Subtasks
                    if (task.subtaskDetails.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          const Icon(Icons.list_alt_rounded, size: 16, color: AppStitchTheme.primary),
                          const SizedBox(width: 8),
                          Text(
                            'SUBTASKS (${task.subtaskDetails.length})',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1,
                              color: AppStitchTheme.lightOnSurface,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      ...task.subtaskDetails.map((subtask) {
                        return _buildSubtaskCard(subtask, task.id);
                      }),
                    ],
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAvatarChip(String name, [String? avatarUrl]) {
    return Container(
      padding: const EdgeInsets.fromLTRB(4, 4, 10, 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(1.5),
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [AppStitchTheme.primary, Color(0xFF8B5CF6)],
              ),
            ),
            child: CircleAvatar(
              radius: 10,
              backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
              backgroundColor: Colors.white,
              child: avatarUrl == null
                  ? Text(
                      name.isNotEmpty ? name[0].toUpperCase() : '?',
                      style: const TextStyle(
                        fontSize: 8,
                        fontWeight: FontWeight.w900,
                        color: AppStitchTheme.primary,
                      ),
                    )
                  : null,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            name,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppStitchTheme.lightOnSurface,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubtaskCard(Subtask subtask, int parentId) {
    final firstAssignment = subtask.assignments.isNotEmpty ? subtask.assignments[0] : null;
    final isDone = firstAssignment?.status == 'done';
    final isUpdating = firstAssignment != null && _updatingAssignmentIds.contains(firstAssignment.id);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    subtask.title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: isDone ? AppStitchTheme.lightOnSurfaceMuted : AppStitchTheme.lightOnSurface,
                      decoration: isDone ? TextDecoration.lineThrough : null,
                    ),
                  ),
                ),
                if (isUpdating)
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                else if (firstAssignment != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusColor(firstAssignment.status).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: _getStatusColor(firstAssignment.status).withValues(alpha: 0.3),
                      ),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: firstAssignment.status,
                        isDense: true,
                        icon: const Icon(Icons.arrow_drop_down, size: 18),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: _getStatusColor(firstAssignment.status),
                        ),
                        items: _assignmentStatuses.map((status) {
                          return DropdownMenuItem<String>(
                            value: status['value'],
                            child: Text(status['label']!),
                          );
                        }).toList(),
                        onChanged: (value) {
                          if (value != null) {
                            _handleAssignmentStatusChange(
                              firstAssignment.id,
                              value,
                              parentId: parentId,
                              isSubtask: true,
                            );
                          }
                        },
                      ),
                    ),
                  ),
              ],
            ),
            if (subtask.description.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                subtask.description,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppStitchTheme.lightOnSurfaceVariant,
                  height: 1.5,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _buildInfoChip(
                      Icons.calendar_today_rounded,
                      subtask.deadline,
                      AppStitchTheme.primary,
                      size: 10,
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.2)),
                  ),
                  child: Text(
                    '${subtask.progress}%',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      color: AppStitchTheme.lightOnSurface,
                    ),
                  ),
                ),
              ],
            ),
            if (subtask.assignments.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: subtask.assignments.map((assign) {
                  return _buildAvatarChip(assign.employeeName, assign.avatarUrl);
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoChip(
    IconData icon,
    String label,
    Color color, {
    double size = 12,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: AppStitchTheme.lightOutline.withValues(alpha: 0.4),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: size, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: size,
              fontWeight: FontWeight.w800,
              color: AppStitchTheme.lightOnSurface,
            ),
          ),
        ],
      ),
    );
  }
}

class _FrostHeader extends StatelessWidget {
  const _FrostHeader({
    required this.title,
    required this.subtitle,
    required this.trailing,
  });

  final String title;
  final String subtitle;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [AppStitchTheme.lightOnSurface, AppStitchTheme.primary],
                  ).createShader(bounds),
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                          color: Colors.white,
                        ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppStitchTheme.lightOnSurfaceMuted,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.2,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          trailing,
        ],
      ),
    );
  }
}

class _CountPill extends StatelessWidget {
  const _CountPill({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: AppStitchTheme.primary.withValues(alpha: 0.1),
        border: Border.all(
          color: AppStitchTheme.primary.withValues(alpha: 0.2),
        ),
        boxShadow: [
          BoxShadow(
            color: AppStitchTheme.primary.withValues(alpha: 0.05),
            blurRadius: 10,
            spreadRadius: -2,
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.auto_awesome_motion_rounded,
            size: 16,
            color: AppStitchTheme.primary,
          ),
          const SizedBox(width: 8),
          Text(
            '$count',
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: AppStitchTheme.primary,
                ),
          ),
        ],
      ),
    );
  }
}
