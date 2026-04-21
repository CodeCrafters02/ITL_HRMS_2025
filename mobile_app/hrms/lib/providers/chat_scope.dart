import 'package:flutter/widgets.dart';

import 'chat_provider.dart';

class ChatScope extends InheritedNotifier<ChatProvider> {
  const ChatScope({
    super.key,
    required ChatProvider notifier,
    required super.child,
  }) : super(notifier: notifier);

  static ChatProvider of(BuildContext context) {
    final scope =
        context.dependOnInheritedWidgetOfExactType<ChatScope>();
    assert(scope != null, 'ChatScope not found in widget tree.');
    return scope!.notifier!;
  }
}

