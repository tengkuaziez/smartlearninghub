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
import { studentService, getInitialsAvatar, DEFAULT_LECTURERS, isValidProfileUrl } from '../../services/studentService.ts';
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
  const [editTitle, setEditTitle] = useState(currentUser.title || (currentUser.email.toLowerCase() === 'altaf.aziz16@gmail.com' ? 'Tenaga Teknis Survei & Pemetaan / Dosen Pengampu Partner' : 'Dosen Pengampu Utama'));
  const [editNidn, setEditNidn] = useState(currentUser.nidn || (currentUser.email.toLowerCase() === 'altaf.aziz16@gmail.com' ? '0419058902' : '0412088501'));
  const [editDept, setEditDept] = useState(currentUser.department || (currentUser.email.toLowerCase() === 'altaf.aziz16@gmail.com' ? 'Sains Informasi Geografi' : 'Pendidikan Geografi'));
  const [editBio, setEditBio] = useState(currentUser.bio || 'Dosen Pengampu Smart Learning Hub & My Journey.');
  const [editAvatarUrl, setEditAvatarUrl] = useState(currentUser.avatarUrl || (currentUser.email.toLowerCase() === 'altaf.aziz16@gmail.com' ? '/tengku_avatar.png' : ''));
  const [editScholar, setEditScholar] = useState(currentUser.googleScholarUrl || '');
  const [editSinta, setEditSinta] = useState(currentUser.sintaUrl || '');
  const [editScopus, setEditScopus] = useState(currentUser.scopusUrl || '');
  const [editResearchGate, setEditResearchGate] = useState(currentUser.researchGateUrl || '');
  const [editEmail, setEditEmail] = useState(currentUser.campusEmail || currentUser.email || '');
  const [editLinkedin, setEditLinkedin] = useState(currentUser.linkedinUrl || '');
  const [editInstagram, setEditInstagram] = useState(currentUser.instagramUrl || '');
  const [editFacebook, setEditFacebook] = useState(currentUser.facebookUrl || '');

  // Import JSON Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const syncStatus = studentService.getMyJourneySyncStatus();

  const openEditModal = () => {
    setEditName(currentUser.name);
    setEditTitle(currentUser.title || (currentUser.email.toLowerCase() === 'altaf.aziz16@gmail.com' ? 'Tenaga Teknis Survei & Pemetaan / Dosen Pengampu Partner' : 'Dosen Pengampu Utama'));
    setEditNidn(currentUser.nidn || (currentUser.email.toLowerCase() === 'altaf.aziz16@gmail.com' ? '0419058902' : '0412088501'));
    setEditDept(currentUser.department || (currentUser.email.toLowerCase() === 'altaf.aziz16@gmail.com' ? 'Sains Informasi Geografi' : 'Pendidikan Geografi'));
    setEditBio(currentUser.bio || 'Dosen Pengampu Smart Learning Hub & My Journey.');
    setEditAvatarUrl(currentUser.avatarUrl || (currentUser.email.toLowerCase() === 'altaf.aziz16@gmail.com' ? '/tengku_avatar.png' : ''));
    setEditScholar(currentUser.googleScholarUrl || '');
    setEditSinta(currentUser.sintaUrl || '');
    setEditScopus(currentUser.scopusUrl || '');
    setEditResearchGate(currentUser.researchGateUrl || '');
    setEditEmail(currentUser.campusEmail || currentUser.email || '');
    setEditLinkedin(currentUser.linkedinUrl || '');
    setEditInstagram(currentUser.instagramUrl || '');
    setEditFacebook(currentUser.facebookUrl || '');
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
      const isAltaf = currentUser.email.toLowerCase() === 'altaf.aziz16@gmail.com';
      const updated = studentService.updateLecturerProfile({
        name: editName.trim(),
        title: editTitle.trim(),
        nidn: editNidn.trim(),
        department: editDept.trim(),
        bio: editBio.trim(),
        avatarUrl: editAvatarUrl.trim() || (isAltaf ? '/tengku_avatar.png' : getInitialsAvatar(editName.trim(), true)),
        googleScholarUrl: editScholar.trim(),
        sintaUrl: editSinta.trim(),
        scopusUrl: editScopus.trim(),
        researchGateUrl: editResearchGate.trim(),
        campusEmail: editEmail.trim(),
        linkedinUrl: editLinkedin.trim(),
        instagramUrl: editInstagram.trim(),
        facebookUrl: editFacebook.trim(),
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

  const renderAcademicSocialLinks = (user: AuthUser) => {
    const links: { key: string; title: string; href: string; icon: string }[] = [];
    const isAltaf = user.email.toLowerCase().includes('altaf');

    if (isValidProfileUrl(user.googleScholarUrl)) {
      const href = user.googleScholarUrl!.startsWith('http') ? user.googleScholarUrl! : `https://${user.googleScholarUrl}`;
      links.push({ key: 'scholar', title: 'Google Scholar', href, icon: '/icons/scholar.png' });
    }
    // Pak Tengku tidak memiliki akun SINTA atau Scopus
    if (!isAltaf && isValidProfileUrl(user.sintaUrl)) {
      const href = user.sintaUrl!.startsWith('http') ? user.sintaUrl! : `https://${user.sintaUrl}`;
      links.push({ key: 'sinta', title: 'SINTA Kemdikbud', href, icon: '/icons/sinta.png' });
    }
    if (!isAltaf && isValidProfileUrl(user.scopusUrl)) {
      const href = user.scopusUrl!.startsWith('http') ? user.scopusUrl! : `https://${user.scopusUrl}`;
      links.push({ key: 'scopus', title: 'Scopus Author ID', href, icon: '/icons/scopus.png' });
    }
    if (isValidProfileUrl(user.orcidUrl)) {
      const href = user.orcidUrl!.startsWith('http') ? user.orcidUrl! : `https://${user.orcidUrl}`;
      links.push({ key: 'orcid', title: 'ORCID', href, icon: '/icons/orcid.png' });
    }
    if (isValidProfileUrl(user.researchGateUrl)) {
      const href = user.researchGateUrl!.startsWith('http') ? user.researchGateUrl! : `https://${user.researchGateUrl}`;
      links.push({ key: 'rg', title: 'ResearchGate', href, icon: '/icons/researchgate.png' });
    }
    const emailContact = user.campusEmail || user.email;
    if (emailContact && emailContact.includes('@')) {
      links.push({ key: 'email', title: `Email: ${emailContact}`, href: `mailto:${emailContact}`, icon: '/icons/email.svg' });
    }
    if (isValidProfileUrl(user.linkedinUrl)) {
      const href = user.linkedinUrl!.startsWith('http') ? user.linkedinUrl! : `https://${user.linkedinUrl}`;
      links.push({ key: 'linkedin', title: 'LinkedIn', href, icon: '/icons/linkedin.png' });
    }
    if (isValidProfileUrl(user.instagramUrl)) {
      const raw = user.instagramUrl!;
      const href = raw.startsWith('http')
        ? raw
        : (raw.startsWith('@') ? `https://instagram.com/${raw.slice(1)}` : `https://instagram.com/${raw}`);
      links.push({ key: 'instagram', title: 'Instagram', href, icon: '/icons/instagram.png' });
    }
    if (isValidProfileUrl(user.facebookUrl)) {
      const href = user.facebookUrl!.startsWith('http') ? user.facebookUrl! : `https://${user.facebookUrl}`;
      links.push({ key: 'facebook', title: 'Facebook', href, icon: '/icons/facebook.png' });
    }
    if (isValidProfileUrl(user.websiteUrl)) {
      const href = user.websiteUrl!.startsWith('http') ? user.websiteUrl! : `https://${user.websiteUrl}`;
      links.push({ key: 'web', title: 'Website', href, icon: '/icons/web.svg' });
    }

    if (links.length === 0) return null;

    return (
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Tautan Akademik & Media Sosial:
        </span>
        <div className="flex items-center flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.key}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              title={link.title}
              className="w-8 h-8 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:scale-110 shadow-2xs transition-all flex items-center justify-center shrink-0 group"
            >
              <img src={link.icon} alt={link.title} className="w-full h-full object-contain" />
            </a>
          ))}
        </div>
      </div>
    );
  };

  // Build the list of the 2 official lecturers
  const registered = studentService.getRegisteredLecturers();
  const altafSaved = registered.find((l) => l.email.toLowerCase() === 'altaf.aziz16@gmail.com') || DEFAULT_LECTURERS['altaf.aziz16@gmail.com'];
  const miftahSaved = registered.find((l) => l.email.toLowerCase() === 'miftahurridlo.688@gmail.com') || DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'];

  const lecturerList: AuthUser[] = [
    {
      ...DEFAULT_LECTURERS['altaf.aziz16@gmail.com'],
      ...altafSaved,
      name: (altafSaved.name || DEFAULT_LECTURERS['altaf.aziz16@gmail.com'].name).replace('S.Pd', 'S.Si'),
      avatarUrl: '/tengku_avatar.png',
      title: altafSaved.title || 'Tenaga Teknis Survei & Pemetaan / Dosen Pengampu Partner',
      department: altafSaved.department || 'Tenaga Teknis Survei dan Pemetaan BPN Kota Binjai • Geografi / Universitas Negeri Medan',
      googleScholarUrl: altafSaved.googleScholarUrl || DEFAULT_LECTURERS['altaf.aziz16@gmail.com'].googleScholarUrl || '',
      researchGateUrl: altafSaved.researchGateUrl || DEFAULT_LECTURERS['altaf.aziz16@gmail.com'].researchGateUrl || '',
      linkedinUrl: altafSaved.linkedinUrl || DEFAULT_LECTURERS['altaf.aziz16@gmail.com'].linkedinUrl || '',
      instagramUrl: altafSaved.instagramUrl || DEFAULT_LECTURERS['altaf.aziz16@gmail.com'].instagramUrl || '',
      facebookUrl: altafSaved.facebookUrl || DEFAULT_LECTURERS['altaf.aziz16@gmail.com'].facebookUrl || '',
      scopusUrl: '',
      sintaUrl: '',
    },
    {
      ...DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'],
      ...miftahSaved,
      name: (miftahSaved.name || DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'].name).replace('S.Pd., ', ''),
      avatarUrl: '/miftah_avatar.png',
      title: miftahSaved.title || 'Dosen Pengampu Utama',
      department: miftahSaved.department || 'Universitas Negeri Medan',
      googleScholarUrl: miftahSaved.googleScholarUrl || DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'].googleScholarUrl || '',
      sintaUrl: miftahSaved.sintaUrl || DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'].sintaUrl || '',
      linkedinUrl: miftahSaved.linkedinUrl || DEFAULT_LECTURERS['miftahurridlo.688@gmail.com'].linkedinUrl || '',
      campusEmail: 'miftahurridlo.688@gmail.com',
      scopusUrl: '',
      researchGateUrl: '',
      instagramUrl: '',
      facebookUrl: '',
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
            Dua Akun Dosen Pengampu Terhubung My Journey
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lecturerList.map((lecturer) => {
            const isActive = currentUser.email.toLowerCase() === lecturer.email.toLowerCase();
            const isPrimary = lecturer.email === 'miftahurridlo.688@gmail.com';
            const rawUser = isActive ? { ...lecturer, ...currentUser } : lecturer;
            const displayUser = {
              ...rawUser,
              name: isPrimary
                ? (rawUser.name || lecturer.name).replace('S.Pd., ', '').replace('S.Pd, ', '').replace('S.Pd', '').trim()
                : (rawUser.name || lecturer.name).replace('S.Pd', 'S.Si'),
              department: isPrimary
                ? (rawUser.department && rawUser.department !== 'Sains Informasi Geografi' ? rawUser.department : 'Universitas Negeri Medan')
                : (rawUser.department || 'Tenaga Teknis Survei dan Pemetaan BPN Kota Binjai • Geografi / Universitas Negeri Medan'),
              googleScholarUrl: rawUser.googleScholarUrl || lecturer.googleScholarUrl || '',
              researchGateUrl: isPrimary ? '' : (rawUser.researchGateUrl || lecturer.researchGateUrl || ''),
              linkedinUrl: rawUser.linkedinUrl || lecturer.linkedinUrl || '',
              instagramUrl: isPrimary ? '' : (rawUser.instagramUrl || lecturer.instagramUrl || ''),
              facebookUrl: isPrimary ? '' : (rawUser.facebookUrl || lecturer.facebookUrl || ''),
              sintaUrl: isPrimary ? (rawUser.sintaUrl || lecturer.sintaUrl || '') : '',
              scopusUrl: '',
            };

            return (
              <div
                key={displayUser.id || displayUser.email}
                className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all relative flex flex-col justify-between h-full ${
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
                    {(displayUser.nidn || DEFAULT_LECTURERS[displayUser.email]?.nidn) ? (
                      <span className="text-[10px] text-slate-400 font-mono">
                        NIDN: {displayUser.nidn || DEFAULT_LECTURERS[displayUser.email]?.nidn}
                      </span>
                    ) : null}
                  </div>

                  {isActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      Aktif Sekarang
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      <Users className="w-3 h-3 text-slate-400" />
                      Rekan Tim
                    </span>
                  )}
                </div>

                {/* Profile Avatar & Details */}
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={displayUser.avatarUrl || (displayUser.email.toLowerCase().includes('altaf') ? '/tengku_avatar.png' : '/miftah_avatar.png')}
                    alt={displayUser.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-slate-700 shrink-0 bg-indigo-50 dark:bg-slate-800"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = displayUser.email.toLowerCase().includes('altaf') ? '/tengku_avatar.png' : getInitialsAvatar(displayUser.name, true);
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
                      {displayUser.title || (isPrimary ? 'Dosen Pengampu Utama' : 'Tenaga Teknis Survei & Pemetaan / Dosen Pengampu Partner')}
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
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[72px] flex items-center mb-4">
                  {displayUser.bio || (isPrimary
                    ? 'Dosen Pengampu Utama Smart Learning Hub & My Journey. Koordinator kurikulum OBE dan penanggung jawab sinkronisasi pengajaran.'
                    : 'Tenaga Teknis Survei & Pemetaan dan Dosen Pengampu Partner Sains Informasi Geografi. Terhubung langsung dengan workspace riset, pemetaan, dan administrasi perkuliahan My Journey.')}
                </div>

                {/* Academic & Social Links Bar */}
                <div className="min-h-[58px] flex flex-col justify-center mb-4">
                  {renderAcademicSocialLinks(displayUser)}
                </div>

                {/* Taught Classes Pill List */}
                <div className="space-y-1.5 mb-5 min-h-[52px] flex flex-col justify-center">
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

                {/* Account Status / Profile Action */}
                <div className="mt-auto pt-2">
                  {!isActive ? (
                    <div className="w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium text-center flex items-center justify-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      <span>Rekan Kolaborasi Tim Dosen (Akun Terverifikasi My Journey)</span>
                    </div>
                  ) : (
                    <button
                      onClick={openEditModal}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold text-center flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>✓ Akun Anda Saat Ini (Ubah Profil)</span>
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
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
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setEditAvatarUrl('/tengku_avatar.png')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                      >
                        Pakai Pas Foto Jas & Dasi Merah
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditAvatarUrl(getInitialsAvatar(editName, true))}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        Pakai Avatar Inisial
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-2 relative">
                  <Link className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={editAvatarUrl.startsWith('data:') ? '' : editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    placeholder="https://example.com/foto-anda.jpg atau /tengku_avatar.png"
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
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tautan Profil Akademik & Media Sosial (Sesuai My Journey)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Google Scholar</label>
                    <input
                      type="url"
                      value={editScholar}
                      onChange={(e) => setEditScholar(e.target.value)}
                      placeholder="https://scholar.google.com/..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">SINTA Kemdikbud</label>
                    <input
                      type="url"
                      value={editSinta}
                      onChange={(e) => setEditSinta(e.target.value)}
                      placeholder="https://sinta.kemdikbud.go.id/..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Scopus Author ID</label>
                    <input
                      type="url"
                      value={editScopus}
                      onChange={(e) => setEditScopus(e.target.value)}
                      placeholder="https://www.scopus.com/..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">ResearchGate</label>
                    <input
                      type="url"
                      value={editResearchGate}
                      onChange={(e) => setEditResearchGate(e.target.value)}
                      placeholder="https://www.researchgate.net/profile/..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Email Kontak / Kampus</label>
                    <input
                      type="text"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="email@unimed.ac.id"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">LinkedIn</label>
                    <input
                      type="url"
                      value={editLinkedin}
                      onChange={(e) => setEditLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Instagram</label>
                    <input
                      type="text"
                      value={editInstagram}
                      onChange={(e) => setEditInstagram(e.target.value)}
                      placeholder="https://instagram.com/... atau @username"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Facebook</label>
                    <input
                      type="url"
                      value={editFacebook}
                      onChange={(e) => setEditFacebook(e.target.value)}
                      placeholder="https://facebook.com/..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
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
