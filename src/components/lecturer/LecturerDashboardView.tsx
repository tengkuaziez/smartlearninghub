import React from 'react';
import { 
  BookOpen, 
  Users, 
  FileCheck2, 
  QrCode, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  UserPlus, 
  ChevronRight, 
  Award,
  CheckCircle2,
  Cloud,
  FileSpreadsheet
} from 'lucide-react';
import type { 
  AuthUser, 
  CourseClass, 
  Assignment, 
  AssignmentSubmission, 
  AttendanceSession 
} from '../../types/index.ts';
import { formatIndonesianDate } from '../../utils/academicCalculations.ts';

interface LecturerDashboardViewProps {
  user: AuthUser;
  courses: CourseClass[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  sessions: AttendanceSession[];
  onOpenCourse: (courseId: string) => void;
  onOpenQrBroadcast: (session: AttendanceSession) => void;
  onNavigate: (tab: string) => void;
  onOpenGoogleModal?: () => void;
}

export const LecturerDashboardView: React.FC<LecturerDashboardViewProps> = ({
  user,
  courses,
  assignments,
  submissions,
  sessions,
  onOpenCourse,
  onOpenQrBroadcast,
  onNavigate,
  onOpenGoogleModal,
}) => {
  // Stats
  const totalCourses = courses.length;
  const totalEnrolledSeats = courses.reduce(
    (acc, c) => acc + (c.enrolledStudentEmails?.length || 0),
    0
  );

  const pendingGrading = submissions.filter((s) => s.grade === undefined);
  const activeSession = sessions.find((s) => s.isOpen);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 sm:p-8 text-white shadow-lg border border-slate-800">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Portal Manajemen Tim Dosen</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {user.name}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Platform ini digunakan bersama oleh tim dua dosen pengampu untuk mengelola materi, daftar email mahasiswa, presensi QR kelas, dan penilaian tugas terpadu.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            {courses.length > 0 && (
              <button
                onClick={() => onOpenCourse(courses[0].id)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
              >
                Kelola Mahasiswa Kelas &rarr;
              </button>
            )}

            {activeSession ? (
              <button
                onClick={() => onOpenQrBroadcast(activeSession)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                <span>Buka Proyektor QR Aktif</span>
              </button>
            ) : (
              <button
                onClick={() => courses.length > 0 && onOpenCourse(courses[0].id)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-xs flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                <span>Buka Sesi Presensi QR</span>
              </button>
            )}

            {onOpenGoogleModal && (
              <button
                onClick={onOpenGoogleModal}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 flex items-center gap-2 transition-all"
                title="Integrasi Google Drive & Backup Spreadsheet"
              >
                <Cloud className="w-4 h-4 text-emerald-300" />
                <span>Drive & Backup Sheets</span>
              </button>
            )}
          </div>
        </div>

        <div className="absolute -right-8 -bottom-12 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Classes */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              Mata Kuliah Diampu
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {totalCourses}
            </span>
            <span className="text-xs text-slate-400">kelas aktif</span>
          </div>
          <p className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
            Tim 2 Dosen Pengampu
          </p>
        </div>

        {/* Total Enrolled Students */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              Total Mahasiswa Terdaftar
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {totalEnrolledSeats}
            </span>
            <span className="text-xs text-slate-400">kursi terisi</span>
          </div>
          <p className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
            Whitelist email dosen
          </p>
        </div>

        {/* Submissions Needing Grading */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              Tugas Perlu Dikoreksi
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {pendingGrading.length}
            </span>
            <span className="text-xs text-slate-400">berkas tugas</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            Menunggu review & nilai
          </p>
        </div>

        {/* QR Session */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              Presensi Tatap Muka
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {activeSession ? 'Aktif' : 'Tutup'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {activeSession ? 'Siap scan proyektor' : 'Buka sesi di kelas'}
          </p>
        </div>
      </div>

      {/* Cloud & Spreadsheet Backup Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-200 dark:border-emerald-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Penyimpanan Google Drive & Cadangan Spreadsheet</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Penyimpanan Otomatis
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Simpan semua berkas tugas mahasiswa langsung ke Google Drive dosen dan buat lembar rekapitulasi presensi 16 pertemuan di Google Sheets dengan satu klik.
            </p>
          </div>
        </div>
        {onOpenGoogleModal && (
          <button
            onClick={onOpenGoogleModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Cloud className="w-4 h-4" />
            <span>Kelola Integrasi & Cadangkan Data &rarr;</span>
          </button>
        )}
      </div>

      {/* Course List Managed by Tim Dosen */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Mata Kuliah yang Kami Ampu
          </h2>
          <span className="text-xs text-slate-400">
            Klik kelas untuk menambah email mahasiswa, mengunggah materi, dan memeriksa tugas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div
              key={course.id}
              onClick={() => onOpenCourse(course.id)}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {course.code}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {course.scheduleDay}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">
                  {course.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                  {course.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      <span>Mahasiswa Terdaftar:</span>
                    </span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {course.enrolledStudentEmails?.length || 0} orang
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Jadwal Ruang:</span>
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[140px]">
                      {course.room}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold">
                <span>Kelola Kelas & Mahasiswa</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submissions Waiting For Grading */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Pengumpulan Tugas Mahasiswa Menunggu Koreksi</span>
          </h3>
          <span className="text-xs text-slate-400">
            {pendingGrading.length} tugas menunggu
          </span>
        </div>

        {pendingGrading.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingGrading.map((sub) => {
              const asg = assignments.find((a) => a.id === sub.assignmentId);
              const course = courses.find((c) => c.id === asg?.courseId);

              return (
                <div key={sub.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {course?.code || 'IF'}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {asg?.title}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {sub.studentName} ({sub.studentEmail})
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Diserahkan: {formatIndonesianDate(sub.submittedAt, true)} • Berkas: <span className="font-mono text-slate-600 dark:text-slate-300">{sub.fileName}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => course && onOpenCourse(course.id)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shrink-0 flex items-center gap-1.5"
                  >
                    <span>Koreksi di Kelas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 text-xs">
            Seluruh tugas yang dikumpulkan mahasiswa telah selesai dinilai!
          </div>
        )}
      </div>
    </div>
  );
};
