import 'package:flutter/material.dart';

/// A persistent banner that indicates the app is running in demo mode.
/// Shows "Demo Mode - Sample Data" with a distinctive amber/orange styling.
class DemoModeIndicator extends StatelessWidget {
  final bool isCompact;

  const DemoModeIndicator({
    super.key,
    this.isCompact = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (isCompact) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: Colors.amber.shade100,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: Colors.amber.shade300, width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.info_outline,
              size: 12,
              color: Colors.amber.shade800,
            ),
            const SizedBox(width: 4),
            Text(
              'DEMO',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: Colors.amber.shade800,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.amber.shade50,
            Colors.orange.shade50,
          ],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        border: Border(
          bottom: BorderSide(
            color: Colors.amber.shade200,
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            Icon(
              Icons.info_outline,
              size: 18,
              color: Colors.amber.shade800,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Demo Mode - Sample Data',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Colors.amber.shade900,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.amber.shade100,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.amber.shade300),
              ),
              child: Text(
                'TESTING',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Colors.amber.shade800,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A full-screen overlay widget that shows demo mode watermark
/// Can be placed at the root of the employee pages
class DemoModeOverlay extends StatelessWidget {
  final Widget child;

  const DemoModeOverlay({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        child,
        // Watermark
        Positioned.fill(
          child: IgnorePointer(
            child: Opacity(
              opacity: 0.03,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return Stack(
                    children: [
                      for (int i = 0; i < 5; i++)
                        for (int j = 0; j < 3; j++)
                          Positioned(
                            left: (constraints.maxWidth / 5) * i + 20,
                            top: (constraints.maxHeight / 3) * j + 50,
                            child: Transform.rotate(
                              angle: -0.3,
                              child: Text(
                                'DEMO',
                                style: TextStyle(
                                  fontSize: 60,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.grey.shade800,
                                ),
                              ),
                            ),
                          ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ],
    );
  }
}
