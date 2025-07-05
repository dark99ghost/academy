// نظام إدارة التعلم - التطبيق الرئيسي
class LMSApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'login';
        this.courses = [];
        this.users = [];
        this.lessons = [];
        this.enrollments = [];
        this.init();
    }

    async init() {
        // التحقق من المستخدم المسجل
        await this.checkUser();
        this.render();
        this.setupEventListeners();
    }

    async checkUser() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: userProfile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (userProfile) {
                    this.currentUser = userProfile;
                    this.currentPage = this.getDashboardPage();
                }
            }
        } catch (error) {
            console.error('خطأ في التحقق من المستخدم:', error);
        }
    }

    getDashboardPage() {
        if (!this.currentUser) return 'login';
        
        switch (this.currentUser.role) {
            case 'admin': return 'admin-dashboard';
            case 'trainer': return 'trainer-dashboard';
            case 'student': return 'student-dashboard';
            default: return 'login';
        }
    }

    async loadData() {
        try {
            // تحميل الكورسات
            const { data: courses } = await supabase
                .from('courses')
                .select(`
                    *,
                    trainer:users!courses_trainer_id_fkey(name),
                    course_files(*)
                `)
                .order('created_at', { ascending: false });
            this.courses = courses || [];

            // تحميل المستخدمين (للأدمن فقط)
            if (this.currentUser?.role === 'admin') {
                const { data: users } = await supabase
                    .from('users')
                    .select('*')
                    .order('created_at', { ascending: false });
                this.users = users || [];
            }

            // تحميل الدروس
            const { data: lessons } = await supabase
                .from('lessons')
                .select(`
                    *,
                    course:courses(title),
                    lesson_files(*)
                `)
                .order('order_index');
            this.lessons = lessons || [];

            // تحميل التسجيلات
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select(`
                    *,
                    student:users!enrollments_student_id_fkey(name, email),
                    course:courses(title)
                `);
            this.enrollments = enrollments || [];

        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
        }
    }

    render() {
        const app = document.getElementById('app');
        
        switch (this.currentPage) {
            case 'login':
                app.innerHTML = this.renderLogin();
                break;
            case 'register':
                app.innerHTML = this.renderRegister();
                break;
            case 'admin-dashboard':
                app.innerHTML = this.renderAdminDashboard();
                break;
            case 'trainer-dashboard':
                app.innerHTML = this.renderTrainerDashboard();
                break;
            case 'student-dashboard':
                app.innerHTML = this.renderStudentDashboard();
                break;
            case 'manage-courses':
                app.innerHTML = this.renderManageCourses();
                break;
            case 'manage-lessons':
                app.innerHTML = this.renderManageLessons();
                break;
            case 'manage-users':
                app.innerHTML = this.renderManageUsers();
                break;
            case 'view-enrollments':
                app.innerHTML = this.renderViewEnrollments();
                break;
            default:
                app.innerHTML = this.renderLogin();
        }
    }

    renderLogin() {
        return `
            <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-300 hover:scale-105">
                    <div class="text-center mb-8">
                        <div class="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
                            <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-900 mb-2">أكاديمية التعلم</h2>
                        <p class="text-gray-600">أهلاً بك في منصة التعلم الإلكتروني</p>
                    </div>
                    
                    <form id="login-form" class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                            <input type="email" id="email" required 
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="أدخل بريدك الإلكتروني">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
                            <input type="password" id="password" required 
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="أدخل كلمة المرور">
                        </div>
                        
                        <button type="submit" 
                            class="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105">
                            تسجيل الدخول
                        </button>
                    </form>
                    
                    <div class="mt-6 text-center">
                        <p class="text-gray-600">ليس لديك حساب؟ 
                            <button id="go-to-register" class="text-blue-600 hover:text-blue-700 font-medium">إنشاء حساب جديد</button>
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    renderRegister() {
        return `
            <div class="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-300 hover:scale-105">
                    <div class="text-center mb-8">
                        <div class="mx-auto h-16 w-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-4">
                            <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                            </svg>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-900 mb-2">إنشاء حساب جديد</h2>
                        <p class="text-gray-600">انضم إلى منصة التعلم الإلكتروني</p>
                    </div>
                    
                    <form id="register-form" class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
                            <input type="text" id="name" required 
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                placeholder="أدخل اسمك الكامل">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                            <input type="email" id="register-email" required 
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                placeholder="أدخل بريدك الإلكتروني">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
                            <input type="password" id="register-password" required 
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                placeholder="أدخل كلمة مرور قوية">
                        </div>
                        
                        <button type="submit" 
                            class="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105">
                            إنشاء الحساب
                        </button>
                    </form>
                    
                    <div class="mt-6 text-center">
                        <p class="text-gray-600">لديك حساب بالفعل؟ 
                            <button id="go-to-login" class="text-green-600 hover:text-green-700 font-medium">تسجيل الدخول</button>
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    renderAdminDashboard() {
        return `
            <div class="min-h-screen bg-gray-50">
                ${this.renderHeader()}
                
                <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div class="mb-8">
                        <h1 class="text-3xl font-bold text-gray-900">لوحة تحكم المدير</h1>
                        <p class="mt-2 text-gray-600">مرحباً ${this.currentUser?.name}، إدارة شاملة للمنصة التعليمية</p>
                    </div>
                    
                    <!-- بطاقات الإحصائيات -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                        </svg>
                                    </div>
                                </div>
                                <div class="mr-4">
                                    <p class="text-sm font-medium text-gray-600">إجمالي الكورسات</p>
                                    <p class="text-2xl font-bold text-gray-900">${this.courses.length}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                        </svg>
                                    </div>
                                </div>
                                <div class="mr-4">
                                    <p class="text-sm font-medium text-gray-600">إجمالي المستخدمين</p>
                                    <p class="text-2xl font-bold text-gray-900">${this.users.length}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                    </div>
                                </div>
                                <div class="mr-4">
                                    <p class="text-sm font-medium text-gray-600">إجمالي الدروس</p>
                                    <p class="text-2xl font-bold text-gray-900">${this.lessons.length}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                        </svg>
                                    </div>
                                </div>
                                <div class="mr-4">
                                    <p class="text-sm font-medium text-gray-600">التسجيلات</p>
                                    <p class="text-2xl font-bold text-gray-900">${this.enrollments.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- أزرار الإدارة -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <button onclick="app.navigateTo('manage-courses')" 
                            class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 text-center group">
                            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                </svg>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">إدارة الكورسات</h3>
                            <p class="text-gray-600 text-sm">إضافة وتعديل وحذف الكورسات</p>
                        </button>
                        
                        <button onclick="app.navigateTo('manage-lessons')" 
                            class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 text-center group">
                            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">إدارة الدروس</h3>
                            <p class="text-gray-600 text-sm">إضافة وتنظيم دروس الكورسات</p>
                        </button>
                        
                        <button onclick="app.navigateTo('manage-users')" 
                            class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 text-center group">
                            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                                </svg>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">إدارة المستخدمين</h3>
                            <p class="text-gray-600 text-sm">إدارة حسابات المدربين والطلاب</p>
                        </button>
                        
                        <button onclick="app.navigateTo('view-enrollments')" 
                            class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 text-center group">
                            <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-200 transition-colors">
                                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                                </svg>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">عرض التسجيلات</h3>
                            <p class="text-gray-600 text-sm">متابعة تسجيلات الطلاب</p>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderTrainerDashboard() {
        const trainerCourses = this.courses.filter(course => course.trainer_id === this.currentUser.id);
        const trainerLessons = this.lessons.filter(lesson => 
            trainerCourses.some(course => course.id === lesson.course_id)
        );

        return `
            <div class="min-h-screen bg-gray-50">
                ${this.renderHeader()}
                
                <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div class="mb-8">
                        <h1 class="text-3xl font-bold text-gray-900">لوحة تحكم المدرب</h1>
                        <p class="mt-2 text-gray-600">مرحباً ${this.currentUser?.name}، إدارة كورساتك ودروسك</p>
                    </div>
                    
                    <!-- بطاقات الإحصائيات -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                        </svg>
                                    </div>
                                </div>
                                <div class="mr-4">
                                    <p class="text-sm font-medium text-gray-600">كورساتي</p>
                                    <p class="text-2xl font-bold text-gray-900">${trainerCourses.length}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                    </div>
                                </div>
                                <div class="mr-4">
                                    <p class="text-sm font-medium text-gray-600">دروسي</p>
                                    <p class="text-2xl font-bold text-gray-900">${trainerLessons.length}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                        </svg>
                                    </div>
                                </div>
                                <div class="mr-4">
                                    <p class="text-sm font-medium text-gray-600">الطلاب المسجلين</p>
                                    <p class="text-2xl font-bold text-gray-900">${this.enrollments.filter(e => trainerCourses.some(c => c.id === e.course_id)).length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- أزرار الإدارة -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <button onclick="app.navigateTo('manage-courses')" 
                            class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 text-center group">
                            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                </svg>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">إدارة كورساتي</h3>
                            <p class="text-gray-600 text-sm">إضافة وتعديل كورساتي</p>
                        </button>
                        
                        <button onclick="app.navigateTo('manage-lessons')" 
                            class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 text-center group">
                            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">إدارة دروسي</h3>
                            <p class="text-gray-600 text-sm">إضافة وتنظيم الدروس</p>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderStudentDashboard() {
        const studentEnrollments = this.enrollments.filter(e => e.student_id === this.currentUser.id);
        const enrolledCourses = this.courses.filter(course => 
            studentEnrollments.some(e => e.course_id === course.id)
        );

        return `
            <div class="min-h-screen bg-gray-50">
                ${this.renderHeader()}
                
                <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div class="mb-8">
                        <h1 class="text-3xl font-bold text-gray-900">لوحة تحكم الطالب</h1>
                        <p class="mt-2 text-gray-600">مرحباً ${this.currentUser?.name}، تابع تقدمك في التعلم</p>
                    </div>
                    
                    <!-- بطاقات الإحصائيات -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                        </svg>
                                    </div>
                                </div>
                                <div class="mr-4">
                                    <p class="text-sm font-medium text-gray-600">الكورسات المسجلة</p>
                                    <p class="text-2xl font-bold text-gray-900">${enrolledCourses.length}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                    </div>
                                </div>
                                <div class="mr-4">
                                    <p class="text-sm font-medium text-gray-600">الكورسات المكتملة</p>
                                    <p class="text-2xl font-bold text-gray-900">${studentEnrollments.filter(e => e.status === 'completed').length}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                    </div>
                                </div>
                                <div class="mr-4">
                                    <p class="text-sm font-medium text-gray-600">قيد التقدم</p>
                                    <p class="text-2xl font-bold text-gray-900">${studentEnrollments.filter(e => e.status === 'in_progress').length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- الكورسات المتاحة -->
                    <div class="bg-white rounded-xl shadow-md p-6 mb-8">
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-xl font-bold text-gray-900">الكورسات المتاحة</h2>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${this.courses.filter(course => !enrolledCourses.some(ec => ec.id === course.id)).map(course => `
                                <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <h3 class="font-semibold text-gray-900 mb-2">${course.title}</h3>
                                    <p class="text-gray-600 text-sm mb-3">${course.description}</p>
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-gray-500">المدرب: ${course.trainer?.name || 'غير محدد'}</span>
                                        <button onclick="app.enrollInCourse('${course.id}')" 
                                            class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                                            التسجيل
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- كورساتي -->
                    <div class="bg-white rounded-xl shadow-md p-6">
                        <h2 class="text-xl font-bold text-gray-900 mb-6">كورساتي</h2>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${enrolledCourses.map(course => {
                                const enrollment = studentEnrollments.find(e => e.course_id === course.id);
                                return `
                                    <div class="border border-gray-200 rounded-lg p-4">
                                        <h3 class="font-semibold text-gray-900 mb-2">${course.title}</h3>
                                        <p class="text-gray-600 text-sm mb-3">${course.description}</p>
                                        <div class="flex items-center justify-between">
                                            <span class="text-sm px-2 py-1 rounded-full ${
                                                enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                enrollment.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                                                'bg-gray-100 text-gray-800'
                                            }">${
                                                enrollment.status === 'completed' ? 'مكتمل' :
                                                enrollment.status === 'in_progress' ? 'قيد التقدم' :
                                                'لم يبدأ'
                                            }</span>
                                            <button onclick="app.viewCourse('${course.id}')" 
                                                class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                                                مشاهدة
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderManageCourses() {
        const userCourses = this.currentUser.role === 'admin' ? 
            this.courses : 
            this.courses.filter(course => course.trainer_id === this.currentUser.id);

        return `
            <div class="min-h-screen bg-gray-50">
                ${this.renderHeader()}
                
                <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div class="flex items-center justify-between mb-8">
                        <div>
                            <h1 class="text-3xl font-bold text-gray-900">إدارة الكورسات</h1>
                            <p class="mt-2 text-gray-600">إضافة وتعديل وحذف الكورسات</p>
                        </div>
                        <button onclick="app.showAddCourseModal()" 
                            class="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                            <svg class="w-5 h-5 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            إضافة كورس جديد
                        </button>
                    </div>
                    
                    <!-- جدول الكورسات -->
                    <div class="bg-white rounded-xl shadow-md overflow-hidden">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h2 class="text-lg font-semibold text-gray-900">قائمة الكورسات</h2>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            العنوان
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الوصف
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            المدرب
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            السعر
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الملفات
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الإجراءات
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${userCourses.map(course => `
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm font-medium text-gray-900">${course.title}</div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="text-sm text-gray-900 max-w-xs truncate">${course.description}</div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm text-gray-900">${course.trainer?.name || 'غير محدد'}</div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm text-gray-900">${course.price || 'مجاني'}</div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="flex items-center space-x-2">
                                                    <span class="text-sm text-gray-600">${course.course_files?.length || 0} ملف</span>
                                                    <button onclick="app.showCourseFilesModal('${course.id}')" 
                                                        class="text-blue-600 hover:text-blue-800 text-sm">
                                                        إدارة الملفات
                                                    </button>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                <button onclick="app.editCourse('${course.id}')" 
                                                    class="text-blue-600 hover:text-blue-900">تعديل</button>
                                                <button onclick="app.deleteCourse('${course.id}')" 
                                                    class="text-red-600 hover:text-red-900">حذف</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- Modal إضافة كورس -->
                <div id="addCourseModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-semibold text-gray-900">إضافة كورس جديد</h3>
                                <button onclick="app.hideAddCourseModal()" class="text-gray-400 hover:text-gray-600">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                            
                            <form id="addCourseForm" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">عنوان الكورس</label>
                                    <input type="text" id="courseTitle" required 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">وصف الكورس</label>
                                    <textarea id="courseDescription" rows="3" required 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                                </div>
                                
                                ${this.currentUser.role === 'admin' ? `
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">المدرب</label>
                                        <select id="courseTrainer" required 
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="">اختر المدرب</option>
                                            ${this.users.filter(user => user.role === 'trainer').map(trainer => `
                                                <option value="${trainer.id}">${trainer.name}</option>
                                            `).join('')}
                                        </select>
                                    </div>
                                ` : ''}
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">السعر (اختياري)</label>
                                    <input type="number" id="coursePrice" step="0.01" min="0"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                
                                <div class="flex justify-end space-x-3 pt-4">
                                    <button type="button" onclick="app.hideAddCourseModal()" 
                                        class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                                        إلغاء
                                    </button>
                                    <button type="submit" 
                                        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                        إضافة الكورس
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Modal إدارة ملفات الكورس -->
                <div id="courseFilesModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-semibold text-gray-900">إدارة ملفات الكورس</h3>
                                <button onclick="app.hideCourseFilesModal()" class="text-gray-400 hover:text-gray-600">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                            
                            <!-- رفع الملفات -->
                            <div class="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                                <div class="text-center">
                                    <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                    <div class="mt-4">
                                        <label for="courseFileUpload" class="cursor-pointer">
                                            <span class="mt-2 block text-sm font-medium text-gray-900">
                                                اختر ملفات أو اسحبها هنا
                                            </span>
                                            <input id="courseFileUpload" name="courseFileUpload" type="file" multiple class="sr-only">
                                        </label>
                                        <p class="mt-1 text-xs text-gray-500">PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP حتى 10MB</p>
                                    </div>
                                </div>
                            </div>

                            <!-- رفع عبر رابط -->
                            <div class="mb-6">
                                <label class="block text-sm font-medium text-gray-700 mb-2">أو أضف رابط ملف</label>
                                <div class="flex space-x-2">
                                    <input type="url" id="fileLink" placeholder="https://example.com/file.pdf"
                                        class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <input type="text" id="fileName" placeholder="اسم الملف"
                                        class="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <button onclick="app.addFileLink()" 
                                        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                        إضافة
                                    </button>
                                </div>
                            </div>
                            
                            <!-- قائمة الملفات -->
                            <div id="courseFilesList" class="mb-4">
                                <!-- سيتم ملؤها ديناميكياً -->
                            </div>
                            
                            <div class="flex justify-end">
                                <button onclick="app.hideCourseFilesModal()" 
                                    class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">
                                    إغلاق
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderManageLessons() {
        const userCourses = this.currentUser.role === 'admin' ? 
            this.courses : 
            this.courses.filter(course => course.trainer_id === this.currentUser.id);

        return `
            <div class="min-h-screen bg-gray-50">
                ${this.renderHeader()}
                
                <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div class="flex items-center justify-between mb-8">
                        <div>
                            <h1 class="text-3xl font-bold text-gray-900">إدارة الدروس</h1>
                            <p class="mt-2 text-gray-600">إضافة وتعديل وحذف دروس الكورسات</p>
                        </div>
                        <button onclick="app.showAddLessonModal()" 
                            class="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                            <svg class="w-5 h-5 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            إضافة درس جديد
                        </button>
                    </div>
                    
                    <!-- فلترة حسب الكورس -->
                    <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">فلترة حسب الكورس</label>
                        <select id="courseFilter" onchange="app.filterLessonsByCourse()" 
                            class="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">جميع الكورسات</option>
                            ${userCourses.map(course => `
                                <option value="${course.id}">${course.title}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <!-- جدول الدروس -->
                    <div class="bg-white rounded-xl shadow-md overflow-hidden">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h2 class="text-lg font-semibold text-gray-900">قائمة الدروس</h2>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            العنوان
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الكورس
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الترتيب
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            النوع
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الملفات
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الإجراءات
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200" id="lessonsTableBody">
                                    ${this.lessons.filter(lesson => 
                                        userCourses.some(course => course.id === lesson.course_id)
                                    ).map(lesson => `
                                        <tr class="hover:bg-gray-50" data-course-id="${lesson.course_id}">
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm font-medium text-gray-900">${lesson.title}</div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm text-gray-900">${lesson.course?.title || 'غير محدد'}</div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm text-gray-900">${lesson.order_index}</div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <span class="px-2 py-1 text-xs font-medium rounded-full ${
                                                    lesson.type === 'video' ? 'bg-blue-100 text-blue-800' :
                                                    lesson.type === 'text' ? 'bg-green-100 text-green-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }">${
                                                    lesson.type === 'video' ? 'فيديو' :
                                                    lesson.type === 'text' ? 'نص' :
                                                    lesson.type || 'غير محدد'
                                                }</span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="flex items-center space-x-2">
                                                    <span class="text-sm text-gray-600">${lesson.lesson_files?.length || 0} ملف</span>
                                                    <button onclick="app.showLessonFilesModal('${lesson.id}')" 
                                                        class="text-blue-600 hover:text-blue-800 text-sm">
                                                        إدارة الملفات
                                                    </button>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                <button onclick="app.editLesson('${lesson.id}')" 
                                                    class="text-blue-600 hover:text-blue-900">تعديل</button>
                                                <button onclick="app.deleteLesson('${lesson.id}')" 
                                                    class="text-red-600 hover:text-red-900">حذف</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- Modal إضافة درس -->
                <div id="addLessonModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-semibold text-gray-900">إضافة درس جديد</h3>
                                <button onclick="app.hideAddLessonModal()" class="text-gray-400 hover:text-gray-600">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                            
                            <form id="addLessonForm" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">الكورس</label>
                                    <select id="lessonCourse" required 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">اختر الكورس</option>
                                        ${userCourses.map(course => `
                                            <option value="${course.id}">${course.title}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">عنوان الدرس</label>
                                    <input type="text" id="lessonTitle" required 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">محتوى الدرس</label>
                                    <textarea id="lessonContent" rows="4" required 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">نوع الدرس</label>
                                    <select id="lessonType" required 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">اختر النوع</option>
                                        <option value="video">فيديو</option>
                                        <option value="text">نص</option>
                                        <option value="quiz">اختبار</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">رابط الفيديو (اختياري)</label>
                                    <input type="url" id="lessonVideoUrl" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">ترتيب الدرس</label>
                                    <input type="number" id="lessonOrder" min="1" required 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                
                                <div class="flex justify-end space-x-3 pt-4">
                                    <button type="button" onclick="app.hideAddLessonModal()" 
                                        class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                                        إلغاء
                                    </button>
                                    <button type="submit" 
                                        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                        إضافة الدرس
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Modal إدارة ملفات الدرس -->
                <div id="lessonFilesModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden z-50">
                    <div class="flex items-center justify-center min-h-screen p-4">
                        <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-semibold text-gray-900">إدارة ملفات الدرس</h3>
                                <button onclick="app.hideLessonFilesModal()" class="text-gray-400 hover:text-gray-600">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                            
                            <!-- رفع الملفات -->
                            <div class="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                                <div class="text-center">
                                    <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                    <div class="mt-4">
                                        <label for="lessonFileUpload" class="cursor-pointer">
                                            <span class="mt-2 block text-sm font-medium text-gray-900">
                                                اختر ملفات أو اسحبها هنا
                                            </span>
                                            <input id="lessonFileUpload" name="lessonFileUpload" type="file" multiple class="sr-only">
                                        </label>
                                        <p class="mt-1 text-xs text-gray-500">PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP حتى 10MB</p>
                                    </div>
                                </div>
                            </div>

                            <!-- رفع عبر رابط -->
                            <div class="mb-6">
                                <label class="block text-sm font-medium text-gray-700 mb-2">أو أضف رابط ملف</label>
                                <div class="flex space-x-2">
                                    <input type="url" id="lessonFileLink" placeholder="https://example.com/file.pdf"
                                        class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <input type="text" id="lessonFileName" placeholder="اسم الملف"
                                        class="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <button onclick="app.addLessonFileLink()" 
                                        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                        إضافة
                                    </button>
                                </div>
                            </div>
                            
                            <!-- قائمة الملفات -->
                            <div id="lessonFilesList" class="mb-4">
                                <!-- سيتم ملؤها ديناميكياً -->
                            </div>
                            
                            <div class="flex justify-end">
                                <button onclick="app.hideLessonFilesModal()" 
                                    class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">
                                    إغلاق
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderManageUsers() {
        return `
            <div class="min-h-screen bg-gray-50">
                ${this.renderHeader()}
                
                <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div class="flex items-center justify-between mb-8">
                        <div>
                            <h1 class="text-3xl font-bold text-gray-900">إدارة المستخدمين</h1>
                            <p class="mt-2 text-gray-600">إدارة حسابات المدربين والطلاب</p>
                        </div>
                    </div>
                    
                    <!-- جدول المستخدمين -->
                    <div class="bg-white rounded-xl shadow-md overflow-hidden">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h2 class="text-lg font-semibold text-gray-900">قائمة المستخدمين</h2>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الاسم
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            البريد الإلكتروني
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الدور
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            تاريخ التسجيل
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الإجراءات
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${this.users.map(user => `
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm font-medium text-gray-900">${user.name}</div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm text-gray-900">${user.email}</div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <span class="px-2 py-1 text-xs font-medium rounded-full ${
                                                    user.role === 'admin' ? 'bg-red-100 text-red-800' :
                                                    user.role === 'trainer' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-green-100 text-green-800'
                                                }">${
                                                    user.role === 'admin' ? 'مدير' :
                                                    user.role === 'trainer' ? 'مدرب' :
                                                    'طالب'
                                                }</span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm text-gray-900">${new Date(user.created_at).toLocaleDateString('ar-SA')}</div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                <button onclick="app.changeUserRole('${user.id}')" 
                                                    class="text-blue-600 hover:text-blue-900">تغيير الدور</button>
                                                ${user.id !== this.currentUser.id ? `
                                                    <button onclick="app.deleteUser('${user.id}')" 
                                                        class="text-red-600 hover:text-red-900">حذف</button>
                                                ` : ''}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderViewEnrollments() {
        return `
            <div class="min-h-screen bg-gray-50">
                ${this.renderHeader()}
                
                <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div class="mb-8">
                        <h1 class="text-3xl font-bold text-gray-900">عرض التسجيلات</h1>
                        <p class="mt-2 text-gray-600">متابعة تسجيلات الطلاب في الكورسات</p>
                    </div>
                    
                    <!-- جدول التسجيلات -->
                    <div class="bg-white rounded-xl shadow-md overflow-hidden">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h2 class="text-lg font-semibold text-gray-900">قائمة التسجيلات</h2>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الطالب
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الكورس
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الحالة
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            التقدم
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            تاريخ التسجيل
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الإجراءات
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${this.enrollments.map(enrollment => `
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div class="text-sm font-medium text-gray-900">${enrollment.student?.name}</div>
                                                    <div class="text-sm text-gray-500">${enrollment.student?.email}</div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm text-gray-900">${enrollment.course?.title}</div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <span class="px-2 py-1 text-xs font-medium rounded-full ${
                                                    enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    enrollment.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }">${
                                                    enrollment.status === 'completed' ? 'مكتمل' :
                                                    enrollment.status === 'in_progress' ? 'قيد التقدم' :
                                                    'لم يبدأ'
                                                }</span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm text-gray-900">${enrollment.progress || 0}%</div>
                                                <div class="w-full bg-gray-200 rounded-full h-2">
                                                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${enrollment.progress || 0}%"></div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="text-sm text-gray-900">${new Date(enrollment.created_at).toLocaleDateString('ar-SA')}</div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                <button onclick="app.updateEnrollmentStatus('${enrollment.id}')" 
                                                    class="text-blue-600 hover:text-blue-900">تحديث الحالة</button>
                                                <button onclick="app.removeEnrollment('${enrollment.id}')" 
                                                    class="text-red-600 hover:text-red-900">إلغاء التسجيل</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderHeader() {
        return `
            <header class="bg-white shadow-sm border-b border-gray-200">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        <div class="flex items-center">
                            <div class="h-10 w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                </svg>
                            </div>
                            <h1 class="mr-3 text-xl font-bold text-gray-900">أكاديمية التعلم</h1>
                        </div>
                        
                        <nav class="hidden md:flex space-x-8">
                            <button onclick="app.navigateTo('${this.getDashboardPage()}')" 
                                class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                                الرئيسية
                            </button>
                            ${this.currentUser?.role !== 'student' ? `
                                <button onclick="app.navigateTo('manage-courses')" 
                                    class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                                    الكورسات
                                </button>
                                <button onclick="app.navigateTo('manage-lessons')" 
                                    class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                                    الدروس
                                </button>
                            ` : ''}
                            ${this.currentUser?.role === 'admin' ? `
                                <button onclick="app.navigateTo('manage-users')" 
                                    class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                                    المستخدمين
                                </button>
                            ` : ''}
                        </nav>
                        
                        <div class="flex items-center space-x-4">
                            <div class="text-sm">
                                <span class="text-gray-600">مرحباً، </span>
                                <span class="font-medium text-gray-900">${this.currentUser?.name}</span>
                            </div>
                            <button onclick="app.logout()" 
                                class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors">
                                تسجيل الخروج
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        `;
    }

    setupEventListeners() {
        // التعامل مع تسجيل الدخول
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                await this.login(email, password);
            });
        }

        // التعامل مع التسجيل
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('name').value;
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;
                await this.register(name, email, password);
            });
        }

        // التنقل بين صفحات التسجيل والدخول
        const goToRegisterBtn = document.getElementById('go-to-register');
        if (goToRegisterBtn) {
            goToRegisterBtn.addEventListener('click', () => {
                this.currentPage = 'register';
                this.render();
            });
        }

        const goToLoginBtn = document.getElementById('go-to-login');
        if (goToLoginBtn) {
            goToLoginBtn.addEventListener('click', () => {
                this.currentPage = 'login';
                this.render();
            });
        }

        // التعامل مع إضافة كورس
        const addCourseForm = document.getElementById('addCourseForm');
        if (addCourseForm) {
            addCourseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.addCourse();
            });
        }

        // التعامل مع إضافة درس
        const addLessonForm = document.getElementById('addLessonForm');
        if (addLessonForm) {
            addLessonForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.addLesson();
            });
        }

        // التعامل مع رفع الملفات للكورسات
        const courseFileUpload = document.getElementById('courseFileUpload');
        if (courseFileUpload) {
            courseFileUpload.addEventListener('change', (e) => {
                this.handleCourseFileUpload(e.target.files);
            });
        }

        // التعامل مع رفع الملفات للدروس
        const lessonFileUpload = document.getElementById('lessonFileUpload');
        if (lessonFileUpload) {
            lessonFileUpload.addEventListener('change', (e) => {
                this.handleLessonFileUpload(e.target.files);
            });
        }
    }

    async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            // جلب بيانات المستخدم من قاعدة البيانات
            const { data: userProfile } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (userProfile) {
                this.currentUser = userProfile;
                this.currentPage = this.getDashboardPage();
                await this.loadData();
                this.render();
            }
        } catch (error) {
            alert('خطأ في تسجيل الدخول: ' + error.message);
        }
    }

    async register(name, email, password) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password
            });

            if (error) throw error;

            // إضافة بيانات المستخدم في جدول users
            const { error: profileError } = await supabase
                .from('users')
                .insert([
                    {
                        id: data.user.id,
                        name: name,
                        email: email,
                        role: 'student'
                    }
                ]);

            if (profileError) throw profileError;

            alert('تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.');
            this.currentPage = 'login';
            this.render();
        } catch (error) {
            alert('خطأ في إنشاء الحساب: ' + error.message);
        }
    }

    async logout() {
        try {
            await supabase.auth.signOut();
            this.currentUser = null;
            this.currentPage = 'login';
            this.courses = [];
            this.users = [];
            this.lessons = [];
            this.enrollments = [];
            this.render();
        } catch (error) {
            alert('خطأ في تسجيل الخروج: ' + error.message);
        }
    }

    navigateTo(page) {
        this.currentPage = page;
        this.loadData().then(() => {
            this.render();
        });
    }

    // إدارة الكورسات
    showAddCourseModal() {
        document.getElementById('addCourseModal').classList.remove('hidden');
    }

    hideAddCourseModal() {
        document.getElementById('addCourseModal').classList.add('hidden');
        document.getElementById('addCourseForm').reset();
    }

    async addCourse() {
        try {
            const title = document.getElementById('courseTitle').value;
            const description = document.getElementById('courseDescription').value;
            const price = document.getElementById('coursePrice').value;
            const trainerId = this.currentUser.role === 'admin' ? 
                document.getElementById('courseTrainer').value : 
                this.currentUser.id;

            const { error } = await supabase
                .from('courses')
                .insert([
                    {
                        title,
                        description,
                        trainer_id: trainerId,
                        price: price ? parseFloat(price) : null
                    }
                ]);

            if (error) throw error;

            alert('تم إضافة الكورس بنجاح!');
            this.hideAddCourseModal();
            await this.loadData();
            this.render();
        } catch (error) {
            alert('خطأ في إضافة الكورس: ' + error.message);
        }
    }

    async deleteCourse(courseId) {
        if (confirm('هل أنت متأكد من حذف هذا الكورس؟')) {
            try {
                const { error } = await supabase
                    .from('courses')
                    .delete()
                    .eq('id', courseId);

                if (error) throw error;

                alert('تم حذف الكورس بنجاح!');
                await this.loadData();
                this.render();
            } catch (error) {
                alert('خطأ في حذف الكورس: ' + error.message);
            }
        }
    }

    // إدارة الدروس
    showAddLessonModal() {
        document.getElementById('addLessonModal').classList.remove('hidden');
    }

    hideAddLessonModal() {
        document.getElementById('addLessonModal').classList.add('hidden');
        document.getElementById('addLessonForm').reset();
    }

    async addLesson() {
        try {
            const courseId = document.getElementById('lessonCourse').value;
            const title = document.getElementById('lessonTitle').value;
            const content = document.getElementById('lessonContent').value;
            const type = document.getElementById('lessonType').value;
            const videoUrl = document.getElementById('lessonVideoUrl').value;
            const orderIndex = parseInt(document.getElementById('lessonOrder').value);

            const { error } = await supabase
                .from('lessons')
                .insert([
                    {
                        course_id: courseId,
                        title,
                        content,
                        type,
                        video_url: videoUrl || null,
                        order_index: orderIndex
                    }
                ]);

            if (error) throw error;

            alert('تم إضافة الدرس بنجاح!');
            this.hideAddLessonModal();
            await this.loadData();
            this.render();
        } catch (error) {
            alert('خطأ في إضافة الدرس: ' + error.message);
        }
    }

    async deleteLesson(lessonId) {
        if (confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
            try {
                const { error } = await supabase
                    .from('lessons')
                    .delete()
                    .eq('id', lessonId);

                if (error) throw error;

                alert('تم حذف الدرس بنجاح!');
                await this.loadData();
                this.render();
            } catch (error) {
                alert('خطأ في حذف الدرس: ' + error.message);
            }
        }
    }

    filterLessonsByCourse() {
        const selectedCourseId = document.getElementById('courseFilter').value;
        const rows = document.querySelectorAll('#lessonsTableBody tr');
        
        rows.forEach(row => {
            if (!selectedCourseId || row.dataset.courseId === selectedCourseId) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // إدارة ملفات الكورسات
    showCourseFilesModal(courseId) {
        this.selectedCourseId = courseId;
        document.getElementById('courseFilesModal').classList.remove('hidden');
        this.loadCourseFiles(courseId);
    }

    hideCourseFilesModal() {
        document.getElementById('courseFilesModal').classList.add('hidden');
        this.selectedCourseId = null;
    }

    async loadCourseFiles(courseId) {
        try {
            const { data: files } = await supabase
                .from('course_files')
                .select('*')
                .eq('course_id', courseId);

            const filesList = document.getElementById('courseFilesList');
            filesList.innerHTML = files.map(file => `
                <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg mb-2">
                    <div class="flex items-center">
                        <svg class="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <span class="text-sm font-medium">${file.file_name}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <a href="${file.file_url}" target="_blank" 
                            class="text-blue-600 hover:text-blue-800 text-sm">تحميل</a>
                        <button onclick="app.deleteCourseFile('${file.id}')" 
                            class="text-red-600 hover:text-red-800 text-sm">حذف</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('خطأ في تحميل ملفات الكورس:', error);
        }
    }

    async handleCourseFileUpload(files) {
        if (!this.selectedCourseId) return;

        for (const file of files) {
            try {
                // رفع الملف إلى Supabase Storage
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `courses/${this.selectedCourseId}/${fileName}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('course-files')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // الحصول على URL العام للملف
                const { data: urlData } = supabase.storage
                    .from('course-files')
                    .getPublicUrl(filePath);

                // حفظ معلومات الملف في قاعدة البيانات
                const { error: dbError } = await supabase
                    .from('course_files')
                    .insert([
                        {
                            course_id: this.selectedCourseId,
                            file_name: file.name,
                            file_url: urlData.publicUrl,
                            file_type: file.type,
                            file_size: file.size
                        }
                    ]);

                if (dbError) throw dbError;

            } catch (error) {
                console.error(`خطأ في رفع الملف ${file.name}:`, error);
                alert(`خطأ في رفع الملف ${file.name}: ${error.message}`);
            }
        }

        // إعادة تحميل قائمة الملفات
        await this.loadCourseFiles(this.selectedCourseId);
    }

    async addFileLink() {
        const fileLink = document.getElementById('fileLink').value;
        const fileName = document.getElementById('fileName').value;

        if (!fileLink || !fileName || !this.selectedCourseId) {
            alert('الرجاء إدخال رابط الملف واسم الملف');
            return;
        }

        try {
            const { error } = await supabase
                .from('course_files')
                .insert([
                    {
                        course_id: this.selectedCourseId,
                        file_name: fileName,
                        file_url: fileLink,
                        file_type: 'link'
                    }
                ]);

            if (error) throw error;

            // مسح الحقول
            document.getElementById('fileLink').value = '';
            document.getElementById('fileName').value = '';

            // إعادة تحميل قائمة الملفات
            await this.loadCourseFiles(this.selectedCourseId);
        } catch (error) {
            alert('خطأ في إضافة الرابط: ' + error.message);
        }
    }

    async deleteCourseFile(fileId) {
        if (confirm('هل أنت متأكد من حذف هذا الملف؟')) {
            try {
                const { error } = await supabase
                    .from('course_files')
                    .delete()
                    .eq('id', fileId);

                if (error) throw error;

                await this.loadCourseFiles(this.selectedCourseId);
            } catch (error) {
                alert('خطأ في حذف الملف: ' + error.message);
            }
        }
    }

    // إدارة ملفات الدروس
    showLessonFilesModal(lessonId) {
        this.selectedLessonId = lessonId;
        document.getElementById('lessonFilesModal').classList.remove('hidden');
        this.loadLessonFiles(lessonId);
    }

    hideLessonFilesModal() {
        document.getElementById('lessonFilesModal').classList.add('hidden');
        this.selectedLessonId = null;
    }

    async loadLessonFiles(lessonId) {
        try {
            const { data: files } = await supabase
                .from('lesson_files')
                .select('*')
                .eq('lesson_id', lessonId);

            const filesList = document.getElementById('lessonFilesList');
            filesList.innerHTML = files.map(file => `
                <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg mb-2">
                    <div class="flex items-center">
                        <svg class="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <span class="text-sm font-medium">${file.file_name}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <a href="${file.file_url}" target="_blank" 
                            class="text-blue-600 hover:text-blue-800 text-sm">تحميل</a>
                        <button onclick="app.deleteLessonFile('${file.id}')" 
                            class="text-red-600 hover:text-red-800 text-sm">حذف</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('خطأ في تحميل ملفات الدرس:', error);
        }
    }

    async handleLessonFileUpload(files) {
        if (!this.selectedLessonId) return;

        for (const file of files) {
            try {
                // رفع الملف إلى Supabase Storage
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `lessons/${this.selectedLessonId}/${fileName}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('lesson-files')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // الحصول على URL العام للملف
                const { data: urlData } = supabase.storage
                    .from('lesson-files')
                    .getPublicUrl(filePath);

                // حفظ معلومات الملف في قاعدة البيانات
                const { error: dbError } = await supabase
                    .from('lesson_files')
                    .insert([
                        {
                            lesson_id: this.selectedLessonId,
                            file_name: file.name,
                            file_url: urlData.publicUrl,
                            file_type: file.type,
                            file_size: file.size
                        }
                    ]);

                if (dbError) throw dbError;

            } catch (error) {
                console.error(`خطأ في رفع الملف ${file.name}:`, error);
                alert(`خطأ في رفع الملف ${file.name}: ${error.message}`);
            }
        }

        // إعادة تحميل قائمة الملفات
        await this.loadLessonFiles(this.selectedLessonId);
    }

    async addLessonFileLink() {
        const fileLink = document.getElementById('lessonFileLink').value;
        const fileName = document.getElementById('lessonFileName').value;

        if (!fileLink || !fileName || !this.selectedLessonId) {
            alert('الرجاء إدخال رابط الملف واسم الملف');
            return;
        }

        try {
            const { error } = await supabase
                .from('lesson_files')
                .insert([
                    {
                        lesson_id: this.selectedLessonId,
                        file_name: fileName,
                        file_url: fileLink,
                        file_type: 'link'
                    }
                ]);

            if (error) throw error;

            // مسح الحقول
            document.getElementById('lessonFileLink').value = '';
            document.getElementById('lessonFileName').value = '';

            // إعادة تحميل قائمة الملفات
            await this.loadLessonFiles(this.selectedLessonId);
        } catch (error) {
            alert('خطأ في إضافة الرابط: ' + error.message);
        }
    }

    async deleteLessonFile(fileId) {
        if (confirm('هل أنت متأكد من حذف هذا الملف؟')) {
            try {
                const { error } = await supabase
                    .from('lesson_files')
                    .delete()
                    .eq('id', fileId);

                if (error) throw error;

                await this.loadLessonFiles(this.selectedLessonId);
            } catch (error) {
                alert('خطأ في حذف الملف: ' + error.message);
            }
        }
    }

    // وظائف إضافية للطلاب
    async enrollInCourse(courseId) {
        try {
            const { error } = await supabase
                .from('enrollments')
                .insert([
                    {
                        student_id: this.currentUser.id,
                        course_id: courseId,
                        status: 'enrolled'
                    }
                ]);

            if (error) throw error;

            alert('تم التسجيل في الكورس بنجاح!');
            await this.loadData();
            this.render();
        } catch (error) {
            alert('خطأ في التسجيل: ' + error.message);
        }
    }

    // وظائف إدارة المستخدمين (للأدمن)
    async changeUserRole(userId) {
        const newRole = prompt('أدخل الدور الجديد (admin, trainer, student):');
        if (newRole && ['admin', 'trainer', 'student'].includes(newRole)) {
            try {
                const { error } = await supabase
                    .from('users')
                    .update({ role: newRole })
                    .eq('id', userId);

                if (error) throw error;

                alert('تم تغيير دور المستخدم بنجاح!');
                await this.loadData();
                this.render();
            } catch (error) {
                alert('خطأ في تغيير دور المستخدم: ' + error.message);
            }
        }
    }

    async deleteUser(userId) {
        if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
            try {
                const { error } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', userId);

                if (error) throw error;

                alert('تم حذف المستخدم بنجاح!');
                await this.loadData();
                this.render();
            } catch (error) {
                alert('خطأ في حذف المستخدم: ' + error.message);
            }
        }
    }
}

// تشغيل التطبيق
const app = new LMSApp();
