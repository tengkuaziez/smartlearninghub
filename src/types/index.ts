export type UserRole = 'dosen' | 'mahasiswa';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  nim?: string; // Mahasiswa only
  nidn?: string; // Dosen only
  title?: string; // Dosen title (e.g. "Dosen Pengampu Utama")
  department?: string;
  bio?: string;
  googleScholarUrl?: string;
  sintaUrl?: string;
  linkedinUrl?: string;
  registeredAt: string;
}

export type SubmissionStatus = 
  | 'belum_dikerjakan'
  | 'sudah_dikumpulkan'
  | 'terlambat'
  | 'perlu_revisi'
  | 'sudah_dinilai';

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpa';

export type MaterialType = 'pdf' | 'heyzine' | 'youtube' | 'slide' | 'document' | 'link';

export interface EnrolledStudent {
  id: string;
  name: string;
  nim: string;
  email: string;
  enrolledAt: string;
  status: 'aktif' | 'nonaktif';
  attendanceRate?: number;
}

export interface MasterStudent {
  id: string;
  nim: string;
  name: string;
  email: string;
  major?: string;
  classSection?: string;
  enrolledCourseCodes: string[];
  isRegistered?: boolean;
  registeredAt?: string;
  avatarUrl?: string;
  phone?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  nim: string;
  email: string;
  emailVerified: boolean;
  avatarUrl: string;
  major: string;
  faculty: string;
  semester: number;
  academicYear: string;
  phone: string;
  bio: string;
  portfolioUrl?: string;
  themePreference: 'light' | 'dark' | 'system';
  notificationsEnabled: {
    newAssignment: boolean;
    deadlineReminder: boolean;
    announcements: boolean;
    gradePublished: boolean;
  };
}

export interface TeacherInfo {
  id: string;
  name: string;
  title: string;
  email: string;
  avatarUrl: string;
  department: string;
}

export interface CourseCpmk {
  code: string; // e.g. 'CPMK-1', 'CPMK-2'
  description: string;
}

export interface CourseRps {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  curriculumYear: string;
  cpl: string[]; // Capaian Pembelajaran Lulusan yang dibebankan
  cpmk: CourseCpmk[]; // Capaian Pembelajaran Mata Kuliah
  shortDescription: string;
  studyMaterials: string[]; // Pokok Bahasan / Bahan Kajian
  learningMethods: string[]; // Metode Pembelajaran (PBL, Case Method, dll)
  assessmentComponents: {
    name: string;
    weightPercentage: number;
    description: string;
  }[];
  references: {
    primary: string[];
    supporting: string[];
  };
  softwareTools: string[];
  hardwareTools: string[];
  documentPdfUrl?: string;
  lastUpdated: string;
}

export interface CourseClass {
  id: string;
  code: string;
  title: string;
  description: string;
  teacher: TeacherInfo;
  secondaryTeacher?: TeacherInfo; // Dosen partner (tim berdua)
  semester: string;
  academicYear: string;
  room: string;
  scheduleTime: string;
  scheduleDay: string;
  totalMeetings: number;
  completedMeetings: number;
  colorScheme: string;
  syllabusUrl?: string;
  rps?: CourseRps; // Dokumen Rencana Pembelajaran Semester resmi
  enrolledStudentEmails: string[]; // Whitelist email mahasiswa yang didaftarkan dosen
}

export interface LearningMaterial {
  id: string;
  meetingId: string;
  courseId: string;
  title: string;
  description: string;
  type: MaterialType;
  fileUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  embedUrl?: string;
  externalUrl?: string;
  durationMinutes?: number;
  isPublished: boolean;
}

export interface Meeting {
  id: string;
  courseId: string;
  meetingNumber: number;
  title: string;
  topic: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  room: string;
  isOnline: boolean;
  meetingLink?: string;
  learningObjectives: string[];
  description: string;
  activities: string[];
  materials: LearningMaterial[];
  isCompletedByStudent?: boolean; // Personal tracking
  isPublished: boolean;
  sessionActive?: boolean; // Sesi QR Presensi sedang aktif
}

export interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  maxScore: number;
  achievedScore?: number;
}

export interface Assignment {
  id: string;
  courseId: string;
  meetingId?: string;
  title: string;
  instructions: string;
  deadline: string; // YYYY-MM-DD HH:mm
  allowedFormats: string[]; // e.g. ['.pdf', '.zip']
  maxFileSizeMb: number;
  allowTextResponse: boolean;
  allowResubmission: boolean;
  latePenaltyPolicy: string;
  attachments?: { name: string; url: string; size: string }[];
  rubric?: RubricCriterion[];
  isPublished: boolean;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  submittedAt: string;
  status: SubmissionStatus;
  fileName?: string;
  fileSizeBytes?: number;
  fileUrl?: string;
  textResponse?: string;
  grade?: number;
  maxGrade?: number;
  feedback?: string;
  gradedAt?: string;
  rubricScores?: { criterionId: string; score: number }[];
  isLate: boolean;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  meetingId: string;
  meetingNumber: number; // e.g. 1 s.d. 16
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  isOpen: boolean;
  sessionToken: string; // token validated against backend
  requiresGps: boolean;
  campusLatitude?: number;
  campusLongitude?: number;
  radiusMeters?: number;
  openedByLecturerEmail?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  courseId: string;
  meetingId?: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  studentNim?: string;
  meetingNumber: number;
  meetingTitle: string;
  date: string;
  timestamp: string;
  status: AttendanceStatus;
  method: 'qr_scan' | 'manual_code' | 'manual_lecturer';
  locationVerified?: boolean;
  notes?: string;
}

export interface GradeItem {
  id: string;
  courseId: string;
  studentId?: string;
  assignmentId?: string;
  title: string;
  category: 'Tugas' | 'Kuis' | 'UTS' | 'UAS' | 'Praktikum' | 'Proyek';
  score: number;
  maxScore: number;
  weightPercentage: number;
  isPublished: boolean;
  publishedAt?: string;
  feedback?: string;
  rubricScores?: RubricCriterion[];
}

export interface Announcement {
  id: string;
  courseId?: string;
  courseTitle?: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  authorEmail?: string;
  date: string;
  isPinned: boolean;
  isRead?: boolean;
  relatedMeetingId?: string;
  relatedAssignmentId?: string;
}

export interface StudentNotification {
  id: string;
  title: string;
  message: string;
  type: 'assignment' | 'grade' | 'meeting' | 'announcement' | 'attendance';
  timestamp: string;
  isRead: boolean;
  linkTab?: string;
  linkId?: string;
}

export interface ActivityLog {
  id: string;
  title: string;
  description: string;
  type: 'submission' | 'grade' | 'attendance' | 'material' | 'roster';
  timestamp: string;
  courseTitle: string;
  authorName?: string;
}
