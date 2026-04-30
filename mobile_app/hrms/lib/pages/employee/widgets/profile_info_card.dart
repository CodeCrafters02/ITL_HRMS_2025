import 'package:flutter/material.dart';
import '../../../models/profile_model.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';

class ProfileInfoCard extends StatelessWidget {
  final EmployeeProfile profile;

  const ProfileInfoCard({
    super.key,
    required this.profile,
  });

  Widget _buildDetailItem(BuildContext context, String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppStitchTheme.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: AppStitchTheme.primary),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: AppStitchTheme.lightOnSurfaceMuted,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value.isEmpty || value == '-' ? 'Not Specified' : value,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppStitchTheme.lightOnSurface,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.person_outline_rounded, size: 20, color: AppStitchTheme.primary),
              const SizedBox(width: 8),
              Text(
                'Personal Information',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: AppStitchTheme.lightOnSurface,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildDetailItem(context, 'Employee ID', profile.employeeId ?? '-', Icons.badge_outlined),
          _buildDetailItem(context, 'Full Name', profile.fullName, Icons.badge_outlined),
          _buildDetailItem(context, 'Email Address', profile.email ?? '-', Icons.email_outlined),
          _buildDetailItem(context, 'Phone Number', profile.mobile ?? '-', Icons.phone_android_rounded),
          _buildDetailItem(context, 'Gender', profile.gender ?? '-', Icons.person_search_rounded),
          _buildDetailItem(context, 'Date of Birth', profile.dateOfBirth ?? '-', Icons.cake_outlined),
          _buildDetailItem(context, 'Department', profile.displayDepartment, Icons.business_outlined),
          _buildDetailItem(context, 'Designation', profile.displayDesignation, Icons.work_outline_rounded),
        ],
      ),
    );
  }
}

