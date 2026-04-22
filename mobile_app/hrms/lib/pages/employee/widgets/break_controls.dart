import 'package:flutter/material.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../models/break_model.dart';
import '../../../models/dashboard_model.dart';
import '../../../models/break_config_model.dart';
import '../../../services/employee_service.dart';

class BreakControls extends StatefulWidget {
  final DashboardData dashboardData;
  final bool isLoading;
  final VoidCallback onBreakAction;
  final Function(String)? onStatusChange;

  const BreakControls({
    super.key,
    required this.dashboardData,
    required this.isLoading,
    required this.onBreakAction,
    this.onStatusChange,
  });

  @override
  State<BreakControls> createState() => _BreakControlsState();
}

class _BreakControlsState extends State<BreakControls> {
  bool _breakLoading = false;
  List<BreakConfig> _breakConfigs = [];
  bool _loadingConfigs = false;
  String? _selectedStatus;
  bool _statusDropdownOpen = false;
  bool _teaDropdownOpen = false;
  OverlayEntry? _statusOverlay;
  OverlayEntry? _teaOverlay;
  final GlobalKey _statusButtonKey = GlobalKey();
  final GlobalKey _teaButtonKey = GlobalKey();

  Future<void> _handleBreakAction(int breakConfigId, String action) async {
    setState(() {
      _breakLoading = true;
    });

    try {
      final response = action == 'start'
          ? await EmployeeService.startBreak(breakConfigId)
          : await EmployeeService.endBreak(breakConfigId);

      if (mounted) {
        setState(() {
          _breakLoading = false;
        });

        if (response.success) {
          widget.onBreakAction();
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(response.message ?? 'Break action failed'),
                backgroundColor: const Color(0xFFEF4444),
              ),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _breakLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _fetchBreakConfigs();
    _fetchEmployeeStatus();
  }

  @override
  void dispose() {
    _removeOverlays();
    super.dispose();
  }

  void _removeOverlays() {
    _statusOverlay?.remove();
    _teaOverlay?.remove();
    _statusOverlay = null;
    _teaOverlay = null;
  }

  Future<void> _fetchBreakConfigs() async {
    setState(() {
      _loadingConfigs = true;
    });

    try {
      final response = await EmployeeService.getBreakConfigs();
      if (mounted) {
        setState(() {
          _loadingConfigs = false;
          if (response.success && response.data != null) {
            _breakConfigs = response.data!;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingConfigs = false;
        });
      }
    }
  }

  Future<void> _fetchEmployeeStatus() async {
    try {
      // Status will be fetched and set when user selects it
      // For now, we'll leave it as null (default)
    } catch (e) {
      // Handle error silently - status is optional
    }
  }

  Future<void> _handleStatusChange(String status) async {
    setState(() {
      _selectedStatus = status;
      _statusDropdownOpen = false;
    });

    if (widget.onStatusChange != null) {
      await widget.onStatusChange!(status);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasActiveBreak = widget.dashboardData.hasActiveBreak;
    final activeBreak = widget.dashboardData.activeBreak;

    if (hasActiveBreak && activeBreak != null) {
      return _buildActiveBreakView(activeBreak);
    }

    return _buildBreakOptions();
  }

  Widget _buildActiveBreakView(ActiveBreakData activeBreak) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFF422006),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.pause,
                color: Color(0xFFFBBF24),
                size: 16,
              ),
              const SizedBox(width: 8),
              Text(
                '${activeBreak.type} Break',
                style: const TextStyle(
                  color: Color(0xFFFBBF24),
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        ElevatedButton(
          onPressed: (_breakLoading || widget.isLoading)
              ? null
              : () => _handleBreakAction(
                    activeBreak.breakConfigId!,
                    'end',
                  ),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFF59E0B),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 8,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            elevation: 0,
          ),
          child: _breakLoading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      Colors.white,
                    ),
                  ),
                )
              : const Text(
                  'End Break',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildBreakOptions() {
    if (_loadingConfigs) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(16.0),
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(AppStitchTheme.primary),
          ),
        ),
      );
    }

    final shortBreaks = _breakConfigs
        .where((cfg) => cfg.breakChoice == 'short_break')
        .toList();
    final mealBreak = _breakConfigs
        .where((cfg) => cfg.breakChoice == 'meal_break')
        .firstOrNull;

    if (shortBreaks.isEmpty && mealBreak == null) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: Text(
          'No break options available',
          style: TextStyle(
            fontSize: 14,
            color: AppStitchTheme.onSurfaceMuted,
          ),
        ),
      );
    }

    return Row(
      children: [
        // Status Dropdown
        _buildStatusButton(),
        const SizedBox(width: 12),

        // Tea Break Dropdown (Short Breaks)
        if (shortBreaks.isNotEmpty) _buildTeaBreakButton(shortBreaks),

        // Meal Break Button
        if (mealBreak != null) ...[
          const SizedBox(width: 12),
          _buildMealBreakButton(mealBreak),
        ],
      ],
    );
  }

  Widget _buildStatusButton() {
    Color getStatusColor() {
      switch (_selectedStatus) {
        case 'online':
          return const Color(0xFF10B981);
        case 'away':
          return const Color(0xFFF59E0B);
        case 'dnd':
          return const Color(0xFFEF4444);
        case 'offline':
          return const Color(0xFF9CA3AF);
        default:
          return const Color(0xFF9CA3AF);
      }
    }

    void toggleStatusDropdown() {
      if (_statusDropdownOpen) {
        _removeStatusOverlay();
      } else {
        _removeOverlays();
        _showStatusDropdown();
      }
    }

    return IconButton(
      key: _statusButtonKey,
      onPressed: widget.isLoading || _breakLoading ? null : toggleStatusDropdown,
      icon: Icon(
        Icons.circle_outlined,
        color: getStatusColor(),
        size: 20,
      ),
      tooltip: 'Status',
    );
  }

  void _showStatusDropdown() {
    final RenderBox? renderBox =
        _statusButtonKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final offset = renderBox.localToGlobal(Offset.zero);
    final size = renderBox.size;

    _statusOverlay = OverlayEntry(
      builder: (context) => Stack(
        children: [
          // Backdrop to close on tap outside
          Positioned.fill(
            child: GestureDetector(
              onTap: () {
                _removeStatusOverlay();
              },
              child: Container(color: Colors.transparent),
            ),
          ),
          // Dropdown menu
          Positioned(
            left: offset.dx,
            top: offset.dy + size.height + 8,
            child: Material(
              elevation: 12,
              shadowColor: Colors.black.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                width: 180,
                decoration: BoxDecoration(
                  color: AppStitchTheme.surfaceElevated,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppStitchTheme.outline),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildStatusOption('online', 'Online', const Color(0xFF10B981)),
                    _buildStatusOption('away', 'Away', const Color(0xFFF59E0B)),
                    _buildStatusOption('dnd', 'Do Not Disturb', const Color(0xFFEF4444)),
                    _buildStatusOption('offline', 'Offline', const Color(0xFF9CA3AF)),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );

    Overlay.of(context).insert(_statusOverlay!);
    setState(() {
      _statusDropdownOpen = true;
    });
  }

  void _removeStatusOverlay() {
    _statusOverlay?.remove();
    _statusOverlay = null;
    setState(() {
      _statusDropdownOpen = false;
    });
  }

  Widget _buildStatusOption(String value, String label, Color color) {
    final isSelected = _selectedStatus == value;
    return InkWell(
      onTap: () {
        _removeStatusOverlay();
        _handleStatusChange(value);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppStitchTheme.surfaceHighlight : Colors.transparent,
        ),
        child: Row(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                color: AppStitchTheme.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTeaBreakButton(List<BreakConfig> shortBreaks) {
    void toggleTeaDropdown() {
      if (_teaDropdownOpen) {
        _removeTeaOverlay();
      } else {
        _removeOverlays();
        _showTeaDropdown(shortBreaks);
      }
    }

    return IconButton(
      key: _teaButtonKey,
      onPressed: widget.isLoading || _breakLoading ? null : toggleTeaDropdown,
      icon: Icon(
        Icons.coffee,
        color: _teaDropdownOpen
            ? const Color(0xFFF59E0B)
            : AppStitchTheme.onSurfaceMuted,
        size: 20,
      ),
      tooltip: 'Tea Break',
    );
  }

  void _showTeaDropdown(List<BreakConfig> shortBreaks) {
    final RenderBox? renderBox =
        _teaButtonKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final offset = renderBox.localToGlobal(Offset.zero);
    final size = renderBox.size;

    _teaOverlay = OverlayEntry(
      builder: (context) => Stack(
        children: [
          // Backdrop to close on tap outside
          Positioned.fill(
            child: GestureDetector(
              onTap: () {
                _removeTeaOverlay();
              },
              child: Container(color: Colors.transparent),
            ),
          ),
          // Dropdown menu
          Positioned(
            left: offset.dx,
            top: offset.dy + size.height + 8,
            child: Material(
              elevation: 12,
              shadowColor: Colors.black.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                width: 150,
                decoration: BoxDecoration(
                  color: AppStitchTheme.surfaceElevated,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppStitchTheme.outline),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: shortBreaks.map((breakConfig) {
                    return InkWell(
                      onTap: () {
                        _removeTeaOverlay();
                        _handleBreakAction(breakConfig.id, 'start');
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.coffee,
                              size: 16,
                              color: Color(0xFFF59E0B),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '${breakConfig.durationMinutes ?? 0} min',
                              style: const TextStyle(
                                fontSize: 14,
                                color: AppStitchTheme.onSurface,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
          ),
        ],
      ),
    );

    Overlay.of(context).insert(_teaOverlay!);
    setState(() {
      _teaDropdownOpen = true;
    });
  }

  void _removeTeaOverlay() {
    _teaOverlay?.remove();
    _teaOverlay = null;
    setState(() {
      _teaDropdownOpen = false;
    });
  }

  Widget _buildMealBreakButton(BreakConfig mealBreak) {
    return IconButton(
      onPressed: widget.isLoading || _breakLoading
          ? null
          : () {
              _handleBreakAction(mealBreak.id, 'start');
            },
      icon: const Icon(
        Icons.restaurant,
        color: AppStitchTheme.onSurfaceMuted,
        size: 20,
      ),
      tooltip: 'Meal Break',
    );
  }
}

