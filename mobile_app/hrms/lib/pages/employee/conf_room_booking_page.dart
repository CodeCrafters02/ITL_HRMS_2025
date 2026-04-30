import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'dart:async';
import '../../theme/app_stitch_theme.dart';
import '../../services/employee_service.dart';
import '../../models/conference_room_model.dart';
import '../../models/seat_booking_models.dart';
import '../../services/seat_booking_service.dart';
import '../../widgets/stitch_background.dart';
import '../../widgets/glass_card.dart';
import 'dart:math' as math;

enum LoadingState { idle, loading, error }

enum RoomSize { small, medium, large, boardroom }

class ConfRoomBookingPage extends StatefulWidget {
  const ConfRoomBookingPage({super.key});

  @override
  State<ConfRoomBookingPage> createState() => _ConfRoomBookingPageState();
}

class _ConfRoomBookingPageState extends State<ConfRoomBookingPage> {
  // Unified loading state
  LoadingState _loadingState = LoadingState.loading;
  String? _errorMessage;
  DateTime _lastUpdated = DateTime.now();

  // Data cache
  final Map<int, List<OfficeFloor>> _floorsCache = {};
  List<OfficeLocation>? _locationsCache;
  DateTime? _locationsCacheTime;
  static const Duration _cacheExpiry = Duration(minutes: 5);

  // Debounce timers
  Timer? _floorDebounceTimer;
  Timer? _locationDebounceTimer;

  // Legacy loading flags (for granular control during transition)
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
  String? _selectedRoomId;

  // Search and filter
  String _searchQuery = '';
  RoomSize? _selectedSizeFilter;
  bool _showAvailableOnly = false;

  final TransformationController _mapTransform = TransformationController();
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchLocations();
    _fetchConfig();
  }

  @override
  void dispose() {
    _floorDebounceTimer?.cancel();
    _locationDebounceTimer?.cancel();
    _mapTransform.dispose();
    _searchController.dispose();
    super.dispose();
  }

  // Safe setState that checks mounted status
  void _safeSetState(VoidCallback fn) {
    if (mounted) {
      setState(fn);
    }
  }

  Future<void> _fetchConfig() async {
    final res = await EmployeeService.getConferenceRoomConfig();
    if (res.success) {
      if (mounted) setState(() => _config = res.data);
    }
  }

  Future<void> _fetchLocations() async {
    // Check cache first
    if (_locationsCache != null && _locationsCacheTime != null) {
      if (DateTime.now().difference(_locationsCacheTime!) < _cacheExpiry) {
        _safeSetState(() {
          _loadingLocations = false;
          _loadingState = LoadingState.idle;
          _locations = _locationsCache!;
          if (_locations.isNotEmpty && _selectedLocation == null) {
            _selectedLocation = _locations.first;
            _fetchFloors(_selectedLocation!.id);
          }
        });
        return;
      }
    }

    _safeSetState(() {
      _loadingLocations = true;
      _loadingState = LoadingState.loading;
    });

    try {
      final locs = await SeatBookingService.fetchLocations();
      _locationsCache = locs;
      _locationsCacheTime = DateTime.now();

      _safeSetState(() {
        _loadingLocations = false;
        _loadingState = LoadingState.idle;
        _lastUpdated = DateTime.now();
        _locations = locs;
        if (_locations.isNotEmpty) {
          _selectedLocation = _locations.first;
          _fetchFloors(_selectedLocation!.id);
        }
      });
    } catch (e) {
      _safeSetState(() {
        _loadingLocations = false;
        _loadingState = LoadingState.error;
        _errorMessage = 'Failed to load locations. Please try again.';
      });
      _showErrorSnackBar('Failed to load locations');
    }
  }

  void _showErrorSnackBar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red[700],
          behavior: SnackBarBehavior.floating,
          action: SnackBarAction(
            label: 'Retry',
            textColor: Colors.white,
            onPressed: () {
              _fetchLocations();
            },
          ),
        ),
      );
    }
  }

  Future<void> _fetchFloors(int locationId) async {
    // Cancel any pending debounce timer
    _floorDebounceTimer?.cancel();

    // Check cache first
    if (_floorsCache.containsKey(locationId)) {
      final cached = _floorsCache[locationId]!;
      _safeSetState(() {
        _loadingFloors = false;
        _floors = cached;
        if (_floors.isNotEmpty) {
          _selectedFloor = _floors.first;
          _fetchRoomData();
        } else {
          _selectedFloor = null;
          _rooms = [];
          _bookings = [];
        }
      });
      return;
    }

    _safeSetState(() => _loadingFloors = true);

    try {
      final flrs = await SeatBookingService.fetchFloors(locationId: locationId);
      _floorsCache[locationId] = flrs;

      _safeSetState(() {
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
    } catch (e) {
      _safeSetState(() => _loadingFloors = false);
      _showErrorSnackBar('Failed to load floors');
    }
  }

  Future<void> _fetchRoomData() async {
    if (_selectedFloor == null) return;
    _safeSetState(() => _loadingRooms = true);

    try {
      final resRooms = await EmployeeService.getConferenceRooms(floorId: _selectedFloor!.id);
      _safeSetState(() {
        if (resRooms.success && resRooms.data != null) {
          _rooms = resRooms.data!;
        } else {
          _rooms = [];
        }
        _loadingRooms = false;
      });
      await _fetchBookings();
    } catch (e) {
      _safeSetState(() => _loadingRooms = false);
      _showErrorSnackBar('Failed to load rooms');
    }
  }

  Future<void> _fetchBookings() async {
    if (_selectedFloor == null) return;
    _safeSetState(() => _loadingBookings = true);

    try {
      final fmtDate = DateFormat('yyyy-MM-dd').format(_selectedDate);
      final res = await EmployeeService.getConferenceRoomBookings(
        floorId: _selectedFloor!.id,
        date: fmtDate,
      );
      _safeSetState(() {
        _loadingBookings = false;
        _lastUpdated = DateTime.now();
        if (res.success && res.data != null) {
          _bookings = res.data!;
        } else {
          _bookings = [];
        }
      });
    } catch (e) {
      _safeSetState(() => _loadingBookings = false);
      _showErrorSnackBar('Failed to load bookings');
    }
  }

  ConferenceRoom? _getRoomByLayoutId(String layoutId) {
    try {
      return _rooms.firstWhere((r) => r.layoutElementId == layoutId);
    } catch (_) {
      return null;
    }
  }

  RoomSize _getRoomSize(int? capacity) {
    if (capacity == null) return RoomSize.small;
    if (capacity <= 4) return RoomSize.small;
    if (capacity <= 8) return RoomSize.medium;
    if (capacity <= 16) return RoomSize.large;
    return RoomSize.boardroom;
  }

  String _getRoomSizeLabel(RoomSize size) {
    switch (size) {
      case RoomSize.small:
        return 'Small';
      case RoomSize.medium:
        return 'Medium';
      case RoomSize.large:
        return 'Large';
      case RoomSize.boardroom:
        return 'Boardroom';
    }
  }

  Color _getRoomSizeColor(RoomSize size) {
    switch (size) {
      case RoomSize.small:
        return AppStitchTheme.kpiCalendar;
      case RoomSize.medium:
        return AppStitchTheme.kpiTasks;
      case RoomSize.large:
        return AppStitchTheme.kpiLeaves;
      case RoomSize.boardroom:
        return AppStitchTheme.kpiHolidays;
    }
  }

  // Debounced location change handler
  void _onLocationChanged(int? locationId) {
    _locationDebounceTimer?.cancel();
    _locationDebounceTimer = Timer(const Duration(milliseconds: 300), () {
      if (locationId != null) {
        final loc = _locations.firstWhere((x) => x.id == locationId);
        _safeSetState(() => _selectedLocation = loc);
        _fetchFloors(loc.id);
      }
    });
  }

  // Debounced floor change handler
  void _onFloorChanged(int? floorId) {
    _floorDebounceTimer?.cancel();
    _floorDebounceTimer = Timer(const Duration(milliseconds: 300), () {
      if (floorId != null) {
        final floor = _floors.firstWhere((x) => x.id == floorId);
        _safeSetState(() => _selectedFloor = floor);
        _fetchRoomData();
      }
    });
  }

  // Filter rooms based on search query and filters
  List<LayoutElement> _getFilteredRooms(List<LayoutElement> elements) {
    return elements.where((el) {
      if (el.type != 'room') return true; // Keep non-room elements

      final confRoom = _getRoomByLayoutId(el.id);
      if (confRoom == null) return !_showAvailableOnly; // Show unlinked rooms only if not filtering

      // Search filter
      if (_searchQuery.isNotEmpty) {
        if (!confRoom.name.toLowerCase().contains(_searchQuery.toLowerCase())) {
          return false;
        }
      }

      // Size filter
      if (_selectedSizeFilter != null) {
        final roomSize = _getRoomSize(confRoom.capacity);
        if (roomSize != _selectedSizeFilter) return false;
      }

      // Availability filter
      if (_showAvailableOnly) {
        final todayBookings = _bookings.where(
          (b) => b.roomDetails.layoutElementId == el.id && b.status != 'rejected',
        );
        if (todayBookings.isNotEmpty) return false;
      }

      return true;
    }).toList();
  }

  int _getAvailableRoomCount() {
    return _rooms.where((room) {
      final todayBookings = _bookings.where(
        (b) => b.roomDetails.layoutElementId == room.layoutElementId && b.status != 'rejected',
      );
      return todayBookings.isEmpty;
    }).length;
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
      final isSelected = _selectedRoomId == el.id;

      // Determine room color and status
      final Color roomColor;
      final bool isAvailable;
      if (isRealRoom) {
        final todayBookings = _bookings.where(
          (b) => b.roomDetails.layoutElementId == el.id && b.status != 'rejected',
        );
        isAvailable = todayBookings.isEmpty;
        roomColor = isAvailable ? const Color(0xFF10B981) : const Color(0xFFFB923C);
      } else {
        roomColor = const Color(0xFF94A3B8);
        isAvailable = false;
      }

      // Get room size for styling
      final roomSize = isRealRoom ? _getRoomSize(confRoom.capacity) : RoomSize.small;
      final sizeColor = _getRoomSizeColor(roomSize);

      return Positioned(
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        child: AnimatedScale(
          scale: isSelected ? 1.05 : 1.0,
          duration: const Duration(milliseconds: 150),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: isRealRoom
                ? () {
                    HapticFeedback.lightImpact();
                    _safeSetState(() => _selectedRoomId = el.id);
                    Future.delayed(const Duration(milliseconds: 150), () {
                      _onRoomTap(el);
                      _safeSetState(() => _selectedRoomId = null);
                    });
                  }
                : () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Room "${el.name}" is not linked to an active conference room.')),
                    );
                  },
              borderRadius: BorderRadius.circular(10),
              child: Container(
                decoration: BoxDecoration(
                  color: roomColor,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSelected ? AppStitchTheme.primary : Colors.white.withValues(alpha: 0.2),
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        el.name,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                      if (isRealRoom && confRoom.capacity != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          '${confRoom.capacity} PPL',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: Colors.white.withValues(alpha: 0.8),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
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
          alignment: Alignment.topLeft,
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
        alignment: Alignment.topLeft,
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
        alignment: Alignment.topLeft,
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

  Widget _buildEmptyState(String message, IconData icon) {
    return Center(
      child: GlassCard(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 64,
              color: AppStitchTheme.lightOnSurfaceMuted,
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppStitchTheme.lightOnSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchFilterBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          // Search Field
          TextField(
            controller: _searchController,
            onChanged: (value) {
              _safeSetState(() => _searchQuery = value);
            },
            decoration: InputDecoration(
              hintText: 'Search rooms...',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _searchQuery.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, size: 18),
                    onPressed: () {
                      _searchController.clear();
                      _safeSetState(() => _searchQuery = '');
                    },
                  )
                : null,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
          ),
          const SizedBox(height: 8),
          // Filter Chips Row
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                // Availability Toggle
                FilterChip(
                  label: const Text('Available Only'),
                  selected: _showAvailableOnly,
                  onSelected: (selected) {
                    _safeSetState(() => _showAvailableOnly = selected);
                  },
                  checkmarkColor: Colors.white,
                  selectedColor: AppStitchTheme.primary,
                  labelStyle: TextStyle(
                    color: _showAvailableOnly ? Colors.white : AppStitchTheme.lightOnSurface,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(width: 8),
                // Size Filters
                ...RoomSize.values.map((size) {
                  final isSelected = _selectedSizeFilter == size;
                  final color = _getRoomSizeColor(size);
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(_getRoomSizeLabel(size)),
                      selected: isSelected,
                      onSelected: (selected) {
                        _safeSetState(() => _selectedSizeFilter = selected ? size : null);
                      },
                      selectedColor: color.withValues(alpha: 0.2),
                      backgroundColor: Colors.white.withValues(alpha: 0.5),
                      side: BorderSide(
                        color: isSelected ? color : AppStitchTheme.lightOutline.withValues(alpha: 0.5),
                      ),
                      labelStyle: TextStyle(
                        color: isSelected ? color : AppStitchTheme.lightOnSurfaceVariant,
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  );
                }),
                // Clear Filters
                if (_searchQuery.isNotEmpty || _selectedSizeFilter != null || _showAvailableOnly)
                  TextButton.icon(
                    onPressed: () {
                      _searchController.clear();
                      _safeSetState(() {
                        _searchQuery = '';
                        _selectedSizeFilter = null;
                        _showAvailableOnly = false;
                      });
                    },
                    icon: const Icon(Icons.clear_all, size: 16),
                    label: const Text('Clear', style: TextStyle(fontSize: 12)),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegendPanel() {
    final availableCount = _getAvailableRoomCount();
    final totalCount = _rooms.length;

    return Positioned(
      left: 12,
      bottom: 12,
      child: GlassCard(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        borderRadius: 12,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Quick Stats
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.meeting_room, size: 14, color: AppStitchTheme.primary),
                const SizedBox(width: 6),
                Text(
                  '$availableCount of $totalCount available',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppStitchTheme.lightOnSurface,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Divider(height: 1),
            const SizedBox(height: 6),
            // Legend Items
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildLegendItem('Available', const Color(0xFF10B981)),
                const SizedBox(width: 12),
                _buildLegendItem('Booked', const Color(0xFFFB923C)),
                const SizedBox(width: 12),
                _buildLegendItem('Unlinked', const Color(0xFF94A3B8)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: AppStitchTheme.lightOnSurfaceVariant,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    // Show loading state with shimmer effect
    if (_loadingState == LoadingState.loading && _locations.isEmpty) {
      return StitchBackground(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const CircularProgressIndicator(color: AppStitchTheme.primary),
                const SizedBox(height: 16),
                Text(
                  'Loading conference rooms...',
                  style: TextStyle(
                    color: AppStitchTheme.lightOnSurfaceMuted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Show error state
    if (_loadingState == LoadingState.error && _locations.isEmpty) {
      return StitchBackground(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          body: Center(
            child: GlassCard(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: AppStitchTheme.lightOnSurfaceMuted,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Unable to load data',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppStitchTheme.lightOnSurface,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _errorMessage ?? 'Something went wrong',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppStitchTheme.lightOnSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: _fetchLocations,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Try Again'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    final canvasW = 1200.0;
    final canvasH = 1200.0;
    final elList = _selectedFloor?.elements ?? [];
    final filteredElements = _getFilteredRooms(elList);

    // Show empty state if no floor selected
    if (_selectedFloor == null) {
      return StitchBackground(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            title: const Text('Book Conference Room', style: TextStyle(color: AppStitchTheme.lightOnSurface, fontWeight: FontWeight.w800)),
            iconTheme: const IconThemeData(color: AppStitchTheme.lightOnSurface),
          ),
          body: _buildEmptyState('Select a location and floor to view conference rooms', Icons.meeting_room),
        ),
      );
    }

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
            // Dropdowns Row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<int>(
                      value: _selectedLocation?.id,
                      isExpanded: true,
                      decoration: InputDecoration(
                        labelText: 'Location',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      items: _locations.map((l) => DropdownMenuItem(value: l.id, child: Text(l.name, overflow: TextOverflow.ellipsis))).toList(),
                      onChanged: _onLocationChanged,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _loadingFloors
                      ? Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppStitchTheme.lightOutline),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Center(
                            child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                        )
                      : DropdownButtonFormField<int>(
                          value: _selectedFloor?.id,
                          isExpanded: true,
                          decoration: InputDecoration(
                            labelText: 'Floor',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          items: _floors.map((f) => DropdownMenuItem(value: f.id, child: Text(f.name, overflow: TextOverflow.ellipsis))).toList(),
                          onChanged: _onFloorChanged,
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            // Search and Filter Bar
            _buildSearchFilterBar(),
            const SizedBox(height: 8),
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
                              ...filteredElements.where((e) => e.type == 'zone').map(_zoneWidget),
                              ...filteredElements.where((e) => e.type == 'room').map(_zoneWidget),
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
                      // Legend Panel
                      _buildLegendPanel(),
                      // Refresh indicator
                      Positioned(
                        right: 12,
                        bottom: 12,
                        child: GlassCard(
                          padding: const EdgeInsets.all(8),
                          borderRadius: 20,
                          child: InkWell(
                            onTap: () {
                              _fetchRoomData();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Refreshing...'), duration: Duration(seconds: 1)),
                              );
                            },
                            borderRadius: BorderRadius.circular(20),
                            child: const Icon(Icons.refresh, size: 20, color: AppStitchTheme.primary),
                          ),
                        ),
                      ),
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
