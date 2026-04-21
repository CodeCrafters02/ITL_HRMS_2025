import 'dart:async';

import 'package:flutter/material.dart';

import '../../../providers/chat_scope.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';
import '../../../widgets/stitch_background.dart';

class NewChatSheet extends StatefulWidget {
  const NewChatSheet({super.key});

  @override
  State<NewChatSheet> createState() => _NewChatSheetState();
}

class _NewChatSheetState extends State<NewChatSheet> {
  final _controller = TextEditingController();
  Timer? _debounce;
  bool _loading = false;
  String _q = '';
  List<dynamic> _results = const [];
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _search('');
    });
    _controller.addListener(() {
      final next = _controller.text.trim();
      _q = next;
      _debounce?.cancel();
      _debounce = Timer(const Duration(milliseconds: 280), () {
        _search(next);
      });
      setState(() {});
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _search(String q) async {
    final chat = ChatScope.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final users = await chat.searchUsers(q);
      setState(() {
        _results = users;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Material(
        color: Colors.transparent,
        child: StitchBackground(
          showParticles: false,
          child: Padding(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 16,
              bottom: MediaQuery.of(context).viewInsets.bottom + 16,
            ),
            child: GlassCard(
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'New chat',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close_rounded),
                        tooltip: 'Close',
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      color: Colors.white.withValues(alpha: 0.55),
                      border: Border.all(
                        color: AppStitchTheme.lightOutline.withValues(alpha: 0.6),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.search_rounded,
                            color: AppStitchTheme.lightOnSurfaceMuted),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: _controller,
                            decoration: const InputDecoration(
                              hintText: 'Search employees/admins…',
                              border: InputBorder.none,
                            ),
                          ),
                        ),
                        if (_q.isNotEmpty)
                          IconButton(
                            onPressed: () => _controller.clear(),
                            icon: const Icon(Icons.close_rounded),
                            tooltip: 'Clear',
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 360,
                    child: _loading
                        ? const Center(child: CircularProgressIndicator())
                        : (_error != null)
                            ? _InlineError(message: _error!, onRetry: () => _search(_q))
                            : (_results.isEmpty)
                                ? const Center(
                                    child: Text(
                                      'No users found.',
                                      style: TextStyle(
                                        color: AppStitchTheme.lightOnSurfaceMuted,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  )
                                : ListView.separated(
                                    itemCount: _results.length,
                                    separatorBuilder: (_, __) =>
                                        const SizedBox(height: 6),
                                    itemBuilder: (context, i) {
                                      final u = _results[i];
                                      final title = u.displayName;
                                      final subtitle = u.email;
                                      return InkWell(
                                        borderRadius: BorderRadius.circular(16),
                                        onTap: () async {
                                          final chat = ChatScope.of(context);
                                          final conv = await chat.startDm(u.id);
                                          if (!context.mounted) return;
                                          Navigator.pop(context);
                                          await chat.openConversation(conv.id);
                                          if (!context.mounted) return;
                                          Navigator.pushNamed(
                                            context,
                                            '/employee/chat/thread',
                                            arguments: {'conversationId': conv.id},
                                          );
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 12, vertical: 12),
                                          decoration: BoxDecoration(
                                            borderRadius:
                                                BorderRadius.circular(16),
                                            color: Colors.white
                                                .withValues(alpha: 0.38),
                                          ),
                                          child: Row(
                                            children: [
                                              CircleAvatar(
                                                backgroundColor:
                                                    AppStitchTheme.primary
                                                        .withValues(alpha: 0.18),
                                                child: Text(
                                                  title.isNotEmpty
                                                      ? title
                                                          .trim()
                                                          .substring(0, 1)
                                                          .toUpperCase()
                                                      : 'U',
                                                  style: const TextStyle(
                                                      fontWeight: FontWeight.w900),
                                                ),
                                              ),
                                              const SizedBox(width: 12),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      title,
                                                      maxLines: 1,
                                                      overflow:
                                                          TextOverflow.ellipsis,
                                                      style: Theme.of(context)
                                                          .textTheme
                                                          .titleSmall
                                                          ?.copyWith(
                                                            fontWeight:
                                                                FontWeight.w900,
                                                          ),
                                                    ),
                                                    const SizedBox(height: 2),
                                                    Text(
                                                      subtitle,
                                                      maxLines: 1,
                                                      overflow:
                                                          TextOverflow.ellipsis,
                                                      style: Theme.of(context)
                                                          .textTheme
                                                          .bodySmall
                                                          ?.copyWith(
                                                            color: AppStitchTheme
                                                                .lightOnSurfaceMuted,
                                                            fontWeight:
                                                                FontWeight.w600,
                                                          ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              const Icon(Icons.chevron_right_rounded,
                                                  color: AppStitchTheme
                                                      .lightOnSurfaceMuted),
                                            ],
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _InlineError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _InlineError({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off_rounded,
              color: AppStitchTheme.lightOnSurfaceMuted, size: 36),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppStitchTheme.lightOnSurfaceMuted,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

