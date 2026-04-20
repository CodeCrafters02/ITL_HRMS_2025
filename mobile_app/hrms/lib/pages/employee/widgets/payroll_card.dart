import 'package:flutter/material.dart';
import '../../../models/payroll_model.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';

class PayrollCard extends StatelessWidget {
  final PayrollData payrollData;

  const PayrollCard({
    super.key,
    required this.payrollData,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      borderRadius: 28,
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.account_balance_wallet,
                color: Color(0xFF10B981),
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Latest Payroll',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppStitchTheme.lightOnSurface,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Center(
            child: Column(
              children: [
                Text(
                  payrollData.formattedAmount,
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF10B981),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Processed on ${payrollData.date}',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppStitchTheme.lightOnSurfaceMuted,
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

