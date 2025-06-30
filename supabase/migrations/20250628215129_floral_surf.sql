/*
  # إصلاح جدول المحاضرات والمواد التعليمية

  1. التحقق من وجود الجداول وإنشاؤها إذا لم تكن موجودة
    - `lectures` - جدول المحاضرات
    - `lecture_materials` - جدول المواد التعليمية

  2. إضافة الحقول المطلوبة بأمان
    - `thumbnail_url` للمحاضرات
    - `materials_count` للمحاضرات

  3. الأمان
    - تمكين RLS على الجداول الجديدة
    - إضافة السياسات المناسبة

  4. الفهارس والمحفزات
    - فهارس لتحسين الأداء
    - محفزات لتحديث العدادات
*/

-- التحقق من وجود جدول lectures وإنشاؤه إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  video_url text,
  duration integer DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  thumbnail_url text,
  materials_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- التحقق من وجود جدول lecture_materials وإنشاؤه إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS lecture_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('video', 'pdf', 'document', 'image', 'audio')),
  url text NOT NULL,
  duration integer DEFAULT 0,
  file_size bigint DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- إضافة الحقول الجديدة إذا لم تكن موجودة
DO $$
BEGIN
  -- إضافة thumbnail_url إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE lectures ADD COLUMN thumbnail_url text;
  END IF;
  
  -- إضافة materials_count إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'materials_count'
  ) THEN
    ALTER TABLE lectures ADD COLUMN materials_count integer DEFAULT 0;
  END IF;
END $$;

-- تمكين RLS على الجداول
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_materials ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لجدول lectures
DROP POLICY IF EXISTS "Users can read lectures for subscribed courses" ON lectures;
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

DROP POLICY IF EXISTS "Admins can manage lectures" ON lectures;
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

-- سياسات الأمان لجدول lecture_materials
DROP POLICY IF EXISTS "Users can read materials for subscribed courses" ON lecture_materials;
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

DROP POLICY IF EXISTS "Admins can manage lecture materials" ON lecture_materials;
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

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_lectures_course_id ON lectures(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lectures_active ON lectures(is_active);
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

-- إنشاء المحفز
DROP TRIGGER IF EXISTS update_lecture_materials_count_trigger ON lecture_materials;
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
)
WHERE EXISTS (SELECT 1 FROM lecture_materials WHERE lecture_id = lectures.id);

-- إدراج بعض المحاضرات التجريبية إذا لم تكن موجودة
DO $$
DECLARE
  course_id uuid;
BEGIN
  -- البحث عن كورس "أساسيات البرمجة"
  SELECT id INTO course_id FROM courses WHERE title = 'أساسيات البرمجة' LIMIT 1;
  
  IF course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lectures WHERE course_id = course_id) THEN
    INSERT INTO lectures (course_id, title, description, order_index, duration) VALUES
    (course_id, 'مقدمة في البرمجة', 'نظرة عامة على البرمجة ولغات البرمجة المختلفة', 1, 45),
    (course_id, 'المتغيرات والثوابت', 'تعلم كيفية استخدام المتغيرات والثوابت في البرمجة', 2, 60),
    (course_id, 'الحلقات والشروط', 'استخدام الحلقات والشروط في التحكم بتدفق البرنامج', 3, 75),
    (course_id, 'الدوال والإجراءات', 'كيفية إنشاء واستخدام الدوال في البرمجة', 4, 90);
  END IF;
END $$;