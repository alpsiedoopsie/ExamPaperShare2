import 'package:flutter/material.dart';
import 'services/api_service.dart';

class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _apiService = ApiService();
  String? _username;
  String? _role;

  void _fetchUserInfo() async {
    try {
      final userInfo = await _apiService.getUserInfo();
      setState(() {
        _username = userInfo['username'];
        _role = userInfo['role'];
      });
    } catch (e) {
      // Handle error
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error fetching user info')));
    }
  }

  void _logout() async {
    try {
      await _apiService.logoutUser();
      Navigator.pushReplacementNamed(context, '/login');  // Redirect to login after logout
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error logging out')));
    }
  }

  @override
  void initState() {
    super.initState();
    _fetchUserInfo();  // Fetch user info on page load
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Home')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text('Username: $_username'),
            Text('Role: $_role'),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: _logout,
              child: Text('Logout'),
            ),
          ],
        ),
      ),
    );
  }
}
