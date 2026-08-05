import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../auth/providers/auth_provider.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../../core/supabase/supabase_client.dart';

class EditProfilePage extends ConsumerStatefulWidget {
  const EditProfilePage({super.key});

  @override
  ConsumerState<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends ConsumerState<EditProfilePage> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _nisnController;
  late TextEditingController _schoolController;
  
  String _gender = 'L';
  DateTime? _dob;
  
  String? _fatherJobId;
  String? _motherJobId;
  String? _fatherEdId;
  String? _motherEdId;
  
  late TextEditingController _provController;
  late TextEditingController _cityController;
  late TextEditingController _districtController;
  late TextEditingController _villageController;

  bool _isLoading = false;
  bool _isLoadingData = true;

  List<Map<String, dynamic>> _jobOptions = [];
  List<Map<String, dynamic>> _edOptions = [];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _nisnController = TextEditingController();
    _schoolController = TextEditingController();
    _provController = TextEditingController();
    _cityController = TextEditingController();
    _districtController = TextEditingController();
    _villageController = TextEditingController();
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  Future<void> _loadData() async {
    try {
      final res = await SupabaseConfig.client.from('ses_variables').select('id, name, type');
      if (mounted) {
        setState(() {
          _jobOptions = List<Map<String, dynamic>>.from(res.where((e) => e['type'].toString().contains('occupation')));
          _edOptions = List<Map<String, dynamic>>.from(res.where((e) => e['type'].toString().contains('education')));
        });
      }
    } catch (e) {
      debugPrint("Gagal load ses_variables: $e");
    }

    try {
      final student = await ref.read(currentStudentProvider.future);
      if (student != null && mounted) {
        setState(() {
          _nameController.text = student['full_name'] ?? '';
          _nisnController.text = student['nisn'] ?? '';
          _schoolController.text = student['schools']?['name'] ?? '';
          
          if (student['gender'] == 'P') {
            _gender = 'P';
          } else {
            _gender = 'L';
          }
          
          if (student['birth_date'] != null) {
            try {
              _dob = DateTime.parse(student['birth_date']);
            } catch (_) {}
          }
          
          _provController.text = student['province'] ?? '';
          _cityController.text = student['city'] ?? '';
          _districtController.text = student['district'] ?? '';
          _villageController.text = student['village'] ?? '';
          
          _fatherJobId = student['father_occupation_id'];
          _fatherEdId = student['father_education_id'];
          _motherJobId = student['mother_occupation_id'];
          _motherEdId = student['mother_education_id'];
        });
      }
    } catch (e) {
      debugPrint("Gagal load student data: $e");
    }

    if (mounted) {
      setState(() => _isLoadingData = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _nisnController.dispose();
    _schoolController.dispose();
    _provController.dispose();
    _cityController.dispose();
    _districtController.dispose();
    _villageController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    debugPrint("=== [EditProfile] _saveProfile ditekan ===");
    if (!_formKey.currentState!.validate()) {
      debugPrint("=== [EditProfile] Validasi form gagal ===");
      return;
    }
    
    setState(() => _isLoading = true);
    
    final updateData = {
      'full_name': _nameController.text,
      'nisn': _nisnController.text,
      'gender': _gender,
      if (_dob != null) 'birth_date': '${_dob!.year}-${_dob!.month.toString().padLeft(2, '0')}-${_dob!.day.toString().padLeft(2, '0')}',
      'province': _provController.text,
      'city': _cityController.text,
      'district': _districtController.text,
      'village': _villageController.text,
      'father_occupation_id': _fatherJobId,
      'mother_occupation_id': _motherJobId,
      'father_education_id': _fatherEdId,
      'mother_education_id': _motherEdId,
    };
    
    debugPrint("=== [EditProfile] Data yang akan dikirim: $updateData ===");
    
    try {
      final success = await ref.read(authProvider.notifier).updateStudentProfile(updateData);
      debugPrint("=== [EditProfile] updateStudentProfile return success: $success ===");
      
      setState(() => _isLoading = false);
      
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profil berhasil diperbarui'), backgroundColor: Colors.green),
        );
        Navigator.pop(context);
      } else if (mounted) {
        final error = ref.read(authProvider).error;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error ?? 'Gagal memperbarui profil'), backgroundColor: Colors.red),
        );
      }
    } catch (e) {
      debugPrint("=== [EditProfile] Exception saat save: $e ===");
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.onSurfaceVariant),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Edit Profil Siswa',
          style: AppTextStyles.heading3.copyWith(color: AppColors.primary),
        ),
        actions: [
          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 16.0),
                child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
              ),
            )
          else
            TextButton(
              onPressed: _isLoadingData ? null : _saveProfile,
              child: Text(
                'Simpan',
                style: AppTextStyles.labelLarge.copyWith(
                  color: _isLoadingData ? Colors.grey : AppColors.primary, 
                  fontWeight: FontWeight.bold
                ),
              ),
            ),
        ],
      ),
      body: _isLoadingData 
        ? const Center(child: CircularProgressIndicator())
        : Stack(
            children: [
              // Background Gradient
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppColors.primaryContainer.withValues(alpha: 0.04),
                      AppColors.secondaryContainer.withValues(alpha: 0.08),
                    ],
                  ),
                ),
              ),
              SafeArea(
                child: Form(
                  key: _formKey,
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      _buildSection(
                        icon: Icons.person,
                        title: 'Data Pribadi',
                        children: [
                          _buildTextField(label: 'Nama Lengkap', controller: _nameController),
                          _buildTextField(label: 'NISN', controller: _nisnController),
                          _buildTextField(label: 'Sekolah', controller: _schoolController, enabled: false),
                          Row(
                            children: [
                              Expanded(
                                child: _buildDropdown(
                                  label: 'Jenis Kelamin',
                                  value: _gender,
                                  items: const [
                                    DropdownMenuItem(value: 'L', child: Text('Laki-laki')),
                                    DropdownMenuItem(value: 'P', child: Text('Perempuan')),
                                  ],
                                  onChanged: (val) {
                                    if (val != null) setState(() => _gender = val as String);
                                  },
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: _buildDatePicker(
                                  label: 'Tanggal Lahir',
                                  value: _dob,
                                  onChanged: (val) {
                                    if (val != null) setState(() => _dob = val);
                                  },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      _buildSection(
                        icon: Icons.family_restroom,
                        title: 'Data Orang Tua',
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: _buildDropdown(
                                  label: 'Pekerjaan Ayah',
                                  value: _fatherJobId,
                                  items: _buildDynamicDropdownItems(_jobOptions),
                                  onChanged: (val) => setState(() => _fatherJobId = val as String?),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: _buildDropdown(
                                  label: 'Pendidikan Ayah',
                                  value: _fatherEdId,
                                  items: _buildDynamicDropdownItems(_edOptions),
                                  onChanged: (val) => setState(() => _fatherEdId = val as String?),
                                ),
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              Expanded(
                                child: _buildDropdown(
                                  label: 'Pekerjaan Ibu',
                                  value: _motherJobId,
                                  items: _buildDynamicDropdownItems(_jobOptions),
                                  onChanged: (val) => setState(() => _motherJobId = val as String?),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: _buildDropdown(
                                  label: 'Pendidikan Ibu',
                                  value: _motherEdId,
                                  items: _buildDynamicDropdownItems(_edOptions),
                                  onChanged: (val) => setState(() => _motherEdId = val as String?),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      _buildSection(
                        icon: Icons.location_on,
                        title: 'Alamat Lengkap',
                        children: [
                          Row(
                            children: [
                              Expanded(child: _buildTextField(label: 'Provinsi', controller: _provController)),
                              const SizedBox(width: 16),
                              Expanded(child: _buildTextField(label: 'Kabupaten/Kota', controller: _cityController)),
                            ],
                          ),
                          Row(
                            children: [
                              Expanded(child: _buildTextField(label: 'Kecamatan', controller: _districtController)),
                              const SizedBox(width: 16),
                              Expanded(child: _buildTextField(label: 'Kelurahan/Desa', controller: _villageController)),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),
                      ElevatedButton.icon(
                        onPressed: (_isLoading || _isLoadingData) ? null : _saveProfile,
                        icon: const Icon(Icons.save, color: Colors.white),
                        label: const Text('Simpan Perubahan Data', style: TextStyle(color: Colors.white)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryContainer,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
    );
  }

  List<DropdownMenuItem<String>> _buildDynamicDropdownItems(List<Map<String, dynamic>> options) {
    if (options.isEmpty) {
      return const [
        DropdownMenuItem(value: null, child: Text('Data tidak ada', style: TextStyle(color: Colors.grey))),
      ];
    }
    
    final items = <DropdownMenuItem<String>>[
      const DropdownMenuItem(value: null, child: Text('Pilih', style: TextStyle(color: Colors.grey))),
    ];
    
    for (var opt in options) {
      items.add(
        DropdownMenuItem(
          value: opt['id'].toString(), 
          child: Text(
            opt['name'].toString(), 
            style: const TextStyle(fontSize: 14), 
            overflow: TextOverflow.ellipsis
          )
        )
      );
    }
    return items;
  }

  Widget _buildSection({required IconData icon, required String title, required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppColors.primaryContainer, size: 24),
              const SizedBox(width: 8),
              Expanded(child: Text(title, style: AppTextStyles.heading3.copyWith(color: AppColors.primary))),
            ],
          ),
          const SizedBox(height: 16),
          ...children.expand((w) => [w, const SizedBox(height: 16)]).take(children.length * 2 - 1),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required String label, 
    required TextEditingController controller,
    bool enabled = true,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.labelSmall.copyWith(color: AppColors.onSurfaceVariant), maxLines: 1, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          enabled: enabled,
          style: AppTextStyles.bodyMedium,
          decoration: InputDecoration(
            filled: true,
            fillColor: enabled ? AppColors.surface : AppColors.surfaceVariant.withValues(alpha: 0.5),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppColors.primaryContainer),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdown({
    required String label,
    required dynamic value,
    required List<DropdownMenuItem<dynamic>> items,
    required void Function(dynamic) onChanged,
  }) {
    final safeValue = items.any((i) => i.value == value) ? value : null;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.labelSmall.copyWith(color: AppColors.onSurfaceVariant), maxLines: 1, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 8),
        InputDecorator(
          decoration: InputDecoration(
            filled: true,
            fillColor: AppColors.surface,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppColors.border),
            ),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<dynamic>(
              isExpanded: true,
              value: safeValue,
              items: items,
              onChanged: onChanged,
              icon: const Icon(Icons.arrow_drop_down),
              style: AppTextStyles.bodyMedium.copyWith(color: AppColors.onSurface),
              isDense: true,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDatePicker({
    required String label,
    required DateTime? value,
    required void Function(DateTime?) onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.labelSmall.copyWith(color: AppColors.onSurfaceVariant), maxLines: 1, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 8),
        InkWell(
          onTap: () async {
            final date = await showDatePicker(
              context: context,
              initialDate: value ?? DateTime(2005, 1, 1),
              firstDate: DateTime(1990),
              lastDate: DateTime.now(),
            );
            if (date != null) onChanged(date);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    value != null ? '${value.day}/${value.month}/${value.year}' : 'Pilih Tanggal',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: value != null ? AppColors.onSurface : Colors.grey,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const Icon(Icons.calendar_today, size: 16, color: AppColors.onSurfaceVariant),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
