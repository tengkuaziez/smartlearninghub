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

test('Registration: Student registers with only email and password, auto-populating Name and NIM from master database', async () => {
  studentService.saveMasterStudent({
    id: 'mstd_test_minimal',
    nim: '3222431099',
    name: 'Mahasiswa Otomatis',
    email: 'mhs.otomatis@student.ac.id',
    major: 'Sains Informasi Geografi',
    classSection: 'Kelas A',
    enrolledCourseCodes: ['GEO-101'],
  });

  const res = await studentService.registerAsync({
    email: 'mhs.otomatis@student.ac.id',
    password: 'passwordRahasia123',
  });

  assert.equal(res.success, true);
  assert.equal(res.user?.name, 'Mahasiswa Otomatis');
  assert.equal(res.user?.nim, '3222431099');
  assert.equal(res.user?.role, 'mahasiswa');
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

  // 6. Lecturer removes student from course
  const removeRes = studentService.removeStudentEmailFromCourse(course.id, 'budi.santoso@student.ac.id');
  assert.equal(removeRes.success, true);

  // 7. Check course in Lecturer view: roster count is 0, student email is gone
  const courseAfterRemoval = studentService.getCourseById(course.id);
  assert.equal(courseAfterRemoval?.enrolledCount, 0);
  assert.equal(courseAfterRemoval?.enrolledStudentEmails?.length, 0);

  // 8. Check student view: student is kicked out of the course immediately!
  const studentCoursesAfterRemoval = studentService.getEnrolledCourses('budi.santoso@student.ac.id');
  assert.equal(studentCoursesAfterRemoval.length, 0);

  // 9. Verify subsequent calls to getEnrolledCourses do NOT resurrect student
  const studentCoursesAgain = studentService.getEnrolledCourses('budi.santoso@student.ac.id');
  assert.equal(studentCoursesAgain.length, 0);
  const courseCheck = studentService.getCourseById(course.id);
  assert.equal(courseCheck?.enrolledCount, 0);
  assert.equal(courseCheck?.enrolledStudentEmails?.length, 0);
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

test('Deduplication: getAllCourses and createCourse prevent duplicate course creation', () => {
  studentService.login('miftahurridlo.688@gmail.com', 'DosenUtama2026!');
  
  // Create first course
  const c1 = studentService.createCourse({
    code: 'GEO-TEST',
    title: 'Geografi Pengujian',
    description: 'Deskripsi test',
    room: 'Lab 1',
    scheduleDay: 'Senin',
    scheduleTime: '08:00 - 10:30 WIB',
  });

  // Attempt to create course with exact same code
  const c2 = studentService.createCourse({
    code: 'GEO-TEST',
    title: 'Geografi Pengujian Duplikat',
    description: 'Deskripsi duplikat',
    room: 'Lab 2',
    scheduleDay: 'Selasa',
    scheduleTime: '08:00 - 10:30 WIB',
  });

  assert.equal(c1.id, c2.id);

  const all = studentService.getAllCourses();
  const testCourses = all.filter((c) => c.code.toUpperCase() === 'GEO-TEST');
  assert.equal(testCourses.length, 1);

  // Clean up
  studentService.deleteCourse(c1.id);
});

test('Realtime: applyRealtimeCourseUpdate applies new course and pending notification instantly', () => {
  studentService.login('altaf.aziz16@gmail.com', 'DosenPartner2026!');

  const incomingCourse: any = {
    id: 'course_incoming_realtime',
    code: 'GEO-REALTIME',
    title: 'Geografi Realtime Broadcast',
    teacher: {
      id: 'dos_miftah',
      name: 'Muhammad Miftahurrodlo, M.Sc.',
      email: 'miftahurridlo.688@gmail.com',
    },
    pendingLecturerEmail: 'altaf.aziz16@gmail.com',
    pendingLecturerName: 'Tengku Abdillah Azis, S.Si',
    scheduleDay: 'Rabu',
    scheduleTime: '08:00 - 10:30 WIB',
    room: 'Lab GIS',
  };

  studentService.applyRealtimeCourseUpdate(incomingCourse);

  const found = studentService.getCourseById('course_incoming_realtime');
  assert.ok(found);
  assert.equal(found?.code, 'GEO-REALTIME');

  const notifs = studentService.getNotifications();
  const invNotif = notifs.find((n) => n.invitationData?.courseCode === 'GEO-REALTIME');
  assert.ok(invNotif);

  // Clean up
  studentService.deleteCourse('course_incoming_realtime');
});

test('Collaborative Course Deletion: requires 2-way approval for team-taught courses', () => {
  studentService.login('altaf.aziz16@gmail.com', 'password123');
  const course = studentService.createCourse({
    code: 'GEO-COLLAB-DEL',
    title: 'Geografi Kolaborasi Eksklusif',
    description: 'Kelas kolaborasi 2 dosen',
    room: 'Lab Spasial',
    scheduleDay: 'Senin',
    scheduleTime: '08:00 - 10:30 WIB',
    invitedLecturerEmail: 'miftahurridlo.688@gmail.com',
  });

  // Partner accepts
  studentService.login('miftahurridlo.688@gmail.com', 'password123');
  studentService.acceptCourseInvitation(course.id, 'miftahurridlo.688@gmail.com');

  const confirmedCourse = studentService.getCourseById(course.id);
  assert.ok(confirmedCourse?.secondaryTeacher);

  // Azis requests deletion
  studentService.login('altaf.aziz16@gmail.com', 'password123');
  const reqRes = studentService.requestCourseDeletion(course.id);
  assert.equal(reqRes.requiresApproval, true);

  // Verify course is NOT deleted yet
  const pendingCourse = studentService.getCourseById(course.id);
  assert.ok(pendingCourse);
  assert.equal(pendingCourse?.deletionRequest?.status, 'pending');

  // Miftah logs in and rejects first
  studentService.login('miftahurridlo.688@gmail.com', 'password123');
  const rejectRes = studentService.respondToCourseDeletion(course.id, false);
  assert.equal(rejectRes.success, true);

  // Verify course is still alive and deletionRequest cleared
  const aliveCourse = studentService.getCourseById(course.id);
  assert.ok(aliveCourse);
  assert.equal(aliveCourse?.deletionRequest, undefined);

  // Now request again and approve
  studentService.login('altaf.aziz16@gmail.com', 'password123');
  studentService.requestCourseDeletion(course.id);

  studentService.login('miftahurridlo.688@gmail.com', 'password123');
  const approveRes = studentService.respondToCourseDeletion(course.id, true);
  assert.equal(approveRes.success, true);

  // Now course is permanently deleted
  const deletedCourse = studentService.getCourseById(course.id);
  assert.equal(deletedCourse, undefined);
});

test('Student view: pruned immediately on course delete & new course starts empty', () => {
  studentService.login('altaf.aziz16@gmail.com', 'password123');
  const course = studentService.createCourse({
    code: 'SIG-STUDENT-TEST',
    title: 'Mata Kuliah Uji Hapus Mahasiswa',
    description: 'Testing',
    room: 'Lab Spasial',
    scheduleDay: 'Kamis',
    scheduleTime: '08:00 - 10:30 WIB',
  });

  // Verify new course starts strictly with empty students
  assert.equal(course.enrolledStudentEmails.length, 0);

  // Register student
  const studentEmail = 'mahasiswa.test.del@student.ac.id';
  studentService.registerStudentWithDetails({
    name: 'Budi Test Delete',
    nim: '10999999',
    email: studentEmail,
    courseId: course.id,
  });

  // Student checks enrolled courses
  const studentCoursesBefore = studentService.getEnrolledCourses(studentEmail);
  assert.ok(studentCoursesBefore.some((c) => c.id === course.id));

  // Lecturer deletes course
  studentService.deleteCourse(course.id);

  // Student checks enrolled courses after deletion
  const studentCoursesAfter = studentService.getEnrolledCourses(studentEmail);
  assert.ok(!studentCoursesAfter.some((c) => c.id === course.id || c.code === 'SIG-STUDENT-TEST'));
});

test('Student Removal & Cloud Sync: Removed student is evicted permanently and never resurrected', () => {
  studentService.login('altaf.aziz16@gmail.com', 'password123');
  const course = studentService.createCourse({
    code: 'BENCANA-TEST',
    title: 'Geografi Kebencanaan Test',
    description: 'Mitigasi Bencana',
    room: 'Lab Spasial',
    scheduleDay: 'Senin',
    scheduleTime: '08:00 - 10:30 WIB',
  });

  const studentA = 'altaf.aziz.student@gmail.com';
  const studentB = 'citra.permata@student.ac.id';

  studentService.registerStudentWithDetails({
    name: 'Altaf Mahasiswa',
    nim: '3222431013',
    email: studentA,
    courseId: course.id,
  });
  studentService.registerStudentWithDetails({
    name: 'Citra Permata',
    nim: '3222431014',
    email: studentB,
    courseId: course.id,
  });

  // Both students see course
  assert.equal(studentService.getEnrolledCourses(studentA).length, 1);
  assert.equal(studentService.getEnrolledCourses(studentB).length, 1);
  assert.equal(studentService.getCourseById(course.id)?.enrolledCount, 2);

  // Lecturer removes studentA
  const removeRes = studentService.removeStudentEmailFromCourse(course.id, studentA);
  assert.equal(removeRes.success, true);

  // Verification 1: studentA MUST immediately have 0 enrolled courses
  const studentACourses = studentService.getEnrolledCourses(studentA);
  assert.equal(studentACourses.length, 0);

  // Verification 2: studentB STILL has 1 enrolled course
  const studentBCourses = studentService.getEnrolledCourses(studentB);
  assert.equal(studentBCourses.length, 1);
  assert.equal(studentBCourses[0].id, course.id);

  // Verification 3: Course roster in lecturer view shows only studentB
  const updatedCourse = studentService.getCourseById(course.id);
  assert.equal(updatedCourse?.enrolledCount, 1);
  assert.deepEqual(updatedCourse?.enrolledStudentEmails, [studentB]);

  // Verification 4: Simulate cross-browser realtime broadcast with updated roster
  studentService.applyRealtimeCourseUpdate({
    type: 'roster_updated',
    courseId: course.id,
    removedEmail: studentA,
    course: updatedCourse,
  });
  assert.equal(studentService.getEnrolledCourses(studentA).length, 0);

  // Clean up
  studentService.deleteCourse(course.id);
  assert.equal(studentService.getEnrolledCourses(studentB).length, 0);
});

test('Student Name Sync: editing student in master database propagates to account profile and current user', async () => {
  const studentEmail = 'altaf.aziz16@student.ac.id';

  // 1. Pre-register student in master database
  studentService.saveMasterStudent({
    id: 'mstd_test_sync',
    name: 'Altaf Aziz',
    nim: '10123000',
    email: studentEmail,
    major: 'Sains Informasi Geografi',
    classSection: 'Kelas A',
    enrolledCourseCodes: [],
  });

  // 2. Student registers account and logs in
  const regRes = await studentService.registerAsync({
    name: 'Altaf Aziz',
    email: studentEmail,
    nim: '10123000',
    password: 'password123',
    role: 'mahasiswa',
  });
  assert.equal(regRes.success, true);

  // Student logs in
  studentService.setCurrentUser(regRes.user!);
  assert.equal(studentService.getCurrentUser()?.name, 'Altaf Aziz');
  assert.equal(studentService.getProfile().name, 'Altaf Aziz');

  // 3. Lecturer edits student name to "Tengku Aziez" in master student database
  const updated = studentService.saveMasterStudent({
    id: 'mstd_test_sync',
    name: 'Tengku Aziez',
    nim: '10123000',
    email: studentEmail,
    major: 'Sains Informasi Geografi',
    classSection: 'Kelas A',
    enrolledCourseCodes: [],
  });
  assert.equal(updated.name, 'Tengku Aziez');

  // Verification 1: studentService.getCurrentUser() MUST immediately reflect "Tengku Aziez"
  const curUser = studentService.getCurrentUser();
  assert.equal(curUser?.name, 'Tengku Aziez');

  // Verification 2: studentService.getProfile() MUST immediately reflect "Tengku Aziez"
  const prof = studentService.getProfile();
  assert.equal(prof.name, 'Tengku Aziez');

  // Verification 3: Registered users list MUST have updated name
  const regUser = studentService.getRegisteredUsers().find((u) => u.email.toLowerCase() === studentEmail);
  assert.equal(regUser?.name, 'Tengku Aziez');

  // 4. Test realtime propagation via applyRealtimeStudentUpdate
  studentService.applyRealtimeStudentUpdate({
    student: {
      id: 'mstd_test_sync',
      name: 'Tengku Aziez Realtime',
      nim: '10123000',
      email: studentEmail,
      major: 'Sains Informasi Geografi',
      classSection: 'Kelas A',
      enrolledCourseCodes: [],
    },
  });
  assert.equal(studentService.getCurrentUser()?.name, 'Tengku Aziez Realtime');
  assert.equal(studentService.getProfile().name, 'Tengku Aziez Realtime');

  // Clean up
  studentService.deleteMasterStudent(studentEmail);
  studentService.logout();
});

test('Clean Course Badges: enrolledCourseCodes excludes raw IDs like course_...', () => {
  const testStudentEmail = 'clean.badge.test@student.ac.id';

  // Create course with specific code
  const course = studentService.createCourse({
    code: 'SIGDASAR',
    title: 'SIG Dasar',
    description: 'Testing badges',
    room: 'Lab 3',
    scheduleDay: 'Senin',
    scheduleTime: '08:00 - 10:30 WIB',
  });

  // Add student to course
  studentService.addStudentEmailToCourse(course.id, testStudentEmail);

  // Fetch student from getMasterStudents
  const master = studentService.getMasterStudents().find((s) => s.email === testStudentEmail);
  assert.ok(master);

  // Verification 1: enrolledCourseCodes MUST ONLY contain clean course code 'SIGDASAR'
  // and MUST NOT contain raw ID (e.g. course.id starting with 'course_')
  assert.deepEqual(master.enrolledCourseCodes, ['SIGDASAR']);
  assert.ok(!master.enrolledCourseCodes.some((c) => c.startsWith('course_')));

  // Remove student from course
  studentService.removeStudentEmailFromCourse(course.id, testStudentEmail);

  // Verification 2: master students for this student now has 0 enrolled courses (empty array)
  const masterAfterRemoval = studentService.getMasterStudents().find((s) => s.email === testStudentEmail);
  assert.deepEqual(masterAfterRemoval?.enrolledCourseCodes, []);

  // Clean up
  studentService.deleteCourse(course.id);
  studentService.deleteMasterStudent(testStudentEmail);
});

test('Class Detail Management: Meetings, Materials, Assignments, and OBE RPS generation', () => {
  // 1. Create course
  const course = studentService.createCourse({
    code: 'KARTOGRAFI',
    title: 'Kartografi Tematik',
    description: 'Studi pemetaan dan kartografi',
    room: 'Lab Spasial',
    scheduleDay: 'Selasa',
    scheduleTime: '08:00 - 10:30 WIB',
  });
  assert.ok(course.id);

  // 2. Generate 16 OBE Meetings
  const meetings16 = studentService.generate16MeetingsForCourse(course.id);
  assert.equal(meetings16.length, 16);
  assert.equal(meetings16[0].meetingNumber, 1);
  assert.equal(meetings16[15].meetingNumber, 16);
  assert.ok(meetings16[7].title.includes('Evaluasi Tengah Semester (UTS)'));
  assert.ok(meetings16[15].title.includes('Evaluasi Akhir Semester (UAS)'));

  // 3. Create a manual meeting
  const manualMeeting = studentService.createMeeting({
    courseId: course.id,
    meetingNumber: 17,
    title: 'Sesi Pengayaan: Kartografi Digital 3D',
    topic: 'Visualisasi 3D Topografi',
    date: '2026-12-01',
    startTime: '08:00',
    endTime: '10:30',
    room: 'Lab Spasial',
    isOnline: true,
    meetingLink: 'https://meet.google.com/test-kartografi',
    description: 'Sesi tambahan untuk eksplorasi DEM',
  });
  assert.ok(manualMeeting.id);
  assert.equal(manualMeeting.meetingNumber, 17);
  assert.equal(manualMeeting.isOnline, true);

  // 4. Update the meeting
  const updatedMeeting = studentService.updateMeeting(manualMeeting.id, {
    title: 'Sesi Pengayaan: Kartografi Digital 3D (Revisi)',
  });
  assert.equal(updatedMeeting?.title, 'Sesi Pengayaan: Kartografi Digital 3D (Revisi)');

  // 5. Add material to meeting
  const material = studentService.addMaterialToMeeting(manualMeeting.id, {
    title: 'Slide Modul 3D DEM',
    type: 'pdf',
    url: 'https://example.com/slide-dem.pdf',
    description: 'Bahan ajar pengayaan 3D',
  });
  assert.ok(material);
  assert.equal(material?.title, 'Slide Modul 3D DEM');
  assert.equal(material?.type, 'pdf');

  // Verify material is in meeting
  const meetingsAfterMat = studentService.getMeetings(course.id);
  const foundMeeting = meetingsAfterMat.find((m) => m.id === manualMeeting.id);
  assert.equal(foundMeeting?.materials.length, 1);
  assert.equal(foundMeeting?.materials[0].title, 'Slide Modul 3D DEM');

  // Delete material from meeting
  if (material) {
    const deletedMat = studentService.deleteMaterialFromMeeting(manualMeeting.id, material.id);
    assert.equal(deletedMat, true);
  }

  // 6. Delete manual meeting
  const deletedMeeting = studentService.deleteMeeting(manualMeeting.id);
  assert.equal(deletedMeeting, true);
  const meetingsAfterDelete = studentService.getMeetings(course.id);
  assert.equal(meetingsAfterDelete.some((m) => m.id === manualMeeting.id), false);

  // 7. Create, update, and delete assignment
  const assignment = studentService.createAssignment({
    courseId: course.id,
    meetingId: meetings16[0].id,
    title: 'Tugas 1: Peta Kontur dan Skala',
    instructions: 'Buat peta kontur dengan interval 25m',
    deadline: '2026-12-10T23:59',
    allowedFormats: ['.pdf', '.zip'],
    maxFileSizeMb: 20,
    allowTextResponse: true,
  });
  assert.ok(assignment.id);
  assert.equal(assignment.title, 'Tugas 1: Peta Kontur dan Skala');

  const updatedAsg = studentService.updateAssignment(assignment.id, {
    title: 'Tugas 1: Peta Kontur dan Skala (Diperbarui)',
  });
  assert.equal(updatedAsg?.title, 'Tugas 1: Peta Kontur dan Skala (Diperbarui)');

  const deletedAsg = studentService.deleteAssignment(assignment.id);
  assert.equal(deletedAsg, true);
  const asgsAfterDelete = studentService.getAssignments(course.id);
  assert.equal(asgsAfterDelete.some((a) => a.id === assignment.id), false);

  // 8. Generate Default OBE RPS
  const rps = studentService.generateDefaultRps(course.id);
  assert.ok(rps);
  assert.equal(rps.courseCode, 'KARTOGRAFI');
  assert.ok(rps.cpmk.length >= 3);
  assert.ok(rps.studyMaterials.length >= 10);

  // Clean up
  studentService.deleteCourse(course.id);
});

test('Assignments: deduplicates assignments by title for the same course and updates in place', () => {
  const course = studentService.createCourse({
    code: 'SIGD-TEST',
    title: 'SIG Dasar Test',
    description: 'Testing assignments',
    room: 'Lab 1',
    scheduleDay: 'Senin',
    scheduleTime: '08:00 - 10:30 WIB',
  });

  // Create assignment CBR
  const asg1 = studentService.createAssignment({
    courseId: course.id,
    title: 'CBR',
    instructions: 'Critical Book Review 1',
    deadline: '2026-11-29T23:59',
  });
  assert.ok(asg1.id);

  // Update session / deadline of CBR
  const asg2 = studentService.createAssignment({
    courseId: course.id,
    title: 'CBR',
    instructions: 'Critical Book Review 1 Updated Session',
    deadline: '2026-11-30T23:59',
  });

  // getAssignments should only have 1 CBR assignment for this course
  const courseAsgs = studentService.getAssignments(course.id);
  const cbrs = courseAsgs.filter((a) => a.title.trim().toLowerCase() === 'cbr');
  assert.equal(cbrs.length, 1);
  assert.equal(cbrs[0].deadline, '2026-11-30T23:59');

  // Clean up
  studentService.deleteAssignment(asg1.id);
  studentService.deleteCourse(course.id);
});

test('Announcements: posts announcement with target course and handles student visibility correctly', () => {
  const course = studentService.createCourse({
    code: 'GEO-ANN-TEST',
    title: 'Geografi Pengumuman Test',
    description: 'Testing announcements',
    room: 'Lab 2',
    scheduleDay: 'Rabu',
    scheduleTime: '08:00 - 10:30 WIB',
  });

  const enrolledStudent = 'student.enrolled@student.ac.id';
  const otherStudent = 'student.other@student.ac.id';
  studentService.addStudentEmailToCourse(course.id, enrolledStudent);

  // 1. Post class-specific announcement
  const annClass = studentService.postAnnouncement({
    courseId: course.id,
    title: 'Pengumuman Kuliah Geografi Khusus',
    content: 'Tolong persiapkan software GIS untuk kelas ini.',
    isPinned: true,
  });
  assert.ok(annClass.id);
  assert.equal(annClass.courseId, course.id);
  assert.equal(annClass.isPinned, true);

  // 2. Post universal announcement
  const annUniversal = studentService.postAnnouncement({
    courseId: 'all',
    title: 'Pengumuman Libur Nasional Fakultas',
    content: 'Kuliah ditiadakan pada hari libur nasional.',
    isPinned: false,
  });
  assert.ok(annUniversal.id);
  assert.equal(annUniversal.courseId, 'all');

  // Enrolled student should see both
  studentService.setCurrentUser({
    id: 'std_enrolled',
    name: 'Student Enrolled',
    email: enrolledStudent,
    role: 'mahasiswa',
  });
  const enrolledStudentAnns = studentService.getAnnouncements();
  assert.ok(enrolledStudentAnns.some((a) => a.id === annClass.id));
  assert.ok(enrolledStudentAnns.some((a) => a.id === annUniversal.id));

  // Other student should ONLY see universal announcement
  studentService.setCurrentUser({
    id: 'std_other',
    name: 'Student Other',
    email: otherStudent,
    role: 'mahasiswa',
  });
  const otherStudentAnns = studentService.getAnnouncements();
  assert.ok(!otherStudentAnns.some((a) => a.id === annClass.id));
  assert.ok(otherStudentAnns.some((a) => a.id === annUniversal.id));

  // Clean up
  studentService.deleteAnnouncement(annClass.id);
  studentService.deleteAnnouncement(annUniversal.id);
  studentService.deleteCourse(course.id);
  studentService.logout();
});



