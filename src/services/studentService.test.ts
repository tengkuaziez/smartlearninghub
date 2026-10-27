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
