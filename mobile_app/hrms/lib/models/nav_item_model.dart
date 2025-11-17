import 'package:flutter/material.dart';

/// Model representing a navigation item in the employee app
class NavItem {
  final String name;
  final IconData icon;
  final String? path;
  final int? badge;
  final VoidCallback? onClick;
  final bool isConditional;

  const NavItem({
    required this.name,
    required this.icon,
    this.path,
    this.badge,
    this.onClick,
    this.isConditional = false,
  });
}

