import { createClient } from '@supabase/supabase-js';

// Use environment variables with fallback to hardcoded values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kzbclgbwwkykjtdqtnlg.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6YmNsZ2J3d2t5a2p0ZHF0bmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODk0NTIsImV4cCI6MjA2NjI2NTQ1Mn0.uI5UlqHSi_KtVJAPllSNnpZ-jxslsiI9VYkp9GiafOE';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Test connection
supabase.from('courses').select('count', { count: 'exact', head: true })
  .then(({ error }) => {
    if (error) {
      console.error('Supabase connection test failed:', error);
    } else {
      console.log('Supabase connection successful');
    }
  });

// User Management Functions
export async function signUp(email, password, userData) {
  try {
    console.log('Starting signup process for:', email);
    
    // Sign up the user with metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: userData.full_name,
          education_level: userData.education_level
        }
      }
    });
    
    if (authError) {
      console.error('Auth signup error:', authError);
      throw authError;
    }
    
    console.log('Auth signup successful:', authData);
    
    return { data: authData, error: null };
  } catch (error) {
    console.error('SignUp error:', error);
    return { data: null, error };
  }
}

export async function signIn(email, password) {
  try {
    console.log('Starting signin process for:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('SignIn error:', error);
      throw error;
    }
    
    console.log('SignIn successful:', data);
    
    return { data, error: null };
  } catch (error) {
    console.error('SignIn error:', error);
    return { data: null, error };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('SignOut error:', error);
    return { error };
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      if (error.message === 'Auth session missing!') {
        return null;
      }
      throw error;
    }
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { data: null, error };
  }
}

export async function updateUserProfile(userId, updates) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { data: null, error };
  }
}

export async function updatePassword(newPassword) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating password:', error);
    return { data: null, error };
  }
}

// Course Management Functions
export async function getCourses() {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error getting courses:', error);
    return { data: [], error };
  }
}

export async function getCourse(courseId) {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        lectures (
          id,
          title,
          description,
          duration,
          order_index,
          is_active,
          lecture_materials (
            id,
            title,
            type,
            url,
            duration,
            order_index,
            is_active
          )
        )
      `)
      .eq('id', courseId)
      .eq('is_active', true)
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting course:', error);
    return { data: null, error };
  }
}

export async function createCourse(courseData) {
  try {
    console.log('Creating course with data:', courseData);
    
    // التأكد من وجود جميع الحقول المطلوبة
    const courseToCreate = {
      title: courseData.title,
      description: courseData.description,
      price: courseData.price,
      image_url: courseData.image_url || null,
      target_level: courseData.target_level || 'الكل',
      is_active: true
    };
    
    console.log('Final course data:', courseToCreate);
    
    const { data, error } = await supabase
      .from('courses')
      .insert([courseToCreate])
      .select()
      .single();
    
    if (error) {
      console.error('Course creation error:', error);
      throw error;
    }
    
    console.log('Course created successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error creating course:', error);
    return { data: null, error };
  }
}

export async function deleteCourse(courseId) {
  try {
    const { error } = await supabase
      .from('courses')
      .update({ is_active: false })
      .eq('id', courseId);
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting course:', error);
    return { error };
  }
}

// Lecture Management Functions
export async function getCourseLectures(courseId) {
  try {
    const { data, error } = await supabase
      .from('lectures')
      .select(`
        *,
        lecture_materials (
          id,
          title,
          type,
          url,
          duration,
          file_size,
          order_index,
          is_active
        )
      `)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('order_index', { ascending: true });
    
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error getting course lectures:', error);
    return { data: [], error };
  }
}

export async function createLecture(lectureData) {
  try {
    const { data, error } = await supabase
      .from('lectures')
      .insert([lectureData])
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating lecture:', error);
    return { data: null, error };
  }
}

export async function updateLecture(lectureId, updates) {
  try {
    const { data, error } = await supabase
      .from('lectures')
      .update(updates)
      .eq('id', lectureId)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating lecture:', error);
    return { data: null, error };
  }
}

export async function deleteLecture(lectureId) {
  try {
    const { error } = await supabase
      .from('lectures')
      .update({ is_active: false })
      .eq('id', lectureId);
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting lecture:', error);
    return { error };
  }
}

// Lecture Materials Functions
export async function createLectureMaterial(materialData) {
  try {
    const { data, error } = await supabase
      .from('lecture_materials')
      .insert([materialData])
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating lecture material:', error);
    return { data: null, error };
  }
}

export async function updateLectureMaterial(materialId, updates) {
  try {
    const { data, error } = await supabase
      .from('lecture_materials')
      .update(updates)
      .eq('id', materialId)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating lecture material:', error);
    return { data: null, error };
  }
}

export async function deleteLectureMaterial(materialId) {
  try {
    const { error } = await supabase
      .from('lecture_materials')
      .update({ is_active: false })
      .eq('id', materialId);
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting lecture material:', error);
    return { error };
  }
}

// Subscription Code Functions
export async function createSubscriptionCode(codeData) {
  try {
    const { data, error } = await supabase
      .from('subscription_codes')
      .insert([codeData])
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating subscription code:', error);
    return { data: null, error };
  }
}

export async function updateSubscriptionCode(codeId, updates) {
  try {
    const { data, error } = await supabase
      .from('subscription_codes')
      .update(updates)
      .eq('id', codeId)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating subscription code:', error);
    return { data: null, error };
  }
}

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
