import type {
  StudentProfile,
  CourseClass,
  CourseRps,
  Meeting,
  Assignment,
  AssignmentSubmission,
  AttendanceSession,
  AttendanceRecord,
  GradeItem,
  Announcement,
  StudentNotification,
  ActivityLog,
  AuthUser,
  MasterStudent,
} from '../types/index.ts';

import {
  LECTURER_WHITELIST_EMAILS,
  mockLecturerUsers,
  initialStudentProfile,
  initialCourses,
  initialCourseRps,
  initialMeetings,
  initialAssignments,
  initialSubmissions,
  initialAttendanceSessions,
  initialAttendanceRecords,
  initialGradeItems,
  initialAnnouncements,
  initialNotifications,
  initialActivities,
  getStudentRosterInfo,
} from '../data/mockData.ts';

import { validateEmailAccess } from '../utils/academicCalculations.ts';
import { supabase, isSupabaseConfigured } from './supabaseClient.ts';
import { supabaseDataService, LECTURER_USER_ID } from './supabaseDataService.ts';

// Helper sinkronisasi Google Sheets / My Journey yang aman dari circular dependency
const myJourneySyncService = {
  triggerDebouncedAutoSync: () => {
    try { (studentService as any)?._syncDelegate?.triggerDebouncedAutoSync?.(); } catch {}
  },
  deleteCourseFromGoogleSheets: async (courseId: string) => {
    try { return await (studentService as any)?._syncDelegate?.deleteCourseFromGoogleSheets?.(courseId); } catch { return false; }
  },
  pushTeachingToGoogleSheets: async () => {
    try { return await (studentService as any)?._syncDelegate?.pushTeachingToGoogleSheets?.(); } catch { return { success: false }; }
  },
};

const STORAGE_KEYS = {
  DATA_VERSION: 'slh_data_version',
  CURRENT_USER: 'slh_current_user',
  REGISTERED_USERS: 'slh_registered_users',
  MASTER_STUDENTS: 'slh_master_students',
  PROFILE: 'slh_student_profile',
  COURSES: 'slh_student_courses',
  MEETINGS: 'slh_student_meetings',
  ASSIGNMENTS: 'slh_student_assignments',
  SUBMISSIONS: 'slh_student_submissions',
  ATTENDANCE_SESSIONS: 'slh_attendance_sessions',
  ATTENDANCE_RECORDS: 'slh_attendance_records',
  GRADES: 'slh_student_grades',
  ANNOUNCEMENTS: 'slh_student_announcements',
  NOTIFICATIONS: 'slh_student_notifications',
  ACTIVITIES: 'slh_student_activities',
  CUSTOM_ROSTER: 'slh_custom_roster',
};

const CURRENT_DATA_VERSION = 'v_reset_fresh_slate_2026_11_15_r3';

// Automatic migration & purge of outdated dummy data (memulai kosongan & bersih)
if (typeof window !== 'undefined') {
  try {
    const savedVer = localStorage.getItem(STORAGE_KEYS.DATA_VERSION);
    if (savedVer !== CURRENT_DATA_VERSION) {
      console.log('[Smart Learning Hub] Mengosongkan seluruh data lama untuk memulai kosongan sesuai My Journey...');
      // Clear old dummy keys to start completely empty
      [
        STORAGE_KEYS.COURSES,
        STORAGE_KEYS.MASTER_STUDENTS,
        STORAGE_KEYS.MEETINGS,
        STORAGE_KEYS.ASSIGNMENTS,
        STORAGE_KEYS.SUBMISSIONS,
        STORAGE_KEYS.ATTENDANCE_SESSIONS,
        STORAGE_KEYS.ATTENDANCE_RECORDS,
        STORAGE_KEYS.GRADES,
        STORAGE_KEYS.ANNOUNCEMENTS,
        STORAGE_KEYS.NOTIFICATIONS,
        STORAGE_KEYS.ACTIVITIES,
        STORAGE_KEYS.CUSTOM_ROSTER,
        STORAGE_KEYS.PROFILE,
        STORAGE_KEYS.CURRENT_USER,
        STORAGE_KEYS.REGISTERED_USERS,
      ].forEach((key) => localStorage.removeItem(key));

      localStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
    }
  } catch (e) {
    console.warn('Migration error:', e);
  }
}

function getStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('Storage quota exceeded or unavailable', err);
  }
}

export interface RegisteredUser extends AuthUser {
  password?: string;
}

export const getInitialsAvatar = (name: string, isDosen = false): string => {
  const bg = isDosen ? '4f46e5' : '2563eb';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${bg}&color=fff&size=256&bold=true`;
};

export const isValidProfileUrl = (url?: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed === 'https://' || trimmed === 'http://') return false;
  if (trimmed.startsWith('mailto:')) return true;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const pathname = parsed.pathname.replace(/^\/+|\/+$/g, '');
    if (!pathname && !parsed.search) return false;
    return true;
  } catch {
    return false;
  }
};

// 2 Akun Dasar Dosen Pengampu Smart Learning Hub & My Journey
export const DEFAULT_LECTURERS: Record<string, AuthUser> = {
  'altaf.aziz16@gmail.com': {
    id: 'dos_altaf',
    name: 'Tengku Abdillah Azis, S.Si',
    email: 'altaf.aziz16@gmail.com',
    campusEmail: 'altaf.aziz16@gmail.com',
    role: 'dosen',
    nidn: '0419058902',
    title: 'Tenaga Teknis Survei & Pemetaan / Dosen Pengampu Partner',
    department: 'Tenaga Teknis Survei dan Pemetaan BPN Kota Binjai • Geografi / Universitas Negeri Medan',
    avatarUrl: '/tengku_avatar.png',
    bio: 'All about my journey; research, work, and study',
    googleScholarUrl: 'https://scholar.google.com/citations?user=us8cI4UAAAAJ&hl=id&oi=ao',
    orcidUrl: 'https://orcid.org/0009-0002-3123-0362',
    researchGateUrl: 'https://www.researchgate.net/profile/Tengku-Abdillah-Azis',
    linkedinUrl: 'https://www.linkedin.com/in/tengku-abdillah-azis-67347a291/',
    instagramUrl: 'https://instagram.com/tengku_aziez',
    facebookUrl: 'https://www.facebook.com/tengku.a.aziz.90',
    sintaUrl: '',
    scopusUrl: '',
    registeredAt: '2026-08-01',
  },
  'miftahurridlo.688@gmail.com': {
    id: 'dos_miftah',
    name: 'Muhammad Miftahurrodlo, M.Sc.',
    email: 'miftahurridlo.688@gmail.com',
    campusEmail: 'miftahurridlo.688@gmail.com',
    role: 'dosen',
    nidn: '0412088501',
    title: 'Dosen Pengampu Utama',
    department: 'Universitas Negeri Medan',
    avatarUrl: '/miftah_avatar.png',
    bio: 'Dosen & Peneliti Pendidikan Geografi. Terhubung langsung dengan kurikulum OBE dan manajemen pengajaran My Journey.',
    googleScholarUrl: 'https://scholar.google.com/citations?user=dZ60Jp0AAAAJ',
    scopusUrl: 'https://www.scopus.com/authid/detail.uri?authorId=57218579450',
    sintaUrl: 'https://sinta.kemdikbud.go.id/authors/profile/6684784',
    orcidUrl: 'https://orcid.org/0000-0002-3909-0268',
    researchGateUrl: 'https://www.researchgate.net/profile/Muhammad-Miftahurrodlo',
    linkedinUrl: 'https://www.linkedin.com/in/muhammad-miftahurridlo',
    instagramUrl: 'https://instagram.com/miftahurridlo',
    facebookUrl: 'https://facebook.com/miftahurridlo',
    registeredAt: '2026-08-01',
  },
};

export const defaultStudentUser: AuthUser = {
  id: 'std_demo',
  name: 'Mahasiswa',
  email: 'mahasiswa@student.ac.id',
  role: 'mahasiswa',
  nim: '10123001',
  avatarUrl: getInitialsAvatar('Mahasiswa', false),
  registeredAt: '2026-09-01',
};

export const defaultLecturerUser: AuthUser = DEFAULT_LECTURERS['altaf.aziz16@gmail.com'];

export interface MeetingAttendanceRosterItem {
  studentName: string;
  studentNim: string;
  studentEmail: string;
  status: AttendanceStatus | 'belum_hadir';
  timestamp?: string;
  method?: 'qr_scan' | 'manual_code' | 'manual_lecturer';
  recordId?: string;
  notes?: string;
}

export interface MeetingAttendanceRosterSummary {
  meeting: Meeting;
  course: CourseClass;
  totalEnrolled: number;
  presentCount: number;
  excusedCount: number;
  absentCount: number;
  attendanceRate: number;
  items: MeetingAttendanceRosterItem[];
  activeSession?: AttendanceSession;
}

export const studentService = {
  // Current Authenticated User (Lecturer or Student or null if not logged in)
  getCurrentUser(): AuthUser | null {
    let user: AuthUser | null = null;

    if (typeof window === 'undefined') {
      // In Node.js / unit tests / server environment
      user = getStorage<AuthUser | null>(STORAGE_KEYS.CURRENT_USER, null);
    } else {
      // 1. Check sessionStorage first (active session in current tab)
      try {
        if (window.sessionStorage) {
          const sessRaw = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
          if (sessRaw) {
            user = JSON.parse(sessRaw);
          }
        }
      } catch {}

      // 2. If not in sessionStorage, check localStorage if rememberMe is enabled
      if (!user) {
        try {
          const isRemembered = localStorage.getItem('slh_remember_me') === 'true';
          const localRaw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
          if (localRaw) {
            const parsed = JSON.parse(localRaw);
            if (isRemembered) {
              const loginTime = parsed._loginTimestamp || 0;
              const maxAge = 7 * 24 * 60 * 60 * 1000;
              if (loginTime && (Date.now() - loginTime > maxAge)) {
                localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
                user = null;
              } else {
                user = parsed;
              }
            } else {
              // Not remembered: remove stale session to prevent unwanted auto-login
              localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            }
          }
        } catch {}
      }
    }

    if (user) {
      let modified = false;
      const isAltaf = user.email.toLowerCase() === 'altaf.aziz16@gmail.com';
      const isMiftah = user.email.toLowerCase() === 'miftahurridlo.688@gmail.com';
      if (isAltaf) {
        if (user.name && user.name.includes('S.Pd')) {
          user.name = user.name.replace('S.Pd', 'S.Si');
          modified = true;
        }
        if (!user.avatarUrl || user.avatarUrl.includes('academic_avatar') || user.avatarUrl.includes('ui-avatars') || user.avatarUrl.includes('photo-')) {
          user.avatarUrl = '/tengku_avatar.png';
          modified = true;
        }
        if (!user.title || user.title === 'Dosen Pengampu Partner' || user.title === 'Dosen & Peneliti') {
          user.title = 'Tenaga Teknis Survei & Pemetaan / Dosen Pengampu Partner';
          modified = true;
        }
        if (!user.department || user.department === 'Sains Informasi Geografi') {
          user.department = 'Tenaga Teknis Survei dan Pemetaan BPN Kota Binjai • Geografi / Universitas Negeri Medan';
          modified = true;
        }
        // Fill in real academic and social links from default if empty or generic
        if (!user.googleScholarUrl || !isValidProfileUrl(user.googleScholarUrl)) {
          user.googleScholarUrl = DEFAULT_LECTURERS['altaf.aziz16@gmail.com'].googleScholarUrl;
          modified = true;
        }
        if (!user.orcidUrl || !isValidProfileUrl(user.orcidUrl)) {
          user.orcidUrl = DEFAULT_LECTURERS['altaf.aziz16@gmail.com'].orcidUrl;
          modified = true;
        }
        if (!user.researchGateUrl || !isValidProfileUrl(user.researchGateUrl)) {
          user.researchGateUrl = DEFAULT_LECTURERS['altaf.aziz16@gmail.com'].researchGateUrl;
          modified = true;
        }
        if (!user.linkedinUrl || !isValidProfileUrl(user.linkedinUrl)) {
          user.linkedinUrl = DEFAULT_LECTURERS['altaf.aziz16@gmail.com'].linkedinUrl;
          modified = true;
        }
        if (!user.instagramUrl || !isValidProfileUrl(user.instagramUrl)) {
          user.instagramUrl = DEFAULT_LECTURERS['altaf.aziz16@gmail.com'].instagramUrl;
          modified = true;
        }
        if (!user.facebookUrl || !isValidProfileUrl(user.facebookUrl)) {
          user.facebookUrl = DEFAULT_LECTURERS['altaf.aziz16@gmail.com'].facebookUrl;
          modified = true;
        }
        if (!user.campusEmail) {
          user.campusEmail = 'altaf.aziz16@gmail.com';
          modified = true;
        }
        if (user.sintaUrl) { user.sintaUrl = ''; modified = true; }
        if (user.scopusUrl) { user.scopusUrl = ''; modified = true; }
      } else if (isMiftah) {
        if (user.name && user.name.includes('S.Pd')) {
          user.name = user.name.replace('S.Pd., ', '').replace('S.Pd, ', '').replace('S.Pd', '').trim();
          modified = true;
        }
        if (!user.title) {
          user.title = 'Dosen Pengampu Utama';
          modified = true;
        }
        if (!user.nidn) {
          user.nidn = '0412088501';
          modified = true;
        }
        if (!user.department) {
          user.department = 'Universitas Negeri Medan';
          modified = true;
        }
        if (!user.campusEmail || user.campusEmail === 'mmridlogeo@unimed.ac.id') {
          user.campusEmail = 'miftahurridlo.688@gmail.com';
          modified = true;
        }
        if (!user.avatarUrl || user.avatarUrl.includes('ui-avatars') || user.avatarUrl.includes('photo-') || user.avatarUrl.includes('academic_avatar')) {
          user.avatarUrl = '/miftah_avatar.png';
          modified = true;
        }
        if (!user.googleScholarUrl || !isValidProfileUrl(user.googleScholarUrl)) {
          user.googleScholarUrl = DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'].googleScholarUrl;
          modified = true;
        }
        if (!user.sintaUrl || !isValidProfileUrl(user.sintaUrl)) {
          user.sintaUrl = DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'].sintaUrl;
          modified = true;
        }
        if (!user.scopusUrl || !isValidProfileUrl(user.scopusUrl)) {
          user.scopusUrl = DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'].scopusUrl;
          modified = true;
        }
        if (!user.orcidUrl || !isValidProfileUrl(user.orcidUrl)) {
          user.orcidUrl = DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'].orcidUrl;
          modified = true;
        }
        if (!user.researchGateUrl || !isValidProfileUrl(user.researchGateUrl)) {
          user.researchGateUrl = DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'].researchGateUrl;
          modified = true;
        }
        if (!user.linkedinUrl || !isValidProfileUrl(user.linkedinUrl)) {
          user.linkedinUrl = DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'].linkedinUrl;
          modified = true;
        }
        if (!user.instagramUrl || !isValidProfileUrl(user.instagramUrl)) {
          user.instagramUrl = DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'].instagramUrl;
          modified = true;
        }
        if (!user.facebookUrl || !isValidProfileUrl(user.facebookUrl)) {
          user.facebookUrl = DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'].facebookUrl;
          modified = true;
        }
      } else if (user.avatarUrl && (user.avatarUrl.includes('photo-1534528741775') || user.avatarUrl.includes('photo-1507003211169') || user.avatarUrl.includes('academic_avatar'))) {
        user.avatarUrl = getInitialsAvatar(user.name, user.role === 'dosen');
        modified = true;
      }
      if (modified) {
        this.setCurrentUser(user);
      }
    }
    return user;
  },

  setCurrentUser(user: AuthUser | null): void {
    if (!user) {
      setStorage(STORAGE_KEYS.CURRENT_USER, null);
      if (typeof window !== 'undefined') {
        try { sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER); } catch {}
        try { localStorage.removeItem(STORAGE_KEYS.CURRENT_USER); } catch {}
      }
    } else {
      if (user.email.toLowerCase() === 'altaf.aziz16@gmail.com') {
        if (!user.avatarUrl || user.avatarUrl.includes('ui-avatars') || user.avatarUrl.includes('photo-') || user.avatarUrl.includes('academic_avatar')) {
          user.avatarUrl = '/tengku_avatar.png';
        }
      } else if (user.email.toLowerCase() === 'miftahurridlo.688@gmail.com') {
        if (!user.avatarUrl || user.avatarUrl.includes('ui-avatars') || user.avatarUrl.includes('photo-') || user.avatarUrl.includes('academic_avatar')) {
          user.avatarUrl = '/miftah_avatar.png';
        }
      } else if (user.avatarUrl && (user.avatarUrl.includes('photo-1534528741775') || user.avatarUrl.includes('photo-1507003211169') || user.avatarUrl.includes('academic_avatar'))) {
        user.avatarUrl = getInitialsAvatar(user.name, user.role === 'dosen');
      }

      const stampedUser = {
        ...user,
        _loginTimestamp: (user as any)._loginTimestamp || Date.now(),
      };

      setStorage(STORAGE_KEYS.CURRENT_USER, stampedUser);

      if (typeof window !== 'undefined') {
        try { sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(stampedUser)); } catch {}
        const isRemembered = localStorage.getItem('slh_remember_me') === 'true';
        if (isRemembered) {
          try { localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(stampedUser)); } catch {}
        } else {
          try { localStorage.removeItem(STORAGE_KEYS.CURRENT_USER); } catch {}
        }
      }
    }
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('slh_remember_me'); } catch {}
      try { sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER); } catch {}
      try { localStorage.removeItem(STORAGE_KEYS.CURRENT_USER); } catch {}
    }
    this.setCurrentUser(null);
  },

  getRegisteredUsers(): RegisteredUser[] {
    const users = getStorage<RegisteredUser[]>(STORAGE_KEYS.REGISTERED_USERS, []);
    let modified = false;

    // Pastikan 2 akun dasar dosen selalu terdaftar
    const altafEmail = 'altaf.aziz16@gmail.com';
    const miftahEmail = 'miftahurridlo.688@gmail.com';
    if (!users.some((u) => u.email.toLowerCase() === altafEmail)) {
      users.push(DEFAULT_LECTURERS[altafEmail]);
      modified = true;
    }
    if (!users.some((u) => u.email.toLowerCase() === miftahEmail)) {
      users.push(DEFAULT_LECTURERS[miftahEmail]);
      modified = true;
    }

    users.forEach((u) => {
      // Clean invalid generic homepage URLs across all users
      if (!isValidProfileUrl(u.scopusUrl) && u.scopusUrl) {
        u.scopusUrl = '';
        modified = true;
      }
      if (!isValidProfileUrl(u.sintaUrl) && u.sintaUrl) {
        u.sintaUrl = '';
        modified = true;
      }
      if (!isValidProfileUrl(u.googleScholarUrl) && u.googleScholarUrl) {
        u.googleScholarUrl = '';
        modified = true;
      }
      if (!isValidProfileUrl(u.researchGateUrl) && u.researchGateUrl) {
        u.researchGateUrl = '';
        modified = true;
      }
      if (!isValidProfileUrl(u.linkedinUrl) && u.linkedinUrl) {
        u.linkedinUrl = '';
        modified = true;
      }
      if (!isValidProfileUrl(u.instagramUrl) && u.instagramUrl) {
        u.instagramUrl = '';
        modified = true;
      }
      if (!isValidProfileUrl(u.facebookUrl) && u.facebookUrl) {
        u.facebookUrl = '';
        modified = true;
      }

      if (u.email.toLowerCase() === altafEmail) {
        if (u.name && u.name.includes('S.Pd')) {
          u.name = u.name.replace('S.Pd', 'S.Si');
          modified = true;
        }
        if (!u.avatarUrl || u.avatarUrl.includes('academic_avatar') || u.avatarUrl.includes('ui-avatars') || u.avatarUrl.includes('photo-')) {
          u.avatarUrl = '/tengku_avatar.png';
          modified = true;
        }
        if (!u.title || u.title === 'Dosen Pengampu Partner' || u.title === 'Dosen & Peneliti') {
          u.title = 'Tenaga Teknis Survei & Pemetaan / Dosen Pengampu Partner';
          modified = true;
        }
        if (!u.department || u.department === 'Sains Informasi Geografi') {
          u.department = 'Tenaga Teknis Survei dan Pemetaan BPN Kota Binjai • Geografi / Universitas Negeri Medan';
          modified = true;
        }
        if (!u.googleScholarUrl || !isValidProfileUrl(u.googleScholarUrl)) {
          u.googleScholarUrl = DEFAULT_LECTURERS[altafEmail].googleScholarUrl;
          modified = true;
        }
        if (!u.orcidUrl || !isValidProfileUrl(u.orcidUrl)) {
          u.orcidUrl = DEFAULT_LECTURERS[altafEmail].orcidUrl;
          modified = true;
        }
        if (!u.researchGateUrl || !isValidProfileUrl(u.researchGateUrl)) {
          u.researchGateUrl = DEFAULT_LECTURERS[altafEmail].researchGateUrl;
          modified = true;
        }
        if (!u.linkedinUrl || !isValidProfileUrl(u.linkedinUrl)) {
          u.linkedinUrl = DEFAULT_LECTURERS[altafEmail].linkedinUrl;
          modified = true;
        }
        if (!u.instagramUrl || !isValidProfileUrl(u.instagramUrl)) {
          u.instagramUrl = DEFAULT_LECTURERS[altafEmail].instagramUrl;
          modified = true;
        }
        if (!u.facebookUrl || !isValidProfileUrl(u.facebookUrl)) {
          u.facebookUrl = DEFAULT_LECTURERS[altafEmail].facebookUrl;
          modified = true;
        }
        if (!u.campusEmail) {
          u.campusEmail = 'altaf.aziz16@gmail.com';
          modified = true;
        }
        // Tengku specifically does not have Scopus or Sinta
        if (u.scopusUrl) { u.scopusUrl = ''; modified = true; }
        if (u.sintaUrl) { u.sintaUrl = ''; modified = true; }
      } else if (u.email.toLowerCase() === miftahEmail) {
        if (u.name && u.name.includes('S.Pd')) {
          u.name = u.name.replace('S.Pd., ', '').replace('S.Pd, ', '').replace('S.Pd', '').trim();
          modified = true;
        }
        if (!u.title) {
          u.title = 'Dosen Pengampu Utama';
          modified = true;
        }
        if (!u.nidn) {
          u.nidn = '0412088501';
          modified = true;
        }
        if (!u.department) {
          u.department = 'Universitas Negeri Medan';
          modified = true;
        }
        if (!u.campusEmail || u.campusEmail === 'mmridlogeo@unimed.ac.id') {
          u.campusEmail = 'miftahurridlo.688@gmail.com';
          modified = true;
        }
        if (!u.avatarUrl || u.avatarUrl.includes('ui-avatars') || u.avatarUrl.includes('photo-') || u.avatarUrl.includes('academic_avatar')) {
          u.avatarUrl = '/miftah_avatar.png';
          modified = true;
        }
        if (!u.googleScholarUrl || !isValidProfileUrl(u.googleScholarUrl)) {
          u.googleScholarUrl = DEFAULT_LECTURERS[miftahEmail].googleScholarUrl;
          modified = true;
        }
        if (!u.sintaUrl || !isValidProfileUrl(u.sintaUrl)) {
          u.sintaUrl = DEFAULT_LECTURERS[miftahEmail].sintaUrl;
          modified = true;
        }
        if (!u.scopusUrl || !isValidProfileUrl(u.scopusUrl)) {
          u.scopusUrl = DEFAULT_LECTURERS[miftahEmail].scopusUrl;
          modified = true;
        }
        if (!u.orcidUrl || !isValidProfileUrl(u.orcidUrl)) {
          u.orcidUrl = DEFAULT_LECTURERS[miftahEmail].orcidUrl;
          modified = true;
        }
        if (!u.researchGateUrl || !isValidProfileUrl(u.researchGateUrl)) {
          u.researchGateUrl = DEFAULT_LECTURERS[miftahEmail].researchGateUrl;
          modified = true;
        }
        if (!u.linkedinUrl || !isValidProfileUrl(u.linkedinUrl)) {
          u.linkedinUrl = DEFAULT_LECTURERS[miftahEmail].linkedinUrl;
          modified = true;
        }
        if (!u.instagramUrl || !isValidProfileUrl(u.instagramUrl)) {
          u.instagramUrl = DEFAULT_LECTURERS[miftahEmail].instagramUrl;
          modified = true;
        }
        if (!u.facebookUrl || !isValidProfileUrl(u.facebookUrl)) {
          u.facebookUrl = DEFAULT_LECTURERS[miftahEmail].facebookUrl;
          modified = true;
        }
      } else if (u.avatarUrl && (u.avatarUrl.includes('photo-1534528741775') || u.avatarUrl.includes('photo-1507003211169') || u.avatarUrl.includes('academic_avatar'))) {
        u.avatarUrl = getInitialsAvatar(u.name, u.role === 'dosen');
        modified = true;
      }
    });
    if (modified) {
      setStorage(STORAGE_KEYS.REGISTERED_USERS, users);
    }
    return users;
  },

  saveRegisteredUser(user: RegisteredUser): void {
    const users = this.getRegisteredUsers();
    const idx = users.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    setStorage(STORAGE_KEYS.REGISTERED_USERS, users);
    supabaseDataService.savePortalUser(user).catch(() => {});
  },

  getRegisteredLecturers(): AuthUser[] {
    const users = this.getRegisteredUsers();
    const list = users.filter((u) => u.role === 'dosen');
    const altaf = list.find((u) => u.email.toLowerCase() === 'altaf.aziz16@gmail.com') || DEFAULT_LECTURERS['altaf.aziz16@gmail.com'];
    const miftah = list.find((u) => u.email.toLowerCase() === 'miftahurridlo.688@gmail.com') || DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'];
    return [altaf, miftah];
  },

  // Format sambutan dosen dengan kata "Pak"
  formatLecturerGreeting(name: string): string {
    const clean = (name || '').trim();
    if (!clean) return 'Pak Dosen';
    if (/^(pak|ibu|dr\.|prof\.)/i.test(clean)) return clean;
    return `Pak ${clean}`;
  },

  // Update lecturer profile directly (Foto, Gelar, NIDN, Prodi, Bio, dsb)
  updateLecturerProfile(updates: Partial<AuthUser>): AuthUser {
    const current = this.getCurrentUser();
    if (!current) {
      throw new Error('Tidak ada akun yang sedang aktif.');
    }

    const updatedUser: AuthUser = {
      ...current,
      ...updates,
      id: current.id,
      email: current.email,
      role: current.role,
    };

    // Update in registered users list
    const users = this.getRegisteredUsers();
    const idx = users.findIndex((u) => u.email.toLowerCase() === current.email.toLowerCase());
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...updatedUser };
      setStorage(STORAGE_KEYS.REGISTERED_USERS, users);
    }

    this.setCurrentUser(updatedUser);
    return updatedUser;
  },

  // Sinkronisasi data profil dari My Journey (Shared LocalStorage, Supabase, atau Google Sheets)
  async syncProfileFromMyJourney(targetEmail?: string): Promise<{ success: boolean; message: string; profile?: AuthUser }> {
    const emailToSync = (targetEmail || this.getCurrentUser()?.email || '').toLowerCase().trim();
    if (!emailToSync) {
      return { success: false, message: 'Email tidak ditemukan untuk sinkronisasi.' };
    }

    let foundProfileData: any = null;

    // 1. Coba ambil dari Supabase Database (Tabel profiles resmi My Journey)
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;
        if (authUser) {
          const { data: supaProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          if (supaProfile) {
            foundProfileData = {
              name: supaProfile.name || foundProfileData?.name,
              titlePrefix: supaProfile.title_prefix,
              titleSuffix: supaProfile.title_suffix,
              role: supaProfile.role || foundProfileData?.role,
              department: supaProfile.university_or_org || foundProfileData?.department,
              avatarUrl: supaProfile.avatar_url || foundProfileData?.avatarUrl,
              bio: supaProfile.bio || foundProfileData?.bio,
              googleScholarUrl: supaProfile.google_scholar_url,
              sintaUrl: supaProfile.sinta_url,
              scopusUrl: supaProfile.scopus_url,
              orcidUrl: supaProfile.orcid_url,
              researchGateUrl: supaProfile.research_gate_url,
              campusEmail: supaProfile.campus_email,
              linkedinUrl: supaProfile.linkedin_url,
              instagramUrl: supaProfile.instagram_url,
              facebookUrl: supaProfile.facebook_url,
              websiteUrl: supaProfile.website_url,
            };
          }
        }
      } catch (e) {
        console.warn('Supabase profile query note:', e);
      }
    }

    // 2. Coba ambil dari LocalStorage My Journey (jika diakses pada peramban/origin yang sama)
    try {
      const rawMyJourney = localStorage.getItem('my_journey_user_profile');
      if (rawMyJourney) {
        const parsed = JSON.parse(rawMyJourney);
        if (parsed && (parsed.name || parsed.title)) {
          foundProfileData = { ...parsed, ...foundProfileData };
        }
      }
      // Periksa juga scoped user profile jika ada
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('my_journey_u_') && key.endsWith('_user_profile')) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key) || '{}');
            if (parsed && (parsed.name || parsed.title)) {
              foundProfileData = { ...parsed, ...foundProfileData };
              break;
            }
          } catch {}
        }
      }
    } catch {}

    // 3. Tarik data pelengkap dari Google Sheets Teaching Bridge
    try {
      const gasResult = await fetch(`${(import.meta as any).env?.VITE_GAS_API_URL || 'https://script.google.com/macros/s/AKfycbwDzcpOCO9Npm0sH8DM9maCOEtDo_LWaHMX4K7JY6RPle_5En0fG5s59sEHRJ9UZ45W/exec'}?action=getTeaching`);
      if (gasResult.ok) {
        const json = await gasResult.json();
        if (json?.data?.Profiles && Array.isArray(json.data.Profiles)) {
          const matched = json.data.Profiles.find((p: any) => p.email?.toLowerCase() === emailToSync);
          if (matched) {
            foundProfileData = {
              name: matched.name || foundProfileData?.name,
              title: matched.title || foundProfileData?.title,
              role: matched.role || foundProfileData?.role,
              department: matched.department || foundProfileData?.department,
              avatarUrl: matched.avatarUrl || foundProfileData?.avatarUrl,
              googleScholarUrl: matched.googleScholarUrl || foundProfileData?.googleScholarUrl,
              sintaUrl: matched.sintaUrl || foundProfileData?.sintaUrl,
              scopusUrl: matched.scopusUrl || foundProfileData?.scopusUrl,
              orcidUrl: matched.orcidUrl || foundProfileData?.orcidUrl,
              researchGateUrl: matched.researchGateUrl || foundProfileData?.researchGateUrl,
              campusEmail: matched.campusEmail || foundProfileData?.campusEmail,
              linkedinUrl: matched.linkedinUrl || foundProfileData?.linkedinUrl,
              instagramUrl: matched.instagramUrl || foundProfileData?.instagramUrl,
              facebookUrl: matched.facebookUrl || foundProfileData?.facebookUrl,
              websiteUrl: matched.websiteUrl || foundProfileData?.websiteUrl,
              ...foundProfileData,
            };
          }
        }
      }
    } catch {}

    const isAltaf = emailToSync.includes('altaf');
    const defaultLecturer = DEFAULT_LECTURERS[emailToSync] || (isAltaf ? DEFAULT_LECTURERS['altaf.aziz16@gmail.com'] : DEFAULT_LECTURERS['miftahurridlo.688@gmail.com']);

    // Jika belum ditemukan dari cloud/storage, gunakan profil terverifikasi My Journey sebagai basis
    if (!foundProfileData) {
      foundProfileData = { ...defaultLecturer };
    }

    if (foundProfileData) {
      let fullName = foundProfileData.name || defaultLecturer.name;
      if (foundProfileData.titlePrefix) {
        fullName = `${foundProfileData.titlePrefix} ${fullName}`;
      }
      const suffix = foundProfileData.titleSuffix || (foundProfileData.title && foundProfileData.title.includes('.') ? foundProfileData.title : (isAltaf ? 'S.Si' : 'M.Sc.'));
      if (suffix && !fullName.includes(suffix)) {
        fullName = `${fullName.replace(', S.Pd', '')}, ${suffix}`;
      }
      if (isAltaf) {
        fullName = fullName.replace('S.Pd', 'S.Si');
      } else {
        fullName = fullName.replace('S.Pd., ', '');
      }

      const defaultBio = isAltaf
        ? 'Tenaga Teknis Survei dan Pemetaan BPN Kota Binjai dan Dosen Pengampu Partner. Terhubung langsung dengan workspace riset, pemetaan, dan administrasi perkuliahan My Journey.'
        : 'Dosen & Peneliti Pendidikan Geografi. Terhubung langsung dengan kurikulum OBE dan manajemen pengajaran My Journey.';
      const defaultTitle = isAltaf ? 'Tenaga Teknis Survei & Pemetaan / Dosen Pengampu Partner' : 'Dosen Pengampu Utama';
      const defaultDept = isAltaf ? 'Tenaga Teknis Survei dan Pemetaan BPN Kota Binjai • Geografi / Universitas Negeri Medan' : 'Universitas Negeri Medan';

      let targetAvatar = foundProfileData.avatarUrl;
      if (isAltaf) {
        targetAvatar = '/tengku_avatar.png';
      } else if (!targetAvatar || targetAvatar.includes('photo-1534528741775') || targetAvatar.includes('academic_avatar')) {
        targetAvatar = '/miftah_avatar.png';
      }

      const updated = this.updateLecturerProfile({
        name: fullName || foundProfileData.name,
        nidn: isAltaf ? '0419058902' : '0412088501',
        title: (foundProfileData.role && foundProfileData.role !== 'Dosen & Peneliti') ? foundProfileData.role : defaultTitle,
        department: foundProfileData.universityOrOrg || foundProfileData.department || defaultDept,
        avatarUrl: targetAvatar,
        bio: (foundProfileData.bio && !foundProfileData.bio.includes('Dosen Pengampu Smart Learning Hub.')) ? foundProfileData.bio : defaultBio,
        googleScholarUrl: foundProfileData.googleScholarUrl || defaultLecturer.googleScholarUrl || '',
        sintaUrl: isAltaf ? '' : (foundProfileData.sintaUrl || defaultLecturer.sintaUrl || ''),
        scopusUrl: isAltaf ? '' : (foundProfileData.scopusUrl || defaultLecturer.scopusUrl || ''),
        orcidUrl: foundProfileData.orcidUrl || '',
        researchGateUrl: foundProfileData.researchGateUrl || defaultLecturer.researchGateUrl || '',
        campusEmail: foundProfileData.campusEmail || defaultLecturer.campusEmail || (isAltaf ? 'altaf.aziz16@gmail.com' : 'miftahurridlo.688@gmail.com'),
        linkedinUrl: foundProfileData.linkedinUrl || defaultLecturer.linkedinUrl || '',
        instagramUrl: foundProfileData.instagramUrl || defaultLecturer.instagramUrl || '',
        facebookUrl: foundProfileData.facebookUrl || defaultLecturer.facebookUrl || '',
        websiteUrl: foundProfileData.websiteUrl || '',
      });

      return {
        success: true,
        message: 'Profil berhasil disinkronkan 1:1 dengan My Journey!',
        profile: updated,
      };
    }

    return {
      success: false,
      message: 'Data My Journey belum ditemukan di peramban ini atau cloud. Anda dapat mengedit profil secara langsung atau menempel data profil My Journey.',
    };
  },

  // Impor profil dari format JSON My Journey
  importMyJourneyProfileJson(jsonString: string): { success: boolean; message: string; profile?: AuthUser } {
    try {
      const parsed = JSON.parse(jsonString.trim());
      if (!parsed || (!parsed.name && !parsed.email)) {
        return { success: false, message: 'Format data JSON My Journey tidak valid.' };
      }

      let fullName = parsed.name || '';
      if (parsed.titlePrefix) {
        fullName = `${parsed.titlePrefix} ${fullName}`;
      }
      const suffix = parsed.titleSuffix || (parsed.title && parsed.title.includes('.') ? parsed.title : '');
      if (suffix && !fullName.includes(suffix)) {
        fullName = `${fullName}, ${suffix}`;
      }

      const isAltaf = (parsed.email || '').toLowerCase().includes('altaf') || fullName.toLowerCase().includes('tengku');
      let targetAvatar = parsed.avatarUrl;
      if (isAltaf) {
        targetAvatar = '/tengku_avatar.png';
      } else if (!targetAvatar || targetAvatar.includes('photo-1534528741775') || targetAvatar.includes('academic_avatar')) {
        targetAvatar = getInitialsAvatar(fullName || parsed.name, true);
      }

      const updated = this.updateLecturerProfile({
        name: fullName || parsed.name,
        title: parsed.role || parsed.title || (isAltaf ? 'Tenaga Teknis Survei & Pemetaan / Dosen Pengampu Partner' : 'Dosen Pengampu Utama'),
        nidn: isAltaf ? '0419058902' : '0412088501',
        department: parsed.universityOrOrg || parsed.department || (isAltaf ? 'Sains Informasi Geografi' : 'Pendidikan Geografi'),
        avatarUrl: targetAvatar,
        bio: parsed.bio || (isAltaf
          ? 'Tenaga Teknis Survei & Pemetaan dan Dosen Pengampu Partner Sains Informasi Geografi. Terhubung langsung dengan workspace riset, pemetaan, dan administrasi perkuliahan My Journey.'
          : 'Dosen & Peneliti Pendidikan Geografi. Terhubung langsung dengan kurikulum OBE dan manajemen pengajaran My Journey.'),
        googleScholarUrl: parsed.googleScholarUrl || '',
        sintaUrl: parsed.sintaUrl || '',
        scopusUrl: parsed.scopusUrl || '',
        orcidUrl: parsed.orcidUrl || '',
        researchGateUrl: parsed.researchGateUrl || '',
        campusEmail: parsed.campusEmail || (isAltaf ? 'altaf.aziz16@gmail.com' : 'mmridlogeo@unimed.ac.id'),
        linkedinUrl: parsed.linkedinUrl || '',
        instagramUrl: parsed.instagramUrl || '',
        facebookUrl: parsed.facebookUrl || '',
        websiteUrl: parsed.websiteUrl || '',
      });

      return {
        success: true,
        message: 'Data profil My Journey berhasil diimpor ke Smart Learning Hub!',
        profile: updated,
      };
    } catch (e: any) {
      return { success: false, message: 'Gagal mengurai teks JSON: ' + e.message };
    }
  },

  // Auth: Login with Email & Password
  login(email: string, password = ''): { success: boolean; user?: AuthUser; message: string } {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return { success: false, message: 'Silakan masukkan email Anda.' };
    }

    const registeredUsers = this.getRegisteredUsers();
    const existing = registeredUsers.find((u) => u.email.toLowerCase() === normalized);

    if (existing) {
      if (!password || (existing.password && existing.password !== password)) {
        return {
          success: false,
          message: 'Kata sandi tidak sesuai. Silakan periksa kembali kata sandi Anda.',
        };
      }
      this.setCurrentUser(existing);
      return {
        success: true,
        user: existing,
        message: `Selamat datang kembali, ${existing.name}!`,
      };
    }

    // Jika akun dosen tapi belum tercache lokal, arahkan ke login online Supabase
    if (LECTURER_WHITELIST_EMAILS.map((e) => e.toLowerCase()).includes(normalized)) {
      return {
        success: false,
        message: 'Silakan masukkan kata sandi akun My Journey Anda untuk masuk.',
      };
    }

    return {
      success: false,
      message: 'Email belum terdaftar. Silakan buka tab "Daftar Akun" untuk mendaftarkan akun baru dengan email yang telah diizinkan dosen.',
    };
  },

  // =========================================================================
  // MASTER STUDENT DATABASE (Basis Data Mahasiswa Master)
  // =========================================================================
  getMasterStudents(): MasterStudent[] {
    const students = getStorage<MasterStudent[]>(STORAGE_KEYS.MASTER_STUDENTS, []);
    const registeredUsers = this.getRegisteredUsers().filter((u) => u.role === 'mahasiswa');
    const courses = this.getAllCourses();

    // Pastikan mahasiswa yang sudah terdaftar akun otomatis muncul di database dosen (tidak ada celah data hilang)
    registeredUsers.forEach((reg) => {
      const exists = students.find((s) => s.email.toLowerCase() === reg.email.toLowerCase());
      if (!exists) {
        students.push({
          id: reg.id,
          name: reg.name,
          nim: reg.nim || '10123000',
          email: reg.email,
          major: reg.department || 'Pendidikan Geografi',
          classSection: 'Kelas A',
          enrolledCourseCodes: [],
          avatarUrl: reg.avatarUrl || getInitialsAvatar(reg.name, false),
          isRegistered: true,
          registeredAt: reg.registeredAt || new Date().toISOString(),
        });
      }
    });

    if (students.length === 0) {
      return [];
    }

    return students.map((std) => {
      const isReg = registeredUsers.some((u) => u.email.toLowerCase() === std.email.toLowerCase());
      const courseCodes = new Set(std.enrolledCourseCodes || []);
      courses.forEach((c) => {
        if ((c.enrolledStudentEmails || []).some((e) => e.toLowerCase() === std.email.toLowerCase())) {
          courseCodes.add(c.code);
        }
      });

      return {
        ...std,
        isRegistered: isReg || !!std.isRegistered,
        enrolledCourseCodes: Array.from(courseCodes),
      };
    });
  },

  saveMasterStudent(student: MasterStudent): MasterStudent {
    const list = getStorage<MasterStudent[]>(STORAGE_KEYS.MASTER_STUDENTS, []);
    const cleanEmail = student.email.trim().toLowerCase();
    const idx = list.findIndex((s) => s.email.trim().toLowerCase() === cleanEmail || (student.id && s.id === student.id));

    const updated: MasterStudent = {
      ...student,
      id: student.id || `mstd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      name: student.name.trim(),
      nim: student.nim.trim(),
      major: student.major || 'Pendidikan Geografi',
      classSection: student.classSection || 'Kelas A',
      enrolledCourseCodes: student.enrolledCourseCodes || [],
      avatarUrl: student.avatarUrl || getInitialsAvatar(student.name, false),
    };

    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    setStorage(STORAGE_KEYS.MASTER_STUDENTS, list);

    // Simpan juga ke custom roster agar dapat diakses oleh query kehadiran & nilai
    const custom = getStorage<Record<string, any>>(STORAGE_KEYS.CUSTOM_ROSTER, {});
    custom[cleanEmail] = {
      name: updated.name,
      nim: updated.nim,
      email: cleanEmail,
    };
    setStorage(STORAGE_KEYS.CUSTOM_ROSTER, custom);

    // Sync student to courses
    if (updated.enrolledCourseCodes && updated.enrolledCourseCodes.length > 0) {
      const courses = this.getAllCourses();
      let modified = false;
      courses.forEach((crs) => {
        if (updated.enrolledCourseCodes.includes(crs.code) || updated.enrolledCourseCodes.includes(crs.id)) {
          if (!crs.enrolledStudentEmails) crs.enrolledStudentEmails = [];
          if (!crs.enrolledStudentEmails.map((e) => e.toLowerCase()).includes(cleanEmail)) {
            crs.enrolledStudentEmails.push(cleanEmail);
            modified = true;
          }
        }
      });
      if (modified) {
        setStorage(STORAGE_KEYS.COURSES, courses);
      }
    }

    // Sinkronisasi otomatis ke Supabase Database My Journey (Background)
    supabaseDataService.saveStudent(updated).catch(() => {});

    return updated;
  },

  deleteMasterStudent(idOrEmail: string): boolean {
    const list = getStorage<MasterStudent[]>(STORAGE_KEYS.MASTER_STUDENTS, []);
    const cleanTarget = idOrEmail.trim().toLowerCase();
    const toDelete = list.find((s) => s.id === idOrEmail || s.email.toLowerCase() === cleanTarget);

    const filtered = list.filter((s) => s.id !== idOrEmail && s.email.toLowerCase() !== cleanTarget);
    setStorage(STORAGE_KEYS.MASTER_STUDENTS, filtered);

    // Also remove from courses
    if (toDelete) {
      if (toDelete.id) {
        supabaseDataService.deleteStudent(toDelete.id).catch(() => {});
      }
      const courses = this.getAllCourses();
      let modified = false;
      courses.forEach((crs) => {
        if (crs.enrolledStudentEmails && crs.enrolledStudentEmails.map((e) => e.toLowerCase()).includes(toDelete.email.toLowerCase())) {
          crs.enrolledStudentEmails = crs.enrolledStudentEmails.filter((e) => e.toLowerCase() !== toDelete.email.toLowerCase());
          modified = true;
        }
      });
      if (modified) {
        setStorage(STORAGE_KEYS.COURSES, courses);
      }
    }

    return true;
  },

  addMasterStudentsBulk(students: Array<Omit<MasterStudent, 'id'>>): { added: number; updated: number } {
    let added = 0;
    let updated = 0;
    const currentList = getStorage<MasterStudent[]>(STORAGE_KEYS.MASTER_STUDENTS, []);

    students.forEach((s) => {
      const cleanEmail = s.email.trim().toLowerCase();
      if (!cleanEmail) return;
      const idx = currentList.findIndex((item) => item.email.toLowerCase() === cleanEmail);

      const record: MasterStudent = {
        id: idx >= 0 ? currentList[idx].id : `mstd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: s.name.trim(),
        nim: s.nim.trim(),
        email: cleanEmail,
        major: s.major || 'Sains Informasi Geografi',
        classSection: s.classSection || 'Kelas A',
        enrolledCourseCodes: s.enrolledCourseCodes || [],
        avatarUrl: getInitialsAvatar(s.name, false),
      };

      if (idx >= 0) {
        currentList[idx] = { ...currentList[idx], ...record };
        updated++;
      } else {
        currentList.push(record);
        added++;
      }
    });

    setStorage(STORAGE_KEYS.MASTER_STUDENTS, currentList);
    // Sinkronisasi otomatis ke Supabase Database My Journey (Bulk)
    supabaseDataService.saveStudentsBulk(currentList).catch(() => {});

    // Sync to courses
    const courses = this.getAllCourses();
    let coursesModified = false;
    currentList.forEach((st) => {
      (st.enrolledCourseCodes || []).forEach((code) => {
        const crs = courses.find((c) => c.code.toLowerCase() === code.toLowerCase() || c.id === code);
        if (crs) {
          if (!crs.enrolledStudentEmails) crs.enrolledStudentEmails = [];
          if (!crs.enrolledStudentEmails.map((e) => e.toLowerCase()).includes(st.email.toLowerCase())) {
            crs.enrolledStudentEmails.push(st.email.toLowerCase());
            coursesModified = true;
          }
        }
      });
    });
    if (coursesModified) {
      setStorage(STORAGE_KEYS.COURSES, courses);
    }

    return { added, updated };
  },

  isStudentEmailAuthorized(email: string): boolean {
    const clean = email.toLowerCase().trim();
    if (!clean) return false;

    // 1. Cek di Database Mahasiswa Master yang diinput Dosen
    const master = this.getMasterStudents();
    if (master.some((s) => s.email.toLowerCase() === clean)) {
      return true;
    }

    // 2. Cek di daftar enrollment mata kuliah aktif
    const courses = this.getAllCourses();
    if (courses.some((c) => (c.enrolledStudentEmails || []).some((e) => e.toLowerCase() === clean))) {
      return true;
    }

    // 3. Cek di Roster Kustom Dosen
    const custom = getStorage<Record<string, any>>(STORAGE_KEYS.CUSTOM_ROSTER, {});
    if (custom[clean]) return true;

    return false;
  },

  syncStudentsFromMyJourney(): { success: boolean; message: string; count: number } {
    let sourceStudents: any[] = [];

    // 1. Coba baca dari localStorage My Journey
    try {
      const raw = localStorage.getItem('my_journey_students');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          sourceStudents = parsed;
        }
      }
    } catch {}

    // 2. Jika tidak ada di localStorage, kembalikan kosongan (tanpa data dummy)
    if (sourceStudents.length === 0) {
      return {
        success: true,
        message: 'Database mahasiswa My Journey saat ini masih kosong.',
        count: 0,
      };
    }

    const payload: Array<Omit<MasterStudent, 'id'>> = sourceStudents.map((s) => ({
      nim: s.nim || '10123001',
      name: s.name || 'Mahasiswa',
      email: s.email || `${s.nim}@student.ac.id`,
      major: s.major || 'Sains Informasi Geografi',
      classSection: s.classSection || 'Kelas A',
      enrolledCourseCodes: s.enrolledCourseCodes || (s.courseCode ? [s.courseCode] : []),
    }));

    const result = this.addMasterStudentsBulk(payload);
    return {
      success: true,
      message: `Berhasil menyelaraskan ${payload.length} data mahasiswa dari My Journey (${result.added} baru, ${result.updated} diperbarui).`,
      count: payload.length,
    };
  },

  // Sinkronisasi data Mata Kuliah langsung dari Supabase Database (My Journey)
  async syncCoursesFromSupabase(): Promise<{ success: boolean; count: number; message: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, count: 0, message: 'Supabase belum dikonfigurasi.' };
    }
    try {
      const { data, error } = await supabase.from('courses').select('*');
      if (error) {
        return { success: false, count: 0, message: `Error Supabase: ${error.message}` };
      }
      if (!data || data.length === 0) {
        return { success: true, count: 0, message: 'Tidak ada data mata kuliah di database Supabase.' };
      }

      const currentCourses = this.getAllCourses();

      // Deduplicate rows from Supabase (prevent multi-user duplicate rows for same course)
      const groups = new Map<string, any[]>();
      data.forEach((row) => {
        const d = row.data || {};
        const code = String(d.code || '').trim().toUpperCase();
        const id = String(row.id || d.id || '').trim();
        const canonicalKey = code || id;
        if (!canonicalKey) return;
        if (!groups.has(canonicalKey)) {
          groups.set(canonicalKey, []);
        }
        groups.get(canonicalKey)!.push(row);
      });

      const deduplicatedRows: any[] = [];
      groups.forEach((rows) => {
        if (rows.length === 1) {
          deduplicatedRows.push(rows[0]);
          return;
        }

        // Sort by updated_at descending (newest first)
        rows.sort((a, b) => {
          const tA = new Date(a.updated_at || a.created_at || 0).getTime();
          const tB = new Date(b.updated_at || b.created_at || 0).getTime();
          return tB - tA;
        });

        const latest = { ...rows[0], data: { ...rows[0].data } };

        // Union enrolled student emails across all rows
        const allEmails = new Set<string>();
        rows.forEach((r) => {
          const list = r.data?.enrolledStudentEmails || [];
          if (Array.isArray(list)) {
            list.forEach((e: string) => {
              if (e && e.includes('@')) allEmails.add(e.toLowerCase().trim());
            });
          }
        });
        latest.data.enrolledStudentEmails = Array.from(allEmails);
        latest.data.enrolledCount = allEmails.size;

        // If ANY row has accepted partner status, the course is accepted!
        const acceptedRow = rows.find((r) => {
          const p = String(r.data?.partnerLecturer || '').trim();
          const pend = String(r.data?.pendingLecturerEmail || '').trim();
          return p && !p.startsWith('PENDING:') && p !== '-' && (!pend || pend === 'null' || pend === 'undefined');
        });

        if (acceptedRow) {
          latest.data.partnerLecturer = acceptedRow.data.partnerLecturer;
          latest.data.partnerLecturerEmail = acceptedRow.data.partnerLecturerEmail;
          latest.data.pendingLecturerEmail = null;
          latest.data.pendingLecturerName = null;
        }

        deduplicatedRows.push(latest);
      });

      const syncedCourses: CourseClass[] = deduplicatedRows.map((row) => {
        const d = row.data || {};
        const existing = currentCourses.find((c) => c.id === row.id || c.code.toLowerCase() === (d.code || '').toLowerCase());
        
        // Determine primary lecturer from data or row
        const primaryStr = String(d.primaryLecturer || existing?.primaryLecturer || existing?.teacher?.name || '').toLowerCase();
        const isMiftahPrimary = primaryStr.includes('miftah') || (!primaryStr && row.user_id !== 'd342423d-fce0-4b54-896f-4c4b27e70dc0');
        
        const primaryEmail = isMiftahPrimary ? 'miftahurridlo.688@gmail.com' : 'altaf.aziz16@gmail.com';
        const partnerEmail = isMiftahPrimary ? 'altaf.aziz16@gmail.com' : 'miftahurridlo.688@gmail.com';
        const primaryUser = DEFAULT_LECTURERS[primaryEmail];
        const partnerUser = DEFAULT_LECTURERS[partnerEmail];

        // Check pending invitation status
        const rawPartnerStr = String(d.partnerLecturer || existing?.partnerLecturer || '').trim();
        const isPendingFromStr = rawPartnerStr.startsWith('PENDING:');
        const pendingEmail = (d.pendingLecturerEmail || (isPendingFromStr ? rawPartnerStr.replace('PENDING:', '').trim() : '') || existing?.pendingLecturerEmail || '').trim().toLowerCase();
        const pendingName = d.pendingLecturerName || existing?.pendingLecturerName || (pendingEmail ? partnerUser.name : undefined);

        const hasPendingInvitation = !!pendingEmail;
        const hasAcceptedPartner = !hasPendingInvitation && (
          (rawPartnerStr && rawPartnerStr !== '-' && !isPendingFromStr) ||
          !!existing?.secondaryTeacher ||
          !!d.secondaryTeacherEmail
        );

        return {
          id: row.id,
          code: d.code || 'KULIAH',
          title: d.name || 'Mata Kuliah',
          room: d.room || existing?.room || 'Lab Komputasi',
          status: (d.status === 'Aktif' || d.status === 'active' ? 'active' : 'upcoming') as any,
          credits: d.credits || 2,
          section: d.section || 'Kelas A',
          schedule: d.schedule || existing?.schedule || 'Jadwal Kuliah',
          semester: d.semester || 'Ganjil 2026/2027',
          academicYear: d.academicYear || '2026/2027',
          description: d.description || existing?.description || '',
          category: 'Geografi & Komputasi',
          color: existing?.color || 'from-blue-600 to-indigo-700',
          syllabusOverview: d.syllabusOverview || existing?.syllabusOverview || 'Silabus perkuliahan dalam proses penyusunan.',
          enrolledCount: (d.enrolledStudentEmails || existing?.enrolledStudentEmails || []).length,
          enrolledStudentEmails: d.enrolledStudentEmails || existing?.enrolledStudentEmails || [],
          completedMeetingsCount: existing?.completedMeetingsCount || 0,
          totalMeetingsCount: 16,
          progress: existing?.progress || 0,
          primaryLecturer: primaryUser.name,
          partnerLecturer: hasAcceptedPartner ? partnerUser.name : undefined,
          pendingLecturerEmail: hasPendingInvitation ? pendingEmail : undefined,
          pendingLecturerName: hasPendingInvitation ? pendingName : undefined,
          teacher: {
            id: primaryUser.id,
            name: primaryUser.name,
            title: 'Dosen Pengampu Utama',
            email: primaryEmail,
            avatarUrl: primaryUser.avatarUrl,
            department: primaryUser.department,
          },
          secondaryTeacher: hasAcceptedPartner ? {
            id: partnerUser.id,
            name: partnerUser.name,
            title: 'Dosen Pengampu Partner',
            email: partnerEmail,
            avatarUrl: partnerUser.avatarUrl,
            department: partnerUser.department,
          } : undefined,
          teamTeachers: hasAcceptedPartner ? [
            {
              id: primaryUser.id,
              name: primaryUser.name,
              title: 'Dosen Pengampu Utama',
              email: primaryEmail,
              avatarUrl: primaryUser.avatarUrl,
              department: primaryUser.department,
            },
            {
              id: partnerUser.id,
              name: partnerUser.name,
              title: 'Dosen Pengampu Partner',
              email: partnerEmail,
              avatarUrl: partnerUser.avatarUrl,
              department: partnerUser.department,
            },
          ] : [
            {
              id: primaryUser.id,
              name: primaryUser.name,
              title: 'Dosen Pengampu Utama',
              email: primaryEmail,
              avatarUrl: primaryUser.avatarUrl,
              department: primaryUser.department,
            },
          ],
          scheduleDay: existing?.scheduleDay || (d.schedule && d.schedule.includes(',') ? d.schedule.split(',')[0].trim() : 'Senin'),
          scheduleTime: existing?.scheduleTime || (d.schedule && d.schedule.includes(',') ? d.schedule.split(',')[1].trim() : '08:00 - 10:30 WIB'),
          totalMeetings: 16,
          completedMeetings: existing?.completedMeetings || 0,
          colorScheme: existing?.colorScheme || 'blue',
        };
      });

      // Filter out any legacy dummy courses (IF-405, IF-208, GEO-301, crs-1, crs-2, crs-3)
      const isDummyCourse = (c: CourseClass) =>
        ['crs-1', 'crs-2', 'crs-3'].includes(c.id) ||
        ['IF-405', 'IF-208', 'GEO-301'].includes((c.code || '').toUpperCase());

      // Supabase is authoritative: prune deleted courses, keep only recent offline courses (< 30s)
      const supaIds = new Set(syncedCourses.map((c) => c.id));
      const supaCodes = new Set(syncedCourses.map((c) => (c.code || '').toUpperCase()));

      const localRemaining = currentCourses.filter((c) => {
        const isRecentOffline = (c as any)._localCreatedAt && Date.now() - (c as any)._localCreatedAt < 30000;
        return isRecentOffline && !supaIds.has(c.id) && !supaCodes.has((c.code || '').toUpperCase()) && !isDummyCourse(c);
      });

      const combined = [...syncedCourses, ...localRemaining];

      // Strict uniqueness guarantee by code and id
      const uniqueMap = new Map<string, CourseClass>();
      combined.forEach((c) => {
        const codeKey = (c.code || '').trim().toUpperCase();
        const idKey = c.id;
        const existing = uniqueMap.get(codeKey) || uniqueMap.get(idKey);
        if (!existing) {
          uniqueMap.set(codeKey, c);
          uniqueMap.set(idKey, c);
        } else {
          const existingIsPending = !!existing.pendingLecturerEmail;
          const cIsPending = !!c.pendingLecturerEmail;
          const chosen = (existingIsPending && !cIsPending) ? c : existing;
          const other = (chosen === c) ? existing : c;

          const mergedEmails = Array.from(new Set([
            ...(chosen.enrolledStudentEmails || []),
            ...(other.enrolledStudentEmails || []),
          ]));
          chosen.enrolledStudentEmails = mergedEmails;
          chosen.enrolledCount = mergedEmails.length;

          uniqueMap.set(codeKey, chosen);
          uniqueMap.set(idKey, chosen);
        }
      });

      const prunedCourses = Array.from(new Set(uniqueMap.values()));
      setStorage(STORAGE_KEYS.COURSES, prunedCourses);
      return {
        success: true,
        count: prunedCourses.length,
        message: `Berhasil menyelaraskan ${prunedCourses.length} mata kuliah dari Supabase My Journey!`,
      };
    } catch (err: any) {
      return { success: false, count: 0, message: `Gagal menyinkronkan Supabase: ${err.message}` };
    }
  },

  // Sinkronisasi data Mahasiswa langsung dari Supabase Database (My Journey)
  async syncStudentsFromSupabase(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const cloudStudents = await supabaseDataService.fetchStudents();
      if (!cloudStudents || cloudStudents.length === 0) {
        return { success: true, count: 0, message: 'Tidak ada data mahasiswa di Supabase.' };
      }

      const currentStudents = getStorage<MasterStudent[]>(STORAGE_KEYS.MASTER_STUDENTS, []);
      const customRoster = getStorage<Record<string, any>>(STORAGE_KEYS.CUSTOM_ROSTER, {});
      let addedCount = 0;

      cloudStudents.forEach((cs) => {
        const cleanEmail = cs.email.trim().toLowerCase();
        if (!cleanEmail) return;

        const idx = currentStudents.findIndex(
          (s) => s.email.toLowerCase() === cleanEmail || s.id === cs.id
        );

        if (idx >= 0) {
          const mergedCodes = Array.from(
            new Set([...(currentStudents[idx].enrolledCourseCodes || []), ...(cs.enrolledCourseCodes || [])])
          );
          currentStudents[idx] = {
            ...currentStudents[idx],
            ...cs,
            enrolledCourseCodes: mergedCodes,
          };
        } else {
          currentStudents.push(cs);
          addedCount++;
        }

        customRoster[cleanEmail] = {
          name: cs.name,
          nim: cs.nim,
          email: cleanEmail,
        };
      });

      setStorage(STORAGE_KEYS.MASTER_STUDENTS, currentStudents);
      setStorage(STORAGE_KEYS.CUSTOM_ROSTER, customRoster);

      return {
        success: true,
        count: cloudStudents.length,
        message: `Berhasil menyelaraskan ${cloudStudents.length} mahasiswa dari Supabase My Journey!`,
      };
    } catch (err: any) {
      return { success: false, count: 0, message: `Gagal menyinkronkan Mahasiswa Supabase: ${err.message}` };
    }
  },

  // Sinkronisasi Pengguna Terdaftar (Portal Users) dari Supabase Cloud
  async syncPortalUsersFromSupabase(): Promise<{ success: boolean; count: number }> {
    try {
      const cloudUsers = await supabaseDataService.fetchPortalUsers();
      if (!cloudUsers || cloudUsers.length === 0) {
        return { success: true, count: 0 };
      }

      const localUsers = this.getRegisteredUsers();
      cloudUsers.forEach((cu) => {
        const cleanEmail = cu.email.trim().toLowerCase();
        const idx = localUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);
        if (idx >= 0) {
          localUsers[idx] = { ...localUsers[idx], ...cu };
        } else {
          localUsers.push(cu);
        }
      });

      setStorage(STORAGE_KEYS.REGISTERED_USERS, localUsers);
      return { success: true, count: cloudUsers.length };
    } catch {
      return { success: false, count: 0 };
    }
  },

  // Sinkronisasi Presensi dari Supabase Cloud
  async syncAttendanceFromSupabase(): Promise<void> {
    try {
      const sessions = await supabaseDataService.fetchAttendanceSessions();
      if (sessions && sessions.length > 0) {
        const localSessions = getStorage<AttendanceSession[]>(STORAGE_KEYS.ATTENDANCE_SESSIONS, []);
        const mergedMap = new Map(localSessions.map((s) => [s.id, s]));
        sessions.forEach((s) => mergedMap.set(s.id, s));
        setStorage(STORAGE_KEYS.ATTENDANCE_SESSIONS, Array.from(mergedMap.values()));
      }
      const records = await supabaseDataService.fetchAttendanceRecords();
      if (records && records.length > 0) {
        const localRecords = getStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE_RECORDS, []);
        const mergedMap = new Map(localRecords.map((r) => [r.id, r]));
        records.forEach((r) => mergedMap.set(r.id, r));
        setStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, Array.from(mergedMap.values()));
      }
    } catch {}
  },

  // Sinkronisasi Tugas & Submissions dari Supabase Cloud
  async syncAssignmentsFromSupabase(): Promise<void> {
    try {
      const assignments = await supabaseDataService.fetchAssignments();
      if (assignments && assignments.length > 0) {
        const localAssignments = getStorage<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, []);
        const mergedMap = new Map(localAssignments.map((a) => [a.id, a]));
        assignments.forEach((a) => mergedMap.set(a.id, a));
        setStorage(STORAGE_KEYS.ASSIGNMENTS, Array.from(mergedMap.values()));
      }
      const submissions = await supabaseDataService.fetchSubmissions();
      if (submissions && submissions.length > 0) {
        const localSubmissions = getStorage<AssignmentSubmission[]>(STORAGE_KEYS.SUBMISSIONS, []);
        const mergedMap = new Map(localSubmissions.map((s) => [s.id, s]));
        submissions.forEach((s) => mergedMap.set(s.id, s));
        setStorage(STORAGE_KEYS.SUBMISSIONS, Array.from(mergedMap.values()));
      }
    } catch {}
  },

  // Sinkronisasi menyeluruh dari Google Apps Script Teaching Bridge + Supabase Cloud
  async syncAllFromMyJourneyCloud(): Promise<{ success: boolean; message: string }> {
    let coursesCount = 0;
    let profilesCount = 0;
    let studentsCount = 0;

    // 1. Tarik dari Google Apps Script Teaching Bridge (Google Sheets)
    try {
      const gasUrl = `${(import.meta as any).env?.VITE_GAS_API_URL || 'https://script.google.com/macros/s/AKfycbwDzcpOCO9Npm0sH8DM9maCOEtDo_LWaHMX4K7JY6RPle_5En0fG5s59sEHRJ9UZ45W/exec'}?action=getTeaching`;
      const res = await fetch(gasUrl);
      if (res.ok) {
        const json = await res.json();
        if (json?.status === 'success' && json?.data) {
          // A. Profil Dosen
          if (json.data.Profiles && Array.isArray(json.data.Profiles)) {
            const curUser = this.getCurrentUser();
            const regUsers = this.getRegisteredUsers();

            json.data.Profiles.forEach((prof: any) => {
              const cleanEmail = (prof.email || '').toLowerCase().trim();
              if (!cleanEmail) return;

              const idx = regUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);
              const isAltaf = cleanEmail.includes('altaf');
              const defaultData = DEFAULT_LECTURERS[cleanEmail] || (isAltaf ? DEFAULT_LECTURERS['altaf.aziz16@gmail.com'] : DEFAULT_LECTURERS['miftahurridlo.688@gmail.com']);
              const existingUser = idx >= 0 ? regUsers[idx] : (curUser && curUser.email.toLowerCase() === cleanEmail ? curUser : undefined);

              const cleanName = isAltaf ? 'Tengku Abdillah Azis, S.Si' : 'Muhammad Miftahurrodlo, M.Sc.';
              const cleanDept = isAltaf ? 'Tenaga Teknis Survei dan Pemetaan BPN Kota Binjai • Geografi / Universitas Negeri Medan' : 'Pendidikan Geografi';
              const defaultTitle = isAltaf ? 'Tenaga Teknis Survei & Pemetaan / Dosen Pengampu Partner' : 'Dosen Pengampu Utama';
              const defaultBio = isAltaf
                ? 'All about my journey; research, work, and study'
                : 'Dosen & Peneliti Pendidikan Geografi. Terhubung langsung dengan kurikulum OBE dan manajemen pengajaran My Journey.';

              const targetAvatar = isAltaf
                ? '/tengku_avatar.png'
                : (prof.avatarUrl && !prof.avatarUrl.includes('ui-avatars') && !prof.avatarUrl.includes('photo-') && !prof.avatarUrl.includes('academic_avatar')
                  ? prof.avatarUrl
                  : '/miftah_avatar.png');

              let unpackedLinks: any = {};
              if (prof.role && prof.role.includes('|LINKS:')) {
                try {
                  unpackedLinks = JSON.parse(prof.role.split('|LINKS:')[1]);
                } catch {}
              }

              const userObj: RegisteredUser = {
                ...defaultData,
                ...existingUser,
                id: existingUser?.id || defaultData.id || `dos_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
                name: (prof.name && !prof.name.includes('S.Pd')) ? prof.name : cleanName,
                email: cleanEmail,
                role: 'dosen',
                nidn: isAltaf ? '0419058902' : '0412088501',
                title: existingUser?.title || prof.title || defaultTitle,
                department: prof.department || cleanDept,
                avatarUrl: targetAvatar,
                bio: (existingUser?.bio && !existingUser.bio.includes('Dosen Pengampu Smart Learning Hub.'))
                  ? existingUser.bio
                  : ((prof.bio && !prof.bio.includes('Dosen Pengampu Smart Learning Hub.')) ? prof.bio : defaultBio),
                campusEmail: unpackedLinks.campusEmail || prof.campusEmail || existingUser?.campusEmail || defaultData.campusEmail || (isAltaf ? 'altaf.aziz16@gmail.com' : 'miftahurridlo.688@gmail.com'),
                googleScholarUrl: unpackedLinks.googleScholarUrl || prof.googleScholarUrl || existingUser?.googleScholarUrl || defaultData.googleScholarUrl || '',
                sintaUrl: isAltaf ? '' : (unpackedLinks.sintaUrl || prof.sintaUrl || existingUser?.sintaUrl || defaultData.sintaUrl || ''),
                scopusUrl: isAltaf ? '' : (unpackedLinks.scopusUrl || prof.scopusUrl || existingUser?.scopusUrl || defaultData.scopusUrl || ''),
                orcidUrl: unpackedLinks.orcidUrl || prof.orcidUrl || existingUser?.orcidUrl || defaultData.orcidUrl || '',
                researchGateUrl: unpackedLinks.researchGateUrl || prof.researchGateUrl || existingUser?.researchGateUrl || defaultData.researchGateUrl || '',
                linkedinUrl: unpackedLinks.linkedinUrl || prof.linkedinUrl || existingUser?.linkedinUrl || defaultData.linkedinUrl || '',
                instagramUrl: unpackedLinks.instagramUrl || prof.instagramUrl || existingUser?.instagramUrl || defaultData.instagramUrl || '',
                facebookUrl: unpackedLinks.facebookUrl || prof.facebookUrl || existingUser?.facebookUrl || defaultData.facebookUrl || '',
                registeredAt: existingUser?.registeredAt || defaultData.registeredAt || '2026-08-01',
              };

              if (idx >= 0) {
                regUsers[idx] = { ...regUsers[idx], ...userObj };
              } else {
                regUsers.push(userObj);
              }
              profilesCount++;

              if (curUser && curUser.email.toLowerCase() === cleanEmail) {
                this.setCurrentUser({ ...curUser, ...userObj });
              }
            });

            setStorage(STORAGE_KEYS.REGISTERED_USERS, regUsers);
          }

          // B. Kelas disinkronkan dari Google Sheets Teaching Bridge
          if (json.data.Courses && Array.isArray(json.data.Courses) && json.data.Courses.length > 0) {
            const currentCourses = this.getAllCourses();
            const allMeetings = this.getMeetings();
            let coursesUpdated = false;

            const deletedIds = getStorage<string[]>('slh_deleted_course_ids', []);
            json.data.Courses.forEach((sheetCourse: any) => {
              if (!sheetCourse.code && !sheetCourse.name) return;
              const sheetCourseId = sheetCourse.id || '';
              if (deletedIds.includes(sheetCourseId)) {
                myJourneySyncService.deleteCourseFromGoogleSheets(sheetCourseId).catch(() => {});
                return;
              }
              const courseCode = String(sheetCourse.code || '').trim().toUpperCase();
              const courseName = String(sheetCourse.name || sheetCourse.title || '').trim();
              const courseId = sheetCourse.id || `course_${courseCode.replace(/[^a-zA-Z0-9]/g, '_')}`;

              const idx = currentCourses.findIndex((c) => c.id === courseId || c.code.toUpperCase() === courseCode);
              const primaryLecturerStr = (sheetCourse.primaryLecturer || '').toLowerCase();

              const isMiftahPrimary = primaryLecturerStr.includes('miftah');
              const primaryTeacher = isMiftahPrimary
                ? DEFAULT_LECTURERS['miftahurridlo.688@gmail.com']
                : DEFAULT_LECTURERS['altaf.aziz16@gmail.com'];
              const secondaryTeacher = isMiftahPrimary
                ? DEFAULT_LECTURERS['altaf.aziz16@gmail.com']
                : DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'];

              const scheduleRaw = sheetCourse.schedule || 'Senin, 08:00 - 10:30 WIB';
              const scheduleDay = scheduleRaw.includes(',') ? scheduleRaw.split(',')[0].trim() : 'Senin';
              const scheduleTime = scheduleRaw.includes(',') ? scheduleRaw.split(',')[1].trim() : '08:00 - 10:30 WIB';

              const partnerLecturerStr = (sheetCourse.partnerLecturer || '').trim();
              const isPendingFromPartnerCol = partnerLecturerStr.startsWith('PENDING:');
              const pendingLecturerEmailStr = isPendingFromPartnerCol
                ? partnerLecturerStr.replace('PENDING:', '').trim().toLowerCase()
                : (sheetCourse.pendingLecturerEmail || '').trim().toLowerCase();
              const hasPendingInvitation = !!pendingLecturerEmailStr;
              const isPartnerAccepted = !hasPendingInvitation && partnerLecturerStr && partnerLecturerStr !== '-' && partnerLecturerStr !== '';

              const reconstructedCourse: CourseClass = {
                id: courseId,
                code: courseCode,
                title: courseName,
                section: sheetCourse.section || 'Kelas A',
                credits: Number(sheetCourse.credits) || 3,
                description: sheetCourse.description || `Mata kuliah ${courseName} semester ini diampu oleh tim dosen.`,
                teacher: {
                  id: primaryTeacher.id,
                  name: primaryTeacher.name,
                  title: primaryTeacher.title || 'Dosen Pengampu',
                  email: primaryTeacher.email,
                  avatarUrl: primaryTeacher.avatarUrl,
                  department: primaryTeacher.department || 'Tenaga Teknis Survei dan Pemetaan BPN Kota Binjai • Geografi / Universitas Negeri Medan',
                },
                secondaryTeacher: isPartnerAccepted ? {
                  id: secondaryTeacher.id,
                  name: secondaryTeacher.name,
                  title: secondaryTeacher.title || 'Dosen Pengampu',
                  email: secondaryTeacher.email,
                  avatarUrl: secondaryTeacher.avatarUrl,
                  department: secondaryTeacher.department || 'Universitas Negeri Medan',
                } : undefined,
                partnerLecturer: isPartnerAccepted ? secondaryTeacher.name : undefined,
                pendingLecturerEmail: hasPendingInvitation ? pendingLecturerEmailStr : undefined,
                pendingLecturerName: hasPendingInvitation ? (sheetCourse.pendingLecturerName || secondaryTeacher.name) : undefined,
                teamTeachers: isPartnerAccepted ? [
                  {
                    id: primaryTeacher.id,
                    name: primaryTeacher.name,
                    title: primaryTeacher.title || 'Dosen Pengampu',
                    email: primaryTeacher.email,
                    avatarUrl: primaryTeacher.avatarUrl,
                    department: primaryTeacher.department || 'Tenaga Teknis Survei dan Pemetaan BPN Kota Binjai • Geografi / Universitas Negeri Medan',
                  },
                  {
                    id: secondaryTeacher.id,
                    name: secondaryTeacher.name,
                    title: secondaryTeacher.title || 'Dosen Pengampu',
                    email: secondaryTeacher.email,
                    avatarUrl: secondaryTeacher.avatarUrl,
                    department: secondaryTeacher.department || 'Universitas Negeri Medan',
                  },
                ] : [
                  {
                    id: primaryTeacher.id,
                    name: primaryTeacher.name,
                    title: primaryTeacher.title || 'Dosen Pengampu',
                    email: primaryTeacher.email,
                    avatarUrl: primaryTeacher.avatarUrl,
                    department: primaryTeacher.department || 'Tenaga Teknis Survei dan Pemetaan BPN Kota Binjai • Geografi / Universitas Negeri Medan',
                  },
                ],
                semester: sheetCourse.semester || 'Semester 3',
                academicYear: sheetCourse.academicYear || '2026/2027 Ganjil',
                room: sheetCourse.room || 'Lab Komputasi Spasial Lt. 3',
                scheduleDay: scheduleDay,
                scheduleTime: scheduleTime,
                totalMeetings: 16,
                completedMeetings: 0,
                colorScheme: 'blue',
                enrolledStudentEmails: idx >= 0 ? (currentCourses[idx].enrolledStudentEmails || []) : [],
              };

              if (idx >= 0) {
                currentCourses[idx] = {
                  ...currentCourses[idx],
                  ...reconstructedCourse,
                  enrolledStudentEmails: currentCourses[idx].enrolledStudentEmails || [],
                  rps: currentCourses[idx].rps || reconstructedCourse.rps,
                };
              } else {
                currentCourses.push(reconstructedCourse);
              }
              coursesUpdated = true;
              coursesCount++;

              // Pastikan 16 pertemuan tersedia untuk kelas ini
              const existingMeetings = allMeetings.filter((m) => m.courseId === courseId);
              if (existingMeetings.length === 0) {
                const newMeetings: Meeting[] = Array.from({ length: 16 }, (_, i) => ({
                  id: `mtg_${courseId}_${i + 1}`,
                  courseId: courseId,
                  meetingNumber: i + 1,
                  title: `Pertemuan 0${i + 1}: ${i === 0 ? 'Kontrak Kuliah & Pengantar' : i === 7 ? 'Evaluasi Tengah Semester (UTS)' : i === 15 ? 'Presentasi Proyek Akhir (UAS)' : `Modul ${i + 1} Perkuliahan`}`,
                  topic: `Pembahasan materi dan studi kasus perkuliahan pertemuan ke-${i + 1}.`,
                  date: `2026-09-${String(Math.min(30, 1 + i * 7)).padStart(2, '0')}`,
                  startTime: scheduleTime.split('-')[0]?.trim() || '08:00',
                  endTime: scheduleTime.split('-')[1]?.trim() || '10:30',
                  room: sheetCourse.room || 'Lab Komputasi Spasial Lt. 3',
                  isCompleted: false,
                  materials: [],
                  assignments: [],
                }));
                allMeetings.push(...newMeetings);
              }
            });

            // Prune local courses that were deleted from Google Sheets
            const cloudCourseIds = new Set(json.data.Courses.map((sc: any) => sc.id).filter(Boolean));
            const cloudCourseCodes = new Set(json.data.Courses.map((sc: any) => String(sc.code || '').trim().toUpperCase()).filter(Boolean));
            const prunedCourses = currentCourses.filter((c) => {
              const isRecentOffline = (c as any)._localCreatedAt && Date.now() - (c as any)._localCreatedAt < 30000;
              if (isRecentOffline) return true;
              return cloudCourseIds.has(c.id) || cloudCourseCodes.has(c.code.toUpperCase());
            });

            const validIds = new Set(prunedCourses.map((c) => c.id));
            const prunedMeetings = allMeetings.filter((m) => validIds.has(m.courseId));
            setStorage(STORAGE_KEYS.COURSES, prunedCourses);
            setStorage(STORAGE_KEYS.MEETINGS, prunedMeetings);
          }

          // C. Mahasiswa Resmi dari Google Sheets (hanya mahasiswa nyata)
          if (json.data.Students && Array.isArray(json.data.Students) && json.data.Students.length > 0) {
            const masterStudents = this.getMasterStudents();
            const currentCourses = this.getAllCourses();
            const customRoster = getStorage<Record<string, any>>(STORAGE_KEYS.CUSTOM_ROSTER, {});
            let coursesModified = false;

            json.data.Students.forEach((std: any) => {
              const cleanEmail = (std.email || '').toLowerCase().trim();
              if (!cleanEmail) return;

              const idx = masterStudents.findIndex((m) => m.email.toLowerCase() === cleanEmail);
              const courseCodeStr = String(std.courseCode || '').trim();
              const courseNameStr = String(std.courseName || '').trim().toLowerCase();

              const record: MasterStudent = {
                id: std.id || `std_${Date.now()}`,
                nim: String(std.nim || '10123000'),
                name: std.name || 'Mahasiswa',
                email: cleanEmail,
                major: std.major || 'Sains Informasi Geografi',
                classSection: std.classSection || 'Kelas A',
                enrolledCourseCodes: courseCodeStr ? [courseCodeStr] : [],
                avatarUrl: getInitialsAvatar(std.name || 'Mahasiswa', false),
              };

              if (idx >= 0) {
                const mergedCodes = Array.from(new Set([
                  ...(masterStudents[idx].enrolledCourseCodes || []),
                  ...(courseCodeStr ? [courseCodeStr] : []),
                ]));
                masterStudents[idx] = { ...masterStudents[idx], ...record, enrolledCourseCodes: mergedCodes };
              } else {
                masterStudents.push(record);
              }

              // Update custom roster
              customRoster[cleanEmail] = {
                name: std.name || 'Mahasiswa',
                nim: String(std.nim || '10123000'),
                email: cleanEmail,
              };

              // Attach student email to matching course(s)
              currentCourses.forEach((crs) => {
                const codeMatch = courseCodeStr && (
                  crs.code.toUpperCase() === courseCodeStr.toUpperCase() ||
                  crs.id === courseCodeStr
                );
                const titleMatch = courseNameStr && (
                  crs.title.toLowerCase() === courseNameStr ||
                  crs.title.toLowerCase().includes(courseNameStr)
                );
                if (codeMatch || titleMatch) {
                  if (!crs.enrolledStudentEmails) crs.enrolledStudentEmails = [];
                  if (!crs.enrolledStudentEmails.map((e) => e.toLowerCase().trim()).includes(cleanEmail)) {
                    crs.enrolledStudentEmails.push(cleanEmail);
                    crs.enrolledCount = crs.enrolledStudentEmails.length;
                    coursesModified = true;
                  }
                }
              });

              studentsCount++;
            });

            setStorage(STORAGE_KEYS.MASTER_STUDENTS, masterStudents);
            setStorage(STORAGE_KEYS.CUSTOM_ROSTER, customRoster);
            if (coursesModified) {
              setStorage(STORAGE_KEYS.COURSES, currentCourses);
            }
          }
        }
      }
    } catch (gasErr) {
      console.warn('[MyJourneySync] Google Apps Script fetch warning:', gasErr);
    }

    // 2. Tarik Kelas dari Supabase Cloud
    try {
      const supaResult = await this.syncCoursesFromSupabase();
      if (supaResult.success) {
        coursesCount += supaResult.count;
      }
    } catch (supaErr) {
      console.warn('[MyJourneySync] Supabase fetch warning:', supaErr);
    }

    // 3. Tarik Mahasiswa dari Supabase Cloud (My Journey)
    try {
      const supaStudents = await this.syncStudentsFromSupabase();
      if (supaStudents.success) {
        studentsCount += supaStudents.count;
      }
    } catch (stdErr) {
      console.warn('[MyJourneySync] Supabase students fetch warning:', stdErr);
    }

    // 4. Tarik Akun Terdaftar (Portal Users) dari Supabase Cloud
    try {
      await this.syncPortalUsersFromSupabase();
    } catch (puErr) {
      console.warn('[MyJourneySync] Supabase portal users warning:', puErr);
    }

    // 5. Tarik Presensi & Tugas dari Supabase Cloud
    try {
      await this.syncAttendanceFromSupabase();
      await this.syncAssignmentsFromSupabase();
    } catch (attErr) {
      console.warn('[MyJourneySync] Supabase attendance/assignments warning:', attErr);
    }

    return {
      success: true,
      message: `Sinkronisasi berhasil! ${coursesCount} mata kuliah dan ${studentsCount} mahasiswa aktif diselaraskan dari Cloud.`,
    };
  },

  // Auth: Login dengan dukungan Supabase Auth & Local Fallback
  async loginAsync(email: string, password = ''): Promise<{ success: boolean; user?: AuthUser; message: string }> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return { success: false, message: 'Silakan masukkan email Anda.' };
    }

    const isLecturer = LECTURER_WHITELIST_EMAILS.map((e) => e.toLowerCase()).includes(normalized);

    // =========================================================================
    // 1. DOSEN PENGAMPU (AKUN TIM DOSEN MY JOURNEY):
    // Password WAJIB diverifikasi secara ketat melalui Supabase Auth!
    // Tidak boleh tembus dengan kata sandi asal-asalan.
    // =========================================================================
    if (isLecturer) {
      if (!password || !password.trim()) {
        return {
          success: false,
          message: 'Kata sandi akun My Journey Anda wajib diisi.',
        };
      }

      if (!isSupabaseConfigured() || !supabase) {
        return {
          success: false,
          message: 'Koneksi database Supabase My Journey belum terhubung. Silakan periksa koneksi internet Anda.',
        };
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalized,
          password: password.trim(),
        });

        if (error || !data?.user) {
          const detail = error?.message ? ` (${error.message})` : '';
          return {
            success: false,
            message: `Kata sandi atau email tidak cocok dengan akun My Journey / Supabase Anda${detail}. Mohon masukkan kata sandi akun My Journey yang benar.`,
          };
        }

        // Supabase Auth Berhasil Terverifikasi!
        const isAltaf = normalized.includes('altaf');
        const defaultName = isAltaf ? 'Tengku Abdillah Azis, S.Pd' : 'Muhammad Miftahurrodlo, S.Pd., M.Sc';
        const defaultDept = isAltaf ? 'Sains Informasi Geografi' : 'Pendidikan Geografi';
        const defaultTitle = isAltaf ? 'Dosen Pengampu Partner' : 'Dosen Pengampu Utama';
        const defaultBio = isAltaf
          ? 'Dosen & Peneliti Sains Informasi Geografi. Terhubung langsung dengan workspace riset, pengajaran, dan administrasi My Journey.'
          : 'Dosen & Peneliti Pendidikan Geografi. Terhubung langsung dengan kurikulum OBE dan manajemen pengajaran My Journey.';
        const defaultAvatar = isAltaf ? '/tengku_avatar.png' : getInitialsAvatar(defaultName, true);
        const fullName = defaultName;

        // Cek profil dari tabel profiles Supabase My Journey
        let supaAvatar = defaultAvatar;
        let supaBio = defaultBio;
        let supaDept = defaultDept;
        try {
          const { data: supaProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();
          if (supaProfile) {
            if (supaProfile.bio) supaBio = supaProfile.bio;
            if (supaProfile.university_or_org) supaDept = supaProfile.university_or_org;
            if (supaProfile.avatar_url && !supaProfile.avatar_url.includes('ui-avatars')) {
              supaAvatar = supaProfile.avatar_url.includes('academic_avatar') ? '/tengku_avatar.png' : supaProfile.avatar_url;
            }
          }
        } catch {}

        const registeredUsers = this.getRegisteredUsers();
        let user = registeredUsers.find((u) => u.email.toLowerCase() === normalized);

        if (!user) {
          user = {
            id: data.user.id,
            name: fullName,
            email: normalized,
            role: 'dosen',
            password: password,
            nidn: isAltaf ? '0419058902' : '0412088501',
            title: defaultTitle,
            department: supaDept,
            bio: supaBio,
            avatarUrl: supaAvatar,
            registeredAt: new Date().toISOString(),
          };
          this.saveRegisteredUser(user);
        } else {
          user.id = data.user.id;
          user.password = password;
          user.name = fullName;
          user.nidn = isAltaf ? '0419058902' : '0412088501';
          user.title = defaultTitle;
          user.department = supaDept;
          user.bio = supaBio;
          user.avatarUrl = supaAvatar;
          this.saveRegisteredUser(user);
        }

        this.setCurrentUser(user);
        await this.syncAllFromMyJourneyCloud();

        const refreshedUser = this.getCurrentUser() || user;
        const greetingName = this.formatLecturerGreeting(refreshedUser.name);
        return {
          success: true,
          user: refreshedUser,
          message: `Selamat datang kembali, ${greetingName}! (Terverifikasi Supabase My Journey)`,
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Gagal verifikasi Supabase: ${err.message || 'Koneksi bermasalah'}`,
        };
      }
    }

    // =========================================================================
    // 2. MAHASISWA:
    // Cek password terdaftar di akun portal Smart Learning Hub
    // =========================================================================
    if (!password || !password.trim()) {
      return {
        success: false,
        message: 'Kata sandi akun Anda wajib diisi.',
      };
    }

    const regUsers = this.getRegisteredUsers();
    const existing = regUsers.find((u) => u.email.toLowerCase() === normalized);

    if (existing) {
      if (existing.password && existing.password !== password) {
        return {
          success: false,
          message: 'Kata sandi tidak sesuai. Silakan periksa kembali kata sandi Anda.',
        };
      }
      this.setCurrentUser(existing);
      return {
        success: true,
        user: existing,
        message: `Selamat datang kembali, ${existing.name}!`,
      };
    }

    return {
      success: false,
      message: 'Email belum terdaftar. Silakan buka tab "Daftar Akun" untuk mendaftarkan akun baru menggunakan email yang telah diizinkan dosen.',
    };
  },

  // Auth: Register dengan dukungan Supabase Auth & Whitelist Check
  async registerAsync(data: {
    name: string;
    email: string;
    role?: UserRole;
    nim?: string;
    nidn?: string;
    password?: string;
  }): Promise<{
    success: boolean;
    user?: AuthUser;
    message: string;
  }> {
    const normalized = data.email.trim().toLowerCase();
    if (!normalized) {
      return { success: false, message: 'Email wajib diisi.' };
    }
    if (!data.name.trim()) {
      return { success: false, message: 'Nama lengkap wajib diisi.' };
    }

    const isLecturerWhitelist = LECTURER_WHITELIST_EMAILS.map((e) => e.toLowerCase()).includes(normalized);
    const role: UserRole = isLecturerWhitelist ? 'dosen' : 'mahasiswa';

    // Strict whitelist check untuk mahasiswa
    if (role === 'mahasiswa') {
      const isAuthorized = this.isStudentEmailAuthorized(normalized);
      if (!isAuthorized) {
        return {
          success: false,
          message: `Pendaftaran akun ditolak: Email "${normalized}" belum terdaftar di basis data mahasiswa resmi kelas ini. Silakan hubungi Dosen Pengampu untuk mendaftarkan email Anda ke kelas terlebih dahulu.`,
        };
      }
    }

    // Daftarkan juga ke Supabase Auth jika online
    if (isSupabaseConfigured() && supabase && data.password) {
      try {
        await supabase.auth.signUp({
          email: normalized,
          password: data.password,
          options: {
            data: {
              full_name: data.name.trim(),
              role,
              nim: data.nim?.trim() || '',
              nidn: data.nidn?.trim() || '',
            },
          },
        });
      } catch {}
    }

    return this.register(data);
  },

  // Auth: Registration
  register(data: {
    name: string;
    email: string;
    role?: UserRole;
    nim?: string;
    nidn?: string;
    password?: string;
  }): {
    success: boolean;
    user?: AuthUser;
    message: string;
  } {
    const normalized = data.email.trim().toLowerCase();
    if (!normalized) {
      return { success: false, message: 'Email wajib diisi.' };
    }
    if (!data.name.trim()) {
      return { success: false, message: 'Nama lengkap wajib diisi.' };
    }

    const isLecturerWhitelist = LECTURER_WHITELIST_EMAILS.map((e) => e.toLowerCase()).includes(normalized);
    const role: UserRole = isLecturerWhitelist ? 'dosen' : 'mahasiswa';

    // Whitelist check: Mahasiswa must be in Master Database or authorized in a class!
    if (role === 'mahasiswa') {
      const isAuthorized = this.isStudentEmailAuthorized(normalized);
      if (!isAuthorized) {
        return {
          success: false,
          message: `Pendaftaran akun ditolak: Email "${normalized}" belum terdaftar di basis data mahasiswa resmi kelas ini. Silakan hubungi Dosen Pengampu untuk mendaftarkan email Anda ke kelas terlebih dahulu.`,
        };
      }
    }

    const cleanName = data.name.trim();
    let title: string | undefined;
    let nidn: string | undefined = data.nidn?.trim();
    let department: string | undefined;
    let bio: string | undefined;
    let avatarUrl: string;

    let studentNim = data.nim?.trim();
    let studentMajor: string | undefined;
    let enrolledCodes: string[] = [];

    if (role === 'dosen') {
      const isMiftah = normalized.includes('miftah');
      title = isMiftah ? 'Dosen Pengampu Utama' : 'Dosen Pengampu Partner';
      nidn = nidn || (isMiftah ? '0412088501' : '0419058902');
      department = isMiftah
        ? 'Sains Informasi Geografi'
        : 'Pendidikan Geografi';
      bio = isMiftah
        ? 'Dosen Pengampu Utama Smart Learning Hub & My Journey.'
        : 'Dosen Pengampu Partner Smart Learning Hub & My Journey.';
      avatarUrl = getInitialsAvatar(cleanName, true);
    } else {
      avatarUrl = getInitialsAvatar(cleanName, false);
      const masterRecord = this.getMasterStudents().find((s) => s.email.toLowerCase() === normalized);
      if (masterRecord) {
        masterRecord.name = cleanName;
        if (studentNim) {
          masterRecord.nim = studentNim;
        } else if (masterRecord.nim) {
          studentNim = masterRecord.nim;
        }
        studentMajor = masterRecord.major;
        enrolledCodes = masterRecord.enrolledCourseCodes || [];
        masterRecord.isRegistered = true;
        masterRecord.registeredAt = new Date().toISOString();
        this.saveMasterStudent(masterRecord);
      } else {
        // Otomatis daftarkan ke database mahasiswa master dosen agar selalu muncul di data dosen
        const newMaster: MasterStudent = {
          id: `mstd_${Date.now()}`,
          name: cleanName,
          email: normalized,
          nim: studentNim || data.nim?.trim() || '10123000',
          major: studentMajor || 'Pendidikan Geografi',
          classSection: 'Kelas A',
          enrolledCourseCodes: [],
          avatarUrl,
          isRegistered: true,
          registeredAt: new Date().toISOString(),
        };
        this.saveMasterStudent(newMaster);
      }
    }

    const newUser: RegisteredUser = {
      id: role === 'dosen' ? `dos_${Date.now()}` : `std_${Date.now()}`,
      name: cleanName,
      email: normalized,
      role,
      password: data.password || '',
      nim: role === 'mahasiswa' ? (studentNim || data.nim?.trim() || '10123001') : undefined,
      nidn,
      title,
      department: department || studentMajor,
      bio,
      avatarUrl,
      registeredAt: new Date().toISOString(),
    };

    this.saveRegisteredUser(newUser);
    this.setCurrentUser(newUser);

    if (role === 'mahasiswa') {
      this.updateProfile({
        name: newUser.name,
        email: normalized,
        nim: newUser.nim || '10123001',
        major: studentMajor || 'Informatika',
      });

      // Automatically enroll into any courses matching enrolledCodes
      if (enrolledCodes.length > 0) {
        const allCourses = this.getAllCourses();
        let coursesModified = false;
        allCourses.forEach((crs) => {
          if (enrolledCodes.includes(crs.code) || enrolledCodes.includes(crs.id)) {
            if (!crs.enrolledStudentEmails) crs.enrolledStudentEmails = [];
            if (!crs.enrolledStudentEmails.map((e) => e.toLowerCase()).includes(normalized)) {
              crs.enrolledStudentEmails.push(normalized);
              coursesModified = true;
            }
          }
        });
        if (coursesModified) {
          setStorage(STORAGE_KEYS.COURSES, allCourses);
        }
      }
    }

    return {
      success: true,
      user: newUser,
      message: role === 'dosen'
        ? `Pendaftaran berhasil! Selamat datang di Portal Dosen, ${newUser.name}. Akun terhubung dengan My Journey.`
        : `Pendaftaran berhasil! Selamat datang di Portal Mahasiswa, ${newUser.name}. Kelas Anda telah terhubung.`,
    };
  },

  // Auth: Password Reset Simulation
  resetPassword(email: string): { success: boolean; message: string } {
    const normalized = email.trim().toLowerCase();
    const courses = this.getAllCourses();
    const validation = validateEmailAccess(normalized, courses, LECTURER_WHITELIST_EMAILS);

    if (!validation.allowed) {
      return {
        success: false,
        message: 'Email tidak ditemukan dalam sistem Smart Learning Hub.',
      };
    }

    return {
      success: true,
      message: `Instruksi pembaruan kata sandi telah dikirim ke ${normalized}. Silakan periksa kotak masuk atau spam email Anda.`,
    };
  },

  // Profile (Student)
  getProfile(): StudentProfile {
    return getStorage<StudentProfile>(STORAGE_KEYS.PROFILE, initialStudentProfile);
  },

  updateProfile(updates: Partial<StudentProfile>): StudentProfile {
    const current = this.getProfile();
    const updated: StudentProfile = {
      ...current,
      ...updates,
      id: current.id,
    };
    setStorage(STORAGE_KEYS.PROFILE, updated);
    return updated;
  },

  // Courses
  getAllCourses(): CourseClass[] {
    const courses = getStorage<CourseClass[]>(STORAGE_KEYS.COURSES, initialCourses);
    const deletedIds = getStorage<string[]>('slh_deleted_course_ids', []);
    const filtered = courses.filter((c) => !deletedIds.includes(c.id));
    if (filtered.length !== courses.length) {
      setStorage(STORAGE_KEYS.COURSES, filtered);
    }
    let updatedNeeded = false;
    const synced = filtered.map((c) => {
      let item = { ...c };
      let itemChanged = false;
      if (!item.teacher || !item.teacher.name || !item.teacher.email) {
        const isMiftah = (item.primaryLecturer || '').toLowerCase().includes('miftah');
        const defaultTeacher = isMiftah ? DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'] : DEFAULT_LECTURERS['altaf.aziz16@gmail.com'];
        item.teacher = {
          id: defaultTeacher.id,
          name: item.primaryLecturer || defaultTeacher.name,
          title: defaultTeacher.title || 'Dosen Pengampu',
          email: defaultTeacher.email,
          avatarUrl: defaultTeacher.avatarUrl,
          department: defaultTeacher.department,
        };
        itemChanged = true;
      }
      if (!item.section) {
        item.section = 'Kelas A';
        itemChanged = true;
      }
      if (!item.credits) {
        item.credits = 3;
        itemChanged = true;
      }
      if (!item.rps && initialCourseRps[c.id]) {
        item.rps = initialCourseRps[c.id];
        itemChanged = true;
      }
      if (itemChanged) {
        updatedNeeded = true;
      }
      return item;
    });
    if (updatedNeeded) {
      setStorage(STORAGE_KEYS.COURSES, synced);
    }

    // Deduplicate synced courses by course code and id
    const uniqueMap = new Map<string, CourseClass>();
    synced.forEach((c) => {
      const codeKey = (c.code || '').trim().toUpperCase();
      const idKey = c.id;
      const existing = uniqueMap.get(codeKey) || uniqueMap.get(idKey);
      if (!existing) {
        uniqueMap.set(codeKey, c);
        uniqueMap.set(idKey, c);
      } else {
        const existingIsPending = !!existing.pendingLecturerEmail;
        const cIsPending = !!c.pendingLecturerEmail;
        const chosen = (existingIsPending && !cIsPending) ? c : existing;
        const other = (chosen === c) ? existing : c;

        const mergedEmails = Array.from(new Set([
          ...(chosen.enrolledStudentEmails || []),
          ...(other.enrolledStudentEmails || []),
        ]));
        chosen.enrolledStudentEmails = mergedEmails;
        chosen.enrolledCount = mergedEmails.length;

        uniqueMap.set(codeKey, chosen);
        uniqueMap.set(idKey, chosen);
        updatedNeeded = true;
      }
    });

    const finalUnique = Array.from(new Set(uniqueMap.values()));
    if (updatedNeeded || finalUnique.length !== courses.length) {
      setStorage(STORAGE_KEYS.COURSES, finalUnique);
    }
    return finalUnique;
  },

  getCourseRps(courseId: string): CourseRps | undefined {
    const course = this.getCourseById(courseId);
    if (course?.rps) return course.rps;
    return initialCourseRps[courseId];
  },

  updateCourseRps(courseId: string, updates: Partial<CourseRps>): CourseRps {
    const courses = this.getAllCourses();
    const idx = courses.findIndex((c) => c.id === courseId);
    if (idx === -1) throw new Error('Course not found');

    const currentRps = courses[idx].rps || initialCourseRps[courseId];
    const updatedRps: CourseRps = {
      ...currentRps,
      ...updates,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    courses[idx] = {
      ...courses[idx],
      rps: updatedRps,
    };
    setStorage(STORAGE_KEYS.COURSES, courses);

    this.addActivity({
      title: 'Pembaruan RPS Mata Kuliah',
      description: `Dokumen RPS ${courses[idx].code} - ${courses[idx].title} telah diperbarui oleh dosen pengampu.`,
      type: 'course',
      courseTitle: courses[idx].title,
    });

    return updatedRps;
  },

  getEnrolledCourses(studentEmail?: string): CourseClass[] {
    const courses = this.getAllCourses();
    const user = this.getCurrentUser();
    if (!user && !studentEmail) {
      return [];
    }
    const emailToFilter = (studentEmail || user?.email || '').toLowerCase().trim();

    // If querying as lecturer for lecturer's own portal: return courses where lecturer is creator OR accepted partner
    const isLecturerSelfQuery = user?.role === 'dosen' && (!studentEmail || studentEmail.toLowerCase().trim() === user.email.toLowerCase().trim());
    if (isLecturerSelfQuery) {
      return courses.filter((c) => {
        const primary = (c.teacher?.email || '').toLowerCase().trim();
        const secondary = (c.secondaryTeacher?.email || '').toLowerCase().trim();
        const pending = (c.pendingLecturerEmail || '').toLowerCase().trim();
        const isTeam = (c.teamTeachers || []).some((t) => (t.email || '').toLowerCase().trim() === emailToFilter);

        // Dosen pembuat kelas selalu melihat kelasnya
        if (primary === emailToFilter) {
          return true;
        }

        // Jika ada status undangan pending untuk dosen ini, JANGAN tampilkan di kelas aktif sebelum diterima
        if (pending === emailToFilter) {
          return false;
        }

        // Jika sudah resmi diterima sebagai secondaryTeacher atau ada di teamTeachers (tanpa pending)
        if (secondary === emailToFilter && !c.pendingLecturerEmail) {
          return true;
        }
        if (isTeam && !c.pendingLecturerEmail) {
          return true;
        }

        return false;
      });
    }

    // For students: check enrolledStudentEmails OR masterStudents database
    const masterStudents = this.getMasterStudents();
    const studentMaster = masterStudents.find(
      (m) => m.email.toLowerCase().trim() === emailToFilter
    );

    let modified = false;
    const enrolled = courses.filter((c) => {
      const inWhitelist = (c.enrolledStudentEmails || [])
        .map((e) => e.toLowerCase().trim())
        .includes(emailToFilter);
      if (inWhitelist) return true;

      if (studentMaster && studentMaster.enrolledCourseCodes && studentMaster.enrolledCourseCodes.length > 0) {
        const matchesCode = studentMaster.enrolledCourseCodes.some(
          (code) => code.toUpperCase() === c.code.toUpperCase() || code === c.id
        );
        if (matchesCode) {
          if (!c.enrolledStudentEmails) c.enrolledStudentEmails = [];
          if (!c.enrolledStudentEmails.map((e) => e.toLowerCase().trim()).includes(emailToFilter)) {
            c.enrolledStudentEmails.push(emailToFilter);
            c.enrolledCount = c.enrolledStudentEmails.length;
            modified = true;
          }
          return true;
        }
      }
      return false;
    });

    if (modified) {
      setStorage(STORAGE_KEYS.COURSES, courses);
    }

    return enrolled;
  },

  getCourseById(courseId: string): CourseClass | undefined {
    const courses = this.getAllCourses();
    return courses.find((c) => c.id === courseId);
  },

  // Lecturer Action: Add Student Email to Course Roster
  addStudentEmailToCourse(courseId: string, studentEmailInput: string): {
    success: boolean;
    message: string;
    course?: CourseClass;
  } {
    const courses = this.getAllCourses();
    const cleanEmail = studentEmailInput.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Format email tidak valid.' };
    }

    const courseIndex = courses.findIndex((c) => c.id === courseId);
    if (courseIndex === -1) {
      return { success: false, message: 'Kelas tidak ditemukan.' };
    }

    const course = courses[courseIndex];
    const emails = course.enrolledStudentEmails ? [...course.enrolledStudentEmails] : [];

    if (emails.map((e) => e.toLowerCase()).includes(cleanEmail)) {
      return { success: false, message: 'Mahasiswa dengan email ini sudah terdaftar dalam kelas.' };
    }

    emails.push(cleanEmail);
    const updatedCourse = { ...course, enrolledStudentEmails: emails, enrolledCount: emails.length };
    courses[courseIndex] = updatedCourse;
    setStorage(STORAGE_KEYS.COURSES, courses);

    // Update masterStudents & customRoster so other lecturers & student view will see it immediately
    const masterStudents = this.getMasterStudents();
    const customRoster = getStorage<Record<string, any>>(STORAGE_KEYS.CUSTOM_ROSTER, {});
    const existingIdx = masterStudents.findIndex((m) => m.email.toLowerCase() === cleanEmail);
    const info = customRoster[cleanEmail] || getStudentRosterInfo(cleanEmail);
    const studentRecord: MasterStudent = {
      id: existingIdx >= 0 ? masterStudents[existingIdx].id : `std_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      nim: (existingIdx >= 0 && masterStudents[existingIdx].nim) ? masterStudents[existingIdx].nim : (info.nim || `22081010${Math.floor(100 + Math.random() * 900)}`),
      name: (existingIdx >= 0 && masterStudents[existingIdx].name) ? masterStudents[existingIdx].name : (info.name || 'Mahasiswa'),
      email: cleanEmail,
      major: 'Sains Informasi Geografi',
      classSection: course.section || 'Kelas A',
      enrolledCourseCodes: Array.from(new Set([
        ...((existingIdx >= 0 && masterStudents[existingIdx].enrolledCourseCodes) || []),
        course.code,
        course.id,
      ])),
      avatarUrl: getInitialsAvatar((existingIdx >= 0 && masterStudents[existingIdx].name) || info.name || 'Mahasiswa', false),
    };

    if (existingIdx >= 0) {
      masterStudents[existingIdx] = studentRecord;
    } else {
      masterStudents.push(studentRecord);
    }
    setStorage(STORAGE_KEYS.MASTER_STUDENTS, masterStudents);

    customRoster[cleanEmail] = {
      name: studentRecord.name,
      nim: studentRecord.nim,
      email: cleanEmail,
    };
    setStorage(STORAGE_KEYS.CUSTOM_ROSTER, customRoster);

    // Save to Supabase Cloud & trigger Google Sheets push
    supabaseDataService.saveStudent(studentRecord).catch(() => {});
    supabaseDataService.saveCourse(updatedCourse).catch(() => {});
    supabaseDataService.broadcastChange('student_updated', { student: studentRecord, course: updatedCourse });
    supabaseDataService.broadcastChange('course_updated', updatedCourse);
    myJourneySyncService.triggerDebouncedAutoSync();

    this.addActivity({
      title: 'Mahasiswa Ditambahkan ke Kelas',
      description: `Dosen mendaftarkan email ${cleanEmail} ke mata kuliah ${course.code} - ${course.title}.`,
      type: 'roster',
      courseTitle: course.title,
    });

    return {
      success: true,
      message: `Email ${cleanEmail} berhasil didaftarkan ke kelas ${course.title}. Mahasiswa kini dapat membuat akun & mengakses materi.`,
      course: updatedCourse,
    };
  },

  // Lecturer Action: Create New Course
  createCourse(data: {
    code: string;
    title: string;
    description: string;
    room: string;
    scheduleDay: string;
    scheduleTime: string;
    semester?: string;
    section?: string;
    credits?: number;
    invitedLecturerEmail?: string;
  }): CourseClass {
    const courses = this.getAllCourses();
    const currentLecturer = this.getCurrentUser() || defaultLecturerUser;
    const cleanCode = data.code.toUpperCase().trim();
    const cleanTitle = data.title.trim();
    const invitedEmail = data.invitedLecturerEmail?.trim().toLowerCase();

    // Hindari duplikasi jika kode matkul sudah ada
    const existingIdx = courses.findIndex(
      (c) => c.code.toUpperCase() === cleanCode
    );
    const newCourseId = existingIdx >= 0
      ? courses[existingIdx].id
      : `course_${cleanCode.replace(/[^A-Z0-9]/g, '_')}`;

    const newCourse: CourseClass = {
      id: newCourseId,
      code: cleanCode,
      title: cleanTitle,
      description: data.description.trim() || `Mata kuliah ${cleanTitle} semester ini diampu oleh tim dosen.`,
      teacher: {
        id: currentLecturer.id,
        name: currentLecturer.name,
        title: currentLecturer.title || 'Dosen Pengampu',
        email: currentLecturer.email,
        avatarUrl: currentLecturer.avatarUrl,
        department: currentLecturer.department || 'Sains Informasi Geografi',
      },
      semester: data.semester || 'Semester 5',
      section: data.section || 'Kelas A',
      credits: Number(data.credits) || 3,
      academicYear: '2026/2027 Ganjil',
      room: data.room || 'Lab Komputasi Spasial',
      scheduleTime: data.scheduleTime || '08:00 - 10:30 WIB',
      scheduleDay: data.scheduleDay || 'Senin',
      totalMeetings: 16,
      completedMeetings: 0,
      colorScheme: 'blue',
      enrolledStudentEmails: existingIdx >= 0 ? (courses[existingIdx].enrolledStudentEmails || []) : [],
    };

    if (invitedEmail) {
      const isMiftah = invitedEmail.includes('miftah');
      const partnerUser = DEFAULT_LECTURERS[invitedEmail] || this.getRegisteredLecturers().find((l) => l.email.toLowerCase() === invitedEmail) || (isMiftah ? DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'] : DEFAULT_LECTURERS['altaf.aziz16@gmail.com']);
      const partnerName = partnerUser?.name || (isMiftah ? 'Muhammad Miftahurrodlo, M.Sc.' : 'Tengku Abdillah Azis, S.Si');

      // Set status PENDING: Rekan dosen baru resmi menjadi secondaryTeacher setelah menerima undangan
      newCourse.pendingLecturerEmail = invitedEmail.toLowerCase();
      newCourse.pendingLecturerName = partnerName;
      newCourse.secondaryTeacher = undefined;
      newCourse.partnerLecturer = undefined;
      newCourse.teamTeachers = [newCourse.teacher];
    }

    // Auto generate 16 meetings for OBE matrix if new course
    const allMeetings = this.getMeetings();
    const existingMeetings = allMeetings.filter((m) => m.courseId === newCourseId);
    if (existingMeetings.length === 0) {
      const newMeetings: Meeting[] = Array.from({ length: 16 }, (_, i) => ({
        id: `mtg_${newCourseId}_${i + 1}`,
        courseId: newCourseId,
        meetingNumber: i + 1,
        title: `Pertemuan 0${i + 1}: ${i === 0 ? 'Kontrak Kuliah & Pengantar' : i === 7 ? 'Evaluasi Tengah Semester (UTS)' : i === 15 ? 'Presentasi Proyek Akhir (UAS)' : `Modul ${i + 1} Perkuliahan`}`,
        topic: `Pembahasan materi dan studi kasus perkuliahan pertemuan ke-${i + 1}.`,
        date: `2026-09-${String(Math.min(30, 1 + i * 7)).padStart(2, '0')}`,
        startTime: data.scheduleTime?.split('-')[0]?.trim() || '08:00',
        endTime: data.scheduleTime?.split('-')[1]?.trim() || '10:30',
        room: data.room || 'Lab Komputasi Spasial',
        isCompleted: false,
        materials: [],
        assignments: [],
      }));
      setStorage(STORAGE_KEYS.MEETINGS, [...allMeetings, ...newMeetings]);
    }

    if (existingIdx >= 0) {
      courses[existingIdx] = {
        ...courses[existingIdx],
        ...newCourse,
      };
      setStorage(STORAGE_KEYS.COURSES, courses);
    } else {
      setStorage(STORAGE_KEYS.COURSES, [...courses, newCourse]);
    }

    // Kirim undangan ke rekan dosen jika email diisi
    if (invitedEmail) {
      this.sendCourseInvitationNotification({
        courseId: newCourse.id,
        courseCode: newCourse.code,
        courseTitle: newCourse.title,
        inviterName: currentLecturer.name,
        inviterEmail: currentLecturer.email,
        invitedEmail: invitedEmail,
      });
    }

    // Kirim sinkronisasi ke Supabase Cloud & Broadcast ke rekan dosen secara instan (< 300ms)
    supabaseDataService.saveCourse(newCourse).catch(() => {});
    supabaseDataService.broadcastChange('course_updated', newCourse);
    myJourneySyncService.triggerDebouncedAutoSync();

    this.addActivity({
      title: 'Mata Kuliah Baru Dibuat',
      description: `${this.formatLecturerGreeting(currentLecturer.name)} menambahkan kelas baru ${newCourse.code} - ${newCourse.title}.${invitedEmail ? ` Mengundang rekan dosen (${invitedEmail}) untuk bertim.` : ''}`,
      type: 'course',
      courseTitle: newCourse.title,
    });

    return newCourse;
  },

  // Lecturer Action: Update Course Details
  updateCourse(courseId: string, updates: {
    code?: string;
    title?: string;
    section?: string;
    credits?: number;
    semester?: string;
    academicYear?: string;
    room?: string;
    scheduleDay?: string;
    scheduleTime?: string;
    description?: string;
  }): { success: boolean; message: string; course?: CourseClass } {
    const courses = this.getAllCourses();
    const idx = courses.findIndex((c) => c.id === courseId);
    if (idx === -1) {
      return { success: false, message: 'Mata kuliah tidak ditemukan.' };
    }

    const prev = courses[idx];
    const updated: CourseClass = {
      ...prev,
      code: updates.code ? updates.code.trim().toUpperCase() : prev.code,
      title: updates.title ? updates.title.trim() : prev.title,
      section: updates.section ? updates.section.trim() : (prev.section || 'Kelas A'),
      credits: updates.credits !== undefined ? Number(updates.credits) : (prev.credits || 3),
      semester: updates.semester ? updates.semester.trim() : prev.semester,
      academicYear: updates.academicYear ? updates.academicYear.trim() : prev.academicYear,
      room: updates.room !== undefined ? updates.room.trim() : prev.room,
      scheduleDay: updates.scheduleDay || prev.scheduleDay,
      scheduleTime: updates.scheduleTime || prev.scheduleTime,
      description: updates.description !== undefined ? updates.description.trim() : prev.description,
    };

    courses[idx] = updated;
    setStorage(STORAGE_KEYS.COURSES, courses);

    // Update meetings schedule if changed
    if (updates.scheduleDay || updates.scheduleTime || updates.room) {
      const meetings = this.getMeetings();
      const updatedMeetings = meetings.map((m) => {
        if (m.courseId === courseId) {
          return {
            ...m,
            room: updates.room || m.room,
            startTime: updates.scheduleTime ? updates.scheduleTime.split('-')[0]?.trim() || m.startTime : m.startTime,
            endTime: updates.scheduleTime ? updates.scheduleTime.split('-')[1]?.trim() || m.endTime : m.endTime,
          };
        }
        return m;
      });
      setStorage(STORAGE_KEYS.MEETINGS, updatedMeetings);
    }

    try {
      supabaseDataService.saveCourse(updated).catch(() => {});
      myJourneySyncService.triggerDebouncedAutoSync();
    } catch {}

    this.addActivity({
      title: 'Rincian Mata Kuliah Diperbarui',
      description: `Rincian data mata kuliah ${updated.code} - ${updated.title} berhasil diperbarui.`,
      type: 'course',
      courseTitle: updated.title,
    });

    return {
      success: true,
      message: 'Rincian mata kuliah berhasil diperbarui.',
      course: updated,
    };
  },

  // Lecturer Action: Switch or Choose Primary Lecturer
  setPrimaryLecturer(courseId: string, targetPrimaryEmail: string): {
    success: boolean;
    message: string;
    course?: CourseClass;
  } {
    const courses = this.getAllCourses();
    const idx = courses.findIndex((c) => c.id === courseId);
    if (idx === -1) {
      return { success: false, message: 'Kelas tidak ditemukan.' };
    }
    const course = courses[idx];
    const targetEmail = targetPrimaryEmail.toLowerCase().trim();
    const currentPrimary = (course.teacher?.email || '').toLowerCase().trim();

    if (currentPrimary === targetEmail) {
      return { success: true, message: 'Dosen yang dipilih sudah merupakan Dosen Utama.', course };
    }

    const isTargetAltaf = targetEmail.includes('altaf');
    const newPrimaryUser = DEFAULT_LECTURERS[targetEmail] || (isTargetAltaf ? DEFAULT_LECTURERS['altaf.aziz16@gmail.com'] : DEFAULT_LECTURERS['miftahurridlo.688@gmail.com']);
    const isOldAltaf = currentPrimary.includes('altaf');
    const newSecondaryUser = DEFAULT_LECTURERS[currentPrimary] || (isOldAltaf ? DEFAULT_LECTURERS['altaf.aziz16@gmail.com'] : DEFAULT_LECTURERS['miftahurridlo.688@gmail.com']);

    const newPrimaryTeacher: TeacherInfo = {
      id: newPrimaryUser.id,
      name: newPrimaryUser.name,
      title: 'Dosen Pengampu Utama',
      email: newPrimaryUser.email,
      avatarUrl: newPrimaryUser.avatarUrl,
      department: newPrimaryUser.department,
    };

    const newSecondaryTeacher: TeacherInfo = {
      id: newSecondaryUser.id,
      name: newSecondaryUser.name,
      title: 'Dosen Pengampu Partner',
      email: newSecondaryUser.email,
      avatarUrl: newSecondaryUser.avatarUrl,
      department: newSecondaryUser.department,
    };

    const updatedCourse: CourseClass = {
      ...course,
      teacher: newPrimaryTeacher,
      secondaryTeacher: course.secondaryTeacher ? newSecondaryTeacher : undefined,
      primaryLecturer: newPrimaryUser.name,
      partnerLecturer: course.partnerLecturer ? newSecondaryUser.name : undefined,
      teamTeachers: course.secondaryTeacher ? [newPrimaryTeacher, newSecondaryTeacher] : [newPrimaryTeacher],
    };

    courses[idx] = updatedCourse;
    setStorage(STORAGE_KEYS.COURSES, courses);

    supabaseDataService.saveCourse(updatedCourse).catch(() => {});
    supabaseDataService.broadcastChange('course_updated', updatedCourse);
    myJourneySyncService.triggerDebouncedAutoSync();

    this.addActivity({
      title: 'Perubahan Dosen Utama',
      description: `Dosen Utama untuk kelas ${course.code} - ${course.title} kini dialihkan ke ${newPrimaryUser.name}.`,
      type: 'course',
      courseTitle: course.title,
    });

    return {
      success: true,
      message: `Berhasil mengubah Dosen Utama menjadi ${newPrimaryUser.name}.`,
      course: updatedCourse,
    };
  },

  // Kirim notifikasi undangan tim mengajar ke email dosen mitra
  sendCourseInvitationNotification(data: {
    courseId: string;
    courseCode: string;
    courseTitle: string;
    inviterName: string;
    inviterEmail: string;
    invitedEmail: string;
  }): void {
    const notifications = getStorage<StudentNotification[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
    const inviterTitle = this.formatLecturerGreeting(data.inviterName);
    const newNotif: StudentNotification = {
      id: `notif_inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: 'Undangan Kolaborasi Mengajar',
      message: `${inviterTitle} (${data.inviterEmail}) mengundang Anda untuk bergabung mengampu mata kuliah ${data.courseCode} - ${data.courseTitle}.`,
      type: 'invitation',
      timestamp: 'Baru saja',
      isRead: false,
      recipientEmail: data.invitedEmail.toLowerCase(),
      linkTab: 'kelas',
      linkId: data.courseId,
      invitationData: {
        courseId: data.courseId,
        courseCode: data.courseCode,
        courseTitle: data.courseTitle,
        inviterName: data.inviterName,
        inviterEmail: data.inviterEmail,
        invitedEmail: data.invitedEmail.toLowerCase(),
        status: 'pending',
      },
    };
    setStorage(STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...notifications]);
  },

  // Undang rekan dosen ke kelas yang sudah ada
  inviteLecturerToCourse(courseId: string, targetEmail: string): { success: boolean; message: string } {
    const courses = this.getAllCourses();
    const courseIndex = courses.findIndex((c) => c.id === courseId);
    if (courseIndex === -1) {
      return { success: false, message: 'Kelas tidak ditemukan.' };
    }
    const course = courses[courseIndex];
    const currentLecturer = this.getCurrentUser() || defaultLecturerUser;
    const cleanEmail = targetEmail.trim().toLowerCase();

    if (cleanEmail === currentLecturer.email.toLowerCase()) {
      return { success: false, message: 'Anda tidak dapat mengundang akun sendiri.' };
    }

    const isMiftah = cleanEmail.includes('miftah');
    const partnerUser = DEFAULT_LECTURERS[cleanEmail] || this.getRegisteredLecturers().find((l) => l.email.toLowerCase() === cleanEmail) || (isMiftah ? DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'] : DEFAULT_LECTURERS['altaf.aziz16@gmail.com']);
    const partnerName = partnerUser?.name || (isMiftah ? 'Muhammad Miftahurrodlo, S.Pd., M.Sc' : 'Tengku Abdillah Azis, S.Pd');
    const partnerDept = partnerUser?.department || (isMiftah ? 'Pendidikan Geografi' : 'Sains Informasi Geografi');
    const partnerTitle = partnerUser?.title || (isMiftah ? 'Dosen Pengampu Utama' : 'Tenaga Teknis Survei & Pemetaan / Dosen Pengampu Partner');
    const partnerAvatar = partnerUser?.avatarUrl || (isMiftah ? getInitialsAvatar(partnerName, true) : '/tengku_avatar.png');

    const secondaryTeacherObj: TeacherInfo = {
      id: partnerUser?.id || (isMiftah ? 'dos_miftah' : 'dos_altaf'),
      name: partnerName,
      title: partnerTitle,
      email: cleanEmail,
      avatarUrl: partnerAvatar,
      department: partnerDept,
    };

    const updatedCourse: CourseClass = {
      ...course,
      pendingLecturerEmail: cleanEmail,
      pendingLecturerName: partnerName,
      secondaryTeacher: undefined,
      partnerLecturer: undefined,
      teamTeachers: [course.teacher],
    };
    courses[courseIndex] = updatedCourse;
    setStorage(STORAGE_KEYS.COURSES, courses);

    this.sendCourseInvitationNotification({
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      inviterName: currentLecturer.name,
      inviterEmail: currentLecturer.email,
      invitedEmail: cleanEmail,
    });

    supabaseDataService.saveCourse(updatedCourse).catch(() => {});
    supabaseDataService.broadcastChange('course_updated', updatedCourse);
    myJourneySyncService.triggerDebouncedAutoSync();

    this.addActivity({
      title: 'Undangan Tim Dosen Dikirim',
      description: `${this.formatLecturerGreeting(currentLecturer.name)} mengundang ${partnerName} (${cleanEmail}) untuk bergabung di kelas ${course.code} - ${course.title}.`,
      type: 'course',
      courseTitle: course.title,
    });

    return {
      success: true,
      message: `Undangan berhasil dikirim ke ${partnerName} (${cleanEmail}). Notifikasi konfirmasi telah diteruskan.`,
    };
  },

  // Terima undangan mengajar langsung dari courseId
  acceptCourseInvitation(courseId: string, lecturerEmail?: string): { success: boolean; message: string } {
    const currentLecturer = this.getCurrentUser() || defaultLecturerUser;
    const email = (lecturerEmail || currentLecturer.email).toLowerCase().trim();
    const isMiftah = email.includes('miftah');
    const partnerUser = DEFAULT_LECTURERS[email] || (isMiftah ? DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'] : DEFAULT_LECTURERS['altaf.aziz16@gmail.com']);
    const partnerName = partnerUser?.name || (isMiftah ? 'Muhammad Miftahurrodlo, M.Sc.' : 'Tengku Abdillah Azis, S.Si');
    const partnerAvatar = isMiftah ? '/miftah_avatar.png' : '/tengku_avatar.png';

    const courses = this.getAllCourses();
    const courseIndex = courses.findIndex((c) => c.id === courseId);
    if (courseIndex === -1) {
      return { success: false, message: 'Kelas tidak ditemukan.' };
    }

    const course = courses[courseIndex];
    const secondaryTeacherObj: TeacherInfo = {
      id: partnerUser?.id || (isMiftah ? 'dos_miftah' : 'dos_altaf'),
      name: partnerName,
      title: partnerUser?.title || (isMiftah ? 'Dosen Pengampu Utama' : 'Tenaga Teknis Survei & Pemetaan / Dosen Pengampu Partner'),
      email: email,
      avatarUrl: partnerAvatar,
      department: partnerUser?.department || (isMiftah ? 'Pendidikan Geografi' : 'Sains Informasi Geografi'),
    };

    const updatedCourse: CourseClass = {
      ...course,
      secondaryTeacher: secondaryTeacherObj,
      partnerLecturer: partnerName,
      pendingLecturerEmail: undefined,
      pendingLecturerName: undefined,
      teamTeachers: [course.teacher, secondaryTeacherObj],
    };

    courses[courseIndex] = updatedCourse;
    setStorage(STORAGE_KEYS.COURSES, courses);

    supabaseDataService.saveCourse(updatedCourse).catch(() => {});
    supabaseDataService.broadcastChange('course_updated', updatedCourse);
    myJourneySyncService.triggerDebouncedAutoSync();

    // Perbarui notifikasi terkait
    const notifications = getStorage<StudentNotification[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
    const updatedNotifs = notifications.map((n) => {
      if (n.type === 'invitation' && n.invitationData?.courseId === courseId) {
        return {
          ...n,
          isRead: true,
          invitationData: {
            ...n.invitationData,
            status: 'accepted' as const,
          },
        };
      }
      return n;
    });
    setStorage(STORAGE_KEYS.NOTIFICATIONS, updatedNotifs);

    this.addActivity({
      title: 'Undangan Kolaborasi Diterima',
      description: `${this.formatLecturerGreeting(partnerName)} telah resmi bergabung mengampu kelas ${course.code} - ${course.title} bersama ${this.formatLecturerGreeting(course.teacher?.name || course.primaryLecturer || 'Dosen Pengampu')}.`,
      type: 'course',
      courseTitle: course.title,
    });

    return {
      success: true,
      message: `Selamat! Anda telah resmi bergabung sebagai tim dosen kelas ${course.code} - ${course.title}.`,
    };
  },

  // Tolak undangan mengajar langsung dari courseId
  declineCourseInvitation(courseId: string, lecturerEmail?: string): { success: boolean; message: string } {
    const courses = this.getAllCourses();
    const courseIndex = courses.findIndex((c) => c.id === courseId);
    if (courseIndex !== -1) {
      const course = courses[courseIndex];
      const updatedCourse: CourseClass = {
        ...course,
        partnerLecturer: '-',
        secondaryTeacher: undefined,
        pendingLecturerEmail: undefined,
        pendingLecturerName: undefined,
      };
      courses[courseIndex] = updatedCourse;
      setStorage(STORAGE_KEYS.COURSES, courses);
      supabaseDataService.saveCourse(updatedCourse).catch(() => {});
      myJourneySyncService.triggerDebouncedAutoSync();
    }

    const notifications = getStorage<StudentNotification[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
    const updatedNotifs = notifications.map((n) => {
      if (n.type === 'invitation' && n.invitationData?.courseId === courseId) {
        return {
          ...n,
          isRead: true,
          invitationData: {
            ...n.invitationData,
            status: 'declined' as const,
          },
        };
      }
      return n;
    });
    setStorage(STORAGE_KEYS.NOTIFICATIONS, updatedNotifs);

    return {
      success: true,
      message: 'Undangan kolaborasi telah ditolak.',
    };
  },

  // Tanggapi undangan kolaborasi mengajar (Terima / Tolak)
  respondToCourseInvitation(notificationId: string, response: 'accepted' | 'declined'): { success: boolean; message: string } {
    const notifications = getStorage<StudentNotification[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
    const notif = notifications.find((n) => n.id === notificationId);
    let targetCourseId = notif?.invitationData?.courseId;
    let targetInvitedEmail = notif?.invitationData?.invitedEmail;

    if (!targetCourseId && notificationId.startsWith('notif_inv_')) {
      targetCourseId = notificationId.replace('notif_inv_', '');
    }

    if (!targetCourseId) {
      return { success: false, message: 'Notifikasi undangan tidak ditemukan.' };
    }

    const currentLecturer = this.getCurrentUser() || defaultLecturerUser;
    const effectiveEmail = targetInvitedEmail || currentLecturer.email;

    if (response === 'accepted') {
      return this.acceptCourseInvitation(targetCourseId, effectiveEmail);
    } else {
      return this.declineCourseInvitation(targetCourseId, effectiveEmail);
    }
  },

  // Ambil undangan pending untuk pengguna aktif
  getPendingInvitationsForUser(email?: string): StudentNotification[] {
    const user = this.getCurrentUser();
    const clean = (email || user?.email || '').toLowerCase().trim();
    if (!clean) return [];

    // Prioritas 1: Bangkitkan secara dinamis langsung dari mata kuliah yang memiliki status pending untuk user ini
    const courses = this.getAllCourses();
    const pendingCourses = courses.filter((c) => (c.pendingLecturerEmail || '').toLowerCase() === clean);

    return pendingCourses.map((c) => ({
      id: `notif_inv_${c.id}`,
      title: 'Undangan Kolaborasi Mengajar',
      message: `${this.formatLecturerGreeting(c.teacher?.name || c.primaryLecturer || 'Dosen Pengampu')} mengundang Anda bergabung mengampu mata kuliah ${c.code} - ${c.title}.`,
      type: 'invitation' as const,
      timestamp: 'Menunggu Persetujuan',
      isRead: false,
      recipientEmail: clean,
      linkTab: 'kelas',
      linkId: c.id,
      invitationData: {
        courseId: c.id,
        courseCode: c.code,
        courseTitle: c.title,
        inviterName: c.teacher?.name || c.primaryLecturer || 'Rekan Dosen',
        inviterEmail: c.teacher?.email || '',
        status: 'pending' as const,
        sentAt: new Date().toISOString(),
      },
    }));
  },

  // Reset total data pengajaran & mahasiswa ke titik 0 bersih
  resetAllPlatformData(): { success: boolean; message: string } {
    setStorage(STORAGE_KEYS.COURSES, []);
    setStorage(STORAGE_KEYS.MASTER_STUDENTS, []);
    setStorage(STORAGE_KEYS.MEETINGS, []);
    setStorage(STORAGE_KEYS.ASSIGNMENTS, []);
    setStorage(STORAGE_KEYS.SUBMISSIONS, []);
    setStorage(STORAGE_KEYS.ATTENDANCE_SESSIONS, []);
    setStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, []);
    setStorage(STORAGE_KEYS.GRADES, []);
    setStorage(STORAGE_KEYS.ANNOUNCEMENTS, []);
    setStorage(STORAGE_KEYS.NOTIFICATIONS, []);
    setStorage(STORAGE_KEYS.ACTIVITIES, []);
    setStorage(STORAGE_KEYS.CUSTOM_ROSTER, {});

    const defaultUsers = [
      DEFAULT_LECTURERS['altaf.aziz16@gmail.com'],
      DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'],
    ];
    setStorage(STORAGE_KEYS.REGISTERED_USERS, defaultUsers);

    try {
      myJourneySyncService.triggerDebouncedAutoSync();
    } catch {}

    return {
      success: true,
      message: 'Seluruh kelas, mahasiswa, tugas, materi, dan data dummy berhasil dikosongkan ke titik awal bersih.',
    };
  },

  // Lecturer Action: Delete Course (Sinkronisasi 2 Arah: Lokal, Supabase & Google Sheets)
  deleteCourse(courseId: string): void {
    // Catat ID yang dihapus agar tidak pernah ter-restore saat sync cloud berikutnya
    const deletedIds = getStorage<string[]>('slh_deleted_course_ids', []);
    if (!deletedIds.includes(courseId)) {
      setStorage('slh_deleted_course_ids', [...deletedIds, courseId]);
    }

    const courses = this.getAllCourses().filter((c) => c.id !== courseId);
    setStorage(STORAGE_KEYS.COURSES, courses);
    const meetings = this.getMeetings().filter((m) => m.courseId !== courseId);
    setStorage(STORAGE_KEYS.MEETINGS, meetings);

    // Kirim delete ke Supabase Cloud (My Journey Unified DB) & Broadcast ke seluruh browser
    supabaseDataService.deleteCourse(courseId).catch(() => {});
    supabaseDataService.broadcastChange('course_deleted', { courseId });

    // Kirim delete ke Google Sheets
    myJourneySyncService.deleteCourseFromGoogleSheets(courseId).catch(() => {});

    // Perbarui daftar teaching di Google Sheets
    myJourneySyncService.pushTeachingToGoogleSheets().catch(() => {});
  },

  /**
   * Menangani pembaruan course realtime instan dari browser rekan dosen (< 300ms)
   */
  applyRealtimeCourseUpdate(payload: any): void {
    if (!payload) return;
    if (payload.type === 'delete' && payload.courseId) {
      const deletedIds = getStorage<string[]>('slh_deleted_course_ids', []);
      if (!deletedIds.includes(payload.courseId)) {
        deletedIds.push(payload.courseId);
        setStorage('slh_deleted_course_ids', deletedIds);
      }
      const courses = this.getAllCourses().filter(
        (c) => c.id !== payload.courseId && c.code.toUpperCase() !== payload.courseId.toUpperCase()
      );
      setStorage(STORAGE_KEYS.COURSES, courses);
      return;
    }

    if (payload.id && payload.code) {
      const incoming = payload as CourseClass;
      const courses = this.getAllCourses();
      const codeKey = (incoming.code || '').trim().toUpperCase();
      const idKey = incoming.id;

      const idx = courses.findIndex(
        (c) => c.id === idKey || (c.code && c.code.toUpperCase() === codeKey)
      );

      if (idx >= 0) {
        courses[idx] = {
          ...courses[idx],
          ...incoming,
          enrolledStudentEmails: Array.from(new Set([
            ...(courses[idx].enrolledStudentEmails || []),
            ...(incoming.enrolledStudentEmails || []),
          ])),
        };
      } else {
        courses.push(incoming);
      }

      setStorage(STORAGE_KEYS.COURSES, courses);

      // Pastikan notifikasi undangan masuk secara instan jika ditujukan untuk currentUser
      const currentUser = this.getCurrentUser();
      const myEmail = (currentUser?.email || '').toLowerCase().trim();
      if (
        myEmail &&
        incoming.pendingLecturerEmail &&
        incoming.pendingLecturerEmail.toLowerCase().trim() === myEmail
      ) {
        this.sendCourseInvitationNotification({
          courseId: incoming.id,
          courseCode: incoming.code,
          courseTitle: incoming.title,
          inviterName: incoming.teacher?.name || 'Rekan Dosen',
          inviterEmail: incoming.teacher?.email || '',
          invitedEmail: myEmail,
        });
      }
    }
  },

  /**
   * Menangani pembaruan student realtime instan dari browser rekan dosen (< 300ms)
   */
  applyRealtimeStudentUpdate(payload: any): void {
    if (!payload) return;
    if (payload.student) {
      const masterStudents = this.getMasterStudents();
      const cleanEmail = (payload.student.email || '').toLowerCase().trim();
      const idx = masterStudents.findIndex((m) => m.email.toLowerCase() === cleanEmail);
      if (idx >= 0) {
        masterStudents[idx] = {
          ...masterStudents[idx],
          ...payload.student,
          enrolledCourseCodes: Array.from(new Set([
            ...(masterStudents[idx].enrolledCourseCodes || []),
            ...(payload.student.enrolledCourseCodes || []),
          ])),
        };
      } else {
        masterStudents.push(payload.student);
      }
      setStorage(STORAGE_KEYS.MASTER_STUDENTS, masterStudents);
    }
    if (payload.course) {
      this.applyRealtimeCourseUpdate(payload.course);
    }
  },

  // Lecturer Action: Register Student with Details and enroll to course
  registerStudentWithDetails(data: {
    name: string;
    nim: string;
    email: string;
    courseId: string;
  }): { success: boolean; message: string } {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.name.trim();
    const cleanNim = data.nim.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Format email tidak valid.' };
    }
    if (!cleanName) {
      return { success: false, message: 'Nama mahasiswa wajib diisi.' };
    }

    const customRoster = getStorage<Record<string, { name: string; nim: string; email: string }>>('slh_custom_roster', {});
    customRoster[cleanEmail] = {
      name: cleanName,
      nim: cleanNim || `22081010${Math.floor(100 + Math.random() * 900)}`,
      email: cleanEmail,
    };
    setStorage('slh_custom_roster', customRoster);

    return this.addStudentEmailToCourse(data.courseId, cleanEmail);
  },

  // Lecturer Action: Remove Student Email from Course Roster
  removeStudentEmailFromCourse(courseId: string, studentEmailInput: string): {
    success: boolean;
    message: string;
    course?: CourseClass;
  } {
    const courses = this.getAllCourses();
    const cleanEmail = studentEmailInput.trim().toLowerCase();
    const courseIndex = courses.findIndex((c) => c.id === courseId);

    if (courseIndex === -1) return { success: false, message: 'Kelas tidak ditemukan.' };

    const course = courses[courseIndex];
    const emails = (course.enrolledStudentEmails || []).filter(
      (e) => e.toLowerCase() !== cleanEmail
    );

    const updatedCourse = { ...course, enrolledStudentEmails: emails, enrolledCount: emails.length };
    courses[courseIndex] = updatedCourse;
    setStorage(STORAGE_KEYS.COURSES, courses);

    // Update master student database
    const masterStudents = this.getMasterStudents();
    const studentIdx = masterStudents.findIndex((s) => s.email.toLowerCase() === cleanEmail);
    if (studentIdx >= 0) {
      const remainingCodes = (masterStudents[studentIdx].enrolledCourseCodes || []).filter(
        (code) => code.toUpperCase() !== course.code.toUpperCase() && code !== course.id
      );
      masterStudents[studentIdx] = {
        ...masterStudents[studentIdx],
        enrolledCourseCodes: remainingCodes,
      };
      setStorage(STORAGE_KEYS.MASTER_STUDENTS, masterStudents);
      supabaseDataService.saveStudent(masterStudents[studentIdx]).catch(() => {});
    }

    supabaseDataService.saveCourse(updatedCourse).catch(() => {});
    supabaseDataService.broadcastChange('course_updated', updatedCourse);
    myJourneySyncService.triggerDebouncedAutoSync();

    return {
      success: true,
      message: `Mahasiswa ${cleanEmail} telah dihapus dari daftar kelas.`,
      course: updatedCourse,
    };
  },

  getAllPreRegisteredStudents(): Array<{
    email: string;
    name: string;
    nim: string;
    enrolledCourseCodes: string[];
    registeredAt?: string;
  }> {
    const courses = this.getAllCourses();
    const masterStudents = this.getMasterStudents();
    const customRoster = getStorage<Record<string, any>>(STORAGE_KEYS.CUSTOM_ROSTER, {});
    const studentsMap = new Map<string, { email: string; name: string; nim: string; enrolledCourseCodes: string[]; registeredAt?: string }>();

    // 1. Seed from Master Students database
    masterStudents.forEach((ms) => {
      const clean = ms.email.toLowerCase().trim();
      if (!clean) return;
      studentsMap.set(clean, {
        email: clean,
        name: ms.name,
        nim: ms.nim,
        enrolledCourseCodes: [...(ms.enrolledCourseCodes || [])],
      });
    });

    // 2. Augment from courses enrolledStudentEmails
    let coursesModified = false;
    courses.forEach((course) => {
      (course.enrolledStudentEmails || []).forEach((email) => {
        const clean = email.toLowerCase().trim();
        const info = customRoster[clean] || getStudentRosterInfo(clean);

        if (!studentsMap.has(clean)) {
          studentsMap.set(clean, {
            email: clean,
            name: info.name,
            nim: info.nim,
            enrolledCourseCodes: [course.code],
          });
        } else {
          const item = studentsMap.get(clean)!;
          if (!item.enrolledCourseCodes.includes(course.code)) {
            item.enrolledCourseCodes.push(course.code);
          }
        }
      });
    });

    // 3. Self-heal courses enrolledStudentEmails from studentsMap
    studentsMap.forEach((std) => {
      courses.forEach((course) => {
        if (std.enrolledCourseCodes.some((code) => code.toUpperCase() === course.code.toUpperCase() || code === course.id)) {
          if (!course.enrolledStudentEmails) course.enrolledStudentEmails = [];
          if (!course.enrolledStudentEmails.map((e) => e.toLowerCase().trim()).includes(std.email)) {
            course.enrolledStudentEmails.push(std.email);
            course.enrolledCount = course.enrolledStudentEmails.length;
            coursesModified = true;
          }
        }
      });
    });

    if (coursesModified) {
      setStorage(STORAGE_KEYS.COURSES, courses);
    }

    return Array.from(studentsMap.values());
  },

  // Meetings
  getMeetings(courseId?: string): Meeting[] {
    let meetings = getStorage<Meeting[]>(STORAGE_KEYS.MEETINGS, initialMeetings);
    if (meetings.length < initialMeetings.length) {
      meetings = initialMeetings;
      setStorage(STORAGE_KEYS.MEETINGS, meetings);
    }
    if (courseId) {
      return meetings.filter((m) => m.courseId === courseId && m.isPublished);
    }
    return meetings.filter((m) => m.isPublished);
  },

  getMeetingById(meetingId: string): Meeting | undefined {
    const meetings = this.getMeetings();
    return meetings.find((m) => m.id === meetingId);
  },

  toggleMeetingCompleted(meetingId: string): boolean {
    const meetings = getStorage<Meeting[]>(STORAGE_KEYS.MEETINGS, initialMeetings);
    let newState = false;
    const updated = meetings.map((m) => {
      if (m.id === meetingId) {
        newState = !m.isCompletedByStudent;
        return { ...m, isCompletedByStudent: newState };
      }
      return m;
    });
    setStorage(STORAGE_KEYS.MEETINGS, updated);
    return newState;
  },

  // Assignments
  getAssignments(courseId?: string): Assignment[] {
    const assignments = getStorage<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, initialAssignments);
    if (courseId) {
      return assignments.filter((a) => a.courseId === courseId && a.isPublished);
    }
    return assignments.filter((a) => a.isPublished);
  },

  getAssignmentById(id: string): Assignment | undefined {
    const all = this.getAssignments();
    return all.find((a) => a.id === id);
  },

  // Submissions
  getSubmissions(): AssignmentSubmission[] {
    return getStorage<AssignmentSubmission[]>(STORAGE_KEYS.SUBMISSIONS, initialSubmissions);
  },

  getSubmissionForAssignment(assignmentId: string): AssignmentSubmission | undefined {
    const submissions = this.getSubmissions();
    const user = this.getCurrentUser();
    if (!user) return undefined;
    return submissions.find((s) => s.assignmentId === assignmentId && s.studentEmail?.toLowerCase() === user.email.toLowerCase());
  },

  submitAssignment(payload: {
    assignmentId: string;
    fileName?: string;
    fileSizeBytes?: number;
    fileUrl?: string;
    driveFileId?: string;
    textResponse?: string;
  }): AssignmentSubmission {
    const submissions = this.getSubmissions();
    const user = this.getCurrentUser() || defaultStudentUser;
    const assignment = this.getAssignmentById(payload.assignmentId);

    const now = new Date();
    const isLate = assignment ? new Date(assignment.deadline).getTime() < now.getTime() : false;

    const existingIndex = submissions.findIndex(
      (s) => s.assignmentId === payload.assignmentId && s.studentEmail?.toLowerCase() === user.email.toLowerCase()
    );

    const newSubmission: AssignmentSubmission = {
      id: existingIndex >= 0 ? submissions[existingIndex].id : `sub_${Date.now()}`,
      assignmentId: payload.assignmentId,
      studentId: user.id,
      studentName: user.name,
      studentEmail: user.email,
      submittedAt: now.toISOString(),
      status: isLate ? 'terlambat' : 'sudah_dikumpulkan',
      fileName: payload.fileName || 'Jawaban_Tugas_Mahasiswa.pdf',
      fileSizeBytes: payload.fileSizeBytes || 1024 * 1024 * 2.5,
      fileUrl: payload.fileUrl || 'https://drive.google.com/file/d/sample/view',
      textResponse: payload.textResponse,
      isLate,
    };

    let updatedList: AssignmentSubmission[];
    if (existingIndex >= 0) {
      updatedList = [...submissions];
      updatedList[existingIndex] = newSubmission;
    } else {
      updatedList = [newSubmission, ...submissions];
    }
    setStorage(STORAGE_KEYS.SUBMISSIONS, updatedList);

    // Kirim sinkronisasi ke Supabase Cloud (My Journey Unified DB)
    supabaseDataService.saveSubmission(newSubmission).catch(() => {});

    if (assignment) {
      const course = this.getCourseById(assignment.courseId);
      this.addActivity({
        title: isLate ? 'Pengumpulan Tugas Terlambat' : 'Pengumpulan Tugas Berhasil',
        description: `Anda menyerahkan berkas "${newSubmission.fileName}" untuk ${assignment.title}.`,
        type: 'submission',
        courseTitle: course ? course.title : 'Perkuliahan',
      });
    }

    return newSubmission;
  },

  // Lecturer Action: Grade Submission
  gradeSubmission(submissionId: string, score: number, feedback: string): AssignmentSubmission {
    const submissions = this.getSubmissions();
    const idx = submissions.findIndex((s) => s.id === submissionId);
    if (idx === -1) throw new Error('Submission not found');

    const sub = submissions[idx];
    const updated: AssignmentSubmission = {
      ...sub,
      grade: score,
      feedback,
      status: 'sudah_dinilai',
      gradedAt: new Date().toISOString(),
    };

    submissions[idx] = updated;
    setStorage(STORAGE_KEYS.SUBMISSIONS, submissions);

    // Also update student grade item
    const grades = this.getGradeItems();
    const assignment = this.getAssignmentById(sub.assignmentId);
    if (assignment) {
      const existingGradeIdx = grades.findIndex((g) => g.assignmentId === assignment.id);
      if (existingGradeIdx >= 0) {
        grades[existingGradeIdx].score = score;
        grades[existingGradeIdx].isPublished = true;
        grades[existingGradeIdx].feedback = feedback;
        setStorage(STORAGE_KEYS.GRADES, grades);
      }
    }

    return updated;
  },

  // Attendance Sessions
  getAttendanceSessions(courseId?: string): AttendanceSession[] {
    const sessions = getStorage<AttendanceSession[]>(STORAGE_KEYS.ATTENDANCE_SESSIONS, initialAttendanceSessions);
    if (courseId) {
      return sessions.filter((s) => s.courseId === courseId && s.isOpen);
    }
    return sessions.filter((s) => s.isOpen);
  },

  // Lecturer Action: Open / Close Attendance QR Session for specific meeting
  toggleAttendanceSession(courseId: string, meetingId: string, isOpen: boolean): AttendanceSession {
    const sessions = getStorage<AttendanceSession[]>(STORAGE_KEYS.ATTENDANCE_SESSIONS, initialAttendanceSessions);
    const course = this.getCourseById(courseId);
    const meeting = this.getMeetingById(meetingId);
    const mNum = meeting?.meetingNumber || 1;

    // Set other sessions of this course to inactive if we are opening a new one
    if (isOpen) {
      sessions.forEach((s) => {
        if (s.courseId === courseId && s.meetingId !== meetingId) {
          s.isOpen = false;
        }
      });
    }

    const existingIdx = sessions.findIndex((s) => s.courseId === courseId && s.meetingId === meetingId);
    const defaultToken = `${course?.code || 'SLH'}-M${String(mNum).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const updatedSession: AttendanceSession = {
      id: existingIdx >= 0 ? sessions[existingIdx].id : `sess_${courseId}_${mNum}_${Date.now()}`,
      courseId,
      meetingId,
      meetingNumber: mNum,
      title: meeting ? meeting.title : `Presensi Pertemuan ${mNum}`,
      date: meeting?.date || new Date().toISOString().split('T')[0],
      startTime: meeting?.startTime || '08:00',
      endTime: meeting?.endTime || '10:30',
      isOpen,
      sessionToken: existingIdx >= 0 && sessions[existingIdx].sessionToken ? sessions[existingIdx].sessionToken : defaultToken,
      requiresGps: true,
      campusLatitude: -6.200000,
      campusLongitude: 106.816666,
      radiusMeters: 150,
      openedByLecturerEmail: this.getCurrentUser()?.email || 'miftahurridlo.688@gmail.com',
    };

    if (existingIdx >= 0) {
      sessions[existingIdx] = updatedSession;
    } else {
      sessions.push(updatedSession);
    }

    setStorage(STORAGE_KEYS.ATTENDANCE_SESSIONS, sessions);

    // Kirim sinkronisasi ke Supabase Cloud (My Journey Unified DB)
    supabaseDataService.saveAttendanceSession(updatedSession).catch(() => {});

    // Update meeting's sessionActive flag in meetings storage
    const meetings = this.getMeetings();
    const updatedMeetings = meetings.map((m) => {
      if (m.courseId === courseId) {
        return { ...m, sessionActive: m.id === meetingId ? isOpen : false };
      }
      return m;
    });
    setStorage(STORAGE_KEYS.MEETINGS, updatedMeetings);

    this.addActivity({
      title: isOpen ? `Sesi Presensi QR Dibuka: Pertemuan ${mNum}` : `Sesi Presensi QR Ditutup: Pertemuan ${mNum}`,
      description: isOpen
        ? `Dosen mengaktifkan presensi QR untuk ${meeting?.title || `Pertemuan ${mNum}`}. Token: ${updatedSession.sessionToken}.`
        : `Dosen menutup sesi presensi ${meeting?.title || `Pertemuan ${mNum}`}.`,
      type: 'attendance',
      courseTitle: course?.title,
    });

    return updatedSession;
  },

  // Real-time Meeting Attendance Summary & Roster for Lecturer
  getMeetingAttendanceRoster(courseId: string, meetingId: string): MeetingAttendanceRosterSummary {
    const course = this.getCourseById(courseId) || initialCourses[0];
    const meeting = this.getMeetingById(meetingId) || initialMeetings.find((m) => m.courseId === courseId) || initialMeetings[0];
    const enrolledEmails = course.enrolledStudentEmails || [];
    const allRecords = this.getAttendanceRecords(courseId);

    // Filter records for this meeting
    const meetingRecords = allRecords.filter(
      (r) => r.meetingId === meeting.id || r.meetingNumber === meeting.meetingNumber
    );

    const activeSessions = this.getAttendanceSessions(courseId);
    const activeSession = activeSessions.find((s) => s.meetingId === meeting.id);

    const items: MeetingAttendanceRosterItem[] = enrolledEmails.map((email) => {
      const studentInfo = getStudentRosterInfo(email);
      const record = meetingRecords.find(
        (r) => r.studentEmail?.toLowerCase() === email.toLowerCase()
      );

      if (record) {
        return {
          studentName: record.studentName || studentInfo.name,
          studentNim: record.studentNim || studentInfo.nim,
          studentEmail: email,
          status: record.status,
          timestamp: record.timestamp,
          method: record.method,
          recordId: record.id,
          notes: record.notes,
        };
      }

      return {
        studentName: studentInfo.name,
        studentNim: studentInfo.nim,
        studentEmail: email,
        status: 'belum_hadir',
      };
    });

    const presentCount = items.filter((i) => i.status === 'hadir').length;
    const excusedCount = items.filter((i) => i.status === 'izin' || i.status === 'sakit').length;
    const absentCount = items.filter((i) => i.status === 'alpa' || i.status === 'belum_hadir').length;
    const totalEnrolled = enrolledEmails.length;
    const attendanceRate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

    return {
      meeting,
      course,
      totalEnrolled,
      presentCount,
      excusedCount,
      absentCount,
      attendanceRate,
      items,
      activeSession,
    };
  },

  // Lecturer Manual Marking (Hadir, Izin, Sakit, Alpa) for a student in a meeting
  markAttendanceManual(
    courseId: string,
    meetingId: string,
    studentEmail: string,
    status: AttendanceStatus,
    notes?: string
  ): MeetingAttendanceRosterSummary {
    const records = this.getAttendanceRecords();
    const meeting = this.getMeetingById(meetingId);
    const studentInfo = getStudentRosterInfo(studentEmail);
    const now = new Date();
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB (Manual Dosen)`;

    const existingIdx = records.findIndex(
      (r) =>
        r.courseId === courseId &&
        (r.meetingId === meetingId || (meeting && r.meetingNumber === meeting.meetingNumber)) &&
        r.studentEmail?.toLowerCase() === studentEmail.toLowerCase()
    );

    if (existingIdx >= 0) {
      records[existingIdx] = {
        ...records[existingIdx],
        status,
        notes: notes || records[existingIdx].notes,
        method: 'manual_lecturer',
        timestamp: timeFormatted,
      };
    } else {
      const newRec: AttendanceRecord = {
        id: `rec_man_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sessionId: `sess_${meetingId}`,
        courseId,
        meetingId,
        studentId: `std_${studentInfo.nim}`,
        studentName: studentInfo.name,
        studentEmail,
        studentNim: studentInfo.nim,
        meetingNumber: meeting?.meetingNumber || 1,
        meetingTitle: meeting?.title || 'Pertemuan Perkuliahan',
        date: meeting?.date || new Date().toISOString().split('T')[0],
        timestamp: timeFormatted,
        status,
        method: 'manual_lecturer',
        locationVerified: true,
        notes,
      };
      records.unshift(newRec);
    }

    setStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, records);
    return this.getMeetingAttendanceRoster(courseId, meetingId);
  },

  // Update Course Total Meetings (e.g. 14, 16 meetings)
  updateCourseTotalMeetings(courseId: string, totalMeetings: number): CourseClass {
    const courses = this.getAllCourses();
    const idx = courses.findIndex((c) => c.id === courseId);
    if (idx >= 0) {
      courses[idx] = { ...courses[idx], totalMeetings };
      setStorage(STORAGE_KEYS.COURSES, courses);
      return courses[idx];
    }
    throw new Error('Course not found');
  },

  // Attendance Records
  getAttendanceRecords(courseId?: string): AttendanceRecord[] {
    const records = getStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE_RECORDS, initialAttendanceRecords);
    if (courseId) {
      return records.filter((r) => r.courseId === courseId);
    }
    return records;
  },

  recordAttendanceWithToken(
    tokenInput: string,
    options?: { simulatedLat?: number; simulatedLng?: number }
  ): { success: boolean; message: string; record?: AttendanceRecord } {
    const cleanToken = tokenInput.trim().toUpperCase();
    const sessions = this.getAttendanceSessions();

    const matchedSession = sessions.find((s) => s.sessionToken.toUpperCase() === cleanToken);
    if (!matchedSession) {
      return {
        success: false,
        message: 'Kode sesi presensi atau QR tidak valid / telah kedaluwarsa.',
      };
    }

    const user = this.getCurrentUser() || defaultStudentUser;
    const existingRecords = this.getAttendanceRecords(matchedSession.courseId);
    const alreadyAttended = existingRecords.some(
      (r) =>
        (r.sessionId === matchedSession.id || r.meetingId === matchedSession.meetingId || r.meetingNumber === matchedSession.meetingNumber) &&
        r.studentEmail?.toLowerCase() === user.email.toLowerCase()
    );
    if (alreadyAttended) {
      return {
        success: false,
        message: 'Anda sudah melakukan presensi untuk pertemuan ini sebelumnya.',
      };
    }

    const now = new Date();
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    const newRecord: AttendanceRecord = {
      id: `rec_${Date.now()}`,
      sessionId: matchedSession.id,
      courseId: matchedSession.courseId,
      meetingId: matchedSession.meetingId,
      studentId: user.id,
      studentName: user.name,
      studentEmail: user.email,
      studentNim: user.nim || '22081010045',
      meetingNumber: matchedSession.meetingNumber || 8,
      meetingTitle: matchedSession.title,
      date: matchedSession.date,
      timestamp: timeFormatted,
      status: 'hadir',
      method: 'qr_scan',
      locationVerified: matchedSession.requiresGps,
    };

    const allRecords = this.getAttendanceRecords();
    const updatedRecords = [newRecord, ...allRecords];
    setStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, updatedRecords);

    // Kirim sinkronisasi ke Supabase Cloud (My Journey Unified DB)
    supabaseDataService.saveAttendanceRecord(newRecord).catch(() => {});

    const course = this.getCourseById(matchedSession.courseId);
    this.addActivity({
      title: 'Presensi Kehadiran Berhasil',
      description: `Presensi berhasil dicatat pada ${timeFormatted} untuk ${matchedSession.title}.`,
      type: 'attendance',
      courseTitle: course ? course.title : 'Perkuliahan',
    });

    return {
      success: true,
      message: `Presensi berhasil diverifikasi! Status: Hadir Tepat Waktu (${timeFormatted}) pada ${matchedSession.title}.`,
      record: newRecord,
    };
  },

  // Grades
  getGradeItems(courseId?: string): GradeItem[] {
    const grades = getStorage<GradeItem[]>(STORAGE_KEYS.GRADES, initialGradeItems);
    if (courseId) {
      return grades.filter((g) => g.courseId === courseId);
    }
    return grades;
  },

  // Announcements
  getAnnouncements(courseId?: string): Announcement[] {
    const user = this.getCurrentUser();
    const enrolledCourses = this.getEnrolledCourses();
    const enrolledCourseIds = new Set(enrolledCourses.map((c) => c.id));

    const announcements = getStorage<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, initialAnnouncements);
    
    // Lecturer can see all announcements
    if (user?.role === 'dosen') {
      return courseId ? announcements.filter((a) => a.courseId === courseId) : announcements;
    }

    // Guest / unauthenticated sees all announcements
    if (!user) {
      return courseId ? announcements.filter((a) => a.courseId === courseId) : announcements;
    }

    // Students only see announcements for their enrolled classes or universal announcements
    const allowed = announcements.filter((a) => !a.courseId || enrolledCourseIds.has(a.courseId));
    return courseId ? allowed.filter((a) => a.courseId === courseId) : allowed;
  },

  postAnnouncement(data: { courseId: string; title: string; content: string }): Announcement {
    const announcements = getStorage<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, initialAnnouncements);
    const user = this.getCurrentUser() || defaultLecturerUser;
    const course = this.getCourseById(data.courseId);

    const newAnn: Announcement = {
      id: `ann_${Date.now()}`,
      courseId: data.courseId,
      courseTitle: course?.title,
      title: data.title,
      content: data.content,
      authorName: user.name,
      authorRole: 'Dosen Pengampu',
      authorEmail: user.email,
      date: new Date().toISOString(),
      isPinned: false,
      isRead: false,
    };

    setStorage(STORAGE_KEYS.ANNOUNCEMENTS, [newAnn, ...announcements]);
    return newAnn;
  },

  markAnnouncementAsRead(announcementId: string): void {
    const announcements = getStorage<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, initialAnnouncements);
    const updated = announcements.map((a) => (a.id === announcementId ? { ...a, isRead: true } : a));
    setStorage(STORAGE_KEYS.ANNOUNCEMENTS, updated);
  },

  markAllAnnouncementsAsRead(): void {
    const announcements = getStorage<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, initialAnnouncements);
    const updated = announcements.map((a) => ({ ...a, isRead: true }));
    setStorage(STORAGE_KEYS.ANNOUNCEMENTS, updated);
  },

  // Notifications
  getNotifications(filterEmail?: string): StudentNotification[] {
    const all = getStorage<StudentNotification[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
    const user = this.getCurrentUser();
    const targetEmail = (filterEmail || user?.email || '').toLowerCase().trim();
    if (!targetEmail) return all;

    const userNotifs = all.filter((n) => !n.recipientEmail || n.recipientEmail.toLowerCase() === targetEmail);

    // Auto-generate active notifications for pending course invitations!
    const courses = this.getAllCourses();
    const pendingInvitations = courses.filter(
      (c) => (c.pendingLecturerEmail || '').toLowerCase().trim() === targetEmail
    );

    const generatedInvNotifs: StudentNotification[] = pendingInvitations.map((c) => ({
      id: `notif_inv_${c.id}`,
      title: 'Undangan Kolaborasi Mengajar',
      message: `${c.teacher?.name || 'Rekan Dosen'} mengundang Anda menjadi Dosen Pengampu untuk mata kuliah ${c.code} - ${c.title}.`,
      timestamp: 'Menunggu Persetujuan',
      type: 'grade',
      isRead: false,
      recipientEmail: targetEmail,
      invitationData: {
        courseId: c.id,
        courseCode: c.code,
        courseTitle: c.title,
        inviterName: c.teacher?.name || 'Rekan Dosen',
        inviterEmail: c.teacher?.email || '',
        invitedEmail: targetEmail,
        status: 'pending',
      },
    }));

    const existingIds = new Set(userNotifs.map((n) => n.id));
    return [...generatedInvNotifs.filter((n) => !existingIds.has(n.id)), ...userNotifs];
  },

  markNotificationAsRead(id: string): void {
    const notifications = this.getNotifications();
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setStorage(STORAGE_KEYS.NOTIFICATIONS, updated);
  },

  markAllNotificationsAsRead(): void {
    const notifications = this.getNotifications();
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    setStorage(STORAGE_KEYS.NOTIFICATIONS, updated);
  },

  // Activities
  getActivities(): ActivityLog[] {
    return getStorage<ActivityLog[]>(STORAGE_KEYS.ACTIVITIES, initialActivities);
  },

  addActivity(activity: Omit<ActivityLog, 'id' | 'timestamp'>): void {
    const current = this.getActivities();
    const now = new Date();
    const formatted = `${now.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()]} ${now.getFullYear()} • ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    const newAct: ActivityLog = {
      id: `act_${Date.now()}`,
      timestamp: formatted,
      ...activity,
    };
    setStorage(STORAGE_KEYS.ACTIVITIES, [newAct, ...current.slice(0, 19)]);
  },

  // Integrasi & Sinkronisasi Teaching My Journey (Akun: miftahurridlo.688@gmail.com & altaf.aziz16@gmail.com)
  getMyJourneySyncStatus(): {
    connected: boolean;
    primaryLecturer: string;
    partnerLecturer: string;
    coursesCount: number;
    studentsCount: number;
    materialsCount: number;
    rpsCount: number;
    lastSynced: string;
  } {
    const courses = this.getAllCourses();
    const students = this.getAllPreRegisteredStudents();
    const meetings = this.getMeetings();
    let matCount = 0;
    meetings.forEach((m) => {
      matCount += (m.materials || []).length;
    });

    return {
      connected: true,
      primaryLecturer: 'miftahurridlo.688@gmail.com (Miftahur Ridlo, M.Kom.)',
      partnerLecturer: 'altaf.aziz16@gmail.com (Tengku Abdillah Aziz, S.Pd.)',
      coursesCount: courses.length,
      studentsCount: students.length,
      materialsCount: matCount,
      rpsCount: Object.keys(initialCourseRps).length,
      lastSynced: '27 Okt 2026 • Real-time Active',
    };
  },

  syncFromMyJourney(targetLecturerEmail = 'miftahurridlo.688@gmail.com'): {
    success: boolean;
    message: string;
    syncedCourses: number;
    syncedStudents: number;
  } {
    // Reset to pure My Journey state
    setStorage(STORAGE_KEYS.COURSES, initialCourses);
    setStorage(STORAGE_KEYS.MEETINGS, initialMeetings);
    setStorage(STORAGE_KEYS.ASSIGNMENTS, initialAssignments);
    setStorage(STORAGE_KEYS.SUBMISSIONS, initialSubmissions);
    setStorage(STORAGE_KEYS.ATTENDANCE_SESSIONS, initialAttendanceSessions);
    setStorage(STORAGE_KEYS.ATTENDANCE_RECORDS, initialAttendanceRecords);
    setStorage(STORAGE_KEYS.GRADES, initialGradeItems);
    setStorage(STORAGE_KEYS.ANNOUNCEMENTS, initialAnnouncements);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_ROSTER);

    this.addActivity({
      title: 'Sinkronisasi Data Teaching My Journey',
      description: `Data 3 kelas kuliah (GEO-301, IF-405, IF-208), 12 mahasiswa, dan 48 sesi pertemuan OBE berhasil ditarik dari akun My Journey (${targetLecturerEmail}).`,
      type: 'course',
      courseTitle: 'My Journey Sync Hub',
    });

    return {
      success: true,
      message: `Berhasil menarik data Teaching dari My Journey (Akun: ${targetLecturerEmail}). 3 kelas aktif & 12 mahasiswa terdaftar kini tersinkronisasi.`,
      syncedCourses: initialCourses.length,
      syncedStudents: Object.keys(KNOWN_STUDENT_ROSTER).length,
    };
  },

  resetDemoData(): void {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },
};

// =========================================================================
// SINKRONISASI OTOMATIS & REALTIME CLOUD LISTENER (BROWSER INITIALIZATION)
// =========================================================================
if (typeof window !== 'undefined') {
  setTimeout(() => {
    studentService.syncAllFromMyJourneyCloud().catch(() => {});
    supabaseDataService.setupRealtimeSubscription((table) => {
      if (table === 'students') {
        studentService.syncStudentsFromSupabase().catch(() => {});
      } else if (table === 'courses') {
        studentService.syncCoursesFromSupabase().catch(() => {});
      } else if (table === 'attendance_records') {
        studentService.syncAttendanceFromSupabase().catch(() => {});
      } else if (table === 'portal_users') {
        studentService.syncPortalUsersFromSupabase().catch(() => {});
      }
    });
  }, 250);
}
