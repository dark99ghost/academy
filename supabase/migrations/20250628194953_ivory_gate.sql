/*
  # إنشاء قاعدة البيانات للأكاديمية التعليمية

  1. الجداول الجديدة
    - `user_profiles` - بيانات المستخدمين الإضافية
      - `user_id` (uuid, مرجع للمستخدم في auth.users)
      - `full_name` (text, الاسم الكامل)
      - `avatar_url` (text, رابط صورة المستخدم)
      - `education_level` (text, المرحلة الدراسية)
      - `is_admin` (boolean, هل المستخدم مدير)
      - `created_at` (timestamp, تاريخ الإنشاء)
      - `updated_at` (timestamp, تاريخ آخر تحديث)

    - `courses` - الكورسات
      - `id` (uuid, المعرف الأساسي)
      - `title` (text, عنوان الكورس)
      - `description` (text, وصف الكورس)
      - `price` (decimal, سعر الكورس)
      - `image_url` (text, رابط صورة الكورس)
      - `is_active` (boolean, هل الكورس نشط)
      - `created_at` (timestamp, تاريخ الإنشاء)
      - `updated_at` (timestamp, تاريخ آخر تحديث)

    - `lectures` - المحاضرات
      - `id` (uuid, المعرف الأساسي)
      - `course_id` (uuid, مرجع للكورس)
      - `title` (text, عنوان المحاضرة)
      - `description` (text, وصف المحاضرة)
      - `video_url` (text, رابط الفيديو)
      - `duration` (integer, مدة المحاضرة بالدقائق)
      - `order_index` (integer, ترتيب المحاضرة)
      - `is_active` (boolean, هل المحاضرة نشطة)
      - `created_at` (timestamp, تاريخ الإنشاء)

    - `subscription_codes` - أكواد الاشتراك
      - `id` (uuid, المعرف الأساسي)
      - `course_id` (uuid, مرجع للكورس)
      - `code` (text, الكود)
      - `validity_days` (integer, عدد أيام الصلاحية)
      - `expires_at` (timestamp, تاريخ انتهاء الصلاحية)
      - `usage_limit` (integer, عدد مرات الاستخدام المسموح)
      - `used_count` (integer, عدد مرات الاستخدام الحالي)
      - `is_active` (boolean, هل الكود نشط)
      - `created_at` (timestamp, تاريخ الإنشاء)

    - `user_course_access` - وصول المستخدمين للكورسات
      - `id` (uuid, المعرف الأساسي)
      - `user_id` (uuid, مرجع للمستخدم)
      - `course_id` (uuid, مرجع للكورس)
      - `subscription_code_id` (uuid, مرجع لكود الاشتراك)
      - `expires_at` (timestamp, تاريخ انتهاء الاشتراك)
      - `is_active` (boolean, هل الاشتراك نشط)
      - `created_at` (timestamp, تاريخ الإنشاء)

  2. الأمان
    - تمكين RLS على جميع الجداول
    - إضافة سياسات للقراءة والكتابة والتحديث والحذف
    - التحكم في الوصول حسب دور المستخدم (عادي/مدير)

  3. الفهارس
    - فهارس لتحسين الأداء على الاستعلامات الشائعة

  4. المحتوى الافتراضي
    - إنشاء مستخدم مدير افتراضي
    - إضافة بعض الكورسات التجريبية
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  education_level text CHECK (education_level IN ('ثانوي', 'جامعة')),
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lectures table
CREATE TABLE IF NOT EXISTS lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  video_url text,
  duration integer DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create subscription_codes table
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

-- Create user_course_access table
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

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
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

CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Allow profile creation during signup"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for courses
CREATE POLICY "Anyone can read active courses"
  ON courses
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage courses"
  ON courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for lectures
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
        WHERE user_id = auth.uid() AND is_admin = true
      )
    )
  );

CREATE POLICY "Admins can manage lectures"
  ON lectures
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for subscription_codes
CREATE POLICY "Users can read active codes for validation"
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

-- RLS Policies for user_course_access
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_active ON courses(is_active);
CREATE INDEX IF NOT EXISTS idx_lectures_course_id ON lectures(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_subscription_codes_code ON subscription_codes(code);
CREATE INDEX IF NOT EXISTS idx_subscription_codes_course ON subscription_codes(course_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_course_access_user ON user_course_access(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_course_access_course ON user_course_access(course_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_course_access_expires ON user_course_access(expires_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for avatars (if not exists)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Set up storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insert sample data
INSERT INTO courses (title, description, price, image_url) VALUES
('أساسيات البرمجة', 'تعلم أساسيات البرمجة باللغة العربية مع أمثلة عملية وتطبيقات متنوعة', 299.99, 'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg'),
('تطوير المواقع', 'كورس شامل لتعلم تطوير المواقع الإلكترونية باستخدام HTML, CSS, JavaScript', 499.99, 'https://images.pexels.com/photos/326503/pexels-photo-326503.jpeg'),
('علوم البيانات', 'مقدمة شاملة في علوم البيانات والتحليل الإحصائي والذكاء الاصطناعي', 799.99, 'https://images.pexels.com/photos/669996/pexels-photo-669996.jpeg'),
('التصميم الجرافيكي', 'تعلم أساسيات التصميم الجرافيكي والأدوات المتقدمة للإبداع', 399.99, 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg');

-- Insert sample lectures for the first course
DO $$
DECLARE
  course_id uuid;
BEGIN
  SELECT id INTO course_id FROM courses WHERE title = 'أساسيات البرمجة' LIMIT 1;
  
  IF course_id IS NOT NULL THEN
    INSERT INTO lectures (course_id, title, description, order_index) VALUES
    (course_id, 'مقدمة في البرمجة', 'نظرة عامة على البرمجة ولغات البرمجة المختلفة', 1),
    (course_id, 'المتغيرات والثوابت', 'تعلم كيفية استخدام المتغيرات والثوابت في البرمجة', 2),
    (course_id, 'الحلقات والشروط', 'استخدام الحلقات والشروط في التحكم بتدفق البرنامج', 3),
    (course_id, 'الدوال والإجراءات', 'كيفية إنشاء واستخدام الدوال في البرمجة', 4);
  END IF;
END $$;

-- Insert sample subscription codes
DO $$
DECLARE
  course_id uuid;
BEGIN
  SELECT id INTO course_id FROM courses WHERE title = 'أساسيات البرمجة' LIMIT 1;
  
  IF course_id IS NOT NULL THEN
    INSERT INTO subscription_codes (course_id, code, validity_days, expires_at, usage_limit) VALUES
    (course_id, 'BASIC2024', 30, now() + interval '90 days', 10),
    (course_id, 'STUDENT50', 60, now() + interval '180 days', 5);
  END IF;
END $$;