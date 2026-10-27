import React, { useState } from 'react';
import {
  UserCheck,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  BookOpen,
  Users,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
  GraduationCap,
  Building,
  Mail,
  Award,
  Edit3,
  Camera,
  Upload,
  Link,
  X,
  FileCode2,
} from 'lucide-react';
import { studentService, getInitialsAvatar } from '../../services/studentService.ts';
import { LECTURER_WHITELIST_EMAILS } from '../../data/mockData.ts';
import { myJourneySyncService } from '../../services/myJourneySyncService.ts';
import type { AuthUser, CourseClass } from '../../types/index.ts';

interface LecturerProfileViewProps {
  currentUser: AuthUser;
  courses: CourseClass[];
  onUserChanged: (user: AuthUser) => void;
  onDataRefreshed: () => void;
}

export const LecturerProfileView: React.FC<LecturerProfileViewProps> = ({
  currentUser,
  courses,
  onUserChanged,
  onDataRefreshed,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editTitle, setEditTitle] = useState(currentUser.title || 'Dosen Pengampu Utama');
  const [editNidn, setEditNidn] = useState(currentUser.nidn || '');
  const [editDept, setEditDept] = useState(currentUser.department || 'Pendidikan Geografi / Sains Informasi Geografis');
  const [editBio, setEditBio] = useState(currentUser.bio || 'Dosen Pengampu Smart Learning Hub & My Journey.');
  const [editAvatarUrl, setEditAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [editScholar, setEditScholar] = useState(currentUser.googleScholarUrl || '');
  const [editSinta, setEditSinta] = useState(currentUser.sintaUrl || '');
  const [editLinkedin, setEditLinkedin] = useState(currentUser.linkedinUrl || '');

  // Import JSON Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const syncStatus = studentService.getMyJourneySyncStatus();

  const openEditModal = () => {
    setEditName(currentUser.name);
    setEditTitle(currentUser.title || 'Dosen Pengampu Utama');
    setEditNidn(currentUser.nidn || '');
    setEditDept(currentUser.department || 'Pendidikan Geografi / Sains Informasi Geografis');
    setEditBio(currentUser.bio || 'Dosen Pengampu Smart Learning Hub & My Journey.');
    setEditAvatarUrl(currentUser.avatarUrl || '');
    setEditScholar(currentUser.googleScholarUrl || '');
    setEditSinta(currentUser.sintaUrl || '');
    setEditLinkedin(currentUser.linkedinUrl || '');
    setIsEditModalOpen(true);
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran berkas foto maksimal 2 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        if (base64) {
          setEditAvatarUrl(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = studentService.updateLecturerProfile({
        name: editName.trim(),
        title: editTitle.trim(),
        nidn: editNidn.trim(),
        department: editDept.trim(),
        bio: editBio.trim(),
        avatarUrl: editAvatarUrl.trim() || getInitialsAvatar(editName.trim(), true),
        googleScholarUrl: editScholar.trim(),
        sintaUrl: editSinta.trim(),
        linkedinUrl: editLinkedin.trim(),
      });

      onUserChanged(updated);
      setIsEditModalOpen(false);
      setSyncFeedback('Profil dosen berhasil diperbarui!');
      setTimeout(() => setSyncFeedback(null), 4000);

      // Trigger background sync to Google Sheets
      myJourneySyncService.triggerDebouncedAutoSync();
    } catch (err: any) {
      alert('Gagal menyimpan profil: ' + err.message);
    }
  };

  const handleSyncFromMyJourney = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      // 1. Tarik profil dari My Journey (LocalStorage / Google Sheets / Supabase)
      const profileSyncRes = await studentService.syncProfileFromMyJourney(currentUser.email);
      if (profileSyncRes.success && profileSyncRes.profile) {
        onUserChanged(profileSyncRes.profile);
      }

      // 2. Tarik data teaching terbaru dari Google Sheets
      const teachingRes = await myJourneySyncService.pullTeachingFromGoogleSheets();
      onDataRefreshed();

      if (profileSyncRes.success) {
        setSyncFeedback(profileSyncRes.message);
      } else if (teachingRes.success) {
        setSyncFeedback(teachingRes.message);
      } else {
        setSyncFeedback('Data My Journey belum ditemukan di peramban ini. Anda dapat mengedit profil secara manual atau menempel data profil My Journey.');
      }
    } catch (err: any) {
      setSyncFeedback('Gagal menyinkronkan data: ' + err.message);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  const handleImportJson = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    if (!importJsonText.trim()) {
      setImportError('Silakan tempel teks JSON profil My Journey.');
      return;
    }

    const res = studentService.importMyJourneyProfileJson(importJsonText);
    if (res.success && res.profile) {
      onUserChanged(res.profile);
      setIsImportModalOpen(false);
      setImportJsonText('');
      setSyncFeedback(res.message);
      setTimeout(() => setSyncFeedback(null), 5000);
      myJourneySyncService.triggerDebouncedAutoSync();
    } else {
      setImportError(res.message);
    }
  };

  const handleSwitchLecturer = (targetEmail: string) => {
    const res = studentService.login(targetEmail);
    if (res.success && res.user) {
      onUserChanged(res.user);
      onDataRefreshed();
    }
  };

  // Build the list of the 2 official lecturers
  const registered = studentService.getRegisteredLecturers();
  const lecturerList: AuthUser[] = [
    registered.find((l) => l.email.toLowerCase() === 'miftahurridlo.688@gmail.com') || {
      id: 'dos_01',
      name: currentUser.email.toLowerCase() === 'miftahurridlo.688@gmail.com' ? currentUser.name : 'Muhammad Miftahurridlo, M.Kom.',
      email: 'miftahurridlo.688@gmail.com',
      role: 'dosen' as const,
      nidn: '0412088501',
      title: 'Dosen Pengampu Utama',
      department: 'Sains Informasi Geografi',
      avatarUrl: getInitialsAvatar('Muhammad Miftahurridlo', true),
      bio: 'Dosen Pengampu Utama Smart Learning Hub & My Journey. Koordinator kurikulum OBE dan penanggung jawab pengajaran.',
      registeredAt: '2026-08-01',
    },
    registered.find((l) => l.email.toLowerCase() === 'altaf.aziz16@gmail.com') || {
      id: 'dos_02',
      name: currentUser.email.toLowerCase() === 'altaf.aziz16@gmail.com' ? currentUser.name : 'Tengku Abdillah Azis, S.Pd., M.Sc.',
      email: 'altaf.aziz16@gmail.com',
      role: 'dosen' as const,
      nidn: '0419058902',
      title: 'Dosen Pengampu Partner',
      department: 'Pendidikan Geografi',
      avatarUrl: getInitialsAvatar('Tengku Abdillah Azis', true),
      bio: 'Dosen Pengampu Partner Smart Learning Hub & My Journey. Pengampu kelas SIG dan komputasi spasial.',
      registeredAt: '2026-08-01',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Terkoneksi dengan My Journey
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Akun Master: miftahurridlo.688@gmail.com
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Profil Tim Dosen Pengampu
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Profil dosen di Smart Learning Hub selaras dengan profil di <strong>My Journey</strong>. Anda dapat mengedit identitas, foto profil, dan NIDN secara langsung atau menyelaraskannya dengan cloud.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openEditModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-xs border border-slate-200 dark:border-slate-700 shadow-xs transition-all"
          >
            <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Edit Profil Dosen</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700 shadow-xs transition-all"
            title="Impor format JSON My Journey"
          >
            <FileCode2 className="w-4 h-4 text-slate-500" />
            <span>Impor JSON</span>
          </button>

          <button
            onClick={handleSyncFromMyJourney}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Menyelaraskan...' : 'Tarik dari My Journey'}
          </button>
        </div>
      </div>

      {/* Sync Feedback Toast Alert */}
      {syncFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            Tutup
          </button>
        </div>
      )}

      {/* My Journey Integration Overview Card */}
      <div className="p-6 rounded-3xl bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-indigo-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Sistem Terintegrasi My Journey ➔ Smart Learning Hub
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Pusat Kendali Pengajaran Tim Dosen
            </h2>
            <p className="text-xs md:text-sm text-indigo-200/90 max-w-2xl leading-relaxed">
              Dua pengguna <strong>My Journey</strong> merupakan dosen pengampu resmi di portal ini. Seluruh data perkuliahan bersih dari data dummy dan dapat diatur mandiri atau disinkronkan ke Google Spreadsheet bersama.
            </p>
          </div>

          {/* Stat Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <span className="block text-2xl font-black text-white">{courses.length}</span>
              <span className="text-[11px] font-medium text-indigo-200">Kelas Aktif</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <span className="block text-2xl font-black text-white">{syncStatus.studentsCount}</span>
              <span className="text-[11px] font-medium text-indigo-200">Mahasiswa</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <span className="block text-2xl font-black text-white">{syncStatus.materialsCount}</span>
              <span className="text-[11px] font-medium text-indigo-200">Bahan Ajar</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <span className="block text-2xl font-black text-white">{syncStatus.rpsCount}</span>
              <span className="text-[11px] font-medium text-indigo-200">Dokumen RPS</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2 Lecturer Profiles (Master from My Journey) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            2 Dosen Pengampu Terdaftar
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Klik "Gunakan Akun Ini" untuk beralih konteks kerja
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lecturerList.map((lecturer) => {
            const isActive = currentUser.email.toLowerCase() === lecturer.email.toLowerCase();
            const isPrimary = lecturer.email === 'miftahurridlo.688@gmail.com';
            const displayUser = isActive ? currentUser : lecturer;

            return (
              <div
                key={displayUser.id || displayUser.email}
                className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all relative ${
                  isActive
                    ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Active Indicator & Master Badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-1.5">
                    {isPrimary ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        <Award className="w-3 h-3 text-indigo-600" />
                        Dosen Pengampu Utama
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        <Award className="w-3 h-3 text-purple-600" />
                        Dosen Pengampu Partner
                      </span>
                    )}
                    {displayUser.nidn ? (
                      <span className="text-[10px] text-slate-400 font-mono">
                        NIDN: {displayUser.nidn}
                      </span>
                    ) : null}
                  </div>

                  {isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      Aktif Sekarang
                    </span>
                  ) : null}
                </div>

                {/* Profile Avatar & Details */}
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={displayUser.avatarUrl || getInitialsAvatar(displayUser.name, true)}
                    alt={displayUser.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-slate-700 shrink-0 bg-indigo-50 dark:bg-slate-800"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getInitialsAvatar(displayUser.name, true);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {displayUser.name}
                      </h3>
                      {isActive && (
                        <button
                          onClick={openEditModal}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Profil Ini"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      {displayUser.title || (isPrimary ? 'Dosen Pengampu Utama' : 'Dosen Pengampu Partner')}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-1">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{displayUser.email}</span>
                    </div>
                    {displayUser.department && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <Building className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{displayUser.department}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Bio */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  {displayUser.bio || (isPrimary
                    ? 'Dosen Pengampu Utama Smart Learning Hub & My Journey. Koordinator kurikulum OBE dan penanggung jawab sinkronisasi pengajaran.'
                    : 'Dosen Pengampu Partner Smart Learning Hub & My Journey. Pengampu kelas komputasi dan penanggung jawab materi praktikum.')}
                </div>

                {/* Taught Classes Pill List */}
                <div className="space-y-1.5 mb-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Mata Kuliah Diampu Bersama:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {courses.map((crs) => (
                      <span
                        key={crs.id}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        <strong>{crs.code}</strong> - {crs.title.split('&')[0]}
                      </span>
                    ))}
                    {courses.length === 0 && (
                      <span className="text-xs text-slate-400 italic">
                        Belum ada kelas perkuliahan aktif.
                      </span>
                    )}
                  </div>
                </div>

                {/* Switch Account Action */}
                {!isActive ? (
                  <button
                    onClick={() => handleSwitchLecturer(displayUser.email)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Gunakan Akun Ini</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold text-center flex items-center justify-center gap-2">
                    <span>✓ Akun Aktif di Perangkat Ini</span>
                    <button
                      onClick={openEditModal}
                      className="underline text-[11px] hover:text-indigo-900 dark:hover:text-white"
                    >
                      (Ubah Profil)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Teaching Data Alignment Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Pemetaan Data Perkuliahan Aktif
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {courses.length === 0
                ? 'Belum ada kelas perkuliahan yang dibuat. Buka tab Manajemen Kelas untuk menambahkan kelas perkuliahan baru.'
                : `Terdapat ${courses.length} mata kuliah aktif yang terhubung dengan akun dosen pengampu.`}
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
            Semester Aktif
          </span>
        </div>

        {courses.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 text-xs space-y-2">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Belum Ada Kelas Perkuliahan</p>
            <p className="max-w-md mx-auto text-slate-400">
              Mulai dengan menambahkan kelas perkuliahan pada menu <strong>Manajemen Kelas</strong>, atau sinkronkan data silabus dari My Journey.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-3">Kode & Mata Kuliah</th>
                  <th className="py-3 px-3">Dosen Pengampu Utama</th>
                  <th className="py-3 px-3">Dosen Partner</th>
                  <th className="py-3 px-3">Jadwal & Ruang</th>
                  <th className="py-3 px-3 text-center">Mahasiswa</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {courses.map((crs) => (
                  <tr key={crs.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {crs.code}
                      </span>
                      <span className="block font-semibold text-slate-900 dark:text-white">
                        {crs.title}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
                      {crs.primaryLecturer || crs.teacher?.name || 'Muhammad Miftahurridlo, M.Kom.'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">
                      {crs.partnerLecturer || crs.secondaryTeacher?.name || 'Tengku Abdillah Azis, S.Pd., M.Sc.'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">
                      <span>{crs.schedule || (crs.scheduleDay ? `${crs.scheduleDay}, ${crs.scheduleTime || ''}` : 'Jadwal Kuliah')}</span>
                      <span className="block text-[11px] text-slate-400">{crs.room || 'Lab Komputasi'}</span>
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-900 dark:text-white">
                      {(crs.enrolledStudentEmails || []).length} org
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: EDIT PROFIL DOSEN */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Profil Dosen Pengampu
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 overflow-y-auto">
              {/* Photo Upload Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Foto Profil Dosen
                </label>
                <div className="flex items-center gap-4">
                  <img
                    src={editAvatarUrl || getInitialsAvatar(editName, true)}
                    alt={editName}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500/30 shrink-0 bg-slate-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getInitialsAvatar(editName, true);
                    }}
                  />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors border border-slate-200 dark:border-slate-700">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Foto dari Komputer</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Atau tempel URL gambar langsung di bawah.
                    </p>
                  </div>
                </div>

                <div className="mt-2 relative">
                  <Link className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={editAvatarUrl.startsWith('data:') ? '' : editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    placeholder="https://example.com/foto-anda.jpg"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Name & Academic Degree */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap & Gelar Akademik
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Contoh: Muhammad Miftahurridlo, M.Kom."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Title & NIDN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jabatan / Peran Pengampu
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Contoh: Dosen Pengampu Utama"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    NIDN
                  </label>
                  <input
                    type="text"
                    value={editNidn}
                    onChange={(e) => setEditNidn(e.target.value)}
                    placeholder="Nomor Induk Dosen Nasional"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Department / Faculty */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Program Studi / Fakultas / Departemen
                </label>
                <input
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  placeholder="Contoh: Pendidikan Geografi / Sains Informasi Geografis"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Biografi / Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tuliskan fokus riset atau deskripsi singkat..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* External Links */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tautan Profil Akademik (Opsional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="url"
                    value={editScholar}
                    onChange={(e) => setEditScholar(e.target.value)}
                    placeholder="URL Google Scholar"
                    className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                  <input
                    type="url"
                    value={editSinta}
                    onChange={(e) => setEditSinta(e.target.value)}
                    placeholder="URL Profil SINTA"
                    className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPOR JSON MY JOURNEY */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Impor Profil dari My Journey
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportJson} className="p-6 space-y-4 overflow-y-auto">
              <p className="text-xs text-slate-500 leading-relaxed">
                Salin data profil dari My Journey (menu Profil / Ekspor Cadangan) lalu tempel teks JSON ke dalam kotak di bawah ini untuk menyelaraskan profil secara instan.
              </p>

              <div>
                <textarea
                  rows={6}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='{"name": "Muhammad Miftahurridlo", "title": "M.Kom.", "role": "Dosen & Peneliti", "avatarUrl": "..."}'
                  className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {importError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-xs text-rose-700">
                  {importError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Terapkan Profil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
