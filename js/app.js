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
  getCourseLectures,
  createCourse,
  deleteCourse,
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
  checkUserCourseAccess,
  getAllUsers,
  searchUsersByID,
  updateUserRole,
  isAdmin,
  hasAdminOrInstructorRole,
  uploadAvatar,
  uploadVideo,
  getYouTubeVideoId,
  getYouTubeEmbedUrl,
  getRoleDisplayName
} from './supabase.js';

// Global variables
let currentUser = null;
let currentUserProfile = null;
let currentCourse = null;
let currentLecture = null;
let currentMaterial = null;
let currentCourseId = null;
let currentLectureId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('تطبيق بدء التحميل...');
    
    // إخفاء شاشة التحميل وإظهار المحتوى
    hideLoading();
    
    // التحقق من حالة المستخدم
    await checkAuthState();
    
    // إعداد مستمعي الأحداث
    setupEventListeners();
    
    console.log('تم تحميل التطبيق بنجاح');
  } catch (error) {
    console.error('خطأ في تحميل التطبيق:', error);
    hideLoading();
    showError('حدث خطأ في تحميل التطبيق. يرجى إعادة تحميل الصفحة.');
  }
});

// Hide loading screen
function hideLoading() {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
}

// Show loading screen
function showLoading() {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = 'flex';
  }
}

// Check authentication state
async function checkAuthState() {
  try {
    console.log('فحص حالة المصادقة...');
    
    currentUser = await getCurrentUser();
    console.log('المستخدم الحالي:', currentUser);
    
    if (currentUser) {
      // المستخدم مسجل الدخول
      const { data: profile, error } = await getUserProfile(currentUser.id);
      if (error) {
        console.error('خطأ في جلب الملف الشخصي:', error);
        await signOut();
        showAuth();
        return;
      }
      
      currentUserProfile = profile;
      console.log('الملف الشخصي:', currentUserProfile);
      
      showMainApp();
      await loadCourses();
    } else {
      // المستخدم غير مسجل الدخول
      console.log('المستخدم غير مسجل الدخول');
      showAuth();
    }
  } catch (error) {
    console.error('خطأ في فحص حالة المصادقة:', error);
    showAuth();
  }
}

// Show authentication screen
function showAuth() {
  document.getElementById('auth-container').style.display = 'flex';
  document.getElementById('main-container').style.display = 'none';
}

// Show main application
function showMainApp() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('main-container').style.display = 'block';
  
  // تحديث معلومات المستخدم في الواجهة
  updateUserInterface();
  
  // إظهار الصفحة الرئيسية
  showPage('home');
}

// Update user interface
function updateUserInterface() {
  if (!currentUserProfile) return;
  
  // تحديث الصورة الشخصية
  const avatarElements = document.querySelectorAll('#user-avatar, #profile-avatar');
  avatarElements.forEach(avatar => {
    if (currentUserProfile.avatar_url) {
      avatar.src = currentUserProfile.avatar_url;
    }
  });
  
  // إظهار/إخفاء روابط الأدمن والمدرب
  const isAdminUser = currentUserProfile.is_admin || currentUserProfile.role === 'admin';
  const isInstructorUser = currentUserProfile.role === 'instructor' || isAdminUser;
  
  // روابط المدرب
  const instructorLinks = document.querySelectorAll('#instructor-link, #instructor-dropdown-link');
  instructorLinks.forEach(link => {
    link.style.display = isInstructorUser ? 'block' : 'none';
  });
  
  // روابط الأدمن
  const adminLinks = document.querySelectorAll('#admin-link, #admin-dropdown-link');
  adminLinks.forEach(link => {
    link.style.display = isAdminUser ? 'block' : 'none';
  });
}

// Setup event listeners
function setupEventListeners() {
  try {
    console.log('إعداد مستمعي الأحداث...');
    
    // Authentication forms
    setupAuthEventListeners();
    
    // Navigation
    setupNavigationEventListeners();
    
    // Profile
    setupProfileEventListeners();
    
    // Course management
    setupCourseEventListeners();
    
    // Admin functions
    setupAdminEventListeners();
    
    // Instructor functions
    setupInstructorEventListeners();
    
    // Modal functions
    setupModalEventListeners();
    
    // Theme toggle
    setupThemeToggle();
    
    console.log('تم إعداد مستمعي الأحداث بنجاح');
  } catch (error) {
    console.error('خطأ في إعداد مستمعي الأحداث:', error);
  }
}

// Setup authentication event listeners
function setupAuthEventListeners() {
  // تبديل بين نماذج تسجيل الدخول والتسجيل
  const showRegisterBtn = document.getElementById('show-register');
  const showLoginBtn = document.getElementById('show-login');
  
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('register-form').style.display = 'block';
    });
  }
  
  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('register-form').style.display = 'none';
      document.getElementById('login-form').style.display = 'block';
    });
  }
  
  // نموذج تسجيل الدخول
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // نموذج التسجيل
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
  
  // تسجيل الخروج
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

// Setup navigation event listeners
function setupNavigationEventListeners() {
  // Navigation links
  const navLinks = document.querySelectorAll('.nav-link, .dropdown-menu a[data-page]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-page');
      if (page) {
        showPage(page);
      }
    });
  });
  
  // Brand logo click
  const brandLogo = document.getElementById('brand-logo');
  if (brandLogo) {
    brandLogo.addEventListener('click', () => {
      showPage('home');
    });
  }
  
  // Back buttons
  const backToCourses = document.getElementById('back-to-courses');
  const backToCoursesFromContent = document.getElementById('back-to-courses-from-content');
  
  if (backToCourses) {
    backToCourses.addEventListener('click', () => {
      showPage('home');
    });
  }
  
  if (backToCoursesFromContent) {
    backToCoursesFromContent.addEventListener('click', () => {
      showPage('home');
    });
  }
}

// Setup profile event listeners
function setupProfileEventListeners() {
  // Profile form
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileUpdate);
  }
  
  // Avatar upload
  const uploadAvatarBtn = document.getElementById('upload-avatar-btn');
  const avatarInput = document.getElementById('avatar-input');
  
  if (uploadAvatarBtn && avatarInput) {
    uploadAvatarBtn.addEventListener('click', () => {
      avatarInput.click();
    });
    
    avatarInput.addEventListener('change', handleAvatarUpload);
  }
}

// Setup course event listeners
function setupCourseEventListeners() {
  // Course subscription
  const subscriptionForm = document.getElementById('subscriptionForm');
  if (subscriptionForm) {
    subscriptionForm.addEventListener('submit', handleCourseSubscription);
  }
}

// Setup admin event listeners
function setupAdminEventListeners() {
  // Admin tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      showAdminTab(tab);
    });
  });
  
  // Create course
  const createCourseBtn = document.getElementById('create-course-btn');
  if (createCourseBtn) {
    createCourseBtn.addEventListener('click', () => {
      showModal('create-course-modal');
    });
  }
  
  // Create course form
  const createCourseForm = document.getElementById('createCourseForm');
  if (createCourseForm) {
    createCourseForm.addEventListener('submit', handleCreateCourse);
  }
  
  // Create code
  const createCodeBtn = document.getElementById('create-code-btn');
  if (createCodeBtn) {
    createCodeBtn.addEventListener('click', () => {
      loadCoursesForCodeModal();
      showModal('create-code-modal');
    });
  }
  
  // Create code form
  const createCodeForm = document.getElementById('createCodeForm');
  if (createCodeForm) {
    createCodeForm.addEventListener('submit', handleCreateCode);
  }
  
  // Generate random code
  const generateCodeBtn = document.getElementById('generate-code-btn');
  if (generateCodeBtn) {
    generateCodeBtn.addEventListener('click', generateRandomCode);
  }
  
  // Edit code form
  const editCodeForm = document.getElementById('editCodeForm');
  if (editCodeForm) {
    editCodeForm.addEventListener('submit', handleEditCode);
  }
  
  // Edit user role form
  const editUserRoleForm = document.getElementById('editUserRoleForm');
  if (editUserRoleForm) {
    editUserRoleForm.addEventListener('submit', handleEditUserRole);
  }
  
  // User search
  const searchUsersBtn = document.getElementById('search-users-btn');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  
  if (searchUsersBtn) {
    searchUsersBtn.addEventListener('click', handleUserSearch);
  }
  
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      document.getElementById('user-search').value = '';
      loadAllUsers();
    });
  }
}

// Setup instructor event listeners
function setupInstructorEventListeners() {
  // Instructor create course
  const instructorCreateCourseBtn = document.getElementById('instructor-create-course-btn');
  if (instructorCreateCourseBtn) {
    instructorCreateCourseBtn.addEventListener('click', () => {
      showModal('create-course-modal');
    });
  }
  
  // Create lecture form
  const createLectureForm = document.getElementById('createLectureForm');
  if (createLectureForm) {
    createLectureForm.addEventListener('submit', handleCreateLecture);
  }
  
  // Create material form
  const createMaterialForm = document.getElementById('createMaterialForm');
  if (createMaterialForm) {
    createMaterialForm.addEventListener('submit', handleCreateMaterial);
  }
  
  // Material type change
  const materialTypeSelect = document.getElementById('material-type');
  if (materialTypeSelect) {
    materialTypeSelect.addEventListener('change', handleMaterialTypeChange);
  }
  
  // Video upload method change
  const videoMethodRadios = document.querySelectorAll('input[name="video-method"]');
  videoMethodRadios.forEach(radio => {
    radio.addEventListener('change', handleVideoMethodChange);
  });
  
  // File input for video upload
  const materialFileInput = document.getElementById('material-file');
  if (materialFileInput) {
    materialFileInput.addEventListener('change', handleVideoFileSelect);
  }
}

// Setup modal event listeners
function setupModalEventListeners() {
  // Modal close buttons
  const modalCloses = document.querySelectorAll('.modal-close');
  modalCloses.forEach(close => {
    close.addEventListener('click', () => {
      hideModal();
    });
  });
  
  // Modal overlay click
  const modalOverlay = document.getElementById('modal-overlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        hideModal();
      }
    });
  }
}

// Setup theme toggle
function setupThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Load saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    showLoading();
    const { data, error } = await signIn(email, password);
    
    if (error) {
      throw error;
    }
    
    // إعادة فحص حالة المصادقة
    await checkAuthState();
    
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    showError('خطأ في تسجيل الدخول: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Handle register
async function handleRegister(e) {
  e.preventDefault();
  
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const level = document.getElementById('registerLevel').value;
  
  try {
    showLoading();
    const { data, error } = await signUp(email, password, {
      full_name: name,
      education_level: level
    });
    
    if (error) {
      throw error;
    }
    
    showSuccess('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول.');
    
    // التبديل إلى نموذج تسجيل الدخول
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    
    // مسح النموذج
    document.getElementById('registerForm').reset();
    
  } catch (error) {
    console.error('خطأ في التسجيل:', error);
    showError('خطأ في التسجيل: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Handle logout
async function handleLogout() {
  try {
    await signOut();
    currentUser = null;
    currentUserProfile = null;
    showAuth();
    showSuccess('تم تسجيل الخروج بنجاح');
  } catch (error) {
    console.error('خطأ في تسجيل الخروج:', error);
    showError('خطأ في تسجيل الخروج');
  }
}

// Show page
function showPage(pageName) {
  // إخفاء جميع الصفحات
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => {
    page.classList.remove('active');
  });
  
  // إظهار الصفحة المطلوبة
  const targetPage = document.getElementById(`${pageName}-page`);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  // تحديث النافجيشن
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-page') === pageName) {
      link.classList.add('active');
    }
  });
  
  // تحميل محتوى الصفحة
  switch (pageName) {
    case 'home':
      loadCourses();
      break;
    case 'profile':
      loadProfile();
      break;
    case 'admin':
      loadAdminDashboard();
      break;
    case 'instructor':
      loadInstructorDashboard();
      break;
  }
}

// Load courses
async function loadCourses() {
  try {
    const { data: courses, error } = await getCourses();
    
    if (error) {
      throw error;
    }
    
    displayCourses(courses || []);
    
  } catch (error) {
    console.error('خطأ في تحميل الكورسات:', error);
    showError('خطأ في تحميل الكورسات');
  }
}

// Display courses
function displayCourses(courses) {
  const coursesGrid = document.getElementById('courses-grid');
  if (!coursesGrid) return;
  
  if (courses.length === 0) {
    coursesGrid.innerHTML = '<p class="text-center">لا توجد كورسات متاحة حالياً</p>';
    return;
  }
  
  coursesGrid.innerHTML = courses.map(course => `
    <div class="course-card">
      <img src="${course.image_url || 'https://images.pexels.com/photos/3729557/pexels-photo-3729557.jpeg'}" 
           alt="${course.title}" class="course-image">
      <div class="course-content">
        <h3 class="course-title">${course.title}</h3>
        <p class="course-description">${course.description}</p>
        <div class="course-price">${course.price} جنيه</div>
        <div class="course-actions">
          <button class="btn-secondary" onclick="previewCourse('${course.id}')">معاينة</button>
          <button class="btn-primary" onclick="subscribeToCourse('${course.id}')">اشتراك</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Preview course
window.previewCourse = async function(courseId) {
  try {
    showLoading();
    const { data: course, error } = await getCourse(courseId);
    
    if (error) {
      throw error;
    }
    
    currentCourse = course;
    displayCoursePreview(course);
    showPage('course-preview');
    
  } catch (error) {
    console.error('خطأ في معاينة الكورس:', error);
    showError('خطأ في معاينة الكورس');
  } finally {
    hideLoading();
  }
};

// Display course preview
function displayCoursePreview(course) {
  const previewTitle = document.getElementById('course-preview-title');
  const previewContent = document.getElementById('course-preview-content');
  
  if (previewTitle) {
    previewTitle.textContent = course.title;
  }
  
  if (previewContent) {
    previewContent.innerHTML = `
      <div class="course-info">
        <img src="${course.image_url || 'https://images.pexels.com/photos/3729557/pexels-photo-3729557.jpeg'}" 
             alt="${course.title}" class="course-preview-image">
        <h4>وصف الكورس</h4>
        <p>${course.description}</p>
        <h4>السعر: ${course.price} جنيه</h4>
      </div>
      
      <div class="course-lectures">
        <h5><i class="fas fa-play-circle"></i> المحاضرات (${course.lectures?.length || 0})</h5>
        ${course.lectures?.map(lecture => `
          <div class="lecture-preview-item">
            <h6><i class="fas fa-video"></i> ${lecture.title}</h6>
            <p>${lecture.description || 'لا يوجد وصف'}</p>
            <p class="lecture-duration"><i class="fas fa-clock"></i> ${lecture.duration} دقيقة</p>
            ${lecture.lecture_materials?.length > 0 ? `
              <div class="materials-preview">
                <strong>المواد (${lecture.lecture_materials.length}):</strong>
                ${lecture.lecture_materials.map(material => `
                  <span class="material-type-badge">${material.type}</span>
                `).join(' ')}
              </div>
            ` : ''}
          </div>
        `).join('') || '<p>لا توجد محاضرات متاحة</p>'}
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <button class="btn-primary" onclick="subscribeToCourse('${course.id}')">
          <i class="fas fa-credit-card"></i> اشتراك في الكورس
        </button>
      </div>
    `;
  }
}

// Subscribe to course
window.subscribeToCourse = function(courseId) {
  currentCourseId = courseId;
  showModal('subscription-modal');
  
  // عرض تفاصيل الكورس في المودال
  const courseDetails = document.getElementById('course-details');
  if (courseDetails && currentCourse) {
    courseDetails.innerHTML = `
      <h4>${currentCourse.title}</h4>
      <p>${currentCourse.description}</p>
      <p><strong>السعر: ${currentCourse.price} جنيه</strong></p>
    `;
  }
};

// Handle course subscription
async function handleCourseSubscription(e) {
  e.preventDefault();
  
  const code = document.getElementById('subscription-code').value;
  
  if (!currentCourseId) {
    showError('خطأ: لم يتم تحديد الكورس');
    return;
  }
  
  try {
    showLoading();
    
    // التحقق من صحة الكود
    const { data: validationResult, error: validationError } = await validateSubscriptionCode(code, currentCourseId);
    
    if (validationError || !validationResult) {
      throw new Error(validationError?.message || 'كود الاشتراك غير صحيح');
    }
    
    // استخدام الكود
    const { data: accessResult, error: accessError } = await useSubscriptionCode(
      validationResult.id,
      currentUser.id,
      currentCourseId
    );
    
    if (accessError) {
      throw accessError;
    }
    
    showSuccess('تم الاشتراك في الكورس بنجاح!');
    hideModal();
    
    // إعادة تحميل الكورسات
    await loadCourses();
    
    // فتح الكورس مباشرة
    await openCourse(currentCourseId);
    
  } catch (error) {
    console.error('خطأ في الاشتراك:', error);
    showError('خطأ في الاشتراك: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Open course
window.openCourse = async function(courseId) {
  try {
    showLoading();
    
    // التحقق من وصول المستخدم للكورس
    const { data: access, error: accessError } = await checkUserCourseAccess(currentUser.id, courseId);
    
    if (accessError || !access) {
      showError('ليس لديك صلاحية للوصول لهذا الكورس');
      return;
    }
    
    // تحميل الكورس والمحاضرات
    const { data: course, error: courseError } = await getCourse(courseId);
    
    if (courseError) {
      throw courseError;
    }
    
    currentCourse = course;
    currentCourseId = courseId;
    
    displayCourseContent(course);
    showPage('course-content');
    
  } catch (error) {
    console.error('خطأ في فتح الكورس:', error);
    showError('خطأ في فتح الكورس');
  } finally {
    hideLoading();
  }
};

// Display course content
function displayCourseContent(course) {
  const contentTitle = document.getElementById('course-content-title');
  const contentWrapper = document.getElementById('course-content-wrapper');
  
  if (contentTitle) {
    contentTitle.textContent = course.title;
  }
  
  if (contentWrapper) {
    contentWrapper.innerHTML = `
      <div class="course-layout">
        <div class="main-content-area">
          <div id="material-viewer">
            <div class="welcome-message">
              <i class="fas fa-play-circle" style="font-size: 64px; color: var(--primary-color); margin-bottom: 20px;"></i>
              <h3>مرحباً بك في ${course.title}</h3>
              <p>اختر محاضرة من الشريط الجانبي لبدء التعلم</p>
            </div>
          </div>
        </div>
        
        <div class="course-sidebar">
          <h4><i class="fas fa-list"></i> المحاضرات</h4>
          <div class="lectures-list">
            ${course.lectures?.map(lecture => `
              <div class="lecture-sidebar-item" onclick="selectLecture('${lecture.id}')">
                <h6>${lecture.title}</h6>
                <p>${lecture.description || 'لا يوجد وصف'}</p>
                <p><i class="fas fa-clock"></i> ${lecture.duration} دقيقة</p>
                <span class="materials-count">${lecture.materials_count || 0} مادة</span>
              </div>
            `).join('') || '<p>لا توجد محاضرات</p>'}
          </div>
        </div>
        
        <div class="materials-bottom-panel">
          <div class="materials-header">
            <h5><i class="fas fa-folder"></i> مواد المحاضرة</h5>
          </div>
          <div id="materials-grid" class="materials-grid">
            <div class="no-materials">
              <i class="fas fa-info-circle"></i>
              <span>اختر محاضرة لعرض موادها</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// Select lecture
window.selectLecture = async function(lectureId) {
  try {
    currentLectureId = lectureId;
    
    // العثور على المحاضرة
    const lecture = currentCourse.lectures.find(l => l.id === lectureId);
    if (!lecture) {
      showError('لم يتم العثور على المحاضرة');
      return;
    }
    
    currentLecture = lecture;
    
    // تحديث الشريط الجانبي
    const lectureItems = document.querySelectorAll('.lecture-sidebar-item');
    lectureItems.forEach(item => {
      item.classList.remove('active');
    });
    
    const selectedItem = document.querySelector(`[onclick="selectLecture('${lectureId}')"]`);
    if (selectedItem) {
      selectedItem.classList.add('active');
    }
    
    // عرض معلومات المحاضرة
    displayLectureInfo(lecture);
    
    // تحميل مواد المحاضرة
    await loadLectureMaterials(lectureId);
    
  } catch (error) {
    console.error('خطأ في اختيار المحاضرة:', error);
    showError('خطأ في اختيار المحاضرة');
  }
};

// Display lecture info
function displayLectureInfo(lecture) {
  const materialViewer = document.getElementById('material-viewer');
  if (materialViewer) {
    materialViewer.innerHTML = `
      <div class="lecture-info">
        <h3>${lecture.title}</h3>
        <p class="lecture-description">${lecture.description || 'لا يوجد وصف للمحاضرة'}</p>
        <p class="select-material-hint">
          <i class="fas fa-hand-pointer"></i> 
          اختر مادة من الأسفل لبدء المشاهدة
        </p>
      </div>
    `;
  }
}

// Load lecture materials
async function loadLectureMaterials(lectureId) {
  try {
    // العثور على المحاضرة والمواد
    const lecture = currentCourse.lectures.find(l => l.id === lectureId);
    const materials = lecture?.lecture_materials || [];
    
    displayLectureMaterials(materials);
    
  } catch (error) {
    console.error('خطأ في تحميل مواد المحاضرة:', error);
    showError('خطأ في تحميل مواد المحاضرة');
  }
}

// Display lecture materials
function displayLectureMaterials(materials) {
  const materialsGrid = document.getElementById('materials-grid');
  if (!materialsGrid) return;
  
  if (materials.length === 0) {
    materialsGrid.innerHTML = `
      <div class="no-materials">
        <i class="fas fa-info-circle"></i>
        <span>لا توجد مواد لهذه المحاضرة</span>
      </div>
    `;
    return;
  }
  
  materialsGrid.innerHTML = materials.map(material => `
    <div class="material-card" onclick="selectMaterial('${material.id}')">
      <div class="material-icon">
        <i class="fas fa-${getMaterialIcon(material.type)}"></i>
      </div>
      <div class="material-info">
        <h6>${material.title}</h6>
        <p class="material-type">${getMaterialTypeName(material.type)}</p>
        ${material.duration > 0 ? `<p class="material-duration">${material.duration} دقيقة</p>` : ''}
      </div>
    </div>
  `).join('');
}

// Get material icon
function getMaterialIcon(type) {
  const icons = {
    video: 'play-circle',
    pdf: 'file-pdf',
    document: 'file-alt',
    image: 'image',
    audio: 'volume-up'
  };
  return icons[type] || 'file';
}

// Get material type name
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

// Select material
window.selectMaterial = function(materialId) {
  // العثور على المادة
  const material = currentLecture?.lecture_materials?.find(m => m.id === materialId);
  if (!material) {
    showError('لم يتم العثور على المادة');
    return;
  }
  
  currentMaterial = material;
  
  // تحديث شبكة المواد
  const materialCards = document.querySelectorAll('.material-card');
  materialCards.forEach(card => {
    card.classList.remove('active');
  });
  
  const selectedCard = document.querySelector(`[onclick="selectMaterial('${materialId}')"]`);
  if (selectedCard) {
    selectedCard.classList.add('active');
  }
  
  // عرض المادة
  displayMaterial(material);
};

// Display material
function displayMaterial(material) {
  const materialViewer = document.getElementById('material-viewer');
  if (!materialViewer) return;
  
  let content = '';
  
  switch (material.type) {
    case 'video':
      content = displayVideoMaterial(material);
      break;
    case 'pdf':
      content = displayPDFMaterial(material);
      break;
    case 'image':
      content = displayImageMaterial(material);
      break;
    case 'audio':
      content = displayAudioMaterial(material);
      break;
    default:
      content = displayFileMaterial(material);
  }
  
  materialViewer.innerHTML = content;
}

// Display video material
function displayVideoMaterial(material) {
  const videoId = getYouTubeVideoId(material.url);
  const embedUrl = videoId ? getYouTubeEmbedUrl(material.url) : material.url;
  
  return `
    <div class="material-header">
      <h3>${material.title}</h3>
      <span class="material-type-badge">فيديو</span>
    </div>
    <div class="material-content">
      <div class="video-player">
        <iframe src="${embedUrl}" 
                frameborder="0" 
                allowfullscreen>
        </iframe>
      </div>
    </div>
  `;
}

// Display PDF material
function displayPDFMaterial(material) {
  return `
    <div class="material-header">
      <h3>${material.title}</h3>
      <span class="material-type-badge">PDF</span>
    </div>
    <div class="material-content">
      <div class="pdf-viewer">
        <iframe src="${material.url}" 
                type="application/pdf">
        </iframe>
      </div>
    </div>
  `;
}

// Display image material
function displayImageMaterial(material) {
  return `
    <div class="material-header">
      <h3>${material.title}</h3>
      <span class="material-type-badge">صورة</span>
    </div>
    <div class="material-content">
      <div class="image-viewer">
        <img src="${material.url}" alt="${material.title}">
      </div>
    </div>
  `;
}

// Display audio material
function displayAudioMaterial(material) {
  return `
    <div class="material-header">
      <h3>${material.title}</h3>
      <span class="material-type-badge">صوت</span>
    </div>
    <div class="material-content">
      <div class="audio-viewer">
        <audio controls>
          <source src="${material.url}" type="audio/mpeg">
          متصفحك لا يدعم تشغيل الملفات الصوتية
        </audio>
        <div class="audio-info">
          <h4>${material.title}</h4>
          ${material.duration > 0 ? `<p>المدة: ${material.duration} دقيقة</p>` : ''}
        </div>
      </div>
    </div>
  `;
}

// Display file material
function displayFileMaterial(material) {
  return `
    <div class="material-header">
      <h3>${material.title}</h3>
      <span class="material-type-badge">ملف</span>
    </div>
    <div class="material-content">
      <div class="file-viewer">
        <div class="file-info">
          <i class="fas fa-file file-icon-large"></i>
          <h4>${material.title}</h4>
          <p>نوع الملف: ${getMaterialTypeName(material.type)}</p>
        </div>
        <div class="file-actions">
          <a href="${material.url}" target="_blank" class="btn-primary">
            <i class="fas fa-external-link-alt"></i> فتح الملف
          </a>
          <a href="${material.url}" download class="btn-secondary">
            <i class="fas fa-download"></i> تحميل
          </a>
        </div>
      </div>
    </div>
  `;
}

// Load profile
function loadProfile() {
  if (!currentUserProfile) return;
  
  // تحديث حقول النموذج
  const fields = {
    'profile-user-id': currentUserProfile.user_id,
    'profile-name': currentUserProfile.full_name,
    'profile-email': currentUser?.email || '',
    'profile-level': currentUserProfile.education_level,
    'profile-role': getRoleDisplayName(currentUserProfile.role || 'student')
  };
  
  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.value = value;
    }
  });
  
  // تحديث الصورة الشخصية
  const profileAvatar = document.getElementById('profile-avatar');
  if (profileAvatar && currentUserProfile.avatar_url) {
    profileAvatar.src = currentUserProfile.avatar_url;
  }
}

// Handle profile update
async function handleProfileUpdate(e) {
  e.preventDefault();
  
  const name = document.getElementById('profile-name').value;
  const level = document.getElementById('profile-level').value;
  const password = document.getElementById('profile-password').value;
  
  try {
    showLoading();
    
    // تحديث الملف الشخصي
    const updates = {
      full_name: name,
      education_level: level
    };
    
    const { data, error } = await updateUserProfile(currentUser.id, updates);
    
    if (error) {
      throw error;
    }
    
    currentUserProfile = data;
    
    // تحديث كلمة المرور إذا تم إدخالها
    if (password) {
      const { error: passwordError } = await updatePassword(password);
      if (passwordError) {
        throw passwordError;
      }
    }
    
    showSuccess('تم تحديث الملف الشخصي بنجاح');
    updateUserInterface();
    
    // مسح حقل كلمة المرور
    document.getElementById('profile-password').value = '';
    
  } catch (error) {
    console.error('خطأ في تحديث الملف الشخصي:', error);
    showError('خطأ في تحديث الملف الشخصي: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Handle avatar upload
async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    showLoading();
    
    const { data: avatarUrl, error } = await uploadAvatar(currentUser.id, file);
    
    if (error) {
      throw error;
    }
    
    // تحديث الملف الشخصي بالصورة الجديدة
    const { data: updatedProfile, error: updateError } = await updateUserProfile(currentUser.id, {
      avatar_url: avatarUrl
    });
    
    if (updateError) {
      throw updateError;
    }
    
    currentUserProfile = updatedProfile;
    
    // تحديث الصورة في الواجهة
    const avatarElements = document.querySelectorAll('#user-avatar, #profile-avatar');
    avatarElements.forEach(avatar => {
      avatar.src = avatarUrl;
    });
    
    showSuccess('تم تحديث الصورة الشخصية بنجاح');
    
  } catch (error) {
    console.error('خطأ في رفع الصورة:', error);
    showError('خطأ في رفع الصورة: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Load admin dashboard
async function loadAdminDashboard() {
  // تحميل الكورسات للأدمن
  await loadAdminCourses();
  
  // تحميل المستخدمين
  await loadAllUsers();
  
  // تحميل أكواد الاشتراك
  await loadSubscriptionCodes();
}

// Load admin courses
async function loadAdminCourses() {
  try {
    const { data: courses, error } = await getCourses();
    
    if (error) {
      throw error;
    }
    
    displayAdminCourses(courses || []);
    
  } catch (error) {
    console.error('خطأ في تحميل كورسات الأدمن:', error);
    showError('خطأ في تحميل الكورسات');
  }
}

// Display admin courses
function displayAdminCourses(courses) {
  const coursesList = document.getElementById('admin-courses-list');
  if (!coursesList) return;
  
  if (courses.length === 0) {
    coursesList.innerHTML = '<p class="text-center">لا توجد كورسات</p>';
    return;
  }
  
  coursesList.innerHTML = courses.map(course => `
    <div class="admin-item">
      <div class="admin-item-info">
        <h4>${course.title}</h4>
        <p>${course.description}</p>
        <p><strong>السعر:</strong> ${course.price} جنيه</p>
        <p><strong>الفئة المستهدفة:</strong> ${course.target_level || 'الكل'}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-secondary" onclick="manageLectures('${course.id}')">إدارة المحاضرات</button>
        <button class="btn-danger" onclick="deleteCourseAdmin('${course.id}')">حذف</button>
      </div>
    </div>
  `).join('');
}

// Manage lectures
window.manageLectures = async function(courseId) {
  try {
    showLoading();
    
    const { data: course, error } = await getCourse(courseId);
    
    if (error) {
      throw error;
    }
    
    currentCourseId = courseId;
    currentCourse = course;
    
    displayLecturesManagement(course.lectures || []);
    showModal('manage-lectures-modal');
    
  } catch (error) {
    console.error('خطأ في تحميل المحاضرات:', error);
    showError('خطأ في تحميل المحاضرات');
  } finally {
    hideLoading();
  }
};

// Display lectures management
function displayLecturesManagement(lectures) {
  const lecturesList = document.getElementById('lectures-list');
  if (!lecturesList) return;
  
  if (lectures.length === 0) {
    lecturesList.innerHTML = '<p class="text-center">لا توجد محاضرات</p>';
    return;
  }
  
  lecturesList.innerHTML = lectures.map(lecture => `
    <div class="lecture-item">
      <div class="lecture-info">
        <h5>${lecture.title}</h5>
        <p>${lecture.description || 'لا يوجد وصف'}</p>
        <p><strong>المدة:</strong> ${lecture.duration} دقيقة</p>
        <p><strong>الترتيب:</strong> ${lecture.order_index}</p>
        <p><strong>عدد المواد:</strong> ${lecture.materials_count || 0}</p>
      </div>
      <div class="lecture-actions">
        <button class="btn-secondary" onclick="manageMaterials('${lecture.id}')">إدارة المواد</button>
        <button class="btn-danger" onclick="deleteLectureAdmin('${lecture.id}')">حذف</button>
      </div>
    </div>
  `).join('');
}

// Show create lecture modal
window.showCreateLectureModal = function() {
  showModal('create-lecture-modal');
};

// Handle create lecture
async function handleCreateLecture(e) {
  e.preventDefault();
  
  const title = document.getElementById('lecture-title').value;
  const description = document.getElementById('lecture-description').value;
  const duration = parseInt(document.getElementById('lecture-duration').value) || 0;
  const orderIndex = parseInt(document.getElementById('lecture-order').value) || 0;
  
  try {
    showLoading();
    
    const lectureData = {
      course_id: currentCourseId,
      title,
      description,
      duration,
      order_index: orderIndex
    };
    
    const { data, error } = await createLecture(lectureData);
    
    if (error) {
      throw error;
    }
    
    showSuccess('تم إنشاء المحاضرة بنجاح');
    hideModal();
    
    // إعادة تحميل المحاضرات
    await manageLectures(currentCourseId);
    
    // مسح النموذج
    document.getElementById('createLectureForm').reset();
    
  } catch (error) {
    console.error('خطأ في إنشاء المحاضرة:', error);
    showError('خطأ في إنشاء المحاضرة: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Delete lecture
window.deleteLectureAdmin = async function(lectureId) {
  if (!confirm('هل أنت متأكد من حذف هذه المحاضرة؟')) {
    return;
  }
  
  try {
    showLoading();
    
    const { error } = await deleteLecture(lectureId);
    
    if (error) {
      throw error;
    }
    
    showSuccess('تم حذف المحاضرة بنجاح');
    
    // إعادة تحميل المحاضرات
    await manageLectures(currentCourseId);
    
  } catch (error) {
    console.error('خطأ في حذف المحاضرة:', error);
    showError('خطأ في حذف المحاضرة: ' + error.message);
  } finally {
    hideLoading();
  }
};

// Manage materials
window.manageMaterials = async function(lectureId) {
  try {
    currentLectureId = lectureId;
    
    // العثور على المحاضرة
    const lecture = currentCourse.lectures.find(l => l.id === lectureId);
    if (!lecture) {
      showError('لم يتم العثور على المحاضرة');
      return;
    }
    
    currentLecture = lecture;
    
    displayMaterialsManagement(lecture.lecture_materials || []);
    showModal('manage-materials-modal');
    
  } catch (error) {
    console.error('خطأ في إدارة المواد:', error);
    showError('خطأ في إدارة المواد');
  }
};

// Display materials management
function displayMaterialsManagement(materials) {
  const materialsList = document.getElementById('materials-list');
  if (!materialsList) return;
  
  if (materials.length === 0) {
    materialsList.innerHTML = '<p class="text-center">لا توجد مواد</p>';
    return;
  }
  
  materialsList.innerHTML = materials.map(material => `
    <div class="material-item">
      <div class="material-info">
        <h6>
          <i class="fas fa-${getMaterialIcon(material.type)}"></i>
          ${material.title}
        </h6>
        <p><strong>النوع:</strong> ${getMaterialTypeName(material.type)}</p>
        <p><strong>الرابط:</strong> <a href="${material.url}" target="_blank">${material.url}</a></p>
        ${material.duration > 0 ? `<p><strong>المدة:</strong> ${material.duration} دقيقة</p>` : ''}
        <p><strong>الترتيب:</strong> ${material.order_index}</p>
      </div>
      <div class="material-actions">
        <button class="btn-danger" onclick="deleteMaterialAdmin('${material.id}')">حذف</button>
      </div>
    </div>
  `).join('');
}

// Show create material modal
window.showCreateMaterialModal = function() {
  showModal('create-material-modal');
};

// Handle material type change
function handleMaterialTypeChange(e) {
  const type = e.target.value;
  const videoOptions = document.getElementById('video-upload-options');
  const urlInput = document.getElementById('video-url-input');
  const fileInput = document.getElementById('video-file-input');
  
  if (type === 'video') {
    videoOptions.style.display = 'block';
    // إظهار خيار الرابط افتراضياً
    urlInput.style.display = 'block';
    fileInput.style.display = 'none';
  } else {
    videoOptions.style.display = 'none';
    urlInput.style.display = 'block';
    fileInput.style.display = 'none';
  }
}

// Handle video method change
function handleVideoMethodChange(e) {
  const method = e.target.value;
  const urlInput = document.getElementById('video-url-input');
  const fileInput = document.getElementById('video-file-input');
  
  if (method === 'url') {
    urlInput.style.display = 'block';
    fileInput.style.display = 'none';
  } else {
    urlInput.style.display = 'none';
    fileInput.style.display = 'block';
  }
}

// Handle video file select
async function handleVideoFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // التحقق من نوع الملف
  if (!file.type.startsWith('video/')) {
    showError('يرجى اختيار ملف فيديو صالح');
    return;
  }
  
  // التحقق من حجم الملف (500MB)
  if (file.size > 500 * 1024 * 1024) {
    showError('حجم الفيديو يجب أن يكون أقل من 500 ميجابايت');
    return;
  }
  
  try {
    // إظهار شريط التقدم
    const progressDiv = document.getElementById('file-upload-progress');
    const successDiv = document.getElementById('file-upload-success');
    const placeholder = document.querySelector('.file-upload-placeholder');
    
    if (progressDiv) progressDiv.style.display = 'block';
    if (successDiv) successDiv.style.display = 'none';
    if (placeholder) placeholder.style.display = 'none';
    
    // رفع الفيديو مع تتبع التقدم
    const { data: videoUrl, error } = await uploadVideo(currentUser.id, file, (progress) => {
      const progressFill = document.querySelector('.progress-fill');
      const progressText = document.querySelector('.progress-text');
      
      if (progressFill) {
        progressFill.style.width = `${progress}%`;
      }
      if (progressText) {
        progressText.textContent = `جاري الرفع... ${progress}%`;
      }
    });
    
    if (error) {
      throw error;
    }
    
    // إخفاء شريط التقدم وإظهار رسالة النجاح
    if (progressDiv) progressDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'block';
    
    // تحديث حقل الرابط
    const urlField = document.getElementById('material-url');
    if (urlField) {
      urlField.value = videoUrl;
    }
    
    showSuccess('تم رفع الفيديو بنجاح!');
    
  } catch (error) {
    console.error('خطأ في رفع الفيديو:', error);
    showError('خطأ في رفع الفيديو: ' + error.message);
    
    // إخفاء شريط التقدم وإظهار المكان الأصلي
    const progressDiv = document.getElementById('file-upload-progress');
    const placeholder = document.querySelector('.file-upload-placeholder');
    
    if (progressDiv) progressDiv.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
  }
}

// Handle create material
async function handleCreateMaterial(e) {
  e.preventDefault();
  
  const title = document.getElementById('material-title').value;
  const type = document.getElementById('material-type').value;
  const url = document.getElementById('material-url').value;
  const duration = parseInt(document.getElementById('material-duration').value) || 0;
  const orderIndex = parseInt(document.getElementById('material-order').value) || 0;
  
  if (!title || !type || !url) {
    showError('يرجى ملء جميع الحقول المطلوبة');
    return;
  }
  
  try {
    showLoading();
    
    const materialData = {
      lecture_id: currentLectureId,
      title,
      type,
      url,
      duration,
      order_index: orderIndex
    };
    
    const { data, error } = await createLectureMaterial(materialData);
    
    if (error) {
      throw error;
    }
    
    showSuccess('تم إنشاء المادة بنجاح');
    hideModal();
    
    // إعادة تحميل المواد
    await manageMaterials(currentLectureId);
    
    // مسح النموذج
    document.getElementById('createMaterialForm').reset();
    
    // إخفاء خيارات الفيديو
    const videoOptions = document.getElementById('video-upload-options');
    const fileInput = document.getElementById('video-file-input');
    const successDiv = document.getElementById('file-upload-success');
    const placeholder = document.querySelector('.file-upload-placeholder');
    
    if (videoOptions) videoOptions.style.display = 'none';
    if (fileInput) fileInput.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    
  } catch (error) {
    console.error('خطأ في إنشاء المادة:', error);
    showError('خطأ في إنشاء المادة: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Delete material
window.deleteMaterialAdmin = async function(materialId) {
  if (!confirm('هل أنت متأكد من حذف هذه المادة؟')) {
    return;
  }
  
  try {
    showLoading();
    
    const { error } = await deleteLectureMaterial(materialId);
    
    if (error) {
      throw error;
    }
    
    showSuccess('تم حذف المادة بنجاح');
    
    // إعادة تحميل المواد
    await manageMaterials(currentLectureId);
    
  } catch (error) {
    console.error('خطأ في حذف المادة:', error);
    showError('خطأ في حذف المادة: ' + error.message);
  } finally {
    hideLoading();
  }
};

// Delete course
window.deleteCourseAdmin = async function(courseId) {
  if (!confirm('هل أنت متأكد من حذف هذا الكورس؟ سيتم حذف جميع المحاضرات والمواد المرتبطة به.')) {
    return;
  }
  
  try {
    showLoading();
    
    const { error } = await deleteCourse(courseId);
    
    if (error) {
      throw error;
    }
    
    showSuccess('تم حذف الكورس بنجاح');
    
    // إعادة تحميل الكورسات
    await loadAdminCourses();
    
  } catch (error) {
    console.error('خطأ في حذف الكورس:', error);
    showError('خطأ في حذف الكورس: ' + error.message);
  } finally {
    hideLoading();
  }
};

// Handle create course
async function handleCreateCourse(e) {
  e.preventDefault();
  
  const title = document.getElementById('course-title').value;
  const description = document.getElementById('course-description').value;
  const price = parseFloat(document.getElementById('course-price').value) || 0;
  const targetLevel = document.getElementById('course-target-level').value;
  const imageUrl = document.getElementById('course-image').value;
  
  try {
    showLoading();
    
    const courseData = {
      title,
      description,
      price,
      target_level: targetLevel,
      image_url: imageUrl || 'https://images.pexels.com/photos/3729557/pexels-photo-3729557.jpeg'
    };
    
    const { data, error } = await createCourse(courseData);
    
    if (error) {
      throw error;
    }
    
    showSuccess('تم إنشاء الكورس بنجاح');
    hideModal();
    
    // إعادة تحميل الكورسات
    await loadAdminCourses();
    await loadCourses();
    
    // مسح النموذج
    document.getElementById('createCourseForm').reset();
    
  } catch (error) {
    console.error('خطأ في إنشاء الكورس:', error);
    showError('خطأ في إنشاء الكورس: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Load all users
async function loadAllUsers() {
  try {
    const { data: users, error } = await getAllUsers();
    
    if (error) {
      throw error;
    }
    
    displayUsers(users || []);
    
  } catch (error) {
    console.error('خطأ في تحميل المستخدمين:', error);
    showError('خطأ في تحميل المستخدمين');
  }
}

// Handle user search
async function handleUserSearch() {
  const searchTerm = document.getElementById('user-search').value.trim();
  
  if (!searchTerm) {
    await loadAllUsers();
    return;
  }
  
  try {
    showLoading();
    
    const { data: users, error } = await searchUsersByID(searchTerm);
    
    if (error) {
      throw error;
    }
    
    displayUsers(users || []);
    
  } catch (error) {
    console.error('خطأ في البحث عن المستخدمين:', error);
    showError('خطأ في البحث عن المستخدمين');
  } finally {
    hideLoading();
  }
}

// Display users
function displayUsers(users) {
  const usersList = document.getElementById('admin-users-list');
  if (!usersList) return;
  
  if (users.length === 0) {
    usersList.innerHTML = '<p class="text-center">لا توجد نتائج</p>';
    return;
  }
  
  usersList.innerHTML = users.map(user => `
    <div class="admin-item">
      <div class="admin-item-info">
        <h4>${user.full_name}</h4>
        <p><strong>المعرف:</strong> <span class="user-id">${user.user_id}</span></p>
        <p><strong>المرحلة الدراسية:</strong> ${user.education_level}</p>
        <p><strong>الدور:</strong> ${getRoleDisplayName(user.role || 'student')}</p>
        <p><strong>عدد الكورسات:</strong> ${user.enrolled_courses_count || 0}</p>
        <p><strong>تاريخ التسجيل:</strong> ${new Date(user.created_at).toLocaleDateString('ar-EG')}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-secondary" onclick="editUserRole('${user.user_id}', '${user.full_name}', '${user.role || 'student'}')">تعديل الدور</button>
      </div>
    </div>
  `).join('');
}

// Edit user role
window.editUserRole = function(userId, userName, currentRole) {
  document.getElementById('edit-user-name').value = userName;
  document.getElementById('edit-user-role').value = currentRole;
  
  // حفظ معرف المستخدم للاستخدام عند الحفظ
  document.getElementById('editUserRoleForm').dataset.userId = userId;
  
  showModal('edit-user-role-modal');
};

// Handle edit user role
async function handleEditUserRole(e) {
  e.preventDefault();
  
  const userId = e.target.dataset.userId;
  const newRole = document.getElementById('edit-user-role').value;
  
  try {
    showLoading();
    
    const { data, error } = await updateUserRole(userId, newRole);
    
    if (error) {
      throw error;
    }
    
    showSuccess('تم تحديث دور المستخدم بنجاح');
    hideModal();
    
    // إعادة تحميل المستخدمين
    await loadAllUsers();
    
  } catch (error) {
    console.error('خطأ في تحديث دور المستخدم:', error);
    showError('خطأ في تحديث دور المستخدم: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Load subscription codes
async function loadSubscriptionCodes() {
  try {
    const { data: codes, error } = await getSubscriptionCodes();
    
    if (error) {
      throw error;
    }
    
    displaySubscriptionCodes(codes || []);
    
  } catch (error) {
    console.error('خطأ في تحميل أكواد الاشتراك:', error);
    showError('خطأ في تحميل أكواد الاشتراك');
  }
}

// Display subscription codes
function displaySubscriptionCodes(codes) {
  const codesList = document.getElementById('admin-codes-list');
  if (!codesList) return;
  
  if (codes.length === 0) {
    codesList.innerHTML = '<p class="text-center">لا توجد أكواد اشتراك</p>';
    return;
  }
  
  codesList.innerHTML = codes.map(code => `
    <div class="admin-item">
      <div class="admin-item-info">
        <h4>${code.code}</h4>
        <p><strong>الكورس:</strong> ${code.courses?.title || 'غير محدد'}</p>
        <p><strong>مدة الصلاحية:</strong> ${code.validity_days} يوم</p>
        <p><strong>عدد مرات الاستخدام:</strong> ${code.used_count}/${code.usage_limit}</p>
        <p><strong>تاريخ الانتهاء:</strong> ${new Date(code.expires_at).toLocaleDateString('ar-EG')}</p>
        <p><strong>الحالة:</strong> ${code.is_active ? 'نشط' : 'غير نشط'}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-secondary" onclick="editCode('${code.id}', '${code.code}', ${code.validity_days}, ${code.usage_limit})">تعديل</button>
        <button class="btn-danger" onclick="deleteCode('${code.id}')">حذف</button>
      </div>
    </div>
  `).join('');
}

// Load courses for code modal
async function loadCoursesForCodeModal() {
  try {
    const { data: courses, error } = await getCourses();
    
    if (error) {
      throw error;
    }
    
    const courseSelect = document.getElementById('code-course');
    if (courseSelect) {
      courseSelect.innerHTML = '<option value="">اختر الكورس</option>' +
        courses.map(course => `<option value="${course.id}">${course.title}</option>`).join('');
    }
    
  } catch (error) {
    console.error('خطأ في تحميل الكورسات:', error);
  }
}

// Generate random code
function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const codeInput = document.getElementById('code-value');
  if (codeInput) {
    codeInput.value = code;
  }
}

// Handle create code
async function handleCreateCode(e) {
  e.preventDefault();
  
  const courseId = document.getElementById('code-course').value;
  const code = document.getElementById('code-value').value;
  const validityDays = parseInt(document.getElementById('code-validity').value) || 30;
  const usageLimit = parseInt(document.getElementById('code-usage-limit').value) || 1;
  
  try {
    showLoading();
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);
    
    const codeData = {
      course_id: courseId,
      code,
      validity_days: validityDays,
      expires_at: expiresAt.toISOString(),
      usage_limit: usageLimit
    };
    
    const { data, error } = await createSubscriptionCode(codeData);
    
    if (error) {
      throw error;
    }
    
    showSuccess('تم إنشاء كود الاشتراك بنجاح');
    hideModal();
    
    // إعادة تحميل الأكواد
    await loadSubscriptionCodes();
    
    // مسح النموذج
    document.getElementById('createCodeForm').reset();
    
  } catch (error) {
    console.error('خطأ في إنشاء كود الاشتراك:', error);
    showError('خطأ في إنشاء كود الاشتراك: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Edit code
window.editCode = function(codeId, code, validityDays, usageLimit) {
  document.getElementById('edit-code-value').value = code;
  document.getElementById('edit-code-validity').value = validityDays;
  document.getElementById('edit-code-usage-limit').value = usageLimit;
  
  // حفظ معرف الكود للاستخدام عند الحفظ
  document.getElementById('editCodeForm').dataset.codeId = codeId;
  
  showModal('edit-code-modal');
};

// Handle edit code
async function handleEditCode(e) {
  e.preventDefault();
  
  const codeId = e.target.dataset.codeId;
  const code = document.getElementById('edit-code-value').value;
  const validityDays = parseInt(document.getElementById('edit-code-validity').value) || 30;
  const usageLimit = parseInt(document.getElementById('edit-code-usage-limit').value) || 1;
  
  try {
    showLoading();
    
    const updates = {
      code,
      validity_days: validityDays,
      usage_limit: usageLimit
    };
    
    const { data, error } = await updateSubscriptionCode(codeId, updates);
    
    if (error) {
      throw error;
    }
    
    showSuccess('تم تحديث كود الاشتراك بنجاح');
    hideModal();
    
    // إعادة تحميل الأكواد
    await loadSubscriptionCodes();
    
  } catch (error) {
    console.error('خطأ في تحديث كود الاشتراك:', error);
    showError('خطأ في تحديث كود الاشتراك: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Delete code
window.deleteCode = async function(codeId) {
  if (!confirm('هل أنت متأكد من حذف هذا الكود؟')) {
    return;
  }
  
  try {
    showLoading();
    
    const { error } = await deleteSubscriptionCode(codeId);
    
    if (error) {
      throw error;
    }
    
    showSuccess('تم حذف كود الاشتراك بنجاح');
    
    // إعادة تحميل الأكواد
    await loadSubscriptionCodes();
    
  } catch (error) {
    console.error('خطأ في حذف كود الاشتراك:', error);
    showError('خطأ في حذف كود الاشتراك: ' + error.message);
  } finally {
    hideLoading();
  }
};

// Show admin tab
function showAdminTab(tabName) {
  // إخفاء جميع التبويبات
  const tabContents = document.querySelectorAll('.admin-tab-content');
  tabContents.forEach(content => {
    content.classList.remove('active');
  });
  
  // إظهار التبويب المطلوب
  const targetTab = document.getElementById(`admin-${tabName}`);
  if (targetTab) {
    targetTab.classList.add('active');
  }
  
  // تحديث أزرار التبويبات
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    }
  });
  
  // تحميل محتوى التبويب
  switch (tabName) {
    case 'courses':
      loadAdminCourses();
      break;
    case 'users':
      loadAllUsers();
      break;
    case 'codes':
      loadSubscriptionCodes();
      break;
  }
}

// Load instructor dashboard
async function loadInstructorDashboard() {
  await loadInstructorCourses();
}

// Load instructor courses
async function loadInstructorCourses() {
  try {
    const { data: courses, error } = await getCourses();
    
    if (error) {
      throw error;
    }
    
    displayInstructorCourses(courses || []);
    
  } catch (error) {
    console.error('خطأ في تحميل كورسات المدرب:', error);
    showError('خطأ في تحميل الكورسات');
  }
}

// Display instructor courses
function displayInstructorCourses(courses) {
  const coursesList = document.getElementById('instructor-courses-list');
  if (!coursesList) return;
  
  if (courses.length === 0) {
    coursesList.innerHTML = '<p class="text-center">لا توجد كورسات</p>';
    return;
  }
  
  coursesList.innerHTML = courses.map(course => `
    <div class="admin-item">
      <div class="admin-item-info">
        <h4>${course.title}</h4>
        <p>${course.description}</p>
        <p><strong>السعر:</strong> ${course.price} جنيه</p>
        <p><strong>الفئة المستهدفة:</strong> ${course.target_level || 'الكل'}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-secondary" onclick="manageLectures('${course.id}')">إدارة المحاضرات</button>
      </div>
    </div>
  `).join('');
}

// Show modal
function showModal(modalId) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById(modalId);
  
  if (overlay && modal) {
    // إخفاء جميع المودالات
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(m => m.style.display = 'none');
    
    // إظهار المودال المطلوب
    modal.style.display = 'block';
    overlay.classList.add('active');
  }
}

// Hide modal
function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    
    // إخفاء جميع المودالات
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => modal.style.display = 'none');
  }
}

// Toggle theme
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  updateThemeIcon(newTheme);
}

// Update theme icon
function updateThemeIcon(theme) {
  const themeIcon = document.querySelector('#theme-toggle i');
  if (themeIcon) {
    themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

// Utility functions
function showSuccess(message) {
  // يمكن تحسين هذا لاحقاً بإضافة نظام إشعارات أفضل
  alert(message);
}

function showError(message) {
  // يمكن تحسين هذا لاحقاً بإضافة نظام إشعارات أفضل
  alert(message);
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session);
  
  if (event === 'SIGNED_IN') {
    checkAuthState();
  } else if (event === 'SIGNED_OUT') {
    currentUser = null;
    currentUserProfile = null;
    showAuth();
  }
});
