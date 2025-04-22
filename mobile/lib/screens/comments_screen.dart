import 'package:flutter/material.dart';

class CommentsScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('View Comments')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Display list of comments here
            Text('Comments for your uploaded answers will appear here.'),
            ElevatedButton(
              onPressed: () {
                // Navigate back to HomeScreen
                Navigator.pop(context);
              },
              child: Text('Back to Home'),
            ),
          ],
        ),
      ),
    );
  }
}
