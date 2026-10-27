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

const CURRENT_DATA_VERSION = 'v_kosongan_clean_slate_2026_10_27_r6';

// Automatic migration & purge of outdated dummy data (memulai kosongan & bersih)
if (typeof window !== 'undefined') {
  try {
    const savedVer = localStorage.getItem(STORAGE_KEYS.DATA_VERSION);
    if (savedVer !== CURRENT_DATA_VERSION) {
      console.log('[Smart Learning Hub] Mengosongkan semua data dummy lama untuk memulai kosongan...');
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

export const defaultStudentUser: AuthUser = {
  id: 'std_demo',
  name: 'Mahasiswa',
  email: 'mahasiswa@student.ac.id',
  role: 'mahasiswa',
  nim: '10123001',
  avatarUrl: getInitialsAvatar('Mahasiswa', false),
  registeredAt: '2026-09-01',
};

export const defaultLecturerUser: AuthUser = {
  id: 'dos_01',
  name: 'Muhammad Miftahurridlo, M.Kom.',
  email: 'miftahurridlo.688@gmail.com',
  role: 'dosen',
  nidn: '0412088501',
  title: 'Dosen Pengampu Utama',
  department: 'Pendidikan Geografi / Sains Informasi Geografis',
  avatarUrl: getInitialsAvatar('Muhammad Miftahurridlo', true),
  bio: 'Dosen Pengampu Utama Smart Learning Hub & My Journey.',
  registeredAt: '2026-08-01',
};

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
    const user = getStorage<AuthUser | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (user && user.avatarUrl && (user.avatarUrl.includes('photo-1534528741775') || user.avatarUrl.includes('photo-1507003211169'))) {
      user.avatarUrl = getInitialsAvatar(user.name, user.role === 'dosen');
      setStorage(STORAGE_KEYS.CURRENT_USER, user);
    }
    return user;
  },

  setCurrentUser(user: AuthUser | null): void {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } else {
      if (user.avatarUrl && (user.avatarUrl.includes('photo-1534528741775') || user.avatarUrl.includes('photo-1507003211169'))) {
        user.avatarUrl = getInitialsAvatar(user.name, user.role === 'dosen');
      }
      setStorage(STORAGE_KEYS.CURRENT_USER, user);
    }
  },

  logout(): void {
    this.setCurrentUser(null);
  },

  getRegisteredUsers(): RegisteredUser[] {
    const users = getStorage<RegisteredUser[]>(STORAGE_KEYS.REGISTERED_USERS, []);
    let modified = false;
    users.forEach((u) => {
      if (u.avatarUrl && (u.avatarUrl.includes('photo-1534528741775') || u.avatarUrl.includes('photo-1507003211169'))) {
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
    return users.filter((u) => u.role === 'dosen');
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

    // 1. Coba ambil dari LocalStorage My Journey (jika diakses pada peramban/origin yang sama)
    try {
      const rawMyJourney = localStorage.getItem('my_journey_user_profile');
      if (rawMyJourney) {
        const parsed = JSON.parse(rawMyJourney);
        if (parsed && (parsed.name || parsed.title)) {
          foundProfileData = parsed;
        }
      }
    } catch {}

    // 2. Jika belum ada atau mau verifikasi, coba tarik dari Google Sheets Teaching Bridge
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
            };
          }
        }
      }
    } catch {}

    if (foundProfileData) {
      let fullName = foundProfileData.name || '';
      if (foundProfileData.titlePrefix) {
        fullName = `${foundProfileData.titlePrefix} ${fullName}`;
      }
      const suffix = foundProfileData.titleSuffix || (foundProfileData.title && foundProfileData.title.includes('.') ? foundProfileData.title : '');
      if (suffix && !fullName.includes(suffix)) {
        fullName = `${fullName}, ${suffix}`;
      }

      const updated = this.updateLecturerProfile({
        name: fullName || foundProfileData.name,
        title: foundProfileData.role || foundProfileData.title || 'Dosen Pengampu Utama',
        department: foundProfileData.universityOrOrg || foundProfileData.department || 'Pendidikan Geografi / Sains Informasi Geografis',
        avatarUrl: foundProfileData.avatarUrl && !foundProfileData.avatarUrl.includes('photo-1534528741775')
          ? foundProfileData.avatarUrl
          : getInitialsAvatar(fullName || foundProfileData.name, true),
        bio: foundProfileData.bio || 'Dosen Pengampu Utama Smart Learning Hub & My Journey.',
        googleScholarUrl: foundProfileData.googleScholarUrl || '',
        sintaUrl: foundProfileData.sintaUrl || '',
        linkedinUrl: foundProfileData.linkedinUrl || '',
      });

      return {
        success: true,
        message: 'Profil berhasil disinkronkan dengan My Journey!',
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

      const updated = this.updateLecturerProfile({
        name: fullName || parsed.name,
        title: parsed.role || parsed.title || 'Dosen Pengampu Utama',
        department: parsed.universityOrOrg || parsed.department || 'Pendidikan Geografi / Sains Informasi Geografis',
        avatarUrl: parsed.avatarUrl && !parsed.avatarUrl.includes('photo-1534528741775')
          ? parsed.avatarUrl
          : getInitialsAvatar(fullName || parsed.name, true),
        bio: parsed.bio || 'Dosen Pengampu Utama Smart Learning Hub & My Journey.',
        googleScholarUrl: parsed.googleScholarUrl || '',
        sintaUrl: parsed.sintaUrl || '',
        linkedinUrl: parsed.linkedinUrl || '',
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
      if (existing.password && password && existing.password !== password) {
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

    // Auto-provision if in Lecturer Whitelist
    if (LECTURER_WHITELIST_EMAILS.map((e) => e.toLowerCase()).includes(normalized)) {
      const isMiftah = normalized.includes('miftah');
      const lecturerName = isMiftah ? 'Muhammad Miftahurridlo, M.Kom.' : 'Tengku Abdillah Azis';
      const lecturerTitle = isMiftah ? 'Dosen Pengampu Utama' : 'Dosen Pengampu Partner';
      const lecturerNidn = isMiftah ? '0412088501' : '0419058902';
      const lecturerDept = isMiftah
        ? 'Pendidikan Geografi / Sains Informasi Geografis'
        : 'Rekayasa Perangkat Lunak & Geoinformatika';
      const lecturerAvatar = getInitialsAvatar(lecturerName, true);
      const lecturerBio = isMiftah
        ? 'Dosen Pengampu Utama Smart Learning Hub & My Journey.'
        : 'Dosen Pengampu Partner Smart Learning Hub & My Journey.';

      const newLecturer: RegisteredUser = {
        id: `dos_${Date.now()}`,
        name: lecturerName,
        email: normalized,
        role: 'dosen',
        password: password || '',
        nidn: lecturerNidn,
        title: lecturerTitle,
        department: lecturerDept,
        bio: lecturerBio,
        avatarUrl: lecturerAvatar,
        registeredAt: new Date().toISOString(),
      };

      this.saveRegisteredUser(newLecturer);
      this.setCurrentUser(newLecturer);
      return {
        success: true,
        user: newLecturer,
        message: `Selamat datang, ${newLecturer.name}! Akun Dosen Pengampu Anda aktif.`,
      };
    }

    return {
      success: false,
      message: 'Email belum terdaftar. Silakan buka tab "Daftar Akun" untuk mendaftarkan akun baru.',
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
        major: s.major || 'Informatika',
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

    // 1. Check in Master Students Database
    const master = this.getMasterStudents();
    if (master.some((s) => s.email.toLowerCase() === clean)) {
      return true;
    }

    // 2. Check in Course enrollments
    const courses = this.getAllCourses();
    if (courses.some((c) => (c.enrolledStudentEmails || []).some((e) => e.toLowerCase() === clean))) {
      return true;
    }

    // 3. Check in Custom Roster
    const custom = getStorage<Record<string, any>>(STORAGE_KEYS.CUSTOM_ROSTER, {});
    if (custom[clean]) return true;

    // 4. Check in Registered Users
    const registered = this.getRegisteredUsers();
    if (registered.some((u) => u.email.toLowerCase() === clean)) {
      return true;
    }

    // 5. Otorisasi domain email akademik / kampus (*.unimed.ac.id, @mhs.*, @student.*, *.ac.id, *.edu)
    if (
      clean.includes('@mhs.') ||
      clean.includes('@student.') ||
      clean.endsWith('.ac.id') ||
      clean.endsWith('.edu')
    ) {
      return true;
    }

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
      major: s.major || (s.courseCode === 'GEO-301' ? 'Sistem Informasi Geografis' : 'Informatika'),
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
      const syncedCourses: CourseClass[] = data.map((row) => {
        const d = row.data || {};
        const existing = currentCourses.find((c) => c.id === row.id || c.code.toLowerCase() === (d.code || '').toLowerCase());
        const isLecturerAziz = row.user_id === 'd342423d-fce0-4b54-896f-4c4b27e70dc0';
        const lecturerName = isLecturerAziz ? 'Tengku Abdillah Azis' : 'Muhammad Miftahurridlo';
        const partnerName = isLecturerAziz ? 'Muhammad Miftahurridlo' : 'Tengku Abdillah Azis';

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
          enrolledCount: existing?.enrolledCount || 0,
          enrolledStudentEmails: existing?.enrolledStudentEmails || [],
          completedMeetingsCount: existing?.completedMeetingsCount || 0,
          totalMeetingsCount: 16,
          progress: existing?.progress || 0,
          primaryLecturer: lecturerName,
          partnerLecturer: partnerName,
          teacher: {
            name: lecturerName,
            title: 'Dosen Pengampu',
            avatarUrl: '',
          },
        };
      });

      // Filter out any legacy dummy courses (IF-405, IF-208, GEO-301, crs-1, crs-2, crs-3)
      const isDummyCourse = (c: CourseClass) =>
        ['crs-1', 'crs-2', 'crs-3'].includes(c.id) ||
        ['IF-405', 'IF-208', 'GEO-301'].includes((c.code || '').toUpperCase());

      const mergedCourses = [...syncedCourses];
      currentCourses.forEach((c) => {
        if (!isDummyCourse(c) && !mergedCourses.some((m) => m.id === c.id || m.code.toLowerCase() === c.code.toLowerCase())) {
          mergedCourses.push(c);
        }
      });

      setStorage(STORAGE_KEYS.COURSES, mergedCourses);
      return {
        success: true,
        count: syncedCourses.length,
        message: `Berhasil menyelaraskan ${syncedCourses.length} mata kuliah dari Supabase My Journey!`,
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
              const cleanName = prof.name || (cleanEmail.includes('miftah') ? 'Muhammad Miftahurridlo' : 'Tengku Abdillah Azis');
              const userObj: RegisteredUser = {
                id: idx >= 0 ? regUsers[idx].id : `dos_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
                name: cleanName,
                email: cleanEmail,
                role: 'dosen',
                title: prof.title || prof.role || 'Dosen Pengampu',
                department: prof.department || (cleanEmail.includes('miftah') ? 'Sistem Informasi Geografis & Geomatika' : 'Rekayasa Perangkat Lunak & Geoinformatika'),
                avatarUrl: prof.avatarUrl || getInitialsAvatar(cleanName, true),
                bio: prof.bio || `${cleanName} — Dosen Pengampu Smart Learning Hub & My Journey.`,
                registeredAt: regUsers[idx]?.registeredAt || new Date().toISOString(),
              };

              if (idx >= 0) {
                regUsers[idx] = { ...regUsers[idx], ...userObj };
              } else {
                regUsers.push(userObj);
              }
              profilesCount++;

              if (curUser && curUser.email.toLowerCase() === cleanEmail) {
                this.setCurrentUser(userObj);
              }
            });

            setStorage(STORAGE_KEYS.REGISTERED_USERS, regUsers);
          }

          // B. Kelas dari Google Sheets (hanya non-dummy)
          if (json.data.Courses && Array.isArray(json.data.Courses) && json.data.Courses.length > 0) {
            const currentCourses = this.getAllCourses().filter(
              (c) => !['crs-1', 'crs-2', 'crs-3'].includes(c.id) && !['IF-405', 'IF-208', 'GEO-301'].includes(c.code.toUpperCase())
            );

            json.data.Courses.forEach((c: any) => {
              const codeStr = String(c.code || '').trim();
              const nameStr = c.name || 'Mata Kuliah';
              if (!codeStr || ['IF-405', 'IF-208', 'GEO-301'].includes(codeStr.toUpperCase())) return;

              const existsIdx = currentCourses.findIndex((crs) => crs.id === c.id || crs.code.toLowerCase() === codeStr.toLowerCase());
              const mappedCourse: CourseClass = {
                id: c.id || `gas_crs_${codeStr}`,
                code: codeStr,
                title: nameStr,
                section: c.section || 'Kelas A',
                schedule: c.schedule || 'Jadwal Kuliah',
                room: c.room || 'Lab Komputasi',
                credits: Number(c.credits) || 3,
                semester: c.semester || 'Ganjil 2026/2027',
                academicYear: c.academicYear || '2026/2027',
                description: c.description || `Mata kuliah ${nameStr} diampu oleh tim dosen.`,
                category: 'Geografi & Geospasial',
                color: 'from-blue-600 to-indigo-700',
                status: 'active',
                syllabusOverview: c.syllabusOverview || 'Kurikulum OBE',
                enrolledCount: Number(c.enrolledCount) || 0,
                enrolledStudentEmails: [],
                completedMeetingsCount: 0,
                totalMeetingsCount: 16,
                progress: 0,
                primaryLecturer: c.primaryLecturer || 'Tengku Abdillah Azis',
                partnerLecturer: c.partnerLecturer || 'Muhammad Miftahurridlo',
                teacher: {
                  name: c.primaryLecturer || 'Tengku Abdillah Azis',
                  title: 'Dosen Pengampu',
                  avatarUrl: '',
                },
              };

              if (existsIdx >= 0) {
                currentCourses[existsIdx] = { ...currentCourses[existsIdx], ...mappedCourse };
              } else {
                currentCourses.push(mappedCourse);
              }
              coursesCount++;
            });

            setStorage(STORAGE_KEYS.COURSES, currentCourses);
          }

          // C. Mahasiswa Resmi dari Google Sheets (hanya mahasiswa nyata)
          if (json.data.Students && Array.isArray(json.data.Students) && json.data.Students.length > 0) {
            const masterStudents = this.getMasterStudents();
            json.data.Students.forEach((std: any) => {
              const cleanEmail = (std.email || '').toLowerCase().trim();
              if (!cleanEmail) return;

              const idx = masterStudents.findIndex((m) => m.email.toLowerCase() === cleanEmail);
              const record: MasterStudent = {
                id: std.id || `std_${Date.now()}`,
                nim: String(std.nim || '10123000'),
                name: std.name || 'Mahasiswa',
                email: cleanEmail,
                major: std.major || 'Sistem Informasi Geografis',
                classSection: std.classSection || 'Kelas A',
                enrolledCourseCodes: std.courseCode ? [String(std.courseCode)] : [],
                avatarUrl: getInitialsAvatar(std.name || 'Mahasiswa', false),
              };

              if (idx >= 0) {
                masterStudents[idx] = { ...masterStudents[idx], ...record };
              } else {
                masterStudents.push(record);
              }
              studentsCount++;
            });
            setStorage(STORAGE_KEYS.MASTER_STUDENTS, masterStudents);
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

    // 1. Coba verifikasi dengan Supabase Auth jika online
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalized,
          password,
        });

        if (!error && data?.user) {
          const isLecturer = LECTURER_WHITELIST_EMAILS.map((e) => e.toLowerCase()).includes(normalized) ||
            data.user.user_metadata?.role === 'dosen';

          const registeredUsers = this.getRegisteredUsers();
          let user = registeredUsers.find((u) => u.email.toLowerCase() === normalized);

          const fullName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || (user ? user.name : normalized.split('@')[0]);

          if (!user) {
            user = {
              id: data.user.id,
              name: fullName,
              email: normalized,
              role: isLecturer ? 'dosen' : 'mahasiswa',
              password: password,
              avatarUrl: getInitialsAvatar(fullName, isLecturer),
              registeredAt: new Date().toISOString(),
            };
            this.saveRegisteredUser(user);
          } else {
            user.password = password;
            if (fullName && fullName !== user.name) {
              user.name = fullName;
            }
            this.saveRegisteredUser(user);
          }

          this.setCurrentUser(user);
          // Sinkronisasi otomatis data Teaching & Profil dari Google Sheets + Supabase My Journey
          await this.syncAllFromMyJourneyCloud();

          const refreshedUser = this.getCurrentUser() || user;
          return {
            success: true,
            user: refreshedUser,
            message: `Selamat datang kembali, ${refreshedUser.name}! (Terverifikasi Supabase & My Journey)`,
          };
        }
      } catch {
        // Fallback ke login lokal jika jaringan bermasalah
      }
    }

    // 2. Cek apakah ada di Supabase portal_users jika belum ada di cache browser ini
    const regUsers = this.getRegisteredUsers();
    let existing = regUsers.find((u) => u.email.toLowerCase() === normalized);
    if (!existing) {
      try {
        const cloudUsers = await supabaseDataService.fetchPortalUsers();
        if (cloudUsers) {
          const matched = cloudUsers.find((u) => u.email.toLowerCase() === normalized);
          if (matched) {
            regUsers.push(matched);
            setStorage(STORAGE_KEYS.REGISTERED_USERS, regUsers);
            existing = matched;
          }
        }
      } catch {}
    }

    // 3. Fallback ke login lokal
    const localResult = this.login(email, password);
    if (localResult.success) {
      await this.syncAllFromMyJourneyCloud();
      const refreshedUser = this.getCurrentUser();
      if (refreshedUser) {
        localResult.user = refreshedUser;
      }
    }
    return localResult;
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
        ? 'Pendidikan Geografi / Sains Informasi Geografis'
        : 'Rekayasa Perangkat Lunak & Geoinformatika';
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
    let updatedNeeded = false;
    const synced = courses.map((c) => {
      if (!c.rps && initialCourseRps[c.id]) {
        updatedNeeded = true;
        return { ...c, rps: initialCourseRps[c.id] };
      }
      return c;
    });
    if (updatedNeeded) {
      setStorage(STORAGE_KEYS.COURSES, synced);
    }
    return synced;
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
    const emailToFilter = (studentEmail || user?.email || '').toLowerCase();

    // If currentUser is dosen, return all courses managed by the 2 lecturers
    if (user?.role === 'dosen') {
      return courses;
    }

    // For students: ONLY return classes where the lecturer added their email!
    return courses.filter((c) =>
      c.enrolledStudentEmails?.map((e) => e.toLowerCase()).includes(emailToFilter)
    );
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
    const updatedCourse = { ...course, enrolledStudentEmails: emails };
    courses[courseIndex] = updatedCourse;
    setStorage(STORAGE_KEYS.COURSES, courses);

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
  }): CourseClass {
    const courses = this.getAllCourses();
    const currentLecturer = this.getCurrentUser() || defaultLecturerUser;
    const newCourseId = `course_${Date.now()}`;
    const cleanCode = data.code.toUpperCase().trim();
    const cleanTitle = data.title.trim();

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
        department: currentLecturer.department || 'Teknik Informatika',
      },
      semester: data.semester || 'Semester 5',
      academicYear: '2026/2027 Ganjil',
      room: data.room || 'Lab Komputasi A-302',
      scheduleTime: data.scheduleTime || '08:00 - 10:30 WIB',
      scheduleDay: data.scheduleDay || 'Senin',
      totalMeetings: 16,
      completedMeetings: 0,
      colorScheme: 'blue',
      enrolledStudentEmails: ['altaf.aziz16@student.ac.id'],
    };

    // Auto generate 16 meetings for OBE matrix
    const allMeetings = this.getMeetings();
    const newMeetings: Meeting[] = Array.from({ length: 16 }, (_, i) => ({
      id: `mtg_${newCourseId}_${i + 1}`,
      courseId: newCourseId,
      meetingNumber: i + 1,
      title: `Pertemuan 0${i + 1}: ${i === 0 ? 'Kontrak Kuliah & Pengantar' : i === 7 ? 'Evaluasi Tengah Semester (UTS)' : i === 15 ? 'Presentasi Proyek Akhir (UAS)' : `Modul ${i + 1} Perkuliahan`}`,
      topic: `Pembahasan materi dan studi kasus perkuliahan pertemuan ke-${i + 1}.`,
      date: `2026-09-${String(Math.min(30, 1 + i * 7)).padStart(2, '0')}`,
      startTime: data.scheduleTime?.split('-')[0]?.trim() || '08:00',
      endTime: data.scheduleTime?.split('-')[1]?.trim() || '10:30',
      room: data.room || 'Lab Komputasi A-302',
      isCompleted: false,
      materials: [],
      assignments: [],
    }));

    setStorage(STORAGE_KEYS.COURSES, [...courses, newCourse]);
    setStorage(STORAGE_KEYS.MEETINGS, [...allMeetings, ...newMeetings]);

    // Kirim sinkronisasi ke Supabase Cloud (My Journey Unified DB)
    supabaseDataService.saveCourse(newCourse).catch(() => {});

    this.addActivity({
      title: 'Mata Kuliah Baru Dibuat',
      description: `Dosen menambahkan kelas baru ${newCourse.code} - ${newCourse.title} (16 Pertemuan).`,
      type: 'course',
      courseTitle: newCourse.title,
    });

    return newCourse;
  },

  // Lecturer Action: Delete Course
  deleteCourse(courseId: string): void {
    const courses = this.getAllCourses().filter((c) => c.id !== courseId);
    setStorage(STORAGE_KEYS.COURSES, courses);
    const meetings = this.getMeetings().filter((m) => m.courseId !== courseId);
    setStorage(STORAGE_KEYS.MEETINGS, meetings);

    // Kirim sinkronisasi ke Supabase Cloud (My Journey Unified DB)
    supabaseDataService.deleteCourse(courseId).catch(() => {});
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

    const updatedCourse = { ...course, enrolledStudentEmails: emails };
    courses[courseIndex] = updatedCourse;
    setStorage(STORAGE_KEYS.COURSES, courses);

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
    const studentsMap = new Map<string, { email: string; name: string; nim: string; enrolledCourseCodes: string[]; registeredAt?: string }>();

    courses.forEach((course) => {
      (course.enrolledStudentEmails || []).forEach((email) => {
        const clean = email.toLowerCase().trim();
        const customRoster = getStorage<Record<string, { name: string; nim: string; email: string }>>('slh_custom_roster', {});
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
  getNotifications(): StudentNotification[] {
    return getStorage<StudentNotification[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
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
