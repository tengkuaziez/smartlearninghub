import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculatePublishedAverage, 
  calculateCourseGradeAverage,
  getAssignmentSubmissionStatus, 
  calculateAttendanceStats, 
  validateEmailAccess 
} from './academicCalculations.ts';
import type { GradeItem, Assignment, AssignmentSubmission, AttendanceRecord, CourseClass } from '../types/index.ts';

test('calculatePublishedAverage handles empty or unpublished grades', () => {
  const emptyResult = calculatePublishedAverage([]);
  assert.equal(emptyResult.averageScore, 0);
  assert.equal(emptyResult.publishedCount, 0);
  assert.equal(emptyResult.letterGrade, '-');

  const unpublishedGrades: GradeItem[] = [
    {
      id: 'g1',
      courseId: 'c1',
      title: 'Ujian Tengah Semester',
      category: 'UTS',
      score: 90,
      maxScore: 100,
      weightPercentage: 30,
      isPublished: false,
    },
  ];
  const res2 = calculatePublishedAverage(unpublishedGrades);
  assert.equal(res2.publishedCount, 0);
  assert.equal(res2.averageScore, 0);
});

test('calculatePublishedAverage computes weighted average and 4.0 scale accurately', () => {
  const grades: GradeItem[] = [
    {
      id: 'g1',
      courseId: 'c1',
      title: 'Tugas 1',
      category: 'Tugas',
      score: 90,
      maxScore: 100,
      weightPercentage: 20,
      isPublished: true,
    },
    {
      id: 'g2',
      courseId: 'c1',
      title: 'Kuis 1',
      category: 'Kuis',
      score: 80,
      maxScore: 100,
      weightPercentage: 20,
      isPublished: true,
    },
    {
      id: 'g3',
      courseId: 'c1',
      title: 'Draft Proyek (Unpublished)',
      category: 'Proyek',
      score: 50,
      maxScore: 100,
      weightPercentage: 60,
      isPublished: false, // Must be ignored!
    },
  ];

  const result = calculatePublishedAverage(grades);
  assert.equal(result.publishedCount, 2);
  // (90*20 + 80*20) / 40 = 85
  assert.equal(result.averageScore, 85);
  assert.equal(result.gpaScale4, 4.0);
  assert.equal(result.letterGrade, 'A');
});

test('getAssignmentSubmissionStatus handles missing, late, graded, and revision statuses', () => {
  const futureAssignment: Assignment = {
    id: 'a1',
    courseId: 'c1',
    title: 'Tugas Frontend',
    instructions: 'Buat komponen UI',
    deadline: '2026-12-31T23:59:59Z',
    allowedFormats: ['.zip', '.pdf'],
    maxFileSizeMb: 25,
    allowTextResponse: true,
    allowResubmission: true,
    latePenaltyPolicy: '10% per hari',
    isPublished: true,
  };

  const refDate = new Date('2026-10-19T00:00:00Z');

  // No submission, future deadline -> belum_dikerjakan
  assert.equal(getAssignmentSubmissionStatus(futureAssignment, undefined, refDate), 'belum_dikerjakan');

  // Past deadline without submission -> terlambat
  const pastAssignment: Assignment = {
    ...futureAssignment,
    deadline: '2026-10-10T23:59:59Z',
  };
  assert.equal(getAssignmentSubmissionStatus(pastAssignment, undefined, refDate), 'terlambat');

  // Submitted on time -> sudah_dikumpulkan
  const submission: AssignmentSubmission = {
    id: 's1',
    assignmentId: 'a1',
    studentId: 'stud1',
    submittedAt: '2026-10-15T10:00:00Z',
    status: 'sudah_dikumpulkan',
    isLate: false,
  };
  assert.equal(getAssignmentSubmissionStatus(pastAssignment, submission, refDate), 'sudah_dikumpulkan');

  // Submitted and graded -> sudah_dinilai
  const gradedSubmission: AssignmentSubmission = {
    ...submission,
    grade: 95,
  };
  assert.equal(getAssignmentSubmissionStatus(pastAssignment, gradedSubmission, refDate), 'sudah_dinilai');
});

test('calculateAttendanceStats calculates percentage and counts correctly', () => {
  const records: AttendanceRecord[] = [
    { id: '1', sessionId: 's1', courseId: 'c1', studentId: 'std1', meetingNumber: 1, meetingTitle: 'M1', date: '2026-09-01', timestamp: '08:05', status: 'hadir', method: 'qr_scan' },
    { id: '2', sessionId: 's2', courseId: 'c1', studentId: 'std1', meetingNumber: 2, meetingTitle: 'M2', date: '2026-09-08', timestamp: '08:02', status: 'hadir', method: 'qr_scan' },
    { id: '3', sessionId: 's3', courseId: 'c1', studentId: 'std1', meetingNumber: 3, meetingTitle: 'M3', date: '2026-09-15', timestamp: '08:00', status: 'izin', method: 'manual_code' },
    { id: '4', sessionId: 's4', courseId: 'c1', studentId: 'std1', meetingNumber: 4, meetingTitle: 'M4', date: '2026-09-22', timestamp: '08:00', status: 'hadir', method: 'qr_scan' },
  ];

  const stats = calculateAttendanceStats(records, 4);
  assert.equal(stats.hadir, 3);
  assert.equal(stats.izin, 1);
  assert.equal(stats.sakit, 0);
  assert.equal(stats.alpa, 0);
  assert.equal(stats.percentage, 75);
});

test('validateEmailAccess recognizes locked lecturer emails and whitelisted student emails', () => {
  const lecturerEmails = ['dosen.utama@smartlearning.ac.id', 'dosen.partner@smartlearning.ac.id'];
  const mockCourses = [
    {
      id: 'c1',
      code: 'IF3101',
      title: 'Pemrograman Web Lanjut',
      description: '',
      teacher: { id: 't1', name: 'Dosen 1', title: '', email: 'dosen.utama@smartlearning.ac.id', avatarUrl: '', department: '' },
      semester: '5',
      academicYear: '2026/2027',
      room: '',
      scheduleTime: '',
      scheduleDay: '',
      totalMeetings: 16,
      completedMeetings: 8,
      colorScheme: 'blue',
      enrolledStudentEmails: ['altaf.aziz@student.ac.id', 'budi.santoso@student.ac.id'],
    },
    {
      id: 'c2',
      code: 'IF3102',
      title: 'Kecerdasan Buatan',
      description: '',
      teacher: { id: 't2', name: 'Dosen 2', title: '', email: 'dosen.partner@smartlearning.ac.id', avatarUrl: '', department: '' },
      semester: '5',
      academicYear: '2026/2027',
      room: '',
      scheduleTime: '',
      scheduleDay: '',
      totalMeetings: 16,
      completedMeetings: 7,
      colorScheme: 'indigo',
      enrolledStudentEmails: ['altaf.aziz@student.ac.id'], // altaf is in both courses!
    },
  ] as CourseClass[];

  // 1. Lecturer Email detection
  const resLecturer = validateEmailAccess('dosen.utama@smartlearning.ac.id', mockCourses, lecturerEmails);
  assert.equal(resLecturer.allowed, true);
  assert.equal(resLecturer.role, 'dosen');

  // 2. Student enrolled in 2 courses
  const resStudentBoth = validateEmailAccess('altaf.aziz@student.ac.id', mockCourses, lecturerEmails);
  assert.equal(resStudentBoth.allowed, true);
  assert.equal(resStudentBoth.role, 'mahasiswa');
  assert.equal(resStudentBoth.matchedCourses.length, 2);

  // 3. Unregistered random email
  const resRandom = validateEmailAccess('random.person@gmail.com', mockCourses, lecturerEmails);
  assert.equal(resRandom.allowed, false);
  assert.match(resRandom.message || '', /belum didaftarkan/i);
});

test('calculateCourseGradeAverage computes per-course score accurately without IPK', () => {
  const grades: GradeItem[] = [
    { id: 'g1', courseId: 'c1', title: 'Tugas 1', category: 'Tugas', score: 92, maxScore: 100, weightPercentage: 20, isPublished: true },
    { id: 'g2', courseId: 'c1', title: 'Tugas 2', category: 'Tugas', score: 88, maxScore: 100, weightPercentage: 20, isPublished: true },
    { id: 'g3', courseId: 'c2', title: 'Tugas Lain', category: 'Tugas', score: 70, maxScore: 100, weightPercentage: 30, isPublished: true },
  ];

  const c1Stats = calculateCourseGradeAverage(grades, 'c1');
  assert.equal(c1Stats.gradedCount, 2);
  assert.equal(c1Stats.averageScore, 90);
  assert.equal(c1Stats.letterGrade, 'A');

  const c2Stats = calculateCourseGradeAverage(grades, 'c2');
  assert.equal(c2Stats.gradedCount, 1);
  assert.equal(c2Stats.averageScore, 70);
  assert.equal(c2Stats.letterGrade, 'B');
});
