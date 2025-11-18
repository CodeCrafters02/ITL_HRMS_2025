import 'package:flutter/material.dart';
import '../../../models/profile_model.dart';

class ProfileProfessionalCard extends StatelessWidget {
  final EmployeeProfile profile;

  const ProfileProfessionalCard({
    super.key,
    required this.profile,
  });

  Widget _buildInfoRow(String label, String value) {
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
          Text(
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
            'Professional Details',
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
                      'Date of Joining',
                      profile.dateOfJoining ?? '-',
                    ),
                    _buildInfoRow(
                      'CTC',
                      profile.ctc ?? '-',
                    ),
                    _buildInfoRow(
                      'Gross Salary',
                      profile.grossSalary ?? '-',
                    ),
                    _buildInfoRow(
                      'EPF Status',
                      profile.epfStatus ?? '-',
                    ),
                    _buildInfoRow(
                      'UAN',
                      profile.uan ?? '-',
                    ),
                    _buildInfoRow(
                      'Source of Employment',
                      profile.sourceOfEmployment ?? '-',
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildInfoRow(
                      'Payment Method',
                      profile.paymentMethod ?? '-',
                    ),
                    _buildInfoRow(
                      'Account No',
                      profile.accountNo ?? '-',
                    ),
                    _buildInfoRow(
                      'IFSC Code',
                      profile.ifscCode ?? '-',
                    ),
                    _buildInfoRow(
                      'Bank Name',
                      profile.bankName ?? '-',
                    ),
                    _buildInfoRow(
                      'ESIC Status',
                      profile.esicStatus ?? '-',
                    ),
                    _buildInfoRow(
                      'ESIC No',
                      profile.esicNo ?? '-',
                    ),
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

