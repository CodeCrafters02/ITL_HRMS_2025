import 'package:flutter/material.dart';

import '../../../services/lms_service.dart' show Json;
import '../../../services/pms_service.dart';
import 'pms_widgets.dart';

/// Web `KRAs`, `SelfMapKRAs` and `KRAReview` pages.
class PmsGoalsTab extends StatefulWidget {
  const PmsGoalsTab({super.key});

  @override
  State<PmsGoalsTab> createState() => _PmsGoalsTabState();
}

class _PmsGoalsTabState extends State<PmsGoalsTab> {
  String _seg = 'mine';
  bool _loading = true;
  String? _error;
  int? _me;
  List<Json> _kras = [], _kpis = [], _evals = [], _masters = [], _review = [];
  String _reviewFilter = 'all';
  String _search = '';
  int? _busy;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _kras.isEmpty && _masters.isEmpty;
      _error = null;
    });
    _me = await PmsService.myEmployeeId();
    final r = await Future.wait([
      PmsService.myKras(),
      PmsService.kpis(),
      PmsService.kraEvaluations(),
      PmsService.kraMasters(),
      PmsService.krasToReview(),
    ]);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (!r[0].success) _error = r[0].message;
      _kras = r[0].data ?? _kras;
      _kpis = r[1].data ?? _kpis;
      _evals = r[2].data ?? _evals;
      _masters = r[3].data ?? _masters;
      _review = r[4].data ?? _review;
    });
  }

  Json? _evalFor(Json k) {
    if (k['evaluation'] is Map) return (k['evaluation'] as Map).cast<String, dynamic>();
    return _evals.where((e) => PmsService.n(e['employee_kra']) == PmsService.n(k['id'])).firstOrNull;
  }

  num get _usedWeight => _kras.fold<num>(0, (s, k) => s + PmsService.n(k['weightage']));

  double? get _weightedScore {
    final ev = _kras.where((k) => _evalFor(k) != null).toList();
    if (ev.isEmpty) return null;
    final w = ev.fold<num>(0, (s, k) => s + PmsService.n(k['weightage']));
    if (w == 0) return avg(ev.map((k) => PmsService.n(_evalFor(k)!['score'])))!;
    return ev.fold<num>(0, (s, k) => s + PmsService.n(_evalFor(k)!['score']) * PmsService.n(k['weightage'])) / w;
  }

  @override
  Widget build(BuildContext context) {
    final pendingReview = _review.where((k) => k['evaluation'] == null).length;
    return Column(
      children: [
        Container(
          color: Lc.bar,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Segmented<String>(
            items: [
              ('mine', 'My KRAs'),
              ('map', 'Map KRAs'),
              ('review', pendingReview > 0 ? 'Review · $pendingReview' : 'Review'),
            ],
            value: _seg,
            onChanged: (v) => setState(() => _seg = v),
          ),
        ),
        const Divider(height: 1, color: Lc.line),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: Pc.primary, strokeWidth: 2.5))
              : _error != null && _kras.isEmpty
              ? SingleChildScrollView(
                  child: ErrorRetry(message: _error!, onRetry: _load),
                )
              : RefreshIndicator(
                  color: Pc.primary,
                  onRefresh: _load,
                  child: switch (_seg) {
                    'map' => _mapView(),
                    'review' => _reviewView(),
                    _ => _mineView(),
                  },
                ),
        ),
      ],
    );
  }

  // ============================================================ My KRAs
  Widget _mineView() {
    final evaluated = _kras.where((k) => _evalFor(k) != null).length;
    final score = _weightedScore;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
      children: [
        LmsCard(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
          child: Row(
            children: [
              _metric('${_kras.length}', 'KRAs'),
              _vline(),
              _metric('$_usedWeight%', 'Weightage', color: _usedWeight == 100 ? Lc.success : Lc.warning),
              _vline(),
              _metric('$evaluated/${_kras.length}', 'Evaluated'),
              _vline(),
              _metric(score == null ? '—' : score.toStringAsFixed(1), 'Score', color: Pc.score(score)),
            ],
          ),
        ),
        if (_kras.isEmpty)
          EmptyState(
            icon: Icons.track_changes_outlined,
            title: 'No KRAs yet',
            message: 'Pick KRAs from the catalogue and set your targets.',
            action: SizedBox(
              width: 200,
              child: FilledButton(
                onPressed: () => setState(() => _seg = 'map'),
                style: pmsButton(height: 44),
                child: const Text('Map KRAs'),
              ),
            ),
          )
        else ...[
          const SectionHeader('Key result areas'),
          ..._kras.map((k) => Padding(padding: const EdgeInsets.only(bottom: 10), child: _kraCard(k))),
        ],
      ],
    );
  }

  Widget _metric(String v, String l, {Color color = Lc.ink}) => Expanded(
    child: Column(
      children: [
        Text(
          v,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color),
        ),
        const SizedBox(height: 2),
        Text(l, style: Lc.small),
      ],
    ),
  );

  Widget _vline() => Container(width: 1, height: 32, color: Lc.line);

  Widget _kraCard(Json k) {
    final ev = _evalFor(k);
    final w = PmsService.n(k['weightage']);
    final kpis = _kpis
        .where((p) => p['kra_master'] != null && PmsService.n(p['kra_master']) == PmsService.n(k['kra_master']))
        .toList();
    final isReviewer = k['reviewer'] != null && PmsService.n(k['reviewer']).toInt() == _me;
    final score = ev == null ? null : PmsService.n(ev['score']);
    return LmsCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SizedBox(
                width: 46,
                height: 46,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CircularProgressIndicator(
                      value: (w / 100).clamp(0, 1).toDouble(),
                      strokeWidth: 4,
                      backgroundColor: Lc.line,
                      color: Pc.primary,
                    ),
                    Center(
                      child: Text(
                        '$w%',
                        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Lc.ink),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${k['kra_title'] ?? 'KRA'}', style: Lc.h3),
                    const SizedBox(height: 2),
                    Text('Reviewer: ${k['reviewer_name'] ?? 'Not assigned'}', style: Lc.small),
                  ],
                ),
              ),
              if (score != null)
                Column(
                  children: [
                    Text(
                      score.toStringAsFixed(1),
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Pc.score(score)),
                    ),
                    const Text('/ 5', style: Lc.small),
                  ],
                )
              else
                const Pill('Pending', color: Lc.warning),
            ],
          ),
          if ('${k['target_description'] ?? ''}'.isNotEmpty || '${k['kra_description'] ?? ''}'.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Lc.bg, borderRadius: BorderRadius.circular(10)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if ('${k['target_description'] ?? ''}'.isNotEmpty) ...[
                    const Text('TARGET', style: Lc.overline),
                    const SizedBox(height: 2),
                    Text('${k['target_description']}', style: const TextStyle(fontSize: 13, color: Lc.text)),
                  ],
                  if ('${k['kra_description'] ?? ''}'.isNotEmpty) ...[
                    if ('${k['target_description'] ?? ''}'.isNotEmpty) const SizedBox(height: 8),
                    Text('${k['kra_description']}', style: Lc.small),
                  ],
                ],
              ),
            ),
          ],
          if (kpis.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text('LINKED KPIs', style: Lc.overline),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final p in kpis)
                  Pill(
                    '${p['name']}${'${p['target_value'] ?? ''}'.isNotEmpty ? ' · ${p['target_value']}${p['measurement_unit'] ?? ''}' : ''}',
                    color: Pc.rolePeer,
                    icon: Icons.speed_rounded,
                  ),
              ],
            ),
          ],
          if (ev != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                StarRating(value: score!, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    Pc.scoreLabel(score),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Pc.score(score)),
                  ),
                ),
                Text(fmtDate(ev['evaluated_at']), style: Lc.small),
              ],
            ),
            if ('${ev['remarks'] ?? ''}'.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text('"${ev['remarks']}"', style: Lc.body.copyWith(fontStyle: FontStyle.italic)),
            ],
          ] else if (isReviewer) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => _evaluate(k, onDone: _load),
              style: lmsSecondaryButton(height: 42).copyWith(foregroundColor: const WidgetStatePropertyAll(Pc.primary)),
              icon: const Icon(Icons.rate_review_outlined, size: 18),
              label: const Text('Evaluate this KRA'),
            ),
          ],
        ],
      ),
    );
  }

  // =========================================================== Map KRAs
  Widget _mapView() {
    final remaining = 100 - _usedWeight;
    final mappedIds = _kras.map((k) => PmsService.n(k['kra_master'])).toSet();
    final catalogue = _masters
        .where((m) => m['status'] == 'active' && '${m['title']}'.toLowerCase().contains(_search.toLowerCase()))
        .toList();
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
      children: [
        LmsCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(child: Text('Weightage allocated', style: Lc.h3)),
                  Text(
                    '$_usedWeight% / 100%',
                    style: TextStyle(fontWeight: FontWeight.w800, color: remaining < 0 ? Lc.danger : Lc.ink),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ProgressLine(_usedWeight.toDouble(), height: 8, color: remaining < 0 ? Lc.danger : Pc.primary),
              const SizedBox(height: 8),
              Text(
                remaining >= 0 ? '$remaining% remaining to allocate' : 'Over-allocated by ${-remaining}%',
                style: TextStyle(
                  fontSize: 12,
                  color: remaining < 0 ? Lc.danger : Lc.muted,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        SectionHeader('My mapped KRAs', count: _kras.length),
        if (_kras.isEmpty)
          const Padding(
            padding: EdgeInsets.only(bottom: 4),
            child: Text('Nothing mapped yet — add from the catalogue below.', style: Lc.small),
          )
        else
          ..._kras.map(
            (k) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: LmsCard(
                padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
                child: Row(
                  children: [
                    const IconTile(Icons.flag_outlined),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${k['kra_title']}', style: Lc.h3),
                          Text(
                            '${PmsService.n(k['weightage'])}% weight${'${k['target_description'] ?? ''}'.isNotEmpty ? ' · ${k['target_description']}' : ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Lc.small,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Remove',
                      onPressed: _busy == PmsService.n(k['id']).toInt() ? null : () => _unmap(k),
                      icon: _busy == PmsService.n(k['id']).toInt()
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.delete_outline_rounded, color: Lc.danger),
                    ),
                  ],
                ),
              ),
            ),
          ),
        const SectionHeader('KRA catalogue'),
        TextField(
          onChanged: (v) => setState(() => _search = v),
          decoration: InputDecoration(
            hintText: 'Search KRAs',
            hintStyle: const TextStyle(color: Lc.faint),
            prefixIcon: const Icon(Icons.search_rounded, color: Lc.faint),
            filled: true,
            fillColor: Lc.surface,
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Lc.line),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Lc.line),
            ),
          ),
        ),
        const SizedBox(height: 10),
        if (catalogue.isEmpty)
          const EmptyState(
            icon: Icons.search_off_rounded,
            title: 'No KRAs found',
            message: 'Try a different search term.',
          )
        else
          ...catalogue.map((m) {
            final mapped = mappedIds.contains(PmsService.n(m['id']));
            final depts = ((m['department_names'] as List?) ?? const []).join(', ');
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: LmsCard(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${m['title']}', style: Lc.h3),
                          if ('${m['description'] ?? ''}'.isNotEmpty)
                            Text('${m['description']}', maxLines: 2, overflow: TextOverflow.ellipsis, style: Lc.small),
                          if (depts.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(depts, style: const TextStyle(fontSize: 11, color: Lc.faint)),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    mapped
                        ? const Pill('Mapped', color: Lc.success, icon: Icons.check_rounded)
                        : FilledButton(
                            onPressed: remaining <= 0 ? null : () => _map(m, remaining),
                            style: pmsButton(height: 36).copyWith(
                              minimumSize: const WidgetStatePropertyAll(Size(0, 36)),
                              padding: const WidgetStatePropertyAll(EdgeInsets.symmetric(horizontal: 14)),
                            ),
                            child: const Text('Add', style: TextStyle(fontSize: 13)),
                          ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Future<void> _map(Json m, num remaining) async {
    final weight = TextEditingController();
    final target = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => LmsSheet(
        title: 'Add KRA',
        subtitle: '${m['title']}',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: weight,
              keyboardType: TextInputType.number,
              decoration: lmsInput('Weightage % (max $remaining%)', icon: Icons.percent_rounded),
            ),
            const SizedBox(height: 12),
            TextField(controller: target, maxLines: 3, decoration: lmsInput('Target / success criteria')),
            const SizedBox(height: 18),
            FilledButton(
              style: pmsButton(),
              onPressed: () {
                final w = int.tryParse(weight.text.trim()) ?? 0;
                if (w <= 0 || w > remaining) {
                  lmsToast(ctx, 'Enter a weightage between 1 and $remaining', error: true);
                  return;
                }
                Navigator.pop(ctx, true);
              },
              child: const Text('Add to my KRAs'),
            ),
          ],
        ),
      ),
    );
    final w = int.tryParse(weight.text.trim()) ?? 0;
    final t = target.text.trim();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      weight.dispose();
      target.dispose();
    });
    if (ok != true) return;
    final r = await PmsService.mapKra(masterId: PmsService.n(m['id']).toInt(), weightage: w, target: t);
    if (!mounted) return;
    lmsToast(context, r.success ? 'KRA added' : r.message ?? 'Failed to add KRA', error: !r.success);
    if (r.success) _load();
  }

  Future<void> _unmap(Json k) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Remove KRA?'),
        content: Text('"${k['kra_title']}" will be removed from your KRAs.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Lc.danger),
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (yes != true) return;
    final id = PmsService.n(k['id']).toInt();
    setState(() => _busy = id);
    final r = await PmsService.unmapKra(id);
    if (!mounted) return;
    setState(() => _busy = null);
    lmsToast(context, r.success ? 'KRA removed' : r.message ?? 'Failed to remove KRA', error: !r.success);
    if (r.success) _load();
  }

  // ============================================================= Review
  Widget _reviewView() {
    final list = _review.where(
      (k) => _reviewFilter == 'all' || (_reviewFilter == 'pending' ? k['evaluation'] == null : k['evaluation'] != null),
    );
    final grouped = <int, List<Json>>{};
    for (final k in list) {
      grouped.putIfAbsent(PmsService.n(k['employee']).toInt(), () => []).add(k);
    }
    final pending = _review.where((k) => k['evaluation'] == null).length;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _filterChip('all', 'All · ${_review.length}'),
              _filterChip('pending', 'Pending · $pending'),
              _filterChip('reviewed', 'Reviewed · ${_review.length - pending}'),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (_review.isEmpty)
          const EmptyState(
            icon: Icons.rate_review_outlined,
            title: 'Nothing to review',
            message: 'KRAs where you are assigned as reviewer will appear here.',
          )
        else if (grouped.isEmpty)
          const EmptyState(
            icon: Icons.filter_alt_off_outlined,
            title: 'No KRAs here',
            message: 'Try a different filter.',
          )
        else
          for (final g in grouped.values)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: LmsCard(
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          InitialsAvatar('${g.first['employee_name']}', size: 40),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${g.first['employee_name']}', style: Lc.h3),
                                Text(
                                  [
                                    g.first['employee_designation'],
                                    g.first['employee_department'],
                                  ].where((x) => '${x ?? ''}'.isNotEmpty).join(' · '),
                                  style: Lc.small,
                                ),
                              ],
                            ),
                          ),
                          Pill('${g.where((k) => k['evaluation'] == null).length} pending', color: Lc.warning),
                        ],
                      ),
                    ),
                    for (final k in g) ...[const Divider(height: 1, color: Lc.line), _reviewRow(k)],
                  ],
                ),
              ),
            ),
      ],
    );
  }

  Widget _filterChip(String v, String label) => Padding(
    padding: const EdgeInsets.only(right: 8),
    child: ChoiceChip(
      label: Text(label),
      selected: _reviewFilter == v,
      onSelected: (_) => setState(() => _reviewFilter = v),
      showCheckmark: false,
      selectedColor: Lc.ink,
      backgroundColor: Lc.surface,
      side: BorderSide(color: _reviewFilter == v ? Lc.ink : Lc.line),
      labelStyle: TextStyle(
        color: _reviewFilter == v ? Colors.white : Lc.text,
        fontWeight: FontWeight.w600,
        fontSize: 12.5,
      ),
    ),
  );

  Widget _reviewRow(Json k) {
    final ev = k['evaluation'] is Map ? (k['evaluation'] as Map).cast<String, dynamic>() : null;
    final s = ev == null ? null : PmsService.n(ev['score']);
    return InkWell(
      onTap: ev == null ? () => _evaluate(k, onDone: _load) : null,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${k['kra_title']}',
                    style: const TextStyle(fontWeight: FontWeight.w600, color: Lc.text),
                  ),
                  Text(
                    '${PmsService.n(k['weightage'])}% weight${'${k['target_description'] ?? ''}'.isNotEmpty ? ' · ${k['target_description']}' : ''}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Lc.small,
                  ),
                  if (ev != null && '${ev['remarks'] ?? ''}'.isNotEmpty)
                    Text('"${ev['remarks']}"', style: Lc.small.copyWith(fontStyle: FontStyle.italic)),
                ],
              ),
            ),
            if (s != null)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  StarRating(value: s, size: 14),
                  const SizedBox(width: 6),
                  Text(
                    s.toStringAsFixed(1),
                    style: TextStyle(fontWeight: FontWeight.w800, color: Pc.score(s)),
                  ),
                ],
              )
            else
              const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Evaluate',
                    style: TextStyle(color: Pc.primary, fontWeight: FontWeight.w700),
                  ),
                  Icon(Icons.chevron_right_rounded, color: Pc.primary),
                ],
              ),
          ],
        ),
      ),
    );
  }

  /// Score 0–5 (0.5 steps) + remarks — same validation as web KRAReview.
  Future<void> _evaluate(Json k, {required VoidCallback onDone}) async {
    final res = await showModalBottomSheet<(double, String)>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _EvaluateSheet(kra: k),
    );
    if (res == null) return;
    final r = await PmsService.evaluateKra(PmsService.n(k['id']).toInt(), res.$1, res.$2);
    if (!mounted) return;
    lmsToast(context, r.success ? 'Evaluation submitted' : r.message ?? 'Failed to submit', error: !r.success);
    if (r.success) onDone();
  }
}

class _EvaluateSheet extends StatefulWidget {
  const _EvaluateSheet({required this.kra});
  final Json kra;

  @override
  State<_EvaluateSheet> createState() => _EvaluateSheetState();
}

class _EvaluateSheetState extends State<_EvaluateSheet> {
  double _score = 3;
  final _remarks = TextEditingController();

  @override
  void dispose() {
    _remarks.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final k = widget.kra;
    return LmsSheet(
      title: 'Evaluate KRA',
      subtitle: '${k['kra_title']}${k['employee_name'] != null ? ' · ${k['employee_name']}' : ''}',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Lc.bg, borderRadius: BorderRadius.circular(14)),
            child: Column(
              children: [
                Text(
                  _score.toStringAsFixed(1),
                  style: TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: Pc.score(_score)),
                ),
                Text(
                  Pc.scoreLabel(_score),
                  style: TextStyle(fontWeight: FontWeight.w700, color: Pc.score(_score)),
                ),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    activeTrackColor: Pc.score(_score),
                    thumbColor: Pc.score(_score),
                    inactiveTrackColor: Lc.line,
                  ),
                  child: Slider(
                    value: _score,
                    min: 0,
                    max: 5,
                    divisions: 10,
                    label: _score.toStringAsFixed(1),
                    onChanged: (v) => setState(() => _score = v),
                  ),
                ),
                const Row(
                  children: [
                    Text('0', style: Lc.small),
                    Spacer(),
                    Text('5', style: Lc.small),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          TextField(controller: _remarks, maxLines: 3, decoration: lmsInput('Remarks (optional)')),
          const SizedBox(height: 18),
          FilledButton(
            style: pmsButton(),
            onPressed: () => Navigator.pop(context, (_score, _remarks.text.trim())),
            child: const Text('Submit evaluation'),
          ),
        ],
      ),
    );
  }
}
