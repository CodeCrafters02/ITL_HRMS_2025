import 'package:flutter/material.dart';

/// Timer widget that displays time in HH:MM:SS format
class TimerWidget extends StatefulWidget {
  final int seconds;
  final TextStyle? textStyle;
  final Color? textColor;

  const TimerWidget({
    super.key,
    required this.seconds,
    this.textStyle,
    this.textColor,
  });

  @override
  State<TimerWidget> createState() => _TimerWidgetState();
}

class _TimerWidgetState extends State<TimerWidget> {
  @override
  Widget build(BuildContext context) {
    return Text(
      _formatTime(widget.seconds),
      style: widget.textStyle ??
          TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            fontFamily: 'monospace',
            color: widget.textColor ?? const Color(0xFF374151),
          ),
    );
  }

  String _formatTime(int seconds) {
    if (seconds < 0) return '00:00:00';
    
    final hours = (seconds ~/ 3600).toString().padLeft(2, '0');
    final minutes = ((seconds % 3600) ~/ 60).toString().padLeft(2, '0');
    final secs = (seconds % 60).toString().padLeft(2, '0');
    
    return '$hours:$minutes:$secs';
  }
}

