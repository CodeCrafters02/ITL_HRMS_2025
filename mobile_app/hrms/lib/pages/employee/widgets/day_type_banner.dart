import 'package:flutter/material.dart';
import '../../../models/dashboard_model.dart';

/// "Today is a holiday / weekly off / leave / working day" strip for the employee dashboard.
class DayTypeBanner extends StatelessWidget {
  const DayTypeBanner({super.key, required this.info});

  final DayInfo info;

  @override
  Widget build(BuildContext context) {
    late final Color color;
    late final IconData icon;
    late final String text;
    final d = info.detail.isEmpty ? '' : ' — ${info.detail}';
    switch (info.type) {
      case 'holiday':
        color = const Color(0xFF0EA5E9);
        icon = Icons.celebration_rounded;
        text = 'Holiday$d';
        break;
      case 'weekly_off':
        color = const Color(0xFF64748B);
        icon = Icons.weekend_rounded;
        text = 'Weekly off$d';
        break;
      case 'leave':
        color = const Color(0xFFF59E0B);
        icon = Icons.beach_access_rounded;
        text = "You're on leave today$d";
        break;
      case 'half_day_leave':
        color = const Color(0xFFF59E0B);
        icon = Icons.timelapse_rounded;
        text = 'Half-day leave today$d';
        break;
      default:
        color = const Color(0xFF10B981);
        icon = Icons.work_rounded;
        text = 'Working day';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('TODAY', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: color)),
                const SizedBox(height: 2),
                Text(text, style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w900, color: color)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
