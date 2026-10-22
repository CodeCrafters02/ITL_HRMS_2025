import 'package:flutter/material.dart';
import '../../../models/dashboard_model.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';
import 'day_type_banner.dart';

/// One compact card: what today is + hours worked + progress to the half day / full day hours.
class DayProgressCard extends StatelessWidget {
  const DayProgressCard({
    super.key,
    required this.progress,
    required this.checkedIn,
    required this.onBreak,
    this.info,
  });

  final DayProgress progress;
  final bool checkedIn;
  final bool onBreak;
  final DayInfo? info;

  static const _muted = AppStitchTheme.lightOnSurfaceMuted;
  static const _ink = AppStitchTheme.lightOnSurface;
  static const _green = Color(0xFF10B981);
  static const _blue = Color(0xFF0EA5E9);
  static const _amber = Color(0xFFF59E0B);
  static const _grey = Color(0xFF94A3B8);

  String _fmt(int seconds) {
    final m = (seconds < 0 ? 0 : seconds) ~/ 60;
    final h = m ~/ 60;
    return h > 0 ? '${h}h ${(m % 60).toString().padLeft(2, '0')}m' : '${m % 60}m';
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
    final color = {'full_day': _green, 'half_day': _blue, 'in_progress': _amber, 'not_started': _grey}[state]!;
    final badge = {'full_day': 'Full day done', 'half_day': 'Half day done', 'in_progress': 'In progress', 'not_started': 'Not started'}[state]!;
    final pct = full > 0 ? (worked / full).clamp(0.0, 1.0) : 0.0;
    final halfPct = full > 0 ? (half / full).clamp(0.0, 1.0) : 0.5;
    final nextLeft = state == 'half_day' ? full - worked : half - worked;
    final nextLabel = state == 'half_day' ? 'to full day' : 'to half day';

    return GlassCard(
      borderRadius: 22,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('TODAY', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: _muted)),
              if (info != null) ...[
                const SizedBox(width: 8),
                Flexible(child: DayTypePill(info: info!)),
              ],
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(999)),
                child: Text(badge, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: color)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          state == 'full_day'
              ? const Text('Full-day hours completed', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: _green))
              : !started
                  ? const Text('Check in to start counting', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: _muted))
                  : Text.rich(
                      TextSpan(children: [
                        TextSpan(text: _fmt(nextLeft), style: const TextStyle(fontWeight: FontWeight.w900, color: _ink)),
                        TextSpan(text: ' $nextLabel${onBreak ? ' · paused (break)' : ''}'),
                      ]),
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: _muted),
                    ),
          const SizedBox(height: 10),
          LayoutBuilder(
            builder: (context, c) {
              final w = c.maxWidth;
              return SizedBox(
                height: 26,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned(
                      left: 0,
                      right: 0,
                      top: 0,
                      child: Container(height: 8, decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(999))),
                    ),
                    Positioned(
                      left: 0,
                      top: 0,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 400),
                        height: 8,
                        width: w * pct,
                        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(999)),
                      ),
                    ),
                    Positioned(left: w * halfPct - 1, top: -3, child: Container(width: 2, height: 14, color: const Color(0xFF64748B))),
                    const Positioned(left: 0, top: 13, child: Text('0', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: _muted))),
                    Positioned(
                      left: (w * halfPct - 36).clamp(14.0, w - 120),
                      top: 13,
                      child: Text('Half · ${_fmt(half)}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _muted)),
                    ),
                    Positioned(right: 0, top: 13, child: Text('Full · ${_fmt(full)}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _muted))),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(child: _milestone('Half day', half, started && worked >= half, worked, started)),
              const SizedBox(width: 8),
              Expanded(child: _milestone('Full day', full, started && worked >= full, worked, started)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _milestone(String title, int target, bool done, int worked, bool started) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: done ? _green.withValues(alpha: 0.10) : Colors.white.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: done ? _green.withValues(alpha: 0.35) : AppStitchTheme.lightOutline.withValues(alpha: 0.7)),
      ),
      child: Row(
        children: [
          Icon(done ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded, size: 15, color: done ? _green : _muted),
          const SizedBox(width: 6),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$title · ${_fmt(target)}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: _ink)),
                Text(
                  done ? 'Done' : (!started ? '—' : '${_fmt(target - worked)} left'),
                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: done ? _green : _muted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
