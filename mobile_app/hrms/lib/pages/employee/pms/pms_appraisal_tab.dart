import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../services/lms_service.dart' show Json;
import '../../../services/pms_service.dart';
import 'pms_widgets.dart';

/// Web `FeedbackProvided` (forms), `SelfAppraisal`/`PeerAppraisal`/`ManagerAppraisal`
/// (read-only views), `AppraisalHistory` and `ExtensionStatus`.
class PmsAppraisalTab extends StatefulWidget {
  const PmsAppraisalTab({super.key});

  @override
  State<PmsAppraisalTab> createState() => _PmsAppraisalTabState();
}

class _PmsAppraisalTabState extends State<PmsAppraisalTab> {
  String _seg = 'forms';
  bool _loading = true;
  String? _error;
  List<Json> _cycles = [], _targets = [], _exts = [], _history = [];
  Json? _active;
  final Map<String, List<Json>> _qs = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _cycles.isEmpty;
      _error = null;
    });
    final base = await Future.wait([PmsService.cycles(), PmsService.myExtensions(), PmsService.myEvaluations()]);
    if (!mounted) return;
    if (!base[0].success) {
      setState(() {
        _loading = false;
        _error = base[0].message;
      });
      return;
    }
    _cycles = base[0].data!;
    _exts = base[1].data ?? _exts;
    _history = base[2].data ?? _history;
    _active = _cycles.where((c) => c['status'] == 'active').firstOrNull;
    if (_active != null) {
      final id = PmsService.n(_active!['id']).toInt();
      final r = await Future.wait([
        PmsService.feedbackTargets(id).then((x) => x.data),
        for (final role in ['self', 'manager', 'peer']) PmsService.questions(id, role).then((x) => x.data),
      ]);
      _targets = PmsService.list((r[0] as Json?)?['targets']);
      _qs['self'] = (r[1] as List<Json>?) ?? const [];
      _qs['manager'] = (r[2] as List<Json>?) ?? const [];
      _qs['peer'] = (r[3] as List<Json>?) ?? const [];
    } else {
      _targets = [];
    }
    if (mounted) setState(() => _loading = false);
  }

  /// Base deadline per relation, pushed out by an approved extension for that deadline.
  DateTime? _deadline(String rel) {
    final c = _active;
    if (c == null) return null;
    final base = parseDt(rel == 'self'
        ? c['self_appraisal_deadline']
        : rel == 'manager'
            ? c['manager_eval_deadline']
            : (c['peer_deadline'] ?? c['self_appraisal_deadline']));
    if (base == null) return null;
    final ext = _extFor(base, 'approved');
    final extended = parseDt(ext?['extended_deadline']);
    return extended != null && extended.isAfter(base) ? extended : base;
  }

  DateTime? _baseDeadline(String rel) {
    final c = _active;
    if (c == null) return null;
    return parseDt(rel == 'self'
        ? c['self_appraisal_deadline']
        : rel == 'manager'
            ? c['manager_eval_deadline']
            : (c['peer_deadline'] ?? c['self_appraisal_deadline']));
  }

  Json? _extFor(DateTime base, String status) => _exts
      .where((e) =>
          e['status'] == status &&
          PmsService.n(e['cycle']) == PmsService.n(_active?['id']) &&
          (parseDt(e['original_deadline'])?.difference(base).inSeconds.abs() ?? 1 << 30) < 60)
      .firstOrNull;

  @override
  Widget build(BuildContext context) {
    final pending = _targets.where((t) => t['already_submitted'] != true).length;
    return Column(children: [
      Container(
        color: Lc.surface,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Segmented<String>(
          items: [('forms', pending > 0 ? 'Forms · $pending' : 'Forms'), ('history', 'History'), ('ext', 'Extensions')],
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
                : RefreshIndicator(
                    color: Pc.primary,
                    onRefresh: _load,
                    child: switch (_seg) {
                      'history' => _historyView(),
                      'ext' => _extView(),
                      _ => _formsView(),
                    },
                  ),
      ),
    ]);
  }

  // ============================================================== Forms
  Widget _formsView() {
    final c = _active;
    if (c == null) {
      return ListView(children: const [
        EmptyState(
          icon: Icons.event_busy_outlined,
          title: 'No active appraisal cycle',
          message: 'HR will open a review cycle during the appraisal period. Past results are under History.',
        ),
      ]);
    }
    final done = _targets.where((t) => t['already_submitted'] == true).length;
    return ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 28), children: [
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: const LinearGradient(colors: Pc.hero, begin: Alignment.topLeft, end: Alignment.bottomRight),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: const Color(0xFF5EEAD4).withValues(alpha: 0.18), borderRadius: BorderRadius.circular(6)),
              child: const Text('ACTIVE CYCLE', style: TextStyle(color: Color(0xFF5EEAD4), fontSize: 10.5, fontWeight: FontWeight.w800, letterSpacing: 0.8)),
            ),
            const Spacer(),
            Text('$done/${_targets.length} submitted', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12, fontWeight: FontWeight.w600)),
          ]),
          const SizedBox(height: 10),
          Text('${c['name']}', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text('${fmtDate(c['start_date'])} – ${fmtDate(c['end_date'])}', style: TextStyle(color: Colors.white.withValues(alpha: 0.65), fontSize: 12.5)),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: _targets.isEmpty ? 0 : done / _targets.length,
              minHeight: 6,
              backgroundColor: Colors.white.withValues(alpha: 0.15),
              valueColor: const AlwaysStoppedAnimation(Color(0xFF5EEAD4)),
            ),
          ),
        ]),
      ),
      SectionHeader('Reviews to complete', count: _targets.length),
      if (_targets.isEmpty)
        const EmptyState(
          icon: Icons.assignment_ind_outlined,
          title: 'No feedback assignments yet',
          message: 'HR hasn\'t assigned peer reviews and you have no reportees in this cycle.',
        )
      else
        ..._targets.map((t) => Padding(padding: const EdgeInsets.only(bottom: 10), child: _targetCard(t))),
    ]);
  }

  Widget _targetCard(Json t) {
    final rel = '${t['relation']}';
    final color = Pc.role(rel);
    final done = t['already_submitted'] == true;
    final qs = _qs[rel] ?? const [];
    final deadline = _deadline(rel);
    final base = _baseDeadline(rel);
    final passed = deadline != null && DateTime.now().isAfter(deadline);
    final pendingExt = base == null ? null : _extFor(base, 'pending');
    final approvedExt = base == null ? null : _extFor(base, 'approved');
    final label = switch (rel) { 'self' => 'Self appraisal', 'manager' => 'Manager review', _ => 'Peer review' };
    final sub = [t['designation'], t['department']].where((x) => '${x ?? ''}'.isNotEmpty).join(' · ');
    return LmsCard(
      padding: EdgeInsets.zero,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(height: 3, decoration: BoxDecoration(color: color, borderRadius: const BorderRadius.vertical(top: Radius.circular(Lc.r)))),
        Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              InitialsAvatar('${t['name']}', size: 42, initials: '${t['initials'] ?? ''}'.isEmpty ? null : '${t['initials']}'),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(rel == 'self' ? 'Yourself' : '${t['name']}', style: Lc.h3),
                  if (sub.isNotEmpty) Text(sub, style: Lc.small),
                ]),
              ),
              Pill(label, color: color),
            ]),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(color: Lc.bg, borderRadius: BorderRadius.circular(10)),
              child: Row(children: [
                const Icon(Icons.schedule_rounded, size: 16, color: Lc.muted),
                const SizedBox(width: 6),
                Expanded(child: Text(deadline == null ? 'No deadline' : 'Due ${fmtDateTime(deadline.toIso8601String())}', style: Lc.small)),
                if (!done) Countdown(deadline, style: const TextStyle(fontSize: 12)),
              ]),
            ),
            if (approvedExt != null) ...[
              const SizedBox(height: 6),
              Text('Extension approved until ${fmtDateTime(approvedExt['extended_deadline'])}',
                  style: const TextStyle(fontSize: 12, color: Lc.success, fontWeight: FontWeight.w600)),
            ],
            const SizedBox(height: 12),
            if (done)
              OutlinedButton.icon(
                onPressed: () => _showSubmitted(t, label),
                style: lmsSecondaryButton(height: 42).copyWith(foregroundColor: const WidgetStatePropertyAll(Lc.success)),
                icon: const Icon(Icons.check_circle_rounded, size: 18),
                label: const Text('Submitted · View responses'),
              )
            else
              FilledButton(
                onPressed: passed || qs.isEmpty ? null : () => _openForm(t, label),
                style: lmsPrimaryButton(height: 44, color: color),
                child: Text(passed ? 'Deadline passed' : qs.isEmpty ? 'No questions configured' : 'Start $label'),
              ),
            if (!done && pendingExt != null) ...[
              const SizedBox(height: 8),
              Text('Extension request pending until ${fmtDateTime(pendingExt['extended_deadline'])}',
                  textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: Lc.warning, fontWeight: FontWeight.w600)),
            ] else if (!done && !passed && deadline != null) ...[
              const SizedBox(height: 4),
              TextButton.icon(
                onPressed: () => _requestExtension(deadline),
                style: TextButton.styleFrom(foregroundColor: Lc.muted),
                icon: const Icon(Icons.more_time_rounded, size: 18),
                label: Text(approvedExt != null ? 'Request further extension' : 'Request extension'),
              ),
            ],
          ]),
        ),
      ]),
    );
  }

  Future<void> _openForm(Json t, String label) async {
    final rel = '${t['relation']}';
    final ok = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => _AppraisalFormPage(
          target: t,
          title: label,
          color: Pc.role(rel),
          questions: _qs[rel] ?? const [],
          cycleId: PmsService.n(_active!['id']).toInt(),
          deadline: _deadline(rel),
        ),
      ),
    );
    if (ok == true) _load();
  }

  void _showSubmitted(Json t, String label) {
    final answers = PmsService.list(t['submitted_answers']);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => LmsSheet(
        title: label,
        subtitle: t['relation'] == 'self' ? 'Your submitted responses' : 'Your responses for ${t['name']}',
        child: answers.isEmpty
            ? const Text('Responses are recorded.', style: Lc.small)
            : Column(children: [
                for (final a in answers)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(children: [
                      Expanded(child: Text('${a['question_text']}', style: const TextStyle(fontWeight: FontWeight.w600, color: Lc.text))),
                      const SizedBox(width: 8),
                      a['question_type'] == 'yes_no'
                          ? Pill(PmsService.n(a['rating_score']) == 1 ? 'Yes' : 'No', color: PmsService.n(a['rating_score']) == 1 ? Lc.success : Lc.danger)
                          : StarRating(value: PmsService.n(a['rating_score']), max: PmsService.n(a['max_score'] ?? 5).toInt().clamp(1, 10), size: 16),
                    ]),
                  ),
              ]),
      ),
    );
  }

  Future<void> _requestExtension(DateTime current) async {
    final c = _active!;
    final cycleEnd = DateTime.tryParse('${c['end_date']}T23:59:59') ?? current.add(const Duration(days: 30));
    final res = await showModalBottomSheet<(DateTime, String)>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ExtensionSheet(current: current, cycleEnd: cycleEnd, cycleName: '${c['name']}'),
    );
    if (res == null) return;
    final r = await PmsService.requestExtension(
      cycle: PmsService.n(c['id']).toInt(),
      original: current,
      extended: res.$1,
      reason: res.$2,
    );
    if (!mounted) return;
    lmsToast(context, r.success ? 'Extension request sent' : r.message ?? 'Failed to submit request', error: !r.success);
    if (r.success) _load();
  }

  // ============================================================ History
  Widget _historyView() {
    if (_history.isEmpty) {
      return ListView(children: const [
        EmptyState(icon: Icons.history_rounded, title: 'No appraisal history', message: 'Completed review cycles will be listed here.'),
      ]);
    }
    return ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 28), children: [
      for (final e in _history)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Builder(builder: (_) {
            final answers = PmsService.list(e['answers']);
            final byRole = <String, List<Json>>{};
            for (final a in answers) {
              byRole.putIfAbsent('${a['role_type']}', () => []).add(a);
            }
            final roles = ['self', 'manager', 'peer', 'hr'].where(byRole.containsKey).toList();
            final scores = {for (final r in roles) r: avg(byRole[r]!.map(norm5))};
            final overall = (e['final_rating'] as num?) ?? avg(scores.values);
            final status = '${e['status'] ?? ''}';
            return LmsCard(
              padding: EdgeInsets.zero,
              child: Theme(
                data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                child: ExpansionTile(
                  tilePadding: const EdgeInsets.fromLTRB(14, 6, 10, 6),
                  childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  shape: const Border(),
                  leading: ScoreRing(overall, size: 46, stroke: 4),
                  title: Text('${e['cycle_name'] ?? 'Cycle'}', style: Lc.h3),
                  subtitle: Row(children: [
                    if (status.isNotEmpty) Pill(titleCase(status), color: statusColor(status)),
                    const SizedBox(width: 6),
                    Flexible(child: Text(fmtDate(e['cycle_end'] ?? e['updated_at']), style: Lc.small)),
                  ]),
                  children: [
                    Row(children: [
                      for (final r in roles)
                        Expanded(
                          child: Container(
                            margin: const EdgeInsets.only(right: 6),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(color: Pc.role(r).withValues(alpha: 0.08), borderRadius: BorderRadius.circular(10)),
                            child: Column(children: [
                              Text(Pc.roleLabel(r), style: TextStyle(fontSize: 11, color: Pc.role(r), fontWeight: FontWeight.w700)),
                              Text(scores[r]?.toStringAsFixed(1) ?? '—', style: const TextStyle(fontWeight: FontWeight.w800, color: Lc.ink)),
                            ]),
                          ),
                        ),
                    ]),
                    const SizedBox(height: 10),
                    for (final a in answers)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(children: [
                          Container(width: 6, height: 6, decoration: BoxDecoration(color: Pc.role('${a['role_type']}'), shape: BoxShape.circle)),
                          const SizedBox(width: 8),
                          Expanded(child: Text('${a['question_text']}', style: const TextStyle(fontSize: 13, color: Lc.text))),
                          a['question_type'] == 'yes_no'
                              ? Text(PmsService.n(a['rating_score']) == 1 ? 'Yes' : 'No',
                                  style: TextStyle(fontWeight: FontWeight.w700, color: PmsService.n(a['rating_score']) == 1 ? Lc.success : Lc.danger))
                              : StarRating(value: norm5(a) ?? 0, size: 14),
                        ]),
                      ),
                  ],
                ),
              ),
            );
          }),
        ),
    ]);
  }

  // ========================================================= Extensions
  Widget _extView() {
    return Stack(children: [
      _exts.isEmpty
          ? ListView(children: const [
              EmptyState(
                icon: Icons.more_time_rounded,
                title: 'No extension requests',
                message: 'Need more time for an appraisal? Request a deadline extension for HR approval.',
              ),
            ])
          : ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 96), children: [
              for (final e in _exts)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: LmsCard(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Text('${e['cycle_name'] ?? 'Appraisal cycle'}', style: Lc.h3)),
                        Pill(titleCase('${e['status']}'), color: statusColor('${e['status']}')),
                      ]),
                      const SizedBox(height: 10),
                      Row(children: [
                        _dateCol('Original', fmtDateTime(e['original_deadline'])),
                        const Icon(Icons.arrow_forward_rounded, size: 16, color: Lc.faint),
                        const SizedBox(width: 10),
                        _dateCol('Requested', fmtDateTime(e['extended_deadline'])),
                      ]),
                      if ('${e['reason'] ?? ''}'.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Text('${e['reason']}', style: Lc.body.copyWith(color: Lc.text)),
                      ],
                    ]),
                  ),
                ),
            ]),
      if (_cycles.isNotEmpty)
        Positioned(
          right: 16,
          bottom: 20,
          child: FloatingActionButton.extended(
            heroTag: 'pms-ext',
            backgroundColor: Pc.primary,
            foregroundColor: Colors.white,
            elevation: 2,
            onPressed: _newExtensionAnyCycle,
            icon: const Icon(Icons.add_rounded),
            label: const Text('New request', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ),
    ]);
  }

  Widget _dateCol(String l, String v) => Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(l, style: const TextStyle(fontSize: 11, color: Lc.faint)),
          Text(v, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Lc.text)),
        ]),
      );

  /// Web `ExtensionStatus` flow: choose a cycle; original = its self-appraisal deadline.
  Future<void> _newExtensionAnyCycle() async {
    final cycle = await showModalBottomSheet<Json>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => LmsSheet(
        title: 'Choose appraisal cycle',
        child: Column(children: [
          for (final c in _cycles)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const IconTile(Icons.event_note_outlined),
              title: Text('${c['name']}', style: Lc.h3),
              subtitle: Text('Self-appraisal due ${fmtDateTime(c['self_appraisal_deadline'])}', style: Lc.small),
              trailing: c['status'] == 'active' ? const Pill('Active', color: Lc.success) : null,
              onTap: () => Navigator.pop(ctx, c),
            ),
        ]),
      ),
    );
    if (cycle == null || !mounted) return;
    final current = parseDt(cycle['self_appraisal_deadline']) ?? DateTime.now();
    final cycleEnd = DateTime.tryParse('${cycle['end_date']}T23:59:59') ?? current.add(const Duration(days: 30));
    final res = await showModalBottomSheet<(DateTime, String)>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ExtensionSheet(current: current, cycleEnd: cycleEnd, cycleName: '${cycle['name']}', requireReason: true),
    );
    if (res == null) return;
    final r = await PmsService.requestExtension(cycle: PmsService.n(cycle['id']).toInt(), original: current, extended: res.$1, reason: res.$2);
    if (!mounted) return;
    lmsToast(context, r.success ? 'Extension request sent' : r.message ?? 'Failed to submit request', error: !r.success);
    if (r.success) _load();
  }
}

// ============================================================================
// Appraisal form (full screen)
// ============================================================================
class _AppraisalFormPage extends StatefulWidget {
  const _AppraisalFormPage({
    required this.target,
    required this.title,
    required this.color,
    required this.questions,
    required this.cycleId,
    required this.deadline,
  });
  final Json target;
  final String title;
  final Color color;
  final List<Json> questions;
  final int cycleId;
  final DateTime? deadline;

  @override
  State<_AppraisalFormPage> createState() => _AppraisalFormPageState();
}

class _AppraisalFormPageState extends State<_AppraisalFormPage> {
  final Map<int, num> _ans = {};
  bool _saving = false;

  int get _answered => widget.questions.where((q) => _ans.containsKey(PmsService.n(q['id']).toInt())).length;

  Future<void> _submit() async {
    final missing = widget.questions.length - _answered;
    if (missing > 0) return lmsToast(context, 'Please answer all $missing remaining question(s)', error: true);
    setState(() => _saving = true);
    final r = await PmsService.submitAppraisal(
      target: PmsService.n(widget.target['id']).toInt(),
      cycle: widget.cycleId,
      role: '${widget.target['relation']}',
      answers: _ans,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (!r.success) return lmsToast(context, r.message ?? 'Failed to submit', error: true);
    HapticFeedback.mediumImpact();
    lmsToast(context, '${widget.title} submitted');
    Navigator.pop(context, true);
  }

  Future<bool> _confirmLeave() async =>
      _ans.isEmpty ||
      (await showDialog<bool>(
            context: context,
            builder: (c) => AlertDialog(
              title: const Text('Discard responses?'),
              content: const Text('Your answers haven\'t been submitted yet.'),
              actions: [
                TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Keep editing')),
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: Lc.danger),
                  onPressed: () => Navigator.pop(c, true),
                  child: const Text('Discard'),
                ),
              ],
            ),
          ) ??
          false);

  @override
  Widget build(BuildContext context) {
    final t = widget.target;
    final total = widget.questions.length;
    return PopScope(
      canPop: _ans.isEmpty,
      onPopInvokedWithResult: (didPop, _) async {
        if (!didPop && await _confirmLeave() && context.mounted) Navigator.pop(context);
      },
      child: Scaffold(
        backgroundColor: Lc.bg,
        appBar: AppBar(
          backgroundColor: Lc.surface,
          surfaceTintColor: Colors.transparent,
          foregroundColor: Lc.ink,
          elevation: 0,
          titleSpacing: 0,
          title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(widget.title.toUpperCase(), style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Lc.faint, letterSpacing: 1.2)),
            Text(t['relation'] == 'self' ? 'Rate yourself' : '${t['name']}',
                maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: Lc.ink)),
          ]),
          actions: [
            if (widget.deadline != null) Padding(padding: const EdgeInsets.only(right: 14), child: Center(child: Countdown(widget.deadline))),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(3),
            child: ProgressLine(total == 0 ? 0 : _answered * 100 / total, height: 3, color: widget.color),
          ),
        ),
        body: ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          itemCount: total,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (_, i) => _question(i, widget.questions[i]),
        ),
        bottomNavigationBar: SafeArea(
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
            decoration: const BoxDecoration(color: Lc.surface, border: Border(top: BorderSide(color: Lc.line))),
            child: Row(children: [
              Text('$_answered of $total answered', style: Lc.small),
              const Spacer(),
              FilledButton(
                onPressed: _saving ? null : _submit,
                style: lmsPrimaryButton(height: 46, color: widget.color).copyWith(
                  minimumSize: const WidgetStatePropertyAll(Size(150, 46)),
                ),
                child: _saving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Submit'),
              ),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _question(int i, Json q) {
    final id = PmsService.n(q['id']).toInt();
    final max = PmsService.n(q['max_score'] ?? 5).toInt().clamp(1, 10);
    final v = _ans[id];
    return LmsCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 24,
            height: 24,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: v != null ? widget.color : Lc.bg, shape: BoxShape.circle),
            child: v != null
                ? const Icon(Icons.check_rounded, size: 15, color: Colors.white)
                : Text('${i + 1}', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Lc.muted)),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text('${q['question_text']}', style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: Lc.text, height: 1.35))),
        ]),
        const SizedBox(height: 14),
        if (q['question_type'] == 'yes_no')
          Row(children: [
            for (final o in const [(1, 'Yes', Icons.thumb_up_alt_outlined, Lc.success), (0, 'No', Icons.thumb_down_alt_outlined, Lc.danger)])
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: o.$1 == 1 ? 8 : 0),
                  child: OutlinedButton.icon(
                    onPressed: () => setState(() => _ans[id] = o.$1),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(44),
                      backgroundColor: v == o.$1 ? o.$4 : Lc.surface,
                      foregroundColor: v == o.$1 ? Colors.white : o.$4,
                      side: BorderSide(color: v == o.$1 ? o.$4 : Lc.line),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: Icon(o.$3, size: 18),
                    label: Text(o.$2, style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ),
          ])
        else ...[
          Row(children: [
            Flexible(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: StarRating(value: v ?? 0, max: max, size: max > 5 ? 26 : 34, onChanged: (s) => setState(() => _ans[id] = s)),
              ),
            ),
            const SizedBox(width: 8),
            Text(v == null ? 'Not rated' : '$v / $max',
                style: TextStyle(fontWeight: FontWeight.w700, color: v == null ? Lc.faint : widget.color, fontSize: 13)),
          ]),
        ],
      ]),
    );
  }
}

// ============================================================================
// Extension request
// ============================================================================
class _ExtensionSheet extends StatefulWidget {
  const _ExtensionSheet({required this.current, required this.cycleEnd, required this.cycleName, this.requireReason = false});
  final DateTime current, cycleEnd;
  final String cycleName;
  final bool requireReason;

  @override
  State<_ExtensionSheet> createState() => _ExtensionSheetState();
}

class _ExtensionSheetState extends State<_ExtensionSheet> {
  late DateTime _when = widget.current.add(const Duration(days: 1)).isAfter(widget.cycleEnd)
      ? widget.cycleEnd
      : widget.current.add(const Duration(days: 1));
  final _reason = TextEditingController();

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
    final theme = Theme.of(context).copyWith(colorScheme: Theme.of(context).colorScheme.copyWith(primary: Pc.primary));
    final d = await showDatePicker(
      context: context,
      initialDate: _when,
      firstDate: widget.current.isAfter(DateTime.now()) ? widget.current : DateTime.now(),
      lastDate: widget.cycleEnd,
      builder: (_, c) => Theme(data: theme, child: c!),
    );
    if (d == null || !mounted) return;
    final t = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_when),
      builder: (_, c) => Theme(data: theme, child: c!),
    );
    if (!mounted) return;
    setState(() => _when = DateTime(d.year, d.month, d.day, t?.hour ?? 23, t?.minute ?? 59));
  }

  @override
  Widget build(BuildContext context) => LmsSheet(
        title: 'Request deadline extension',
        subtitle: widget.cycleName,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Lc.bg, borderRadius: BorderRadius.circular(12)),
            child: Row(children: [
              const Icon(Icons.event_outlined, size: 18, color: Lc.muted),
              const SizedBox(width: 8),
              const Text('Current deadline', style: Lc.small),
              const Spacer(),
              Text(fmtDateTime(widget.current.toIso8601String()), style: const TextStyle(fontWeight: FontWeight.w700, color: Lc.text, fontSize: 12.5)),
            ]),
          ),
          const SizedBox(height: 12),
          InkWell(
            onTap: _pick,
            borderRadius: BorderRadius.circular(12),
            child: InputDecorator(
              decoration: lmsInput('Requested new deadline', icon: Icons.more_time_rounded),
              child: Text(fmtDateTime(_when.toIso8601String()), style: const TextStyle(fontWeight: FontWeight.w700, color: Lc.ink)),
            ),
          ),
          const SizedBox(height: 4),
          Text('Must be after the current deadline and on or before ${fmtDate(widget.cycleEnd.toIso8601String())}.', style: Lc.small),
          const SizedBox(height: 12),
          TextField(controller: _reason, maxLines: 3, decoration: lmsInput(widget.requireReason ? 'Reason' : 'Reason (optional)')),
          const SizedBox(height: 18),
          FilledButton(
            style: pmsButton(),
            onPressed: () {
              if (!_when.isAfter(widget.current)) {
                return lmsToast(context, 'Requested deadline must be after the current deadline', error: true);
              }
              if (_when.isAfter(widget.cycleEnd)) {
                return lmsToast(context, 'Requested deadline cannot exceed the cycle end date', error: true);
              }
              if (widget.requireReason && _reason.text.trim().isEmpty) {
                return lmsToast(context, 'Please enter a reason', error: true);
              }
              Navigator.pop(context, (_when, _reason.text.trim()));
            },
            child: const Text('Send request'),
          ),
        ]),
      );
}
