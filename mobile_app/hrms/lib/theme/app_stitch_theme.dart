import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Stitch-inspired design tokens: dark UI, accent [#4b2bee], Plus Jakarta Sans.
class AppStitchTheme {
  AppStitchTheme._();
  static const Color primary = Color(0xFF4B2BEE);
  static const Color primaryDim = Color(0xFF3D24C4);
  static const Color accentBlue = Color(0xFF4285F4);

  /// Dashboard KPI semantic accents — see `docs/DESIGN_SYSTEM.md`.
  static const Color kpiLeaves = Color(0xFF0F766E);
  static const Color kpiHolidays = Color(0xFFB45309);
  static const Color kpiTasks = Color(0xFF4338CA);
  static const Color kpiCalendar = Color(0xFF0369A1);

  // Light tokens (aligned with login page)
  static const Color lightScaffold = Color(0xFFE8ECF3);
  static const Color lightSurface = Color(0xFFF8FAFC);
  static const Color lightSurfaceElevated = Colors.white;
  static const Color lightOutline = Color(0xFFCBD5E1); // slate-300
  static const Color lightOnSurface = Color(0xFF1A2233);
  static const Color lightOnSurfaceVariant = Color(0xFF5C6578);
  // Slightly darker for better contrast on frosted glass.
  static const Color lightOnSurfaceMuted = Color(0xFF4A5568);
  static const Color scaffoldBackground = Color(0xFF0A0A0F);
  static const Color surface = Color(0xFF13131A);
  static const Color surfaceElevated = Color(0xFF1A1A24);
  static const Color surfaceHighlight = Color(0xFF22222E);
  static const Color outline = Color(0xFF2E2E3D);
  static const Color onSurface = Color(0xFFF4F4F5);
  static const Color onSurfaceVariant = Color(0xFFA1A1AA);
  static const Color onSurfaceMuted = Color(0xFF71717A);

  static const double radiusCard = 20;
  static const double radiusPill = 999;

  static ThemeData darkTheme() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: scaffoldBackground,
    );
    final textTheme = GoogleFonts.plusJakartaSansTextTheme(base.textTheme).apply(
      bodyColor: onSurface,
      displayColor: onSurface,
    );

    final colorScheme = ColorScheme.dark(
      primary: primary,
      onPrimary: Colors.white,
      secondary: primaryDim,
      onSecondary: Colors.white,
      surface: surface,
      onSurface: onSurface,
      error: const Color(0xFFEF4444),
      outline: outline,
    );

    return base.copyWith(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: scaffoldBackground,
      textTheme: textTheme,
      primaryColor: primary,
      appBarTheme: AppBarTheme(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.plusJakartaSans(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusCard),
          side: const BorderSide(color: outline),
        ),
      ),
      dividerTheme: const DividerThemeData(color: outline),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: surfaceElevated,
        contentTextStyle: GoogleFonts.plusJakartaSans(color: onSurface),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return primary;
          return surfaceHighlight;
        }),
        checkColor: WidgetStateProperty.all(Colors.white),
        side: const BorderSide(color: outline),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceElevated,
        hintStyle: GoogleFonts.plusJakartaSans(color: onSurfaceMuted),
        labelStyle: GoogleFonts.plusJakartaSans(color: onSurfaceVariant),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(28),
          borderSide: const BorderSide(color: outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(28),
          borderSide: const BorderSide(color: outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(28),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: outline,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
          textStyle: GoogleFonts.plusJakartaSans(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: primary,
        unselectedItemColor: onSurfaceMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: GoogleFonts.plusJakartaSans(fontSize: 12),
        unselectedLabelStyle: GoogleFonts.plusJakartaSans(fontSize: 12),
      ),
    );
  }

  static ThemeData lightTheme() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: lightScaffold,
    );
    final textTheme =
        GoogleFonts.plusJakartaSansTextTheme(base.textTheme).apply(
      bodyColor: lightOnSurface,
      displayColor: lightOnSurface,
    );

    final colorScheme = ColorScheme.light(
      primary: primary,
      onPrimary: Colors.white,
      secondary: accentBlue,
      onSecondary: Colors.white,
      surface: lightSurfaceElevated,
      onSurface: lightOnSurface,
      error: const Color(0xFFEF4444),
      outline: lightOutline,
    );

    return base.copyWith(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: lightScaffold,
      textTheme: textTheme,
      primaryColor: primary,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: lightOnSurface,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.plusJakartaSans(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: lightOnSurface,
        ),
      ),
      cardTheme: CardThemeData(
        color: lightSurfaceElevated,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(28),
          side: BorderSide(color: lightOutline.withValues(alpha: 0.55)),
        ),
      ),
      dividerTheme: DividerThemeData(
        color: lightOutline.withValues(alpha: 0.55),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: lightOnSurface.withValues(alpha: 0.92),
        contentTextStyle:
            GoogleFonts.plusJakartaSans(color: Colors.white),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.72),
        hintStyle: GoogleFonts.plusJakartaSans(color: lightOnSurfaceMuted),
        labelStyle: GoogleFonts.plusJakartaSans(color: lightOnSurfaceVariant),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(28),
          borderSide: BorderSide(color: lightOutline.withValues(alpha: 0.55)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(28),
          borderSide: BorderSide(color: lightOutline.withValues(alpha: 0.55)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(28),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: lightOutline,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
          textStyle: GoogleFonts.plusJakartaSans(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: Colors.white.withValues(alpha: 0.78),
        selectedItemColor: primary,
        unselectedItemColor: lightOnSurfaceMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: GoogleFonts.plusJakartaSans(fontSize: 12),
        unselectedLabelStyle: GoogleFonts.plusJakartaSans(fontSize: 12),
      ),
    );
  }
}
