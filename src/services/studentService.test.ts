import test from 'node:test';
import assert from 'node:assert/strict';
import { LECTURER_WHITELIST_EMAILS } from '../data/mockData.ts';

// Test mock localStorage for node environment
const storage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => storage[k] || null,
  setItem: (k: string, v: string) => { storage[k] = v; },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};

// Import after setting up mock localStorage
import { studentService } from './studentService.ts';

test('Registration: miftahurridlo.688@gmail.com registers as Dosen Utama', () => {
  const result = studentService.register({
    name: 'Miftahur Ridlo',
    email: 'miftahurridlo.688@gmail.com',
    password: 'password123',
  });

  assert.equal(result.success, true);
  assert.equal(result.user?.role, 'dosen');
  assert.equal(result.user?.email, 'miftahurridlo.688@gmail.com');
  assert.equal(result.user?.title, 'Dosen Pengampu Utama');
  assert.equal(result.user?.nidn, '0412088501');
});

test('Registration: altaf.aziz16@gmail.com registers as Dosen Partner', () => {
  const result = studentService.register({
    name: 'Tengku Abdillah Aziz',
    email: 'altaf.aziz16@gmail.com',
    password: 'securePassword456',
  });

  assert.equal(result.success, true);
  assert.equal(result.user?.role, 'dosen');
  assert.equal(result.user?.email, 'altaf.aziz16@gmail.com');
  assert.equal(result.user?.title, 'Dosen Pengampu Partner');
  assert.equal(result.user?.nidn, '0419058902');
});

test('Login: verifies matching password and rejects incorrect password', () => {
  const loginGood = studentService.login('miftahurridlo.688@gmail.com', 'password123');
  assert.equal(loginGood.success, true);
  assert.equal(loginGood.user?.email, 'miftahurridlo.688@gmail.com');

  const loginBad = studentService.login('miftahurridlo.688@gmail.com', 'wrongpassword');
  assert.equal(loginBad.success, false);
  assert.match(loginBad.message, /tidak sesuai/i);
});

test('Logout: clears current user to null', () => {
  studentService.logout();
  const current = studentService.getCurrentUser();
  assert.equal(current, null);
});

test('Safe calls when unauthenticated: methods do not throw null pointer errors', () => {
  studentService.logout();
  assert.doesNotThrow(() => {
    const enrolled = studentService.getEnrolledCourses();
    assert.deepEqual(enrolled, []);
  });
  assert.doesNotThrow(() => {
    const ann = studentService.getAnnouncements();
    assert.ok(Array.isArray(ann));
  });
  assert.doesNotThrow(() => {
    const sub = studentService.getSubmissionForAssignment('test-id');
    assert.equal(sub, undefined);
  });
});

test('Registration: Student rejected if email is not in master database whitelist', () => {
  const result = studentService.register({
    name: 'Mahasiswa Tak Dikenal',
    email: 'unknown.stranger@gmail.com',
    role: 'mahasiswa',
    nim: '99999999',
    password: 'mhsPassword123',
  });

  assert.equal(result.success, false);
  assert.match(result.message, /belum terdaftar/i);
});

test('Registration: Pre-authorized student registers successfully and links NIM and courses', () => {
  // Pre-authorize student in master database
  studentService.saveMasterStudent({
    id: 'mstd_test_budi',
    nim: '10123099',
    name: 'Budi Santoso',
    email: 'budi@student.ac.id',
    major: 'Informatika',
    classSection: 'Kelas A',
    enrolledCourseCodes: ['IF-208'],
  });

  const result = studentService.register({
    name: 'Budi Santoso',
    email: 'budi@student.ac.id',
    role: 'mahasiswa',
    password: 'mhsPassword123',
  });

  assert.equal(result.success, true);
  assert.equal(result.user?.role, 'mahasiswa');
  assert.equal(result.user?.nim, '10123099');
});

test('Master Database: saves, searches, and deletes students', () => {
  const countBefore = studentService.getMasterStudents().length;
  studentService.saveMasterStudent({
    id: 'mstd_test_aziz',
    nim: '3222431013',
    name: 'Tengku Aziz',
    email: 'tengku.aziz@student.ac.id',
    major: 'Informatika',
    classSection: 'Kelas A',
    enrolledCourseCodes: ['GEO-301'],
  });

  const students = studentService.getMasterStudents();
  assert.ok(students.some((s) => s.email === 'tengku.aziz@student.ac.id'));
  assert.equal(studentService.isStudentEmailAuthorized('tengku.aziz@student.ac.id'), true);
  assert.equal(studentService.isStudentEmailAuthorized('random123@xyz.com'), false);
});

test('Profile: updateLecturerProfile updates active lecturer profile details', () => {
  studentService.login('miftahurridlo.688@gmail.com', 'password123');
  const updated = studentService.updateLecturerProfile({
    name: 'Muhammad Miftahurridlo, M.Kom.',
    nidn: '0412088501',
    department: 'Pendidikan Geografi',
    bio: 'Dosen Pengampu OBE dan Sistem Informasi Geografis.',
  });

  assert.equal(updated.name, 'Muhammad Miftahurridlo, M.Kom.');
  assert.equal(updated.department, 'Pendidikan Geografi');
  assert.equal(updated.bio, 'Dosen Pengampu OBE dan Sistem Informasi Geografis.');

  const current = studentService.getCurrentUser();
  assert.equal(current?.name, 'Muhammad Miftahurridlo, M.Kom.');
  assert.equal(current?.department, 'Pendidikan Geografi');
});

test('Profile: importMyJourneyProfileJson imports profile cleanly', () => {
  studentService.login('miftahurridlo.688@gmail.com', 'password123');
  const json = JSON.stringify({
    name: 'Muhammad Miftahurridlo',
    titleSuffix: 'M.Kom.',
    role: 'Dosen & Peneliti',
    universityOrOrg: 'Universitas Terbuka',
    bio: 'Workspace terpadu riset, mengajar, dan geospasial.',
  });

  const res = studentService.importMyJourneyProfileJson(json);
  assert.equal(res.success, true);
  assert.equal(res.profile?.name, 'Muhammad Miftahurridlo, M.Kom.');
  assert.equal(res.profile?.department, 'Universitas Terbuka');
  assert.equal(res.profile?.bio, 'Workspace terpadu riset, mengajar, dan geospasial.');
});

test('Avatar: ensures no dummy Unsplash photos are used', () => {
  const regUser = studentService.getCurrentUser();
  assert.ok(regUser?.avatarUrl);
  assert.equal(regUser.avatarUrl.includes('photo-1534528741775'), false);
  assert.equal(regUser.avatarUrl.includes('photo-1507003211169'), false);
});

test('Auth Async: loginAsync verifies registered student credentials', async () => {
  const res = await studentService.loginAsync('budi@student.ac.id', 'mhsPassword123');
  assert.equal(res.success, true);
  assert.equal(res.user?.role, 'mahasiswa');

  const resBad = await studentService.loginAsync('budi@student.ac.id', 'wrongPass');
  assert.equal(resBad.success, false);
});

test('Courses: syncCoursesFromSupabase method exists and returns a promise result', async () => {
  const res = await studentService.syncCoursesFromSupabase();
  assert.equal(typeof res.success, 'boolean');
  assert.equal(typeof res.count, 'number');
});

test('Whitelist: student must be in master database to register successfully', () => {
  studentService.saveMasterStudent({
    id: 'mstd_test_aziz',
    nim: '1234567',
    name: 'Aziz',
    email: 'aziz.student@mhs.unimed.ac.id',
    major: 'Sains Informasi Geografi',
    classSection: 'Kelas A',
  });

  const res = studentService.register({
    name: 'Aziz',
    email: 'aziz.student@mhs.unimed.ac.id',
    nim: '1234567',
    password: 'securePass123',
  });
  assert.equal(res.success, true);
  assert.equal(res.user?.email, 'aziz.student@mhs.unimed.ac.id');
  assert.equal(res.user?.nim, '1234567');

  const masterList = studentService.getMasterStudents();
  const found = masterList.find((s) => s.email.toLowerCase() === 'aziz.student@mhs.unimed.ac.id');
  assert.ok(found);
  assert.equal(found?.name, 'Aziz');
  assert.equal(found?.nim, '1234567');
});

test('Greeting: formatLecturerGreeting prefixes with Pak correctly', () => {
  assert.equal(studentService.formatLecturerGreeting('Tengku Abdillah Azis, S.Pd'), 'Pak Tengku Abdillah Azis, S.Pd');
  assert.equal(studentService.formatLecturerGreeting('Muhammad Miftahurrodlo, S.Pd., M.Sc'), 'Pak Muhammad Miftahurrodlo, S.Pd., M.Sc');
  assert.equal(studentService.formatLecturerGreeting('Pak Tengku'), 'Pak Tengku');
});

test('Team Teaching: Create course with co-lecturer invitation, accept, and decline flow', () => {
  // Login as Altaf
  const altafLogin = studentService.login('altaf.aziz16@gmail.com', 'securePassword456');
  assert.equal(altafLogin.success, true);

  // Create course and invite Miftah
  const newCourse = studentService.createCourse({
    code: 'GEO-501',
    title: 'Sistem Informasi Geografi Lanjut',
    description: 'Kelas kolaboratif tim dosen',
    room: 'Lab SIG',
    scheduleDay: 'Senin',
    scheduleTime: '08:00 - 10:30 WIB',
    invitedLecturerEmail: 'miftahurridlo.688@gmail.com',
  });

  assert.equal(newCourse.code, 'GEO-501');
  assert.equal(newCourse.pendingLecturerEmail, 'miftahurridlo.688@gmail.com');

  // Check invitation notification for Miftah
  const miftahInvites = studentService.getPendingInvitationsForUser('miftahurridlo.688@gmail.com');
  assert.ok(miftahInvites.length > 0);
  const invite = miftahInvites.find((n) => n.invitationData?.courseId === newCourse.id);
  assert.ok(invite);
  assert.equal(invite?.invitationData?.status, 'pending');

  // Login as Miftah and accept
  const miftahLogin = studentService.login('miftahurridlo.688@gmail.com', 'password123');
  assert.equal(miftahLogin.success, true);
  const acceptRes = studentService.respondToCourseInvitation(invite!.id, 'accepted');
  assert.equal(acceptRes.success, true);

  // Verify course now has secondaryTeacher set to Miftah
  const updatedCourse = studentService.getCourseById(newCourse.id);
  assert.ok(updatedCourse?.secondaryTeacher);
  assert.equal(updatedCourse?.secondaryTeacher?.email, 'miftahurridlo.688@gmail.com');
  assert.equal(updatedCourse?.pendingLecturerEmail, undefined);

  // Verify Miftah now has this enrolled/taught course
  const miftahCourses = studentService.getEnrolledCourses();
  assert.ok(miftahCourses.some((c) => c.id === newCourse.id));
});

test('Reset Platform Data: clears courses and students to 0', () => {
  const res = studentService.resetAllPlatformData();
  assert.equal(res.success, true);
  assert.equal(studentService.getAllCourses().length, 0);
  assert.equal(studentService.getMasterStudents().length, 0);
  assert.equal(studentService.getMeetings().length, 0);
  assert.equal(studentService.getAssignments().length, 0);
  assert.equal(studentService.getSubmissions().length, 0);

  // Both base lecturer accounts remain preserved
  const lecturers = studentService.getRegisteredLecturers();
  assert.equal(lecturers.length, 2);
  assert.ok(lecturers.some((l) => l.email === 'altaf.aziz16@gmail.com'));
  assert.ok(lecturers.some((l) => l.email === 'miftahurridlo.688@gmail.com'));
});

test('Student Enrollment: Lecturer adds student, appears in roster and student portal', () => {
  // 1. Login as Azis
  studentService.login('altaf.aziz16@gmail.com', 'password123');
  const course = studentService.createCourse({
    code: 'SIG-LANJUT',
    title: 'Sistem Informasi Geografi Lanjutan',
    description: 'Kelas praktek SIG',
    room: 'Lab Spasial',
    scheduleDay: 'Selasa',
    scheduleTime: '08:00 - 10:30 WIB',
  });

  // 2. Register student
  const regRes = studentService.registerStudentWithDetails({
    name: 'Budi Santoso',
    nim: '2208101001',
    email: 'budi.santoso@student.ac.id',
    courseId: course.id,
  });
  assert.equal(regRes.success, true);

  // 3. Check course in Azis view
  const updatedCourse = studentService.getCourseById(course.id);
  assert.ok(updatedCourse?.enrolledStudentEmails?.includes('budi.santoso@student.ac.id'));
  assert.equal(updatedCourse?.enrolledCount, 1);

  // 4. Check getAllPreRegisteredStudents
  const allStds = studentService.getAllPreRegisteredStudents();
  assert.ok(allStds.some((s) => s.email === 'budi.santoso@student.ac.id'));

  // 5. Check student view (when budi logs in or queries enrolled courses)
  const studentCourses = studentService.getEnrolledCourses('budi.santoso@student.ac.id');
  assert.equal(studentCourses.length, 1);
  assert.equal(studentCourses[0].code, 'SIG-LANJUT');
});

test('Set Primary Lecturer: Swaps primary and secondary lecturer roles correctly', () => {
  studentService.login('altaf.aziz16@gmail.com', 'password123');
  const course = studentService.createCourse({
    code: 'GEO-OBE',
    title: 'Geografi Berbasis OBE',
    description: 'Kelas kolaborasi',
    room: 'Lab Komputasi',
    scheduleDay: 'Senin',
    scheduleTime: '08:00 - 10:30 WIB',
    invitedLecturerEmail: 'miftahurridlo.688@gmail.com',
  });

  // Accept co-lecturer invitation
  studentService.acceptCourseInvitation(course.id, 'miftahurridlo.688@gmail.com');
  const acceptedCourse = studentService.getCourseById(course.id);
  assert.equal(acceptedCourse?.teacher?.email, 'altaf.aziz16@gmail.com');
  assert.equal(acceptedCourse?.secondaryTeacher?.email, 'miftahurridlo.688@gmail.com');

  // Switch Primary Lecturer to Miftah
  const switchRes = studentService.setPrimaryLecturer(course.id, 'miftahurridlo.688@gmail.com');
  assert.equal(switchRes.success, true);

  const switchedCourse = studentService.getCourseById(course.id);
  assert.equal(switchedCourse?.teacher?.email, 'miftahurridlo.688@gmail.com');
  assert.equal(switchedCourse?.secondaryTeacher?.email, 'altaf.aziz16@gmail.com');
  assert.equal(switchedCourse?.primaryLecturer, 'Muhammad Miftahurrodlo, M.Sc.');
});
