import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../models/seat_booking_models.dart';
import '../../services/seat_booking_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';

class SeatBookingPage extends StatefulWidget {
  const SeatBookingPage({super.key});

  @override
  State<SeatBookingPage> createState() => _SeatBookingPageState();
}

class _SeatBookingPageState extends State<SeatBookingPage> {
  bool _loadingLocations = true;
  bool _loadingFloors = false;
  bool _loadingBookings = false;
  bool _loadingSeats = false;

  List<OfficeLocation> _locations = <OfficeLocation>[];
  OfficeLocation? _selectedLocation;

  List<OfficeFloor> _floors = <OfficeFloor>[];
  OfficeFloor? _selectedFloor;

  List<OfficeSeat> _officeSeats = <OfficeSeat>[];
  Map<String, int> _seatNumberToId = <String, int>{};

  List<SeatBooking> _bookings = <SeatBooking>[];

  DateTime _selectedDate = DateTime.now();
  TimeOfDay _targetStart = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _targetEnd = const TimeOfDay(hour: 18, minute: 0);

  LayoutElement? _selectedSeatEl;
  SeatBooking? _selectedSeatBooking;
  List<SeatBooking> _selectedSeatUpcoming = <SeatBooking>[];
  bool _loadingSeatSchedule = false;

  // Booking form
  String _bookingType = 'daily';
  DateTime? _weeklyStartDate;
  DateTime? _weeklyEndDate;
  TimeOfDay _bookStart = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _bookEnd = const TimeOfDay(hour: 18, minute: 0);

  @override
  void initState() {
    super.initState();
    _weeklyStartDate = _selectedDate;
    _fetchLocations();
  }

  String _fmtDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String _fmtTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _fetchLocations() async {
    setState(() => _loadingLocations = true);
    try {
      final locs = await SeatBookingService.fetchLocations();
      if (!mounted) return;
      setState(() {
        _locations = locs;
        _selectedLocation = locs.isNotEmpty ? locs.first : null;
      });
      if (_selectedLocation != null) {
        await _fetchFloors(_selectedLocation!.id);
      }
    } catch (e) {
      if (!mounted) return;
      _toastError(e.toString());
    } finally {
      if (!mounted) return;
      setState(() => _loadingLocations = false);
    }
  }

  Future<void> _fetchFloors(int locationId) async {
    setState(() {
      _loadingFloors = true;
      _floors = <OfficeFloor>[];
      _selectedFloor = null;
      _bookings = <SeatBooking>[];
      _officeSeats = <OfficeSeat>[];
      _seatNumberToId = <String, int>{};
      _selectedSeatEl = null;
      _selectedSeatBooking = null;
      _selectedSeatUpcoming = <SeatBooking>[];
    });
    try {
      final floors = await SeatBookingService.fetchFloors(locationId: locationId);
      if (!mounted) return;
      setState(() {
        _floors = floors;
        _selectedFloor = floors.isNotEmpty ? floors.first : null;
      });
      if (_selectedFloor != null) {
        await Future.wait([
          _fetchSeats(_selectedFloor!.id),
          _fetchBookings(),
        ]);
      }
    } catch (e) {
      if (!mounted) return;
      _toastError(e.toString());
    } finally {
      if (!mounted) return;
      setState(() => _loadingFloors = false);
    }
  }

  Future<void> _fetchSeats(int floorId) async {
    setState(() => _loadingSeats = true);
    try {
      final seats = await SeatBookingService.fetchSeats(floorId: floorId);
      if (!mounted) return;
      setState(() {
        _officeSeats = seats;
        _seatNumberToId = {
          for (final s in seats) s.seatNumber.toLowerCase(): s.id,
        };
      });
    } catch (e) {
      if (!mounted) return;
      _toastError(e.toString());
    } finally {
      if (!mounted) return;
      setState(() => _loadingSeats = false);
    }
  }

  Future<void> _fetchBookings() async {
    final floor = _selectedFloor;
    if (floor == null) return;
    setState(() => _loadingBookings = true);
    try {
      final list = await SeatBookingService.fetchBookings(
        date: _fmtDate(_selectedDate),
        floorId: floor.id,
        startTime: _fmtTime(_targetStart),
        endTime: _fmtTime(_targetEnd),
      );
      if (!mounted) return;
      setState(() => _bookings = list);
      // Refresh selection if same seat is selected.
      if (_selectedSeatEl != null) {
        _applySelectedSeatBooking(_selectedSeatEl!);
      }
    } catch (e) {
      if (!mounted) return;
      _toastError(e.toString());
    } finally {
      if (!mounted) return;
      setState(() => _loadingBookings = false);
    }
  }

  SeatBooking? _bookingForSeat(LayoutElement el) {
    final seatNum = el.name.trim();
    if (seatNum.isEmpty) return null;
    for (final b in _bookings) {
      if (b.seatDetails.seatNumber.toLowerCase() == seatNum.toLowerCase()) {
        return b;
      }
    }
    return null;
  }

  Color _seatColor(LayoutElement el) {
    final booking = _bookingForSeat(el);
    if (booking == null) return const Color(0xFF10B981);
    if (booking.bookingType == 'permanent') return const Color(0xFFF472B6);
    return const Color(0xFFFB923C);
  }

  void _applySelectedSeatBooking(LayoutElement el) {
    setState(() {
      _selectedSeatBooking = _bookingForSeat(el);
    });
  }

  Future<void> _onSeatTap(LayoutElement el) async {
    if (!el.isSeat) return;
    setState(() {
      _selectedSeatEl = el;
      _selectedSeatUpcoming = <SeatBooking>[];
      _loadingSeatSchedule = true;
      _bookingType = 'daily';
      _weeklyStartDate = _selectedDate;
      _weeklyEndDate = null;
      _bookStart = _targetStart;
      _bookEnd = _targetEnd;
    });
    _applySelectedSeatBooking(el);

    final floor = _selectedFloor;
    if (floor == null) {
      setState(() => _loadingSeatSchedule = false);
      return;
    }
    try {
      final schedule = await SeatBookingService.fetchSeatSchedule(
        floorId: floor.id,
        seatNumber: el.name,
      );
      if (!mounted) return;
      final current = _selectedSeatBooking;
      final upcoming =
          current == null ? schedule : schedule.where((b) => b.id != current.id).toList();
      setState(() {
        _selectedSeatUpcoming = upcoming;
      });
    } catch (e) {
      if (!mounted) return;
      _toastError(e.toString());
    } finally {
      if (!mounted) return;
      setState(() => _loadingSeatSchedule = false);
    }

    if (!mounted) return;
    _openSeatSheet();
  }

  int? _backendSeatIdForSelected() {
    final el = _selectedSeatEl;
    if (el == null) return null;
    return _seatNumberToId[el.name.trim().toLowerCase()];
  }

  Future<void> _confirmBooking() async {
    final floor = _selectedFloor;
    final el = _selectedSeatEl;
    if (floor == null || el == null) return;

    final seatId = _backendSeatIdForSelected();
    if (seatId == null) {
      _toastError('Seat not registered in system');
      return;
    }

    final startDate =
        _bookingType == 'daily' ? _selectedDate : (_weeklyStartDate ?? _selectedDate);
    DateTime? endDate;
    if (_bookingType == 'weekly') {
      endDate = _weeklyEndDate;
    } else if (_bookingType == 'daily') {
      endDate = _selectedDate;
    } else {
      endDate = null; // permanent
    }

    if (endDate != null && endDate.isBefore(startDate)) {
      _toastError('End date cannot be before start date');
      return;
    }

    try {
      await SeatBookingService.createBooking(
        seatId: seatId,
        bookingType: _bookingType,
        startDate: _fmtDate(startDate),
        endDate: endDate == null ? null : _fmtDate(endDate),
        startTime: _fmtTime(_bookStart),
        endTime: _fmtTime(_bookEnd),
      );
      if (!mounted) return;
      Navigator.pop(context); // close sheet
      _toastOk('Seat booking submitted');
      await _fetchBookings();
    } catch (e) {
      if (!mounted) return;
      _toastError(e.toString());
    }
  }

  Future<void> _cancelBooking(int bookingId) async {
    try {
      await SeatBookingService.cancelBooking(bookingId: bookingId);
      if (!mounted) return;
      Navigator.pop(context);
      _toastOk('Booking cancelled');
      await _fetchBookings();
    } catch (e) {
      if (!mounted) return;
      _toastError(e.toString());
    }
  }

  void _openSeatSheet() {
    final el = _selectedSeatEl;
    if (el == null) return;

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 12,
            right: 12,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 12,
          ),
          child: GlassCard(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: _buildSeatSheetContent(),
          ),
        );
      },
    );
  }

  Widget _buildSeatSheetContent() {
    final el = _selectedSeatEl!;
    final booking = _selectedSeatBooking;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Seat ${el.name}',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppStitchTheme.lightOnSurface,
                      ),
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded),
              ),
            ],
          ),
          const SizedBox(height: 6),
          if (_loadingSeatSchedule)
            const LinearProgressIndicator(minHeight: 2),
          const SizedBox(height: 10),
          if (booking != null) ...[
            _badge(
              booking.status == 'pending'
                  ? 'Pending approval'
                  : booking.status.isEmpty
                      ? 'Booked'
                      : booking.status,
              color: booking.status == 'pending'
                  ? const Color(0xFFF59E0B)
                  : const Color(0xFFEF4444),
            ),
            const SizedBox(height: 12),
            Text(
              'Occupant',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AppStitchTheme.lightOnSurfaceMuted,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.6,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              booking.employeeDetails.name,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 10),
            _kvRow('Type', booking.bookingType),
            _kvRow(
              'Time',
              '${(booking.startTime ?? '00:00').substring(0, 5)} - ${(booking.endTime ?? '23:59').substring(0, 5)}',
            ),
            _kvRow(
              'Dates',
              booking.endDate != null && booking.endDate!.isNotEmpty
                  ? '${booking.startDate} to ${booking.endDate}'
                  : booking.startDate,
            ),
            const SizedBox(height: 12),
            if (booking.isMine)
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFEF4444),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () => _cancelBooking(booking.id),
                  icon: const Icon(Icons.cancel_rounded),
                  label: const Text(
                    'Cancel booking',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              ),
          ] else ...[
            _badge('Available', color: const Color(0xFF10B981)),
            const SizedBox(height: 12),
            Text(
              'Book this seat',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 10),
            _bookingTypePicker(),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _timePickerTile(
                    label: 'Start time',
                    value: _bookStart,
                    onChanged: (t) => setState(() => _bookStart = t),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _timePickerTile(
                    label: 'End time',
                    value: _bookEnd,
                    onChanged: (t) => setState(() => _bookEnd = t),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (_bookingType == 'weekly') _weeklyDatePickers(),
            if (_bookingType == 'weekly' || _bookingType == 'permanent')
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'Weekly and Permanent bookings require Administrator approval.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppStitchTheme.lightOnSurfaceMuted,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                onPressed: _confirmBooking,
                icon: const Icon(Icons.check_circle_rounded),
                label: const Text(
                  'Confirm booking',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ],
          const SizedBox(height: 18),
          if (_selectedSeatUpcoming.isNotEmpty) ...[
            Text(
              'Upcoming bookings',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
            ),
            const SizedBox(height: 10),
            ..._selectedSeatUpcoming.take(5).map(_upcomingCard),
          ],
        ],
      ),
    );
  }

  Widget _kvRow(String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 70,
            child: Text(
              k,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AppStitchTheme.lightOnSurfaceMuted,
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ),
          Expanded(
            child: Text(
              v,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _upcomingCard(SeatBooking b) {
    final statusColor = b.status == 'pending'
        ? const Color(0xFFF59E0B)
        : const Color(0xFF3B82F6);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    b.employeeDetails.name,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ),
                _badge(b.status, color: statusColor),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${b.startDate}${(b.endDate != null && b.endDate!.isNotEmpty) ? ' to ${b.endDate}' : ''}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppStitchTheme.lightOnSurfaceMuted,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            Text(
              '${(b.startTime ?? '00:00').substring(0, 5)} - ${(b.endTime ?? '23:59').substring(0, 5)} • ${b.bookingType}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppStitchTheme.lightOnSurfaceMuted,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _badge(String text, {required Color color}) {
    final t = text.trim().isEmpty ? 'status' : text;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(
        t,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }

  Widget _bookingTypePicker() {
    return DropdownButtonFormField<String>(
      value: _bookingType,
      items: const [
        DropdownMenuItem(value: 'daily', child: Text('Daily (One Day)')),
        DropdownMenuItem(value: 'weekly', child: Text('Weekly (7 Days)')),
        DropdownMenuItem(value: 'permanent', child: Text('Permanent')),
      ],
      decoration: const InputDecoration(
        labelText: 'Booking type',
        border: OutlineInputBorder(),
      ),
      onChanged: (v) {
        if (v == null) return;
        setState(() {
          _bookingType = v;
          if (v == 'weekly') {
            _weeklyStartDate ??= _selectedDate;
          } else {
            _weeklyEndDate = null;
          }
        });
      },
    );
  }

  Widget _weeklyDatePickers() {
    final s = _weeklyStartDate ?? _selectedDate;
    final e = _weeklyEndDate;
    return Row(
      children: [
        Expanded(
          child: _datePickerTile(
            label: 'Start date',
            value: s,
            onChanged: (d) => setState(() => _weeklyStartDate = d),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _datePickerTile(
            label: 'End date',
            value: e,
            onChanged: (d) => setState(() => _weeklyEndDate = d),
          ),
        ),
      ],
    );
  }

  Widget _datePickerTile({
    required String label,
    required DateTime? value,
    required ValueChanged<DateTime> onChanged,
  }) {
    return InkWell(
      onTap: () async {
        final now = DateTime.now();
        final initial = value ?? now;
        final picked = await showDatePicker(
          context: context,
          initialDate: initial,
          firstDate: DateTime(now.year - 1),
          lastDate: DateTime(now.year + 3),
        );
        if (picked != null) onChanged(picked);
      },
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
        ),
        child: Text(value == null ? '-' : _fmtDate(value)),
      ),
    );
  }

  Widget _timePickerTile({
    required String label,
    required TimeOfDay value,
    required ValueChanged<TimeOfDay> onChanged,
  }) {
    return InkWell(
      onTap: () async {
        final picked = await showTimePicker(
          context: context,
          initialTime: value,
        );
        if (picked != null) onChanged(picked);
      },
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
        ),
        child: Text(_fmtTime(value)),
      ),
    );
  }

  void _toastError(String msg) {
    final clean = msg.replaceFirst('Exception: ', '').trim();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(clean.isEmpty ? 'Something went wrong' : clean),
        backgroundColor: const Color(0xFFEF4444),
      ),
    );
  }

  void _toastOk(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: const Color(0xFF10B981)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final floor = _selectedFloor;
    final elements = floor?.elements ?? <LayoutElement>[];
    final maxX = elements.isEmpty
        ? 1200.0
        : elements.map((e) => e.x + e.width).reduce(math.max) + 250;
    final maxY = elements.isEmpty
        ? 900.0
        : elements.map((e) => e.y + e.height).reduce(math.max) + 250;
    final canvasW = math.max(1200.0, maxX);
    final canvasH = math.max(900.0, maxY);

    return Scaffold(
      body: StitchBackground(
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back_rounded),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Seat Booking',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                    ),
                    IconButton(
                      onPressed: _fetchBookings,
                      icon: const Icon(Icons.refresh_rounded),
                      tooltip: 'Refresh',
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: GlassCard(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(child: _locationDropdown()),
                          const SizedBox(width: 10),
                          Expanded(child: _floorDropdown()),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: _datePickerTile(
                              label: 'Target date',
                              value: _selectedDate,
                              onChanged: (d) async {
                                setState(() {
                                  _selectedDate = d;
                                  _weeklyStartDate = d;
                                });
                                await _fetchBookings();
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _timePickerTile(
                              label: 'Start',
                              value: _targetStart,
                              onChanged: (t) async {
                                setState(() => _targetStart = t);
                                await _fetchBookings();
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _timePickerTile(
                              label: 'End',
                              value: _targetEnd,
                              onChanged: (t) async {
                                setState(() => _targetEnd = t);
                                await _fetchBookings();
                              },
                            ),
                          ),
                        ],
                      ),
                      if (_loadingBookings || _loadingSeats || _loadingFloors)
                        const Padding(
                          padding: EdgeInsets.only(top: 10),
                          child: LinearProgressIndicator(minHeight: 2),
                        ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: GlassCard(
                    padding: const EdgeInsets.all(0),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: floor == null
                          ? _emptyState('No floor selected.')
                          : elements.isEmpty
                              ? _emptyState('No layout mapped for this floor.')
                              : InteractiveViewer(
                                  minScale: 0.35,
                                  maxScale: 3.5,
                                  boundaryMargin: const EdgeInsets.all(80),
                                  child: SizedBox(
                                    width: canvasW,
                                    height: canvasH,
                                    child: Stack(
                                      children: [
                                        ...elements
                                            .where((e) => e.type == 'zone' || e.type == 'room')
                                            .map(_zoneWidget),
                                        ...elements.where((e) => e.type == 'label').map(_labelWidget),
                                        ...elements.where((e) => e.type == 'seat').map(_seatWidget),
                                      ],
                                    ),
                                  ),
                                ),
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: GlassCard(
                  padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                  child: Row(
                    children: [
                      _legendDot(const Color(0xFF10B981), 'Available'),
                      const SizedBox(width: 12),
                      _legendDot(const Color(0xFFFB923C), 'Booked'),
                      const SizedBox(width: 12),
                      _legendDot(const Color(0xFFF472B6), 'Permanent'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _emptyState(String msg) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          msg,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppStitchTheme.lightOnSurfaceMuted,
                fontWeight: FontWeight.w700,
              ),
        ),
      ),
    );
  }

  Widget _legendDot(Color c, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: c,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w800,
                color: AppStitchTheme.lightOnSurface,
              ),
        ),
      ],
    );
  }

  Widget _locationDropdown() {
    if (_loadingLocations) {
      return const SizedBox(height: 54, child: LinearProgressIndicator());
    }
    return DropdownButtonFormField<int>(
      value: _selectedLocation?.id,
      decoration: const InputDecoration(
        labelText: 'Office',
        border: OutlineInputBorder(),
      ),
      items: _locations
          .map(
            (l) => DropdownMenuItem<int>(
              value: l.id,
              child: Text(l.name, overflow: TextOverflow.ellipsis),
            ),
          )
          .toList(),
      onChanged: (id) async {
        final loc = _locations.firstWhere(
          (x) => x.id == id,
          orElse: () => _selectedLocation ?? _locations.first,
        );
        setState(() => _selectedLocation = loc);
        await _fetchFloors(loc.id);
      },
    );
  }

  Widget _floorDropdown() {
    return DropdownButtonFormField<int>(
      value: _selectedFloor?.id,
      decoration: const InputDecoration(
        labelText: 'Floor',
        border: OutlineInputBorder(),
      ),
      items: _floors
          .map(
            (f) => DropdownMenuItem<int>(
              value: f.id,
              child: Text('F${f.floorNumber}: ${f.name}', overflow: TextOverflow.ellipsis),
            ),
          )
          .toList(),
      onChanged: _loadingFloors
          ? null
          : (id) async {
              final floor = _floors.firstWhere(
                (x) => x.id == id,
                orElse: () => _selectedFloor ?? _floors.first,
              );
              setState(() {
                _selectedFloor = floor;
                _selectedSeatEl = null;
                _selectedSeatBooking = null;
                _selectedSeatUpcoming = <SeatBooking>[];
              });
              await Future.wait([
                _fetchSeats(floor.id),
                _fetchBookings(),
              ]);
            },
    );
  }

  Widget _zoneWidget(LayoutElement el) {
    final c = _parseColor(el.color) ?? const Color(0xFF3B82F6);
    return Positioned(
      left: el.x,
      top: el.y,
      child: Transform.rotate(
        angle: el.rotation * math.pi / 180,
        child: Container(
          width: el.width,
          height: el.height,
          decoration: BoxDecoration(
            color: c.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: c.withValues(alpha: el.type == 'room' ? 0.6 : 0.4),
              width: el.type == 'room' ? 2 : 1,
            ),
          ),
          child: Align(
            alignment: Alignment.topLeft,
            child: Padding(
              padding: const EdgeInsets.all(6),
              child: Text(
                el.name,
                style: TextStyle(
                  color: c,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _labelWidget(LayoutElement el) {
    final c = _parseColor(el.color) ?? const Color(0xFF94A3B8);
    return Positioned(
      left: el.x,
      top: el.y,
      child: Transform.rotate(
        angle: el.rotation * math.pi / 180,
        child: SizedBox(
          width: el.width,
          child: Text(
            el.name,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: c,
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ),
    );
  }

  Widget _seatWidget(LayoutElement el) {
    final color = _seatColor(el);
    final isSelected = _selectedSeatEl?.id == el.id;
    return Positioned(
      left: el.x,
      top: el.y,
      child: Transform.rotate(
        angle: el.rotation * math.pi / 180,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: () => _onSeatTap(el),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: el.width,
              height: el.height,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isSelected ? const Color(0xFF3B82F6) : Colors.white,
                  width: isSelected ? 3 : 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  el.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Color? _parseColor(String? hex) {
    final h = (hex ?? '').trim();
    if (!RegExp(r'^#?[0-9a-fA-F]{6}$').hasMatch(h)) return null;
    final s = h.startsWith('#') ? h.substring(1) : h;
    final value = int.parse(s, radix: 16);
    return Color(0xFF000000 | value);
  }
}

extension _FirstOrNullX<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}

