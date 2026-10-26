import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  FileText, 
  Video, 
  BookOpen, 
  Sparkles, 
  AlertCircle,
  QrCode,
  Layers,
  Maximize2
} from 'lucide-react';
import type { 
  Meeting, 
  CourseClass, 
  Assignment, 
  AssignmentSubmission 
} from '../../types/index.ts';
import { formatIndonesianDate } from '../../utils/academicCalculations.ts';
import { studentService } from '../../services/studentService.ts';

interface MeetingDetailViewProps {
  meeting: Meeting;
  course: CourseClass;
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  onBack: () => void;
  onOpenAssignment: (assignmentId: string) => void;
  onOpenAttendanceCheckIn: () => void;
  onToggleCompleted: (meetingId: string) => void;
}

export const MeetingDetailView: React.FC<MeetingDetailViewProps> = ({
  meeting,
  course,
  assignments,
  submissions,
  onBack,
  onOpenAssignment,
  onOpenAttendanceCheckIn,
  onToggleCompleted,
}) => {
  const [activeMaterialTab, setActiveMaterialTab] = useState<'pdf' | 'heyzine' | 'youtube' | 'all'>('all');
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(100);

  // Find related assignments
  const relatedAssignments = assignments.filter((a) => a.meetingId === meeting.id);

  // Published materials only
  const materials = meeting.materials?.filter((m) => m.isPublished) || [];
  const pdfMaterials = materials.filter((m) => m.type === 'pdf');
  const heyzineMaterials = materials.filter((m) => m.type === 'heyzine');
  const youtubeMaterials = materials.filter((m) => m.type === 'youtube');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Detail Kelas</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Pertemuan {meeting.meetingNumber}
          </span>
        </div>

        {/* Personal Study Completion Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleCompleted(meeting.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              meeting.isCompletedByStudent
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-emerald-400'
            }`}
            title="Catatan mandiri mahasiswa (bukan pengganti absensi dosen)"
          >
            <CheckCircle2
              className={`w-4 h-4 ${
                meeting.isCompletedByStudent ? 'text-emerald-600 fill-emerald-100 dark:fill-emerald-900' : 'text-slate-400'
              }`}
            />
            <span>
              {meeting.isCompletedByStudent
                ? 'Selesai Dipelajari (Tersimpan)'
                : 'Tandai Selesai Dipelajari'}
            </span>
          </button>
        </div>
      </div>

      {/* Meeting Header Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono">
              {course.code}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Sesi #{meeting.meetingNumber}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {course.title}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>{meeting.startTime} - {meeting.endTime} WIB</span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {meeting.title}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {meeting.description}
        </p>

        {/* Schedule & Location Pills */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-4 h-4 text-slate-400" />
            {formatIndonesianDate(meeting.date)}
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <MapPin className="w-4 h-4 text-slate-400" />
            {meeting.room}
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Dosen: {course.teacher.name}
          </span>
        </div>

        {/* Distinction Banner: Personal Progress vs Official Attendance */}
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Informasi Pelacakan Progres Mandiri</p>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
              Tombol "Tandai Selesai Dipelajari" berfungsi untuk memantau ritme belajar pribadi Anda. Kehadiran resmi perkuliahan tetap dihitung secara sah melalui pemindaian Presensi QR atau konfirmasi dosen.
            </p>
          </div>
        </div>
      </div>

      {/* Learning Objectives & Activities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Objectives */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Capaian Pembelajaran (Learning Objectives)
          </h3>
          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            {meeting.learningObjectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{obj}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Activities */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            Alur Aktivitas Kuliah
          </h3>
          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            {meeting.activities.map((act, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                <span className="leading-relaxed">{act}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Learning Materials Section (PDF, Heyzine, YouTube) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Materi Pembelajaran Digital
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Akses bahan ajar, modul PDF interaktif, flipbook Heyzine, dan video penjelasan dosen
            </p>
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveMaterialTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMaterialTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Semua ({materials.length})
            </button>
            <button
              onClick={() => setActiveMaterialTab('pdf')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMaterialTab === 'pdf'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              PDF ({pdfMaterials.length})
            </button>
            <button
              onClick={() => setActiveMaterialTab('heyzine')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMaterialTab === 'heyzine'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Heyzine ({heyzineMaterials.length})
            </button>
            <button
              onClick={() => setActiveMaterialTab('youtube')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMaterialTab === 'youtube'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Video ({youtubeMaterials.length})
            </button>
          </div>
        </div>

        {/* 1. PDF Materials Embedded Viewer */}
        {(activeMaterialTab === 'all' || activeMaterialTab === 'pdf') && pdfMaterials.length > 0 && (
          <div className="space-y-4">
            {pdfMaterials.map((pdf) => (
              <div
                key={pdf.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
              >
                {/* PDF Viewer Header */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                      PDF
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {pdf.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {pdf.fileName} • {((pdf.fileSizeBytes || 3500000) / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                  </div>

                  {/* PDF Toolbar Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs px-2 py-1 gap-2">
                      <button
                        onClick={() => setPdfPage(Math.max(1, pdfPage - 1))}
                        className="text-slate-600 dark:text-slate-300 hover:font-bold"
                        aria-label="Halaman sebelumnya"
                      >
                        Prev
                      </button>
                      <span className="font-mono text-slate-500">Hal {pdfPage}/24</span>
                      <button
                        onClick={() => setPdfPage(Math.min(24, pdfPage + 1))}
                        className="text-slate-600 dark:text-slate-300 hover:font-bold"
                        aria-label="Halaman berikutnya"
                      >
                        Next
                      </button>
                    </div>

                    <a
                      href={pdf.fileUrl || '#'}
                      download={pdf.fileName || 'Materi.pdf'}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PDF</span>
                    </a>
                  </div>
                </div>

                {/* Simulated Embedded Document Canvas View */}
                <div className="p-6 bg-slate-100 dark:bg-slate-950/80 flex flex-col items-center justify-center min-h-[360px]">
                  <div className="w-full max-w-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        SMART LEARNING HUB • DOKUMEN MODUL RESMI
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Halaman {pdfPage} dari 24</span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {meeting.title}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Dokumen ini berisi panduan komprehensif terkait topik {meeting.topic}. Mahasiswa diharapkan membaca setiap bagian dengan seksama sebelum mengerjakan tugas dan mengikuti sesi tanya jawab di ruang kuliah.
                    </p>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Rangkuman Konsep Kunci:
                      </span>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 list-disc list-inside space-y-1">
                        <li>Definisi arsitektur token JWT dan keamanan signature HMAC SHA-256</li>
                        <li>Prinsip least privilege dalam Role-Based Access Control (RBAC)</li>
                        <li>Penanganan status session timeout dan refresh rotation</li>
                      </ul>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Hak Cipta © {new Date().getFullYear()} Universitas</span>
                      <span>Dosen: {course.teacher.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. Heyzine Digital Publication Viewer */}
        {(activeMaterialTab === 'all' || activeMaterialTab === 'heyzine') && heyzineMaterials.length > 0 && (
          <div className="space-y-4">
            {heyzineMaterials.map((hz) => (
              <div
                key={hz.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
              >
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                      HZ
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {hz.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Publikasi Digital Heyzine Flipbook Interaktif
                      </p>
                    </div>
                  </div>

                  <a
                    href={hz.externalUrl || hz.embedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    <span>Buka Eksternal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Heyzine interactive preview & fallback container */}
                <div className="relative p-6 bg-slate-900 text-white flex flex-col items-center justify-center min-h-[380px] overflow-hidden">
                  <div className="max-w-md text-center space-y-3 z-10">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center mx-auto shadow-lg">
                      <BookOpen className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-white">
                      Heyzine Digital Flipbook Viewer
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Publikasi digital format majalah interaktif dengan animasi pembalikan halaman buku dan indeks bab lengkap.
                    </p>
                    <div className="pt-2 flex justify-center gap-3">
                      <a
                        href={hz.externalUrl || hz.embedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-md transition-all"
                      >
                        <span>Buka Flipbook Penuh di Heyzine</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Visual simulated book layer */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:16px_16px]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. YouTube Embedded Video Player */}
        {(activeMaterialTab === 'all' || activeMaterialTab === 'youtube') && youtubeMaterials.length > 0 && (
          <div className="space-y-4">
            {youtubeMaterials.map((yt) => (
              <div
                key={yt.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
              >
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs shrink-0">
                      YT
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {yt.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Video Kuliah • Durasi ~{yt.durationMinutes || 25} Menit
                      </p>
                    </div>
                  </div>

                  {yt.externalUrl && (
                    <a
                      href={yt.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      <span>Tonton di YouTube</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Video Responsive Embed */}
                <div className="aspect-video w-full bg-black">
                  <iframe
                    src={yt.embedUrl}
                    title={yt.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related Assignments & Quick Attendance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
        {/* Related Assignment */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-indigo-500" />
            Tugas Terkait Pertemuan Ini
          </h3>
          {relatedAssignments.length > 0 ? (
            <div className="space-y-3">
              {relatedAssignments.map((asg) => (
                <div key={asg.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {asg.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Tenggat: {formatIndonesianDate(asg.deadline, true)}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenAssignment(asg.id)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  >
                    Kerjakan
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Tidak ada tugas wajib yang ditautkan pada sesi ini.</p>
          )}
        </div>

        {/* Attendance Action */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1.5">
              <QrCode className="w-4 h-4 text-emerald-500" />
              Presensi Kehadiran Kuliah
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Buka pemindai QR untuk merekam kehadiran resmi Anda saat dosen mengaktifkan sesi presensi di kelas tatap muka atau lab.
            </p>
          </div>

          <div className="mt-4 pt-3">
            <button
              onClick={onOpenAttendanceCheckIn}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>Buka Layar Presensi QR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
