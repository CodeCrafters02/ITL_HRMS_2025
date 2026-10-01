/// Google OAuth client IDs — read from `.env` at runtime.
///
/// `GOOGLE_SERVER_CLIENT_ID` is the **Web application** client ID used by [GoogleSignIn] as
/// `serverClientId`; it must match Django `GOOGLE_CLIENT_ID` so the ID token `aud` verifies on
/// `POST /app/google-login/`. `GOOGLE_IOS_CLIENT_ID` is the iOS OAuth client.
library;

import 'env.dart';

String get kGoogleServerClientId => Env.get('GOOGLE_SERVER_CLIENT_ID');

String get kGoogleIosClientId => Env.get('GOOGLE_IOS_CLIENT_ID');
