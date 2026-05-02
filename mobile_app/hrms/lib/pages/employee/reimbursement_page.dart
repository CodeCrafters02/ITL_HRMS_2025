import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import '../../models/reimbursement_model.dart';
import '../../services/reimbursement_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';

class ReimbursementPage extends StatefulWidget {
  const ReimbursementPage({super.key});

  @override
  State<ReimbursementPage> createState() => _ReimbursementPageState();
}

class _ReimbursementPageState extends State<ReimbursementPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<ReimbursementRequest> _myRequests = [];
  List<ReimbursementRequest> _pendingApprovals = [];
  List<ReimbursementCategory> _categories = [];
  bool _isLoading = true;
  String _filterStatus = 'all';

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
      ReimbursementService.getCategories(),
      ReimbursementService.getMyReimbursements(),
    ]);
    if (mounted) {
      setState(() {
        _isLoading = false;
        if (results[0].success && results[0].data != null) {
          _categories = results[0].data as List<ReimbursementCategory>;
        }
        if (results[1].success && results[1].data != null) {
          final all = results[1].data as List<ReimbursementRequest>;
          _myRequests = all;
          _pendingApprovals = all
              .where((r) => r.status == ReimbursementStatus.pending)
              .toList();
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
      builder: (context) => _ReimbursementForm(
        categories: _categories,
        onSubmitted: () {
          _loadData();
          _showSuccess('Reimbursement request submitted!');
        },
        onError: _showError,
      ),
    );
  }

  Future<void> _approve(ReimbursementRequest req) async {
    final resp = await ReimbursementService.approveReimbursement(req.id);
    if (resp.success) {
      _showSuccess('Request approved');
      _loadData();
    } else {
      _showError(resp.message ?? 'Failed to approve');
    }
  }

  Future<void> _reject(ReimbursementRequest req) async {
    final reasonController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject Reimbursement'),
        content: TextField(
          controller: reasonController,
          decoration: const InputDecoration(
              labelText: 'Rejection reason', border: OutlineInputBorder()),
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
      final resp = await ReimbursementService.rejectReimbursement(
          req.id, reasonController.text);
      if (resp.success) {
        _showSuccess('Request rejected');
        _loadData();
      } else {
        _showError(resp.message ?? 'Failed to reject');
      }
    }
  }

  List<ReimbursementRequest> get _filteredMyRequests {
    if (_filterStatus == 'all') return _myRequests;
    return _myRequests
        .where((r) => r.status.apiValue == _filterStatus)
        .toList();
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
                            Text('Reimbursements',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w800)),
                            Text('Submit and track your expense claims',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                        color:
                                            AppStitchTheme.lightOnSurfaceMuted)),
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
                      const Tab(text: 'My Claims'),
                      Tab(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text('Approvals'),
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
                          _buildMyClaimsTab(),
                          _buildApprovalsTab(),
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
        label: const Text('New Claim'),
      ),
    );
  }

  Widget _buildMyClaimsTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final entry in {
                  'all': 'All',
                  'pending': 'Pending',
                  'approved': 'Approved',
                  'rejected': 'Rejected',
                }.entries)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      selected: _filterStatus == entry.key,
                      label: Text(entry.value),
                      onSelected: (_) =>
                          setState(() => _filterStatus = entry.key),
                      selectedColor: AppStitchTheme.primary.withValues(alpha: 0.15),
                      checkmarkColor: AppStitchTheme.primary,
                      labelStyle: TextStyle(
                        color: _filterStatus == entry.key
                            ? AppStitchTheme.primary
                            : AppStitchTheme.lightOnSurfaceMuted,
                        fontWeight: _filterStatus == entry.key
                            ? FontWeight.w700
                            : FontWeight.normal,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        Expanded(
          child: _filteredMyRequests.isEmpty
              ? _emptyState(
                  icon: Icons.receipt_long_rounded,
                  title: 'No Claims Found',
                  subtitle: 'Tap "New Claim" to submit an expense reimbursement.',
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                    itemCount: _filteredMyRequests.length,
                    itemBuilder: (_, i) => _ReimbursementCard(
                      request: _filteredMyRequests[i],
                      showActions: false,
                    ),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildApprovalsTab() {
    if (_pendingApprovals.isEmpty) {
      return _emptyState(
        icon: Icons.check_circle_outline_rounded,
        title: 'No Pending Approvals',
        subtitle: 'All reimbursement requests have been handled.',
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        itemCount: _pendingApprovals.length,
        itemBuilder: (_, i) => _ReimbursementCard(
          request: _pendingApprovals[i],
          showActions: true,
          onApprove: () => _approve(_pendingApprovals[i]),
          onReject: () => _reject(_pendingApprovals[i]),
        ),
      ),
    );
  }

  Widget _emptyState(
      {required IconData icon, required String title, required String subtitle}) {
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

class _ReimbursementCard extends StatelessWidget {
  final ReimbursementRequest request;
  final bool showActions;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;

  const _ReimbursementCard({
    required this.request,
    required this.showActions,
    this.onApprove,
    this.onReject,
  });

  Color get _statusColor {
    switch (request.status) {
      case ReimbursementStatus.approved:
        return const Color(0xFF10B981);
      case ReimbursementStatus.rejected:
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFFF59E0B);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0.00');
    final dateFmt = DateFormat('dd MMM yyyy');
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: EdgeInsets.zero,
        child: Container(
          decoration: BoxDecoration(
            border: Border(left: BorderSide(color: _statusColor, width: 4)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        request.displayCategory,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        request.status.displayName,
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: _statusColor),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Icon(Icons.currency_rupee_rounded,
                        size: 18, color: AppStitchTheme.primary),
                    const SizedBox(width: 4),
                    Text(
                      fmt.format(request.amount),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            color: AppStitchTheme.primary,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const Spacer(),
                    Text(
                      dateFmt.format(request.createdAt),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppStitchTheme.lightOnSurfaceMuted,
                          ),
                    ),
                  ],
                ),
                if (request.description.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    request.description,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppStitchTheme.lightOnSurfaceMuted,
                        ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (request.billAttachment != null) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(Icons.attach_file_rounded,
                          size: 14, color: AppStitchTheme.lightOnSurfaceMuted),
                      const SizedBox(width: 4),
                      Text('Receipt attached',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppStitchTheme.lightOnSurfaceMuted,
                              )),
                    ],
                  ),
                ],
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

class _ReimbursementForm extends StatefulWidget {
  final List<ReimbursementCategory> categories;
  final VoidCallback onSubmitted;
  final void Function(String) onError;

  const _ReimbursementForm({
    required this.categories,
    required this.onSubmitted,
    required this.onError,
  });

  @override
  State<_ReimbursementForm> createState() => _ReimbursementFormState();
}

class _ReimbursementFormState extends State<_ReimbursementForm> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _customCategoryController = TextEditingController();
  ReimbursementCategory? _selectedCategory;
  bool _useCustomCategory = false;
  File? _receiptFile;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    _customCategoryController.dispose();
    super.dispose();
  }

  Future<void> _pickReceipt() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => GlassCard(
        borderRadius: 16,
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded),
              title: const Text('Take Photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded),
              title: const Text('Choose from Gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source != null) {
      final picked = await ImagePicker().pickImage(source: source, imageQuality: 80);
      if (picked != null) {
        setState(() => _receiptFile = File(picked.path));
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_useCustomCategory && _selectedCategory == null) {
      widget.onError('Please select a category');
      return;
    }
    setState(() => _isSubmitting = true);
    final resp = await ReimbursementService.submitReimbursement(
      categoryId: _useCustomCategory ? null : _selectedCategory?.id,
      customCategory: _useCustomCategory ? _customCategoryController.text : null,
      amount: double.parse(_amountController.text),
      description: _descriptionController.text,
      billAttachment: _receiptFile,
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
                      child: Text('New Reimbursement Claim',
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

                if (!_useCustomCategory && widget.categories.isNotEmpty)
                  DropdownButtonFormField<ReimbursementCategory>(
                    value: _selectedCategory,
                    decoration: InputDecoration(
                      labelText: 'Category',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      filled: true,
                      fillColor: Colors.white.withValues(alpha: 0.06),
                    ),
                    items: widget.categories
                        .map((c) => DropdownMenuItem(value: c, child: Text(c.name)))
                        .toList(),
                    onChanged: (v) => setState(() => _selectedCategory = v),
                    validator: (v) =>
                        (!_useCustomCategory && v == null) ? 'Select a category' : null,
                  ),

                if (_useCustomCategory)
                  TextFormField(
                    controller: _customCategoryController,
                    decoration: InputDecoration(
                      labelText: 'Custom Category',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      filled: true,
                      fillColor: Colors.white.withValues(alpha: 0.06),
                    ),
                    validator: (v) =>
                        (_useCustomCategory && (v == null || v.trim().isEmpty))
                            ? 'Enter category name'
                            : null,
                  ),

                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => setState(() {
                        _useCustomCategory = !_useCustomCategory;
                        _selectedCategory = null;
                        _customCategoryController.clear();
                      }),
                      child: Text(
                        _useCustomCategory ? 'Use existing category' : 'Use custom category',
                        style: TextStyle(
                            color: AppStitchTheme.primary, fontSize: 12),
                      ),
                    ),
                  ],
                ),

                TextFormField(
                  controller: _amountController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
                  ],
                  decoration: InputDecoration(
                    labelText: 'Amount (₹)',
                    prefixIcon: const Icon(Icons.currency_rupee_rounded),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.06),
                  ),
                  validator: (v) {
                    final val = double.tryParse(v ?? '');
                    if (val == null || val <= 0) return 'Enter a valid amount';
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                TextFormField(
                  controller: _descriptionController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Description',
                    hintText: 'Describe the expense',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.06),
                  ),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Description is required' : null,
                ),
                const SizedBox(height: 14),

                OutlinedButton.icon(
                  onPressed: _pickReceipt,
                  icon: const Icon(Icons.receipt_rounded, size: 18),
                  label: Text(_receiptFile == null
                      ? 'Attach Receipt / Bill'
                      : _receiptFile!.path.split('/').last),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppStitchTheme.primary,
                    side: BorderSide(
                        color: AppStitchTheme.primary.withValues(alpha: 0.4)),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
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
                        : const Text('Submit Claim',
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
