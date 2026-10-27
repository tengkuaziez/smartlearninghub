import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, BookOpen, Video, FileText, Bell, ArrowRight, CornerDownLeft } from 'lucide-react';
import { studentService } from '../../services/studentService.ts';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, contextId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  // Keyboard shortcut listener (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset query on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const courses = useMemo(() => studentService.getEnrolledCourses(), [isOpen]);
  const assignments = useMemo(() => studentService.getAssignments(), [isOpen]);
  const meetings = useMemo(() => studentService.getMeetings(), [isOpen]);
  const announcements = useMemo(() => studentService.getAnnouncements(), [isOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { courses: [], assignments: [], meetings: [], announcements: [] };

    return {
      courses: courses.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.code?.toLowerCase().includes(q) ||
          c.teacher?.name?.toLowerCase().includes(q)
      ),
      assignments: assignments.filter(
        (a) => a.title.toLowerCase().includes(q) || a.instructions.toLowerCase().includes(q)
      ),
      meetings: meetings.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.topic.toLowerCase().includes(q) ||
          m.learningObjectives.some((obj) => obj.toLowerCase().includes(q))
      ),
      announcements: announcements.filter(
        (an) => an.title.toLowerCase().includes(q) || an.content.toLowerCase().includes(q)
      ),
    };
  }, [query, courses, assignments, meetings, announcements]);

  if (!isOpen) return null;

  const totalResults =
    results.courses.length +
    results.assignments.length +
    results.meetings.length +
    results.announcements.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian Global"
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kelas, pertemuan, tugas, atau pengumuman..."
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 text-base focus:outline-none"
            autoFocus
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Bersihkan pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {query.trim() === '' ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-400">
                Ketik kata kunci untuk mencari materi, tugas, dan jadwal perkuliahan Anda.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {['REST API', 'Tugas', 'Docker', 'Machine Learning', 'Presensi'].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => setQuery(hint)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-sm font-medium">Tidak ada hasil ditemukan untuk "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">
                Periksa ejaan kata kunci atau coba gunakan istilah umum lainnya.
              </p>
            </div>
          ) : (
            <>
              {/* Courses */}
              {results.courses.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2">
                    Kelas Kuliah ({results.courses.length})
                  </h4>
                  <div className="space-y-1">
                    {results.courses.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onNavigate('kelas', c.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{c.title}</span>
                              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                                {c.code}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {c.teacher.name} • {c.scheduleDay}, {c.scheduleTime}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignments */}
              {results.assignments.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2">
                    Tugas ({results.assignments.length})
                  </h4>
                  <div className="space-y-1">
                    {results.assignments.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          onNavigate('tugas', a.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {a.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Batas Waktu: {new Date(a.deadline).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Meetings */}
              {results.meetings.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2">
                    Pertemuan Kuliah ({results.meetings.length})
                  </h4>
                  <div className="space-y-1">
                    {results.meetings.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          onNavigate('pertemuan', m.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Video className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {m.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {m.date} • {m.startTime} - {m.endTime} WIB ({m.room})
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Announcements */}
              {results.announcements.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2">
                    Pengumuman ({results.announcements.length})
                  </h4>
                  <div className="space-y-1">
                    {results.announcements.map((an) => (
                      <button
                        key={an.id}
                        onClick={() => {
                          onNavigate('pengumuman', an.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Bell className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {an.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {an.authorName} • {new Date(an.date).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
                <CornerDownLeft className="w-3 h-3 inline" />
              </kbd>{' '}
              Buka
            </span>
            <span className="flex items-center gap-1 ml-2">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
                ESC
              </kbd>{' '}
              Tutup
            </span>
          </div>
          <span>Smart Learning Hub Search</span>
        </div>
      </div>
    </div>
  );
};
