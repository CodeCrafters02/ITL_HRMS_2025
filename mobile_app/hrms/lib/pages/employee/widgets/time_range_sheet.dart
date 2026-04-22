import 'package:flutter/material.dart';

import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';

class TimeRangeResult {
  final TimeOfDay start;
  final TimeOfDay end;
  const TimeRangeResult({required this.start, required this.end});
}

class TimeRangeSheet extends StatefulWidget {
  final TimeOfDay initialStart;
  final TimeOfDay initialEnd;

  const TimeRangeSheet({
    super.key,
    required this.initialStart,
    required this.initialEnd,
  });

  @override
  State<TimeRangeSheet> createState() => _TimeRangeSheetState();
}

class _TimeRangeSheetState extends State<TimeRangeSheet> {
  late TimeOfDay _start = widget.initialStart;
  late TimeOfDay _end = widget.initialEnd;

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      child: GlassCard(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Target time range',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _tile(
                    label: 'Start',
                    value: _fmt(_start),
                    onTap: () async {
                      final picked = await showTimePicker(
                        context: context,
                        initialTime: _start,
                      );
                      if (picked == null) return;
                      setState(() => _start = picked);
                    },
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _tile(
                    label: 'End',
                    value: _fmt(_end),
                    onTap: () async {
                      final picked = await showTimePicker(
                        context: context,
                        initialTime: _end,
                      );
                      if (picked == null) return;
                      setState(() => _end = picked);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  Navigator.pop(
                    context,
                    TimeRangeResult(start: _start, end: _end),
                  );
                },
                style: FilledButton.styleFrom(
                  backgroundColor: AppStitchTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text(
                  'Apply',
                  style: TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tile({
    required String label,
    required String value,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          color: Colors.white.withValues(alpha: 0.60),
          border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.70)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AppStitchTheme.lightOnSurfaceMuted,
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

