import 'package:flutter/material.dart';
import '../../../models/profile_model.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';

class ProfileHierarchyCard extends StatelessWidget {
  final EmployeeHierarchy hierarchy;

  const ProfileHierarchyCard({
    super.key,
    required this.hierarchy,
  });

  Widget _buildHierarchyItem({
    required BuildContext context,
    required String label,
    required String name,
    required String level,
    required String designation,
    required Color color,
    required bool isLast,
    List<HierarchyEmployee>? reportees,
  }) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timeline indicator
          Column(
            children: [
              Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: color,
                  border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: color.withValues(alpha: 0.3),
                      blurRadius: 6,
                    ),
                  ],
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 1.5,
                    color: AppStitchTheme.lightOutline.withValues(alpha: 0.3),
                    margin: const EdgeInsets.symmetric(vertical: 4),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 16),
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    color: AppStitchTheme.lightOnSurfaceMuted,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  name,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppStitchTheme.lightOnSurface,
                      ),
                ),
                Text(
                  '$designation • $level',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppStitchTheme.lightOnSurfaceMuted,
                      ),
                ),
                // Reportees
                if (reportees != null && reportees.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: reportees.map((rep) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppStitchTheme.primary.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: AppStitchTheme.primary.withValues(alpha: 0.1)),
                        ),
                        child: Text(
                          rep.name,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: AppStitchTheme.primary.withValues(alpha: 0.8),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final timelineItems = <Map<String, dynamic>>[];

    // Higher Authority (Top)
    if (hierarchy.higherAuthority != null) {
      timelineItems.add({
        'label': 'Higher Authority',
        'name': hierarchy.higherAuthority!.employeeName ?? hierarchy.higherAuthority!.level,
        'level': hierarchy.higherAuthority!.level,
        'designation': hierarchy.higherAuthority!.designation,
        'color': const Color(0xFFF59E0B), // Orange
        'isLast': false,
        'reportees': null,
      });
    }

    // Reporting Manager
    if (hierarchy.reportingManager != null) {
      timelineItems.add({
        'label': 'Reporting Manager',
        'name': hierarchy.reportingManager!.name,
        'level': hierarchy.reportingManager!.level,
        'designation': hierarchy.reportingManager!.designation,
        'color': const Color(0xFF10B981), // Green
        'isLast': false,
        'reportees': hierarchy.reportingManager!.reportees,
      });
    }

    // Employee (You)
    timelineItems.add({
      'label': 'You',
      'name': hierarchy.employee.name,
      'level': hierarchy.employee.level,
      'designation': hierarchy.employee.designation,
      'color': AppStitchTheme.primary,
      'isLast': true,
      'reportees': null,
    });

    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.account_tree_outlined, size: 20, color: AppStitchTheme.primary),
              const SizedBox(width: 8),
              Text(
                'Reporting Hierarchy',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: AppStitchTheme.lightOnSurface,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Timeline
          ...timelineItems.map((item) {
            return _buildHierarchyItem(
              context: context,
              label: item['label'] as String,
              name: item['name'] as String,
              level: item['level'] as String,
              designation: item['designation'] as String,
              color: item['color'] as Color,
              isLast: item['isLast'] as bool,
              reportees: item['reportees'] as List<HierarchyEmployee>?,
            );
          }),

          // Own Reportees
          if (hierarchy.reportees != null && hierarchy.reportees!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'YOUR REPORTEES',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                color: AppStitchTheme.lightOnSurfaceMuted,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: hierarchy.reportees!.map((rep) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppStitchTheme.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppStitchTheme.primary.withValues(alpha: 0.15)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rep.name,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: AppStitchTheme.primary,
                        ),
                      ),
                      Text(
                        rep.designation,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppStitchTheme.primary.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }
}

