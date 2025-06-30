/*
  # إضافة عمود role بسيط

  1. التغييرات
    - إضافة عمود role إلى جدول user_profiles
    - تحديث البيانات الموجودة
    - عدم تعديل أي سياسات موجودة

  2. ملاحظة
    - يتم الاحتفاظ بعمود is_admin كما هو
    - يتم الاحتفاظ بجميع السياسات كما هي
*/

-- إضافة عمود role إذا لم يكن موجوداً
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
    
    -- تحديث البيانات الموجودة
    UPDATE user_profiles 
    SET role = CASE 
      WHEN is_admin = true THEN 'admin'
      ELSE 'student'
    END;
    
    -- إنشاء فهرس على عمود role
    CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
    
    RAISE NOTICE 'تم إضافة عمود role بنجاح';
  ELSE
    RAISE NOTICE 'عمود role موجود بالفعل';
  END IF;
END $$;

-- تحديث دالة إنشاء المستخدم الجديد لتشمل الدور
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, education_level, is_admin, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'education_level', 'ثانوي'),
    false,
    'student'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتحديث دور المستخدم (تحديث كل من role و is_admin)
CREATE OR REPLACE FUNCTION update_user_role(
  target_user_id uuid,
  new_role text
) RETURNS boolean AS $$
DECLARE
  current_user_is_admin boolean;
BEGIN
  -- التحقق من أن المستخدم الحالي أدمن
  SELECT is_admin INTO current_user_is_admin
  FROM user_profiles
  WHERE user_id = auth.uid();
  
  IF NOT current_user_is_admin THEN
    RAISE EXCEPTION 'غير مسموح: يجب أن تكون أدمن لتغيير الأدوار';
  END IF;
  
  -- التحقق من صحة الدور الجديد
  IF new_role NOT IN ('student', 'instructor', 'admin') THEN
    RAISE EXCEPTION 'دور غير صحيح: يجب أن يكون student أو instructor أو admin';
  END IF;
  
  -- تحديث الدور و is_admin
  UPDATE user_profiles
  SET role = new_role,
      is_admin = (new_role = 'admin'),
      updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دوال مساعدة للتحقق من الأدوار
CREATE OR REPLACE FUNCTION is_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = user_id_param AND (is_admin = true OR role = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_admin_or_instructor_role(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = user_id_param AND (is_admin = true OR role IN ('admin', 'instructor'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على اسم الدور باللغة العربية
CREATE OR REPLACE FUNCTION get_role_display_name(role_name text)
RETURNS text AS $$
BEGIN
  RETURN CASE role_name
    WHEN 'student' THEN 'طالب'
    WHEN 'instructor' THEN 'مدرب'
    WHEN 'admin' THEN 'أدمن'
    ELSE 'طالب'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;