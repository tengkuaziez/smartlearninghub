import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  BookOpen, 
  Phone, 
  Globe, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Bell, 
  Moon, 
  Sun,
  Database,
  RotateCcw
} from 'lucide-react';
import { Badge } from '../common/Badge.tsx';
import { studentService } from '../../services/studentService.ts';
import type { StudentProfile, CourseClass } from '../../types/index.ts';

interface ProfileViewProps {
  profile: StudentProfile;
  courses: CourseClass[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onProfileUpdated: (updated: StudentProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  courses,
  theme,
  onToggleTheme,
  onProfileUpdated,
}) => {
  const [phone, setPhone] = useState(profile.phone);
  const [bio, setBio] = useState(profile.bio);
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolioUrl || '');
  const [notifs, setNotifs] = useState(profile.notificationsEnabled);
  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = studentService.updateProfile({
      phone,
      bio,
      portfolioUrl,
      notificationsEnabled: notifs,
    });
    setIsSaved(true);
    setSaveMessage('Perubahan profil berhasil disimpan.');
    onProfileUpdated(updated);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetDemo = () => {
    if (confirm('Kembalikan seluruh data mock demo ke kondisi awal?')) {
      studentService.resetDemoData();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Profil Mahasiswa & Pengaturan Akun
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Informasi identitas resmi perguruan tinggi dan preferensi pembelajaran Anda.
        </p>
      </div>

      {/* Main Student Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative">
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="w-24 h-24 rounded-2xl object-cover ring-4 ring-blue-600/20 shadow-md"
            />
            <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-full ring-2 ring-white dark:ring-slate-900">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {profile.name}
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Terverifikasi SSO
              </span>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              NIM: <strong className="font-mono text-slate-800 dark:text-slate-200">{profile.nim}</strong> • {profile.major}
            </p>
            <p className="text-xs text-slate-400">
              {profile.faculty} • Semester {profile.semester} ({profile.academicYear})
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                Peran: Mahasiswa (Student)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                {courses.length} Kelas Aktif
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form: Editable Permitted Fields (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Data Kontak & Profil Pribadi
            </h3>
            <span className="text-xs text-slate-400">
              Bidang yang diizinkan untuk diubah mahasiswa
            </span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Locked Official Fields Notice */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Kolom Akademik Terkunci Otomatis</span>
              </div>
              <p>
                Nama resmi, NIM, Program Studi, Fakultas, dan Peran Sistem dikelola secara tersentralisasi oleh Biro Akademik dan tidak dapat dimodifikasi oleh mahasiswa.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Institusi (SSO)
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="font-mono">{profile.email}</span>
                </div>
              </div>

              <div>
                <label htmlFor="student-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="student-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="student-portfolio" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tautan Portofolio / GitHub Mahasiswa
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="student-portfolio"
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://github.com/username"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="student-bio" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bio Singkat
              </label>
              <textarea
                id="student-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notification Checkboxes */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Preferensi Notifikasi
              </span>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifs.deadlineReminder}
                    onChange={(e) => setNotifs({ ...notifs, deadlineReminder: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Kirim pengingat batas waktu pengumpulan tugas (H-2)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifs.gradePublished}
                    onChange={(e) => setNotifs({ ...notifs, gradePublished: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Pemberitahuan saat dosen mempublikasikan nilai tugas baru</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifs.announcements}
                    onChange={(e) => setNotifs({ ...notifs, announcements: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Pengumuman penting dari kelas terdaftar</span>
                </label>
              </div>
            </div>

            {isSaved && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveMessage}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </div>

        {/* System Settings & Theme (1 col) */}
        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tema Tampilan
            </h3>
            <p className="text-xs text-slate-500">
              Pilih mode tampilan yang nyaman untuk aktivitas belajar Anda.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => theme === 'dark' && onToggleTheme()}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  theme === 'light'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Mode Terang</span>
              </button>
              <button
                onClick={() => theme === 'light' && onToggleTheme()}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  theme === 'dark'
                    ? 'border-blue-600 bg-blue-950 text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Mode Gelap</span>
              </button>
            </div>
          </div>

          {/* Enrolled Classes Summary */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Kelas Terdaftar</span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                {courses.length} Kelas
              </span>
            </h3>

            <div className="space-y-2">
              {courses.map((c) => (
                <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                      {c.code}
                    </span>
                    <span className="text-slate-500 truncate max-w-[150px] block">
                      {c.title}
                    </span>
                  </div>
                  <span className="text-slate-400 font-semibold">{c.credits} SKS</span>
                </div>
              ))}
            </div>
          </div>

          {/* Prototype Reset Controls */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-2 text-xs">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-400" />
              <span>Manajemen Sesi Prototipe</span>
            </h4>
            <p className="text-slate-500 leading-relaxed">
              Anda dapat mereset data tersimpan (tugas yang dikumpulkan, presensi, kelas baru) kembali ke kondisi benih default untuk mengulang pengujian.
            </p>
            <button
              onClick={handleResetDemo}
              className="mt-2 w-full py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data Demo Prototipe</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
