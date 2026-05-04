import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../models/dashboard_model.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';
import '../../../widgets/optimized_image.dart';
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

    return GlassCard(
      borderRadius: 28,
      padding: const EdgeInsets.all(18),
      child: Padding(
        padding: EdgeInsets.zero,
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
                                        color: AppStitchTheme.lightOutline,
                                        width: 2,
                                      ),
                                    ),
                              child: dashboardData.employeePhoto != null
                                  ? OptimizedImage(
                                      imageUrl: dashboardData.employeePhoto!,
                                      width: 80,
                                      height: 80,
                                      fit: BoxFit.cover,
                                      shape: BoxShape.circle,
                                      memCacheWidth: 160,
                                      memCacheHeight: 160,
                                      errorWidget: Container(
                                        color: AppStitchTheme.primary,
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
                                    )
                                  : Container(
                                      color: AppStitchTheme.primary,
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
                                      color: AppStitchTheme.lightOnSurface,
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
                                  color: AppStitchTheme.lightOnSurfaceMuted,
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
                                    color: Colors.white.withValues(alpha: 0.55),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: const Color(0xFFF59E0B)
                                          .withValues(alpha: 0.45),
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
                                          color: Color(0xFFB45309),
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
                              color: AppStitchTheme.lightOnSurfaceVariant,
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
                              color: AppStitchTheme.lightOnSurfaceMuted,
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
                              color: AppStitchTheme.lightOnSurfaceMuted,
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
                                borderRadius: BorderRadius.circular(16),
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
                                color: AppStitchTheme.lightOutline,
                                width: 2,
                              ),
                            ),
                            child: dashboardData.employeePhoto != null
                                ? OptimizedImage(
                                    imageUrl: dashboardData.employeePhoto!,
                                    width: 80,
                                    height: 80,
                                    fit: BoxFit.cover,
                                    shape: BoxShape.circle,
                                    memCacheWidth: 160,
                                    memCacheHeight: 160,
                                    errorWidget: Container(
                                      color: AppStitchTheme.primary,
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
                                    )
                                : Container(
                                    color: AppStitchTheme.primary,
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
                                      color: AppStitchTheme.lightOnSurface,
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
                                color: AppStitchTheme.lightOnSurfaceMuted,
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
                                  color: Colors.white.withValues(alpha: 0.55),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: const Color(0xFFF59E0B)
                                        .withValues(alpha: 0.45),
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
                                          color: Color(0xFFB45309),
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
                              color: AppStitchTheme.lightOnSurfaceVariant,
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
                              color: AppStitchTheme.lightOnSurfaceMuted,
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
                              color: AppStitchTheme.lightOnSurfaceMuted,
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
                                borderRadius: BorderRadius.circular(16),
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
