import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../models/profile_model.dart';
import 'pdf_viewer_page.dart';

class ProfileAddressCard extends StatelessWidget {
  final EmployeeProfile profile;

  const ProfileAddressCard({
    super.key,
    required this.profile,
  });

  Widget _buildInfoRow(BuildContext context, String label, String value, {bool isLink = false}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF6B7280),
              fontWeight: FontWeight.w500,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 6),
          isLink && value.isNotEmpty && value != '-'
              ? GestureDetector(
                  onTap: () async {
                    try {
                      final uri = Uri.parse(value);
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                      } else {
                        // If it's a relative URL, navigate to PDF viewer
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => PdfViewerPage(
                              pdfUrl: value,
                              title: label,
                            ),
                          ),
                        );
                      }
                    } catch (e) {
                      // Navigate to PDF viewer
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => PdfViewerPage(
                            pdfUrl: value,
                            title: label,
                          ),
                        ),
                      );
                    }
                  },
                  child: const Text(
                    'View',
                    style: TextStyle(
                      fontSize: 14,
                      color: Color(0xFF2563EB),
                      fontWeight: FontWeight.w500,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                )
              : Text(
                  value.isEmpty ? '-' : value,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF111827),
                    fontWeight: FontWeight.w500,
                    height: 1.4,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Address & ID Proofs',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildInfoRow(
                      context,
                      'Temporary Address',
                      profile.temporaryAddress ?? '-',
                    ),
                    _buildInfoRow(
                      context,
                      'Permanent Address',
                      profile.permanentAddress ?? '-',
                    ),
                    _buildInfoRow(
                      context,
                      'Aadhar Number',
                      profile.aadharNo ?? '-',
                    ),
                    _buildInfoRow(
                      context,
                      'Aadhar Card',
                      profile.aadharCard ?? '-',
                      isLink: true,
                    ),
                    _buildInfoRow(
                      context,
                      'PAN Number',
                      profile.panNo ?? '-',
                    ),
                    // Add empty space to align with right column
                    const SizedBox(height: 0),
                  ],
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildInfoRow(
                      context,
                      'PAN Card',
                      profile.panCard ?? '-',
                      isLink: true,
                    ),
                    _buildInfoRow(
                      context,
                      'Guardian Name',
                      profile.guardianName ?? '-',
                    ),
                    _buildInfoRow(
                      context,
                      'Guardian Mobile',
                      profile.guardianMobile ?? '-',
                    ),
                    _buildInfoRow(
                      context,
                      'Category',
                      profile.category ?? '-',
                    ),
                    // Add empty space to align with left column
                    const SizedBox(height: 0),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

