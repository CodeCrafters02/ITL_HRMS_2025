import 'dart:async';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

/// Plays the startup splash animation once and notifies when complete.
class VideoSplashScreen extends StatefulWidget {
  const VideoSplashScreen({
    super.key,
    required this.onFinished,
    this.fallbackDuration = const Duration(seconds: 4),
  });

  final VoidCallback onFinished;
  final Duration fallbackDuration;

  @override
  State<VideoSplashScreen> createState() => _VideoSplashScreenState();
}

class _VideoSplashScreenState extends State<VideoSplashScreen> {
  late final VideoPlayerController _controller;
  Timer? _fallbackTimer;
  bool _completed = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.asset(
      'assets/splash_screen/splash_screen_animation.mp4',
    );
    _initializeAndPlay();
  }

  Future<void> _initializeAndPlay() async {
    _fallbackTimer = Timer(widget.fallbackDuration, _completeIfNeeded);

    try {
      await _controller.initialize();
      if (!mounted) {
        return;
      }
      _controller
        ..setLooping(false)
        ..addListener(_videoListener);
      await _controller.play();
      setState(() {});
    } catch (_) {
      _completeIfNeeded();
    }
  }

  void _videoListener() {
    if (!_controller.value.isInitialized) {
      return;
    }

    final duration = _controller.value.duration;
    final position = _controller.value.position;
    if (duration > Duration.zero &&
        position >= duration - const Duration(milliseconds: 120)) {
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
    _controller.removeListener(_videoListener);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: _controller.value.isInitialized
            ? FittedBox(
                fit: BoxFit.contain,
                child: SizedBox(
                  width: _controller.value.size.width,
                  height: _controller.value.size.height,
                  child: VideoPlayer(_controller),
                ),
              )
            : const SizedBox.shrink(),
      ),
    );
  }
}
