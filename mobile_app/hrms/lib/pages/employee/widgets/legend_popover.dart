import 'package:flutter/material.dart';

import '../../../widgets/glass_card.dart';
import '../../../theme/app_stitch_theme.dart';

void showLegendPopover(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (ctx) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        child: GlassCard(
          borderRadius: 22,
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 5,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: AppStitchTheme.lightOutline.withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Legend',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              _row(const Color(0xFF10B981), 'Available'),
              const SizedBox(height: 8),
              _row(const Color(0xFFF59E0B), 'Booked'),
              const SizedBox(height: 8),
              _row(const Color(0xFFD946EF), 'Permanent'),
              const SizedBox(height: 10),
              Text(
                'Tip: use Search to jump to a seat quickly.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppStitchTheme.lightOnSurfaceMuted,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
          ),
        ),
      );
    },
  );
}

Widget _row(Color c, String label) {
  return Row(
    children: [
      Container(
        width: 14,
        height: 14,
        decoration: BoxDecoration(
          color: c,
          borderRadius: BorderRadius.circular(5),
        ),
      ),
      const SizedBox(width: 8),
      Text(
        label,
        style: const TextStyle(
          fontWeight: FontWeight.w900,
          color: AppStitchTheme.lightOnSurface,
        ),
      ),
    ],
  );
}

