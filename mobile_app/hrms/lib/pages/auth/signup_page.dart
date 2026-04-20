import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../theme/app_stitch_theme.dart';
import 'widgets/auth_branding_panel.dart';

/// Password-based registration (e.g. first master user). Not linked from the
/// Google-only login screen; open via `/signup` when needed.
class SignupPage extends StatefulWidget {
  const SignupPage({super.key});

  @override
  State<SignupPage> createState() => _SignupPageState();
}

class _SignupPageState extends State<SignupPage> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSignup() async {
    final username = _usernameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    if (username.isEmpty ||
        email.isEmpty ||
        password.isEmpty ||
        confirmPassword.isEmpty) {
      _showErrorDialog('Please fill in all fields');
      return;
    }

    if (!_isValidEmail(email)) {
      _showErrorDialog('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      _showErrorDialog('Password must be at least 6 characters long');
      return;
    }

    if (password != confirmPassword) {
      _showErrorDialog('Passwords do not match');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final response = await AuthService.register(
        username: username,
        email: email,
        password: password,
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        if (response.success) {
          _showSuccessDialog(
            response.message ?? 'Registration successful!',
            onOk: () {
              Navigator.pop(context);
              Navigator.pushReplacementNamed(context, '/login');
            },
          );
        } else {
          _showErrorDialog(response.message ?? 'Registration failed');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _showErrorDialog('An error occurred: ${e.toString()}');
      }
    }
  }

  bool _isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppStitchTheme.surfaceElevated,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppStitchTheme.outline),
        ),
        title: Text(
          'Error',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: AppStitchTheme.onSurface,
              ),
        ),
        content: Text(
          message,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppStitchTheme.onSurfaceVariant,
              ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showSuccessDialog(String message, {VoidCallback? onOk}) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppStitchTheme.surfaceElevated,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppStitchTheme.outline),
        ),
        title: Text(
          'Success',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: AppStitchTheme.onSurface,
              ),
        ),
        content: Text(
          message,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppStitchTheme.onSurfaceVariant,
              ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              if (onOk != null) onOk();
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isLandscape = size.width > size.height;

    return Scaffold(
      backgroundColor: AppStitchTheme.scaffoldBackground,
      body: isLandscape
          ? Row(
              children: [
                const Expanded(child: AuthBrandingPanel()),
                Expanded(child: _buildFormArea(context)),
              ],
            )
          : Column(
              children: [
                SizedBox(
                  height: size.height * 0.32,
                  child: const AuthBrandingPanel(),
                ),
                Expanded(child: _buildFormArea(context)),
              ],
            ),
    );
  }

  Widget _buildFormArea(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(28, 8, 28, 32),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: _buildForm(context),
        ),
      ),
    );
  }

  Widget _buildForm(BuildContext context) {
    final theme = Theme.of(context);

    InputDecoration deco(String hint, {Widget? suffix}) {
      return InputDecoration(
        hintText: hint,
        suffixIcon: suffix,
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Sign up',
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w700,
            color: AppStitchTheme.onSurface,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Create your account to get started.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: AppStitchTheme.onSurfaceMuted,
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Username',
          style: theme.textTheme.labelLarge?.copyWith(
            color: AppStitchTheme.onSurfaceVariant,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _usernameController,
          style: const TextStyle(color: AppStitchTheme.onSurface),
          cursorColor: AppStitchTheme.primary,
          decoration: deco('Username'),
        ),
        const SizedBox(height: 20),
        Text(
          'Email',
          style: theme.textTheme.labelLarge?.copyWith(
            color: AppStitchTheme.onSurfaceVariant,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          style: const TextStyle(color: AppStitchTheme.onSurface),
          cursorColor: AppStitchTheme.primary,
          decoration: deco('Email'),
        ),
        const SizedBox(height: 20),
        Text(
          'Password',
          style: theme.textTheme.labelLarge?.copyWith(
            color: AppStitchTheme.onSurfaceVariant,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          style: const TextStyle(color: AppStitchTheme.onSurface),
          cursorColor: AppStitchTheme.primary,
          decoration: deco(
            'Password',
            suffix: IconButton(
              icon: Icon(
                _obscurePassword ? Icons.visibility_off : Icons.visibility,
                color: AppStitchTheme.onSurfaceMuted,
              ),
              onPressed: () {
                setState(() => _obscurePassword = !_obscurePassword);
              },
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'Confirm password',
          style: theme.textTheme.labelLarge?.copyWith(
            color: AppStitchTheme.onSurfaceVariant,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _confirmPasswordController,
          obscureText: _obscureConfirmPassword,
          style: const TextStyle(color: AppStitchTheme.onSurface),
          cursorColor: AppStitchTheme.primary,
          decoration: deco(
            'Confirm password',
            suffix: IconButton(
              icon: Icon(
                _obscureConfirmPassword
                    ? Icons.visibility_off
                    : Icons.visibility,
                color: AppStitchTheme.onSurfaceMuted,
              ),
              onPressed: () {
                setState(
                  () => _obscureConfirmPassword = !_obscureConfirmPassword,
                );
              },
            ),
          ),
        ),
        const SizedBox(height: 28),
        SizedBox(
          height: 52,
          child: ElevatedButton(
            onPressed: _isLoading ? null : _handleSignup,
            child: _isLoading
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Text('Sign up'),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Already have an account? ',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppStitchTheme.onSurfaceMuted,
              ),
            ),
            TextButton(
              onPressed: () => Navigator.pushNamed(context, '/login'),
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: const Size(0, 0),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text('Sign in'),
            ),
          ],
        ),
      ],
    );
  }
}
