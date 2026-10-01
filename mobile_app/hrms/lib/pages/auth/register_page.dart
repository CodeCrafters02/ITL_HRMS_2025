import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/registration_service.dart';
import '../../theme/app_stitch_theme.dart';
import '../../utils/performance_helper.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/glass_chrome.dart';
import '../../widgets/stitch_background.dart';

/// Employee self-registration. The request is reviewed on the admin web
/// (Registration Requests); the first company admin to accept it adds the person to their company.
class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _forms = List.generate(4, (_) => GlobalKey<FormState>());
  final _c = <String, TextEditingController>{
    for (final k in const [
      'first_name', 'middle_name', 'last_name', 'email', 'mobile', 'temporary_address', 'permanent_address',
      'aadhar_no', 'pan_no', 'desired_department', 'desired_designation', 'previous_employer',
      'previous_designation', 'total_experience_years', 'message', 'password', 'confirm',
    ])
      k: TextEditingController(),
  };
  int _step = 0;
  String _gender = '';
  DateTime? _dob;
  bool _sameAddress = true, _saving = false, _showPwd = false, _agree = false;
  String? _submittedEmail;

  static const _steps = [
    (Icons.person_outline_rounded, 'Personal'),
    (Icons.contact_mail_outlined, 'Contact'),
    (Icons.work_outline_rounded, 'Work'),
    (Icons.lock_outline_rounded, 'Account'),
  ];

  @override
  void dispose() {
    for (final c in _c.values) {
      c.dispose();
    }
    super.dispose();
  }

  String v(String k) => _c[k]!.text.trim();

  void _next() {
    if (!(_forms[_step].currentState?.validate() ?? false)) return;
    if (_step == 0 && _gender.isEmpty) return _toast('Please select your gender');
    if (_step < 3) {
      setState(() => _step++);
    } else {
      _submit();
    }
  }

  Future<void> _submit() async {
    if (!_agree) return _toast('Please confirm the details are correct');
    setState(() => _saving = true);
    final body = <String, dynamic>{
      for (final k in _c.keys)
        if (k != 'confirm' && v(k).isNotEmpty) k: v(k),
      'gender': _gender,
      if (_dob != null) 'date_of_birth': DateFormat('yyyy-MM-dd').format(_dob!),
      if (_sameAddress) 'permanent_address': v('temporary_address'),
    };
    final r = await RegistrationService.submit(body);
    if (!mounted) return;
    setState(() => _saving = false);
    if (!r.success) {
      final msg = r.message ?? 'Registration failed';
      // Jump back to the step that owns the failing field.
      if (msg.startsWith('Email') || msg.startsWith('Mobile')) setState(() => _step = 1);
      return _toast(msg);
    }
    setState(() => _submittedEmail = v('email'));
  }

  void _toast(String m) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(m), behavior: SnackBarBehavior.floating, backgroundColor: const Color(0xFFDC2626)));

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _step == 0 || _submittedEmail != null,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _step--);
      },
      child: Scaffold(
        backgroundColor: AppStitchTheme.lightScaffold,
        body: StitchBackground(
          enableAnimations: PerformanceHelper.enableParticles,
          child: SafeArea(
            child: Column(children: [
              GlassHeader(
                title: 'Register',
                subtitle: _submittedEmail != null ? 'Request sent' : 'Step ${_step + 1} of 4 · ${_steps[_step].$2}',
                icon: Icons.how_to_reg_rounded,
                showHome: false,
                onBack: () => _step > 0 && _submittedEmail == null ? setState(() => _step--) : Navigator.of(context).maybePop(),
              ),
              Expanded(child: _submittedEmail != null ? _success() : _wizard()),
            ]),
          ),
        ),
      ),
    );
  }

  // ------------------------------------------------------------------ wizard
  Widget _wizard() => Column(children: [
        Padding(padding: const EdgeInsets.fromLTRB(16, 8, 16, 4), child: _stepper()),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: KeyedSubtree(key: ValueKey(_step), child: [_personal, _contact, _work, _account][_step]()),
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: Row(children: [
              if (_step > 0) ...[
                Expanded(
                  child: OutlinedButton(
                    onPressed: _saving ? null : () => setState(() => _step--),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(52),
                      backgroundColor: Colors.white.withValues(alpha: 0.7),
                      side: BorderSide(color: AppStitchTheme.lightOutline.withValues(alpha: 0.8)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Text('Back', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              Expanded(
                flex: 2,
                child: FilledButton(
                  onPressed: _saving ? null : _next,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppStitchTheme.primary,
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _saving
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(_step < 3 ? 'Continue' : 'Submit for approval', style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ]),
          ),
        ),
      ]);

  Widget _stepper() => GlassCard(
        borderRadius: 22,
        enableBlur: false,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        child: Row(children: [
          for (var i = 0; i < _steps.length; i++) ...[
            if (i > 0)
              Expanded(
                child: Container(
                  height: 2,
                  margin: const EdgeInsets.only(bottom: 18),
                  color: i <= _step ? AppStitchTheme.primary : AppStitchTheme.lightOutline,
                ),
              ),
            Column(mainAxisSize: MainAxisSize.min, children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i < _step ? const Color(0xFF16A34A) : (i == _step ? AppStitchTheme.primary : Colors.white),
                  border: Border.all(color: i <= _step ? Colors.transparent : AppStitchTheme.lightOutline),
                ),
                child: Icon(i < _step ? Icons.check_rounded : _steps[i].$1, size: 17, color: i <= _step ? Colors.white : AppStitchTheme.lightOnSurfaceMuted),
              ),
              const SizedBox(height: 4),
              Text(
                _steps[i].$2,
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: i == _step ? FontWeight.w800 : FontWeight.w600,
                  color: i == _step ? AppStitchTheme.primary : AppStitchTheme.lightOnSurfaceMuted,
                ),
              ),
            ]),
          ],
        ]),
      );

  Widget _card(String title, String subtitle, int step, List<Widget> children) => GlassCard(
        borderRadius: 24,
        enableBlur: false,
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 16),
        child: Form(
          key: _forms[step],
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppStitchTheme.lightOnSurface)),
            const SizedBox(height: 2),
            Text(subtitle, style: const TextStyle(fontSize: 12.5, color: AppStitchTheme.lightOnSurfaceMuted)),
            const SizedBox(height: 16),
            ...children,
          ]),
        ),
      );

  Widget _field(
    String key,
    String label, {
    IconData? icon,
    bool required = false,
    TextInputType? keyboard,
    int maxLines = 1,
    String? hint,
    String? Function(String)? validator,
    bool obscure = false,
    Widget? suffix,
    TextCapitalization caps = TextCapitalization.none,
  }) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextFormField(
          controller: _c[key],
          keyboardType: keyboard,
          maxLines: maxLines,
          obscureText: obscure,
          textCapitalization: caps,
          textInputAction: maxLines > 1 ? TextInputAction.newline : TextInputAction.next,
          decoration: _deco(required ? '$label *' : label, icon: icon, hint: hint, suffix: suffix),
          validator: (raw) {
            final t = (raw ?? '').trim();
            if (required && t.isEmpty) return '$label is required';
            return t.isEmpty ? null : validator?.call(t);
          },
        ),
      );

  InputDecoration _deco(String label, {IconData? icon, String? hint, Widget? suffix}) => InputDecoration(
        labelText: label,
        hintText: hint,
        alignLabelWithHint: true,
        prefixIcon: icon == null ? null : Icon(icon, size: 20, color: AppStitchTheme.lightOnSurfaceMuted),
        suffixIcon: suffix,
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.85),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: AppStitchTheme.lightOutline)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: AppStitchTheme.lightOutline)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppStitchTheme.primary, width: 1.6)),
      );

  // ------------------------------------------------------------------ steps
  Widget _personal() => _card('Personal details', 'Tell us who you are.', 0, [
        _field('first_name', 'First name', icon: Icons.badge_outlined, required: true, caps: TextCapitalization.words),
        _field('middle_name', 'Middle name', icon: Icons.badge_outlined, caps: TextCapitalization.words),
        _field('last_name', 'Last name', icon: Icons.badge_outlined, required: true, caps: TextCapitalization.words),
        const Text('Gender *', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppStitchTheme.lightOnSurfaceMuted)),
        const SizedBox(height: 8),
        Row(children: [
          for (final g in const [('male', 'Male', Icons.male_rounded), ('female', 'Female', Icons.female_rounded), ('other', 'Other', Icons.transgender_rounded)])
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(right: g.$1 == 'other' ? 0 : 8),
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => setState(() => _gender = g.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: _gender == g.$1 ? AppStitchTheme.primary.withValues(alpha: 0.1) : Colors.white.withValues(alpha: 0.85),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: _gender == g.$1 ? AppStitchTheme.primary : AppStitchTheme.lightOutline, width: _gender == g.$1 ? 1.6 : 1),
                    ),
                    child: Column(children: [
                      Icon(g.$3, color: _gender == g.$1 ? AppStitchTheme.primary : AppStitchTheme.lightOnSurfaceMuted),
                      const SizedBox(height: 2),
                      Text(g.$2, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5, color: _gender == g.$1 ? AppStitchTheme.primary : AppStitchTheme.lightOnSurface)),
                    ]),
                  ),
                ),
              ),
            ),
        ]),
        const SizedBox(height: 12),
        FormField<DateTime>(
          validator: (_) => _dob == null ? 'Date of birth is required' : null,
          builder: (state) => InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () async {
              final now = DateTime.now();
              final d = await showDatePicker(
                context: context,
                initialDate: _dob ?? DateTime(now.year - 25),
                firstDate: DateTime(now.year - 80),
                lastDate: DateTime(now.year - 16, now.month, now.day),
              );
              if (d != null) {
                setState(() => _dob = d);
                state.didChange(d);
              }
            },
            child: InputDecorator(
              decoration: _deco('Date of birth *', icon: Icons.cake_outlined).copyWith(errorText: state.errorText),
              child: Text(
                _dob == null ? 'Select date' : DateFormat('dd MMM yyyy').format(_dob!),
                style: TextStyle(color: _dob == null ? AppStitchTheme.lightOnSurfaceMuted : AppStitchTheme.lightOnSurface, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ),
      ]);

  Widget _contact() => _card('Contact & identity', 'We use your email to create your login.', 1, [
        _field('email', 'Email', icon: Icons.alternate_email_rounded, required: true, keyboard: TextInputType.emailAddress,
            validator: (t) => RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(t) ? null : 'Enter a valid email'),
        _field('mobile', 'Mobile number', icon: Icons.phone_iphone_rounded, required: true, keyboard: TextInputType.phone,
            validator: (t) => t.replaceAll(RegExp(r'\D'), '').length >= 10 ? null : 'Enter a valid 10-digit mobile number'),
        _field('temporary_address', 'Current address', icon: Icons.home_outlined, required: true, maxLines: 2, caps: TextCapitalization.sentences),
        CheckboxListTile(
          value: _sameAddress,
          onChanged: (x) => setState(() => _sameAddress = x ?? true),
          dense: true,
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          activeColor: AppStitchTheme.primary,
          title: const Text('Permanent address is the same', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ),
        if (!_sameAddress) _field('permanent_address', 'Permanent address', icon: Icons.location_city_outlined, required: true, maxLines: 2, caps: TextCapitalization.sentences),
        _field('aadhar_no', 'Aadhaar number', icon: Icons.fingerprint_rounded, keyboard: TextInputType.number,
            validator: (t) => t.replaceAll(' ', '').length == 12 ? null : 'Aadhaar must be 12 digits'),
        _field('pan_no', 'PAN', icon: Icons.credit_card_rounded, caps: TextCapitalization.characters,
            validator: (t) => RegExp(r'^[A-Za-z]{5}[0-9]{4}[A-Za-z]$').hasMatch(t) ? null : 'Enter a valid PAN (e.g. ABCDE1234F)'),
      ]);

  Widget _work() => _card('Work details', 'Helps admins place you in the right team.', 2, [
        _field('desired_department', 'Department', icon: Icons.apartment_rounded, required: true, caps: TextCapitalization.words, hint: 'e.g. Development'),
        _field('desired_designation', 'Designation / role', icon: Icons.work_outline_rounded, required: true, caps: TextCapitalization.words, hint: 'e.g. Flutter Developer'),
        _field('total_experience_years', 'Total experience (years)', icon: Icons.timeline_rounded, keyboard: const TextInputType.numberWithOptions(decimal: true),
            validator: (t) => (double.tryParse(t) ?? -1) >= 0 ? null : 'Enter years, e.g. 2.5'),
        _field('previous_employer', 'Previous employer', icon: Icons.business_rounded, caps: TextCapitalization.words),
        _field('previous_designation', 'Previous designation', icon: Icons.badge_rounded, caps: TextCapitalization.words),
        _field('message', 'Note for the admin', icon: Icons.chat_bubble_outline_rounded, maxLines: 3, caps: TextCapitalization.sentences, hint: 'Who referred you, joining date, etc.'),
      ]);

  Widget _account() => _card('Create your password', 'You will sign in with your email and this password after approval.', 3, [
        _field('password', 'Password', icon: Icons.lock_outline_rounded, required: true, obscure: !_showPwd,
            suffix: IconButton(
              onPressed: () => setState(() => _showPwd = !_showPwd),
              icon: Icon(_showPwd ? Icons.visibility_off_rounded : Icons.visibility_rounded, size: 20),
            ),
            validator: (t) => t.length < 8
                ? 'At least 8 characters'
                : (!RegExp(r'[A-Za-z]').hasMatch(t) || !RegExp(r'\d').hasMatch(t))
                    ? 'Use letters and numbers'
                    : null),
        _field('confirm', 'Confirm password', icon: Icons.lock_reset_rounded, required: true, obscure: !_showPwd,
            validator: (t) => t == _c['password']!.text ? null : 'Passwords do not match'),
        const SizedBox(height: 4),
        _summary(),
        CheckboxListTile(
          value: _agree,
          onChanged: (x) => setState(() => _agree = x ?? false),
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          activeColor: AppStitchTheme.primary,
          title: const Text('I confirm these details are correct', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ),
      ]);

  Widget _summary() {
    final rows = [
      ('Name', [v('first_name'), v('middle_name'), v('last_name')].where((x) => x.isNotEmpty).join(' ')),
      ('Email', v('email')),
      ('Mobile', v('mobile')),
      ('Role', [v('desired_designation'), v('desired_department')].where((x) => x.isNotEmpty).join(' · ')),
    ];
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppStitchTheme.primary.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(14)),
      child: Column(children: [
        for (final r in rows)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 3),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              SizedBox(width: 64, child: Text(r.$1, style: const TextStyle(fontSize: 12, color: AppStitchTheme.lightOnSurfaceMuted))),
              Expanded(child: Text(r.$2.isEmpty ? '—' : r.$2, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppStitchTheme.lightOnSurface))),
            ]),
          ),
      ]),
    );
  }

  // ------------------------------------------------------------------ done
  Widget _success() => SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: GlassCard(
          borderRadius: 28,
          enableBlur: false,
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF16A34A).withValues(alpha: 0.12)),
              child: const Icon(Icons.mark_email_read_rounded, size: 46, color: Color(0xFF16A34A)),
            ),
            const SizedBox(height: 16),
            const Text('Request sent for approval', textAlign: TextAlign.center, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppStitchTheme.lightOnSurface)),
            const SizedBox(height: 8),
            Text(
              'An admin will review your details. Once accepted you can sign in with $_submittedEmail and your password, or with Microsoft.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppStitchTheme.lightOnSurfaceMuted, height: 1.45),
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () => showRegistrationStatus(context, email: _submittedEmail),
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
              icon: const Icon(Icons.track_changes_rounded),
              label: const Text('Check status', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              style: FilledButton.styleFrom(
                backgroundColor: AppStitchTheme.primary,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Back to sign in', style: TextStyle(fontWeight: FontWeight.w800)),
            ),
          ]),
        ),
      );
}

/// Bottom sheet: look up a registration request by email.
Future<void> showRegistrationStatus(BuildContext context, {String? email}) => showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _StatusSheet(initialEmail: email),
    );

class _StatusSheet extends StatefulWidget {
  const _StatusSheet({this.initialEmail});
  final String? initialEmail;

  @override
  State<_StatusSheet> createState() => _StatusSheetState();
}

class _StatusSheetState extends State<_StatusSheet> {
  late final _email = TextEditingController(text: widget.initialEmail ?? '');
  bool _loading = false;
  Map<String, dynamic>? _result;
  String? _error;

  @override
  void initState() {
    super.initState();
    if ((widget.initialEmail ?? '').isNotEmpty) _check();
  }

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _check() async {
    if (_email.text.trim().isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final r = await RegistrationService.status(_email.text);
    if (!mounted) return;
    setState(() {
      _loading = false;
      _result = r.data;
      _error = r.success ? null : r.message;
    });
  }

  @override
  Widget build(BuildContext context) {
    final s = '${_result?['status'] ?? ''}';
    final (IconData icon, Color color, String title, String body) = switch (s) {
      'approved' => (Icons.verified_rounded, const Color(0xFF16A34A), 'Approved', 'You have joined ${_result?['company_name'] ?? 'the company'}. You can sign in now.'),
      'pending' => (Icons.hourglass_top_rounded, const Color(0xFFD97706), 'Awaiting approval', 'An admin has not reviewed your request yet.'),
      'not_found' => (Icons.search_off_rounded, AppStitchTheme.lightOnSurfaceMuted, 'Not found', 'No registration request with this email.'),
      _ => (Icons.info_outline_rounded, AppStitchTheme.lightOnSurfaceMuted, '', ''),
    };
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        child: SafeArea(
          top: false,
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.black12, borderRadius: BorderRadius.circular(9)))),
            const SizedBox(height: 16),
            const Text('Registration status', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
            const SizedBox(height: 14),
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              onSubmitted: (_) => _check(),
              decoration: InputDecoration(
                labelText: 'Registered email',
                prefixIcon: const Icon(Icons.alternate_email_rounded),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _loading ? null : _check,
              style: FilledButton.styleFrom(
                backgroundColor: AppStitchTheme.primary,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _loading
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Check', style: TextStyle(fontWeight: FontWeight.w800)),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Color(0xFFDC2626))),
            ],
            if (title.isNotEmpty) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14)),
                child: Row(children: [
                  Icon(icon, color: color, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(title, style: TextStyle(fontWeight: FontWeight.w800, color: color)),
                      Text(body, style: const TextStyle(fontSize: 13, color: AppStitchTheme.lightOnSurfaceMuted)),
                    ]),
                  ),
                ]),
              ),
            ],
          ]),
        ),
      ),
    );
  }
}
