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
  Sparkles,
  Edit3,
  CheckSquare,
  BookOpen,
  Layers,
  Link as LinkIcon
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
  Announcement,
  MaterialType
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
  const [studentToRemove, setStudentToRemove] = useState<string | null>(null);

  // Edit Course Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCode, setEditCode] = useState(course.code);
  const [editTitle, setEditTitle] = useState(course.title);
  const [editSection, setEditSection] = useState(course.section || 'Kelas A');
  const [editCredits, setEditCredits] = useState<number>(course.credits || 3);
  const [editSemester, setEditSemester] = useState(course.semester || 'Semester 5');
  const [editDay, setEditDay] = useState(course.scheduleDay || 'Senin');
  const [editTime, setEditTime] = useState(course.scheduleTime || '08:00 - 10:30 WIB');
  const [editRoom, setEditRoom] = useState(course.room || 'Lab Komputasi Spasial Lt. 3');
  const [editDesc, setEditDesc] = useState(course.description || '');

  const handleOpenEditModal = () => {
    setEditCode(course.code);
    setEditTitle(course.title);
    setEditSection(course.section || 'Kelas A');
    setEditCredits(course.credits || 3);
    setEditSemester(course.semester || 'Semester 5');
    setEditDay(course.scheduleDay || 'Senin');
    setEditTime(course.scheduleTime || '08:00 - 10:30 WIB');
    setEditRoom(course.room || 'Lab Komputasi Spasial Lt. 3');
    setEditDesc(course.description || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEditCourse = (e: React.FormEvent) => {
    e.preventDefault();
    studentService.updateCourse(course.id, {
      code: editCode,
      title: editTitle,
      section: editSection,
      credits: Number(editCredits) || 3,
      semester: editSemester,
      scheduleDay: editDay,
      scheduleTime: editTime,
      room: editRoom,
      description: editDesc,
    });
    setIsEditModalOpen(false);
    onDataUpdated();
  };

  // Resilient course matcher (handles ID vs code format differences)
  const isMatchCourse = (targetCourseId?: string) => {
    if (!targetCourseId) return false;
    if (targetCourseId === course.id) return true;
    const cCode = (course.code || '').toUpperCase();
    const tCode = targetCourseId.toUpperCase();
    if (cCode && (tCode.includes(cCode) || cCode.includes(tCode))) return true;
    return false;
  };

  // Filters for this class
  const classMeetings = [...meetings.filter((m) => isMatchCourse(m.courseId))].sort(
    (a, b) => a.meetingNumber - b.meetingNumber
  );
  const classAssignments = assignments.filter((a) => isMatchCourse(a.courseId));
  const classSubmissions = submissions.filter((s) =>
    classAssignments.some((a) => a.id === s.assignmentId)
  );
  const classAnnouncements = announcements.filter((a) => isMatchCourse(a.courseId));
  const activeMeetingSession = attendanceSessions.find((s) => isMatchCourse(s.courseId) && s.isOpen);

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
    setStudentToRemove(email);
  };

  const handleConfirmRemoveEmail = () => {
    if (studentToRemove) {
      studentService.removeStudentEmailFromCourse(course.id, studentToRemove);
      setStudentToRemove(null);
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

  // Pertemuan (Meeting) Modal & CRUD states
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [mNum, setMNum] = useState<number>(1);
  const [mTitle, setMTitle] = useState('');
  const [mTopic, setMTopic] = useState('');
  const [mDate, setMDate] = useState('');
  const [mStartTime, setMStartTime] = useState('08:00');
  const [mEndTime, setMEndTime] = useState('10:30');
  const [mRoom, setMRoom] = useState(course.room || 'Lab Komputasi Spasial Lt. 3');
  const [mIsOnline, setMIsOnline] = useState(false);
  const [mMeetingLink, setMMeetingLink] = useState('');
  const [mDescription, setMDescription] = useState('');

  // Material Modal states
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [targetMeetingForMaterial, setTargetMeetingForMaterial] = useState<Meeting | null>(null);
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState<MaterialType>('pdf');
  const [matUrl, setMatUrl] = useState('');
  const [matDescription, setMatDescription] = useState('');

  // Tugas (Assignment) Tab & CRUD states
  const [tugasSubTab, setTugasSubTab] = useState<'daftar_tugas' | 'koreksi'>('daftar_tugas');
  const [selectedAssignmentFilter, setSelectedAssignmentFilter] = useState<string>('semua');
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [asgTitle, setAsgTitle] = useState('');
  const [asgMeetingId, setAsgMeetingId] = useState('');
  const [asgDeadline, setAsgDeadline] = useState('');
  const [asgInstructions, setAsgInstructions] = useState('');
  const [asgAllowedFormats, setAsgAllowedFormats] = useState('.pdf, .zip, .docx');
  const [asgMaxFileSizeMb, setAsgMaxFileSizeMb] = useState<number>(25);
  const [asgAllowTextResponse, setAsgAllowTextResponse] = useState(true);

  // Pertemuan handlers
  const handleOpenMeetingModal = (meeting?: Meeting) => {
    if (meeting) {
      setEditingMeeting(meeting);
      setMNum(meeting.meetingNumber);
      setMTitle(meeting.title);
      setMTopic(meeting.topic || '');
      setMDate(meeting.date || new Date().toISOString().split('T')[0]);
      setMStartTime(meeting.startTime || '08:00');
      setMEndTime(meeting.endTime || '10:30');
      setMRoom(meeting.room || course.room || 'Lab Komputasi Spasial Lt. 3');
      setMIsOnline(Boolean(meeting.isOnline));
      setMMeetingLink(meeting.meetingLink || '');
      setMDescription(meeting.description || '');
    } else {
      setEditingMeeting(null);
      const nextNum = classMeetings.length > 0 
        ? Math.max(...classMeetings.map((m) => m.meetingNumber)) + 1 
        : 1;
      setMNum(nextNum);
      setMTitle(`Pertemuan ${nextNum}: `);
      setMTopic('');
      const today = new Date().toISOString().split('T')[0];
      setMDate(today);
      setMStartTime('08:00');
      setMEndTime('10:30');
      setMRoom(course.room || 'Lab Komputasi Spasial Lt. 3');
      setMIsOnline(false);
      setMMeetingLink('');
      setMDescription('');
    }
    setMeetingModalOpen(true);
  };

  const handleSaveMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle.trim()) return;

    if (editingMeeting) {
      studentService.updateMeeting(editingMeeting.id, {
        meetingNumber: Number(mNum) || 1,
        title: mTitle.trim(),
        topic: mTopic.trim(),
        date: mDate,
        startTime: mStartTime,
        endTime: mEndTime,
        room: mRoom,
        isOnline: mIsOnline,
        meetingLink: mMeetingLink.trim(),
        description: mDescription.trim(),
      });
    } else {
      studentService.createMeeting({
        courseId: course.id,
        meetingNumber: Number(mNum) || (classMeetings.length + 1),
        title: mTitle.trim(),
        topic: mTopic.trim(),
        date: mDate,
        startTime: mStartTime,
        endTime: mEndTime,
        room: mRoom,
        isOnline: mIsOnline,
        meetingLink: mMeetingLink.trim(),
        description: mDescription.trim(),
      });
    }
    setMeetingModalOpen(false);
    setEditingMeeting(null);
    onDataUpdated();
  };

  const handleConfirmDeleteMeeting = () => {
    if (meetingToDelete) {
      studentService.deleteMeeting(meetingToDelete.id);
      setMeetingToDelete(null);
      onDataUpdated();
    }
  };

  const handleGenerate16Meetings = () => {
    studentService.generate16MeetingsForCourse(course.id);
    onDataUpdated();
  };

  // Material handlers
  const handleOpenMaterialModal = (meeting: Meeting) => {
    setTargetMeetingForMaterial(meeting);
    setMatTitle('');
    setMatType('pdf');
    setMatUrl('');
    setMatDescription('');
    setMaterialModalOpen(true);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMeetingForMaterial || !matTitle.trim()) return;

    studentService.addMaterialToMeeting(targetMeetingForMaterial.id, {
      title: matTitle.trim(),
      type: matType,
      url: matUrl.trim(),
      description: matDescription.trim(),
    });
    setMaterialModalOpen(false);
    setTargetMeetingForMaterial(null);
    onDataUpdated();
  };

  const handleDeleteMaterial = (meetingId: string, materialId: string) => {
    studentService.deleteMaterialFromMeeting(meetingId, materialId);
    onDataUpdated();
  };

  // Tugas handlers
  const handleOpenAssignmentModal = (assignment?: Assignment) => {
    if (assignment) {
      setEditingAssignment(assignment);
      setAsgTitle(assignment.title);
      setAsgMeetingId(assignment.meetingId || '');
      setAsgDeadline(assignment.deadline || '');
      setAsgInstructions(assignment.instructions || '');
      setAsgAllowedFormats((assignment.allowedFormats || ['.pdf', '.zip']).join(', '));
      setAsgMaxFileSizeMb(assignment.maxFileSizeMb || 25);
      setAsgAllowTextResponse(assignment.allowTextResponse !== false);
    } else {
      setEditingAssignment(null);
      setAsgTitle(`Tugas ${classAssignments.length + 1}: `);
      setAsgMeetingId(classMeetings[0]?.id || '');
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(23, 59, 0, 0);
      const pad = (n: number) => String(n).padStart(2, '0');
      const defaultDeadline = `${nextWeek.getFullYear()}-${pad(nextWeek.getMonth() + 1)}-${pad(nextWeek.getDate())}T${pad(nextWeek.getHours())}:${pad(nextWeek.getMinutes())}`;
      setAsgDeadline(defaultDeadline);
      setAsgInstructions('');
      setAsgAllowedFormats('.pdf, .zip, .docx');
      setAsgMaxFileSizeMb(25);
      setAsgAllowTextResponse(true);
    }
    setAssignmentModalOpen(true);
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asgTitle.trim() || !asgDeadline) return;

    const formats = asgAllowedFormats
      .split(/[,;\s]+/)
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
      .map((f) => (f.startsWith('.') ? f : `.${f}`));

    if (editingAssignment) {
      studentService.updateAssignment(editingAssignment.id, {
        title: asgTitle.trim(),
        meetingId: asgMeetingId || undefined,
        deadline: asgDeadline,
        instructions: asgInstructions.trim(),
        allowedFormats: formats.length > 0 ? formats : ['.pdf'],
        maxFileSizeMb: Number(asgMaxFileSizeMb) || 25,
        allowTextResponse: asgAllowTextResponse,
      });
    } else {
      studentService.createAssignment({
        courseId: course.id,
        meetingId: asgMeetingId || undefined,
        title: asgTitle.trim(),
        instructions: asgInstructions.trim(),
        deadline: asgDeadline,
        allowedFormats: formats.length > 0 ? formats : ['.pdf'],
        maxFileSizeMb: Number(asgMaxFileSizeMb) || 25,
        allowTextResponse: asgAllowTextResponse,
      });
    }

    setAssignmentModalOpen(false);
    setEditingAssignment(null);
    onDataUpdated();
  };

  const handleConfirmDeleteAssignment = () => {
    if (assignmentToDelete) {
      studentService.deleteAssignment(assignmentToDelete.id);
      setAssignmentToDelete(null);
      onDataUpdated();
    }
  };

  const tabs = [
    { id: 'mahasiswa' as LecturerClassTab, label: `Mahasiswa Terdaftar (${course.enrolledStudentEmails?.length || 0})`, icon: Users },
    { id: 'pertemuan' as LecturerClassTab, label: `Pertemuan & Materi (${classMeetings.length})`, icon: Calendar },
    { id: 'rps' as LecturerClassTab, label: 'RPS & Silabus', icon: FileText },
    { id: 'tugas' as LecturerClassTab, label: `Tugas & Koreksi (${classAssignments.length})`, icon: CheckSquare },
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
              {course.section || 'Kelas A'} • {course.credits || 3} SKS • {course.semester}
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

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span>Dosen Utama: <strong>{course.teacher?.name || course.primaryLecturer || 'Dosen Pengampu'}</strong></span>
            {course.secondaryTeacher?.name ? (
              <span>• Dosen Partner: <strong>{course.secondaryTeacher.name}</strong></span>
            ) : (!course.secondaryTeacher && course.partnerLecturer && !course.partnerLecturer.startsWith('PENDING:') && course.partnerLecturer !== '-') ? (
              <span>• Dosen Partner: <strong>{course.partnerLecturer}</strong></span>
            ) : course.pendingLecturerEmail ? (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-200 border border-amber-400/30">
                ⏳ Menunggu Konfirmasi Mitra: {course.pendingLecturerName || course.pendingLecturerEmail}
              </span>
            ) : null}
          </div>

          {course.deletionRequest?.status === 'pending' && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span>⚠️</span>
                <span>
                  Permohonan penghapusan kelas diajukan oleh <strong>{course.deletionRequest.requestedByName}</strong>.
                </span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Persetujuan Tertunda
              </span>
            </div>
          )}
        </div>

        {/* Active Session Status or Guidance & Edit Button */}
        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            type="button"
            onClick={handleOpenEditModal}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Edit Detail & Jadwal Kelas"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-300" />
            <span>Edit Kelas</span>
          </button>

          {activeMeetingSession ? (
            <button
              onClick={() => onOpenQrBroadcast(activeMeetingSession)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center justify-center gap-2 transition-all animate-pulse"
            >
              <QrCode className="w-4 h-4" />
              <span>Buka Proyektor Sesi #{activeMeetingSession.meetingNumber} (LIVE)</span>
            </button>
          ) : (
            <div className="px-3.5 py-2 rounded-xl bg-white/10 text-slate-300 text-xs border border-white/15 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Buka Presensi langsung melalui Pertemuan 1 s.d. 16</span>
            </div>
          )}
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

            {/* Quick Pick from Master Database */}
            {(() => {
              const masterStudents = studentService.getMasterStudents();
              const availableStudents = masterStudents.filter(
                (s) => !(course.enrolledStudentEmails || []).some((e) => e.toLowerCase() === s.email.toLowerCase())
              );
              if (availableStudents.length === 0) return null;

              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-blue-50/60 dark:bg-slate-800/60 border border-blue-200/60 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-semibold text-blue-950 dark:text-blue-200">
                      Pilih dari Basis Data Mahasiswa:
                    </span>
                  </div>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        studentService.addStudentEmailToCourse(course.id, e.target.value);
                        onDataUpdated();
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 border border-blue-200 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Mahasiswa ({availableStudents.length} tersedia) --</option>
                    {availableStudents.map((s) => (
                      <option key={s.id || s.email} value={s.email}>
                        {s.nim} - {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Sesi Perkuliahan ({classMeetings.length})
              </h3>
              <p className="text-xs text-slate-500">
                Kelola topik bahasan, materi perkuliahan, dan presensi QR per sesi pertemuan.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {classMeetings.length === 0 && (
                <button
                  type="button"
                  onClick={handleGenerate16Meetings}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Generate 16 Sesi OBE</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenMeetingModal()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Sesi Pertemuan</span>
              </button>
            </div>
          </div>

          {classMeetings.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Belum Ada Sesi Pertemuan Kuliah
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Mata kuliah ini belum memiliki daftar pertemuan. Anda dapat menyusun 16 sesi otomatis berstandar OBE atau menambahkannya secara manual satu per satu.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleGenerate16Meetings}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md inline-flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  <span>Susun Otomatis 16 Pertemuan OBE</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenMeetingModal()}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Sesi Manual</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {classMeetings.map((m) => (
                <div
                  key={m.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        Sesi #{m.meetingNumber} • {formatIndonesianDate(m.date)}
                      </span>
                      {m.isOnline && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          Daring / Online
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                        {m.startTime} - {m.endTime} WIB ({m.room})
                      </span>
                      <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
                        <button
                          type="button"
                          onClick={() => handleOpenMeetingModal(m)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                          title="Edit Sesi"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMeetingToDelete(m)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Hapus Sesi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {m.title}
                    </h4>
                    {m.topic && (
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                        Topik: {m.topic}
                      </p>
                    )}
                    {m.description && (
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        {m.description}
                      </p>
                    )}
                  </div>

                  {/* Materials Section */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        <span>Bahan Ajar & Materi ({m.materials?.length || 0})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenMaterialModal(m)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Materi</span>
                      </button>
                    </div>

                    {m.materials && m.materials.length > 0 ? (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {m.materials.map((mat) => {
                          const matUrl = mat.fileUrl || mat.embedUrl || mat.externalUrl;
                          return (
                            <div
                              key={mat.id}
                              className="group px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2 transition-colors"
                            >
                              {mat.type === 'pdf' && <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                              {mat.type === 'heyzine' && <ExternalLink className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                              {mat.type === 'youtube' && <Video className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                              {mat.type === 'slide' && <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                              {mat.type === 'document' && <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                              {mat.type === 'link' && <LinkIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                              
                              {matUrl ? (
                                <a
                                  href={matUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline flex items-center gap-1 text-slate-800 dark:text-slate-200"
                                >
                                  <span>{mat.title}</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
                                </a>
                              ) : (
                                <span>{mat.title}</span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteMaterial(m.id, mat.id)}
                                className="ml-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                title="Hapus materi"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Belum ada materi terlampir pada sesi ini.{' '}
                        <button
                          type="button"
                          onClick={() => handleOpenMaterialModal(m)}
                          className="text-blue-600 hover:underline not-italic font-semibold cursor-pointer"
                        >
                          + Tambah Materi Sekarang
                        </button>
                      </p>
                    )}
                  </div>

                  {/* Meeting Attendance Control Bar */}
                  {(() => {
                    const isCurrentMeetingLive = attendanceSessions.some(
                      (s) => s.courseId === course.id && s.meetingId === m.id && s.isOpen
                    );
                    const currentSess = attendanceSessions.find(
                      (s) => s.courseId === course.id && s.meetingId === m.id
                    );
                    const attendeeCount = attendanceRecords.filter(
                      (r) => r.courseId === course.id && r.meetingId === m.id && r.status === 'hadir'
                    ).length;

                    return (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs">
                          {isCurrentMeetingLive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800 animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Presensi Pertemuan #{m.meetingNumber} SEDANG LIVE
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">
                              Terdata Hadir: <strong className="text-emerald-600 dark:text-emerald-400">{attendeeCount}</strong> / {course.enrolledStudentEmails?.length || 0} Mahasiswa
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {isCurrentMeetingLive && currentSess ? (
                            <>
                              <button
                                onClick={() => onOpenQrBroadcast(currentSess)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Buka Proyektor QR</span>
                              </button>
                              <button
                                onClick={() => handleToggleSessionForMeeting(m.id, false)}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                              >
                                Tutup Presensi
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleToggleSessionForMeeting(m.id, true)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Buka Presensi QR Pertemuan #{m.meetingNumber}</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedMeetingIdForAttendance(m.id);
                              setActiveTab('presensi');
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            Rekap Mahasiswa &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
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
          {/* Subtab Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTugasSubTab('daftar_tugas')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tugasSubTab === 'daftar_tugas'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Daftar Tugas Kuliah ({classAssignments.length})
              </button>
              <button
                type="button"
                onClick={() => setTugasSubTab('koreksi')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tugasSubTab === 'koreksi'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Pengumpulan & Koreksi ({classSubmissions.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAssignmentModal()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Tugas Baru</span>
            </button>
          </div>

          {/* SUBTAB 1: DAFTAR TUGAS KULIAH */}
          {tugasSubTab === 'daftar_tugas' && (
            <div className="space-y-4">
              {classAssignments.length === 0 ? (
                <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
                    <CheckSquare className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Belum Ada Tugas Kuliah
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Buat tugas kuliah baru untuk memberikan penugasan praktikum, analisis spasial, atau laporan kepada mahasiswa terdaftar.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAssignmentModal()}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md inline-flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Buat Tugas Kuliah Pertama</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classAssignments.map((asg) => {
                    const subsForThis = classSubmissions.filter((s) => s.assignmentId === asg.id);
                    const linkedMeeting = classMeetings.find((m) => m.id === asg.meetingId);
                    const isPastDeadline = asg.deadline ? new Date(asg.deadline).getTime() < Date.now() : false;

                    return (
                      <div
                        key={asg.id}
                        className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {linkedMeeting ? (
                                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                  Sesi #{linkedMeeting.meetingNumber}
                                </span>
                              ) : (
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  Tugas Umum
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isPastDeadline
                                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                                }`}
                              >
                                {isPastDeadline ? 'Tenggat Berakhir' : 'Aktif'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenAssignmentModal(asg)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                                title="Edit Tugas"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setAssignmentToDelete(asg)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                title="Hapus Tugas"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <h4 className="text-base font-bold text-slate-900 dark:text-white">
                            {asg.title}
                          </h4>

                          {asg.instructions && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {asg.instructions}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                            <div>
                              <span className="block text-[10px] uppercase font-semibold text-slate-400">Tenggat Waktu</span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {asg.deadline ? formatIndonesianDate(asg.deadline, true) : '-'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-semibold text-slate-400">Format Berkas</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300 truncate block">
                                {asg.allowedFormats?.join(', ') || '.pdf'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              Terkumpul: <strong className="text-blue-600 dark:text-blue-400 font-mono">{subsForThis.length}</strong> / {course.enrolledStudentEmails?.length || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAssignmentFilter(asg.id);
                                setTugasSubTab('koreksi');
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 transition-colors cursor-pointer"
                            >
                              Lihat Koreksi &rarr;
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 2: PENGUMPULAN & KOREKSI MAHASISWA */}
          {tugasSubTab === 'koreksi' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Pengumpulan Jawaban Tugas Mahasiswa
                </h3>

                {classAssignments.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Filter Tugas:</span>
                    <select
                      value={selectedAssignmentFilter}
                      onChange={(e) => setSelectedAssignmentFilter(e.target.value)}
                      className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="semua">Semua Tugas ({classSubmissions.length})</option>
                      {classAssignments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} ({classSubmissions.filter((s) => s.assignmentId === a.id).length})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                      {(() => {
                        const filtered = classSubmissions.filter((s) => {
                          if (selectedAssignmentFilter === 'semua') return true;
                          return s.assignmentId === selectedAssignmentFilter;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">
                                Belum ada pengumpulan jawaban tugas mahasiswa yang terdata.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((sub) => {
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
                                {sub.fileUrl ? (
                                  <a
                                    href={sub.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-mono text-blue-600 dark:text-blue-400 underline cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <span>{sub.fileName || 'Unduh Berkas'}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="font-mono text-blue-600 dark:text-blue-400 underline cursor-pointer">
                                    {sub.fileName || 'Jawaban Teks'}
                                  </span>
                                )}
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
                                  type="button"
                                  onClick={() => {
                                    setGradingSubmission(sub);
                                    setGradeScore(sub.grade || 88);
                                    setGradeFeedback(sub.feedback || '');
                                  }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                                >
                                  {sub.grade !== undefined ? 'Edit Nilai' : 'Koreksi & Beri Nilai'}
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Grading Modal */}
          {gradingSubmission && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
              <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Formulir Penilaian & Umpan Balik Dosen
                  </h3>
                  <button onClick={() => setGradingSubmission(null)} className="text-slate-400 hover:text-white cursor-pointer">
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
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
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

      {/* ========================================================= */}
      {/* MODAL: EDIT DETAIL KELAS */}
      {/* ========================================================= */}
      {isEditModalOpen && (
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
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
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
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
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
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value)}
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
                    value={editCredits}
                    onChange={(e) => setEditCredits(Number(e.target.value) || 3)}
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
                    value={editSemester}
                    onChange={(e) => setEditSemester(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Hari Kuliah
                  </label>
                  <select
                    value={editDay}
                    onChange={(e) => setEditDay(e.target.value)}
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
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
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
                  placeholder="Contoh: Lab Komputasi Spasial Lt. 3"
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
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
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
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
      {/* Modal Konfirmasi Hapus Mahasiswa dari Kelas */}
      {studentToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hapus Akses Mahasiswa?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apakah Anda yakin ingin menghapus <strong className="font-mono text-slate-700 dark:text-slate-300">{studentToRemove}</strong> dari daftar kelas ini? Mahasiswa ini tidak akan bisa mengakses kelas lagi.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStudentToRemove(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveEmail}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Sesi Perkuliahan */}
      {meetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span>{editingMeeting ? `Edit Sesi Pertemuan #${editingMeeting.meetingNumber}` : 'Tambah Sesi Pertemuan Baru'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atur jadwal, topik bahasan, dan rincian pertemuan mata kuliah {course.title}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMeetingModalOpen(false);
                  setEditingMeeting(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMeeting} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nomor Sesi (1-16)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={32}
                    required
                    value={mNum}
                    onChange={(e) => setMNum(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tanggal Pertemuan
                  </label>
                  <input
                    type="date"
                    required
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Judul Pertemuan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pengantar Kartografi dan Konsep Dasar Pemetaan"
                  value={mTitle}
                  onChange={(e) => setMTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Topik / Pokok Bahasan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pengertian peta, klasifikasi peta tematik & topografi"
                  value={mTopic}
                  onChange={(e) => setMTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    required
                    value={mStartTime}
                    onChange={(e) => setMStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    required
                    value={mEndTime}
                    onChange={(e) => setMEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Ruang Kelas / Laboratorium
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lab Komputasi Spasial Lt. 3"
                  value={mRoom}
                  onChange={(e) => setMRoom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mIsOnline}
                    onChange={(e) => setMIsOnline(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Sesi Perkuliahan Daring (Online / Virtual)
                  </span>
                </label>
                {mIsOnline && (
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Tautan Ruang Virtual (Google Meet / Zoom):
                    </label>
                    <input
                      type="url"
                      placeholder="https://meet.google.com/..."
                      value={mMeetingLink}
                      onChange={(e) => setMMeetingLink(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Deskripsi / Capaian Pembelajaran Sesi
                </label>
                <textarea
                  rows={3}
                  placeholder="Rincian aktivitas perkuliahan dan capaian pertemuan ini..."
                  value={mDescription}
                  onChange={(e) => setMDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMeetingModalOpen(false);
                    setEditingMeeting(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  {editingMeeting ? 'Simpan Perubahan Sesi' : 'Buat Sesi Pertemuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Sesi Perkuliahan */}
      {meetingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hapus Sesi Pertemuan #{meetingToDelete.meetingNumber}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sesi <strong>{meetingToDelete.title}</strong> beserta bahan ajar dan data presensi sesi ini akan dihapus dari kelas.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMeetingToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMeeting}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
              >
                Hapus Sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Bahan Ajar Sesi */}
      {materialModalOpen && targetMeetingForMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span>Tambah Materi Sesi #{targetMeetingForMaterial.meetingNumber}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lampirkan modul, slide, video, atau tautan bacaan untuk mahasiswa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMaterialModalOpen(false);
                  setTargetMeetingForMaterial(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Judul Materi Perkuliahan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Modul 1 - Dasar Pemetaan Tematik"
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Format / Tipe Materi
                </label>
                <select
                  value={matType}
                  onChange={(e) => setMatType(e.target.value as MaterialType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="pdf">Dokumen PDF (.pdf)</option>
                  <option value="slide">Presentasi PPT / Slide</option>
                  <option value="heyzine">Flipbook Interaktif (Heyzine)</option>
                  <option value="youtube">Video Pembelajaran (YouTube)</option>
                  <option value="document">Dokumen / Modul Teks</option>
                  <option value="link">Tautan Web / Referensi Eksternal</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  URL / Tautan Materi
                </label>
                <input
                  type="url"
                  placeholder="Contoh: https://drive.google.com/... atau https://heyzine.com/..."
                  value={matUrl}
                  onChange={(e) => setMatUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Keterangan Singkat (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan petunjuk bacaan atau panduan penggunaan materi..."
                  value={matDescription}
                  onChange={(e) => setMatDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMaterialModalOpen(false);
                    setTargetMeetingForMaterial(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  Simpan Bahan Ajar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Buat / Edit Tugas Kuliah */}
      {assignmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                  <span>{editingAssignment ? 'Edit Tugas Kuliah' : 'Buat Tugas Kuliah Baru'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publikasikan instruksi dan tenggat waktu tugas untuk mata kuliah {course.title}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAssignmentModalOpen(false);
                  setEditingAssignment(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Judul Tugas
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tugas 1: Analisis Klasifikasi Peta Tematik"
                  value={asgTitle}
                  onChange={(e) => setAsgTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Terkait Sesi Pertemuan
                  </label>
                  <select
                    value={asgMeetingId}
                    onChange={(e) => setAsgMeetingId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Tugas Umum (Tanpa Sesi) --</option>
                    {classMeetings.map((m) => (
                      <option key={m.id} value={m.id}>
                        Sesi #{m.meetingNumber}: {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tenggat Waktu (Deadline)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={asgDeadline}
                    onChange={(e) => setAsgDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Instruksi & Petunjuk Pengerjaan
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tuliskan format pengerjaan, capaian yang dinilai, instruksi pengumpulan, dsb..."
                  value={asgInstructions}
                  onChange={(e) => setAsgInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Format Berkas Diizinkan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: .pdf, .zip, .docx"
                    value={asgAllowedFormats}
                    onChange={(e) => setAsgAllowedFormats(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Batas Ukuran Maksimal (MB)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={asgMaxFileSizeMb}
                    onChange={(e) => setAsgMaxFileSizeMb(Number(e.target.value) || 25)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={asgAllowTextResponse}
                    onChange={(e) => setAsgAllowTextResponse(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Izinkan Jawaban Teks Langsung (Selain Berkas)
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAssignmentModalOpen(false);
                    setEditingAssignment(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                >
                  {editingAssignment ? 'Simpan Perubahan Tugas' : 'Publikasikan Tugas Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Tugas Kuliah */}
      {assignmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hapus Tugas Kuliah?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apakah Anda yakin ingin menghapus <strong>{assignmentToDelete.title}</strong>? Seluruh data pengumpulan mahasiswa terkait tugas ini juga akan dihapus.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignmentToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAssignment}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
              >
                Hapus Tugas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
