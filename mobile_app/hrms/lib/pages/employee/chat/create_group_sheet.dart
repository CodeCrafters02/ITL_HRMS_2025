import 'dart:async';

import 'package:flutter/material.dart';

import '../../../models/chat_user_model.dart';
import '../../../providers/chat_scope.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';
import '../../../widgets/stitch_background.dart';

class CreateGroupSheet extends StatefulWidget {
  const CreateGroupSheet({super.key});

  @override
  State<CreateGroupSheet> createState() => _CreateGroupSheetState();
}

class _CreateGroupSheetState extends State<CreateGroupSheet> {
  final _nameController = TextEditingController();
  final _searchController = TextEditingController();
  Timer? _debounce;

  bool _loading = false;
  String? _error;
  List<ChatUser> _results = const [];
  final Set<int> _selected = <int>{};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _search(''));
    _searchController.addListener(() {
      _debounce?.cancel();
      _debounce = Timer(const Duration(milliseconds: 280), () {
        _search(_searchController.text);
      });
      setState(() {});
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _nameController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _search(String q) async {
    final chat = ChatScope.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final users = await chat.searchUsers(q.trim());
      setState(() => _results = users);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool get _canCreate =>
      _nameController.text.trim().isNotEmpty && _selected.isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final maxHeight = media.size.height * 0.86;

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
              bottom: media.viewInsets.bottom + 16,
            ),
            child: ConstrainedBox(
              constraints: BoxConstraints(maxHeight: maxHeight),
              child: GlassCard(
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                child: Column(
                  mainAxisSize: MainAxisSize.max,
                  children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Create group',
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
                  TextField(
                    controller: _nameController,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      labelText: 'Group name',
                      hintText: 'e.g. HR Team',
                      filled: true,
                      fillColor: Colors.white.withValues(alpha: 0.55),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(18),
                        borderSide: BorderSide(
                          color: AppStitchTheme.lightOutline.withValues(alpha: 0.6),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
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
                            controller: _searchController,
                            decoration: const InputDecoration(
                              hintText: 'Add members…',
                              border: InputBorder.none,
                            ),
                          ),
                        ),
                        if (_searchController.text.trim().isNotEmpty)
                          IconButton(
                            onPressed: () => _searchController.clear(),
                            icon: const Icon(Icons.close_rounded),
                            tooltip: 'Clear',
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Expanded(
                    child: _loading
                        ? const Center(child: CircularProgressIndicator())
                        : (_error != null)
                            ? Center(
                                child: Text(
                                  _error!,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    color: AppStitchTheme.lightOnSurfaceMuted,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              )
                            : ListView.separated(
                                keyboardDismissBehavior:
                                    ScrollViewKeyboardDismissBehavior.onDrag,
                                itemCount: _results.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: 6),
                                itemBuilder: (context, i) {
                                  final u = _results[i];
                                  final selected = _selected.contains(u.id);
                                  return InkWell(
                                    borderRadius: BorderRadius.circular(16),
                                    onTap: () {
                                      setState(() {
                                        if (selected) {
                                          _selected.remove(u.id);
                                        } else {
                                          _selected.add(u.id);
                                        }
                                      });
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 12, vertical: 12),
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(16),
                                        color: selected
                                            ? AppStitchTheme.primary
                                                .withValues(alpha: 0.10)
                                            : Colors.white
                                                .withValues(alpha: 0.30),
                                      ),
                                      child: Row(
                                        children: [
                                          Icon(
                                            selected
                                                ? Icons.check_circle_rounded
                                                : Icons.circle_outlined,
                                            color: selected
                                                ? AppStitchTheme.primary
                                                : AppStitchTheme
                                                    .lightOnSurfaceMuted,
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  u.displayName,
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
                                                  u.email,
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
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _canCreate
                          ? () async {
                              final chat = ChatScope.of(context);
                              setState(() {
                                _loading = true;
                                _error = null;
                              });
                              try {
                                final conv = await chat.createGroup(
                                  name: _nameController.text.trim(),
                                  memberIds: _selected.toList(),
                                );
                                if (!context.mounted) return;
                                Navigator.pop(context);
                                await chat.openConversation(conv.id);
                                if (!context.mounted) return;
                                Navigator.pushNamed(
                                  context,
                                  '/employee/chat/thread',
                                  arguments: {'conversationId': conv.id},
                                );
                              } catch (e) {
                                setState(() => _error = e.toString());
                              } finally {
                                if (mounted) setState(() => _loading = false);
                              }
                            }
                          : null,
                      icon: const Icon(Icons.group_rounded),
                      label: Text(
                        _selected.isEmpty
                            ? 'Select members'
                            : 'Create group (${_selected.length})',
                      ),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xFFB91C1C),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

