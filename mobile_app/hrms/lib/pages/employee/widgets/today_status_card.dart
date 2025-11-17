import 'package:flutter/material.dart';
import '../../../models/dashboard_model.dart';

class TodayStatusCard extends StatelessWidget {
  final DashboardData dashboardData;

  const TodayStatusCard({super.key, required this.dashboardData});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Row(
              children: [
                const Icon(
                  Icons.calendar_today,
                  color: Color(0xFF2563EB),
                  size: 20,
                ),
                const SizedBox(width: 8),
                const Text(
                  "Today's Status",
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF111827),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24.0, 0, 24.0, 24.0),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth > 600;
                if (isWide) {
                  return Row(
                    children: [
                      Expanded(
                        child: _buildSection(
                          icon: Icons.person,
                          iconColor: const Color(0xFF6366F1),
                          title: 'Shift Information',
                          items: [
                            _StatusItem(
                              label: 'Shift Name:',
                              value: dashboardData.shiftName,
                            ),
                            _StatusItem(
                              label: 'Timing:',
                              value: dashboardData.shiftTiming,
                            ),
                            _StatusItem(
                              label: 'Check-in:',
                              value: dashboardData.checkinTime ?? '--:--',
                              valueColor: const Color(0xFF10B981),
                            ),
                            _StatusItem(
                              label: 'Check-out:',
                              value: dashboardData.checkoutTime ?? '--:--',
                              valueColor: const Color(0xFFEF4444),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 32),
                      Expanded(
                        child: _buildSection(
                          icon: Icons.access_time,
                          iconColor: const Color(0xFF2563EB),
                          title: 'Time Tracking',
                          items: [
                            _StatusItem(
                              label: 'Total Worked:',
                              value: dashboardData.totalWorked,
                              valueColor: const Color(0xFF2563EB),
                            ),
                            _StatusItem(
                              label: 'Effective Time:',
                              value: dashboardData.effectiveTime,
                              valueColor: const Color(0xFF10B981),
                            ),
                            _StatusItem(
                              label: 'Break Time:',
                              value:
                                  '${dashboardData.totalBreakMinutes} minutes',
                              valueColor: const Color(0xFFF59E0B),
                            ),
                            _StatusItem(
                              label: 'Overtime:',
                              value: dashboardData.overtime?.formatted ?? '0h',
                              valueColor: const Color(0xFF9333EA),
                            ),
                          ],
                        ),
                      ),
                    ],
                  );
                } else {
                  return Column(
                    children: [
                      _buildSection(
                        icon: Icons.person,
                        iconColor: const Color(0xFF6366F1),
                        title: 'Shift Information',
                        items: [
                          _StatusItem(
                            label: 'Shift Name:',
                            value: dashboardData.shiftName,
                          ),
                          _StatusItem(
                            label: 'Timing:',
                            value: dashboardData.shiftTiming,
                          ),
                          _StatusItem(
                            label: 'Check-in:',
                            value: dashboardData.checkinTime ?? '--:--',
                            valueColor: const Color(0xFF10B981),
                          ),
                          _StatusItem(
                            label: 'Check-out:',
                            value: dashboardData.checkoutTime ?? '--:--',
                            valueColor: const Color(0xFFEF4444),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      _buildSection(
                        icon: Icons.access_time,
                        iconColor: const Color(0xFF2563EB),
                        title: 'Time Tracking',
                        items: [
                          _StatusItem(
                            label: 'Total Worked:',
                            value: dashboardData.totalWorked,
                            valueColor: const Color(0xFF2563EB),
                          ),
                          _StatusItem(
                            label: 'Effective Time:',
                            value: dashboardData.effectiveTime,
                            valueColor: const Color(0xFF10B981),
                          ),
                          _StatusItem(
                            label: 'Break Time:',
                            value: '${dashboardData.totalBreakMinutes} minutes',
                            valueColor: const Color(0xFFF59E0B),
                          ),
                          _StatusItem(
                            label: 'Overtime:',
                            value: dashboardData.overtime?.formatted ?? '0h',
                            valueColor: const Color(0xFF9333EA),
                          ),
                        ],
                      ),
                      if (dashboardData.isLate)
                        Padding(
                          padding: const EdgeInsets.only(top: 16),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'Late arrival detected',
                              style: TextStyle(
                                color: Color(0xFF991B1B),
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ),
                    ],
                  );
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSection({
    required IconData icon,
    required Color iconColor,
    required String title,
    required List<_StatusItem> items,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, color: iconColor, size: 20),
            const SizedBox(width: 8),
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFF111827),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ...items.map(
          (item) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  item.label,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF6B7280),
                  ),
                ),
                Text(
                  item.value,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: item.valueColor ?? const Color(0xFF111827),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _StatusItem {
  final String label;
  final String value;
  final Color? valueColor;

  _StatusItem({required this.label, required this.value, this.valueColor});
}
