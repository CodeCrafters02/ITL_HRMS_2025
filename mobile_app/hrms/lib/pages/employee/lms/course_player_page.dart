import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_chrome.dart';
import '../../../widgets/stitch_background.dart';
import '../../../utils/performance_helper.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

import '../../../services/lms_service.dart';
import '../widgets/pdf_viewer_page.dart';
import 'lms_widgets.dart';
import 'quiz_page.dart';

/// Mobile counterpart of the web `CourseSyllabusPlayer`:
/// lessons → (all done) quiz → certificate → review, plus assignment uploads.
class CoursePlayerPage extends StatefulWidget {
  const CoursePlayerPage({super.key, required this.enrollmentId});
  final int enrollmentId;

  @override
  State<CoursePlayerPage> createState() => _CoursePlayerPageState();
}

class _CoursePlayerPageState extends State<CoursePlayerPage> {
  bool _loading = true, _saving = false;
  String? _error;
  Json _enr = const {};
  List<Json> _contents = [], _quizzes = [], _assignments = [], _attempts = [];
  Set<int> _done = {};
  Map<int, Json> _submissions = {};
  bool _reviewed = false;
  Json? _certificate;
  int _active = 0;

  int get _courseId => LmsService.n(_enr['course']).toInt();
  double get _progress => _contents.isEmpty ? 0 : _done.length * 100 / _contents.length;
  bool get _allLessonsDone => _contents.isNotEmpty && _done.length >= _contents.length;
  Json? get _lesson => _contents.isEmpty ? null : _contents[_active.clamp(0, _contents.length - 1)];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _enr.isEmpty;
      _error = null;
    });
    final e = await LmsService.enrollment(widget.enrollmentId);
    if (!mounted) return;
    if (!e.success) {
      setState(() {
        _loading = false;
        _error = e.message;
      });
      return;
    }
    _enr = e.data!;
    final r = await Future.wait([
      LmsService.contents(_courseId),
      LmsService.progress(widget.enrollmentId),
      LmsService.assessments(_courseId),
      LmsService.assignments(_courseId),
      LmsService.mySubmissions(),
      LmsService.myReviews(courseId: _courseId),
      LmsService.myAttempts(),
      LmsService.myCertificates(course: _courseId),
    ]);
    if (!mounted) return;
    final firstLoad = _contents.isEmpty;
    setState(() {
      _loading = false;
      _contents = r[0].data ?? _contents;
      _done = {
        for (final p in r[1].data ?? const <Json>[])
          if (p['is_completed'] != false) LmsService.n(p['content']).toInt(),
      }..retainAll(_contents.map((c) => LmsService.n(c['id']).toInt()));
      _quizzes = r[2].data ?? _quizzes;
      _assignments = r[3].data ?? _assignments;
      _submissions = {for (final s in r[4].data ?? const <Json>[]) LmsService.n(s['assignment']).toInt(): s};
      _reviewed = (r[5].data ?? const []).isNotEmpty;
      _attempts = r[6].data ?? _attempts;
      final certs = r[7].data ?? const <Json>[];
      _certificate = certs.isEmpty ? null : certs.first;
      if (firstLoad) {
        final next = _contents.indexWhere((c) => !_done.contains(LmsService.n(c['id']).toInt()));
        _active = next < 0 ? 0 : next;
      }
    });
  }

  Future<void> _markComplete() async {
    final l = _lesson;
    if (l == null) return;
    final id = LmsService.n(l['id']).toInt();
    if (_done.contains(id)) return;
    setState(() => _saving = true);
    final r = await LmsService.markComplete(widget.enrollmentId, id);
    if (!mounted) return;
    setState(() => _saving = false);
    if (!r.success) return lmsToast(context, r.message ?? 'Could not mark lesson complete', error: true);
    HapticFeedback.lightImpact();
    setState(() => _done = {..._done, id});
    if (_allLessonsDone) {
      lmsToast(context, _quizzes.isEmpty ? 'Course completed' : 'All lessons done — assessment unlocked');
    } else {
      lmsToast(context, 'Lesson completed');
      final next = _contents.indexWhere((c) => !_done.contains(LmsService.n(c['id']).toInt()));
      if (next >= 0) setState(() => _active = next);
    }
    _load();
  }

  List<Json> _attemptsFor(int quizId) =>
      _attempts.where((a) => LmsService.n(a['assessment']).toInt() == quizId).toList();

  Future<void> _openQuiz(Json q) async {
    if (!_allLessonsDone) {
      lmsToast(context, 'Complete all lessons to unlock this quiz', error: true);
      return;
    }
    final passed = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => QuizPage(
          quiz: q,
          enrollmentId: widget.enrollmentId,
          previousAttempts: _attemptsFor(LmsService.n(q['id']).toInt()),
        ),
      ),
    );
    if (passed != null) _load();
  }

  Future<void> _openAssignment(Json a) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AssignmentSheet(assignment: a, submission: _submissions[LmsService.n(a['id']).toInt()]),
    );
    if (changed == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        body: StitchBackground(
          enableAnimations: PerformanceHelper.enableParticles,
          child: Center(child: CircularProgressIndicator(color: lmsPrimary)),
        ),
      );
    }
    if (_error != null) {
      return Scaffold(
        backgroundColor: AppStitchTheme.lightScaffold,

        body: StitchBackground(
          enableAnimations: PerformanceHelper.enableParticles,
          child: SafeArea(
            bottom: false,
            child: Column(
              children: [
                const GlassHeader(title: 'Course', icon: Icons.menu_book_rounded),
                Expanded(
                  child: ErrorRetry(message: _error!, onRetry: _load),
                ),
              ],
            ),
          ),
        ),
      );
    }
    final remaining = _contents.length - _done.length;
    return Scaffold(
      backgroundColor: AppStitchTheme.lightScaffold,

      body: StitchBackground(
        enableAnimations: PerformanceHelper.enableParticles,
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              GlassHeader(
                title: 'Course',
                subtitle: '${_enr['course_title']}',
                icon: Icons.menu_book_rounded,
                bottom: ProgressLine(_progress, height: 3),
              ),
              Expanded(
                child: RefreshIndicator(
                  color: Lc.primary,
                  onRefresh: _load,
                  child: CustomScrollView(
                    slivers: [
                      SliverToBoxAdapter(child: _overview(remaining)),
                      SliverToBoxAdapter(child: _viewer()),
                      if (_certificate != null) SliverToBoxAdapter(child: _certificateBanner()),
                      if (_certificate != null && !_reviewed)
                        SliverToBoxAdapter(
                          child: _ReviewCard(courseId: _courseId, onDone: _load),
                        ),
                      SliverToBoxAdapter(
                        child: _sectionTitle('Course content', '${_done.length}/${_contents.length} done'),
                      ),
                      if (_contents.isEmpty)
                        const SliverToBoxAdapter(
                          child: EmptyState(
                            icon: Icons.inventory_2_outlined,
                            title: 'No lessons yet',
                            message: 'Your trainer hasn\'t published content for this course.',
                          ),
                        )
                      else
                        SliverToBoxAdapter(
                          child: Container(
                            margin: const EdgeInsets.symmetric(horizontal: 16),
                            decoration: Lc.glass(),
                            clipBehavior: Clip.antiAlias,
                            child: Column(children: [for (var i = 0; i < _contents.length; i++) _lessonTile(i)]),
                          ),
                        ),
                      if (_quizzes.isNotEmpty) ...[
                        SliverToBoxAdapter(child: _sectionTitle('Assessments', null)),
                        SliverList.builder(itemCount: _quizzes.length, itemBuilder: (_, i) => _quizTile(_quizzes[i])),
                      ],
                      if (_assignments.isNotEmpty) ...[
                        SliverToBoxAdapter(child: _sectionTitle('Assignments', null)),
                        SliverList.builder(
                          itemCount: _assignments.length,
                          itemBuilder: (_, i) => _assignmentTile(_assignments[i]),
                        ),
                      ],
                      const SliverToBoxAdapter(child: SizedBox(height: 40)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _overview(int remaining) => Container(
    color: Lc.bar,
    padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
    child: Row(
      children: [
        ProgressRing(_progress, size: 58, stroke: 5),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _progress >= 100 ? 'Course completed' : '$remaining lesson${remaining == 1 ? '' : 's'} remaining',
                style: Lc.h3,
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  Pill(
                    titleCase('${_enr['course_difficulty'] ?? 'beginner'}'),
                    color: difficultyColor('${_enr['course_difficulty']}'),
                  ),
                  Pill(
                    '${LmsService.n(_enr['course_estimated_hours'])} hrs',
                    color: Lc.muted,
                    icon: Icons.schedule_rounded,
                  ),
                  if (_quizzes.isNotEmpty)
                    Pill('${_quizzes.length} assessment${_quizzes.length == 1 ? '' : 's'}', color: Lc.primary),
                ],
              ),
            ],
          ),
        ),
      ],
    ),
  );

  Widget _sectionTitle(String t, String? trailing) => Padding(
    padding: const EdgeInsets.fromLTRB(18, 22, 18, 10),
    child: Row(
      children: [
        Text(t, style: Lc.h2),
        const Spacer(),
        if (trailing != null) Text(trailing, style: Lc.small),
      ],
    ),
  );

  // ---------------------------------------------------------------- viewer
  Widget _viewer() {
    final l = _lesson;
    if (l == null) return const SizedBox.shrink();
    final id = LmsService.n(l['id']).toInt();
    final type = '${l['content_type'] ?? ''}';
    final url = LmsService.mediaUrl(l['file_url'] ?? l['file']) ?? LmsService.mediaUrl(l['external_url']);
    final done = _done.contains(id);
    final isLast = _active >= _contents.length - 1;

    Widget body;
    if ((type == 'video' || type == 'audio') && url != null && l['external_url'] == null) {
      body = _LessonVideo(key: ValueKey('v$id'), url: url, audio: type == 'audio', title: '${l['title']}');
    } else {
      body = _DocPreview(
        type: type,
        title: '${l['title']}',
        filename: '${l['filename'] ?? ''}',
        onOpen: url == null
            ? null
            : () {
                if (type == 'pdf' || url.toLowerCase().endsWith('.pdf')) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => PdfViewerPage(pdfUrl: url, title: '${l['title']}'),
                    ),
                  );
                } else {
                  launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                }
              },
      );
    }

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      decoration: Lc.glass(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(Lc.r - 1)),
            child: body,
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('LESSON ${_active + 1} OF ${_contents.length}', style: Lc.overline.copyWith(color: Lc.primary)),
                const SizedBox(height: 4),
                Text('${l['title']}', style: Lc.h2),
                const SizedBox(height: 4),
                Text(
                  '${titleCase(type)}${LmsService.n(l['duration_minutes']) > 0 ? ' · ${LmsService.n(l['duration_minutes'])} min' : ''}',
                  style: Lc.small,
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    _navBtn(Icons.chevron_left_rounded, _active > 0 ? () => setState(() => _active--) : null),
                    const SizedBox(width: 10),
                    Expanded(
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 250),
                        child: done
                            ? Container(
                                key: const ValueKey('done'),
                                height: 46,
                                decoration: BoxDecoration(
                                  color: Lc.successSoft,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.check_circle_rounded, color: Lc.success, size: 20),
                                    SizedBox(width: 8),
                                    Text(
                                      'Completed',
                                      style: TextStyle(color: Lc.success, fontWeight: FontWeight.w700),
                                    ),
                                  ],
                                ),
                              )
                            : FilledButton.icon(
                                key: const ValueKey('todo'),
                                onPressed: _saving ? null : _markComplete,
                                style: lmsPrimaryButton(height: 46),
                                icon: _saving
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                      )
                                    : const Icon(Icons.check_rounded, size: 20),
                                label: const Text('Mark as complete'),
                              ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    _navBtn(Icons.chevron_right_rounded, !isLast ? () => setState(() => _active++) : null),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _navBtn(IconData i, VoidCallback? onTap) => SizedBox(
    width: 46,
    height: 46,
    child: OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        padding: EdgeInsets.zero,
        foregroundColor: Lc.text,
        side: const BorderSide(color: Lc.line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      child: Icon(i),
    ),
  );

  Widget _lessonTile(int i) {
    final c = _contents[i];
    final id = LmsService.n(c['id']).toInt();
    final done = _done.contains(id);
    final active = i == _active;
    final last = i == _contents.length - 1;
    final mins = LmsService.n(c['duration_minutes']);
    return InkWell(
      onTap: () => setState(() => _active = i),
      child: Container(
        color: active ? Lc.primarySoft : Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                width: 28,
                child: Column(
                  children: [
                    Expanded(child: Container(width: 2, color: i == 0 ? Colors.transparent : Lc.line)),
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      width: 26,
                      height: 26,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: done ? Lc.success : (active ? Lc.primary : Lc.surface),
                        border: Border.all(color: done ? Lc.success : (active ? Lc.primary : Lc.line), width: 2),
                      ),
                      child: Center(
                        child: done
                            ? const Icon(Icons.check_rounded, color: Colors.white, size: 15)
                            : Text(
                                '${i + 1}',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  color: active ? Colors.white : Lc.muted,
                                ),
                              ),
                      ),
                    ),
                    Expanded(child: Container(width: 2, color: last ? Colors.transparent : Lc.line)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '${c['title']}',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          color: active ? Lc.primary : (done ? Lc.muted : Lc.text),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text('${titleCase('${c['content_type']}')}${mins > 0 ? ' · $mins min' : ''}', style: Lc.small),
                    ],
                  ),
                ),
              ),
              Icon(contentIcon('${c['content_type']}'), size: 20, color: active ? Lc.primary : Lc.faint),
            ],
          ),
        ),
      ),
    );
  }

  Widget _quizTile(Json q) {
    final id = LmsService.n(q['id']).toInt();
    final atts = _attemptsFor(id);
    final passed = atts.any((a) => a['is_passed'] == true);
    final max = LmsService.n(q['max_attempts']).toInt().clamp(1, 99);
    final best = atts.isEmpty ? null : atts.map((a) => LmsService.n(a['score'])).reduce((a, b) => a > b ? a : b);
    final locked = !_allLessonsDone;
    final exhausted = !passed && atts.length >= max;
    final (String status, Color color) = passed
        ? ('Passed', Lc.success)
        : exhausted
        ? ('No attempts left', Lc.danger)
        : locked
        ? ('Locked', Lc.muted)
        : ('Ready', Lc.primary);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: LmsCard(
        padding: const EdgeInsets.all(12),
        onTap: () => _openQuiz(q),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: locked ? Lc.bg : Lc.primarySoft,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                locked ? Icons.lock_outline_rounded : Icons.quiz_outlined,
                color: locked ? Lc.faint : Lc.primary,
                size: 21,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${q['title']}', style: Lc.h3),
                  const SizedBox(height: 2),
                  Text(
                    '${LmsService.n(q['questions_count'])} questions · Pass ${LmsService.n(q['pass_marks'])}% · ${atts.length}/$max attempts'
                    '${best != null ? ' · Best ${best.round()}%' : ''}',
                    style: Lc.small,
                  ),
                  if (locked) ...[
                    const SizedBox(height: 4),
                    const Text(
                      'Complete all lessons to unlock',
                      style: TextStyle(fontSize: 12, color: Lc.warning, fontWeight: FontWeight.w600),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            Pill(status, color: color),
          ],
        ),
      ),
    );
  }

  Widget _assignmentTile(Json a) {
    final sub = _submissions[LmsService.n(a['id']).toInt()];
    final status = '${sub?['status'] ?? 'not submitted'}';
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: LmsCard(
        padding: const EdgeInsets.all(12),
        onTap: () => _openAssignment(a),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(color: Lc.tealSoft, borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.upload_file_outlined, color: Lc.teal, size: 21),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${a['title']}', style: Lc.h3),
                  const SizedBox(height: 2),
                  Text(
                    'Due ${fmtDate(a['due_date'])} · ${LmsService.n(a['max_marks'])} marks'
                    '${sub?['marks_obtained'] != null ? ' · Scored ${LmsService.n(sub!['marks_obtained'])}' : ''}',
                    style: Lc.small,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Pill(titleCase(status), color: sub == null ? Lc.muted : statusColor(status)),
          ],
        ),
      ),
    );
  }

  Widget _certificateBanner() {
    final url = LmsService.mediaUrl(_certificate!['certificate_file_url'] ?? _certificate!['certificate_file']);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: LmsCard(
        color: Lc.warningSoft,
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Lc.surface,
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
                  const Text('Certificate earned', style: Lc.h3),
                  const SizedBox(height: 2),
                  Text(
                    '${_certificate!['certificate_number'] ?? ''} · ${fmtDate(_certificate!['issue_date'])}',
                    style: Lc.small,
                  ),
                ],
              ),
            ),
            if (url != null)
              TextButton(
                onPressed: () => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication),
                style: TextButton.styleFrom(foregroundColor: Lc.warning),
                child: const Text('Download', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Inline video / audio player
// ---------------------------------------------------------------------------
class _LessonVideo extends StatefulWidget {
  const _LessonVideo({super.key, required this.url, required this.title, this.audio = false});
  final String url, title;
  final bool audio;

  @override
  State<_LessonVideo> createState() => _LessonVideoState();
}

class _LessonVideoState extends State<_LessonVideo> {
  late final VideoPlayerController _c = VideoPlayerController.networkUrl(Uri.parse(widget.url));
  bool _ready = false, _failed = false, _controls = true;

  @override
  void initState() {
    super.initState();
    _c
        .initialize()
        .then((_) {
          if (mounted) setState(() => _ready = true);
        })
        .catchError((_) {
          if (mounted) setState(() => _failed = true);
        });
    _c.addListener(_tick);
  }

  void _tick() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _c.removeListener(_tick);
    _c.dispose();
    super.dispose();
  }

  String _fmt(Duration d) =>
      '${d.inMinutes.toString().padLeft(2, '0')}:${(d.inSeconds % 60).toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    if (_failed) {
      return _DocPreview(
        type: 'video',
        title: widget.title,
        filename: 'Video could not be played inline',
        onOpen: () => launchUrl(Uri.parse(widget.url), mode: LaunchMode.externalApplication),
      );
    }
    final ratio = _ready && !widget.audio && _c.value.aspectRatio > 0 ? _c.value.aspectRatio : 16 / 9;
    return AspectRatio(
      aspectRatio: ratio < 1 ? 1 : ratio,
      child: Container(
        color: Colors.black,
        child: !_ready
            ? const Center(child: CircularProgressIndicator(color: Colors.white))
            : GestureDetector(
                onTap: () => setState(() => _controls = !_controls),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (widget.audio)
                      Container(
                        decoration: const BoxDecoration(gradient: LinearGradient(colors: lmsGradient)),
                        child: const Icon(Icons.graphic_eq_rounded, color: Colors.white54, size: 90),
                      )
                    else
                      Center(
                        child: AspectRatio(aspectRatio: _c.value.aspectRatio, child: VideoPlayer(_c)),
                      ),
                    AnimatedOpacity(
                      opacity: _controls || !_c.value.isPlaying ? 1 : 0,
                      duration: const Duration(milliseconds: 200),
                      child: Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Colors.transparent, Colors.black54],
                          ),
                        ),
                        child: Stack(
                          children: [
                            Center(
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _round(
                                    Icons.replay_10_rounded,
                                    () => _c.seekTo(_c.value.position - const Duration(seconds: 10)),
                                  ),
                                  const SizedBox(width: 18),
                                  _round(
                                    _c.value.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                                    () => _c.value.isPlaying ? _c.pause() : _c.play(),
                                    big: true,
                                  ),
                                  const SizedBox(width: 18),
                                  _round(
                                    Icons.forward_10_rounded,
                                    () => _c.seekTo(_c.value.position + const Duration(seconds: 10)),
                                  ),
                                ],
                              ),
                            ),
                            Positioned(
                              left: 12,
                              right: 4,
                              bottom: 4,
                              child: Row(
                                children: [
                                  Text(
                                    '${_fmt(_c.value.position)} / ${_fmt(_c.value.duration)}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: VideoProgressIndicator(
                                      _c,
                                      allowScrubbing: true,
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                      colors: const VideoProgressColors(
                                        playedColor: Color(0xFF818CF8),
                                        bufferedColor: Colors.white38,
                                        backgroundColor: Colors.white24,
                                      ),
                                    ),
                                  ),
                                  if (!widget.audio)
                                    IconButton(
                                      onPressed: _fullscreen,
                                      icon: const Icon(Icons.fullscreen_rounded, color: Colors.white),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _round(IconData i, VoidCallback onTap, {bool big = false}) => Material(
    color: Colors.white.withValues(alpha: big ? 0.95 : 0.2),
    shape: const CircleBorder(),
    child: InkWell(
      customBorder: const CircleBorder(),
      onTap: onTap,
      child: Padding(
        padding: EdgeInsets.all(big ? 14 : 10),
        child: Icon(i, size: big ? 34 : 24, color: big ? lmsPrimary : Colors.white),
      ),
    ),
  );

  Future<void> _fullscreen() async {
    await SystemChrome.setPreferredOrientations([DeviceOrientation.landscapeLeft, DeviceOrientation.landscapeRight]);
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    if (!mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          body: GestureDetector(
            onTap: () => _c.value.isPlaying ? _c.pause() : _c.play(),
            child: Stack(
              children: [
                Center(
                  child: AspectRatio(aspectRatio: _c.value.aspectRatio, child: VideoPlayer(_c)),
                ),
                Positioned(
                  left: 16,
                  right: 16,
                  bottom: 12,
                  child: VideoProgressIndicator(
                    _c,
                    allowScrubbing: true,
                    colors: const VideoProgressColors(
                      playedColor: Color(0xFF818CF8),
                      bufferedColor: Colors.white38,
                      backgroundColor: Colors.white24,
                    ),
                  ),
                ),
                SafeArea(
                  child: IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.fullscreen_exit_rounded, color: Colors.white, size: 30),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  }
}

class _DocPreview extends StatelessWidget {
  const _DocPreview({required this.type, required this.title, required this.filename, required this.onOpen});
  final String type, title, filename;
  final VoidCallback? onOpen;

  @override
  Widget build(BuildContext context) {
    final isLink = type == 'link' || type == 'scorm';
    return Container(
      height: 190,
      decoration: const BoxDecoration(gradient: LinearGradient(colors: Lc.hero)),
      child: Stack(
        children: [
          Positioned(
            right: -30,
            top: -30,
            child: Icon(contentIcon(type), size: 180, color: Colors.white.withValues(alpha: 0.06)),
          ),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(contentIcon(type), color: Colors.white, size: 46),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Text(
                    filename.isNotEmpty ? filename : title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12),
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: onOpen,
                  style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: lmsPrimary),
                  icon: Icon(isLink ? Icons.open_in_new_rounded : Icons.visibility_rounded),
                  label: Text(
                    onOpen == null ? 'No file attached' : (isLink ? 'Open link' : 'Open ${type.toUpperCase()}'),
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Review (allowed once a certificate exists — backend enforces this)
// ---------------------------------------------------------------------------
class _ReviewCard extends StatefulWidget {
  const _ReviewCard({required this.courseId, required this.onDone});
  final int courseId;
  final VoidCallback onDone;

  @override
  State<_ReviewCard> createState() => _ReviewCardState();
}

class _ReviewCardState extends State<_ReviewCard> {
  final _text = TextEditingController();
  int _rating = 5;
  bool _saving = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _saving = true);
    final r = await LmsService.submitReview(widget.courseId, _rating, _text.text.trim());
    if (!mounted) return;
    setState(() => _saving = false);
    lmsToast(
      context,
      r.success ? 'Thanks for your feedback!' : r.message ?? 'Failed to save review',
      error: !r.success,
    );
    if (r.success) widget.onDone();
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(14, 12, 14, 0),
    child: LmsCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Rate this course', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          const SizedBox(height: 6),
          Row(
            children: [
              for (var i = 1; i <= 5; i++)
                GestureDetector(
                  onTap: () => setState(() => _rating = i),
                  child: Padding(
                    padding: const EdgeInsets.only(right: 4),
                    child: AnimatedScale(
                      scale: i <= _rating ? 1.1 : 1,
                      duration: const Duration(milliseconds: 150),
                      child: Icon(
                        i <= _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                        color: const Color(0xFFF59E0B),
                        size: 34,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _text,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'What did you like? What could be better?',
              filled: true,
              fillColor: Lc.bg,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _saving ? null : _submit,
              style: FilledButton.styleFrom(backgroundColor: lmsPrimary, minimumSize: const Size.fromHeight(44)),
              child: Text(_saving ? 'Saving…' : 'Submit review', style: const TextStyle(fontWeight: FontWeight.w800)),
            ),
          ),
        ],
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Assignment details + upload
// ---------------------------------------------------------------------------
class _AssignmentSheet extends StatefulWidget {
  const _AssignmentSheet({required this.assignment, this.submission});
  final Json assignment;
  final Json? submission;

  @override
  State<_AssignmentSheet> createState() => _AssignmentSheetState();
}

class _AssignmentSheetState extends State<_AssignmentSheet> {
  PlatformFile? _file;
  bool _saving = false;

  Future<void> _pick() async {
    final r = await FilePicker.platform.pickFiles();
    if (r != null && r.files.single.path != null) setState(() => _file = r.files.single);
  }

  Future<void> _upload() async {
    if (_file?.path == null) return;
    setState(() => _saving = true);
    final r = await LmsService.submitAssignment(
      assignment: LmsService.n(widget.assignment['id']).toInt(),
      filePath: _file!.path!,
      existingId: widget.submission == null ? null : LmsService.n(widget.submission!['id']).toInt(),
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (!r.success) return lmsToast(context, r.message ?? 'File upload failed', error: true);
    lmsToast(context, 'Submission uploaded');
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.assignment;
    final s = widget.submission;
    final subUrl = LmsService.mediaUrl(s?['submitted_file_url'] ?? s?['submitted_file']);
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      padding: EdgeInsets.fromLTRB(18, 10, 18, 22 + MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(color: Colors.black12, borderRadius: BorderRadius.circular(9)),
              ),
            ),
            const SizedBox(height: 14),
            Text('${a['title']}', style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              children: [
                Pill('Due ${fmtDate(a['due_date'])}', color: const Color(0xFFD97706), icon: Icons.event_rounded),
                Pill('${LmsService.n(a['max_marks'])} marks', color: lmsPrimary),
              ],
            ),
            if ('${a['description'] ?? ''}'.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text('${a['description']}', style: const TextStyle(height: 1.45, color: Lc.muted)),
            ],
            if (s != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Lc.bg, borderRadius: BorderRadius.circular(14)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text('Your submission', style: TextStyle(fontWeight: FontWeight.w800)),
                        const Spacer(),
                        Pill(titleCase('${s['status']}'), color: statusColor('${s['status']}')),
                      ],
                    ),
                    if (s['marks_obtained'] != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        'Marks: ${LmsService.n(s['marks_obtained'])} / ${LmsService.n(a['max_marks'])}',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ],
                    if ('${s['trainer_comments'] ?? ''}'.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text('"${s['trainer_comments']}"', style: const TextStyle(fontStyle: FontStyle.italic)),
                    ],
                    if (subUrl != null)
                      TextButton.icon(
                        onPressed: () => launchUrl(Uri.parse(subUrl), mode: LaunchMode.externalApplication),
                        icon: const Icon(Icons.attach_file_rounded),
                        label: const Text('View submitted file'),
                      ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 14),
            OutlinedButton.icon(
              onPressed: _pick,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
                side: BorderSide(color: lmsPrimary.withValues(alpha: 0.4), style: BorderStyle.solid),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              icon: const Icon(Icons.attach_file_rounded),
              label: Text(
                _file?.name ?? (s == null ? 'Choose file' : 'Choose a new file to resubmit'),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: _file == null || _saving ? null : _upload,
              style: FilledButton.styleFrom(
                backgroundColor: lmsPrimary,
                minimumSize: const Size.fromHeight(50),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              icon: _saving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.cloud_upload_rounded),
              label: Text(s == null ? 'Submit' : 'Resubmit', style: const TextStyle(fontWeight: FontWeight.w800)),
            ),
          ],
        ),
      ),
    );
  }
}
