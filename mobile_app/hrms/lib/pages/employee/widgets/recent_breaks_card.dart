import 'package:flutter/material.dart';
import '../../../models/break_model.dart';
import '../../../theme/app_stitch_theme.dart';

class RecentBreaksCard extends StatelessWidget {
  final List<BreakData>? recentBreaks;

  const RecentBreaksCard({
    super.key,
    this.recentBreaks,
  });

  @override
  Widget build(BuildContext context) {
    final breaks = recentBreaks ?? [];

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: AppStitchTheme.outline),
      ),
      color: AppStitchTheme.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Row(
              children: [
                const Icon(
                  Icons.coffee,
                  color: Color(0xFFF59E0B),
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  'Recent Break Activity',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: AppStitchTheme.onSurface,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24.0, 0, 24.0, 24.0),
            child: breaks.isEmpty
                ? _buildEmptyState()
                : _buildBreaksGrid(breaks),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          children: [
            Icon(
              Icons.coffee_outlined,
              size: 48,
              color: AppStitchTheme.onSurfaceMuted,
            ),
            const SizedBox(height: 16),
            Text(
              'No recent break activity',
              style: TextStyle(
                fontSize: 14,
                color: AppStitchTheme.onSurfaceMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBreaksGrid(List<BreakData> breaks) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Calculate responsive cross axis count
        final crossAxisCount = constraints.maxWidth > 600 ? 3 : 2;
        // Adjust aspect ratio based on screen size - lower ratio = taller items
        final aspectRatio = constraints.maxWidth > 600 ? 3.2 : 2.3;

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: aspectRatio,
          ),
          itemCount: breaks.length > 6 ? 6 : breaks.length,
          itemBuilder: (context, index) {
            final breakItem = breaks[index];
            return Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
              decoration: BoxDecoration(
                color: AppStitchTheme.surfaceElevated,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.coffee,
                    color: Color(0xFFF59E0B),
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            '${breakItem.type} Break',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: AppStitchTheme.onSurface,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Flexible(
                          child: Text(
                            '${breakItem.startTime} - ${breakItem.endTime ?? 'Active'}',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppStitchTheme.onSurfaceMuted,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

