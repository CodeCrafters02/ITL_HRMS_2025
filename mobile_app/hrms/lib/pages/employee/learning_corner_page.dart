import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/learning_corner_model.dart';
import '../../services/employee_service.dart';
import '../../services/storage_service.dart';
import '../../config/api_config.dart';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';

class LearningCornerPage extends StatefulWidget {
  const LearningCornerPage({super.key});

  @override
  State<LearningCornerPage> createState() => _LearningCornerPageState();
}

class _LearningCornerPageState extends State<LearningCornerPage> {
  List<LearningCornerItem> _items = [];
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchLearningCornerItems();
  }

  Future<void> _fetchLearningCornerItems() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final response = await EmployeeService.getLearningCornerItems();

    if (response.success && response.data != null) {
      setState(() {
        _items = response.data!;
        _isLoading = false;
      });
    } else {
      setState(() {
        _error = response.message ?? 'Failed to load learning resources';
        _isLoading = false;
      });
    }
  }

  Future<void> _viewImage(String imageUrl) async {
    final token = await StorageService.getAccessToken();
    final headers = token != null
        ? ApiConfig.getAuthHeaders(token)
        : <String, String>{};

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Stack(
          children: [
            Center(
              child: InteractiveViewer(
                child: Image.network(
                  imageUrl,
                  headers: headers,
                  cacheWidth: 800,
                  cacheHeight: 600,
                  filterQuality: FilterQuality.low,
                  errorBuilder: (context, error, stackTrace) =>
                      const Icon(Icons.error, color: Colors.white, size: 64),
                ),
              ),
            ),
            Positioned(
              top: 40,
              right: 20,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _downloadDocument(String documentUrl, String title) async {
    try {
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) =>
              const Center(child: CircularProgressIndicator()),
        );
      }

      Directory? directory;
      if (Platform.isAndroid) {
        try {
          final externalDir = await getExternalStorageDirectory();
          if (externalDir != null) {
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
          directory = await getApplicationDocumentsDirectory();
        }
      } else {
        directory = await getApplicationDocumentsDirectory();
      }

      if (!await directory.exists()) {
        await directory.create(recursive: true);
      }

      final uri = Uri.parse(documentUrl);
      final fileName = uri.pathSegments.isNotEmpty
          ? uri.pathSegments.last
          : '${title.replaceAll(' ', '_')}.pdf';

      final filePath = '${directory.path}/$fileName';

      final token = await StorageService.getAccessToken();
      final dio = Dio();

      if (token != null) {
        dio.options.headers['Authorization'] = 'Bearer $token';
      }

      await dio.download(documentUrl, filePath);

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
          SnackBar(
            content: Text('Download failed: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _viewVideo(String videoUrl) async {
    final uri = Uri.parse(videoUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Cannot open video URL')));
      }
    }
  }

  Future<Map<String, String>> _getAuthHeaders() async {
    final token = await StorageService.getAccessToken();
    return token != null ? ApiConfig.getAuthHeaders(token) : {};
  }

  Widget _buildTable() {
    if (_items.isEmpty) {
      return GlassCard(
        padding: const EdgeInsets.all(18),
        child: Center(
          child: Text(
            'No learning resources found.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppStitchTheme.lightOnSurfaceMuted,
                ),
          ),
        ),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowColor: WidgetStateProperty.all(Colors.white.withValues(alpha: 0.35)),
        columns: const [
          DataColumn(
            label: Text('S.No', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          DataColumn(
            label: Text('Title', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          DataColumn(
            label: Text(
              'Description',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          DataColumn(
            label: Text('Image', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          DataColumn(
            label: Text(
              'Document',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          DataColumn(
            label: Text('Video', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
        rows: _items.asMap().entries.map((entry) {
          final index = entry.key;
          final item = entry.value;
          return DataRow(
            cells: [
              DataCell(Text('${index + 1}')),
              DataCell(
                SizedBox(
                  width: 150,
                  child: Text(
                    item.title,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                ),
              ),
              DataCell(
                SizedBox(
                  width: 200,
                  child: Text(
                    item.description ?? '—',
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              DataCell(
                item.image != null && item.image!.isNotEmpty
                    ? FutureBuilder<Map<String, String>>(
                        future: _getAuthHeaders(),
                        builder: (context, snapshot) {
                          return GestureDetector(
                            onTap: () => _viewImage(item.image!),
                            child: Image.network(
                              item.image!,
                              width: 48,
                              height: 48,
                              fit: BoxFit.cover,
                              headers: snapshot.data ?? {},
                              cacheWidth: 96,
                              cacheHeight: 96,
                              filterQuality: FilterQuality.low,
                              errorBuilder: (context, error, stackTrace) =>
                                  const Text('—'),
                            ),
                          );
                        },
                      )
                    : const Text('—'),
              ),
              DataCell(
                item.document != null && item.document!.isNotEmpty
                    ? TextButton(
                        onPressed: () =>
                            _downloadDocument(item.document!, item.title),
                        child: const Text(
                          'Download',
                          style: TextStyle(color: Color(0xFF4F46E5)),
                        ),
                      )
                    : const Text('—'),
              ),
              DataCell(
                item.video != null && item.video!.isNotEmpty
                    ? TextButton(
                        onPressed: () => _viewVideo(item.video!),
                        child: const Text(
                          'View',
                          style: TextStyle(color: Color(0xFF4F46E5)),
                        ),
                      )
                    : const Text('—'),
              ),
            ],
          );
        }).toList(),
      ),
    );
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
                          'Learning Corner',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w900,
                                color: AppStitchTheme.lightOnSurface,
                              ),
                        ),
                      ),
                      IconButton(
                        onPressed: _fetchLearningCornerItems,
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
                          ? Center(
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
                                      child: const Icon(
                                        Icons.error_outline_rounded,
                                        color: Color(0xFFEF4444),
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      _error!,
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
                                        onPressed: _fetchLearningCornerItems,
                                        child: const Text('Retry'),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            )
                          : RefreshIndicator(
                              onRefresh: _fetchLearningCornerItems,
                              color: AppStitchTheme.primary,
                              child: ListView(
                                physics: const AlwaysScrollableScrollPhysics(),
                                padding: EdgeInsets.zero,
                                children: [
                                  GlassCard(
                                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                                    child: Row(
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
                                          child: const Icon(
                                            Icons.school_rounded,
                                            color: AppStitchTheme.primary,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'Resources',
                                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                                      fontWeight: FontWeight.w900,
                                                      color: AppStitchTheme.lightOnSurface,
                                                    ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                'Total items: ${_items.length}',
                                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                                      fontWeight: FontWeight.w600,
                                                      color: AppStitchTheme.lightOnSurfaceMuted,
                                                    ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  GlassCard(
                                    padding: const EdgeInsets.all(12),
                                    child: _buildTable(),
                                  ),
                                  const SizedBox(height: 24),
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
