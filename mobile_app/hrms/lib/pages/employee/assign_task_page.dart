import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/task_model.dart';
import '../../models/reportee_model.dart';
import '../../services/employee_service.dart';
import '../../services/storage_service.dart';
import '../../config/api_config.dart';
import '../../widgets/employee_app_bar.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class AssignTaskPage extends StatefulWidget {
  const AssignTaskPage({super.key});

  @override
  State<AssignTaskPage> createState() => _AssignTaskPageState();
}

class _AssignTaskPageState extends State<AssignTaskPage> {
  List<Task> _tasks = [];
  Task? _selectedTask;
  List<Reportee> _reportees = [];
  bool _isLoading = false;
  bool _isLoadingDetails = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchTasks();
    _fetchReportees();
  }

  Future<int?> _getEmployeeId() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return null;

      final response = await http.get(
        Uri.parse(ApiConfig.employeeIdUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['employee_id'] ?? data['id'];
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<void> _fetchReportees() async {
    final employeeId = await _getEmployeeId();
    if (employeeId == null) return;

    final response = await EmployeeService.getReportees(employeeId);
    if (response.success && response.data != null) {
      setState(() {
        _reportees = response.data!;
      });
    }
  }

  Future<void> _fetchTasks() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final response = await EmployeeService.getAllTasks();

    if (response.success && response.data != null) {
      setState(() {
        _tasks = response.data!;
        _isLoading = false;
      });
    } else {
      setState(() {
        _error = response.message ?? 'Failed to load tasks';
        _isLoading = false;
      });
    }
  }

  Future<void> _loadTaskDetails(int taskId) async {
    setState(() {
      _isLoadingDetails = true;
    });

    final response = await EmployeeService.getTaskDetails(taskId);

    if (response.success && response.data != null) {
      setState(() {
        _selectedTask = response.data!;
        _isLoadingDetails = false;
      });
    } else {
      setState(() {
        _isLoadingDetails = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message ?? 'Failed to load task details'),
          ),
        );
      }
    }
  }

  Future<void> _deleteTask(int taskId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Task'),
        content: const Text('Are you sure you want to delete this task?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final response = await EmployeeService.deleteTask(taskId);

      if (response.success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Task deleted successfully')),
          );
          _fetchTasks();
          if (_selectedTask?.id == taskId) {
            setState(() {
              _selectedTask = null;
            });
          }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to delete task'),
            ),
          );
        }
      }
    }
  }

  Future<void> _createTask() async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => _CreateTaskDialog(reportees: _reportees),
    );

    if (result != null) {
      final response = await EmployeeService.createTask(
        title: result['title'] as String,
        description: result['description'] as String,
        deadline: result['deadline'] as String,
        priority: result['priority'] as String,
        status: result['status'] as String,
        subtasks: result['subtasks'] as List<Map<String, dynamic>>?,
      );

      if (response.success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Task created successfully')),
          );
          _fetchTasks();

          // If employees were selected, assign them
          if (result['assignedEmployees'] != null &&
              (result['assignedEmployees'] as List<int>).isNotEmpty) {
            final taskId = response.data!.id;
            final owner = result['taskOwner'] as String?;
            final employees = result['assignedEmployees'] as List<int>;

            if (owner != null) {
              await EmployeeService.assignTask(
                taskId: taskId,
                owner: owner,
                employees: employees,
              );
            }
          }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to create task'),
            ),
          );
        }
      }
    }
  }

  Future<void> _editTask(Task task) async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => _EditTaskDialog(task: task),
    );

    if (result != null) {
      final response = await EmployeeService.updateTask(
        taskId: task.id,
        title: result['title'] as String?,
        description: result['description'] as String?,
        deadline: result['deadline'] as String?,
        priority: result['priority'] as String?,
        status: result['status'] as String?,
      );

      if (response.success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Task updated successfully')),
          );
          _fetchTasks();
          if (_selectedTask?.id == task.id) {
            _loadTaskDetails(task.id);
          }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to update task'),
            ),
          );
        }
      }
    }
  }

  Future<void> _assignTask(Task task) async {
    if (_reportees.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No reportees available to assign')),
      );
      return;
    }

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) =>
          _AssignTaskDialog(task: task, reportees: _reportees),
    );

    if (result != null) {
      final owner = result['owner'] as String;
      final employees = result['employees'] as List<int>;

      final response = await EmployeeService.assignTask(
        taskId: task.id,
        owner: owner,
        employees: employees,
      );

      if (response.success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Task assigned successfully')),
          );
          _loadTaskDetails(task.id);
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to assign task'),
            ),
          );
        }
      }
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        return const Color(0xFFDC2626);
      case 'medium':
        return const Color(0xFFF59E0B);
      case 'low':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF6B7280);
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return const Color(0xFF10B981);
      case 'in_progress':
        return const Color(0xFF3B82F6);
      case 'todo':
      case 'pending':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF6B7280);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: EmployeeAppBar(
        title: _selectedTask != null ? 'Task Details' : 'Assign Tasks',
        actions: [
          if (_selectedTask == null)
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () => _createTask(),
              tooltip: 'Create Task',
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? _buildErrorState()
          : _selectedTask != null
          ? _buildTaskDetails()
          : _buildTasksList(),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Color(0xFFDC2626)),
            const SizedBox(height: 16),
            Text(
              _error ?? 'Unknown error',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF6B7280)),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _fetchTasks,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4F46E5),
                foregroundColor: Colors.white,
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTasksList() {
    if (_tasks.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.task_outlined,
                size: 64,
                color: Color(0xFF6B7280),
              ),
              const SizedBox(height: 16),
              const Text(
                'No tasks found',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Create a task to get started',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF6B7280)),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchTasks,
      color: const Color(0xFF4F46E5),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _tasks.length,
        itemBuilder: (context, index) {
          return _buildTaskCard(_tasks[index]);
        },
      ),
    );
  }

  Widget _buildTaskCard(Task task) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => _loadTaskDetails(task.id),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      task.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF111827),
                      ),
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, size: 20),
                        color: const Color(0xFF4F46E5),
                        onPressed: () => _editTask(task),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, size: 20),
                        color: Colors.red,
                        onPressed: () => _deleteTask(task.id),
                      ),
                    ],
                  ),
                ],
              ),
              if (task.description.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  task.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  _buildChip(
                    'Priority',
                    task.priority,
                    _getPriorityColor(task.priority),
                  ),
                  const SizedBox(width: 8),
                  _buildChip(
                    'Status',
                    task.status,
                    _getStatusColor(task.status),
                  ),
                  const Spacer(),
                  if (task.deadline.isNotEmpty)
                    Text(
                      'Due: ${DateFormat('MMM dd, yyyy').format(DateTime.parse(task.deadline))}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                ],
              ),
              if (task.assignments.isNotEmpty) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(
                      Icons.people,
                      size: 16,
                      color: Color(0xFF6B7280),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${task.assignments.length} assigned',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => _assignTask(task),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Assign Task'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3), width: 1),
      ),
      child: Text(
        '$label: ${value.toUpperCase()}',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
    );
  }

  Widget _buildTaskDetails() {
    if (_isLoadingDetails) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_selectedTask == null) {
      return const Center(child: Text('No task selected'));
    }

    final task = _selectedTask!;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          task.title,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF111827),
                          ),
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit_outlined),
                            color: const Color(0xFF4F46E5),
                            onPressed: () => _editTask(task),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline),
                            color: Colors.red,
                            onPressed: () => _deleteTask(task.id),
                          ),
                        ],
                      ),
                    ],
                  ),
                  if (task.description.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      task.description,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildChip(
                        'Priority',
                        task.priority,
                        _getPriorityColor(task.priority),
                      ),
                      _buildChip(
                        'Status',
                        task.status,
                        _getStatusColor(task.status),
                      ),
                      if (task.deadline.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF6B7280)
                                .withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'Deadline: ${DateFormat('MMM dd, yyyy').format(DateTime.parse(task.deadline))}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (task.subtaskDetails.isNotEmpty) ...[
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Subtasks',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...task.subtaskDetails.map((subtask) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE5E7EB)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    subtask.title,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF111827),
                                    ),
                                  ),
                                ),
                                _buildChip(
                                  'Priority',
                                  subtask.priority,
                                  _getPriorityColor(subtask.priority),
                                ),
                                const SizedBox(width: 8),
                                _buildChip(
                                  'Status',
                                  subtask.status,
                                  _getStatusColor(subtask.status),
                                ),
                              ],
                            ),
                            if (subtask.description.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text(
                                subtask.description,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF6B7280),
                                ),
                              ),
                            ],
                            if (subtask.deadline.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text(
                                'Due: ${DateFormat('MMM dd, yyyy').format(DateTime.parse(subtask.deadline))}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF6B7280),
                                ),
                              ),
                            ],
                            if (subtask.assignments.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  const Icon(
                                    Icons.people,
                                    size: 14,
                                    color: Color(0xFF6B7280),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    '${subtask.assignments.length} assigned',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF6B7280),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
          if (task.assignments.isNotEmpty) ...[
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Assigned Employees',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...task.assignments.map((assignment) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            if (assignment.avatarUrl != null)
                              CircleAvatar(
                                radius: 16,
                                backgroundImage: NetworkImage(
                                  assignment.avatarUrl!,
                                ),
                              )
                            else
                              CircleAvatar(
                                radius: 16,
                                backgroundColor: const Color(0xFFE5E7EB),
                                child: Text(
                                  assignment.employeeName.isNotEmpty
                                      ? assignment.employeeName[0].toUpperCase()
                                      : '?',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF111827),
                                  ),
                                ),
                              ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    assignment.employeeName,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                      color: Color(0xFF111827),
                                    ),
                                  ),
                                  Text(
                                    '${assignment.role} • ${assignment.status}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF6B7280),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => _assignTask(task),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4F46E5),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text('Assign to Employees'),
            ),
          ),
        ],
      ),
    );
  }
}

class _AssignTaskDialog extends StatefulWidget {
  final Task task;
  final List<Reportee> reportees;

  const _AssignTaskDialog({required this.task, required this.reportees});

  @override
  State<_AssignTaskDialog> createState() => _AssignTaskDialogState();
}

class _AssignTaskDialogState extends State<_AssignTaskDialog> {
  String? _selectedOwner;
  final Set<int> _selectedEmployees = {};

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.9,
          maxHeight: MediaQuery.of(context).size.height * 0.8,
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Assign Task',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 24),
            // Task Owner
            const Text(
              'Task Owner *',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _selectedOwner,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: 'Select task owner',
              ),
              items: widget.reportees.map((reportee) {
                return DropdownMenuItem(
                  value: reportee.id.toString(),
                  child: Text(reportee.fullName),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedOwner = value;
                });
              },
            ),
            const SizedBox(height: 24),
            // Assignees
            const Text(
              'Assign to Employees *',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 8),
            Container(
              constraints: const BoxConstraints(maxHeight: 200),
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFFE5E7EB)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: widget.reportees.length,
                itemBuilder: (context, index) {
                  final reportee = widget.reportees[index];
                  final isSelected = _selectedEmployees.contains(reportee.id);
                  return CheckboxListTile(
                    title: Text(reportee.fullName),
                    subtitle: reportee.designationName != null
                        ? Text(reportee.designationName!)
                        : null,
                    value: isSelected,
                    onChanged: (value) {
                      setState(() {
                        if (value == true) {
                          _selectedEmployees.add(reportee.id);
                        } else {
                          _selectedEmployees.remove(reportee.id);
                        }
                      });
                    },
                  );
                },
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed:
                      _selectedOwner != null && _selectedEmployees.isNotEmpty
                      ? () {
                          Navigator.pop(context, {
                            'owner': _selectedOwner,
                            'employees': _selectedEmployees.toList(),
                          });
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Assign'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CreateTaskDialog extends StatefulWidget {
  final List<Reportee> reportees;

  const _CreateTaskDialog({required this.reportees});

  @override
  State<_CreateTaskDialog> createState() => _CreateTaskDialogState();
}

class _CreateTaskDialogState extends State<_CreateTaskDialog> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  DateTime? _selectedDeadline;
  String _priority = 'medium';
  String _status = 'todo';
  bool _hasSubtasks = false;
  final List<Map<String, dynamic>> _subtasks = [];
  String? _selectedOwner;
  final Set<int> _selectedEmployees = {};

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _addSubtask() {
    setState(() {
      _subtasks.add({
        'title': '',
        'description': '',
        'deadline': '',
        'priority': 'medium',
        'status': 'todo',
      });
    });
  }

  void _removeSubtask(int index) {
    setState(() {
      _subtasks.removeAt(index);
    });
  }

  Future<void> _selectDeadline() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        _selectedDeadline = picked;
      });
    }
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      if (_selectedDeadline == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a deadline')),
        );
        return;
      }

      final result = <String, dynamic>{
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim(),
        'deadline': _selectedDeadline!.toIso8601String().split('T')[0],
        'priority': _priority,
        'status': _status,
      };

      if (_hasSubtasks && _subtasks.isNotEmpty) {
        final validSubtasks = _subtasks
            .where((subtask) {
              return subtask['title'].toString().trim().isNotEmpty;
            })
            .map((subtask) {
              return {
                'title': subtask['title'].toString().trim(),
                'description': subtask['description'].toString().trim(),
                'deadline': subtask['deadline'].toString().isNotEmpty
                    ? subtask['deadline']
                    : null,
                'priority': subtask['priority'] ?? 'medium',
                'status': subtask['status'] ?? 'todo',
              };
            })
            .toList();

        if (validSubtasks.isNotEmpty) {
          result['subtasks'] = validSubtasks;
        }
      }

      if (_selectedOwner != null && _selectedEmployees.isNotEmpty) {
        result['taskOwner'] = _selectedOwner;
        result['assignedEmployees'] = _selectedEmployees.toList();
      }

      Navigator.pop(context, result);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.9,
          maxHeight: MediaQuery.of(context).size.height * 0.9,
        ),
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Create Task',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Title
                      TextFormField(
                        controller: _titleController,
                        decoration: const InputDecoration(
                          labelText: 'Title *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Please enter a title';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      // Description
                      TextFormField(
                        controller: _descriptionController,
                        decoration: const InputDecoration(
                          labelText: 'Description',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 3,
                      ),
                      const SizedBox(height: 16),
                      // Deadline
                      InkWell(
                        onTap: _selectDeadline,
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Deadline *',
                            border: OutlineInputBorder(),
                          ),
                          child: Text(
                            _selectedDeadline != null
                                ? DateFormat(
                                    'yyyy-MM-dd',
                                  ).format(_selectedDeadline!)
                                : 'Select deadline',
                            style: TextStyle(
                              color: _selectedDeadline != null
                                  ? const Color(0xFF111827)
                                  : const Color(0xFF9CA3AF),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Priority
                      DropdownButtonFormField<String>(
                        initialValue: _priority,
                        decoration: const InputDecoration(
                          labelText: 'Priority',
                          border: OutlineInputBorder(),
                        ),
                        items: ['low', 'medium', 'high'].map((priority) {
                          return DropdownMenuItem(
                            value: priority,
                            child: Text(priority.toUpperCase()),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            _priority = value!;
                          });
                        },
                      ),
                      const SizedBox(height: 16),
                      // Status
                      DropdownButtonFormField<String>(
                        initialValue: _status,
                        decoration: const InputDecoration(
                          labelText: 'Status',
                          border: OutlineInputBorder(),
                        ),
                        items: ['todo', 'in_progress', 'completed'].map((
                          status,
                        ) {
                          return DropdownMenuItem(
                            value: status,
                            child: Text(
                              status.replaceAll('_', ' ').toUpperCase(),
                            ),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            _status = value!;
                          });
                        },
                      ),
                      const SizedBox(height: 24),
                      // Subtasks toggle
                      Row(
                        children: [
                          Checkbox(
                            value: _hasSubtasks,
                            onChanged: (value) {
                              setState(() {
                                _hasSubtasks = value ?? false;
                                if (_hasSubtasks && _subtasks.isEmpty) {
                                  _addSubtask();
                                }
                              });
                            },
                          ),
                          const Text('Add Subtasks'),
                        ],
                      ),
                      if (_hasSubtasks) ...[
                        const SizedBox(height: 16),
                        ...List.generate(_subtasks.length, (index) {
                          return _buildSubtaskForm(index);
                        }),
                        TextButton.icon(
                          onPressed: _addSubtask,
                          icon: const Icon(Icons.add),
                          label: const Text('Add Subtask'),
                        ),
                      ],
                      const SizedBox(height: 24),
                      // Assign employees (optional)
                      if (widget.reportees.isNotEmpty) ...[
                        const Text(
                          'Assign to Employees (Optional)',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF111827),
                          ),
                        ),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          initialValue: _selectedOwner,
                          decoration: const InputDecoration(
                            border: OutlineInputBorder(),
                            hintText: 'Select task owner',
                          ),
                          items: widget.reportees.map((reportee) {
                            return DropdownMenuItem(
                              value: reportee.id.toString(),
                              child: Text(reportee.fullName),
                            );
                          }).toList(),
                          onChanged: (value) {
                            setState(() {
                              _selectedOwner = value;
                            });
                          },
                        ),
                        const SizedBox(height: 8),
                        Container(
                          constraints: const BoxConstraints(maxHeight: 150),
                          decoration: BoxDecoration(
                            border: Border.all(color: const Color(0xFFE5E7EB)),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: ListView.builder(
                            shrinkWrap: true,
                            itemCount: widget.reportees.length,
                            itemBuilder: (context, index) {
                              final reportee = widget.reportees[index];
                              final isSelected = _selectedEmployees.contains(
                                reportee.id,
                              );
                              return CheckboxListTile(
                                title: Text(reportee.fullName),
                                value: isSelected,
                                onChanged: (value) {
                                  setState(() {
                                    if (value == true) {
                                      _selectedEmployees.add(reportee.id);
                                    } else {
                                      _selectedEmployees.remove(reportee.id);
                                    }
                                  });
                                },
                              );
                            },
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Create'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSubtaskForm(int index) {
    final subtask = _subtasks[index];
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFE5E7EB)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  initialValue: subtask['title'],
                  decoration: const InputDecoration(
                    labelText: 'Subtask Title',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  onChanged: (value) {
                    subtask['title'] = value;
                  },
                ),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: Colors.red),
                onPressed: () => _removeSubtask(index),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextFormField(
            initialValue: subtask['description'],
            decoration: const InputDecoration(
              labelText: 'Description',
              border: OutlineInputBorder(),
              isDense: true,
            ),
            maxLines: 2,
            onChanged: (value) {
              subtask['description'] = value;
            },
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: subtask['priority'] ?? 'medium',
                  decoration: const InputDecoration(
                    labelText: 'Priority',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  items: ['low', 'medium', 'high'].map((priority) {
                    return DropdownMenuItem(
                      value: priority,
                      child: Text(priority.toUpperCase()),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      subtask['priority'] = value;
                    });
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: subtask['status'] ?? 'todo',
                  decoration: const InputDecoration(
                    labelText: 'Status',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  items: ['todo', 'in_progress', 'completed'].map((status) {
                    return DropdownMenuItem(
                      value: status,
                      child: Text(status.replaceAll('_', ' ').toUpperCase()),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      subtask['status'] = value;
                    });
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _EditTaskDialog extends StatefulWidget {
  final Task task;

  const _EditTaskDialog({required this.task});

  @override
  State<_EditTaskDialog> createState() => _EditTaskDialogState();
}

class _EditTaskDialogState extends State<_EditTaskDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  DateTime? _selectedDeadline;
  late String _priority;
  late String _status;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.task.title);
    _descriptionController = TextEditingController(
      text: widget.task.description,
    );
    _priority = widget.task.priority;
    _status = widget.task.status;
    if (widget.task.deadline.isNotEmpty) {
      try {
        _selectedDeadline = DateTime.parse(widget.task.deadline);
      } catch (e) {
        // Invalid date format
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _selectDeadline() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDeadline ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        _selectedDeadline = picked;
      });
    }
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      final result = <String, dynamic>{
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim(),
        'priority': _priority,
        'status': _status,
      };

      if (_selectedDeadline != null) {
        result['deadline'] = _selectedDeadline!.toIso8601String().split('T')[0];
      }

      Navigator.pop(context, result);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.9,
          maxHeight: MediaQuery.of(context).size.height * 0.8,
        ),
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Edit Task',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Title
                      TextFormField(
                        controller: _titleController,
                        decoration: const InputDecoration(
                          labelText: 'Title *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Please enter a title';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      // Description
                      TextFormField(
                        controller: _descriptionController,
                        decoration: const InputDecoration(
                          labelText: 'Description',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 3,
                      ),
                      const SizedBox(height: 16),
                      // Deadline
                      InkWell(
                        onTap: _selectDeadline,
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Deadline',
                            border: OutlineInputBorder(),
                          ),
                          child: Text(
                            _selectedDeadline != null
                                ? DateFormat(
                                    'yyyy-MM-dd',
                                  ).format(_selectedDeadline!)
                                : 'Select deadline',
                            style: TextStyle(
                              color: _selectedDeadline != null
                                  ? const Color(0xFF111827)
                                  : const Color(0xFF9CA3AF),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Priority
                      DropdownButtonFormField<String>(
                        initialValue: _priority,
                        decoration: const InputDecoration(
                          labelText: 'Priority',
                          border: OutlineInputBorder(),
                        ),
                        items: ['low', 'medium', 'high'].map((priority) {
                          return DropdownMenuItem(
                            value: priority,
                            child: Text(priority.toUpperCase()),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            _priority = value!;
                          });
                        },
                      ),
                      const SizedBox(height: 16),
                      // Status
                      DropdownButtonFormField<String>(
                        initialValue: _status,
                        decoration: const InputDecoration(
                          labelText: 'Status',
                          border: OutlineInputBorder(),
                        ),
                        items: ['todo', 'in_progress', 'completed'].map((
                          status,
                        ) {
                          return DropdownMenuItem(
                            value: status,
                            child: Text(
                              status.replaceAll('_', ' ').toUpperCase(),
                            ),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            _status = value!;
                          });
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Update'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
