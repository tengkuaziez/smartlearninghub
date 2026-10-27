import React from 'react';
import { 
  BookOpen, 
  Clock, 
  Calendar, 
  Award, 
  ArrowRight, 
  ChevronRight, 
  User, 
  FileText, 
  CheckCircle2, 
  Megaphone, 
  History,
  Sparkles
} from 'lucide-react';
import { Badge, SubmissionStatusBadge } from '../common/Badge.tsx';
import { MiniCalendarWidget } from '../common/MiniCalendarWidget.tsx';
import { 
  calculatePublishedAverage, 
  getAssignmentSubmissionStatus, 
  formatIndonesianDate 
} from '../../utils/academicCalculations.ts';
import type { 
  StudentProfile, 
  CourseClass, 
  Meeting, 
  Assignment, 
  AssignmentSubmission, 
  Announcement, 
  GradeItem, 
  ActivityLog 
} from '../../types/index.ts';

interface DashboardViewProps {
  profile: StudentProfile;
  courses: CourseClass[];
  meetings: Meeting[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  announcements: Announcement[];
  grades: GradeItem[];
  activities: ActivityLog[];
  onNavigate: (tab: string, contextId?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  courses,
  meetings,
  assignments,
  submissions,
  announcements,
  grades,
  activities,
  onNavigate,
}) => {
  const activeCoursesCount = courses.length;

  // Unsubmitted assignments
  const pendingAssignments = assignments.filter((a) => {
    const sub = submissions.find((s) => s.assignmentId === a.id);
    const status = getAssignmentSubmissionStatus(a, sub);
    return status === 'belum_dikerjakan' || status === 'terlambat' || status === 'perlu_revisi';
  });

  // Next upcoming meeting
  const upcomingMeetings = [...meetings]
    .filter((m) => m.isPublished && courses.some((c) => c.id === m.courseId))
    .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
  const nextMeeting = upcomingMeetings[0];

  // Published average
  const gradeStats = calculatePublishedAverage(grades);

  // Assignments requiring attention
  const sortedAttentionAssignments = [...assignments]
    .filter((asg) => courses.some((c) => c.id === asg.courseId))
    .map((asg) => {
      const sub = submissions.find((s) => s.assignmentId === asg.id);
      const course = courses.find((c) => c.id === asg.courseId);
      const status = getAssignmentSubmissionStatus(asg, sub);
      return { asg, sub, course, status };
    })
    .sort((a, b) => new Date(a.asg.deadline).getTime() - new Date(b.asg.deadline).getTime())
    .slice(0, 4);

  const recentAnnouncements = announcements.slice(0, 3);
  const nextMeetingCourse = nextMeeting ? courses.find((c) => c.id === nextMeeting.courseId) : undefined;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Section: Welcome Header & Mini Calendar with Realtime Date/Clock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 p-6 sm:p-8 text-white shadow-lg border border-slate-800 h-full flex flex-col justify-center">
            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>Smart Learning Hub — Kelas Tim Dosen</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Selamat Datang, {profile.name}!
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Anda terdaftar pada <strong>{activeCoursesCount} mata kuliah</strong> yang diampu oleh tim dosen kami. Pantau materi, hadiri pertemuan terjadwal, dan kumpulkan tugas tepat waktu.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => onNavigate('kelas')}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
                >
                  Buka Kelas Saya &rarr;
                </button>
                <button
                  onClick={() => onNavigate('absensi')}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all backdrop-blur-xs"
                >
                  Pindai QR Presensi
                </button>
              </div>
            </div>

            <div className="absolute -right-8 -bottom-12 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4">
          <MiniCalendarWidget 
            courses={courses} 
            meetings={meetings} 
            onOpenCourse={(id) => onNavigate('kelas', id)} 
          />
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Active Classes */}
        <div 
          onClick={() => onNavigate('kelas')}
          className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">
              Kelas Saya
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {activeCoursesCount}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">matkul</span>
          </div>
          <p className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
            Lihat kelas &rarr;
          </p>
        </div>

        {/* Pending Tasks */}
        <div 
          onClick={() => onNavigate('tugas')}
          className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">
              Tugas Aktif
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {pendingAssignments.length}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">tugas</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
            Kerjakan &rarr;
          </p>
        </div>

        {/* Upcoming Meetings */}
        <div 
          onClick={() => onNavigate('kalender')}
          className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">
              Sesi Kuliah
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {upcomingMeetings.length}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">pertemuan</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            Jadwal kelas &rarr;
          </p>
        </div>

        {/* Grade Average */}
        <div 
          onClick={() => onNavigate('nilai')}
          className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-cyan-400 dark:hover:border-cyan-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">
              Rata-rata Nilai
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {gradeStats.publishedCount > 0 ? gradeStats.averageScore : '-'}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">skala 100</span>
          </div>
          <p className="mt-1 text-[11px] text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1">
            Buka nilai &rarr;
          </p>
        </div>
      </div>

      {/* Main Grid: Upcoming Meeting & Attention Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Scheduled Meeting Card */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Pertemuan Mendatang
            </h3>
          </div>

          {nextMeeting && nextMeetingCourse ? (
            <div className="flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {nextMeetingCourse.code} • {nextMeetingCourse.title}
                  </span>
                  <span className="text-xs font-mono font-medium text-slate-500">
                    {nextMeeting.startTime} WIB
                  </span>
                </div>

                <h4 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                  {nextMeeting.title}
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {nextMeeting.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatIndonesianDate(nextMeeting.date)}, {nextMeeting.startTime} - {nextMeeting.endTime} WIB</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Dosen: {nextMeetingCourse.teacher.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ruang: {nextMeeting.room}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3">
                <button
                  onClick={() => onNavigate('pertemuan', nextMeeting.id)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  Lihat Pertemuan & Materi
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Tidak ada pertemuan terjadwal
              </p>
            </div>
          )}
        </div>

        {/* Tasks Requiring Attention */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Tugas Memerlukan Perhatian
            </h3>
            <button
              onClick={() => onNavigate('tugas')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Semua Tugas ({assignments.length}) &rarr;
            </button>
          </div>

          <div className="flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
            {sortedAttentionAssignments.map(({ asg, sub, course, status }) => (
              <div
                key={asg.id}
                className="py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {course ? course.code : 'IF'}
                    </span>
                    <SubmissionStatusBadge status={status} />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {asg.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>Tenggat: {formatIndonesianDate(asg.deadline, true)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onNavigate('tugas', asg.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      status === 'sudah_dinilai' || status === 'sudah_dikumpulkan'
                        ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    }`}
                  >
                    <span>
                      {status === 'sudah_dinilai'
                        ? 'Lihat Nilai'
                        : status === 'sudah_dikumpulkan'
                        ? 'Lihat Pengumpulan'
                        : 'Kerjakan Tugas'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Grid: Recent Announcements & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-500" />
              Pengumuman Terbaru Tim Dosen
            </h3>
            <button
              onClick={() => onNavigate('pengumuman')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Lihat Semua &rarr;
            </button>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
            {recentAnnouncements.map((ann) => (
              <div
                key={ann.id}
                onClick={() => onNavigate('pengumuman', ann.id)}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                    {ann.courseTitle || 'Pengumuman Kelas'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatIndonesianDate(ann.date)}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {ann.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {ann.content}
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Oleh: {ann.authorName} ({ann.authorRole})
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Log */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-500" />
              Aktivitas Pembelajaran Terakhir
            </h3>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
            {activities.slice(0, 4).map((act) => (
              <div key={act.id} className="py-3 first:pt-1 last:pb-1 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 text-blue-600 dark:text-blue-400">
                  {act.type === 'submission' && <FileText className="w-4 h-4 text-indigo-500" />}
                  {act.type === 'grade' && <Award className="w-4 h-4 text-emerald-500" />}
                  {act.type === 'attendance' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                  {act.type === 'material' && <BookOpen className="w-4 h-4 text-amber-500" />}
                  {act.type === 'roster' && <User className="w-4 h-4 text-emerald-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {act.title}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {act.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {act.description}
                  </p>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {act.courseTitle}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
