import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../services/lms_service.dart';

/// Design tokens for the Learning module — calm indigo/slate with a teal accent.
class Lc {
  static const ink = Color(0xFF0F172A);
  static const text = Color(0xFF1E293B);
  static const muted = Color(0xFF64748B);
  static const faint = Color(0xFF94A3B8);
  static const line = Color(0xFFE2E8F0);
  static const bg = Color(0xFFF5F7FB);
  static const surface = Colors.white;

  static const primary = Color(0xFF4338CA);
  static const primarySoft = Color(0xFFEEF2FF);
  static const teal = Color(0xFF0F766E);
  static const tealSoft = Color(0xFFF0FDFA);
  static const success = Color(0xFF15803D);
  static const successSoft = Color(0xFFF0FDF4);
  static const warning = Color(0xFFB45309);
  static const warningSoft = Color(0xFFFFFBEB);
  static const danger = Color(0xFFB91C1C);
  static const dangerSoft = Color(0xFFFEF2F2);

  static const hero = [Color(0xFF1E1B4B), Color(0xFF3730A3)];

  static const r = 16.0;
  static List<BoxShadow> get shadow => [
        BoxShadow(color: ink.withValues(alpha: 0.04), blurRadius: 2, offset: const Offset(0, 1)),
        BoxShadow(color: ink.withValues(alpha: 0.05), blurRadius: 16, offset: const Offset(0, 6)),
      ];

  static const h1 = TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: ink, letterSpacing: -0.3);
  static const h2 = TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: ink, letterSpacing: -0.2);
  static const h3 = TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: text, height: 1.3);
  static const body = TextStyle(fontSize: 13.5, color: muted, height: 1.45);
  static const small = TextStyle(fontSize: 12, color: muted);
  static const overline = TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: muted, letterSpacing: 0.8);
}

// Back-compat aliases used across the LMS pages.
const lmsPrimary = Lc.primary;
const lmsGradient = Lc.hero;

String fmtDate(dynamic raw, [String pattern = 'dd MMM yyyy']) {
  final d = DateTime.tryParse('${raw ?? ''}');
  return d == null ? '—' : DateFormat(pattern).format(d.toLocal());
}

String titleCase(String s) =>
    s.split(RegExp(r'[_\s]+')).where((w) => w.isNotEmpty).map((w) => w[0].toUpperCase() + w.substring(1)).join(' ');

/// Muted, professional tints for placeholder thumbnails.
({Color bg, Color fg}) courseTint(int seed) {
  const t = [
    (bg: Color(0xFFE0E7FF), fg: Color(0xFF3730A3)),
    (bg: Color(0xFFCCFBF1), fg: Color(0xFF0F766E)),
    (bg: Color(0xFFE2E8F0), fg: Color(0xFF334155)),
    (bg: Color(0xFFFEF3C7), fg: Color(0xFF92400E)),
    (bg: Color(0xFFDBEAFE), fg: Color(0xFF1E40AF)),
    (bg: Color(0xFFFCE7F3), fg: Color(0xFF9D174D)),
  ];
  return t[seed.abs() % t.length];
}

class CourseThumb extends StatelessWidget {
  const CourseThumb({super.key, required this.url, required this.seed, this.height = 120, this.width, this.radius = 12, this.icon});
  final String? url;
  final int seed;
  final double height;
  final double? width;
  final double radius;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final t = courseTint(seed);
    final placeholder = Container(
      height: height,
      width: width ?? double.infinity,
      color: t.bg,
      child: Stack(children: [
        Positioned(
          right: -height * 0.15,
          bottom: -height * 0.2,
          child: Icon(icon ?? Icons.auto_stories_rounded, size: height * 0.9, color: t.fg.withValues(alpha: 0.08)),
        ),
        Center(child: Icon(icon ?? Icons.auto_stories_rounded, color: t.fg, size: (height * 0.34).clamp(18, 44))),
      ]),
    );
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: url == null
          ? placeholder
          : CachedNetworkImage(
              imageUrl: url!,
              height: height,
              width: width ?? double.infinity,
              fit: BoxFit.cover,
              placeholder: (_, _) => placeholder,
              errorWidget: (_, _, _) => placeholder,
            ),
    );
  }
}

class Pill extends StatelessWidget {
  const Pill(this.text, {super.key, required this.color, this.icon, this.solid = false});
  final String text;
  final Color color;
  final IconData? icon;
  final bool solid;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: solid ? color : color.withValues(alpha: 0.09),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (icon != null) ...[Icon(icon, size: 12, color: solid ? Colors.white : color), const SizedBox(width: 4)],
          ConstrainedBox(
            constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.62),
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: solid ? Colors.white : color),
            ),
          ),
        ]),
      );
}

Color difficultyColor(String? d) => switch ((d ?? '').toLowerCase()) {
      'advanced' => Lc.danger,
      'intermediate' => Lc.warning,
      _ => Lc.teal,
    };

Color statusColor(String? s) => switch ((s ?? '').toLowerCase()) {
      'completed' || 'approved' || 'valid' || 'graded' || 'passed' => Lc.success,
      'overdue' || 'rejected' || 'expired' || 'failed' || 'revoked' => Lc.danger,
      'in_progress' || 'submitted' || 'late' || 'enrolled' => Lc.primary,
      _ => Lc.warning,
    };

class ProgressLine extends StatelessWidget {
  const ProgressLine(this.value, {super.key, this.height = 6, this.color = Lc.primary});
  final double value;
  final double height;
  final Color color;

  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(99),
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: (value / 100).clamp(0, 1)),
          duration: const Duration(milliseconds: 700),
          curve: Curves.easeOutCubic,
          builder: (_, v, _) => LinearProgressIndicator(
            value: v,
            minHeight: height,
            backgroundColor: Lc.line,
            valueColor: AlwaysStoppedAnimation(v >= 1 ? Lc.success : color),
          ),
        ),
      );
}

class ProgressRing extends StatelessWidget {
  const ProgressRing(this.value, {super.key, this.size = 56, this.stroke = 6, this.light = false});
  final double value;
  final double size;
  final double stroke;
  final bool light;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: size,
        height: size,
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: (value / 100).clamp(0, 1)),
          duration: const Duration(milliseconds: 900),
          curve: Curves.easeOutCubic,
          builder: (_, v, _) => Stack(fit: StackFit.expand, children: [
            CircularProgressIndicator(
              value: v,
              strokeWidth: stroke,
              strokeCap: StrokeCap.round,
              backgroundColor: light ? Colors.white.withValues(alpha: 0.18) : Lc.line,
              valueColor: AlwaysStoppedAnimation(light ? const Color(0xFF5EEAD4) : (v >= 1 ? Lc.success : Lc.primary)),
            ),
            Center(
              child: Text(
                '${(v * 100).round()}%',
                style: TextStyle(fontSize: size * 0.23, fontWeight: FontWeight.w800, color: light ? Colors.white : Lc.ink),
              ),
            ),
          ]),
        ),
      );
}

class LmsCard extends StatelessWidget {
  const LmsCard({super.key, required this.child, this.onTap, this.padding = const EdgeInsets.all(14), this.color = Lc.surface});
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets padding;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(Lc.r),
          border: Border.all(color: Lc.line),
          boxShadow: Lc.shadow,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(Lc.r),
            child: Padding(padding: padding, child: child),
          ),
        ),
      );
}

class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {super.key, this.count, this.action, this.onAction});
  final String title;
  final int? count;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(2, 22, 2, 10),
        child: Row(children: [
          Text(title, style: Lc.h2),
          if (count != null) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
              decoration: BoxDecoration(color: Lc.line, borderRadius: BorderRadius.circular(99)),
              child: Text('$count', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Lc.muted)),
            ),
          ],
          const Spacer(),
          if (action != null)
            InkWell(
              onTap: onAction,
              borderRadius: BorderRadius.circular(6),
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Text(action!, style: const TextStyle(color: Lc.primary, fontWeight: FontWeight.w700, fontSize: 13)),
              ),
            ),
        ]),
      );
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, required this.message, this.action});
  final IconData icon;
  final String title;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(32, 40, 32, 32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(color: Lc.primarySoft, borderRadius: BorderRadius.circular(20)),
            child: Icon(icon, size: 34, color: Lc.primary),
          ),
          const SizedBox(height: 16),
          Text(title, textAlign: TextAlign.center, style: Lc.h3),
          const SizedBox(height: 6),
          Text(message, textAlign: TextAlign.center, style: Lc.body),
          if (action != null) ...[const SizedBox(height: 18), action!],
        ]),
      );
}

class ErrorRetry extends StatelessWidget {
  const ErrorRetry({super.key, required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => EmptyState(
        icon: Icons.cloud_off_rounded,
        title: 'Couldn\'t load',
        message: message,
        action: FilledButton.icon(
          onPressed: onRetry,
          style: lmsPrimaryButton(height: 44),
          icon: const Icon(Icons.refresh_rounded, size: 18),
          label: const Text('Try again'),
        ),
      );
}

ButtonStyle lmsPrimaryButton({double height = 48, Color color = Lc.primary}) => FilledButton.styleFrom(
      backgroundColor: color,
      foregroundColor: Colors.white,
      disabledBackgroundColor: Lc.line,
      minimumSize: Size.fromHeight(height),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
    );

ButtonStyle lmsSecondaryButton({double height = 48}) => OutlinedButton.styleFrom(
      foregroundColor: Lc.primary,
      minimumSize: Size.fromHeight(height),
      side: const BorderSide(color: Lc.line),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
    );

InputDecoration lmsInput(String label, {IconData? icon}) => InputDecoration(
      labelText: label,
      alignLabelWithHint: true,
      prefixIcon: icon == null ? null : Icon(icon, color: Lc.faint),
      filled: true,
      fillColor: Lc.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Lc.line)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Lc.line)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Lc.primary, width: 1.5)),
    );

void lmsToast(BuildContext context, String msg, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Row(children: [
        Icon(error ? Icons.error_outline_rounded : Icons.check_circle_outline_rounded, color: Colors.white, size: 20),
        const SizedBox(width: 10),
        Expanded(child: Text(msg, style: const TextStyle(fontWeight: FontWeight.w500))),
      ]),
      behavior: SnackBarBehavior.floating,
      backgroundColor: error ? Lc.danger : Lc.ink,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
    ));
}

/// Thumbnail URL for an enrollment / course / wishlist row.
String? thumbOf(Json m) => LmsService.mediaUrl(m['course_image_url'] ?? m['thumbnail_url'] ?? m['thumbnail']);

IconData contentIcon(String t) => switch (t) {
      'video' => Icons.play_circle_outline_rounded,
      'pdf' || 'document' => Icons.description_outlined,
      'ppt' => Icons.slideshow_rounded,
      'audio' => Icons.headphones_rounded,
      'link' => Icons.link_rounded,
      'scorm' => Icons.extension_rounded,
      _ => Icons.article_outlined,
    };

/// Standard bottom sheet chrome.
class LmsSheet extends StatelessWidget {
  const LmsSheet({super.key, required this.title, this.subtitle, required this.child});
  final String title;
  final String? subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Container(
          decoration: const BoxDecoration(color: Lc.surface, borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
                Center(child: Container(width: 36, height: 4, decoration: BoxDecoration(color: Lc.line, borderRadius: BorderRadius.circular(9)))),
                const SizedBox(height: 16),
                Text(title, style: Lc.h2),
                if (subtitle != null) ...[const SizedBox(height: 4), Text(subtitle!, style: Lc.body)],
                const SizedBox(height: 18),
                child,
              ]),
            ),
          ),
        ),
      );
}
