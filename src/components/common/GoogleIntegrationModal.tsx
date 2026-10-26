import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Settings, 
  RefreshCw, 
  Database,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { googleDriveService, type DriveUploadResult, type SpreadsheetBackupResult } from '../../services/googleDriveService.ts';
import { isSupabaseConfigured, checkSupabaseConnection } from '../../services/supabaseClient.ts';
import { studentService } from '../../services/studentService.ts';

interface GoogleIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated?: () => void;
}

export const GoogleIntegrationModal: React.FC<GoogleIntegrationModalProps> = ({
  isOpen,
  onClose,
  onDataUpdated,
}) => {
  const [gasUrl, setGasUrl] = useState(() => googleDriveService.getGasApiUrl());
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connStatus, setConnStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });

  // Test File Upload State
  const [testFile, setTestFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<DriveUploadResult | null>(null);

  // Backup to Sheets State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<SpreadsheetBackupResult | null>(null);

  // Supabase check state
  const [supabaseStatus, setSupabaseStatus] = useState<{ checked: boolean; connected: boolean; message: string }>({
    checked: false,
    connected: isSupabaseConfigured(),
    message: isSupabaseConfigured()
      ? 'Supabase terkonfigurasi di file .env'
      : 'Supabase berjalan dalam mode prototipe lokal (Belum mengisi VITE_SUPABASE_URL).',
  });

  if (!isOpen) return null;

  const handleSaveAndTestUrl = async () => {
    if (!gasUrl.trim()) {
      googleDriveService.setGasApiUrl('');
      setConnStatus({
        type: 'idle',
        message: 'URL dikosongkan. Portal menggunakan mode simulasi cerdas Google Drive & Sheets.',
      });
      return;
    }

    setIsTestingConn(true);
    setConnStatus({ type: 'idle', message: '' });

    googleDriveService.setGasApiUrl(gasUrl.trim());
    const res = await googleDriveService.testConnection(gasUrl.trim());

    setIsTestingConn(false);
    if (res.success) {
      setConnStatus({
        type: 'success',
        message: res.message,
      });
    } else {
      setConnStatus({
        type: 'error',
        message: res.message,
      });
    }
  };

  const handleTestUpload = async () => {
    if (!testFile) return;

    setIsUploading(true);
    setUploadResult(null);

    const currentUser = studentService.getCurrentUser();
    const res = await googleDriveService.uploadFile(testFile, {
      courseCode: 'TEST',
      category: 'UjiCoba',
      uploaderEmail: currentUser.email,
    });

    setIsUploading(false);
    setUploadResult(res);
  };

  const handleRunBackup = async () => {
    setIsBackingUp(true);
    setBackupResult(null);

    // Compile academic data for backup
    const courses = studentService.getAllCourses();
    const students = studentService.getAllPreRegisteredStudents();
    const attendance = studentService.getAttendanceRecords();
    const submissions = studentService.getSubmissions();
    const assignments = studentService.getAssignments();
    const user = studentService.getCurrentUser();

    // Prepare Attendance Matrix
    const attendanceRecap = students.map((std) => {
      const studentRecords = attendance.filter((r) => r.studentEmail.toLowerCase() === std.email.toLowerCase());
      const hadirCount = studentRecords.filter((r) => r.status === 'hadir').length;
      const total = 16;
      const percentage = Math.round((hadirCount / total) * 100);

      const pData: Record<string, string> = {};
      for (let i = 1; i <= 16; i++) {
        const rec = studentRecords.find((r) => {
          const meeting = studentService.getMeetingById(r.meetingId);
          return meeting?.meetingNumber === i;
        });
        pData[`p${i}`] = rec ? rec.status.toUpperCase() : '-';
      }

      return {
        nim: std.nim,
        studentName: std.name,
        studentEmail: std.email,
        courseCode: std.enrolledCourseCodes.join(', '),
        ...pData,
        totalHadir: hadirCount,
        percentage,
      };
    });

    // Prepare Submissions Recap
    const submissionsRecap = submissions.map((sub) => {
      const asg = assignments.find((a) => a.id === sub.assignmentId);
      const crs = asg ? courses.find((c) => c.id === asg.courseId) : null;
      return {
        studentName: sub.studentName,
        studentEmail: sub.studentEmail,
        courseCode: crs?.code || '-',
        assignmentTitle: asg?.title || 'Tugas Kuliah',
        submittedAt: new Date(sub.submittedAt).toLocaleString('id-ID'),
        isLate: sub.isLate,
        grade: sub.grade ?? null,
        feedback: sub.feedback,
        fileUrl: sub.fileUrl,
      };
    });

    // Prepare Students List
    const studentsList = students.map((std) => ({
      nim: std.nim,
      name: std.name,
      email: std.email,
      enrolledCourses: std.enrolledCourseCodes.join(', '),
      isRegistered: Boolean(std.registeredAt),
    }));

    const result = await googleDriveService.backupToSpreadsheet({
      backupBy: `${user.name} (${user.email})`,
      note: 'Pencadangan manual melalui Portal Dosen Smart Learning Hub',
      attendanceRecap,
      submissionsRecap,
      studentsList,
    });

    setIsBackingUp(false);
    setBackupResult(result);
  };

  const handleTestSupabase = async () => {
    const res = await checkSupabaseConnection();
    setSupabaseStatus({
      checked: true,
      connected: res.connected,
      message: res.message,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Integrasi Google Drive & Backup Spreadsheet
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hubungkan penyimpanan berkas ke Google Drive Dosen dan cadangkan rekap ke Google Sheets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* SECTION 1: Google Apps Script Web App URL */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" />
                1. Pengaturan URL Google Apps Script (Web App)
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                googleDriveService.isConfigured()
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {googleDriveService.isConfigured() ? 'Terkoneksi ke Google Drive' : 'Mode Simulasi Aktif'}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Masukkan URL Web App hasil <em>deploy</em> dari file <code>google-apps-script/Code.gs</code> di akun Google Anda. Jika dikosongkan, sistem tetap berjalan normal dengan mode simulasi cerdas.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="url"
                value={gasUrl}
                onChange={(e) => setGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveAndTestUrl}
                disabled={isTestingConn}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                {isTestingConn ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menguji...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Simpan & Tes Koneksi</span>
                  </>
                )}
              </button>
            </div>

            {connStatus.message && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                connStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                  : connStatus.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200'
                  : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
              }`}>
                {connStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{connStatus.message}</span>
              </div>
            )}
          </div>

          {/* SECTION 2: Uji Coba Upload Berkas ke Google Drive */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              2. Uji Coba Langsung Unggah Berkas ke Google Drive
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Pilih berkas apa pun dari komputer Anda (PDF, Dokumen, Gambar, atau ZIP) untuk menguji pengiriman ke Google Drive dosen.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="file"
                onChange={(e) => setTestFile(e.target.files ? e.target.files[0] : null)}
                className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-blue-300"
              />
              <button
                onClick={handleTestUpload}
                disabled={!testFile || isUploading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengunggah...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah ke Drive Sekarang</span>
                  </>
                )}
              </button>
            </div>

            {/* Upload Result Feedback */}
            {uploadResult && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    {uploadResult.message || 'Berkas Berhasil Diunggah!'}
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                    {(uploadResult.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-600 dark:text-slate-300 truncate max-w-xs font-medium">
                    {uploadResult.fileName}
                  </span>
                  <a
                    href={uploadResult.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Tautan Google Drive</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Backup ke Google Spreadsheet */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                3. Cadangkan Seluruh Data Kelas ke Google Spreadsheet
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Sistem akan merangkum: (1) Matriks Presensi 16 Pertemuan per mahasiswa, (2) Rekap Nilai & Pengumpulan Tugas, serta (3) Daftar Mahasiswa Terdaftar ke dalam lembar Google Sheets yang tertata rapi.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <button
                onClick={handleRunBackup}
                disabled={isBackingUp}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                {isBackingUp ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sedang Menyinkronkan ke Spreadsheet...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Mulai Pencadangan ke Google Sheets</span>
                  </>
                )}
              </button>

              {googleDriveService.getLastBackupSheetUrl() && !backupResult && (
                <a
                  href={googleDriveService.getLastBackupSheetUrl()!}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 justify-center sm:justify-start"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Spreadsheet Cadangan Terakhir</span>
                </a>
              )}
            </div>

            {backupResult && (
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-800 dark:text-indigo-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    {backupResult.message}
                  </span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                    {backupResult.timestamp}
                  </span>
                </div>
                <div className="pt-2 flex justify-end">
                  <a
                    href={backupResult.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Google Spreadsheet Hasil Backup &rarr;</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: Status Database Supabase */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                4. Status Database Supabase (Cloud PostgreSQL)
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                supabaseStatus.connected
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {supabaseStatus.connected ? 'Supabase Terhubung' : 'Mode Prototipe Lokal'}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {supabaseStatus.message}
            </p>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleTestSupabase}
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                Cek Koneksi Supabase
              </button>
              <span className="text-xs text-slate-400">
                Panduan setup akun baru tersedia di <code>supabase/README.md</code>
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Smart Learning Hub v2.0 • Tim Dosen Berdua</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
