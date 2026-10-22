import 'package:flutter/material.dart';
import '../../../models/dashboard_model.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';

/// Small pill describing what today is, e.g. Working day or Holiday with the holiday's name.
class DayTypePill extends StatelessWidget {
  const DayTypePill({super.key, required this.info});

  final DayInfo info;

  static Color colorFor(String type) {
    switch (type) {
      case 'holiday':
        return const Color(0xFF0EA5E9);
      case 'weekly_off':
        return const Color(0xFF64748B);
      case 'leave':
      case 'half_day_leave':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF10B981);
    }
  }

  static String labelFor(DayInfo info) {
    switch (info.type) {
      case 'holiday':
        return 'Holiday';
      case 'weekly_off':
        return 'Weekly off';
      case 'leave':
        return 'On leave';
      case 'half_day_leave':
        return 'Half-day leave';
      default:
        return 'Working day';
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = colorFor(info.type);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 7, height: 7, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              info.type != 'working' && info.detail.isNotEmpty ? '${labelFor(info)} · ${info.detail}' : labelFor(info),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: color),
            ),
          ),
        ],
      ),
    );
  }
}

/// Compact TODAY card with the day-type pill, used when there is no hours progress to show (holiday, weekly off, leave).
class DayTypeBanner extends StatelessWidget {
  const DayTypeBanner({super.key, required this.info});

  final DayInfo info;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      borderRadius: 20,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          const Text(
            'TODAY',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: AppStitchTheme.lightOnSurfaceMuted),
          ),
          const SizedBox(width: 10),
          Flexible(child: DayTypePill(info: info)),
        ],
      ),
    );
  }
}
