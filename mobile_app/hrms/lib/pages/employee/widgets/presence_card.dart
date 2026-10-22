import 'package:flutter/material.dart';
import '../../../services/employee_service.dart';
import '../../../models/presence_model.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';

Color presenceColor(String s) {
  switch (s) {
    case 'Available':
    case 'AvailableIdle':
      return const Color(0xFF00AB55);
    case 'Busy':
    case 'BusyIdle':
    case 'DoNotDisturb':
      return const Color(0xFFE7515A);
    case 'Away':
    case 'BeRightBack':
      return const Color(0xFFE2A03F);
    default:
      return const Color(0xFF888EA8);
  }
}

class _Dot extends StatelessWidget {
  const _Dot(this.status);
  final String status;
  @override
  Widget build(BuildContext context) => Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(shape: BoxShape.circle, color: presenceColor(status)),
      );
}

class PresenceCard extends StatelessWidget {
  const PresenceCard({super.key, required this.presence});
  final PresenceSummary presence;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final cur = presence.availability ?? 'Unknown';
    final sh = presence.shift;
    final muted = t.labelSmall?.copyWith(color: AppStitchTheme.lightOnSurfaceMuted, fontWeight: FontWeight.w700, letterSpacing: 0.4);
    final val = t.bodyMedium?.copyWith(fontWeight: FontWeight.w900, color: AppStitchTheme.lightOnSurface);
    Widget pair(String l, String v) => Row(mainAxisSize: MainAxisSize.min, children: [
          Text('${l.toUpperCase()} ', style: muted),
          Text(v, style: val),
        ]);
    return GlassCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (_) => PresenceDetailsSheet(presence: presence),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 16,
            runSpacing: 6,
            children: [
              Row(mainAxisSize: MainAxisSize.min, children: [
                _Dot(cur),
                const SizedBox(width: 8),
                Text('Teams: $cur', style: val),
                if (presence.currentSince != null) Text('  since ${presence.currentSince}', style: muted),
              ]),
              if (sh != null)
                sh.assigned
                    ? pair('In shift ${sh.start}–${sh.end}', sh.workingLabel ?? '')
                    : Text('Not assigned to any shift', style: t.bodySmall?.copyWith(color: const Color(0xFFD97706), fontWeight: FontWeight.w700)),
              if (presence.overtimeSeconds > 0) pair('Overtime', presence.overtimeLabel ?? ''),
              Text('View details', style: t.bodySmall?.copyWith(color: AppStitchTheme.primary, decoration: TextDecoration.underline)),
            ],
          ),
        ),
      ),
    );
  }
}

List<Widget> presenceDetailChildren(BuildContext context, PresenceSummary p) {
  final t = Theme.of(context).textTheme;
    final muted = t.labelSmall?.copyWith(color: AppStitchTheme.lightOnSurfaceMuted, fontWeight: FontWeight.w800, letterSpacing: 0.5);
    final bold = t.bodyMedium?.copyWith(fontWeight: FontWeight.w800, color: AppStitchTheme.lightOnSurface);
    final soft = t.bodySmall?.copyWith(color: AppStitchTheme.lightOnSurfaceMuted);
    Widget row(Widget l, String r) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [l, Flexible(child: Text(r, style: bold, textAlign: TextAlign.end))]),
        );
    Widget stat(String l, String v) => Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            margin: const EdgeInsets.symmetric(horizontal: 3),
            decoration: BoxDecoration(color: AppStitchTheme.primary.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(12)),
            child: Column(children: [
              Text(l.toUpperCase(), style: muted),
              const SizedBox(height: 4),
              Text(v, style: t.titleSmall?.copyWith(fontWeight: FontWeight.w900, color: AppStitchTheme.lightOnSurface)),
            ]),
          ),
        );
    Widget section(String title, List<Widget> children) => Padding(
          padding: const EdgeInsets.only(top: 16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title.toUpperCase(), style: muted),
            const SizedBox(height: 6),
            ...children,
          ]),
        );
    Widget statusLabel(String s) => Row(mainAxisSize: MainAxisSize.min, children: [_Dot(s), const SizedBox(width: 8), Text(s, style: bold)]);
    final sh = p.shift;
  return [
              Row(children: [
                stat('Working', p.workingLabel ?? '0h 00m'),
                stat('Overtime', p.overtimeLabel ?? '0h 00m'),
                stat('Punch', '${p.punchIn ?? '--:--'} / ${p.punchLive ? 'Live' : (p.punchOut ?? '--:--')}'),
              ]),
              if (sh != null)
                section('Shift', sh.assigned
                    ? [
                        row(Text(sh.type ?? 'Shift', style: bold), '${sh.start} – ${sh.end}'),
                        row(Text('Working hours in shift', style: bold), sh.workingLabel ?? ''),
                        row(Text('Outside shift timings', style: bold), sh.outsideLabel ?? ''),
                        row(Text('Expected per day', style: soft), sh.fullDayLabel ?? ''),
                      ]
                    : [Text('Not assigned to any shift', style: bold?.copyWith(color: const Color(0xFFD97706)))]),
              if (p.statuses.isNotEmpty)
                section('Time by status', [for (final r in p.statuses) row(statusLabel(r.status), r.label)]),
              if (p.timeline.isNotEmpty)
                section('Status timeline', [for (final x in p.timeline) row(statusLabel(x.status), '${x.start} – ${x.end} (${x.label})')]),
              if (p.sessions.isNotEmpty)
                section('Working sessions', [
                  Wrap(spacing: 8, runSpacing: 6, children: [
                    for (final x in p.sessions)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(color: AppStitchTheme.primary.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(8)),
                        child: Text('${x.start} – ${x.end}', style: soft),
                      ),
                  ]),
                  const SizedBox(height: 6),
                  Text('Working time counts Available, Busy and Do Not Disturb only.', style: soft),
                ]),
  ];
}

class PresenceDetailsSheet extends StatelessWidget {
  const PresenceDetailsSheet({super.key, required this.presence, this.title = 'Teams activity — today'});
  final PresenceSummary presence;
  final String title;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final p = presence;
    final cur = p.availability ?? 'Unknown';
    final soft = t.bodySmall?.copyWith(color: AppStitchTheme.lightOnSurfaceMuted);
    return DraggableScrollableSheet(
      initialChildSize: 0.8,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, controller) => Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 24, offset: Offset(0, -4))],
        ),
        child: Column(children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              decoration: BoxDecoration(color: AppStitchTheme.lightOutline.withValues(alpha: 0.85), borderRadius: BorderRadius.circular(2)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 8, 10),
            child: Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: t.titleMedium?.copyWith(fontWeight: FontWeight.w900, color: AppStitchTheme.lightOnSurface)),
                  const SizedBox(height: 4),
                  Row(children: [
                    _Dot(cur),
                    const SizedBox(width: 8),
                    Text('$cur${p.currentSince != null ? ' since ${p.currentSince}' : ''}', style: soft),
                  ]),
                ]),
              ),
              IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(context)),
            ]),
          ),
          const Divider(height: 1),
          Expanded(
            child: ListView(
              controller: controller,
              physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
              children: presenceDetailChildren(context, p),
            ),
          ),
        ]),
      ),
    );
  }
}

String todayKey() {
  final d = DateTime.now();
  return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}

/// Collapsible "Teams status - today" block for someone in the caller's own downline.
/// Renders nothing when the server refuses (not in the caller's hierarchy) or has no data.
class TeamsActivitySection extends StatefulWidget {
  const TeamsActivitySection({super.key, required this.targetId});
  final int targetId;

  @override
  State<TeamsActivitySection> createState() => _TeamsActivitySectionState();
}

class _TeamsActivitySectionState extends State<TeamsActivitySection> {
  PresenceSummary? _p;
  bool _loading = true;
  bool _open = false;

  @override
  void initState() {
    super.initState();
    EmployeeService.getPresenceSummary(date: todayKey(), target: widget.targetId).then((p) {
      if (mounted) {
        setState(() {
          _p = p;
          _loading = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = _p;
    if (_loading) {
      return const Padding(padding: EdgeInsets.fromLTRB(20, 0, 20, 12), child: LinearProgressIndicator(minHeight: 2));
    }
    if (p == null) return const SizedBox.shrink();
    final t = Theme.of(context).textTheme;
    final cur = p.availability ?? 'Unknown';
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      decoration: BoxDecoration(
        color: AppStitchTheme.primary.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppStitchTheme.primary.withValues(alpha: 0.12)),
      ),
      child: Column(children: [
        InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => setState(() => _open = !_open),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(children: [
              _Dot(cur),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Teams status - today', style: t.bodyMedium?.copyWith(fontWeight: FontWeight.w900, color: AppStitchTheme.lightOnSurface)),
                  Text(
                    '$cur${p.currentSince != null ? ' since ${p.currentSince}' : ''} - Working ${p.workingLabel ?? '0h 00m'}',
                    style: t.bodySmall?.copyWith(color: AppStitchTheme.lightOnSurfaceMuted),
                  ),
                ]),
              ),
              Icon(_open ? Icons.expand_less_rounded : Icons.expand_more_rounded, color: AppStitchTheme.lightOnSurfaceMuted),
            ]),
          ),
        ),
        if (_open)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            child: p.hasData || p.availability != null
                ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: presenceDetailChildren(context, p))
                : Text('No Teams activity recorded today.', style: t.bodySmall),
          ),
      ]),
    );
  }
}
