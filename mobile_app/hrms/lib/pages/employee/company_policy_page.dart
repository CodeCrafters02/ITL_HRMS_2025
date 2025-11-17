import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:dio/dio.dart';
import '../../models/company_policy_model.dart';
import '../../services/employee_service.dart';
import '../../services/storage_service.dart';
import '../../config/api_config.dart';
import 'widgets/notification_button.dart';
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
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.visibility, color: Color(0xFF4F46E5)),
              title: const Text('View PDF'),
              onTap: () {
                Navigator.pop(context);
                _viewPdf(policy);
              },
            ),
            ListTile(
              leading: const Icon(Icons.download, color: Color(0xFF4F46E5)),
              title: const Text('Download PDF'),
              onTap: () {
                Navigator.pop(context);
                _downloadPdf(policy);
              },
            ),
            const SizedBox(height: 10),
          ],
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
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('Company Policies'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF111827),
        elevation: 0,
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 8.0),
            child: NotificationButton(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? _buildErrorState()
          : _policies.isEmpty
          ? _buildEmptyState()
          : _buildPoliciesGrid(),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Color(0xFFDC2626)),
            const SizedBox(height: 16),
            Text(
              _error ?? 'Unknown error',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF6B7280)),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _fetchPolicies,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4F46E5),
                foregroundColor: Colors.white,
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.description_outlined,
              size: 64,
              color: Color(0xFF6B7280),
            ),
            const SizedBox(height: 16),
            const Text(
              'No policies available',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Company policies will appear here when available',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF6B7280)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPoliciesGrid() {
    return RefreshIndicator(
      onRefresh: _fetchPolicies,
      color: const Color(0xFF4F46E5),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final crossAxisCount = constraints.maxWidth > 600 ? 2 : 1;
          return GridView.builder(
            padding: const EdgeInsets.all(16),
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

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: hasDocument ? () => _showDocumentOptions(policy) : null,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: Colors.white,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF4F46E5).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      isPdf ? Icons.picture_as_pdf : Icons.description,
                      color: const Color(0xFF4F46E5),
                      size: 24,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: Text(
                  policy.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF111827),
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
                      Icons.more_vert,
                      size: 16,
                      color: Color(0xFF4F46E5),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'View / Download',
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF4F46E5),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                )
              else
                const Text(
                  'No document',
                  style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
