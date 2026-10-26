import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  Calendar, 
  FileText, 
  QrCode, 
  Megaphone, 
  Award, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Clock,
  MapPin,
  Send,
  Video,
  Download,
  UserCheck,
  UserX,
  Sliders,
  Search,
  X,
  Sparkles
} from 'lucide-react';
import { studentService } from '../../services/studentService.ts';
import { RpsView } from '../classes/RpsView.tsx';
import { formatIndonesianDate } from '../../utils/academicCalculations.ts';
import type { 
  CourseClass, 
  Meeting, 
  Assignment, 
  AssignmentSubmission, 
  AttendanceRecord, 
  AttendanceSession,
  AttendanceStatus,
  Announcement 
} from '../../types/index.ts';

interface LecturerClassDetailViewProps {
  course: CourseClass;
  meetings: Meeting[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  attendanceRecords: AttendanceRecord[];
  attendanceSessions: AttendanceSession[];
  announcements: Announcement[];
  onBack: () => void;
  onOpenQrBroadcast: (session: AttendanceSession) => void;
  onDataUpdated: () => void;
}

export type LecturerClassTab = 
  | 'mahasiswa' 
  | 'pertemuan' 
  | 'rps'
  | 'tugas' 
  | 'presensi' 
  | 'pengumuman';

export const LecturerClassDetailView: React.FC<LecturerClassDetailViewProps> = ({
  course,
  meetings,
  assignments,
  submissions,
  attendanceRecords,
  attendanceSessions,
  announcements,
  onBack,
  onOpenQrBroadcast,
  onDataUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<LecturerClassTab>('mahasiswa');

  // Roster inputs
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [rosterMessage, setRosterMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Grading modal/drawer state
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(85);
  const [gradeFeedback, setGradeFeedback] = useState<string>('');

  // Announcement inputs
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annSuccess, setAnnSuccess] = useState(false);

  // Filters for this class
  const classMeetings = [...meetings.filter((m) => m.courseId === course.id)].sort(
    (a, b) => a.meetingNumber - b.meetingNumber
  );
  const classAssignments = assignments.filter((a) => a.courseId === course.id);
  const classSubmissions = submissions.filter((s) =>
    classAssignments.some((a) => a.id === s.assignmentId)
  );
  const classAnnouncements = announcements.filter((a) => a.courseId === course.id);
  const activeMeetingSession = attendanceSessions.find((s) => s.courseId === course.id && s.isOpen);

  // Attendance management state
  const [selectedMeetingIdForAttendance, setSelectedMeetingIdForAttendance] = useState<string>(() => {
    if (activeMeetingSession) return activeMeetingSession.meetingId;
    const m8 = classMeetings.find((m) => m.meetingNumber === 8);
    if (m8) return m8.id;
    return classMeetings[0]?.id || '';
  });

  const [attendanceRosterFilter, setAttendanceRosterFilter] = useState<'semua' | 'hadir' | 'belum_hadir' | 'izin_sakit'>('semua');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isConfigTotalOpen, setIsConfigTotalOpen] = useState(false);
  const [tempTotalMeetings, setTempTotalMeetings] = useState(course.totalMeetings || 16);

  // Handlers for QR & Attendance per meeting
  const handleToggleSessionForMeeting = (meetingId: string, open: boolean) => {
    const updated = studentService.toggleAttendanceSession(course.id, meetingId, open);
    onDataUpdated();
    if (open) {
      onOpenQrBroadcast(updated);
    }
  };

  const handleManualMark = (meetingId: string, studentEmail: string, status: AttendanceStatus) => {
    studentService.markAttendanceManual(course.id, meetingId, studentEmail, status);
    onDataUpdated();
  };

  const handleSaveTotalMeetings = (e: React.FormEvent) => {
    e.preventDefault();
    studentService.updateCourseTotalMeetings(course.id, tempTotalMeetings);
    setIsConfigTotalOpen(false);
    onDataUpdated();
  };

  // Roster Management Handlers
  const handleAddSingleEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentEmail.trim()) return;

    const res = studentService.addStudentEmailToCourse(course.id, newStudentEmail.trim());
    if (res.success) {
      setRosterMessage({ type: 'success', text: res.message });
      setNewStudentEmail('');
      onDataUpdated();
    } else {
      setRosterMessage({ type: 'error', text: res.message });
    }
    setTimeout(() => setRosterMessage(null), 4000);
  };

  const handleAddBulkEmails = (e: React.FormEvent) => {
    e.preventDefault();
    const rawList = bulkEmails.split(/[\n,;]+/).map((e) => e.trim()).filter((e) => e.length > 0);

    if (rawList.length === 0) return;

    let successCount = 0;
    rawList.forEach((email) => {
      const res = studentService.addStudentEmailToCourse(course.id, email);
      if (res.success) successCount++;
    });

    setRosterMessage({
      type: 'success',
      text: `Berhasil menambahkan ${successCount} mahasiswa ke daftar kelas.`,
    });
    setBulkEmails('');
    setIsBulkMode(false);
    onDataUpdated();
    setTimeout(() => setRosterMessage(null), 4000);
  };

  const handleRemoveEmail = (email: string) => {
    if (confirm(`Hapus ${email} dari daftar kelas ini? Mahasiswa ini tidak akan bisa mengakses kelas lagi.`)) {
      studentService.removeStudentEmailFromCourse(course.id, email);
      onDataUpdated();
    }
  };

  // Submit grading
  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    studentService.gradeSubmission(gradingSubmission.id, gradeScore, gradeFeedback);
    setGradingSubmission(null);
    onDataUpdated();
  };

  // Post announcement
  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    studentService.postAnnouncement({
      courseId: course.id,
      title: annTitle.trim(),
      content: annContent.trim(),
    });

    setAnnTitle('');
    setAnnContent('');
    setAnnSuccess(true);
    onDataUpdated();
    setTimeout(() => setAnnSuccess(false), 3000);
  };

  // Toggle QR session (backward compatibility)
  const handleToggleSession = (open: boolean) => {
    const targetMeetingId = selectedMeetingIdForAttendance || (classMeetings[0] ? classMeetings[0].id : '');
    if (targetMeetingId) {
      handleToggleSessionForMeeting(targetMeetingId, open);
    }
  };

  const tabs = [
    { id: 'mahasiswa' as LecturerClassTab, label: `Mahasiswa Terdaftar (${course.enrolledStudentEmails?.length || 0})`, icon: Users },
    { id: 'pertemuan' as LecturerClassTab, label: `Pertemuan & Materi (${classMeetings.length})`, icon: Calendar },
    { id: 'rps' as LecturerClassTab, label: 'RPS & Silabus', icon: FileText },
    { id: 'tugas' as LecturerClassTab, label: `Tugas & Koreksi (${classSubmissions.length})`, icon: FileText },
    { id: 'presensi' as LecturerClassTab, label: `Presensi QR (${activeMeetingSession ? 'LIVE' : `${course.totalMeetings || 16} Pertemuan`})`, icon: QrCode },
    { id: 'pengumuman' as LecturerClassTab, label: `Pengumuman (${classAnnouncements.length})`, icon: Megaphone },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dasbor Dosen</span>
        </button>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
          {course.code}
        </span>
      </div>

      {/* Course Banner Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 sm:p-7 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30">
              {course.code}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white">
              {course.semester} • {course.academicYear}
            </span>
            <span className="text-xs text-slate-300">
              {course.scheduleDay}, {course.scheduleTime} ({course.room})
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight">
            {course.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {course.description}
          </p>

          <div className="pt-2 flex items-center gap-4 text-xs text-slate-300">
            <span>Dosen Utama: <strong>{course.teacher.name}</strong></span>
            {course.secondaryTeacher && (
              <span>• Dosen Partner: <strong>{course.secondaryTeacher.name}</strong></span>
            )}
          </div>
        </div>

        {/* Quick Action Button: Live QR Projector */}
        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => handleToggleSession(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>Buka QR Proyektor Kelas</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
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

      {/* TAB 1: MAHASISWA TERDAFTAR (ROSTER MANAGEMENT) */}
      {activeTab === 'mahasiswa' && (
        <div className="space-y-6">
          {/* Explanation Alert */}
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <h4 className="font-bold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Sistem Whitelist Email Mahasiswa (Tanpa Tambah Kelas di Mahasiswa)</span>
            </h4>
            <p className="leading-relaxed text-blue-800 dark:text-blue-300">
              Mahasiswa tidak bisa sembarangan mendaftar atau menambah kelas sendiri. Dosen menambahkan email mahasiswa yang terdaftar di kelas ini. Saat mahasiswa registrasi menggunakan email tersebut, mereka otomatis mendapatkan akses materi, tugas, dan presensi kelas ini.
            </p>
          </div>

          {/* Add Student Card */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>Tambahkan Mahasiswa ke Kelas Ini</span>
              </h3>

              <button
                onClick={() => setIsBulkMode(!isBulkMode)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {isBulkMode ? 'Mode Email Tunggal' : '+ Tambah Sekaligus Banyak (Bulk)'}
              </button>
            </div>

            {/* Single Email Input */}
            {!isBulkMode ? (
              <form onSubmit={handleAddSingleEmail} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    placeholder="Masukkan email mahasiswa (contoh: mahasiswa@student.ac.id)"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Daftarkan Mahasiswa</span>
                </button>
              </form>
            ) : (
              /* Bulk Email Input */
              <form onSubmit={handleAddBulkEmails} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Tempel daftar email mahasiswa (pisahkan dengan koma atau baris baru):
                  </label>
                  <textarea
                    rows={4}
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    placeholder="student1@student.ac.id&#10;student2@student.ac.id&#10;student3@student.ac.id"
                    className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkMode(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Daftarkan Semua Email</span>
                  </button>
                </div>
              </form>
            )}

            {rosterMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  rosterMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {rosterMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{rosterMessage.text}</span>
              </div>
            )}
          </div>

          {/* Enrolled Students Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Daftar Mahasiswa Aktif ({course.enrolledStudentEmails?.length || 0})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="pb-3 px-3">No</th>
                    <th className="pb-3 px-3">Email Terdaftar</th>
                    <th className="pb-3 px-3">Status Akses Akun</th>
                    <th className="pb-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {course.enrolledStudentEmails && course.enrolledStudentEmails.length > 0 ? (
                    course.enrolledStudentEmails.map((email, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {email}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Terverifikasi Dosen
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleRemoveEmail(email)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Hapus dari kelas"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Belum ada mahasiswa yang didaftarkan pada kelas ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERTEMUAN & MATERI */}
      {activeTab === 'pertemuan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Sesi Perkuliahan ({classMeetings.length})
            </h3>
          </div>

          <div className="space-y-3">
            {classMeetings.map((m) => (
              <div
                key={m.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    Sesi #{m.meetingNumber} • {formatIndonesianDate(m.date)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {m.startTime} - {m.endTime} WIB ({m.room})
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {m.title}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {m.description}
                </p>

                {/* Materials attached */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 text-xs">
                  {m.materials.map((mat) => (
                    <span
                      key={mat.id}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5"
                    >
                      {mat.type === 'pdf' && <FileText className="w-3.5 h-3.5 text-rose-500" />}
                      {mat.type === 'heyzine' && <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />}
                      {mat.type === 'youtube' && <Video className="w-3.5 h-3.5 text-red-500" />}
                      <span>{mat.title}</span>
                    </span>
                  ))}
                </div>

                {/* Quick Attendance Action Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedMeetingIdForAttendance(m.id);
                      setActiveTab('presensi');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Kelola Presensi & QR Pertemuan #{m.meetingNumber} &rarr;</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB RPS: RENCANA PEMBELAJARAN SEMESTER */}
      {activeTab === 'rps' && (
        <RpsView
          course={course}
          meetings={classMeetings}
          isLecturerMode={true}
          onUpdateRps={(updates) => {
            studentService.updateCourseRps(course.id, updates);
            onDataUpdated();
          }}
        />
      )}

      {/* TAB 3: TUGAS & KOREKSI MAHASISWA */}
      {activeTab === 'tugas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Pengumpulan Jawaban Tugas Mahasiswa ({classSubmissions.length})
            </h3>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="pb-3 px-3">Mahasiswa</th>
                    <th className="pb-3 px-3">Tugas</th>
                    <th className="pb-3 px-3">Waktu Penyerahan</th>
                    <th className="pb-3 px-3">Berkas</th>
                    <th className="pb-3 px-3">Status / Skor</th>
                    <th className="pb-3 px-3 text-right">Tindakan Dosen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classSubmissions.map((sub) => {
                    const asg = classAssignments.find((a) => a.id === sub.assignmentId);
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                          <p>{sub.studentName || 'Mahasiswa'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{sub.studentEmail}</p>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                          {asg?.title || 'Tugas Kuliah'}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono">
                          {formatIndonesianDate(sub.submittedAt, true)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-blue-600 dark:text-blue-400 underline cursor-pointer">
                            {sub.fileName}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {sub.grade !== undefined ? (
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                              {sub.grade}/100 (Dinilai)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold">
                              Perlu Dikoreksi
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setGradingSubmission(sub);
                              setGradeScore(sub.grade || 88);
                              setGradeFeedback(sub.feedback || '');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                          >
                            {sub.grade !== undefined ? 'Edit Nilai' : 'Koreksi & Beri Nilai'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grading Modal */}
          {gradingSubmission && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
              <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Formulir Penilaian & Umpan Balik Dosen
                  </h3>
                  <button onClick={() => setGradingSubmission(null)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                  <p>Mahasiswa: <strong>{gradingSubmission.studentName}</strong> ({gradingSubmission.studentEmail})</p>
                  <p>Berkas Tugas: <span className="font-mono text-blue-600">{gradingSubmission.fileName}</span></p>
                  {gradingSubmission.textResponse && (
                    <p className="italic text-slate-500">"{gradingSubmission.textResponse}"</p>
                  )}
                </div>

                <form onSubmit={handleSaveGrade} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nilai Angka (Skala 0 - 100):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={gradeScore}
                      onChange={(e) => setGradeScore(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-bold font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Catatan Evaluasi & Umpan Balik (Feedback Konstruktif):
                    </label>
                    <textarea
                      rows={4}
                      value={gradeFeedback}
                      onChange={(e) => setGradeFeedback(e.target.value)}
                      placeholder="Tuliskan apresiasi, saran perbaikan, atau catatan kekurangan..."
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setGradingSubmission(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      Simpan & Publikasikan Nilai
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PRESENSI QR KELAS (PERTEMUAN 1 s.d. 16 DENGAN REKAP REAL-TIME) */}
      {activeTab === 'presensi' && (() => {
        const targetMeeting = classMeetings.find((m) => m.id === selectedMeetingIdForAttendance) || classMeetings[0];
        if (!targetMeeting) return null;

        const roster = studentService.getMeetingAttendanceRoster(course.id, targetMeeting.id);
        const isSessionActive = !!roster.activeSession && roster.activeSession.isOpen;

        // Filter roster items
        const filteredRosterItems = roster.items.filter((item) => {
          let matchesStatus = true;
          if (attendanceRosterFilter === 'hadir') matchesStatus = item.status === 'hadir';
          else if (attendanceRosterFilter === 'belum_hadir') matchesStatus = item.status === 'belum_hadir' || item.status === 'alpa';
          else if (attendanceRosterFilter === 'izin_sakit') matchesStatus = item.status === 'izin' || item.status === 'sakit';

          const query = studentSearchQuery.toLowerCase().trim();
          let matchesSearch = true;
          if (query) {
            matchesSearch =
              item.studentName.toLowerCase().includes(query) ||
              item.studentEmail.toLowerCase().includes(query) ||
              item.studentNim.toLowerCase().includes(query);
          }

          return matchesStatus && matchesSearch;
        });

        return (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Control Banner */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Sistem Presensi Dinamis Per Pertemuan
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                    Total: {course.totalMeetings || 16} Pertemuan
                  </span>
                  {activeMeetingSession && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Sesi Pertemuan #{activeMeetingSession.meetingNumber} LIVE
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Studio Presensi & QR Code Layar Proyektor
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                  Pilih pertemuan di bawah untuk membuka QR code di proyektor kelas atau melihat langsung siapa saja mahasiswa yang sudah hadir.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => setIsConfigTotalOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Atur Total Pertemuan</span>
                </button>

                {isSessionActive ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenQrBroadcast(roster.activeSession!)}
                      className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 transition-all hover:scale-105"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Buka Layar Proyektor QR</span>
                    </button>
                    <button
                      onClick={() => handleToggleSessionForMeeting(targetMeeting.id, false)}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                    >
                      Tutup Sesi
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleToggleSessionForMeeting(targetMeeting.id, true)}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 transition-all hover:scale-105"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Buka Sesi QR Pertemuan #{targetMeeting.meetingNumber}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Total Meetings Modal */}
            {isConfigTotalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
                <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      <span>Pengaturan Jumlah Pertemuan</span>
                    </h4>
                    <button onClick={() => setIsConfigTotalOpen(false)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleSaveTotalMeetings} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Total Pertemuan dalam 1 Semester:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[12, 14, 16].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setTempTotalMeetings(num)}
                            className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                              tempTotalMeetings === num
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {num} Sesi
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={32}
                        value={tempTotalMeetings}
                        onChange={(e) => setTempTotalMeetings(Number(e.target.value))}
                        className="mt-2 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Standar perkuliahan universitas umumnya 16 pertemuan (Pertemuan 1-7, UTS, Pertemuan 9-15, UAS).
                      </p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsConfigTotalOpen(false)}
                        className="px-3.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                      >
                        Simpan Perubahan
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Horizontal Meeting Selector Carousel (Pertemuan 1 sampai 16) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                  Daftar Pertemuan Terjadwal ({classMeetings.length} Sesi):
                </span>
                <span className="text-slate-400 text-[11px]">
                  Klik pada nomor pertemuan untuk melihat presensi
                </span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {classMeetings.map((m) => {
                  const isSelected = m.id === selectedMeetingIdForAttendance;
                  const isLive = attendanceSessions.some((s) => s.courseId === course.id && s.meetingId === m.id && s.isOpen);
                  const isPast = m.meetingNumber < 8;

                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMeetingIdForAttendance(m.id)}
                      className={`px-3.5 py-2.5 rounded-2xl shrink-0 text-left border transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
                          : isLive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          P{String(m.meetingNumber).padStart(2, '0')}
                        </span>
                        {isLive && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </div>
                      <p className={`text-[10px] mt-0.5 truncate max-w-[110px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        {m.date}
                      </p>
                      <span className={`inline-block text-[9px] font-semibold uppercase mt-1 px-1.5 py-0.2 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isLive
                          ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                          : isPast
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {isLive ? 'LIVE' : isPast ? 'Selesai' : 'Akan Datang'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Spotlight Card: Detail Pertemuan Terpilih & Metrics */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Pertemuan #{targetMeeting.meetingNumber}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatIndonesianDate(targetMeeting.date, true)} • {targetMeeting.startTime} - {targetMeeting.endTime} WIB ({targetMeeting.room})
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                    {targetMeeting.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Topik: {targetMeeting.topic}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSessionActive ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800">
                        Token: {roster.activeSession?.sessionToken}
                      </span>
                      <button
                        onClick={() => onOpenQrBroadcast(roster.activeSession!)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Proyektor</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleToggleSessionForMeeting(targetMeeting.id, true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Buka QR Sesi Ini</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Metric Counter Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-xs font-medium text-slate-400 block">Total Terdaftar</span>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {roster.totalEnrolled} <span className="text-xs font-normal text-slate-400">Mhs</span>
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block">Hadir di Kelas</span>
                  <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {roster.presentCount} <span className="text-xs font-normal text-emerald-500">({roster.attendanceRate}%)</span>
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                  <span className="text-xs font-medium text-rose-600 dark:text-rose-400 block">Belum Hadir / Alpa</span>
                  <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {roster.absentCount} <span className="text-xs font-normal text-rose-500">Mhs</span>
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 block">Izin / Sakit</span>
                  <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {roster.excusedCount} <span className="text-xs font-normal text-amber-500">Mhs</span>
                  </p>
                </div>
              </div>

              {/* Real-time Attendee Roster Table (Langsung Tertera Siapa Saja yang Hadir) */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1">Filter:</span>
                    {[
                      { id: 'semua', label: `Semua (${roster.totalEnrolled})` },
                      { id: 'hadir', label: `Hadir (${roster.presentCount})` },
                      { id: 'belum_hadir', label: `Belum Hadir (${roster.absentCount})` },
                      { id: 'izin_sakit', label: `Izin/Sakit (${roster.excusedCount})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setAttendanceRosterFilter(tab.id as any)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                          attendanceRosterFilter === tab.id
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Mahasiswa */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      placeholder="Cari nama, NIM, atau email..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                        <th className="py-3 px-4">Mahasiswa Terdaftar</th>
                        <th className="py-3 px-3">Status Kehadiran</th>
                        <th className="py-3 px-3">Waktu Presensi</th>
                        <th className="py-3 px-3">Metode</th>
                        <th className="py-3 px-4 text-right">Tindakan Dosen (Manual)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredRosterItems.length > 0 ? (
                        filteredRosterItems.map((item) => (
                          <tr key={item.studentEmail} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                              <p className="text-xs">{item.studentName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                NIM: {item.studentNim} • {item.studentEmail}
                              </p>
                            </td>

                            <td className="py-3.5 px-3">
                              {item.status === 'hadir' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Hadir Tepat Waktu
                                </span>
                              ) : item.status === 'izin' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                                  Izin Kuliah
                                </span>
                              ) : item.status === 'sakit' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                                  Sakit
                                </span>
                              ) : item.status === 'alpa' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                                  Alpa (Tanpa Keterangan)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium text-[11px]">
                                  Belum Presensi
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                              {item.timestamp || '—'}
                            </td>

                            <td className="py-3.5 px-3 text-slate-500">
                              {item.method === 'qr_scan'
                                ? 'Scan QR Kamera'
                                : item.method === 'manual_code'
                                ? 'Input Token'
                                : item.method === 'manual_lecturer'
                                ? 'Ditandai Dosen'
                                : '—'}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => handleManualMark(targetMeeting.id, item.studentEmail, 'hadir')}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                    item.status === 'hadir'
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                                  }`}
                                  title="Tandai Hadir"
                                >
                                  Hadir
                                </button>
                                <button
                                  onClick={() => handleManualMark(targetMeeting.id, item.studentEmail, 'izin')}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                    item.status === 'izin'
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950'
                                  }`}
                                  title="Tandai Izin"
                                >
                                  Izin
                                </button>
                                <button
                                  onClick={() => handleManualMark(targetMeeting.id, item.studentEmail, 'sakit')}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                    item.status === 'sakit'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950'
                                  }`}
                                  title="Tandai Sakit"
                                >
                                  Sakit
                                </button>
                                <button
                                  onClick={() => handleManualMark(targetMeeting.id, item.studentEmail, 'alpa')}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                    item.status === 'alpa'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950'
                                  }`}
                                  title="Tandai Alpa"
                                >
                                  Alpa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            Tidak ada data mahasiswa yang cocok dengan filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 5: PENGUMUMAN KELAS */}
      {activeTab === 'pengumuman' && (
        <div className="space-y-6">
          {/* Post Announcement Form */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-500" />
              <span>Tulis Pengumuman Resmi untuk Mahasiswa Kelas Ini</span>
            </h3>

            <form onSubmit={handlePostAnnouncement} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Judul Pengumuman (misal: Kisi-kisi UTS, Perubahan Jam Kelas)"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  required
                />
              </div>

              <div>
                <textarea
                  rows={3}
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Tuliskan isi pengumuman lengkap..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {annSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pengumuman berhasil disiarkan ke seluruh mahasiswa di kelas ini.</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Siarkan Pengumuman</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of announcements */}
          <div className="space-y-3">
            {classAnnouncements.map((ann) => (
              <div
                key={ann.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {formatIndonesianDate(ann.date, true)}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    Oleh: {ann.authorName}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {ann.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {ann.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
