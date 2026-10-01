import 'package:flutter/material.dart';

import '../../../services/lms_service.dart' show Json;
import '../../../services/pms_service.dart';
import 'pms_widgets.dart';

const _categories = [
  ('appreciation', 'Appreciation', Icons.emoji_events_outlined, Color(0xFF15803D)),
  ('manager_coaching', 'Coaching', Icons.school_outlined, Color(0xFF1D4ED8)),
  ('constructive', 'Constructive', Icons.build_outlined, Color(0xFFB45309)),
  ('goal_progress', 'Goal progress', Icons.flag_outlined, Color(0xFF0F766E)),
  ('peer_recognition', 'Recognition', Icons.handshake_outlined, Color(0xFF6D28D9)),
];

(String, IconData, Color) _cat(String key) {
  for (final c in _categories) {
    if (c.$1 == key) return (c.$2, c.$3, c.$4);
  }
  return (titleCase(key), Icons.chat_bubble_outline_rounded, Lc.muted);
}

/// Web `FeedbackReceived` + `ManagerDirectFeedback`.
class PmsFeedbackTab extends StatefulWidget {
  const PmsFeedbackTab({super.key});

  @override
  State<PmsFeedbackTab> createState() => _PmsFeedbackTabState();
}

class _PmsFeedbackTabState extends State<PmsFeedbackTab> {
  String _seg = 'received';
  String _kind = 'appraisal';
  bool _loading = true;
  String? _error;
  List<Json> _cycles = [], _evals = [], _direct = [], _reportees = [];
  int? _cycle; // null = all cycles
  int? _acking;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _cycles.isEmpty && _direct.isEmpty;
      _error = null;
    });
    final r = await Future.wait([
      PmsService.cycles(),
      PmsService.myEvaluations(cycle: _cycle),
      PmsService.directFeedbackReceived(),
      PmsService.myReportees(),
    ]);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (!r[1].success && !r[2].success) _error = r[1].message;
      _cycles = r[0].data ?? _cycles;
      _evals = r[1].data ?? _evals;
      _direct = (r[2].data ?? _direct)..sort((a, b) => '${b['created_at']}'.compareTo('${a['created_at']}'));
      _reportees = r[3].data ?? _reportees;
    });
  }

  Future<void> _setCycle(int? c) async {
    setState(() => _cycle = c);
    final r = await PmsService.myEvaluations(cycle: c);
    if (mounted && r.success) setState(() => _evals = r.data!);
  }

  Future<void> _ack(Json f) async {
    final id = PmsService.n(f['id']).toInt();
    setState(() => _acking = id);
    final r = await PmsService.acknowledge(id);
    if (!mounted) return;
    setState(() {
      _acking = null;
      if (r.success) f['acknowledged'] = true;
    });
    if (!r.success) lmsToast(context, r.message ?? 'Failed to acknowledge', error: true);
  }

  @override
  Widget build(BuildContext context) {
    final unread = _direct.where((f) => f['acknowledged'] != true).length;
    return Column(children: [
      Container(
        color: Lc.surface,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Segmented<String>(
          items: [('received', unread > 0 ? 'Received · $unread new' : 'Received'), ('give', 'Give feedback')],
          value: _seg,
          onChanged: (v) => setState(() => _seg = v),
        ),
      ),
      const Divider(height: 1, color: Lc.line),
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: Pc.primary, strokeWidth: 2.5))
            : _error != null
                ? SingleChildScrollView(child: ErrorRetry(message: _error!, onRetry: _load))
                : _seg == 'give'
                    ? _GiveFeedback(reportees: _reportees)
                    : RefreshIndicator(color: Pc.primary, onRefresh: _load, child: _received(unread)),
      ),
    ]);
  }

  Widget _received(int unread) => ListView(padding: const EdgeInsets.fromLTRB(16, 14, 16, 28), children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: [
            _kindChip('appraisal', 'Appraisal feedback', Icons.fact_check_outlined),
            _kindChip('direct', unread > 0 ? 'Direct · $unread' : 'Direct', Icons.forum_outlined),
          ]),
        ),
        const SizedBox(height: 14),
        if (_kind == 'appraisal') ..._appraisalView() else ..._directView(),
      ]);

  Widget _kindChip(String v, String label, IconData icon) => Padding(
        padding: const EdgeInsets.only(right: 8),
        child: ChoiceChip(
          avatar: Icon(icon, size: 16, color: _kind == v ? Colors.white : Lc.muted),
          label: Text(label),
          selected: _kind == v,
          onSelected: (_) => setState(() => _kind = v),
          showCheckmark: false,
          selectedColor: Lc.ink,
          backgroundColor: Lc.surface,
          side: BorderSide(color: _kind == v ? Lc.ink : Lc.line),
          labelStyle: TextStyle(color: _kind == v ? Colors.white : Lc.text, fontWeight: FontWeight.w600, fontSize: 12.5),
        ),
      );

  // ---------------------------------------------------------- appraisal
  List<Widget> _appraisalView() {
    final answers = <Json>[
      for (final e in _evals)
        for (final a in PmsService.list(e['answers'])) {...a, 'cycle_name': e['cycle_name']},
    ];
    final byRole = <String, List<Json>>{};
    for (final a in answers) {
      byRole.putIfAbsent('${a['role_type']}', () => []).add(a);
    }
    final roles = ['self', 'manager', 'peer', 'hr'].where(byRole.containsKey).toList();
    final roleAvg = {for (final r in roles) r: avg(byRole[r]!.map(norm5))};
    final combined = avg(roleAvg.values);

    return [
      DropdownButtonFormField<int?>(
        initialValue: _cycle,
        isExpanded: true,
        decoration: lmsInput('Appraisal cycle', icon: Icons.event_note_outlined),
        borderRadius: BorderRadius.circular(12),
        items: [
          const DropdownMenuItem<int?>(value: null, child: Text('All cycles')),
          for (final c in _cycles)
            DropdownMenuItem<int?>(
              value: PmsService.n(c['id']).toInt(),
              child: Text('${c['name']}${c['status'] == 'active' ? ' (Active)' : ''}', overflow: TextOverflow.ellipsis),
            ),
        ],
        onChanged: _setCycle,
      ),
      const SizedBox(height: 12),
      if (answers.isEmpty)
        const EmptyState(
          icon: Icons.fact_check_outlined,
          title: 'No appraisal feedback yet',
          message: 'Ratings from self, manager, peer and HR reviews appear here once submitted.',
        )
      else ...[
        LmsCard(
          child: Row(children: [
            ScoreRing(combined, size: 72, label: 'overall'),
            const SizedBox(width: 16),
            Expanded(
              child: Wrap(spacing: 8, runSpacing: 8, children: [
                for (final r in roles)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(color: Pc.role(r).withValues(alpha: 0.08), borderRadius: BorderRadius.circular(10)),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(Pc.roleLabel(r), style: TextStyle(fontSize: 11, color: Pc.role(r), fontWeight: FontWeight.w700)),
                      Text(roleAvg[r]?.toStringAsFixed(1) ?? '—', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Lc.ink)),
                    ]),
                  ),
              ]),
            ),
          ]),
        ),
        for (final r in roles) ...[
          SectionHeader('${Pc.roleLabel(r)} review', count: byRole[r]!.length),
          if (r == 'peer')
            ..._groupBy(byRole[r]!, (a) => '${a['submitted_by_name'] ?? 'Reviewer #${a['submitted_by']}'}')
                .entries
                .map((e) => _answerCard(r, e.value, title: e.key))
          else
            _answerCard(r, byRole[r]!),
        ],
      ],
    ];
  }

  Map<String, List<Json>> _groupBy(List<Json> xs, String Function(Json) key) {
    final m = <String, List<Json>>{};
    for (final x in xs) {
      m.putIfAbsent(key(x), () => []).add(x);
    }
    return m;
  }

  Widget _answerCard(String role, List<Json> answers, {String? title}) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: LmsCard(
          padding: EdgeInsets.zero,
          child: Column(children: [
            Container(height: 3, decoration: BoxDecoration(color: Pc.role(role), borderRadius: const BorderRadius.vertical(top: Radius.circular(Lc.r)))),
            if (title != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
                child: Row(children: [
                  InitialsAvatar(title, size: 28),
                  const SizedBox(width: 8),
                  Expanded(child: Text(title, style: Lc.h3)),
                  Text(avg(answers.map(norm5))?.toStringAsFixed(1) ?? '—', style: TextStyle(fontWeight: FontWeight.w800, color: Pc.role(role))),
                ]),
              ),
            for (var i = 0; i < answers.length; i++) ...[
              if (i > 0) const Divider(height: 1, color: Lc.line, indent: 12, endIndent: 12),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('${answers[i]['question_text']}', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: Lc.text)),
                      if (_cycle == null && answers[i]['cycle_name'] != null) Text('${answers[i]['cycle_name']}', style: Lc.small),
                      if ('${answers[i]['comment'] ?? ''}'.isNotEmpty)
                        Text('"${answers[i]['comment']}"', style: Lc.small.copyWith(fontStyle: FontStyle.italic)),
                    ]),
                  ),
                  const SizedBox(width: 8),
                  answers[i]['question_type'] == 'yes_no'
                      ? Pill(
                          answers[i]['rating_score'] == null ? '—' : (PmsService.n(answers[i]['rating_score']) == 1 ? 'Yes' : 'No'),
                          color: PmsService.n(answers[i]['rating_score']) == 1 ? Lc.success : Lc.danger,
                        )
                      : StarRating(value: norm5(answers[i]) ?? 0, size: 15),
                ]),
              ),
            ],
          ]),
        ),
      );

  // ------------------------------------------------------------- direct
  List<Widget> _directView() => _direct.isEmpty
      ? const [
          EmptyState(icon: Icons.forum_outlined, title: 'No direct feedback yet', message: 'Feedback your manager or peers send you will appear here.'),
        ]
      : _direct.map((f) {
          final (label, icon, color) = _cat('${f['category']}');
          final unread = f['acknowledged'] != true;
          final id = PmsService.n(f['id']).toInt();
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: LmsCard(
              color: unread ? const Color(0xFFFAFFFE) : Lc.surface,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  InitialsAvatar('${f['sender_name'] ?? '?'}', size: 38),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('${f['sender_name'] ?? 'Anonymous'}', style: Lc.h3),
                      Text(fmtDateTime(f['created_at']), style: Lc.small),
                    ]),
                  ),
                  if (unread) Container(width: 8, height: 8, decoration: const BoxDecoration(color: Pc.primary, shape: BoxShape.circle)),
                ]),
                const SizedBox(height: 10),
                Row(children: [
                  Pill(label, color: color, icon: icon),
                  const Spacer(),
                  if (f['rating'] != null) StarRating(value: PmsService.n(f['rating']), size: 16),
                ]),
                const SizedBox(height: 8),
                Text('${f['feedback_text'] ?? ''}', style: Lc.body.copyWith(color: Lc.text)),
                const SizedBox(height: 10),
                unread
                    ? SizedBox(
                        height: 36,
                        child: OutlinedButton.icon(
                          onPressed: _acking == id ? null : () => _ack(f),
                          style: lmsSecondaryButton(height: 36).copyWith(
                            foregroundColor: const WidgetStatePropertyAll(Pc.primary),
                            minimumSize: const WidgetStatePropertyAll(Size(0, 36)),
                          ),
                          icon: const Icon(Icons.done_all_rounded, size: 17),
                          label: Text(_acking == id ? 'Saving…' : 'Acknowledge', style: const TextStyle(fontSize: 13)),
                        ),
                      )
                    : const Row(children: [
                        Icon(Icons.done_all_rounded, size: 16, color: Lc.success),
                        SizedBox(width: 6),
                        Text('Acknowledged', style: TextStyle(color: Lc.success, fontWeight: FontWeight.w600, fontSize: 12.5)),
                      ]),
              ]),
            ),
          );
        }).toList();
}

// ============================================================================
// Give feedback (web ManagerDirectFeedback)
// ============================================================================
class _GiveFeedback extends StatefulWidget {
  const _GiveFeedback({required this.reportees});
  final List<Json> reportees;

  @override
  State<_GiveFeedback> createState() => _GiveFeedbackState();
}

class _GiveFeedbackState extends State<_GiveFeedback> {
  Json? _sel;
  List<Json> _history = [];
  bool _histLoading = false, _saving = false;
  String _category = 'manager_coaching', _visibility = 'private', _q = '';
  int _rating = 0;
  final _text = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.reportees.isNotEmpty) _select(widget.reportees.first);
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _select(Json r) async {
    setState(() {
      _sel = r;
      _histLoading = true;
    });
    final res = await PmsService.feedbackFor(PmsService.n(r['id']).toInt());
    if (!mounted || _sel != r) return;
    setState(() {
      _histLoading = false;
      _history = (res.data ?? [])..sort((a, b) => '${b['created_at']}'.compareTo('${a['created_at']}'));
    });
  }

  Future<void> _submit() async {
    if (_sel == null) return;
    if (_rating == 0) return lmsToast(context, 'Please select a rating (1–5 stars)', error: true);
    if (_text.text.trim().isEmpty) return lmsToast(context, 'Please write some feedback', error: true);
    setState(() => _saving = true);
    final r = await PmsService.giveFeedback(
      receiver: PmsService.n(_sel!['id']).toInt(),
      text: _text.text.trim(),
      category: _category,
      rating: _rating,
      visibility: _visibility,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (!r.success) return lmsToast(context, r.message ?? 'Failed to submit feedback', error: true);
    lmsToast(context, 'Feedback sent to ${_sel!['name']}');
    FocusScope.of(context).unfocus();
    setState(() {
      _text.clear();
      _rating = 0;
      _category = 'manager_coaching';
      _visibility = 'private';
    });
    _select(_sel!);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.reportees.isEmpty) {
      return ListView(children: const [
        EmptyState(
          icon: Icons.groups_outlined,
          title: 'No team members',
          message: 'Direct feedback can be given to employees who report to you.',
        ),
      ]);
    }
    final people = widget.reportees
        .where((r) => '${r['name']} ${r['designation']} ${r['department']}'.toLowerCase().contains(_q.toLowerCase()))
        .toList();
    return ListView(padding: const EdgeInsets.fromLTRB(16, 14, 16, 28), children: [
      if (widget.reportees.length > 6) ...[
        TextField(
          onChanged: (v) => setState(() => _q = v),
          decoration: lmsInput('Search team', icon: Icons.search_rounded),
        ),
        const SizedBox(height: 10),
      ],
      SizedBox(
        height: 92,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: people.length,
          separatorBuilder: (_, _) => const SizedBox(width: 6),
          itemBuilder: (_, i) {
            final r = people[i];
            final sel = _sel != null && PmsService.n(_sel!['id']) == PmsService.n(r['id']);
            return GestureDetector(
              onTap: () => _select(r),
              child: SizedBox(
                width: 72,
                child: Column(children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.all(2.5),
                    decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: sel ? Pc.primary : Colors.transparent, width: 2.5)),
                    child: InitialsAvatar('${r['name']}', size: 50, initials: '${r['initials'] ?? ''}'.isEmpty ? null : '${r['initials']}'),
                  ),
                  const SizedBox(height: 4),
                  Text('${r['name']}'.split(' ').first,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, fontWeight: sel ? FontWeight.w700 : FontWeight.w500, color: sel ? Pc.primary : Lc.text)),
                ]),
              ),
            );
          },
        ),
      ),
      if (_sel != null) ...[
        const SizedBox(height: 8),
        LmsCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Feedback for ${_sel!['name']}', style: Lc.h2),
            Text([_sel!['designation'], _sel!['department']].where((x) => '${x ?? ''}'.isNotEmpty).join(' · '), style: Lc.small),
            const SizedBox(height: 16),
            const Text('CATEGORY', style: Lc.overline),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final c in _categories)
                ChoiceChip(
                  avatar: Icon(c.$3, size: 16, color: _category == c.$1 ? Colors.white : c.$4),
                  label: Text(c.$2),
                  selected: _category == c.$1,
                  onSelected: (_) => setState(() => _category = c.$1),
                  showCheckmark: false,
                  selectedColor: c.$4,
                  backgroundColor: c.$4.withValues(alpha: 0.06),
                  side: BorderSide(color: _category == c.$1 ? c.$4 : c.$4.withValues(alpha: 0.2)),
                  labelStyle: TextStyle(color: _category == c.$1 ? Colors.white : c.$4, fontWeight: FontWeight.w600, fontSize: 12.5),
                ),
            ]),
            const SizedBox(height: 16),
            const Text('RATING', style: Lc.overline),
            const SizedBox(height: 6),
            Row(children: [
              StarRating(value: _rating, size: 32, onChanged: (v) => setState(() => _rating = v)),
              const SizedBox(width: 8),
              if (_rating > 0)
                Expanded(
                  child: Text(Pc.scoreLabel(_rating),
                      maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontWeight: FontWeight.w700, color: Pc.score(_rating))),
                ),
            ]),
            const SizedBox(height: 16),
            const Text('VISIBILITY', style: Lc.overline),
            const SizedBox(height: 8),
            Segmented<String>(
              items: const [('private', 'Private'), ('team', 'Team'), ('public', 'Public')],
              value: _visibility,
              onChanged: (v) => setState(() => _visibility = v),
            ),
            const SizedBox(height: 6),
            Text(
              switch (_visibility) {
                'team' => 'Visible to the team',
                'public' => 'Visible to everyone in the company',
                _ => 'Only you and the employee can see this',
              },
              style: Lc.small,
            ),
            const SizedBox(height: 14),
            TextField(controller: _text, maxLines: 4, decoration: lmsInput('Write specific, actionable feedback…')),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: _saving ? null : _submit,
              style: pmsButton(),
              icon: _saving
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.send_rounded, size: 18),
              label: const Text('Send feedback'),
            ),
          ]),
        ),
        SectionHeader('Previous feedback', count: _history.length),
        if (_histLoading)
          const Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator(color: Pc.primary, strokeWidth: 2.5)))
        else if (_history.isEmpty)
          const Text('No feedback given yet.', style: Lc.small)
        else
          ..._history.map((h) {
            final (label, icon, color) = _cat('${h['category']}');
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: LmsCard(
                padding: const EdgeInsets.all(12),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Wrap(spacing: 6, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
                    Pill(label, color: color, icon: icon),
                    Pill(titleCase('${h['visibility'] ?? ''}'), color: Lc.muted, icon: Icons.visibility_outlined),
                    if (h['rating'] != null) StarRating(value: PmsService.n(h['rating']), size: 14),
                  ]),
                  const SizedBox(height: 8),
                  Text('${h['feedback_text'] ?? ''}', style: Lc.body.copyWith(color: Lc.text)),
                  const SizedBox(height: 6),
                  Text('${h['sender_name'] ?? ''} · ${fmtDateTime(h['created_at'])}', style: Lc.small),
                ]),
              ),
            );
          }),
      ],
    ]);
  }
}
