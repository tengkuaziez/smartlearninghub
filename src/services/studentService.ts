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

const STORAGE_KEYS = {
  CURRENT_USER: 'slh_current_user',
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
};

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

export const defaultStudentUser: AuthUser = {
  id: initialStudentProfile.id,
  name: initialStudentProfile.name,
  email: initialStudentProfile.email,
  role: 'mahasiswa',
  nim: initialStudentProfile.nim,
  avatarUrl: initialStudentProfile.avatarUrl,
  registeredAt: '2026-09-01',
};

export const defaultLecturerUser: AuthUser = mockLecturerUsers[0];

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
  // Current Authenticated User (Lecturer or Student)
  getCurrentUser(): AuthUser {
    return getStorage<AuthUser>(STORAGE_KEYS.CURRENT_USER, defaultStudentUser);
  },

  setCurrentUser(user: AuthUser): void {
    setStorage(STORAGE_KEYS.CURRENT_USER, user);
  },

  // Auth: Login with Email & Password
  login(email: string, password = ''): { success: boolean; user?: AuthUser; message: string } {
    const normalized = email.trim().toLowerCase();
    const courses = this.getAllCourses();

    const validation = validateEmailAccess(normalized, courses, LECTURER_WHITELIST_EMAILS);

    if (!validation.allowed) {
      return {
        success: false,
        message: validation.message || 'Email tidak terdaftar.',
      };
    }

    if (validation.role === 'dosen') {
      const lecturer = mockLecturerUsers.find((l) => l.email.toLowerCase() === normalized) || {
        id: `dos_${Date.now()}`,
        name: 'Dosen Pengampu',
        email: normalized,
        role: 'dosen' as const,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
        registeredAt: '2026-08-01',
      };
      this.setCurrentUser(lecturer);
      return {
        success: true,
        user: lecturer,
        message: `Selamat datang, ${lecturer.name}! Anda masuk ke Portal Tim Dosen.`,
      };
    }

    // Student Login
    const currentProfile = this.getProfile();
    const studentUser: AuthUser = {
      id: currentProfile.id,
      name: currentProfile.name,
      email: normalized,
      role: 'mahasiswa',
      nim: currentProfile.nim,
      avatarUrl: currentProfile.avatarUrl,
      registeredAt: '2026-09-01',
    };
    this.setCurrentUser(studentUser);
    return {
      success: true,
      user: studentUser,
      message: `Selamat datang kembali, ${studentUser.name}!`,
    };
  },

  // Auth: Registration (Enforces pre-registered email check)
  register(data: { name: string; email: string; nim?: string; password?: string }): {
    success: boolean;
    user?: AuthUser;
    message: string;
  } {
    const normalized = data.email.trim().toLowerCase();
    const courses = this.getAllCourses();

    const validation = validateEmailAccess(normalized, courses, LECTURER_WHITELIST_EMAILS);

    if (!validation.allowed) {
      return {
        success: false,
        message: 'Pendaftaran ditolak: Email Anda belum didaftarkan oleh Tim Dosen di kelas manapun. Hubungi dosen pengampu.',
      };
    }

    const newUser: AuthUser = {
      id: `usr_${Date.now()}`,
      name: data.name,
      email: normalized,
      role: validation.role,
      nim: data.nim || '22081010045',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
      registeredAt: new Date().toISOString(),
    };

    this.setCurrentUser(newUser);

    if (newUser.role === 'mahasiswa') {
      const currentProfile = this.getProfile();
      this.updateProfile({
        name: data.name,
        email: normalized,
        nim: data.nim || currentProfile.nim,
      });
    }

    return {
      success: true,
      user: newUser,
      message: `Akun berhasil dibuat! Anda terdaftar pada ${validation.matchedCourses.length} kelas kuliah.`,
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
    const emailToFilter = (studentEmail || this.getCurrentUser().email).toLowerCase();

    // If currentUser is dosen, return all courses managed by the 2 lecturers
    if (this.getCurrentUser().role === 'dosen') {
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
    const user = this.getCurrentUser();
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
      openedByLecturerEmail: this.getCurrentUser().email,
    };

    if (existingIdx >= 0) {
      sessions[existingIdx] = updatedSession;
    } else {
      sessions.push(updatedSession);
    }

    setStorage(STORAGE_KEYS.ATTENDANCE_SESSIONS, sessions);

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

    const user = this.getCurrentUser();
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
    const enrolledCourses = this.getEnrolledCourses();
    const enrolledCourseIds = new Set(enrolledCourses.map((c) => c.id));

    const announcements = getStorage<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, initialAnnouncements);
    
    // Lecturer can see all announcements
    if (this.getCurrentUser().role === 'dosen') {
      return courseId ? announcements.filter((a) => a.courseId === courseId) : announcements;
    }

    // Students only see announcements for their enrolled classes or universal announcements
    const allowed = announcements.filter((a) => !a.courseId || enrolledCourseIds.has(a.courseId));
    return courseId ? allowed.filter((a) => a.courseId === courseId) : allowed;
  },

  postAnnouncement(data: { courseId: string; title: string; content: string }): Announcement {
    const announcements = getStorage<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, initialAnnouncements);
    const user = this.getCurrentUser();
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

  resetDemoData(): void {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
