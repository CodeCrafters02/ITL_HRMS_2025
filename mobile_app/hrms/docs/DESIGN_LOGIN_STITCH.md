# Login screen — design specification (Stitch reference)

This document defines how the Flutter login screen maps to the approved visual reference: **`assets/reference/stitch_login_reference.png`**. Use it for QA, handoff, and future tweaks so the implementation stays aligned with the comp.

## 1. Source of truth

| Item | Location |
|------|----------|
| Reference image | `mobile_app/hrms/assets/reference/stitch_login_reference.png` |
| Implementation | `lib/pages/auth/login_page.dart` |
| Theme tokens (accent / typography base) | `lib/theme/app_stitch_theme.dart` |

The live UI layers the reference image as a **full-bleed background**, then applies a **navy tint** and **bokeh orbs** so content remains readable while preserving the comp’s color story.

## 2. Visual inventory (must match)

### 2.1 Background

- **Base:** Deep navy, target **`#121B33`** (`_LoginDesign.bgNavy`).
- **Artwork:** Reference PNG, `BoxFit.cover`, full screen.
- **Scrim:** Semi-transparent navy over the image (~52% alpha) to unify contrast.
- **Bokeh:** Soft blurred circles in **royal blue** (`#3B5BDB`) and **purple** (`#6B4CE6`), low opacity, large blur — implemented in `_BokehPainter`.

### 2.2 Central card (glassmorphism)

- **Shape:** Large corner radius (**28px**).
- **Effect:** `BackdropFilter` + blur (~24σ) over content behind the card.
- **Fill:** ~**10%** white (`rgba(255,255,255,0.10)`).
- **Stroke:** ~**22%** white border.
- **Shadow:** Soft, low, large-radius shadow for lift from background.
- **Padding:** ~**28–32px** horizontal and vertical inside the card.

### 2.3 Brand block (top of card)

- **IX mark:** Outline-style **“IX”** wordmark (thin stroke, generous letter-spacing), white.
- **Title:** **“Innovyx HRMS”** — bold, white, headline scale.
- **Subtitle:** **“Human Resource Management System”** — smaller, white ~88% opacity.

### 2.4 Primary CTA

- **Control:** Full-width pill, **white** fill.
- **Label:** **“Sign in with Google”** (matches reference; not “Continue with Google”).
- **Icon:** Multicolor Google mark (`FontAwesomeIcons.google`) + primary purple accent for the glyph.
- **Height:** ~**52px**.

### 2.5 Quick Access

- **Section label:** **“Quick Access”**, small, muted white (~65% opacity), centered above chips.
- **Two equal chips:** Side by side, **pill** shape, **transparent** fill with **white** outline (~45% opacity).
  - Left: **Face ID** icon + **“FaceID”** label.
  - Right: **Fingerprint** icon + **“Fingerprint”** label.
- **Behavior (current):** Placeholder — shows a snackbar; wire to `local_auth` (or platform biometrics) in a follow-up.

### 2.6 Footer inside card

- **Line 1:** **“Welcome Back”** — bold white.
- **Line 2:** **“Streamlining your workforce success.”** — smaller, ~75% white opacity.

### 2.7 Below the card

- **Help line:** **“Need help accessing your account?”** — muted white.
- **Action:** **“Contact IT Support”** — underlined white text; opens `mailto:it-support@company.local` (replace with production IT address).

### 2.8 Optional / design-only chrome

- **“1 of 6”** step indicator: Shown only in **`kDebugMode`** to mirror multi-step comps without affecting production users.
- **Bottom tab bar** (Dashboard / briefcase / profile) in the static reference: **Not** reproduced on the unauthenticated route — the app shows bottom navigation only after login (`EmployeeLayout`). Document as intentional product difference.

## 3. Typography

- Use the app theme’s **Plus Jakarta Sans** via `ThemeData` (`AppStitchTheme`).
- Weights: title **w800** / **w700** for headings; body **regular**; labels **w600** where specified above.

## 4. Color quick reference

| Token | Hex / value |
|-------|----------------|
| Background navy | `#121B33` |
| Bokeh purple | `#6B4CE6` |
| Bokeh blue | `#3B5BDB` |
| Glass fill | `rgba(255,255,255,0.10)` |
| Glass border | `rgba(255,255,255,0.22)` |
| Primary button | White `#FFFFFF`, text `#2D2D2D` |
| Google icon accent | `AppStitchTheme.primary` (`#4B2BEE`) |

## 5. Flutter component map

| UI region | Widget / class |
|-----------|----------------|
| Background stack | `Image.asset` + `ColoredBox` scrim + `CustomPaint` (`_BokehPainter`) |
| Glass card | `ClipRRect` → `BackdropFilter` → `Container` (border + fill) |
| IX mark | `Text` with stroke `Paint` (`_buildIxMark`) |
| Google CTA | `OutlinedButton` (filled white) + `FaIcon` + label |
| Quick Access | `_QuickChip` ×2 |
| Support | `TextButton` + `url_launcher` |

## 6. QA checklist (pixel parity)

- [ ] Background navy and bokeh visible; reference image not overpowering text.
- [ ] Card reads as “frosted” (blur + light border) on a real device.
- [ ] Copy matches reference: **Sign in with Google**, **Quick Access**, **FaceID** / **Fingerprint**, **Welcome Back** + tagline.
- [ ] Tap **Contact IT Support** opens mail client (or shows SnackBar on failure).
- [ ] Google sign-in still completes against `/app/google-login/` (see `AuthService.loginWithGoogle`).
- [ ] Compare screenshot to `stitch_login_reference.png` at 1:1 on a 390×844-style device.

## 7. Follow-up (not in scope of static comp)

- **Biometrics:** Integrate `local_auth` and secure token bridge if product requires Face ID / fingerprint login.
- **IT email:** Replace `it-support@company.local` with your org’s support address.
- **Bottom navigation on login:** Only add if product explicitly wants marketing chrome on the auth screen (not recommended for navigation clarity).
