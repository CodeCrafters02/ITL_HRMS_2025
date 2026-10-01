import 'package:flutter/material.dart';

import '../../services/employee_service.dart';
import '../../theme/app_stitch_theme.dart';

class PerformancePage extends StatefulWidget {
  const PerformancePage({super.key});

  @override
  State<PerformancePage> createState() => _PerformancePageState();
}

class _PerformancePageState extends State<PerformancePage> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 5, vsync: this);
  bool _loading = true;
  String? _error;
  Map<String, dynamic> _data = const {};

  static const _grad = [Color(0xFF10B981), Color(0xFF0D9488)];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final res = await EmployeeService.getMyPerformanceDashboard();
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (res.success && res.data != null) {
        _data = res.data!;
      } else {
        _error = res.message ?? 'Failed to load performance';
      }
    });
  }

  Map<String, dynamic> get _summary => (_data['summary'] as Map?)?.cast<String, dynamic>() ?? const {};
  Map<String, dynamic> get _nineBox => (_data['nine_box'] as Map?)?.cast<String, dynamic>() ?? const {};
  List<Map<String, dynamic>> _list(String k) =>
      ((_data[k] as List?) ?? const []).whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppStitchTheme.lightScaffold,
      appBar: AppBar(
        title: const Text('Performance Management'),
        backgroundColor: _grad.first,
        foregroundColor: Colors.white,
        bottom: _loading || _error != null
            ? null
            : TabBar(
                controller: _tabs,
                isScrollable: true,
                indicatorColor: Colors.white,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white70,
                tabs: const [
                  Tab(text: 'Overview'),
                  Tab(text: 'KRAs'),
                  Tab(text: 'Skills'),
                  Tab(text: 'Appraisals'),
                  Tab(text: 'Feedback'),
                ],
              ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _errorView()
              : TabBarView(
                  controller: _tabs,
                  children: [
                    _overviewTab(),
                    _krasTab(),
                    _skillsTab(),
                    _appraisalsTab(),
                    _feedbackTab(),
                  ],
                ),
    );
  }

  Widget _errorView() => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, size: 48, color: Colors.redAccent),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppStitchTheme.lightOnSurfaceMuted)),
              const SizedBox(height: 16),
              FilledButton(onPressed: _load, child: const Text('Retry')),
            ],
          ),
        ),
      );

  // ---------- Overview ----------
  Widget _overviewTab() {
    final s = _summary;
    final nb = _nineBox;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _nineBoxCard(nb, s),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: [
              _statTile('KRAs', '${s['kras_count'] ?? 0}', Icons.flag_rounded, const Color(0xFF4338CA)),
              _statTile('Total Weightage', '${s['total_kra_weightage'] ?? 0}%', Icons.pie_chart_rounded, const Color(0xFF0369A1)),
              _statTile('Skills', '${s['skills_count'] ?? 0}', Icons.psychology_rounded, const Color(0xFF0F766E)),
              _statTile('Feedback In', '${s['feedbacks_received_count'] ?? 0}', Icons.inbox_rounded, const Color(0xFFB45309)),
            ],
          ),
          const SizedBox(height: 16),
          _sectionCard(
            'Active Appraisal',
            Icons.assignment_turned_in_rounded,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${s['active_appraisal_cycle'] ?? 'No active cycle'}',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppStitchTheme.lightOnSurface),
                ),
                const SizedBox(height: 4),
                _statusChip('${s['active_appraisal_status'] ?? 'No active cycle'}'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _nineBoxCard(Map<String, dynamic> nb, Map<String, dynamic> s) {
    final title = '${nb['box_title'] ?? s['box_title'] ?? '—'}';
    final perf = '${nb['performance_label'] ?? s['performance_label'] ?? '—'}';
    final pot = '${nb['potential_label'] ?? s['potential_label'] ?? '—'}';
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: _grad),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: _grad.first.withValues(alpha: 0.25), blurRadius: 16, offset: const Offset(0, 8))],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('9-BOX POSITION', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2)),
          const SizedBox(height: 6),
          Text(title, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: _miniMetric('Performance', perf)),
              Container(width: 1, height: 34, color: Colors.white24),
              Expanded(child: _miniMetric('Potential', pot)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _miniMetric(String label, String value) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800)),
        ],
      );

  Widget _statTile(String label, String value, IconData icon, Color color) => Container(
        decoration: BoxDecoration(
          color: AppStitchTheme.lightSurfaceElevated,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.6)),
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: color, size: 22),
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: color)),
            Text(label, style: const TextStyle(fontSize: 12, color: AppStitchTheme.lightOnSurfaceMuted, fontWeight: FontWeight.w600)),
          ],
        ),
      );

  // ---------- KRAs ----------
  Widget _krasTab() {
    final items = _list('kras');
    if (items.isEmpty) return _empty('No KRAs assigned yet.');
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) {
          final k = items[i];
          return _sectionCard(
            '${k['kra_name'] ?? 'KRA'}',
            Icons.flag_rounded,
            trailing: _pill('${k['weightage'] ?? 0}%', const Color(0xFF4338CA)),
            child: Text(
              '${k['target_description'] ?? 'No target description.'}',
              style: const TextStyle(color: AppStitchTheme.lightOnSurfaceMuted, fontSize: 13, height: 1.4),
            ),
          );
        },
      ),
    );
  }

  // ---------- Skills ----------
  Widget _skillsTab() {
    final items = _list('skills');
    if (items.isEmpty) return _empty('No skills recorded yet.');
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) {
          final s = items[i];
          final approved = '${s['approval_status']}'.toLowerCase() == 'approved';
          return Container(
            decoration: BoxDecoration(
              color: AppStitchTheme.lightSurfaceElevated,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.6)),
            ),
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                const Icon(Icons.psychology_rounded, color: Color(0xFF0F766E)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${s['skill_name'] ?? 'Skill'}', style: const TextStyle(fontWeight: FontWeight.w800, color: AppStitchTheme.lightOnSurface)),
                      Text('${s['category'] ?? ''} · ${s['proficiency_level'] ?? ''}', style: const TextStyle(fontSize: 12, color: AppStitchTheme.lightOnSurfaceMuted)),
                    ],
                  ),
                ),
                _pill(approved ? 'Approved' : '${s['approval_status'] ?? 'Pending'}', approved ? const Color(0xFF0F766E) : const Color(0xFFB45309)),
              ],
            ),
          );
        },
      ),
    );
  }

  // ---------- Appraisals ----------
  Widget _appraisalsTab() {
    final items = _list('evaluations');
    if (items.isEmpty) return _empty('No appraisal evaluations yet.');
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) {
          final e = items[i];
          return _sectionCard(
            '${e['cycle_name'] ?? 'Cycle'}',
            Icons.assignment_turned_in_rounded,
            trailing: _statusChip('${e['status'] ?? ''}'),
            child: Column(
              children: [
                _ratingRow('Self', e['self_rating']),
                _ratingRow('Manager', e['manager_rating']),
                _ratingRow('Final', e['final_rating']),
                if (e['self_appraisal_deadline'] != null) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.schedule_rounded, size: 14, color: AppStitchTheme.lightOnSurfaceMuted),
                      const SizedBox(width: 6),
                      Text('Deadline: ${e['self_appraisal_deadline']}', style: const TextStyle(fontSize: 12, color: AppStitchTheme.lightOnSurfaceMuted)),
                    ],
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _ratingRow(String label, dynamic value) {
    final v = value == null ? null : (value as num).toDouble();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          SizedBox(width: 70, child: Text(label, style: const TextStyle(fontSize: 13, color: AppStitchTheme.lightOnSurfaceMuted))),
          Expanded(
            child: LinearProgressIndicator(
              value: v == null ? 0 : (v / 5).clamp(0, 1),
              minHeight: 7,
              backgroundColor: AppStitchTheme.lightOutline.withValues(alpha: 0.4),
              valueColor: const AlwaysStoppedAnimation(Color(0xFF10B981)),
            ),
          ),
          const SizedBox(width: 8),
          Text(v == null ? '—' : v.toStringAsFixed(1), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppStitchTheme.lightOnSurface)),
        ],
      ),
    );
  }

  // ---------- Feedback ----------
  Widget _feedbackTab() {
    final received = _list('feedbacks_received');
    final provided = _list('feedbacks_provided');
    if (received.isEmpty && provided.isEmpty) return _empty('No feedback yet.');
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (received.isNotEmpty) ...[
            _subhead('Received (${received.length})'),
            ...received.map((f) => _feedbackCard(f, 'given_by_name', 'From')),
          ],
          if (provided.isNotEmpty) ...[
            const SizedBox(height: 8),
            _subhead('Provided (${provided.length})'),
            ...provided.map((f) => _feedbackCard(f, 'receiver_name', 'To')),
          ],
        ],
      ),
    );
  }

  Widget _feedbackCard(Map<String, dynamic> f, String nameKey, String prefix) => Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppStitchTheme.lightSurfaceElevated,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.6)),
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text('$prefix ${f[nameKey] ?? 'System'}', style: const TextStyle(fontWeight: FontWeight.w800, color: AppStitchTheme.lightOnSurface)),
                ),
                if (f['rating'] != null) _ratingStars(f['rating']),
              ],
            ),
            const SizedBox(height: 4),
            _pill('${f['feedback_type'] ?? 'Feedback'}', const Color(0xFF4338CA)),
            const SizedBox(height: 8),
            Text('${f['feedback_text'] ?? ''}', style: const TextStyle(fontSize: 13, color: AppStitchTheme.lightOnSurfaceMuted, height: 1.4)),
            if (f['created_at'] != null) ...[
              const SizedBox(height: 6),
              Text('${f['created_at']}', style: const TextStyle(fontSize: 11, color: AppStitchTheme.lightOnSurfaceVariant)),
            ],
          ],
        ),
      );

  Widget _ratingStars(dynamic rating) {
    final r = (rating is num) ? rating.toInt() : 0;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) => Icon(i < r ? Icons.star_rounded : Icons.star_border_rounded, size: 16, color: const Color(0xFFF59E0B))),
    );
  }

  // ---------- shared ----------
  Widget _sectionCard(String title, IconData icon, {required Widget child, Widget? trailing}) => Container(
        decoration: BoxDecoration(
          color: AppStitchTheme.lightSurfaceElevated,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.6)),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 18, color: _grad.first),
                const SizedBox(width: 8),
                Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppStitchTheme.lightOnSurface))),
                if (trailing != null) trailing,
              ],
            ),
            const SizedBox(height: 10),
            child,
          ],
        ),
      );

  Widget _subhead(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 10, top: 4),
        child: Text(t, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppStitchTheme.lightOnSurface)),
      );

  Widget _pill(String t, Color c) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: c.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
        child: Text(t, style: TextStyle(color: c, fontSize: 11, fontWeight: FontWeight.w800)),
      );

  Widget _statusChip(String s) {
    final low = s.toLowerCase();
    Color c = const Color(0xFF6B7280);
    if (low.contains('complet') || low.contains('approv') || low.contains('final')) {
      c = const Color(0xFF0F766E);
    } else if (low.contains('pending') || low.contains('progress') || low.contains('draft')) {
      c = const Color(0xFFB45309);
    }
    return _pill(s.isEmpty ? '—' : s, c);
  }

  Widget _empty(String msg) => RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          children: [
            SizedBox(
              height: MediaQuery.of(context).size.height * 0.6,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.inbox_rounded, size: 48, color: AppStitchTheme.lightOnSurfaceVariant),
                    const SizedBox(height: 12),
                    Text(msg, style: const TextStyle(color: AppStitchTheme.lightOnSurfaceMuted)),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
}
