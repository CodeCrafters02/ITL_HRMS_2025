import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../models/leave_model.dart';
import '../../../services/employee_service.dart';

class LeaveApplicationFormDialog extends StatefulWidget {
  final List<LeaveType> leaveTypes;

  const LeaveApplicationFormDialog({
    super.key,
    required this.leaveTypes,
  });

  @override
  State<LeaveApplicationFormDialog> createState() => _LeaveApplicationFormDialogState();
}

class _LeaveApplicationFormDialogState extends State<LeaveApplicationFormDialog> {
  int? _selectedLeaveType;
  DateTime? _fromDate;
  DateTime? _toDate;
  String _leaveDuration = 'full_day';
  final TextEditingController _reasonController = TextEditingController();
  bool _isLoading = false;
  String? _error;
  String? _success;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _selectFromDate() async {
    final now = DateTime.now();
    final firstDate = DateTime(now.year, now.month, now.day);
    final lastDate = DateTime(now.year + 1, 12, 31);

    final picked = await showDatePicker(
      context: context,
      initialDate: _fromDate ?? firstDate,
      firstDate: firstDate,
      lastDate: lastDate,
      helpText: 'Select From Date',
    );

    if (picked != null) {
      setState(() {
        _fromDate = picked;
        if (_leaveDuration == 'half_day') {
          _toDate = picked;
        } else if (_toDate != null && _toDate!.isBefore(picked)) {
          _toDate = null;
        }
      });
    }
  }

  Future<void> _selectToDate() async {
    if (_fromDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select from date first'),
        ),
      );
      return;
    }

    final now = DateTime.now();
    final firstDate = _fromDate!;
    final lastDate = DateTime(now.year + 1, 12, 31);

    final picked = await showDatePicker(
      context: context,
      initialDate: _toDate ?? firstDate,
      firstDate: firstDate,
      lastDate: lastDate,
      helpText: 'Select To Date',
    );

    if (picked != null) {
      setState(() {
        _toDate = picked;
      });
    }
  }

  Future<void> _submitLeave() async {
    // Validation
    if (_selectedLeaveType == null) {
      setState(() {
        _error = 'Please select a leave type';
      });
      return;
    }

    if (_fromDate == null) {
      setState(() {
        _error = 'Please select from date';
      });
      return;
    }

    if (_toDate == null) {
      setState(() {
        _error = 'Please select to date';
      });
      return;
    }

    if (_leaveDuration == 'half_day' &&
        DateFormat('yyyy-MM-dd').format(_fromDate!) !=
            DateFormat('yyyy-MM-dd').format(_toDate!)) {
      setState(() {
        _error = 'Half day leave must use the same from and to date.';
      });
      return;
    }

    if (_reasonController.text.trim().isEmpty) {
      setState(() {
        _error = 'Please enter a reason';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
      _success = null;
    });

    try {
      final response = await EmployeeService.createLeave(
        leaveType: _selectedLeaveType!,
        fromDate: DateFormat('yyyy-MM-dd').format(_fromDate!),
        toDate: DateFormat('yyyy-MM-dd').format(_toDate!),
        reason: _reasonController.text.trim(),
        leaveDuration: _leaveDuration,
      );

      if (mounted) {
        if (response.success) {
          setState(() {
            _success = response.message ?? 'Leave application submitted successfully';
            _isLoading = false;
          });

          // Close dialog after a short delay
          Future.delayed(const Duration(seconds: 1), () {
            if (mounted) {
              Navigator.pop(context, true);
            }
          });
        } else {
          setState(() {
            _error = response.message ?? 'Failed to submit leave application';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Error: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Dialog(
      backgroundColor: theme.colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Apply for Leave',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1A2233),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Fill in the details to apply for leave.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF5C6578),
                  ),
                ),
                const SizedBox(height: 24),
                // Leave Type
                const Text(
                  'Leave Type *',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF1A2233),
                  ),
                ),
                const SizedBox(height: 8),
                if (widget.leaveTypes.isEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3F4F6),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        SizedBox(width: 10),
                        Text(
                          'Loading leave types...',
                          style: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF)),
                        ),
                      ],
                    ),
                  )
                else
                  DropdownButtonFormField<int>(
                    value: _selectedLeaveType,
                    decoration: InputDecoration(
                      hintText: 'Select leave type',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 2),
                      ),
                    ),
                    items: widget.leaveTypes.map((type) {
                      return DropdownMenuItem<int>(
                        value: type.id,
                        child: Text(type.leaveName),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedLeaveType = value;
                        _error = null;
                      });
                    },
                  ),
                const SizedBox(height: 16),
                // Leave Duration
                const Text(
                  'Leave Duration *',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF1A2233),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _DurationChip(
                        label: 'Full Day',
                        selected: _leaveDuration == 'full_day',
                        onTap: () {
                          setState(() {
                            _leaveDuration = 'full_day';
                            _error = null;
                          });
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _DurationChip(
                        label: 'Half Day',
                        selected: _leaveDuration == 'half_day',
                        onTap: () {
                          setState(() {
                            _leaveDuration = 'half_day';
                            if (_fromDate != null) {
                              _toDate = _fromDate;
                            }
                            _error = null;
                          });
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Date Range
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'From Date *',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF1A2233),
                            ),
                          ),
                          const SizedBox(height: 8),
                          InkWell(
                            onTap: _selectFromDate,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 14,
                              ),
                              decoration: BoxDecoration(
                                border: Border.all(color: const Color(0xFFE5E7EB)),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Flexible(
                                    child: Text(
                                      _fromDate != null
                                          ? DateFormat('yyyy-MM-dd').format(_fromDate!)
                                          : 'Select from date',
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: _fromDate != null
                                          ? const Color(0xFF1A2233)
                                            : const Color(0xFF9CA3AF),
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(
                                    Icons.calendar_today,
                                    size: 20,
                                    color: Color(0xFF6B7280),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'To Date *',
                            // To Date label
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF1A2233),
                            ),
                          ),
                          const SizedBox(height: 8),
                          InkWell(
                            onTap: _leaveDuration == 'half_day' ? null : _selectToDate,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 14,
                              ),
                              decoration: BoxDecoration(
                                color: _leaveDuration == 'half_day'
                                    ? const Color(0xFFF3F4F6)
                                    : null,
                                border: Border.all(color: const Color(0xFFE5E7EB)),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Flexible(
                                    child: Text(
                                      _toDate != null
                                          ? DateFormat('yyyy-MM-dd').format(_toDate!)
                                          : 'Select to date',
                                      // To Date value
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: _toDate != null
                                          ? const Color(0xFF1A2233)
                                            : const Color(0xFF9CA3AF),
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(
                                    Icons.calendar_today,
                                    size: 20,
                                    color: Color(0xFF6B7280),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Reason
                const Text(
                  'Reason *',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF1A2233),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _reasonController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: 'Enter reason for leave',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 2),
                    ),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                  onChanged: (_) {
                    if (_error != null) {
                      setState(() {
                        _error = null;
                      });
                    }
                  },
                ),
                const SizedBox(height: 24),
                // Error/Success messages
                if (_error != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.error_outline,
                          color: Color(0xFFEF4444),
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _error!,
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFFEF4444),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                if (_success != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD1FAE5),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.check_circle_outline,
                          color: Color(0xFF10B981),
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _success!,
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF10B981),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                // Buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: _isLoading ? null : () => Navigator.pop(context),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(
                          color: Color(0xFF6B7280),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _submitLeave,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF4F46E5),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 12,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Text('Apply'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
    );
  }
}

class _DurationChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _DurationChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF4F46E5) : const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected ? const Color(0xFF4F46E5) : const Color(0xFFE5E7EB),
            width: selected ? 2 : 1,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: selected ? Colors.white : const Color(0xFF6B7280),
            ),
          ),
        ),
      ),
    );
  }
}
