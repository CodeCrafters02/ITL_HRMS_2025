import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:dio/dio.dart';
import '../../models/company_policy_model.dart';
import '../../services/employee_service.dart';
import '../../services/storage_service.dart';
import '../../config/api_config.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';
import 'widgets/pdf_viewer_page.dart';

class CompanyPolicyPage extends StatefulWidget {
  const CompanyPolicyPage({super.key});

  @override
  State<CompanyPolicyPage> createState() => _CompanyPolicyPageState();
}

class _CompanyPolicyPageState extends State<CompanyPolicyPage> {
  List<CompanyPolicy> _policies = [];
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchPolicies();
  }

  Future<void> _fetchPolicies() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final response = await EmployeeService.getCompanyPolicies();

    if (response.success && response.data != null) {
      setState(() {
        _policies = response.data!;
        _isLoading = false;
      });
    } else {
      setState(() {
        _error = response.message ?? 'Failed to load company policies';
        _isLoading = false;
      });
    }
  }

  void _showDocumentOptions(CompanyPolicy policy) {
    if (policy.documentUrl == null || policy.documentUrl!.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No document available')));
      return;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          bottom: 16 + MediaQuery.of(context).viewInsets.bottom,
          top: 16,
        ),
        child: GlassCard(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.55),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: AppStitchTheme.lightOutline.withValues(alpha: 0.65),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.60),
                      border: Border.all(
                        color: AppStitchTheme.lightOutline.withValues(alpha: 0.70),
                      ),
                    ),
                    child: const Icon(Icons.policy_rounded, color: AppStitchTheme.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      policy.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: AppStitchTheme.lightOnSurface,
                          ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.visibility_rounded, color: AppStitchTheme.primary),
                title: Text(
                  'View PDF',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppStitchTheme.lightOnSurface,
                      ),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _viewPdf(policy);
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.download_rounded, color: AppStitchTheme.primary),
                title: Text(
                  'Download PDF',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppStitchTheme.lightOnSurface,
                      ),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _downloadPdf(policy);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _viewPdf(CompanyPolicy policy) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) =>
            PdfViewerPage(pdfUrl: policy.documentUrl!, title: policy.name),
      ),
    );
  }

  Future<void> _downloadPdf(CompanyPolicy policy) async {
    if (policy.documentUrl == null || policy.documentUrl!.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('No document available')));
      return;
    }

    // Note: For Android 10+ (API 29+), we use Downloads directory which doesn't require
    // storage permission. The permission_handler warning is harmless and can be ignored.
    // Downloads directory is accessible without permissions on modern Android versions.

    try {
      // Show loading indicator
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) =>
              const Center(child: CircularProgressIndicator()),
        );
      }

      // Get download directory
      // For Android, use Downloads directory which doesn't require permissions on Android 10+
      Directory? directory;
      if (Platform.isAndroid) {
        // Try to get Downloads directory first (no permission needed on Android 10+)
        try {
          final externalDir = await getExternalStorageDirectory();
          if (externalDir != null) {
            // Navigate to Downloads folder
            final downloadsDir = Directory(
              '${externalDir.path.split('/Android')[0]}/Download',
            );
            if (!await downloadsDir.exists()) {
              await downloadsDir.create(recursive: true);
            }
            directory = downloadsDir;
          } else {
            directory = await getApplicationDocumentsDirectory();
          }
        } catch (e) {
          // Fallback to application documents directory
          directory = await getApplicationDocumentsDirectory();
        }
      } else {
        directory = await getApplicationDocumentsDirectory();
      }

      // Ensure directory exists
      if (!await directory.exists()) {
        await directory.create(recursive: true);
      }

      // Get file name from URL
      final uri = Uri.parse(policy.documentUrl!);
      final fileName = uri.pathSegments.isNotEmpty
          ? uri.pathSegments.last
          : '${policy.name.replaceAll(' ', '_')}.pdf';

      final filePath = '${directory.path}/$fileName';

      // Get auth token
      final token = await StorageService.getAccessToken();
      if (token == null) {
        if (mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Authentication required')),
          );
        }
        return;
      }

      // Download file using Dio
      final dio = Dio();
      await dio.download(
        policy.documentUrl!,
        filePath,
        options: Options(headers: ApiConfig.getAuthHeaders(token)),
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Downloaded to: $filePath'),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Download failed: ${e.toString()}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: StitchBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              children: [
                GlassCard(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back_ios_new_rounded),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Company policies',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w900,
                                color: AppStitchTheme.lightOnSurface,
                              ),
                        ),
                      ),
                      IconButton(
                        onPressed: _fetchPolicies,
                        tooltip: 'Refresh',
                        icon: const Icon(Icons.refresh_rounded),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : _error != null
                          ? _buildErrorState()
                          : _policies.isEmpty
                              ? _buildEmptyState()
                              : _buildPoliciesGrid(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: GlassCard(
        padding: const EdgeInsets.all(18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFEF4444).withValues(alpha: 0.10),
                border: Border.all(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.20),
                ),
              ),
              child: const Icon(Icons.error_outline_rounded, color: Color(0xFFEF4444)),
            ),
            const SizedBox(height: 10),
            Text(
              _error ?? 'Unknown error',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppStitchTheme.lightOnSurfaceMuted,
                  ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _fetchPolicies,
                child: const Text('Retry'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: GlassCard(
        padding: const EdgeInsets.all(18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.60),
                border: Border.all(
                  color: AppStitchTheme.lightOutline.withValues(alpha: 0.70),
                ),
              ),
              child: const Icon(Icons.description_outlined, color: AppStitchTheme.primary),
            ),
            const SizedBox(height: 10),
            Text(
              'No policies available',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: AppStitchTheme.lightOnSurface,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              'Company policies will appear here when available.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppStitchTheme.lightOnSurfaceMuted,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPoliciesGrid() {
    return RefreshIndicator(
      onRefresh: _fetchPolicies,
      color: AppStitchTheme.primary,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final crossAxisCount = constraints.maxWidth > 600 ? 2 : 1;
          return GridView.builder(
            padding: EdgeInsets.zero,
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossAxisCount,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              childAspectRatio: 1.2,
            ),
            itemCount: _policies.length,
            itemBuilder: (context, index) {
              return _buildPolicyCard(_policies[index]);
            },
          );
        },
      ),
    );
  }

  Widget _buildPolicyCard(CompanyPolicy policy) {
    final hasDocument =
        policy.documentUrl != null && policy.documentUrl!.isNotEmpty;
    final isPdf =
        hasDocument && policy.documentUrl!.toLowerCase().endsWith('.pdf');

    return GlassCard(
      padding: const EdgeInsets.all(0),
      child: InkWell(
        onTap: hasDocument ? () => _showDocumentOptions(policy) : null,
        borderRadius: BorderRadius.circular(28),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.60),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: AppStitchTheme.lightOutline.withValues(alpha: 0.70),
                      ),
                    ),
                    child: Icon(
                      isPdf ? Icons.picture_as_pdf_rounded : Icons.description_rounded,
                      color: AppStitchTheme.primary,
                      size: 22,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: Text(
                  policy.name,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: AppStitchTheme.lightOnSurface,
                      ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(height: 12),
              if (hasDocument)
                Row(
                  children: [
                    const Icon(
                      Icons.more_horiz_rounded,
                      size: 18,
                      color: AppStitchTheme.primary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'View / Download',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppStitchTheme.primary,
                          ),
                    ),
                  ],
                )
              else
                Text(
                  'No document',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppStitchTheme.lightOnSurfaceMuted,
                      ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
