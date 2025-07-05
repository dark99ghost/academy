import { 
  supabase, 
  signUp, 
  signIn, 
  signOut, 
  getCurrentUser, 
  getUserProfile, 
  updateUserProfile, 
  updatePassword,
  getCourses,
  getCourse,
  createCourse,
  deleteCourse,
  getCourseLectures,
  createLecture,
  updateLecture,
  deleteLecture,
  createLectureMaterial,
  updateLectureMaterial,
  deleteLectureMaterial,
  createSubscriptionCode,
  updateSubscriptionCode,
  deleteSubscriptionCode,
  getSubscriptionCodes,
  validateSubscriptionCode,
  useSubscriptionCode,
  getAllUsers,
  searchUsersByID,
  updateUserRole,
  isAdmin,
  hasAdminOrInstructorRole,
  uploadAvatar,
  uploadVideo,
  checkUserCourseAccess,
  getYouTubeEmbedUrl,
  getRoleDisplayName
} from './supabase.js';

// Global variables
let currentUser = null;
let currentUserProfile = null;
let currentCourse = null;
let currentLecture = null;
let currentCourseId = null;
let currentLectureId = null;
let currentMaterial = null;
let modalEventListenersAdded = false; // منع تكرار إضافة event listeners

// DOM Elements
const loadingContainer = document.getElementById('loading');
const authContainer = document.getElementById('auth-container');
const mainContainer = document.getElementById('main-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const modalOverlay = document.getElementById('modal-overlay');

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  console.log('App initializing...');
  
  // Check if user is already logged in
  currentUser = await getCurrentUser();
  
  if (currentUser) {
    console.log('User found:', currentUser);
    await loadUserProfile();
    await showMainApp();
  } else {
    console.log('No user found, showing auth');
    showAuth();
  }
  
  setupEventListeners();
  hideLoading();
});

// Show/Hide functions
function showLoading() {
  loadingContainer.style.display = 'flex';
  authContainer.style.display = 'none';
  mainContainer.style.display = 'none';
}

function hideLoading() {
  loadingContainer.style.display = 'none';
}

function showAuth() {
  authContainer.style.display = 'flex';
  mainContainer.style.display = 'none';
}

async function showMainApp() {
  authContainer.style.display = 'none';
  mainContainer.style.display = 'block';
  
  // Load initial data
  await loadCourses();
  await updateNavigation();
  showPage('home');
}

// Load user profile
async function loadUserProfile() {
  if (!currentUser) return;
  
  const { data, error } = await getUserProfile(currentUser.id);
  if (error) {
    console.error('Error loading user profile:', error);
    return;
  }
  
  currentUserProfile = data;
  console.log('User profile loaded:', currentUserProfile);
  
  // Update UI with user info
  updateUserAvatar();
  updateRoleVisibility();
}

// Update user avatar in navigation
function updateUserAvatar() {
  const userAvatars = document.querySelectorAll('#user-avatar, #profile-avatar');
  userAvatars.forEach(avatar => {
    if (currentUserProfile?.avatar_url) {
      avatar.src = currentUserProfile.avatar_url;
    }
  });
}

// Update role-based visibility
async function updateRoleVisibility() {
  if (!currentUser) return;
  
  const isUserAdmin = await isAdmin(currentUser.id);
  const hasInstructorRole = await hasAdminOrInstructorRole(currentUser.id);
  
  // Show/hide admin links
  const adminLinks = document.querySelectorAll('#admin-link, #admin-dropdown-link');
  adminLinks.forEach(link => {
    link.style.display = isUserAdmin ? 'block' : 'none';
  });
  
  // Show/hide instructor links
  const instructorLinks = document.querySelectorAll('#instructor-link, #instructor-dropdown-link');
  instructorLinks.forEach(link => {
    link.style.display = (hasInstructorRole && !isUserAdmin) ? 'block' : 'none';
  });
}

// Navigation
function updateNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-page');
      showPage(page);
    });
  });
  
  // Brand logo click
  document.getElementById('brand-logo').addEventListener('click', () => {
    showPage('home');
  });
}

function showPage(pageId) {
  // Hide all pages
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.remove('active'));
  
  // Show selected page
  const targetPage = document.getElementById(`${pageId}-page`);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  // Update navigation active state
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-page') === pageId) {
      link.classList.add('active');
    }
  });
  
  // Load page-specific data
  switch (pageId) {
    case 'home':
      loadCourses();
      break;
    case 'profile':
      loadProfileData();
      break;
    case 'instructor':
      loadInstructorData();
      break;
    case 'admin':
      loadAdminData();
      setupAdminTabs();
      break;
  }
}

// إعداد تبويبات لوحة التحكم
function setupAdminTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.admin-tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      
      // إزالة الفئة النشطة من جميع الأزرار والمحتويات
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // إضافة الفئة النشطة للزر والمحتوى المحدد
      button.classList.add('active');
      const targetContent = document.getElementById(`admin-${targetTab}`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
      
      // تحميل البيانات حسب التبويب
      switch (targetTab) {
        case 'courses':
          loadAdminCourses();
          break;
        case 'users':
          loadAdminUsers();
          break;
        case 'codes':
          loadAdminCodes();
          break;
      }
    });
  });
}

// Event Listeners
function setupEventListeners() {
  // Auth form toggles
  document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  });
  
  document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
  });
  
  // Auth forms
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  
  // Profile form
  document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
  
  // Avatar upload
  document.getElementById('upload-avatar-btn').addEventListener('click', () => {
    document.getElementById('avatar-input').click();
  });
  
  document.getElementById('avatar-input').addEventListener('change', handleAvatarUpload);
  
  // Logout
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  
  // Modal close - إضافة فقط مرة واحدة
  if (!modalEventListenersAdded) {
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', closeModal);
    });
    
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
    
    modalEventListenersAdded = true;
  }
  
  // Course subscription
  document.getElementById('subscriptionForm').addEventListener('submit', handleCourseSubscription);
  
  // Admin forms
  document.getElementById('createCourseForm').addEventListener('submit', handleCreateCourse);
  document.getElementById('createCodeForm').addEventListener('submit', handleCreateCode);
  document.getElementById('editCodeForm').addEventListener('submit', handleEditCode);
  document.getElementById('editUserRoleForm').addEventListener('submit', handleEditUserRole);
  document.getElementById('createLectureForm').addEventListener('submit', handleCreateLecture);
  document.getElementById('createMaterialForm').addEventListener('submit', handleCreateMaterial);
  
  // Admin buttons
  document.getElementById('create-course-btn').addEventListener('click', () => showModal('create-course-modal'));
  document.getElementById('create-code-btn').addEventListener('click', () => {
    loadCoursesForCodeModal();
    showModal('create-code-modal');
  });
  
  // Instructor buttons
  document.getElementById('instructor-create-course-btn').addEventListener('click', () => showModal('create-course-modal'));
  
  // Generate random code
  document.getElementById('generate-code-btn').addEventListener('click', generateRandomCode);
  
  // Course navigation
  document.getElementById('back-to-courses').addEventListener('click', () => showPage('home'));
  document.getElementById('back-to-courses-from-content').addEventListener('click', () => showPage('home'));
  
  // User search
  document.getElementById('search-users-btn').addEventListener('click', handleUserSearch);
  document.getElementById('clear-search-btn').addEventListener('click', handleClearSearch);
  
  // Enter key for search
  document.getElementById('user-search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleUserSearch();
    }
  });

  // Video upload method selection
  setupVideoUploadListeners();
}

// إعداد مستمعي أحداث رفع الفيديو
function setupVideoUploadListeners() {
  const materialTypeSelect = document.getElementById('material-type');
  const videoUploadOptions = document.getElementById('video-upload-options');
  const videoUrlInput = document.getElementById('video-url-input');
  const videoFileInput = document.getElementById('video-file-input');
  const materialUrlInput = document.getElementById('material-url');
  
  // عرض خيارات رفع الفيديو عند اختيار نوع فيديو
  materialTypeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'video') {
      videoUploadOptions.style.display = 'block';
      updateVideoInputVisibility();
    } else {
      videoUploadOptions.style.display = 'none';
      videoUrlInput.style.display = 'block';
      videoFileInput.style.display = 'none';
      materialUrlInput.required = true;
    }
  });
  
  // تبديل بين رفع الرابط ورفع الملف
  const videoMethodRadios = document.querySelectorAll('input[name="video-method"]');
  videoMethodRadios.forEach(radio => {
    radio.addEventListener('change', updateVideoInputVisibility);
  });
  
  // رفع الفيديو من الجهاز
  const materialFileInput = document.getElementById('material-file');
  materialFileInput.addEventListener('change', handleVideoFileUpload);
}

function updateVideoInputVisibility() {
  const selectedMethod = document.querySelector('input[name="video-method"]:checked').value;
  const videoUrlInput = document.getElementById('video-url-input');
  const videoFileInput = document.getElementById('video-file-input');
  const materialUrlInput = document.getElementById('material-url');
  
  if (selectedMethod === 'url') {
    videoUrlInput.style.display = 'block';
    videoFileInput.style.display = 'none';
    materialUrlInput.required = true;
  } else {
    videoUrlInput.style.display = 'none';
    videoFileInput.style.display = 'block';
    materialUrlInput.required = false;
  }
}

async function handleVideoFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const progressContainer = document.getElementById('file-upload-progress');
  const successContainer = document.getElementById('file-upload-success');
  const placeholder = document.querySelector('.file-upload-placeholder');
  const progressFill = document.querySelector('.progress-fill');
  const progressText = document.querySelector('.progress-text');
  
  try {
    // إخفاء العنصر النائب وإظهار شريط التقدم
    placeholder.style.display = 'none';
    progressContainer.style.display = 'block';
    successContainer.style.display = 'none';
    
    // محاكاة تقدم الرفع (في التطبيق الحقيقي، ستحصل على التقدم الفعلي)
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `جاري الرفع... ${Math.round(progress)}%`;
    }, 200);
    
    // رفع الفيديو
    const { data: videoUrl, error } = await uploadVideo(currentUser.id, file);
    
    clearInterval(progressInterval);
    
    if (error) {
      throw error;
    }
    
    // إكمال شريط التقدم
    progressFill.style.width = '100%';
    progressText.textContent = 'تم الرفع بنجاح!';
    
    // إظهار رسالة النجاح
    setTimeout(() => {
      progressContainer.style.display = 'none';
      successContainer.style.display = 'block';
      
      // تحديث حقل الرابط بالرابط المرفوع
      document.getElementById('material-url').value = videoUrl;
    }, 1000);
    
  } catch (error) {
    clearInterval(progressInterval);
    console.error('Error uploading video:', error);
    
    // إظهار رسالة خطأ
    progressContainer.style.display = 'none';
    placeholder.style.display = 'block';
    alert('خطأ في رفع الفيديو: ' + error.message);
  }
}

// Authentication handlers
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  showLoading();
  
  const { data, error } = await signIn(email, password);
  
  if (error) {
    hideLoading();
    alert('خطأ في تسجيل الدخول: ' + error.message);
    return;
  }
  
  currentUser = data.user;
  await loadUserProfile();
  await showMainApp();
}

async function handleRegister(e) {
  e.preventDefault();
  
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const level = document.getElementById('registerLevel').value;
  
  showLoading();
  
  const { data, error } = await signUp(email, password, {
    full_name: name,
    education_level: level
  });
  
  if (error) {
    hideLoading();
    alert('خطأ في إنشاء الحساب: ' + error.message);
    return;
  }
  
  alert('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
  
  // Switch to login form
  registerForm.style.display = 'none';
  loginForm.style.display = 'block';
  
  hideLoading();
}

async function handleLogout() {
  showLoading();
  
  const { error } = await signOut();
  
  if (error) {
    console.error('Logout error:', error);
  }
  
  currentUser = null;
  currentUserProfile = null;
  
  showAuth();
  hideLoading();
}

// Profile handlers
async function loadProfileData() {
  if (!currentUser || !currentUserProfile) return;
  
  // Populate profile form
  document.getElementById('profile-user-id').value = currentUserProfile.user_id || '';
  document.getElementById('profile-name').value = currentUserProfile.full_name || '';
  document.getElementById('profile-email').value = currentUser.email || '';
  document.getElementById('profile-level').value = currentUserProfile.education_level || '';
  document.getElementById('profile-role').value = getRoleDisplayName(currentUserProfile.role) || 'طالب';
  
  // Update avatar
  if (currentUserProfile.avatar_url) {
    document.getElementById('profile-avatar').src = currentUserProfile.avatar_url;
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  
  const name = document.getElementById('profile-name').value;
  const level = document.getElementById('profile-level').value;
  const password = document.getElementById('profile-password').value;
  
  try {
    // Update profile
    const updates = {
      full_name: name,
      education_level: level
    };
    
    const { error: profileError } = await updateUserProfile(currentUser.id, updates);
    
    if (profileError) {
      throw profileError;
    }
    
    // Update password if provided
    if (password) {
      const { error: passwordError } = await updatePassword(password);
      if (passwordError) {
        throw passwordError;
      }
    }
    
    // Reload profile
    await loadUserProfile();
    
    alert('تم تحديث الملف الشخصي بنجاح!');
    
    // Clear password field
    document.getElementById('profile-password').value = '';
    
  } catch (error) {
    console.error('Profile update error:', error);
    alert('خطأ في تحديث الملف الشخصي: ' + error.message);
  }
}

async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const { data: avatarUrl, error } = await uploadAvatar(currentUser.id, file);
    
    if (error) {
      throw error;
    }
    
    // Update profile with new avatar URL
    const { error: updateError } = await updateUserProfile(currentUser.id, {
      avatar_url: avatarUrl
    });
    
    if (updateError) {
      throw updateError;
    }
    
    // Update UI
    currentUserProfile.avatar_url = avatarUrl;
    updateUserAvatar();
    
    alert('تم رفع الصورة بنجاح!');
    
  } catch (error) {
    console.error('Avatar upload error:', error);
    alert('خطأ في رفع الصورة: ' + error.message);
  }
}

// Course handlers
async function loadCourses() {
  try {
    const { data: courses, error } = await getCourses();
    
    if (error) {
      throw error;
    }
    
    displayCourses(courses);
    
  } catch (error) {
    console.error('Error loading courses:', error);
    document.getElementById('courses-grid').innerHTML = '<p>خطأ في تحميل الكورسات</p>';
  }
}

async function displayCourses(courses) {
  const coursesGrid = document.getElementById('courses-grid');
  
  if (!courses || courses.length === 0) {
    coursesGrid.innerHTML = '<p>لا توجد كورسات متاحة حالياً</p>';
    return;
  }
  
  // التحقق من اشتراكات المستخدم لكل كورس
  const coursesWithAccess = await Promise.all(
    courses.map(async (course) => {
      if (!currentUser) {
        return { ...course, hasAccess: false };
      }
      
      const { data: access } = await checkUserCourseAccess(currentUser.id, course.id);
      return { ...course, hasAccess: !!access };
    })
  );
  
  coursesGrid.innerHTML = coursesWithAccess.map(course => `
    <div class="course-card">
      <img src="${course.image_url || 'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg'}" 
           alt="${course.title}" class="course-image">
      <div class="course-content">
        <h3 class="course-title">${course.title}</h3>
        <p class="course-description">${course.description}</p>
        <div class="course-price">${course.price} ج.م</div>
        <div class="course-actions">
          <button class="btn-primary" onclick="showCoursePreview('${course.id}')">معاينة</button>
          ${course.hasAccess 
            ? `<button class="btn-success" onclick="showCourseContent('${course.id}')">دخول الكورس</button>`
            : `<button class="btn-secondary" onclick="subscribeToCourse('${course.id}')">اشتراك</button>`
          }
        </div>
      </div>
    </div>
  `).join('');
}

async function showCoursePreview(courseId) {
  try {
    const { data: course, error } = await getCourse(courseId);
    
    if (error) {
      throw error;
    }
    
    currentCourse = course;
    displayCoursePreview(course);
    showPage('course-preview');
    
  } catch (error) {
    console.error('Error loading course preview:', error);
    alert('خطأ في تحميل معاينة الكورس');
  }
}

function displayCoursePreview(course) {
  document.getElementById('course-preview-title').textContent = course.title;
  
  const previewContent = document.getElementById('course-preview-content');
  
  const lecturesHtml = course.lectures && course.lectures.length > 0 
    ? course.lectures.map(lecture => `
        <div class="lecture-preview-item">
          <h6><i class="fas fa-play-circle"></i> ${lecture.title}</h6>
          <p>${lecture.description || 'لا يوجد وصف'}</p>
          <p class="lecture-duration">المدة: ${lecture.duration || 0} دقيقة</p>
          ${lecture.lecture_materials && lecture.lecture_materials.length > 0 ? `
            <div class="materials-preview">
              <strong>المواد:</strong>
              ${lecture.lecture_materials.map(material => `
                <span class="material-type">${getMaterialTypeIcon(material.type)} ${material.title}</span>
              `).join(', ')}
            </div>
          ` : ''}
        </div>
      `).join('')
    : '<p>لا توجد محاضرات متاحة</p>';
  
  previewContent.innerHTML = `
    <img src="${course.image_url || 'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg'}" 
         alt="${course.title}" class="course-preview-image">
    <div class="course-info">
      <h4>وصف الكورس</h4>
      <p>${course.description}</p>
      <p><strong>السعر:</strong> ${course.price} ج.م</p>
    </div>
    <div class="course-lectures">
      <h5>المحاضرات</h5>
      ${lecturesHtml}
    </div>
  `;
}

async function subscribeToCourse(courseId) {
  // التحقق أولاً من وجود اشتراك سابق
  const { data: existingAccess } = await checkUserCourseAccess(currentUser.id, courseId);
  
  if (existingAccess) {
    // المستخدم مشترك بالفعل، انتقل مباشرة للكورس
    showCourseContent(courseId);
    return;
  }
  
  currentCourseId = courseId;
  
  // Get course details for modal
  try {
    const { data: course, error } = await getCourse(courseId);
    
    if (error) {
      throw error;
    }
    
    document.getElementById('course-details').innerHTML = `
      <h4>${course.title}</h4>
      <p>${course.description}</p>
      <p><strong>السعر:</strong> ${course.price} ج.م</p>
    `;
    
    showModal('subscription-modal');
    
  } catch (error) {
    console.error('Error loading course for subscription:', error);
    alert('خطأ في تحميل بيانات الكورس');
  }
}

async function handleCourseSubscription(e) {
  e.preventDefault();
  
  const code = document.getElementById('subscription-code').value;
  
  if (!currentCourseId) {
    alert('خطأ: لم يتم تحديد الكورس');
    return;
  }
  
  try {
    // Validate subscription code
    const { data: validCode, error: validationError } = await validateSubscriptionCode(code, currentCourseId);
    
    if (validationError) {
      throw validationError;
    }
    
    // Use subscription code
    const { data: access, error: useError } = await useSubscriptionCode(validCode.id, currentUser.id, currentCourseId);
    
    if (useError) {
      throw useError;
    }
    
    alert('تم الاشتراك في الكورس بنجاح!');
    closeModal();
    
    // Clear form
    document.getElementById('subscription-code').value = '';
    
    // إعادة تحميل الكورسات لتحديث حالة الاشتراك
    await loadCourses();
    
    // Show course content
    showCourseContent(currentCourseId);
    
  } catch (error) {
    console.error('Subscription error:', error);
    alert('خطأ في الاشتراك: ' + error.message);
  }
}

async function showCourseContent(courseId) {
  try {
    // Check if user has access
    const { data: access, error: accessError } = await checkUserCourseAccess(currentUser.id, courseId);
    
    if (accessError || !access) {
      alert('ليس لديك صلاحية للوصول إلى هذا الكورس');
      return;
    }
    
    // Load course with lectures
    const { data: course, error } = await getCourse(courseId);
    
    if (error) {
      throw error;
    }
    
    currentCourse = course;
    displayCourseContent(course);
    showPage('course-content');
    
  } catch (error) {
    console.error('Error loading course content:', error);
    alert('خطأ في تحميل محتوى الكورس');
  }
}

function displayCourseContent(course) {
  document.getElementById('course-content-title').textContent = course.title;
  
  const wrapper = document.getElementById('course-content-wrapper');
  
  if (!course.lectures || course.lectures.length === 0) {
    wrapper.innerHTML = '<p>لا توجد محاضرات متاحة في هذا الكورس</p>';
    return;
  }
  
  // Sort lectures by order
  const sortedLectures = course.lectures.sort((a, b) => a.order_index - b.order_index);
  
  wrapper.innerHTML = `
    <div class="course-layout">
      <!-- منطقة عرض المحتوى الرئيسي -->
      <div class="main-content-area">
        <div id="material-viewer">
          <div class="welcome-message">
            <h3>مرحباً بك في كورس ${course.title}</h3>
            <p>اختر محاضرة من القائمة الجانبية للبدء</p>
          </div>
        </div>
      </div>
      
      <!-- الشريط الجانبي للمحاضرات -->
      <div class="course-sidebar">
        <h4>المحاضرات</h4>
        <div class="lectures-list">
          ${sortedLectures.map((lecture, index) => `
            <div class="lecture-sidebar-item ${index === 0 ? 'active' : ''}" 
                 onclick="selectLecture('${lecture.id}', this)">
              <h6>${lecture.title}</h6>
              <p>${lecture.duration || 0} دقيقة</p>
              <span class="materials-count">${lecture.lecture_materials?.length || 0} مادة</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- منطقة المواد في الأسفل -->
      <div class="materials-bottom-panel">
        <div class="materials-header">
          <h5 id="current-lecture-title">اختر محاضرة لعرض موادها</h5>
        </div>
        <div class="materials-grid" id="materials-grid">
          <p class="no-materials">لا توجد مواد متاحة</p>
        </div>
      </div>
    </div>
  `;
  
  // Load first lecture by default
  if (sortedLectures.length > 0) {
    selectLecture(sortedLectures[0].id);
  }
}

// دالة محسنة لاختيار المحاضرة وعرض موادها
async function selectLecture(lectureId, clickedElement = null) {
  try {
    // Find lecture in current course
    const lecture = currentCourse.lectures.find(l => l.id === lectureId);
    
    if (!lecture) {
      throw new Error('المحاضرة غير موجودة');
    }
    
    currentLecture = lecture;
    
    // Update sidebar active state
    document.querySelectorAll('.lecture-sidebar-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // إضافة الفئة النشطة للعنصر المحدد
    if (clickedElement) {
      clickedElement.classList.add('active');
    } else {
      // إذا لم يتم تمرير العنصر، ابحث عنه باستخدام lectureId
      const targetElement = document.querySelector(`[onclick*="${lectureId}"]`);
      if (targetElement) {
        targetElement.classList.add('active');
      }
    }
    
    // Update lecture title in materials panel
    document.getElementById('current-lecture-title').textContent = lecture.title;
    
    // Display materials in bottom panel
    displayLectureMaterials(lecture);
    
    // Clear main content area
    document.getElementById('material-viewer').innerHTML = `
      <div class="lecture-info">
        <h3>${lecture.title}</h3>
        <p class="lecture-description">${lecture.description || 'لا يوجد وصف للمحاضرة'}</p>
        <p class="select-material-hint">اختر مادة من الأسفل لعرضها هنا</p>
      </div>
    `;
    
  } catch (error) {
    console.error('Error selecting lecture:', error);
    alert('خطأ في تحميل المحاضرة: ' + error.message);
  }
}

// دالة لعرض مواد المحاضرة في الأسفل
function displayLectureMaterials(lecture) {
  const materialsGrid = document.getElementById('materials-grid');
  
  // Sort materials by order
  const sortedMaterials = lecture.lecture_materials 
    ? lecture.lecture_materials.sort((a, b) => a.order_index - b.order_index)
    : [];
  
  if (sortedMaterials.length === 0) {
    materialsGrid.innerHTML = '<p class="no-materials">لا توجد مواد متاحة لهذه المحاضرة</p>';
    return;
  }
  
  materialsGrid.innerHTML = sortedMaterials.map(material => `
    <div class="material-card" onclick="selectMaterial('${material.id}')">
      <div class="material-icon">
        ${getMaterialTypeIcon(material.type)}
      </div>
      <div class="material-info">
        <h6>${material.title}</h6>
        <p class="material-type">${getMaterialTypeName(material.type)}</p>
        ${material.duration ? `<p class="material-duration">${material.duration} دقيقة</p>` : ''}
      </div>
    </div>
  `).join('');
}

// دالة لاختيار وعرض المادة في المنطقة الرئيسية
function selectMaterial(materialId) {
  const material = currentLecture.lecture_materials.find(m => m.id === materialId);
  
  if (!material) {
    alert('المادة غير موجودة');
    return;
  }
  
  currentMaterial = material;
  
  // Update active state in materials grid
  document.querySelectorAll('.material-card').forEach(card => {
    card.classList.remove('active');
  });
  
  event.target.closest('.material-card').classList.add('active');
  
  // Display material in main viewer
  displayMaterialInViewer(material);
}

// دالة لعرض المادة في المنطقة الرئيسية
function displayMaterialInViewer(material) {
  const materialViewer = document.getElementById('material-viewer');
  
  let materialContent = '';
  
  if (material.type === 'video') {
    const embedUrl = getYouTubeEmbedUrl(material.url);
    materialContent = `
      <div class="video-player">
        <iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
      </div>
    `;
  } else {
    materialContent = `
      <div class="file-viewer">
        <div class="file-info">
          <div class="file-icon-large">
            ${getMaterialTypeIcon(material.type)}
          </div>
          <h4>${material.title}</h4>
          <p>نوع الملف: ${getMaterialTypeName(material.type)}</p>
          ${material.duration ? `<p>المدة: ${material.duration} دقيقة</p>` : ''}
        </div>
        <div class="file-actions">
          <a href="${material.url}" target="_blank" class="btn-primary">
            <i class="fas fa-external-link-alt"></i> فتح في نافذة جديدة
          </a>
          <a href="${material.url}" download class="btn-secondary">
            <i class="fas fa-download"></i> تحميل
          </a>
        </div>
      </div>
    `;
  }
  
  materialViewer.innerHTML = `
    <div class="material-header">
      <h3>${material.title}</h3>
      <span class="material-type-badge">${getMaterialTypeName(material.type)}</span>
    </div>
    <div class="material-content">
      ${materialContent}
    </div>
  `;
}

function getMaterialTypeIcon(type) {
  const icons = {
    video: '<i class="fas fa-play-circle"></i>',
    pdf: '<i class="fas fa-file-pdf"></i>',
    document: '<i class="fas fa-file-word"></i>',
    image: '<i class="fas fa-image"></i>',
    audio: '<i class="fas fa-volume-up"></i>'
  };
  return icons[type] || '<i class="fas fa-file"></i>';
}

function getMaterialTypeName(type) {
  const names = {
    video: 'فيديو',
    pdf: 'ملف PDF',
    document: 'مستند',
    image: 'صورة',
    audio: 'ملف صوتي'
  };
  return names[type] || 'ملف';
}

// Instructor functions
async function loadInstructorData() {
  const hasInstructorRole = await hasAdminOrInstructorRole(currentUser.id);
  
  if (!hasInstructorRole) {
    alert('ليس لديك صلاحية للوصول إلى لوحة المدرب');
    showPage('home');
    return;
  }
  
  // Load instructor courses
  loadInstructorCourses();
}

async function loadInstructorCourses() {
  try {
    const { data: courses, error } = await getCourses();
    
    if (error) {
      throw error;
    }
    
    displayInstructorCourses(courses);
    
  } catch (error) {
    console.error('Error loading instructor courses:', error);
    document.getElementById('instructor-courses-list').innerHTML = '<p>خطأ في تحميل الكورسات</p>';
  }
}

function displayInstructorCourses(courses) {
  const coursesList = document.getElementById('instructor-courses-list');
  
  if (!courses || courses.length === 0) {
    coursesList.innerHTML = '<p>لا توجد كورسات</p>';
    return;
  }
  
  coursesList.innerHTML = courses.map(course => `
    <div class="admin-item">
      <div class="admin-item-info">
        <h4>${course.title}</h4>
        <p>${course.description}</p>
        <p><strong>السعر:</strong> ${course.price} ج.م</p>
        <p><strong>الفئة المستهدفة:</strong> ${course.target_level || 'الكل'}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-secondary" onclick="manageLectures('${course.id}')">إدارة المحاضرات</button>
        <button class="btn-danger" onclick="deleteCourseAdmin('${course.id}')">حذف</button>
      </div>
    </div>
  `).join('');
}

// Admin functions
async function loadAdminData() {
  const isUserAdmin = await isAdmin(currentUser.id);
  
  if (!isUserAdmin) {
    alert('ليس لديك صلاحية للوصول إلى لوحة التحكم');
    showPage('home');
    return;
  }
  
  // Load admin data for the default tab (courses)
  loadAdminCourses();
}

async function loadAdminCourses() {
  try {
    const { data: courses, error } = await getCourses();
    
    if (error) {
      throw error;
    }
    
    displayAdminCourses(courses);
    
  } catch (error) {
    console.error('Error loading admin courses:', error);
    document.getElementById('admin-courses-list').innerHTML = '<p>خطأ في تحميل الكورسات</p>';
  }
}

function displayAdminCourses(courses) {
  const coursesList = document.getElementById('admin-courses-list');
  
  if (!courses || courses.length === 0) {
    coursesList.innerHTML = '<p>لا توجد كورسات</p>';
    return;
  }
  
  coursesList.innerHTML = courses.map(course => `
    <div class="admin-item">
      <div class="admin-item-info">
        <h4>${course.title}</h4>
        <p>${course.description}</p>
        <p><strong>السعر:</strong> ${course.price} ج.م</p>
        <p><strong>الفئة المستهدفة:</strong> ${course.target_level || 'الكل'}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-secondary" onclick="manageLectures('${course.id}')">إدارة المحاضرات</button>
        <button class="btn-danger" onclick="deleteCourseAdmin('${course.id}')">حذف</button>
      </div>
    </div>
  `).join('');
}

async function loadAdminUsers() {
  try {
    const { data: users, error } = await getAllUsers();
    
    if (error) {
      throw error;
    }
    
    displayAdminUsers(users);
    
  } catch (error) {
    console.error('Error loading users:', error);
    document.getElementById('admin-users-list').innerHTML = '<p>خطأ في تحميل المستخدمين: ' + error.message + '</p>';
  }
}

function displayAdminUsers(users) {
  const usersList = document.getElementById('admin-users-list');
  
  if (!users || users.length === 0) {
    usersList.innerHTML = '<p>لا توجد مستخدمين</p>';
    return;
  }
  
  usersList.innerHTML = users.map(user => `
    <div class="admin-item">
      <div class="admin-item-info">
        <h4>${user.full_name}</h4>
        <p><span class="user-id">ID: ${user.user_id}</span></p>
        <p><strong>المرحلة:</strong> ${user.education_level}</p>
        <p><strong>الدور:</strong> ${getRoleDisplayName(user.role)}</p>
        <p><strong>عدد الكورسات:</strong> ${user.enrolled_courses_count || 0}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-secondary" onclick="editUserRole('${user.user_id}', '${user.full_name}', '${user.role}')">تعديل الدور</button>
      </div>
    </div>
  `).join('');
}

async function loadAdminCodes() {
  try {
    const { data: codes, error } = await getSubscriptionCodes();
    
    if (error) {
      throw error;
    }
    
    displayAdminCodes(codes);
    
  } catch (error) {
    console.error('Error loading subscription codes:', error);
    document.getElementById('admin-codes-list').innerHTML = '<p>خطأ في تحميل الأكواد</p>';
  }
}

function displayAdminCodes(codes) {
  const codesList = document.getElementById('admin-codes-list');
  
  if (!codes || codes.length === 0) {
    codesList.innerHTML = '<p>لا توجد أكواد اشتراك</p>';
    return;
  }
  
  codesList.innerHTML = codes.map(code => `
    <div class="admin-item">
      <div class="admin-item-info">
        <h4>${code.code}</h4>
        <p><strong>الكورس:</strong> ${code.courses?.title || 'غير محدد'}</p>
        <p><strong>مدة الصلاحية:</strong> ${code.validity_days} يوم</p>
        <p><strong>الاستخدام:</strong> ${code.used_count}/${code.usage_limit}</p>
        <p><strong>ينتهي في:</strong> ${new Date(code.expires_at).toLocaleDateString('ar-EG')}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-secondary" onclick="editCode('${code.id}', '${code.code}', ${code.validity_days}, ${code.usage_limit})">تعديل</button>
        <button class="btn-danger" onclick="deleteCode('${code.id}')">حذف</button>
      </div>
    </div>
  `).join('');
}

// User search functions
async function handleUserSearch() {
  const searchTerm = document.getElementById('user-search').value.trim();
  
  if (!searchTerm) {
    alert('يرجى إدخال معرف المستخدم للبحث');
    return;
  }
  
  try {
    const { data: users, error } = await searchUsersByID(searchTerm);
    
    if (error) {
      throw error;
    }
    
    displayAdminUsers(users);
    
  } catch (error) {
    console.error('Error searching users:', error);
    alert('خطأ في البحث: ' + error.message);
  }
}

async function handleClearSearch() {
  document.getElementById('user-search').value = '';
  await loadAdminUsers();
}

// Admin form handlers
async function handleCreateCourse(e) {
  e.preventDefault();
  
  const title = document.getElementById('course-title').value;
  const description = document.getElementById('course-description').value;
  const price = parseFloat(document.getElementById('course-price').value);
  const targetLevel = document.getElementById('course-target-level').value;
  const imageUrl = document.getElementById('course-image').value;
  
  console.log('Form data:', { title, description, price, targetLevel, imageUrl });
  
  try {
    const courseData = {
      title,
      description,
      price,
      target_level: targetLevel,
      image_url: imageUrl || null
    };
    
    console.log('Sending course data:', courseData);
    
    const { data, error } = await createCourse(courseData);
    
    if (error) {
      console.error('Create course error:', error);
      throw error;
    }
    
    console.log('Course created successfully:', data);
    
    alert('تم إنشاء الكورس بنجاح!');
    closeModal();
    
    // Reset form
    document.getElementById('createCourseForm').reset();
    
    // Reload courses based on current page
    const currentPage = document.querySelector('.page.active').id;
    if (currentPage === 'admin-page') {
      await loadAdminCourses();
    } else if (currentPage === 'instructor-page') {
      await loadInstructorCourses();
    }
    
  } catch (error) {
    console.error('Error creating course:', error);
    alert('خطأ في إنشاء الكورس: ' + error.message);
  }
}

async function handleCreateCode(e) {
  e.preventDefault();
  
  const courseId = document.getElementById('code-course').value;
  const code = document.getElementById('code-value').value;
  const validityDays = parseInt(document.getElementById('code-validity').value);
  const usageLimit = parseInt(document.getElementById('code-usage-limit').value);
  
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);
    
    const { data, error } = await createSubscriptionCode({
      course_id: courseId,
      code,
      validity_days: validityDays,
      expires_at: expiresAt.toISOString(),
      usage_limit: usageLimit
    });
    
    if (error) {
      throw error;
    }
    
    alert('تم إنشاء الكود بنجاح!');
    closeModal();
    
    // Reset form
    document.getElementById('createCodeForm').reset();
    
    // Reload codes
    await loadAdminCodes();
    
  } catch (error) {
    console.error('Error creating code:', error);
    alert('خطأ في إنشاء الكود: ' + error.message);
  }
}

async function handleEditCode(e) {
  e.preventDefault();
  
  const codeId = document.getElementById('editCodeForm').dataset.codeId;
  const code = document.getElementById('edit-code-value').value;
  const validityDays = parseInt(document.getElementById('edit-code-validity').value);
  const usageLimit = parseInt(document.getElementById('edit-code-usage-limit').value);
  
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);
    
    const { data, error } = await updateSubscriptionCode(codeId, {
      code,
      validity_days: validityDays,
      expires_at: expiresAt.toISOString(),
      usage_limit: usageLimit
    });
    
    if (error) {
      throw error;
    }
    
    alert('تم تحديث الكود بنجاح!');
    closeModal();
    
    // Reload codes
    await loadAdminCodes();
    
  } catch (error) {
    console.error('Error updating code:', error);
    alert('خطأ في تحديث الكود: ' + error.message);
  }
}

async function handleEditUserRole(e) {
  e.preventDefault();
  
  const userId = document.getElementById('editUserRoleForm').dataset.userId;
  const newRole = document.getElementById('edit-user-role').value;
  
  try {
    const { data, error } = await updateUserRole(userId, newRole);
    
    if (error) {
      throw error;
    }
    
    alert('تم تحديث دور المستخدم بنجاح!');
    closeModal();
    
    // Reload users
    await loadAdminUsers();
    
  } catch (error) {
    console.error('Error updating user role:', error);
    alert('خطأ في تحديث دور المستخدم: ' + error.message);
  }
}

async function handleCreateLecture(e) {
  e.preventDefault();
  
  const title = document.getElementById('lecture-title').value;
  const description = document.getElementById('lecture-description').value;
  const duration = parseInt(document.getElementById('lecture-duration').value) || 0;
  const orderIndex = parseInt(document.getElementById('lecture-order').value) || 0;
  
  try {
    const { data, error } = await createLecture({
      course_id: currentCourseId,
      title,
      description,
      duration,
      order_index: orderIndex
    });
    
    if (error) {
      throw error;
    }
    
    alert('تم إضافة المحاضرة بنجاح!');
    closeModal();
    
    // Reset form
    document.getElementById('createLectureForm').reset();
    
    // Reload lectures
    await loadCourseLectures();
    
  } catch (error) {
    console.error('Error creating lecture:', error);
    alert('خطأ في إضافة المحاضرة: ' + error.message);
  }
}

async function handleCreateMaterial(e) {
  e.preventDefault();
  
  const title = document.getElementById('material-title').value;
  const type = document.getElementById('material-type').value;
  const duration = parseInt(document.getElementById('material-duration').value) || 0;
  const orderIndex = parseInt(document.getElementById('material-order').value) || 0;
  
  let url = '';
  
  // تحديد الرابط حسب طريقة الرفع
  if (type === 'video') {
    const selectedMethod = document.querySelector('input[name="video-method"]:checked').value;
    if (selectedMethod === 'url') {
      url = document.getElementById('material-url').value;
    } else {
      // للفيديو المرفوع، الرابط موجود بالفعل في حقل material-url
      url = document.getElementById('material-url').value;
      if (!url) {
        alert('يرجى رفع الفيديو أولاً');
        return;
      }
    }
  } else {
    url = document.getElementById('material-url').value;
  }
  
  if (!url) {
    alert('يرجى إدخال رابط المادة');
    return;
  }
  
  try {
    const { data, error } = await createLectureMaterial({
      lecture_id: currentLectureId,
      title,
      type,
      url,
      duration,
      order_index: orderIndex
    });
    
    if (error) {
      throw error;
    }
    
    alert('تم إضافة المادة بنجاح!');
    closeModal();
    
    // Reset form
    document.getElementById('createMaterialForm').reset();
    
    // إخفاء خيارات رفع الفيديو
    document.getElementById('video-upload-options').style.display = 'none';
    document.getElementById('video-url-input').style.display = 'block';
    document.getElementById('video-file-input').style.display = 'none';
    
    // إعادة تعيين منطقة رفع الملف
    const placeholder = document.querySelector('.file-upload-placeholder');
    const progressContainer = document.getElementById('file-upload-progress');
    const successContainer = document.getElementById('file-upload-success');
    
    placeholder.style.display = 'block';
    progressContainer.style.display = 'none';
    successContainer.style.display = 'none';
    
    // Reload materials
    await loadLectureMaterials();
    
  } catch (error) {
    console.error('Error creating material:', error);
    alert('خطأ في إضافة المادة: ' + error.message);
  }
}

// Admin action functions
async function deleteCourseAdmin(courseId) {
  if (!confirm('هل أنت متأكد من حذف هذا الكورس؟')) {
    return;
  }
  
  try {
    const { error } = await deleteCourse(courseId);
    
    if (error) {
      throw error;
    }
    
    alert('تم حذف الكورس بنجاح!');
    
    // Reload courses based on current page
    const currentPage = document.querySelector('.page.active').id;
    if (currentPage === 'admin-page') {
      await loadAdminCourses();
    } else if (currentPage === 'instructor-page') {
      await loadInstructorCourses();
    }
    
  } catch (error) {
    console.error('Error deleting course:', error);
    alert('خطأ في حذف الكورس: ' + error.message);
  }
}

async function deleteCode(codeId) {
  if (!confirm('هل أنت متأكد من حذف هذا الكود؟')) {
    return;
  }
  
  try {
    const { error } = await deleteSubscriptionCode(codeId);
    
    if (error) {
      throw error;
    }
    
    alert('تم حذف الكود بنجاح!');
    await loadAdminCodes();
    
  } catch (error) {
    console.error('Error deleting code:', error);
    alert('خطأ في حذف الكود: ' + error.message);
  }
}

function editCode(codeId, code, validityDays, usageLimit) {
  document.getElementById('edit-code-value').value = code;
  document.getElementById('edit-code-validity').value = validityDays;
  document.getElementById('edit-code-usage-limit').value = usageLimit;
  document.getElementById('editCodeForm').dataset.codeId = codeId;
  
  showModal('edit-code-modal');
}

function editUserRole(userId, userName, currentRole) {
  document.getElementById('edit-user-name').value = userName;
  document.getElementById('edit-user-role').value = currentRole;
  document.getElementById('editUserRoleForm').dataset.userId = userId;
  
  showModal('edit-user-role-modal');
}

// إصلاح دالة manageLectures لمنع تكرار النوافذ
async function manageLectures(courseId) {
  // التأكد من إغلاق أي نوافذ مفتوحة أولاً
  closeModal();
  
  // انتظار قصير للتأكد من إغلاق النوافذ
  await new Promise(resolve => setTimeout(resolve, 100));
  
  currentCourseId = courseId;
  
  // تحميل بيانات الكورس مع المحاضرات
  try {
    const { data: course, error } = await getCourse(courseId);
    
    if (error) {
      throw error;
    }
    
    currentCourse = course;
    displayLecturesList(course.lectures || []);
    
    // عرض النافذة مرة واحدة فقط
    showModal('manage-lectures-modal');
    
  } catch (error) {
    console.error('Error loading course lectures:', error);
    document.getElementById('lectures-list').innerHTML = '<p>خطأ في تحميل المحاضرات</p>';
    showModal('manage-lectures-modal');
  }
}

async function loadCourseLectures() {
  try {
    const { data: course, error } = await getCourse(currentCourseId);
    
    if (error) {
      throw error;
    }
    
    currentCourse = course;
    displayLecturesList(course.lectures || []);
    
  } catch (error) {
    console.error('Error loading lectures:', error);
    document.getElementById('lectures-list').innerHTML = '<p>خطأ في تحميل المحاضرات</p>';
  }
}

function displayLecturesList(lectures) {
  const lecturesList = document.getElementById('lectures-list');
  
  if (!lectures || lectures.length === 0) {
    lecturesList.innerHTML = '<p>لا توجد محاضرات</p>';
    return;
  }
  
  lecturesList.innerHTML = lectures.map(lecture => `
    <div class="lecture-item">
      <div class="lecture-info">
        <h5>${lecture.title}</h5>
        <p>${lecture.description || 'لا يوجد وصف'}</p>
        <p><strong>المدة:</strong> ${lecture.duration || 0} دقيقة</p>
        <p><strong>الترتيب:</strong> ${lecture.order_index}</p>
        <p><strong>عدد المواد:</strong> ${lecture.lecture_materials?.length || 0}</p>
      </div>
      <div class="lecture-actions">
        <button class="btn-secondary" onclick="manageMaterials('${lecture.id}')">إدارة المواد</button>
        <button class="btn-danger" onclick="deleteLectureAdmin('${lecture.id}')">حذف</button>
      </div>
    </div>
  `).join('');
}

// إصلاح دالة manageMaterials لمنع تكرار النوافذ
async function manageMaterials(lectureId) {
  // التأكد من إغلاق أي نوافذ مفتوحة أولاً
  closeModal();
  
  // انتظار قصير للتأكد من إغلاق النوافذ
  await new Promise(resolve => setTimeout(resolve, 100));
  
  currentLectureId = lectureId;
  
  // العثور على المحاضرة في الكورس الحالي
  const lecture = currentCourse?.lectures?.find(l => l.id === lectureId);
  
  if (lecture) {
    displayMaterialsList(lecture.lecture_materials || []);
  } else {
    document.getElementById('materials-list').innerHTML = '<p>لا توجد مواد</p>';
  }
  
  // عرض النافذة مرة واحدة فقط
  showModal('manage-materials-modal');
}

async function loadLectureMaterials() {
  try {
    // العثور على المحاضرة في الكورس الحالي
    const lecture = currentCourse?.lectures?.find(l => l.id === currentLectureId);
    
    if (!lecture) {
      throw new Error('المحاضرة غير موجودة');
    }
    
    displayMaterialsList(lecture.lecture_materials || []);
    
  } catch (error) {
    console.error('Error loading materials:', error);
    document.getElementById('materials-list').innerHTML = '<p>خطأ في تحميل المواد</p>';
  }
}

function displayMaterialsList(materials) {
  const materialsList = document.getElementById('materials-list');
  
  if (!materials || materials.length === 0) {
    materialsList.innerHTML = '<p>لا توجد مواد</p>';
    return;
  }
  
  materialsList.innerHTML = materials.map(material => `
    <div class="material-item">
      <div class="material-info">
        <h6>${getMaterialTypeIcon(material.type)} ${material.title}</h6>
        <p><strong>النوع:</strong> ${material.type}</p>
        <p><strong>الرابط:</strong> <a href="${material.url}" target="_blank">عرض</a></p>
        ${material.duration ? `<p><strong>المدة:</strong> ${material.duration} دقيقة</p>` : ''}
        <p><strong>الترتيب:</strong> ${material.order_index}</p>
      </div>
      <div class="material-actions">
        <button class="btn-danger" onclick="deleteMaterialAdmin('${material.id}')">حذف</button>
      </div>
    </div>
  `).join('');
}

async function deleteLectureAdmin(lectureId) {
  if (!confirm('هل أنت متأكد من حذف هذه المحاضرة؟')) {
    return;
  }
  
  try {
    const { error } = await deleteLecture(lectureId);
    
    if (error) {
      throw error;
    }
    
    alert('تم حذف المحاضرة بنجاح!');
    await loadCourseLectures();
    
  } catch (error) {
    console.error('Error deleting lecture:', error);
    alert('خطأ في حذف المحاضرة: ' + error.message);
  }
}

async function deleteMaterialAdmin(materialId) {
  if (!confirm('هل أنت متأكد من حذف هذه المادة؟')) {
    return;
  }
  
  try {
    const { error } = await deleteLectureMaterial(materialId);
    
    if (error) {
      throw error;
    }
    
    alert('تم حذف المادة بنجاح!');
    
    // إعادة تحميل بيانات الكورس لتحديث المواد
    const { data: course, error: courseError } = await getCourse(currentCourseId);
    if (!courseError) {
      currentCourse = course;
      await loadLectureMaterials();
    }
    
  } catch (error) {
    console.error('Error deleting material:', error);
    alert('خطأ في حذف المادة: ' + error.message);
  }
}

// Modal functions - إصلاح لمنع تكرار النوافذ
function showModal(modalId) {
  // إغلاق جميع النوافذ أولاً
  closeModal();
  
  // انتظار قصير ثم عرض النافذة المطلوبة
  setTimeout(() => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modalOverlay.classList.add('active');
      modal.style.display = 'block';
    }
  }, 50);
}

function closeModal() {
  modalOverlay.classList.remove('active');
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
}

function showCreateLectureModal() {
  showModal('create-lecture-modal');
}

function showCreateMaterialModal() {
  showModal('create-material-modal');
}

// Utility functions
function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  document.getElementById('code-value').value = result;
}

async function loadCoursesForCodeModal() {
  try {
    const { data: courses, error } = await getCourses();
    
    if (error) {
      throw error;
    }
    
    const courseSelect = document.getElementById('code-course');
    courseSelect.innerHTML = '<option value="">اختر الكورس</option>' +
      courses.map(course => `<option value="${course.id}">${course.title}</option>`).join('');
    
  } catch (error) {
    console.error('Error loading courses for modal:', error);
  }
}

function toggleTheme() {
  const body = document.body;
  const themeIcon = document.querySelector('#theme-toggle i');
  
  if (body.getAttribute('data-theme') === 'dark') {
    body.removeAttribute('data-theme');
    themeIcon.className = 'fas fa-moon';
    localStorage.setItem('theme', 'light');
  } else {
    body.setAttribute('data-theme', 'dark');
    themeIcon.className = 'fas fa-sun';
    localStorage.setItem('theme', 'dark');
  }
}

// Load saved theme
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  const themeIcon = document.querySelector('#theme-toggle i');
  
  if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    themeIcon.className = 'fas fa-sun';
  }
});

// Make functions globally available
window.showCoursePreview = showCoursePreview;
window.subscribeToCourse = subscribeToCourse;
window.showCourseContent = showCourseContent;
window.selectLecture = selectLecture;
window.selectMaterial = selectMaterial;
window.deleteCourseAdmin = deleteCourseAdmin;
window.deleteCode = deleteCode;
window.editCode = editCode;
window.editUserRole = editUserRole;
window.manageLectures = manageLectures;
window.manageMaterials = manageMaterials;
window.deleteLectureAdmin = deleteLectureAdmin;
window.deleteMaterialAdmin = deleteMaterialAdmin;
window.showCreateLectureModal = showCreateLectureModal;
window.showCreateMaterialModal = showCreateMaterialModal;
