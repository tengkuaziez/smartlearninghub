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
export const ALTAF_USER_ID = 'a9e68483-f4fb-4acf-9138-e70470b28833';

// Blacklist ID dan Email Data Dummy Akun Mahasiswa
export const DUMMY_STUDENT_IDS = new Set([
  'std_10123000',
  'std_2208101001',
  'std_10999999',
  'std_3222431014',
  'std_10123099',
  'std_3222431013',
  'std_1234567',
  'std_demo',
]);

export const DUMMY_STUDENT_EMAILS = new Set([
  'clean.badge.test@student.ac.id',
  'budi.santoso@student.ac.id',
  'mahasiswa.test.del@student.ac.id',
  'citra.permata@student.ac.id',
  'altaf.aziz16@student.ac.id',
  'altaf.aziz.student@gmail.com',
  'mahasiswa@student.ac.id',
]);

export function isDummyStudent(email?: string, id?: string): boolean {
  if (id && DUMMY_STUDENT_IDS.has(id)) return true;
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  if (DUMMY_STUDENT_EMAILS.has(clean)) return true;
  return false;
}

export const supabaseDataService = {
  /**
   * Mendapatkan ID user Supabase yang sedang login secara dinamis
   */
  async getActiveAuthUserId(): Promise<string | null> {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) return data.user.id;
    } catch {}
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('slh_current_user');
        if (raw) {
          const u = JSON.parse(raw);
          if (u?.id && u.id.length > 20 && !u.id.startsWith('dos_')) {
            return u.id;
          }
          const email = (u?.email || '').toLowerCase().trim();
          if (email.includes('altaf') || email.includes('azis') || email.includes('aziz')) {
            return ALTAF_USER_ID;
          }
          if (email.includes('miftah')) {
            return LECTURER_USER_ID;
          }
        }
      }
    } catch {}
    return null;
  },

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
        const cleanEmails = (d.enrolledStudentEmails || []).filter(
          (e: string) => typeof e === 'string' && !DUMMY_STUDENT_EMAILS.has(e.toLowerCase().trim())
        );
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
          enrolledCount: cleanEmails.length,
          enrolledStudentEmails: cleanEmails,
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
          assignments: Array.isArray(d.assignments) ? d.assignments : [],
          meetings: Array.isArray(d.meetings) ? d.meetings : [],
          rps: d.rps || undefined,
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
      let activeUserId = await this.getActiveAuthUserId();
      if (!activeUserId) {
        const primaryStr = (course.teacher?.email || course.primaryLecturer || '').toLowerCase();
        activeUserId = (primaryStr.includes('altaf') || primaryStr.includes('azis') || primaryStr.includes('aziz'))
          ? ALTAF_USER_ID
          : LECTURER_USER_ID;
      }

      // Collect assignments, meetings, rps, and submissions for this course
      let courseAssignments: any[] = course.assignments || [];
      if (courseAssignments.length === 0 && typeof localStorage !== 'undefined') {
        try {
          const localAsgs = JSON.parse(localStorage.getItem('slh_assignments') || '[]');
          courseAssignments = localAsgs.filter(
            (a: any) => a.courseId === course.id || (course.code && String(a.courseId || '').toUpperCase().includes(course.code.toUpperCase()))
          );
        } catch {}
      }

      let courseMeetings: any[] = course.meetings || [];
      if (courseMeetings.length === 0 && typeof localStorage !== 'undefined') {
        try {
          const localMeets = JSON.parse(localStorage.getItem('slh_meetings') || '[]');
          courseMeetings = localMeets.filter(
            (m: any) => m.courseId === course.id || (course.code && String(m.courseId || '').toUpperCase().includes(course.code.toUpperCase()))
          );
        } catch {}
      }

      let courseRps = course.rps || null;
      if (!courseRps && typeof localStorage !== 'undefined') {
        try {
          courseRps = JSON.parse(localStorage.getItem(`slh_rps_${course.id}`) || 'null');
        } catch {}
      }

      let courseSubmissions: any[] = [];
      if (typeof localStorage !== 'undefined') {
        try {
          const localSubs = JSON.parse(localStorage.getItem('slh_submissions') || '[]');
          courseSubmissions = localSubs.filter((s: any) =>
            courseAssignments.some((a: any) => a.id === s.assignmentId)
          );
        } catch {}
      }

      let courseAnnouncements: any[] = course.announcements || [];
      if (courseAnnouncements.length === 0 && typeof localStorage !== 'undefined') {
        try {
          const localAnns = JSON.parse(localStorage.getItem('slh_announcements') || '[]');
          courseAnnouncements = localAnns.filter(
            (a: any) => a.courseId === course.id || (course.code && String(a.courseId || '').toUpperCase().includes(course.code.toUpperCase()))
          );
        } catch {}
      }

      const payload = {
        id: course.id,
        user_id: activeUserId,
        data: {
          id: course.id,
          code: course.code,
          name: course.title,
          room: course.room || 'Lab Komputasi Spasial Lt. 3',
          status: 'Aktif',
          credits: course.credits || 3,
          section: course.section || 'Kelas A',
          schedule: `${course.scheduleDay || 'Senin'}, ${course.scheduleTime || '08:00 - 10:30 WIB'}`,
          semester: course.semester || 'Semester 3',
          academicYear: course.academicYear || '2026/2027 Ganjil',
          description: course.description || '',
          syllabusOverview: course.syllabusOverview || `${course.totalMeetings || 16} pertemuan kurikulum OBE`,
          enrolledCount: (course.enrolledStudentEmails || []).length,
          enrolledStudentEmails: course.enrolledStudentEmails || [],
          primaryLecturer: course.teacher?.name || course.primaryLecturer || 'Tengku Abdillah Azis, S.Si',
          primaryLecturerEmail: course.teacher?.email || '',
          partnerLecturer: course.pendingLecturerEmail
            ? `PENDING:${course.pendingLecturerEmail}`
            : (course.secondaryTeacher?.name || course.partnerLecturer || ''),
          partnerLecturerEmail: course.secondaryTeacher?.email || '',
          pendingLecturerEmail: course.pendingLecturerEmail || null,
          pendingLecturerName: course.pendingLecturerName || null,
          deletionRequest: course.deletionRequest || null,
          color: course.color || 'blue',
          category: course.category || 'Geografi & Komputasi',
          assignments: courseAssignments,
          meetings: courseMeetings,
          rps: courseRps || null,
          submissions: courseSubmissions,
          announcements: courseAnnouncements,
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

  async deleteCourse(courseId: string, courseCode?: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !courseId) return false;
    try {
      // 1. Hard delete by id
      await supabase.from('courses').delete().eq('id', courseId);
      // 2. Hard delete by courseCode if provided
      if (courseCode) {
        await supabase.from('courses').delete().filter('data->>code', 'ilike', courseCode);
      }
      // 3. Fallback: in case RLS blocks deleting another user's row, soft-delete via update
      await supabase.from('courses').update({
        data: { id: courseId, code: courseCode || '', status: 'deleted', isDeleted: true },
        updated_at: new Date().toISOString(),
      }).eq('id', courseId);
      if (courseCode) {
        await supabase.from('courses').update({
          data: { id: courseId, code: courseCode, status: 'deleted', isDeleted: true },
          updated_at: new Date().toISOString(),
        }).filter('data->>code', 'ilike', courseCode);
      }
      return true;
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

      return data
        .filter((row) => {
          const d = row.data || {};
          const email = (d.email || '').toLowerCase().trim();
          if (DUMMY_STUDENT_IDS.has(row.id) || (d.id && DUMMY_STUDENT_IDS.has(d.id))) return false;
          if (DUMMY_STUDENT_EMAILS.has(email)) return false;
          if (d.status === 'deleted' || d.isDeleted) return false;
          return true;
        })
        .map((row) => {
        const d = row.data || {};
        const rawCodes = d.enrolledCourseCodes || (d.courseCode ? [d.courseCode] : []);
        const cleanCodes = (Array.isArray(rawCodes) ? rawCodes : [rawCodes])
          .filter((c: any) => typeof c === 'string' && !c.startsWith('course_') && !c.startsWith('crs_'));

        return {
          id: row.id,
          nim: d.nim || String(d.id || '').replace(/\D/g, '') || '10123000',
          name: d.name || 'Mahasiswa',
          email: (d.email || '').toLowerCase().trim(),
          major: d.major || 'Pendidikan Geografi',
          classSection: d.classSection || 'Kelas A',
          enrolledCourseCodes: cleanCodes,
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
      const activeUserId = (await this.getActiveAuthUserId()) || LECTURER_USER_ID;
      const cleanEmail = student.email.trim().toLowerCase();
      const cleanCodes = (student.enrolledCourseCodes || []).filter(
        (c) => typeof c === 'string' && !c.startsWith('course_') && !c.startsWith('crs_')
      );
      const payload = {
        id: student.id,
        user_id: activeUserId,
        data: {
          id: student.id,
          nim: student.nim,
          name: student.name,
          email: cleanEmail,
          courseCode: cleanCodes[0] || '',
          courseName: '',
          classSection: student.classSection || 'Kelas A',
          academicYear: '2026/2027',
          attendancePercent: 100,
          enrolledCourseCodes: cleanCodes,
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
      const activeUserId = (await this.getActiveAuthUserId()) || LECTURER_USER_ID;
      const rows = students.map((student) => ({
        id: student.id,
        user_id: activeUserId,
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

  /**
   * Menghapus seluruh data dummy akun mahasiswa secara permanen dari Cloud Database Supabase
   * Menghapus baris dummy di tabel students dan membersihkan enrolledStudentEmails di tabel courses
   */
  async purgeDummyStudentsFromCloud(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const dummyIdList = Array.from(DUMMY_STUDENT_IDS);
      // Hard delete from students table
      await supabase.from('students').delete().in('id', dummyIdList);

      // Clean enrolled dummy student emails in courses table
      const { data: courses } = await supabase.from('courses').select('id, user_id, data');
      if (courses && courses.length > 0) {
        for (const c of courses) {
          const d = c.data || {};
          const origEmails: string[] = d.enrolledStudentEmails || [];
          const filteredEmails = origEmails.filter((e) => !DUMMY_STUDENT_EMAILS.has(e.toLowerCase().trim()));
          if (filteredEmails.length !== origEmails.length) {
            const updatedData = {
              ...d,
              enrolledStudentEmails: filteredEmails,
              enrolledCount: filteredEmails.length,
            };
            await supabase
              .from('courses')
              .update({
                data: updatedData,
                updated_at: new Date().toISOString(),
              })
              .eq('id', c.id);
          }
        }
      }
    } catch (err) {
      console.warn('[SupabaseDataService] purgeDummyStudentsFromCloud warning:', err);
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
  // =========================================================================
  // 5. TUGAS & PENGUMPULAN (ASSIGNMENTS & SUBMISSIONS) - Terintegrasi ke courses.data Cloud
  // =========================================================================
  async fetchAssignments(courseId?: string): Promise<Assignment[] | null> {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase.from('courses').select('id, user_id, data');
      if (error || !data) return null;

      const assignmentMap = new Map<string, Assignment>();
      data.forEach((row) => {
        const d = row.data || {};
        if (d.status === 'deleted' || d.isDeleted) return;
        const asgs = Array.isArray(d.assignments) ? d.assignments : [];
        asgs.forEach((asg: any) => {
          if (asg && asg.id) {
            assignmentMap.set(asg.id, {
              ...asg,
              isPublished: asg.isPublished !== false,
            });
          }
        });
      });

      const all = Array.from(assignmentMap.values());
      if (courseId) {
        return all.filter((a) => {
          if (a.courseId === courseId) return true;
          return false;
        });
      }
      return all;
    } catch {
      return null;
    }
  },

  async saveAssignment(assignment: Assignment): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !assignment.id) return false;
    try {
      // Find course row in Supabase and pack assignment into courses.data.assignments
      const { data: rows } = await supabase.from('courses').select('*');
      if (rows && rows.length > 0) {
        const matchingRows = rows.filter((r) => {
          const d = r.data || {};
          const cCode = String(d.code || '').trim().toUpperCase();
          const target = String(assignment.courseId || '').trim().toUpperCase();
          return r.id === assignment.courseId || d.id === assignment.courseId || (cCode && target.includes(cCode)) || (cCode && cCode.includes(target));
        });

        for (const row of matchingRows) {
          const d = row.data || {};
          const asgs: Assignment[] = Array.isArray(d.assignments) ? d.assignments : [];
          const idx = asgs.findIndex(
            (a) => a.id === assignment.id || (
              a.title && assignment.title && a.title.trim().toLowerCase() === assignment.title.trim().toLowerCase()
            )
          );
          if (idx >= 0) {
            asgs[idx] = { ...asgs[idx], ...assignment };
          } else {
            asgs.push(assignment);
          }
          d.assignments = asgs;

          await supabase.from('courses').update({
            data: d,
            updated_at: new Date().toISOString(),
          }).eq('id', row.id).eq('user_id', row.user_id);
        }
      }

      this.broadcastChange('assignment_updated', assignment);
      return true;
    } catch (err) {
      console.warn('[SupabaseDataService] saveAssignment failed:', err);
      return false;
    }
  },

  async deleteAssignment(assignmentId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !assignmentId) return false;
    try {
      const { data: rows } = await supabase.from('courses').select('*');
      if (rows && rows.length > 0) {
        for (const row of rows) {
          const d = row.data || {};
          const asgs: Assignment[] = Array.isArray(d.assignments) ? d.assignments : [];
          if (asgs.some((a) => a.id === assignmentId)) {
            d.assignments = asgs.filter((a) => a.id !== assignmentId);
            await supabase.from('courses').update({
              data: d,
              updated_at: new Date().toISOString(),
            }).eq('id', row.id).eq('user_id', row.user_id);
          }
        }
      }

      this.broadcastChange('assignment_deleted', { id: assignmentId });
      return true;
    } catch {
      return false;
    }
  },

  async saveAnnouncement(announcement: Announcement): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !announcement.id) return false;
    try {
      const { data: rows } = await supabase.from('courses').select('*');
      if (rows && rows.length > 0) {
        const isUniversal = !announcement.courseId || announcement.courseId === 'all' || announcement.courseId === 'semua';
        const matchingRows = isUniversal
          ? rows
          : rows.filter((r) => {
              const d = r.data || {};
              const cCode = String(d.code || '').trim().toUpperCase();
              const target = String(announcement.courseId || '').trim().toUpperCase();
              return r.id === announcement.courseId || d.id === announcement.courseId || (cCode && target.includes(cCode)) || (cCode && cCode.includes(target));
            });

        for (const row of matchingRows) {
          const d = row.data || {};
          const anns: Announcement[] = Array.isArray(d.announcements) ? d.announcements : [];
          const idx = anns.findIndex((a) => a.id === announcement.id);
          if (idx >= 0) {
            anns[idx] = { ...anns[idx], ...announcement };
          } else {
            anns.unshift(announcement);
          }
          d.announcements = anns;

          await supabase.from('courses').update({
            data: d,
            updated_at: new Date().toISOString(),
          }).eq('id', row.id).eq('user_id', row.user_id);
        }
      }

      this.broadcastChange('announcement_updated', announcement);
      return true;
    } catch (err) {
      console.warn('[SupabaseDataService] saveAnnouncement failed:', err);
      return false;
    }
  },

  async deleteAnnouncement(announcementId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !announcementId) return false;
    try {
      const { data: rows } = await supabase.from('courses').select('*');
      if (rows && rows.length > 0) {
        for (const row of rows) {
          const d = row.data || {};
          const anns: any[] = Array.isArray(d.announcements) ? d.announcements : [];
          if (anns.some((a) => a.id === announcementId)) {
            d.announcements = anns.filter((a) => a.id !== announcementId);
            await supabase.from('courses').update({
              data: d,
              updated_at: new Date().toISOString(),
            }).eq('id', row.id).eq('user_id', row.user_id);
          }
        }
      }

      this.broadcastChange('announcement_deleted', { id: announcementId });
      return true;
    } catch {
      return false;
    }
  },

  async fetchSubmissions(courseId?: string): Promise<AssignmentSubmission[] | null> {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase.from('courses').select('id, user_id, data');
      if (error || !data) return null;

      const subMap = new Map<string, AssignmentSubmission>();
      data.forEach((row) => {
        const d = row.data || {};
        if (d.status === 'deleted' || d.isDeleted) return;
        const subs = Array.isArray(d.submissions) ? d.submissions : [];
        subs.forEach((s: any) => {
          if (s && s.id) {
            subMap.set(s.id, s);
          }
        });
      });

      const all = Array.from(subMap.values());
      if (courseId) {
        return all.filter((s) => s.courseId === courseId);
      }
      return all;
    } catch {
      return null;
    }
  },

  async saveSubmission(submission: AssignmentSubmission): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase || !submission.id) return false;
    try {
      const { data: rows } = await supabase.from('courses').select('*');
      if (rows && rows.length > 0) {
        const matchingRows = rows.filter((r) => {
          const d = r.data || {};
          const cCode = String(d.code || '').trim().toUpperCase();
          const target = String(submission.courseId || '').trim().toUpperCase();
          const hasAsg = Array.isArray(d.assignments) && d.assignments.some((a: any) => a.id === submission.assignmentId);
          return r.id === submission.courseId || d.id === submission.courseId || (cCode && target.includes(cCode)) || hasAsg;
        });

        for (const row of matchingRows) {
          const d = row.data || {};
          const subs: AssignmentSubmission[] = Array.isArray(d.submissions) ? d.submissions : [];
          const idx = subs.findIndex((s) => s.id === submission.id);
          if (idx >= 0) {
            subs[idx] = { ...subs[idx], ...submission };
          } else {
            subs.push(submission);
          }
          d.submissions = subs;

          await supabase.from('courses').update({
            data: d,
            updated_at: new Date().toISOString(),
          }).eq('id', row.id).eq('user_id', row.user_id);
        }
      }

      this.broadcastChange('submission_created', submission);
      return true;
    } catch (err) {
      console.warn('[SupabaseDataService] saveSubmission failed:', err);
      return false;
    }
  },

  // =========================================================================
  // 6. REALTIME CLOUD LISTENER & INSTANT BROADCAST (Pemberitahuan Langsung < 300ms)
  // =========================================================================
  _realtimeChannel: null as any,

  getRealtimeChannel() {
    if (!isSupabaseConfigured() || !supabase) return null;
    if (!this._realtimeChannel) {
      this._realtimeChannel = supabase.channel('slh-unified-realtime');
    }
    return this._realtimeChannel;
  },

  /**
   * Mengirim event realtime broadcast ke seluruh browser dosen/mahasiswa aktif secara instan (< 300ms)
   */
  broadcastChange(event: string, payload: any): void {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const ch = this.getRealtimeChannel();
      if (ch) {
        ch.send({
          type: 'broadcast',
          event,
          payload,
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('[SupabaseDataService] broadcastChange warning:', e);
    }
  },

  setupRealtimeSubscription(onDataChange: (table: string, payload?: any) => void): { unsubscribe: () => void } | null {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const channel = this.getRealtimeChannel();
      if (!channel) return null;

      channel
        .on('broadcast', { event: 'course_updated' }, (msg: any) => {
          onDataChange('courses', msg?.payload);
        })
        .on('broadcast', { event: 'course_deleted' }, (msg: any) => {
          onDataChange('courses', { type: 'delete', ...msg?.payload });
        })
        .on('broadcast', { event: 'student_roster_updated' }, (msg: any) => {
          onDataChange('courses', { type: 'roster_updated', ...msg?.payload });
        })
        .on('broadcast', { event: 'student_updated' }, (msg: any) => {
          onDataChange('students', msg?.payload);
        })
        .on('broadcast', { event: 'invitation_response' }, (msg: any) => {
          onDataChange('courses', msg?.payload);
        })
        .on('broadcast', { event: 'assignment_updated' }, (msg: any) => {
          onDataChange('assignments', msg?.payload);
        })
        .on('broadcast', { event: 'assignment_deleted' }, (msg: any) => {
          onDataChange('assignments', { type: 'delete', ...msg?.payload });
        })
        .on('broadcast', { event: 'meeting_updated' }, (msg: any) => {
          onDataChange('meetings', msg?.payload);
        })
        .on('broadcast', { event: 'submission_created' }, (msg: any) => {
          onDataChange('submissions', msg?.payload);
        })
        .on('broadcast', { event: 'submission_graded' }, (msg: any) => {
          onDataChange('submissions', msg?.payload);
        })
        .on('broadcast', { event: 'announcement_updated' }, (msg: any) => {
          onDataChange('announcements', msg?.payload);
        })
        .on('broadcast', { event: 'announcement_deleted' }, (msg: any) => {
          onDataChange('announcements', { type: 'delete', ...msg?.payload });
        })
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
          // Channel dibiarkan aktif untuk broadcast persistent
        },
      };
    } catch {
      return null;
    }
  },
};
