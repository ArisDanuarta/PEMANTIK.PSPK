import 'package:flutter/material.dart';
import '../../features/auth/pages/login_page.dart';
import '../../features/dashboard/pages/main_layout.dart';
import '../../features/assessment/pages/assessment_levels_page.dart';
import '../../features/assessment/pages/assessment_lobby_page.dart';
import '../../features/assessment/pages/question_page.dart';
import '../../features/assessment/pages/result_page.dart';
import '../../features/onboarding/pages/onboarding_page.dart';
import '../../features/profile/pages/edit_profile_page.dart';

class AppRouter {
  static const String login = '/login';
  static const String home = '/home';
  static const String onboarding = '/onboarding';
  static const String assessmentLevels = '/assessment/levels';
  static const String assessmentLobby = '/assessment/lobby';
  static const String questionPage = '/assessment/question';
  static const String resultPage = '/assessment/result';
  static const String editProfile = '/profile/edit';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case onboarding:
        return MaterialPageRoute(builder: (_) => const OnboardingPage());
      case login:
        return MaterialPageRoute(builder: (_) => const LoginPage());
      case home:
        return MaterialPageRoute(builder: (_) => const MainLayout());
      case editProfile:
        return MaterialPageRoute(builder: (_) => const EditProfilePage());
      case assessmentLevels:
        final categoryId = settings.arguments as String? ?? '';
        return MaterialPageRoute(
          builder: (_) => AssessmentLevelsPage(categoryId: categoryId),
        );
      case assessmentLobby:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        final categoryId = args['categoryId'] as String? ?? '';
        final levelId = args['levelId'] as String? ?? '';
        final levelNumber = args['levelNumber'] as int? ?? 1;
        final accessCode = args['accessCode'] as String?;
        final totalQuestions = args['totalQuestions'] as int? ?? 0;
        final passingThreshold = args['passingThreshold'] as int? ?? 0;
        final timeLimitSec = args['timeLimitSec'] as int? ?? 60;
        final learningObjective = args['learningObjective'] as String?;
        final successMessage = args['successMessage'] as String?;
        final failureMessage = args['failureMessage'] as String?;

        return MaterialPageRoute(
          builder: (_) => AssessmentLobbyPage(
            categoryId: categoryId,
            levelId: levelId,
            levelNumber: levelNumber,
            accessCode: accessCode,
            totalQuestions: totalQuestions,
            passingThreshold: passingThreshold,
            timeLimitSec: timeLimitSec,
            learningObjective: learningObjective,
            successMessage: successMessage,
            failureMessage: failureMessage,
          ),
        );
      case questionPage:
        final args = settings.arguments;
        String sessionId = '';
        String title = 'Pemantik';
        if (args is Map<String, dynamic>) {
          sessionId = args['sessionId'] as String? ?? '';
          title = args['title'] as String? ?? 'Pemantik';
        } else if (args is String) {
          sessionId = args;
        }
        return MaterialPageRoute(
          builder: (_) => QuestionPage(sessionId: sessionId, title: title),
        );
      case resultPage:
        final args = settings.arguments as Map<String, dynamic>? ?? {};
        final isPassed = args['isPassed'] as bool? ?? false;
        final customMessage = args['customMessage'] as String?;
        final nextLevelArgs = args['nextLevelArgs'] as Map<String, dynamic>?;
        return MaterialPageRoute(
          builder: (_) => ResultPage(
            isPassed: isPassed,
            customMessage: customMessage,
            nextLevelArgs: nextLevelArgs,
          ),
        );
      default:
        return MaterialPageRoute(builder: (_) => const LoginPage());
    }
  }
}
