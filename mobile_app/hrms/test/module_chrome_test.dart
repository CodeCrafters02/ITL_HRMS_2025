import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms/pages/employee/lms/lms_home_page.dart';
import 'package:hrms/pages/employee/pms/pms_home_page.dart';
import 'package:hrms/widgets/glass_chrome.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  final pages = <String, Widget>{'learning': const LmsHomePage(), 'performance': const PmsHomePage()};
  for (final size in const [Size(360, 640), Size(412, 915)]) {
    for (final e in pages.entries) {
      testWidgets('${e.key} header + nav render without overflow at $size', (tester) async {
        SharedPreferences.setMockInitialValues({'first_name': 'Srilaxmi'});
        tester.view.physicalSize = size * 3;
        tester.view.devicePixelRatio = 3;
        addTearDown(tester.view.reset);
        await tester.pumpWidget(MaterialApp(home: e.value));
        for (var i = 0; i < 5; i++) {
          await tester.pump(const Duration(milliseconds: 200));
        }
        expect(tester.takeException(), isNull);
        expect(find.byType(GlassHeader), findsOneWidget);
        expect(find.byType(GlassBottomNav), findsOneWidget);
        // switch through every tab
        for (final label in e.key == 'learning'
            ? ['Explore', 'Achievements', 'Requests', 'My Learning']
            : ['Goals', 'Feedback', 'Appraisal', 'Overview']) {
          await tester.tap(find.descendant(of: find.byType(GlassBottomNav), matching: find.text(label)));
          await tester.pump(const Duration(milliseconds: 300));
          expect(tester.takeException(), isNull, reason: 'tab $label');
        }
        await tester.pumpWidget(const SizedBox());
      });
    }
  }
}
