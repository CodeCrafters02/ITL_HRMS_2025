import 'package:flutter/material.dart';
import '../../../widgets/stitch_background.dart';
import '../../../utils/performance_helper.dart';

import '../../../widgets/session_dialogs.dart';
import '../../../widgets/glass_chrome.dart';
import '../../../theme/app_stitch_theme.dart';
import 'pms_appraisal_tab.dart';
import 'pms_feedback_tab.dart';
import 'pms_goals_tab.dart';
import 'pms_overview_tab.dart';

/// Employee Performance Management — mobile counterpart of the web
/// `/employee/performance/*` pages (dashboard, KRAs, feedback, appraisal).
class PmsHomePage extends StatefulWidget {
  const PmsHomePage({super.key});

  @override
  State<PmsHomePage> createState() => PmsHomePageState();
}

class PmsHomePageState extends State<PmsHomePage> {
  int _tab = 0;
  final _keys = [GlobalKey(), GlobalKey(), GlobalKey(), GlobalKey()];

  static const _titles = ['Overview', 'Goals & KRAs', 'Feedback', 'Appraisal'];

  void goTo(int tab) => setState(() => _tab = tab);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppStitchTheme.lightScaffold,
      body: StitchBackground(
        enableAnimations: PerformanceHelper.enableParticles,
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              GlassHeader(
                title: 'Performance',
                subtitle: _titles[_tab],
                icon: Icons.insights_rounded,
                actions: [
                  GlassIconButton(
                    icon: Icons.logout_rounded,
                    tooltip: 'Log out',
                    color: const Color(0xFFDC2626),
                    onTap: () => confirmLogout(context),
                  ),
                ],
              ),
              Expanded(
                child: IndexedStack(
                  index: _tab,
                  children: [
                    PmsOverviewTab(key: _keys[0], onNavigate: goTo),
                    PmsGoalsTab(key: _keys[1]),
                    PmsFeedbackTab(key: _keys[2]),
                    PmsAppraisalTab(key: _keys[3]),
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
        items: const [
          GlassNavItem(Icons.insights_outlined, 'Overview', activeIcon: Icons.insights_rounded),
          GlassNavItem(Icons.track_changes_outlined, 'Goals', activeIcon: Icons.track_changes_rounded),
          GlassNavItem(Icons.forum_outlined, 'Feedback', activeIcon: Icons.forum_rounded),
          GlassNavItem(Icons.fact_check_outlined, 'Appraisal', activeIcon: Icons.fact_check_rounded),
        ],
      ),
    );
  }
}
