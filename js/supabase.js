export async function deleteSubscriptionCode(codeId) {
  try {
    const { data, error } = await supabase.rpc('delete_subscription_code', {
      code_id: codeId
    });
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting subscription code:', error);
    return { error };
  }
}

export async function getSubscriptionCodes() {
  try {
    const { data, error } = await supabase
      .from('subscription_codes')
      .select(`
        *,
        courses (
          title
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error getting subscription codes:', error);
    return { data: [], error };
  }
}

export async function validateSubscriptionCode(code, courseId) {
  try {
    console.log('Validating code:', code, 'for course:', courseId);
    
    // استخدام الدالة المحسنة للتحقق من صحة الكود
    const { data, error } = await supabase.rpc('validate_subscription_code', {
      p_code: code,
      p_course_id: courseId
    });
    
    if (error) {
      console.error('Validation error:', error);
      throw error;
    }
    
    console.log('Validation result:', data);
    
    if (!data || data.length === 0) {
      throw new Error('لم يتم العثور على نتيجة التحقق');
    }
    
    const result = data[0];
    
    if (!result.is_valid) {
      throw new Error(result.error_message);
    }
    
    // إرجاع بيانات الكود الصالح
    const { data: codeData, error: codeError } = await supabase
      .from('subscription_codes')
      .select('*')
      .eq('id', result.code_id)
      .single();
    
    if (codeError) throw codeError;
    
    return { data: codeData, error: null };
  } catch (error) {
    console.error('Error validating subscription code:', error);
    return { data: null, error };
  }
}

export async function useSubscriptionCode(codeId, userId, courseId) {
  try {
    console.log('Using subscription code:', { codeId, userId, courseId });
    
    // الحصول على بيانات الكود
    const { data: code, error: codeError } = await supabase
      .from('subscription_codes')
      .select('*')
      .eq('id', codeId)
      .single();
    
    if (codeError) {
      console.error('Error getting code data:', codeError);
      throw codeError;
    }
    
    console.log('Code data:', code);
    
    // تحديث عدد مرات الاستخدام
    const { error: updateError } = await supabase
      .from('subscription_codes')
      .update({ used_count: code.used_count + 1 })
      .eq('id', codeId);
    
    if (updateError) {
      console.error('Error updating code usage:', updateError);
      throw updateError;
    }
    
    // حساب تاريخ انتهاء الاشتراك
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + code.validity_days);
    
    console.log('Creating course access with expires_at:', expiresAt.toISOString());
    
    // إنشاء أو تحديث وصول المستخدم للكورس
    const { data: access, error: accessError } = await supabase
      .from('user_course_access')
      .upsert({
        user_id: userId,
        course_id: courseId,
        subscription_code_id: codeId,
        expires_at: expiresAt.toISOString(),
        is_active: true
      }, {
        onConflict: 'user_id,course_id'
      })
      .select()
      .single();
    
    if (accessError) {
      console.error('Error creating course access:', accessError);
      throw accessError;
    }
    
    console.log('Course access created:', access);
    
    return { data: access, error: null };
  } catch (error) {
    console.error('Error using subscription code:', error);
    return { data: null, error };
  }
}

// Create course function
export async function createCourse(courseData) {
  try {
    const { data, error } = await supabase
      .from('courses')
      .insert([courseData])
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating course:', error);
    return { data: null, error };
  }
}

// Admin Functions - إصلاح تحميل المستخدمين من user_course_access
export async function getAllUsers() {
  try {
    // الحصول على جميع المستخدمين
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (usersError) throw usersError;
    
    // حساب عدد الكورسات لكل مستخدم من جدول user_course_access
    const usersWithCourseCount = await Promise.all(
      (users || []).map(async (user) => {
        const { count, error: countError } = await supabase
          .from('user_course_access')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id);
        
        return {
          ...user,
          enrolled_courses_count: countError ? 0 : (count || 0)
        };
      })
    );
    
    return { data: usersWithCourseCount, error: null };
  } catch (error) {
    console.error('Error getting all users:', error);
    return { data: [], error };
  }
}

// دالة للبحث عن المستخدمين بالـ ID مع عدد الكورسات
export async function searchUsersByID(searchTerm) {
  try {
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .ilike('user_id', `%${searchTerm}%`)
      .order('created_at', { ascending: false });
    
    if (usersError) throw usersError;
    
    // حساب عدد الكورسات لكل مستخدم من جدول user_course_access
    const usersWithCourseCount = await Promise.all(
      (users || []).map(async (user) => {
        const { count, error: countError } = await supabase
          .from('user_course_access')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id);
        
        return {
          ...user,
          enrolled_courses_count: countError ? 0 : (count || 0)
        };
      })
    );
    
    return { data: usersWithCourseCount, error: null };
  } catch (error) {
    console.error('Error searching users by ID:', error);
    return { data: [], error };
  }
}

export async function updateUserRole(userId, newRole) {
  try {
    const { data, error } = await supabase.rpc('update_user_role', {
      target_user_id: userId,
      new_role: newRole
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { data: null, error };
  }
}

export async function isAdmin(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_admin, role')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data?.is_admin === true || data?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function hasAdminOrInstructorRole(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_admin, role')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data?.is_admin === true || ['admin', 'instructor'].includes(data?.role);
  } catch (error) {
    console.error('Error checking admin/instructor status:', error);
    return false;
  }
}

// Upload avatar function - إصلاح مشكلة رفع الصور
export async function uploadAvatar(userId, file) {
  try {
    console.log('Starting avatar upload for user:', userId);
    console.log('File details:', { name: file.name, size: file.size, type: file.type });
    
    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      throw new Error('يجب أن يكون الملف صورة');
    }
    
    // التحقق من حجم الملف (أقل من 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
    }
    
    const fileExt = file.name.split('.').pop().toLowerCase();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = fileName; // تبسيط المسار

    console.log('Uploading to path:', filePath);

    // رفع الملف إلى التخزين
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // السماح بالكتابة فوق الملف الموجود
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`خطأ في رفع الصورة: ${uploadError.message}`);
    }

    console.log('Upload successful:', uploadData);

    // الحصول على الرابط العام للصورة
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    console.log('Public URL:', urlData.publicUrl);

    return { data: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return { data: null, error };
  }
}

// دالة رفع الفيديو
export async function uploadVideo(userId, file, onProgress) {
  try {
    console.log('Starting video upload for user:', userId);
    console.log('File details:', { name: file.name, size: file.size, type: file.type });
    
    // التحقق من نوع الملف
    if (!file.type.startsWith('video/')) {
      throw new Error('يجب أن يكون الملف فيديو');
    }
    
    // التحقق من حجم الملف (أقل من 500MB)
    if (file.size > 500 * 1024 * 1024) {
      throw new Error('حجم الفيديو يجب أن يكون أقل من 500 ميجابايت');
    }
    
    const fileExt = file.name.split('.').pop().toLowerCase();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `videos/${fileName}`;

    console.log('Uploading video to path:', filePath);

    // رفع الملف إلى التخزين مع تتبع التقدم
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`خطأ في رفع الفيديو: ${uploadError.message}`);
    }

    console.log('Upload successful:', uploadData);

    // الحصول على الرابط العام للفيديو
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    console.log('Public URL:', urlData.publicUrl);

    return { data: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('Error uploading video:', error);
    return { data: null, error };
  }
}

// دالة للتحقق من وصول المستخدم للكورس
export async function checkUserCourseAccess(userId, courseId) {
  try {
    const { data, error } = await supabase
      .from('user_course_access')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return { data: data || null, error: null };
  } catch (error) {
    console.error('Error checking user course access:', error);
    return { data: null, error };
  }
}

// Helper function to extract YouTube video ID
export function getYouTubeVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Helper function to convert YouTube URL to embed URL
export function getYouTubeEmbedUrl(url) {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

// Helper function to get role display name
export function getRoleDisplayName(role) {
  const roles = {
    student: 'طالب',
    instructor: 'مدرب',
    admin: 'أدمن'
  };
  return roles[role] || 'طالب';
}

// Initialize Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth functions
export async function signUp(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Profile functions
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  return { data, error };
}

export async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  
  return { data, error };
}

export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  return { data, error };
}

// Course functions
export async function getCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  return { data, error };
}

export async function getCourse(courseId) {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      lectures (
        *,
        lecture_materials (*)
      )
    `)
    .eq('id', courseId)
    .single();
  
  return { data, error };
}

export async function deleteCourse(courseId) {
  const { data, error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);
  
  return { data, error };
}

// Lecture functions
export async function getCourseLectures(courseId) {
  const { data, error } = await supabase
    .from('lectures')
    .select(`
      *,
      lecture_materials (*)
    `)
    .eq('course_id', courseId)
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  
  return { data, error };
}

export async function createLecture(lectureData) {
  const { data, error } = await supabase
    .from('lectures')
    .insert([lectureData])
    .select()
    .single();
  
  return { data, error };
}

export async function updateLecture(lectureId, updates) {
  const { data, error } = await supabase
    .from('lectures')
    .update(updates)
    .eq('id', lectureId)
    .select()
    .single();
  
  return { data, error };
}

export async function deleteLecture(lectureId) {
  const { data, error } = await supabase
    .from('lectures')
    .delete()
    .eq('id', lectureId);
  
  return { data, error };
}

// Lecture material functions
export async function createLectureMaterial(materialData) {
  const { data, error } = await supabase
    .from('lecture_materials')
    .insert([materialData])
    .select()
    .single();
  
  return { data, error };
}

export async function updateLectureMaterial(materialId, updates) {
  const { data, error } = await supabase
    .from('lecture_materials')
    .update(updates)
    .eq('id', materialId)
    .select()
    .single();
  
  return { data, error };
}

export async function deleteLectureMaterial(materialId) {
  const { data, error } = await supabase
    .from('lecture_materials')
    .delete()
    .eq('id', materialId);
  
  return { data, error };
}

// Subscription code functions
export async function createSubscriptionCode(codeData) {
  const { data, error } = await supabase
    .from('subscription_codes')
    .insert([codeData])
    .select()
    .single();
  
  return { data, error };
}

export async function updateSubscriptionCode(codeId, updates) {
  const { data, error } = await supabase
    .from('subscription_codes')
    .update(updates)
    .eq('id', codeId)
    .select()
    .single();
  
  return { data, error };
}
