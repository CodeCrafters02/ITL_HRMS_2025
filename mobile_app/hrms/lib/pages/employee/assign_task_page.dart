import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../models/task_model.dart';
import '../../models/reportee_model.dart';
import '../../services/employee_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';
import '../../widgets/app_header.dart';

class AssignTaskPage extends StatefulWidget {
  const AssignTaskPage({super.key});

  @override
  State<AssignTaskPage> createState() => _AssignTaskPageState();
}

class _AssignTaskPageState extends State<AssignTaskPage> with SingleTickerProviderStateMixin {
  bool _isLoadingTasks = true;
  bool _isSubmitting = false;
  bool _showCreateForm = false;
  List<Task> _tasks = [];
  List<Reportee> _reportees = [];
  String _searchQuery = '';
  int? _expandedTaskId;
  late AnimationController _animationController;
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

  // Form Controllers
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  DateTime? _selectedDeadline;
  String _priority = 'medium';
  List<int> _selectedEmployeeIds = [];
  int? _ownerId;
  bool _hasSubtasks = false;
  List<Map<String, dynamic>> _subtasks = [];

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _loadInitialData();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
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

  Future<void> _loadInitialData() async {
    setState(() => _isLoadingTasks = true);
    await Future.wait([
      _loadTasks(),
      _loadReportees(),
    ]);
    setState(() => _isLoadingTasks = false);
  }

  Future<void> _loadTasks() async {
    final response = await EmployeeService.getAllTasks();
    if (response.success && response.data != null) {
      setState(() {
        _tasks = response.data!;
      });
    }
  }

  Future<void> _loadReportees() async {
    final empId = await EmployeeService.getCurrentEmployeeId();
    if (empId != null) {
      final reporteesResponse = await EmployeeService.getReportees(empId);
      if (reporteesResponse.success && reporteesResponse.data != null) {
        setState(() {
          _reportees = reporteesResponse.data!;
        });
      }
    }
  }

  void _toggleCreateForm() {
    setState(() {
      _showCreateForm = !_showCreateForm;
      if (!_showCreateForm) {
        _resetForm();
      }
    });
  }

  void _resetForm() {
    _titleController.clear();
    _descController.clear();
    _selectedDeadline = null;
    _priority = 'medium';
    _selectedEmployeeIds = [];
    _ownerId = null;
    _hasSubtasks = false;
    _subtasks = [];
  }

  Future<void> _handleSubmit() async {
    if (_titleController.text.isEmpty || _selectedDeadline == null || _selectedEmployeeIds.isEmpty || _ownerId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all required fields')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    // Validate subtasks if any
    if (_hasSubtasks) {
      for (var i = 0; i < _subtasks.length; i++) {
        if (_subtasks[i]['title'].toString().isEmpty) {
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Please enter a title for subtask ${i + 1}')),
          );
          return;
        }
        // If subtask has no assignees, default to parent's assignees
        if ((_subtasks[i]['assignedEmployees'] as List).isEmpty) {
          _subtasks[i]['assignedEmployees'] = _selectedEmployeeIds;
        }
        // If subtask has no owner, default to parent's owner
        if (_subtasks[i]['taskOwner'] == null) {
          _subtasks[i]['taskOwner'] = _ownerId;
        }
      }
    }

    final response = await EmployeeService.createTask(
      title: _titleController.text,
      description: _descController.text,
      deadline: DateFormat('yyyy-MM-dd').format(_selectedDeadline!),
      priority: _priority,
      status: 'todo',
      assignedEmployees: _selectedEmployeeIds,
      taskOwner: _ownerId!,
      subtasks: _hasSubtasks ? _subtasks : null,
    );

    if (response.success && response.data != null) {
      HapticFeedback.heavyImpact();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Task assigned successfully!')),
      );
      _toggleCreateForm();
      _loadTasks();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(response.message ?? 'Failed to create task')),
      );
    }

    setState(() => _isSubmitting = false);
  }

  void _addSubtask() {
    setState(() {
      _subtasks.add({
        'title': '',
        'description': '',
        'deadline': _selectedDeadline != null ? DateFormat('yyyy-MM-dd').format(_selectedDeadline!) : '',
        'priority': 'medium',
        'assignedEmployees': [],
        'taskOwner': null,
      });
    });
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
                AppHeader(
                  title: 'Assign Task',
                  subtitle: _showCreateForm ? 'New team assignment' : 'Manage your team',
                  showBackButton: true,
                  actions: [
                    if (_showCreateForm)
                      IconButton(
                        onPressed: _toggleCreateForm,
                        icon: const Icon(Icons.close_rounded),
                        style: IconButton.styleFrom(
                          backgroundColor: AppStitchTheme.lightOutline.withValues(alpha: 0.1),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      )
                    else
                      _CountPill(count: _tasks.length),
                  ],
                ),
                if (!_showCreateForm) ...[
                  const SizedBox(height: 12),
                  _buildSearchBar(),
                ],
                const SizedBox(height: 12),
                Expanded(
                  child: _showCreateForm ? _buildCreateForm() : _buildTaskList(),
                ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: _showCreateForm
          ? null
          : FloatingActionButton.extended(
              onPressed: _toggleCreateForm,
              backgroundColor: AppStitchTheme.primary,
              icon: const Icon(Icons.add_task_rounded, color: Colors.white),
              label: const Text('New Task', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white)),
            ),
    );
  }

  Widget _buildSearchBar() {
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: TextField(
        onChanged: (v) => setState(() => _searchQuery = v),
        style: const TextStyle(fontWeight: FontWeight.w600),
        decoration: InputDecoration(
          hintText: 'Search team tasks...',
          hintStyle: TextStyle(color: AppStitchTheme.lightOnSurfaceMuted.withValues(alpha: 0.6)),
          prefixIcon: const Icon(Icons.search, color: AppStitchTheme.primary),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _buildTaskList() {
    final filteredTasks = _tasks.where((t) => t.title.toLowerCase().contains(_searchQuery.toLowerCase())).toList();

    if (_isLoadingTasks) {
      return const Center(child: CircularProgressIndicator(color: AppStitchTheme.primary));
    }

    if (filteredTasks.isEmpty) {
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
                  Icons.assignment_outlined,
                  color: AppStitchTheme.primary,
                  size: 28,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                _searchQuery.isEmpty ? 'No tasks assigned yet' : 'No tasks match your search',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: AppStitchTheme.lightOnSurface,
                    ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        const SliverToBoxAdapter(child: SizedBox(height: 8)),
        ..._dateCategories.map((category) {
          final groupTasks = filteredTasks.where((t) => _getDateCategory(t.deadline) == category).toList();
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

  Widget _buildTaskCard(Task task, int index) {
    final isExpanded = _expandedTaskId == task.id;

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
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          task.title,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.3,
                            color: AppStitchTheme.lightOnSurface,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 10),
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
                        ),
                      ),
                    ],
                  ),
                  if (isExpanded) ...[
                    const SizedBox(height: 16),
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
                    Row(
                      children: [
                        _buildInfoChip(
                          Icons.calendar_today_rounded,
                          task.deadline,
                          AppStitchTheme.primary,
                        ),
                        const SizedBox(width: 12),
                        _buildInfoChip(
                          Icons.people_outline,
                          '${task.assignments.length} Assignees',
                          Colors.orange,
                        ),
                      ],
                    ),
                    if (task.assignments.isNotEmpty) ...[
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
                        children: task.assignments.map((a) => _buildAvatarChip(a.employeeName, a.avatarUrl)).toList(),
                      ),
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

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high': return const Color(0xFFEF4444);
      case 'medium': return const Color(0xFFF59E0B);
      case 'low': return const Color(0xFF10B981);
      default: return const Color(0xFF6B7280);
    }
  }

  IconData _getPriorityIcon(String priority) {
    switch (priority.toLowerCase()) {
      case 'high': return Icons.priority_high;
      case 'medium': return Icons.remove;
      case 'low': return Icons.arrow_downward;
      default: return Icons.circle;
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'done': return const Color(0xFF10B981);
      case 'inprogress': return const Color(0xFF3B82F6);
      case 'inreview': return const Color(0xFF8B5CF6);
      default: return const Color(0xFF6B7280);
    }
  }

  Widget _buildAvatarChip(String name, [String? avatarUrl]) {
    return Container(
      padding: const EdgeInsets.fromLTRB(4, 4, 10, 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            radius: 10,
            backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
            backgroundColor: AppStitchTheme.primary.withValues(alpha: 0.1),
            child: avatarUrl == null
                ? Text(name.isNotEmpty ? name[0].toUpperCase() : '?', style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold))
                : null,
          ),
          const SizedBox(width: 8),
          Text(name, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppStitchTheme.lightOnSurface)),
        ],
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppStitchTheme.lightOnSurface)),
        ],
      ),
    );
  }

  Widget _buildCreateForm() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 120),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          _buildSectionHeader('DETAILS', Icons.assignment_outlined),
          const SizedBox(height: 12),
          GlassCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _buildTextField(_titleController, 'Task Title', Icons.title_rounded),
                Divider(height: 1, color: AppStitchTheme.lightOutline.withValues(alpha: 0.1)),
                _buildTextField(_descController, 'Description (optional)', Icons.notes_rounded, maxLines: 3),
                Divider(height: 1, color: AppStitchTheme.lightOutline.withValues(alpha: 0.1)),
                Row(
                  children: [
                    Expanded(child: _buildDatePickerInline()),
                    Container(width: 1, height: 40, color: AppStitchTheme.lightOutline.withValues(alpha: 0.1)),
                    Expanded(child: _buildPriorityDropdownInline()),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          _buildSectionHeader('ASSIGNMENT', Icons.people_outline_rounded),
          const SizedBox(height: 12),
          GlassCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _buildEmployeeMultiSelectInline(),
                if (_selectedEmployeeIds.isNotEmpty) ...[
                  Divider(height: 1, color: AppStitchTheme.lightOutline.withValues(alpha: 0.1)),
                  _buildOwnerSelectorInline(),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),
          _buildSubtaskSectionInline(),
          const SizedBox(height: 40),
          _buildSubmitButton(),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppStitchTheme.primary),
        const SizedBox(width: 8),
        Text(
          title,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                letterSpacing: 1.5,
                fontWeight: FontWeight.w900,
                color: AppStitchTheme.lightOnSurfaceMuted,
              ),
        ),
      ],
    );
  }

  Widget _buildTaskDetailsCard() {
    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          _buildTextField(_titleController, 'What needs to be done?', Icons.title_rounded),
          Divider(height: 1, color: AppStitchTheme.lightOutline.withValues(alpha: 0.1)),
          _buildTextField(_descController, 'Add more details (optional)...', Icons.description_rounded, maxLines: 3),
        ],
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String hint, IconData icon, {int maxLines = 1}) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: AppStitchTheme.lightOnSurfaceMuted.withValues(alpha: 0.4)),
        prefixIcon: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Icon(icon, color: AppStitchTheme.primary.withValues(alpha: 0.7), size: 20),
        ),
        border: InputBorder.none,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
    );
  }

  Widget _buildDatePickerInline() {
    return InkWell(
      onTap: () async {
        final date = await showDatePicker(
          context: context,
          initialDate: DateTime.now().add(const Duration(days: 1)),
          firstDate: DateTime.now(),
          lastDate: DateTime.now().add(const Duration(days: 365)),
        );
        if (date != null) setState(() => _selectedDeadline = date);
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Row(
          children: [
            Icon(Icons.calendar_today_rounded, size: 16, color: AppStitchTheme.primary.withValues(alpha: 0.7)),
            const SizedBox(width: 10),
            Text(
              _selectedDeadline == null ? 'Deadline' : DateFormat('MMM dd').format(_selectedDeadline!),
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: _selectedDeadline == null ? AppStitchTheme.lightOnSurfaceMuted : AppStitchTheme.lightOnSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPriorityDropdownInline() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _priority,
          isExpanded: true,
          icon: Icon(Icons.arrow_drop_down_rounded, color: AppStitchTheme.primary.withValues(alpha: 0.7)),
          onChanged: (v) => setState(() => _priority = v!),
          items: ['low', 'medium', 'high'].map((p) => DropdownMenuItem(
            value: p,
            child: Text(
              p.toUpperCase(),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
                color: _getPriorityColor(p),
              ),
            ),
          )).toList(),
        ),
      ),
    );
  }

  Widget _buildEmployeeMultiSelectInline() {
    return Column(
      children: [
        Container(
          constraints: const BoxConstraints(maxHeight: 220),
          child: ListView.separated(
            shrinkWrap: true,
            physics: const ClampingScrollPhysics(),
            itemCount: _reportees.length,
            separatorBuilder: (c, i) => Divider(height: 1, color: AppStitchTheme.lightOutline.withValues(alpha: 0.05)),
            itemBuilder: (context, index) {
              final emp = _reportees[index];
              final isSelected = _selectedEmployeeIds.contains(emp.id);
              return InkWell(
                onTap: () {
                  setState(() {
                    if (isSelected) {
                      _selectedEmployeeIds.remove(emp.id);
                      if (_ownerId == emp.id) _ownerId = null;
                    } else {
                      _selectedEmployeeIds.add(emp.id);
                    }
                  });
                  HapticFeedback.lightImpact();
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 16,
                        backgroundColor: AppStitchTheme.primary.withValues(alpha: 0.05),
                        child: Text(emp.fullName[0].toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(emp.fullName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                            Text(emp.designationName ?? '', style: const TextStyle(fontSize: 10, color: AppStitchTheme.lightOnSurfaceMuted)),
                          ],
                        ),
                      ),
                      Icon(
                        isSelected ? Icons.check_circle_rounded : Icons.circle_outlined,
                        size: 20,
                        color: isSelected ? AppStitchTheme.primary : AppStitchTheme.lightOutline.withValues(alpha: 0.3),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildOwnerSelectorInline() {
    final selectedReportees = _reportees.where((r) => _selectedEmployeeIds.contains(r.id)).toList();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value: _ownerId,
          hint: Row(
            children: [
              Icon(Icons.person_outline_rounded, size: 16, color: AppStitchTheme.lightOnSurfaceMuted.withValues(alpha: 0.4)),
              const SizedBox(width: 10),
              const Text('Primary Owner', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            ],
          ),
          isExpanded: true,
          disabledHint: const Text('Assign team members first', style: TextStyle(fontSize: 12)),
          icon: Icon(Icons.keyboard_arrow_down_rounded, color: AppStitchTheme.primary.withValues(alpha: 0.7)),
          onChanged: _selectedEmployeeIds.isEmpty ? null : (v) => setState(() => _ownerId = v),
          items: selectedReportees.map((emp) => DropdownMenuItem(
            value: emp.id,
            child: Row(
              children: [
                const Icon(Icons.person_pin_rounded, size: 16, color: AppStitchTheme.primary),
                const SizedBox(width: 12),
                Text(emp.fullName, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
              ],
            ),
          )).toList(),
        ),
      ),
    );
  }

  Widget _buildSubtaskSectionInline() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: () => setState(() => _hasSubtasks = !_hasSubtasks),
          borderRadius: BorderRadius.circular(16),
          child: Row(
            children: [
              Icon(
                _hasSubtasks ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded,
                size: 20,
                color: _hasSubtasks ? AppStitchTheme.primary : AppStitchTheme.lightOnSurfaceMuted.withValues(alpha: 0.6),
              ),
              const SizedBox(width: 12),
              Text(
                'Break into subtasks',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  color: _hasSubtasks ? AppStitchTheme.lightOnSurface : AppStitchTheme.lightOnSurfaceMuted,
                ),
              ),
              const Spacer(),
              if (_hasSubtasks)
                TextButton.icon(
                  onPressed: _addSubtask,
                  icon: const Icon(Icons.add_circle_outline_rounded, size: 14),
                  label: const Text('Add', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11)),
                  style: TextButton.styleFrom(
                    foregroundColor: AppStitchTheme.primary,
                    visualDensity: VisualDensity.compact,
                  ),
                ),
            ],
          ),
        ),
        if (_hasSubtasks) ...[
          const SizedBox(height: 12),
          ...List.generate(_subtasks.length, (index) => _buildSubtaskItem(index)),
        ],
      ],
    );
  }

  Widget _buildSubtaskItem(int index) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppStitchTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'SUBTASK ${index + 1}',
                    style: const TextStyle(fontWeight: FontWeight.w900, color: AppStitchTheme.primary, fontSize: 10, letterSpacing: 0.5),
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent, size: 18),
                  onPressed: () => setState(() => _subtasks.removeAt(index)),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              onChanged: (v) => _subtasks[index]['title'] = v,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
              decoration: InputDecoration(
                hintText: 'What is this subtask?',
                hintStyle: TextStyle(color: AppStitchTheme.lightOnSurfaceMuted.withValues(alpha: 0.4), fontSize: 13),
                isDense: true,
                border: UnderlineInputBorder(borderSide: BorderSide(color: AppStitchTheme.lightOutline.withValues(alpha: 0.1))),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSubmitButton() {
    return Container(
      width: double.infinity,
      height: 58,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          colors: [
            AppStitchTheme.primary,
            AppStitchTheme.primary.withValues(alpha: 0.8),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: AppStitchTheme.primary.withValues(alpha: 0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: _isSubmitting ? null : _handleSubmit,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        ),
        child: _isSubmitting
            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3))
            : const Text('CREATE & ASSIGN TASK', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, letterSpacing: 1, color: Colors.white)),
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
      padding: const EdgeInsets.fromLTRB(20, 16, 12, 16),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back_rounded),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.8,
                        color: AppStitchTheme.lightOnSurface,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppStitchTheme.lightOnSurfaceMuted,
                        fontWeight: FontWeight.w700,
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
