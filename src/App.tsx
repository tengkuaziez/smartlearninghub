import React, { useState, useEffect, useTransition } from 'react';
import { 
  Sparkles, 
  Award, 
  GraduationCap, 
  ArrowRight, 
  CheckCircle2, 
  BookOpen, 
  Users, 
  Layers 
} from 'lucide-react';
import { Navbar } from './components/common/Navbar.tsx';
import { Sidebar, type NavTab } from './components/common/Sidebar.tsx';
import { LecturerSidebar, type LecturerNavTab } from './components/lecturer/LecturerSidebar.tsx';
import { GlobalSearchModal } from './components/common/GlobalSearchModal.tsx';
import { NotificationDrawer } from './components/common/NotificationDrawer.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';
import { GoogleIntegrationModal } from './components/common/GoogleIntegrationModal.tsx';

// Student views
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { ClassListView } from './components/classes/ClassListView.tsx';
import { ClassDetailView } from './components/classes/ClassDetailView.tsx';
import { MeetingDetailView } from './components/meetings/MeetingDetailView.tsx';
import { AttendanceView } from './components/attendance/AttendanceView.tsx';
import { QrCheckInModal } from './components/attendance/QrCheckInModal.tsx';
import { AssignmentListView } from './components/assignments/AssignmentListView.tsx';
import { AssignmentDetailModal } from './components/assignments/AssignmentDetailModal.tsx';
import { GradesView } from './components/grades/GradesView.tsx';
import { CalendarView } from './components/calendar/CalendarView.tsx';
import { AnnouncementsView } from './components/announcements/AnnouncementsView.tsx';
import { ProfileView } from './components/profile/ProfileView.tsx';

// Lecturer views
import { LecturerDashboardView } from './components/lecturer/LecturerDashboardView.tsx';
import { LecturerClassManagementView } from './components/lecturer/LecturerClassManagementView.tsx';
import { LecturerClassDetailView } from './components/lecturer/LecturerClassDetailView.tsx';
import { LecturerStudentManagementView } from './components/lecturer/LecturerStudentManagementView.tsx';
import { LecturerProfileView } from './components/lecturer/LecturerProfileView.tsx';
import { LecturerQrBroadcastModal } from './components/lecturer/LecturerQrBroadcastModal.tsx';

import { 
  studentService, 
  defaultStudentUser, 
  defaultLecturerUser 
} from './services/studentService.ts';
import { myJourneySyncService } from './services/myJourneySyncService.ts';

import type { 
  AuthUser,
  StudentProfile, 
  CourseClass, 
  Meeting, 
  Assignment, 
  AssignmentSubmission, 
  AttendanceRecord, 
  AttendanceSession, 
  GradeItem, 
  Announcement, 
  StudentNotification, 
  ActivityLog 
} from './types/index.ts';

export default function App() {
  const [, startTransition] = useTransition();

  // Current logged in user (determines Dosen vs Mahasiswa portal, or null if guest)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => studentService.getCurrentUser());
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Navigation Tabs
  const [studentTab, setStudentTab] = useState<NavTab>('beranda');
  const [lecturerTab, setLecturerTab] = useState<LecturerNavTab>('beranda');

  // Selected contexts
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);

  // Modals state
  const [isQrCheckInOpen, setIsQrCheckInOpen] = useState(false);
  const [broadcastSession, setBroadcastSession] = useState<AttendanceSession | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('slh_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Data state loaded from service
  const [profile, setProfile] = useState<StudentProfile>(() => studentService.getProfile());
  const [courses, setCourses] = useState<CourseClass[]>(() => currentUser ? studentService.getEnrolledCourses(currentUser.email) : []);
  const [allLecturerCourses, setAllLecturerCourses] = useState<CourseClass[]>(() => studentService.getAllCourses());
  const [meetings, setMeetings] = useState<Meeting[]>(() => studentService.getMeetings());
  const [assignments, setAssignments] = useState<Assignment[]>(() => studentService.getAssignments());
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>(() => studentService.getSubmissions());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => studentService.getAttendanceRecords());
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>(() => studentService.getAttendanceSessions());
  const [grades, setGrades] = useState<GradeItem[]>(() => studentService.getGradeItems());
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => studentService.getAnnouncements());
  const [notifications, setNotifications] = useState<StudentNotification[]>(() => studentService.getNotifications());
  const [activities, setActivities] = useState<ActivityLog[]>(() => studentService.getActivities());

  // Reload data helper
  const reloadData = () => {
    if (currentUser) {
      setCourses(studentService.getEnrolledCourses(currentUser.email));
    } else {
      setCourses([]);
    }
    setAllLecturerCourses(studentService.getAllCourses());
    setMeetings(studentService.getMeetings());
    setAssignments(studentService.getAssignments());
    setSubmissions(studentService.getSubmissions());
    setAttendanceRecords(studentService.getAttendanceRecords());
    setAttendanceSessions(studentService.getAttendanceSessions());
    setGrades(studentService.getGradeItems());
    setAnnouncements(studentService.getAnnouncements());
    setNotifications(studentService.getNotifications());
    setActivities(studentService.getActivities());
    setProfile(studentService.getProfile());
  };

  // Sync theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('slh_theme', theme);
  }, [theme]);

  // Global search shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-sync data & profile directly from My Journey Cloud (Google Sheets + Supabase) on mount & user change
  useEffect(() => {
    studentService.syncAllFromMyJourneyCloud().then((res) => {
      if (res.success) {
        setAllLecturerCourses(studentService.getAllCourses());
        const updatedUser = studentService.getCurrentUser();
        if (updatedUser) {
          setCurrentUser(updatedUser);
          setCourses(studentService.getEnrolledCourses(updatedUser.email));
        }
        reloadData();
      }
    }).catch(() => {});
  }, [currentUser?.email]);

  // Background Auto-sync Teaching ke Google Sheets & My Journey saat Dosen Aktif
  useEffect(() => {
    if (currentUser?.role === 'dosen') {
      myJourneySyncService.triggerDebouncedAutoSync();
    }
  }, [currentUser?.role]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Quick Role Toggle for local prototype testing as requested by user
  const handleQuickToggleRole = () => {
    if (!currentUser) return;
    if (currentUser.role === 'dosen') {
      const student = studentService.getRegisteredUsers().find((u) => u.role === 'mahasiswa') || defaultStudentUser;
      studentService.setCurrentUser(student);
      setCurrentUser(student);
      setSelectedCourseId(null);
      setSelectedMeetingId(null);
      setStudentTab('beranda');
    } else {
      const lecturer = studentService.getRegisteredLecturers()[0] || defaultLecturerUser;
      studentService.setCurrentUser(lecturer);
      setCurrentUser(lecturer);
      setSelectedCourseId(null);
      setSelectedMeetingId(null);
      setLecturerTab('beranda');
    }
    reloadData();
  };

  const handleLoginSuccess = async (user: AuthUser) => {
    setCurrentUser(user);
    setIsGuestMode(false);
    setSelectedCourseId(null);
    setSelectedMeetingId(null);
    if (user.role === 'dosen') {
      setLecturerTab('beranda');
    } else {
      setStudentTab('beranda');
    }
    // Pull full profile & cloud teaching data immediately
    await studentService.syncAllFromMyJourneyCloud();
    const refreshed = studentService.getCurrentUser();
    if (refreshed) {
      setCurrentUser(refreshed);
    }
    reloadData();
  };

  const handleLogout = () => {
    studentService.logout();
    setCurrentUser(null);
    setIsGuestMode(false);
    setSelectedCourseId(null);
    setSelectedMeetingId(null);
    setActiveAssignmentId(null);
    reloadData();
  };

  // Navigation Handlers
  const handleSelectStudentTab = (tab: NavTab) => {
    startTransition(() => {
      setStudentTab(tab);
      setSelectedCourseId(null);
      setSelectedMeetingId(null);
    });
  };

  const handleSelectLecturerTab = (tab: LecturerNavTab) => {
    startTransition(() => {
      setLecturerTab(tab);
      setSelectedCourseId(null);
      setSelectedMeetingId(null);
    });
  };

  const handleOpenCourse = (courseId: string) => {
    startTransition(() => {
      setSelectedCourseId(courseId);
      setSelectedMeetingId(null);
      if (currentUser?.role === 'dosen') {
        setLecturerTab('kelas');
      } else {
        setStudentTab('kelas');
      }
    });
  };

  const handleOpenMeeting = (meetingId: string) => {
    startTransition(() => {
      setSelectedMeetingId(meetingId);
      const m = studentService.getMeetingById(meetingId);
      if (m) setSelectedCourseId(m.courseId);
      setStudentTab('kelas');
    });
  };

  const handleOpenAssignment = (assignmentId: string) => {
    setActiveAssignmentId(assignmentId);
  };

  const handleGlobalNavigate = (tab: string, contextId?: string) => {
    if (currentUser?.role === 'dosen') {
      if (tab === 'kelas') {
        if (contextId) handleOpenCourse(contextId);
        else handleSelectLecturerTab('kelas');
      } else if (tab === 'tugas' || tab === 'koreksi') {
        handleSelectLecturerTab('koreksi');
      } else if (tab === 'absensi' || tab === 'presensi') {
        handleSelectLecturerTab('kelas');
      } else if (tab === 'pengumuman') {
        handleSelectLecturerTab('pengumuman');
      } else {
        handleSelectLecturerTab('beranda');
      }
    } else {
      if (tab === 'kelas') {
        if (contextId) handleOpenCourse(contextId);
        else handleSelectStudentTab('kelas');
      } else if (tab === 'pertemuan') {
        if (contextId) handleOpenMeeting(contextId);
        else handleSelectStudentTab('kelas');
      } else if (tab === 'tugas') {
        handleSelectStudentTab('tugas');
        if (contextId) handleOpenAssignment(contextId);
      } else if (tab === 'absensi') {
        handleSelectStudentTab('absensi');
        if (contextId) setIsQrCheckInOpen(true);
      } else if (tab === 'nilai') {
        handleSelectStudentTab('nilai');
      } else if (tab === 'pengumuman') {
        handleSelectStudentTab('pengumuman');
      } else if (tab === 'profil') {
        handleSelectStudentTab('profil');
      } else {
        handleSelectStudentTab('beranda');
      }
    }
  };

  // Student Actions
  const handleToggleMeetingCompleted = (meetingId: string) => {
    studentService.toggleMeetingCompleted(meetingId);
    reloadData();
  };

  const handleAssignmentSubmitted = () => {
    reloadData();
  };

  const handleAttendanceRecorded = () => {
    reloadData();
  };

  // Active course / meeting references
  const currentCourse = selectedCourseId
    ? allLecturerCourses.find((c) => c.id === selectedCourseId)
    : undefined;

  const currentMeeting = selectedMeetingId
    ? meetings.find((m) => m.id === selectedMeetingId)
    : undefined;

  const activeAssignment = activeAssignmentId
    ? assignments.find((a) => a.id === activeAssignmentId)
    : undefined;

  const activeAssignmentCourse = activeAssignment
    ? allLecturerCourses.find((c) => c.id === activeAssignment.courseId)
    : undefined;

  const activeAssignmentSubmission = activeAssignment && currentUser
    ? submissions.find((s) => s.assignmentId === activeAssignment.id && s.studentEmail?.toLowerCase() === currentUser.email.toLowerCase())
    : undefined;

  // Counts
  const pendingTasksCount = currentUser ? assignments.filter((a) => {
    if (!courses.some((c) => c.id === a.courseId)) return false;
    const sub = submissions.find((s) => s.assignmentId === a.id && s.studentEmail?.toLowerCase() === currentUser.email.toLowerCase());
    return !sub || sub.status === 'terlambat' || sub.status === 'perlu_revisi';
  }).length : 0;

  const unreadAnnouncementsCount = announcements.filter((a) => !a.isRead).length;
  const pendingGradingCount = submissions.filter((s) => s.grade === undefined).length;

  // Unauthenticated view: Render unified full-screen LoginPage (matches My Journey design)
  if (!currentUser && !isGuestMode) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onContinueAsGuest={() => setIsGuestMode(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        initialTab={authMode}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors">
      {/* Dynamic Sidebar based on User Role (Only shown when logged in) */}
      {currentUser && (
        currentUser.role === 'dosen' ? (
          <LecturerSidebar
            activeTab={lecturerTab}
            onSelectTab={handleSelectLecturerTab}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            user={currentUser}
            pendingGradingCount={pendingGradingCount}
            onLogout={handleLogout}
          />
        ) : (
          <Sidebar
            activeTab={studentTab}
            onSelectTab={handleSelectStudentTab}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            profile={profile}
            pendingTasksCount={pendingTasksCount}
            unreadAnnouncementsCount={unreadAnnouncementsCount}
            onLogout={handleLogout}
          />
        )
      )}

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <Navbar
          currentUser={currentUser}
          notifications={notifications}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNotifications={() => setIsNotificationOpen(true)}
          onNavigate={(tab) => handleGlobalNavigate(tab)}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          onOpenAuthModal={(m) => {
            setAuthMode(m || 'login');
            setIsGuestMode(false);
          }}
          onQuickToggleRole={currentUser ? handleQuickToggleRole : undefined}
          onOpenGoogleModal={currentUser?.role === 'dosen' ? () => setIsGoogleModalOpen(true) : undefined}
          onLogout={handleLogout}
        />

        {/* Page Content Body */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* ========================================================= */}
          {/* 0. UNREGISTERED / GUEST LANDING VIEW (UNIFIED) */}
          {/* ========================================================= */}
          {!currentUser && (
            <div className="py-6 sm:py-12 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
              {/* Hero Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-blue-900 p-8 sm:p-12 text-white shadow-xl border border-slate-800 text-center sm:text-left">
                <div className="relative z-10 max-w-2xl space-y-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Smart Learning Hub — Portal Pembelajaran Terpadu</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                    Portal Perkuliahan Terintegrasi
                  </h1>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    Satu portal akademik untuk seluruh aktivitas perkuliahan. Kelola kurikulum OBE, presensi QR realtime, materi ajar, pengumpulan tugas, dan rekapitulasi penilaian secara mudah dan transparan.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setIsGuestMode(false);
                      }}
                      className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>Masuk ke Smart Learning Hub</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setAuthMode('register');
                        setIsGuestMode(false);
                      }}
                      className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-xs border border-white/20 transition-all cursor-pointer"
                    >
                      Daftar Akun Baru
                    </button>
                  </div>
                </div>
                <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
              </div>

              {/* 4 Feature Cards (Unified Platform) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Kurikulum & RPS OBE
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Rencana Pembelajaran Semester terstruktur dengan capaian mingguan yang transparan.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Presensi QR Proyektor
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Pemindaian QR presisi berbasis token berbatas waktu untuk mencegah titip absen.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Bahan Ajar & Flipbook
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Akses materi modul, modul interaktif Heyzine, dan berkas ajar dalam satu pintu.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tugas & Evaluasi
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Pengumpulan tugas daring mandiri dengan umpan balik dosen dan rekap nilai otomatis.
                  </p>
                </div>
              </div>

              {/* Single Entry Card */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Sudah memiliki akun atau ingin mendaftar?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sistem secara otomatis menyesuaikan antarmuka Dosen Pengampu atau Mahasiswa sesuai email terdaftar.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setIsAuthModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                  >
                    Masuk Sekarang
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('register');
                      setIsAuthModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    Daftar Akun
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* A. LECTURER PORTAL VIEWS */}
          {/* ========================================================= */}
          {currentUser && currentUser.role === 'dosen' && (
            <>
              {/* Lecturer View 1: Beranda Dosen */}
              {lecturerTab === 'beranda' && (
                <LecturerDashboardView
                  user={currentUser}
                  courses={allLecturerCourses}
                  assignments={assignments}
                  submissions={submissions}
                  sessions={attendanceSessions}
                  onOpenCourse={handleOpenCourse}
                  onOpenQrBroadcast={(sess) => setBroadcastSession(sess)}
                  onNavigate={handleSelectLecturerTab}
                  onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
                />
              )}

              {/* Lecturer View 2: Manajemen Kelas */}
              {lecturerTab === 'kelas' && (
                <>
                  {selectedCourseId && currentCourse ? (
                    <LecturerClassDetailView
                      course={currentCourse}
                      meetings={meetings}
                      assignments={assignments}
                      submissions={submissions}
                      attendanceRecords={attendanceRecords}
                      attendanceSessions={attendanceSessions}
                      announcements={announcements}
                      onBack={() => setSelectedCourseId(null)}
                      onOpenQrBroadcast={(sess) => setBroadcastSession(sess)}
                      onDataUpdated={reloadData}
                    />
                  ) : (
                    <LecturerClassManagementView
                      courses={allLecturerCourses}
                      meetings={meetings}
                      assignments={assignments}
                      submissions={submissions}
                      attendanceRecords={attendanceRecords}
                      onOpenCourse={handleOpenCourse}
                      onDataUpdated={reloadData}
                    />
                  )}
                </>
              )}

              {/* Lecturer View 3: Manajemen Mahasiswa (Master Database) */}
              {lecturerTab === 'mahasiswa' && (
                <LecturerStudentManagementView
                  courses={allLecturerCourses}
                  onDataUpdated={reloadData}
                />
              )}

              {/* Lecturer View 4: Koreksi Tugas */}
              {lecturerTab === 'koreksi' && (
                <div className="space-y-6">
                  <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      Koreksi & Evaluasi Tugas Mahasiswa
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                      Daftar seluruh tugas yang telah dikumpulkan mahasiswa pada mata kuliah yang Anda ampu.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                            <th className="pb-3 px-3">Mahasiswa</th>
                            <th className="pb-3 px-3">Mata Kuliah / Tugas</th>
                            <th className="pb-3 px-3">Status</th>
                            <th className="pb-3 px-3">Nilai Dosen</th>
                            <th className="pb-3 px-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {submissions.map((sub) => {
                            const asg = assignments.find((a) => a.id === sub.assignmentId);
                            const crs = allLecturerCourses.find((c) => c.id === asg?.courseId);
                            return (
                              <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                                  <p>{sub.studentName}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{sub.studentEmail}</p>
                                </td>
                                <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                                  <p>{crs?.code}: {crs?.title}</p>
                                  <p className="text-[11px] text-slate-400">{asg?.title}</p>
                                </td>
                                <td className="py-3 px-3">
                                  {sub.grade !== undefined ? (
                                    <span className="text-emerald-600 font-semibold">Sudah Dinilai</span>
                                  ) : (
                                    <span className="text-amber-600 font-semibold">Perlu Dikoreksi</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-mono font-bold">
                                  {sub.grade !== undefined ? `${sub.grade}/100` : '-'}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => crs && handleOpenCourse(crs.id)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                                  >
                                    Buka di Kelas
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Lecturer View 4: Pengumuman */}
              {lecturerTab === 'pengumuman' && (
                <AnnouncementsView
                  announcements={announcements}
                  courses={allLecturerCourses}
                  onMarkRead={(id) => {
                    studentService.markAnnouncementAsRead(id);
                    reloadData();
                  }}
                  onMarkAllRead={() => {
                    studentService.markAllAnnouncementsAsRead();
                    reloadData();
                  }}
                  onOpenMeeting={handleOpenMeeting}
                  onOpenAssignment={handleOpenAssignment}
                />
              )}

              {/* Lecturer View 6: Profil Tim Dosen (Mengikuti My Journey) */}
              {lecturerTab === 'profil' && (
                <LecturerProfileView
                  currentUser={currentUser}
                  courses={allLecturerCourses}
                  onUserChanged={(updated) => {
                    setCurrentUser(updated);
                    reloadData();
                  }}
                  onDataRefreshed={reloadData}
                />
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* B. STUDENT PORTAL VIEWS */}
          {/* ========================================================= */}
          {currentUser && currentUser.role === 'mahasiswa' && (
            <>
              {/* TAB 1: Beranda */}
              {studentTab === 'beranda' && (
                <DashboardView
                  profile={profile}
                  courses={courses}
                  meetings={meetings}
                  assignments={assignments}
                  submissions={submissions}
                  announcements={announcements}
                  grades={grades}
                  activities={activities}
                  onNavigate={handleGlobalNavigate}
                />
              )}

              {/* TAB 2: Kelas Saya */}
              {studentTab === 'kelas' && (
                <>
                  {selectedMeetingId && currentMeeting && currentCourse ? (
                    <MeetingDetailView
                      meeting={currentMeeting}
                      course={currentCourse}
                      assignments={assignments}
                      submissions={submissions}
                      onBack={() => setSelectedMeetingId(null)}
                      onOpenAssignment={handleOpenAssignment}
                      onOpenAttendanceCheckIn={() => setIsQrCheckInOpen(true)}
                      onToggleCompleted={handleToggleMeetingCompleted}
                    />
                  ) : selectedCourseId && currentCourse ? (
                    <ClassDetailView
                      course={currentCourse}
                      meetings={meetings}
                      assignments={assignments}
                      submissions={submissions}
                      attendanceRecords={attendanceRecords}
                      grades={grades}
                      announcements={announcements}
                      onBack={() => setSelectedCourseId(null)}
                      onOpenMeeting={handleOpenMeeting}
                      onOpenAssignment={handleOpenAssignment}
                      onOpenAttendanceCheckIn={() => setIsQrCheckInOpen(true)}
                    />
                  ) : (
                    <ClassListView
                      courses={courses}
                      meetings={meetings}
                      assignments={assignments}
                      submissions={submissions}
                      announcements={announcements}
                      onOpenClass={handleOpenCourse}
                    />
                  )}
                </>
              )}

              {/* TAB 3: Kalender */}
              {studentTab === 'kalender' && (
                <CalendarView
                  meetings={meetings}
                  assignments={assignments}
                  sessions={attendanceSessions}
                  courses={courses}
                  onOpenMeeting={handleOpenMeeting}
                  onOpenAssignment={handleOpenAssignment}
                  onOpenAttendanceCheckIn={() => setIsQrCheckInOpen(true)}
                />
              )}

              {/* TAB 4: Tugas */}
              {studentTab === 'tugas' && (
                <AssignmentListView
                  assignments={assignments}
                  submissions={submissions}
                  courses={courses}
                  onOpenAssignment={handleOpenAssignment}
                />
              )}

              {/* TAB 5: Absensi */}
              {studentTab === 'absensi' && (
                <AttendanceView
                  courses={courses}
                  records={attendanceRecords}
                  sessions={attendanceSessions}
                  onOpenCheckIn={() => setIsQrCheckInOpen(true)}
                />
              )}

              {/* TAB 6: Nilai */}
              {studentTab === 'nilai' && (
                <GradesView
                  courses={courses}
                  grades={grades}
                  assignments={assignments}
                  submissions={submissions}
                  onOpenAssignment={handleOpenAssignment}
                />
              )}

              {/* TAB 7: Pengumuman */}
              {studentTab === 'pengumuman' && (
                <AnnouncementsView
                  announcements={announcements}
                  courses={courses}
                  onMarkRead={(id) => {
                    studentService.markAnnouncementAsRead(id);
                    reloadData();
                  }}
                  onMarkAllRead={() => {
                    studentService.markAllAnnouncementsAsRead();
                    reloadData();
                  }}
                  onOpenMeeting={handleOpenMeeting}
                  onOpenAssignment={handleOpenAssignment}
                />
              )}

              {/* TAB 8: Profil Saya */}
              {studentTab === 'profil' && (
                <ProfileView
                  profile={profile}
                  courses={courses}
                  theme={theme}
                  onToggleTheme={handleToggleTheme}
                  onProfileUpdated={(updated) => {
                    setProfile(updated);
                    reloadData();
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleGlobalNavigate}
      />

      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onMarkRead={(id) => {
          studentService.markNotificationAsRead(id);
          reloadData();
        }}
        onMarkAllRead={() => {
          studentService.markAllNotificationsAsRead();
          reloadData();
        }}
        onNavigate={handleGlobalNavigate}
      />

      {/* Student QR Scanner Modal */}
      <QrCheckInModal
        isOpen={isQrCheckInOpen}
        onClose={() => setIsQrCheckInOpen(false)}
        activeSessions={attendanceSessions}
        onAttendanceSuccess={handleAttendanceRecorded}
      />

      {/* Lecturer Projector QR Broadcast Modal */}
      {broadcastSession && (
        <LecturerQrBroadcastModal
          session={broadcastSession}
          course={allLecturerCourses.find((c) => c.id === broadcastSession.courseId) || allLecturerCourses[0] || ({ id: broadcastSession.courseId, code: 'KELAS', title: 'Perkuliahan', room: 'Ruang Kuliah', teacher: { name: 'Dosen' } } as any)}
          records={attendanceRecords}
          isOpen={true}
          onClose={() => setBroadcastSession(null)}
          onToggleSession={(open) => {
            const updated = studentService.toggleAttendanceSession(
              broadcastSession.courseId,
              broadcastSession.meetingId,
              open
            );
            setBroadcastSession(updated);
            reloadData();
          }}
          onDataUpdated={reloadData}
        />
      )}

      {/* Assignment Detail & Submission Modal */}
      {activeAssignment && (
        <AssignmentDetailModal
          assignment={activeAssignment}
          submission={activeAssignmentSubmission}
          course={activeAssignmentCourse}
          isOpen={true}
          onClose={() => setActiveAssignmentId(null)}
          onSubmitted={handleAssignmentSubmitted}
        />
      )}

      {/* Authentication Modal with Whitelist Enforcement & Lupa Password */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialMode={authMode}
      />

      {/* Google Drive & Google Spreadsheet Integration Modal */}
      <GoogleIntegrationModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onDataUpdated={reloadData}
      />
    </div>
  );
}
