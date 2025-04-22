import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final http.Client _client = http.Client();
  final String baseUrl = 'http://localhost:5000/api'; // Replace with your actual backend URL

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  Future<Map<String, dynamic>> registerUser(
    String username,
    String password,
    String role,
    String fullName,
  ) async {
    final url = Uri.parse('$baseUrl/register');
    try {
      final response = await _client.post(
        url,
        headers: {'Content-Type': 'application/json'}, 
        body: jsonEncode({
          'username': username,
          'password': password,
          'fullName': fullName,
          'role': role,
        }),
        
      );

      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception(
            'Registration failed: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  Future<Map<String, dynamic>> loginUser(String username, String password) async {
    final url = Uri.parse('$baseUrl/login');
    try {
      final response = await _client.post(
        url,
        headers: _headers,
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Login failed: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  Future<void> logoutUser() async {
    final url = Uri.parse('$baseUrl/logout');
    try {
      final response = await _client.post(url, headers: _headers);
      if (response.statusCode != 200) {
        throw Exception('Logout failed: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  Future<Map<String, dynamic>> getUserInfo() async {
    final url = Uri.parse('$baseUrl/user');
    try {
      final response = await _client.get(url, headers: _headers);
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception("Not authenticated");
      } else {
        throw Exception("Failed to fetch user info: ${response.statusCode}");
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }
}