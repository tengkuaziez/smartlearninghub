import React, { useState } from 'react';
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

  // Modal: Bulk Import (CSV / Text / JSON)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'text' | 'csv' | 'myjourney'>('text');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Load Master Students
  const masterStudents = studentService.getMasterStudents();

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

  const handleProcessImport = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);

    if (!importText.trim()) {
      setImportError('Silakan masukkan data teks mahasiswa terlebih dahulu.');
      return;
    }

    try {
      const parsedList: Array<Omit<MasterStudent, 'id'>> = [];

      // Mode JSON
      if (importText.trim().startsWith('[') || importText.trim().startsWith('{')) {
        const json = JSON.parse(importText.trim());
        const arr = Array.isArray(json) ? json : json.students || [json];
        arr.forEach((item: any) => {
          if (item && item.email) {
            parsedList.push({
              name: item.name || 'Mahasiswa',
              nim: item.nim || '10123001',
              email: item.email.trim().toLowerCase(),
              major: item.major || item.courseName || 'Informatika',
              classSection: item.classSection || 'Kelas A',
              enrolledCourseCodes: item.enrolledCourseCodes || (item.courseCode ? [item.courseCode] : []),
            });
          }
        });
      } else {
        // Mode CSV / Delimited Lines: NIM, Nama, Email, KodeKelas
        const lines = importText.split('\n');
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('NIM') || trimmed.startsWith('nim')) return;
          const parts = trimmed.split(/[,;\t]/).map((p) => p.trim());
          if (parts.length >= 3) {
            parsedList.push({
              nim: parts[0],
              name: parts[1],
              email: parts[2].toLowerCase(),
              major: parts[4] || 'Informatika',
              classSection: 'Kelas A',
              enrolledCourseCodes: parts[3] ? [parts[3]] : [],
            });
          }
        });
      }

      if (parsedList.length === 0) {
        setImportError('Tidak ada baris data mahasiswa yang valid terbaca. Periksa format teks Anda.');
        return;
      }

      const res = studentService.addMasterStudentsBulk(parsedList);
      setIsImportModalOpen(false);
      setImportText('');
      onDataUpdated();
      setNotification(`Berhasil mengimpor ${parsedList.length} mahasiswa (${res.added} baru, ${res.updated} diperbarui).`);
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setImportError('Gagal memproses impor: ' + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        if (content) {
          setImportText(content);
        }
      };
      reader.readAsText(file);
    }
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
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 shadow-xs transition-all"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Impor Data (CSV/Teks)</span>
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

      {/* MODAL 2: BULK IMPORT STUDENTS */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Impor Data Mahasiswa Masal
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessImport} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 font-semibold">
                <button
                  type="button"
                  onClick={() => setImportMode('text')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    importMode === 'text'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Tempel Teks / CSV
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('csv')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    importMode === 'csv'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Unggah Berkas CSV
                </button>
              </div>

              {importMode === 'csv' ? (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Pilih Berkas CSV Daftar Mahasiswa
                  </label>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-2">
                    Format kolom baris: <code>NIM, Nama Lengkap, Email, Kode Kelas</code>
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tempel Baris Data Mahasiswa:
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                    Satu baris per mahasiswa dengan format: <code>NIM, Nama, Email, KodeKelas</code> (atau format JSON My Journey).
                  </p>
                  <textarea
                    rows={7}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={"3222431013, Tengku Aziz, tengku.aziz@student.ac.id, GEO-301\n10123001, Rafi Alamsyah, rafi.alamsyah@student.ac.id, GEO-301\n10123014, Annisa Fitri, annisa.fitri@student.ac.id, IF-405"}
                    className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {importError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 text-xs">
                  {importError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Proses & Simpan ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
