import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_stitch_theme.dart';

class StitchBackground extends StatelessWidget {
  const StitchBackground({
    super.key,
    required this.child,
    this.backgroundAssetPath = 'assets/reference/vector-background.jpg',
    this.showParticles = true,
  });

  final Widget child;
  final String backgroundAssetPath;
  final bool showParticles;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        Positioned.fill(
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.asset(
                backgroundAssetPath,
                fit: BoxFit.cover,
                alignment: Alignment.center,
                errorBuilder: (context, error, stackTrace) =>
                    const ColoredBox(color: AppStitchTheme.lightScaffold),
              ),
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
              // Soft frosted fog + subtle vignette to improve contrast.
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.white.withValues(alpha: 0.10),
                        Colors.white.withValues(alpha: 0.16),
                        Colors.white.withValues(alpha: 0.22),
                      ],
                      stops: const [0.0, 0.55, 1.0],
                    ),
                  ),
                ),
              ),
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      center: const Alignment(0, -0.25),
                      radius: 1.05,
                      colors: [
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.06),
                      ],
                      stops: const [0.62, 1.0],
                    ),
                  ),
                ),
              ),
              if (showParticles)
                const Positioned.fill(
                  child: RepaintBoundary(
                    child: IgnorePointer(child: StitchParticlesLayer()),
                  ),
                ),
            ],
          ),
        ),
        child,
      ],
    );
  }
}

/// Soft drifting dots + bokeh orbs (no interaction) to break up flat areas.
class StitchParticlesLayer extends StatefulWidget {
  const StitchParticlesLayer({super.key});

  @override
  State<StitchParticlesLayer> createState() => _StitchParticlesLayerState();
}

class _StitchParticlesLayerState extends State<StitchParticlesLayer>
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
  static const double _opacityScale = 0.68; // calmer, "soft frosted" feel

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
        ..color = _colorForHue(p.hue, p.opacity * opacityMul * _opacityScale)
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
          c.withValues(alpha: 0.18 * aMul * _opacityScale),
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

