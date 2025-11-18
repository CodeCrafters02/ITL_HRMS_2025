import 'package:flutter/material.dart';
import '../services/employee_service.dart';
import '../models/profile_model.dart';
import '../pages/employee/widgets/notification_button.dart';

class EmployeeAppBar extends StatefulWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final bool showBackButton;

  const EmployeeAppBar({
    super.key,
    required this.title,
    this.actions,
    this.showBackButton = true,
  });

  @override
  State<EmployeeAppBar> createState() => _EmployeeAppBarState();

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

class _EmployeeAppBarState extends State<EmployeeAppBar> {
  EmployeeProfile? _profile;
  bool _isLoadingProfile = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final response = await EmployeeService.getEmployeeProfile();
      if (mounted) {
        setState(() {
          _isLoadingProfile = false;
          if (response.success) {
            _profile = response.data;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingProfile = false;
        });
      }
    }
  }

  String _getInitials(String? firstName, String? lastName) {
    final first = firstName?.isNotEmpty == true ? firstName![0] : '';
    final last = lastName?.isNotEmpty == true ? lastName![0] : '';
    return (first + last).toUpperCase();
  }

  Widget _buildProfileAvatar() {
    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(context, '/employee/profile');
      },
      child: Container(
        margin: const EdgeInsets.only(left: 8),
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF6366F1), Color(0xFFA5B4FC)],
          ),
          border: Border.all(color: Colors.white, width: 2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: _isLoadingProfile
            ? const Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                ),
              )
            : _profile?.photo != null && _profile!.photo!.isNotEmpty
                ? ClipOval(
                    child: Image.network(
                      _profile!.photo!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          _buildInitialsWidget(),
                    ),
                  )
                : _buildInitialsWidget(),
      ),
    );
  }

  Widget _buildInitialsWidget() {
    final initials = _profile != null
        ? _getInitials(_profile!.firstName, _profile!.lastName)
        : 'E';
    return Center(
      child: Text(
        initials.isEmpty ? 'E' : initials,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 16,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AppBar(
      leading: widget.showBackButton
          ? IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.pop(context),
            )
          : null,
      title: Row(
        children: [
          Image.asset(
            'assets/logo/app_logo.png',
            height: 32,
            width: 32,
            errorBuilder: (context, error, stackTrace) => const SizedBox(),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(widget.title),
          ),
        ],
      ),
      actions: [
        const Padding(
          padding: EdgeInsets.only(right: 8.0),
          child: NotificationButton(),
        ),
        _buildProfileAvatar(),
        if (widget.actions != null) ...widget.actions!,
        const SizedBox(width: 8),
      ],
      backgroundColor: const Color(0xFF4F46E5),
      foregroundColor: Colors.white,
      elevation: 0,
    );
  }
}


