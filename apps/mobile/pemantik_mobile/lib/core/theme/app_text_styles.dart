import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTextStyles {
  static final heading1 = GoogleFonts.lora(
    fontSize: 26,
    fontWeight: FontWeight.bold,
    color: AppColors.birNavyGelap,
    height: 1.3,
  );

  static final heading2 = GoogleFonts.lora(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: AppColors.birNavyGelap,
    height: 1.4,
  );

  static final questionText = GoogleFonts.lora(
    fontSize: 18,
    fontWeight: FontWeight.normal,
    color: AppColors.birNavyGelap,
    height: 1.7,
  );

  static final bodyLarge = GoogleFonts.rubik(
    fontSize: 16,
    fontWeight: FontWeight.normal,
    color: AppColors.birNavy,
    height: 1.5,
  );

  static final bodyMedium = GoogleFonts.rubik(
    fontSize: 14,
    fontWeight: FontWeight.normal,
    color: AppColors.birNavy,
    height: 1.5,
  );

  static final bodySmall = GoogleFonts.rubik(
    fontSize: 12,
    fontWeight: FontWeight.normal,
    color: AppColors.birNavy,
    height: 1.5,
  );

  static final label = GoogleFonts.rubik(
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: AppColors.textMuted,
  );

  static final buttonText = GoogleFonts.rubik(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: Colors.white,
  );
}
