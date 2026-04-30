import 'package:flutter/material.dart';
import '../../../models/profile_model.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';

class ProfileProfessionalCard extends StatelessWidget {
  final EmployeeProfile profile;

  const ProfileProfessionalCard({
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
                  value.isEmpty || value == '-' ? 'Not Available' : value,
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
              Icon(Icons.business_center_outlined, size: 20, color: AppStitchTheme.primary),
              const SizedBox(width: 8),
              Text(
                'Professional Details',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: AppStitchTheme.lightOnSurface,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildDetailItem(context, 'Date of Joining', profile.dateOfJoining ?? '-', Icons.calendar_month_outlined),
          _buildDetailItem(context, 'CTC', profile.ctc ?? '-', Icons.payments_outlined),
          _buildDetailItem(context, 'Gross Salary', profile.grossSalary ?? '-', Icons.account_balance_wallet_outlined),
          _buildDetailItem(context, 'EPF Status', profile.epfStatus ?? '-', Icons.verified_user_outlined),
          _buildDetailItem(context, 'UAN', profile.uan ?? '-', Icons.pin_outlined),
          _buildDetailItem(context, 'Source of Employment', profile.sourceOfEmployment ?? '-', Icons.hub_outlined),
          _buildDetailItem(context, 'Payment Method', profile.paymentMethod ?? '-', Icons.credit_score_outlined),
          _buildDetailItem(context, 'Account Number', profile.accountNo ?? '-', Icons.account_balance_outlined),
          _buildDetailItem(context, 'IFSC Code', profile.ifscCode ?? '-', Icons.code_rounded),
          _buildDetailItem(context, 'Bank Name', profile.bankName ?? '-', Icons.account_balance_rounded),
          _buildDetailItem(context, 'ESIC Status', profile.esicStatus ?? '-', Icons.health_and_safety_outlined),
          _buildDetailItem(context, 'ESIC Number', profile.esicNo ?? '-', Icons.numbers_rounded),
        ],
      ),
    );
  }
}

