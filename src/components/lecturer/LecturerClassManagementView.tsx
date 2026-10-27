import React, { useState } from 'react';
import { 
  BookOpen, 
  Users, 
  FileText, 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  Layers, 
  Sparkles,
  ArrowRight,
  UserPlus,
  Mail,
  ShieldCheck,
  ChevronRight,
  X
} from 'lucide-react';
import { studentService } from '../../services/studentService.ts';
import { myJourneySyncService } from '../../services/myJourneySyncService.ts';
import { calculateAttendanceStats, formatIndonesianDate } from '../../utils/academicCalculations.ts';
import type { 
  CourseClass, 
  Meeting, 
  Assignment, 
  AssignmentSubmission, 
  AttendanceRecord,
  LearningMaterial 
} from '../../types/index.ts';

export type ManagementSubTab = 'kelas' | 'mahasiswa' | 'bahan_ajar' | 'rps' | 'jadwal';

interface LecturerClassManagementViewProps {
  courses: CourseClass[];
  meetings: Meeting[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  attendanceRecords: AttendanceRecord[];
  onOpenCourse: (courseId: string) => void;
  onDataUpdated: () => void;
}

export const LecturerClassManagementView: React.FC<LecturerClassManagementViewProps> = ({
  courses,
  meetings,
  assignments,
  submissions,
  attendanceRecords,
  onOpenCourse,
  onDataUpdated,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ManagementSubTab>('kelas');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');

  // Modals
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const lastSyncTimestamp = myJourneySyncService.getLastSyncTimestamp();

  // New Course Form State
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseRoom, setNewCourseRoom] = useState('Lab Komputasi Spasial Lt. 3');
  const [newCourseDay, setNewCourseDay] = useState('Senin');
  const [newCourseTime, setNewCourseTime] = useState('08:00 - 10:30 WIB');
  const [newCourseSemester, setNewCourseSemester] = useState('Semester 5');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  // New Student Form State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentNim, setNewStudentNim] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentCourseId, setNewStudentCourseId] = useState(courses[0]?.id || '');

  // Extract all unique materials across meetings
  const allMaterials: Array<LearningMaterial & { meetingTitle: string; courseCode: string }> = [];
  meetings.forEach((m) => {
    const crs = courses.find((c) => c.id === m.courseId);
    (m.materials || []).forEach((mat) => {
      allMaterials.push({
        ...mat,
        meetingTitle: m.title,
        courseCode: crs?.code || 'KULIAH',
      });
    });
  });

  // Extract all enrolled students with attendance & course mapping
  const preRegisteredStudents = studentService.getAllPreRegisteredStudents();
  const studentsList = preRegisteredStudents.map((std) => {
    const stdRecords = attendanceRecords.filter((r) => r.studentEmail === std.email);
    const attendedCount = stdRecords.filter((r) => r.status === 'hadir').length;
    const totalSessions = stdRecords.length;
    const attendancePct = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 100;
    const stdSubmissions = submissions.filter((s) => s.studentEmail === std.email);

    return {
      ...std,
      attendancePct,
      attendedCount,
      totalSessions,
      submissionsCount: stdSubmissions.length,
    };
  });

  // Filtered Students
  const filteredStudents = studentsList.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (courseFilter === 'all') return matchesSearch;
    const targetCourse = courses.find((c) => c.id === courseFilter);
    return matchesSearch && targetCourse && s.enrolledCourseCodes.includes(targetCourse.code);
  });

  // Handle Add New Course
  const handleCreateCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode || !newCourseTitle) {
      alert('Kode mata kuliah dan nama mata kuliah wajib diisi.');
      return;
    }

    studentService.createCourse({
      code: newCourseCode,
      title: newCourseTitle,
      description: newCourseDesc,
      room: newCourseRoom,
      scheduleDay: newCourseDay,
      scheduleTime: newCourseTime,
      semester: newCourseSemester,
    });

    onDataUpdated();
    setIsAddCourseModalOpen(false);
    setNewCourseCode('');
    setNewCourseTitle('');
    setNewCourseDesc('');
    // Auto-sync pembaruan ke Google Sheets & My Journey
    myJourneySyncService.triggerDebouncedAutoSync();
  };

  // Handle Add Student to Whitelist
  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentEmail || !newStudentCourseId) {
      alert('Nama, Email, dan Mata Kuliah wajib diisi.');
      return;
    }

    const res = studentService.registerStudentWithDetails({
      name: newStudentName,
      nim: newStudentNim,
      email: newStudentEmail,
      courseId: newStudentCourseId,
    });

    alert(res.message);
    if (res.success) {
      onDataUpdated();
      setIsAddStudentModalOpen(false);
      setNewStudentName('');
      setNewStudentNim('');
      setNewStudentEmail('');
      // Auto-sync pembaruan ke Google Sheets & My Journey
      myJourneySyncService.triggerDebouncedAutoSync();
    }
  };

  const handleManualPushToSheets = async () => {
    setIsSyncLoading(true);
    setSyncFeedback(null);
    try {
      const res = await myJourneySyncService.pushTeachingToGoogleSheets();
      onDataUpdated();
      setSyncFeedback(res.message);
    } catch (err: any) {
      setSyncFeedback('Gagal mengirim ke Google Sheets: ' + err.message);
    } finally {
      setIsSyncLoading(false);
    }
  };

  const handleManualPullFromSheets = async () => {
    setIsSyncLoading(true);
    setSyncFeedback(null);
    try {
      const res = await myJourneySyncService.pullTeachingFromGoogleSheets();
      onDataUpdated();
      setSyncFeedback(res.message);
    } catch (err: any) {
      setSyncFeedback('Gagal mengambil dari Google Sheets: ' + err.message);
    } finally {
      setIsSyncLoading(false);
    }
  };

  // Handle Delete Course
  const handleDeleteCourse = (courseId: string, courseTitle: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus kelas "${courseTitle}"? Semua data pertemuan dan silabus akan dihapus.`)) {
      studentService.deleteCourse(courseId);
      onDataUpdated();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header (Modeled directly after My Journey) */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Teaching
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Administrasi perkuliahan, RPS & materi.
          </p>
        </div>
      </div>

      {/* 2. Sub-navigation Pills (Identical to My Journey: 1. Kelas, 2. Mahasiswa, 3. Bahan Ajar, 4. RPS, 5. Jadwal Sesi) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveSubTab('kelas')}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'kelas'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>1. Kelas ({courses.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('mahasiswa')}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'mahasiswa'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. Mahasiswa ({studentsList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('bahan_ajar')}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'bahan_ajar'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>3. Bahan Ajar ({allMaterials.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('rps')}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'rps'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>4. RPS ({courses.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('jadwal')}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'jadwal'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>5. Jadwal Sesi ({courses.length})</span>
          </button>
        </div>

        {/* Right Action: Sync My Journey & + Tambah Kelas Baru Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSyncModalOpen(true)}
            title="Kelola sinkronisasi otomatis Google Sheets & My Journey"
            className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Sync Google Sheets</span>
          </button>

          {activeSubTab === 'mahasiswa' ? (
            <button
              onClick={() => setIsAddStudentModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Mahasiswa Whitelist</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddCourseModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white shadow-xs flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Kelas Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: 1. KELAS (Styled directly like My Journey) */}
      {/* ========================================================= */}
      {activeSubTab === 'kelas' && (
        <div className="space-y-4">
          {courses.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center font-bold">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Belum Ada Kelas Perkuliahan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Mulai dengan membuat mata kuliah baru secara mandiri atau sinkronkan data pengajaran dari Google Sheets / My Journey.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setIsAddCourseModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Kelas Baru</span>
                </button>
                <button
                  onClick={() => setIsSyncModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-2"
                >
                  <span>Tarik dari Google Sheets</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Header Row (Soft Blue Code Pill on Left, Class Tag on Right) */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900/50">
                        {course.code}
                      </span>

                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                        {course.semester || 'Kelas A'}
                      </span>
                    </div>

                    {/* Course Title */}
                    <h3 
                      onClick={() => onOpenCourse(course.id)}
                      className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 cursor-pointer transition-colors line-clamp-2"
                    >
                      {course.title}
                    </h3>

                    {/* Course Description */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {course.description}
                    </p>
                  </div>

                  {/* Bottom Metadata Info Lines (Identical to My Journey) */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                    {/* Schedule & Action Icons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{course.scheduleDay}, {course.scheduleTime}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCourse(course.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Edit Kelas"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCourse(course.id, course.title);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          title="Hapus Kelas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Room & Student Count */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px] sm:max-w-[180px]">{course.room}</span>
                      </div>

                      <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{course.enrolledStudentEmails?.length || 0} Mahasiswa</span>
                      </div>
                    </div>

                    {/* Open Class Direct Button */}
                    <button
                      onClick={() => onOpenCourse(course.id)}
                      className="w-full mt-2 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-blue-600 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span>Buka Ruang Kelas</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: 2. MAHASISWA (Explicit User Request!) */}
      {/* ========================================================= */}
      {activeSubTab === 'mahasiswa' && (
        <div className="space-y-5">
          {/* Top Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, NIM, atau email mahasiswa..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Class Filter */}
              <div className="w-full sm:w-60">
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                >
                  <option value="all">Semua Kelas ({courses.length})</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
              Menampilkan <strong>{filteredStudents.length}</strong> mahasiswa
            </div>
          </div>

          {/* Quick Roster Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Mahasiswa Whitelist</span>
              <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                {studentsList.length}
              </p>
              <span className="text-[11px] text-emerald-600 font-medium">100% Terverifikasi</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400">Rata-rata Presensi</span>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                {studentsList.length > 0 
                  ? `${Math.round(studentsList.reduce((acc, s) => acc + s.attendancePct, 0) / studentsList.length)}%` 
                  : '100%'}
              </p>
              <span className="text-[11px] text-slate-400">Tingkat Kehadiran Kelas</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400">Tugas Terkumpul</span>
              <p className="text-2xl font-extrabold text-indigo-600 mt-1">
                {submissions.length}
              </p>
              <span className="text-[11px] text-slate-400">Dari seluruh penugasan</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400">Status Whitelist</span>
              <p className="text-2xl font-extrabold text-teal-600 mt-1">
                Terkunci
              </p>
              <span className="text-[11px] text-slate-400">Hanya Email Dosen & Mahasiswa</span>
            </div>
          </div>

          {/* Student Table / Cards */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-400 uppercase font-semibold">
                    <th className="py-3 px-4">Mahasiswa</th>
                    <th className="py-3 px-4">NIM</th>
                    <th className="py-3 px-4">Kelas Diikuti</th>
                    <th className="py-3 px-4">Tingkat Presensi</th>
                    <th className="py-3 px-4">Tugas Selesai</th>
                    <th className="py-3 px-4">Status Whitelist</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.map((std) => (
                    <tr key={std.email} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                            {std.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{std.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{std.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {std.nim}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {std.enrolledCourseCodes.map((code) => (
                            <span
                              key={code}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full" 
                              style={{ width: `${std.attendancePct}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {std.attendancePct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {std.submissionsCount} tugas
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Whitelist Aktif</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              const crs = courses.find((c) => c.enrolledStudentEmails?.includes(std.email));
                              if (crs) onOpenCourse(crs.id);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-colors"
                          >
                            Buka Kelas
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        Tidak ada mahasiswa yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: 3. BAHAN AJAR */}
      {/* ========================================================= */}
      {activeSubTab === 'bahan_ajar' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allMaterials.map((mat) => (
              <div
                key={mat.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {mat.courseCode}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    {mat.type}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {mat.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {mat.description}
                  </p>
                  <span className="text-[11px] text-slate-400 block mt-2">
                    {mat.meetingTitle}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Tersimpan di Google Drive</span>
                  <a
                    href={mat.fileUrl || mat.embedUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                  >
                    <span>Buka File</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
            {allMaterials.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                Belum ada bahan ajar yang diunggah ke Google Drive.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 4: 4. RPS */}
      {/* ========================================================= */}
      {activeSubTab === 'rps' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((c) => (
              <div
                key={c.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {c.code}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600">
                    Kurikulum OBE 2024 / 2026
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {c.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {c.rps?.shortDescription || c.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400">Total CPL:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {c.rps?.cpl?.length || 4} Capaian Sikap & Keterampilan
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Total CPMK:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {c.rps?.cpmk?.length || 5} Sasaran Pembelajaran
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onOpenCourse(c.id)}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white flex items-center justify-center gap-1.5 transition-all mt-2"
                >
                  <span>Buka & Kelola Dokumen RPS Lengkap</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 5: 5. JADWAL SESI */}
      {/* ========================================================= */}
      {activeSubTab === 'jadwal' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {courses.map((c) => (
              <div
                key={c.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                    {c.scheduleDay}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 font-mono">
                    {c.scheduleTime}
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {c.title}
                </h4>

                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.room}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.enrolledStudentEmails?.length || 0} Mahasiswa Terdaftar</span>
                  </div>
                </div>

                <button
                  onClick={() => onOpenCourse(c.id)}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  Buka Jadwal Sesi Pertemuan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: + Tambah Kelas Baru */}
      {/* ========================================================= */}
      {isAddCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Tambah Kelas Kuliah Baru
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dikelola oleh tim dosen dengan matriks 16 pertemuan otomatis.
                </p>
              </div>
              <button
                onClick={() => setIsAddCourseModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourseSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Kode Mata Kuliah
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: IF3104"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Semester & SKS
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kelas A • 3 SKS"
                    value={newCourseSemester}
                    onChange={(e) => setNewCourseSemester(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Mata Kuliah
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cloud Native & Rekayasa Sistem Terdistribusi"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Hari Kuliah
                  </label>
                  <select
                    value={newCourseDay}
                    onChange={(e) => setNewCourseDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                    <option value="Sabtu">Sabtu</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Jam Sesi Perkuliahan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 08:00 - 10:30 WIB"
                    value={newCourseTime}
                    onChange={(e) => setNewCourseTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Ruang Kelas / Lab
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lab Jaringan & Cloud Computing Lt. 3"
                  value={newCourseRoom}
                  onChange={(e) => setNewCourseRoom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Deskripsi / Pengantar Singkat
                </label>
                <textarea
                  rows={3}
                  placeholder="Deskripsi silabus dan capaian perkuliahan..."
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCourseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Simpan & Buat 16 Pertemuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: + Tambah Mahasiswa ke Whitelist */}
      {/* ========================================================= */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Daftarkan Mahasiswa Whitelist
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mahasiswa langsung dapat mengakses materi & presensi kelas.
                </p>
              </div>
              <button
                onClick={() => setIsAddStudentModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pilih Mata Kuliah
                </label>
                <select
                  required
                  value={newStudentCourseId}
                  onChange={(e) => setNewStudentCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Lengkap Mahasiswa
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Altaf Aziz"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nomor Induk Mahasiswa (NIM)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 22081010045"
                  value={newStudentNim}
                  onChange={(e) => setNewStudentNim(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Alamat Email Mahasiswa (Whitelist)
                </label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: nama.mahasiswa@student.ac.id"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Hanya email ini yang dapat membuat akun atau masuk ke portal kelas.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Daftarkan ke Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sinkronisasi Otomatis Google Sheets & My Journey */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Sinkronisasi Google Sheets & My Journey
                  </h3>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Sistem Otomatis Aktif (Background Sync)
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSyncModalOpen(false);
                  setSyncFeedback(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Smart Learning Hub dan My Journey terhubung ke <strong>Google Spreadsheet bersama</strong>. Setiap Anda menyusun kelas, jadwal sesi, materi, RPS, atau mahasiswa, data otomatis tersimpan ke Google Sheets sehingga bagian <em>Teaching</em> di My Journey selalu sama persis.
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
              <div>
                <span className="block text-lg font-black text-slate-900 dark:text-white">{courses.length}</span>
                <span className="text-[10px] text-slate-500 font-medium">Kelas Aktif</span>
              </div>
              <div>
                <span className="block text-lg font-black text-slate-900 dark:text-white">{studentsList.length}</span>
                <span className="text-[10px] text-slate-500 font-medium">Mahasiswa</span>
              </div>
              <div>
                <span className="block text-lg font-black text-slate-900 dark:text-white">{meetings.length}</span>
                <span className="text-[10px] text-slate-500 font-medium">Sesi OBE</span>
              </div>
            </div>

            {/* Sync Feedback Toast */}
            {syncFeedback && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncFeedback}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleManualPushToSheets}
                disabled={isSyncLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isSyncLoading ? 'animate-spin' : ''}`} />
                {isSyncLoading ? 'Menyinkronkan...' : 'Kirim Sekarang (Push ke Google Sheets)'}
              </button>

              <button
                onClick={handleManualPullFromSheets}
                disabled={isSyncLoading}
                className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>Tarik Pembaruan dari Google Sheets</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 text-center font-mono pt-1">
              Terakhir Disinkronkan: {lastSyncTimestamp || 'Baru Saja'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
