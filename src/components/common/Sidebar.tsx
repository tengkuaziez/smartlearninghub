import React from 'react';
import { 
  Home, 
  BookOpen, 
  Calendar, 
  FileCheck2, 
  QrCode, 
  GraduationCap, 
  Megaphone, 
  UserCheck,
  ChevronRight,
  Shield,
  Sparkles,
  Info
} from 'lucide-react';
import { Logo } from './Logo.tsx';
import type { StudentProfile } from '../../types/index.ts';

export type NavTab = 
  | 'beranda'
  | 'kelas'
  | 'kalender'
  | 'tugas'
  | 'absensi'
  | 'nilai'
  | 'pengumuman'
  | 'profil';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  profile: StudentProfile;
  pendingTasksCount: number;
  unreadAnnouncementsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
  profile,
  pendingTasksCount,
  unreadAnnouncementsCount,
}) => {
  const navItems = [
    {
      id: 'beranda' as NavTab,
      label: 'Beranda',
      icon: Home,
    },
    {
      id: 'kelas' as NavTab,
      label: 'Kelas Saya',
      icon: BookOpen,
    },
    {
      id: 'kalender' as NavTab,
      label: 'Kalender',
      icon: Calendar,
    },
    {
      id: 'tugas' as NavTab,
      label: 'Tugas',
      icon: FileCheck2,
      badge: pendingTasksCount > 0 ? `${pendingTasksCount}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    },
    {
      id: 'absensi' as NavTab,
      label: 'Absensi',
      icon: QrCode,
    },
    {
      id: 'nilai' as NavTab,
      label: 'Nilai',
      icon: GraduationCap,
    },
    {
      id: 'pengumuman' as NavTab,
      label: 'Pengumuman',
      icon: Megaphone,
      badge: unreadAnnouncementsCount > 0 ? `${unreadAnnouncementsCount}` : undefined,
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    },
    {
      id: 'profil' as NavTab,
      label: 'Profil Saya',
      icon: UserCheck,
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center border-b border-slate-800">
        <Logo size={32} showText={true} textClassName="text-base font-bold tracking-tight text-white" />
      </div>

      {/* Student Badge Card */}
      <div className="p-4 mx-3 my-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
        <div className="flex items-center gap-3">
          <img
            src={profile.avatarUrl}
            alt={profile.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/50"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">
              {profile.name}
            </h4>
            <p className="text-xs text-slate-400 truncate">
              {profile.nim} • {profile.major}
            </p>
          </div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Mahasiswa Aktif
          </span>
          <span className="font-mono text-slate-300">{profile.academicYear}</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2" aria-label="Menu Utama Mahasiswa">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold transition-transform ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-4 h-4 text-blue-200" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-4 mx-3 mb-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-slate-300 font-medium mb-1">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>Portal Mahasiswa v2.4</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Dirancang untuk pembelajaran terpusat. Terhubung dengan platform dosen Smart Learning Hub.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 lg:w-72 shrink-0 h-screen sticky top-0 z-20">
        {content}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div
            className="relative w-72 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi Menu Mahasiswa"
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
};
