import 'package:flutter/material.dart';
import '../../../models/profile_model.dart';

class ProfileHierarchyCard extends StatelessWidget {
  final EmployeeHierarchy hierarchy;

  const ProfileHierarchyCard({
    super.key,
    required this.hierarchy,
  });

  Widget _buildHierarchyItem({
    required String label,
    required String name,
    required String level,
    required String designation,
    required Color color,
    required bool isLast,
    List<HierarchyEmployee>? reportees,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Timeline indicator
        Column(
          children: [
            Container(
              width: 16,
              height: 16,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color,
                border: Border.all(color: Colors.white, width: 4),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 60,
                color: Colors.grey.shade300,
                margin: const EdgeInsets.symmetric(vertical: 4),
              ),
          ],
        ),
        const SizedBox(width: 12),
        // Content
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF6B7280),
                ),
              ),
              const SizedBox(height: 4),
              RichText(
                text: TextSpan(
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF111827),
                    fontWeight: FontWeight.w500,
                  ),
                  children: [
                    TextSpan(text: name),
                    TextSpan(
                      text: ' ($level)',
                      style: const TextStyle(
                        color: Color(0xFF6B7280),
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 2),
              Text(
                designation,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF6B7280),
                ),
              ),
              // Reportees
              if (reportees != null && reportees.isNotEmpty) ...[
                const SizedBox(height: 8),
                const Text(
                  'Reportees:',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: reportees.map((rep) {
                    return Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: Text(
                        '${rep.name} (${rep.designation})',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF111827),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final timelineItems = <Map<String, dynamic>>[];

    // Employee (You)
    timelineItems.add({
      'label': 'You',
      'name': hierarchy.employee.name,
      'level': hierarchy.employee.level,
      'designation': hierarchy.employee.designation,
      'color': Colors.blue,
      'isLast': false,
      'reportees': null,
    });

    // Reporting Manager
    if (hierarchy.reportingManager != null) {
      timelineItems.add({
        'label': 'Reporting Manager',
        'name': hierarchy.reportingManager!.name,
        'level': hierarchy.reportingManager!.level,
        'designation': hierarchy.reportingManager!.designation,
        'color': Colors.green,
        'isLast': false,
        'reportees': hierarchy.reportingManager!.reportees,
      });
    }

    // Higher Authority
    if (hierarchy.higherAuthority != null) {
      timelineItems.add({
        'label': 'Higher Authority',
        'name': hierarchy.higherAuthority!.employeeName ??
            hierarchy.higherAuthority!.level,
        'level': hierarchy.higherAuthority!.level,
        'designation': hierarchy.higherAuthority!.designation,
        'color': Colors.orange,
        'isLast': true,
        'reportees': null,
      });
    } else {
      // Mark last item as last
      if (timelineItems.isNotEmpty) {
        timelineItems.last['isLast'] = true;
      }
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Hierarchy',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 20),
          // Timeline
          ...timelineItems.map((item) {
            return _buildHierarchyItem(
              label: item['label'] as String,
              name: item['name'] as String,
              level: item['level'] as String,
              designation: item['designation'] as String,
              color: item['color'] as Color,
              isLast: item['isLast'] as bool,
              reportees: item['reportees'] as List<HierarchyEmployee>?,
            );
          }).toList(),

          // Own Reportees
          if (hierarchy.reportees != null && hierarchy.reportees!.isNotEmpty) ...[
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 16),
            const Text(
              'Your Reportees:',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: hierarchy.reportees!.map((rep) {
                return Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: Text(
                    '${rep.name} (${rep.designation})',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF111827),
                    ),
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

