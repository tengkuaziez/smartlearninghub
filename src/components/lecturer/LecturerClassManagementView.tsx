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
  AlertTriangle,
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
import { studentService, getInitialsAvatar, DEFAULT_LECTURERS } from '../../services/studentService.ts';
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
  const [newCourseSection, setNewCourseSection] = useState('Kelas A');
  const [newCourseCredits, setNewCourseCredits] = useState<number>(3);
  const [newCourseRoom, setNewCourseRoom] = useState('Lab Komputasi Spasial Lt. 3');
  const [newCourseDay, setNewCourseDay] = useState('Senin');
  const [newCourseStartTime, setNewCourseStartTime] = useState('08:00');
  const [newCourseEndTime, setNewCourseEndTime] = useState('10:30');
  const [newCourseTimezone, setNewCourseTimezone] = useState('WIB');
  const [newCourseSemester, setNewCourseSemester] = useState('Semester 5');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseCoLecturerEmail, setNewCourseCoLecturerEmail] = useState('');
  const [quickInviteCourseId, setQuickInviteCourseId] = useState<string | null>(null);
  const [quickInviteEmail, setQuickInviteEmail] = useState('');

  // Selected Pending Course Modal State (Undangan Kolaborasi)
  const [selectedPendingCourse, setSelectedPendingCourse] = useState<CourseClass | null>(null);

  // Edit Course Modal State
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseClass | null>(null);
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editCourseTitle, setEditCourseTitle] = useState('');
  const [editCourseSection, setEditCourseSection] = useState('Kelas A');
  const [editCourseCredits, setEditCourseCredits] = useState<number>(3);
  const [editCourseSemester, setEditCourseSemester] = useState('Semester 5');
  const [editCourseDay, setEditCourseDay] = useState('Senin');
  const [editCourseStartTime, setEditCourseStartTime] = useState('08:00');
  const [editCourseEndTime, setEditCourseEndTime] = useState('10:30');
  const [editCourseTimezone, setEditCourseTimezone] = useState('WIB');
  const [editCourseRoom, setEditCourseRoom] = useState('Lab Komputasi Spasial Lt. 3');
  const [editCourseDesc, setEditCourseDesc] = useState('');
  const [editPrimaryLecturerEmail, setEditPrimaryLecturerEmail] = useState('');
  const currentUser = studentService.getCurrentUser();
  // Colleague Lecturers for "Add Friend" style co-teaching selection
  const registeredLecturers = studentService.getRegisteredLecturers();
  const colleagueLecturers = registeredLecturers.filter(
    (l) => (l.email || '').toLowerCase() !== (currentUser?.email || '').toLowerCase()
  );
  if (colleagueLecturers.length === 0) {
    const isAltaf = (currentUser?.email || '').toLowerCase().includes('altaf');
    colleagueLecturers.push(
      isAltaf
        ? DEFAULT_LECTURERS['miftahurridlo.688@gmail.com']
        : DEFAULT_LECTURERS['altaf.aziz16@gmail.com']
    );
  }

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

  // Modern In-App Notification / Feedback Modal State
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'success' | 'info' | 'warning' | 'error';
  } | null>(null);

  // In-App Course Deletion & Collaborative Deletion Approval Modal State
  const [deleteModalCourse, setDeleteModalCourse] = useState<CourseClass | null>(null);

  // Time helpers for interactive class schedule
  const calculateEndTime = (startTime: string, credits: number) => {
    try {
      const [hStr, mStr] = startTime.split(':');
      const h = parseInt(hStr || '8', 10);
      const m = parseInt(mStr || '0', 10);
      const durationMinutes = (credits || 3) * 50;
      const totalMinutes = h * 60 + m + durationMinutes;
      const endH = Math.floor(totalMinutes / 60) % 24;
      const endM = totalMinutes % 60;
      return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    } catch {
      return '10:30';
    }
  };

  const parseScheduleString = (scheduleTimeStr: string) => {
    const clean = (scheduleTimeStr || '08:00 - 10:30 WIB').trim();
    const parts = clean.split(' ');
    const start = parts[0] || '08:00';
    const end = parts[2] || '10:30';
    const tz = parts[3] || 'WIB';
    return { start, end, tz };
  };

  // Handle Add New Course
  const handleCreateCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode || !newCourseTitle) {
      setFeedbackModal({
        isOpen: true,
        title: 'Form Belum Lengkap',
        message: 'Kode mata kuliah dan nama mata kuliah wajib diisi.',
        type: 'warning',
      });
      return;
    }

    const formattedScheduleTime = `${newCourseStartTime} - ${newCourseEndTime} ${newCourseTimezone}`;

    studentService.createCourse({
      code: newCourseCode,
      title: newCourseTitle,
      section: newCourseSection,
      credits: Number(newCourseCredits) || 3,
      description: newCourseDesc,
      room: newCourseRoom,
      scheduleDay: newCourseDay,
      scheduleTime: formattedScheduleTime,
      semester: newCourseSemester,
      invitedLecturerEmail: newCourseCoLecturerEmail.trim() || undefined,
    });

    onDataUpdated();
    setIsAddCourseModalOpen(false);
    const createdTitle = newCourseTitle;
    const invitedEmail = newCourseCoLecturerEmail.trim();
    setNewCourseCode('');
    setNewCourseTitle('');
    setNewCourseDesc('');
    setNewCourseSection('Kelas A');
    setNewCourseCredits(3);
    setNewCourseStartTime('08:00');
    setNewCourseEndTime('10:30');
    setNewCourseTimezone('WIB');
    setNewCourseCoLecturerEmail('');
    // Auto-sync pembaruan ke Google Sheets & My Journey secara instan
    myJourneySyncService.pushTeachingToGoogleSheets().catch(() => {});
    myJourneySyncService.triggerDebouncedAutoSync();

    setFeedbackModal({
      isOpen: true,
      title: 'Kelas Berhasil Dibuat',
      message: invitedEmail
        ? `Kelas "${createdTitle}" berhasil dibuat dan undangan mengajar telah dikirimkan ke ${invitedEmail}.`
        : `Kelas "${createdTitle}" berhasil dibuat dengan matriks 16 pertemuan otomatis.`,
      type: 'success',
    });
  };

  // Handle Edit Course Modal
  const handleOpenEditCourse = (course: CourseClass) => {
    setEditingCourse(course);
    setEditCourseCode(course.code);
    setEditCourseTitle(course.title);
    setEditCourseSection(course.section || 'Kelas A');
    setEditCourseCredits(course.credits || 3);
    setEditCourseSemester(course.semester || 'Semester 5');
    setEditCourseDay(course.scheduleDay || 'Senin');
    
    const parsed = parseScheduleString(course.scheduleTime || '08:00 - 10:30 WIB');
    setEditCourseStartTime(parsed.start);
    setEditCourseEndTime(parsed.end);
    setEditCourseTimezone(parsed.tz);

    setEditCourseRoom(course.room || 'Lab Komputasi Spasial Lt. 3');
    setEditCourseDesc(course.description || '');
    setEditPrimaryLecturerEmail(course.teacher?.email || '');
    setIsEditCourseModalOpen(true);
  };

  const handleSaveEditCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    const formattedScheduleTime = `${editCourseStartTime} - ${editCourseEndTime} ${editCourseTimezone}`;

    studentService.updateCourse(editingCourse.id, {
      code: editCourseCode,
      title: editCourseTitle,
      section: editCourseSection,
      credits: Number(editCourseCredits) || 3,
      semester: editCourseSemester,
      scheduleDay: editCourseDay,
      scheduleTime: formattedScheduleTime,
      room: editCourseRoom,
      description: editCourseDesc,
    });

    // Update Primary Lecturer if changed
    if (editPrimaryLecturerEmail && editPrimaryLecturerEmail.toLowerCase() !== (editingCourse.teacher?.email || '').toLowerCase()) {
      studentService.setPrimaryLecturer(editingCourse.id, editPrimaryLecturerEmail);
    }

    setIsEditCourseModalOpen(false);
    setEditingCourse(null);
    onDataUpdated();
  };

  const handleQuickInviteSubmit = (courseId: string, email: string) => {
    if (!email.trim()) return;
    const res = studentService.inviteLecturerToCourse(courseId, email.trim());
    if (res.success) {
      setQuickInviteCourseId(null);
      setQuickInviteEmail('');
      onDataUpdated();
      setFeedbackModal({
        isOpen: true,
        title: 'Undangan Berhasil Dikirim',
        message: res.message,
        type: 'success',
      });
    } else {
      setFeedbackModal({
        isOpen: true,
        title: 'Undangan Dosen',
        message: res.message,
        type: 'warning',
      });
    }
  };

  // Handle Add Student to Whitelist
  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentEmail || !newStudentCourseId) {
      setFeedbackModal({
        isOpen: true,
        title: 'Form Belum Lengkap',
        message: 'Nama, Email, dan Mata Kuliah wajib diisi.',
        type: 'warning',
      });
      return;
    }

    const res = studentService.registerStudentWithDetails({
      name: newStudentName,
      nim: newStudentNim,
      email: newStudentEmail,
      courseId: newStudentCourseId,
    });

    if (res.success) {
      onDataUpdated();
      setIsAddStudentModalOpen(false);
      setNewStudentName('');
      setNewStudentNim('');
      setNewStudentEmail('');
      myJourneySyncService.triggerDebouncedAutoSync();
      setFeedbackModal({
        isOpen: true,
        title: 'Mahasiswa Berhasil Didaftarkan',
        message: res.message,
        type: 'success',
      });
    } else {
      setFeedbackModal({
        isOpen: true,
        title: 'Gagal Mendaftarkan Mahasiswa',
        message: res.message,
        type: 'error',
      });
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

  // Deduplikasi ketat daftar courses berdasarkan kode matkul dan ID
  const uniqueCourseMap = new Map<string, CourseClass>();
  courses.forEach((c) => {
    const codeKey = (c.code || '').trim().toUpperCase();
    const idKey = c.id;
    const existing = uniqueCourseMap.get(codeKey) || uniqueCourseMap.get(idKey);
    if (!existing) {
      uniqueCourseMap.set(codeKey, c);
      uniqueCourseMap.set(idKey, c);
    } else {
      const existingIsPending = !!existing.pendingLecturerEmail;
      const cIsPending = !!c.pendingLecturerEmail;
      const chosen = (existingIsPending && !cIsPending) ? c : existing;
      uniqueCourseMap.set(codeKey, chosen);
      uniqueCourseMap.set(idKey, chosen);
    }
  });
  const dedupedCourses = Array.from(new Set(uniqueCourseMap.values()));

  // Check pending invitations for current lecturer
  const pendingInvitations = dedupedCourses.filter(
    (c) => c.pendingLecturerEmail?.toLowerCase() === currentUser?.email?.toLowerCase()
  );

  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const isCurrentUserMiftah = userEmail.includes('miftah');
  const isCurrentUserAzis = userEmail.includes('altaf') || userEmail.includes('azis') || userEmail.includes('aziz');

  // Kelas yang ditampilkan di Tab "1. Kelas":
  // Meliputi kelas buatan user, kelas tim yang sudah di-acc, serta kelas yang mengundang user (menunggu persetujuan user)
  const classesTabCourses = dedupedCourses.filter((c) => {
    const primaryStr = `${c.teacher?.email || ''} ${c.primaryLecturer || ''} ${c.teacher?.name || ''}`.toLowerCase();
    const partnerStr = `${c.secondaryTeacher?.email || ''} ${c.partnerLecturer || ''} ${c.secondaryTeacher?.name || ''}`.toLowerCase();
    const pendingEmailStr = (c.pendingLecturerEmail || '').toLowerCase().trim();

    const isPrimary = primaryStr.includes(userEmail) ||
      (isCurrentUserMiftah && primaryStr.includes('miftah')) ||
      (isCurrentUserAzis && (primaryStr.includes('altaf') || primaryStr.includes('azis') || primaryStr.includes('aziz')));

    const isPartner = (!c.pendingLecturerEmail && (
      partnerStr.includes(userEmail) ||
      (isCurrentUserMiftah && partnerStr.includes('miftah')) ||
      (isCurrentUserAzis && (partnerStr.includes('altaf') || partnerStr.includes('azis') || partnerStr.includes('aziz')))
    ));

    const isPendingForMe = pendingEmailStr === userEmail ||
      (isCurrentUserMiftah && pendingEmailStr.includes('miftah')) ||
      (isCurrentUserAzis && (pendingEmailStr.includes('altaf') || pendingEmailStr.includes('azis') || pendingEmailStr.includes('aziz')));

    return isPrimary || isPartner || isPendingForMe;
  });

  // Kelas yang sudah disetujui resmi (untuk Tab "4. RPS" dan Tab "5. Jadwal Sesi"):
  // Kelas yang belum di-acc oleh user TIDAK akan muncul di RPS atau Jadwal Sesi sampai disetujui!
  const approvedCourses = dedupedCourses.filter((c) => {
    const primaryStr = `${c.teacher?.email || ''} ${c.primaryLecturer || ''} ${c.teacher?.name || ''}`.toLowerCase();
    const partnerStr = `${c.secondaryTeacher?.email || ''} ${c.partnerLecturer || ''} ${c.secondaryTeacher?.name || ''}`.toLowerCase();
    const pendingEmailStr = (c.pendingLecturerEmail || '').toLowerCase().trim();

    const isPendingForMe = pendingEmailStr === userEmail ||
      (isCurrentUserMiftah && pendingEmailStr.includes('miftah')) ||
      (isCurrentUserAzis && (pendingEmailStr.includes('altaf') || pendingEmailStr.includes('azis') || pendingEmailStr.includes('aziz')));
    if (isPendingForMe) return false;

    const isPrimary = primaryStr.includes(userEmail) ||
      (isCurrentUserMiftah && primaryStr.includes('miftah')) ||
      (isCurrentUserAzis && (primaryStr.includes('altaf') || primaryStr.includes('azis') || primaryStr.includes('aziz')));

    const isPartner = (!c.pendingLecturerEmail && (
      partnerStr.includes(userEmail) ||
      (isCurrentUserMiftah && partnerStr.includes('miftah')) ||
      (isCurrentUserAzis && (partnerStr.includes('altaf') || partnerStr.includes('azis') || partnerStr.includes('aziz')))
    ));

    return isPrimary || isPartner;
  });

  const handleAcceptInvitation = async (courseId: string) => {
    const res = studentService.acceptCourseInvitation(courseId, currentUser?.email);
    if (res.success) {
      setSelectedPendingCourse(null);
      await myJourneySyncService.pushTeachingToGoogleSheets();
      onDataUpdated();
      setFeedbackModal({
        isOpen: true,
        title: 'Berhasil Bergabung',
        message: 'Anda telah resmi bergabung sebagai rekan dosen pengampu mata kuliah ini.',
        type: 'success',
      });
    }
  };

  const handleDeclineInvitation = async (courseId: string) => {
    const res = studentService.declineCourseInvitation(courseId, currentUser?.email);
    if (res.success) {
      setSelectedPendingCourse(null);
      await myJourneySyncService.pushTeachingToGoogleSheets();
      onDataUpdated();
      setFeedbackModal({
        isOpen: true,
        title: 'Undangan Ditolak',
        message: 'Undangan kolaborasi mengajar telah ditolak.',
        type: 'info',
      });
    }
  };

  // Collaborative & Solo Course Deletion Handlers
  const handleOpenDeleteModal = (course: CourseClass) => {
    setDeleteModalCourse(course);
  };

  const handleConfirmSoloDelete = async (courseId: string) => {
    studentService.deleteCourse(courseId);
    setDeleteModalCourse(null);
    await myJourneySyncService.pushTeachingToGoogleSheets();
    onDataUpdated();
    setFeedbackModal({
      isOpen: true,
      title: 'Kelas Berhasil Dihapus',
      message: 'Kelas beserta seluruh data pertemuan, silabus, dan daftar mahasiswa telah dihapus permanen.',
      type: 'info',
    });
  };

  const handleRequestCollaborativeDelete = async (courseId: string) => {
    const res = studentService.requestCourseDeletion(courseId);
    setDeleteModalCourse(null);
    onDataUpdated();
    setFeedbackModal({
      isOpen: true,
      title: 'Permohonan Hapus Diajukan',
      message: res.message,
      type: 'warning',
    });
  };

  const handleCancelDeleteRequest = async (courseId: string) => {
    const res = studentService.cancelCourseDeletionRequest(courseId);
    setDeleteModalCourse(null);
    onDataUpdated();
    setFeedbackModal({
      isOpen: true,
      title: 'Pengajuan Dibatalkan',
      message: res.message,
      type: 'info',
    });
  };

  const handleRespondDeleteRequest = async (courseId: string, approve: boolean) => {
    const res = studentService.respondToCourseDeletion(courseId, approve);
    setDeleteModalCourse(null);
    await myJourneySyncService.pushTeachingToGoogleSheets();
    onDataUpdated();
    setFeedbackModal({
      isOpen: true,
      title: approve ? 'Penghapusan Disetujui' : 'Penghapusan Ditolak',
      message: res.message,
      type: approve ? 'info' : 'warning',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header (Modeled directly after My Journey) */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Manajemen Kelas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola kelas perkuliahan, mahasiswa, RPS & jadwal sesi perkuliahan.
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
            <span>1. Kelas ({classesTabCourses.length})</span>
            {pendingInvitations.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                +{pendingInvitations.length} Undangan
              </span>
            )}
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
            <span>4. RPS ({approvedCourses.length})</span>
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
            <span>5. Jadwal Sesi ({approvedCourses.length})</span>
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
          {/* Action Banner: Undangan Tim Mengajar dari Rekan Dosen */}
          {pendingInvitations.length > 0 && (
            <div className="space-y-3 mb-5">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-700/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                          Undangan Tim Dosen Baru
                        </span>
                        <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                          Menunggu Persetujuan Anda
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
                        {studentService.formatLecturerGreeting(inv.teacher?.name || inv.primaryLecturer || 'Rekan Dosen')} mengundang Anda bergabung mengampu mata kuliah:
                      </h4>
                      <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mt-0.5">
                        {inv.code} — {inv.title} ({inv.semester})
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Jadwal: {inv.scheduleDay}, {inv.scheduleTime} • Ruang: {inv.room}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                    <button
                      onClick={() => setSelectedPendingCourse(inv)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Setujui
                    </button>
                    <button
                      onClick={() => handleDeclineInvitation(inv.id)}
                      className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-900 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {classesTabCourses.length === 0 ? (
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
              {classesTabCourses.map((course) => {
                const isPendingForMe = (course.pendingLecturerEmail || '').toLowerCase() === userEmail;

                return (
                  <div
                    key={course.id}
                    className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 hover:shadow-md transition-all flex flex-col justify-between ${
                      isPendingForMe
                        ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/20 dark:bg-amber-950/20 hover:border-amber-400'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500'
                    }`}
                  >
                    <div>
                      {/* Top Header Row (Soft Blue Code Pill on Left, Class Tag on Right) */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900/50">
                          {course.code}
                        </span>

                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                          {course.section || 'Kelas A'} • {course.credits || 3} SKS
                        </span>
                      </div>

                      {/* Course Title */}
                      <h3 
                        onClick={() => {
                          if (isPendingForMe) {
                            setSelectedPendingCourse(course);
                          } else {
                            onOpenCourse(course.id);
                          }
                        }}
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
                      {/* Team Dosen & Kolaborasi Mengajar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            👨‍🏫 {studentService.formatLecturerGreeting(course.teacher?.name || course.primaryLecturer || 'Dosen Pengampu')}
                            {course.secondaryTeacher?.name && ` & ${studentService.formatLecturerGreeting(course.secondaryTeacher.name)}`}
                          </span>

                          {!course.secondaryTeacher && !course.pendingLecturerEmail && (course.teacher?.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase() && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickInviteCourseId(quickInviteCourseId === course.id ? null : course.id);
                                setQuickInviteEmail('');
                              }}
                              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              + Undang Mitra
                            </button>
                          )}
                        </div>

                        {course.pendingLecturerEmail && (
                          isPendingForMe ? (
                            <div className="text-[11px] px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-semibold flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                                <span>Menunggu Persetujuan Anda</span>
                              </span>
                              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Undangan</span>
                            </div>
                          ) : (
                            <div className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                              <span>⏳ Menunggu: {course.pendingLecturerName || course.pendingLecturerEmail}</span>
                              <span className="text-[9px] font-mono">Pending</span>
                            </div>
                          )
                        )}

                        {course.deletionRequest?.status === 'pending' && (
                          course.deletionRequest.requestedBy === currentUser?.email ? (
                            <div className="text-[11px] px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-semibold flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                <span>Menunggu Persetujuan Hapus Rekan</span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelDeleteRequest(course.id);
                                }}
                                className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-bold"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 space-y-1.5">
                              <div className="text-[11px] font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                                <span>⚠️</span>
                                <span>Permohonan Hapus: {course.deletionRequest.requestedByName}</span>
                              </div>
                              <p className="text-[10px] text-rose-600 dark:text-rose-400">
                                Rekan dosen mengajukan penghapusan kelas ini. Konfirmasi Anda diperlukan.
                              </p>
                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDeleteModal(course);
                                  }}
                                  className="flex-1 py-1 px-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                                >
                                  Konfirmasi
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRespondDeleteRequest(course.id, false);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
                                >
                                  Tolak
                                </button>
                              </div>
                            </div>
                          )
                        )}

                        {/* Quick Invite Form on Card ("Add Friend" Style) */}
                        {quickInviteCourseId === course.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-blue-200 dark:border-blue-800 space-y-2 mt-2 animate-in fade-in"
                          >
                            <div className="flex items-center justify-between">
                              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-blue-500" />
                                <span>Pilih Rekan Dosen Terverifikasi:</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => setQuickInviteCourseId(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              {colleagueLecturers.map((colleague) => (
                                <div
                                  key={colleague.email}
                                  className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={colleague.avatarUrl || (colleague.email.includes('altaf') ? '/tengku_avatar.png' : getInitialsAvatar(colleague.name, true))}
                                      alt={colleague.name}
                                      className="w-7 h-7 rounded-lg object-cover shrink-0"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = colleague.email.includes('altaf') ? '/tengku_avatar.png' : getInitialsAvatar(colleague.name, true);
                                      }}
                                    />
                                    <div className="min-w-0">
                                      <div className="font-bold text-[11px] text-slate-900 dark:text-white truncate">
                                        {colleague.name}
                                      </div>
                                      <div className="text-[9px] text-slate-500 font-mono truncate">
                                        {colleague.email}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickInviteSubmit(course.id, colleague.email)}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 shrink-0"
                                  >
                                    <UserPlus className="w-3 h-3" />
                                    <span>+ Tambahkan</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

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
                              handleOpenEditCourse(course);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                            title="Edit Detail Kelas"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteModal(course);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
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

                      {/* Action Button: Setujui (for invited lecturer) vs Buka Ruang Kelas */}
                      {isPendingForMe ? (
                        <button
                          onClick={() => setSelectedPendingCourse(course)}
                          className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Setujui</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenCourse(course.id)}
                          className="w-full mt-2 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-blue-600 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all"
                        >
                          <span>Buka Ruang Kelas</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
            {approvedCourses.map((c) => (
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
            {approvedCourses.map((c) => (
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
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Tambah Kelas Kuliah Baru
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dikelola oleh tim dosen dengan matriks 16 pertemuan otomatis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCourseModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateCourseSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Kode Mata Kuliah
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SIG atau GEO-301"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nama Mata Kuliah
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sains Informasi Geografi"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Kelas / Seksi
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kelas A"
                    value={newCourseSection}
                    onChange={(e) => setNewCourseSection(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Bobot SKS
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    required
                    value={newCourseCredits}
                    onChange={(e) => setNewCourseCredits(Number(e.target.value) || 3)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Semester
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Semester 5"
                    value={newCourseSemester}
                    onChange={(e) => setNewCourseSemester(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Hari & Jadwal Perkuliahan */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Hari Kuliah
                    </label>
                    <select
                      value={newCourseDay}
                      onChange={(e) => setNewCourseDay(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Senin">Senin</option>
                      <option value="Selasa">Selasa</option>
                      <option value="Rabu">Rabu</option>
                      <option value="Kamis">Kamis</option>
                      <option value="Jumat">Jumat</option>
                      <option value="Sabtu">Sabtu</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                        Jam Sesi Perkuliahan
                      </label>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {(newCourseCredits || 3) * 50} Menit ({newCourseCredits || 3} SKS)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-[110px]">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Mulai</span>
                        <input
                          type="time"
                          required
                          value={newCourseStartTime}
                          onChange={(e) => {
                            const st = e.target.value;
                            setNewCourseStartTime(st);
                            setNewCourseEndTime(calculateEndTime(st, newCourseCredits));
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <span className="text-slate-400 font-bold self-end pb-2">s/d</span>
                      <div className="flex-1 min-w-[110px]">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Selesai</span>
                        <input
                          type="time"
                          required
                          value={newCourseEndTime}
                          onChange={(e) => setNewCourseEndTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="w-20">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Zona</span>
                        <select
                          value={newCourseTimezone}
                          onChange={(e) => setNewCourseTimezone(e.target.value)}
                          className="w-full px-2 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="WIB">WIB</option>
                          <option value="WITA">WITA</option>
                          <option value="WIT">WIT</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preset Quick Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-semibold mr-1">Preset Jam:</span>
                  {[
                    { label: '08:00 - 09:40 (2 SKS)', s: '08:00', e: '09:40', sks: 2 },
                    { label: '08:00 - 10:30 (3 SKS)', s: '08:00', e: '10:30', sks: 3 },
                    { label: '10:40 - 12:20 (2 SKS)', s: '10:40', e: '12:20', sks: 2 },
                    { label: '13:30 - 16:00 (3 SKS)', s: '13:30', e: '16:00', sks: 3 },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setNewCourseStartTime(chip.s);
                        setNewCourseEndTime(chip.e);
                        setNewCourseCredits(chip.sks);
                      }}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        newCourseStartTime === chip.s && newCourseEndTime === chip.e
                          ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-300 font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Schedule preview badge */}
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 font-medium">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    {newCourseDay}, {newCourseStartTime} - {newCourseEndTime} {newCourseTimezone}
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-100/60 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">
                    Terintegrasi Jadwal
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Ruang Kelas / Lab
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lab Komputasi Spasial Lt. 3"
                  value={newCourseRoom}
                  onChange={(e) => setNewCourseRoom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Deskripsi / Pengantar Singkat
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi silabus dan capaian perkuliahan..."
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              {/* Rekan Dosen Pengampu */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Rekan Dosen Pengampu (Tim Teaching / Kolaborasi)</span>
                  </label>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-3 h-3" />
                    Akun Terverifikasi
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tambahkan rekan dosen resmi My Journey untuk mengampu mata kuliah ini secara bersama-sama.
                </p>

                {/* Colleague Selection Cards */}
                <div className="space-y-2">
                  {colleagueLecturers.map((colleague) => {
                    const isSelected = newCourseCoLecturerEmail.toLowerCase() === colleague.email.toLowerCase();
                    return (
                      <div
                        key={colleague.email}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={colleague.avatarUrl || (colleague.email.includes('altaf') ? '/tengku_avatar.png' : getInitialsAvatar(colleague.name, true))}
                            alt={colleague.name}
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = colleague.email.includes('altaf') ? '/tengku_avatar.png' : getInitialsAvatar(colleague.name, true);
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {colleague.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                NIDN: {colleague.nidn || '0412088501'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {colleague.title || 'Dosen Pengampu'} • {colleague.department || 'Pendidikan Geografi'}
                            </div>
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono truncate">
                              {colleague.email}
                            </div>
                          </div>
                        </div>

                        {/* Add / Added Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setNewCourseCoLecturerEmail('');
                            } else {
                              setNewCourseCoLecturerEmail(colleague.email);
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 hover:bg-rose-600 text-white shadow-xs group'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 group-hover:hidden" />
                              <X className="w-3.5 h-3.5 hidden group-hover:inline" />
                              <span className="group-hover:hidden">✓ Terpilih</span>
                              <span className="hidden group-hover:inline">Batalkan</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>+ Tambah Rekan</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {newCourseCoLecturerEmail ? (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Rekan dosen dipilih: Undangan kolaborasi tim dosen akan dikirimkan ke akun rekan dosen untuk persetujuan (ACC) terlebih dahulu sebelum resmi bergabung.</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">
                    Opsional: Klik <strong>+ Tambah Rekan</strong> jika mata kuliah ini diampu bersama tim dosen.
                  </p>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddCourseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Simpan & Buat 16 Pertemuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT DETAIL KELAS */}
      {/* ========================================================= */}
      {isEditCourseModalOpen && editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                  <span>Edit Rincian Kelas Kuliah</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perubahan akan otomatis tersinkronisasi ke Google Sheets dan My Journey.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsEditCourseModalOpen(false);
                  setEditingCourse(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCourse} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Kode Mata Kuliah
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SIG atau GEO-301"
                    value={editCourseCode}
                    onChange={(e) => setEditCourseCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nama Mata Kuliah
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sains Informasi Geografi"
                    value={editCourseTitle}
                    onChange={(e) => setEditCourseTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Kelas / Seksi
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kelas A"
                    value={editCourseSection}
                    onChange={(e) => setEditCourseSection(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Bobot SKS
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    required
                    value={editCourseCredits}
                    onChange={(e) => setEditCourseCredits(Number(e.target.value) || 3)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Semester
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Semester 5"
                    value={editCourseSemester}
                    onChange={(e) => setEditCourseSemester(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Hari Kuliah
                  </label>
                  <select
                    value={editCourseDay}
                    onChange={(e) => setEditCourseDay(e.target.value)}
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

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                      Jam Sesi Perkuliahan
                    </label>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {(editCourseCredits || 3) * 50} Menit ({editCourseCredits || 3} SKS)
                    </span>
                  </div>

                  <div className="grid grid-cols-12 gap-1.5 items-center">
                    <div className="col-span-5">
                      <input
                        type="time"
                        required
                        value={editCourseStartTime}
                        onChange={(e) => {
                          const st = e.target.value;
                          setEditCourseStartTime(st);
                          setEditCourseEndTime(calculateEndTime(st, editCourseCredits));
                        }}
                        className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <span className="col-span-1 text-center text-slate-400 font-bold">-</span>
                    <div className="col-span-4">
                      <input
                        type="time"
                        required
                        value={editCourseEndTime}
                        onChange={(e) => setEditCourseEndTime(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={editCourseTimezone}
                        onChange={(e) => setEditCourseTimezone(e.target.value)}
                        className="w-full px-1 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="WIB">WIB</option>
                        <option value="WITA">WITA</option>
                        <option value="WIT">WIT</option>
                      </select>
                    </div>
                  </div>

                  {/* Preset Quick Chips */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {[
                      { label: '08:00 - 09:40', s: '08:00', e: '09:40', sks: 2 },
                      { label: '08:00 - 10:30', s: '08:00', e: '10:30', sks: 3 },
                      { label: '10:40 - 12:20', s: '10:40', e: '12:20', sks: 2 },
                      { label: '13:30 - 16:00', s: '13:30', e: '16:00', sks: 3 },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          setEditCourseStartTime(chip.s);
                          setEditCourseEndTime(chip.e);
                          setEditCourseCredits(chip.sks);
                        }}
                        className={`text-[9px] px-2 py-0.5 rounded-md border transition-all ${
                          editCourseStartTime === chip.s && editCourseEndTime === chip.e
                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-300 font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Schedule preview badge */}
                  <div className="p-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-[11px] text-blue-800 dark:text-blue-300 font-medium">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      {editCourseDay}, {editCourseStartTime} - {editCourseEndTime} {editCourseTimezone}
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                      Terintegrasi Jadwal
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Lecturer Selection */}
              {(editingCourse.secondaryTeacher || editingCourse.partnerLecturer) && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>Atur Dosen Utama (Primary Lecturer)</span>
                    </label>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded-md">
                      Tim Pengajar Aktif
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pilih siapa yang memegang peran sebagai Dosen Pengampu Utama untuk mata kuliah ini.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {[
                      {
                        name: editingCourse.teacher?.name || editingCourse.primaryLecturer || 'Dosen Utama',
                        email: editingCourse.teacher?.email || 'altaf.aziz16@gmail.com',
                        avatar: editingCourse.teacher?.avatarUrl,
                      },
                      {
                        name: editingCourse.secondaryTeacher?.name || editingCourse.partnerLecturer || 'Dosen Partner',
                        email: editingCourse.secondaryTeacher?.email || 'miftahurridlo.688@gmail.com',
                        avatar: editingCourse.secondaryTeacher?.avatarUrl,
                      },
                    ].map((lecturer) => {
                      const isSelected = (editPrimaryLecturerEmail || editingCourse.teacher?.email || '').toLowerCase() === lecturer.email.toLowerCase();
                      return (
                        <div
                          key={lecturer.email}
                          onClick={() => setEditPrimaryLecturerEmail(lecturer.email)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                              : 'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="primaryLecturerRadio"
                            checked={isSelected}
                            onChange={() => setEditPrimaryLecturerEmail(lecturer.email)}
                            className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {lecturer.name}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {isSelected ? '✓ Dosen Pengampu Utama' : 'Dosen Pengampu Partner'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Ruang Kelas / Lab
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lab Komputasi Spasial Lt. 3"
                  value={editCourseRoom}
                  onChange={(e) => setEditCourseRoom(e.target.value)}
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
                  value={editCourseDesc}
                  onChange={(e) => setEditCourseDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditCourseModalOpen(false);
                    setEditingCourse(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
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

              {/* Quick Select from Master Database */}
              {(() => {
                const master = studentService.getMasterStudents();
                if (master.length === 0) return null;
                return (
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Pilih dari Basis Data Mahasiswa:
                    </label>
                    <select
                      onChange={(e) => {
                        const s = master.find((item) => item.id === e.target.value || item.email === e.target.value);
                        if (s) {
                          setNewStudentName(s.name);
                          setNewStudentNim(s.nim);
                          setNewStudentEmail(s.email);
                        }
                      }}
                      defaultValue=""
                      className="w-full px-3 py-2 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-blue-900 text-xs font-semibold text-blue-900 dark:text-blue-300 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Pilih Mahasiswa untuk Auto-fill ({master.length} di Database) --</option>
                      {master.map((s) => (
                        <option key={s.id || s.email} value={s.id || s.email}>
                          {s.nim} - {s.name} ({s.email})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}

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

      {/* ========================================================= */}
      {/* MODAL: DETAIL KELAS & PERSETUJUAN UNDANGAN DOSEN PENGAMPU */}
      {/* ========================================================= */}
      {selectedPendingCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Detail Undangan Tim Mengajar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfirmasi persetujuan bergabung menjadi rekan dosen pengampu.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPendingCourse(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Course Detail Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                  {selectedPendingCourse.code}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {selectedPendingCourse.section || 'Kelas A'} • {selectedPendingCourse.credits || 3} SKS
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedPendingCourse.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {selectedPendingCourse.description || 'Mata kuliah tim teaching terhubung dengan kurikulum OBE 16 pertemuan otomatis.'}
                </p>
              </div>

              {/* Inviting Lecturer Info */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <img
                  src={selectedPendingCourse.teacher?.avatarUrl || (selectedPendingCourse.teacher?.email?.includes('altaf') ? '/tengku_avatar.png' : '/miftah_avatar.png')}
                  alt={selectedPendingCourse.teacher?.name || 'Dosen Pengampu'}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/tengku_avatar.png';
                  }}
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Dosen Pengampu Utama (Pengundang):
                  </span>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {studentService.formatLecturerGreeting(selectedPendingCourse.teacher?.name || selectedPendingCourse.primaryLecturer || 'Dosen Pengampu')}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    {selectedPendingCourse.teacher?.email || ''}
                  </div>
                </div>
              </div>

              {/* Schedule & Room Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Jadwal Perkuliahan:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedPendingCourse.scheduleDay}, {selectedPendingCourse.scheduleTime}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Ruang / Laboratorium:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {selectedPendingCourse.room}
                  </span>
                </div>
              </div>
            </div>

            {/* Information Notice */}
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Jika disetujui, mata kuliah ini akan otomatis ditambahkan ke ruang kelas Anda serta membuka akses penuh ke modul <strong>RPS</strong> dan <strong>16 jadwal sesi perkuliahan</strong>.
              </p>
            </div>

            {/* Action Buttons: Setujui vs Tolak */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPendingCourse(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const courseId = selectedPendingCourse.id;
                  setSelectedPendingCourse(null);
                  await handleDeclineInvitation(courseId);
                }}
                className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Tolak</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  const courseId = selectedPendingCourse.id;
                  setSelectedPendingCourse(null);
                  await handleAcceptInvitation(courseId);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Setujui</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MODERN IN-APP FEEDBACK / NOTIFICATION */}
      {/* ========================================================= */}
      {feedbackModal && feedbackModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200 text-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              feedbackModal.type === 'error'
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600'
                : feedbackModal.type === 'warning'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
            }`}>
              {feedbackModal.type === 'error' ? (
                <X className="w-6 h-6" />
              ) : feedbackModal.type === 'warning' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {feedbackModal.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {feedbackModal.message}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setFeedbackModal(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PENGHAPUSAN KELAS & PERLINDUNGAN KELAS KOLABORASI */}
      {/* ========================================================= */}
      {deleteModalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
            {(() => {
              const hasActivePartner = (!!deleteModalCourse.secondaryTeacher?.email || (!!deleteModalCourse.partnerLecturer && !deleteModalCourse.partnerLecturer.startsWith('PENDING:') && deleteModalCourse.partnerLecturer !== '-')) && !deleteModalCourse.pendingLecturerEmail;
              const delReq = deleteModalCourse.deletionRequest;
              const isReqByMe = delReq?.status === 'pending' && delReq?.requestedBy === currentUser?.email;
              const isReqByColleague = delReq?.status === 'pending' && delReq?.requestedBy !== currentUser?.email;

              if (isReqByColleague) {
                return (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="text-center space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                        Permohonan Penghapusan dari Rekan
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Konfirmasi Persetujuan Hapus Kelas
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Rekan dosen Anda (<strong>{delReq?.requestedByName}</strong>) telah mengajukan permohonan penghapusan kelas <strong>{deleteModalCourse.code} - {deleteModalCourse.title}</strong>.
                      </p>
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                        Jika Anda menyetujui, kelas beserta 16 pertemuan dan data mahasiswa akan dihapus permanen untuk Anda berdua.
                      </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleRespondDeleteRequest(deleteModalCourse.id, false)}
                        className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        Tolak
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondDeleteRequest(deleteModalCourse.id, true)}
                        className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
                      >
                        Setujui Hapus Permanen
                      </button>
                    </div>
                  </>
                );
              }

              if (isReqByMe) {
                return (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
                      <Clock className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900">
                        Menunggu Persetujuan Rekan
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Pengajuan Penghapusan Sedang Berjalan
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Anda telah mengajukan permohonan penghapusan untuk kelas <strong>{deleteModalCourse.code} - {deleteModalCourse.title}</strong>. Notifikasi konfirmasi telah dikirimkan ke rekan dosen Anda.
                      </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setDeleteModalCourse(null)}
                        className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        Tutup
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelDeleteRequest(deleteModalCourse.id)}
                        className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
                      >
                        Batalkan Pengajuan
                      </button>
                    </div>
                  </>
                );
              }

              if (hasActivePartner) {
                return (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="text-center space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900">
                        🔒 Perlindungan Kelas Kolaborasi
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Pengajuan Hapus Kelas Bersama
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Mata kuliah <strong>{deleteModalCourse.code} - {deleteModalCourse.title}</strong> diampu bersama oleh tim dosen (<strong>{deleteModalCourse.teacher?.name}</strong> & <strong>{deleteModalCourse.secondaryTeacher?.name || deleteModalCourse.partnerLecturer}</strong>).
                      </p>
                      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-left text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                        Agar data pengajaran tidak terhapus sepihak, penghapusan memerlukan <strong>persetujuan (ACC) dari rekan dosen pengampu</strong>. Notifikasi persetujuan akan dikirimkan ke rekan dosen Anda.
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setDeleteModalCourse(null)}
                        className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestCollaborativeDelete(deleteModalCourse.id)}
                        className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
                      >
                        Ajukan Hapus ke Rekan
                      </button>
                    </div>
                  </>
                );
              }

              // Solo course deletion
              return (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Hapus Kelas Perkuliahan?
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Apakah Anda yakin ingin menghapus kelas <strong>{deleteModalCourse.code} - {deleteModalCourse.title}</strong>? Seluruh data 16 pertemuan, silabus, dan daftar mahasiswa akan dihapus permanen.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeleteModalCourse(null)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmSoloDelete(deleteModalCourse.id)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
                    >
                      Hapus Permanen
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
