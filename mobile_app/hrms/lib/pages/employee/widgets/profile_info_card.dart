import 'package:flutter/material.dart';
import '../../../models/profile_model.dart';

class ProfileInfoCard extends StatelessWidget {
  final EmployeeProfile profile;

  const ProfileInfoCard({
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
            'Personal Information',
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
                      'Employee ID',
                      profile.employeeId ?? '-',
                    ),
                    _buildInfoRow(
                      'First Name',
                      profile.firstName ?? '-',
                    ),
                    _buildInfoRow(
                      'Middle Name',
                      profile.middleName ?? '-',
                    ),
                    _buildInfoRow(
                      'Last Name',
                      profile.lastName ?? '-',
                    ),
                    _buildInfoRow(
                      'Gender',
                      profile.gender ?? '-',
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
                      'Email',
                      profile.email ?? '-',
                    ),
                    _buildInfoRow(
                      'Date of Birth',
                      profile.dateOfBirth ?? '-',
                    ),
                    _buildInfoRow(
                      'Phone',
                      profile.mobile ?? '-',
                    ),
                    _buildInfoRow(
                      'Department',
                      profile.displayDepartment,
                    ),
                    _buildInfoRow(
                      'Designation',
                      profile.displayDesignation,
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

