import 'package:flutter/material.dart';
import '../../models/task_model.dart';
import '../../services/employee_service.dart';
import '../../services/notification_service.dart';

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

  final List<Map<String, String>> _assignmentStatuses = const [
    {'value': 'todo', 'label': 'To Do'},
    {'value': 'inprogress', 'label': 'In Progress'},
    {'value': 'inreview', 'label': 'In Review'},
    {'value': 'done', 'label': 'Done'},
  ];

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
    try {
      final response = await EmployeeService.updateAssignmentStatus(
        assignmentId,
        newStatus,
      );

      if (mounted) {
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
              content: const Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text('Status updated successfully'),
                ],
              ),
              backgroundColor: Colors.green,
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
              backgroundColor: Colors.red,
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
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
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text(
          'Assigned Tasks',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: Color(0xFF111827),
          ),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF111827),
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            height: 1,
            color: const Color(0xFFE5E7EB),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchTasks,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF4F46E5)),
              ),
            )
          : _error != null
              ? _buildErrorState()
              : _tasks.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _fetchTasks,
                      color: const Color(0xFF4F46E5),
                      child: LayoutBuilder(
                        builder: (context, constraints) {
                          final crossAxisCount =
                              constraints.maxWidth > 600 ? 2 : 1;
                          return GridView.builder(
                            padding: const EdgeInsets.all(16),
                            gridDelegate:
                                SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: crossAxisCount,
                              crossAxisSpacing: 16,
                              mainAxisSpacing: 16,
                              childAspectRatio: 0.9,
                            ),
                            itemCount: _tasks.length,
                            itemBuilder: (context, index) {
                              return _buildTaskCard(_tasks[index], index);
                            },
                          );
                        },
                      ),
                    ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.error_outline,
                size: 48,
                color: Colors.red,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _error!,
              style: const TextStyle(
                color: Color(0xFF111827),
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _fetchTasks,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4F46E5),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.task_alt,
                size: 64,
                color: Color(0xFF9CA3AF),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'No assigned tasks found',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'You don\'t have any tasks assigned to you yet.',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF6B7280),
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
    final firstAssignment = task.assignments.isNotEmpty
        ? task.assignments[0]
        : null;
    final isDone = firstAssignment?.status == 'done' || task.status == 'done';

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 300 + (index * 50)),
      curve: Curves.easeOut,
      builder: (context, value, child) {
        return Transform.scale(
          scale: value,
          child: Opacity(
            opacity: value,
            child: child,
          ),
        );
      },
      child: Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: isDone
                ? const Color(0xFF10B981).withOpacity(0.3)
                : const Color(0xFFE5E7EB),
            width: 1,
          ),
        ),
        color: Colors.white,
        child: InkWell(
          onTap: () => _toggleExpand(task.id),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header with title and checkbox
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  task.title,
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: isDone
                                        ? const Color(0xFF6B7280)
                                        : const Color(0xFF111827),
                                    decoration: isDone
                                        ? TextDecoration.lineThrough
                                        : null,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 6),
                              // Priority indicator
                              Container(
                                padding: const EdgeInsets.all(3),
                                decoration: BoxDecoration(
                                  color: _getPriorityColor(task.priority)
                                      .withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Icon(
                                  _getPriorityIcon(task.priority),
                                  size: 14,
                                  color: _getPriorityColor(task.priority),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          // Progress bar
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Progress',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                      color: Color(0xFF6B7280),
                                    ),
                                  ),
                                  Text(
                                    '${task.progress}%',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF111827),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 3),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: task.progress / 100,
                                  minHeight: 5,
                                  backgroundColor: const Color(0xFFE5E7EB),
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    _getStatusColor(task.status),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    // Checkbox
                    if (firstAssignment != null)
                      GestureDetector(
                        onTap: isDone
                            ? null
                            : () => _handleAssignmentStatusChange(
                                  firstAssignment.id,
                                  'done',
                                ),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isDone
                                ? const Color(0xFF10B981)
                                : Colors.white,
                            border: Border.all(
                              color: isDone
                                  ? const Color(0xFF10B981)
                                  : const Color(0xFFD1FAE5),
                              width: 2.5,
                            ),
                            boxShadow: isDone
                                ? [
                                    BoxShadow(
                                      color: const Color(0xFF10B981)
                                          .withOpacity(0.3),
                                      blurRadius: 8,
                                      spreadRadius: 0,
                                    ),
                                  ]
                                : null,
                          ),
                          child: isDone
                              ? const Icon(
                                  Icons.check,
                                  size: 16,
                                  color: Colors.white,
                                )
                              : null,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),

                // Description (only show if not empty)
                if (task.description.isNotEmpty) ...[
                  Text(
                    task.description,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF374151),
                      height: 1.4,
                    ),
                    maxLines: isExpanded ? null : 2,
                    overflow: isExpanded ? null : TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 10),
                ],

                // Status and Tags in one row
                Row(
                  children: [
                    // Status badge
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: _getStatusColor(firstAssignment?.status ?? task.status)
                              .withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: _getStatusColor(
                                    firstAssignment?.status ?? task.status)
                                .withOpacity(0.3),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              _getStatusIcon(
                                  firstAssignment?.status ?? task.status),
                              size: 14,
                              color: _getStatusColor(
                                  firstAssignment?.status ?? task.status),
                            ),
                            const SizedBox(width: 6),
                            if (firstAssignment != null)
                              Expanded(
                                child: DropdownButtonHideUnderline(
                                  child: DropdownButton<String>(
                                    value: firstAssignment.status,
                                    isDense: true,
                                    icon: const Icon(Icons.arrow_drop_down,
                                        size: 16),
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: _getStatusColor(firstAssignment.status),
                                    ),
                                    items: _assignmentStatuses.map((status) {
                                      return DropdownMenuItem<String>(
                                        value: status['value'],
                                        child: Text(status['label']!),
                                      );
                                    }).toList(),
                                    onChanged: isDone
                                        ? null
                                        : (value) {
                                            if (value != null) {
                                              _handleAssignmentStatusChange(
                                                firstAssignment.id,
                                                value,
                                              );
                                            }
                                          },
                                  ),
                                ),
                              )
                            else
                              Expanded(
                                child: Text(
                                  _assignmentStatuses.firstWhere(
                                    (s) =>
                                        s['value'] ==
                                        (firstAssignment?.status ?? task.status),
                                    orElse: () => _assignmentStatuses[0],
                                  )['label']!,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: _getStatusColor(
                                        firstAssignment?.status ?? task.status),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Subtasks toggle
                    if (task.subtaskDetails.isNotEmpty)
                      TextButton.icon(
                        onPressed: () => _toggleExpand(task.id),
                        icon: Icon(
                          isExpanded
                              ? Icons.keyboard_arrow_up
                              : Icons.keyboard_arrow_down,
                          size: 16,
                        ),
                        label: Text(
                          '${task.subtaskDetails.length}',
                          style: const TextStyle(fontSize: 12),
                        ),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF2563EB),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 4,
                          ),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),

                // Tags row
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _buildInfoChip(
                      Icons.calendar_today,
                      task.deadline,
                      Colors.blue,
                    ),
                    _buildInfoChip(
                      _getPriorityIcon(task.priority),
                      task.priority.toUpperCase(),
                      _getPriorityColor(task.priority),
                    ),
                  ],
                ),

                // Contributors and Assignments in compact row
                if (task.contributors.isNotEmpty || task.assignments.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      if (task.contributors.isNotEmpty) ...[
                        const Icon(
                          Icons.people_outline,
                          size: 14,
                          color: Color(0xFF6B7280),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Wrap(
                            spacing: 4,
                            runSpacing: 4,
                            children: task.contributors.take(2).map((name) {
                              return Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(
                                    color: const Color(0xFFDBEAFE),
                                    width: 1,
                                  ),
                                ),
                                child: Text(
                                  name,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF1E40AF),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ],
                      if (task.assignments.isNotEmpty) ...[
                        if (task.contributors.isNotEmpty)
                          const SizedBox(width: 8),
                        const Icon(
                          Icons.assignment_ind,
                          size: 14,
                          color: Color(0xFF6B7280),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Wrap(
                            spacing: 4,
                            runSpacing: 4,
                            children: task.assignments.take(2).map((assign) {
                              return Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF9FAFB),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(
                                    color: const Color(0xFFE5E7EB),
                                    width: 1,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (assign.avatarUrl != null)
                                      CircleAvatar(
                                        radius: 10,
                                        backgroundImage:
                                            NetworkImage(assign.avatarUrl!),
                                      )
                                    else
                                      CircleAvatar(
                                        radius: 10,
                                        backgroundColor: const Color(0xFFE5E7EB),
                                        child: Text(
                                          assign.employeeName.isNotEmpty
                                              ? assign.employeeName[0]
                                                  .toUpperCase()
                                              : '?',
                                          style: const TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w600,
                                            color: Color(0xFF6B7280),
                                          ),
                                        ),
                                      ),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        assign.employeeName,
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w500,
                                          color: Color(0xFF111827),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],

                // Subtasks section
                if (isExpanded && task.subtaskDetails.isNotEmpty)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(height: 12),
                      const Divider(height: 1),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          const Icon(
                            Icons.list_alt,
                            size: 14,
                            color: Color(0xFF6B7280),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Subtasks (${task.subtaskDetails.length})',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF111827),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      ...task.subtaskDetails.map((subtask) {
                        return _buildSubtaskCard(subtask, task.id);
                      }).toList(),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSubtaskCard(Subtask subtask, int parentId) {
    final firstAssignment = subtask.assignments.isNotEmpty
        ? subtask.assignments[0]
        : null;
    final isDone = firstAssignment?.status == 'done';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: const Color(0xFFE5E7EB),
          width: 1,
        ),
      ),
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
                    fontWeight: FontWeight.w600,
                    color: isDone
                        ? const Color(0xFF6B7280)
                        : const Color(0xFF111827),
                    decoration: isDone ? TextDecoration.lineThrough : null,
                  ),
                ),
              ),
              if (firstAssignment != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: _getStatusColor(firstAssignment.status)
                        .withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: _getStatusColor(firstAssignment.status)
                          .withOpacity(0.3),
                      width: 1,
                    ),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: firstAssignment.status,
                      isDense: true,
                      icon: const Icon(Icons.arrow_drop_down, size: 16),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: _getStatusColor(firstAssignment.status),
                      ),
                      items: _assignmentStatuses.map((status) {
                        return DropdownMenuItem<String>(
                          value: status['value'],
                          child: Text(status['label']!),
                        );
                      }).toList(),
                      onChanged: isDone
                          ? null
                          : (value) {
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
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E7EB),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${subtask.progress}%',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF111827),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            subtask.description,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF374151),
              height: 1.4,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              _buildInfoChip(
                Icons.calendar_today,
                subtask.deadline,
                Colors.blue,
                size: 11,
              ),
              _buildInfoChip(
                _getPriorityIcon(subtask.priority),
                subtask.priority.toUpperCase(),
                _getPriorityColor(subtask.priority),
                size: 11,
              ),
            ],
          ),
          if (subtask.assignments.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: subtask.assignments.map((assign) {
                return Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: const Color(0xFFE5E7EB),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (assign.avatarUrl != null)
                        CircleAvatar(
                          radius: 10,
                          backgroundImage: NetworkImage(assign.avatarUrl!),
                        )
                      else
                        CircleAvatar(
                          radius: 10,
                          backgroundColor: const Color(0xFFE5E7EB),
                          child: Text(
                            assign.employeeName.isNotEmpty
                                ? assign.employeeName[0].toUpperCase()
                                : '?',
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ),
                      const SizedBox(width: 6),
                      Text(
                        assign.employeeName,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF111827),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label, Color color,
      {double size = 12}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: size, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: size,
              fontWeight: FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
