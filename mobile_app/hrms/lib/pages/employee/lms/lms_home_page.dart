import 'dart:async';

import 'package:flutter/material.dart';
import '../../../widgets/stitch_background.dart';
import '../../../utils/performance_helper.dart';

import '../../../widgets/session_dialogs.dart';
import '../../../widgets/glass_chrome.dart';
import '../../../theme/app_stitch_theme.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../services/lms_service.dart';
import '../../../services/storage_service.dart';
import 'course_player_page.dart';
import 'lms_widgets.dart';

/// Employee Learning Management — mobile counterpart of the web
/// `/employee/learning-management` dashboard, My Learning, Catalog and Requests pages.
class LmsHomePage extends StatefulWidget {
  const LmsHomePage({super.key});

  @override
  State<LmsHomePage> createState() => _LmsHomePageState();
}

class _LmsHomePageState extends State<LmsHomePage> {
  int _tab = 0;
  bool _loading = true;
  String? _error;
  String _name = '';
  List<Json> _enrollments = [],
      _compliance = [],
      _certificates = [],
      _wishlist = [],
      _requests = [],
      _paths = [],
      _sessions = [];

  static const _titles = ['My Learning', 'Explore', 'Achievements', 'Training Requests'];

  @override
  void initState() {
    super.initState();
    _load();
    StorageService.getFirstName().then((n) {
      final s = (n ?? '').trim();
      if (mounted && s.isNotEmpty) setState(() => _name = s[0].toUpperCase() + s.substring(1));
    });
  }

  Future<void> _load() async {
    setState(() {
      _loading = _enrollments.isEmpty;
      _error = null;
    });
    final r = await Future.wait([
      LmsService.myEnrollments(),
      LmsService.myCompliance(),
      LmsService.myCertificates(),
      LmsService.myWishlist(),
      LmsService.myTrainingRequests(),
      LmsService.myLearningPaths(),
      LmsService.trainingSessions(),
    ]);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (!r[0].success) _error = r[0].message;
      _enrollments = r[0].data ?? _enrollments;
      _compliance = r[1].data ?? _compliance;
      _certificates = r[2].data ?? _certificates;
      _wishlist = r[3].data ?? _wishlist;
      _requests = r[4].data ?? _requests;
      _paths = r[5].data ?? _paths;
      _sessions = r[6].data ?? _sessions;
    });
  }

  double pct(Json e) => LmsService.n(e['progress_percentage']).toDouble();
  int get _active => _enrollments.where((e) => pct(e) < 100).length;
  int get _completed => _enrollments.where((e) => pct(e) >= 100).length;
  List<Json> get _pendingCompliance => _compliance.where((c) => c['status'] != 'completed').toList();
  double get _overall => _enrollments.isEmpty ? 0 : _enrollments.map(pct).reduce((a, b) => a + b) / _enrollments.length;

  Json? get _continue {
    final inProgress = _enrollments.where((e) => pct(e) > 0 && pct(e) < 100).toList()
      ..sort((a, b) => pct(b).compareTo(pct(a)));
    if (inProgress.isNotEmpty) return inProgress.first;
    return _enrollments.where((e) => pct(e) == 0).firstOrNull;
  }

  Future<void> openCourse(Json enrollment) async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => CoursePlayerPage(enrollmentId: LmsService.n(enrollment['id']).toInt())),
    );
    _load();
  }

  Json? enrollmentFor(int courseId) =>
      _enrollments.where((e) => LmsService.n(e['course']).toInt() == courseId).firstOrNull;
  Json? wishFor(int courseId) => _wishlist.where((w) => LmsService.n(w['course']).toInt() == courseId).firstOrNull;

  Json? requestFor(int courseId) {
    final rs = _requests.where((r) => LmsService.n(r['course']).toInt() == courseId).toList()
      ..sort((a, b) => '${b['created_at']}'.compareTo('${a['created_at']}'));
    return rs.firstOrNull;
  }

  void goTo(int tab) => setState(() => _tab = tab);

  @override
  Widget build(BuildContext context) {
    final pending = _pendingCompliance.length;
    return Scaffold(
      backgroundColor: AppStitchTheme.lightScaffold,
      body: StitchBackground(
        enableAnimations: PerformanceHelper.enableParticles,
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              GlassHeader(
                title: 'Learning',
                subtitle: _titles[_tab],
                icon: Icons.school_rounded,
                actions: [
                  GlassIconButton(icon: Icons.refresh_rounded, tooltip: 'Refresh', onTap: _load),
                  GlassIconButton(
                    icon: Icons.logout_rounded,
                    tooltip: 'Log out',
                    color: const Color(0xFFDC2626),
                    onTap: () => confirmLogout(context),
                  ),
                ],
              ),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator(color: Lc.primary, strokeWidth: 2.5))
                    : _error != null && _enrollments.isEmpty
                    ? SingleChildScrollView(
                        child: ErrorRetry(message: _error!, onRetry: _load),
                      )
                    : IndexedStack(
                        index: _tab,
                        children: [
                          _MyLearningTab(home: this),
                          _ExploreTab(home: this),
                          _AchievementsTab(home: this),
                          _RequestsTab(home: this),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: GlassBottomNav(
        currentIndex: _tab,
        onTap: goTo,
        items: [
          GlassNavItem(Icons.school_outlined, 'My Learning', activeIcon: Icons.school_rounded, badge: pending),
          const GlassNavItem(Icons.explore_outlined, 'Explore', activeIcon: Icons.explore_rounded),
          const GlassNavItem(
            Icons.workspace_premium_outlined,
            'Achievements',
            activeIcon: Icons.workspace_premium_rounded,
          ),
          const GlassNavItem(Icons.assignment_outlined, 'Requests', activeIcon: Icons.assignment_rounded),
        ],
      ),
    );
  }
}

// ============================================================================
// My Learning
// ============================================================================
class _MyLearningTab extends StatefulWidget {
  const _MyLearningTab({required this.home});
  final _LmsHomePageState home;

  @override
  State<_MyLearningTab> createState() => _MyLearningTabState();
}

class _MyLearningTabState extends State<_MyLearningTab> {
  String _filter = 'all';

  _LmsHomePageState get h => widget.home;

  @override
  Widget build(BuildContext context) {
    final list = h._enrollments.where((e) {
      final p = h.pct(e);
      return _filter == 'all' || (_filter == 'active' ? p < 100 : p >= 100);
    }).toList();
    final cont = h._continue;
    final pending = h._pendingCompliance
      ..sort((a, b) {
        final r = (a['status'] == 'overdue' ? 0 : 1).compareTo(b['status'] == 'overdue' ? 0 : 1);
        return r != 0 ? r : '${a['due_date']}'.compareTo('${b['due_date']}');
      });
    final upcoming =
        h._sessions
            .where((s) => (DateTime.tryParse('${s['end_datetime']}') ?? DateTime(2000)).isAfter(DateTime.now()))
            .toList()
          ..sort((a, b) => '${a['start_datetime']}'.compareTo('${b['start_datetime']}'));

    return RefreshIndicator(
      color: Lc.primary,
      onRefresh: h._load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
        children: [
          _summary(),
          if (pending.isNotEmpty) ...[
            SectionHeader('Mandatory training', count: pending.length),
            ...pending.map((c) => Padding(padding: const EdgeInsets.only(bottom: 8), child: _complianceRow(c))),
          ],
          if (cont != null) ...[
            SectionHeader(h.pct(cont) > 0 ? 'Continue learning' : 'Start learning'),
            _continueCard(cont),
          ],
          if (upcoming.isNotEmpty) ...[
            SectionHeader('Upcoming sessions', count: upcoming.length),
            SizedBox(
              height: 104,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                clipBehavior: Clip.none,
                itemCount: upcoming.length,
                separatorBuilder: (_, _) => const SizedBox(width: 10),
                itemBuilder: (_, i) => _sessionCard(upcoming[i]),
              ),
            ),
          ],
          if (h._paths.isNotEmpty) ...[
            SectionHeader('Learning paths', count: h._paths.length),
            ...h._paths.map((p) => Padding(padding: const EdgeInsets.only(bottom: 8), child: _pathRow(p))),
          ],
          SectionHeader('My courses', count: h._enrollments.length),
          _segmented(),
          const SizedBox(height: 12),
          if (list.isEmpty)
            EmptyState(
              icon: Icons.menu_book_outlined,
              title: h._enrollments.isEmpty ? 'No courses yet' : 'No courses here',
              message: h._enrollments.isEmpty
                  ? 'Browse the catalog and request enrollment to begin.'
                  : 'Courses matching this filter will show up here.',
              action: h._enrollments.isEmpty
                  ? SizedBox(
                      width: 200,
                      child: FilledButton(
                        onPressed: () => h.goTo(1),
                        style: lmsPrimaryButton(height: 44),
                        child: const Text('Browse courses'),
                      ),
                    )
                  : null,
            )
          else
            ...list.map((e) => Padding(padding: const EdgeInsets.only(bottom: 10), child: _courseRow(e))),
        ],
      ),
    );
  }

  Widget _summary() {
    final greet = h._name.isEmpty ? 'Welcome back' : 'Welcome back, ${h._name}';
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(colors: Lc.hero, begin: Alignment.topLeft, end: Alignment.bottomRight),
        boxShadow: [BoxShadow(color: Lc.hero.last.withValues(alpha: 0.22), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      greet,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.72),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Your learning progress',
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      h._enrollments.isEmpty
                          ? 'Enroll in a course to start tracking'
                          : 'Average completion across ${h._enrollments.length} courses',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 12),
                    ),
                  ],
                ),
              ),
              ProgressRing(h._overall, size: 66, stroke: 6, light: true),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                _stat('${h._active}', 'In progress'),
                _divider(),
                _stat('${h._completed}', 'Completed'),
                _divider(),
                _stat('${h._certificates.length}', 'Certificates'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _stat(String v, String l) => Expanded(
    child: Column(
      children: [
        Text(
          v,
          style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 2),
        Text(l, style: TextStyle(color: Colors.white.withValues(alpha: 0.65), fontSize: 11.5)),
      ],
    ),
  );

  Widget _divider() => Container(width: 1, height: 28, color: Colors.white.withValues(alpha: 0.14));

  Widget _segmented() => Container(
    padding: const EdgeInsets.all(4),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.45),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: Lc.glassBorder),
    ),
    child: Row(
      children: [
        for (final f in const [('all', 'All'), ('active', 'In progress'), ('done', 'Completed')])
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _filter = f.$1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 9),
                decoration: BoxDecoration(
                  color: _filter == f.$1 ? Lc.surface : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                  boxShadow: _filter == f.$1 ? Lc.shadow : null,
                ),
                child: Text(
                  f.$2,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: _filter == f.$1 ? FontWeight.w700 : FontWeight.w500,
                    color: _filter == f.$1 ? Lc.ink : Lc.muted,
                  ),
                ),
              ),
            ),
          ),
      ],
    ),
  );

  Widget _continueCard(Json e) {
    final p = h.pct(e);
    return LmsCard(
      padding: EdgeInsets.zero,
      onTap: () => h.openCourse(e),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CourseThumb(url: thumbOf(e), seed: LmsService.n(e['course']).toInt(), height: 132, radius: Lc.r),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Pill(
                      titleCase('${e['course_difficulty'] ?? 'beginner'}'),
                      color: difficultyColor('${e['course_difficulty']}'),
                    ),
                    const SizedBox(width: 6),
                    Pill(
                      '${LmsService.n(e['course_estimated_hours'])} hrs',
                      color: Lc.muted,
                      icon: Icons.schedule_rounded,
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text('${e['course_title']}', style: Lc.h2),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: ProgressLine(p)),
                    const SizedBox(width: 10),
                    Text(
                      '${p.round()}%',
                      style: const TextStyle(fontWeight: FontWeight.w700, color: Lc.text, fontSize: 13),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                FilledButton.icon(
                  onPressed: () => h.openCourse(e),
                  style: lmsPrimaryButton(height: 46),
                  icon: Icon(p > 0 ? Icons.play_arrow_rounded : Icons.arrow_forward_rounded, size: 20),
                  label: Text(p > 0 ? 'Resume course' : 'Start course'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _courseRow(Json e) {
    final p = h.pct(e);
    final done = p >= 100;
    return LmsCard(
      padding: const EdgeInsets.all(12),
      onTap: () => h.openCourse(e),
      child: Row(
        children: [
          CourseThumb(url: thumbOf(e), seed: LmsService.n(e['course']).toInt(), height: 76, width: 76, radius: 12),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${e['course_title']}', maxLines: 2, overflow: TextOverflow.ellipsis, style: Lc.h3),
                const SizedBox(height: 4),
                Text(
                  '${titleCase('${e['course_difficulty'] ?? 'beginner'}')}  ·  ${LmsService.n(e['course_estimated_hours'])} hrs',
                  style: Lc.small,
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(child: ProgressLine(p, height: 5)),
                    const SizedBox(width: 10),
                    done
                        ? const Icon(Icons.check_circle_rounded, color: Lc.success, size: 18)
                        : Text(
                            '${p.round()}%',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Lc.text),
                          ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right_rounded, color: Lc.faint),
        ],
      ),
    );
  }

  Widget _complianceRow(Json c) {
    final due = DateTime.tryParse('${c['due_date']}');
    final days = due?.difference(DateTime.now()).inDays;
    final overdue = c['status'] == 'overdue' || (days != null && days < 0);
    final enr = h.enrollmentFor(LmsService.n(c['course']).toInt());
    final color = overdue ? Lc.danger : Lc.warning;
    return LmsCard(
      padding: const EdgeInsets.all(12),
      color: overdue ? Lc.dangerSoft : Lc.warningSoft,
      onTap: enr != null ? () => h.openCourse(enr) : () => h.goTo(1),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
            child: Icon(overdue ? Icons.error_outline_rounded : Icons.shield_outlined, color: color, size: 21),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${c['course_title']}', style: Lc.h3),
                const SizedBox(height: 2),
                Text(
                  days == null
                      ? 'No due date'
                      : days < 0
                      ? 'Overdue by ${-days} day${days == -1 ? '' : 's'}'
                      : days == 0
                      ? 'Due today'
                      : 'Due in $days day${days == 1 ? '' : 's'} · ${fmtDate(c['due_date'])}',
                  style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          Text(
            enr != null ? 'Open' : 'Find',
            style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 13),
          ),
          Icon(Icons.chevron_right_rounded, color: color),
        ],
      ),
    );
  }

  Widget _pathRow(Json p) => LmsCard(
    padding: const EdgeInsets.all(12),
    child: Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(color: Lc.tealSoft, borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.route_rounded, color: Lc.teal, size: 21),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${p['learning_path_title'] ?? 'Learning path'}', style: Lc.h3),
              if (p['due_date'] != null) Text('Due ${fmtDate(p['due_date'])}', style: Lc.small),
            ],
          ),
        ),
        if (p['status'] != null) Pill(titleCase('${p['status']}'), color: statusColor('${p['status']}')),
      ],
    ),
  );

  Widget _sessionCard(Json s) {
    final link = '${s['meeting_link'] ?? ''}';
    final start = DateTime.tryParse('${s['start_datetime']}')?.toLocal();
    return SizedBox(
      width: 272,
      child: LmsCard(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 52,
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(color: Lc.primarySoft, borderRadius: BorderRadius.circular(12)),
              child: Column(
                children: [
                  Text(
                    start == null ? '--' : fmtDate(start.toIso8601String(), 'MMM').toUpperCase(),
                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Lc.primary),
                  ),
                  Text(
                    start == null ? '--' : '${start.day}',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Lc.primary),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '${s['title']}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: Lc.text),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${fmtDate(s['start_datetime'], 'hh:mm a')} · ${titleCase('${s['session_type'] ?? 'session'}')}',
                    style: Lc.small,
                  ),
                  if (link.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    GestureDetector(
                      onTap: () => launchUrl(Uri.parse(link), mode: LaunchMode.externalApplication),
                      child: const Row(
                        children: [
                          Icon(Icons.videocam_outlined, size: 15, color: Lc.primary),
                          SizedBox(width: 4),
                          Text(
                            'Join session',
                            style: TextStyle(color: Lc.primary, fontWeight: FontWeight.w700, fontSize: 12.5),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Explore (catalog + saved)
// ============================================================================
class _ExploreTab extends StatefulWidget {
  const _ExploreTab({required this.home});
  final _LmsHomePageState home;

  @override
  State<_ExploreTab> createState() => _ExploreTabState();
}

class _ExploreTabState extends State<_ExploreTab> {
  final _scroll = ScrollController();
  Timer? _debounce;
  List<Json> _courses = [], _cats = [];
  int? _cat;
  String _difficulty = '', _q = '';
  bool _saved = false;
  int _page = 1, _pages = 1, _count = 0;
  bool _loading = true, _more = false;
  String? _error;
  int? _busyId;

  _LmsHomePageState get h => widget.home;

  @override
  void initState() {
    super.initState();
    LmsService.categories().then((r) {
      if (mounted && r.success) setState(() => _cats = r.data!);
    });
    _fetch();
    _scroll.addListener(() {
      if (!_saved && _scroll.position.pixels > _scroll.position.maxScrollExtent - 300 && !_more && _page < _pages) {
        _fetch(more: true);
      }
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _fetch({bool more = false}) async {
    setState(() => more ? _more = true : (_loading = true, _error = null));
    final r = await LmsService.courses(
      page: more ? _page + 1 : 1,
      search: _q.trim(),
      difficulty: _difficulty,
      category: _cat,
    );
    if (!mounted) return;
    setState(() {
      _loading = _more = false;
      if (!r.success) {
        _error = r.message;
        return;
      }
      _page = more ? _page + 1 : 1;
      _pages = r.data!.totalPages;
      _count = r.data!.count;
      _courses = more ? [..._courses, ...r.data!.items] : r.data!.items;
    });
  }

  Future<void> _requestEnrollment(Json c) async {
    final reason = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => LmsSheet(
        title: 'Request enrollment',
        subtitle: 'Your request is sent to your manager and admin for approval.',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _miniCourse(c),
            const SizedBox(height: 16),
            TextField(controller: reason, maxLines: 3, decoration: lmsInput('Reason (optional)')),
            const SizedBox(height: 18),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: lmsPrimaryButton(),
              child: const Text('Submit request'),
            ),
          ],
        ),
      ),
    );
    final text = reason.text.trim();
    WidgetsBinding.instance.addPostFrameCallback((_) => reason.dispose());
    if (ok != true) return;
    final id = LmsService.n(c['id']).toInt();
    setState(() => _busyId = id);
    final r = await LmsService.requestTraining(course: id, reason: text);
    if (!mounted) return;
    setState(() => _busyId = null);
    lmsToast(
      context,
      r.success ? 'Request submitted for approval' : r.message ?? 'Failed to submit request',
      error: !r.success,
    );
    if (r.success) h._load();
  }

  Future<void> _toggleWish(int courseId) async {
    final w = h.wishFor(courseId);
    final r = w == null
        ? await LmsService.addWishlist(courseId)
        : await LmsService.removeWishlist(LmsService.n(w['id']).toInt());
    if (!mounted) return;
    if (!r.success) return lmsToast(context, r.message ?? 'Something went wrong', error: true);
    lmsToast(context, w == null ? 'Saved for later' : 'Removed from saved');
    await h._load();
    if (mounted) setState(() {});
  }

  Future<void> _enrollFromSaved(Json w) async {
    final course = LmsService.n(w['course']).toInt();
    setState(() => _busyId = course);
    final r = await LmsService.enroll(course);
    if (r.success) await LmsService.removeWishlist(LmsService.n(w['id']).toInt());
    if (!mounted) return;
    setState(() => _busyId = null);
    lmsToast(context, r.success ? 'Enrolled successfully' : r.message ?? 'Enrollment failed', error: !r.success);
    if (r.success) {
      await h._load();
      h.goTo(0);
    }
  }

  void _details(Json c) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        maxChildSize: 0.94,
        minChildSize: 0.5,
        builder: (_, sc) {
          final contents = ((c['contents'] as List?) ?? const []).whereType<Map>().toList()
            ..sort((a, b) => LmsService.n(a['sequence']).compareTo(LmsService.n(b['sequence'])));
          final mins = contents.fold<num>(0, (s, x) => s + LmsService.n(x['duration_minutes']));
          return Container(
            decoration: const BoxDecoration(
              color: Lc.surface,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: ListView(
              controller: sc,
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(color: Lc.line, borderRadius: BorderRadius.circular(9)),
                  ),
                ),
                const SizedBox(height: 16),
                CourseThumb(url: thumbOf(c), seed: LmsService.n(c['id']).toInt(), height: 168, radius: 14),
                const SizedBox(height: 16),
                Text(
                  '${c['category_name'] ?? 'General'}'.toUpperCase(),
                  style: Lc.overline.copyWith(color: Lc.primary),
                ),
                const SizedBox(height: 6),
                Text('${c['title']}', style: Lc.h1),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(color: Lc.bg, borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    children: [
                      _fact(
                        Icons.signal_cellular_alt_rounded,
                        titleCase('${c['difficulty_level'] ?? 'beginner'}'),
                        'Level',
                      ),
                      _fact(Icons.schedule_rounded, '${LmsService.n(c['duration_hours'])} hrs', 'Duration'),
                      _fact(Icons.play_lesson_outlined, '${contents.length}', 'Lessons'),
                      _fact(Icons.translate_rounded, '${c['language'] ?? 'English'}', 'Language'),
                    ],
                  ),
                ),
                if (c['is_compliance'] == true) ...[
                  const SizedBox(height: 10),
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Pill('Mandatory compliance course', color: Lc.danger, icon: Icons.shield_outlined),
                  ),
                ],
                const SizedBox(height: 16),
                const Text('About this course', style: Lc.h3),
                const SizedBox(height: 6),
                Text('${c['description'] ?? 'No description provided.'}', style: Lc.body),
                if (contents.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      const Text('Course content', style: Lc.h3),
                      const Spacer(),
                      Text('${contents.length} lessons${mins > 0 ? ' · $mins min' : ''}', style: Lc.small),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: Lc.line),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        for (var i = 0; i < contents.length; i++) ...[
                          if (i > 0) const Divider(height: 1, color: Lc.line),
                          ListTile(
                            dense: true,
                            leading: Icon(contentIcon('${contents[i]['content_type']}'), color: Lc.muted, size: 20),
                            title: Text(
                              '${contents[i]['title']}',
                              style: const TextStyle(fontWeight: FontWeight.w600, color: Lc.text),
                            ),
                            trailing: LmsService.n(contents[i]['duration_minutes']) > 0
                                ? Text('${LmsService.n(contents[i]['duration_minutes'])} min', style: Lc.small)
                                : null,
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 22),
                _action(c, close: () => Navigator.pop(ctx)),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _fact(IconData i, String v, String l) => Expanded(
    child: Column(
      children: [
        Icon(i, size: 18, color: Lc.muted),
        const SizedBox(height: 4),
        Text(
          v,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5, color: Lc.text),
        ),
        Text(l, style: const TextStyle(fontSize: 10.5, color: Lc.faint)),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: Lc.primary,
      onRefresh: () async => Future.wait([_fetch(), h._load()]),
      child: CustomScrollView(
        controller: _scroll,
        slivers: [
          SliverToBoxAdapter(
            child: Container(
              color: Lc.bar,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          onChanged: (v) {
                            _q = v;
                            _debounce?.cancel();
                            _debounce = Timer(const Duration(milliseconds: 450), _fetch);
                          },
                          textInputAction: TextInputAction.search,
                          decoration: InputDecoration(
                            hintText: 'Search courses',
                            hintStyle: const TextStyle(color: Lc.faint),
                            prefixIcon: const Icon(Icons.search_rounded, color: Lc.faint),
                            filled: true,
                            fillColor: Lc.bg,
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _levelButton(),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 34,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        _chip(
                          'Saved${h._wishlist.isNotEmpty ? ' · ${h._wishlist.length}' : ''}',
                          _saved,
                          () => setState(() => _saved = !_saved),
                          icon: _saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                        ),
                        Container(width: 1, margin: const EdgeInsets.fromLTRB(2, 6, 10, 6), color: Lc.line),
                        _chip('All', !_saved && _cat == null, () => _setCat(null)),
                        ..._cats.map(
                          (c) => _chip(
                            '${c['name']}',
                            !_saved && _cat == LmsService.n(c['id']).toInt(),
                            () => _setCat(LmsService.n(c['id']).toInt()),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: Divider(height: 1, color: Lc.line)),
          if (_saved) ..._savedSlivers() else ..._catalogSlivers(),
        ],
      ),
    );
  }

  List<Widget> _catalogSlivers() => [
    SliverPadding(
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 6),
      sliver: SliverToBoxAdapter(child: Text(_loading ? 'Loading…' : '$_count courses available', style: Lc.small)),
    ),
    if (_loading)
      const SliverFillRemaining(
        hasScrollBody: false,
        child: Center(child: CircularProgressIndicator(color: Lc.primary, strokeWidth: 2.5)),
      )
    else if (_error != null)
      SliverToBoxAdapter(
        child: ErrorRetry(message: _error!, onRetry: _fetch),
      )
    else if (_courses.isEmpty)
      const SliverToBoxAdapter(
        child: EmptyState(
          icon: Icons.search_off_rounded,
          title: 'No courses found',
          message: 'Try a different search, category or level.',
        ),
      )
    else
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        sliver: SliverList.separated(
          itemCount: _courses.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (_, i) => _catalogRow(_courses[i]),
        ),
      ),
    if (_more)
      const SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: CircularProgressIndicator(color: Lc.primary, strokeWidth: 2.5)),
        ),
      ),
  ];

  List<Widget> _savedSlivers() {
    final list = h._wishlist;
    if (list.isEmpty) {
      return const [
        SliverToBoxAdapter(
          child: EmptyState(
            icon: Icons.bookmark_border_rounded,
            title: 'Nothing saved yet',
            message: 'Tap the bookmark on any course to save it for later.',
          ),
        ),
      ];
    }
    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        sliver: SliverList.separated(
          itemCount: list.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (_, i) {
            final w = list[i];
            final course = LmsService.n(w['course']).toInt();
            final enrolled = h.enrollmentFor(course);
            return LmsCard(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  CourseThumb(url: thumbOf(w), seed: course, height: 68, width: 68, radius: 12),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${w['course_title']}', maxLines: 2, overflow: TextOverflow.ellipsis, style: Lc.h3),
                        const SizedBox(height: 2),
                        Text('Saved ${fmtDate(w['added_at'])}', style: Lc.small),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 34,
                          child: enrolled != null
                              ? OutlinedButton(
                                  onPressed: () => h.openCourse(enrolled),
                                  style: lmsSecondaryButton(
                                    height: 34,
                                  ).copyWith(minimumSize: const WidgetStatePropertyAll(Size(0, 34))),
                                  child: const Text('Open course', style: TextStyle(fontSize: 13)),
                                )
                              : FilledButton(
                                  onPressed: _busyId == course ? null : () => _enrollFromSaved(w),
                                  style: lmsPrimaryButton(height: 34).copyWith(
                                    padding: const WidgetStatePropertyAll(EdgeInsets.symmetric(horizontal: 16)),
                                    minimumSize: const WidgetStatePropertyAll(Size(0, 34)),
                                  ),
                                  child: Text(
                                    _busyId == course ? 'Enrolling…' : 'Enroll now',
                                    style: const TextStyle(fontSize: 13),
                                  ),
                                ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Remove',
                    onPressed: () => _toggleWish(course),
                    icon: const Icon(Icons.bookmark_remove_outlined, color: Lc.muted),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    ];
  }

  void _setCat(int? id) {
    setState(() {
      _saved = false;
      _cat = id;
    });
    _fetch();
  }

  Widget _levelButton() => PopupMenuButton<String>(
    initialValue: _difficulty,
    tooltip: 'Level',
    onSelected: (v) {
      setState(() => _difficulty = v);
      _fetch();
    },
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    itemBuilder: (_) => const [
      PopupMenuItem(value: '', child: Text('All levels')),
      PopupMenuItem(value: 'beginner', child: Text('Beginner')),
      PopupMenuItem(value: 'intermediate', child: Text('Intermediate')),
      PopupMenuItem(value: 'advanced', child: Text('Advanced')),
    ],
    child: Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: _difficulty.isEmpty ? Lc.bg : Lc.primarySoft,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.tune_rounded, size: 18, color: _difficulty.isEmpty ? Lc.muted : Lc.primary),
          if (_difficulty.isNotEmpty) ...[
            const SizedBox(width: 6),
            Text(
              titleCase(_difficulty),
              style: const TextStyle(color: Lc.primary, fontWeight: FontWeight.w700, fontSize: 12.5),
            ),
          ],
        ],
      ),
    ),
  );

  Widget _chip(String label, bool sel, VoidCallback onTap, {IconData? icon}) => Padding(
    padding: const EdgeInsets.only(right: 8),
    child: Material(
      color: sel ? Lc.ink : Lc.surface,
      shape: StadiumBorder(side: BorderSide(color: sel ? Lc.ink : Lc.line)),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 15, color: sel ? Colors.white : Lc.muted),
                const SizedBox(width: 5),
              ],
              Text(
                label,
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: sel ? Colors.white : Lc.text),
              ),
            ],
          ),
        ),
      ),
    ),
  );

  Widget _catalogRow(Json c) {
    final id = LmsService.n(c['id']).toInt();
    final enr = h.enrollmentFor(id);
    final req = h.requestFor(id);
    final saved = h.wishFor(id) != null;
    final lessons = ((c['contents'] as List?) ?? const []).length;
    final (String status, Color color) = enr != null
        ? ('Enrolled · ${LmsService.n(enr['progress_percentage']).round()}%', Lc.success)
        : switch ('${req?['final_status'] ?? ''}') {
            'pending' => ('Approval pending', Lc.warning),
            'rejected' => ('Request rejected', Lc.danger),
            'approved' => ('Approved', Lc.success),
            _ => ('', Lc.muted),
          };
    return LmsCard(
      padding: const EdgeInsets.all(12),
      onTap: () => _details(c),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CourseThumb(url: thumbOf(c), seed: id, height: 92, width: 92, radius: 12),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${c['category_name'] ?? 'General'}'.toUpperCase(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Lc.overline.copyWith(color: Lc.primary, fontSize: 10.5),
                      ),
                    ),
                    GestureDetector(
                      onTap: () => _toggleWish(id),
                      child: Icon(
                        saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                        size: 21,
                        color: saved ? Lc.primary : Lc.faint,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text('${c['title']}', maxLines: 2, overflow: TextOverflow.ellipsis, style: Lc.h3),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: difficultyColor('${c['difficulty_level']}'),
                      ),
                    ),
                    const SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        '${titleCase('${c['difficulty_level'] ?? 'beginner'}')}  ·  ${LmsService.n(c['duration_hours'])} hrs${lessons > 0 ? '  ·  $lessons lessons' : ''}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Lc.small,
                      ),
                    ),
                  ],
                ),
                if (status.isNotEmpty || c['is_compliance'] == true) ...[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      if (status.isNotEmpty) Pill(status, color: color),
                      if (c['is_compliance'] == true) const Pill('Mandatory', color: Lc.danger),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Same decision tree as the web catalog `renderCourseAction`.
  Widget _action(Json c, {required VoidCallback close}) {
    final id = LmsService.n(c['id']).toInt();
    final enr = h.enrollmentFor(id);
    final req = h.requestFor(id);
    final saved = h.wishFor(id) != null;
    if (enr != null) {
      return FilledButton.icon(
        style: lmsPrimaryButton(height: 50),
        onPressed: () {
          close();
          h.openCourse(enr);
        },
        icon: const Icon(Icons.play_arrow_rounded),
        label: Text('Continue course · ${LmsService.n(enr['progress_percentage']).round()}%'),
      );
    }
    if (req?['final_status'] == 'pending') {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Lc.warningSoft,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFFDE68A)),
        ),
        child: const Row(
          children: [
            Icon(Icons.hourglass_top_rounded, color: Lc.warning, size: 20),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Enrollment request pending — awaiting manager/admin approval',
                style: TextStyle(fontWeight: FontWeight.w600, color: Lc.warning, fontSize: 13),
              ),
            ),
          ],
        ),
      );
    }
    final rejected = req?['final_status'] == 'rejected';
    final remark = rejected
        ? '${(req!['decided_by'] == 'manager' ? req['manager_remarks'] : req['admin_remarks']) ?? ''}'.trim()
        : '';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (rejected)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Lc.dangerSoft, borderRadius: BorderRadius.circular(12)),
            child: Text(
              'Previous request was rejected by ${req!['decided_by'] ?? 'approver'}${remark.isNotEmpty ? ' — "$remark"' : '.'}',
              style: const TextStyle(color: Lc.danger, fontWeight: FontWeight.w500, fontSize: 13),
            ),
          ),
        Row(
          children: [
            SizedBox(
              width: 52,
              height: 50,
              child: OutlinedButton(
                onPressed: () {
                  close();
                  _toggleWish(id);
                },
                style: lmsSecondaryButton(height: 50).copyWith(
                  padding: const WidgetStatePropertyAll(EdgeInsets.zero),
                  minimumSize: const WidgetStatePropertyAll(Size(52, 50)),
                ),
                child: Icon(saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton(
                style: lmsPrimaryButton(height: 50),
                onPressed: _busyId == id
                    ? null
                    : () {
                        close();
                        _requestEnrollment(c);
                      },
                child: Text(rejected ? 'Request again' : 'Request enrollment'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _miniCourse(Json c) => Container(
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(color: Lc.bg, borderRadius: BorderRadius.circular(12)),
    child: Row(
      children: [
        CourseThumb(url: thumbOf(c), seed: LmsService.n(c['id']).toInt(), height: 48, width: 48, radius: 10),
        const SizedBox(width: 12),
        Expanded(child: Text('${c['title']}', style: Lc.h3)),
      ],
    ),
  );
}

// ============================================================================
// Achievements (certificates)
// ============================================================================
class _AchievementsTab extends StatelessWidget {
  const _AchievementsTab({required this.home});
  final _LmsHomePageState home;

  @override
  Widget build(BuildContext context) {
    final list = home._certificates;
    final valid = list.where((c) => '${c['status'] ?? 'valid'}' == 'valid').length;
    return RefreshIndicator(
      color: Lc.primary,
      onRefresh: home._load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
        children: [
          LmsCard(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Row(
              children: [
                _metric('${list.length}', 'Certificates', Icons.workspace_premium_outlined, const Color(0xFFD97706)),
                Container(width: 1, height: 40, color: Lc.line),
                _metric('$valid', 'Valid', Icons.verified_outlined, Lc.success),
                Container(width: 1, height: 40, color: Lc.line),
                _metric('${home._completed}', 'Courses done', Icons.task_alt_rounded, Lc.primary),
              ],
            ),
          ),
          SectionHeader('My certificates', count: list.length),
          if (list.isEmpty)
            const EmptyState(
              icon: Icons.workspace_premium_outlined,
              title: 'No certificates yet',
              message: 'Complete every lesson, and pass the quiz if there is one, to earn a certificate.',
            )
          else
            ...list.map((c) => Padding(padding: const EdgeInsets.only(bottom: 10), child: _certCard(c))),
        ],
      ),
    );
  }

  Widget _metric(String v, String l, IconData i, Color c) => Expanded(
    child: Column(
      children: [
        Icon(i, color: c, size: 22),
        const SizedBox(height: 6),
        Text(
          v,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Lc.ink),
        ),
        Text(l, style: Lc.small),
      ],
    ),
  );

  Widget _certCard(Json c) {
    final url = LmsService.mediaUrl(c['certificate_file_url'] ?? c['certificate_file']);
    final status = '${c['status'] ?? 'valid'}';
    return LmsCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          Container(
            height: 4,
            decoration: const BoxDecoration(
              color: Color(0xFFD97706),
              borderRadius: BorderRadius.vertical(top: Radius.circular(Lc.r)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Lc.warningSoft,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: const Icon(Icons.workspace_premium_rounded, color: Color(0xFFD97706)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${c['course_title'] ?? c['certificate_name'] ?? 'Certificate'}', style: Lc.h3),
                          const SizedBox(height: 2),
                          Text('${c['issuing_authority'] ?? 'ITL Learning Academy'}', style: Lc.small),
                        ],
                      ),
                    ),
                    Pill(titleCase(status), color: statusColor(status)),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(height: 1, color: Lc.line),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _kv('Certificate ID', '${c['certificate_number'] ?? '—'}'),
                    _kv('Issued', fmtDate(c['issue_date'])),
                    if (c['expiry_date'] != null) _kv('Valid until', fmtDate(c['expiry_date'])),
                  ],
                ),
                if (url != null) ...[
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication),
                    style: lmsSecondaryButton(height: 42),
                    icon: const Icon(Icons.download_rounded, size: 18),
                    label: const Text('Download certificate'),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _kv(String k, String v) => Expanded(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(k, style: const TextStyle(fontSize: 11, color: Lc.faint)),
        const SizedBox(height: 2),
        Text(
          v,
          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Lc.text),
        ),
      ],
    ),
  );
}

// ============================================================================
// Training requests
// ============================================================================
class _RequestsTab extends StatelessWidget {
  const _RequestsTab({required this.home});
  final _LmsHomePageState home;

  Future<void> _new(BuildContext context) async {
    final courses = (await LmsService.courses(limit: 100)).data?.items ?? const <Json>[];
    if (!context.mounted) return;
    final res = await showModalBottomSheet<Json>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _NewRequestSheet(courses: courses),
    );
    if (res == null || !context.mounted) return;
    final r = await LmsService.requestTraining(
      course: res['course'] as int?,
      customTitle: '${res['custom'] ?? ''}',
      reason: '${res['reason'] ?? ''}',
      budgetRequired: res['budget'] == true,
    );
    if (!context.mounted) return;
    lmsToast(
      context,
      r.success ? 'Training request submitted' : r.message ?? 'Failed to submit request',
      error: !r.success,
    );
    if (r.success) home._load();
  }

  @override
  Widget build(BuildContext context) {
    final list = home._requests;
    final pending = list.where((r) => r['final_status'] == 'pending').length;
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'lms-new-request',
        backgroundColor: Lc.primary,
        foregroundColor: Colors.white,
        elevation: 2,
        onPressed: () => _new(context),
        icon: const Icon(Icons.add_rounded),
        label: const Text('New request', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: RefreshIndicator(
        color: Lc.primary,
        onRefresh: home._load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          children: [
            if (list.isNotEmpty) ...[
              Text(
                '${list.length} request${list.length == 1 ? '' : 's'}${pending > 0 ? ' · $pending awaiting approval' : ''}',
                style: Lc.small,
              ),
              const SizedBox(height: 10),
            ],
            if (list.isEmpty)
              const EmptyState(
                icon: Icons.assignment_outlined,
                title: 'No training requests',
                message: 'Request a catalog course or an external training. Your manager and admin will review it.',
              )
            else
              ...list.map((r) => Padding(padding: const EdgeInsets.only(bottom: 10), child: _card(r))),
          ],
        ),
      ),
    );
  }

  Widget _card(Json r) {
    final title = '${r['course_title'] ?? ''}'.isNotEmpty
        ? '${r['course_title']}'
        : '${r['custom_course_title'] ?? 'Custom training'}';
    final fin = '${r['final_status'] ?? 'pending'}';
    final remarks = [r['manager_remarks'], r['admin_remarks']].where((x) => '${x ?? ''}'.trim().isNotEmpty).join(' · ');
    Widget step(String label, String status) => Expanded(
      child: Row(
        children: [
          Icon(
            status == 'approved'
                ? Icons.check_circle_rounded
                : (status == 'rejected' ? Icons.cancel_rounded : Icons.schedule_rounded),
            size: 18,
            color: statusColor(status),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 11, color: Lc.faint)),
              Text(
                titleCase(status),
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: statusColor(status)),
              ),
            ],
          ),
        ],
      ),
    );
    return LmsCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: Text(title, style: Lc.h3)),
              const SizedBox(width: 8),
              Pill(titleCase(fin), color: statusColor(fin)),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${fmtDate(r['created_at'])}${r['course'] == null ? '  ·  External' : ''}${r['budget_required'] == true ? '  ·  Budget required' : ''}',
            style: Lc.small,
          ),
          if ('${r['reason'] ?? ''}'.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text('${r['reason']}', style: Lc.body.copyWith(color: Lc.text)),
          ],
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: Lc.bg, borderRadius: BorderRadius.circular(10)),
            child: Row(
              children: [
                step('Manager', '${r['manager_status'] ?? 'pending'}'),
                Container(width: 1, height: 28, color: Lc.line, margin: const EdgeInsets.symmetric(horizontal: 10)),
                step('Admin', '${r['admin_status'] ?? 'pending'}'),
              ],
            ),
          ),
          if (remarks.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.chat_bubble_outline_rounded, size: 15, color: Lc.faint),
                const SizedBox(width: 6),
                Expanded(child: Text(remarks, style: Lc.small)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _NewRequestSheet extends StatefulWidget {
  const _NewRequestSheet({required this.courses});
  final List<Json> courses;

  @override
  State<_NewRequestSheet> createState() => _NewRequestSheetState();
}

class _NewRequestSheetState extends State<_NewRequestSheet> {
  final _custom = TextEditingController();
  final _reason = TextEditingController();
  int? _course;
  bool _external = false, _budget = false;

  @override
  void dispose() {
    _custom.dispose();
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LmsSheet(
      title: 'New training request',
      subtitle: 'Choose a catalog course or describe an external training.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.45),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Lc.glassBorder),
            ),
            child: Row(
              children: [
                for (final o in const [(false, 'Catalog course'), (true, 'External training')])
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _external = o.$1),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: _external == o.$1 ? Lc.surface : Colors.transparent,
                          borderRadius: BorderRadius.circular(9),
                          boxShadow: _external == o.$1 ? Lc.shadow : null,
                        ),
                        child: Text(
                          o.$2,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                            color: _external == o.$1 ? Lc.ink : Lc.muted,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (_external)
            TextField(
              controller: _custom,
              decoration: lmsInput('Training or certification title', icon: Icons.public_rounded),
            )
          else
            DropdownButtonFormField<int>(
              initialValue: _course,
              isExpanded: true,
              decoration: lmsInput('Select a course', icon: Icons.menu_book_outlined),
              borderRadius: BorderRadius.circular(12),
              items: widget.courses
                  .map(
                    (c) => DropdownMenuItem(
                      value: LmsService.n(c['id']).toInt(),
                      child: Text('${c['title']}', overflow: TextOverflow.ellipsis),
                    ),
                  )
                  .toList(),
              onChanged: (v) => setState(() => _course = v),
            ),
          const SizedBox(height: 12),
          TextField(controller: _reason, maxLines: 3, decoration: lmsInput('Business justification')),
          const SizedBox(height: 8),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: _budget,
            activeThumbColor: Lc.primary,
            onChanged: (v) => setState(() => _budget = v),
            title: const Text(
              'Budget required',
              style: TextStyle(fontWeight: FontWeight.w600, color: Lc.text),
            ),
            subtitle: const Text('Paid course or external fee', style: Lc.small),
          ),
          const SizedBox(height: 10),
          FilledButton(
            style: lmsPrimaryButton(),
            onPressed: () {
              if (_external ? _custom.text.trim().isEmpty : _course == null) {
                lmsToast(context, 'Select a course or enter a training title', error: true);
                return;
              }
              Navigator.pop(context, {
                'course': _external ? null : _course,
                'custom': _external ? _custom.text.trim() : '',
                'reason': _reason.text.trim(),
                'budget': _budget,
              });
            },
            child: const Text('Submit request'),
          ),
        ],
      ),
    );
  }
}
