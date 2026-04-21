import 'package:flutter/material.dart';
import '../../services/employee_service.dart';
import '../../models/profile_model.dart';
import '../../theme/app_stitch_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/stitch_background.dart';
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
                          'Profile',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w900,
                                color: AppStitchTheme.lightOnSurface,
                              ),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Change Password',
                        onPressed: () =>
                            Navigator.pushNamed(context, '/change-password'),
                        icon: const Icon(Icons.lock_outline_rounded),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : _error != null
                          ? Center(
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
                                        color: const Color(0xFFEF4444)
                                            .withValues(alpha: 0.10),
                                        border: Border.all(
                                          color: const Color(0xFFEF4444)
                                              .withValues(alpha: 0.20),
                                        ),
                                      ),
                                      child: const Icon(
                                        Icons.error_outline_rounded,
                                        color: Color(0xFFEF4444),
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      _error!,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium
                                          ?.copyWith(
                                            color: AppStitchTheme
                                                .lightOnSurfaceMuted,
                                            fontWeight: FontWeight.w600,
                                          ),
                                      textAlign: TextAlign.center,
                                    ),
                                    const SizedBox(height: 12),
                                    SizedBox(
                                      width: double.infinity,
                                      child: ElevatedButton(
                                        onPressed: _loadProfileData,
                                        child: const Text('Retry'),
                                      ),
                                    )
                                  ],
                                ),
                              ),
                            )
                          : _profile == null
                              ? Center(
                                  child: GlassCard(
                                    padding: const EdgeInsets.all(18),
                                    child: Text(
                                      'No profile data available',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium
                                          ?.copyWith(
                                            color: AppStitchTheme
                                                .lightOnSurfaceMuted,
                                            fontWeight: FontWeight.w600,
                                          ),
                                    ),
                                  ),
                                )
                              : RefreshIndicator(
                                  onRefresh: _loadProfileData,
                                  color: AppStitchTheme.primary,
                                  child: ListView(
                                    physics:
                                        const AlwaysScrollableScrollPhysics(),
                                    children: [
                                      ProfileMetaCard(
                                        profile: _profile!,
                                        onPhotoUpdated: _onPhotoUpdated,
                                      ),
                                      const SizedBox(height: 12),
                                      GlassCard(
                                        padding: const EdgeInsets.all(6),
                                        child: TabBar(
                                          controller: _tabController,
                                          labelColor: Colors.white,
                                          unselectedLabelColor: AppStitchTheme
                                              .lightOnSurfaceMuted,
                                          indicator: BoxDecoration(
                                            color: AppStitchTheme.primary,
                                            borderRadius:
                                                BorderRadius.circular(14),
                                          ),
                                          indicatorSize:
                                              TabBarIndicatorSize.tab,
                                          dividerColor: Colors.transparent,
                                          tabs: const [
                                            Tab(text: 'Personal'),
                                            Tab(text: 'Work'),
                                            Tab(text: 'Hierarchy'),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(height: 12),
                                      SizedBox(
                                        height:
                                            MediaQuery.of(context).size.height *
                                                0.75,
                                        child: TabBarView(
                                          controller: _tabController,
                                          children: [
                                            Padding(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 2),
                                              child: ListView(
                                                padding: EdgeInsets.zero,
                                                children: [
                                                  ProfileInfoCard(
                                                      profile: _profile!),
                                                  const SizedBox(height: 12),
                                                  ProfileAddressCard(
                                                      profile: _profile!),
                                                ],
                                              ),
                                            ),
                                            Padding(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 2),
                                              child: ListView(
                                                padding: EdgeInsets.zero,
                                                children: [
                                                  ProfileProfessionalCard(
                                                      profile: _profile!),
                                                ],
                                              ),
                                            ),
                                            Padding(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 2),
                                              child: ListView(
                                                padding: EdgeInsets.zero,
                                                children: [
                                                  _hierarchy != null
                                                      ? ProfileHierarchyCard(
                                                          hierarchy:
                                                              _hierarchy!,
                                                        )
                                                      : GlassCard(
                                                          padding:
                                                              const EdgeInsets
                                                                  .all(16),
                                                          child: Text(
                                                            'No hierarchy data available',
                                                            style: Theme.of(
                                                                    context)
                                                                .textTheme
                                                                .bodyMedium
                                                                ?.copyWith(
                                                                  color: AppStitchTheme
                                                                      .lightOnSurfaceMuted,
                                                                  fontWeight:
                                                                      FontWeight
                                                                          .w600,
                                                                ),
                                                          ),
                                                        ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

