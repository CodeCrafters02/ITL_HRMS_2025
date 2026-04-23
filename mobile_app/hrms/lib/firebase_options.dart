import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'DefaultFirebaseOptions are not configured for web in this project.',
      );
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
      case TargetPlatform.windows:
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not configured for this platform.',
        );
      case TargetPlatform.fuchsia:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not configured for fuchsia.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBp-qLJE1e2fmYwu0NFK-gr5TO3Pzg6oRI',
    appId: '1:482392351722:android:ac756925d8072051edc893',
    messagingSenderId: '482392351722',
    projectId: 'peoplesuite-ca155',
    storageBucket: 'peoplesuite-ca155.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyDay0r9PhXLklgWQQT7qPLj3c2aNHsp6UE',
    appId: '1:482392351722:ios:45c4298e26453958edc893',
    messagingSenderId: '482392351722',
    projectId: 'peoplesuite-ca155',
    storageBucket: 'peoplesuite-ca155.firebasestorage.app',
    iosBundleId: 'com.innovyx.peoplesuite',
    iosClientId:
        '482392351722-4t91e445h429erfeje0vgh8f396cmbfh.apps.googleusercontent.com',
  );
}
