import type { 
  GradeItem, 
  Assignment, 
  AssignmentSubmission, 
  SubmissionStatus, 
  AttendanceRecord, 
  CourseClass 
} from '../types/index.ts';

/**
 * Menghitung rata-rata nilai khusus untuk 1 mata kuliah tertentu.
 * Mengabaikan komponen yang belum dipublikasikan dosen.
 * Murni skala 0 - 100 tanpa konsep/istilah IPK.
 */
export function calculateCourseGradeAverage(grades: GradeItem[], courseId?: string): {
  averageScore: number;
  letterGrade: string;
  totalWeight: number;
  gradedCount: number;
  pendingCount: number;
} {
  const filtered = courseId ? grades.filter((g) => g.courseId === courseId) : grades;
  const published = filtered.filter((g) => g.isPublished && g.maxScore > 0);
  const pendingCount = filtered.filter((g) => !g.isPublished).length;

  if (published.length === 0) {
    return {
      averageScore: 0,
      letterGrade: '-',
      totalWeight: 0,
      gradedCount: 0,
      pendingCount,
    };
  }

  const totalWeight = published.reduce((acc, curr) => acc + (curr.weightPercentage || 0), 0);

  let averageScore = 0;
  if (totalWeight > 0) {
    const weightedSum = published.reduce((acc, curr) => {
      const percentage = (curr.score / curr.maxScore) * 100;
      return acc + percentage * (curr.weightPercentage / totalWeight);
    }, 0);
    averageScore = Math.round(weightedSum * 10) / 10;
  } else {
    const sum = published.reduce((acc, curr) => acc + (curr.score / curr.maxScore) * 100, 0);
    averageScore = Math.round((sum / published.length) * 10) / 10;
  }

  let letterGrade = 'E';
  if (averageScore >= 85) letterGrade = 'A';
  else if (averageScore >= 80) letterGrade = 'A-';
  else if (averageScore >= 75) letterGrade = 'B+';
  else if (averageScore >= 70) letterGrade = 'B';
  else if (averageScore >= 65) letterGrade = 'B-';
  else if (averageScore >= 60) letterGrade = 'C';
  else if (averageScore >= 50) letterGrade = 'D';

  return {
    averageScore,
    letterGrade,
    totalWeight,
    gradedCount: published.length,
    pendingCount,
  };
}

/**
 * Calculates average and GPA from published grades only.
 * Ignores any grade item where isPublished is false.
 */
export function calculatePublishedAverage(grades: GradeItem[]): {
  averageScore: number;
  gpaScale4: number;
  letterGrade: string;
  totalWeight: number;
  publishedCount: number;
} {
  const published = grades.filter((g) => g.isPublished && g.maxScore > 0);

  if (published.length === 0) {
    return {
      averageScore: 0,
      gpaScale4: 0,
      letterGrade: '-',
      totalWeight: 0,
      publishedCount: 0,
    };
  }

  const totalWeight = published.reduce((acc, curr) => acc + (curr.weightPercentage || 0), 0);

  let averageScore = 0;
  if (totalWeight > 0) {
    // Weighted calculation
    const weightedSum = published.reduce((acc, curr) => {
      const percentage = (curr.score / curr.maxScore) * 100;
      return acc + percentage * (curr.weightPercentage / totalWeight);
    }, 0);
    averageScore = Math.round(weightedSum * 10) / 10;
  } else {
    // Simple average if no weights configured
    const sum = published.reduce((acc, curr) => acc + (curr.score / curr.maxScore) * 100, 0);
    averageScore = Math.round((sum / published.length) * 10) / 10;
  }

  // Indonesian University Standard Scale (4.0)
  let gpaScale4 = 0;
  let letterGrade = 'E';

  if (averageScore >= 85) {
    gpaScale4 = 4.0;
    letterGrade = 'A';
  } else if (averageScore >= 80) {
    gpaScale4 = 3.7;
    letterGrade = 'A-';
  } else if (averageScore >= 75) {
    gpaScale4 = 3.3;
    letterGrade = 'B+';
  } else if (averageScore >= 70) {
    gpaScale4 = 3.0;
    letterGrade = 'B';
  } else if (averageScore >= 65) {
    gpaScale4 = 2.7;
    letterGrade = 'B-';
  } else if (averageScore >= 60) {
    gpaScale4 = 2.0;
    letterGrade = 'C';
  } else if (averageScore >= 50) {
    gpaScale4 = 1.0;
    letterGrade = 'D';
  } else {
    gpaScale4 = 0.0;
    letterGrade = 'E';
  }

  return {
    averageScore,
    gpaScale4,
    letterGrade,
    totalWeight,
    publishedCount: published.length,
  };
}

/**
 * Determines assignment submission status considering deadlines and existing submissions.
 */
export function getAssignmentSubmissionStatus(
  assignment: Assignment,
  submission?: AssignmentSubmission,
  referenceDate: Date = new Date()
): SubmissionStatus {
  if (submission) {
    if (submission.grade !== undefined && submission.grade !== null) {
      return 'sudah_dinilai';
    }
    if (submission.status === 'perlu_revisi') {
      return 'perlu_revisi';
    }
    if (submission.isLate) {
      return 'terlambat';
    }
    return 'sudah_dikumpulkan';
  }

  const deadline = new Date(assignment.deadline);
  if (!isNaN(deadline.getTime()) && deadline.getTime() < referenceDate.getTime()) {
    return 'terlambat';
  }

  return 'belum_dikerjakan';
}

/**
 * Calculates attendance metrics for a student in a class.
 */
export function calculateAttendanceStats(
  records: AttendanceRecord[],
  totalMeetingsConducted: number
): {
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  percentage: number;
  statusLabel: string;
} {
  const hadir = records.filter((r) => r.status === 'hadir').length;
  const izin = records.filter((r) => r.status === 'izin').length;
  const sakit = records.filter((r) => r.status === 'sakit').length;
  const alpa = records.filter((r) => r.status === 'alpa').length;

  const total = totalMeetingsConducted > 0 ? totalMeetingsConducted : records.length;
  const percentage = total > 0 ? Math.round((hadir / total) * 100) : 100;

  let statusLabel = 'Aman';
  if (percentage < 75) {
    statusLabel = 'Peringatan: Kehadiran di bawah 75%';
  } else if (percentage >= 90) {
    statusLabel = 'Sangat Baik';
  }

  return {
    hadir,
    izin,
    sakit,
    alpa,
    percentage,
    statusLabel,
  };
}

/**
 * Validates whether an email is permitted to register/login.
 * Only emails registered by the 2 lecturers or in the lecturer whitelist are permitted.
 */
export function validateEmailAccess(
  emailInput: string,
  courses: CourseClass[],
  lecturerEmails: string[]
): {
  allowed: boolean;
  role: 'dosen' | 'mahasiswa';
  message?: string;
  matchedCourses: CourseClass[];
} {
  const normalized = emailInput.trim().toLowerCase();

  if (!normalized) {
    return {
      allowed: false,
      role: 'mahasiswa',
      message: 'Email wajib diisi.',
      matchedCourses: [],
    };
  }

  // Check if it's one of the 2 locked lecturer emails
  if (lecturerEmails.map((e) => e.toLowerCase()).includes(normalized)) {
    return {
      allowed: true,
      role: 'dosen',
      message: 'Terdeteksi sebagai Akun Tim Dosen Pengampu.',
      matchedCourses: courses,
    };
  }

  // Check if enrolled in any of the lecturers' courses
  const matched = courses.filter((c) =>
    c.enrolledStudentEmails?.map((e) => e.toLowerCase()).includes(normalized)
  );

  if (matched.length > 0) {
    return {
      allowed: true,
      role: 'mahasiswa',
      message: `Terdaftar pada ${matched.length} kelas kuliah.`,
      matchedCourses: matched,
    };
  }

  return {
    allowed: false,
    role: 'mahasiswa',
    message: 'Email Anda belum didaftarkan oleh Dosen pada mata kuliah manapun. Hubungi tim dosen untuk menambahkan email Anda ke kelas.',
    matchedCourses: [],
  };
}

/**
 * Human-friendly date and time formatter in Indonesian (WIB).
 */
export function formatIndonesianDate(dateStr: string, includeTime = false): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const dayName = days[d.getDay()];
    const dateNum = d.getDate();
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();

    if (includeTime) {
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${dayName}, ${dateNum} ${monthName} ${year} • ${hours}:${mins} WIB`;
    }

    return `${dayName}, ${dateNum} ${monthName} ${year}`;
  } catch {
    return dateStr;
  }
}
