import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  User, 
  LogOut, 
  ShieldCheck, 
  Sparkles,
  Database,
  ArrowLeftRight,
  GraduationCap,
  Cloud
} from 'lucide-react';
import { Logo } from './Logo.tsx';
import type { AuthUser, StudentNotification } from '../../types/index.ts';

interface NavbarProps {
  currentUser: AuthUser;
  notifications: StudentNotification[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onNavigate: (tab: string) => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onOpenAuthModal: () => void;
  onQuickToggleRole: () => void;
  onOpenGoogleModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  notifications,
  theme,
  onToggleTheme,
  onOpenSearch,
  onOpenNotifications,
  onNavigate,
  isMobileMenuOpen,
  onToggleMobileMenu,
  onOpenAuthModal,
  onQuickToggleRole,
  onOpenGoogleModal,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Toggle & Brand (on mobile) */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu navigasi'}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="md:hidden">
            <Logo size={28} showText={true} textClassName="text-sm font-bold text-slate-900 dark:text-white" />
          </div>

          {/* Desktop Search Trigger Bar */}
          <div className="hidden md:flex items-center">
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2.5 px-3.5 py-2 w-72 lg:w-96 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-700 text-left"
              aria-label="Cari kelas, materi, dan tugas (Tekan Cmd+K)"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span className="flex-1 truncate">Cari materi, mahasiswa, atau tugas...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                ⌘K
              </kbd>
            </button>
          </div>
        </div>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Google Drive & Backup Trigger Button */}
          {onOpenGoogleModal && (
            <button
              onClick={onOpenGoogleModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs border bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              title="Kelola Integrasi Google Drive & Pencadangan Google Spreadsheet"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Drive & Sheets</span>
            </button>
          )}

          {/* Quick Role Switcher (Convenient for local server testing as requested!) */}
          <button
            onClick={onQuickToggleRole}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs border bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            title="Klik untuk langsung berganti peran antara Dosen dan Mahasiswa saat pengujian lokal"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Peran:</span>
            <span
              className={`px-2 py-0.5 rounded-md font-mono ${
                currentUser.role === 'dosen'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {currentUser.role === 'dosen' ? 'Dosen' : 'Mahasiswa'}
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>

          {/* Notification Button */}
          <div className="relative">
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="true"
              aria-label="Menu profil"
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-600/30 dark:ring-blue-400/30"
              />
              <div className="hidden sm:flex flex-col text-left leading-none">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {currentUser.role === 'dosen' ? 'Tim Dosen' : `NIM: ${currentUser.nim || '2208101'}`}
                </span>
              </div>
            </button>

            {isProfileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {currentUser.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
                      {currentUser.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        currentUser.role === 'dosen'
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      }`}>
                        Peran: {currentUser.role === 'dosen' ? 'Dosen Pengampu' : 'Mahasiswa'}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onNavigate('profil');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      Profil & Pengaturan
                    </button>
                    <button
                      onClick={() => {
                        onOpenAuthModal();
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      Ganti Akun / Masuk Lain
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
