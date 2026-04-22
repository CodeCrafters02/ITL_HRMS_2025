# HRMS mobile app — design system

This document describes typography, color usage, and KPI card rules for the Flutter HRMS app (`mobile_app/hrms`). Implementation lives in `lib/theme/app_stitch_theme.dart` and dashboard widgets under `lib/pages/employee/`.

## 1. Design principles

- Preserve the **glass + soft gradient** language (`GlassCard`, stitch-style background) and the **employee dashboard layout**: greeting → ready-for-day strip → 2×2 KPI grid → tabs → events / announcements → floating quick action.
- KPIs must be **scannable at a glance**: one **semantic accent** per metric, consistent card shape and density, and **accessible contrast** on light frosted surfaces.
- Do not rely on color alone: each KPI keeps a **distinct icon and label**.

## 2. Typography

**Primary typeface: Plus Jakarta Sans** (via `google_fonts`, applied in `AppStitchTheme.lightTheme()` / `darkTheme()`). It is used for UI body, labels, and headings unless noted otherwise.

| Role | Treatment |
|------|-------------|
| App body / labels | `Theme.of(context).textTheme` (Plus Jakarta Sans) |
| KPI title | `bodyMedium`, weight 800, `AppStitchTheme.lightOnSurfaceMuted` |
| KPI value | `titleMedium`, weight 900, KPI accent color; **tabular figures** where supported for stable digit width |
| Greeting headline | `headlineSmall`, weight 900, tight letter-spacing |
| Timers | `fontFamily: 'monospace'` on timer digits only |

**Optional later:** a second display family (e.g. Outfit or Sora) for marketing-style headlines only — not required for current screens.

## 3. Color palette

### Core (canonical)

| Token / usage | Hex | Notes |
|---------------|-----|--------|
| Primary | `#4B2BEE` | Buttons, links, selected nav |
| Primary dim | `#3D24C4` | Dark theme secondary |
| Accent blue | `#4285F4` | Glass gradient hint |
| Light scaffold | `#E8ECF3` | Page background |
| Light on-surface | `#1A2233` | Primary text |
| Light on-surface muted | `#4A5568` | Secondary text |
| Light on-surface variant | `#5C6578` | Tertiary |
| Light outline | `#CBD5E1` | Borders |

Constants are defined on `AppStitchTheme` in Dart; prefer referencing the class rather than duplicating hex in widgets.

### KPI semantic accents

One hue per dashboard KPI. Use **full strength** for the icon; **~12% opacity** fill for the circular icon chip. Avoid solid full-card fills.

| KPI | Semantic role | Accent hex | Dart constant |
|-----|----------------|-------------|----------------|
| Leaves | Time off / wellbeing | `#0F766E` | `AppStitchTheme.kpiLeaves` |
| Holidays | Celebrations | `#B45309` | `AppStitchTheme.kpiHolidays` |
| My tasks | Work queue | `#4338CA` | `AppStitchTheme.kpiTasks` |
| Calendar | Schedule | `#0369A1` | `AppStitchTheme.kpiCalendar` |

## 4. KPI card specification

- **Structure:** `GlassCard` → row: **icon chip** (fixed size) | **title** (expanded) | **value** (end-aligned).
- **Icon chip:** circle ~36–40px, background `accent.withValues(alpha: 0.12)`, icon `color: accent`.
- **Interaction:** `InkWell` with border radius matching the card (e.g. 22).
- **Loading:** value shows `—`; accent and chip remain for continuity.

## 5. Accessibility

- Icons and labels provide redundancy beyond color.
- Amber (`kpiHolidays`) is chosen as a **darker** warm tone for better contrast on white/light glass; re-check if chip opacity or glass background changes significantly.
- Prefer WCAG AA contrast for text that uses accent colors on light surfaces.
