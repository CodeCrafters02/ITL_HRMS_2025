import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../../../models/profile_model.dart';
import '../../../services/employee_service.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';

class ProfileMetaCard extends StatefulWidget {
  final EmployeeProfile profile;
  final Function(EmployeeProfile) onPhotoUpdated;

  const ProfileMetaCard({
    super.key,
    required this.profile,
    required this.onPhotoUpdated,
  });

  @override
  State<ProfileMetaCard> createState() => _ProfileMetaCardState();
}

class _ProfileMetaCardState extends State<ProfileMetaCard> {
  bool _isUploading = false;

  Future<void> _pickAndUploadPhoto() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
      );

      if (result != null && result.files.single.path != null) {
        final file = File(result.files.single.path!);
        setState(() {
          _isUploading = true;
        });

        final response = await EmployeeService.updateProfilePhoto(file);

        if (mounted) {
          if (response.success && response.data != null) {
            widget.onPhotoUpdated(response.data!);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Photo updated successfully'),
              ),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(response.message ?? 'Failed to update photo'),
              ),
            );
          }
          setState(() {
            _isUploading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isUploading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            // Profile Photo
            Stack(
              children: [
                Container(
                  width: 84,
                  height: 84,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppStitchTheme.primary.withValues(alpha: 0.8),
                        AppStitchTheme.accentBlue.withValues(alpha: 0.6),
                      ],
                    ),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.2),
                      width: 2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppStitchTheme.primary.withValues(alpha: 0.15),
                        blurRadius: 12,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: widget.profile.photo != null &&
                          widget.profile.photo!.isNotEmpty
                      ? ClipOval(
                          child: Image.network(
                            widget.profile.photo!,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                _buildInitials(),
                          ),
                        )
                      : _buildInitials(),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: GestureDetector(
                    onTap: _isUploading ? null : _pickAndUploadPhoto,
                    child: Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppStitchTheme.lightOutline.withValues(alpha: 0.5),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.12),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: _isUploading
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppStitchTheme.primary,
                              ),
                            )
                          : const Icon(
                              Icons.camera_alt_rounded,
                              size: 14,
                              color: AppStitchTheme.primary,
                            ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 18),
            // Name and Designation
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.profile.fullName,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: AppStitchTheme.lightOnSurface,
                          letterSpacing: -0.5,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppStitchTheme.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: AppStitchTheme.primary.withValues(alpha: 0.15),
                      ),
                    ),
                    child: Text(
                      widget.profile.displayDesignation,
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppStitchTheme.primary,
                            letterSpacing: 0.2,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInitials() {
    return Center(
      child: Text(
        widget.profile.initials,
        style: const TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
    );
  }
}

