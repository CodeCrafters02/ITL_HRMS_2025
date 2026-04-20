/// OAuth 2.0 **Web application** client ID used by [GoogleSignIn] as `serverClientId`.
/// It must match Django `GOOGLE_CLIENT_ID` / frontend `VITE_GOOGLE_CLIENT_ID` so the
/// ID token `aud` matches `id_token.verify_oauth2_token` on `POST /app/google-login/`.
///
/// Default matches project backend `.env` (`GOOGLE_CLIENT_ID`). Override for other envs:
/// `flutter run --dart-define=GOOGLE_SERVER_CLIENT_ID=xxxx.apps.googleusercontent.com`
///
/// **Android:** [default_web_client_id] in `res/values/strings.xml` helps the Play
/// services flow; re-download `google-services.json` after adding SHA-1 in Firebase
/// so `oauth_client` is non-empty.
///
/// **iOS:** Add an iOS OAuth client in Google Cloud and `CFBundleURLTypes` / GID config
/// as in the `google_sign_in` iOS setup docs if sign-in fails on Simulator/device.
const String _kDefaultWebClientId =
    '998707069942-p768bcp5kgfivsjk1jbhrb4upq8kfqda.apps.googleusercontent.com';

const String kGoogleServerClientId = String.fromEnvironment(
  'GOOGLE_SERVER_CLIENT_ID',
  defaultValue: _kDefaultWebClientId,
);
