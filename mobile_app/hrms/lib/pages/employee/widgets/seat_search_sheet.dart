import 'package:flutter/material.dart';

import '../../../models/seat_booking_models.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';

typedef BookingLookup = SeatBooking? Function(String seatNumber);
typedef InitialsFn = String Function(String name);

class SeatSearchSheet extends StatefulWidget {
  final List<LayoutElement> seats;
  final BookingLookup bookingForSeatNumber;
  final InitialsFn initialsFromName;

  const SeatSearchSheet({
    super.key,
    required this.seats,
    required this.bookingForSeatNumber,
    required this.initialsFromName,
  });

  @override
  State<SeatSearchSheet> createState() => _SeatSearchSheetState();
}

class _SeatSearchSheetState extends State<SeatSearchSheet> {
  final TextEditingController _query = TextEditingController();
  bool _available = false;
  bool _booked = false;
  bool _permanent = false;

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  List<LayoutElement> get _filtered {
    final q = _query.text.trim().toLowerCase();
    return widget.seats.where((s) {
      final b = widget.bookingForSeatNumber(s.name);
      final isAvailable = b == null;
      final isPermanent = b?.bookingType == 'permanent';
      final isBooked = b != null && !isPermanent;

      if (_available && !isAvailable) return false;
      if (_booked && !isBooked) return false;
      if (_permanent && !isPermanent) return false;

      if (q.isEmpty) return true;
      final seatMatch = s.name.toLowerCase().contains(q);
      final occMatch = (b?.employeeDetails.name ?? '').toLowerCase().contains(q);
      return seatMatch || occMatch;
    }).toList()
      ..sort((a, b) => a.name.compareTo(b.name));
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      child: GlassCard(
        borderRadius: 22,
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
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
                    'Search seats',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _query,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search_rounded),
                hintText: 'Seat number or occupant name…',
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _filterChip('Available', _available, (v) => setState(() => _available = v)),
                _filterChip('Booked', _booked, (v) => setState(() => _booked = v)),
                _filterChip('Permanent', _permanent, (v) => setState(() => _permanent = v)),
              ],
            ),
            const SizedBox(height: 12),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 420),
              child: SeatSearchList(
                seats: _filtered,
                bookingForSeatNumber: widget.bookingForSeatNumber,
                initialsFromName: widget.initialsFromName,
                onViewOnMap: (s) => Navigator.pop(context, s),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String label, bool selected, ValueChanged<bool> onChanged) {
    return FilterChip(
      selected: selected,
      label: Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
      onSelected: onChanged,
      selectedColor: AppStitchTheme.primary.withValues(alpha: 0.18),
      checkmarkColor: AppStitchTheme.primary,
      side: BorderSide(color: AppStitchTheme.lightOutline.withValues(alpha: 0.65)),
      backgroundColor: Colors.white.withValues(alpha: 0.55),
    );
  }
}

class SeatSearchList extends StatelessWidget {
  final List<LayoutElement> seats;
  final BookingLookup bookingForSeatNumber;
  final InitialsFn initialsFromName;
  final ValueChanged<LayoutElement> onViewOnMap;

  const SeatSearchList({
    super.key,
    required this.seats,
    required this.bookingForSeatNumber,
    required this.initialsFromName,
    required this.onViewOnMap,
  });

  @override
  Widget build(BuildContext context) {
    if (seats.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(18),
        child: Text(
          'No seats match your filters.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppStitchTheme.lightOnSurfaceMuted,
                fontWeight: FontWeight.w700,
              ),
        ),
      );
    }
    return ListView.separated(
      shrinkWrap: true,
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      itemCount: seats.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, i) {
        final seat = seats[i];
        final b = bookingForSeatNumber(seat.name);
        final status = b == null
            ? 'Available'
            : (b.bookingType == 'permanent' ? 'Permanent' : 'Booked');
        final statusColor = b == null
            ? const Color(0xFF10B981)
            : (b.bookingType == 'permanent' ? const Color(0xFFD946EF) : const Color(0xFFF59E0B));
        final occupant = b?.employeeDetails.name;
        final initials = occupant == null ? null : initialsFromName(occupant);

        return InkWell(
          onTap: () => onViewOnMap(seat),
          borderRadius: BorderRadius.circular(18),
          child: Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              color: Colors.white.withValues(alpha: 0.45),
              border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.35)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    color: statusColor.withValues(alpha: 0.18),
                    border: Border.all(color: statusColor.withValues(alpha: 0.40)),
                  ),
                  child: Center(
                    child: Text(
                      initials ?? seat.name,
                      style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.w900,
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
                        'Seat ${seat.name}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          color: AppStitchTheme.lightOnSurface,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        occupant == null ? status : '$status • $occupant',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppStitchTheme.lightOnSurfaceMuted,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.chevron_right_rounded, color: AppStitchTheme.lightOnSurfaceMuted),
              ],
            ),
          ),
        );
      },
    );
  }
}

