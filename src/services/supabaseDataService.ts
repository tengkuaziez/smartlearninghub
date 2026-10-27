/**
 * Supabase Data Service — Smart Learning Hub & My Journey Unified Data Layer
 * 
 * Menghubungkan seluruh data perkuliahan Smart Learning Hub langsung ke Cloud Database Supabase
 * milik My Journey (Project: tukpkikqdavfkdqbvclx).
 * 
 * Dosen Utama User ID: d342423d-fce0-4b54-896f-4c4b27e70dc0 (Tengku Abdillah Azis)
 * Semua data kelas & mahasiswa otomatis terhubung 2 arah dengan My Journey!
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.ts';
import type {
  CourseClass,
  MasterStudent,
  AttendanceSession,
  AttendanceRecord,
  Assignment,
  AssignmentSubmission,
  RegisteredUser,
  Announcement,
} from '../types/index.ts';

// ID Dosen Pengampu Akun My Journey (pemilik database)
export const LECTURER_USER_ID = 'd342423d-fce0-4b54-896f-4c4b27e70dc0';

export const supabaseDataService = {
  // =========================================================================
  // 1. MATA KULIAH (COURSES) - Berbagi 2 Arah dengan My Journey
  // =========================================================================
  async fetchCourses(): Promise<CourseClass[] | null> {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[SupabaseDataService] fetchCourses error:', error.message);
        return null;
      }

      if (!data) return [];

      return data.map((row) => {
        const d = row.data || {};
        return {
          id: row.id,
          code: d.code || 'KULIAH',
          title: d.name || d.title || 'Mata Kuliah',
          room: d.room || 'Lab Komputasi',
          status: (d.status === 'Aktif' || d.status === 'active' ? 'active' : 'upcoming') as any,
          credits: d.credits || 2,
          section: d.section || 'Kelas A',
          schedule: d.schedule || 'Senin, 08:00 WIB',
          semester: d.semester || 'Ganjil 2026/2027',
          academicYear: d.academicYear || '2026/2027',
          description: d.description || '',
          category: d.category || 'Geografi & Komputasi',
          color: d.color || 'from-blue-600 to-indigo-700',
          syllabusOverview: d.syllabusOverview || 'Silabus perkuliahan.',
          enrolledCount: d.enrolledCount || 0,
          enrolledStudentEmails: d.enrolledStudentEmails || [],
          completedMeetingsCount: d.completedMeetingsCount || 0,
          totalMeetingsCount: d.totalMeetingsCount || 16,
          progress: d.progress || 0,
          primaryLecturer: d.primaryLecturer || 'Tengku Abdillah Azis',
          partnerLecturer: d.partnerLecturer || 'Muhammad Miftahurridlo',
          teacher: d.teacher || {
            name: d.primaryLecturer || 'Tengku Abdillah Azis',
            title: 'Dosen Pengampu',
            avatarUrl: '',
          },
        };
      });
    } catch (err: any) {
      console.warn('[SupabaseDataService] Exception in fetchCourses:', err.message);
      return null;
    }
  },

  async saveCourse(course: CourseClass): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !course.id) return false;
    try {
      const payload = {
        id: course.id,
        user_id: LECTURER_USER_ID,
        data: {
          id: course.id,
          code: course.code,
          name: course.title,
          room: course.room,
          status: course.status === 'active' ? 'Aktif' : 'Direncanakan',
          credits: course.credits,
          section: course.section,
          schedule: course.schedule,
          semester: course.semester,
          academicYear: course.academicYear,
          description: course.description,
          syllabusOverview: course.syllabusOverview,
          enrolledCount: (course.enrolledStudentEmails || []).length,
          enrolledStudentEmails: course.enrolledStudentEmails || [],
          primaryLecturer: course.primaryLecturer,
          partnerLecturer: course.partnerLecturer,
          color: course.color,
          category: course.category,
        },
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('courses').upsert(payload);
      if (error) {
        console.warn('[SupabaseDataService] saveCourse error:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('[SupabaseDataService] Exception in saveCourse:', err.message);
      return false;
    }
  },

  async deleteCourse(courseId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !courseId) return false;
    try {
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      return !error;
    } catch {
      return false;
    }
  },

  // =========================================================================
  // 2. BASIS DATA MAHASISWA (STUDENTS) - Berbagi 2 Arah dengan My Journey
  // =========================================================================
  async fetchStudents(): Promise<MasterStudent[] | null> {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[SupabaseDataService] fetchStudents error:', error.message);
        return null;
      }

      if (!data) return [];

      return data.map((row) => {
        const d = row.data || {};
        return {
          id: row.id,
          nim: d.nim || String(d.id || '').replace(/\D/g, '') || '10123000',
          name: d.name || 'Mahasiswa',
          email: (d.email || '').toLowerCase().trim(),
          major: d.major || 'Pendidikan Geografi',
          classSection: d.classSection || 'Kelas A',
          enrolledCourseCodes: d.enrolledCourseCodes || (d.courseCode ? [d.courseCode] : []),
          isRegistered: Boolean(d.isRegistered),
          registeredAt: d.registeredAt,
          avatarUrl: d.avatarUrl || '',
          phone: d.phone || '',
        };
      });
    } catch (err: any) {
      console.warn('[SupabaseDataService] Exception in fetchStudents:', err.message);
      return null;
    }
  },

  async saveStudent(student: MasterStudent): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !student.id) return false;
    try {
      const cleanEmail = student.email.trim().toLowerCase();
      const payload = {
        id: student.id,
        user_id: LECTURER_USER_ID,
        data: {
          id: student.id,
          nim: student.nim,
          name: student.name,
          email: cleanEmail,
          courseCode: student.enrolledCourseCodes?.[0] || '',
          courseName: '',
          classSection: student.classSection || 'Kelas A',
          academicYear: '2026/2027',
          attendancePercent: 100,
          enrolledCourseCodes: student.enrolledCourseCodes || [],
          major: student.major || 'Pendidikan Geografi',
          isRegistered: Boolean(student.isRegistered),
          registeredAt: student.registeredAt,
          avatarUrl: student.avatarUrl || '',
          phone: student.phone || '',
        },
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('students').upsert(payload);
      if (error) {
        console.warn('[SupabaseDataService] saveStudent error:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('[SupabaseDataService] Exception in saveStudent:', err.message);
      return false;
    }
  },

  async saveStudentsBulk(students: MasterStudent[]): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || students.length === 0) return false;
    try {
      const rows = students.map((student) => ({
        id: student.id,
        user_id: LECTURER_USER_ID,
        data: {
          id: student.id,
          nim: student.nim,
          name: student.name,
          email: student.email.trim().toLowerCase(),
          courseCode: student.enrolledCourseCodes?.[0] || '',
          classSection: student.classSection || 'Kelas A',
          academicYear: '2026/2027',
          attendancePercent: 100,
          enrolledCourseCodes: student.enrolledCourseCodes || [],
          major: student.major || 'Pendidikan Geografi',
          isRegistered: Boolean(student.isRegistered),
          avatarUrl: student.avatarUrl || '',
        },
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('students').upsert(rows);
      return !error;
    } catch {
      return false;
    }
  },

  async deleteStudent(studentId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !studentId) return false;
    try {
      const { error } = await supabase.from('students').delete().eq('id', studentId);
      return !error;
    } catch {
      return false;
    }
  },

  // =========================================================================
  // 3. PENGGUNA TERDAFTAR PORTAL (PORTAL USERS)
  // =========================================================================
  async fetchPortalUsers(): Promise<RegisteredUser[] | null> {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('portal_users')
        .select('*');

      if (error) {
        // Jika tabel belum dibuat, fallback gracefully
        return null;
      }

      if (!data) return [];

      return data.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as any,
        nim: u.nim,
        nidn: u.nidn,
        password: u.password_hash,
        department: u.department,
        phone: u.phone,
        avatarUrl: u.avatarUrl || u.avatar_url,
        registeredAt: u.created_at,
      }));
    } catch {
      return null;
    }
  },

  async savePortalUser(user: RegisteredUser): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !user.email) return false;
    try {
      const payload = {
        id: user.id,
        email: user.email.trim().toLowerCase(),
        name: user.name,
        role: user.role,
        nim: user.nim || null,
        nidn: user.nidn || null,
        password_hash: user.password || '',
        department: user.department || null,
        phone: user.phone || null,
        avatar_url: user.avatarUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('portal_users').upsert(payload, { onConflict: 'email' });
      return !error;
    } catch {
      return false;
    }
  },

  // =========================================================================
  // 4. PRESENSI KELAS (ATTENDANCE SESSIONS & RECORDS)
  // =========================================================================
  async fetchAttendanceSessions(courseId?: string): Promise<AttendanceSession[] | null> {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      let query = supabase.from('attendance_sessions').select('*');
      if (courseId) {
        query = query.eq('course_id', courseId);
      }
      const { data, error } = await query;
      if (error || !data) return null;

      return data.map((row) => ({
        id: row.id,
        courseId: row.course_id,
        meetingId: row.meeting_id,
        sessionTitle: row.session_title,
        sessionDate: row.session_date,
        qrToken: row.qr_token,
        passcode: row.passcode,
        isOpen: Boolean(row.is_open),
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      }));
    } catch {
      return null;
    }
  },

  async saveAttendanceSession(session: AttendanceSession): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !session.id) return false;
    try {
      const payload = {
        id: session.id,
        course_id: session.courseId,
        meeting_id: session.meetingId,
        session_title: session.sessionTitle,
        session_date: session.sessionDate,
        qr_token: session.qrToken,
        passcode: session.passcode,
        is_open: session.isOpen,
        expires_at: session.expiresAt,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('attendance_sessions').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  },

  async fetchAttendanceRecords(courseId?: string): Promise<AttendanceRecord[] | null> {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      let query = supabase.from('attendance_records').select('*');
      if (courseId) {
        query = query.eq('course_id', courseId);
      }
      const { data, error } = await query;
      if (error || !data) return null;

      return data.map((row) => ({
        id: row.id,
        courseId: row.course_id,
        meetingId: row.meeting_id,
        studentId: row.student_id,
        studentNim: row.student_nim,
        studentName: row.student_name,
        studentEmail: row.student_email,
        status: row.status as any,
        method: row.method as any,
        timestamp: row.timestamp,
        coordinates: row.coordinates,
        note: row.note,
      }));
    } catch {
      return null;
    }
  },

  async saveAttendanceRecord(record: AttendanceRecord): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !record.id) return false;
    try {
      const payload = {
        id: record.id,
        course_id: record.courseId,
        meeting_id: record.meetingId,
        student_id: record.studentId,
        student_nim: record.studentNim,
        student_name: record.studentName,
        student_email: record.studentEmail || '',
        status: record.status,
        method: record.method || 'QR_SCAN',
        timestamp: record.timestamp || new Date().toISOString(),
        coordinates: record.coordinates || null,
        note: record.note || null,
      };

      const { error } = await supabase.from('attendance_records').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  },

  // =========================================================================
  // 5. TUGAS & PENGUMPULAN (ASSIGNMENTS & SUBMISSIONS)
  // =========================================================================
  async fetchAssignments(courseId?: string): Promise<Assignment[] | null> {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      let query = supabase.from('assignments').select('*');
      if (courseId) {
        query = query.eq('course_id', courseId);
      }
      const { data, error } = await query;
      if (error || !data) return null;

      return data.map((row) => ({
        id: row.id,
        courseId: row.course_id,
        title: row.title,
        description: row.description,
        deadline: row.deadline,
        maxScore: row.max_score,
        attachments: row.attachments || [],
        createdAt: row.created_at,
        submissionCount: 0,
      }));
    } catch {
      return null;
    }
  },

  async saveAssignment(assignment: Assignment): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !assignment.id) return false;
    try {
      const payload = {
        id: assignment.id,
        course_id: assignment.courseId,
        title: assignment.title,
        description: assignment.description,
        deadline: assignment.deadline,
        max_score: assignment.maxScore || 100,
        attachments: assignment.attachments || [],
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('assignments').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  },

  async fetchSubmissions(courseId?: string): Promise<AssignmentSubmission[] | null> {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      let query = supabase.from('submissions').select('*');
      if (courseId) {
        query = query.eq('course_id', courseId);
      }
      const { data, error } = await query;
      if (error || !data) return null;

      return data.map((row) => ({
        id: row.id,
        assignmentId: row.assignment_id,
        courseId: row.course_id,
        studentId: row.student_id,
        studentNim: row.student_nim,
        studentName: row.student_name,
        studentEmail: row.student_email,
        fileUrl: row.file_url,
        fileName: row.file_name,
        submittedAt: row.submitted_at,
        score: row.score !== null ? Number(row.score) : undefined,
        feedback: row.feedback,
        status: (row.status || 'submitted') as any,
      }));
    } catch {
      return null;
    }
  },

  async saveSubmission(submission: AssignmentSubmission): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !submission.id) return false;
    try {
      const payload = {
        id: submission.id,
        assignment_id: submission.assignmentId,
        course_id: submission.courseId,
        student_id: submission.studentId,
        student_nim: submission.studentNim,
        student_name: submission.studentName,
        student_email: submission.studentEmail || '',
        file_url: submission.fileUrl || '',
        file_name: submission.fileName || '',
        submitted_at: submission.submittedAt || new Date().toISOString(),
        score: submission.score !== undefined ? submission.score : null,
        feedback: submission.feedback || null,
        status: submission.status || 'submitted',
      };

      const { error } = await supabase.from('submissions').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  },

  // =========================================================================
  // 6. REALTIME CLOUD LISTENER (Pemberitahuan Langsung)
  // =========================================================================
  setupRealtimeSubscription(onDataChange: (table: string) => void): { unsubscribe: () => void } | null {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const channel = supabase
        .channel('slh-unified-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'students' },
          () => onDataChange('students')
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'courses' },
          () => onDataChange('courses')
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attendance_records' },
          () => onDataChange('attendance_records')
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'portal_users' },
          () => onDataChange('portal_users')
        )
        .subscribe();

      return {
        unsubscribe: () => {
          supabase?.removeChannel(channel);
        },
      };
    } catch {
      return null;
    }
  },
};
