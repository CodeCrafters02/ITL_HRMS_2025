import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../models/dashboard_model.dart';
import 'timer_widget.dart';

class DashboardHeader extends StatelessWidget {
  final DashboardData dashboardData;
  final int localTimer;
  final int breakTimer;
  final VoidCallback onRefresh;
  final VoidCallback onCheckInOut;
  final bool isLoading;

  const DashboardHeader({
    super.key,
    required this.dashboardData,
    required this.localTimer,
    required this.breakTimer,
    required this.onRefresh,
    required this.onCheckInOut,
    required this.isLoading,
  });

  String _getInitials(String? name) {
    if (name == null || name.isEmpty) return '';
    final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  String _getCurrentDate() {
    final now = DateTime.now();
    return DateFormat('EEEE, MMMM d, yyyy').format(now);
  }

  @override
  Widget build(BuildContext context) {
    final isCheckedIn = dashboardData.isCheckedIn;
    final hasActiveBreak = dashboardData.hasActiveBreak;
    final isBirthday = dashboardData.birthdayMessage != null;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(
          color: isBirthday ? const Color(0xFFFCD34D) : const Color(0xFFE5E7EB),
        ),
      ),
      color: isBirthday ? const Color(0xFFFEF3C7) : Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth > 768;
            if (isWide) {
              return Row(
                children: [
                  // Employee Info
                  Expanded(
                    child: Row(
                      children: [
                        Stack(
                          children: [
                            Container(
                              width: 64,
                              height: 64,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: const Color(0xFFE5E7EB),
                                  width: 2,
                                ),
                              ),
                              child: dashboardData.employeePhoto != null
                                  ? ClipOval(
                                      child: Image.network(
                                        dashboardData.employeePhoto!,
                                        fit: BoxFit.cover,
                                        errorBuilder:
                                            (context, error, stackTrace) {
                                              return Container(
                                                color: const Color(0xFF4F46E5),
                                                child: Center(
                                                  child: Text(
                                                    _getInitials(
                                                      dashboardData
                                                          .employeeName,
                                                    ),
                                                    style: const TextStyle(
                                                      color: Colors.white,
                                                      fontSize: 24,
                                                      fontWeight:
                                                          FontWeight.bold,
                                                    ),
                                                  ),
                                                ),
                                              );
                                            },
                                      ),
                                    )
                                  : Container(
                                      color: const Color(0xFF4F46E5),
                                      child: Center(
                                        child: Text(
                                          _getInitials(
                                            dashboardData.employeeName,
                                          ),
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 24,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ),
                            ),
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Container(
                                width: 20,
                                height: 20,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isCheckedIn
                                      ? const Color(0xFF10B981)
                                      : const Color(0xFF9CA3AF),
                                  border: Border.all(
                                    color: Colors.white,
                                    width: 2,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    'Welcome, ${dashboardData.employeeName ?? 'Employee'}',
                                    style: TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                      color: isBirthday
                                          ? const Color(0xFF92400E)
                                          : const Color(0xFF111827),
                                    ),
                                  ),
                                  if (isBirthday) ...[
                                    const SizedBox(width: 8),
                                    const Text(
                                      '🎂',
                                      style: TextStyle(fontSize: 24),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _getCurrentDate(),
                                style: TextStyle(
                                  fontSize: 14,
                                  color: isBirthday
                                      ? const Color(0xFF92400E)
                                      : const Color(0xFF6B7280),
                                ),
                              ),
                              if (isBirthday &&
                                  dashboardData.birthdayMessage != null) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.8),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: const Color(0xFFFCD34D),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Text(
                                        '🎉',
                                        style: TextStyle(fontSize: 16),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        dashboardData.birthdayMessage!,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF92400E),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      const Text(
                                        '🎉',
                                        style: TextStyle(fontSize: 16),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Status & Controls
                  Column(
                    children: [
                      Column(
                        children: [
                          TimerWidget(
                            seconds: hasActiveBreak ? breakTimer : localTimer,
                            textStyle: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'monospace',
                              color: isBirthday
                                  ? const Color(0xFF92400E)
                                  : const Color(0xFF374151),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            isCheckedIn
                                ? (hasActiveBreak
                                      ? 'On Break${dashboardData.activeBreak?.durationMinutes != null ? ' (${dashboardData.activeBreak!.durationMinutes} min)' : ''}'
                                      : 'Working Time')
                                : 'Ready to Start',
                            style: TextStyle(
                              fontSize: 14,
                              color: isBirthday
                                  ? const Color(0xFF92400E)
                                  : const Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          IconButton(
                            onPressed: onRefresh,
                            icon: const Icon(
                              Icons.refresh,
                              color: Color(0xFF6B7280),
                              size: 20,
                            ),
                            tooltip: 'Refresh',
                          ),
                          ElevatedButton(
                            onPressed: isLoading ? null : onCheckInOut,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isCheckedIn
                                  ? const Color(0xFFEF4444)
                                  : const Color(0xFF10B981),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                                vertical: 12,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              elevation: 0,
                            ),
                            child: isLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white,
                                      ),
                                    ),
                                  )
                                : Text(
                                    isCheckedIn ? 'Check Out' : 'Check In',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              );
            } else {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Employee Info
                  Row(
                    children: [
                      Stack(
                        children: [
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: const Color(0xFFE5E7EB),
                                width: 2,
                              ),
                            ),
                            child: dashboardData.employeePhoto != null
                                ? ClipOval(
                                    child: Image.network(
                                      dashboardData.employeePhoto!,
                                      fit: BoxFit.cover,
                                      errorBuilder:
                                          (context, error, stackTrace) {
                                            return Container(
                                              color: const Color(0xFF4F46E5),
                                              child: Center(
                                                child: Text(
                                                  _getInitials(
                                                    dashboardData.employeeName,
                                                  ),
                                                  style: const TextStyle(
                                                    color: Colors.white,
                                                    fontSize: 24,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ),
                                            );
                                          },
                                    ),
                                  )
                                : Container(
                                    color: const Color(0xFF4F46E5),
                                    child: Center(
                                      child: Text(
                                        _getInitials(
                                          dashboardData.employeeName,
                                        ),
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 24,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              width: 20,
                              height: 20,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isCheckedIn
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFF9CA3AF),
                                border: Border.all(
                                  color: Colors.white,
                                  width: 2,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    'Welcome, ${dashboardData.employeeName ?? 'Employee'}',
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: isBirthday
                                          ? const Color(0xFF92400E)
                                          : const Color(0xFF111827),
                                    ),
                                  ),
                                ),
                                if (isBirthday)
                                  const Text(
                                    '🎂',
                                    style: TextStyle(fontSize: 20),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _getCurrentDate(),
                              style: TextStyle(
                                fontSize: 14,
                                color: isBirthday
                                    ? const Color(0xFF92400E)
                                    : const Color(0xFF6B7280),
                              ),
                            ),
                            if (isBirthday &&
                                dashboardData.birthdayMessage != null) ...[
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.8),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: const Color(0xFFFCD34D),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Text(
                                      '🎉',
                                      style: TextStyle(fontSize: 14),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        dashboardData.birthdayMessage!,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF92400E),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Text(
                                      '🎉',
                                      style: TextStyle(fontSize: 14),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Status & Controls
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TimerWidget(
                            seconds: hasActiveBreak ? breakTimer : localTimer,
                            textStyle: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'monospace',
                              color: isBirthday
                                  ? const Color(0xFF92400E)
                                  : const Color(0xFF374151),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            isCheckedIn
                                ? (hasActiveBreak
                                      ? 'On Break${dashboardData.activeBreak?.durationMinutes != null ? ' (${dashboardData.activeBreak!.durationMinutes} min)' : ''}'
                                      : 'Working Time')
                                : 'Ready to Start',
                            style: TextStyle(
                              fontSize: 14,
                              color: isBirthday
                                  ? const Color(0xFF92400E)
                                  : const Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          IconButton(
                            onPressed: onRefresh,
                            icon: const Icon(
                              Icons.refresh,
                              color: Color(0xFF6B7280),
                              size: 20,
                            ),
                            tooltip: 'Refresh',
                          ),
                          ElevatedButton(
                            onPressed: isLoading ? null : onCheckInOut,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isCheckedIn
                                  ? const Color(0xFFEF4444)
                                  : const Color(0xFF10B981),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 20,
                                vertical: 12,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              elevation: 0,
                            ),
                            child: isLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white,
                                      ),
                                    ),
                                  )
                                : Text(
                                    isCheckedIn ? 'Check Out' : 'Check In',
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              );
            }
          },
        ),
      ),
    );
  }
}
