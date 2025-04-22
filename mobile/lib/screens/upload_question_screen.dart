import 'package:flutter/material.dart';

class UploadQuestionScreen extends StatelessWidget {
  const UploadQuestionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Upload Question Paper')),
      body: const Center(
        child: Text('Admin can upload question papers here.'),
      ),
    );
  }
}
