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
import 'profile_edit_page.dart';

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
    if (_isLoading) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        body: StitchBackground(
          child: const Center(child: CircularProgressIndicator()),
        ),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        body: StitchBackground(
          child: Center(
            child: GlassCard(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.error_outline_rounded, size: 48, color: Colors.red.shade400),
                  const SizedBox(height: 16),
                  Text(
                    _error!,
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppStitchTheme.lightOnSurfaceMuted),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _loadProfileData,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: StitchBackground(
        child: SafeArea(
          child: NestedScrollView(
            headerSliverBuilder: (context, innerBoxIsScrolled) {
              return [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                    child: GlassCard(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                      child: Row(
                        children: [
                          IconButton(
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'My Profile',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.w900,
                                    color: AppStitchTheme.lightOnSurface,
                                  ),
                            ),
                          ),
                          IconButton(
                            onPressed: _profile == null
                                ? null
                                : () async {
                                    final updated =
                                        await Navigator.push<EmployeeProfile>(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => ProfileEditPage(
                                          profile: _profile!,
                                        ),
                                      ),
                                    );
                                    if (updated != null) {
                                      setState(() => _profile = updated);
                                    }
                                  },
                            icon: const Icon(Icons.edit_rounded, size: 20),
                            tooltip: 'Edit Profile',
                          ),
                          IconButton(
                            onPressed: () => Navigator.pushNamed(context, '/change-password'),
                            icon: const Icon(Icons.lock_reset_rounded, size: 22),
                            tooltip: 'Security',
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: ProfileMetaCard(
                      profile: _profile!,
                      onPhotoUpdated: _onPhotoUpdated,
                    ),
                  ),
                ),
                SliverPersistentHeader(
                  pinned: true,
                  delegate: _SliverAppBarDelegate(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: GlassCard(
                        padding: const EdgeInsets.all(4),
                        child: TabBar(
                          controller: _tabController,
                          labelColor: Colors.white,
                          unselectedLabelColor: AppStitchTheme.lightOnSurfaceMuted,
                          indicator: BoxDecoration(
                            color: AppStitchTheme.primary,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: AppStitchTheme.primary.withValues(alpha: 0.2),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          indicatorSize: TabBarIndicatorSize.tab,
                          dividerColor: Colors.transparent,
                          labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                          tabs: const [
                            Tab(text: 'Personal'),
                            Tab(text: 'Work'),
                            Tab(text: 'Hierarchy'),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ];
            },
            body: TabBarView(
              controller: _tabController,
              children: [
                _buildTabContent([
                  ProfileInfoCard(profile: _profile!),
                  const SizedBox(height: 12),
                  ProfileAddressCard(profile: _profile!),
                ]),
                _buildTabContent([
                  ProfileProfessionalCard(profile: _profile!),
                ]),
                _buildTabContent([
                  _hierarchy != null
                      ? ProfileHierarchyCard(hierarchy: _hierarchy!)
                      : const Center(child: Text('No hierarchy data')),
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTabContent(List<Widget> children) {
    return RefreshIndicator(
      onRefresh: _loadProfileData,
      color: AppStitchTheme.primary,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: children,
      ),
    );
  }
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;

  _SliverAppBarDelegate({required this.child});

  @override
  double get minExtent => 72.0;
  @override
  double get maxExtent => 72.0;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Colors.transparent,
      child: child,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) => false;
}

