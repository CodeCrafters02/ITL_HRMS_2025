import 'package:flutter/material.dart';

import '../../../models/chat_conversation_model.dart';
import '../../../providers/chat_provider.dart';
import '../../../providers/chat_scope.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';
import '../../../widgets/stitch_background.dart';

class ManageGroupPage extends StatefulWidget {
  final int conversationId;
  const ManageGroupPage({super.key, required this.conversationId});

  @override
  State<ManageGroupPage> createState() => _ManageGroupPageState();
}

class _ManageGroupPageState extends State<ManageGroupPage> {
  bool _busy = false;
  String? _error;

  ChatConversation? _conversation(ChatProvider chat) {
    try {
      return chat.conversations.firstWhere((c) => c.id == widget.conversationId);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final chat = ChatScope.of(context);
    final conv = _conversation(chat);
    final members = conv?.members ?? const <ChatConversationMember>[];

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: StitchBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              children: [
                GlassCard(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_rounded),
                        onPressed: () => Navigator.pop(context),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Manage group',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Refresh',
                        icon: const Icon(Icons.refresh_rounded),
                        onPressed: _busy
                            ? null
                            : () async {
                                setState(() {
                                  _busy = true;
                                  _error = null;
                                });
                                try {
                                  await chat.refreshConversations(showLoading: false);
                                } catch (e) {
                                  setState(() => _error = e.toString());
                                } finally {
                                  if (mounted) setState(() => _busy = false);
                                }
                              },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: GlassCard(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (_error != null)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Text(
                              _error!,
                              style: const TextStyle(
                                color: Color(0xFFB91C1C),
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        Text(
                          conv?.name ?? 'Group',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Members',
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: AppStitchTheme.lightOnSurfaceMuted,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1,
                              ),
                        ),
                        const SizedBox(height: 10),
                        Expanded(
                          child: members.isEmpty
                              ? const Center(
                                  child: Text(
                                    'No members found.',
                                    style: TextStyle(
                                      color: AppStitchTheme.lightOnSurfaceMuted,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                )
                              : ListView.separated(
                                  itemCount: members.length,
                                  separatorBuilder: (_, __) =>
                                      const SizedBox(height: 6),
                                  itemBuilder: (context, i) {
                                    final m = members[i];
                                    return Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 12, vertical: 12),
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(16),
                                        color: Colors.white
                                            .withValues(alpha: 0.30),
                                      ),
                                      child: Row(
                                        children: [
                                          CircleAvatar(
                                            backgroundColor:
                                                AppStitchTheme.primary.withValues(alpha: 0.18),
                                            child: Text(
                                              m.user.displayName.isNotEmpty
                                                  ? m.user.displayName
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
                                                  m.user.displayName,
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: Theme.of(context)
                                                      .textTheme
                                                      .titleSmall
                                                      ?.copyWith(
                                                        fontWeight: FontWeight.w900,
                                                      ),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  '${m.user.email} • ${m.role}',
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: Theme.of(context)
                                                      .textTheme
                                                      .bodySmall
                                                      ?.copyWith(
                                                        color: AppStitchTheme
                                                            .lightOnSurfaceMuted,
                                                        fontWeight: FontWeight.w600,
                                                      ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          PopupMenuButton<String>(
                                            enabled: !_busy,
                                            onSelected: (value) async {
                                              setState(() {
                                                _busy = true;
                                                _error = null;
                                              });
                                              try {
                                                if (value == 'remove') {
                                                  await chat.removeMember(
                                                      widget.conversationId,
                                                      m.user.id);
                                                } else if (value.startsWith('role:')) {
                                                  final role =
                                                      value.split(':').last;
                                                  await chat.updateMemberRole(
                                                    widget.conversationId,
                                                    m.user.id,
                                                    role,
                                                  );
                                                }
                                              } catch (e) {
                                                setState(() => _error = e.toString());
                                              } finally {
                                                if (mounted) setState(() => _busy = false);
                                              }
                                            },
                                            itemBuilder: (_) => [
                                              const PopupMenuItem(
                                                value: 'role:member',
                                                child: Text('Set role: member'),
                                              ),
                                              const PopupMenuItem(
                                                value: 'role:admin',
                                                child: Text('Set role: admin'),
                                              ),
                                              const PopupMenuItem(
                                                value: 'role:viewer',
                                                child: Text('Set role: viewer'),
                                              ),
                                              const PopupMenuDivider(),
                                              const PopupMenuItem(
                                                value: 'remove',
                                                child: Text('Remove member'),
                                              ),
                                            ],
                                            icon: const Icon(Icons.more_vert_rounded),
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                        ),
                      ],
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
}

