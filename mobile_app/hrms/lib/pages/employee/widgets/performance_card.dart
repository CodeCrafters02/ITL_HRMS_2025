import 'package:flutter/material.dart';
import '../../../models/dashboard_model.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';

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

    return GlassCard(
      borderRadius: 28,
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.trending_up,
                color: Color(0xFF10B981),
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Performance',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppStitchTheme.lightOnSurface,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Column(
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
                            color: AppStitchTheme.lightOnSurfaceMuted,
                          ),
                        ),
                        Text(
                          '$weekDuration / 48 hrs',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: AppStitchTheme.lightOnSurface,
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
                        backgroundColor:
                            AppStitchTheme.lightOutline.withValues(alpha: 0.55),
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
                    color: Colors.white.withValues(alpha: 0.55),
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
                          color: AppStitchTheme.lightOnSurfaceMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

