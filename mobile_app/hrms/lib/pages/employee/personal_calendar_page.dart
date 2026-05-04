import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/calendar_model.dart';
import '../../models/google_calendar_model.dart';
import '../../services/employee_service.dart';
import '../../services/google_calendar_service.dart';
import '../../services/storage_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';
import '../../widgets/app_header.dart';
import 'widgets/calendar_event_dialog.dart';
import 'package:url_launcher/url_launcher.dart';

class PersonalCalendarPage extends StatefulWidget {
  const PersonalCalendarPage({super.key});

  @override
  State<PersonalCalendarPage> createState() => _PersonalCalendarPageState();
}

class _GoogleCreateEventSheet extends StatefulWidget {
  const _GoogleCreateEventSheet({
    required this.initialDate,
    required this.onCreated,
  });

  final DateTime initialDate;
  final VoidCallback onCreated;

  @override
  State<_GoogleCreateEventSheet> createState() => _GoogleCreateEventSheetState();
}

class _GoogleCreateEventSheetState extends State<_GoogleCreateEventSheet> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _guestsCtrl = TextEditingController();

  late DateTime _date;
  bool _allDay = true;
  TimeOfDay _start = const TimeOfDay(hour: 10, minute: 0);
  TimeOfDay _end = const TimeOfDay(hour: 11, minute: 0);
  bool _meet = false;
  bool _sendUpdates = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _date = DateTime(widget.initialDate.year, widget.initialDate.month,
        widget.initialDate.day);
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _guestsCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      setState(() => _date = picked);
    }
  }

  Future<void> _pickTime({required bool isStart}) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _start : _end,
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _start = picked;
        } else {
          _end = picked;
        }
      });
    }
  }

  DateTime _combine(DateTime d, TimeOfDay t) =>
      DateTime(d.year, d.month, d.day, t.hour, t.minute);

  List<String> _parseGuests(String raw) {
    return raw
        .split(RegExp(r'[,;\n]'))
        .map((s) => s.trim())
        .where((s) => s.contains('@') && s.contains('.'))
        .toList();
  }

  Future<void> _submit() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) return;

    final start = _allDay ? _date : _combine(_date, _start);
    final end = _allDay
        ? _date.add(const Duration(days: 1))
        : _combine(_date, _end);
    if (!_allDay && !end.isAfter(start)) return;

    setState(() => _saving = true);
    try {
      final guests = _parseGuests(_guestsCtrl.text);
      await GoogleCalendarService.createEvent(
        title: title,
        description: _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        start: start,
        end: end,
        allDay: _allDay,
        withMeet: _meet,
        guests: guests,
        sendUpdatesToGuests: _sendUpdates,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Saved to Google Calendar')),
      );
      widget.onCreated();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final bottom = MediaQuery.of(context).viewInsets.bottom;
          final maxH = constraints.maxHeight;
          return Padding(
            padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + bottom),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                // Keep room above keyboard; prevent RenderFlex overflow.
                maxHeight: maxH * 0.88,
              ),
              child: GlassCard(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                child: Column(
                  children: [
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 40,
                              height: 5,
                              decoration: BoxDecoration(
                                color: AppStitchTheme.lightOutline
                                    .withValues(alpha: 0.8),
                                borderRadius: BorderRadius.circular(99),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    'New Google event',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(
                                          fontWeight: FontWeight.w900,
                                          color: AppStitchTheme.lightOnSurface,
                                        ),
                                  ),
                                ),
                                IconButton(
                                  onPressed:
                                      _saving ? null : () => Navigator.pop(context),
                                  icon: const Icon(Icons.close_rounded),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: _titleCtrl,
                              decoration: const InputDecoration(labelText: 'Title'),
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: _descCtrl,
                              minLines: 2,
                              maxLines: 4,
                              decoration: const InputDecoration(
                                labelText: 'Description (optional)',
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: _saving ? null : _pickDate,
                                    icon: const Icon(Icons.calendar_today_rounded,
                                        size: 18),
                                    label: Text(
                                      DateFormat('MMM dd, yyyy').format(_date),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            SwitchListTile(
                              value: _allDay,
                              onChanged: _saving
                                  ? null
                                  : (v) => setState(() => _allDay = v),
                              title: const Text('All day'),
                              contentPadding: EdgeInsets.zero,
                            ),
                            if (!_allDay) ...[
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: _saving
                                          ? null
                                          : () => _pickTime(isStart: true),
                                      child:
                                          Text('Start: ${_start.format(context)}'),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: _saving
                                          ? null
                                          : () => _pickTime(isStart: false),
                                      child: Text('End: ${_end.format(context)}'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                            const SizedBox(height: 10),
                            TextField(
                              controller: _guestsCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Guests (emails, comma separated)',
                              ),
                            ),
                            const SizedBox(height: 6),
                            SwitchListTile(
                              value: _sendUpdates,
                              onChanged: _saving
                                  ? null
                                  : (v) => setState(() => _sendUpdates = v),
                              title: const Text('Send email updates to guests'),
                              contentPadding: EdgeInsets.zero,
                            ),
                            SwitchListTile(
                              value: _meet,
                              onChanged: _saving
                                  ? null
                                  : (v) => setState(() => _meet = v),
                              title: const Text('Add Google Meet link'),
                              contentPadding: EdgeInsets.zero,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _saving ? null : _submit,
                        child:
                            Text(_saving ? 'Saving…' : 'Create in Google Calendar'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _PersonalCalendarPageState extends State<PersonalCalendarPage> {
  CalendarData? _calendarData;
  bool _isLoading = false;
  String? _error;
  DateTime _currentMonth = DateTime.now();
  DateTime? _selectedDate;
  List<CalendarEvent> _selectedDateEvents = [];

  int _tabIndex = 0; // 0 = HRMS, 1 = Google
  bool _googleLoading = false;
  String? _googleError;
  bool _googleConnected = false;
  List<GoogleCalendarEvent> _googleEvents = [];

  @override
  void initState() {
    super.initState();
    _fetchCalendarData();
    _initGoogle();
  }

  Future<void> _initGoogle() async {
    final connected = await GoogleCalendarService.isConnected();
    if (!mounted) return;
    setState(() => _googleConnected = connected);
    if (connected) {
      await _fetchGoogleEvents();
    }
  }

  Future<void> _fetchCalendarData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final response = await EmployeeService.getCalendarData(
      year: _currentMonth.year,
      month: _currentMonth.month,
      day: _currentMonth.day,
    );

    if (response.success && response.data != null) {
      setState(() {
        _calendarData = response.data!;
        _isLoading = false;
        _updateSelectedDateEvents();
      });
    } else {
      setState(() {
        _error = response.message ?? 'Failed to load calendar';
        _isLoading = false;
      });
    }
  }

  DateTime _monthStart(DateTime d) => DateTime(d.year, d.month, 1);
  DateTime _monthEndExclusive(DateTime d) => DateTime(d.year, d.month + 1, 1);

  Future<void> _fetchGoogleEvents() async {
    setState(() {
      _googleLoading = true;
      _googleError = null;
    });
    try {
      final items = await GoogleCalendarService.listPrimaryEvents(
        timeMin: _monthStart(_currentMonth),
        timeMax: _monthEndExclusive(_currentMonth),
      );
      if (!mounted) return;
      setState(() {
        _googleEvents = items;
        _googleLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _googleEvents = [];
        _googleLoading = false;
        _googleError = e.toString();
      });
    }
  }

  Future<void> _connectGoogle() async {
    setState(() {
      _googleLoading = true;
      _googleError = null;
    });
    try {
      final token = await GoogleCalendarService.connect();
      if (!mounted) return;
      setState(() {
        _googleConnected = token != null;
        _googleLoading = false;
      });
      if (token != null) await _fetchGoogleEvents();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _googleLoading = false;
        _googleError = e.toString();
      });
    }
  }

  Future<void> _disconnectGoogle() async {
    await GoogleCalendarService.disconnect();
    if (!mounted) return;
    setState(() {
      _googleConnected = false;
      _googleEvents = [];
      _googleError = null;
    });
  }

  void _updateSelectedDateEvents() {
    if (_selectedDate == null || _calendarData == null) {
      _selectedDateEvents = [];
      return;
    }

    final selectedDateStr = DateFormat('yyyy-MM-dd').format(_selectedDate!);
    _selectedDateEvents = [];

    for (final week in _calendarData!.weeks) {
      for (final day in week) {
        if (day.date != null &&
            DateFormat('yyyy-MM-dd').format(day.date!) == selectedDateStr) {
          _selectedDateEvents = day.allEvents;
          return;
        }
      }
    }
  }

  void _navigateMonth(int direction) {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month + direction, 1);
    });
    _fetchCalendarData();
    if (_googleConnected) {
      _fetchGoogleEvents();
    }
  }

  void _selectDate(DateTime date) {
    setState(() {
      _selectedDate = date;
      _updateSelectedDateEvents();
    });
  }

  Future<void> _addEvent(DateTime? date) async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => CalendarEventDialog(
        initialDate: date ?? _selectedDate ?? DateTime.now(),
      ),
    );

    if (result != null) {
      final response = await EmployeeService.createCalendarEvent(
        name: result['name'] as String,
        date: result['date'] as DateTime,
        description: result['description'] as String?,
      );

      if (response.success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Event created successfully')),
          );
          _fetchCalendarData();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? 'Failed to create event')),
          );
        }
      }
    }
  }

  Future<void> _editEvent(CalendarEvent event) async {
    if (event.type != 'personal') return; // Only edit personal events

    final eventId = int.tryParse(event.id);
    if (eventId == null) return;

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => CalendarEventDialog(
        initialDate: event.date,
        initialName: event.title,
        initialDescription: event.description,
        isEdit: true,
      ),
    );

    if (result != null) {
      final response = await EmployeeService.updateCalendarEvent(
        eventId: eventId,
        name: result['name'] as String,
        date: result['date'] as DateTime,
        description: result['description'] as String?,
      );

      if (response.success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Event updated successfully')),
          );
          _fetchCalendarData();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? 'Failed to update event')),
          );
        }
      }
    }
  }

  Future<void> _deleteEvent(CalendarEvent event) async {
    if (event.type != 'personal') return; // Only delete personal events

    final eventId = int.tryParse(event.id);
    if (eventId == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Event'),
        content: Text('Are you sure you want to delete "${event.title}"?'),
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
      final response = await EmployeeService.deleteCalendarEvent(eventId);

      if (response.success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Event deleted successfully')),
          );
          _fetchCalendarData();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? 'Failed to delete event')),
          );
        }
      }
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
                _buildHeader(),
                const SizedBox(height: 12),
                _buildTabs(),
                const SizedBox(height: 12),
                Expanded(child: _buildBody()),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: _tabIndex == 0
          ? FloatingActionButton(
              onPressed: () => _addEvent(null),
              backgroundColor: AppStitchTheme.primary,
              child: const Icon(Icons.add, color: Colors.white),
            )
          : (_googleConnected
              ? FloatingActionButton(
                  onPressed: _openCreateGoogleEventSheet,
                  backgroundColor: AppStitchTheme.primary,
                  child: const Icon(Icons.add, color: Colors.white),
                )
              : null),
    );
  }

  Widget _buildHeader() {
    final canPop = ModalRoute.of(context)?.canPop ?? false;
    final subtitle = DateFormat('MMMM yyyy').format(_currentMonth);

    if (canPop) {
      return AppHeader(
        title: 'Calendar',
        subtitle: subtitle,
        showBackButton: true,
        actions: [
          IconButton(
            onPressed: _isLoading ? null : () => _navigateMonth(-1),
            icon: const Icon(Icons.chevron_left_rounded),
          ),
          IconButton(
            onPressed: _isLoading ? null : () => _navigateMonth(1),
            icon: const Icon(Icons.chevron_right_rounded),
          ),
        ],
      );
    } else {
      // Minimal header for tab view (if ever used as a tab)
      return GlassCard(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            const Icon(Icons.calendar_month_rounded, size: 20, color: AppStitchTheme.primary),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: AppStitchTheme.lightOnSurface,
                ),
              ),
            ),
            IconButton(
              onPressed: _isLoading ? null : () => _navigateMonth(-1),
              icon: const Icon(Icons.chevron_left_rounded, size: 20),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: _isLoading ? null : () => _navigateMonth(1),
              icon: const Icon(Icons.chevron_right_rounded, size: 20),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ),
      );
    }
  }

  Widget _buildTabs() {
    return GlassCard(
      padding: const EdgeInsets.all(6),
      child: Row(
        children: [
          Expanded(
            child: _tabButton('HRMS', _tabIndex == 0, () {
              setState(() => _tabIndex = 0);
            }),
          ),
          Expanded(
            child: _tabButton('Google', _tabIndex == 1, () {
              setState(() => _tabIndex = 1);
              if (_googleConnected) _fetchGoogleEvents();
            }),
          ),
        ],
      ),
    );
  }

  Widget _tabButton(String label, bool active, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          color: active ? AppStitchTheme.primary : Colors.transparent,
        ),
        child: Center(
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: active ? Colors.white : AppStitchTheme.lightOnSurfaceMuted,
                ),
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_tabIndex == 0) {
      if (_isLoading) return const Center(child: CircularProgressIndicator());
      if (_error != null) return _buildErrorState();
      if (_calendarData == null) {
        return Center(
          child: GlassCard(
            padding: const EdgeInsets.all(18),
            child: Text(
              'No calendar data',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppStitchTheme.lightOnSurfaceMuted,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
        );
      }
      return _buildCalendarView();
    }

    return _buildGoogleBody();
  }

  Widget _buildGoogleBody() {
    return Column(
      children: [
        GlassCard(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  _googleConnected ? 'Google Calendar connected' : 'Connect Google Calendar',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: AppStitchTheme.lightOnSurface,
                      ),
                ),
              ),
              if (_googleConnected)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextButton(
                      onPressed: _googleLoading ? null : _syncCompanyHolidaysToGoogle,
                      child: const Text('Sync holidays'),
                    ),
                    TextButton(
                      onPressed: _googleLoading ? null : _disconnectGoogle,
                      child: const Text('Disconnect'),
                    ),
                  ],
                )
              else
                ElevatedButton(
                  onPressed: _googleLoading ? null : _connectGoogle,
                  child: const Text('Connect'),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: _googleLoading
              ? const Center(child: CircularProgressIndicator())
              : (_googleError != null
                  ? Center(
                      child: GlassCard(
                        padding: const EdgeInsets.all(18),
                        child: Text(
                          _googleError!,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppStitchTheme.lightOnSurfaceMuted,
                                fontWeight: FontWeight.w600,
                              ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    )
                  : (!_googleConnected
                      ? Center(
                          child: GlassCard(
                            padding: const EdgeInsets.all(18),
                            child: Text(
                              'Connect to view and manage your Google events.',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: AppStitchTheme.lightOnSurfaceMuted,
                                    fontWeight: FontWeight.w600,
                                  ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        )
                      : _googleEvents.isEmpty
                          ? Center(
                              child: GlassCard(
                                padding: const EdgeInsets.all(18),
                                child: Text(
                                  'No Google events in this month.',
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                        color: AppStitchTheme.lightOnSurfaceMuted,
                                        fontWeight: FontWeight.w600,
                                      ),
                                ),
                              ),
                            )
                          : ListView.separated(
                              itemCount: _googleEvents.length,
                              separatorBuilder: (context, index) => const SizedBox(height: 10),
                              itemBuilder: (context, i) {
                                final e = _googleEvents[i];
                                return _buildGoogleEventTile(e);
                              },
                            ))),
        ),
      ],
    );
  }

  Widget _buildGoogleEventTile(GoogleCalendarEvent e) {
    final startLabel = DateFormat('MMM dd').format(e.start.toLocal());
    final timeLabel = e.allDay ? 'All day' : DateFormat('HH:mm').format(e.start.toLocal());
    return GlassCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        onTap: () => _openGoogleEventDetails(e),
        borderRadius: BorderRadius.circular(28),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  color: Colors.white.withValues(alpha: 0.60),
                  border: Border.all(
                    color: AppStitchTheme.lightOutline.withValues(alpha: 0.70),
                  ),
                ),
                child: const Icon(Icons.event_rounded, color: AppStitchTheme.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      e.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: AppStitchTheme.lightOnSurface,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$startLabel • $timeLabel',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppStitchTheme.lightOnSurfaceMuted,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDeleteGoogleEvent(GoogleCalendarEvent e) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Google event?'),
        content: Text('Delete "${e.title}" from your Google Calendar?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: const Color(0xFFEF4444)),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await GoogleCalendarService.deleteEvent(e.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Deleted from Google Calendar')));
      await _fetchGoogleEvents();
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err.toString())));
    }
  }

  Future<void> _openCreateGoogleEventSheet() async {
    if (!_googleConnected) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _GoogleCreateEventSheet(
        initialDate: _selectedDate ?? DateTime.now(),
        onCreated: () async {
          Navigator.pop(context);
          await _fetchGoogleEvents();
        },
      ),
    );
  }

  List<CalendarEvent> _companyHolidayList() {
    final out = <CalendarEvent>[];
    final cd = _calendarData;
    if (cd == null) return out;
    for (final week in cd.weeks) {
      for (final day in week) {
        for (final ev in day.adminEvents) {
          out.add(ev);
        }
      }
    }
    // Dedupe by id
    final seen = <String>{};
    return out.where((e) => seen.add(e.id)).toList();
  }

  Future<void> _syncCompanyHolidaysToGoogle() async {
    if (!_googleConnected) return;
    final username = await StorageService.getUsername() ?? 'anon';
    final holidays = _companyHolidayList();
    if (holidays.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No company holidays/events to sync')),
      );
      return;
    }

    setState(() => _googleLoading = true);
    try {
      final map = await GoogleCalendarService.readHolidayMap(username);
      final nextMap = Map<String, String>.from(map);

      for (final h in holidays) {
        final start = DateTime(h.date.year, h.date.month, h.date.day);
        final end = start.add(const Duration(days: 1));
        final privateProps = {'hrmsCompanyHolidayId': h.id};
        final existingId = map[h.id];

        if (existingId == null || existingId.isEmpty) {
          final created = await GoogleCalendarService.createEvent(
            title: '[Company] ${h.title}',
            description: (h.description ?? '').trim().isEmpty
                ? 'Synced from HRMS company calendar.'
                : '${h.description}\n\nSynced from HRMS company calendar.',
            start: start,
            end: end,
            allDay: true,
            privateProps: privateProps,
          );
          nextMap[h.id] = created.id;
        } else {
          // Best-effort: ensure title/description match (ignore failures silently).
          try {
            await GoogleCalendarService.patchEvent(
              existingId,
              title: '[Company] ${h.title}',
              description: (h.description ?? '').trim().isEmpty
                  ? 'Synced from HRMS company calendar.'
                  : '${h.description}\n\nSynced from HRMS company calendar.',
            );
          } catch (_) {
            // If patch fails (deleted/permission), recreate.
            final created = await GoogleCalendarService.createEvent(
              title: '[Company] ${h.title}',
              description: (h.description ?? '').trim().isEmpty
                  ? 'Synced from HRMS company calendar.'
                  : '${h.description}\n\nSynced from HRMS company calendar.',
              start: start,
              end: end,
              allDay: true,
              privateProps: privateProps,
            );
            nextMap[h.id] = created.id;
          }
        }
      }

      await GoogleCalendarService.writeHolidayMap(username, nextMap);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Synced ${holidays.length} company holidays to Google')),
      );
      await _fetchGoogleEvents();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _googleLoading = false);
    }
  }

  // Existing UI below remains (HRMS calendar rendering + helpers).

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
              onPressed: _fetchCalendarData,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCalendarView() {
    return Column(
      children: [
        Expanded(
          flex: MediaQuery.of(context).size.width > 800 ? 1 : 2,
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _buildCalendarGrid(),
                ),
              ),
              if (MediaQuery.of(context).size.width > 800)
                Expanded(
                  flex: 1,
                  child: Padding(
                    padding: const EdgeInsets.only(left: 12, bottom: 12),
                    child: _buildEventsList(),
                  ),
                ),
            ],
          ),
        ),
        if (MediaQuery.of(context).size.width <= 800)
          ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.35,
            ),
            child: _buildEventsList(),
          ),
      ],
    );
  }

  Widget _buildCalendarGrid() {
    if (_calendarData == null) return const SizedBox();

    final weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return GlassCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          // Week day headers
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: AppStitchTheme.lightOutline.withValues(alpha: 0.55),
                  width: 1,
                ),
              ),
            ),
            child: Row(
              children: weekDays.map((day) {
                return Expanded(
                  child: Center(
                    child: Text(
                      day,
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppStitchTheme.lightOnSurfaceMuted,
                          ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          // Calendar days
          Expanded(
            child: ListView.builder(
              itemCount: _calendarData!.weeks.length,
              itemBuilder: (context, weekIndex) {
                final week = _calendarData!.weeks[weekIndex];
                return SizedBox(
                  height: 80,
                  child: Row(
                    children: week.asMap().entries.map((entry) {
                      final day = entry.value;
                      return Expanded(
                        child: _buildDayCell(day),
                      );
                    }).toList(),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDayCell(CalendarDay day) {
    final isSelected = day.date != null &&
        _selectedDate != null &&
        day.date!.year == _selectedDate!.year &&
        day.date!.month == _selectedDate!.month &&
        day.date!.day == _selectedDate!.day;

    final personalCount = day.personalEvents.length;
    final adminCount = day.adminEvents.length;
    final totalCount = personalCount + adminCount;

    final isInactive = day.date == null;
    final hasEvents = totalCount > 0;
    final isWeekend = day.date != null &&
        (day.date!.weekday == DateTime.saturday ||
            day.date!.weekday == DateTime.sunday);

    Color dayTextColor() {
      if (isInactive) return AppStitchTheme.lightOnSurfaceMuted;
      if (isSelected) return Colors.white;
      if (day.isToday) return AppStitchTheme.primary;
      if (isWeekend) return AppStitchTheme.lightOnSurfaceVariant;
      return AppStitchTheme.lightOnSurface;
    }

    return InkWell(
      onTap: day.date != null ? () => _selectDate(day.date!) : null,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        height: 80,
        margin: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          color: isSelected
              ? AppStitchTheme.primary
              : (day.isToday
                  ? Colors.white.withValues(alpha: 0.60)
                  : Colors.transparent),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected
                ? AppStitchTheme.primary
                : (day.isToday
                    ? AppStitchTheme.primary.withValues(alpha: 0.25)
                    : (hasEvents
                        ? AppStitchTheme.lightOutline.withValues(alpha: 0.35)
                        : Colors.transparent)),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              day.day?.toString() ?? '',
              style: TextStyle(
                fontSize: 14,
                fontWeight:
                    (day.isToday || isSelected) ? FontWeight.w900 : FontWeight.w700,
                color: dayTextColor(),
              ),
            ),
            if (hasEvents) const SizedBox(height: 8),
            if (hasEvents)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (personalCount > 0)
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: isSelected ? Colors.white : AppStitchTheme.primary,
                        shape: BoxShape.circle,
                      ),
                    ),
                  if (personalCount > 0 && adminCount > 0)
                    const SizedBox(width: 3),
                  if (adminCount > 0)
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? Colors.white.withValues(alpha: 0.85)
                            : const Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                    ),
                  if (totalCount >= 3) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? Colors.white.withValues(alpha: 0.18)
                            : Colors.white.withValues(alpha: 0.60),
                        borderRadius: BorderRadius.circular(99),
                        border: Border.all(
                          color: (isSelected
                                  ? Colors.white
                                  : AppStitchTheme.lightOutline)
                              .withValues(alpha: 0.55),
                        ),
                      ),
                      child: Text(
                        '$totalCount',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: isSelected
                              ? Colors.white
                              : AppStitchTheme.lightOnSurface,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _openGoogleEventDetails(GoogleCalendarEvent e) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
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
                          e.title,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w900,
                                color: AppStitchTheme.lightOnSurface,
                              ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close_rounded),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      e.allDay
                          ? DateFormat('MMM dd, yyyy').format(e.start.toLocal())
                          : '${DateFormat('MMM dd, yyyy • HH:mm').format(e.start.toLocal())} → ${DateFormat('HH:mm').format(e.end.toLocal())}',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppStitchTheme.lightOnSurfaceMuted,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ),
                  if ((e.description ?? '').trim().isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        e.description!.trim(),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppStitchTheme.lightOnSurface,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: e.htmlLink == null
                              ? null
                              : () => _openUrl(e.htmlLink!),
                          icon: const Icon(Icons.open_in_new_rounded, size: 18),
                          label: const Text('Open'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: e.hangoutLink == null
                              ? null
                              : () => _openUrl(e.hangoutLink!),
                          icon: const Icon(Icons.video_call_rounded, size: 18),
                          label: const Text('Meet'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEF4444),
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () async {
                        Navigator.pop(context);
                        await _confirmDeleteGoogleEvent(e);
                      },
                      icon: const Icon(Icons.delete_outline_rounded),
                      label: const Text('Delete from Google Calendar'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildEventsList() {
    return GlassCard(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  _selectedDate != null ? 'Events' : 'Select a date',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: AppStitchTheme.lightOnSurface,
                      ),
                ),
              ),
              if (_selectedDate != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.55),
                    borderRadius:
                        BorderRadius.circular(AppStitchTheme.radiusPill),
                    border: Border.all(
                      color: AppStitchTheme.lightOutline.withValues(alpha: 0.65),
                    ),
                  ),
                  child: Text(
                    DateFormat('MMM dd, yyyy').format(_selectedDate!),
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppStitchTheme.lightOnSurface,
                        ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (_selectedDate == null)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppStitchTheme.primary.withValues(alpha: 0.10),
                        border: Border.all(
                          color:
                              AppStitchTheme.primary.withValues(alpha: 0.22),
                        ),
                      ),
                      child: const Icon(
                        Icons.touch_app_rounded,
                        color: AppStitchTheme.primary,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Tap a date to view events',
                      style:
                          Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppStitchTheme.lightOnSurfaceMuted,
                                fontWeight: FontWeight.w600,
                              ),
                    ),
                  ],
                ),
              ),
            )
          else if (_selectedDateEvents.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: 0.60),
                        border: Border.all(
                          color: AppStitchTheme.lightOutline.withValues(alpha: 0.65),
                        ),
                      ),
                      child: const Icon(
                        Icons.event_busy_rounded,
                        color: AppStitchTheme.primary,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'No events on this date',
                      style:
                          Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppStitchTheme.lightOnSurfaceMuted,
                                fontWeight: FontWeight.w600,
                              ),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
                itemCount: _selectedDateEvents.length,
                itemBuilder: (context, index) {
                  final event = _selectedDateEvents[index];
                  return _buildEventCard(event);
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildEventCard(CalendarEvent event) {
    final isPersonal = event.type == 'personal';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GlassCard(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                color: Colors.white.withValues(alpha: 0.60),
                border: Border.all(
                  color: AppStitchTheme.lightOutline.withValues(alpha: 0.65),
                ),
              ),
              child: Icon(
                isPersonal ? Icons.person_rounded : Icons.business_rounded,
                color: isPersonal ? AppStitchTheme.primary : const Color(0xFF10B981),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event.title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: AppStitchTheme.lightOnSurface,
                        ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (event.description != null &&
                      event.description!.trim().isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      event.description!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppStitchTheme.lightOnSurfaceMuted,
                            fontWeight: FontWeight.w600,
                          ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            if (isPersonal) ...[
              IconButton(
                icon: const Icon(Icons.edit_rounded, size: 18),
                onPressed: () => _editEvent(event),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
              const SizedBox(width: 6),
              IconButton(
                icon: const Icon(
                  Icons.delete_outline_rounded,
                  size: 18,
                  color: Color(0xFFEF4444),
                ),
                onPressed: () => _deleteEvent(event),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
