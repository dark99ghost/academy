/*
  # استبدال عمود is_admin بعمود role

  1. التغييرات المطلوبة
    - إضافة عمود role إذا لم يكن موجوداً
    - تحديث البيانات الموجودة لتحويل is_admin إلى role
    - حذف عمود is_admin
    - تحديث جميع الدوال والـ Views

  2. نظام الأدوار الجديد
    - student: طالب عادي
    - instructor: مدرب
    - admin: مدير

  3. إصلاح جميع المراجع
    - تحديث الدوال
    - تحديث السياسات
    - تحديث الـ Views
*/

-- الخطوة 1: إضافة عمود role إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN role text DEFAULT 'student' 
    CHECK (role IN ('student', 'instructor', 'admin'));
    
    RAISE NOTICE 'تم إضافة عمود role';
  ELSE
    RAISE NOTICE 'عمود role موجود بالفعل';
  END IF;
END $$;

-- الخطوة 2: تحديث البيانات الموجودة
UPDATE user_profiles 
SET role = CASE 
  WHEN is_admin = true THEN 'admin'
  ELSE 'student'
END
WHERE role IS NULL OR role = 'student';

-- الخطوة 3: حذف عمود is_admin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles DROP COLUMN is_admin;
    RAISE NOTICE 'تم حذف عمود is_admin';
  ELSE
    RAISE NOTICE 'عمود is_admin غير موجود';
  END IF;
END $$;

-- الخطوة 4: إنشاء فهرس على عمود role
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- الخطوة 5: تحديث دالة إنشاء المستخدم الجديد
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, education_level, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'education_level', 'ثانوي'),
    'student'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- الخطوة 6: تحديث دالة تحديث دور المستخدم
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
      updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- الخطوة 7: حذف وإعادة إنشاء الـ View
DROP VIEW IF EXISTS user_profiles_with_courses CASCADE;

CREATE VIEW user_profiles_with_courses AS
SELECT 
  up.id,
  up.user_id,
  up.full_name,
  up.avatar_url,
  up.education_level,
  up.role,
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

-- الخطوة 8: تحديث جميع السياسات الأمنية
-- سياسات user_profiles
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins and instructors can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;
DROP POLICY IF EXISTS "Allow system to create profiles" ON user_profiles;

CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and instructors can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up2
      WHERE up2.user_id = auth.uid() AND up2.role IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Allow profile creation during signup"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow system to create profiles"
  ON user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- سياسات courses
DROP POLICY IF EXISTS "Anyone can read active courses" ON courses;
DROP POLICY IF EXISTS "Admins and instructors can manage courses" ON courses;

CREATE POLICY "Anyone can read active courses"
  ON courses
  FOR SELECT
  TO authenticated
  USING (is_active = true);

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

-- سياسات lectures
DROP POLICY IF EXISTS "Users can read lectures for subscribed courses" ON lectures;
DROP POLICY IF EXISTS "Admins and instructors can manage lectures" ON lectures;

CREATE POLICY "Users can read lectures for subscribed courses"
  ON lectures
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND (
      EXISTS (
        SELECT 1 FROM user_course_access
        WHERE user_id = auth.uid() 
        AND course_id = lectures.course_id 
        AND is_active = true 
        AND expires_at > now()
      ) OR
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
      )
    )
  );

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

-- سياسات lecture_materials
DROP POLICY IF EXISTS "Users can read materials for subscribed courses" ON lecture_materials;
DROP POLICY IF EXISTS "Admins and instructors can manage lecture materials" ON lecture_materials;

CREATE POLICY "Users can read materials for subscribed courses"
  ON lecture_materials
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM lectures l
      JOIN user_course_access uca ON l.course_id = uca.course_id
      WHERE l.id = lecture_materials.lecture_id
      AND uca.user_id = auth.uid()
      AND uca.is_active = true
      AND uca.expires_at > now()
    ) OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

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

-- سياسات subscription_codes
DROP POLICY IF EXISTS "Anyone can read active codes for validation" ON subscription_codes;
DROP POLICY IF EXISTS "Admins can manage subscription codes" ON subscription_codes;

CREATE POLICY "Anyone can read active codes for validation"
  ON subscription_codes
  FOR SELECT
  TO authenticated
  USING (is_active = true AND expires_at > now());

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

-- سياسات user_course_access
DROP POLICY IF EXISTS "Users can read own course access" ON user_course_access;
DROP POLICY IF EXISTS "Users can create own course access" ON user_course_access;
DROP POLICY IF EXISTS "Users can update own course access" ON user_course_access;
DROP POLICY IF EXISTS "Admins and instructors can read all course access" ON user_course_access;
DROP POLICY IF EXISTS "Admins can manage course access" ON user_course_access;

CREATE POLICY "Users can read own course access"
  ON user_course_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own course access"
  ON user_course_access
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own course access"
  ON user_course_access
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

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

-- الخطوة 9: إنشاء دوال مساعدة للتحقق من الأدوار
CREATE OR REPLACE FUNCTION is_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = user_id_param AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_admin_or_instructor_role(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = user_id_param AND role IN ('admin', 'instructor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- الخطوة 10: تحديث دالة حذف كود الاشتراك
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

-- إنشاء مستخدم أدمن تجريبي إذا لم يكن موجود
DO $$
BEGIN
  -- التحقق من عدم وجود مدير
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE role = 'admin') THEN
    -- تحديث أول مستخدم ليكون أدمن
    UPDATE user_profiles 
    SET role = 'admin'
    WHERE user_id = (
      SELECT user_id FROM user_profiles 
      ORDER BY created_at ASC 
      LIMIT 1
    );
    
    RAISE NOTICE 'تم تعيين أول مستخدم كأدمن';
  END IF;
END $$;