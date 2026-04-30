import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/leave_model.dart';
import '../../services/employee_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';
import 'widgets/leave_application_form_dialog.dart';

class LeaveApplicationPage extends StatefulWidget {
  const LeaveApplicationPage({super.key});

  @override
  State<LeaveApplicationPage> createState() => _LeaveApplicationPageState();
}

class _LeaveApplicationPageState extends State<LeaveApplicationPage> {
  List<LeaveType> _leaveTypes = [];
  List<AppliedLeave> _appliedLeaves = [];
  bool _isLoading = true;
  bool _isRefreshing = false;
  String? _error;
  DateTime _lastRefresh = DateTime.now();

  @override
  void initState() {
    super.initState();
    _fetchData();
    // Auto-refresh every 30 seconds
    _startAutoRefresh();
  }

  void _startAutoRefresh() {
    Future.delayed(const Duration(seconds: 30), () {
      if (mounted) {
        _refreshAppliedLeaves();
        _startAutoRefresh();
      }
    });
  }

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    await Future.wait([
      _fetchLeaveTypes(),
      _fetchAppliedLeaves(),
    ]);

    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchLeaveTypes() async {
    try {
      final response = await EmployeeService.getLeaveTypes();
      if (mounted) {
        if (response.success && response.data != null) {
          setState(() {
            _leaveTypes = response.data!;
          });
        }
      }
    } catch (e) {
      // Handle error silently, will show in main error state
    }
  }

  Future<void> _fetchAppliedLeaves() async {
    try {
      final response = await EmployeeService.getAppliedLeaves();
      if (mounted) {
        if (response.success && response.data != null) {
          setState(() {
            _appliedLeaves = response.data!;
            _lastRefresh = DateTime.now();
          });
        } else if (!response.success) {
          setState(() {
            _error = response.message;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load applied leaves: ${e.toString()}';
        });
      }
    }
  }

  Future<void> _refreshAppliedLeaves() async {
    setState(() {
      _isRefreshing = true;
    });

    await _fetchAppliedLeaves();

    if (mounted) {
      setState(() {
        _isRefreshing = false;
      });
    }
  }

  Future<void> _handleApplyLeave() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => LeaveApplicationFormDialog(
        leaveTypes: _leaveTypes,
      ),
    );

    if (result == true && mounted) {
      // Refresh applied leaves after successful submission
      await _fetchAppliedLeaves();
    }
  }

  Future<void> _handleCancelLeave(int leaveId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Leave'),
        content: const Text(
          'Are you sure to cancel? This will delete from Leave Request in reporting manager also.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('No'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        final response = await EmployeeService.cancelLeave(leaveId);
        if (mounted) {
          if (response.success) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(response.message ?? 'Leave cancelled successfully'),
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                margin: const EdgeInsets.all(16),
              ),
            );
            await _fetchAppliedLeaves();
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(response.message ?? 'Failed to cancel leave'),
              ),
            );
          }
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error: ${e.toString()}'),
            ),
          );
        }
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return const Color(0xFF10B981); // Green
      case 'rejected':
        return const Color(0xFFEF4444); // Red
      case 'pending':
        return const Color(0xFF2563EB); // Blue
      case 'cancelled':
        return const Color(0xFFF59E0B); // Orange
      default:
        return const Color(0xFF6B7280);
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
                GlassCard(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back_ios_new_rounded),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Leave Application',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w900,
                                color: AppStitchTheme.lightOnSurface,
                              ),
                        ),
                      ),
                      IconButton(
                        onPressed: _isRefreshing ? null : _refreshAppliedLeaves,
                        icon: _isRefreshing
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.refresh_rounded),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : _error != null && _appliedLeaves.isEmpty
                          ? _buildErrorState()
                          : RefreshIndicator(
                              onRefresh: _fetchData,
                              color: AppStitchTheme.primary,
                              child: ListView(
                                padding: EdgeInsets.zero,
                                children: [
                                  _buildLeaveTypesSection(),
                                  const SizedBox(height: 16),
                                  _buildAppliedLeavesSection(),
                                  const SizedBox(height: 90),
                                ],
                              ),
                            ),
                ),
              ],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _handleApplyLeave,
        backgroundColor: AppStitchTheme.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text(
          'Apply',
          style: TextStyle(color: Colors.white),
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: GlassCard(
        padding: const EdgeInsets.all(18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFEF4444).withValues(alpha: 0.10),
                border: Border.all(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.20),
                ),
              ),
              child: const Icon(
                Icons.error_outline_rounded,
                color: Color(0xFFEF4444),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppStitchTheme.lightOnSurfaceMuted,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _fetchData,
                child: const Text('Retry'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLeaveTypesSection() {
    if (_leaveTypes.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Available leave types',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
                color: AppStitchTheme.lightOnSurface,
              ),
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.0,
          ),
          itemCount: _leaveTypes.length,
          itemBuilder: (context, index) {
            return _buildLeaveTypeCard(_leaveTypes[index]);
          },
        ),
      ],
    );
  }

  Widget _buildLeaveTypeCard(LeaveType leaveType) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.max,
        children: [
          Text(
            leaveType.leaveName,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: AppStitchTheme.lightOnSurface,
                  fontSize: 13,
                ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 6),
          _buildLeaveInfoRow('Total', leaveType.count.toString()),
          _buildLeaveInfoRow('Used', leaveType.usedCount.toString()),
          _buildLeaveInfoRow('Remaining', leaveType.remainingCount.toString()),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.55),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: AppStitchTheme.lightOutline.withValues(alpha: 0.65),
              ),
            ),
            child: Text(
              leaveType.isPaid ? 'Paid' : 'Unpaid',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: leaveType.isPaid
                    ? const Color(0xFF10B981)
                    : const Color(0xFFEF4444),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLeaveInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 1.5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '$label:',
            style: TextStyle(
              fontSize: 13,
              color: AppStitchTheme.lightOnSurfaceMuted,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: AppStitchTheme.lightOnSurface,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppliedLeavesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'My applied leaves',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: AppStitchTheme.lightOnSurface,
                  ),
            ),
            Text(
              'Last updated: ${DateFormat('HH:mm:ss').format(_lastRefresh)}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppStitchTheme.lightOnSurfaceMuted,
                  ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_appliedLeaves.isEmpty)
          GlassCard(
            padding: const EdgeInsets.all(18),
            child: Center(
              child: Text(
                'No leave applications yet',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppStitchTheme.lightOnSurfaceMuted,
                    ),
              ),
            ),
          )
        else
          ..._appliedLeaves.asMap().entries.map((entry) {
            final index = entry.key;
            final leave = entry.value;
            return _buildAppliedLeaveCard(leave, index);
          }),
      ],
    );
  }

  Widget _buildAppliedLeaveCard(AppliedLeave leave, int index) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.60),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: AppStitchTheme.lightOutline.withValues(alpha: 0.65),
                  ),
                ),
                child: Center(
                  child: Text(
                    '${index + 1}',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppStitchTheme.lightOnSurface,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      leave.leaveTypeName ?? 'Leave Type #${leave.leaveType}',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: AppStitchTheme.lightOnSurface,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${leave.fromDate} - ${leave.toDate}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppStitchTheme.lightOnSurfaceMuted,
                          ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _getStatusColor(leave.status).withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: _getStatusColor(leave.status).withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Text(
                  leave.status,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _getStatusColor(leave.status),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Reason:',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  leave.reason,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF111827),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Applied on: ${DateFormat('MMM d, yyyy').format(DateTime.parse(leave.createdAt))}',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF6B7280),
                ),
              ),
              if (leave.status == 'Pending' || leave.status == 'Approved')
                TextButton(
                  onPressed: () => _handleCancelLeave(leave.id),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.red,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  ),
                  child: const Text('Cancel'),
                ),
            ],
          ),
        ],
      ),
      ),
    );
  }
}
