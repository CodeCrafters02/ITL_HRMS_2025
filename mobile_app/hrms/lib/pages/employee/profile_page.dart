import 'package:flutter/material.dart';
import '../../services/employee_service.dart';
import '../../models/profile_model.dart';
import '../../widgets/employee_app_bar.dart';
import 'widgets/profile_meta_card.dart';
import 'widgets/profile_info_card.dart';
import 'widgets/profile_address_card.dart';
import 'widgets/profile_professional_card.dart';
import 'widgets/profile_hierarchy_card.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  EmployeeProfile? _profile;
  EmployeeHierarchy? _hierarchy;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadProfileData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadProfileData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final profileResponse = await EmployeeService.getEmployeeProfile();
      final hierarchyResponse = await EmployeeService.getEmployeeHierarchy();

      if (mounted) {
        setState(() {
          _isLoading = false;
          if (profileResponse.success) {
            _profile = profileResponse.data;
          } else {
            _error = profileResponse.message ?? 'Failed to load profile';
            // Check if session expired
            if (profileResponse.message?.contains('Session expired') == true ||
                profileResponse.message?.contains('login again') == true) {
              // Navigate to login
              if (mounted) {
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/login',
                  (route) => false,
                );
              }
            }
          }

          if (hierarchyResponse.success) {
            _hierarchy = hierarchyResponse.data;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = 'Error loading profile: ${e.toString()}';
        });
      }
    }
  }

  void _onPhotoUpdated(EmployeeProfile updatedProfile) {
    setState(() {
      _profile = updatedProfile;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: EmployeeAppBar(
        title: 'Profile',
        actions: [
          IconButton(
            icon: const Icon(Icons.lock_outline),
            tooltip: 'Change Password',
            onPressed: () {
              Navigator.pushNamed(context, '/change-password');
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Colors.red.shade300,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _error!,
                        style: const TextStyle(
                          fontSize: 16,
                          color: Color(0xFF6B7280),
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadProfileData,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _profile == null
                  ? const Center(
                      child: Text('No profile data available'),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadProfileData,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        child: Column(
                          children: [
                            // Profile Meta Card
                            ProfileMetaCard(
                              profile: _profile!,
                              onPhotoUpdated: _onPhotoUpdated,
                            ),

                            // Tabs
                            Container(
                              color: Colors.white,
                              child: TabBar(
                                controller: _tabController,
                                labelColor: const Color(0xFF4F46E5),
                                unselectedLabelColor: const Color(0xFF6B7280),
                                indicatorColor: const Color(0xFF4F46E5),
                                tabs: const [
                                  Tab(text: 'Personal'),
                                  Tab(text: 'Professional'),
                                  Tab(text: 'Hierarchy'),
                                ],
                              ),
                            ),

                            // Tab Content
                            SizedBox(
                              height: MediaQuery.of(context).size.height * 0.6,
                              child: TabBarView(
                                controller: _tabController,
                                children: [
                                  // Personal Tab
                                  SingleChildScrollView(
                                    padding: const EdgeInsets.all(16),
                                    child: Column(
                                      children: [
                                        ProfileInfoCard(profile: _profile!),
                                        const SizedBox(height: 16),
                                        ProfileAddressCard(profile: _profile!),
                                      ],
                                    ),
                                  ),

                                  // Professional Tab
                                  SingleChildScrollView(
                                    padding: const EdgeInsets.all(16),
                                    child: ProfileProfessionalCard(
                                      profile: _profile!,
                                    ),
                                  ),

                                  // Hierarchy Tab
                                  SingleChildScrollView(
                                    padding: const EdgeInsets.all(16),
                                    child: _hierarchy != null
                                        ? ProfileHierarchyCard(
                                            hierarchy: _hierarchy!,
                                          )
                                        : const Center(
                                            child: Text(
                                              'No hierarchy data available',
                                            ),
                                          ),
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

