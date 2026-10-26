import React from 'react';
import { Bell, Check, X, FileText, Award, Calendar, Megaphone, CheckCheck } from 'lucide-react';
import type { StudentNotification } from '../../types/index.ts';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: StudentNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (tab: string, contextId?: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getIcon = (type: StudentNotification['type']) => {
    switch (type) {
      case 'assignment':
        return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'grade':
        return <Award className="w-4 h-4 text-emerald-500" />;
      case 'attendance':
      case 'meeting':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'announcement':
      default:
        return <Megaphone className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-2xs"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed top-16 right-4 z-50 w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-4 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Pemberitahuan"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Notifikasi
            </h3>
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-600 text-white">
                {unreadCount} baru
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 font-medium flex items-center gap-1"
                title="Tandai semua dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Semua dibaca
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Tutup notifikasi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 flex-1">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="text-sm">Belum ada notifikasi.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                  !item.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                }`}
                onClick={() => {
                  if (!item.isRead) onMarkRead(item.id);
                  if (item.linkTab) {
                    onNavigate(item.linkTab, item.linkId);
                    onClose();
                  }
                }}
              >
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        !item.isRead ? 'text-blue-900 dark:text-blue-200' : 'text-slate-900 dark:text-slate-200'
                      }`}
                    >
                      {item.title}
                    </p>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                    {item.message}
                  </p>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    {item.timestamp}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 text-center">
          <button
            onClick={() => {
              onNavigate('pengumuman');
              onClose();
            }}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            Lihat Semua Pengumuman Akademik &rarr;
          </button>
        </div>
      </div>
    </>
  );
};
