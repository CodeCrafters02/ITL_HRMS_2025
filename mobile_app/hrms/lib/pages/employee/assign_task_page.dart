import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../models/task_model.dart';
import '../../models/reportee_model.dart';
import '../../services/employee_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';

class AssignTaskPage extends StatefulWidget {
  const AssignTaskPage({super.key});

  @override
  State<AssignTaskPage> createState() => _AssignTaskPageState();
}

class _AssignTaskPageState extends State<AssignTaskPage> {
  bool _isLoadingTasks = true;
  bool _isSubmitting = false;
  bool _showCreateForm = false;
  List<Task> _tasks = [];
  List<Reportee> _reportees = [];
  String _searchQuery = '';

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
    _loadInitialData();
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

    final response = await EmployeeService.createTask(
      title: _titleController.text,
      description: _descController.text,
      deadline: DateFormat('yyyy-MM-dd').format(_selectedDeadline!),
      priority: _priority,
      status: 'todo',
      subtasks: _hasSubtasks ? _subtasks : null,
    );

    if (response.success && response.data != null) {
      // Now assign the task
      final assignResponse = await EmployeeService.assignTask(
        taskId: response.data!.id,
        owner: _ownerId.toString(),
        employees: _selectedEmployeeIds,
      );

      if (assignResponse.success) {
        HapticFeedback.heavyImpact();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task assigned successfully!')),
        );
        _toggleCreateForm();
        _loadTasks();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(assignResponse.message ?? 'Assignment failed')),
        );
      }
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
      body: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: _showCreateForm ? _buildCreateForm() : _buildTaskList(),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 60, 20, 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF220FB6),
            const Color(0xFF4F6BE5),
            const Color(0xFF0F52AF),
          ],
        ),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF220FB6).withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Assign Task',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Manage team execution',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
              ElevatedButton(
                onPressed: _toggleCreateForm,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _showCreateForm ? Colors.redAccent.withOpacity(0.2) : Colors.white,
                  foregroundColor: _showCreateForm ? Colors.white : const Color(0xFF220FB6),
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                child: Text(
                  _showCreateForm ? 'Cancel' : '+ New Task',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          if (!_showCreateForm) ...[
            const SizedBox(height: 24),
            _buildSearchBar(),
          ],
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: TextField(
        onChanged: (v) => setState(() => _searchQuery = v),
        style: const TextStyle(color: Colors.white),
        decoration: InputDecoration(
          hintText: 'Search tasks...',
          hintStyle: TextStyle(color: Colors.white.withOpacity(0.6)),
          prefixIcon: const Icon(Icons.search, color: Colors.white70),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
        ),
      ),
    );
  }

  Widget _buildTaskList() {
    final filteredTasks = _tasks.where((t) => t.title.toLowerCase().contains(_searchQuery.toLowerCase())).toList();

    if (_isLoadingTasks) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF220FB6)));
    }

    if (filteredTasks.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment_outlined, size: 64, color: Colors.grey.withOpacity(0.5)),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isEmpty ? 'No tasks assigned yet' : 'No tasks match your search',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: filteredTasks.length,
      separatorBuilder: (c, i) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final task = filteredTasks[index];
        return _buildTaskCard(task);
      },
    );
  }

  Widget _buildTaskCard(Task task) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  task.title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                ),
              ),
              _buildPriorityBadge(task.priority),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            task.description,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildInfoChip(Icons.calendar_today_outlined, task.deadline, Colors.blue),
              const SizedBox(width: 12),
              _buildInfoChip(Icons.people_outline, '${task.assignments.length} Assignees', Colors.orange),
            ],
          ),
          const SizedBox(height: 16),
          _buildProgressBar(task.progress),
        ],
      ),
    );
  }

  Widget _buildPriorityBadge(String priority) {
    Color color;
    switch (priority.toLowerCase()) {
      case 'high': color = Colors.red; break;
      case 'medium': color = Colors.orange; break;
      default: color = Colors.green;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        priority.toUpperCase(),
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label, Color color) {
    return Row(
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
      ],
    );
  }

  Widget _buildProgressBar(int progress) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Progress', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
            Text('$progress%', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: progress / 100,
            backgroundColor: Colors.grey.withOpacity(0.1),
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF220FB6)),
            minHeight: 6,
          ),
        ),
      ],
    );
  }

  Widget _buildCreateForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('TASK DETAILS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2, color: Colors.grey)),
          const SizedBox(height: 16),
          _buildTextField(_titleController, 'Task Title', Icons.title),
          const SizedBox(height: 16),
          _buildTextField(_descController, 'Description', Icons.description, maxLines: 3),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(child: _buildDatePicker()),
              const SizedBox(width: 16),
              Expanded(child: _buildPriorityDropdown()),
            ],
          ),
          const SizedBox(height: 32),
          const Text('TEAM ASSIGNMENT', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2, color: Colors.grey)),
          const SizedBox(height: 16),
          _buildEmployeeMultiSelect(),
          const SizedBox(height: 24),
          const Text('TASK OWNER', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2, color: Colors.grey)),
          const SizedBox(height: 8),
          _buildOwnerSelector(),
          const SizedBox(height: 32),
          _buildSubtaskSection(),
          const SizedBox(height: 40),
          _buildSubmitButton(),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String hint, IconData icon, {int maxLines = 1}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: TextField(
        controller: controller,
        maxLines: maxLines,
        decoration: InputDecoration(
          hintText: hint,
          prefixIcon: Icon(icon, color: const Color(0xFF220FB6)),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildDatePicker() {
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
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_today, size: 20, color: Color(0xFF220FB6)),
            const SizedBox(width: 8),
            Text(
              _selectedDeadline == null ? 'Deadline' : DateFormat('MMM dd, yyyy').format(_selectedDeadline!),
              style: TextStyle(color: _selectedDeadline == null ? Colors.grey : Colors.black),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPriorityDropdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _priority,
          isExpanded: true,
          onChanged: (v) => setState(() => _priority = v!),
          items: ['low', 'medium', 'high'].map((p) => DropdownMenuItem(
            value: p,
            child: Text(p.toUpperCase(), style: const TextStyle(fontSize: 14)),
          )).toList(),
        ),
      ),
    );
  }

  Widget _buildEmployeeMultiSelect() {
    return Container(
      constraints: const BoxConstraints(maxHeight: 250),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: ListView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: _reportees.length,
        itemBuilder: (context, index) {
          final emp = _reportees[index];
          final isSelected = _selectedEmployeeIds.contains(emp.id);
          return CheckboxListTile(
            title: Text(emp.fullName, style: const TextStyle(fontSize: 14)),
            subtitle: Text(emp.designationName ?? '', style: const TextStyle(fontSize: 12)),
            value: isSelected,
            activeColor: const Color(0xFF220FB6),
            onChanged: (val) {
              setState(() {
                if (val!) {
                  _selectedEmployeeIds.add(emp.id);
                } else {
                  _selectedEmployeeIds.remove(emp.id);
                  if (_ownerId == emp.id) _ownerId = null;
                }
              });
            },
          );
        },
      ),
    );
  }

  Widget _buildOwnerSelector() {
    final selectedReportees = _reportees.where((r) => _selectedEmployeeIds.contains(r.id)).toList();
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: _selectedEmployeeIds.isEmpty ? Colors.grey.shade100 : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value: _ownerId,
          hint: const Text('Select primary owner'),
          isExpanded: true,
          disabledHint: const Text('Assign employees first'),
          onChanged: _selectedEmployeeIds.isEmpty ? null : (v) => setState(() => _ownerId = v),
          items: selectedReportees.map((emp) => DropdownMenuItem(
            value: emp.id,
            child: Text(emp.fullName, style: const TextStyle(fontSize: 14)),
          )).toList(),
        ),
      ),
    );
  }

  Widget _buildSubtaskSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Checkbox(
                  value: _hasSubtasks,
                  activeColor: const Color(0xFF220FB6),
                  onChanged: (v) => setState(() => _hasSubtasks = v!),
                ),
                const Text('Has Subtasks?', style: TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            if (_hasSubtasks)
              TextButton.icon(
                onPressed: _addSubtask,
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Add Subtask'),
              ),
          ],
        ),
        if (_hasSubtasks) ...[
          const SizedBox(height: 12),
          ...List.generate(_subtasks.length, (index) => _buildSubtaskItem(index)),
        ],
      ],
    );
  }

  Widget _buildSubtaskItem(int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Subtask ${index + 1}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF220FB6))),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: Colors.red),
                onPressed: () => setState(() => _subtasks.removeAt(index)),
              ),
            ],
          ),
          TextField(
            onChanged: (v) => _subtasks[index]['title'] = v,
            decoration: const InputDecoration(hintText: 'Subtask title', isDense: true),
          ),
          const SizedBox(height: 12),
          TextField(
            onChanged: (v) => _subtasks[index]['description'] = v,
            maxLines: 2,
            decoration: const InputDecoration(hintText: 'Description', isDense: true),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitButton() {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isSubmitting ? null : _handleSubmit,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF220FB6),
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 8,
          shadowColor: const Color(0xFF220FB6).withOpacity(0.5),
        ),
        child: _isSubmitting
          ? const CircularProgressIndicator(color: Colors.white)
          : const Text('CREATE & ASSIGN TASK', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
      ),
    );
  }
}
