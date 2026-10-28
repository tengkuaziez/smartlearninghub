import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  Search,
  Plus,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  GraduationCap,
  Trash2,
  Edit2,
  BookOpen,
  Filter,
  ShieldCheck,
  X,
  UserPlus,
  Layers,
  ArrowRight,
  FileSpreadsheet,
  FileDown,
  Download,
  CloudUpload,
  Check,
} from 'lucide-react';
import { studentService, getInitialsAvatar } from '../../services/studentService.ts';
import { myJourneySyncService } from '../../services/myJourneySyncService.ts';
import type { MasterStudent, CourseClass } from '../../types/index.ts';

interface LecturerStudentManagementViewProps {
  courses: CourseClass[];
  onDataUpdated: () => void;
}

export const LecturerStudentManagementView: React.FC<LecturerStudentManagementViewProps> = ({
  courses,
  onDataUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [filterMajor, setFilterMajor] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'registered' | 'unregistered'>('all');

  const [notification, setNotification] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal: Add / Edit Single Student
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formNim, setFormNim] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMajor, setFormMajor] = useState('Sains Informasi Geografi');
  const [formClassSection, setFormClassSection] = useState('Kelas A');
  const [formSelectedCourses, setFormSelectedCourses] = useState<string[]>([]);

  // Modal: Impor Data Mahasiswa via CSV (Persis My Journey)
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsedStudents, setCsvParsedStudents] = useState<Array<{ name: string; nim: string; email: string }>>([]);
  const [csvParseError, setCsvParseError] = useState<string | null>(null);
  const [isCsvDragging, setIsCsvDragging] = useState(false);
  const [csvTargetClass, setCsvTargetClass] = useState('Kelas A');
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [customClassName, setCustomClassName] = useState('');
  const [csvSelectedCourseCode, setCsvSelectedCourseCode] = useState('');
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  // Load Master Students
  const masterStudents = studentService.getMasterStudents();

  // Daftar Kelas Besar yang Tersedia (Rombel)
  const existingClassSections = useMemo(() => {
    const list = new Set<string>([
      'Kelas A',
      'Kelas B',
      'Kelas C',
      'Kelas D',
      'Kelas E',
      'Kelas F',
    ]);
    masterStudents.forEach((s) => {
      if (s.classSection) list.add(s.classSection);
    });
    courses.forEach((c) => {
      if (c.section) list.add(c.section);
    });
    return Array.from(list);
  }, [masterStudents, courses]);

  // Stats
  const totalStudents = masterStudents.length;
  const registeredCount = masterStudents.filter((s) => s.isRegistered).length;
  const unregisteredCount = totalStudents - registeredCount;

  // Filtered List
  const filteredStudents = masterStudents.filter((s) => {
    const term = searchTerm.toLowerCase().trim();
    const matchQuery =
      !term ||
      s.name.toLowerCase().includes(term) ||
      s.nim.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      (s.major || '').toLowerCase().includes(term) ||
      (s.enrolledCourseCodes || []).some((c) => c.toLowerCase().includes(term));

    const matchCourse =
      filterCourse === 'all' ||
      (s.enrolledCourseCodes || []).map((c) => c.toLowerCase()).includes(filterCourse.toLowerCase());

    const matchMajor =
      filterMajor === 'all' ||
      (s.major || '').toLowerCase() === filterMajor.toLowerCase();

    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'registered' && s.isRegistered) ||
      (filterStatus === 'unregistered' && !s.isRegistered);

    return matchQuery && matchCourse && matchMajor && matchStatus;
  });

  const openAddStudentModal = () => {
    setEditingStudentId(null);
    setFormName('');
    setFormNim('');
    setFormEmail('');
    setFormMajor('Sains Informasi Geografi');
    setFormClassSection('Kelas A');
    setFormSelectedCourses([]); // Opsional: Dosen dapat memasukkan mahasiswa tanpa kelas terlebih dahulu
    setIsStudentModalOpen(true);
  };

  const openEditStudentModal = (student: MasterStudent) => {
    setEditingStudentId(student.id);
    setFormName(student.name);
    setFormNim(student.nim);
    setFormEmail(student.email);
    setFormMajor(student.major || 'Sains Informasi Geografi');
    setFormClassSection(student.classSection || 'Kelas A');
    setFormSelectedCourses(student.enrolledCourseCodes || []);
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formNim.trim()) {
      alert('Nama, NIM, dan Email resmi wajib diisi.');
      return;
    }

    try {
      studentService.saveMasterStudent({
        id: editingStudentId || '',
        name: formName.trim(),
        nim: formNim.trim(),
        email: formEmail.trim().toLowerCase(),
        major: formMajor.trim(),
        classSection: formClassSection.trim(),
        enrolledCourseCodes: formSelectedCourses,
      });

      // Otomatis sinkronkan data mahasiswa terbaru ke Cloud
      try {
        myJourneySyncService.triggerDebouncedAutoSync();
      } catch {}

      setIsStudentModalOpen(false);
      onDataUpdated();
      setNotification(`Mahasiswa "${formName}" berhasil disimpan ke database.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    }
  };

  const handleDeleteStudent = (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus data mahasiswa "${name}" dari basis data?`)) {
      studentService.deleteMasterStudent(id);
      try {
        myJourneySyncService.triggerDebouncedAutoSync();
      } catch {}
      onDataUpdated();
      setNotification(`Mahasiswa "${name}" telah dihapus.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSyncMyJourney = async () => {
    setIsSyncing(true);
    try {
      const res = await studentService.syncAllFromMyJourneyCloud();
      onDataUpdated();
      setNotification(res.message);
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      alert('Gagal menyelaraskan: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // =========================================================================
  // LOGIKA IMPOR CSV MAHASISWA (PERSIS MY JOURNEY)
  // =========================================================================
  const handleOpenCsvImportModal = () => {
    setCsvFile(null);
    setCsvParsedStudents([]);
    setCsvParseError(null);
    setIsCustomClass(false);
    setCustomClassName('');
    setCsvTargetClass(courses[0]?.section || 'Kelas A');
    setCsvSelectedCourseCode(courses[0]?.code || '');
    setIsCsvImportModalOpen(true);
  };

  const handleDownloadCsvTemplate = () => {
    const templateHeader = 'Mahasiswa,NIM,email\n';
    const sampleRows = [
      'Budi Santoso,220401001,budi.santoso@mhs.ac.id',
      'Siti Rahmawati,220401002,siti.rahma@mhs.ac.id',
      'Ahmad Fauzi,220401003,ahmad.fauzi@mhs.ac.id',
      'Dewi Lestari,220401004,dewi.lestari@mhs.ac.id',
      'Rian Pratama Putra,220401005,rian.pratama@mhs.ac.id',
    ].join('\n');
    const blob = new Blob([templateHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_mahasiswa.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotification('Format template CSV mahasiswa berhasil diunduh.');
    setTimeout(() => setNotification(null), 4000);
  };

  const parseCsvText = (text: string) => {
    setCsvParseError(null);
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 1) {
      setCsvParseError('Berkas CSV kosong atau tidak memiliki data baris.');
      setCsvParsedStudents([]);
      return;
    }

    // Tentukan separator koma (,), titik-koma (;), atau tab (\t)
    const firstLine = lines[0];
    let sep = ',';
    if (firstLine.includes(';') && firstLine.split(';').length >= firstLine.split(',').length) {
      sep = ';';
    } else if (firstLine.includes('\t') && firstLine.split('\t').length >= firstLine.split(',').length) {
      sep = '\t';
    }

    const splitLine = (line: string): string[] => {
      const res: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === sep && !inQuotes) {
          res.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      res.push(current.trim().replace(/^["']|["']$/g, ''));
      return res;
    };

    const firstCols = splitLine(firstLine).map((h) => h.toLowerCase());
    const isHeaderRow = firstCols.some((c) =>
      c.includes('mahasiswa') || c.includes('nama') || c.includes('nim') || c.includes('email')
    );

    let nameIdx = 0;
    let nimIdx = 1;
    let emailIdx = 2;

    if (isHeaderRow) {
      const foundName = firstCols.findIndex((h) => h.includes('mahasiswa') || h.includes('nama') || h.includes('name'));
      const foundNim = firstCols.findIndex((h) => h.includes('nim') || h.includes('npm') || h.includes('id') || h.includes('nomor'));
      const foundEmail = firstCols.findIndex((h) => h.includes('email') || h.includes('mail'));

      if (foundName !== -1) nameIdx = foundName;
      if (foundNim !== -1) nimIdx = foundNim;
      if (foundEmail !== -1) emailIdx = foundEmail;
    }

    const startIdx = isHeaderRow ? 1 : 0;
    const parsed: Array<{ name: string; nim: string; email: string }> = [];

    for (let i = startIdx; i < lines.length; i++) {
      const cols = splitLine(lines[i]);
      if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;
      const name = cols[nameIdx] || '';
      const nim = cols[nimIdx] || '';
      const email = cols[emailIdx] || (nim ? `${nim.toLowerCase().replace(/[^a-z0-9]/g, '')}@mhs.ac.id` : '');

      if (name || nim) {
        parsed.push({
          name: name || `Mahasiswa ${nim}`,
          nim: nim || `MHS-${Date.now().toString().substring(7)}-${i}`,
          email,
        });
      }
    }

    if (parsed.length === 0) {
      setCsvParseError('Gagal membaca data mahasiswa dari berkas CSV. Pastikan kolom sesuai format: Mahasiswa, NIM, email.');
    } else {
      setCsvParsedStudents(parsed);
    }
  };

  const handleCsvFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
      setCsvParseError('Harap pilih berkas dengan format .csv atau .txt');
      return;
    }
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleCsvDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCsvDragging(true);
  };

  const handleCsvDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCsvDragging(false);
  };

  const handleCsvDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCsvDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleCsvFileSelect(files[0]);
    }
  };

  const handleConfirmCsvImport = () => {
    if (csvParsedStudents.length === 0) {
      setCsvParseError('Belum ada data mahasiswa valid yang terbaca dari CSV.');
      return;
    }

    const finalClassSection = isCustomClass
      ? customClassName.trim() || 'Kelas A'
      : csvTargetClass;

    const selectedCourse = courses.find((c) => c.code === csvSelectedCourseCode || c.id === csvSelectedCourseCode);
    const enrolledCodes = csvSelectedCourseCode ? [selectedCourse?.code || csvSelectedCourseCode] : [];

    // Tentukan prodi default resmi
    const detectedMajor = selectedCourse?.title?.toLowerCase().includes('pendidikan') || selectedCourse?.code?.toLowerCase().includes('pgeo')
      ? 'Pendidikan Geografi'
      : 'Sains Informasi Geografi';

    const studentsToAdd: Array<Omit<MasterStudent, 'id'>> = csvParsedStudents.map((item) => ({
      name: item.name,
      nim: item.nim,
      email: item.email || `${item.nim.toLowerCase().replace(/[^a-z0-9]/g, '')}@mhs.ac.id`,
      major: detectedMajor,
      classSection: finalClassSection,
      enrolledCourseCodes: enrolledCodes,
      isRegistered: false,
    }));

    const res = studentService.addMasterStudentsBulk(studentsToAdd);
    setIsCsvImportModalOpen(false);
    setCsvFile(null);
    setCsvParsedStudents([]);
    setCsvParseError(null);
    onDataUpdated();
    setNotification(`Berhasil mengimpor ${studentsToAdd.length} mahasiswa (${res.added} baru, ${res.updated} diperbarui) ke ${finalClassSection}!`);
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Sistem Otorisasi Pendaftaran Kelas
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Basis Data & Manajemen Mahasiswa
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Daftar master seluruh mahasiswa terdaftar. Mahasiswa <strong>hanya dapat mendaftarkan akun</strong> jika email resminya sudah Anda daftarkan di sini atau di kelas perkuliahan.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openAddStudentModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Mahasiswa</span>
          </button>

          <button
            onClick={handleOpenCsvImportModal}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Impor via CSV</span>
          </button>

          <button
            onClick={handleSyncMyJourney}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-semibold text-xs border border-indigo-200 dark:border-indigo-800 shadow-xs transition-all disabled:opacity-50"
            title="Tarik daftar mahasiswa dari My Journey"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyelaraskan...' : 'Tarik dari My Journey'}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Mahasiswa di Database
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{totalStudents}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Otorisasi whitelist aktif</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Akun Terdaftar & Aktif
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{registeredCount}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Sudah login ke portal</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Menunggu Registrasi
          </span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{unregisteredCount}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Email sudah diizinkan</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Kelas Terhubung
          </span>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{courses.length}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Mata kuliah aktif</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari NIM, Nama, Email, atau Kelas..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Course Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua Kelas ({courses.length})</option>
              {courses.map((crs) => (
                <option key={crs.id} value={crs.code}>
                  {crs.code} - {crs.title.split('&')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Major Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filterMajor}
              onChange={(e) => setFilterMajor(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua Jurusan</option>
              <option value="Sains Informasi Geografi">Sains Informasi Geografi</option>
              <option value="Pendidikan Geografi">Pendidikan Geografi</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua Status</option>
              <option value="registered">✓ Akun Aktif</option>
              <option value="unregistered">⏳ Menunggu Registrasi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Student Database Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Menampilkan {filteredStudents.length} dari {totalStudents} mahasiswa
          </span>
          <span className="text-[11px] text-slate-400">
            Klik tombol aksi untuk mengubah atau menambahkan mahasiswa ke kelas
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Tidak Ada Data Mahasiswa Ditemukan
            </p>
            <p className="text-xs max-w-md mx-auto">
              Tambahkan mahasiswa secara manual, impor file CSV, atau klik <strong>"Tarik dari My Journey"</strong> untuk memuat daftar mahasiswa kelas Anda.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={openAddStudentModal}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
              >
                + Tambah Mahasiswa
              </button>
              <button
                onClick={handleSyncMyJourney}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Tarik dari My Journey
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">NIM</th>
                  <th className="py-3 px-4">Nama Mahasiswa & Program Studi</th>
                  <th className="py-3 px-4">Email Resmi (Otorisasi)</th>
                  <th className="py-3 px-4">Kelas Diikuti</th>
                  <th className="py-3 px-4 text-center">Status Akun</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((std) => (
                  <tr key={std.id || std.email} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {std.nim}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={std.avatarUrl || getInitialsAvatar(std.name, false)}
                          alt={std.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {std.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {std.major || 'Sains Informasi Geografi'} • {std.classSection || 'Kelas A'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-300">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{std.email}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        Whitelist Resmi
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(std.enrolledCourseCodes || []).map((code) => (
                          <span
                            key={code}
                            className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                          >
                            {code}
                          </span>
                        ))}
                        {(std.enrolledCourseCodes || []).length === 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Bebas Kelas (Belum Diatur)
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {std.isRegistered ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Akun Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          ⏳ Belum Daftar
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditStudentModal(std)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
                          title="Edit Mahasiswa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(std.id, std.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800"
                          title="Hapus Mahasiswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT STUDENT */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingStudentId ? 'Edit Data Mahasiswa' : 'Tambah Mahasiswa ke Basis Data'}
                </h3>
              </div>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-3.5 overflow-y-auto text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Mahasiswa
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Tengku Aziz"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    NIM Mahasiswa
                  </label>
                  <input
                    type="text"
                    value={formNim}
                    onChange={(e) => setFormNim(e.target.value)}
                    placeholder="Contoh: 3222431013"
                    className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Program Studi
                  </label>
                  <select
                    value={formMajor}
                    onChange={(e) => setFormMajor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Sains Informasi Geografi">Sains Informasi Geografi</option>
                    <option value="Pendidikan Geografi">Pendidikan Geografi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Resmi Mahasiswa (Kunci Otorisasi)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Contoh: tengku.aziz@student.ac.id"
                  className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Mahasiswa harus menggunakan email ini saat mendaftar akun di portal.
                </p>
              </div>

              {/* Course Assignment Checkboxes */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Pilih Kelas Perkuliahan (Opsional - Bisa diatur nanti):
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Anda dapat mendaftarkan mahasiswa ke basis data master terlebih dahulu tanpa memasukkannya ke kelas sekarang.
                </p>
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
                  {courses.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">
                      Belum ada kelas perkuliahan. Mahasiswa tetap akan tersimpan di database master.
                    </p>
                  ) : (
                    courses.map((crs) => {
                      const isChecked = formSelectedCourses.includes(crs.code);
                      return (
                        <label
                          key={crs.id}
                          className="flex items-center gap-2 cursor-pointer hover:text-blue-600"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormSelectedCourses([...formSelectedCourses, crs.code]);
                              } else {
                                setFormSelectedCourses(formSelectedCourses.filter((c) => c !== crs.code));
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-semibold">
                            {crs.code} - {crs.title.split('&')[0]}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Simpan Mahasiswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: IMPOR DATA MAHASISWA VIA CSV (PERSIS MY JOURNEY)   */}
      {/* ========================================================= */}
      {isCsvImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#131D33] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                    Impor Data Mahasiswa via CSV
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Daftarkan mahasiswa baru secara masal ke dalam Kelas Besar yang ditentukan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvImportModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Template CSV Download Banner */}
              <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <FileDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Format Kolom CSV: Mahasiswa | NIM | email</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Gunakan file CSV atau TXT dengan pemisah koma (,) atau titik-koma (;).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-xs flex items-center gap-1.5 shadow-xs shrink-0 self-start sm:self-auto transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Format CSV</span>
                </button>
              </div>

              {/* Class & Course Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                {/* Kelas Besar Target */}
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Target Kelas Besar (Rombel) <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                    Kelas kelompok angkatan mahasiswa (bukan kelas per mata kuliah).
                  </p>
                  <select
                    value={isCustomClass ? '__CUSTOM__' : csvTargetClass}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomClass(true);
                      } else {
                        setIsCustomClass(false);
                        setCsvTargetClass(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-semibold text-xs"
                  >
                    {existingClassSections.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Buat / Ketik Nama Kelas Baru...</option>
                  </select>

                  {isCustomClass && (
                    <input
                      type="text"
                      value={customClassName}
                      onChange={(e) => setCustomClassName(e.target.value)}
                      placeholder="Contoh: Kelas C, Kelas Internasional, Angkatan 2026"
                      className="w-full mt-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-400 dark:border-indigo-600 rounded-md text-slate-800 dark:text-slate-200 outline-none text-xs"
                      autoFocus
                    />
                  )}
                </div>

                {/* Mata Kuliah Awal */}
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Mata Kuliah Terdaftar (Opsional)
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                    Daftarkan mahasiswa ini ke mata kuliah berikut (bisa ditambah nanti).
                  </p>
                  <select
                    value={csvSelectedCourseCode}
                    onChange={(e) => setCsvSelectedCourseCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="">-- Tidak Terikat Matkul Tertentu --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.code} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File Dropzone */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Pilih Berkas CSV Mahasiswa <span className="text-rose-500">*</span>
                </label>

                <input
                  ref={csvFileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCsvFileSelect(f);
                  }}
                  className="hidden"
                />

                {!csvFile ? (
                  <div
                    onDragOver={handleCsvDragOver}
                    onDragEnter={handleCsvDragOver}
                    onDragLeave={handleCsvDragLeave}
                    onDrop={handleCsvDrop}
                    onClick={() => csvFileInputRef.current?.click()}
                    className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                      isCsvDragging
                        ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 ring-4 ring-indigo-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-900/30'
                    }`}
                  >
                    <CloudUpload className={`w-8 h-8 mx-auto mb-2 transition-transform ${isCsvDragging ? 'text-indigo-600 scale-110' : 'text-indigo-500'}`} />
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {isCsvDragging ? 'Lepaskan Berkas CSV di Sini...' : 'Pilih atau Seret Berkas CSV ke Sini'}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Mendukung format file .CSV atau .TXT (Maksimal 10 MB)
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-semibold text-xs shadow-xs hover:bg-slate-50">
                      <Upload className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Jelajahi Berkas di Komputer</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {csvFile.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {(csvFile.size / 1024).toFixed(1)} KB • {csvParsedStudents.length} baris data terbaca
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCsvFile(null);
                        setCsvParsedStudents([]);
                        setCsvParseError(null);
                        if (csvFileInputRef.current) csvFileInputRef.current.value = '';
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      title="Ganti Berkas"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {csvParseError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{csvParseError}</span>
                </div>
              )}

              {/* Parsed Preview Table */}
              {csvParsedStudents.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Pratinjau Data ({csvParsedStudents.length} Mahasiswa Siap Diimpor)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Masuk ke: {isCustomClass ? (customClassName || 'Kelas Baru') : csvTargetClass}
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">#</th>
                          <th className="py-2 px-3">Mahasiswa</th>
                          <th className="py-2 px-3 font-mono">NIM</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">Kelas Besar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {csvParsedStudents.map((st, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="py-1.5 px-3 text-center text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                              {st.name}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                              {st.nim}
                            </td>
                            <td className="py-1.5 px-3 text-slate-600 dark:text-slate-400">
                              {st.email}
                            </td>
                            <td className="py-1.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                              {isCustomClass ? (customClassName || 'Kelas Baru') : csvTargetClass}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                {csvParsedStudents.length > 0
                  ? `${csvParsedStudents.length} calon mahasiswa akan didaftarkan.`
                  : 'Pilih berkas CSV untuk melihat pratinjau data.'}
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsCsvImportModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={csvParsedStudents.length === 0}
                  onClick={handleConfirmCsvImport}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition-colors ${
                    csvParsedStudents.length > 0
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    Impor {csvParsedStudents.length > 0 ? `${csvParsedStudents.length} Mahasiswa` : 'Mahasiswa'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
