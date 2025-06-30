/*
  # إنشاء الجداول المفقودة وإصلاح قاعدة البيانات

  1. الجداول المطلوبة
    - `lectures` - جدول المحاضرات
    - `lecture_materials` - جدول مواد المحاضرات

  2. الأمان
    - تمكين RLS على جميع الجداول
    - إضافة السياسات المطلوبة

  3. البيانات التجريبية
    - إضافة محاضرات ومواد تجريبية
*/

-- إنشاء جدول lectures إذا لم يكن موجوداً
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

-- إنشاء جدول lecture_materials إذا لم يكن موجوداً
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

-- تمكين RLS على الجداول
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_materials ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إذا كانت موجودة
DROP POLICY IF EXISTS "Users can read lectures for subscribed courses" ON lectures;
DROP POLICY IF EXISTS "Admins can manage lectures" ON lectures;
DROP POLICY IF EXISTS "Users can read materials for subscribed courses" ON lecture_materials;
DROP POLICY IF EXISTS "Admins can manage lecture materials" ON lecture_materials;

-- سياسات الأمان لجدول lectures
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

-- إدراج محاضرات تجريبية
DO $$
DECLARE
  programming_course_id uuid;
  web_course_id uuid;
  lecture_id uuid;
BEGIN
  -- الحصول على معرف كورس أساسيات البرمجة
  SELECT id INTO programming_course_id FROM courses WHERE title = 'أساسيات البرمجة' LIMIT 1;
  
  -- إدراج محاضرات لكورس أساسيات البرمجة
  IF programming_course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lectures WHERE course_id = programming_course_id) THEN
    -- إدراج المحاضرات
    INSERT INTO lectures (course_id, title, description, order_index, duration) VALUES
    (programming_course_id, 'مقدمة في البرمجة', 'نظرة عامة على البرمجة ولغات البرمجة المختلفة', 1, 45),
    (programming_course_id, 'المتغيرات والثوابت', 'تعلم كيفية استخدام المتغيرات والثوابت في البرمجة', 2, 60),
    (programming_course_id, 'الحلقات والشروط', 'استخدام الحلقات والشروط في التحكم بتدفق البرنامج', 3, 75),
    (programming_course_id, 'الدوال والإجراءات', 'كيفية إنشاء واستخدام الدوال في البرمجة', 4, 90);
    
    -- الحصول على معرف المحاضرة الأولى
    SELECT id INTO lecture_id FROM lectures 
    WHERE course_id = programming_course_id AND title = 'مقدمة في البرمجة' LIMIT 1;
    
    -- إدراج مواد للمحاضرة الأولى
    IF lecture_id IS NOT NULL THEN
      INSERT INTO lecture_materials (lecture_id, title, type, url, duration, order_index) VALUES
      (lecture_id, 'فيديو تعريفي عن البرمجة', 'video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 15, 1),
      (lecture_id, 'ملف PDF - مقدمة البرمجة', 'pdf', 'https://example.com/intro-programming.pdf', 0, 2),
      (lecture_id, 'مستند - تاريخ البرمجة', 'document', 'https://example.com/programming-history.docx', 0, 3);
    END IF;
  END IF;
  
  -- الحصول على معرف كورس تطوير المواقع
  SELECT id INTO web_course_id FROM courses WHERE title = 'تطوير المواقع' LIMIT 1;
  
  -- إدراج محاضرات لكورس تطوير المواقع
  IF web_course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lectures WHERE course_id = web_course_id) THEN
    INSERT INTO lectures (course_id, title, description, order_index, duration) VALUES
    (web_course_id, 'مقدمة في HTML', 'تعلم أساسيات لغة HTML لبناء صفحات الويب', 1, 50),
    (web_course_id, 'تنسيق الصفحات بـ CSS', 'استخدام CSS لتنسيق وتجميل صفحات الويب', 2, 65),
    (web_course_id, 'التفاعل مع JavaScript', 'إضافة التفاعل والحركة للمواقع باستخدام JavaScript', 3, 80);
  END IF;
END $$;

-- تحديث عدد المواد في جميع المحاضرات
UPDATE lectures 
SET materials_count = (
  SELECT COUNT(*) 
  FROM lecture_materials 
  WHERE lecture_id = lectures.id AND is_active = true
);

-- إنشاء مستخدم مدير تجريبي إذا لم يكن موجوداً
DO $$
BEGIN
  -- التحقق من عدم وجود مدير
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE is_admin = true) THEN
    -- إنشاء ملف تعريف مدير تجريبي (سيتم ربطه بالمستخدم الأول الذي يسجل)
    INSERT INTO user_profiles (user_id, full_name, education_level, is_admin)
    SELECT 
      id,
      'المدير العام',
      'جامعة',
      true
    FROM auth.users 
    WHERE email LIKE '%admin%' OR email LIKE '%test%'
    LIMIT 1
    ON CONFLICT (user_id) DO UPDATE SET is_admin = true;
  END IF;
END $$;