import 'package:flutter/material.dart';

import '../../../providers/chat_scope.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';
import '../../../widgets/stitch_background.dart';
import 'create_group_sheet.dart';
import 'new_chat_sheet.dart';

class ChatConversationsPage extends StatefulWidget {
  const ChatConversationsPage({super.key});

  @override
  State<ChatConversationsPage> createState() => _ChatConversationsPageState();
}

class _ChatConversationsPageState extends State<ChatConversationsPage>
    with WidgetsBindingObserver {
  final _searchController = TextEditingController();
  final _searchFocus = FocusNode();
  String _query = '';
  String _myUsername = '';
  bool _searching = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final chat = ChatScope.of(context);
      chat.initialize();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final me = await ChatScope.of(context).getMe();
      if (!mounted) return;
      setState(() => _myUsername = me.username);
    });
    _searchController.addListener(() {
      setState(() => _query = _searchController.text.trim().toLowerCase());
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final chat = ChatScope.of(context);
    if (state == AppLifecycleState.resumed) {
      chat.setForeground(true);
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.detached) {
      chat.setForeground(false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final chat = ChatScope.of(context);
    final all = chat.conversations;

    final filtered = _query.isEmpty
        ? all
        : all.where((c) {
            final name = (c.name ?? '').toLowerCase();
            final last = (c.lastMessage?.content ?? '').toLowerCase();
            final members = c.members
                .map((m) => m.user.displayName.toLowerCase())
                .join(' ');
            return name.contains(_query) ||
                last.contains(_query) ||
                members.contains(_query) ||
                c.type.toLowerCase().contains(_query);
          }).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: StitchBackground(
        showParticles: false,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              children: [
                GlassCard(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_rounded),
                        onPressed: () => Navigator.pop(context),
                        tooltip: 'Back',
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 160),
                          switchInCurve: Curves.easeOut,
                          switchOutCurve: Curves.easeIn,
                          child: _searching
                              ? TextField(
                                  key: const ValueKey('searchField'),
                                  controller: _searchController,
                                  focusNode: _searchFocus,
                                  decoration: const InputDecoration(
                                    hintText: 'Search…',
                                    border: InputBorder.none,
                                    isDense: true,
                                  ),
                                  textInputAction: TextInputAction.search,
                                )
                              : Text(
                                  'Chat',
                                  key: const ValueKey('title'),
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(
                                        fontWeight: FontWeight.w900,
                                        color: AppStitchTheme.lightOnSurface,
                                      ),
                                ),
                        ),
                      ),
                      if (_searching && _query.isNotEmpty)
                        IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () => _searchController.clear(),
                          tooltip: 'Clear',
                        ),
                      IconButton(
                        icon: Icon(_searching
                            ? Icons.search_off_rounded
                            : Icons.search_rounded),
                        tooltip: _searching ? 'Close search' : 'Search',
                        onPressed: () {
                          setState(() => _searching = !_searching);
                          if (_searching) {
                            WidgetsBinding.instance.addPostFrameCallback((_) {
                              if (mounted) _searchFocus.requestFocus();
                            });
                          } else {
                            _searchController.clear();
                            _searchFocus.unfocus();
                          }
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.group_add_outlined),
                        tooltip: 'Create group',
                        onPressed: () => showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (_) => const CreateGroupSheet(),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit_square),
                        tooltip: 'New chat',
                        onPressed: () => showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (_) => const NewChatSheet(),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: () => chat.refreshConversations(showLoading: false),
                    child: GlassCard(
                      enableBlur: false,
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                      child: Builder(
                        builder: (context) {
                          if (chat.loadingConversations && all.isEmpty) {
                            return const Center(
                              child: CircularProgressIndicator(),
                            );
                          }

                          if ((chat.error ?? '').isNotEmpty && all.isEmpty) {
                            return _ErrorState(
                              message: chat.error ?? 'Failed to load chat.',
                              onRetry: () => chat.refreshConversations(
                                  showLoading: true),
                            );
                          }

                          if (filtered.isEmpty) {
                            return _EmptyState(
                              hasSearch: _query.isNotEmpty,
                              onNewChat: () => showModalBottomSheet(
                                context: context,
                                isScrollControlled: true,
                                backgroundColor: Colors.transparent,
                                builder: (_) => const NewChatSheet(),
                              ),
                            );
                          }

                          return ListView.separated(
                            physics: const AlwaysScrollableScrollPhysics(),
                            addAutomaticKeepAlives: true,
                            addRepaintBoundaries: true,
                            cacheExtent: 200.0,
                            itemCount: filtered.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 6),
                            itemBuilder: (context, index) {
                              final c = filtered[index];
                              final title = c.isGroup
                                  ? (c.name ?? 'Group')
                                  : _dmTitle(c);
                              final subtitle =
                                  c.lastMessage?.content ?? 'No messages yet';
                              final time = c.lastMessage?.createdAt;
                              final unread = c.unreadCount;

                              final isUnread = unread > 0;

                              return RepaintBoundary(
                                child: InkWell(
                                borderRadius: BorderRadius.circular(16),
                                onTap: () {
                                  // Navigate instantly. The thread page will load/join messages.
                                  Navigator.pushNamed(
                                    context,
                                    '/employee/chat/thread',
                                    arguments: {'conversationId': c.id},
                                  );
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 12),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(16),
                                    color: isUnread
                                        ? AppStitchTheme.primary
                                            .withValues(alpha: 0.08)
                                        : Colors.white.withValues(alpha: 0.04),
                                  ),
                                  child: Row(
                                    children: [
                                      _AvatarCircle(
                                        label: title,
                                        isGroup: c.isGroup,
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    title,
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                    style: Theme.of(context)
                                                        .textTheme
                                                        .titleSmall
                                                        ?.copyWith(
                                                          fontWeight: isUnread
                                                              ? FontWeight.w900
                                                              : FontWeight.w800,
                                                        ),
                                                  ),
                                                ),
                                                if (time != null)
                                                  Text(
                                                    _formatTime(time),
                                                    style: Theme.of(context)
                                                        .textTheme
                                                        .labelSmall
                                                        ?.copyWith(
                                                          color: AppStitchTheme
                                                              .lightOnSurfaceMuted,
                                                          fontWeight:
                                                              FontWeight.w700,
                                                        ),
                                                  ),
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            Row(
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    subtitle,
                                                    maxLines: 2,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                    style: Theme.of(context)
                                                        .textTheme
                                                        .bodySmall
                                                        ?.copyWith(
                                                          color: isUnread
                                                              ? AppStitchTheme
                                                                  .lightOnSurface
                                                              : AppStitchTheme
                                                                  .lightOnSurfaceMuted,
                                                          fontWeight: isUnread
                                                              ? FontWeight.w700
                                                              : FontWeight.w600,
                                                        ),
                                                  ),
                                                ),
                                                if (unread > 0) ...[
                                                  const SizedBox(width: 10),
                                                  _Badge(count: unread),
                                                ],
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        );
                      },
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _dmTitle(c) {
    return _dmTitleFromMembers(c);
  }

  String _dmTitleFromMembers(dynamic c) {
    final members = (c.members as List);
    if (members.isEmpty) return 'Direct message';
    if (_myUsername.trim().isNotEmpty) {
      for (final m in members) {
        final u = m.user;
        if ((u.username).trim().isEmpty) continue;
        if (u.username != _myUsername) return u.displayName;
      }
    }
    return members.first.user.displayName;
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final d = dt;
    final diff = now.difference(d);
    if (diff.inDays >= 1) {
      return '${d.month}/${d.day}';
    }
    final h = d.hour.toString().padLeft(2, '0');
    final m = d.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}

class _Badge extends StatelessWidget {
  final int count;
  const _Badge({required this.count});

  @override
  Widget build(BuildContext context) {
    final label = count > 99 ? '99+' : count.toString();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF16A34A),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w900,
          height: 1,
        ),
      ),
    );
  }
}

class _AvatarCircle extends StatelessWidget {
  final String label;
  final bool isGroup;
  const _AvatarCircle({required this.label, required this.isGroup});

  String _initials() {
    final parts = label.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    final first = parts.isNotEmpty ? parts.first : label;
    if (first.isEmpty) return 'C';
    final chars = first.replaceAll(RegExp(r'[^A-Za-z0-9]'), '');
    if (chars.isEmpty) return 'C';
    return chars.substring(0, chars.length >= 2 ? 2 : 1).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final bg = isGroup
        ? const LinearGradient(
            colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
          )
        : const LinearGradient(
            colors: [Color(0xFF3B82F6), Color(0xFF60A5FA)],
          );
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: bg,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 10,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Center(
            child: Text(
              _initials(),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ),
        if (isGroup)
          Positioned(
            right: -2,
            bottom: -2,
            child: Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppStitchTheme.lightOutline.withValues(alpha: 0.65),
                ),
              ),
              child: const Icon(
                Icons.groups_rounded,
                size: 12,
                color: AppStitchTheme.primary,
              ),
            ),
          ),
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  final bool hasSearch;
  final VoidCallback onNewChat;
  const _EmptyState({required this.hasSearch, required this.onNewChat});

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 40),
        Icon(
          hasSearch ? Icons.search_off_rounded : Icons.chat_bubble_outline,
          size: 56,
          color: AppStitchTheme.lightOnSurfaceMuted,
        ),
        const SizedBox(height: 14),
        Text(
          hasSearch ? 'No matches' : 'No conversations yet',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
              ),
        ),
        const SizedBox(height: 6),
        Text(
          hasSearch
              ? 'Try a different search.'
              : 'Start a new chat with your team.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppStitchTheme.lightOnSurfaceMuted,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 18),
        if (!hasSearch)
          Center(
            child: ElevatedButton.icon(
              onPressed: onNewChat,
              icon: const Icon(Icons.edit_square),
              label: const Text('New chat'),
            ),
          ),
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 40),
        const Icon(Icons.wifi_off_rounded,
            size: 56, color: AppStitchTheme.lightOnSurfaceMuted),
        const SizedBox(height: 14),
        Text(
          'Couldn’t load chat',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
              ),
        ),
        const SizedBox(height: 6),
        Text(
          message,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppStitchTheme.lightOnSurfaceMuted,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 18),
        Center(
          child: ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Retry'),
          ),
        ),
      ],
    );
  }
}

