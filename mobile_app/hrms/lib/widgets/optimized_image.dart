import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

/// Optimized image widget with caching and performance settings
class OptimizedImage extends StatelessWidget {
  const OptimizedImage({
    super.key,
    required this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.placeholder,
    this.errorWidget,
    this.memCacheWidth,
    this.memCacheHeight,
    this.maxWidthDiskCache,
    this.maxHeightDiskCache,
    this.fadeInDuration = const Duration(milliseconds: 150),
    this.borderRadius,
    this.shape = BoxShape.rectangle,
  });

  final String imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget? placeholder;
  final Widget? errorWidget;
  final int? memCacheWidth;
  final int? memCacheHeight;
  final int? maxWidthDiskCache;
  final int? maxHeightDiskCache;
  final Duration fadeInDuration;
  final BorderRadius? borderRadius;
  final BoxShape shape;

  @override
  Widget build(BuildContext context) {
    // Calculate cache dimensions based on display size if not provided
    final cacheWidth = memCacheWidth ?? width?.toInt();
    final cacheHeight = memCacheHeight ?? height?.toInt();

    Widget image = CachedNetworkImage(
      imageUrl: imageUrl,
      width: width,
      height: height,
      fit: fit,
      memCacheWidth: cacheWidth,
      memCacheHeight: cacheHeight,
      maxWidthDiskCache: maxWidthDiskCache ?? 800, // Limit disk cache size
      maxHeightDiskCache: maxHeightDiskCache ?? 800,
      fadeInDuration: fadeInDuration,
      placeholder: placeholder != null
          ? (_, __) => placeholder!
          : (_, __) => Container(
                color: Colors.grey[200],
                child: const Center(
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              ),
      errorWidget: errorWidget != null
          ? (_, __, ___) => errorWidget!
          : (_, __, ___) => Container(
                color: Colors.grey[200],
                child: const Icon(Icons.broken_image, color: Colors.grey),
              ),
    );

    // Apply border radius if specified
    if (borderRadius != null && shape == BoxShape.rectangle) {
      image = ClipRRect(
        borderRadius: borderRadius!,
        child: image,
      );
    }

    // Apply shape if circular
    if (shape == BoxShape.circle) {
      image = ClipOval(child: image);
    }

    return RepaintBoundary(child: image);
  }
}

/// Optimized avatar widget for profile images
class OptimizedAvatar extends StatelessWidget {
  const OptimizedAvatar({
    super.key,
    this.imageUrl,
    this.radius = 20,
    this.initials,
    this.backgroundColor,
    this.foregroundColor,
  });

  final String? imageUrl;
  final double radius;
  final String? initials;
  final Color? backgroundColor;
  final Color? foregroundColor;

  @override
  Widget build(BuildContext context) {
    final hasImage = imageUrl != null && imageUrl!.isNotEmpty;

    return CircleAvatar(
      radius: radius,
      backgroundColor: backgroundColor ?? Theme.of(context).primaryColor,
      foregroundColor: foregroundColor ?? Colors.white,
      child: hasImage
          ? OptimizedImage(
              imageUrl: imageUrl!,
              width: radius * 2,
              height: radius * 2,
              fit: BoxFit.cover,
              shape: BoxShape.circle,
              memCacheWidth: (radius * 2).toInt(),
              memCacheHeight: (radius * 2).toInt(),
              errorWidget: _buildFallback(),
            )
          : _buildFallback(),
    );
  }

  Widget _buildFallback() {
    return Center(
      child: Text(
        initials ?? '',
        style: TextStyle(
          fontSize: radius * 0.8,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
