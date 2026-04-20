import 'package:flutter/material.dart';
import '../../../models/dashboard_model.dart';
import '../../../theme/app_stitch_theme.dart';

class PerformanceCard extends StatelessWidget {
  final DashboardData dashboardData;

  const PerformanceCard({
    super.key,
    required this.dashboardData,
  });

  @override
  Widget build(BuildContext context) {
    // Parse weekly hours
    final weekDuration = dashboardData.totalWorkDurationWeek ?? '0h 0m';
    final weekParts = weekDuration.split('h');
    final weekHours = int.tryParse(weekParts[0].trim()) ?? 0;
    final weekMinutes = weekParts.length > 1
        ? (int.tryParse(weekParts[1].replaceAll('m', '').trim()) ?? 0)
        : 0;
    final totalWeekHours = weekHours + (weekMinutes / 60);
    final weekPercent = (totalWeekHours / 48 * 100).clamp(0, 100);

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: AppStitchTheme.outline),
      ),
      color: AppStitchTheme.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Row(
              children: [
                const Icon(
                  Icons.trending_up,
                  color: Color(0xFF10B981),
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  'Performance',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: AppStitchTheme.onSurface,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24.0, 0, 24.0, 24.0),
            child: Column(
              children: [
                // Weekly Hours Progress
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Weekly Hours',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppStitchTheme.onSurfaceMuted,
                          ),
                        ),
                        Text(
                          '$weekDuration / 48 hrs',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: AppStitchTheme.onSurface,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: weekPercent / 100,
                        minHeight: 8,
                        backgroundColor: AppStitchTheme.outline,
                        valueColor: const AlwaysStoppedAnimation<Color>(
                          AppStitchTheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                // Weekly Progress Percentage
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppStitchTheme.surfaceElevated,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '${weekPercent.toStringAsFixed(1)}%',
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF10B981),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'of Weekly Target',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppStitchTheme.onSurfaceMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

