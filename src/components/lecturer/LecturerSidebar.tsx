import React from 'react';
import { 
  Home, 
  BookOpen, 
  FileCheck2, 
  QrCode, 
  Megaphone, 
  UserCheck, 
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  LogOut,
  Users
} from 'lucide-react';
import { Logo } from '../common/Logo.tsx';
import type { AuthUser } from '../../types/index.ts';

export type LecturerNavTab = 
  | 'beranda'
  | 'kelas'
  | 'mahasiswa'
  | 'koreksi'
  | 'pengumuman'
  | 'profil';

interface LecturerSidebarProps {
  activeTab: LecturerNavTab;
  onSelectTab: (tab: LecturerNavTab) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  user: AuthUser;
  pendingGradingCount: number;
  onLogout?: () => void;
}

export const LecturerSidebar: React.FC<LecturerSidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
  user,
  pendingGradingCount,
  onLogout,
}) => {
  const navItems = [
    {
      id: 'beranda' as LecturerNavTab,
      label: 'Beranda Dosen',
      icon: Home,
    },
    {
      id: 'kelas' as LecturerNavTab,
      label: 'Manajemen Kelas',
      icon: BookOpen,
    },
    {
      id: 'mahasiswa' as LecturerNavTab,
      label: 'Manajemen Mahasiswa',
      icon: Users,
    },
    {
      id: 'koreksi' as LecturerNavTab,
      label: 'Koreksi Tugas',
      icon: FileCheck2,
      badge: pendingGradingCount > 0 ? `${pendingGradingCount}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    },
    {
      id: 'pengumuman' as LecturerNavTab,
      label: 'Pengumuman',
      icon: Megaphone,
    },
    {
      id: 'profil' as LecturerNavTab,
      label: 'Profil Tim Dosen',
      icon: UserCheck,
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center border-b border-slate-800">
        <Logo size={32} showText={true} textClassName="text-base font-bold tracking-tight text-white" />
      </div>

      {/* Lecturer Badge Card */}
      <div className="p-4 mx-3 my-3 rounded-2xl bg-indigo-950/40 border border-indigo-800/60">
        <div className="flex items-center gap-3">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-400"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white truncate">
              {user.name}
            </h4>
            <p className="text-xs text-indigo-300 truncate font-mono">
              {user.email}
            </p>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-indigo-900/60 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-indigo-300 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Tim Dosen Pengampu
          </span>
          <span className="font-mono text-slate-400">{user.nidn ? `NIDN: ${user.nidn}` : 'Terotentikasi'}</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2" aria-label="Menu Utama Dosen">
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

      {/* Footer Info */}
      <div className="p-4 mx-3 mb-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
          <span>Sistem Kelas Mandiri</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Semua matkul dikelola langsung oleh tim kami berdua. Tersinkronisasi dengan profil My Journey.
        </p>
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full mt-2 pt-2 border-t border-slate-700/60 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar (Logout)</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:block w-64 lg:w-72 shrink-0 h-screen sticky top-0 z-20">
        {content}
      </aside>

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
            aria-label="Navigasi Menu Dosen"
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
};
