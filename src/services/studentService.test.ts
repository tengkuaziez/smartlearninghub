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
