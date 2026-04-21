import 'package:flutter/material.dart';
import '../../models/reportee_model.dart';
import '../../services/employee_service.dart';
import '../../services/storage_service.dart';
import '../../config/api_config.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class ReporteesPage extends StatefulWidget {
  const ReporteesPage({super.key});

  @override
  State<ReporteesPage> createState() => _ReporteesPageState();
}

class _ReporteesPageState extends State<ReporteesPage> {
  List<Reportee> _reportees = [];
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchReportees();
  }

  Future<int?> _getEmployeeId() async {
    try {
      final token = await StorageService.getAccessToken();
      if (token == null) return null;

      final response = await http.get(
        Uri.parse(ApiConfig.employeeIdUrl),
        headers: ApiConfig.getAuthHeaders(token),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['employee_id'] ?? data['id'];
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<void> _fetchReportees() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final employeeId = await _getEmployeeId();
    if (employeeId == null) {
      setState(() {
        _error = 'Failed to get employee ID';
        _isLoading = false;
      });
      return;
    }

    final response = await EmployeeService.getReportees(employeeId);

    if (response.success && response.data != null) {
      setState(() {
        _reportees = response.data!;
        _isLoading = false;
      });
    } else {
      setState(() {
        _error = response.message ?? 'Failed to load reportees';
        _isLoading = false;
      });
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
                          'Reportees',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w900,
                                color: AppStitchTheme.lightOnSurface,
                              ),
                        ),
                      ),
                      IconButton(
                        onPressed: _fetchReportees,
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
                          : _reportees.isEmpty
                              ? _buildEmptyState()
                              : _buildReporteesList(),
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
                onPressed: _fetchReportees,
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
              child: const Icon(Icons.people_outline_rounded, color: AppStitchTheme.primary),
            ),
            const SizedBox(height: 10),
            Text(
              'No reportees found',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: AppStitchTheme.lightOnSurface,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              'You don\'t have any employees reporting to you.',
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

  Widget _buildReporteesList() {
    return RefreshIndicator(
      onRefresh: _fetchReportees,
      color: AppStitchTheme.primary,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          GlassCard(
            padding: const EdgeInsets.all(0),
            child: Column(
              children: [
                // Header row
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.25),
                    border: Border(
                      bottom: BorderSide(
                        color: AppStitchTheme.lightOutline.withValues(alpha: 0.55),
                        width: 1,
                      ),
                    ),
                  ),
                  child: const Row(
                    children: [
                      Expanded(
                        flex: 1,
                        child: Text(
                          'S.No',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 3,
                        child: Text(
                          'Full Name',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          'Department',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          'Designation',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Data rows
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _reportees.length,
                  itemBuilder: (context, index) {
                    final reportee = _reportees[index];
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: index < _reportees.length - 1
                                ? const Color(0xFFE5E7EB)
                                : Colors.transparent,
                            width: 1,
                          ),
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 1,
                            child: Text(
                              '${index + 1}',
                              style: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF111827),
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 3,
                            child: Text(
                              reportee.fullName,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF111827),
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Text(
                              reportee.departmentName ?? '-',
                              style: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF6B7280),
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Text(
                              reportee.designationName ?? '-',
                              style: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF6B7280),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
