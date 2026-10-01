import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Runtime configuration — loaded from the bundled `.env` file (see pubspec `assets`).
/// Plain `flutter run` / `flutter build` pick it up; no `--dart-define` flags needed.
class Env {
  static Future<void> load() => dotenv.load(fileName: '.env');

  /// Value for [key], or [fallback] when the key is missing/empty.
  static String get(String key, {String fallback = ''}) {
    final v = dotenv.isInitialized ? dotenv.maybeGet(key)?.trim() : null;
    return (v == null || v.isEmpty) ? fallback : v;
  }

  /// Value for a key that must be present in `.env`.
  static String require(String key) {
    final v = get(key);
    if (v.isEmpty) {
      throw StateError('$key is missing in mobile_app/hrms/.env (copy .env.example and fill it in).');
    }
    return v;
  }
}
