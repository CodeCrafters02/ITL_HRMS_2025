import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/auth_service.dart';
import '../theme/app_stitch_theme.dart';

/// Shared confirm dialog used for "Exit App?" and "Log out?".
Future<bool> _confirm(
  BuildContext context, {
  required IconData icon,
  required String title,
  required String message,
  required String confirmLabel,
  Color color = AppStitchTheme.primary,
}) async {
  final ok = await showDialog<bool>(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.4),
    builder: (context) => Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.10), blurRadius: 30, offset: const Offset(0, 10))],
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.10), shape: BoxShape.circle),
            child: Icon(icon, color: color, size: 32),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: AppStitchTheme.lightOnSurface,
                  letterSpacing: -0.5,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppStitchTheme.lightOnSurfaceMuted, height: 1.4),
          ),
          const SizedBox(height: 24),
          Row(children: [
            Expanded(
              child: TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(color: AppStitchTheme.lightOutline.withValues(alpha: 0.5)),
                  ),
                ),
                child: const Text(
                  'Stay',
                  style: TextStyle(color: AppStitchTheme.lightOnSurfaceMuted, fontWeight: FontWeight.w700, fontSize: 14),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(true),
                style: ElevatedButton.styleFrom(
                  backgroundColor: color,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: Text(confirmLabel, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
              ),
            ),
          ]),
        ]),
      ),
    ),
  );
  return ok ?? false;
}

/// Asks to exit and closes the app on confirm.
Future<void> confirmExitApp(BuildContext context) async {
  final ok = await _confirm(
    context,
    icon: Icons.exit_to_app_rounded,
    title: 'Exit App?',
    message: 'Are you sure you want to exit the application?',
    confirmLabel: 'Exit',
  );
  if (ok) await SystemNavigator.pop();
}

/// Asks to log out, clears the session and returns to the login screen.
Future<void> confirmLogout(BuildContext context) async {
  final ok = await _confirm(
    context,
    icon: Icons.logout_rounded,
    title: 'Log out?',
    message: 'You will need to sign in again to use the app.',
    confirmLabel: 'Log out',
    color: const Color(0xFFDC2626),
  );
  if (!ok) return;
  await AuthService.logout();
  if (context.mounted) Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
}

/// App-bar logout action.
class LogoutButton extends StatelessWidget {
  const LogoutButton({super.key, this.color});
  final Color? color;

  @override
  Widget build(BuildContext context) => IconButton(
        tooltip: 'Log out',
        onPressed: () => confirmLogout(context),
        icon: Icon(Icons.logout_rounded, color: color),
      );
}

/// Returns to the ITL Employee Hub (the app's first route after login).
void goHome(BuildContext context) {
  final nav = Navigator.of(context);
  var hubInStack = false;
  nav.popUntil((r) {
    if (r.isFirst) hubInStack = true;
    return r.isFirst;
  });
  if (!hubInStack) nav.pushNamedAndRemoveUntil('/employee', (_) => false);
}

/// App-bar "Home" action → ITL Employee Hub.
class HomeButton extends StatelessWidget {
  const HomeButton({super.key, this.color});
  final Color? color;

  @override
  Widget build(BuildContext context) => IconButton(
        tooltip: 'Home',
        onPressed: () => goHome(context),
        icon: Icon(Icons.home_rounded, color: color),
      );
}
