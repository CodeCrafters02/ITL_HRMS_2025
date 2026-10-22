import 'package:flutter/material.dart';
import '../../../models/dashboard_model.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';

/// Shows whether the employee has completed the half day / full day hours today.
class DayProgressCard extends StatelessWidget {
  const DayProgressCard({super.key, required this.progress, required this.checkedIn, required this.onBreak});

  final DayProgress progress;
  final bool checkedIn;
  final bool onBreak;

  static const _muted = AppStitchTheme.lightOnSurfaceMuted;
  static const _ink = AppStitchTheme.lightOnSurface;

  String _fmt(int seconds) {
    final m = (seconds < 0 ? 0 : seconds) ~/ 60;
    final h = m ~/ 60;
    return h > 0 ? '${h}h ${m % 60}m' : '${m % 60}m';
  }

  @override
  Widget build(BuildContext context) {
    final worked = checkedIn || progress.workedSeconds > 0 ? progress.liveSeconds() : 0;
    final half = progress.halfDaySeconds;
    final full = progress.fullDaySeconds;
    final started = progress.state != 'not_started' || worked > 0;
    final String state = !started
        ? 'not_started'
        : worked >= full
            ? 'full_day'
            : worked >= half
                ? 'half_day'
                : 'in_progress';

    const green = Color(0xFF10B981);
    const blue = Color(0xFF0EA5E9);
    const amber = Color(0xFFF59E0B);
    const grey = Color(0xFF94A3B8);
    final color = {'full_day': green, 'half_day': blue, 'in_progress': amber, 'not_started': grey}[state]!;
    final label = {
      'full_day': 'Full day completed',
      'half_day': 'Half day completed',
      'in_progress': 'In progress',
      'not_started': 'Not started',
    }[state]!;
    final pct = full > 0 ? (worked / full).clamp(0.0, 1.0) : 0.0;
    final halfPct = full > 0 ? (half / full).clamp(0.0, 1.0) : 0.5;

    return GlassCard(
      borderRadius: 24,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Today's attendance status", style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: _ink)),
                    const SizedBox(height: 2),
                    Text(
                      started ? 'Worked ${_fmt(worked)}${onBreak ? ' · paused (on break)' : ''}' : 'Check in to start counting',
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: _muted),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(999)),
                child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: color)),
              ),
            ],
          ),
          const SizedBox(height: 14),
          LayoutBuilder(
            builder: (context, c) => Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  height: 10,
                  decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(999)),
                ),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 400),
                  height: 10,
                  width: c.maxWidth * pct,
                  decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(999)),
                ),
                Positioned(
                  left: c.maxWidth * halfPct - 1,
                  top: -3,
                  child: Container(width: 2, height: 16, color: const Color(0xFF64748B)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text('0', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _muted)),
              Text('Full day', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _muted)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _step('Half day', half, worked >= half && started, worked, started)),
              const SizedBox(width: 10),
              Expanded(child: _step('Full day', full, worked >= full && started, worked, started)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _step(String title, int target, bool done, int worked, bool started) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: done ? const Color(0xFF10B981).withValues(alpha: 0.10) : Colors.white.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: done ? const Color(0xFF10B981).withValues(alpha: 0.4) : AppStitchTheme.lightOutline.withValues(alpha: 0.7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(done ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded, size: 18, color: done ? const Color(0xFF10B981) : _muted),
              const SizedBox(width: 6),
              Expanded(child: Text(title, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: _ink))),
              Text(_fmt(target), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _muted)),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            done ? 'Completed' : (!started ? 'Not started' : '${_fmt(target - worked)} to go'),
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: done ? const Color(0xFF10B981) : _muted),
          ),
        ],
      ),
    );
  }
}
