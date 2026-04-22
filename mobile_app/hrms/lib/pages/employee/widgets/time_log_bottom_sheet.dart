import 'package:flutter/material.dart';

import '../../../models/time_log_model.dart';
import '../../../services/employee_service.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';

void showTimeLogBottomSheet(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => const _TimeLogSheet(),
  );
}

class _TimeLogSheet extends StatefulWidget {
  const _TimeLogSheet();

  @override
  State<_TimeLogSheet> createState() => _TimeLogSheetState();
}

class _TimeLogSheetState extends State<_TimeLogSheet> {
  bool _loading = true;
  bool _submitting = false;
  List<Project> _projects = const [];
  List<TimeEntry> _entries = const [];

  int? _selectedProjectId;
  final _minutesCtrl = TextEditingController(text: '30');
  final _jobCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _minutesCtrl.dispose();
    _jobCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final projectsRes = await EmployeeService.getTimeLogProjects();
    final entriesRes = await EmployeeService.getTimeEntries();
    setState(() {
      _projects = projectsRes.data ?? const [];
      _entries = entriesRes.data ?? const [];
      _selectedProjectId ??= _projects.isNotEmpty ? _projects.first.id : null;
      _loading = false;
    });
  }

  Future<void> _submit() async {
    final pid = _selectedProjectId;
    final minutes = int.tryParse(_minutesCtrl.text.trim()) ?? 0;
    if (pid == null || minutes <= 0) return;

    setState(() => _submitting = true);
    final res = await EmployeeService.createTimeEntry(
      projectId: pid,
      minutes: minutes,
      jobName: _jobCtrl.text.trim().isEmpty ? null : _jobCtrl.text.trim(),
      description: _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
    );
    setState(() => _submitting = false);

    if (!mounted) return;
    if (res.success) {
      _jobCtrl.clear();
      _descCtrl.clear();
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Time logged')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(res.message ?? 'Failed to log time')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + bottom),
        child: GlassCard(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 5,
                decoration: BoxDecoration(
                  color: AppStitchTheme.lightOutline.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Log time for today',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: AppStitchTheme.lightOnSurface,
                          ),
                    ),
                  ),
                  IconButton(
                    onPressed: _loading ? null : _load,
                    icon: const Icon(Icons.refresh_rounded),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.all(18.0),
                  child: CircularProgressIndicator(),
                )
              else ...[
                DropdownButtonFormField<int>(
                  key: ValueKey<int>(_selectedProjectId ?? -1),
                  initialValue: _selectedProjectId,
                  items: _projects
                      .map((p) => DropdownMenuItem(
                            value: p.id,
                            child: Text(p.name),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _selectedProjectId = v),
                  decoration: const InputDecoration(labelText: 'Project'),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _jobCtrl,
                        decoration: const InputDecoration(labelText: 'Job name'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    SizedBox(
                      width: 110,
                      child: TextField(
                        controller: _minutesCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Minutes'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _descCtrl,
                  minLines: 2,
                  maxLines: 4,
                  decoration: const InputDecoration(labelText: 'Description'),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    child: _submitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Text('Submit'),
                  ),
                ),
                const SizedBox(height: 10),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Today’s entries',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: AppStitchTheme.lightOnSurface,
                        ),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 180,
                  child: _entries.isEmpty
                      ? Center(
                          child: Text(
                            'No entries yet',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: AppStitchTheme.lightOnSurfaceMuted,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                        )
                      : ListView.separated(
                          itemCount: _entries.length,
                          separatorBuilder: (context, index) => Divider(
                            color: AppStitchTheme.lightOutline.withValues(alpha: 0.4),
                          ),
                          itemBuilder: (context, i) {
                            final e = _entries[i];
                            return ListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              title: Text(
                                e.projectName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyLarge
                                    ?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      color: AppStitchTheme.lightOnSurface,
                                    ),
                              ),
                              subtitle: Text(
                                e.jobName.isNotEmpty ? e.jobName : e.description,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                      color: AppStitchTheme.lightOnSurfaceMuted,
                                      fontWeight: FontWeight.w600,
                                    ),
                              ),
                              trailing: Text(
                                '${e.minutes}m',
                                style: Theme.of(context)
                                    .textTheme
                                    .labelLarge
                                    ?.copyWith(
                                      fontWeight: FontWeight.w900,
                                      color: AppStitchTheme.primary,
                                    ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

