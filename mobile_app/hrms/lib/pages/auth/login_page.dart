import 'dart:math' as math;
import 'dart:ui' show ImageFilter;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/api_config.dart';
import '../../services/auth_service.dart';
import '../../theme/app_stitch_theme.dart';

/// Google SSO login — vector background, floating particles, glassmorphic card.
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

/// Light layout: vector JPG + particles + glass panel + slate text.
class _LoginDesign {
  _LoginDesign._();
  static const Color scaffoldFill = Color(0xFFE8ECF3);
  static const Color textPrimary = Color(0xFF1A2233);
  static const Color textSecondary = Color(0xFF5C6578);
  static const Color textMuted = Color(0xFF6B7588);

  /// Footer line on busy backgrounds (slightly darker than [textMuted]).
  static const Color textFooter = Color(0xFF4A5568);

  /// Stitch-style glass: light frost + hairline rim (see `stitch_login_reference.png`).
  static const double glassRadius = 28;

  /// Hint of Google “G” blue (#4285F4) — keeps the card light, not saturated.
  static const Color _googleGBlue = Color(0xFF4285F4);

  static Color get glassBorder => Color.lerp(
    Colors.white,
    const Color(0xFFDCEBFA),
    0.55,
  )!.withValues(alpha: 0.78);

  static const Color cardShadow = Color(0x181F2937);

  /// Frosted fill: airy white shifted slightly toward Google blue.
  static List<Color> get glassGradientColors => [
    Color.lerp(
      Colors.white.withValues(alpha: 0.44),
      _googleGBlue.withValues(alpha: 0.11),
      0.28,
    )!,
    Color.lerp(
      Colors.white.withValues(alpha: 0.30),
      _googleGBlue.withValues(alpha: 0.075),
      0.22,
    )!,
    Color.lerp(
      Colors.white.withValues(alpha: 0.36),
      _googleGBlue.withValues(alpha: 0.09),
      0.25,
    )!,
  ];
}

class _LoginPageState extends State<LoginPage> {
  bool _isLoading = false;

  Future<void> _openSupport() async {
    try {
      await launchUrl(
        ApiConfig.itSupportMailtoUri,
        mode: LaunchMode.externalApplication,
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open email app.')),
        );
      }
    }
  }

  Future<void> _handleGoogleSignIn() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await AuthService.loginWithGoogle();

      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        if (response.success) {
          final role = response.data?.role.trim().toLowerCase();
          if (role != null && role.isNotEmpty && role != 'employee') {
            await AuthService.logout();
            _showErrorDialog(
              'This account type ($role) isn’t supported in the mobile app yet. Please use the web app.',
            );
            return;
          }
          Navigator.pushNamedAndRemoveUntil(
            context,
            '/employee',
            (route) => false,
          );
        } else {
          _showErrorDialog(response.message ?? 'Sign in failed');
        }
      }
    } catch (e, stackTrace) {
      assert(() {
        debugPrint('loginWithGoogle: $e\n$stackTrace');
        return true;
      }());
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _showErrorDialog(
          kReleaseMode
              ? 'Sign in failed. Please try again.'
              : 'An error occurred: $e',
        );
      }
    }
  }

  void _showBiometricSoon() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Biometric sign-in will be available in a future update.',
          style: TextStyle(color: AppStitchTheme.onSurface),
        ),
        backgroundColor: AppStitchTheme.surfaceElevated,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppStitchTheme.surfaceElevated,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppStitchTheme.outline),
        ),
        title: Text(
          'Sign in',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(color: AppStitchTheme.onSurface),
        ),
        content: Text(
          message,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: AppStitchTheme.onSurfaceVariant,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: _LoginDesign.scaffoldFill,
      body: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.asset(
                  'assets/reference/vector-background.jpg',
                  fit: BoxFit.cover,
                  alignment: Alignment.center,
                  errorBuilder: (context, error, stackTrace) =>
                      const ColoredBox(color: _LoginDesign.scaffoldFill),
                ),
                // Tint + soft color wash (avoids flat white; particles sit on top).
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          AppStitchTheme.primary.withValues(alpha: 0.08),
                          const Color(0xFF6366F1).withValues(alpha: 0.06),
                          const Color(0xFFC7D2FE).withValues(alpha: 0.22),
                          const Color(0xFFEEF2FF).withValues(alpha: 0.35),
                        ],
                        stops: const [0.0, 0.35, 0.72, 1.0],
                      ),
                    ),
                  ),
                ),
                Positioned.fill(
                  child: RepaintBoundary(
                    child: IgnorePointer(child: _LoginParticlesLayer()),
                  ),
                ),
              ],
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 16,
                      ),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 400),
                        child: _glassLoginCard(theme),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
                  child: Column(
                    children: [
                      Text(
                        'Need help accessing your account?',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: _LoginDesign.textFooter,
                          shadows: [
                            Shadow(
                              color: Colors.white.withValues(alpha: 0.85),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                      ),
                      Semantics(
                        button: true,
                        label: 'Contact IT Support by email',
                        child: TextButton(
                          onPressed: _openSupport,
                          child: Text(
                            'Contact IT Support',
                            style: theme.textTheme.labelLarge?.copyWith(
                              color: AppStitchTheme.primary,
                              fontWeight: FontWeight.w600,
                              decoration: TextDecoration.underline,
                              decorationColor: AppStitchTheme.primary
                                  .withValues(alpha: 0.8),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _glassLoginCard(ThemeData theme) {
    final r = _LoginDesign.glassRadius;
    return ClipRRect(
      borderRadius: BorderRadius.circular(r),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 26, sigmaY: 26),
        child: Stack(
          clipBehavior: Clip.hardEdge,
          children: [
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(r),
                  border: Border.all(color: _LoginDesign.glassBorder, width: 1),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: _LoginDesign.glassGradientColors,
                    stops: const [0.0, 0.45, 1.0],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: _LoginDesign.cardShadow,
                      blurRadius: 32,
                      spreadRadius: 0,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(r),
                    ),
                    gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: [
                        Colors.white.withValues(alpha: 0),
                        Color.lerp(
                          Colors.white,
                          _LoginDesign._googleGBlue,
                          0.12,
                        )!.withValues(alpha: 0.28),
                        Colors.white.withValues(alpha: 0),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(28, 32, 28, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(child: _buildLogoMark()),
                  const SizedBox(height: 20),
                  Text(
                    'Innovyx HRMS',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: _LoginDesign.textPrimary,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Human Resource Management System',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: _LoginDesign.textSecondary,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 28),
                  Semantics(
                    button: true,
                    label: 'Sign in with Google',
                    child: SizedBox(
                      height: 52,
                      child: OutlinedButton(
                        onPressed: _isLoading ? null : _handleGoogleSignIn,
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: 0.92),
                          foregroundColor: const Color(0xFF2D2D2D),
                          side: BorderSide(
                            color: Colors.black.withValues(alpha: 0.09),
                          ),
                          elevation: 1,
                          shadowColor: Colors.black.withValues(alpha: 0.12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(26),
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                        ),
                        child: _isLoading
                            ? SizedBox(
                                height: 22,
                                width: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    AppStitchTheme.primary,
                                  ),
                                ),
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  FaIcon(
                                    FontAwesomeIcons.google,
                                    size: 20,
                                    color: AppStitchTheme.primary,
                                  ),
                                  const SizedBox(width: 10),
                                  Text(
                                    'Sign in with Google',
                                    style: theme.textTheme.titleSmall?.copyWith(
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF2D2D2D),
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Quick Access',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: _LoginDesign.textMuted,
                      letterSpacing: 0.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Biometric sign-in coming soon',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: _LoginDesign.textMuted.withValues(alpha: 0.88),
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _QuickChip(
                          icon: Icons.face_retouching_natural,
                          label: 'Face ID',
                          onTap: _showBiometricSoon,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _QuickChip(
                          icon: Icons.fingerprint,
                          label: 'Fingerprint',
                          onTap: _showBiometricSoon,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),
                  Text(
                    'Welcome Back',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: _LoginDesign.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Streamlining your workforce success.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: _LoginDesign.textSecondary,
                      height: 1.4,
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

  /// PEOPLE SUITE / Innovyx mark — white rounded tile + `app_logo.png`.
  Widget _buildLogoMark() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.88),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.65)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 80, maxWidth: 240),
          child: Image.asset(
            'assets/logo/app_logo.png',
            fit: BoxFit.contain,
            alignment: Alignment.center,
            errorBuilder: (context, error, stackTrace) {
              return Icon(
                Icons.business,
                size: 44,
                color: _LoginDesign.textMuted,
              );
            },
          ),
        ),
      ),
    );
  }
}

/// Soft drifting dots + bokeh orbs (no interaction) to break up flat areas.
class _LoginParticlesLayer extends StatefulWidget {
  const _LoginParticlesLayer();

  @override
  State<_LoginParticlesLayer> createState() => _LoginParticlesLayerState();
}

class _LoginParticlesLayerState extends State<_LoginParticlesLayer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 28),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return CustomPaint(
              painter: _ParticlesPainter(progress: _controller.value),
              size: Size(constraints.maxWidth, constraints.maxHeight),
            );
          },
        );
      },
    );
  }
}

class _ParticleSpec {
  const _ParticleSpec({
    required this.nx,
    required this.ny,
    required this.radius,
    required this.opacity,
    required this.phase,
    required this.drift,
    required this.hue,
  });

  final double nx;
  final double ny;
  final double radius;
  final double opacity;
  final double phase;
  final double drift;

  /// 0 = indigo bias, 1 = violet, 2 = blue
  final int hue;
}

class _ParticlesPainter extends CustomPainter {
  _ParticlesPainter({required this.progress});

  final double progress;

  static final List<_ParticleSpec> _specs = _buildSpecs();

  static List<_ParticleSpec> _buildSpecs() {
    final rnd = math.Random(2026);
    return List<_ParticleSpec>.generate(56, (i) {
      final hue = i % 3;
      return _ParticleSpec(
        nx: rnd.nextDouble(),
        ny: rnd.nextDouble(),
        radius: 1.2 + rnd.nextDouble() * 3.8,
        opacity: 0.08 + rnd.nextDouble() * 0.38,
        phase: rnd.nextDouble() * math.pi * 2,
        drift: 0.4 + rnd.nextDouble() * 1.4,
        hue: hue,
      );
    });
  }

  Color _colorForHue(int hue, double opacity) {
    switch (hue) {
      case 1:
        return const Color(0xFF8B5CF6).withValues(alpha: opacity);
      case 2:
        return const Color(0xFF3B82F6).withValues(alpha: opacity);
      default:
        return const Color(0xFF6366F1).withValues(alpha: opacity);
    }
  }

  @override
  void paint(Canvas canvas, Size size) {
    final t = progress * math.pi * 2;
    for (final p in _specs) {
      final ox = math.sin(t * p.drift + p.phase) * 14 * size.width / 400;
      final oy =
          math.cos(t * p.drift * 0.85 + p.phase * 1.1) * 12 * size.height / 800;
      final cx = p.nx * size.width + ox;
      final cy = p.ny * size.height + oy;
      final relY = cy / size.height;
      final relX = cx / size.width;
      final inCardZone =
          relY > 0.30 && relY < 0.72 && relX > 0.08 && relX < 0.92;
      final opacityMul = inCardZone ? 0.28 : 1.0;
      final paint = Paint()
        ..color = _colorForHue(p.hue, p.opacity * opacityMul)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(Offset(cx, cy), p.radius, paint);
    }

    // Large soft orbs (static positions, subtle parallax via t)
    final orbPaint = Paint()..style = PaintingStyle.fill;
    void drawOrb(double nx, double ny, double r, Color c) {
      final wobbleX = math.sin(t * 0.35 + nx * 5) * 12;
      final wobbleY = math.cos(t * 0.28 + ny * 4) * 10;
      final cx0 = nx * size.width + wobbleX;
      final cy0 = ny * size.height + wobbleY;
      final relY = cy0 / size.height;
      final relX = cx0 / size.width;
      final inCardZone =
          relY > 0.30 && relY < 0.72 && relX > 0.08 && relX < 0.92;
      final aMul = inCardZone ? 0.32 : 1.0;
      orbPaint.shader = RadialGradient(
        colors: [
          c.withValues(alpha: 0.22 * aMul),
          c.withValues(alpha: 0),
        ],
      ).createShader(Rect.fromCircle(center: Offset(cx0, cy0), radius: r));
      canvas.drawCircle(Offset(cx0, cy0), r, orbPaint);
    }

    drawOrb(0.12, 0.2, size.shortestSide * 0.42, const Color(0xFF6366F1));
    drawOrb(0.88, 0.75, size.shortestSide * 0.38, const Color(0xFFA78BFA));
    drawOrb(0.55, 0.08, size.shortestSide * 0.28, const Color(0xFF60A5FA));
  }

  @override
  bool shouldRepaint(covariant _ParticlesPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

class _QuickChip extends StatelessWidget {
  const _QuickChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    const borderColor = Color(0xFF64748B);
    return Material(
      color: Colors.transparent,
      elevation: 0,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        splashColor: AppStitchTheme.primary.withValues(alpha: 0.12),
        highlightColor: Colors.black.withValues(alpha: 0.05),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: borderColor, width: 1.35),
            color: Colors.white.withValues(alpha: 0.52),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.07),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: _LoginDesign.textPrimary, size: 22),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: _LoginDesign.textPrimary,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.15,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
