import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../services/lms_service.dart' show Json, LmsService;
import '../../../services/pms_service.dart';
import 'pms_widgets.dart';

/// Web `PerformanceDashboard` — performance profile, 9-box, KRAs, ratings, skills, feedback.
class PmsOverviewTab extends StatefulWidget {
  const PmsOverviewTab({super.key, required this.onNavigate});
  final ValueChanged<int> onNavigate;

  @override
  State<PmsOverviewTab> createState() => _PmsOverviewTabState();
}

class _PmsOverviewTabState extends State<PmsOverviewTab> {
  bool _loading = true;
  String? _error;
  Json _d = const {};
  DateTimeRange? _range;
  int _pendingForms = 0, _pendingReviews = 0, _unreadFeedback = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _d.isEmpty;
      _error = null;
    });
    final f = DateFormat('yyyy-MM-dd');
    final r = await PmsService.profile(
      start: _range == null ? null : f.format(_range!.start),
      end: _range == null ? null : f.format(_range!.end),
    );
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (r.success) {
        _d = r.data!;
      } else {
        _error = r.message;
      }
    });
    _loadActions();
  }

  Future<void> _loadActions() async {
    final res = await Future.wait([PmsService.krasToReview(), PmsService.directFeedbackReceived(), PmsService.cycles()]);
    var forms = 0;
    final active = (res[2].data ?? const <Json>[]).where((c) => c['status'] == 'active').firstOrNull;
    if (active != null) {
      final t = await PmsService.feedbackTargets(PmsService.n(active['id']).toInt());
      forms = PmsService.list(t.data).where((x) => x['already_submitted'] != true).length;
    }
    if (!mounted) return;
    setState(() {
      _pendingReviews = (res[0].data ?? const []).where((k) => k['evaluation'] == null).length;
      _unreadFeedback = (res[1].data ?? const []).where((f) => f['acknowledged'] != true).length;
      _pendingForms = forms;
    });
  }

  Json get _emp => (_d['employee_details'] as Map?)?.cast<String, dynamic>() ?? const {};
  Json get _box => (_d['nine_box'] as Map?)?.cast<String, dynamic>() ?? const {};
  List<Json> _l(String k) => PmsService.list(_d[k]);

  Future<void> _pickRange() async {
    final now = DateTime.now();
    final r = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 1, 12, 31),
      initialDateRange: _range,
      builder: (c, child) => Theme(
        data: Theme.of(c).copyWith(colorScheme: Theme.of(c).colorScheme.copyWith(primary: Pc.primary)),
        child: child!,
      ),
    );
    if (r == null) return;
    setState(() => _range = r);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: Pc.primary, strokeWidth: 2.5));
    if (_error != null && _d.isEmpty) return SingleChildScrollView(child: ErrorRetry(message: _error!, onRetry: _load));
    final kras = _l('kras');
    final evals = _l('evaluations');
    final skills = _l('skills');
    final feedbacks = _l('feedbacks');
    final certs = _l('certificates');
    return RefreshIndicator(
      color: Pc.primary,
      onRefresh: _load,
      child: ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 28), children: [
        _hero(),
        const SizedBox(height: 12),
        _rangeBar(),
        if (_pendingForms + _pendingReviews + _unreadFeedback > 0) ...[
          const SectionHeader('Action items'),
          Row(children: [
            if (_pendingForms > 0) _action('$_pendingForms', 'Appraisal forms', Icons.fact_check_outlined, Lc.warning, 3),
            if (_pendingReviews > 0) _action('$_pendingReviews', 'KRAs to review', Icons.rate_review_outlined, Pc.rolePeer, 1),
            if (_unreadFeedback > 0) _action('$_unreadFeedback', 'New feedback', Icons.mark_chat_unread_outlined, Pc.roleSelf, 2),
          ]),
        ],
        const SectionHeader('Talent matrix'),
        _nineBox(),
        const SectionHeader('Score breakdown'),
        _breakdown(),
        SectionHeader('KRA weightage', count: kras.length, action: 'Manage', onAction: () => widget.onNavigate(1)),
        kras.isEmpty
            ? _emptyCard(Icons.track_changes_outlined, 'No KRAs mapped yet', 'Map KRAs from the catalogue to set your goals.')
            : _kraWeights(kras),
        SectionHeader('Appraisal ratings', count: evals.length, action: 'View all', onAction: () => widget.onNavigate(3)),
        evals.isEmpty
            ? _emptyCard(Icons.fact_check_outlined, 'No appraisal ratings yet', 'Ratings appear once a review cycle is completed.')
            : Column(children: evals.map(_evalCard).toList()),
        SectionHeader('Skills & certifications', count: skills.length),
        skills.isEmpty && certs.isEmpty
            ? _emptyCard(Icons.workspace_premium_outlined, 'No skills recorded', 'Course certificates you earn are added here automatically.')
            : _skills(skills, certs.length),
        SectionHeader('Recent feedback', count: feedbacks.length, action: 'View all', onAction: () => widget.onNavigate(2)),
        feedbacks.isEmpty
            ? _emptyCard(Icons.forum_outlined, 'No feedback yet', 'Feedback from your manager and peers shows up here.')
            : Column(children: feedbacks.take(4).map(_feedbackRow).toList()),
      ]),
    );
  }

  // ------------------------------------------------------------------ hero
  Widget _hero() {
    final photo = LmsService.mediaUrl(_emp['photo']);
    final name = '${_emp['full_name'] ?? 'Employee'}';
    final sub = [_emp['designation_name'], _emp['department_name']].where((x) => '${x ?? ''}'.isNotEmpty).join(' · ');
    final perf = _box['performance_score'] as num?;
    final pot = _box['potential_score'] as num?;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(colors: Pc.hero, begin: Alignment.topLeft, end: Alignment.bottomRight),
        boxShadow: [BoxShadow(color: Pc.hero.last.withValues(alpha: 0.25), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: Column(children: [
        Row(children: [
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white24, width: 2)),
            child: ClipOval(
              child: photo == null
                  ? InitialsAvatar(name, size: 50, initials: '${_emp['initials'] ?? ''}'.isEmpty ? null : '${_emp['initials']}')
                  : CachedNetworkImage(
                      imageUrl: photo,
                      width: 50,
                      height: 50,
                      fit: BoxFit.cover,
                      errorWidget: (_, _, _) => InitialsAvatar(name, size: 50),
                    ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800)),
              if (sub.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(sub, style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12.5)),
              ],
              if ('${_emp['reporting_manager_name'] ?? ''}'.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text('Reports to ${_emp['reporting_manager_name']}', style: TextStyle(color: Colors.white.withValues(alpha: 0.55), fontSize: 11.5)),
              ],
            ]),
          ),
        ]),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14)),
          child: Row(children: [
            ScoreRing(perf, size: 62, light: true),
            const SizedBox(width: 10),
            Expanded(child: _heroMetric('Performance', '${_box['performance_label'] ?? '—'}')),
            Container(width: 1, height: 44, color: Colors.white.withValues(alpha: 0.14), margin: const EdgeInsets.symmetric(horizontal: 8)),
            ScoreRing(pot, size: 62, light: true),
            const SizedBox(width: 10),
            Expanded(child: _heroMetric('Potential', '${_box['potential_label'] ?? '—'}')),
          ]),
        ),
        if (_box['box_title'] != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(99)),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.grid_view_rounded, size: 14, color: Color(0xFF5EEAD4)),
              const SizedBox(width: 6),
              Text('${_box['box_title']}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12.5)),
            ]),
          ),
        ],
      ]),
    );
  }

  Widget _heroMetric(String l, String v) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(l, style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 11.5)),
        const SizedBox(height: 2),
        Text(v, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800)),
      ]);

  Widget _rangeBar() => Row(children: [
        Expanded(
          child: InkWell(
            onTap: _pickRange,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
              decoration: BoxDecoration(color: Lc.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: Lc.line)),
              child: Row(children: [
                const Icon(Icons.date_range_rounded, size: 18, color: Lc.muted),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _range == null ? 'All time' : '${fmtDate(_range!.start.toIso8601String())} – ${fmtDate(_range!.end.toIso8601String())}',
                    style: const TextStyle(fontWeight: FontWeight.w600, color: Lc.text, fontSize: 13),
                  ),
                ),
                const Icon(Icons.expand_more_rounded, color: Lc.faint),
              ]),
            ),
          ),
        ),
        if (_range != null) ...[
          const SizedBox(width: 8),
          IconButton.outlined(
            onPressed: () {
              setState(() => _range = null);
              _load();
            },
            style: IconButton.styleFrom(side: const BorderSide(color: Lc.line)),
            icon: const Icon(Icons.close_rounded, size: 18, color: Lc.muted),
          ),
        ],
      ]);

  Widget _action(String v, String l, IconData i, Color c, int tab) => Expanded(
        child: Padding(
          padding: const EdgeInsets.only(right: 8),
          child: LmsCard(
            padding: const EdgeInsets.all(12),
            onTap: () => widget.onNavigate(tab),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              IconTile(i, color: c, size: 34),
              const SizedBox(height: 8),
              Text(v, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Lc.ink)),
              Text(l, maxLines: 1, overflow: TextOverflow.ellipsis, style: Lc.small),
            ]),
          ),
        ),
      );

  // -------------------------------------------------------------- 9-box
  static const _grid = [
    ['Potential Gem', 'High Potential', 'Star Performer'],
    ['Inconsistent Player', 'Core Player', 'High Performer'],
    ['Risk', 'Average Performer', 'Solid Performer'],
  ];

  Widget _nineBox() {
    final current = '${_box['box_title'] ?? ''}';
    return LmsCard(
      padding: const EdgeInsets.fromLTRB(10, 14, 14, 12),
      child: Column(children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const RotatedBox(
            quarterTurns: 3,
            child: Padding(
              padding: EdgeInsets.only(bottom: 6),
              child: Text('POTENTIAL  →', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Lc.faint, letterSpacing: 1)),
            ),
          ),
          Expanded(
            child: Column(children: [
              for (final row in _grid)
                Row(children: [
                  for (final cell in row)
                    Expanded(
                      child: AspectRatio(
                        aspectRatio: 1.15,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          margin: const EdgeInsets.all(3),
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: cell == current ? Pc.primary : Lc.bg,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: cell == current ? Pc.primary : Lc.line),
                            boxShadow: cell == current
                                ? [BoxShadow(color: Pc.primary.withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 4))]
                                : null,
                          ),
                          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                            if (cell == current) const Icon(Icons.person_pin_circle_rounded, color: Colors.white, size: 18),
                            Text(
                              cell,
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              style: TextStyle(
                                fontSize: 10,
                                height: 1.15,
                                fontWeight: cell == current ? FontWeight.w800 : FontWeight.w600,
                                color: cell == current ? Colors.white : Lc.muted,
                              ),
                            ),
                          ]),
                        ),
                      ),
                    ),
                ]),
            ]),
          ),
        ]),
        const Padding(
          padding: EdgeInsets.only(top: 6, left: 18),
          child: Text('PERFORMANCE  →', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Lc.faint, letterSpacing: 1)),
        ),
      ]),
    );
  }

  // ---------------------------------------------------------- breakdown
  Widget _breakdown() {
    final perf = (_box['perf_breakdown'] as Map?)?.cast<String, dynamic>() ?? const {};
    final pot = (_box['pot_breakdown'] as Map?)?.cast<String, dynamic>() ?? const {};
    Widget group(String title, Map<String, dynamic> m) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title.toUpperCase(), style: Lc.overline),
          const SizedBox(height: 8),
          for (final e in m.entries)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Builder(builder: (_) {
                final v = (e.value as Map).cast<String, dynamic>();
                final s = v['score'] as num?;
                return Column(children: [
                  Row(children: [
                    Expanded(child: Text(titleCase(e.key), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Lc.text))),
                    Text('${v['weight']}% weight', style: Lc.small),
                    const SizedBox(width: 10),
                    SizedBox(
                      width: 34,
                      child: Text(s == null ? '—' : s.toStringAsFixed(1),
                          textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.w800, color: Pc.score(s), fontSize: 13)),
                    ),
                  ]),
                  const SizedBox(height: 5),
                  ProgressLine((s ?? 0) * 20, height: 5, color: Pc.score(s)),
                ]);
              }),
            ),
        ]);
    return LmsCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        group('Performance', perf),
        const Divider(height: 18, color: Lc.line),
        group('Potential', pot),
      ]),
    );
  }

  Widget _kraWeights(List<Json> kras) {
    final total = kras.fold<num>(0, (s, k) => s + PmsService.n(k['weightage']));
    const palette = [Pc.primary, Pc.roleSelf, Pc.rolePeer, Lc.warning, Color(0xFF7C3AED), Lc.success];
    return LmsCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: SizedBox(
            height: 10,
            child: Row(children: [
              for (var i = 0; i < kras.length; i++)
                Expanded(flex: PmsService.n(kras[i]['weightage']).round().clamp(1, 100), child: Container(color: palette[i % palette.length])),
              if (total < 100) Expanded(flex: (100 - total).round(), child: Container(color: Lc.line)),
            ]),
          ),
        ),
        const SizedBox(height: 12),
        for (var i = 0; i < kras.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(children: [
              Container(width: 10, height: 10, decoration: BoxDecoration(color: palette[i % palette.length], borderRadius: BorderRadius.circular(3))),
              const SizedBox(width: 10),
              Expanded(child: Text('${kras[i]['kra_name'] ?? 'KRA'}', style: const TextStyle(fontSize: 13, color: Lc.text, fontWeight: FontWeight.w600))),
              Text('${PmsService.n(kras[i]['weightage'])}%', style: const TextStyle(fontWeight: FontWeight.w800, color: Lc.ink, fontSize: 13)),
            ]),
          ),
        const Divider(height: 14, color: Lc.line),
        Row(children: [
          const Text('Total weightage', style: Lc.small),
          const Spacer(),
          Text('$total%', style: TextStyle(fontWeight: FontWeight.w800, color: total == 100 ? Lc.success : Lc.warning)),
        ]),
      ]),
    );
  }

  Widget _evalCard(Json e) {
    Widget bar(String l, num? v, Color c) => Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Row(children: [
            SizedBox(width: 62, child: Text(l, style: Lc.small)),
            Expanded(child: ProgressLine((v ?? 0) * 20, height: 6, color: c)),
            SizedBox(
              width: 34,
              child: Text(v == null ? '—' : v.toStringAsFixed(1),
                  textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5, color: Lc.text)),
            ),
          ]),
        );
    final status = '${e['status'] ?? ''}';
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: LmsCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${e['cycle_name']}', style: Lc.h3),
                Text('${fmtDate(e['cycle_start'])} – ${fmtDate(e['cycle_end'])}', style: Lc.small),
              ]),
            ),
            if (status.isNotEmpty) Pill(titleCase(status), color: statusColor(status)),
          ]),
          bar('Self', e['self_rating'] as num?, Pc.roleSelf),
          bar('Manager', e['manager_rating'] as num?, Pc.roleManager),
          bar('Final', e['final_rating'] as num?, Pc.gold),
        ]),
      ),
    );
  }

  Widget _skills(List<Json> skills, int certCount) => LmsCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final s in skills)
              Container(
                padding: const EdgeInsets.fromLTRB(10, 7, 12, 7),
                decoration: BoxDecoration(color: Lc.bg, borderRadius: BorderRadius.circular(10), border: Border.all(color: Lc.line)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(
                    s['source'] == 'certificate' ? Icons.workspace_premium_rounded : Icons.bolt_rounded,
                    size: 15,
                    color: _profColor('${s['proficiency_level']}'),
                  ),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text('${s['skill_name']}',
                        overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Lc.text)),
                  ),
                  const SizedBox(width: 6),
                  Text(titleCase('${s['proficiency_level'] ?? ''}'),
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _profColor('${s['proficiency_level']}'))),
                ]),
              ),
          ]),
          if (certCount > 0) ...[
            const SizedBox(height: 12),
            Text('$certCount certificate${certCount == 1 ? '' : 's'} on record', style: Lc.small),
          ],
        ]),
      );

  Color _profColor(String p) => switch (p) {
        'expert' => Pc.roleSelf,
        'intermediate' => Pc.primary,
        _ => Lc.warning,
      };

  Widget _feedbackRow(Json f) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: LmsCard(
          padding: const EdgeInsets.all(12),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            InitialsAvatar('${f['given_by_name'] ?? '?'}', size: 38),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text('${f['given_by_name'] ?? 'Anonymous'}', style: Lc.h3)),
                  if (f['rating'] != null) StarRating(value: PmsService.n(f['rating']), size: 14),
                ]),
                const SizedBox(height: 2),
                Text('${f['feedback_type'] ?? ''} · ${f['created_at'] ?? ''}', style: Lc.small),
                const SizedBox(height: 6),
                Text('${f['feedback_text'] ?? ''}', style: Lc.body.copyWith(color: Lc.text)),
              ]),
            ),
          ]),
        ),
      );

  Widget _emptyCard(IconData i, String t, String m) => LmsCard(
        child: Row(children: [
          IconTile(i, color: Lc.faint),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(t, style: Lc.h3),
              const SizedBox(height: 2),
              Text(m, style: Lc.small),
            ]),
          ),
        ]),
      );
}
