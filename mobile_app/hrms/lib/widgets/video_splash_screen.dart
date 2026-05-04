import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../utils/performance_helper.dart';

/// Plays the startup splash animation once and notifies when complete.
/// On low-end devices, skips video and uses static splash for faster startup.
class VideoSplashScreen extends StatefulWidget {
  const VideoSplashScreen({
    super.key,
    required this.onFinished,
    this.fallbackDuration = const Duration(seconds: 3), // Reduced from 4s
    this.skipVideoOnLowEnd = true,
  });

  final VoidCallback onFinished;
  final Duration fallbackDuration;
  final bool skipVideoOnLowEnd;

  @override
  State<VideoSplashScreen> createState() => _VideoSplashScreenState();
}

class _VideoSplashScreenState extends State<VideoSplashScreen> {
  VideoPlayerController? _controller;
  Timer? _fallbackTimer;
  bool _completed = false;
  bool _useVideo = true;

  @override
  void initState() {
    super.initState();
    
    // Skip video on low-end devices for faster startup
    if (widget.skipVideoOnLowEnd && PerformanceHelper.isLowEndDevice) {
      _useVideo = false;
      _startFallbackTimer();
      return;
    }
    
    _controller = VideoPlayerController.asset(
      'assets/splash_screen/splash_screen_animation.mp4',
    );
    _initializeAndPlay();
  }
  
  void _startFallbackTimer() {
    _fallbackTimer = Timer(widget.fallbackDuration, _completeIfNeeded);
  }

  Future<void> _initializeAndPlay() async {
    _startFallbackTimer();

    try {
      await _controller!.initialize();
      if (!mounted) {
        return;
      }
      _controller!
        ..setLooping(false)
        ..addListener(_videoListener);
      await _controller!.play();
      if (mounted) setState(() {});
    } catch (_) {
      _completeIfNeeded();
    }
  }

  void _videoListener() {
    if (_controller == null || !_controller!.value.isInitialized) {
      return;
    }

    final duration = _controller!.value.duration;
    final position = _controller!.value.position;
    if (duration > Duration.zero &&
        position >= duration - const Duration(milliseconds: 200)) { // Increased buffer
      _completeIfNeeded();
    }
  }

  void _completeIfNeeded() {
    if (_completed) {
      return;
    }
    _completed = true;
    _fallbackTimer?.cancel();
    widget.onFinished();
  }

  @override
  void dispose() {
    _fallbackTimer?.cancel();
    _controller?.removeListener(_videoListener);
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Show static splash for low-end devices
    if (!_useVideo) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.asset(
                'assets/logo/app_logo.png',
                width: 120,
                height: 120,
                errorBuilder: (context, error, stackTrace) =>
                    const SizedBox(width: 120, height: 120),
              ),
              const SizedBox(height: 24),
              const CircularProgressIndicator(),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: _controller?.value.isInitialized == true
            ? FittedBox(
                fit: BoxFit.contain,
                child: SizedBox(
                  width: _controller!.value.size.width,
                  height: _controller!.value.size.height,
                  child: VideoPlayer(_controller!),
                ),
              )
            : Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Image.asset(
                      'assets/logo/app_logo.png',
                      width: 100,
                      height: 100,
                      errorBuilder: (context, error, stackTrace) =>
                          const SizedBox(width: 100, height: 100),
                    ),
                    const SizedBox(height: 20),
                    const CircularProgressIndicator(),
                  ],
                ),
              ),
      ),
    );
  }
}
