import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../../models/profile_model.dart';
import '../../services/employee_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';

class ProfileEditPage extends StatefulWidget {
  final EmployeeProfile profile;

  const ProfileEditPage({super.key, required this.profile});

  @override
  State<ProfileEditPage> createState() => _ProfileEditPageState();
}

class _ProfileEditPageState extends State<ProfileEditPage> {
  final _formKey = GlobalKey<FormState>();
  bool _isSaving = false;

  late final TextEditingController _firstNameCtrl;
  late final TextEditingController _middleNameCtrl;
  late final TextEditingController _lastNameCtrl;
  late final TextEditingController _mobileCtrl;
  late final TextEditingController _dobCtrl;
  late final TextEditingController _tempAddressCtrl;
  late final TextEditingController _permAddressCtrl;
  late final TextEditingController _aadharNoCtrl;
  late final TextEditingController _panNoCtrl;

  File? _aadharCardFile;
  File? _panCardFile;

  @override
  void initState() {
    super.initState();
    final p = widget.profile;
    _firstNameCtrl = TextEditingController(text: p.firstName ?? '');
    _middleNameCtrl = TextEditingController(text: p.middleName ?? '');
    _lastNameCtrl = TextEditingController(text: p.lastName ?? '');
    _mobileCtrl = TextEditingController(text: p.mobile ?? '');
    _dobCtrl = TextEditingController(text: p.dateOfBirth ?? '');
    _tempAddressCtrl = TextEditingController(text: p.temporaryAddress ?? '');
    _permAddressCtrl = TextEditingController(text: p.permanentAddress ?? '');
    _aadharNoCtrl = TextEditingController(text: p.aadharNo ?? '');
    _panNoCtrl = TextEditingController(text: p.panNo ?? '');
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _middleNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _mobileCtrl.dispose();
    _dobCtrl.dispose();
    _tempAddressCtrl.dispose();
    _permAddressCtrl.dispose();
    _aadharNoCtrl.dispose();
    _panNoCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final initial = DateTime.tryParse(_dobCtrl.text) ?? DateTime(1990);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1950),
      lastDate: DateTime.now(),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: ColorScheme.light(primary: AppStitchTheme.primary),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      _dobCtrl.text =
          '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
    }
  }

  Future<void> _pickFile(String label, void Function(File) onPicked) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
        allowMultiple: false,
      );
      if (result != null && result.files.single.path != null) {
        onPicked(File(result.files.single.path!));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error picking file: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    final fields = <String, String>{
      'first_name': _firstNameCtrl.text.trim(),
      'middle_name': _middleNameCtrl.text.trim(),
      'last_name': _lastNameCtrl.text.trim(),
      'mobile': _mobileCtrl.text.trim(),
      'date_of_birth': _dobCtrl.text.trim(),
      'temporary_address': _tempAddressCtrl.text.trim(),
      'permanent_address': _permAddressCtrl.text.trim(),
      'aadhar_no': _aadharNoCtrl.text.trim(),
      'pan_no': _panNoCtrl.text.trim(),
    };

    final response = await EmployeeService.updateEmployeeProfile(
      fields,
      aadharCard: _aadharCardFile,
      panCard: _panCardFile,
    );

    if (!mounted) return;
    setState(() => _isSaving = false);

    if (response.success && response.data != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile updated successfully')),
      );
      Navigator.pop(context, response.data);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(response.message ?? 'Failed to update profile'),
          backgroundColor: Colors.red.shade400,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: StitchBackground(
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: GlassCard(
                  padding: const EdgeInsets.fromLTRB(4, 4, 12, 4),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: _isSaving ? null : () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          'Edit Profile',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w900,
                                color: AppStitchTheme.lightOnSurface,
                              ),
                        ),
                      ),
                      if (_isSaving)
                        const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppStitchTheme.primary,
                          ),
                        )
                      else
                        TextButton(
                          onPressed: _save,
                          child: Text(
                            'Save',
                            style: TextStyle(
                              color: AppStitchTheme.primary,
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: Form(
                  key: _formKey,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                    children: [
                      _SectionCard(
                        icon: Icons.person_outline_rounded,
                        title: 'Personal Information',
                        children: [
                          _buildField('First Name', _firstNameCtrl,
                              icon: Icons.badge_outlined,
                              validator: (v) =>
                                  (v == null || v.trim().isEmpty) ? 'Required' : null),
                          _buildField('Middle Name', _middleNameCtrl,
                              icon: Icons.badge_outlined),
                          _buildField('Last Name', _lastNameCtrl,
                              icon: Icons.badge_outlined,
                              validator: (v) =>
                                  (v == null || v.trim().isEmpty) ? 'Required' : null),
                          _buildField('Mobile', _mobileCtrl,
                              icon: Icons.phone_android_rounded,
                              keyboardType: TextInputType.phone),
                          _buildDateField(),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _SectionCard(
                        icon: Icons.home_outlined,
                        title: 'Address',
                        children: [
                          _buildField('Temporary Address', _tempAddressCtrl,
                              icon: Icons.map_outlined, maxLines: 2),
                          _buildField('Permanent Address', _permAddressCtrl,
                              icon: Icons.home_work_outlined, maxLines: 2),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _SectionCard(
                        icon: Icons.credit_card_outlined,
                        title: 'Documents',
                        children: [
                          _buildField('Aadhar Number', _aadharNoCtrl,
                              icon: Icons.credit_card_outlined,
                              keyboardType: TextInputType.number),
                          _buildFilePicker(
                            label: 'Aadhar Card',
                            icon: Icons.file_present_outlined,
                            existingUrl: widget.profile.aadharCard,
                            selectedFile: _aadharCardFile,
                            onPick: () => _pickFile('Aadhar Card', (f) {
                              setState(() => _aadharCardFile = f);
                            }),
                          ),
                          const SizedBox(height: 8),
                          _buildField('PAN Number', _panNoCtrl,
                              icon: Icons.badge_outlined,
                              keyboardType: TextInputType.text),
                          _buildFilePicker(
                            label: 'PAN Card',
                            icon: Icons.file_present_outlined,
                            existingUrl: widget.profile.panCard,
                            selectedFile: _panCardFile,
                            onPick: () => _pickFile('PAN Card', (f) {
                              setState(() => _panCardFile = f);
                            }),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(
    String label,
    TextEditingController controller, {
    IconData? icon,
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        maxLines: maxLines,
        validator: validator,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: AppStitchTheme.lightOnSurface,
            ),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: AppStitchTheme.lightOnSurfaceMuted,
          ),
          prefixIcon: icon != null
              ? Icon(icon, size: 18, color: AppStitchTheme.primary)
              : null,
          filled: true,
          fillColor: AppStitchTheme.primary.withValues(alpha: 0.04),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: AppStitchTheme.lightOutline.withValues(alpha: 0.3),
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: AppStitchTheme.lightOutline.withValues(alpha: 0.3),
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: AppStitchTheme.primary,
              width: 1.5,
            ),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.red.shade400),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.red.shade400, width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        ),
      ),
    );
  }

  Widget _buildDateField() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: _dobCtrl,
        readOnly: true,
        onTap: _pickDate,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: AppStitchTheme.lightOnSurface,
            ),
        decoration: InputDecoration(
          labelText: 'Date of Birth',
          labelStyle: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: AppStitchTheme.lightOnSurfaceMuted,
          ),
          prefixIcon:
              Icon(Icons.cake_outlined, size: 18, color: AppStitchTheme.primary),
          suffixIcon:
              Icon(Icons.calendar_today_rounded, size: 16, color: AppStitchTheme.primary),
          filled: true,
          fillColor: AppStitchTheme.primary.withValues(alpha: 0.04),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: AppStitchTheme.lightOutline.withValues(alpha: 0.3),
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: AppStitchTheme.lightOutline.withValues(alpha: 0.3),
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: AppStitchTheme.primary, width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        ),
      ),
    );
  }

  Widget _buildFilePicker({
    required String label,
    required IconData icon,
    required String? existingUrl,
    required File? selectedFile,
    required VoidCallback onPick,
  }) {
    final hasExisting =
        existingUrl != null && existingUrl.isNotEmpty && existingUrl != '-';
    final fileName = selectedFile != null
        ? selectedFile.path.split(Platform.pathSeparator).last
        : null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: AppStitchTheme.lightOnSurfaceMuted,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppStitchTheme.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: AppStitchTheme.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  fileName != null
                      ? fileName
                      : hasExisting
                          ? 'Current file uploaded'
                          : 'No file selected',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: fileName != null
                            ? AppStitchTheme.primary
                            : AppStitchTheme.lightOnSurfaceMuted,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: onPick,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppStitchTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppStitchTheme.primary.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text(
                    selectedFile != null ? 'Change' : hasExisting ? 'Replace' : 'Upload',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: AppStitchTheme.primary,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final List<Widget> children;

  const _SectionCard({
    required this.icon,
    required this.title,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: AppStitchTheme.primary),
              const SizedBox(width: 8),
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: AppStitchTheme.lightOnSurface,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          ...children,
        ],
      ),
    );
  }
}
