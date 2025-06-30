/*
  # إضافة نظام الفئات للكورسات

  1. التحديثات
    - إضافة عمود target_level إلى جدول courses
    - تحديث الكورسات الموجودة لتحديد الفئة المستهدفة
    - تحديث السياسات لإظهار الكورسات حسب الفئة

  2. الفئات المدعومة
    - ثانوي: للطلاب في المرحلة الثانوية
    - جامعة: للطلاب في المرحلة الجامعية
    - الكل: للكورسات المتاحة لجميع الفئات
*/

-- إضافة عمود target_level إلى جدول courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'target_level'
  ) THEN
    ALTER TABLE courses 
    ADD COLUMN target_level text DEFAULT 'الكل' 
    CHECK (target_level IN ('ثانوي', 'جامعة', 'الكل'));
    
    -- إنشاء فهرس على عمود target_level
    CREATE INDEX IF NOT EXISTS idx_courses_target_level ON courses(target_level);
    
    RAISE NOTICE 'تم إضافة عمود target_level بنجاح';
  ELSE
    RAISE NOTICE 'عمود target_level موجود بالفعل';
  END IF;
END $$;

-- تحديث الكورسات الموجودة لتحديد الفئة المستهدفة
UPDATE courses SET target_level = 'ثانوي' WHERE title IN ('أساسيات البرمجة', 'التصميم الجرافيكي');
UPDATE courses SET target_level = 'جامعة' WHERE title IN ('تطوير المواقع', 'علوم البيانات', 'الجبر الخطي', 'التفاضل والتكامل', 'الإحصاء والاحتمالات');

-- تحديث سياسة قراءة الكورسات لتظهر الكورسات حسب الفئة
DROP POLICY IF EXISTS "Anyone can read active courses" ON courses;

CREATE POLICY "Users can read courses for their level"
  ON courses
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND (
      target_level = 'الكل' OR
      target_level = (
        SELECT education_level 
        FROM user_profiles 
        WHERE user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
      )
    )
  );

-- إضافة كورسات تجريبية جديدة لكل فئة
INSERT INTO courses (title, description, price, image_url, target_level) VALUES
('الرياضيات الأساسية', 'مراجعة شاملة للرياضيات الأساسية للمرحلة الثانوية', 149.99, 'https://images.pexels.com/photos/3729557/pexels-photo-3729557.jpeg', 'ثانوي'),
('الفيزياء للثانوية', 'كورس شامل في الفيزياء للمرحلة الثانوية العامة', 199.99, 'https://images.pexels.com/photos/6238297/pexels-photo-6238297.jpeg', 'ثانوي'),
('الكيمياء العضوية', 'دراسة متقدمة في الكيمياء العضوية للمرحلة الجامعية', 349.99, 'https://images.pexels.com/photos/590020/pexels-photo-590020.jpeg', 'جامعة'),
('هندسة البرمجيات', 'مبادئ هندسة البرمجيات والتطوير المتقدم', 449.99, 'https://images.pexels.com/photos/3729557/pexels-photo-3729557.jpeg', 'جامعة')
ON CONFLICT DO NOTHING;