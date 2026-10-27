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
} from 'lucide-react';
import { studentService } from '../../services/studentService.ts';
import { mockLecturerUsers } from '../../data/mockData.ts';
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

  const syncStatus = studentService.getMyJourneySyncStatus();
  const lastSyncTime = myJourneySyncService.getLastSyncTimestamp();

  const handleSyncFromMyJourney = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      // 1. Simpan dan kirim paket data Teaching ke Google Sheets bersama
      const result = await myJourneySyncService.pushTeachingToGoogleSheets(currentUser.email);
      onDataRefreshed();
      setSyncFeedback(result.message);
    } catch (err: any) {
      setSyncFeedback('Gagal menyinkronkan data: ' + err.message);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  const handleSwitchLecturer = (targetEmail: string) => {
    const res = studentService.login(targetEmail);
    if (res.success && res.user) {
      onUserChanged(res.user);
      onDataRefreshed();
    }
  };

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
            Profil dosen di Smart Learning Hub mengikuti profil utama di <strong>My Journey</strong>. Data kurikulum OBE, kelas perkuliahan, bahan ajar, dan rekam mahasiswa disinkronkan secara terpadu.
          </p>
        </div>

        {/* Sync Trigger Button */}
        <button
          onClick={handleSyncFromMyJourney}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Menarik Data...' : 'Tarik Data dari My Journey'}
        </button>
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
              Dua pengguna <strong>My Journey</strong> merupakan dosen pengampu resmi di portal ini. Seluruh data perkuliahan telah dibersihkan dari data dummy dan sepenuhnya mengacu pada database silabus dan pengajaran akun <code>miftahurridlo.688@gmail.com</code>.
            </p>
          </div>

          {/* Stat Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <span className="block text-2xl font-black text-white">{syncStatus.coursesCount}</span>
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
          {mockLecturerUsers.map((lecturer) => {
            const isActive = currentUser.email.toLowerCase() === lecturer.email.toLowerCase();
            const isPrimary = lecturer.email === 'miftahurridlo.688@gmail.com';

            return (
              <div
                key={lecturer.id}
                className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all ${
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
                    <span className="text-[10px] text-slate-400 font-mono">
                      NIDN: {lecturer.nidn}
                    </span>
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
                    src={lecturer.avatarUrl}
                    alt={lecturer.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-slate-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {lecturer.name}
                    </h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      {lecturer.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-1">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{lecturer.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <Building className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{lecturer.department}</span>
                    </div>
                  </div>
                </div>

                {/* Profile Bio */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  {isPrimary
                    ? 'Dosen Pengampu Sistem Informasi Geografis Lanjut & Metodologi Penelitian Komputasi. Koordinator kurikulum OBE dan penanggung jawab sinkronisasi My Journey.'
                    : 'Workspace terpadu riset, mengajar, dan freelance. Pengampu mata kuliah Rekayasa Perangkat Lunak Berbasis Komponen dan arsitektur microservices terdistribusi.'}
                </div>

                {/* Taught Classes Pill List */}
                <div className="space-y-1.5 mb-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Mata Kuliah Diampu:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {courses.map((crs) => {
                      const teaches =
                        crs.teacher.email === lecturer.email ||
                        crs.secondaryTeacher?.email === lecturer.email;
                      if (!teaches) return null;

                      return (
                        <span
                          key={crs.id}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          <strong>{crs.code}</strong> - {crs.title.split('&')[0]}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Switch Account Action */}
                {!isActive ? (
                  <button
                    onClick={() => handleSwitchLecturer(lecturer.email)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Gunakan Akun Ini</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold text-center">
                    ✓ Akun Aktif di Perangkat Ini
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
              Pemetaan Data Teaching Terverifikasi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Data 3 mata kuliah dari akun <code>miftahurridlo.688@gmail.com</code> aktif di portal mahasiswa.
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
            Ganjil 2026/2027
          </span>
        </div>

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
                    {crs.teacher.name}
                  </td>
                  <td className="py-3.5 px-3 text-slate-500">
                    {crs.secondaryTeacher ? crs.secondaryTeacher.name : '-'}
                  </td>
                  <td className="py-3.5 px-3 text-slate-500">
                    <span>{crs.scheduleDay}, {crs.scheduleTime}</span>
                    <span className="block text-[11px] text-slate-400">{crs.room}</span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold text-slate-900 dark:text-white">
                    {crs.enrolledStudentEmails.length} org
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
      </div>
    </div>
  );
};
