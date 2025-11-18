import 'package:flutter/material.dart';
import '../../../services/notification_service.dart';

class NotificationButton extends StatefulWidget {
  const NotificationButton({super.key});

  @override
  State<NotificationButton> createState() => _NotificationButtonState();
}

class _NotificationButtonState extends State<NotificationButton> with WidgetsBindingObserver {
  int _badgeCount = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _updateBadgeCount();
    // Listen for badge updates
    _startPolling();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _updateBadgeCount();
    }
  }

  void _startPolling() {
    // Update badge count every 5 seconds
    Future.delayed(const Duration(seconds: 5), () {
      if (mounted) {
        _updateBadgeCount();
        _startPolling();
      }
    });
  }

  void _updateBadgeCount() {
    if (mounted) {
      setState(() {
        _badgeCount = NotificationService.notificationsBadge;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined),
          onPressed: () {
            Navigator.pushNamed(context, '/employee/notifications');
            // Update last seen when opened
            NotificationService.updateLastSeen('notifications');
            _updateBadgeCount();
          },
          tooltip: 'Notifications',
        ),
        if (_badgeCount > 0)
          Positioned(
            right: -2,
            top: -2,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFDC2626),
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white,
                  width: 2,
                ),
              ),
              constraints: const BoxConstraints(
                minWidth: 20,
                minHeight: 20,
              ),
              child: Center(
                child: Text(
                  _badgeCount > 99 ? '99+' : _badgeCount.toString(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    height: 1,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

