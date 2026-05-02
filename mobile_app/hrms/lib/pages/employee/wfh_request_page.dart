import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/wfh_model.dart';
import '../../services/wfh_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';

class WFHRequestPage extends StatefulWidget {
  const WFHRequestPage({super.key});

  @override
  State<WFHRequestPage> createState() => _WFHRequestPageState();
}

class _WFHRequestPageState extends State<WFHRequestPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<WFHRequest> _myRequests = [];
  List<WFHRequest> _pendingApprovals = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final results = await Future.wait([
      WFHService.getMyWFHRequests(),
      WFHService.getPendingWFHRequests(),
    ]);
    if (mounted) {
      setState(() {
        _isLoading = false;
        if (results[0].success && results[0].data != null) {
          _myRequests = results[0].data as List<WFHRequest>;
        }
        if (results[1].success && results[1].data != null) {
          _pendingApprovals = results[1].data as List<WFHRequest>;
        }
      });
    }
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: const Color(0xFFEF4444),
      behavior: SnackBarBehavior.floating,
    ));
  }

  void _showSuccess(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: const Color(0xFF059669),
      behavior: SnackBarBehavior.floating,
    ));
  }

  void _openNewRequestSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _WFHRequestForm(
        onSubmitted: () {
          _loadData();
          _showSuccess('WFH request submitted!');
        },
        onError: _showError,
      ),
    );
  }

  Future<void> _approve(WFHRequest request) async {
    final resp = await WFHService.approveWFHRequest(request.id);
    if (resp.success) {
      _showSuccess('Request approved');
      _loadData();
    } else {
      _showError(resp.message ?? 'Failed to approve');
    }
  }

  Future<void> _reject(WFHRequest request) async {
    final reasonController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject WFH Request'),
        content: TextField(
          controller: reasonController,
          decoration: const InputDecoration(
            labelText: 'Rejection reason',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      final resp = await WFHService.rejectWFHRequest(request.id, reasonController.text);
      if (resp.success) {
        _showSuccess('Request rejected');
        _loadData();
      } else {
        _showError(resp.message ?? 'Failed to reject');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: StitchBackground(
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
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
                              'WFH Requests',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                            Text(
                              'Work From Home / Office requests',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppStitchTheme.lightOnSurfaceMuted,
                                  ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: _isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.refresh_rounded),
                        onPressed: _isLoading ? null : _loadData,
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: GlassCard(
                  padding: EdgeInsets.zero,
                  child: TabBar(
                    controller: _tabController,
                    labelColor: AppStitchTheme.primary,
                    unselectedLabelColor: AppStitchTheme.lightOnSurfaceMuted,
                    indicatorColor: AppStitchTheme.primary,
                    tabs: [
                      const Tab(text: 'My Requests'),
                      Tab(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text('Pending Approvals'),
                            if (_pendingApprovals.isNotEmpty) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEF4444),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  _pendingApprovals.length.toString(),
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : TabBarView(
                        controller: _tabController,
                        children: [
                          _buildMyRequestsTab(),
                          _buildPendingApprovalsTab(),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openNewRequestSheet,
        backgroundColor: AppStitchTheme.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('New Request'),
      ),
    );
  }

  Widget _buildMyRequestsTab() {
    if (_myRequests.isEmpty) {
      return _emptyState(
        icon: Icons.home_work_rounded,
        title: 'No Requests Yet',
        subtitle: 'Tap "New Request" to submit a WFH request.',
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
        itemCount: _myRequests.length,
        itemBuilder: (_, i) => _WFHRequestCard(
          request: _myRequests[i],
          showActions: false,
        ),
      ),
    );
  }

  Widget _buildPendingApprovalsTab() {
    if (_pendingApprovals.isEmpty) {
      return _emptyState(
        icon: Icons.check_circle_outline_rounded,
        title: 'No Pending Approvals',
        subtitle: 'All WFH requests have been handled.',
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        itemCount: _pendingApprovals.length,
        itemBuilder: (_, i) => _WFHRequestCard(
          request: _pendingApprovals[i],
          showActions: true,
          onApprove: () => _approve(_pendingApprovals[i]),
          onReject: () => _reject(_pendingApprovals[i]),
        ),
      ),
    );
  }

  Widget _emptyState({required IconData icon, required String title, required String subtitle}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: GlassCard(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 64, color: AppStitchTheme.lightOnSurfaceMuted),
              const SizedBox(height: 16),
              Text(title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      )),
              const SizedBox(height: 8),
              Text(subtitle,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppStitchTheme.lightOnSurfaceMuted,
                      )),
            ],
          ),
        ),
      ),
    );
  }
}

class _WFHRequestCard extends StatelessWidget {
  final WFHRequest request;
  final bool showActions;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;

  const _WFHRequestCard({
    required this.request,
    required this.showActions,
    this.onApprove,
    this.onReject,
  });

  Color get _statusColor {
    switch (request.status) {
      case WFHStatus.approved:
        return const Color(0xFF10B981);
      case WFHStatus.rejected:
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFFF59E0B);
    }
  }

  Color get _typeColor =>
      request.requestType == WFHRequestType.wfh ? AppStitchTheme.primary : const Color(0xFF8B5CF6);

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('dd MMM yyyy');
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: EdgeInsets.zero,
        child: Container(
          decoration: BoxDecoration(
            border: Border(left: BorderSide(color: _typeColor, width: 4)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _typeColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        request.requestType.displayName,
                        style: TextStyle(
                            fontSize: 11, fontWeight: FontWeight.w700, color: _typeColor),
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        request.status.displayName,
                        style: TextStyle(
                            fontSize: 11, fontWeight: FontWeight.w700, color: _statusColor),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                if (request.fromDate != null) ...[
                  Row(
                    children: [
                      Icon(Icons.date_range_rounded,
                          size: 16, color: AppStitchTheme.lightOnSurfaceMuted),
                      const SizedBox(width: 6),
                      Text(
                        request.toDate != null && request.fromDate != request.toDate
                            ? '${dateFmt.format(request.fromDate!)} → ${dateFmt.format(request.toDate!)} (${request.durationDays} days)'
                            : dateFmt.format(request.fromDate!),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                ],
                Text(
                  request.reason,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppStitchTheme.lightOnSurfaceMuted,
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (request.rejectionReason != null &&
                    request.rejectionReason!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Reason: ${request.rejectionReason}',
                      style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFFEF4444),
                          fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
                if (showActions) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: onReject,
                          icon: const Icon(Icons.close_rounded, size: 16),
                          label: const Text('Reject'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFEF4444),
                            side: const BorderSide(
                                color: Color(0xFFEF4444), width: 1.5),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: onApprove,
                          icon: const Icon(Icons.check_rounded, size: 16),
                          label: const Text('Approve'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _WFHRequestForm extends StatefulWidget {
  final VoidCallback onSubmitted;
  final void Function(String) onError;

  const _WFHRequestForm({required this.onSubmitted, required this.onError});

  @override
  State<_WFHRequestForm> createState() => _WFHRequestFormState();
}

class _WFHRequestFormState extends State<_WFHRequestForm> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();
  WFHRequestType _requestType = WFHRequestType.wfh;
  DateTime _fromDate = DateTime.now();
  DateTime _toDate = DateTime.now();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _pickDate({required bool isFrom}) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isFrom ? _fromDate : _toDate,
      firstDate: DateTime.now().subtract(const Duration(days: 7)),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (picked != null) {
      setState(() {
        if (isFrom) {
          _fromDate = picked;
          if (_toDate.isBefore(_fromDate)) _toDate = _fromDate;
        } else {
          _toDate = picked;
          if (_toDate.isBefore(_fromDate)) _fromDate = _toDate;
        }
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);
    final resp = await WFHService.submitWFHRequest(
      requestType: _requestType,
      reason: _reasonController.text,
      fromDate: _fromDate,
      toDate: _toDate,
    );
    if (mounted) {
      setState(() => _isSubmitting = false);
      Navigator.pop(context);
      if (resp.success) {
        widget.onSubmitted();
      } else {
        widget.onError(resp.message ?? 'Submission failed');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('dd MMM yyyy');
    final days = _toDate.difference(_fromDate).inDays + 1;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: GlassCard(
        borderRadius: 20,
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text('New WFH/WFO Request',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              )),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                Text('Request Type',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppStitchTheme.lightOnSurfaceMuted,
                          fontWeight: FontWeight.w600,
                        )),
                const SizedBox(height: 8),
                Row(
                  children: WFHRequestType.values.map((type) {
                    final selected = _requestType == type;
                    return Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(
                            right: type == WFHRequestType.wfh ? 8 : 0),
                        child: InkWell(
                          onTap: () => setState(() => _requestType = type),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: selected
                                  ? AppStitchTheme.primary.withValues(alpha: 0.12)
                                  : Colors.transparent,
                              border: Border.all(
                                color: selected
                                    ? AppStitchTheme.primary
                                    : Colors.grey.withValues(alpha: 0.3),
                                width: selected ? 2 : 1,
                              ),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Center(
                              child: Text(
                                type.displayName,
                                style: TextStyle(
                                  color: selected
                                      ? AppStitchTheme.primary
                                      : AppStitchTheme.lightOnSurfaceMuted,
                                  fontWeight: selected
                                      ? FontWeight.w700
                                      : FontWeight.normal,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),

                Row(
                  children: [
                    Expanded(
                      child: _DatePickerField(
                        label: 'From Date',
                        value: dateFmt.format(_fromDate),
                        onTap: () => _pickDate(isFrom: true),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _DatePickerField(
                        label: 'To Date',
                        value: dateFmt.format(_toDate),
                        onTap: () => _pickDate(isFrom: false),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '$days day${days > 1 ? 's' : ''} selected',
                  style: TextStyle(
                      fontSize: 12,
                      color: AppStitchTheme.primary,
                      fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 14),

                TextFormField(
                  controller: _reasonController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    labelText: 'Reason',
                    hintText: 'Describe the reason for your request',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.06),
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Reason is required' : null,
                ),
                const SizedBox(height: 16),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppStitchTheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation(Colors.white)))
                        : const Text('Submit Request',
                            style: TextStyle(fontWeight: FontWeight.w700)),
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

class _DatePickerField extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback onTap;

  const _DatePickerField(
      {required this.label, required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.withValues(alpha: 0.3)),
          borderRadius: BorderRadius.circular(10),
          color: Colors.white.withValues(alpha: 0.06),
        ),
        child: Row(
          children: [
            Icon(Icons.calendar_today_rounded,
                size: 16, color: AppStitchTheme.primary),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                        fontSize: 10,
                        color: AppStitchTheme.lightOnSurfaceMuted)),
                Text(value,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
