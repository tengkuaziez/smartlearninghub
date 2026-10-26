import React, { useState } from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  Calendar, 
  FileText, 
  QrCode, 
  Award, 
  Megaphone, 
  Clock, 
  MapPin, 
  User, 
  Download, 
  ExternalLink, 
  Video, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Info
} from 'lucide-react';
import { Badge, SubmissionStatusBadge, AttendanceStatusBadge } from '../common/Badge.tsx';
import { RpsView } from './RpsView.tsx';
import { 
  getAssignmentSubmissionStatus, 
  calculateAttendanceStats, 
  calculatePublishedAverage, 
  formatIndonesianDate 
} from '../../utils/academicCalculations.ts';
import type { 
  CourseClass, 
  Meeting, 
  Assignment, 
  AssignmentSubmission, 
  AttendanceRecord, 
  GradeItem, 
  Announcement 
} from '../../types/index.ts';

interface ClassDetailViewProps {
  course: CourseClass;
  meetings: Meeting[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  attendanceRecords: AttendanceRecord[];
  grades: GradeItem[];
  announcements: Announcement[];
  onBack: () => void;
  onOpenMeeting: (meetingId: string) => void;
  onOpenAssignment: (assignmentId: string) => void;
  onOpenAttendanceCheckIn: () => void;
}

export type ClassTab = 
  | 'ringkasan'
  | 'pertemuan'
  | 'rps'
  | 'materi'
  | 'tugas'
  | 'absensi'
  | 'nilai'
  | 'pengumuman';

export const ClassDetailView: React.FC<ClassDetailViewProps> = ({
  course,
  meetings,
  assignments,
  submissions,
  attendanceRecords,
  grades,
  announcements,
  onBack,
  onOpenMeeting,
  onOpenAssignment,
  onOpenAttendanceCheckIn,
}) => {
  const [activeTab, setActiveTab] = useState<ClassTab>('ringkasan');

  // Filter strictly to this class
  const classMeetings = meetings.filter((m) => m.courseId === course.id);
  const classAssignments = assignments.filter((a) => a.courseId === course.id);
  const classAttendance = attendanceRecords.filter((r) => r.courseId === course.id);
  const classGrades = grades.filter((g) => g.courseId === course.id);
  const classAnnouncements = announcements.filter((a) => a.courseId === course.id);

  // Extract all materials from this course's meetings
  const allMaterials = classMeetings.flatMap((m) => m.materials || []);

  // Stats
  const attendanceStats = calculateAttendanceStats(classAttendance, course.completedMeetings);
  const gradeStats = calculatePublishedAverage(classGrades);
  const progressPercent = Math.round((course.completedMeetings / course.totalMeetings) * 100);

  const tabs = [
    { id: 'ringkasan' as ClassTab, label: 'Ringkasan', icon: BookOpen },
    { id: 'rps' as ClassTab, label: 'RPS & Silabus', icon: FileText },
    { id: 'pertemuan' as ClassTab, label: `Pertemuan (${classMeetings.length})`, icon: Calendar },
    { id: 'materi' as ClassTab, label: `Materi (${allMaterials.length})`, icon: FileText },
    { id: 'tugas' as ClassTab, label: `Tugas (${classAssignments.length})`, icon: FileText },
    { id: 'absensi' as ClassTab, label: 'Absensi', icon: QrCode },
    { id: 'nilai' as ClassTab, label: 'Nilai', icon: Award },
    { id: 'pengumuman' as ClassTab, label: `Pengumuman (${classAnnouncements.length})`, icon: Megaphone },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Kelas Saya</span>
        </button>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 font-mono">
          {course.code}
        </span>
      </div>

      {/* Course Banner Header */}
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-6 sm:p-8 shadow-md border border-slate-700/60 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-600 text-white font-mono">
                {course.code}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/15">
                {course.credits} SKS • {course.semester}
              </span>
              <span className="text-xs text-slate-300">
                {course.academicYear}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {course.title}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {course.description}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                {course.scheduleDay}, {course.scheduleTime}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                {course.room}
              </span>
            </div>
          </div>

          {/* Teacher Profile Card inside header */}
          <div className="shrink-0 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-left md:w-72">
            <div className="flex items-center gap-3">
              <img
                src={course.teacher.avatarUrl}
                alt={course.teacher.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-400"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider">
                  Dosen Pengampu
                </p>
                <h4 className="text-sm font-bold text-white truncate">
                  {course.teacher.name}
                </h4>
                <p className="text-[11px] text-slate-300 truncate">
                  {course.teacher.email}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
              <span>Departemen</span>
              <span className="font-medium text-white">{course.teacher.department}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar in Header */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-300 font-medium">Progres Kelas:</span>
            <div className="w-48 h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-400"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-bold text-white">
              {course.completedMeetings}/{course.totalMeetings} Sesi ({progressPercent}%)
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-300">
            <span>Kehadiran: <strong className="text-emerald-400">{attendanceStats.percentage}%</strong></span>
            <span>•</span>
            <span>Rata-rata: <strong className="text-cyan-400">{gradeStats.publishedCount > 0 ? gradeStats.averageScore : '-'}</strong></span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Ringkasan */}
      {activeTab === 'ringkasan' && (
        <div className="space-y-6">
          {/* Quick RPS Access Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-200 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Rencana Pembelajaran Semester (RPS)</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    Kurikulum OBE 2024/2026
                  </span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Lihat capaian lulusan (CPL), sub-CPMK, bobot asesmen resmi (100%), serta matriks rincian 16 pertemuan kuliah.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('rps')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Buka RPS Lengkap &rarr;</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols: Next meeting & Pending Assignments */}
            <div className="lg:col-span-2 space-y-6">
              {/* Next Meeting Box */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between mb-3">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Pertemuan Selanjutnya
                  </span>
                  <button
                    onClick={() => setActiveTab('pertemuan')}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Semua Pertemuan &rarr;
                  </button>
                </h3>

                {classMeetings.length > 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        Pertemuan #{classMeetings[0].meetingNumber}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {classMeetings[0].title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {formatIndonesianDate(classMeetings[0].date)} • {classMeetings[0].startTime} - {classMeetings[0].endTime} WIB ({classMeetings[0].room})
                      </p>
                    </div>

                    <button
                      onClick={() => onOpenMeeting(classMeetings[0].id)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-xs"
                    >
                      Buka Materi & Pertemuan
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Belum ada jadwal pertemuan terpublikasi.</p>
                )}
              </div>

              {/* Assignments for this class */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between mb-3">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Tugas & Evaluasi Kelas
                  </span>
                  <button
                    onClick={() => setActiveTab('tugas')}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Detail Tugas &rarr;
                  </button>
                </h3>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classAssignments.slice(0, 3).map((asg) => {
                    const sub = submissions.find((s) => s.assignmentId === asg.id);
                    const status = getAssignmentSubmissionStatus(asg, sub);
                    return (
                      <div key={asg.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <SubmissionStatusBadge status={status} />
                            <span className="text-[11px] text-slate-400">
                              Tenggat: {formatIndonesianDate(asg.deadline, true)}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            {asg.title}
                          </h4>
                        </div>
                        <button
                          onClick={() => onOpenAssignment(asg.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0"
                        >
                          Lihat
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right col: Attendance Snapshot & Announcements */}
            <div className="space-y-6">
              {/* Attendance Card */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  Presensi Kehadiran
                </h3>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {attendanceStats.percentage}%
                  </span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                    {attendanceStats.statusLabel}
                  </p>
                  <div className="grid grid-cols-4 gap-2 mt-4 text-center text-xs">
                    <div className="p-1.5 rounded bg-white dark:bg-slate-800">
                      <span className="block font-bold text-slate-900 dark:text-white">{attendanceStats.hadir}</span>
                      <span className="text-[10px] text-slate-400">Hadir</span>
                    </div>
                    <div className="p-1.5 rounded bg-white dark:bg-slate-800">
                      <span className="block font-bold text-slate-900 dark:text-white">{attendanceStats.izin}</span>
                      <span className="text-[10px] text-slate-400">Izin</span>
                    </div>
                    <div className="p-1.5 rounded bg-white dark:bg-slate-800">
                      <span className="block font-bold text-slate-900 dark:text-white">{attendanceStats.sakit}</span>
                      <span className="text-[10px] text-slate-400">Sakit</span>
                    </div>
                    <div className="p-1.5 rounded bg-white dark:bg-slate-800">
                      <span className="block font-bold text-slate-900 dark:text-white">{attendanceStats.alpa}</span>
                      <span className="text-[10px] text-slate-400">Alpa</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onOpenAttendanceCheckIn}
                  className="w-full mt-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  Presensi QR Mahasiswa
                </button>
              </div>

              {/* Class Announcements */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <Megaphone className="w-4 h-4 text-amber-500" />
                  Pengumuman Kelas
                </h3>
                {classAnnouncements.length > 0 ? (
                  <div className="space-y-3">
                    {classAnnouncements.map((ann) => (
                      <div key={ann.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                        <span className="text-[10px] text-slate-400 block mb-1">
                          {formatIndonesianDate(ann.date)}
                        </span>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                          {ann.title}
                        </h4>
                        <p className="text-slate-600 dark:text-slate-400 line-clamp-2">
                          {ann.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Belum ada pengumuman untuk kelas ini.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab RPS */}
      {activeTab === 'rps' && (
        <RpsView course={course} meetings={classMeetings} />
      )}

      {/* Tab 2: Pertemuan */}
      {activeTab === 'pertemuan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Daftar Seluruh Pertemuan ({classMeetings.length})
            </h3>
            <span className="text-xs text-slate-400">
              Klik pada pertemuan untuk melihat materi, video, dan panduan belajar
            </span>
          </div>

          <div className="space-y-3">
            {classMeetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => onOpenMeeting(meeting.id)}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                      #{meeting.meetingNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono font-medium text-slate-500">
                          {formatIndonesianDate(meeting.date)} • {meeting.startTime} - {meeting.endTime} WIB
                        </span>
                        {(() => {
                          const user = studentService.getCurrentUser();
                          const rec = classAttendance.find(
                            (r) =>
                              (r.meetingId === meeting.id || r.meetingNumber === meeting.meetingNumber) &&
                              r.studentEmail?.toLowerCase() === user.email.toLowerCase()
                          );
                          const isLive = studentService.getAttendanceSessions().some(
                            (s) => s.courseId === course.id && s.meetingId === meeting.id && s.isOpen
                          );
                          if (rec) {
                            return (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Hadir Sah
                              </span>
                            );
                          }
                          if (isLive) {
                            return (
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Presensi QR Dibuka
                              </span>
                            );
                          }
                          return null;
                        })()}
                        {meeting.isCompletedByStudent && (
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Dipelajari
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {meeting.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {meeting.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs text-slate-400">
                      {meeting.materials?.length || 0} Materi
                    </span>
                    <button
                      type="button"
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs"
                    >
                      Buka Sesi
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Materi */}
      {activeTab === 'materi' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Koleksi Materi Kuliah ({allMaterials.length})
            </h3>
            <span className="text-xs text-slate-400">
              PDF, Video Interaktif, dan Publikasi Heyzine
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allMaterials.map((mat) => (
              <div
                key={mat.id}
                onClick={() => onOpenMeeting(mat.meetingId)}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {mat.type}
                    </span>
                    {mat.durationMinutes && (
                      <span className="text-[11px] text-slate-400">
                        {mat.durationMinutes} menit
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                    {mat.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    {mat.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  <span>Lihat di Pertemuan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Tugas */}
      {activeTab === 'tugas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tugas Mata Kuliah Ini ({classAssignments.length})
            </h3>
          </div>

          <div className="space-y-3">
            {classAssignments.map((asg) => {
              const sub = submissions.find((s) => s.assignmentId === asg.id);
              const status = getAssignmentSubmissionStatus(asg, sub);
              return (
                <div
                  key={asg.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <SubmissionStatusBadge status={status} />
                      <span className="text-xs text-slate-400">
                        Tenggat: {formatIndonesianDate(asg.deadline, true)}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {asg.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {asg.instructions}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {sub?.grade !== undefined && (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                        Skor: {sub.grade}/100
                      </span>
                    )}
                    <button
                      onClick={() => onOpenAssignment(asg.id)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    >
                      {sub ? 'Detail Pengumpulan' : 'Kumpulkan Tugas'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 5: Absensi */}
      {activeTab === 'absensi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-medium">Persentase Kehadiran</span>
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                {attendanceStats.percentage}%
              </p>
              <span className="text-[11px] text-slate-500">{attendanceStats.statusLabel}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-medium">Hadir Tepat Waktu</span>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">{attendanceStats.hadir}</p>
              <span className="text-[11px] text-slate-500">pertemuan</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-medium">Izin / Sakit</span>
              <p className="text-3xl font-extrabold text-amber-600 mt-1">{attendanceStats.izin + attendanceStats.sakit}</p>
              <span className="text-[11px] text-slate-500">pertemuan</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-medium">Alpa (Tanpa Keterangan)</span>
              <p className="text-3xl font-extrabold text-rose-600 mt-1">{attendanceStats.alpa}</p>
              <span className="text-[11px] text-slate-500">pertemuan</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Riwayat Presensi Kuliah
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="pb-3 px-3">Sesi</th>
                    <th className="pb-3 px-3">Topik Pertemuan</th>
                    <th className="pb-3 px-3">Tanggal</th>
                    <th className="pb-3 px-3">Waktu Presensi</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Metode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classAttendance.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold font-mono">#{rec.meetingNumber}</td>
                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">{rec.meetingTitle}</td>
                      <td className="py-3 px-3 text-slate-500">{rec.date}</td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">{rec.timestamp}</td>
                      <td className="py-3 px-3"><AttendanceStatusBadge status={rec.status} /></td>
                      <td className="py-3 px-3 text-slate-500">
                        {rec.method === 'qr_scan' ? 'Scan QR' : 'Kode Manual'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Nilai */}
      {activeTab === 'nilai' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Ketentuan Transparansi Penilaian Mahasiswa</p>
              <p className="mt-0.5 leading-relaxed text-blue-800 dark:text-blue-300">
                Nilai yang ditampilkan pada portal ini dihitung secara eksklusif dari komponen penilaian yang telah resmi dipublikasikan oleh dosen pengampu. Komponen yang belum dipublikasikan tidak akan memengaruhi rata-rata sementara.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Rincian Komponen Nilai & Tugas Kuliah
                </h4>
                <p className="text-xs text-slate-400">
                  Rata-rata Nilai Matkul Ini: <strong>{gradeStats.publishedCount > 0 ? `${gradeStats.averageScore} / 100` : '-'}</strong> {gradeStats.publishedCount > 0 && `(Grade ${gradeStats.letterGrade})`}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="pb-3 px-3">Komponen</th>
                    <th className="pb-3 px-3">Kategori</th>
                    <th className="pb-3 px-3">Bobot</th>
                    <th className="pb-3 px-3">Skor Diperoleh</th>
                    <th className="pb-3 px-3">Status Publikasi</th>
                    <th className="pb-3 px-3">Catatan Dosen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classGrades.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{g.title}</td>
                      <td className="py-3 px-3 font-mono">{g.category}</td>
                      <td className="py-3 px-3 font-medium">{g.weightPercentage}%</td>
                      <td className="py-3 px-3 font-bold text-sm">
                        {g.isPublished ? `${g.score}/${g.maxScore}` : '-'}
                      </td>
                      <td className="py-3 px-3">
                        {g.isPublished ? (
                          <Badge variant="success" dot>Dipublikasikan</Badge>
                        ) : (
                          <Badge variant="neutral">Menunggu Penilaian</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {g.feedback || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Pengumuman */}
      {activeTab === 'pengumuman' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Pengumuman Resmi Kelas ({classAnnouncements.length})
            </h3>
          </div>

          {classAnnouncements.length > 0 ? (
            <div className="space-y-3">
              {classAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {ann.authorRole}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatIndonesianDate(ann.date, true)}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {ann.title}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-line leading-relaxed">
                    {ann.content}
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>Oleh: <strong>{ann.authorName}</strong></span>
                    {ann.relatedMeetingId && (
                      <button
                        onClick={() => onOpenMeeting(ann.relatedMeetingId!)}
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        Buka Pertemuan Terkait &rarr;
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              Belum ada pengumuman khusus untuk mata kuliah ini.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
