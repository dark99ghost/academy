/*
  # إصلاح دالة حذف كود الاشتراك

  1. إنشاء دالة حذف كود الاشتراك
  2. إصلاح مشكلة عدد الكورسات
  3. تحديث البيانات التجريبية
*/

-- إنشاء دالة حذف كود الاشتراك
CREATE OR REPLACE FUNCTION delete_subscription_code(code_id uuid)
RETURNS boolean AS $$
DECLARE
  current_user_is_admin boolean;
BEGIN
  -- التحقق من أن المستخدم الحالي أدمن
  SELECT is_admin INTO current_user_is_admin
  FROM user_profiles
  WHERE user_id = auth.uid();
  
  IF NOT current_user_is_admin THEN
    RAISE EXCEPTION 'غير مسموح: يجب أن تكون أدمن لحذف الأكواد';
  END IF;
  
  -- حذف الكود
  DELETE FROM subscription_codes WHERE id = code_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث الصور الافتراضية للكورسات لتعبر عن الرياضيات
UPDATE courses SET image_url = 'https://images.pexels.com/photos/3729557/pexels-photo-3729557.jpeg' WHERE title = 'أساسيات البرمجة';
UPDATE courses SET image_url = 'https://images.pexels.com/photos/6238297/pexels-photo-6238297.jpeg' WHERE title = 'تطوير المواقع';
UPDATE courses SET image_url = 'https://images.pexels.com/photos/590020/pexels-photo-590020.jpeg' WHERE title = 'علوم البيانات';
UPDATE courses SET image_url = 'https://images.pexels.com/photos/3729557/pexels-photo-3729557.jpeg' WHERE title = 'التصميم الجرافيكي';

-- إضافة كورسات رياضيات جديدة
INSERT INTO courses (title, description, price, image_url) VALUES
('الجبر الخطي', 'تعلم أساسيات الجبر الخطي والمصفوفات والمتجهات', 199.99, 'https://images.pexels.com/photos/3729557/pexels-photo-3729557.jpeg'),
('التفاضل والتكامل', 'كورس شامل في التفاضل والتكامل للمرحلة الجامعية', 299.99, 'https://images.pexels.com/photos/6238297/pexels-photo-6238297.jpeg'),
('الإحصاء والاحتمالات', 'مقدمة في الإحصاء والاحتمالات مع التطبيقات العملية', 249.99, 'https://images.pexels.com/photos/590020/pexels-photo-590020.jpeg')
ON CONFLICT DO NOTHING;