import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms/pages/employee/employee_hub_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  for (final size in const [Size(360, 640), Size(360, 740), Size(393, 852), Size(412, 915), Size(640, 360)]) {
    testWidgets('hub fits without overflow at $size', (tester) async {
      SharedPreferences.setMockInitialValues({'first_name': 'Srilaxmi'});
      tester.view.physicalSize = size * 3;
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(const MaterialApp(home: EmployeeHubPage()));
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.takeException(), isNull);
      expect(find.text('ITL Employee Hub'), findsOneWidget);
      final scrolls = find.byType(SingleChildScrollView);
      expect(scrolls, size.height < 600 ? findsWidgets : findsNothing, reason: 'no scrolling on normal phones');
      await tester.pumpWidget(const SizedBox());
    });
  }
}
