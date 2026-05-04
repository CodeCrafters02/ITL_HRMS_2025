import 'package:flutter/material.dart';
import '../../../models/profile_model.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';
import '../../../widgets/optimized_image.dart';

class OrganizationHierarchyCard extends StatefulWidget {
  final OrganizationHierarchy hierarchy;
  final int? currentUserId;
  final Function(OrganizationNode)? onNodeTap;

  const OrganizationHierarchyCard({
    super.key,
    required this.hierarchy,
    this.currentUserId,
    this.onNodeTap,
  });

  @override
  State<OrganizationHierarchyCard> createState() =>
      _OrganizationHierarchyCardState();
}

class _OrganizationHierarchyCardState extends State<OrganizationHierarchyCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;

  // Track expanded nodes by id
  final Set<int> _expandedNodes = {};

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    )..forward();

    // Auto-expand the path to current user
    _autoExpandToUser();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _autoExpandToUser() {
    // Expand all nodes on the path to the current user
    for (final root in widget.hierarchy.roots) {
      _expandPathToUser(root);
    }
  }

  bool _expandPathToUser(OrganizationNode node) {
    if (node.id == widget.currentUserId) {
      _expandedNodes.add(node.id);
      return true;
    }
    if (node.children != null) {
      for (final child in node.children!) {
        if (_expandPathToUser(child)) {
          _expandedNodes.add(node.id);
          return true;
        }
      }
    }
    return false;
  }

  int _countTotal(OrganizationNode node) {
    int count = 1;
    if (node.children != null) {
      for (final c in node.children!) {
        count += _countTotal(c);
      }
    }
    return count;
  }

  @override
  Widget build(BuildContext context) {
    if (widget.hierarchy.roots.isEmpty) {
      return _buildEmptyState(context);
    }

    int totalPeople = 0;
    for (final root in widget.hierarchy.roots) {
      totalPeople += _countTotal(root);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        _buildHeader(context, totalPeople),
        const SizedBox(height: 16),
        // Tree content
        GlassCard(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
          child: Column(
            children: widget.hierarchy.roots.map((root) {
              return _buildTreeNode(context, root, 0, true);
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      child: Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AppStitchTheme.primary.withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.account_tree_rounded,
              size: 32,
              color: AppStitchTheme.primary.withValues(alpha: 0.4),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'No Hierarchy Data',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppStitchTheme.lightOnSurface,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            'Organization hierarchy data is not available\nfor this company.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppStitchTheme.lightOnSurfaceMuted,
              fontSize: 13,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, int totalPeople) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF0D9488), // teal
                  Color(0xFF0891B2), // cyan
                ],
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.account_tree_rounded, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Organization Chart',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: AppStitchTheme.lightOnSurface,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$totalPeople people in the org tree',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppStitchTheme.lightOnSurfaceMuted,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          // Expand/Collapse all button
          GestureDetector(
            onTap: () {
              setState(() {
                if (_expandedNodes.length > widget.hierarchy.roots.length) {
                  _expandedNodes.clear();
                  _autoExpandToUser();
                } else {
                  _expandAll(widget.hierarchy.roots);
                }
              });
            },
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppStitchTheme.lightOutline.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                _expandedNodes.length > widget.hierarchy.roots.length
                    ? Icons.unfold_less_rounded
                    : Icons.unfold_more_rounded,
                size: 20,
                color: AppStitchTheme.lightOnSurfaceMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _expandAll(List<OrganizationNode> nodes) {
    for (final node in nodes) {
      if (node.children != null && node.children!.isNotEmpty) {
        _expandedNodes.add(node.id);
        _expandAll(node.children!);
      }
    }
  }

  Widget _buildTreeNode(
      BuildContext context, OrganizationNode node, int depth, bool isLastChild) {
    final isYou = node.id == widget.currentUserId;
    final hasChildren = node.children != null && node.children!.isNotEmpty;
    final isExpanded = _expandedNodes.contains(node.id);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Node tile
        _OrgTreeTile(
          node: node,
          depth: depth,
          isYou: isYou,
          hasChildren: hasChildren,
          isExpanded: isExpanded,
          onTap: () {
            if (widget.onNodeTap != null) {
              widget.onNodeTap!(node);
            }
          },
          onToggle: hasChildren
              ? () {
                  setState(() {
                    if (isExpanded) {
                      _expandedNodes.remove(node.id);
                    } else {
                      _expandedNodes.add(node.id);
                    }
                  });
                }
              : null,
        ),
        // Children (animated)
        if (hasChildren)
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 250),
            crossFadeState:
                isExpanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            firstChild: const SizedBox.shrink(),
            secondChild: Padding(
              padding: const EdgeInsets.only(left: 20),
              child: Column(
                children: node.children!.asMap().entries.map((entry) {
                  final childIndex = entry.key;
                  final child = entry.value;
                  final isLast = childIndex == node.children!.length - 1;
                  return _buildTreeNode(context, child, depth + 1, isLast);
                }).toList(),
              ),
            ),
          ),
      ],
    );
  }
}

class _OrgTreeTile extends StatefulWidget {
  final OrganizationNode node;
  final int depth;
  final bool isYou;
  final bool hasChildren;
  final bool isExpanded;
  final VoidCallback? onTap;
  final VoidCallback? onToggle;

  const _OrgTreeTile({
    required this.node,
    required this.depth,
    required this.isYou,
    required this.hasChildren,
    required this.isExpanded,
    this.onTap,
    this.onToggle,
  });

  @override
  State<_OrgTreeTile> createState() => _OrgTreeTileState();
}

class _OrgTreeTileState extends State<_OrgTreeTile> {
  bool _isPressed = false;

  Color get _depthColor {
    const colors = [
      Color(0xFF7C3AED), // violet
      Color(0xFF2563EB), // blue
      Color(0xFF0D9488), // teal
      Color(0xFF059669), // emerald
      Color(0xFFD97706), // amber
      Color(0xFFDC2626), // red
    ];
    return colors[widget.depth % colors.length];
  }

  Color get _statusColor {
    if (widget.node.isOnline) return const Color(0xFF22C55E);
    if (widget.node.isAway) return const Color(0xFFF59E0B);
    if (widget.node.isDnd) return const Color(0xFFEF4444);
    return const Color(0xFF94A3B8);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          // Depth indicator bar
          Container(
            width: 3,
            height: 52,
            decoration: BoxDecoration(
              color: widget.isYou
                  ? AppStitchTheme.primary
                  : _depthColor.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 10),
          // Main tile
          Expanded(
            child: GestureDetector(
              onTapDown: (_) => setState(() => _isPressed = true),
              onTapUp: (_) {
                setState(() => _isPressed = false);
                widget.onTap?.call();
              },
              onTapCancel: () => setState(() => _isPressed = false),
              child: AnimatedScale(
                scale: _isPressed ? 0.97 : 1.0,
                duration: const Duration(milliseconds: 120),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: widget.isYou
                        ? AppStitchTheme.primary.withValues(alpha: 0.06)
                        : Colors.white.withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: widget.isYou
                          ? AppStitchTheme.primary.withValues(alpha: 0.2)
                          : AppStitchTheme.lightOutline.withValues(alpha: 0.25),
                    ),
                  ),
                  child: Row(
                    children: [
                      // Avatar
                      _buildAvatar(),
                      const SizedBox(width: 10),
                      // Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    widget.node.name,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                      color: widget.isYou
                                          ? AppStitchTheme.primary
                                          : AppStitchTheme.lightOnSurface,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (widget.isYou) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: AppStitchTheme.primary,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'YOU',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 8,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 0.3,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              widget.node.designation,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppStitchTheme.lightOnSurfaceMuted,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      // Children count & toggle
                      if (widget.hasChildren)
                        GestureDetector(
                          onTap: widget.onToggle,
                          behavior: HitTestBehavior.opaque,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 5),
                            decoration: BoxDecoration(
                              color: _depthColor.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  '${widget.node.children!.length}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: _depthColor,
                                  ),
                                ),
                                const SizedBox(width: 2),
                                AnimatedRotation(
                                  turns: widget.isExpanded ? 0.5 : 0.0,
                                  duration: const Duration(milliseconds: 200),
                                  child: Icon(
                                    Icons.keyboard_arrow_down_rounded,
                                    size: 16,
                                    color: _depthColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      else if (widget.onTap != null)
                        Icon(
                          Icons.chevron_right_rounded,
                          size: 18,
                          color: AppStitchTheme.lightOnSurfaceMuted
                              .withValues(alpha: 0.35),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatar() {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: widget.isYou
                ? LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppStitchTheme.primary,
                      AppStitchTheme.primary.withValues(alpha: 0.7),
                    ],
                  )
                : null,
            border: widget.isYou
                ? null
                : Border.all(
                    color: _depthColor.withValues(alpha: 0.3),
                    width: 2,
                  ),
          ),
          child: Padding(
            padding: EdgeInsets.all(widget.isYou ? 2 : 0),
            child: ClipOval(
              child: widget.node.photo != null && widget.node.photo!.isNotEmpty
                  ? OptimizedImage(
                      imageUrl: widget.node.photo!,
                      fit: BoxFit.cover,
                      placeholder: _buildPlaceholder(),
                    )
                  : _buildPlaceholder(),
            ),
          ),
        ),
        // Status dot
        Positioned(
          bottom: -1,
          right: -1,
          child: Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: _statusColor,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      decoration: BoxDecoration(
        color: widget.isYou
            ? Colors.white.withValues(alpha: 0.2)
            : _depthColor.withValues(alpha: 0.1),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          _getInitials(widget.node.name),
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: widget.isYou ? Colors.white : _depthColor,
          ),
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts.last[0]).toUpperCase();
  }
}

// Employee Detail Modal – Modernized
class EmployeeDetailModal extends StatelessWidget {
  final OrganizationNode node;

  const EmployeeDetailModal({
    super.key,
    required this.node,
  });

  Color get _statusColor {
    if (node.isOnline) return const Color(0xFF22C55E);
    if (node.isAway) return const Color(0xFFF59E0B);
    if (node.isDnd) return const Color(0xFFEF4444);
    return const Color(0xFF94A3B8);
  }

  String get _statusLabel {
    if (node.isOnline) return 'Online';
    if (node.isAway) return 'Away';
    if (node.isDnd) return 'Do Not Disturb';
    return 'Offline';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppStitchTheme.lightOutline.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),

            // Gradient background header
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppStitchTheme.primary.withValues(alpha: 0.08),
                    const Color(0xFF0D9488).withValues(alpha: 0.06),
                  ],
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: AppStitchTheme.lightOutline.withValues(alpha: 0.25),
                ),
              ),
              child: Column(
                children: [
                  // Profile Photo
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        width: 84,
                        height: 84,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              AppStitchTheme.primary,
                              AppStitchTheme.primary.withValues(alpha: 0.7),
                            ],
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(3),
                          child: ClipOval(
                            child: node.photo != null && node.photo!.isNotEmpty
                                ? OptimizedImage(
                                    imageUrl: node.photo!,
                                    fit: BoxFit.cover,
                                    placeholder: _buildPlaceholder(),
                                  )
                                : _buildPlaceholder(),
                          ),
                        ),
                      ),
                      // Status badge
                      Positioned(
                        bottom: -2,
                        right: -2,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: _statusColor,
                            borderRadius: BorderRadius.circular(12),
                            border:
                                Border.all(color: Colors.white, width: 2.5),
                            boxShadow: [
                              BoxShadow(
                                color: _statusColor.withValues(alpha: 0.3),
                                blurRadius: 6,
                              ),
                            ],
                          ),
                          child: Text(
                            _statusLabel,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Name
                  Text(
                    node.name,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: AppStitchTheme.lightOnSurface,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  // Designation
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppStitchTheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      node.designation,
                      style: TextStyle(
                        color: AppStitchTheme.primary,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Details grid
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: [
                  if (node.employeeId != null)
                    _buildDetailRow(
                      context,
                      Icons.badge_rounded,
                      'Employee ID',
                      node.employeeId!,
                      const Color(0xFF7C3AED),
                    ),
                  if (node.department != null)
                    _buildDetailRow(
                      context,
                      Icons.business_rounded,
                      'Department',
                      node.department!,
                      const Color(0xFF0D9488),
                    ),
                  if (node.email != null)
                    _buildDetailRow(
                      context,
                      Icons.email_rounded,
                      'Email',
                      node.email!,
                      const Color(0xFF2563EB),
                    ),
                  if (node.mobile != null)
                    _buildDetailRow(
                      context,
                      Icons.phone_rounded,
                      'Mobile',
                      node.mobile!,
                      const Color(0xFF059669),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 28),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(BuildContext context, IconData icon, String label,
      String value, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: color.withValues(alpha: 0.12),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 18, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      color: AppStitchTheme.lightOnSurfaceMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    value,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppStitchTheme.lightOnSurface,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      decoration: BoxDecoration(
        color: AppStitchTheme.primary.withValues(alpha: 0.15),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          _getInitials(node.name),
          style: TextStyle(
            fontSize: 30,
            fontWeight: FontWeight.w800,
            color: AppStitchTheme.primary,
          ),
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts.last[0]).toUpperCase();
  }
}
