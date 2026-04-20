import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/learning_corner_model.dart';
import '../../services/employee_service.dart';
import '../../services/storage_service.dart';
import '../../config/api_config.dart';
import '../../widgets/employee_app_bar.dart';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';

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
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: Text(
            'No learning resources found.',
            style: TextStyle(fontSize: 16, color: Color(0xFF6B7280)),
          ),
        ),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowColor: WidgetStateProperty.all(const Color(0xFFF3F4F6)),
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
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: EmployeeAppBar(title: 'Learning Corner'),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 64,
                      color: Color(0xFFDC2626),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 16,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _fetchLearningCornerItems,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF4F46E5),
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )
          : RefreshIndicator(
              onRefresh: _fetchLearningCornerItems,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Learning Corner',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Company learning resources for employees. Total items: ${_items.length}',
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                    const SizedBox(height: 24),
                    _buildTable(),
                  ],
                ),
              ),
            ),
    );
  }
}
