import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../models/asset_request_model.dart';
import '../../services/asset_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';
import '../../widgets/optimized_image.dart';

// Filter chip configuration
class FilterOption {
  final String label;
  final dynamic value;
  final bool isActive;
  FilterOption({required this.label, this.value, required this.isActive});
}

class AssetRequestsPage extends StatefulWidget {
  const AssetRequestsPage({super.key});

  @override
  State<AssetRequestsPage> createState() => _AssetRequestsPageState();
}

class _AssetRequestsPageState extends State<AssetRequestsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _selectedTab = 0;

  // My Requests tab
  List<AssetRequest> _requests = [];
  bool _isLoadingRequests = true;
  AssetRequestType? _filterType;
  AssetRequestStatus? _filterStatus;

  // Pull to refresh key
  final GlobalKey<RefreshIndicatorState> _refreshIndicatorKey = GlobalKey<RefreshIndicatorState>();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      setState(() {
        _selectedTab = _tabController.index;
      });
      if (_tabController.index == 0 && _requests.isEmpty) {
        _fetchRequests();
      }
    });
    _fetchRequests();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchRequests() async {
    setState(() => _isLoadingRequests = true);

    try {
      final response = await AssetService.getMyAssetRequests(
        type: _filterType,
        status: _filterStatus,
      );

      if (mounted) {
        setState(() {
          _isLoadingRequests = false;
          if (response.success && response.data != null) {
            _requests = response.data!;
          } else {
            _showError(response.message ?? 'Failed to load requests');
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingRequests = false);
        _showError('Error: ${e.toString()}');
      }
    }
  }

  List<AssetRequest> get _filteredRequests {
    return _requests.where((request) {
      // Apply type filter
      if (_filterType != null && request.requestType != _filterType) {
        return false;
      }
      // Apply status filter
      if (_filterStatus != null && request.status != _filterStatus) {
        return false;
      }
      return true;
    }).toList();
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFFEF4444),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFF059669),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // Filter chip selection handlers
  void _onTypeFilterChanged(AssetRequestType? type) {
    setState(() {
      _filterType = _filterType == type ? null : type;
    });
  }

  void _onStatusFilterChanged(AssetRequestStatus? status) {
    setState(() {
      _filterStatus = _filterStatus == status ? null : status;
    });
  }

  void _clearFilters() {
    setState(() {
      _filterType = null;
      _filterStatus = null;
    });
  }

  void _showFilterDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => GlassCard(
          borderRadius: 20,
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Filter Requests',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  TextButton(
                    onPressed: () {
                      setModalState(() {
                        _filterType = null;
                        _filterStatus = null;
                      });
                      setState(() {
                        _filterType = null;
                        _filterStatus = null;
                      });
                    },
                    child: const Text('Clear All'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Request Type',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppStitchTheme.lightOnSurfaceMuted,
                    ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildFilterChip(
                    label: 'All Types',
                    isSelected: _filterType == null,
                    onTap: () {
                      setModalState(() => _filterType = null);
                      setState(() => _filterType = null);
                    },
                    color: Colors.grey,
                  ),
                  _buildFilterChip(
                    label: 'Core Assets',
                    isSelected: _filterType == AssetRequestType.core,
                    onTap: () {
                      setModalState(() => _filterType = AssetRequestType.core);
                      setState(() => _filterType = AssetRequestType.core);
                    },
                    color: const Color(0xFF3B82F6),
                  ),
                  _buildFilterChip(
                    label: 'Supply Items',
                    isSelected: _filterType == AssetRequestType.supply,
                    onTap: () {
                      setModalState(() => _filterType = AssetRequestType.supply);
                      setState(() => _filterType = AssetRequestType.supply);
                    },
                    color: const Color(0xFF10B981),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                'Status',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppStitchTheme.lightOnSurfaceMuted,
                    ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildFilterChip(
                    label: 'All Status',
                    isSelected: _filterStatus == null,
                    onTap: () {
                      setModalState(() => _filterStatus = null);
                      setState(() => _filterStatus = null);
                    },
                    color: Colors.grey,
                  ),
                  ...AssetRequestStatus.values.map((status) => _buildFilterChip(
                    label: status.displayName,
                    isSelected: _filterStatus == status,
                    onTap: () {
                      setModalState(() => _filterStatus = status);
                      setState(() => _filterStatus = status);
                    },
                    color: status.color,
                  )),
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppStitchTheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Done', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
    required Color color,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.15) : Colors.transparent,
          border: Border.all(
            color: isSelected ? color : Colors.grey.withValues(alpha: 0.3),
            width: 1.5,
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            color: isSelected ? color : Colors.grey[600],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: StitchBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Enhanced Header
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                child: GlassCard(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_rounded),
                        onPressed: () => Navigator.pop(context),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Asset Requests',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                            Text(
                              'Manage your asset requests',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppStitchTheme.lightOnSurfaceMuted,
                                    fontSize: 12,
                                  ),
                            ),
                          ],
                        ),
                      ),
                      if (_selectedTab == 0) ...[
                        IconButton(
                          icon: const Icon(Icons.filter_list_rounded),
                          onPressed: _showFilterDialog,
                          tooltip: 'Filter',
                        ),
                        IconButton(
                          icon: _isLoadingRequests
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.refresh_rounded),
                          onPressed: _isLoadingRequests ? null : _fetchRequests,
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              // Tab Bar - Now 2 tabs
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: GlassCard(
                  borderRadius: 16,
                  padding: const EdgeInsets.all(6),
                  child: TabBar(
                    controller: _tabController,
                    indicator: BoxDecoration(
                      color: AppStitchTheme.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    labelColor: AppStitchTheme.primary,
                    unselectedLabelColor: AppStitchTheme.lightOnSurfaceMuted,
                    labelStyle: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                    unselectedLabelStyle: const TextStyle(
                      fontWeight: FontWeight.w500,
                      fontSize: 13,
                    ),
                    dividerColor: Colors.transparent,
                    tabs: [
                      Tab(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.list_alt_rounded, size: 16),
                            const SizedBox(width: 6),
                            Text('My Requests (${_requests.length})'),
                          ],
                        ),
                      ),
                      const Tab(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_circle_rounded, size: 16),
                            SizedBox(width: 6),
                            Text('New Request'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Tab Content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildMyRequestsTab(),
                    _buildNewRequestTab(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: _selectedTab == 0
          ? FloatingActionButton.extended(
              onPressed: () => _tabController.animateTo(1),
              backgroundColor: AppStitchTheme.primary,
              icon: const Icon(Icons.add),
              label: const Text('New Request'),
            )
          : null,
    );
  }

  Widget _buildMyRequestsTab() {
    if (_isLoadingRequests) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(AppStitchTheme.primary),
        ),
      );
    }

    final filteredRequests = _filteredRequests;

    if (_requests.isEmpty) {
      return _buildEmptyState(
        icon: Icons.inventory_2_outlined,
        title: 'No Requests Yet',
        subtitle: 'Create your first asset request to get started',
        action: ElevatedButton.icon(
          onPressed: () => _tabController.animateTo(1),
          icon: const Icon(Icons.add),
          label: const Text('Create Request'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppStitchTheme.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          ),
        ),
      );
    }

    if (filteredRequests.isEmpty) {
      return _buildEmptyState(
        icon: Icons.filter_list_off_outlined,
        title: 'No Matching Requests',
        subtitle: 'Try adjusting your filters',
        action: ElevatedButton(
          onPressed: _clearFilters,
          child: const Text('Clear Filters'),
        ),
      );
    }

    return RefreshIndicator(
      key: _refreshIndicatorKey,
      onRefresh: _fetchRequests,
      color: AppStitchTheme.primary,
      child: Column(
        children: [
          // Section label
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Row(
              children: [
                Text(
                  'Filter by',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppStitchTheme.lightOnSurfaceMuted,
                      ),
                ),
              ],
            ),
          ),
          // Horizontal filter chips
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  // Type filters
                  _buildQuickFilterChip(
                    label: 'All Types',
                    isSelected: _filterType == null,
                    onTap: () => _onTypeFilterChanged(null),
                    color: AppStitchTheme.primary,
                    icon: Icons.filter_list_rounded,
                  ),
                  const SizedBox(width: 8),
                  _buildQuickFilterChip(
                    label: 'Core Asset',
                    isSelected: _filterType == AssetRequestType.core,
                    onTap: () => _onTypeFilterChanged(AssetRequestType.core),
                    color: const Color(0xFF3B82F6),
                    icon: Icons.devices_rounded,
                  ),
                  const SizedBox(width: 8),
                  _buildQuickFilterChip(
                    label: 'Supply',
                    isSelected: _filterType == AssetRequestType.supply,
                    onTap: () => _onTypeFilterChanged(AssetRequestType.supply),
                    color: const Color(0xFF10B981),
                    icon: Icons.inventory_2_rounded,
                  ),
                  const SizedBox(width: 16),
                  Container(
                    width: 1,
                    height: 24,
                    color: Colors.grey.withValues(alpha: 0.3),
                  ),
                  const SizedBox(width: 16),
                  // Status filters
                  _buildQuickFilterChip(
                    label: 'All Status',
                    isSelected: _filterStatus == null,
                    onTap: () => _onStatusFilterChanged(null),
                    color: AppStitchTheme.primary,
                    icon: Icons.list_rounded,
                  ),
                  const SizedBox(width: 8),
                  _buildQuickFilterChip(
                    label: 'Pending',
                    isSelected: _filterStatus == AssetRequestStatus.pending,
                    onTap: () => _onStatusFilterChanged(AssetRequestStatus.pending),
                    color: AssetRequestStatus.pending.color,
                    icon: Icons.pending_outlined,
                  ),
                  const SizedBox(width: 8),
                  _buildQuickFilterChip(
                    label: 'Approved',
                    isSelected: _filterStatus == AssetRequestStatus.approved,
                    onTap: () => _onStatusFilterChanged(AssetRequestStatus.approved),
                    color: AssetRequestStatus.approved.color,
                    icon: Icons.check_circle_outline,
                  ),
                  const SizedBox(width: 8),
                  _buildQuickFilterChip(
                    label: 'Rejected',
                    isSelected: _filterStatus == AssetRequestStatus.rejected,
                    onTap: () => _onStatusFilterChanged(AssetRequestStatus.rejected),
                    color: AssetRequestStatus.rejected.color,
                    icon: Icons.cancel_outlined,
                  ),
                ],
              ),
            ),
          ),
          // Results count
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Row(
              children: [
                Text(
                  '${filteredRequests.length} request${filteredRequests.length > 1 ? 's' : ''}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppStitchTheme.lightOnSurfaceMuted,
                        fontWeight: FontWeight.w500,
                      ),
                ),
                const Spacer(),
                if (_filterType != null || _filterStatus != null)
                  TextButton(
                    onPressed: _clearFilters,
                    child: const Text('Clear'),
                  ),
              ],
            ),
          ),
          // Request list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              itemCount: filteredRequests.length,
              itemBuilder: (context, index) {
                final request = filteredRequests[index];
                return _RequestCard(
                  request: request,
                  onCancel: request.status == AssetRequestStatus.pending
                      ? () => _cancelRequest(request)
                      : null,
                  onTap: () => _showRequestDetail(request),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickFilterChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
    required Color color,
    IconData? icon,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? color.withValues(alpha: 0.15) : Colors.white.withValues(alpha: 0.7),
            border: Border.all(
              color: isSelected ? color : Colors.grey.withValues(alpha: 0.25),
              width: isSelected ? 1.5 : 1,
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 14,
                  color: isSelected ? color : Colors.grey[600],
                ),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? color : Colors.grey[700],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showRequestDetail(AssetRequest request) {
    // TODO: Navigate to detail page
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        builder: (context, scrollController) => _RequestDetailSheet(
          request: request,
          onCancel: request.status == AssetRequestStatus.pending
              ? () async {
                  Navigator.pop(context);
                  await _cancelRequest(request);
                }
              : null,
        ),
      ),
    );
  }

  Future<void> _cancelRequest(AssetRequest request) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Request?'),
        content: Text(
            'Are you sure you want to cancel request ${request.requestNumber}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('No'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
            ),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final response = await AssetService.cancelRequest(request.id);
      if (response.success) {
        _showSuccess('Request cancelled');
        _fetchRequests();
      } else {
        _showError(response.message ?? 'Failed to cancel');
      }
    }
  }

  Widget _buildNewRequestTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: _NewRequestForm(
        onSuccess: () {
          _showSuccess('Request submitted successfully');
          _tabController.animateTo(0);
          _fetchRequests();
        },
      ),
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
    Widget? action,
  }) {
    return Center(
      child: GlassCard(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Gradient icon background
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppStitchTheme.primary.withValues(alpha: 0.2),
                    AppStitchTheme.primary.withValues(alpha: 0.05),
                  ],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                icon,
                size: 40,
                color: AppStitchTheme.primary,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppStitchTheme.lightOnSurface,
                    fontSize: 18,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppStitchTheme.lightOnSurfaceMuted,
                    height: 1.4,
                  ),
            ),
            if (action != null) ...[
              const SizedBox(height: 20),
              action,
            ],
          ],
        ),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  final AssetRequest request;
  final VoidCallback? onCancel;
  final VoidCallback? onTap;

  const _RequestCard({required this.request, this.onCancel, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: GlassCard(
          padding: const EdgeInsets.all(0),
          child: Container(
            decoration: BoxDecoration(
              border: Border(
                left: BorderSide(
                  color: request.status.color,
                  width: 4,
                ),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header row with badges
                  Row(
                    children: [
                      // Type badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: request.requestType == AssetRequestType.core
                              ? const Color(0xFF3B82F6).withValues(alpha: 0.12)
                              : const Color(0xFF10B981).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              request.requestType == AssetRequestType.core
                                  ? Icons.devices_rounded
                                  : Icons.inventory_2_rounded,
                              size: 12,
                              color: request.requestType == AssetRequestType.core
                                  ? const Color(0xFF3B82F6)
                                  : const Color(0xFF10B981),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              request.requestType == AssetRequestType.core
                                  ? 'CORE'
                                  : 'SUPPLY',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: request.requestType == AssetRequestType.core
                                    ? const Color(0xFF3B82F6)
                                    : const Color(0xFF10B981),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Status badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: request.status.color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          request.status.displayName.toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: request.status.color,
                          ),
                        ),
                      ),
                      const Spacer(),
                      if (onCancel != null)
                        IconButton(
                          icon: const Icon(Icons.close, size: 18),
                          color: const Color(0xFFEF4444),
                          onPressed: onCancel,
                          tooltip: 'Cancel',
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        )
                      else
                        const Icon(
                          Icons.chevron_right,
                          size: 20,
                          color: Colors.grey,
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  // Request number - more visible
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.grey.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      request.requestNumber,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            fontFamily: 'monospace',
                            letterSpacing: 0.5,
                            color: AppStitchTheme.lightOnSurface,
                          ),
                    ),
                  ),
                  // Item name or remarks
                  if (request.requestedItemName != null && request.requestedItemName!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      request.requestedItemName!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppStitchTheme.lightOnSurface,
                            fontSize: 15,
                          ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ] else if (request.remarks != null && request.remarks!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      request.remarks!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppStitchTheme.lightOnSurface,
                            fontSize: 15,
                          ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  // Quantity for supply
                  if (request.requestType == AssetRequestType.supply && request.requestedQuantity > 1) ...[
                    const SizedBox(height: 4),
                    Text(
                      '${request.requestedQuantity} items requested',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppStitchTheme.lightOnSurfaceMuted,
                          ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  // Footer row with date and image indicator
                  Row(
                    children: [
                      Icon(
                        Icons.calendar_today_rounded,
                        size: 14,
                        color: AppStitchTheme.lightOnSurfaceMuted,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        request.formattedDate,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppStitchTheme.lightOnSurfaceMuted,
                              fontWeight: FontWeight.w500,
                            ),
                      ),
                      if (request.image != null) ...[
                        const SizedBox(width: 12),
                        Icon(
                          Icons.image_rounded,
                          size: 14,
                          color: AppStitchTheme.primary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Has attachment',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppStitchTheme.primary,
                                fontWeight: FontWeight.w500,
                              ),
                        ),
                      ],
                    ],
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

class _RequestDetailSheet extends StatelessWidget {
  final AssetRequest request;
  final VoidCallback? onCancel;

  const _RequestDetailSheet({required this.request, this.onCancel});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      borderRadius: 20,
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Handle bar
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: request.requestType == AssetRequestType.core
                      ? const Color(0xFF3B82F6).withValues(alpha: 0.12)
                      : const Color(0xFF10B981).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      request.requestType == AssetRequestType.core
                          ? Icons.devices_rounded
                          : Icons.inventory_2_rounded,
                      size: 14,
                      color: request.requestType == AssetRequestType.core
                          ? const Color(0xFF3B82F6)
                          : const Color(0xFF10B981),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      request.requestType.displayName.toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: request.requestType == AssetRequestType.core
                            ? const Color(0xFF3B82F6)
                            : const Color(0xFF10B981),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: request.status.color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  request.status.displayName.toUpperCase(),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: request.status.color,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Request number - prominent with high visibility
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: AppStitchTheme.primary.withValues(alpha: 0.1),
              border: Border.all(
                color: AppStitchTheme.primary.withValues(alpha: 0.3),
                width: 1.5,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                Text(
                  'Request Number',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: AppStitchTheme.lightOnSurfaceMuted,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  request.requestNumber,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        fontFamily: 'monospace',
                        letterSpacing: 1.5,
                        color: AppStitchTheme.primary,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          // Item/Remarks first if available
          if (request.requestedItemName != null && request.requestedItemName!.isNotEmpty)
            _buildDetailRow(Icons.label_rounded, 'Requested Item', request.requestedItemName!),
          if (request.remarks != null && request.remarks!.isNotEmpty)
            _buildDetailRow(Icons.notes_rounded, 'Remarks', request.remarks!),
          // Details
          _buildDetailRow(Icons.calendar_today_rounded, 'Created', request.formattedDate),
          if (request.requestType == AssetRequestType.supply)
            _buildDetailRow(Icons.format_list_numbered_rounded, 'Quantity', '${request.requestedQuantity}'),
          if (request.image != null)
            _buildDetailRow(Icons.image_rounded, 'Attachment', 'Image attached'),
          const Spacer(),
          // Actions
          if (onCancel != null)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onCancel,
                icon: const Icon(Icons.cancel_outlined),
                label: const Text('Cancel Request'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white.withValues(alpha: 0.8),
                foregroundColor: AppStitchTheme.lightOnSurface,
                elevation: 2,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(
                    color: Colors.grey.withValues(alpha: 0.3),
                  ),
                ),
              ),
              child: const Text(
                'Close',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: 20,
            color: AppStitchTheme.lightOnSurfaceMuted,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: AppStitchTheme.lightOnSurfaceMuted,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NewRequestForm extends StatefulWidget {
  final VoidCallback onSuccess;

  const _NewRequestForm({required this.onSuccess});

  @override
  State<_NewRequestForm> createState() => _NewRequestFormState();
}

class _NewRequestFormState extends State<_NewRequestForm> {
  AssetRequestType _requestType = AssetRequestType.core;
  final _remarksController = TextEditingController();
  File? _selectedImage;
  bool _isSubmitting = false;

  // Supply items
  List<SupplyItem> _supplyItems = [];
  Map<int, int> _cart = {}; // itemId -> quantity
  bool _isLoadingSupplyItems = false;

  @override
  void initState() {
    super.initState();
    if (_requestType == AssetRequestType.supply) {
      _fetchSupplyItems();
    }
  }

  @override
  void dispose() {
    _remarksController.dispose();
    super.dispose();
  }

  Future<void> _fetchSupplyItems() async {
    setState(() => _isLoadingSupplyItems = true);

    try {
      final response = await AssetService.getSupplyItems();
      if (mounted) {
        setState(() {
          _isLoadingSupplyItems = false;
          if (response.success && response.data != null) {
            _supplyItems = response.data!;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingSupplyItems = false);
      }
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );

    if (picked != null) {
      setState(() {
        _selectedImage = File(picked.path);
      });
    }
  }

  Future<void> _submit() async {
    if (_requestType == AssetRequestType.core) {
      if (_remarksController.text.trim().isEmpty) {
        _showError('Please enter remarks describing the asset needed');
        return;
      }

      setState(() => _isSubmitting = true);

      final response = await AssetService.createCoreAssetRequest(
        remarks: _remarksController.text.trim(),
        image: _selectedImage,
      );

      if (mounted) {
        setState(() => _isSubmitting = false);
        if (response.success) {
          widget.onSuccess();
        } else {
          _showError(response.message ?? 'Failed to submit request');
        }
      }
    } else {
      // Supply request
      if (_cart.isEmpty) {
        _showError('Please select at least one supply item');
        return;
      }

      setState(() => _isSubmitting = true);

      final items = _cart.entries.map((entry) {
        return {
          'supply_item_id': entry.key,
          'quantity': entry.value,
        };
      }).toList();

      final response = await AssetService.createSupplyRequest(
        items: items,
        remarks: _remarksController.text.trim().isNotEmpty
            ? _remarksController.text.trim()
            : null,
      );

      if (mounted) {
        setState(() => _isSubmitting = false);
        if (response.success) {
          widget.onSuccess();
        } else {
          _showError(response.message ?? 'Failed to submit request');
        }
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFFEF4444),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _addToCart(SupplyItem item) {
    final currentQty = _cart[item.id] ?? 0;
    if (currentQty < item.maxPerOrder && currentQty < item.availableQuantity) {
      setState(() {
        _cart[item.id] = currentQty + 1;
      });
    }
  }

  void _removeFromCart(SupplyItem item) {
    final currentQty = _cart[item.id] ?? 0;
    if (currentQty > 0) {
      setState(() {
        if (currentQty == 1) {
          _cart.remove(item.id);
        } else {
          _cart[item.id] = currentQty - 1;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Request Type Selector with better visual
        GlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.category_rounded,
                    size: 16,
                    color: AppStitchTheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Select Request Type',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppStitchTheme.lightOnSurfaceMuted,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SegmentedButton<AssetRequestType>(
                segments: [
                  ButtonSegment(
                    value: AssetRequestType.core,
                    label: const Text('Core Asset'),
                    icon: const Icon(Icons.devices_rounded),
                  ),
                  ButtonSegment(
                    value: AssetRequestType.supply,
                    label: const Text('Supply Items'),
                    icon: const Icon(Icons.inventory_2_rounded),
                  ),
                ],
                selected: {_requestType},
                onSelectionChanged: (set) {
                  setState(() {
                    _requestType = set.first;
                    if (_requestType == AssetRequestType.supply) {
                      _fetchSupplyItems();
                    }
                  });
                },
              ),
              const SizedBox(height: 8),
              Text(
                _requestType == AssetRequestType.core
                    ? 'Request long-term assets like laptops, monitors, etc.'
                    : 'Request consumable supplies like stationery, etc.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppStitchTheme.lightOnSurfaceMuted,
                      fontSize: 12,
                    ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Dynamic content based on type
        if (_requestType == AssetRequestType.core)
          _buildCoreAssetForm()
        else
          _buildSupplyForm(),

        const SizedBox(height: 20),

        // Remarks (common)
        TextField(
          controller: _remarksController,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: 'Remarks (Optional)',
            hintText: 'Add any additional notes...',
            alignLabelWithHint: true,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),

        const SizedBox(height: 24),

        // Submit Button
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _isSubmitting ? null : _submit,
            icon: _isSubmitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Icon(Icons.send_rounded),
            label: Text(_isSubmitting ? 'Submitting...' : 'Submit Request'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppStitchTheme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSectionHeader({
    required IconData icon,
    required String label,
    bool isRequired = false,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: AppStitchTheme.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            icon,
            size: 16,
            color: AppStitchTheme.primary,
          ),
        ),
        const SizedBox(width: 10),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppStitchTheme.lightOnSurface,
                fontSize: 13,
              ),
        ),
        if (isRequired) ...[
          const SizedBox(width: 4),
          Text(
            '*',
            style: TextStyle(
              color: const Color(0xFFEF4444),
              fontWeight: FontWeight.w700,
              fontSize: 14,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildCoreAssetForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Description section
        _buildSectionHeader(
          icon: Icons.description_rounded,
          label: 'What do you need?',
          isRequired: true,
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _remarksController,
          maxLines: 4,
          decoration: InputDecoration(
            hintText: 'Describe the asset you need\n(e.g., Laptop, Monitor, Keyboard...)',
            hintStyle: TextStyle(
              color: AppStitchTheme.lightOnSurfaceMuted,
              height: 1.4,
            ),
            filled: true,
            fillColor: Colors.white.withValues(alpha: 0.5),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: AppStitchTheme.lightOutline.withValues(alpha: 0.3),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: AppStitchTheme.lightOutline.withValues(alpha: 0.3),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: AppStitchTheme.primary,
                width: 1.5,
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),
        // Attachment section
        _buildSectionHeader(
          icon: Icons.attach_file_rounded,
          label: 'Attachment',
          isRequired: false,
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: _pickImage,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            height: 120,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.5),
              border: Border.all(
                color: _selectedImage != null
                    ? AppStitchTheme.primary
                    : AppStitchTheme.lightOutline.withValues(alpha: 0.3),
                width: _selectedImage != null ? 1.5 : 1,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: _selectedImage != null
                ? Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(
                          _selectedImage!,
                          fit: BoxFit.cover,
                          width: double.infinity,
                          height: double.infinity,
                        ),
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: IconButton(
                            icon: const Icon(Icons.close, color: Colors.white, size: 18),
                            onPressed: () {
                              setState(() {
                                _selectedImage = null;
                              });
                            },
                            padding: const EdgeInsets.all(4),
                            constraints: const BoxConstraints(),
                          ),
                        ),
                      ),
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppStitchTheme.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          Icons.add_photo_alternate_rounded,
                          size: 32,
                          color: AppStitchTheme.primary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Tap to add image',
                        style: TextStyle(
                          color: AppStitchTheme.lightOnSurfaceMuted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Optional',
                        style: TextStyle(
                          color: AppStitchTheme.lightOnSurfaceMuted.withValues(alpha: 0.7),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
        if (_selectedImage != null)
          TextButton.icon(
            onPressed: () => setState(() => _selectedImage = null),
            icon: const Icon(Icons.delete_outline, size: 18),
            label: const Text('Remove image'),
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFFEF4444),
            ),
          ),
      ],
    );
  }

  Widget _buildSupplyForm() {
    if (_isLoadingSupplyItems) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_supplyItems.isEmpty) {
      return GlassCard(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(
              Icons.inventory_2_outlined,
              size: 48,
              color: AppStitchTheme.lightOnSurfaceMuted,
            ),
            const SizedBox(height: 12),
            Text(
              'No supply items available',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppStitchTheme.lightOnSurfaceMuted,
                  ),
            ),
          ],
        ),
      );
    }

    // Cart summary
    final cartItems = _cart.entries.length;
    final cartTotal = _cart.entries.fold<int>(
      0,
      (sum, entry) => sum + entry.value,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (cartItems > 0)
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppStitchTheme.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppStitchTheme.primary.withValues(alpha: 0.2),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.shopping_cart_rounded,
                  color: AppStitchTheme.primary,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    '$cartItems items, $cartTotal qty selected',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppStitchTheme.primary,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() => _cart.clear()),
                  child: const Text('Clear'),
                ),
              ],
            ),
          ),
        Text(
          'Available Items',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: AppStitchTheme.lightOnSurfaceMuted,
              ),
        ),
        const SizedBox(height: 12),
        ..._supplyItems.map((item) => _SupplyItemCard(
              item: item,
              quantity: _cart[item.id] ?? 0,
              onAdd: () => _addToCart(item),
              onRemove: () => _removeFromCart(item),
            )),
      ],
    );
  }
}

class _SupplyItemCard extends StatelessWidget {
  final SupplyItem item;
  final int quantity;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  const _SupplyItemCard({
    required this.item,
    required this.quantity,
    required this.onAdd,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final canAdd = quantity < item.maxPerOrder && quantity < item.availableQuantity;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GlassCard(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppStitchTheme.lightSurface.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(8),
              ),
              child: item.image != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: OptimizedImage(
                        imageUrl: item.image!,
                        width: 48,
                        height: 48,
                        fit: BoxFit.cover,
                        memCacheWidth: 96,
                        memCacheHeight: 96,
                        errorWidget: const Icon(
                          Icons.inventory_2_rounded,
                          color: Colors.grey,
                        ),
                      ),
                    )
                  : const Icon(
                      Icons.inventory_2_rounded,
                      color: Colors.grey,
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.itemName,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (item.category != null)
                    Text(
                      item.category!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppStitchTheme.lightOnSurfaceMuted,
                          ),
                    ),
                  Text(
                    'Available: ${item.availableQuantity} • Max/order: ${item.maxPerOrder}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppStitchTheme.lightOnSurfaceMuted,
                          fontSize: 11,
                        ),
                  ),
                ],
              ),
            ),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.remove_circle_outline),
                  onPressed: quantity > 0 ? onRemove : null,
                  color: quantity > 0 ? const Color(0xFFEF4444) : Colors.grey,
                  iconSize: 24,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: quantity > 0
                        ? AppStitchTheme.primary.withValues(alpha: 0.12)
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    quantity.toString(),
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: quantity > 0 ? AppStitchTheme.primary : Colors.grey,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add_circle_outline),
                  onPressed: canAdd ? onAdd : null,
                  color: canAdd ? const Color(0xFF10B981) : Colors.grey,
                  iconSize: 24,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
