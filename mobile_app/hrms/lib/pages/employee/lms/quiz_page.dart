import 'dart:async';

import 'package:flutter/material.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_chrome.dart';
import '../../../widgets/stitch_background.dart';
import '../../../utils/performance_helper.dart';
import 'package:flutter/services.dart';

import '../../../services/lms_service.dart';
import 'lms_widgets.dart';

/// Quiz runner — scoring and attempt rules match the web `CourseSyllabusPlayer`.
/// Pops `true` when passed, `false` when submitted but failed, `null` if left untouched.
class QuizPage extends StatefulWidget {
  const QuizPage({super.key, required this.quiz, required this.enrollmentId, required this.previousAttempts});
  final Json quiz;
  final int enrollmentId;
  final List<Json> previousAttempts;

  @override
  State<QuizPage> createState() => _QuizPageState();
}

class _QuizPageState extends State<QuizPage> {
  final _pager = PageController();
  List<Json> _questions = [];
  final Map<int, String> _answers = {};
  bool _loading = true, _started = false, _saving = false;
  String? _error;
  int _index = 0;
  ({int score, bool passed})? _result;
  Timer? _timer;
  Duration _left = Duration.zero;

  Json get q => widget.quiz;
  int get _max => LmsService.n(q['max_attempts']).toInt().clamp(1, 99);
  num get _pass => LmsService.n(q['pass_marks']);
  int get _limitMin => LmsService.n(q['time_limit_minutes']).toInt();
  bool get _alreadyPassed => widget.previousAttempts.any((a) => a['is_passed'] == true);
  bool get _exhausted => widget.previousAttempts.length >= _max;
  bool get _inProgress => _started && _result == null;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pager.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final r = await LmsService.questions(LmsService.n(q['id']).toInt());
    if (!mounted) return;
    setState(() {
      _loading = false;
      _error = r.success ? null : r.message;
      _questions = r.data ?? [];
    });
  }

  void _start() {
    setState(() => _started = true);
    if (_limitMin > 0) {
      _left = Duration(minutes: _limitMin);
      _timer = Timer.periodic(const Duration(seconds: 1), (t) {
        if (!mounted) return t.cancel();
        setState(() => _left -= const Duration(seconds: 1));
        if (_left <= Duration.zero) {
          t.cancel();
          _submit(force: true);
        }
      });
    }
  }

  List<String> _options(Json qn) {
    final o = ((qn['options'] as List?) ?? const []).map((e) => '$e').where((e) => e.trim().isNotEmpty).toList();
    if (o.isEmpty && qn['question_type'] == 'true_false') return const ['True', 'False'];
    return o;
  }

  Future<void> _submit({bool force = false}) async {
    final unanswered = _questions.where((x) => (_answers[LmsService.n(x['id']).toInt()] ?? '').trim().isEmpty).length;
    if (!force && unanswered > 0) {
      lmsToast(context, 'Please answer all questions before submitting ($unanswered left)', error: true);
      final first = _questions.indexWhere((x) => (_answers[LmsService.n(x['id']).toInt()] ?? '').trim().isEmpty);
      if (first >= 0) _pager.animateToPage(first, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
      return;
    }
    num got = 0, total = 0;
    for (final x in _questions) {
      final marks = LmsService.n(x['marks']);
      total += marks;
      final chosen = (_answers[LmsService.n(x['id']).toInt()] ?? '').trim().toLowerCase();
      if (chosen == '${x['correct_answer'] ?? ''}'.trim().toLowerCase()) got += marks;
    }
    final pct = total > 0 ? (got * 100 / total).round() : 100;
    final passed = pct >= _pass;
    _timer?.cancel();
    setState(() => _saving = true);
    final r = await LmsService.submitAttempt(
      assessment: LmsService.n(q['id']).toInt(),
      enrollment: widget.enrollmentId,
      score: pct,
      passed: passed,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (!r.success) {
      lmsToast(context, r.message ?? 'Could not submit attempt', error: true);
      return;
    }
    HapticFeedback.mediumImpact();
    setState(() => _result = (score: pct, passed: passed));
  }

  Future<bool> _confirmLeave() async =>
      await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Leave quiz?'),
          content: const Text('Your answers will be lost and this attempt won\'t be submitted.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Stay')),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Lc.danger),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Leave'),
            ),
          ],
        ),
      ) ??
      false;

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_inProgress,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _confirmLeave() && context.mounted) Navigator.pop(context);
      },
      child: Scaffold(
        backgroundColor: AppStitchTheme.lightScaffold,

        body: StitchBackground(
          enableAnimations: PerformanceHelper.enableParticles,
          child: SafeArea(
            bottom: false,
            child: Column(
              children: [
                GlassHeader(
                  title: 'Quiz',
                  subtitle: '${q['title']}',
                  icon: Icons.quiz_rounded,
                  showHome: false,
                  onBack: () async {
                    if (!_inProgress || await _confirmLeave()) {
                      if (context.mounted) Navigator.pop(context, _result?.passed);
                    }
                  },
                  actions: [
                    if (_inProgress && _limitMin > 0)
                      Pill(
                        '${_left.inMinutes.toString().padLeft(2, '0')}:${(_left.inSeconds % 60).toString().padLeft(2, '0')}',
                        color: _left.inSeconds < 60 ? Lc.danger : lmsPrimary,
                        icon: Icons.timer_rounded,
                      ),
                  ],
                ),
                Expanded(
                  child: _loading
                      ? const Center(child: CircularProgressIndicator(color: lmsPrimary))
                      : _error != null
                      ? ErrorRetry(message: _error!, onRetry: _load)
                      : _result != null
                      ? _resultView()
                      : !_started
                      ? _intro()
                      : _quizView(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _intro() {
    final blocked = _alreadyPassed || _exhausted;
    final best = widget.previousAttempts.isEmpty
        ? null
        : widget.previousAttempts.map((a) => LmsService.n(a['score'])).reduce((a, b) => a > b ? a : b);
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: const LinearGradient(colors: Lc.hero, begin: Alignment.topLeft, end: Alignment.bottomRight),
          ),
          child: Column(
            children: [
              const Icon(Icons.quiz_rounded, color: Colors.white, size: 52),
              const SizedBox(height: 10),
              Text(
                '${q['title']}',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text(
                titleCase('${q['assessment_type'] ?? 'quiz'}'),
                style: TextStyle(color: Colors.white.withValues(alpha: 0.85)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            _fact(Icons.help_outline_rounded, '${_questions.length}', 'Questions'),
            _fact(Icons.flag_rounded, '$_pass%', 'To pass'),
            _fact(Icons.timer_outlined, _limitMin > 0 ? '${_limitMin}m' : '∞', 'Time limit'),
            _fact(Icons.replay_rounded, '${widget.previousAttempts.length}/$_max', 'Attempts'),
          ],
        ),
        if (best != null) ...[
          const SizedBox(height: 12),
          Center(child: Pill('Best score so far: ${best.round()}%', color: _alreadyPassed ? Lc.success : Lc.warning)),
        ],
        const SizedBox(height: 24),
        if (_alreadyPassed)
          _notice(Icons.verified_rounded, 'You\'ve already passed this quiz.', Lc.success)
        else if (_exhausted)
          _notice(Icons.block_rounded, 'You\'ve used all $_max attempts for this quiz.', Lc.danger)
        else if (_questions.isEmpty)
          _notice(Icons.inbox_rounded, 'This quiz has no questions yet.', Lc.muted),
        if (!blocked && _questions.isNotEmpty)
          FilledButton.icon(
            onPressed: _start,
            style: FilledButton.styleFrom(
              backgroundColor: lmsPrimary,
              minimumSize: const Size.fromHeight(54),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Start quiz', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          ),
      ],
    );
  }

  Widget _fact(IconData i, String v, String l) => Expanded(
    child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: Column(
        children: [
          Icon(i, color: lmsPrimary, size: 20),
          const SizedBox(height: 4),
          Text(v, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          Text(l, style: const TextStyle(fontSize: 10.5, color: Lc.muted)),
        ],
      ),
    ),
  );

  Widget _notice(IconData i, String t, Color c) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14)),
    child: Row(
      children: [
        Icon(i, color: c),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            t,
            style: TextStyle(color: c, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    ),
  );

  Widget _quizView() {
    final answered = _answers.values.where((v) => v.trim().isNotEmpty).length;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 4),
          child: Column(
            children: [
              Row(
                children: [
                  Text(
                    'Question ${_index + 1} of ${_questions.length}',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const Spacer(),
                  Text('$answered answered', style: const TextStyle(color: Lc.muted, fontSize: 12.5)),
                ],
              ),
              const SizedBox(height: 8),
              ProgressLine((_index + 1) * 100 / _questions.length),
            ],
          ),
        ),
        Expanded(
          child: PageView.builder(
            controller: _pager,
            itemCount: _questions.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (_, i) => _questionCard(_questions[i]),
          ),
        ),
        SizedBox(
          height: 46,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            itemCount: _questions.length,
            itemBuilder: (_, i) {
              final has = (_answers[LmsService.n(_questions[i]['id']).toInt()] ?? '').trim().isNotEmpty;
              final cur = i == _index;
              return GestureDetector(
                onTap: () =>
                    _pager.animateToPage(i, duration: const Duration(milliseconds: 300), curve: Curves.easeOut),
                child: Container(
                  width: 34,
                  margin: const EdgeInsets.symmetric(horizontal: 3, vertical: 6),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: has ? lmsPrimary : Colors.white,
                    border: Border.all(color: cur ? Lc.ink : Lc.line, width: cur ? 2 : 1),
                  ),
                  child: Center(
                    child: Text(
                      '${i + 1}',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                        color: has ? Colors.white : lmsPrimary,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Row(
              children: [
                if (_index > 0)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () =>
                          _pager.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeOut),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(50),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('Previous'),
                    ),
                  ),
                if (_index > 0) const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: _saving
                        ? null
                        : _index < _questions.length - 1
                        ? () => _pager.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeOut)
                        : _submit,
                    style: FilledButton.styleFrom(
                      backgroundColor: _index < _questions.length - 1 ? lmsPrimary : Lc.success,
                      minimumSize: const Size.fromHeight(50),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _saving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Text(
                            _index < _questions.length - 1 ? 'Next' : 'Submit quiz',
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _questionCard(Json qn) {
    final id = LmsService.n(qn['id']).toInt();
    final opts = _options(qn);
    final isText = qn['question_type'] == 'short_answer' || opts.isEmpty;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Pill(
                    titleCase('${qn['question_type'] ?? 'mcq'}').replaceAll('Mcq', 'Multiple choice'),
                    color: lmsPrimary,
                  ),
                  const Spacer(),
                  Text('${LmsService.n(qn['marks'])} marks', style: const TextStyle(fontSize: 12, color: Lc.muted)),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                '${qn['question_text']}',
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, height: 1.35),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (isText)
          TextFormField(
            initialValue: _answers[id],
            maxLines: 4,
            onChanged: (v) => setState(() => _answers[id] = v),
            decoration: InputDecoration(
              hintText: 'Type your answer',
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            ),
          )
        else
          ...opts.asMap().entries.map((e) {
            final sel = _answers[id] == e.value;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                decoration: BoxDecoration(
                  color: sel ? lmsPrimary : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: sel ? lmsPrimary : Lc.line, width: 1.5),
                  boxShadow: sel
                      ? [
                          BoxShadow(
                            color: lmsPrimary.withValues(alpha: 0.25),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ]
                      : null,
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () {
                    HapticFeedback.selectionClick();
                    setState(() => _answers[id] = e.value);
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: sel ? Colors.white : lmsPrimary.withValues(alpha: 0.08),
                          ),
                          child: Center(
                            child: Text(
                              String.fromCharCode(65 + e.key),
                              style: TextStyle(fontWeight: FontWeight.w800, color: lmsPrimary, fontSize: 13),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            e.value,
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14.5,
                              color: sel ? Colors.white : Lc.ink,
                            ),
                          ),
                        ),
                        if (sel) const Icon(Icons.check_circle_rounded, color: Colors.white),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _resultView() {
    final r = _result!;
    final left = _max - widget.previousAttempts.length - 1;
    final c = r.passed ? Lc.success : Lc.danger;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0.6, end: 1),
              duration: const Duration(milliseconds: 600),
              curve: Curves.elasticOut,
              builder: (_, s, child) => Transform.scale(scale: s, child: child),
              child: Container(
                padding: const EdgeInsets.all(26),
                decoration: BoxDecoration(shape: BoxShape.circle, color: c.withValues(alpha: 0.12)),
                child: Icon(
                  r.passed ? Icons.emoji_events_rounded : Icons.sentiment_dissatisfied_rounded,
                  size: 72,
                  color: c,
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              r.passed ? 'You passed' : 'Not quite there',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text('You scored ${r.score}% (pass mark $_pass%)', style: const TextStyle(fontSize: 15, color: Lc.muted)),
            const SizedBox(height: 18),
            ProgressRing(r.score.toDouble(), size: 110, stroke: 10),
            const SizedBox(height: 18),
            if (r.passed)
              const Text(
                'Your certificate is generated automatically once the course is complete.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Lc.muted),
              )
            else
              Text(
                left > 0
                    ? '$left attempt${left == 1 ? '' : 's'} left — review the lessons and try again.'
                    : 'No attempts left for this quiz.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Lc.muted),
              ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => Navigator.pop(context, r.passed),
              style: FilledButton.styleFrom(
                backgroundColor: lmsPrimary,
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Back to course', style: TextStyle(fontWeight: FontWeight.w800)),
            ),
          ],
        ),
      ),
    );
  }
}
