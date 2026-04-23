import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../theme/app_stitch_theme.dart';
import '../../services/employee_service.dart';
import '../../models/conference_room_model.dart';
import '../../models/seat_booking_models.dart';
import '../../services/seat_booking_service.dart';
import '../../widgets/stitch_background.dart';
import '../../widgets/glass_card.dart';
import 'dart:math' as math;

class ConfRoomBookingPage extends StatefulWidget {
  const ConfRoomBookingPage({super.key});

  @override
  State<ConfRoomBookingPage> createState() => _ConfRoomBookingPageState();
}

class _ConfRoomBookingPageState extends State<ConfRoomBookingPage> {
  bool _loadingLocations = true;
  bool _loadingFloors = false;
  bool _loadingRooms = false;
  bool _loadingBookings = false;

  List<OfficeLocation> _locations = [];
  OfficeLocation? _selectedLocation;

  List<OfficeFloor> _floors = [];
  OfficeFloor? _selectedFloor;

  List<ConferenceRoom> _rooms = [];
  List<ConferenceBooking> _bookings = [];
  ConferenceConfig? _config;

  DateTime _selectedDate = DateTime.now();

  final TransformationController _mapTransform = TransformationController();

  @override
  void initState() {
    super.initState();
    _fetchLocations();
    _fetchConfig();
  }

  @override
  void dispose() {
    _mapTransform.dispose();
    super.dispose();
  }

  Future<void> _fetchConfig() async {
    final res = await EmployeeService.getConferenceRoomConfig();
    if (res.success) {
      if (mounted) setState(() => _config = res.data);
    }
  }

  Future<void> _fetchLocations() async {
    setState(() => _loadingLocations = true);
    try {
      final locs = await SeatBookingService.fetchLocations();
      if (mounted) {
        setState(() {
          _loadingLocations = false;
          _locations = locs;
          if (_locations.isNotEmpty) {
            _selectedLocation = _locations.first;
            _fetchFloors(_selectedLocation!.id);
          }
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingLocations = false);
    }
  }

  Future<void> _fetchFloors(int locationId) async {
    setState(() => _loadingFloors = true);
    try {
      final flrs = await SeatBookingService.fetchFloors(locationId: locationId);
      if (mounted) {
        setState(() {
          _loadingFloors = false;
          _floors = flrs;
          if (_floors.isNotEmpty) {
            _selectedFloor = _floors.first;
            _fetchRoomData();
          } else {
            _selectedFloor = null;
            _rooms = [];
            _bookings = [];
          }
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingFloors = false);
    }
  }

  Future<void> _fetchRoomData() async {
    if (_selectedFloor == null) return;
    setState(() => _loadingRooms = true);
    
    final resRooms = await EmployeeService.getConferenceRooms(floorId: _selectedFloor!.id);
    if (mounted) {
      setState(() {
        if (resRooms.success && resRooms.data != null) {
          _rooms = resRooms.data!;
        }
        _loadingRooms = false;
      });
      await _fetchBookings();
    }
  }

  Future<void> _fetchBookings() async {
    if (_selectedFloor == null) return;
    setState(() => _loadingBookings = true);
    final fmtDate = DateFormat('yyyy-MM-dd').format(_selectedDate);
    final res = await EmployeeService.getConferenceRoomBookings(
      floorId: _selectedFloor!.id,
      date: fmtDate,
    );
    if (mounted) {
      setState(() {
        _loadingBookings = false;
        if (res.success && res.data != null) {
          _bookings = res.data!;
        } else {
          _bookings = [];
        }
      });
    }
  }

  ConferenceRoom? _getRoomByLayoutId(String layoutId) {
    try {
      return _rooms.firstWhere((r) => r.layoutElementId == layoutId);
    } catch (_) {
      return null;
    }
  }

  Color _getRoomColor(LayoutElement el) {
    if (el.color != null && el.color!.isNotEmpty) return Color(int.parse(el.color!.replaceFirst('#', '0xFF')));
    final todayBookings = _bookings.where((b) => b.roomDetails.layoutElementId == el.id && b.status != 'rejected');
    if (todayBookings.isEmpty) return const Color(0xFF10B981); // Green
    return const Color(0xFFFB923C); // Orange
  }

  void _onRoomTap(LayoutElement el) {
    final confRoom = _getRoomByLayoutId(el.id);
    if (confRoom == null) return;
    _showBookingSheet(confRoom);
  }

  String _fmtDate(DateTime d) => DateFormat('MMM dd, yyyy').format(d);

  Widget _zoneWidget(LayoutElement el) {
    if (el.type == 'room') {
      final confRoom = _getRoomByLayoutId(el.id);
      final isRealRoom = confRoom != null;
      final color = isRealRoom ? _getRoomColor(el) : const Color(0xFF94A3B8); // Grey fallback

      return Positioned(
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: isRealRoom 
            ? () => _onRoomTap(el) 
            : () => ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Room "${el.name}" (ID: ${el.id}) is not linked to an active conference room.')),
              ),
          child: Container(
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.92),
              border: Border.all(
                color: color.withValues(alpha: 0.3),
                width: 1,
              ),
              borderRadius: BorderRadius.circular(10),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: isRealRoom
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 8, left: 4, right: 4),
                        child: Text(
                          confRoom.name,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: -0.2,
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(
                          '${confRoom.capacity ?? "0"} PPL',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: Colors.white.withValues(alpha: 0.8),
                          ),
                        ),
                      ),
                    ],
                  )
                : Center(
                    child: Text(
                      el.name,
                      style: const TextStyle(fontSize: 8, color: Colors.white70),
                    ),
                  ),
          ),
        ),
      );
    }

    if (el.type == 'zone') {
      return Positioned(
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        child: CustomPaint(
          painter: _DashedBorderPainter(
            color: const Color(0xFF6366F1).withValues(alpha: 0.6),
            strokeWidth: 2,
            dashWidth: 6,
            dashSpace: 4,
          ),
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFF6366F1).withValues(alpha: 0.04),
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
      );
    }

    return Positioned(
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.transparent,
          border: Border.all(
            color: AppStitchTheme.lightOutline.withValues(alpha: 0.1),
            width: 1,
          ),
        ),
      ),
    );
  }

  Widget _labelWidget(LayoutElement el) {
    return Positioned(
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      child: Center(
        child: Transform.rotate(
          angle: el.rotation * math.pi / 180,
          child: Text(
            el.name,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: AppStitchTheme.lightOnSurfaceMuted,
            ),
          ),
        ),
      ),
    );
  }

  Widget _seatWidget(LayoutElement el) {
    return Positioned(
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      child: Transform.rotate(
        angle: el.rotation * math.pi / 180,
        child: Opacity(
          opacity: 0.2, // Even more subtle background seats
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF1F2F3),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
            ),
          ),
        ),
      ),
    );
  }

  Widget _doorWidget(LayoutElement el) {
    return Positioned(
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      child: Transform.rotate(
        angle: el.rotation * math.pi / 180,
        child: CustomPaint(
          painter: _DoorPainter(),
        ),
      ),
    );
  }

  void _showBookingSheet(ConferenceRoom room) {
    TimeOfDay startTime = const TimeOfDay(hour: 9, minute: 0);
    TimeOfDay endTime = const TimeOfDay(hour: 10, minute: 0);
    final purposeCtrl = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return StatefulBuilder(builder: (context, sheetSetState) {
          
          int durationMins = (endTime.hour * 60 + endTime.minute) - (startTime.hour * 60 + startTime.minute);
          if (durationMins < 0) durationMins += 24 * 60;
          bool needsApproval = _config != null && durationMins > _config!.approvalLimitMinutes;

          return Container(
            decoration: const BoxDecoration(
              color: AppStitchTheme.lightSurface,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: EdgeInsets.fromLTRB(20, 12, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: AppStitchTheme.lightOutline,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Text(
                  room.name,
                  style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text('Capacity: ${room.capacity ?? "Unknown"} people', style: const TextStyle(color: AppStitchTheme.lightOnSurfaceMuted)),
                const SizedBox(height: 20),
                
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final time = await showTimePicker(context: ctx, initialTime: startTime);
                          if (time != null) sheetSetState(() => startTime = time);
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(labelText: 'Start Time', border: OutlineInputBorder()),
                          child: Text(startTime.format(ctx)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final time = await showTimePicker(context: ctx, initialTime: endTime);
                          if (time != null) sheetSetState(() => endTime = time);
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(labelText: 'End Time', border: OutlineInputBorder()),
                          child: Text(endTime.format(ctx)),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                TextField(
                  controller: purposeCtrl,
                  decoration: const InputDecoration(labelText: 'Meeting Purpose', border: OutlineInputBorder()),
                ),
                
                if (needsApproval)
                  Container(
                    margin: const EdgeInsets.only(top: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFF59E0B)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.access_time_filled, color: Color(0xFFF59E0B)),
                        SizedBox(width: 8),
                        Expanded(child: Text('Duration exceeds auto-approval limit. This booking will require admin approval.', style: TextStyle(color: Color(0xFF92400E)))),
                      ],
                    ),
                  ),
                  
                const SizedBox(height: 24),
                
                ElevatedButton(
                  onPressed: isSubmitting ? null : () async {
                    sheetSetState(() => isSubmitting = true);
                    final startStr = '${startTime.hour.toString().padLeft(2, '0')}:${startTime.minute.toString().padLeft(2, '0')}';
                    final endStr = '${endTime.hour.toString().padLeft(2, '0')}:${endTime.minute.toString().padLeft(2, '0')}';
                    
                    final response = await EmployeeService.bookConferenceRoom(
                      roomId: room.id,
                      date: DateFormat('yyyy-MM-dd').format(_selectedDate),
                      startTime: startStr,
                      endTime: endStr,
                      purpose: purposeCtrl.text,
                    );
                    
                    sheetSetState(() => isSubmitting = false);
                    
                    if (response.success && mounted) {
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(ctx).showSnackBar(
                        const SnackBar(content: Text('Room booked successfully.')),
                      );
                      _fetchBookings();
                    } else if (mounted) {
                      ScaffoldMessenger.of(ctx).showSnackBar(
                        SnackBar(content: Text(response.message ?? 'Booking failed')),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppStitchTheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: isSubmitting ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white)) : const Text('Book Room'),
                ),
                
                const SizedBox(height: 24),
                const Text('Today\'s Schedule', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ..._bookings.where((b) => b.roomDetails.layoutElementId == room.layoutElementId).map((b) => ListTile(
                  title: Text(b.purpose),
                  subtitle: Text('${b.startTime} - ${b.endTime} • ${b.status}'),
                  dense: true,
                )),
              ],
            ),
          );
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingLocations) {
      return const StitchBackground(child: Scaffold(backgroundColor: Colors.transparent, body: Center(child: CircularProgressIndicator())));
    }

    final canvasW = 1200.0;
    final canvasH = 1200.0;
    final elList = _selectedFloor?.elements ?? [];

    return StitchBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: const Text('Book Conference Room', style: TextStyle(color: AppStitchTheme.lightOnSurface, fontWeight: FontWeight.w800)),
          iconTheme: const IconThemeData(color: AppStitchTheme.lightOnSurface),
        ),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<int>(
                      value: _selectedLocation?.id,
                      decoration: InputDecoration(
                        labelText: 'Location',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      items: _locations.map((l) => DropdownMenuItem(value: l.id, child: Text(l.name))).toList(),
                      onChanged: (val) {
                        final loc = _locations.firstWhere((x) => x.id == val);
                        setState(() => _selectedLocation = loc);
                        _fetchFloors(loc.id);
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _loadingFloors 
                      ? const Center(child: CircularProgressIndicator())
                      : DropdownButtonFormField<int>(
                          value: _selectedFloor?.id,
                          decoration: InputDecoration(
                            labelText: 'Floor',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          items: _floors.map((f) => DropdownMenuItem(value: f.id, child: Text(f.name))).toList(),
                          onChanged: (val) {
                            final floor = _floors.firstWhere((x) => x.id == val);
                            setState(() => _selectedFloor = floor);
                            _fetchRoomData();
                          },
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                child: GlassCard(
                  padding: EdgeInsets.zero,
                  child: Stack(
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
                              ...elList.where((e) => e.type == 'seat').map(_seatWidget),
                              ...elList.where((e) => e.type == 'door').map(_doorWidget),
                              ...elList.where((e) => e.type == 'zone' || e.type == 'room').map(_zoneWidget),
                              ...elList.where((e) => e.type == 'label').map(_labelWidget),
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        left: 12, top: 12,
                        child: InkWell(
                          onTap: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: _selectedDate,
                              firstDate: DateTime.now().subtract(const Duration(days: 30)),
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                            );
                            if (picked != null) {
                              setState(() => _selectedDate = picked);
                              _fetchBookings();
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.8),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppStitchTheme.lightOutline),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.event, size: 18, color: AppStitchTheme.primary),
                                const SizedBox(width: 8),
                                Text(_fmtDate(_selectedDate), style: const TextStyle(fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      if (_loadingRooms || _loadingBookings)
                        const Positioned(top: 0, left: 0, right: 0, child: LinearProgressIndicator()),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
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
  static const double step = 20;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withValues(alpha: 0.08)
      ..style = PaintingStyle.fill;
    for (double y = 0; y <= size.height; y += step) {
      for (double x = 0; x <= size.width; x += step) {
        canvas.drawCircle(Offset(x, y), 0.8, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
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
        Rect.fromLTWH(0, 0, size.width, size.height), const Radius.circular(4)));

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

class _DoorPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFCBD5E1) // Slate 300
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    // Draw the door arc path
    final rect = Rect.fromLTWH(0, 0, size.width * 2, size.height * 2);
    canvas.drawArc(rect, math.pi, math.pi / 2, false, paint);

    // Draw the door line
    canvas.drawLine(Offset.zero, Offset(0, size.height), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
