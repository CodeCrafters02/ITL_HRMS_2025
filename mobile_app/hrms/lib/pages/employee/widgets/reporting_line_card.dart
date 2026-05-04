import 'package:flutter/material.dart';
import '../../../models/profile_model.dart';
import '../../../models/reportee_model.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';
import '../../../widgets/optimized_image.dart';

class ReportingLineCard extends StatefulWidget {
  final PersonalReportingLine reportingLine;
  final int? currentUserId;
  final Function(OrganizationNode)? onNodeTap;
  final EmployeeHierarchy? hierarchy;
  final List<Reportee>? reportees;

  const ReportingLineCard({
    super.key,
    required this.reportingLine,
    this.currentUserId,
    this.onNodeTap,
    this.hierarchy,
    this.reportees,
  });

  @override
  State<ReportingLineCard> createState() => _ReportingLineCardState();
}

class _ReportingLineCardState extends State<ReportingLineCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final chain = widget.reportingLine.chain;
    final manager = widget.hierarchy?.reportingManager;
    final reportees = widget.reportees ?? [];
    final hierarchyReportees = widget.hierarchy?.reportees ?? [];

    if (chain.isEmpty && manager == null && reportees.isEmpty && hierarchyReportees.isEmpty) {
      return _buildEmptyState(context);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        _buildHeader(context, chain.length, reportees.length + hierarchyReportees.length),
        const SizedBox(height: 16),

        // Reporting Manager section
        if (manager != null) ...[
          _buildSectionLabel(context, 'REPORTING MANAGER', Icons.supervisor_account_rounded, const Color(0xFF0D9488)),
          const SizedBox(height: 8),
          _ManagerCard(manager: manager),
          const SizedBox(height: 20),
        ],

        // Reporting chain
        // if (chain.isNotEmpty) ...[
        //   _buildSectionLabel(context, 'REPORTING CHAIN', Icons.linear_scale_rounded, AppStitchTheme.primary),
        //   const SizedBox(height: 8),
        //   ...chain.asMap().entries.map((entry) {
        //     final index = entry.key;
        //     final node = entry.value;
        //     final isLast = index == chain.length - 1;
        //     final isYou = node.id == widget.currentUserId;
        //     return _AnimatedEntry(
        //       animation: _animController,
        //       index: index,
        //       total: chain.length,
        //       child: _ReportingChainNode(
        //         node: node, isLast: isLast, isYou: isYou,
        //         index: index, total: chain.length,
        //         onTap: widget.onNodeTap != null ? () => widget.onNodeTap!(node) : null,
        //       ),
        //     );
        //   }),
        //   const SizedBox(height: 12),
        // ],

        // Reportees section
        if (reportees.isNotEmpty) ...[
          _buildSectionLabel(context, 'MY REPORTEES (${reportees.length})', Icons.groups_rounded, const Color(0xFFE67E22)),
          const SizedBox(height: 8),
          ...reportees.asMap().entries.map((entry) {
            return _AnimatedEntry(
              animation: _animController,
              index: entry.key,
              total: reportees.length,
              child: _ReporteeTile(reportee: entry.value),
            );
          }),
        ] else if (hierarchyReportees.isNotEmpty) ...[
          _buildSectionLabel(context, 'MY REPORTEES (${hierarchyReportees.length})', Icons.groups_rounded, const Color(0xFFE67E22)),
          const SizedBox(height: 8),
          ...hierarchyReportees.asMap().entries.map((entry) {
            return _AnimatedEntry(
              animation: _animController,
              index: entry.key,
              total: hierarchyReportees.length,
              child: _HierarchyReporteeTile(employee: entry.value),
            );
          }),
        ],
      ],
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      child: Column(
        children: [
          Container(
            width: 72, height: 72,
            decoration: BoxDecoration(
              color: AppStitchTheme.primary.withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.account_tree_rounded, size: 32,
                color: AppStitchTheme.primary.withValues(alpha: 0.4)),
          ),
          const SizedBox(height: 20),
          Text('No Reporting Line', style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800, color: AppStitchTheme.lightOnSurface)),
          const SizedBox(height: 6),
          Text('Your reporting line data is not available yet.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppStitchTheme.lightOnSurfaceMuted, fontSize: 13, height: 1.5)),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, int chainLength, int reporteeCount) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft, end: Alignment.bottomRight,
                colors: [AppStitchTheme.primary, AppStitchTheme.primary.withValues(alpha: 0.7)],
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.people_alt_rounded, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('My Reporting Line', style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900, color: AppStitchTheme.lightOnSurface)),
                const SizedBox(height: 2),
                Text(
                  '${chainLength > 0 ? '$chainLength in chain' : ''}${chainLength > 0 && reporteeCount > 0 ? ' · ' : ''}${reporteeCount > 0 ? '$reporteeCount reportee${reporteeCount == 1 ? '' : 's'}' : ''}',
                  style: TextStyle(fontSize: 12, color: AppStitchTheme.lightOnSurfaceMuted, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionLabel(BuildContext context, String label, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, top: 4),
      child: Row(
        children: [
          Container(
            width: 26, height: 26,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, size: 14, color: color),
          ),
          const SizedBox(width: 8),
          Text(label, style: TextStyle(
            fontSize: 11, fontWeight: FontWeight.w900, color: color, letterSpacing: 0.5)),
        ],
      ),
    );
  }
}

// Animated wrapper
class _AnimatedEntry extends StatelessWidget {
  final AnimationController animation;
  final int index;
  final int total;
  final Widget child;

  const _AnimatedEntry({required this.animation, required this.index, required this.total, required this.child});

  @override
  Widget build(BuildContext context) {
    final delay = (index / (total > 1 ? total : 1)).clamp(0.0, 0.6);
    final progress = CurvedAnimation(
      parent: animation, curve: Interval(delay, 1.0, curve: Curves.easeOutCubic));
    return FadeTransition(
      opacity: progress,
      child: SlideTransition(
        position: Tween<Offset>(begin: const Offset(0, 0.12), end: Offset.zero).animate(progress),
        child: child,
      ),
    );
  }
}

// Manager card
class _ManagerCard extends StatelessWidget {
  final HierarchyEmployee manager;
  const _ManagerCard({required this.manager});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: manager.photo == null || manager.photo!.isEmpty
                  ? const LinearGradient(colors: [Color(0xFF0D9488), Color(0xFF0891B2)])
                  : null,
              border: manager.photo != null && manager.photo!.isNotEmpty
                  ? Border.all(color: const Color(0xFF0D9488).withValues(alpha: 0.2), width: 2)
                  : null,
            ),
            child: ClipOval(
              child: manager.photo != null && manager.photo!.isNotEmpty
                  ? OptimizedImage(
                      imageUrl: manager.photo!,
                      fit: BoxFit.cover,
                      placeholder: _buildPlaceholder(),
                    )
                  : _buildPlaceholder(),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Flexible(child: Text(manager.name,
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppStitchTheme.lightOnSurface),
                    maxLines: 1, overflow: TextOverflow.ellipsis)),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0D9488).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6)),
                    child: const Text('MANAGER', style: TextStyle(
                      fontSize: 9, fontWeight: FontWeight.w900, color: Color(0xFF0D9488), letterSpacing: 0.3)),
                  ),
                ]),
                const SizedBox(height: 3),
                Text('${manager.designation} • ${manager.level}',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppStitchTheme.lightOnSurfaceMuted),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ],
      ),
    );
  }
  Widget _buildPlaceholder() {
    return Center(
      child: Text(
        _getInitials(manager.name),
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '';
    if (parts.length == 1) return parts[0].isNotEmpty ? parts[0][0].toUpperCase() : '';
    return (parts[0][0] + parts.last[0]).toUpperCase();
  }
}

// Chain node
class _ReportingChainNode extends StatefulWidget {
  final OrganizationNode node;
  final bool isLast, isYou;
  final int index, total;
  final VoidCallback? onTap;

  const _ReportingChainNode({
    required this.node, required this.isLast, required this.isYou,
    required this.index, required this.total, this.onTap});

  @override
  State<_ReportingChainNode> createState() => _ReportingChainNodeState();
}

class _ReportingChainNodeState extends State<_ReportingChainNode> {
  bool _isPressed = false;

  Color get _accentColor {
    if (widget.isYou) return AppStitchTheme.primary;
    final t = widget.total > 1 ? widget.index / (widget.total - 1) : 0.0;
    return Color.lerp(const Color(0xFFE67E22), const Color(0xFF0D9488), t)!;
  }

  Color get _statusColor {
    if (widget.node.isOnline) return const Color(0xFF22C55E);
    if (widget.node.isAway) return const Color(0xFFF59E0B);
    if (widget.node.isDnd) return const Color(0xFFEF4444);
    return const Color(0xFF94A3B8);
  }

  String get _roleLabel {
    if (widget.isYou) return 'YOU';
    if (widget.index == 0) return 'TOP';
    return 'L${widget.index + 1}';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              width: 40,
              child: Column(children: [
                Container(
                  width: 14, height: 14,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: widget.isYou ? AppStitchTheme.primary : Colors.white,
                    border: Border.all(color: _accentColor, width: widget.isYou ? 0 : 2.5),
                    boxShadow: [BoxShadow(color: _accentColor.withValues(alpha: 0.35), blurRadius: 6)],
                  ),
                  child: widget.isYou ? const Icon(Icons.star_rounded, size: 10, color: Colors.white) : null,
                ),
                if (!widget.isLast)
                  Expanded(child: Container(
                    width: 2, margin: const EdgeInsets.only(top: 2),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter, end: Alignment.bottomCenter,
                        colors: [_accentColor.withValues(alpha: 0.5), _accentColor.withValues(alpha: 0.15)]),
                      borderRadius: BorderRadius.circular(1)),
                  )),
              ]),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(bottom: widget.isLast ? 0 : 12),
                child: GestureDetector(
                  onTapDown: (_) => setState(() => _isPressed = true),
                  onTapUp: (_) { setState(() => _isPressed = false); widget.onTap?.call(); },
                  onTapCancel: () => setState(() => _isPressed = false),
                  child: AnimatedScale(
                    scale: _isPressed ? 0.97 : 1.0,
                    duration: const Duration(milliseconds: 120),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: widget.isYou ? AppStitchTheme.primary.withValues(alpha: 0.06) : Colors.white.withValues(alpha: 0.85),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: widget.isYou ? AppStitchTheme.primary.withValues(alpha: 0.25) : AppStitchTheme.lightOutline.withValues(alpha: 0.35),
                          width: widget.isYou ? 1.5 : 1),
                        boxShadow: [BoxShadow(
                          color: widget.isYou ? AppStitchTheme.primary.withValues(alpha: 0.08) : Colors.black.withValues(alpha: 0.04),
                          blurRadius: 12, offset: const Offset(0, 4))],
                      ),
                      child: Row(children: [
                        _buildAvatar(),
                        const SizedBox(width: 12),
                        Expanded(child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(children: [
                              Flexible(child: Text(widget.node.name,
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800,
                                  color: widget.isYou ? AppStitchTheme.primary : AppStitchTheme.lightOnSurface),
                                maxLines: 1, overflow: TextOverflow.ellipsis)),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(color: _accentColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                                child: Text(_roleLabel, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: _accentColor, letterSpacing: 0.3)),
                              ),
                            ]),
                            const SizedBox(height: 3),
                            Text(widget.node.designation,
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppStitchTheme.lightOnSurfaceMuted),
                              maxLines: 1, overflow: TextOverflow.ellipsis),
                            if (widget.node.department != null) ...[
                              const SizedBox(height: 2),
                              Row(children: [
                                Icon(Icons.business_rounded, size: 11, color: AppStitchTheme.lightOnSurfaceMuted.withValues(alpha: 0.6)),
                                const SizedBox(width: 4),
                                Flexible(child: Text(widget.node.department!,
                                  style: TextStyle(fontSize: 11, color: AppStitchTheme.lightOnSurfaceMuted.withValues(alpha: 0.7)),
                                  maxLines: 1, overflow: TextOverflow.ellipsis)),
                              ]),
                            ],
                          ],
                        )),
                        if (widget.onTap != null)
                          Icon(Icons.chevron_right_rounded, size: 20, color: AppStitchTheme.lightOnSurfaceMuted.withValues(alpha: 0.4)),
                      ]),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatar() {
    return Stack(clipBehavior: Clip.none, children: [
      Container(
        width: 48, height: 48,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: widget.isYou ? LinearGradient(colors: [AppStitchTheme.primary, AppStitchTheme.primary.withValues(alpha: 0.7)]) : null,
          border: widget.isYou ? null : Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.4), width: 2),
        ),
        child: Padding(
          padding: EdgeInsets.all(widget.isYou ? 2 : 0),
          child: ClipOval(
            child: widget.node.photo != null && widget.node.photo!.isNotEmpty
                ? OptimizedImage(imageUrl: widget.node.photo!, fit: BoxFit.cover, placeholder: _placeholder())
                : _placeholder(),
          ),
        ),
      ),
      Positioned(bottom: 0, right: -1, child: Container(
        width: 14, height: 14,
        decoration: BoxDecoration(color: _statusColor, shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2.5)),
      )),
    ]);
  }

  Widget _placeholder() {
    return Container(
      decoration: BoxDecoration(
        color: widget.isYou ? Colors.white.withValues(alpha: 0.2) : _accentColor.withValues(alpha: 0.1),
        shape: BoxShape.circle),
      child: Center(child: Text(
        _getInitials(widget.node.name),
        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: widget.isYou ? Colors.white : _accentColor),
      )),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '';
    if (parts.length == 1) return parts[0].isNotEmpty ? parts[0][0].toUpperCase() : '';
    return (parts[0][0] + parts.last[0]).toUpperCase();
  }
}

// Reportee tile (from Reportee model)
class _ReporteeTile extends StatelessWidget {
  final Reportee reportee;
  const _ReporteeTile({required this.reportee});

  Color get _statusColor {
    switch (reportee.status) {
      case 'online': return const Color(0xFF22C55E);
      case 'away': return const Color(0xFFF59E0B);
      case 'dnd': return const Color(0xFFEF4444);
      default: return const Color(0xFF94A3B8);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.3)),
        ),
        child: Row(children: [
          Stack(clipBehavior: Clip.none, children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFE67E22).withValues(alpha: 0.3), width: 2)),
              child: ClipOval(
                child: reportee.photo != null && reportee.photo!.isNotEmpty
                    ? OptimizedImage(imageUrl: reportee.photo!, fit: BoxFit.cover, placeholder: _placeholder())
                    : _placeholder(),
              ),
            ),
            Positioned(bottom: -1, right: -1, child: Container(
              width: 12, height: 12,
              decoration: BoxDecoration(color: _statusColor, shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2)),
            )),
          ]),
          const SizedBox(width: 10),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min,
            children: [
              Row(children: [
                Flexible(child: Text(reportee.fullName,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppStitchTheme.lightOnSurface),
                  maxLines: 1, overflow: TextOverflow.ellipsis)),
                if (reportee.isCheckedIn) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    decoration: BoxDecoration(color: const Color(0xFF22C55E).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(4)),
                    child: const Text('IN', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: Color(0xFF22C55E))),
                  ),
                ],
              ]),
              const SizedBox(height: 2),
              Text(
                '${reportee.designationName ?? ''}${reportee.departmentName != null ? ' · ${reportee.departmentName}' : ''}',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppStitchTheme.lightOnSurfaceMuted),
                maxLines: 1, overflow: TextOverflow.ellipsis),
            ],
          )),
        ]),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      decoration: BoxDecoration(color: const Color(0xFFE67E22).withValues(alpha: 0.1), shape: BoxShape.circle),
      child: Center(child: Text(reportee.initials,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFFE67E22)))),
    );
  }
}

// Reportee tile (from HierarchyEmployee model fallback)
class _HierarchyReporteeTile extends StatelessWidget {
  final HierarchyEmployee employee;
  const _HierarchyReporteeTile({required this.employee});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppStitchTheme.lightOutline.withValues(alpha: 0.3)),
        ),
        child: Row(children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFFE67E22).withValues(alpha: 0.1),
              border: Border.all(color: const Color(0xFFE67E22).withValues(alpha: 0.3), width: 2)),
            child: ClipOval(
              child: employee.photo != null && employee.photo!.isNotEmpty
                  ? OptimizedImage(
                      imageUrl: employee.photo!,
                      fit: BoxFit.cover,
                      placeholder: _buildPlaceholder(),
                    )
                  : _buildPlaceholder(),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min,
            children: [
              Text(employee.name,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppStitchTheme.lightOnSurface),
                maxLines: 1, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 2),
              Text('${employee.designation} · ${employee.level}',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppStitchTheme.lightOnSurfaceMuted),
                maxLines: 1, overflow: TextOverflow.ellipsis),
            ],
          )),
        ]),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Center(
      child: Text(
        _getInitials(employee.name),
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFFE67E22)),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.isEmpty) return '';
    if (parts.length == 1) return parts[0].isNotEmpty ? parts[0][0].toUpperCase() : '';
    return (parts[0][0] + parts.last[0]).toUpperCase();
  }
}
