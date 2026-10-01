import 'dart:async';

import 'package:flutter/material.dart';

import '../../../services/lms_service.dart' show Json;
import '../lms/lms_widgets.dart';

export '../lms/lms_widgets.dart';

/// Performance module accent — deep teal on the shared slate neutrals (see [Lc]).
class Pc {
  static const primary = Color(0xFF0F766E);
  static const primarySoft = Color(0xFFF0FDFA);
  static const primaryLine = Color(0xFF99F6E4);
  static const hero = [Color(0xFF0B3B3C), Color(0xFF115E59)];
  static const gold = Color(0xFFF59E0B);

  static const roleSelf = Color(0xFF4338CA);
  static const roleManager = Color(0xFF0F766E);
  static const rolePeer = Color(0xFF0369A1);
  static const roleHr = Color(0xFFBE123C);

  static Color role(String r) => switch (r) {
    'self' => roleSelf,
    'manager' => roleManager,
    'peer' => rolePeer,
    _ => roleHr,
  };

  static String roleLabel(String r) => switch (r) {
    'self' => 'Self',
    'manager' => 'Manager',
    'peer' => 'Peer',
    'hr' => 'HR',
    _ => titleCase(r),
  };

  /// 0–5 score colour scale.
  static Color score(num? s) => s == null
      ? Lc.faint
      : s >= 4
      ? Lc.success
      : s >= 3
      ? primary
      : s >= 2
      ? Lc.warning
      : Lc.danger;

  static String scoreLabel(num s) => s >= 4
      ? 'Excellent'
      : s >= 3
      ? 'Good'
      : s >= 2
      ? 'Average'
      : 'Needs improvement';
}

ButtonStyle pmsButton({double height = 48}) => lmsPrimaryButton(height: height, color: Pc.primary);

/// Avatar with initials on a muted tint derived from the name.
class InitialsAvatar extends StatelessWidget {
  const InitialsAvatar(this.name, {super.key, this.size = 40, this.initials});
  final String name;
  final String? initials;
  final double size;

  @override
  Widget build(BuildContext context) {
    final t = courseTint(name.codeUnits.fold(0, (a, b) => a + b));
    final ini =
        initials ?? name.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).map((w) => w[0]).take(2).join().toUpperCase();
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: t.bg, shape: BoxShape.circle),
      alignment: Alignment.center,
      child: Text(
        ini.isEmpty ? '?' : ini,
        style: TextStyle(color: t.fg, fontWeight: FontWeight.w800, fontSize: size * 0.36),
      ),
    );
  }
}

/// Read-only or interactive star row.
class StarRating extends StatelessWidget {
  const StarRating({super.key, required this.value, this.max = 5, this.size = 20, this.onChanged});
  final num value;
  final int max;
  final double size;
  final ValueChanged<int>? onChanged;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      for (var i = 1; i <= max; i++)
        GestureDetector(
          onTap: onChanged == null ? null : () => onChanged!(i),
          behavior: HitTestBehavior.opaque,
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: onChanged == null ? 0.5 : 3),
            child: Icon(
              i <= value.round() ? Icons.star_rounded : Icons.star_outline_rounded,
              size: size,
              color: i <= value.round() ? Pc.gold : Lc.line,
            ),
          ),
        ),
    ],
  );
}

/// Pill-shaped segmented control.
class Segmented<T> extends StatelessWidget {
  const Segmented({super.key, required this.items, required this.value, required this.onChanged});
  final List<(T, String)> items;
  final T value;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(4),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.45),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: Lc.glassBorder),
    ),
    child: Row(
      children: [
        for (final it in items)
          Expanded(
            child: GestureDetector(
              onTap: () => onChanged(it.$1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 9),
                decoration: BoxDecoration(
                  color: value == it.$1 ? Lc.surface : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                  boxShadow: value == it.$1 ? Lc.shadow : null,
                ),
                child: Text(
                  it.$2,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: value == it.$1 ? FontWeight.w700 : FontWeight.w500,
                    color: value == it.$1 ? Lc.ink : Lc.muted,
                  ),
                ),
              ),
            ),
          ),
      ],
    ),
  );
}

/// Score out of 5 shown as a ring.
class ScoreRing extends StatelessWidget {
  const ScoreRing(this.score, {super.key, this.size = 64, this.stroke = 6, this.light = false, this.label});
  final num? score;
  final double size, stroke;
  final bool light;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final v = ((score ?? 0) / 5).clamp(0.0, 1.0).toDouble();
    final c = light ? const Color(0xFF5EEAD4) : Pc.score(score);
    return SizedBox(
      width: size,
      height: size,
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: v),
        duration: const Duration(milliseconds: 900),
        curve: Curves.easeOutCubic,
        builder: (_, t, _) => Stack(
          fit: StackFit.expand,
          children: [
            CircularProgressIndicator(
              value: t,
              strokeWidth: stroke,
              strokeCap: StrokeCap.round,
              backgroundColor: light ? Colors.white.withValues(alpha: 0.16) : Lc.line,
              valueColor: AlwaysStoppedAnimation(c),
            ),
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    score == null ? '—' : score!.toStringAsFixed(1),
                    style: TextStyle(
                      fontSize: size * 0.26,
                      fontWeight: FontWeight.w800,
                      color: light ? Colors.white : Lc.ink,
                    ),
                  ),
                  if (label != null)
                    Text(
                      label!,
                      style: TextStyle(
                        fontSize: size * 0.13,
                        color: light ? Colors.white70 : Lc.muted,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Live countdown to a deadline (ticks every second under a day).
class Countdown extends StatefulWidget {
  const Countdown(this.deadline, {super.key, this.style});
  final DateTime? deadline;
  final TextStyle? style;

  @override
  State<Countdown> createState() => _CountdownState();
}

class _CountdownState extends State<Countdown> {
  Timer? _t;

  @override
  void initState() {
    super.initState();
    _t = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _t?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.deadline;
    if (d == null) return Text('—', style: widget.style);
    final diff = d.difference(DateTime.now());
    final (String text, Color color) = diff.isNegative
        ? ('Deadline passed', Lc.danger)
        : diff.inDays > 0
        ? ('${diff.inDays}d ${diff.inHours % 24}h left', diff.inDays <= 2 ? Lc.warning : Pc.primary)
        : ('${diff.inHours}h ${diff.inMinutes % 60}m ${diff.inSeconds % 60}s left', Lc.danger);
    return Text(
      text,
      style: (widget.style ?? const TextStyle(fontSize: 12)).copyWith(color: color, fontWeight: FontWeight.w700),
    );
  }
}

/// Answer score normalised to 0–5 (yes/no → 5/0), same as the web.
double? norm5(Json a) {
  final r = a['rating_score'];
  if (r == null) return null;
  final v = num.tryParse('$r') ?? 0;
  if (a['question_type'] == 'yes_no') return v == 1 ? 5 : 0;
  final max = num.tryParse('${a['max_score'] ?? 5}') ?? 5;
  return v / (max == 0 ? 5 : max) * 5;
}

double? avg(Iterable<num?> xs) {
  final v = xs.whereType<num>().toList();
  return v.isEmpty ? null : v.reduce((a, b) => a + b) / v.length;
}

DateTime? parseDt(dynamic s) => DateTime.tryParse('${s ?? ''}')?.toLocal();

String fmtDateTime(dynamic raw) => fmtDate(raw, 'dd MMM yyyy, hh:mm a');

/// Icon tile used for list leading slots.
class IconTile extends StatelessWidget {
  const IconTile(this.icon, {super.key, this.color = Pc.primary, this.size = 42});
  final IconData icon;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(11)),
    child: Icon(icon, color: color, size: size * 0.5),
  );
}
