import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../models/profile_model.dart';
import '../../../theme/app_stitch_theme.dart';
import '../../../widgets/glass_card.dart';
import 'pdf_viewer_page.dart';

class ProfileAddressCard extends StatelessWidget {
  final EmployeeProfile profile;

  const ProfileAddressCard({
    super.key,
    required this.profile,
  });

  Widget _buildDetailItem(BuildContext context, String label, String value, IconData icon, {bool isLink = false}) {
    final bool isEmpty = value.isEmpty || value == '-';

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppStitchTheme.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: AppStitchTheme.primary),
          ),
          const SizedBox(width: 14),
          Expanded(
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
                const SizedBox(height: 2),
                isLink && !isEmpty
                    ? GestureDetector(
                        onTap: () async {
                          final nav = Navigator.of(context);
                          try {
                            final uri = Uri.parse(value);
                            if (await canLaunchUrl(uri)) {
                              await launchUrl(uri, mode: LaunchMode.externalApplication);
                            } else {
                              nav.push(
                                MaterialPageRoute(
                                  builder: (context) => PdfViewerPage(
                                    pdfUrl: value,
                                    title: label,
                                  ),
                                ),
                              );
                            }
                          } catch (e) {
                            nav.push(
                              MaterialPageRoute(
                                builder: (context) => PdfViewerPage(
                                  pdfUrl: value,
                                  title: label,
                                ),
                              ),
                            );
                          }
                        },
                        child: Row(
                          children: [
                            const Text(
                              'View Document',
                              style: TextStyle(
                                fontSize: 13,
                                color: AppStitchTheme.primary,
                                fontWeight: FontWeight.w700,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Icon(Icons.open_in_new_rounded, size: 12, color: AppStitchTheme.primary),
                          ],
                        ),
                      )
                    : Text(
                        isEmpty ? 'Not Provided' : value,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: AppStitchTheme.lightOnSurface,
                            ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.home_outlined, size: 20, color: AppStitchTheme.primary),
              const SizedBox(width: 8),
              Text(
                'Address & Documents',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: AppStitchTheme.lightOnSurface,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildDetailItem(context, 'Temporary Address', profile.temporaryAddress ?? '-', Icons.map_outlined),
          _buildDetailItem(context, 'Permanent Address', profile.permanentAddress ?? '-', Icons.home_work_outlined),
          _buildDetailItem(context, 'Aadhar Number', profile.aadharNo ?? '-', Icons.credit_card_outlined),
          _buildDetailItem(context, 'Aadhar Card', profile.aadharCard ?? '-', Icons.file_present_outlined, isLink: true),
          _buildDetailItem(context, 'PAN Number', profile.panNo ?? '-', Icons.badge_outlined),
          _buildDetailItem(context, 'PAN Card', profile.panCard ?? '-', Icons.file_present_outlined, isLink: true),
          _buildDetailItem(context, 'Guardian Name', profile.guardianName ?? '-', Icons.supervisor_account_outlined),
          _buildDetailItem(context, 'Guardian Mobile', profile.guardianMobile ?? '-', Icons.phone_android_outlined),
          _buildDetailItem(context, 'Category', profile.category ?? '-', Icons.category_outlined),
        ],
      ),
    );
  }
}

