import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../models/seat_booking_models.dart';
import '../../services/seat_booking_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';
import 'widgets/legend_popover.dart';
import 'widgets/seat_search_sheet.dart';
import 'widgets/time_range_sheet.dart';

class SeatBookingPage extends StatefulWidget {
  const SeatBookingPage({super.key});

  @override
  State<SeatBookingPage> createState() => _SeatBookingPageState();
}

enum _SeatBookingTab { map, list }

class _SeatBookingPageState extends State<SeatBookingPage> {
  bool _loadingLocations = true;
  bool _loadingFloors = false;
  bool _loadingBookings = false;
  bool _loadingSeats = false;

  List<OfficeLocation> _locations = <OfficeLocation>[];
  OfficeLocation? _selectedLocation;

  List<OfficeFloor> _floors = <OfficeFloor>[];
  OfficeFloor? _selectedFloor;

  Map<String, int> _seatNumberToId = <String, int>{};

  late final Map<String, SeatBooking> _bookingBySeatNumber = <String, SeatBooking>{};

  DateTime _selectedDate = DateTime.now();
  TimeOfDay _targetStart = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _targetEnd = const TimeOfDay(hour: 18, minute: 0);

  LayoutElement? _selectedSeatEl;
  SeatBooking? _selectedSeatBooking;
  List<SeatBooking> _selectedSeatUpcoming = [];
  bool _loadingSeatSchedule = false;

  StateSetter? _sheetSetState;

  void _updateState(VoidCallback fn) {
    setState(fn);
    _sheetSetState?.call(fn);
  }

  _SeatBookingTab _tab = _SeatBookingTab.map;
  final TransformationController _mapTransform = TransformationController();

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

  @override
  void dispose() {
    _mapTransform.dispose();
    super.dispose();
  }

  String _fmtDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String _fmtTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  String _officePillLabel() {
    final office = _selectedLocation?.name ?? 'Office';
    final floor = _selectedFloor == null
        ? 'Floor'
        : 'F${_selectedFloor!.floorNumber}: ${_selectedFloor!.name}';
    return '$office • $floor';
  }

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
      _seatNumberToId = <String, int>{};
      _selectedSeatEl = null;
      _selectedSeatBooking = null;
      _selectedSeatUpcoming = <SeatBooking>[];
      _bookingBySeatNumber.clear();
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
      setState(() {
        _bookingBySeatNumber
          ..clear()
          ..addEntries(
            list.map(
              (b) => MapEntry(b.seatDetails.seatNumber.toLowerCase(), b),
            ),
          );
      });
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
    return _bookingBySeatNumber[seatNum.toLowerCase()];
  }

  Color _seatColor(LayoutElement el) {
    final booking = _bookingForSeat(el);
    if (booking == null) return const Color(0xFF10B981); // Available (Emerald 500)
    if (booking.bookingType == 'permanent') return const Color(0xFFF472B6); // Permanent (Pink 400 - SOP)
    return const Color(0xFFFB923C); // Booked (Orange 400 - SOP)
  }

  String _initialsFromName(String name) {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.isEmpty) return '?';
    final first = parts.first.characters.isNotEmpty ? parts.first.characters.first : '';
    final last = parts.length > 1 && parts.last.characters.isNotEmpty
        ? parts.last.characters.first
        : '';
    final s = (first + last).toUpperCase();
    return s.isEmpty ? '?' : s;
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
        return StatefulBuilder(
          builder: (context, setModalState) {
            _sheetSetState = setModalState;
            return DraggableScrollableSheet(
          initialChildSize: 0.62,
          minChildSize: 0.40,
          maxChildSize: 0.92,
          builder: (context, scrollController) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            12,
            0,
            12,
            MediaQuery.of(ctx).viewInsets.bottom + 12,
          ),
          child: GlassCard(
            borderRadius: 22,
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: _buildSeatSheetContent(scrollController),
          ),
        );
          },
        );
          },
        );
      },
    ).whenComplete(() => _sheetSetState = null);
  }

  Widget _buildSeatSheetContent(ScrollController scrollController) {
    final el = _selectedSeatEl!;
    final booking = _selectedSeatBooking;

    return SingleChildScrollView(
      controller: scrollController,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Center(
          child: Container(
            width: 40,
            height: 5,
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: AppStitchTheme.lightOutline.withValues(alpha: 0.8),
              borderRadius: BorderRadius.circular(99),
            ),
          ),
        ),
        Row(
          children: [
            Expanded(
              child: Text(
                'Seat ${el.name}',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
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
        if (_loadingSeatSchedule) const LinearProgressIndicator(minHeight: 2),
        const SizedBox(height: 10),
        if (booking != null) ...[
          _badge(
            booking.status == 'pending'
                ? 'Pending approval'
                : booking.status.isEmpty
                    ? 'Booked'
                    : (booking.status[0].toUpperCase() + booking.status.substring(1)),
            color: booking.status == 'pending'
                ? const Color(0xFFF59E0B)
                : (booking.status.toLowerCase() == 'approved'
                    ? AppStitchTheme.accentBlue
                    : const Color(0xFFEF4444)),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  color: AppStitchTheme.primary.withValues(alpha: 0.12),
                  border: Border.all(color: AppStitchTheme.primary.withValues(alpha: 0.25)),
                ),
                child: Center(
                  child: Text(
                    _initialsFromName(booking.employeeDetails.name),
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      color: AppStitchTheme.primary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      booking.employeeDetails.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    if (booking.employeeDetails.employeeId.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        'ID: ${booking.employeeDetails.employeeId}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppStitchTheme.lightOnSurfaceMuted,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _kvGrid(
            leftKey: 'Type',
            leftValue: booking.bookingType,
            rightKey: 'Time',
            rightValue:
                '${(booking.startTime ?? '00:00').substring(0, 5)} - ${(booking.endTime ?? '23:59').substring(0, 5)}',
          ),
          const SizedBox(height: 10),
          _kvGrid(
            leftKey: 'Start',
            leftValue: booking.startDate,
            rightKey: 'End',
            rightValue: (booking.endDate != null && booking.endDate!.isNotEmpty)
                ? booking.endDate!
                : '—',
          ),
          const SizedBox(height: 12),
          if (booking.isMine)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFEF4444).withValues(alpha: 0.9),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  onPressed: () => _cancelBooking(booking.id),
                  icon: const Icon(Icons.cancel_rounded, size: 20),
                  label: const Text(
                    'Cancel booking',
                    style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 0.5),
                  ),
                ),
              ),
            ),
        ] else ...[
          _badge('Available', color: const Color(0xFF10B981)),
          const SizedBox(height: 18),
          Text(
            'Book this seat',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 12),
          _bookingTypeSegmented(),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _timePickerTile(
                  label: 'Start time',
                  value: _bookStart,
                  onChanged: (t) => _updateState(() => _bookStart = t),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _timePickerTile(
                  label: 'End time',
                  value: _bookEnd,
                  onChanged: (t) => _updateState(() => _bookEnd = t),
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
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: AppStitchTheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 4,
                shadowColor: AppStitchTheme.primary.withValues(alpha: 0.4),
              ),
              onPressed: _confirmBooking,
              icon: const Icon(Icons.check_circle_rounded, size: 20),
              label: const Text(
                'Confirm booking',
                style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 0.5),
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

  Widget _kvGrid({
    required String leftKey,
    required String leftValue,
    required String rightKey,
    required String rightValue,
  }) {
    return Row(
      children: [
        Expanded(child: _kvTile(leftKey, leftValue)),
        const SizedBox(width: 10),
        Expanded(child: _kvTile(rightKey, rightValue)),
      ],
    );
  }

  Widget _kvTile(String k, String v) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: Colors.white.withValues(alpha: 0.45),
        border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            k,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppStitchTheme.lightOnSurface.withValues(alpha: 0.55),
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                  fontSize: 10,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            v,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: AppStitchTheme.lightOnSurface,
                ),
          ),
        ],
      ),
    );
  }

  Widget _bookingTypeSegmented() {
    return _TabToggle<String>(
      values: const ['daily', 'weekly', 'permanent'],
      labels: const ['Daily', 'Weekly', 'Permanent'],
      selected: _bookingType,
      onChanged: (v) {
        _updateState(() {
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

   Widget _upcomingCard(SeatBooking b) {
    final isApproved = b.status.toLowerCase() == 'approved';
    final statusColor = b.status == 'pending'
        ? const Color(0xFFF59E0B)
        : (isApproved ? AppStitchTheme.accentBlue : const Color(0xFFEF4444));
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
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
                          fontWeight: FontWeight.w900,
                          color: AppStitchTheme.lightOnSurface,
                        ),
                  ),
                ),
                _badge(
                  b.status.isEmpty ? 'Booked' : (b.status[0].toUpperCase() + b.status.substring(1)),
                  color: statusColor,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.event_rounded, size: 14, color: AppStitchTheme.lightOnSurfaceMuted),
                const SizedBox(width: 6),
                Text(
                  '${b.startDate}${(b.endDate != null && b.endDate!.isNotEmpty) ? ' to ${b.endDate}' : ''}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppStitchTheme.lightOnSurfaceMuted,
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.schedule_rounded, size: 14, color: AppStitchTheme.lightOnSurfaceMuted),
                const SizedBox(width: 6),
                Text(
                  '${(b.startTime ?? '00:00').substring(0, 5)} - ${(b.endTime ?? '23:59').substring(0, 5)} • ${b.bookingType}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppStitchTheme.lightOnSurfaceMuted,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
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
        color: color.withValues(alpha: 0.22),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.45)),
      ),
      child: Text(
        t,
        style: TextStyle(
          color: color.withValues(alpha: 0.95),
          fontSize: 11,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.3,
        ),
      ),
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
            onChanged: (d) => _updateState(() => _weeklyStartDate = d),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _datePickerTile(
            label: 'End date',
            value: e,
            onChanged: (d) => _updateState(() => _weeklyEndDate = d),
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
      borderRadius: BorderRadius.circular(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 6),
            child: Text(
              label,
              style: TextStyle(
                color: AppStitchTheme.lightOnSurface.withValues(alpha: 0.7),
                fontWeight: FontWeight.w800,
                fontSize: 12,
              ),
            ),
          ),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: Colors.white.withValues(alpha: 0.45),
              border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.35)),
            ),
            child: Text(
              value == null ? '-' : _fmtDate(value),
              style: const TextStyle(fontWeight: FontWeight.w900, color: AppStitchTheme.lightOnSurface),
            ),
          ),
        ],
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
      borderRadius: BorderRadius.circular(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 6),
            child: Text(
              label,
              style: TextStyle(
                color: AppStitchTheme.lightOnSurface.withValues(alpha: 0.7),
                fontWeight: FontWeight.w800,
                fontSize: 12,
              ),
            ),
          ),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: Colors.white.withValues(alpha: 0.45),
              border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.35)),
            ),
            child: Text(
              _fmtTime(value),
              style: const TextStyle(fontWeight: FontWeight.w900, color: AppStitchTheme.lightOnSurface),
            ),
          ),
        ],
      ),
    );
  }

  void _toastError(String msg) {
    final clean = msg.replaceFirst('Exception: ', '').trim();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(clean.isEmpty ? 'Something went wrong' : clean),
      ),
    );
  }

  void _toastOk(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
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
                child: GlassCard(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
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
                              'Seat Booking',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w900,
                                  ),
                            ),
                            const SizedBox(height: 2),
                            _chip(
                              icon: Icons.location_on_rounded,
                              label: _officePillLabel(),
                              onTap: _openLocationFloorSheet,
                            ),
                          ],
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
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                child: GlassCard(
                  padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
                  child: Row(
                    children: [
                      Expanded(
                        child: _TabToggle<_SeatBookingTab>(
                          values: const [_SeatBookingTab.map, _SeatBookingTab.list],
                          labels: const ['Map', 'List'],
                          selected: _tab,
                          onChanged: (v) => setState(() => _tab = v),
                        ),
                      ),
                      const SizedBox(width: 10),
                      if (_tab == _SeatBookingTab.list)
                        _chip(
                          icon: Icons.event_rounded,
                          label: _fmtDate(_selectedDate),
                          onTap: () async {
                            final now = DateTime.now();
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: _selectedDate,
                              firstDate: DateTime(now.year - 1),
                              lastDate: DateTime(now.year + 3),
                            );
                            if (picked == null) return;
                            setState(() {
                              _selectedDate = picked;
                              _weeklyStartDate = picked;
                            });
                            await _fetchBookings();
                          },
                        ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: _tab == _SeatBookingTab.map
                      ? GlassCard(
                          padding: const EdgeInsets.all(0),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(24),
                            child: _buildMapTab(
                              floor: floor,
                              elements: elements,
                              canvasW: canvasW,
                              canvasH: canvasH,
                            ),
                          ),
                        )
                      : _buildListTab(elements: elements),
                ),
              ),
              if (_tab == _SeatBookingTab.map)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: GlassCard(
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _legendDot(const Color(0xFF10B981), 'Available'),
                        _legendDot(const Color(0xFFFB923C), 'Booked'),
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

  Future<void> _openTimeRangeSheet() async {
    final picked = await showModalBottomSheet<TimeRangeResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => TimeRangeSheet(
        initialStart: _targetStart,
        initialEnd: _targetEnd,
      ),
    );
    if (picked == null) return;
    setState(() {
      _targetStart = picked.start;
      _targetEnd = picked.end;
    });
    await _fetchBookings();
  }

  Future<void> _openLocationFloorSheet() async {
    if (_loadingLocations || _loadingFloors) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          child: GlassCard(
            borderRadius: 22,
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 5,
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: AppStitchTheme.lightOutline.withValues(alpha: 0.8),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Choose office & floor',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(ctx),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _locationDropdown(),
                const SizedBox(height: 10),
                _floorDropdown(),
                const SizedBox(height: 10),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMapTab({
    required OfficeFloor? floor,
    required List<LayoutElement> elements,
    required double canvasW,
    required double canvasH,
  }) {
    if (floor == null) return _emptyState('No floor selected.');
    if (elements.isEmpty) return _emptyState('No layout mapped for this floor.');

    return Stack(
      children: [
        InteractiveViewer(
          transformationController: _mapTransform,
          minScale: 0.15,
          maxScale: 5.0,
          clipBehavior: Clip.none,
          boundaryMargin: const EdgeInsets.all(double.infinity),
          child: SizedBox(
            width: canvasW,
            height: canvasH,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                const Positioned.fill(child: _MapDotGrid()),
                ...elements
                    .where((e) => e.type == 'zone' || e.type == 'room')
                    .map(_zoneWidget),
                ...elements.where((e) => e.type == 'label').map(_labelWidget),
                ...elements.where((e) => e.type == 'seat').map(_seatWidget),
              ],
            ),
          ),
        ),
        Positioned(
          left: 12,
          top: 12,
          right: 80,
          child: _floatingFilterBar(),
        ),
        Positioned(
          right: 12,
          top: 12,
          child: _floatingToolbar(),
        ),
        if (_loadingBookings || _loadingSeats || _loadingFloors)
          const Positioned(
            left: 0,
            right: 0,
            top: 0,
            child: LinearProgressIndicator(minHeight: 2),
          ),
      ],
    );
  }

  Widget _floatingFilterBar() {
    return GlassCard(
      blurSigma: 18,
      padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
      child: Row(
        children: [
          Expanded(
            child: _chip(
              icon: Icons.event_rounded,
              label: _fmtDate(_selectedDate),
              onTap: () async {
                final now = DateTime.now();
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime(now.year - 1),
                  lastDate: DateTime(now.year + 3),
                );
                if (picked == null) return;
                setState(() {
                  _selectedDate = picked;
                  _weeklyStartDate = picked;
                });
                await _fetchBookings();
              },
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _chip(
              icon: Icons.schedule_rounded,
              label: '${_fmtTime(_targetStart)}–${_fmtTime(_targetEnd)}',
              onTap: _openTimeRangeSheet,
            ),
          ),
        ],
      ),
    );
  }

  Widget _floatingToolbar() {
    return GlassCard(
      blurSigma: 18,
      padding: const EdgeInsets.all(6),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _toolIcon(Icons.search_rounded, 'Search', _openSeatSearch),
          const SizedBox(height: 6),
          _toolIcon(Icons.info_outline_rounded, 'Legend', () => showLegendPopover(context)),
          const SizedBox(height: 6),
          _toolIcon(Icons.center_focus_strong_rounded, 'Fit', _fitToFloor),
        ],
      ),
    );
  }

  Widget _toolIcon(IconData icon, String tooltip, VoidCallback onTap) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Tooltip(
          message: tooltip,
          child: Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              color: Colors.white.withValues(alpha: 0.62),
              border: Border.all(color: Colors.white.withValues(alpha: 0.85)),
            ),
            child: Icon(icon, color: AppStitchTheme.lightOnSurface),
          ),
        ),
      ),
    );
  }

  Widget _buildListTab({required List<LayoutElement> elements}) {
    final seats = elements.where((e) => e.type == 'seat').toList();
    return SeatSearchList(
      seats: seats,
      bookingForSeatNumber: (seatNumber) => _bookingBySeatNumber[seatNumber.toLowerCase()],
      initialsFromName: _initialsFromName,
      onViewOnMap: (seat) {
        setState(() {
          _tab = _SeatBookingTab.map;
        });
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _jumpToSeat(seat);
          _onSeatTap(seat);
        });
      },
    );
  }

  Future<void> _openSeatSearch() async {
    final floor = _selectedFloor;
    if (floor == null) return;
    final el = await showModalBottomSheet<LayoutElement>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) {
        final seats = floor.elements.where((e) => e.type == 'seat').toList();
        return SeatSearchSheet(
          seats: seats,
          bookingForSeatNumber: (seatNumber) => _bookingBySeatNumber[seatNumber.toLowerCase()],
          initialsFromName: _initialsFromName,
        );
      },
    );
    if (el == null) return;
    _jumpToSeat(el);
    await _onSeatTap(el);
  }

  void _fitToFloor() {
    _mapTransform.value = Matrix4.identity();
  }

  void _jumpToSeat(LayoutElement seat) {
    // Better dynamic jump scaling for different screens
    final scale = 1.35;
    // Calculate a safer offset assuming typical mobile screen bounds
    final tx = -(seat.x * scale) + 160;
    final ty = -(seat.y * scale) + 280;
    
    _mapTransform.value = Matrix4.identity()
      ..translate(tx, ty)
      ..scale(scale);
  }

  Widget _chip({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppStitchTheme.radiusPill),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppStitchTheme.radiusPill),
            color: Colors.white.withValues(alpha: 0.55),
            border: Border.all(
              color: AppStitchTheme.lightOutline.withValues(alpha: 0.65),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: AppStitchTheme.primary),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w800,
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
        alignment: Alignment.topLeft,
        child: el.type == 'zone' 
          ? CustomPaint(
              painter: _DashedBorderPainter(
                color: c.withValues(alpha: 0.6),
                strokeWidth: 1.2,
                dashWidth: 6,
                dashSpace: 4,
              ),
              child: Container(
                width: el.width,
                height: el.height,
                decoration: BoxDecoration(
                  color: c.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: _zoneLabel(el, c),
              ),
            )
          : Container(
              width: el.width,
              height: el.height,
              decoration: BoxDecoration(
                color: c.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: c.withValues(alpha: 0.6),
                  width: 2,
                ),
              ),
              child: _zoneLabel(el, c),
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
        alignment: Alignment.topLeft,
        child: SizedBox(
          width: el.width,
          child: Text(
            el.name,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: c.withValues(alpha: 0.85),
              fontSize: 18,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
            ),
          ),
        ),
      ),
    );
  }

  Widget _seatWidget(LayoutElement el) {
    final color = _seatColor(el);
    final isSelected = _selectedSeatEl?.id == el.id;
    final booking = _bookingForSeat(el);
    final initials = booking == null ? null : _initialsFromName(booking.employeeDetails.name);
    final hitW = math.max(34.0, el.width);
    final hitH = math.max(34.0, el.height);
    return Positioned(
      left: el.x,
      top: el.y,
      child: Transform.rotate(
        angle: el.rotation * math.pi / 180,
        alignment: Alignment.topLeft,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: () => _onSeatTap(el),
            onLongPress: () {
              final b = _bookingForSeat(el);
              final msg = b == null
                  ? 'Seat ${el.name} • Available'
                  : 'Seat ${el.name} • ${b.employeeDetails.name}';
              _toastOk(msg);
            },
            child: SizedBox(
              width: hitW,
              height: hitH,
              child: Center(
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  width: el.width,
                  height: el.height,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: isSelected ? AppStitchTheme.primary : Colors.white.withValues(alpha: 0.9),
                      width: isSelected ? 2.5 : 0.8,
                    ),
                  ),
                  child: Stack(
                    children: [
                      Center(
                        child: Text(
                          el.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      if (initials != null)
                        Positioned(
                          right: 4,
                          bottom: 4,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.28),
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.35),
                              ),
                            ),
                            child: Text(
                              initials,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.4,
                              ),
                            ),
                          ),
                        ),
                    ],
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

  Widget _zoneLabel(LayoutElement el, Color c) {
    return Align(
      alignment: Alignment.topLeft,
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Text(
          el.name,
          style: TextStyle(
            color: c,
            fontSize: el.type == 'room' ? 13 : 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.5,
          ),
        ),
      ),
    );
  }

  // Subtle dotted grid behind the map to add depth cues.
  // (Paint-only; does not affect backend behavior or hit-testing.)
}

class _DashedBorderPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;
  final double dashWidth;
  final double dashSpace;

  _DashedBorderPainter({
    required this.color,
    this.strokeWidth = 1,
    this.dashWidth = 5,
    this.dashSpace = 3,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final path = Path();
    path.addRRect(RRect.fromRectAndRadius(
        Rect.fromLTWH(0, 0, size.width, size.height), Radius.zero));

    final metrics = path.computeMetrics();
    for (final metric in metrics) {
      double distance = 0.0;
      while (distance < metric.length) {
        canvas.drawPath(
          metric.extractPath(distance, distance + dashWidth),
          paint,
        );
        distance += dashWidth + dashSpace;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _MapDotGrid extends StatelessWidget {
  const _MapDotGrid();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: CustomPaint(
        painter: _DotGridPainter(),
      ),
    );
  }
}

class _DotGridPainter extends CustomPainter {
  static const double step = 18;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withValues(alpha: 0.06)
      ..style = PaintingStyle.fill;
    for (double y = 0; y <= size.height; y += step) {
      for (double x = 0; x <= size.width; x += step) {
        canvas.drawCircle(Offset(x, y), 1.0, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _TabToggle<T> extends StatelessWidget {
  final List<T> values;
  final List<String> labels;
  final T selected;
  final ValueChanged<T> onChanged;

  const _TabToggle({
    required this.values,
    required this.labels,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      borderRadius: 22,
      padding: const EdgeInsets.all(6),
      child: Row(
        children: List.generate(values.length, (i) {
          final value = values[i];
          final label = labels[i];
          final isActive = value == selected;
          return Expanded(
            child: InkWell(
              onTap: () => onChanged(value),
              borderRadius: BorderRadius.circular(18),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOutCubic,
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  color: isActive ? AppStitchTheme.primary.withValues(alpha: 0.12) : Colors.transparent,
                ),
                child: Center(
                  child: Text(
                    label,
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: isActive ? AppStitchTheme.primary : AppStitchTheme.lightOnSurfaceMuted,
                        ),
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

