import 'dart:async';

import 'package:flutter/material.dart';

import '../../services/storage_service.dart';
import '../../theme/app_stitch_theme.dart';

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
    features: [
      'Attendance Check-in',
      'Leave Application',
      'My Tasks & Work logs',
      'Download Payslips',
    ],
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
    features: [
      'My OKRs & KPIs',
      'Self-Appraisal Forms',
      'Manager Review feedback',
      'Training recommendations',
    ],
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
    features: [
      'Assigned Courses',
      'Quizzes & Grading',
      'Progress Tracking',
      'PDF Certificates',
    ],
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${card.label} — Coming Soon')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final g = _greeting;
    return Scaffold(
      backgroundColor: AppStitchTheme.lightScaffold,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _welcomeCard(g),
              const SizedBox(height: 20),
              ..._cards.map((c) => Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _hubCard(c),
                  )),
            ],
          ),
        ),
      ),
    );
  }

  Widget _welcomeCard(({String text, String emoji}) g) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [Color(0xFF2563EB), Color(0xFF4F46E5), Color(0xFF9333EA)],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4F46E5).withValues(alpha: 0.25),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      padding: const EdgeInsets.all(22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              '${g.emoji}  ${g.text}, $_name',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 12,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'ITL Employee Hub',
            style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -0.5),
          ),
          const SizedBox(height: 8),
          Text(
            'Access your employee dashboard to check in, apply for leaves, download monthly payslips, or track your OKRs and performance.',
            style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13, height: 1.5),
          ),
          const SizedBox(height: 18),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _dateStr.toUpperCase(),
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1),
                ),
                const SizedBox(height: 2),
                Text(
                  _timeStr,
                  style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 2),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _hubCard(_HubCard card) {
    return GestureDetector(
      onTap: () => _onCardTap(card),
      child: Container(
        decoration: BoxDecoration(
          color: AppStitchTheme.lightSurfaceElevated,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.6)),
          boxShadow: [
            BoxShadow(
              color: card.gradient.first.withValues(alpha: 0.10),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(height: 5, decoration: BoxDecoration(gradient: LinearGradient(colors: card.gradient))),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: card.gradient),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(color: card.gradient.first.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 6)),
                      ],
                    ),
                    child: Icon(card.icon, color: Colors.white, size: 30),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    card.subtitle.toUpperCase(),
                    style: TextStyle(color: card.gradient.first, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    card.label,
                    style: const TextStyle(color: AppStitchTheme.lightOnSurface, fontSize: 20, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    card.description,
                    style: const TextStyle(color: AppStitchTheme.lightOnSurfaceMuted, fontSize: 13, height: 1.5),
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 12,
                    runSpacing: 10,
                    children: card.features
                        .map((f) => SizedBox(
                              width: (MediaQuery.of(context).size.width - 32 - 40 - 12) / 2,
                              child: Row(
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: BoxDecoration(color: card.gradient.first, shape: BoxShape.circle),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      f,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(color: AppStitchTheme.lightOnSurfaceVariant, fontSize: 12),
                                    ),
                                  ),
                                ],
                              ),
                            ))
                        .toList(),
                  ),
                  const SizedBox(height: 18),
                  card.available
                      ? Row(
                          children: [
                            ShaderMask(
                              shaderCallback: (b) => LinearGradient(colors: card.gradient).createShader(b),
                              child: const Text(
                                'Launch System',
                                style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Icon(Icons.arrow_forward_rounded, size: 18, color: card.gradient.last),
                          ],
                        )
                      : Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: const Color(0xFFFDE68A)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.circle, size: 8, color: Color(0xFFF59E0B)),
                              SizedBox(width: 6),
                              Text('Coming Soon', style: TextStyle(color: Color(0xFFB45309), fontSize: 12, fontWeight: FontWeight.w800)),
                            ],
                          ),
                        ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
