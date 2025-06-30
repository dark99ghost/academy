/*
  # إضافة نظام المواد التعليمية للمحاضرات

  1. الجداول الجديدة
    - `lecture_materials` - مواد المحاضرات (فيديوهات، ملفات PDF، إلخ)
      - `id` (uuid, المعرف الأساسي)
      - `lecture_id` (uuid, مرجع للمحاضرة)
      - `title` (text, عنوان المادة)
      - `type` (text, نوع المادة: video, pdf, document)
      - `url` (text, رابط المادة)
      - `duration` (integer, مدة الفيديو بالدقائق)
      - `file_size` (bigint, حجم الملف بالبايت)
      - `order_index` (integer, ترتيب المادة)
      - `is_active` (boolean, هل المادة نشطة)
      - `created_at` (timestamp, تاريخ الإنشاء)

  2. التحديثات
    - تحديث جدول lectures لإضافة المزيد من الحقول
    - إضافة فهارس لتحسين الأداء

  3. الأمان
    - تمكين RLS على الجداول الجديدة
    - إضافة سياسات الأمان المناسبة
*/

-- إضافة حقول جديدة لجدول lectures
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE lectures ADD COLUMN thumbnail_url text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'materials_count'
  ) THEN
    ALTER TABLE lectures ADD COLUMN materials_count integer DEFAULT 0;
  END IF;
END $$;

-- إنشاء جدول lecture_materials
CREATE TABLE IF NOT EXISTS lecture_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('video', 'pdf', 'document', 'image', 'audio')),
  url text NOT NULL,
  duration integer DEFAULT 0, -- للفيديوهات والصوتيات (بالدقائق)
  file_size bigint DEFAULT 0, -- حجم الملف بالبايت
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- تمكين RLS على جدول lecture_materials
ALTER TABLE lecture_materials ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لجدول lecture_materials
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
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage lecture materials"
  ON lecture_materials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_lecture_materials_lecture_id ON lecture_materials(lecture_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lecture_materials_type ON lecture_materials(type, is_active);

-- دالة لتحديث عدد المواد في المحاضرة
CREATE OR REPLACE FUNCTION update_lecture_materials_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE lectures 
    SET materials_count = (
      SELECT COUNT(*) 
      FROM lecture_materials 
      WHERE lecture_id = NEW.lecture_id AND is_active = true
    )
    WHERE id = NEW.lecture_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lectures 
    SET materials_count = (
      SELECT COUNT(*) 
      FROM lecture_materials 
      WHERE lecture_id = OLD.lecture_id AND is_active = true
    )
    WHERE id = OLD.lecture_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- إنشاء محفز لتحديث عدد المواد
CREATE TRIGGER update_lecture_materials_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON lecture_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_lecture_materials_count();

-- تحديث عدد المواد للمحاضرات الموجودة
UPDATE lectures 
SET materials_count = (
  SELECT COUNT(*) 
  FROM lecture_materials 
  WHERE lecture_id = lectures.id AND is_active = true
);