// Import Supabase functions
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
  getSubscriptionCodes,
  deleteSubscriptionCode,
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
let currentMaterial = null;
let currentLectureId = null;
let currentMaterialId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  console.log('App initializing...');
  
  // Check authentication state
  const user = await getCurrentUser();
  if (user) {
    currentUser = user;
    const { data: profile } = await getUserProfile(user.id);
    currentUserProfile = profile;
    showMainApp();
  } else {
    showAuthContainer();
  }
  
  // Setup event listeners
  setupEventListeners();
  setupVideoUploadListeners();
  
  // Hide loading
  document.getElementById('loading').style.display = 'none';
});

// Setup event listeners
function setupEventListeners() {
  // Auth form toggles
  document.getElementById('show-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
  });

  document.getElementById('show-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
  });

  // Auth forms
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
  document.getElementById('profileForm')?.addEventListener('submit', handleProfileUpdate);

  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.target.getAttribute('data-page');
      showPage(page);
    });
  });

  // Brand logo click
  document.getElementById('brand-logo')?.addEventListener('click', () => {
    showPage('home');
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  // Course actions
  document.getElementById('back-to-courses')?.addEventListener('click', () => {
    showPage('home');
  });

  document.getElementById('back-to-courses-from-content')?.addEventListener('click', () => {
    showPage('home');
  });

  // Admin actions
  document.getElementById('create-course-btn')?.addEventListener('click', () => {
    showModal('create-course-modal');
  });

  document.getElementById('instructor-create-course-btn')?.addEventListener('click', () => {
    showModal('create-course-modal');
  });

  document.getElementById('create-code-btn')?.addEventListener('click', () => {
    loadCoursesForCodeModal();
    showModal('create-code-modal');
  });

  // Admin tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.target.getAttribute('data-tab');
      showAdminTab(tab);
    });
  });

  // Search users
  document.getElementById('search-users-btn')?.addEventListener('click', handleUserSearch);
  document.getElementById('clear-search-btn')?.addEventListener('click', handleClearSearch);

  // Forms
  document.getElementById('createCourseForm')?.addEventListener('submit', handleCreateCourse);
  document.getElementById('createCodeForm')?.addEventListener('submit', handleCreateCode);
  document.getElementById('editCodeForm')?.addEventListener('submit', handleEditCode);
  document.getElementById('editUserRoleForm')?.addEventListener('submit', handleEditUserRole);
  document.getElementById('subscriptionForm')?.addEventListener('submit', handleSubscription);
  document.getElementById('createLectureForm')?.addEventListener('submit', handleCreateLecture);
  document.getElementById('createMaterialForm')?.addEventListener('submit', handleCreateMaterial);

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      hideModal(modal.id);
    });
  });

  // Modal overlay click
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') {
      hideAllModals();
    }
  });

  // Generate code button
  document.getElementById('generate-code-btn')?.addEventListener('click', generateRandomCode);

  // Avatar upload
  document.getElementById('upload-avatar-btn')?.addEventListener('click', () => {
    document.getElementById('avatar-input').click();
  });

  document.getElementById('avatar-input')?.addEventListener('change', handleAvatarUpload);
}

// Setup video upload listeners
function setupVideoUploadListeners() {
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

  // File input change
  const materialFileInput = document.getElementById('material-file');
  if (materialFileInput) {
    materialFileInput.addEventListener('change', handleVideoFileSelect);
  }

  // File upload area click
  const fileUploadArea = document.querySelector('.file-upload-placeholder');
  if (fileUploadArea) {
    fileUploadArea.addEventListener('click', () => {
      document.getElementById('material-file').click();
    });
  }
}

// Handle material type change
function handleMaterialTypeChange(e) {
  const materialType = e.target.value;
  const videoUploadOptions = document.getElementById('video-upload-options');
  const videoUrlInput = document.getElementById('video-url-input');
  const videoFileInput = document.getElementById('video-file-input');

  if (materialType === 'video') {
    videoUploadOptions.style.display = 'block';
    handleVideoMethodChange(); // تحديث العرض حسب الطريقة المختارة
  } else {
    videoUploadOptions.style.display = 'none';
    videoUrlInput.style.display = 'block';
    videoFileInput.style.display = 'none';
  }
}

// Handle video upload method change
function handleVideoMethodChange() {
  const selectedMethod = document.querySelector('input[name="video-method"]:checked')?.value;
  const videoUrlInput = document.getElementById('video-url-input');
  const videoFileInput = document.getElementById('video-file-input');

  if (selectedMethod === 'upload') {
    videoUrlInput.style.display = 'none';
    videoFileInput.style.display = 'block';
  } else {
    videoUrlInput.style.display = 'block';
    videoFileInput.style.display = 'none';
  }
}

// Handle video file selection
async function handleVideoFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  console.log('File selected:', file.name, file.size, file.type);

  // التحقق من نوع الملف
  if (!file.type.startsWith('video/')) {
    showMessage('يجب أن يكون الملف فيديو', 'error');
    return;
  }

  // التحقق من حجم الملف (500MB)
  if (file.size > 500 * 1024 * 1024) {
    showMessage('حجم الفيديو يجب أن يكون أقل من 500 ميجابايت', 'error');
    return;
  }

  // إظهار شريط التقدم
  const progressContainer = document.getElementById('file-upload-progress');
  const successContainer = document.getElementById('file-upload-success');
  const placeholder = document.querySelector('.file-upload-placeholder');
  
  placeholder.style.display = 'none';
  progressContainer.style.display = 'block';
  successContainer.style.display = 'none';

  try {
    // رفع الفيديو
    const { data: videoUrl, error } = await uploadVideo(
      currentUser.id, 
      file, 
      (progress) => {
        console.log('Upload progress:', progress);
        const progressBar = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `جاري الرفع... ${progress}%`;
      }
    );

    if (error) {
      throw error;
    }

    console.log('Video uploaded successfully:', videoUrl);

    // إخفاء شريط التقدم وإظهار رسالة النجاح
    progressContainer.style.display = 'none';
    successContainer.style.display = 'block';

    // تحديث حقل الرابط
    const materialUrlInput = document.getElementById('material-url');
    if (materialUrlInput) {
      materialUrlInput.value = videoUrl;
    }

    showMessage('تم رفع الفيديو بنجاح!', 'success');

  } catch (error) {
    console.error('Error uploading video:', error);
    
    // إخفاء شريط التقدم وإظهار الخطأ
    progressContainer.style.display = 'none';
    placeholder.style.display = 'block';
    
    showMessage(`خطأ في رفع الفيديو: ${error.message}`, 'error');
  }
}

// Authentication handlers
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const { data, error } = await signIn(email, password);
    
    if (error) throw error;
    
    currentUser = data.user;
    const { data: profile } = await getUserProfile(currentUser.id);
    currentUserProfile = profile;
    
    showMainApp();
  } catch (error) {
    showMessage(`خطأ في تسجيل الدخول: ${error.message}`, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const level = document.getElementById('registerLevel').value;
  
  try {
    const { data, error } = await signUp(email, password, {
      full_name: name,
      education_level: level
    });
    
    if (error) throw error;
    
    showMessage('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول.', 'success');
    
    // Switch to login form
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    
  } catch (error) {
    showMessage(`خطأ في إنشاء الحساب: ${error.message}`, 'error');
  }
}

async function handleLogout() {
  try {
    await signOut();
    currentUser = null;
    currentUserProfile = null;
    showAuthContainer();
  } catch (error) {
    showMessage(`خطأ في تسجيل الخروج: ${error.message}`, 'error');
  }
}

// Profile handlers
async function handleProfileUpdate(e) {
  e.preventDefault();
  
  const name = document.getElementById('profile-name').value;
  const level = document.getElementById('profile-level').value;
  const password = document.getElementById('profile-password').value;
  
  try {
    // Update profile
    const { error: profileError } = await updateUserProfile(currentUser.id, {
      full_name: name,
      education_level: level
    });
    
    if (profileError) throw profileError;
    
    // Update password if provided
    if (password) {
      const { error: passwordError } = await updatePassword(password);
      if (passwordError) throw passwordError;
    }
    
    // Refresh profile data
    const { data: profile } = await getUserProfile(currentUser.id);
    currentUserProfile = profile;
    
    showMessage('تم تحديث الملف الشخصي بنجاح!', 'success');
    
  } catch (error) {
    showMessage(`خطأ في تحديث الملف الشخصي: ${error.message}`, 'error');
  }
}

async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const { data: avatarUrl, error } = await uploadAvatar(currentUser.id, file);
    
    if (error) throw error;
    
    // Update profile with new avatar URL
    await updateUserProfile(currentUser.id, { avatar_url: avatarUrl });
    
    // Update UI
    document.getElementById('profile-avatar').src = avatarUrl;
    document.getElementById('user-avatar').src = avatarUrl;
    
    showMessage('تم تحديث الصورة الشخصية بنجاح!', 'success');
    
  } catch (error) {
    showMessage(`خطأ في رفع الصورة: ${error.message}`, 'error');
  }
}

// Course handlers
async function handleCreateCourse(e) {
  e.preventDefault();
  
  const title = document.getElementById('course-title').value;
  const description = document.getElementById('course-description').value;
  const price = parseFloat(document.getElementById('course-price').value);
  const targetLevel = document.getElementById('course-target-level').value;
  const imageUrl = document.getElementById('course-image').value;
  
  try {
    const { error } = await createCourse({
      title,
      description,
      price,
      target_level: targetLevel,
      image_url: imageUrl || 'https://images.pexels.com/photos/3729557/pexels-photo-3729557.jpeg'
    });
    
    if (error) throw error;
    
    showMessage('تم إنشاء الكورس بنجاح!', 'success');
    hideModal('create-course-modal');
    
    // Reset form
    document.getElementById('createCourseForm').reset();
    
    // Reload courses
    if (currentUserProfile?.role === 'admin') {
      loadAdminCourses();
    } else {
      loadInstructorCourses();
    }
    
  } catch (error) {
    showMessage(`خطأ في إنشاء الكورس: ${error.message}`, 'error');
  }
}

// Lecture handlers
async function handleCreateLecture(e) {
  e.preventDefault();
  
  const title = document.getElementById('lecture-title').value;
  const description = document.getElementById('lecture-description').value;
  const duration = parseInt(document.getElementById('lecture-duration').value) || 0;
  const order = parseInt(document.getElementById('lecture-order').value) || 0;
  
  try {
    const { error } = await createLecture({
      course_id: currentCourse.id,
      title,
      description,
      duration,
      order_index: order
    });
    
    if (error) throw error;
    
    showMessage('تم إضافة المحاضرة بنجاح!', 'success');
    hideModal('create-lecture-modal');
    
    // Reset form
    document.getElementById('createLectureForm').reset();
    
    // Reload lectures
    loadLecturesForManagement();
    
  } catch (error) {
    showMessage(`خطأ في إضافة المحاضرة: ${error.message}`, 'error');
  }
}

// Material handlers
async function handleCreateMaterial(e) {
  e.preventDefault();
  
  const title = document.getElementById('material-title').value;
  const type = document.getElementById('material-type').value;
  const url = document.getElementById('material-url').value;
  const duration = parseInt(document.getElementById('material-duration').value) || 0;
  const order = parseInt(document.getElementById('material-order').value) || 0;
  
  if (!url) {
    showMessage('يرجى إدخال رابط المادة أو رفع ملف', 'error');
    return;
  }
  
  try {
    const { error } = await createLectureMaterial({
      lecture_id: currentLectureId,
      title,
      type,
      url,
      duration,
      order_index: order
    });
    
    if (error) throw error;
    
    showMessage('تم إضافة المادة بنجاح!', 'success');
    hideModal('create-material-modal');
    
    // Reset form
    document.getElementById('createMaterialForm').reset();
    
    // Reset upload UI
    const placeholder = document.querySelector('.file-upload-placeholder');
    const progressContainer = document.getElementById('file-upload-progress');
    const successContainer = document.getElementById('file-upload-success');
    
    if (placeholder) placeholder.style.display = 'block';
    if (progressContainer) progressContainer.style.display = 'none';
    if (successContainer) successContainer.style.display = 'none';
    
    // Reload materials
    loadMaterialsForManagement();
    
  } catch (error) {
    showMessage(`خطأ في إضافة المادة: ${error.message}`, 'error');
  }
}

// Subscription handlers
async function handleSubscription(e) {
  e.preventDefault();
  
  const code = document.getElementById('subscription-code').value;
  
  try {
    // Validate code
    const { data: validCode, error: validationError } = await validateSubscriptionCode(code, currentCourse.id);
    
    if (validationError) throw validationError;
    
    // Use code
    const { error: useError } = await useSubscriptionCode(validCode.id, currentUser.id, currentCourse.id);
    
    if (useError) throw useError;
    
    showMessage('تم الاشتراك في الكورس بنجاح!', 'success');
    hideModal('subscription-modal');
    
    // Reload course content
    showCourseContent(currentCourse.id);
    
  } catch (error) {
    showMessage(`خطأ في الاشتراك: ${error.message}`, 'error');
  }
}

// Admin handlers
async function handleCreateCode(e) {
  e.preventDefault();
  
  const courseId = document.getElementById('code-course').value;
  const code = document.getElementById('code-value').value;
  const validity = parseInt(document.getElementById('code-validity').value);
  const usageLimit = parseInt(document.getElementById('code-usage-limit').value);
  
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validity);
    
    const { error } = await createSubscriptionCode({
      course_id: courseId,
      code,
      validity_days: validity,
      expires_at: expiresAt.toISOString(),
      usage_limit: usageLimit
    });
    
    if (error) throw error;
    
    showMessage('تم إنشاء الكود بنجاح!', 'success');
    hideModal('create-code-modal');
    
    // Reset form
    document.getElementById('createCodeForm').reset();
    
    // Reload codes
    loadSubscriptionCodes();
    
  } catch (error) {
    showMessage(`خطأ في إنشاء الكود: ${error.message}`, 'error');
  }
}

async function handleEditCode(e) {
  e.preventDefault();
  
  const code = document.getElementById('edit-code-value').value;
  const validity = parseInt(document.getElementById('edit-code-validity').value);
  const usageLimit = parseInt(document.getElementById('edit-code-usage-limit').value);
  
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validity);
    
    const { error } = await updateSubscriptionCode(currentCodeId, {
      code,
      validity_days: validity,
      expires_at: expiresAt.toISOString(),
      usage_limit: usageLimit
    });
    
    if (error) throw error;
    
    showMessage('تم تحديث الكود بنجاح!', 'success');
    hideModal('edit-code-modal');
    
    // Reload codes
    loadSubscriptionCodes();
    
  } catch (error) {
    showMessage(`خطأ في تحديث الكود: ${error.message}`, 'error');
  }
}

async function handleEditUserRole(e) {
  e.preventDefault();
  
  const newRole = document.getElementById('edit-user-role').value;
  
  try {
    const { error } = await updateUserRole(currentEditUserId, newRole);
    
    if (error) throw error;
    
    showMessage('تم تحديث دور المستخدم بنجاح!', 'success');
    hideModal('edit-user-role-modal');
    
    // Reload users
    loadAllUsers();
    
  } catch (error) {
    showMessage(`خطأ في تحديث دور المستخدم: ${error.message}`, 'error');
  }
}

async function handleUserSearch() {
  const searchTerm = document.getElementById('user-search').value.trim();
  
  if (!searchTerm) {
    showMessage('يرجى إدخال معرف المستخدم للبحث', 'error');
    return;
  }
  
  try {
    const { data: users, error } = await searchUsersByID(searchTerm);
    
    if (error) throw error;
    
    displayUsers(users);
    
  } catch (error) {
    showMessage(`خطأ في البحث: ${error.message}`, 'error');
  }
}

async function handleClearSearch() {
  document.getElementById('user-search').value = '';
  loadAllUsers();
}

// UI functions
function showAuthContainer() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('auth-container').style.display = 'flex';
  document.getElementById('main-container').style.display = 'none';
}

function showMainApp() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('main-container').style.display = 'block';
  
  // Update user info
  updateUserInfo();
  
  // Load initial data
  loadCourses();
  
  // Show appropriate navigation items
  updateNavigation();
}

function updateUserInfo() {
  if (currentUserProfile) {
    // Update avatar
    const avatarUrl = currentUserProfile.avatar_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMwMDdiZmYiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAxMkM5Ljc5IDEyIDggMTAuMjEgOCA4UzkuNzkgNCA1IDRTMTYgNS43OSAxNiA4UzE0LjIxIDEyIDEyIDEyWk0xMiAxNEM5LjMzIDE0IDQgMTUuMzQgNCAyMFYyMkgyMFYyMEMxNiAxNS4zNCAxNC42NyAxNCAxMiAxNFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K';
    document.getElementById('user-avatar').src = avatarUrl;
    
    // Update profile form
    document.getElementById('profile-user-id').value = currentUserProfile.user_id;
    document.getElementById('profile-name').value = currentUserProfile.full_name || '';
    document.getElementById('profile-email').value = currentUser.email || '';
    document.getElementById('profile-level').value = currentUserProfile.education_level || '';
    document.getElementById('profile-role').value = getRoleDisplayName(currentUserProfile.role || 'student');
    document.getElementById('profile-avatar').src = avatarUrl;
  }
}

function updateNavigation() {
  const isAdminUser = currentUserProfile?.role === 'admin' || currentUserProfile?.is_admin;
  const isInstructor = currentUserProfile?.role === 'instructor';
  
  // Show/hide admin link
  const adminLink = document.getElementById('admin-link');
  const adminDropdownLink = document.getElementById('admin-dropdown-link');
  
  if (isAdminUser) {
    if (adminLink) adminLink.style.display = 'block';
    if (adminDropdownLink) adminDropdownLink.style.display = 'block';
  } else {
    if (adminLink) adminLink.style.display = 'none';
    if (adminDropdownLink) adminDropdownLink.style.display = 'none';
  }
  
  // Show/hide instructor link
  const instructorLink = document.getElementById('instructor-link');
  const instructorDropdownLink = document.getElementById('instructor-dropdown-link');
  
  if (isInstructor || isAdminUser) {
    if (instructorLink) instructorLink.style.display = 'block';
    if (instructorDropdownLink) instructorDropdownLink.style.display = 'block';
  } else {
    if (instructorLink) instructorLink.style.display = 'none';
    if (instructorDropdownLink) instructorDropdownLink.style.display = 'none';
  }
}

function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show selected page
  const targetPage = document.getElementById(`${pageId}-page`);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  // Update navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  document.querySelectorAll(`[data-page="${pageId}"]`).forEach(link => {
    link.classList.add('active');
  });
  
  // Load page-specific data
  switch (pageId) {
    case 'home':
      loadCourses();
      break;
    case 'admin':
      loadAdminData();
      break;
    case 'instructor':
      loadInstructorData();
      break;
  }
}

function showAdminTab(tabId) {
  // Hide all tab contents
  document.querySelectorAll('.admin-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Show selected tab content
  const targetContent = document.getElementById(`admin-${tabId}`);
  if (targetContent) {
    targetContent.classList.add('active');
  }
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  
  // Load tab-specific data
  switch (tabId) {
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

function showModal(modalId) {
  document.getElementById('modal-overlay').classList.add('active');
  document.getElementById(modalId).style.display = 'block';
}

function hideModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
  document.getElementById('modal-overlay').classList.remove('active');
}

function hideAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
  document.getElementById('modal-overlay').classList.remove('active');
}

function showMessage(message, type = 'info') {
  // Create message element
  const messageEl = document.createElement('div');
  messageEl.className = `message ${type}`;
  messageEl.textContent = message;
  
  // Add to page
  const container = document.querySelector('.container') || document.body;
  container.insertBefore(messageEl, container.firstChild);
  
  // Remove after 5 seconds
  setTimeout(() => {
    messageEl.remove();
  }, 5000);
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

// Load functions
async function loadCourses() {
  try {
    const { data: courses, error } = await getCourses();
    
    if (error) throw error;
    
    displayCourses(courses || []);
    
  } catch (error) {
    console.error('Error loading courses:', error);
    showMessage(`خطأ في تحميل الكورسات: ${error.message}`, 'error');
  }
}

function displayCourses(courses) {
  const container = document.getElementById('courses-grid');
  if (!container) return;
  
  if (courses.length === 0) {
    container.innerHTML = '<p class="text-center">لا توجد كورسات متاحة حالياً</p>';
    return;
  }
  
  container.innerHTML = courses.map(course => `
    <div class="course-card">
      <img src="${course.image_url || 'https://images.pexels.com/photos/3729557/pexels-photo-3729557.jpeg'}" alt="${course.title}" class="course-image">
      <div class="course-content">
        <h3 class="course-title">${course.title}</h3>
        <p class="course-description">${course.description}</p>
        <div class="course-price">${course.price} ج.م</div>
        <div class="course-actions">
          <button class="btn-secondary" onclick="showCoursePreview('${course.id}')">معاينة</button>
          <button class="btn-primary" onclick="subscribeToCourse('${course.id}')">اشتراك</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function showCoursePreview(courseId) {
  try {
    const { data: course, error } = await getCourse(courseId);
    
    if (error) throw error;
    
    currentCourse = course;
    
    // Update preview content
    document.getElementById('course-preview-title').textContent = course.title;
    
    const previewContent = document.getElementById('course-preview-content');
    previewContent.innerHTML = `
      <img src="${course.image_url || 'https://images.pexels.com/photos/3729557/pexels-photo-3729557.jpeg'}" alt="${course.title}" class="course-preview-image">
      
      <div class="course-info">
        <h4>وصف الكورس</h4>
        <p>${course.description}</p>
        <p><strong>السعر:</strong> ${course.price} ج.م</p>
        <p><strong>الفئة المستهدفة:</strong> ${course.target_level || 'الكل'}</p>
      </div>
      
      <div class="course-lectures">
        <h5>المحاضرات المتاحة</h5>
        ${course.lectures && course.lectures.length > 0 ? 
          course.lectures.map(lecture => `
            <div class="lecture-preview-item">
              <h6><i class="fas fa-play-circle"></i> ${lecture.title}</h6>
              <p>${lecture.description || 'لا يوجد وصف'}</p>
              <p class="lecture-duration">المدة: ${lecture.duration} دقيقة</p>
              ${lecture.lecture_materials && lecture.lecture_materials.length > 0 ? `
                <div class="materials-preview">
                  <small><strong>المواد:</strong> ${lecture.lecture_materials.length} مادة تعليمية</small>
                </div>
              ` : ''}
            </div>
          `).join('') : 
          '<p>لا توجد محاضرات متاحة حالياً</p>'
        }
      </div>
      
      <div style="text-align: center; margin-top: 20px;">
        <button class="btn-primary" onclick="subscribeToCourse('${course.id}')">اشتراك في الكورس</button>
      </div>
    `;
    
    showPage('course-preview');
    
  } catch (error) {
    console.error('Error loading course preview:', error);
    showMessage(`خطأ في تحميل معاينة الكورس: ${error.message}`, 'error');
  }
}

async function subscribeToCourse(courseId) {
  try {
    // Check if user already has access
    const { data: access } = await checkUserCourseAccess(currentUser.id, courseId);
    
    if (access) {
      showCourseContent(courseId);
      return;
    }
    
    // Show subscription modal
    const { data: course } = await getCourse(courseId);
    currentCourse = course;
    
    document.getElementById('course-details').innerHTML = `
      <h4>${course.title}</h4>
      <p>السعر: ${course.price} ج.م</p>
    `;
    
    showModal('subscription-modal');
    
  } catch (error) {
    console.error('Error subscribing to course:', error);
    showMessage(`خطأ في الاشتراك: ${error.message}`, 'error');
  }
}

async function showCourseContent(courseId) {
  try {
    const { data: course, error } = await getCourse(courseId);
    
    if (error) throw error;
    
    currentCourse = course;
    
    // Update course content title
    document.getElementById('course-content-title').textContent = course.title;
    
    // Load course layout
    const wrapper = document.getElementById('course-content-wrapper');
    wrapper.innerHTML = `
      <div class="course-layout">
        <div class="main-content-area">
          <div id="material-viewer">
            <div class="welcome-message">
              <h3>مرحباً بك في كورس ${course.title}</h3>
              <p>اختر محاضرة من القائمة الجانبية للبدء</p>
            </div>
          </div>
        </div>
        
        <div class="course-sidebar">
          <h4>المحاضرات</h4>
          <div id="lectures-sidebar" class="lectures-list">
            <!-- Lectures will be loaded here -->
          </div>
        </div>
        
        <div class="materials-bottom-panel">
          <div class="materials-header">
            <h5>مواد المحاضرة</h5>
          </div>
          <div id="materials-grid" class="materials-grid">
            <div class="no-materials">اختر محاضرة لعرض موادها</div>
          </div>
        </div>
      </div>
    `;
    
    // Load lectures
    await loadCourseLectures(courseId);
    
    showPage('course-content');
    
  } catch (error) {
    console.error('Error loading course content:', error);
    showMessage(`خطأ في تحميل محتوى الكورس: ${error.message}`, 'error');
  }
}

async function loadCourseLectures(courseId) {
  try {
    const { data: lectures, error } = await getCourseLectures(courseId);
    
    if (error) throw error;
    
    const sidebar = document.getElementById('lectures-sidebar');
    if (!sidebar) return;
    
    if (!lectures || lectures.length === 0) {
      sidebar.innerHTML = '<p>لا توجد محاضرات متاحة</p>';
      return;
    }
    
    sidebar.innerHTML = lectures.map(lecture => `
      <div class="lecture-sidebar-item" onclick="selectLecture('${lecture.id}')">
        <h6>${lecture.title}</h6>
        <p>${lecture.description || 'لا يوجد وصف'}</p>
        <p>المدة: ${lecture.duration} دقيقة</p>
        <span class="materials-count">${lecture.materials_count || 0} مادة</span>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading course lectures:', error);
    showMessage(`خطأ في تحميل المحاضرات: ${error.message}`, 'error');
  }
}

async function selectLecture(lectureId) {
  try {
    // Update active lecture
    document.querySelectorAll('.lecture-sidebar-item').forEach(item => {
      item.classList.remove('active');
    });
    
    event.target.closest('.lecture-sidebar-item').classList.add('active');
    
    // Find lecture data
    const { data: lectures } = await getCourseLectures(currentCourse.id);
    currentLecture = lectures.find(l => l.id === lectureId);
    
    if (!currentLecture) return;
    
    // Update main content area
    const viewer = document.getElementById('material-viewer');
    viewer.innerHTML = `
      <div class="lecture-info">
        <h3>${currentLecture.title}</h3>
        <p class="lecture-description">${currentLecture.description || 'لا يوجد وصف للمحاضرة'}</p>
        <p class="select-material-hint">اختر مادة من الأسفل لعرضها</p>
      </div>
    `;
    
    // Load lecture materials
    await loadLectureMaterials(lectureId);
    
  } catch (error) {
    console.error('Error selecting lecture:', error);
    showMessage(`خطأ في تحديد المحاضرة: ${error.message}`, 'error');
  }
}

async function loadLectureMaterials(lectureId) {
  try {
    const materialsGrid = document.getElementById('materials-grid');
    if (!materialsGrid) return;
    
    if (!currentLecture.lecture_materials || currentLecture.lecture_materials.length === 0) {
      materialsGrid.innerHTML = '<div class="no-materials">لا توجد مواد لهذه المحاضرة</div>';
      return;
    }
    
    materialsGrid.innerHTML = currentLecture.lecture_materials
      .sort((a, b) => a.order_index - b.order_index)
      .map(material => `
        <div class="material-card" onclick="selectMaterial('${material.id}')">
          <div class="material-icon">
            <i class="fas ${getMaterialIcon(material.type)}"></i>
          </div>
          <div class="material-info">
            <h6>${material.title}</h6>
            <p class="material-type">${getMaterialTypeName(material.type)}</p>
            ${material.duration > 0 ? `<p class="material-duration">${material.duration} دقيقة</p>` : ''}
          </div>
        </div>
      `).join('');
    
  } catch (error) {
    console.error('Error loading lecture materials:', error);
    showMessage(`خطأ في تحميل مواد المحاضرة: ${error.message}`, 'error');
  }
}

function selectMaterial(materialId) {
  // Update active material
  document.querySelectorAll('.material-card').forEach(card => {
    card.classList.remove('active');
  });
  
  event.target.closest('.material-card').classList.add('active');
  
  // Find material data
  const material = currentLecture.lecture_materials.find(m => m.id === materialId);
  if (!material) return;
  
  currentMaterial = material;
  
  // Display material
  displayMaterial(material);
}

function displayMaterial(material) {
  const viewer = document.getElementById('material-viewer');
  
  const materialHeader = `
    <div class="material-header">
      <h3>${material.title}</h3>
      <span class="material-type-badge">${getMaterialTypeName(material.type)}</span>
    </div>
  `;
  
  let materialContent = '';
  
  switch (material.type) {
    case 'video':
      if (material.url.includes('youtube.com') || material.url.includes('youtu.be')) {
        const embedUrl = getYouTubeEmbedUrl(material.url);
        materialContent = `
          <div class="material-content">
            <div class="video-player">
              <iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
            </div>
          </div>
        `;
      } else {
        materialContent = `
          <div class="material-content">
            <div class="video-player">
              <video controls>
                <source src="${material.url}" type="video/mp4">
                متصفحك لا يدعم تشغيل الفيديو
              </video>
            </div>
          </div>
        `;
      }
      break;
      
    case 'pdf':
      materialContent = `
        <div class="material-content">
          <div class="pdf-viewer">
            <iframe src="${material.url}" type="application/pdf"></iframe>
          </div>
        </div>
      `;
      break;
      
    case 'image':
      materialContent = `
        <div class="material-content">
          <div class="image-viewer">
            <img src="${material.url}" alt="${material.title}">
          </div>
        </div>
      `;
      break;
      
    case 'audio':
      materialContent = `
        <div class="material-content">
          <div class="audio-viewer">
            <audio controls>
              <source src="${material.url}">
              متصفحك لا يدعم تشغيل الصوت
            </audio>
            <div class="audio-info">
              <h4>${material.title}</h4>
              <p>مدة التشغيل: ${material.duration} دقيقة</p>
            </div>
          </div>
        </div>
      `;
      break;
      
    default:
      materialContent = `
        <div class="material-content">
          <div class="file-viewer">
            <div class="file-info">
              <i class="file-icon-large fas ${getMaterialIcon(material.type)}"></i>
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
  
  viewer.innerHTML = materialHeader + materialContent;
}

function getMaterialIcon(type) {
  const icons = {
    video: 'fa-play-circle',
    pdf: 'fa-file-pdf',
    document: 'fa-file-alt',
    image: 'fa-image',
    audio: 'fa-volume-up'
  };
  return icons[type] || 'fa-file';
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

// Admin functions
async function loadAdminData() {
  loadAdminCourses();
}

async function loadAdminCourses() {
  try {
    const { data: courses, error } = await getCourses();
    
    if (error) throw error;
    
    displayAdminCourses(courses || []);
    
  } catch (error) {
    console.error('Error loading admin courses:', error);
    showMessage(`خطأ في تحميل الكورسات: ${error.message}`, 'error');
  }
}

function displayAdminCourses(courses) {
  const container = document.getElementById('admin-courses-list');
  if (!container) return;
  
  if (courses.length === 0) {
    container.innerHTML = '<p class="text-center">لا توجد كورسات</p>';
    return;
  }
  
  container.innerHTML = courses.map(course => `
    <div class="admin-item">
      <div class="admin-item-info">
        <h4>${course.title}</h4>
        <p>${course.description}</p>
        <p><strong>السعر:</strong> ${course.price} ج.م | <strong>الفئة:</strong> ${course.target_level || 'الكل'}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-secondary" onclick="manageLectures('${course.id}')">إدارة المحاضرات</button>
        <button class="btn-danger" onclick="deleteCourseAdmin('${course.id}')">حذف</button>
      </div>
    </div>
  `).join('');
}

async function deleteCourseAdmin(courseId) {
  if (!confirm('هل أنت متأكد من حذف هذا الكورس؟')) return;
  
  try {
    const { error } = await deleteCourse(courseId);
    
    if (error) throw error;
    
    showMessage('تم حذف الكورس بنجاح!', 'success');
    loadAdminCourses();
    
  } catch (error) {
    showMessage(`خطأ في حذف الكورس: ${error.message}`, 'error');
  }
}

async function manageLectures(courseId) {
  try {
    const { data: course, error } = await getCourse(courseId);
    
    if (error) throw error;
    
    currentCourse = course;
    
    // Update modal title
    document.querySelector('#manage-lectures-modal .modal-header h3').textContent = `إدارة محاضرات: ${course.title}`;
    
    // Load lectures
    await loadLecturesForManagement();
    
    showModal('manage-lectures-modal');
    
  } catch (error) {
    showMessage(`خطأ في تحميل المحاضرات: ${error.message}`, 'error');
  }
}

async function loadLecturesForManagement() {
  try {
    const { data: lectures, error } = await getCourseLectures(currentCourse.id);
    
    if (error) throw error;
    
    const container = document.getElementById('lectures-list');
    if (!container) return;
    
    if (!lectures || lectures.length === 0) {
      container.innerHTML = '<p class="text-center">لا توجد محاضرات</p>';
      return;
    }
    
    container.innerHTML = lectures.map(lecture => `
      <div class="lecture-item">
        <div class="lecture-info">
          <h5>${lecture.title}</h5>
          <p>${lecture.description || 'لا يوجد وصف'}</p>
          <p><strong>المدة:</strong> ${lecture.duration} دقيقة | <strong>الترتيب:</strong> ${lecture.order_index}</p>
          <p><strong>المواد:</strong> ${lecture.materials_count || 0} مادة</p>
        </div>
        <div class="lecture-actions">
          <button class="btn-secondary" onclick="manageMaterials('${lecture.id}')">إدارة المواد</button>
          <button class="btn-danger" onclick="deleteLectureAdmin('${lecture.id}')">حذف</button>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading lectures for management:', error);
    showMessage(`خطأ في تحميل المحاضرات: ${error.message}`, 'error');
  }
}

async function deleteLectureAdmin(lectureId) {
  if (!confirm('هل أنت متأكد من حذف هذه المحاضرة؟')) return;
  
  try {
    const { error } = await deleteLecture(lectureId);
    
    if (error) throw error;
    
    showMessage('تم حذف المحاضرة بنجاح!', 'success');
    loadLecturesForManagement();
    
  } catch (error) {
    showMessage(`خطأ في حذف المحاضرة: ${error.message}`, 'error');
  }
}

async function manageMaterials(lectureId) {
  try {
    currentLectureId = lectureId;
    
    // Find lecture
    const { data: lectures } = await getCourseLectures(currentCourse.id);
    const lecture = lectures.find(l => l.id === lectureId);
    
    if (!lecture) return;
    
    // Update modal title
    document.querySelector('#manage-materials-modal .modal-header h3').textContent = `إدارة مواد: ${lecture.title}`;
    
    // Load materials
    await loadMaterialsForManagement();
    
    showModal('manage-materials-modal');
    
  } catch (error) {
    showMessage(`خطأ في تحميل المواد: ${error.message}`, 'error');
  }
}

async function loadMaterialsForManagement() {
  try {
    const { data: lectures } = await getCourseLectures(currentCourse.id);
    const lecture = lectures.find(l => l.id === currentLectureId);
    
    if (!lecture) return;
    
    const container = document.getElementById('materials-list');
    if (!container) return;
    
    if (!lecture.lecture_materials || lecture.lecture_materials.length === 0) {
      container.innerHTML = '<p class="text-center">لا توجد مواد</p>';
      return;
    }
    
    container.innerHTML = lecture.lecture_materials.map(material => `
      <div class="material-item">
        <div class="material-info">
          <h6><i class="fas ${getMaterialIcon(material.type)}"></i> ${material.title}</h6>
          <p><strong>النوع:</strong> ${getMaterialTypeName(material.type)}</p>
          <p><strong>الترتيب:</strong> ${material.order_index}</p>
          ${material.duration > 0 ? `<p><strong>المدة:</strong> ${material.duration} دقيقة</p>` : ''}
        </div>
        <div class="material-actions">
          <button class="btn-danger" onclick="deleteMaterialAdmin('${material.id}')">حذف</button>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading materials for management:', error);
    showMessage(`خطأ في تحميل المواد: ${error.message}`, 'error');
  }
}

async function deleteMaterialAdmin(materialId) {
  if (!confirm('هل أنت متأكد من حذف هذه المادة؟')) return;
  
  try {
    const { error } = await deleteLectureMaterial(materialId);
    
    if (error) throw error;
    
    showMessage('تم حذف المادة بنجاح!', 'success');
    loadMaterialsForManagement();
    
  } catch (error) {
    showMessage(`خطأ في حذف المادة: ${error.message}`, 'error');
  }
}

function showCreateLectureModal() {
  showModal('create-lecture-modal');
}

function showCreateMaterialModal() {
  showModal('create-material-modal');
}

async function loadAllUsers() {
  try {
    const { data: users, error } = await getAllUsers();
    
    if (error) throw error;
    
    displayUsers(users || []);
    
  } catch (error) {
    console.error('Error loading users:', error);
    showMessage(`خطأ في تحميل المستخدمين: ${error.message}`, 'error');
  }
}

function displayUsers(users) {
  const container = document.getElementById('admin-users-list');
  if (!container) return;
  
  if (users.length === 0) {
    container.innerHTML = '<p class="text-center">لا توجد مستخدمين</p>';
    return;
  }
  
  container.innerHTML = users.map(user => `
    <div class="admin-item">
      <div class="admin-item-info">
        <h4>${user.full_name}</h4>
        <p><span class="user-id">${user.user_id}</span></p>
        <p><strong>المرحلة:</strong> ${user.education_level} | <strong>الدور:</strong> ${getRoleDisplayName(user.role || 'student')}</p>
        <p><strong>الكورسات المشترك بها:</strong> ${user.enrolled_courses_count || 0}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-secondary" onclick="editUserRole('${user.user_id}', '${user.full_name}', '${user.role || 'student'}')">تعديل الدور</button>
      </div>
    </div>
  `).join('');
}

function editUserRole(userId, userName, currentRole) {
  currentEditUserId = userId;
  
  document.getElementById('edit-user-name').value = userName;
  document.getElementById('edit-user-role').value = currentRole;
  
  showModal('edit-user-role-modal');
}

async function loadSubscriptionCodes() {
  try {
    const { data: codes, error } = await getSubscriptionCodes();
    
    if (error) throw error;
    
    displaySubscriptionCodes(codes || []);
    
  } catch (error) {
    console.error('Error loading subscription codes:', error);
    showMessage(`خطأ في تحميل أكواد الاشتراك: ${error.message}`, 'error');
  }
}

function displaySubscriptionCodes(codes) {
  const container = document.getElementById('admin-codes-list');
  if (!container) return;
  
  if (codes.length === 0) {
    container.innerHTML = '<p class="text-center">لا توجد أكواد اشتراك</p>';
    return;
  }
  
  container.innerHTML = codes.map(code => `
    <div class="admin-item">
      <div class="admin-item-info">
        <h4>${code.code}</h4>
        <p><strong>الكورس:</strong> ${code.courses?.title || 'غير محدد'}</p>
        <p><strong>مدة الصلاحية:</strong> ${code.validity_days} يوم</p>
        <p><strong>الاستخدام:</strong> ${code.used_count}/${code.usage_limit}</p>
        <p><strong>تاريخ الانتهاء:</strong> ${new Date(code.expires_at).toLocaleDateString('ar-EG')}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-secondary" onclick="editCode('${code.id}', '${code.code}', ${code.validity_days}, ${code.usage_limit})">تعديل</button>
        <button class="btn-danger" onclick="deleteCode('${code.id}')">حذف</button>
      </div>
    </div>
  `).join('');
}

function editCode(codeId, code, validity, usageLimit) {
  currentCodeId = codeId;
  
  document.getElementById('edit-code-value').value = code;
  document.getElementById('edit-code-validity').value = validity;
  document.getElementById('edit-code-usage-limit').value = usageLimit;
  
  showModal('edit-code-modal');
}

async function deleteCode(codeId) {
  if (!confirm('هل أنت متأكد من حذف هذا الكود؟')) return;
  
  try {
    const { error } = await deleteSubscriptionCode(codeId);
    
    if (error) throw error;
    
    showMessage('تم حذف الكود بنجاح!', 'success');
    loadSubscriptionCodes();
    
  } catch (error) {
    showMessage(`خطأ في حذف الكود: ${error.message}`, 'error');
  }
}

async function loadCoursesForCodeModal() {
  try {
    const { data: courses, error } = await getCourses();
    
    if (error) throw error;
    
    const select = document.getElementById('code-course');
    if (!select) return;
    
    select.innerHTML = '<option value="">اختر الكورس</option>' + 
      (courses || []).map(course => `
        <option value="${course.id}">${course.title}</option>
      `).join('');
    
  } catch (error) {
    console.error('Error loading courses for code modal:', error);
  }
}

function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  document.getElementById('code-value').value = code;
}

// Instructor functions
async function loadInstructorData() {
  loadInstructorCourses();
}

async function loadInstructorCourses() {
  try {
    const { data: courses, error } = await getCourses();
    
    if (error) throw error;
    
    displayInstructorCourses(courses || []);
    
  } catch (error) {
    console.error('Error loading instructor courses:', error);
    showMessage(`خطأ في تحميل الكورسات: ${error.message}`, 'error');
  }
}

function displayInstructorCourses(courses) {
  const container = document.getElementById('instructor-courses-list');
  if (!container) return;
  
  if (courses.length === 0) {
    container.innerHTML = '<p class="text-center">لا توجد كورسات</p>';
    return;
  }
  
  container.innerHTML = courses.map(course => `
    <div class="admin-item">
      <div class="admin-item-info">
        <h4>${course.title}</h4>
        <p>${course.description}</p>
        <p><strong>السعر:</strong> ${course.price} ج.م | <strong>الفئة:</strong> ${course.target_level || 'الكل'}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-secondary" onclick="manageLectures('${course.id}')">إدارة المحاضرات</button>
      </div>
    </div>
  `).join('');
}

// Global variables for modals
let currentCodeId = null;
let currentEditUserId = null;

// Load theme on startup
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    document.querySelector('#theme-toggle i').className = 'fas fa-sun';
  }
});

// Make functions globally available
window.showCoursePreview = showCoursePreview;
window.subscribeToCourse = subscribeToCourse;
window.selectLecture = selectLecture;
window.selectMaterial = selectMaterial;
window.deleteCourseAdmin = deleteCourseAdmin;
window.manageLectures = manageLectures;
window.deleteLectureAdmin = deleteLectureAdmin;
window.manageMaterials = manageMaterials;
window.deleteMaterialAdmin = deleteMaterialAdmin;
window.showCreateLectureModal = showCreateLectureModal;
window.showCreateMaterialModal = showCreateMaterialModal;
window.editUserRole = editUserRole;
window.editCode = editCode;
window.deleteCode = deleteCode;
