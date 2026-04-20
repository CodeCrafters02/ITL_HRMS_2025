import 'package:flutter/material.dart';
import '../../../models/payroll_model.dart';
import '../../../theme/app_stitch_theme.dart';

class PayrollCard extends StatelessWidget {
  final PayrollData payrollData;

  const PayrollCard({
    super.key,
    required this.payrollData,
  });

  @override
  Widget build(BuildContext context) {
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
                  Icons.account_balance_wallet,
                  color: Color(0xFF10B981),
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  'Latest Payroll',
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
            child: Center(
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
                      color: AppStitchTheme.onSurfaceMuted,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

