import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hrms/pages/auth/register_page.dart';

void main() {
  for (final size in const [Size(360, 640), Size(412, 915)]) {
    testWidgets('registration wizard validates and walks all steps at $size', (tester) async {
      tester.view.physicalSize = size * 3;
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(const MaterialApp(home: RegisterPage()));
      await tester.pump();

      Future<void> next() async {
        await tester.tap(find.text('Continue'));
        await tester.pump(const Duration(milliseconds: 400));
      }

      // Step 1: empty → validation errors, stays on step 1
      await next();
      expect(find.text('First name is required'), findsOneWidget);
      expect(find.textContaining('Step 1 of 4'), findsOneWidget);

      Future<void> type(String label, String v) async {
        final f = find.widgetWithText(TextFormField, label);
        await tester.ensureVisible(f);
        await tester.enterText(f, v);
        await tester.pump(const Duration(milliseconds: 500));
      }

      await type('First name *', 'Asha');
      await type('Last name *', 'Rao');
      await tester.ensureVisible(find.text('Female'));
      await tester.pump(const Duration(milliseconds: 500));
      await tester.tap(find.text('Female'));
      // DOB is a picker: set via the form state is not exposed, so pick it through the dialog.
      await tester.ensureVisible(find.text('Select date'));
      await tester.pump(const Duration(milliseconds: 500));
      await tester.tap(find.text('Select date'));
      await tester.pump(const Duration(milliseconds: 600)); await tester.pump(const Duration(milliseconds: 600));
      await tester.tap(find.text('OK'));
      await tester.pump(const Duration(milliseconds: 600)); await tester.pump(const Duration(milliseconds: 600));
      await next();
      expect(find.textContaining('Step 2 of 4'), findsOneWidget);

      await type('Email *', 'asha.rao@example.com');
      await type('Mobile number *', '9876543210');
      await type('Current address *', '12 MG Road, Bengaluru');
      await type('PAN', 'BAD');
      await next();
      expect(find.textContaining('valid PAN'), findsOneWidget);
      await type('PAN', 'ABCDE1234F');
      await next();
      expect(find.textContaining('Step 3 of 4'), findsOneWidget);

      await type('Department *', 'Development');
      await type('Designation / role *', 'Flutter Developer');
      await next();
      expect(find.textContaining('Step 4 of 4'), findsOneWidget);
      expect(find.text('Submit for approval'), findsOneWidget);

      await type('Password *', 'short');
      await type('Confirm password *', 'other');
      await tester.tap(find.text('Submit for approval'));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('At least 8 characters'), findsOneWidget);
      expect(find.text('Passwords do not match'), findsOneWidget);
      expect(find.text('Asha Rao'), findsOneWidget); // review summary
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    });
  }
}
