/*
  # إصلاح خطأ التضارب في أسماء الأعمدة

  1. إصلاح المشكلة
    - حل مشكلة التضارب في أسماء المتغيرات في PL/pgSQL
    - استخدام أسماء متغيرات واضحة ومختلفة عن أسماء الأعمدة

  2. التحقق من البيانات
    - التأكد من وجود الجداول المطلوبة
    - إدراج البيانات التجريبية بأمان
*/

-- إدراج بعض المحاضرات التجريبية مع إصلاح مشكلة التضارب
DO $$
DECLARE
  target_course_id uuid;
  lecture_count integer;
BEGIN
  -- البحث عن كورس "أساسيات البرمجة"
  SELECT id INTO target_course_id FROM courses WHERE title = 'أساسيات البرمجة' LIMIT 1;
  
  -- التحقق من وجود الكورس وعدم وجود محاضرات له
  IF target_course_id IS NOT NULL THEN
    SELECT COUNT(*) INTO lecture_count FROM lectures WHERE course_id = target_course_id;
    
    IF lecture_count = 0 THEN
      INSERT INTO lectures (course_id, title, description, order_index, duration) VALUES
      (target_course_id, 'مقدمة في البرمجة', 'نظرة عامة على البرمجة ولغات البرمجة المختلفة', 1, 45),
      (target_course_id, 'المتغيرات والثوابت', 'تعلم كيفية استخدام المتغيرات والثوابت في البرمجة', 2, 60),
      (target_course_id, 'الحلقات والشروط', 'استخدام الحلقات والشروط في التحكم بتدفق البرنامج', 3, 75),
      (target_course_id, 'الدوال والإجراءات', 'كيفية إنشاء واستخدام الدوال في البرمجة', 4, 90);
    END IF;
  END IF;
END $$;

-- إدراج بعض المواد التجريبية للمحاضرة الأولى
DO $$
DECLARE
  target_lecture_id uuid;
  material_count integer;
BEGIN
  -- البحث عن المحاضرة الأولى
  SELECT l.id INTO target_lecture_id 
  FROM lectures l
  JOIN courses c ON l.course_id = c.id
  WHERE c.title = 'أساسيات البرمجة' 
  AND l.title = 'مقدمة في البرمجة'
  LIMIT 1;
  
  -- التحقق من وجود المحاضرة وعدم وجود مواد لها
  IF target_lecture_id IS NOT NULL THEN
    SELECT COUNT(*) INTO material_count FROM lecture_materials WHERE lecture_id = target_lecture_id;
    
    IF material_count = 0 THEN
      INSERT INTO lecture_materials (lecture_id, title, type, url, duration, order_index) VALUES
      (target_lecture_id, 'فيديو تعريفي عن البرمجة', 'video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 15, 1),
      (target_lecture_id, 'ملف PDF - مقدمة البرمجة', 'pdf', 'https://example.com/intro-programming.pdf', 0, 2),
      (target_lecture_id, 'مستند - تاريخ البرمجة', 'document', 'https://example.com/programming-history.docx', 0, 3);
    END IF;
  END IF;
END $$;

-- التأكد من تحديث عدد المواد في المحاضرات
UPDATE lectures 
SET materials_count = (
  SELECT COUNT(*) 
  FROM lecture_materials 
  WHERE lecture_id = lectures.id AND is_active = true
)
WHERE EXISTS (
  SELECT 1 FROM lecture_materials 
  WHERE lecture_id = lectures.id AND is_active = true
);