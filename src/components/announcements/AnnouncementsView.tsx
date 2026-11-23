import React, { useState, useMemo } from 'react';
import { 
  Megaphone, 
  Search, 
  Filter, 
  Pin, 
  Calendar, 
  User, 
  CheckCheck, 
  ExternalLink,
  ChevronRight,
  X,
  Plus,
  Trash2,
  Send,
  BookOpen
} from 'lucide-react';
import { Badge } from '../common/Badge.tsx';
import { EmptyState } from '../common/EmptyState.tsx';
import { formatIndonesianDate } from '../../utils/academicCalculations.ts';
import { studentService } from '../../services/studentService.ts';
import type { Announcement, CourseClass, AuthUser } from '../../types/index.ts';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  courses: CourseClass[];
  currentUser?: AuthUser | null;
  onDataUpdated?: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpenMeeting: (meetingId: string) => void;
  onOpenAssignment: (assignmentId: string) => void;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  announcements,
  courses,
  currentUser,
  onDataUpdated,
  onMarkRead,
  onMarkAllRead,
  onOpenMeeting,
  onOpenAssignment,
}) => {
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Modal create announcement state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [targetCourseId, setTargetCourseId] = useState('all');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLecturer = currentUser?.role === 'dosen';
  const unreadCount = announcements.filter((a) => !a.isRead).length;

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      if (selectedCourseFilter !== 'all' && ann.courseId !== selectedCourseFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ann.title.toLowerCase().includes(q) ||
          ann.content.toLowerCase().includes(q) ||
          ann.authorName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [announcements, selectedCourseFilter, searchQuery]);

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setIsSubmitting(true);
    try {
      studentService.postAnnouncement({
        courseId: targetCourseId,
        title: newTitle.trim(),
        content: newContent.trim(),
        isPinned,
        authorName: currentUser?.name,
        authorRole: 'Dosen Pengampu',
      });

      setNewTitle('');
      setNewContent('');
      setTargetCourseId('all');
      setIsPinned(false);
      setIsCreateModalOpen(false);
      onDataUpdated?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = (e: React.MouseEvent, ann: Announcement) => {
    e.stopPropagation();
    if (window.confirm(`Hapus pengumuman "${ann.title}"? Pengumuman ini akan ditarik dari seluruh mahasiswa.`)) {
      studentService.deleteAnnouncement(ann.id);
      if (selectedAnnouncement?.id === ann.id) {
        setSelectedAnnouncement(null);
      }
      onDataUpdated?.();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Pengumuman Akademik & Kelas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Informasi penting dari dosen pengampu kelas dan pusat pengelola fakultas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Tandai Semua Dibaca ({unreadCount})</span>
            </button>
          )}

          {isLecturer && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Pengumuman Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kata kunci pengumuman..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Kelas & Fakultas</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List of Announcements */}
      {filteredAnnouncements.length > 0 ? (
        <div className="space-y-4">
          {filteredAnnouncements.map((ann) => (
            <div
              key={ann.id}
              onClick={() => {
                if (!ann.isRead) onMarkRead(ann.id);
                setSelectedAnnouncement(ann);
              }}
              className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                ann.isPinned
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              } hover:border-blue-400 dark:hover:border-blue-600`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {ann.isPinned && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 flex items-center gap-1">
                      <Pin className="w-3 h-3" /> Disematkan
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {ann.courseTitle || 'Pengumuman Fakultas'}
                  </span>
                  {!ann.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">
                    {formatIndonesianDate(ann.date, true)}
                  </span>
                  {isLecturer && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteAnnouncement(e, ann)}
                      title="Hapus Pengumuman"
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {ann.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-3 leading-relaxed whitespace-pre-line">
                {ann.content}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {ann.authorName} ({ann.authorRole})
                </span>

                <button
                  type="button"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  Baca Selengkapnya
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Megaphone}
          title="Tidak ada pengumuman"
          description="Belum ada pengumuman baru untuk kelas atau kata kunci filter yang dipilih."
        />
      )}

      {/* MODAL: Tambah Pengumuman Baru (Untuk Dosen) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Buat Pengumuman Baru
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Siarkan pengumuman kepada mahasiswa secara realtime instan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4">
              {/* Target Kelas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Kelas Perkuliahan <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={targetCourseId}
                    onChange={(e) => setTargetCourseId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">Semua Kelas Perkuliahan (Pengumuman Umum Fakultas)</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.title} ({c.section || 'Kelas A'})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pilih apakah pengumuman ditujukan untuk kelas tertentu atau seluruh mahasiswa.
                </p>
              </div>

              {/* Judul Pengumuman */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Judul Pengumuman <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Jadwal Pengganti Praktikum Pertemuan Ke-7"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Isi Pengumuman */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Isi Pesan / Instruksi Lengkap <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Tuliskan isi pengumuman atau instruksi perkuliahan yang ingin disampaikan kepada mahasiswa..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              {/* Checkbox Disematkan */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinAnnouncementCheckbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                />
                <label
                  htmlFor="pinAnnouncementCheckbox"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5"
                >
                  <Pin className="w-3.5 h-3.5 text-amber-500" />
                  Sematkan di bagian atas (Pin Announcement)
                </label>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim() || !newContent.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Menyiarkan...' : 'Siarkan Pengumuman'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Detail Reader Dialog */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {selectedAnnouncement.courseTitle || 'Pengumuman Fakultas'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                  {selectedAnnouncement.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Dipublikasikan: {formatIndonesianDate(selectedAnnouncement.date, true)}
                </p>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {selectedAnnouncement.content}
              </p>

              {selectedAnnouncement.relatedMeetingId && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs">
                  <span className="font-medium text-blue-900 dark:text-blue-200">
                    Pengumuman ini merujuk pada sesi pertemuan kelas
                  </span>
                  <button
                    onClick={() => {
                      onOpenMeeting(selectedAnnouncement.relatedMeetingId!);
                      setSelectedAnnouncement(null);
                    }}
                    className="font-bold text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1"
                  >
                    Buka Pertemuan <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {selectedAnnouncement.relatedAssignmentId && (
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between text-xs">
                  <span className="font-medium text-indigo-900 dark:text-indigo-200">
                    Pengumuman ini merujuk pada penugasan resmi
                  </span>
                  <button
                    onClick={() => {
                      onOpenAssignment(selectedAnnouncement.relatedAssignmentId!);
                      setSelectedAnnouncement(null);
                    }}
                    className="font-bold text-indigo-700 dark:text-indigo-300 hover:underline flex items-center gap-1"
                  >
                    Buka Tugas <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>
                Pengirim: <strong>{selectedAnnouncement.authorName}</strong> ({selectedAnnouncement.authorRole})
              </span>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-1.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
