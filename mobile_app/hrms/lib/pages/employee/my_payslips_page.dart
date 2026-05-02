import 'dart:io';
import 'package:flutter/material.dart';
import 'package:pdfx/pdfx.dart';
import 'package:share_plus/share_plus.dart';
import '../../models/payslip_model.dart';
import '../../services/payslip_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';

class MyPayslipsPage extends StatefulWidget {
  const MyPayslipsPage({super.key});

  @override
  State<MyPayslipsPage> createState() => _MyPayslipsPageState();
}

class _MyPayslipsPageState extends State<MyPayslipsPage> {
  List<Payslip> _payslips = [];
  bool _isLoading = true;
  bool _isDownloading = false;
  bool _isViewing = false;
  final Map<String, String> _cachedFilePaths = {};
  int? _selectedYear;
  Set<int> _availableYears = {};

  @override
  void initState() {
    super.initState();
    _fetchPayslips();
  }

  Future<void> _fetchPayslips() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await PayslipService.getPayslips(
        year: _selectedYear,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (response.success && response.data != null) {
            _payslips = response.data!;
            // Extract available years
            _availableYears = _payslips.map((p) => p.year).toSet();
          } else {
            _showError(response.message ?? 'Failed to load payslips');
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _showError('Error: ${e.toString()}');
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

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFF059669),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSavedToast(String filePath) {
    final displayPath = filePath
        .replaceAll('/storage/emulated/0/', 'Internal Storage/')
        .replaceAll(RegExp(r'.*/Android/data/[^/]+/files'), 'Internal Storage/Documents');
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Payslip saved!',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                  ),
                  Text(
                    displayPath,
                    style: const TextStyle(fontSize: 11, color: Colors.white70),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 2,
                  ),
                ],
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF059669),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  Future<String?> _ensureFileDownloaded(Payslip payslip) async {
    final cacheKey = '${payslip.month}_${payslip.year}';
    if (_cachedFilePaths.containsKey(cacheKey)) {
      final cached = _cachedFilePaths[cacheKey]!;
      if (await File(cached).exists()) return cached;
    }
    final fileName = 'payslip_${payslip.month}_${payslip.year}.pdf';
    final response = await PayslipService.downloadPayslip(
      payslip.file!,
      fileName: fileName,
    );
    if (response.success && response.data != null) {
      _cachedFilePaths[cacheKey] = response.data!;
      return response.data!;
    }
    return null;
  }

  Future<void> _viewPayslip(Payslip payslip) async {
    if (payslip.file == null) {
      _showError('Payslip file not available');
      return;
    }
    setState(() => _isViewing = true);
    try {
      final filePath = await _ensureFileDownloaded(payslip);
      if (mounted) {
        setState(() => _isViewing = false);
        if (filePath != null) {
          _openPdfViewer(filePath, payslip);
        } else {
          _showError('Failed to load payslip');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isViewing = false);
        _showError('Error: ${e.toString()}');
      }
    }
  }

  Future<void> _downloadPayslip(Payslip payslip) async {
    if (payslip.file == null) {
      _showError('Payslip file not available');
      return;
    }

    setState(() {
      _isDownloading = true;
    });

    try {
      final filePath = await _ensureFileDownloaded(payslip);

      if (mounted) {
        setState(() {
          _isDownloading = false;
        });

        if (filePath != null) {
          _showSavedToast(filePath);
          final shareResponse = await PayslipService.sharePayslip(filePath);
          if (mounted && !shareResponse.success) {
            _showError(shareResponse.message ?? 'Share failed');
          }
        } else {
          _showError('Download failed');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isDownloading = false;
        });
        _showError('Download error: ${e.toString()}');
      }
    }
  }

  void _openPdfViewer(String filePath, Payslip payslip) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PdfViewerPage(
          filePath: filePath,
          title: payslip.formattedPeriod,
        ),
      ),
    );
  }

  void _showYearFilter() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => GlassCard(
        borderRadius: 20,
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Filter by Year',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilterChip(
                  selected: _selectedYear == null,
                  onSelected: (_) {
                    Navigator.pop(context);
                    setState(() => _selectedYear = null);
                    _fetchPayslips();
                  },
                  label: const Text('All Years'),
                ),
                ..._availableYears.map((year) => FilterChip(
                      selected: _selectedYear == year,
                      onSelected: (_) {
                        Navigator.pop(context);
                        setState(() => _selectedYear = year);
                        _fetchPayslips();
                      },
                      label: Text(year.toString()),
                    )),
              ],
            ),
          ],
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
              // Header
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
                              'My Payslips',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                            Text(
                              _selectedYear != null
                                  ? 'Showing payslips for $_selectedYear'
                                  : 'View and download your payslips',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppStitchTheme.lightOnSurfaceMuted,
                                    fontSize: 12,
                                  ),
                            ),
                          ],
                        ),
                      ),
                      if (_availableYears.isNotEmpty)
                        IconButton(
                          icon: const Icon(Icons.filter_list_rounded),
                          onPressed: _showYearFilter,
                          tooltip: 'Filter by year',
                        ),
                      IconButton(
                        icon: _isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.refresh_rounded),
                        onPressed: _isLoading ? null : _fetchPayslips,
                      ),
                    ],
                  ),
                ),
              ),

              // Results count if filtered
              if (_selectedYear != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: Row(
                    children: [
                      Text(
                        '${_payslips.length} payslip${_payslips.length > 1 ? 's' : ''} for $_selectedYear',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              fontWeight: FontWeight.w500,
                              color: AppStitchTheme.lightOnSurfaceMuted,
                            ),
                      ),
                      const Spacer(),
                      TextButton(
                        onPressed: () {
                          setState(() => _selectedYear = null);
                          _fetchPayslips();
                        },
                        child: const Text('Show All'),
                      ),
                    ],
                  ),
                ),

              // Content
              Expanded(
                child: _buildContent(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(AppStitchTheme.primary),
        ),
      );
    }

    if (_payslips.isEmpty) {
      return Center(
        child: GlassCard(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.insert_drive_file_outlined,
                size: 64,
                color: AppStitchTheme.lightOnSurfaceMuted,
              ),
              const SizedBox(height: 16),
              Text(
                'No Payslips Yet',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppStitchTheme.lightOnSurface,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                _selectedYear != null
                    ? 'No payslips found for $_selectedYear'
                    : 'Your payslips will appear here once they are rolled out by HR.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppStitchTheme.lightOnSurfaceMuted,
                    ),
              ),
              if (_selectedYear != null) ...[
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    setState(() => _selectedYear = null);
                    _fetchPayslips();
                  },
                  child: const Text('Show All Years'),
                ),
              ],
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      itemCount: _payslips.length,
      itemBuilder: (context, index) {
        final payslip = _payslips[index];
        return _PayslipCard(
          payslip: payslip,
          isDownloading: _isDownloading,
          isViewing: _isViewing,
          onDownload: (_isDownloading || _isViewing) ? null : () => _downloadPayslip(payslip),
          onView: (payslip.file != null && !_isDownloading && !_isViewing)
              ? () => _viewPayslip(payslip)
              : null,
        );
      },
    );
  }
}

class _PayslipCard extends StatelessWidget {
  final Payslip payslip;
  final VoidCallback? onDownload;
  final VoidCallback? onView;
  final bool isDownloading;
  final bool isViewing;

  const _PayslipCard({
    required this.payslip,
    required this.onDownload,
    this.onView,
    this.isDownloading = false,
    this.isViewing = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: EdgeInsets.zero,
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              left: BorderSide(
                color: AppStitchTheme.primary,
                width: 4,
              ),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with badges
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Row(
                  children: [
                    // Month badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppStitchTheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.calendar_month_rounded,
                            size: 14,
                            color: AppStitchTheme.primary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            payslip.monthName.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: AppStitchTheme.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Year badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        payslip.year.toString(),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF10B981),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Payslip ID section - prominent
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppStitchTheme.primary.withValues(alpha: 0.1),
                        border: Border.all(
                          color: AppStitchTheme.primary.withValues(alpha: 0.3),
                          width: 1.5,
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Payslip ID',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: AppStitchTheme.lightOnSurfaceMuted,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            payslip.payslipId,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              fontFamily: 'monospace',
                              letterSpacing: 1,
                              color: AppStitchTheme.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Action buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: onView,
                            icon: isViewing
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Icon(Icons.visibility_rounded, size: 18),
                            label: Text(isViewing ? 'Loading...' : 'View'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppStitchTheme.primary,
                              side: BorderSide(
                                color: AppStitchTheme.primary.withValues(alpha: 0.3),
                                width: 1.5,
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: onDownload,
                            icon: isDownloading
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                    ),
                                  )
                                : const Icon(Icons.download_rounded, size: 18),
                            label: Text(
                              isDownloading ? 'Saving...' : 'Download',
                              overflow: TextOverflow.ellipsis,
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppStitchTheme.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                              elevation: 2,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// PDF Viewer Page
class PdfViewerPage extends StatefulWidget {
  final String filePath;
  final String title;

  const PdfViewerPage({
    super.key,
    required this.filePath,
    required this.title,
  });

  @override
  State<PdfViewerPage> createState() => _PdfViewerPageState();
}

class _PdfViewerPageState extends State<PdfViewerPage> {
  late PdfController _pdfController;
  int _totalPages = 0;
  int _currentPage = 1;

  @override
  void initState() {
    super.initState();
    _pdfController = PdfController(
      document: PdfDocument.openFile(widget.filePath),
    );
  }

  @override
  void dispose() {
    _pdfController.dispose();
    super.dispose();
  }

  Future<void> _shareFile() async {
    try {
      await Share.shareXFiles(
        [XFile(widget.filePath)],
        text: widget.title,
        subject: widget.title,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error sharing file: $e')),
        );
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
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                child: GlassCard(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_rounded),
                        onPressed: () => Navigator.pop(context),
                        tooltip: 'Back',
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.title,
                              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (_totalPages > 0)
                              Text(
                                'Page $_currentPage of $_totalPages',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: AppStitchTheme.lightOnSurfaceMuted,
                                    ),
                              ),
                          ],
                        ),
                      ),
                      if (_totalPages > 1) ...[
                        IconButton(
                          icon: const Icon(Icons.chevron_left_rounded),
                          onPressed: _currentPage > 1
                              ? () => _pdfController.previousPage(
                                    duration: const Duration(milliseconds: 300),
                                    curve: Curves.easeInOut,
                                  )
                              : null,
                          tooltip: 'Previous page',
                        ),
                        IconButton(
                          icon: const Icon(Icons.chevron_right_rounded),
                          onPressed: _currentPage < _totalPages
                              ? () => _pdfController.nextPage(
                                    duration: const Duration(milliseconds: 300),
                                    curve: Curves.easeInOut,
                                  )
                              : null,
                          tooltip: 'Next page',
                        ),
                      ],
                      IconButton(
                        icon: const Icon(Icons.share_rounded),
                        onPressed: _shareFile,
                        tooltip: 'Share',
                      ),
                    ],
                  ),
                ),
              ),

              // PDF Viewer
              Expanded(
                child: GlassCard(
                  padding: EdgeInsets.zero,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: PdfView(
                      controller: _pdfController,
                      onDocumentLoaded: (document) {
                        setState(() {
                          _totalPages = document.pagesCount;
                        });
                      },
                      onPageChanged: (page) {
                        setState(() {
                          _currentPage = page;
                        });
                      },
                      builders: PdfViewBuilders<DefaultBuilderOptions>(
                        options: const DefaultBuilderOptions(),
                        documentLoaderBuilder: (_) => const Center(
                          child: CircularProgressIndicator(),
                        ),
                        pageLoaderBuilder: (_) => const Center(
                          child: CircularProgressIndicator(),
                        ),
                        errorBuilder: (_, error) => Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.error_outline, size: 48, color: Color(0xFFEF4444)),
                                const SizedBox(height: 12),
                                Text(
                                  'Error loading PDF: $error',
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
