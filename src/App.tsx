import React, { useState, useEffect, useTransition } from 'react';
import { Navbar } from './components/common/Navbar.tsx';
import { Sidebar, type NavTab } from './components/common/Sidebar.tsx';
import { LecturerSidebar, type LecturerNavTab } from './components/lecturer/LecturerSidebar.tsx';
import { GlobalSearchModal } from './components/common/GlobalSearchModal.tsx';
import { NotificationDrawer } from './components/common/NotificationDrawer.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
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
import { LecturerClassDetailView } from './components/lecturer/LecturerClassDetailView.tsx';
import { LecturerQrBroadcastModal } from './components/lecturer/LecturerQrBroadcastModal.tsx';

import { 
  studentService, 
  defaultStudentUser, 
  defaultLecturerUser 
} from './services/studentService.ts';

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

  // Current logged in user (determines Dosen vs Mahasiswa portal)
  const [currentUser, setCurrentUser] = useState<AuthUser>(() => studentService.getCurrentUser());

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
  const [courses, setCourses] = useState<CourseClass[]>(() => studentService.getEnrolledCourses(currentUser.email));
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
    setCourses(studentService.getEnrolledCourses(currentUser.email));
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

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Quick Role Toggle for local prototype testing as requested by user
  const handleQuickToggleRole = () => {
    if (currentUser.role === 'dosen') {
      studentService.setCurrentUser(defaultStudentUser);
      setCurrentUser(defaultStudentUser);
      setSelectedCourseId(null);
      setSelectedMeetingId(null);
      setStudentTab('beranda');
    } else {
      studentService.setCurrentUser(defaultLecturerUser);
      setCurrentUser(defaultLecturerUser);
      setSelectedCourseId(null);
      setSelectedMeetingId(null);
      setLecturerTab('beranda');
    }
    reloadData();
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setSelectedCourseId(null);
    setSelectedMeetingId(null);
    if (user.role === 'dosen') {
      setLecturerTab('beranda');
    } else {
      setStudentTab('beranda');
    }
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
      if (currentUser.role === 'dosen') {
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
    if (currentUser.role === 'dosen') {
      if (tab === 'kelas') {
        if (contextId) handleOpenCourse(contextId);
        else handleSelectLecturerTab('kelas');
      } else if (tab === 'tugas' || tab === 'koreksi') {
        handleSelectLecturerTab('koreksi');
      } else if (tab === 'absensi' || tab === 'presensi') {
        handleSelectLecturerTab('presensi');
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

  const activeAssignmentSubmission = activeAssignment
    ? submissions.find((s) => s.assignmentId === activeAssignment.id && s.studentEmail?.toLowerCase() === currentUser.email.toLowerCase())
    : undefined;

  // Counts
  const pendingTasksCount = assignments.filter((a) => {
    if (!courses.some((c) => c.id === a.courseId)) return false;
    const sub = submissions.find((s) => s.assignmentId === a.id && s.studentEmail?.toLowerCase() === currentUser.email.toLowerCase());
    return !sub || sub.status === 'terlambat' || sub.status === 'perlu_revisi';
  }).length;

  const unreadAnnouncementsCount = announcements.filter((a) => !a.isRead).length;
  const pendingGradingCount = submissions.filter((s) => s.grade === undefined).length;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors">
      {/* Dynamic Sidebar based on User Role */}
      {currentUser.role === 'dosen' ? (
        <LecturerSidebar
          activeTab={lecturerTab}
          onSelectTab={handleSelectLecturerTab}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          user={currentUser}
          pendingGradingCount={pendingGradingCount}
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
        />
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
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onQuickToggleRole={handleQuickToggleRole}
          onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
        />

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* ========================================================= */}
          {/* A. LECTURER PORTAL VIEWS */}
          {/* ========================================================= */}
          {currentUser.role === 'dosen' && (
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
                    <div className="space-y-6">
                      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                          Manajemen Mata Kuliah Tim Dosen
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Pilih mata kuliah untuk mengelola whitelist email mahasiswa, materi, sesi presensi proyektor, dan tugas.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {allLecturerCourses.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleOpenCourse(c.id)}
                            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-500 cursor-pointer transition-all space-y-3"
                          >
                            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                              {c.code}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              {c.title}
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-2">
                              {c.description}
                            </p>
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                              <span>{c.enrolledStudentEmails?.length || 0} Mahasiswa Terdaftar</span>
                              <span className="font-semibold text-blue-600">Buka Kelas &rarr;</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Lecturer View 3: Koreksi Tugas */}
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

              {/* Lecturer View 4: Presensi Proyektor */}
              {lecturerTab === 'presensi' && (
                <div className="space-y-6">
                  <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      Presensi QR di Kelas (Tampilan Proyektor)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                      Pilih kelas yang sedang berlangsung untuk memproyeksikan kode QR presensi tatap muka.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allLecturerCourses.map((crs) => {
                      const sess = attendanceSessions.find((s) => s.courseId === crs.id);
                      return (
                        <div
                          key={crs.id}
                          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                        >
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {crs.code}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {crs.title}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {crs.scheduleDay}, {crs.scheduleTime} ({crs.room})
                          </p>
                          <button
                            onClick={() => {
                              const s = sess || studentService.toggleAttendanceSession(crs.id, true);
                              reloadData();
                              setBroadcastSession(s);
                            }}
                            className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center justify-center gap-2"
                          >
                            <span>Buka Proyektor QR</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lecturer View 5: Pengumuman */}
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

              {/* Lecturer View 6: Profil Tim Dosen */}
              {lecturerTab === 'profil' && (
                <div className="space-y-6">
                  <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      Profil Tim Dosen Pengampu
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                      Informasi tim pengajar Smart Learning Hub.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                          Akun Aktif Saat Ini
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {currentUser.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">{currentUser.email}</p>
                        <p className="text-xs text-slate-400 mt-1">{currentUser.title}</p>
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 space-y-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">
                        Aturan Akses Dosen:
                      </h4>
                      <p>
                        Akses Dosen terkunci secara eksklusif hanya untuk 2 email terdaftar (<code>dosen.utama@smartlearning.ac.id</code> dan <code>dosen.partner@smartlearning.ac.id</code>). Mahasiswa yang login tidak akan dapat mengakses panel ini.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* B. STUDENT PORTAL VIEWS */}
          {/* ========================================================= */}
          {currentUser.role === 'mahasiswa' && (
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
          course={allLecturerCourses.find((c) => c.id === broadcastSession.courseId) || allLecturerCourses[0]}
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
