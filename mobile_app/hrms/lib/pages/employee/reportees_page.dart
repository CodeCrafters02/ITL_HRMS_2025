import 'package:flutter/material.dart';

class ReporteesPage extends StatelessWidget {
  const ReporteesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reportees'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF111827),
        elevation: 0,
      ),
      body: const Center(
        child: Text(
          'Reportees Page',
          style: TextStyle(
            fontSize: 18,
            color: Color(0xFF6B7280),
          ),
        ),
      ),
    );
  }
}

