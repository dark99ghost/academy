/*
  # إصلاح مشاكل التسجيل وتضارب الجداول

  1. المشاكل المحلولة
    - إزالة التضارب بين جدول profiles و user_profiles
    - إصلاح المحفزات المتضاربة
    - ضمان عمل التسجيل بشكل صحيح

  2. التغييرات
    - حذف جدول profiles المتضارب
    - حذف المحفز المتضارب
    - إنشاء محفز جديد لجدول user_profiles
    - إصلاح السياسات
*/

-- إزالة المحفز القديم المتضارب
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- إزالة الدالة القديمة المتضاربة
DROP FUNCTION IF EXISTS public.handle_new_user();

-- حذف جدول profiles المتضارب إذا كان موجوداً
DROP TABLE IF EXISTS profiles CASCADE;

-- إنشاء دالة جديدة لإنشاء ملف المستخدم تلقائياً
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, education_level, is_admin)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'education_level', 'ثانوي'),
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء محفز جديد لإنشاء ملف المستخدم تلقائياً
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- التأكد من وجود السياسات الصحيحة لجدول user_profiles
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;

CREATE POLICY "Allow profile creation during signup"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- إضافة سياسة للسماح بالإدراج للمستخدمين الجدد
CREATE POLICY "Allow system to create profiles"
  ON user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- التأكد من أن الجدول يدعم UPSERT
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_user_id_key;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);