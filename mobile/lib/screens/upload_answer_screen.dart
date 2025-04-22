import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';

class UploadAnswerScreen extends StatefulWidget {
  @override
  _UploadAnswerScreenState createState() => _UploadAnswerScreenState();
}

class _UploadAnswerScreenState extends State<UploadAnswerScreen> {
  PlatformFile? _file;

  void _pickFile() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles();
    if (result != null) {
      setState(() {
        _file = result.files.first;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Upload Answer')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton(
              onPressed: _pickFile,
              child: Text('Pick Answer PDF'),
            ),
            if (_file != null) ...[
              Text('File picked: ${_file!.name}'),
              ElevatedButton(
                onPressed: () {
                  // Handle file upload here
                  // Upload the file to the server or database
                },
                child: Text('Upload Answer'),
              ),
            ]
          ],
        ),
      ),
    );
  }
}
