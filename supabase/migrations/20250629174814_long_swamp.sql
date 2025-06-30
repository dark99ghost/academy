/*
  # إصلاح خطأ الـ View وتحسين قاعدة البيانات

  1. المشاكل المحلولة
    - حل خطأ "user_profiles_with_courses" is not a table
    - إنشاء الـ View بشكل صحيح
    - إصلاح السياسات الأمنية

  2. التحسينات
    - تحسين استعلام المستخدمين
    - إضافة فهارس لتحسين الأداء
*/

-- حذف الـ View القديم إذا كان موجوداً
DROP VIEW IF EXISTS user_profiles_with_courses CASCADE;

-- إنشاء الـ View بشكل صحيح
CREATE VIEW user_profiles_with_courses AS
SELECT 
  up.id,
  up.user_id,
  up.full_name,
  up.avatar_url,
  up.education_level,
  up.role,
  up.is_admin,
  up.created_at,
  up.updated_at,
  COALESCE(course_stats.enrolled_courses_count, 0) as enrolled_courses_count,
  COALESCE(course_stats.enrolled_courses, '[]'::json) as enrolled_courses
FROM user_profiles up
LEFT JOIN (
  SELECT 
    uca.user_id,
    COUNT(DISTINCT uca.course_id) as enrolled_courses_count,
    json_agg(
      json_build_object(
        'course_id', c.id,
        'course_title', c.title,
        'expires_at', uca.expires_at,
        'is_active', uca.is_active
      )
    ) FILTER (WHERE c.id IS NOT NULL) as enrolled_courses
  FROM user_course_access uca
  LEFT JOIN courses c ON uca.course_id = c.id
  GROUP BY uca.user_id
) course_stats ON up.user_id = course_stats.user_id;

-- منح الصلاحيات للـ View
GRANT SELECT ON user_profiles_with_courses TO authenticated;

-- إنشاء سياسة RLS للـ View
CREATE POLICY "Admins can view user profiles with courses"
  ON user_profiles_with_courses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- تحسين الفهارس
CREATE INDEX IF NOT EXISTS idx_user_course_access_user_id ON user_course_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_access_course_id ON user_course_access(course_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);