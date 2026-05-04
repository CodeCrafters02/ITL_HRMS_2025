import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:file_picker/file_picker.dart';
import '../../models/loan_model.dart';
import '../../services/loan_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';

class LoanApplicationPage extends StatefulWidget {
  const LoanApplicationPage({super.key});

  @override
  State<LoanApplicationPage> createState() => _LoanApplicationPageState();
}

class _LoanApplicationPageState extends State<LoanApplicationPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<LoanCategory> _categories = [];
  List<LoanApplication> _myApplications = [];
  List<LoanApplication> _pendingApprovals = [];
  bool _isLoading = true;
  bool _isManager = false;

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
      LoanService.getLoanCategories(),
      LoanService.getMyLoanApplications(),
      LoanService.getPendingLoanApplications(),
    ]);
    if (mounted) {
      final pending = results[2].success && results[2].data != null
          ? results[2].data as List<LoanApplication>
          : <LoanApplication>[];
      final isManager = pending.isNotEmpty;
      final newLength = isManager ? 3 : 2;
      if (_tabController.length != newLength) {
        _tabController.dispose();
        _tabController = TabController(length: newLength, vsync: this);
      }
      setState(() {
        _isLoading = false;
        if (results[0].success && results[0].data != null) {
          _categories = (results[0].data as List<LoanCategory>)
              .where((c) => c.isActive)
              .toList();
        }
        if (results[1].success && results[1].data != null) {
          _myApplications = results[1].data as List<LoanApplication>;
        }
        _pendingApprovals = pending;
        _isManager = isManager;
      });
    }
  }

  Future<void> _handleApprove(LoanApplication application) async {
    final resp = await LoanService.approveLoan(application.id);
    if (mounted) {
      if (resp.success) {
        _showSuccess(resp.message ?? 'Approved');
        _loadData();
      } else {
        _showError(resp.message ?? 'Approval failed');
      }
    }
  }

  Future<void> _handleReject(LoanApplication application) async {
    final remarksController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject Loan Application'),
        content: TextField(
          controller: remarksController,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: 'Rejection Remarks',
            hintText: 'Provide a reason for rejection',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      final resp = await LoanService.rejectLoan(application.id, remarksController.text);
      if (mounted) {
        if (resp.success) {
          _showSuccess(resp.message ?? 'Rejected');
          _loadData();
        } else {
          _showError(resp.message ?? 'Rejection failed');
        }
      }
    }
    remarksController.dispose();
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

  void _openApplySheet(LoanCategory category) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _LoanApplySheet(
        category: category,
        onSubmitted: () {
          LoanService.getMyLoanApplications().then((resp) {
            if (mounted && resp.success && resp.data != null) {
              setState(() => _myApplications = resp.data!);
            }
          });
          _showSuccess('Loan application submitted!');
          _tabController.animateTo(1);
        },
        onError: _showError,
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
                              'Loan Application',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                            Text(
                              'Browse categories & track your applications',
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
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
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
                    indicatorSize: TabBarIndicatorSize.tab,
                    tabs: [
                      const Tab(text: 'Available Loans'),
                      const Tab(text: 'My Applications'),
                      if (_isManager)
                        Tab(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text('Pending Approvals'),
                              if (_pendingApprovals.isNotEmpty) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEF4444),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    '${_pendingApprovals.length}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                    ),
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
                          _buildCategoriesTab(),
                          _buildApplicationsTab(),
                          if (_isManager) _buildApprovalsTab(),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoriesTab() {
    if (_categories.isEmpty) {
      return _emptyState(
        icon: Icons.account_balance_rounded,
        title: 'No Loan Categories',
        subtitle: 'No loan categories are available at this time.',
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _categories.length,
      itemBuilder: (_, i) => _LoanCategoryCard(
        category: _categories[i],
        onApply: () => _openApplySheet(_categories[i]),
      ),
    );
  }

  Widget _buildApplicationsTab() {
    if (_myApplications.isEmpty) {
      return _emptyState(
        icon: Icons.receipt_long_rounded,
        title: 'No Applications Yet',
        subtitle: 'Your loan applications will appear here.',
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _myApplications.length,
        itemBuilder: (_, i) => _LoanApplicationCard(application: _myApplications[i]),
      ),
    );
  }

  Widget _buildApprovalsTab() {
    if (_pendingApprovals.isEmpty) {
      return _emptyState(
        icon: Icons.how_to_reg_rounded,
        title: 'No Pending Approvals',
        subtitle: 'All loan applications from your team have been reviewed.',
      );
    }
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _pendingApprovals.length,
        itemBuilder: (_, i) => _LoanApprovalCard(
          application: _pendingApprovals[i],
          onApprove: () => _handleApprove(_pendingApprovals[i]),
          onReject: () => _handleReject(_pendingApprovals[i]),
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

class _LoanCategoryCard extends StatelessWidget {
  final LoanCategory category;
  final VoidCallback onApply;

  const _LoanCategoryCard({required this.category, required this.onApply});

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0.00');
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: EdgeInsets.zero,
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              left: BorderSide(color: AppStitchTheme.primary, width: 4),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppStitchTheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(Icons.account_balance_rounded,
                          color: AppStitchTheme.primary, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        category.name,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    ),
                  ],
                ),
                if (category.description != null && category.description!.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    category.description!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppStitchTheme.lightOnSurfaceMuted,
                        ),
                  ),
                ],
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _InfoChip(
                      label: 'Max: ₹${fmt.format(category.maxLoanLimit)}',
                      color: const Color(0xFF10B981),
                    ),
                    _InfoChip(
                      label: 'Up to ${category.maxRepaymentMonths} months',
                      color: AppStitchTheme.primary,
                    ),
                    if (category.minTenureMonths > 0)
                      _InfoChip(
                        label: 'Min ${category.minTenureMonths}m tenure',
                        color: const Color(0xFFF59E0B),
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: onApply,
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('Apply Now'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppStitchTheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
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

class _InfoChip extends StatelessWidget {
  final String label;
  final Color color;

  const _InfoChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
      ),
    );
  }
}

class _LoanApplicationCard extends StatelessWidget {
  final LoanApplication application;

  const _LoanApplicationCard({required this.application});

  Color get _statusColor {
    switch (application.status) {
      case LoanStatus.approved:
      case LoanStatus.cleared:
        return const Color(0xFF10B981);
      case LoanStatus.rejected:
        return const Color(0xFFEF4444);
      case LoanStatus.managerApproved:
        return const Color(0xFF3B82F6);
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
                        application.categoryName,
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
                        application.status.displayName,
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: _statusColor),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _DetailItem(
                        label: 'Amount',
                        value: '₹${fmt.format(application.requestedAmount)}'),
                    const SizedBox(width: 16),
                    _DetailItem(
                        label: 'EMI',
                        value: '₹${fmt.format(application.emiAmount)}/mo'),
                    const SizedBox(width: 16),
                    _DetailItem(
                        label: 'Tenure',
                        value: '${application.repaymentMonths} months'),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Applied: ${dateFmt.format(application.createdAt)}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppStitchTheme.lightOnSurfaceMuted,
                      ),
                ),
                if (application.adminRemarks != null &&
                    application.adminRemarks!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.grey.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Remarks: ${application.adminRemarks}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppStitchTheme.lightOnSurfaceMuted,
                          ),
                    ),
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

class _DetailItem extends StatelessWidget {
  final String label;
  final String value;

  const _DetailItem({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppStitchTheme.lightOnSurfaceMuted,
                  fontSize: 10,
                )),
        Text(value,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w700,
                )),
      ],
    );
  }
}

class _LoanApplySheet extends StatefulWidget {
  final LoanCategory category;
  final VoidCallback onSubmitted;
  final void Function(String) onError;

  const _LoanApplySheet({
    required this.category,
    required this.onSubmitted,
    required this.onError,
  });

  @override
  State<_LoanApplySheet> createState() => _LoanApplySheetState();
}

class _LoanApplySheetState extends State<_LoanApplySheet> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _reasonController = TextEditingController();
  int _repaymentMonths = 12;
  double _emiAmount = 0;
  double _interestRate = 0;
  List<LoanInterestSlab> _slabs = [];
  bool _isCheckingEligibility = false;
  bool _isSubmitting = false;
  Map<String, dynamic>? _eligibilityResult;
  File? _document;

  @override
  void initState() {
    super.initState();
    _repaymentMonths = widget.category.maxRepaymentMonths.clamp(1, widget.category.maxRepaymentMonths);
    _loadSlabs();
    _amountController.addListener(_recalculateEmi);
  }

  @override
  void dispose() {
    _amountController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _loadSlabs() async {
    final resp = await LoanService.getInterestSlabs(widget.category.id);
    if (mounted && resp.success && resp.data != null) {
      setState(() => _slabs = resp.data!);
      _recalculateEmi();
    }
  }

  void _recalculateEmi() {
    final amount = double.tryParse(_amountController.text) ?? 0;
    if (amount <= 0 || _repaymentMonths <= 0) {
      setState(() { _emiAmount = 0; _interestRate = 0; });
      return;
    }
    double rate = 0;
    for (final slab in _slabs) {
      if (amount >= slab.minAmount && amount <= slab.maxAmount) {
        rate = slab.interestRate;
        break;
      }
    }
    if (rate == 0 && _slabs.isNotEmpty) {
      rate = _slabs.last.interestRate;
    }
    final monthlyRate = rate / 100 / 12;
    double emi;
    if (monthlyRate == 0) {
      emi = amount / _repaymentMonths;
    } else {
      emi = (amount * monthlyRate * pow(1 + monthlyRate, _repaymentMonths)) /
          (pow(1 + monthlyRate, _repaymentMonths) - 1);
    }
    setState(() {
      _interestRate = rate;
      _emiAmount = emi;
    });
  }

  double pow(double base, int exp) {
    double result = 1;
    for (int i = 0; i < exp; i++) result *= base;
    return result;
  }

  Future<void> _checkEligibility() async {
    final amount = double.tryParse(_amountController.text) ?? 0;
    if (amount <= 0) {
      widget.onError('Please enter a valid amount');
      return;
    }
    setState(() => _isCheckingEligibility = true);
    final resp = await LoanService.checkEligibility(
      categoryId: widget.category.id,
      amount: amount,
    );
    if (mounted) {
      setState(() {
        _isCheckingEligibility = false;
        _eligibilityResult = resp.data;
      });
    }
  }

  Future<void> _pickDocument() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
    );
    if (result != null && result.files.single.path != null) {
      setState(() => _document = File(result.files.single.path!));
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_eligibilityResult == null) {
      widget.onError('Please check eligibility first');
      return;
    }
    if (_eligibilityResult!['eligible'] == false) {
      widget.onError(_eligibilityResult!['reason'] ?? 'Not eligible');
      return;
    }
    setState(() => _isSubmitting = true);
    final resp = await LoanService.applyForLoan(
      categoryId: widget.category.id,
      requestedAmount: double.parse(_amountController.text),
      repaymentMonths: _repaymentMonths,
      interestRate: _interestRate,
      emiAmount: _emiAmount,
      reason: _reasonController.text,
      supportingDocument: _document,
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
    final fmt = NumberFormat('#,##0.00');
    final eligible = _eligibilityResult?['eligible'] as bool?;
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
                      child: Text('Apply: ${widget.category.name}',
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

                TextFormField(
                  controller: _amountController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
                  ],
                  decoration: InputDecoration(
                    labelText: 'Loan Amount (₹)',
                    hintText: 'Max ₹${fmt.format(widget.category.maxLoanLimit)}',
                    prefixIcon: const Icon(Icons.currency_rupee_rounded),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.06),
                  ),
                  validator: (v) {
                    final val = double.tryParse(v ?? '');
                    if (val == null || val <= 0) return 'Enter a valid amount';
                    if (val > widget.category.maxLoanLimit) {
                      return 'Exceeds max limit ₹${fmt.format(widget.category.maxLoanLimit)}';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                Text(
                  'Repayment Period: $_repaymentMonths months',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                Slider(
                  value: _repaymentMonths.toDouble(),
                  min: 1,
                  max: widget.category.maxRepaymentMonths.toDouble(),
                  divisions: widget.category.maxRepaymentMonths - 1,
                  activeColor: AppStitchTheme.primary,
                  label: '$_repaymentMonths months',
                  onChanged: (v) {
                    setState(() => _repaymentMonths = v.round());
                    _recalculateEmi();
                  },
                ),
                const SizedBox(height: 4),

                if (_emiAmount > 0)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppStitchTheme.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: AppStitchTheme.primary.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _EmiDetail(
                            label: 'Monthly EMI',
                            value: '₹${fmt.format(_emiAmount)}'),
                        _EmiDetail(
                            label: 'Interest Rate',
                            value: '${_interestRate.toStringAsFixed(1)}% p.a.'),
                        _EmiDetail(
                            label: 'Total Payable',
                            value: '₹${fmt.format(_emiAmount * _repaymentMonths)}'),
                      ],
                    ),
                  ),
                const SizedBox(height: 14),

                TextFormField(
                  controller: _reasonController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Reason / Purpose',
                    hintText: 'Briefly describe the purpose of the loan',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    filled: true,
                    fillColor: Colors.white.withValues(alpha: 0.06),
                  ),
                ),
                const SizedBox(height: 14),

                OutlinedButton.icon(
                  onPressed: _pickDocument,
                  icon: const Icon(Icons.attach_file_rounded, size: 18),
                  label: Text(_document == null
                      ? 'Attach Supporting Document (optional)'
                      : _document!.path.split('/').last),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppStitchTheme.primary,
                    side: BorderSide(
                        color: AppStitchTheme.primary.withValues(alpha: 0.4)),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 16),

                if (_eligibilityResult != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: eligible == true
                          ? const Color(0xFF10B981).withValues(alpha: 0.1)
                          : const Color(0xFFEF4444).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: eligible == true
                            ? const Color(0xFF10B981).withValues(alpha: 0.4)
                            : const Color(0xFFEF4444).withValues(alpha: 0.4),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          eligible == true
                              ? Icons.check_circle_rounded
                              : Icons.cancel_rounded,
                          color: eligible == true
                              ? const Color(0xFF10B981)
                              : const Color(0xFFEF4444),
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            eligible == true
                                ? 'You are eligible for this loan'
                                : (_eligibilityResult!['reason'] ?? 'Not eligible'),
                            style: TextStyle(
                              color: eligible == true
                                  ? const Color(0xFF10B981)
                                  : const Color(0xFFEF4444),
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _isCheckingEligibility ? null : _checkEligibility,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppStitchTheme.primary,
                          side: BorderSide(
                              color: AppStitchTheme.primary.withValues(alpha: 0.4)),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                        child: _isCheckingEligibility
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2))
                            : const Text('Check Eligibility'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: (_isSubmitting || eligible != true) ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppStitchTheme.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                        child: _isSubmitting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation(Colors.white)))
                            : const Text('Submit'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EmiDetail extends StatelessWidget {
  final String label;
  final String value;

  const _EmiDetail({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label,
            style: TextStyle(
                fontSize: 10,
                color: AppStitchTheme.lightOnSurfaceMuted,
                fontWeight: FontWeight.w500)),
        const SizedBox(height: 2),
        Text(value,
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: AppStitchTheme.primary)),
      ],
    );
  }
}

class _LoanApprovalCard extends StatelessWidget {
  final LoanApplication application;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const _LoanApprovalCard({
    required this.application,
    required this.onApprove,
    required this.onReject,
  });

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
            border: Border(
              left: BorderSide(color: const Color(0xFFF59E0B), width: 4),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.person_rounded, color: Color(0xFFF59E0B), size: 18),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            application.employeeName ?? 'Unknown Employee',
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          if (application.employeeId != null && application.employeeId!.isNotEmpty)
                            Text(
                              application.employeeId!,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppStitchTheme.lightOnSurfaceMuted,
                                  ),
                            ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'Pending',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFFF59E0B)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  application.categoryName,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _DetailItem(label: 'Amount', value: '₹${fmt.format(application.requestedAmount)}'),
                    const SizedBox(width: 16),
                    _DetailItem(label: 'EMI', value: '₹${fmt.format(application.emiAmount)}/mo'),
                    const SizedBox(width: 16),
                    _DetailItem(label: 'Tenure', value: '${application.repaymentMonths}m'),
                  ],
                ),
                if (application.reason != null && application.reason!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.grey.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Reason: ${application.reason}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppStitchTheme.lightOnSurfaceMuted),
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                Text(
                  'Applied: ${dateFmt.format(application.createdAt)}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppStitchTheme.lightOnSurfaceMuted),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onReject,
                        icon: const Icon(Icons.close_rounded, size: 16),
                        label: const Text('Reject'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFEF4444),
                          side: const BorderSide(color: Color(0xFFEF4444)),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: onApprove,
                        icon: const Icon(Icons.check_rounded, size: 16),
                        label: const Text('Approve'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF059669),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
