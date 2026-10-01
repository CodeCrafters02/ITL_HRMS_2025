import 'dart:async';

import 'package:flutter/material.dart';
import '../../widgets/stitch_background.dart';
import '../../utils/performance_helper.dart';

import '../../services/storage_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/session_dialogs.dart';

class _HubCard {
  const _HubCard({
    required this.label,
    required this.subtitle,
    required this.description,
    required this.icon,
    required this.gradient,
    required this.route,
    required this.available,
    required this.features,
  });

  final String label;
  final String subtitle;
  final String description;
  final IconData icon;
  final List<Color> gradient;
  final String route;
  final bool available;
  final List<String> features;
}

const List<_HubCard> _cards = [
  _HubCard(
    label: 'Employee Dashboard',
    subtitle: 'Core Operations & Tasks',
    description:
        'Manage your daily work check-in/out, view assigned tasks, submit leave requests, download monthly payslips, and check company announcements.',
    icon: Icons.groups_rounded,
    gradient: [Color(0xFF2563EB), Color(0xFF4F46E5)],
    route: '/employee/dashboard',
    available: true,
    features: ['Attendance Check-in', 'Leave Application', 'My Tasks & Work logs', 'Download Payslips'],
  ),
  _HubCard(
    label: 'Performance Management',
    subtitle: 'Goals, KPIs & Reviews',
    description:
        'Track your Objectives & Key Results (OKRs), view active KPIs, fill out self-appraisal cycles, and review constructive feedback from your managers.',
    icon: Icons.trending_up_rounded,
    gradient: [Color(0xFF10B981), Color(0xFF0D9488)],
    route: '/employee/performance',
    available: true,
    features: ['My OKRs & KPIs', 'Self-Appraisal Forms', 'Manager Review feedback', 'Training recommendations'],
  ),
  _HubCard(
    label: 'Learning Management',
    subtitle: 'Training & Skill Dev',
    description:
        'Browse assigned training courses, watch video and document lessons, attempt quizzes, and download your earned completion certificates.',
    icon: Icons.menu_book_rounded,
    gradient: [Color(0xFF8B5CF6), Color(0xFF9333EA)],
    route: '/employee/learning-management',
    available: true,
    features: ['Assigned Courses', 'Quizzes & Grading', 'Progress Tracking', 'PDF Certificates'],
  ),
];

class EmployeeHubPage extends StatefulWidget {
  const EmployeeHubPage({super.key});

  @override
  State<EmployeeHubPage> createState() => _EmployeeHubPageState();
}

class _EmployeeHubPageState extends State<EmployeeHubPage> {
  DateTime _now = DateTime.now();
  Timer? _timer;
  String _name = 'Employee';

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
    _loadName();
  }

  Future<void> _loadName() async {
    final n = (await StorageService.getFirstName())?.trim();
    final u = (await StorageService.getUsername())?.trim();
    final raw = (n != null && n.isNotEmpty) ? n : (u ?? 'Employee');
    if (!mounted) return;
    setState(() => _name = raw.isEmpty ? 'Employee' : raw[0].toUpperCase() + raw.substring(1));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  ({String text, String emoji}) get _greeting {
    final h = _now.hour;
    if (h < 12) return (text: 'Good Morning', emoji: '☀️');
    if (h < 18) return (text: 'Good Afternoon', emoji: '🌤️');
    return (text: 'Good Evening', emoji: '🌙');
  }

  String get _dateStr {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${days[_now.weekday - 1]}, ${months[_now.month - 1]} ${_now.day}, ${_now.year}';
  }

  String get _timeStr {
    final h12 = _now.hour % 12 == 0 ? 12 : _now.hour % 12;
    String two(int v) => v.toString().padLeft(2, '0');
    final ampm = _now.hour < 12 ? 'AM' : 'PM';
    return '${two(h12)}:${two(_now.minute)}:${two(_now.second)} $ampm';
  }

  void _onCardTap(_HubCard card) {
    if (card.available) {
      Navigator.pushNamed(context, card.route);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${card.label} — Coming Soon')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final g = _greeting;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) confirmExitApp(context);
      },
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: StitchBackground(
          enableAnimations: PerformanceHelper.enableParticles,
          child: SafeArea(
            child: LayoutBuilder(
              builder: (context, box) {
                // Everything fits on one screen; only very short screens (landscape / split view) scroll.
                final compact = box.maxHeight < 560;
                final content = Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _topBar(g),
                      const SizedBox(height: 14),
                      _heroCard(),
                      const SizedBox(height: 18),
                      const Padding(
                        padding: EdgeInsets.only(left: 4, bottom: 10),
                        child: Text(
                          'YOUR WORKSPACES',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.2,
                            color: AppStitchTheme.lightOnSurfaceVariant,
                          ),
                        ),
                      ),
                      for (var i = 0; i < _cards.length; i++) ...[
                        if (i > 0) const SizedBox(height: 12),
                        compact
                            ? SizedBox(height: 118, child: _hubTile(_cards[i]))
                            : Expanded(child: _hubTile(_cards[i])),
                      ],
                    ],
                  ),
                );
                return compact ? SingleChildScrollView(child: content) : content;
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _topBar(({String text, String emoji}) g) {
    final initial = _name.isEmpty ? 'E' : _name[0].toUpperCase();
    return Row(
      children: [
        Container(
          width: 46,
          height: 46,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF7C3AED)]),
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: [BoxShadow(color: const Color(0xFF4F46E5).withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))],
          ),
          child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${g.text} ${g.emoji}',
                style: const TextStyle(color: AppStitchTheme.lightOnSurfaceVariant, fontSize: 12.5, fontWeight: FontWeight.w600),
              ),
              Text(
                _name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppStitchTheme.lightOnSurface, fontSize: 20, fontWeight: FontWeight.w900, letterSpacing: -0.3),
              ),
            ],
          ),
        ),
        _glassCircle(const LogoutButton(color: Color(0xFFDC2626))),
      ],
    );
  }

  Widget _glassCircle(Widget child) => Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.7),
          border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.78)),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        child: child,
      );

  Widget _heroCard() {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF2563EB), Color(0xFF4F46E5), Color(0xFF7C3AED)],
        ),
        boxShadow: [BoxShadow(color: const Color(0xFF4F46E5).withValues(alpha: 0.28), blurRadius: 20, offset: const Offset(0, 10))],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            right: -30,
            top: -40,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.08)),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(999)),
                      child: const Text(
                        'PEOPLE SUITE',
                        style: TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w800, letterSpacing: 1.4),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'ITL Employee Hub',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.4),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _dateStr,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.78), fontSize: 12.5, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.schedule_rounded, color: Colors.white70, size: 16),
                    const SizedBox(height: 4),
                    Text(
                      _timeStr.substring(0, 5),
                      style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 1),
                    ),
                    Text(
                      _timeStr.substring(_timeStr.length - 2),
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 11, fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _hubTile(_HubCard card) {
    final r = BorderRadius.circular(22);
    return Container(
      decoration: BoxDecoration(
        borderRadius: r,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withValues(alpha: 0.78),
            AppStitchTheme.accentBlue.withValues(alpha: 0.10),
            Colors.white.withValues(alpha: 0.62),
          ],
          stops: const [0.0, 0.55, 1.0],
        ),
        border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.78)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.10), blurRadius: 24, offset: const Offset(0, 12)),
          BoxShadow(color: Colors.white.withValues(alpha: 0.26), blurRadius: 18, offset: const Offset(0, 1)),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: r,
          onTap: () => _onCardTap(card),
          child: LayoutBuilder(
            builder: (context, box) {
              final roomy = box.maxHeight >= 132;
              return Stack(
                children: [
                  Positioned(
                    left: 0,
                    top: 18,
                    bottom: 18,
                    child: Container(
                      width: 4,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: card.gradient, begin: Alignment.topCenter, end: Alignment.bottomCenter),
                        borderRadius: const BorderRadius.horizontal(right: Radius.circular(4)),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(18, 12, 14, 12),
                    child: Row(
                      children: [
                        Container(
                          width: roomy ? 58 : 48,
                          height: roomy ? 58 : 48,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(colors: card.gradient),
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [BoxShadow(color: card.gradient.first.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 6))],
                          ),
                          child: Icon(card.icon, color: Colors.white, size: roomy ? 30 : 26),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                card.subtitle.toUpperCase(),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(color: card.gradient.first, fontSize: 10.5, fontWeight: FontWeight.w800, letterSpacing: 1.1),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                card.label,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: AppStitchTheme.lightOnSurface, fontSize: 17, fontWeight: FontWeight.w900),
                              ),
                              if (roomy) ...[
                                const SizedBox(height: 6),
                                Text(
                                  card.features.join('  ·  '),
                                  maxLines: box.maxHeight >= 150 ? 2 : 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: AppStitchTheme.lightOnSurfaceVariant,
                                    fontSize: 12,
                                    height: 1.4,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        card.available
                            ? Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(gradient: LinearGradient(colors: card.gradient), shape: BoxShape.circle),
                                child: const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 20),
                              )
                            : const Text(
                                'Soon',
                                style: TextStyle(color: Color(0xFFB45309), fontSize: 12, fontWeight: FontWeight.w800),
                              ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
