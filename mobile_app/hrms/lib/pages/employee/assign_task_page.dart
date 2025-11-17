import 'package:flutter/material.dart';

class AssignTaskPage extends StatelessWidget {
  const AssignTaskPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Assign Task'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF111827),
        elevation: 0,
      ),
      body: const Center(
        child: Text(
          'Assign Task Page',
          style: TextStyle(
            fontSize: 18,
            color: Color(0xFF6B7280),
          ),
        ),
      ),
    );
  }
}

