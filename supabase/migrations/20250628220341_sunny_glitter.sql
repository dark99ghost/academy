/*
  # إصلاح مشكلة أكواد الاشتراك وإنشاء جدول للأكواد المولدة

  1. الجداول الجديدة
    - إصلاح جدول subscription_codes
    - إضافة بيانات تجريبية للاختبار

  2. الأمان
    - تحديث السياسات الأمنية
    - إصلاح مشاكل الوصول

  3. البيانات التجريبية
    - إضافة أكواد اشتراك تجريبية
    - ربط الأكواد بالكورسات الموجودة
*/

-- التأكد من وجود جدول subscription_codes
CREATE TABLE IF NOT EXISTS subscription_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL UNIQUE,
  validity_days integer NOT NULL DEFAULT 30,
  expires_at timestamptz NOT NULL,
  usage_limit integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- التأكد من وجود جدول user_course_access
CREATE TABLE IF NOT EXISTS user_course_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  subscription_code_id uuid REFERENCES subscription_codes(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- تمكين RLS
ALTER TABLE subscription_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_access ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة وإنشاء جديدة
DROP POLICY IF EXISTS "Users can read active codes for validation" ON subscription_codes;
DROP POLICY IF EXISTS "Admins can manage subscription codes" ON subscription_codes;
DROP POLICY IF EXISTS "Users can read own course access" ON user_course_access;
DROP POLICY IF EXISTS "Users can create own course access" ON user_course_access;
DROP POLICY IF EXISTS "Admins can read all course access" ON user_course_access;
DROP POLICY IF EXISTS "Admins can manage course access" ON user_course_access;

-- سياسات جديدة لـ subscription_codes
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
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- سياسات جديدة لـ user_course_access
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

CREATE POLICY "Admins can read all course access"
  ON user_course_access
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage course access"
  ON user_course_access
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_subscription_codes_code ON subscription_codes(code);
CREATE INDEX IF NOT EXISTS idx_subscription_codes_course_active ON subscription_codes(course_id, is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_codes_expires ON subscription_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_course_access_user_course ON user_course_access(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_access_expires ON user_course_access(expires_at, is_active);

-- حذف الأكواد القديمة وإنشاء أكواد جديدة تعمل
DELETE FROM subscription_codes;

-- إدراج أكواد اشتراك تجريبية تعمل
DO $$
DECLARE
  programming_course_id uuid;
  web_course_id uuid;
  data_course_id uuid;
  design_course_id uuid;
BEGIN
  -- الحصول على معرفات الكورسات
  SELECT id INTO programming_course_id FROM courses WHERE title = 'أساسيات البرمجة' LIMIT 1;
  SELECT id INTO web_course_id FROM courses WHERE title = 'تطوير المواقع' LIMIT 1;
  SELECT id INTO data_course_id FROM courses WHERE title = 'علوم البيانات' LIMIT 1;
  SELECT id INTO design_course_id FROM courses WHERE title = 'التصميم الجرافيكي' LIMIT 1;
  
  -- إدراج أكواد للكورسات
  IF programming_course_id IS NOT NULL THEN
    INSERT INTO subscription_codes (course_id, code, validity_days, expires_at, usage_limit) VALUES
    (programming_course_id, 'PROG2024', 30, now() + interval '90 days', 100),
    (programming_course_id, 'BASIC123', 60, now() + interval '180 days', 50),
    (programming_course_id, 'STUDENT50', 90, now() + interval '365 days', 25);
  END IF;
  
  IF web_course_id IS NOT NULL THEN
    INSERT INTO subscription_codes (course_id, code, validity_days, expires_at, usage_limit) VALUES
    (web_course_id, 'WEB2024', 30, now() + interval '90 days', 100),
    (web_course_id, 'HTML123', 60, now() + interval '180 days', 50);
  END IF;
  
  IF data_course_id IS NOT NULL THEN
    INSERT INTO subscription_codes (course_id, code, validity_days, expires_at, usage_limit) VALUES
    (data_course_id, 'DATA2024', 30, now() + interval '90 days', 100),
    (data_course_id, 'AI123', 60, now() + interval '180 days', 50);
  END IF;
  
  IF design_course_id IS NOT NULL THEN
    INSERT INTO subscription_codes (course_id, code, validity_days, expires_at, usage_limit) VALUES
    (design_course_id, 'DESIGN2024', 30, now() + interval '90 days', 100),
    (design_course_id, 'GRAPHIC123', 60, now() + interval '180 days', 50);
  END IF;
END $$;

-- إنشاء دالة لتنظيف الاشتراكات المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_access()
RETURNS void AS $$
BEGIN
  UPDATE user_course_access 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة للتحقق من صحة كود الاشتراك
CREATE OR REPLACE FUNCTION validate_subscription_code(
  p_code text,
  p_course_id uuid
) RETURNS TABLE (
  code_id uuid,
  is_valid boolean,
  error_message text
) AS $$
DECLARE
  code_record subscription_codes%ROWTYPE;
BEGIN
  -- البحث عن الكود
  SELECT * INTO code_record
  FROM subscription_codes
  WHERE code = p_code AND course_id = p_course_id AND is_active = true;
  
  -- التحقق من وجود الكود
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false, 'كود الاشتراك غير صحيح أو غير مخصص لهذا الكورس'::text;
    RETURN;
  END IF;
  
  -- التحقق من انتهاء الصلاحية
  IF code_record.expires_at < now() THEN
    RETURN QUERY SELECT code_record.id, false, 'كود الاشتراك منتهي الصلاحية'::text;
    RETURN;
  END IF;
  
  -- التحقق من حد الاستخدام
  IF code_record.used_count >= code_record.usage_limit THEN
    RETURN QUERY SELECT code_record.id, false, 'تم استنفاد عدد مرات استخدام هذا الكود'::text;
    RETURN;
  END IF;
  
  -- الكود صالح
  RETURN QUERY SELECT code_record.id, true, 'الكود صالح'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;