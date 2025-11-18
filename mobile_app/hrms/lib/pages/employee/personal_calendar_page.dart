import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/calendar_model.dart';
import '../../services/employee_service.dart';
import 'widgets/calendar_event_dialog.dart';

class PersonalCalendarPage extends StatefulWidget {
  const PersonalCalendarPage({super.key});

  @override
  State<PersonalCalendarPage> createState() => _PersonalCalendarPageState();
}

class _PersonalCalendarPageState extends State<PersonalCalendarPage> {
  CalendarData? _calendarData;
  bool _isLoading = false;
  String? _error;
  DateTime _currentMonth = DateTime.now();
  DateTime? _selectedDate;
  List<CalendarEvent> _selectedDateEvents = [];

  @override
  void initState() {
    super.initState();
    _fetchCalendarData();
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
      backgroundColor: const Color(0xFFF9FAFB),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorState()
              : _calendarData == null
                  ? const Center(child: Text('No calendar data'))
                  : _buildCalendarView(),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _addEvent(null),
        backgroundColor: const Color(0xFF4F46E5),
        child: const Icon(Icons.add, color: Colors.white),
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
        _buildCalendarHeader(),
        Expanded(
          flex: MediaQuery.of(context).size.width > 800 ? 1 : 2,
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: _buildCalendarGrid(),
              ),
              if (MediaQuery.of(context).size.width > 800)
                Expanded(
                  flex: 1,
                  child: _buildEventsList(),
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

  Widget _buildCalendarHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.white,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () => _navigateMonth(-1),
          ),
          Text(
            DateFormat('MMMM yyyy').format(_currentMonth),
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: Color(0xFF111827),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () => _navigateMonth(1),
          ),
        ],
      ),
    );
  }

  Widget _buildCalendarGrid() {
    if (_calendarData == null) return const SizedBox();

    final weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Week day headers
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Color(0xFFE5E7EB), width: 1),
              ),
            ),
            child: Row(
              children: weekDays.map((day) {
                return Expanded(
                  child: Center(
                    child: Text(
                      day,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF6B7280),
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

    final hasEvents = day.allEvents.isNotEmpty;

    return GestureDetector(
      onTap: day.date != null ? () => _selectDate(day.date!) : null,
      child: Container(
        height: 80,
        margin: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF4F46E5).withOpacity(0.1)
              : day.isToday
                  ? const Color(0xFFF3F4F6)
                  : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF4F46E5)
                : day.isToday
                    ? const Color(0xFF4F46E5).withOpacity(0.3)
                    : Colors.transparent,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                day.day?.toString() ?? '',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: day.isToday || isSelected
                      ? FontWeight.w600
                      : FontWeight.normal,
                  color: isSelected
                      ? const Color(0xFF4F46E5)
                      : day.isToday
                          ? const Color(0xFF4F46E5)
                          : const Color(0xFF111827),
                ),
              ),
            ),
            if (hasEvents)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (day.personalEvents.isNotEmpty)
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: Color(0xFF2563EB),
                            shape: BoxShape.circle,
                          ),
                        ),
                      if (day.personalEvents.isNotEmpty &&
                          day.adminEvents.isNotEmpty)
                        const SizedBox(width: 2),
                      if (day.adminEvents.isNotEmpty)
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: Color(0xFF10B981),
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildEventsList() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _selectedDate != null
                ? 'Events - ${DateFormat('MMM dd, yyyy').format(_selectedDate!)}'
                : 'Select a date',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 16),
          if (_selectedDate == null)
            const Expanded(
              child: Center(
                child: Text(
                  'Tap on a date to view events',
                  style: TextStyle(color: Color(0xFF6B7280)),
                ),
              ),
            )
          else if (_selectedDateEvents.isEmpty)
            const Expanded(
              child: Center(
                child: Text(
                  'No events on this date',
                  style: TextStyle(color: Color(0xFF6B7280)),
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

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isPersonal
            ? const Color(0xFFDBEAFE).withOpacity(0.3)
            : const Color(0xFFD1FAE5).withOpacity(0.3),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isPersonal
              ? const Color(0xFF2563EB).withOpacity(0.3)
              : const Color(0xFF10B981).withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isPersonal ? Icons.calendar_today : Icons.business,
                size: 16,
                color: isPersonal
                    ? const Color(0xFF2563EB)
                    : const Color(0xFF10B981),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  event.title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF111827),
                  ),
                ),
              ),
              if (isPersonal) ...[
                IconButton(
                  icon: const Icon(Icons.edit, size: 18),
                  onPressed: () => _editEvent(event),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 18, color: Colors.red),
                  onPressed: () => _deleteEvent(event),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ],
          ),
          if (event.description != null && event.description!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              event.description!,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF6B7280),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
