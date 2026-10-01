import 'package:flutter/material.dart';

import 'pms_appraisal_tab.dart';
import 'pms_feedback_tab.dart';
import 'pms_goals_tab.dart';
import 'pms_overview_tab.dart';
import 'pms_widgets.dart';

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
    Widget icon(IconData i, Color c) => Icon(i, color: c);
    return Scaffold(
      backgroundColor: Lc.bg,
      appBar: AppBar(
        backgroundColor: Lc.surface,
        surfaceTintColor: Colors.transparent,
        foregroundColor: Lc.ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 4,
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('PERFORMANCE', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Lc.faint, letterSpacing: 1.2)),
          Text(_titles[_tab], style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Lc.ink)),
        ]),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(1), child: Divider(height: 1, color: Lc.line)),
      ),
      body: IndexedStack(index: _tab, children: [
        PmsOverviewTab(key: _keys[0], onNavigate: goTo),
        PmsGoalsTab(key: _keys[1]),
        PmsFeedbackTab(key: _keys[2]),
        PmsAppraisalTab(key: _keys[3]),
      ]),
      bottomNavigationBar: DecoratedBox(
        decoration: const BoxDecoration(border: Border(top: BorderSide(color: Lc.line))),
        child: NavigationBarTheme(
          data: NavigationBarThemeData(
            labelTextStyle: WidgetStateProperty.resolveWith(
              (s) => TextStyle(
                fontSize: 11.5,
                fontWeight: s.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500,
                color: s.contains(WidgetState.selected) ? Pc.primary : Lc.muted,
              ),
            ),
          ),
          child: NavigationBar(
            selectedIndex: _tab,
            onDestinationSelected: goTo,
            height: 66,
            backgroundColor: Lc.surface,
            surfaceTintColor: Colors.transparent,
            indicatorColor: Pc.primarySoft,
            elevation: 0,
            destinations: [
              NavigationDestination(
                icon: icon(Icons.insights_outlined, Lc.muted),
                selectedIcon: icon(Icons.insights_rounded, Pc.primary),
                label: 'Overview',
              ),
              NavigationDestination(
                icon: icon(Icons.track_changes_outlined, Lc.muted),
                selectedIcon: icon(Icons.track_changes_rounded, Pc.primary),
                label: 'Goals',
              ),
              NavigationDestination(
                icon: icon(Icons.forum_outlined, Lc.muted),
                selectedIcon: icon(Icons.forum_rounded, Pc.primary),
                label: 'Feedback',
              ),
              NavigationDestination(
                icon: icon(Icons.fact_check_outlined, Lc.muted),
                selectedIcon: icon(Icons.fact_check_rounded, Pc.primary),
                label: 'Appraisal',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
