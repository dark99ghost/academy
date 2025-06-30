/*
  # إنشاء جدول profiles الافتراضي لـ Supabase

  1. الجداول الجديدة
    - `profiles` - جدول الملفات الشخصية الافتراضي لـ Supabase
      - `id` (uuid, مرجع للمستخدم في auth.users)
      - `updated_at` (timestamp, تاريخ آخر تحديث)

  2. الأمان
    - تمكين RLS على جدول profiles
    - إضافة سياسات للقراءة والكتابة

  3. المحفزات
    - إنشاء محفز لإنشاء ملف تعريف تلقائياً عند التسجيل
*/

-- Create profiles table (Supabase default)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, updated_at)
  VALUES (new.id, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();