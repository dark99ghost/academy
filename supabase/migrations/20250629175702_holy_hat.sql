/*
  # إضافة عمود الدور إلى جدول user_profiles

  1. إضافة العمود المفقود
    - إضافة عمود role إلى جدول user_profiles
    - تحديث البيانات الموجودة
    - إنشاء الفهارس المطلوبة

  2. إصلاح الـ View
    - إعادة إنشاء user_profiles_with_courses بشكل صحيح
    - التأكد من وجود جميع الأعمدة المطلوبة

  3. تحديث السياسات
    - تحديث جميع السياسات لتعمل مع نظام الأدوار الجديد
*/

-- إضافة عمود role إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role text DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin'));
    
    -- تحديث المستخدمين الحاليين
    UPDATE user_profiles SET role = 'admin' WHERE is_admin = true;
    UPDATE user_profiles SET role = 'student' WHERE is_admin = false OR is_admin IS NULL;
    
    -- إنشاء فهرس على عمود الدور
    CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
  END IF;
END $$;

-- حذف الـ View القديم وإعادة إنشاؤه
DROP VIEW IF EXISTS user_profiles_with_courses CASCADE;

-- إنشاء الـ View الجديد مع التأكد من وجود جميع الأعمدة
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

-- تمكين RLS على الـ View
ALTER VIEW user_profiles_with_courses SET (security_barrier = true);

-- منح الصلاحيات
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

-- تحديث السياسات الأمنية لتدعم نظام الأدوار
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins and instructors can read all profiles" ON user_profiles;

CREATE POLICY "Admins and instructors can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

-- تحديث سياسات الكورسات
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
DROP POLICY IF EXISTS "Admins and instructors can manage courses" ON courses;

CREATE POLICY "Admins and instructors can manage courses"
  ON courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

-- تحديث سياسات المحاضرات
DROP POLICY IF EXISTS "Admins can manage lectures" ON lectures;
DROP POLICY IF EXISTS "Admins and instructors can manage lectures" ON lectures;

CREATE POLICY "Admins and instructors can manage lectures"
  ON lectures
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

-- تحديث سياسات مواد المحاضرات
DROP POLICY IF EXISTS "Admins can manage lecture materials" ON lecture_materials;
DROP POLICY IF EXISTS "Admins and instructors can manage lecture materials" ON lecture_materials;

CREATE POLICY "Admins and instructors can manage lecture materials"
  ON lecture_materials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

-- تحديث سياسات أكواد الاشتراك
DROP POLICY IF EXISTS "Admins can manage subscription codes" ON subscription_codes;

CREATE POLICY "Admins can manage subscription codes"
  ON subscription_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- تحديث سياسات وصول المستخدمين للكورسات
DROP POLICY IF EXISTS "Admins can read all course access" ON user_course_access;
DROP POLICY IF EXISTS "Admins can manage course access" ON user_course_access;
DROP POLICY IF EXISTS "Admins and instructors can read all course access" ON user_course_access;

CREATE POLICY "Admins and instructors can read all course access"
  ON user_course_access
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Admins can manage course access"
  ON user_course_access
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- دالة لتحديث دور المستخدم (للأدمن فقط)
CREATE OR REPLACE FUNCTION update_user_role(
  target_user_id uuid,
  new_role text
) RETURNS boolean AS $$
DECLARE
  current_user_role text;
BEGIN
  -- التحقق من أن المستخدم الحالي أدمن
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE user_id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'غير مسموح: يجب أن تكون أدمن لتغيير الأدوار';
  END IF;
  
  -- التحقق من صحة الدور الجديد
  IF new_role NOT IN ('student', 'instructor', 'admin') THEN
    RAISE EXCEPTION 'دور غير صحيح: يجب أن يكون student أو instructor أو admin';
  END IF;
  
  -- تحديث الدور
  UPDATE user_profiles
  SET role = new_role,
      is_admin = (new_role = 'admin'),
      updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لحذف كود اشتراك
CREATE OR REPLACE FUNCTION delete_subscription_code(code_id uuid)
RETURNS boolean AS $$
DECLARE
  current_user_role text;
BEGIN
  -- التحقق من أن المستخدم الحالي أدمن
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE user_id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'غير مسموح: يجب أن تكون أدمن لحذف الأكواد';
  END IF;
  
  -- حذف الكود
  DELETE FROM subscription_codes WHERE id = code_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- التأكد من وجود فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_user_course_access_user_id ON user_course_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_access_course_id ON user_course_access(course_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);