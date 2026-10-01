/// Microsoft Entra ID (Azure AD) SSO settings, read from `.env` at runtime.
///
/// Azure portal → App registrations → (your app) → Authentication → Add a platform →
/// **Mobile and desktop applications** → custom redirect URI = [kMsRedirectUri].
/// The mobile app is a public client (PKCE) — no client secret is used or needed.
library;

import 'env.dart';

/// Application (client) ID of the Entra ID app registration.
String get kMsClientId => Env.get('MS_CLIENT_ID');

/// Directory (tenant) ID — restricts sign-in to your organisation.
/// `organizations` allows any work/school account; avoid `common` (also allows personal accounts).
String get kMsTenantId => Env.get('MS_TENANT_ID', fallback: 'organizations');

/// Must match the redirect URI registered in Azure and the Android/iOS URL scheme.
String get kMsRedirectUri => Env.get('MS_REDIRECT_URI', fallback: 'com.innovyx.peoplesuite://oauthredirect');

const List<String> kMsScopes = ['openid', 'profile', 'email', 'offline_access'];

String get kMsAuthority => 'https://login.microsoftonline.com/$kMsTenantId';
