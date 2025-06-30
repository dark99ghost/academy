/*
  # إصلاح مشكلة رفع الصور الشخصية

  1. إصلاح bucket الصور
    - التأكد من وجود bucket للصور الشخصية
    - إصلاح السياسات الأمنية للتحميل

  2. إضافة سياسات محسنة
    - السماح برفع الصور للمستخدمين المسجلين
    - السماح بالوصول العام للصور
*/

-- إنشاء bucket للصور الشخصية إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- سياسات جديدة محسنة للصور الشخصية
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars');