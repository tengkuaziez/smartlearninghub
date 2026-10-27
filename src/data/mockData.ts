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
} from '../types/index.ts';

// Whitelist email 2 Dosen Pengampu Smart Learning Hub (sinkron dengan akun My Journey)
export const LECTURER_WHITELIST_EMAILS = [
  'miftahurridlo.688@gmail.com',
  'altaf.aziz16@gmail.com',
];

// Kosongan (0 data dummy) - User mendaftar akun sendiri
export const mockLecturerUsers: AuthUser[] = [];

// Profil Mahasiswa Awal Kosong
export const initialStudentProfile: StudentProfile = {
  id: '',
  name: '',
  nim: '',
  email: '',
  emailVerified: false,
  avatarUrl: 'https://ui-avatars.com/api/?name=Mahasiswa&background=2563eb&color=fff&size=256&bold=true',
  major: '',
  faculty: '',
  semester: 1,
  academicYear: '2026/2027',
  phone: '',
  bio: '',
  themePreference: 'light',
  notificationsEnabled: {
    newAssignment: true,
    deadlineReminder: true,
    announcements: true,
    gradePublished: true,
  },
};

export interface EnrolledStudentInfo {
  name: string;
  nim: string;
  email: string;
}

// Roster Mahasiswa Kosong (diisi melalui Tambah Mahasiswa atau Sinkronisasi Google Sheets)
export const KNOWN_STUDENT_ROSTER: Record<string, EnrolledStudentInfo> = {};

export function getStudentRosterInfo(email: string): EnrolledStudentInfo {
  const clean = email.toLowerCase().trim();
  if (KNOWN_STUDENT_ROSTER[clean]) return KNOWN_STUDENT_ROSTER[clean];

  const handle = clean.split('@')[0] || 'mahasiswa';
  const name = handle
    .split(/[._-]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

  return {
    name,
    nim: '10123000',
    email: clean,
  };
}

// RPS Kosong
export const initialCourseRps: Record<string, CourseRps> = {};

// Mata Kuliah Kosong (0 courses)
export const initialCourses: CourseClass[] = [];

// Pertemuan / Sesi Kelas Kosong (0 meetings)
export const initialMeetings: Meeting[] = [];

// Tugas Kuliah Kosong (0 assignments)
export const initialAssignments: Assignment[] = [];

// Pengumpulan Tugas Kosong (0 submissions)
export const initialSubmissions: AssignmentSubmission[] = [];

// Sesi Presensi QR Kosong (0 sessions)
export const initialAttendanceSessions: AttendanceSession[] = [];

// Rekap Kehadiran Kosong (0 records)
export const initialAttendanceRecords: AttendanceRecord[] = [];

// Rekap Nilai Kosong (0 grades)
export const initialGradeItems: GradeItem[] = [];

// Pengumuman Kosong (0 announcements)
export const initialAnnouncements: Announcement[] = [];

// Notifikasi Kosong (0 notifications)
export const initialNotifications: StudentNotification[] = [];

// Log Aktivitas Kosong (0 activities)
export const initialActivities: ActivityLog[] = [];
