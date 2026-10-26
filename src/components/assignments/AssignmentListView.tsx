import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Clock, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Award
} from 'lucide-react';
import { SubmissionStatusBadge } from '../common/Badge.tsx';
import { EmptyState } from '../common/EmptyState.tsx';
import { 
  getAssignmentSubmissionStatus, 
  formatIndonesianDate 
} from '../../utils/academicCalculations.ts';
import type { 
  Assignment, 
  AssignmentSubmission, 
  CourseClass,
  SubmissionStatus 
} from '../../types/index.ts';

interface AssignmentListViewProps {
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  courses: CourseClass[];
  onOpenAssignment: (id: string) => void;
}

type AssignmentFilterTab = 
  | 'semua'
  | 'belum_dikerjakan'
  | 'sudah_dikumpulkan'
  | 'sudah_dinilai'
  | 'terlambat';

export const AssignmentListView: React.FC<AssignmentListViewProps> = ({
  assignments,
  submissions,
  courses,
  onOpenAssignment,
}) => {
  const [activeTab, setActiveTab] = useState<AssignmentFilterTab>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');

  // Compute status for all assignments
  const enrichedAssignments = useMemo(() => {
    return assignments.map((asg) => {
      const sub = submissions.find((s) => s.assignmentId === asg.id);
      const course = courses.find((c) => c.id === asg.courseId);
      const status = getAssignmentSubmissionStatus(asg, sub);
      return { asg, sub, course, status };
    });
  }, [assignments, submissions, courses]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      semua: enrichedAssignments.length,
      belum_dikerjakan: enrichedAssignments.filter((item) => item.status === 'belum_dikerjakan').length,
      sudah_dikumpulkan: enrichedAssignments.filter((item) => item.status === 'sudah_dikumpulkan').length,
      sudah_dinilai: enrichedAssignments.filter((item) => item.status === 'sudah_dinilai').length,
      terlambat: enrichedAssignments.filter((item) => item.status === 'terlambat').length,
    };
  }, [enrichedAssignments]);

  // Filtered list
  const filteredList = useMemo(() => {
    return enrichedAssignments.filter(({ asg, course, status }) => {
      // Tab filter
      if (activeTab === 'belum_dikerjakan' && status !== 'belum_dikerjakan') return false;
      if (activeTab === 'sudah_dikumpulkan' && status !== 'sudah_dikumpulkan') return false;
      if (activeTab === 'sudah_dinilai' && status !== 'sudah_dinilai') return false;
      if (activeTab === 'terlambat' && status !== 'terlambat') return false;

      // Course filter
      if (selectedCourseFilter !== 'all' && asg.courseId !== selectedCourseFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = asg.title.toLowerCase().includes(q);
        const matchCourse = course ? (course.title.toLowerCase().includes(q) || course.code.toLowerCase().includes(q)) : false;
        return matchTitle || matchCourse;
      }

      return true;
    });
  }, [enrichedAssignments, activeTab, selectedCourseFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Daftar Tugas & Pengumpulan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola pengumpulan berkas jawaban, tinjau batas waktu, dan pantau penilaian dosen.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'semua' as AssignmentFilterTab, label: 'Semua', count: counts.semua },
          { id: 'belum_dikerjakan' as AssignmentFilterTab, label: 'Belum Dikerjakan', count: counts.belum_dikerjakan },
          { id: 'sudah_dikumpulkan' as AssignmentFilterTab, label: 'Sudah Dikumpulkan', count: counts.sudah_dikumpulkan },
          { id: 'sudah_dinilai' as AssignmentFilterTab, label: 'Sudah Dinilai', count: counts.sudah_dinilai },
          { id: 'terlambat' as AssignmentFilterTab, label: 'Terlambat', count: counts.terlambat },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Course Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul tugas atau mata kuliah..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Mata Kuliah</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignment List Cards */}
      {filteredList.length > 0 ? (
        <div className="space-y-3.5">
          {filteredList.map(({ asg, sub, course, status }) => (
            <div
              key={asg.id}
              onClick={() => onOpenAssignment(asg.id)}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {course?.code || 'IF'}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {course?.title}
                  </span>
                  <SubmissionStatusBadge status={status} />
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  {asg.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {asg.instructions}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Tenggat: <strong className="text-slate-700 dark:text-slate-300">{formatIndonesianDate(asg.deadline, true)}</strong>
                  </span>
                  <span>•</span>
                  <span>Format: {asg.allowedFormats.join(', ')}</span>
                  <span>•</span>
                  <span>Maks: {asg.maxFileSizeMb} MB</span>
                </div>
              </div>

              {/* Action and score badge */}
              <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                {sub?.grade !== undefined && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Nilai Terbit</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {sub.grade}/100
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors ${
                    status === 'belum_dikerjakan' || status === 'terlambat'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span>
                    {status === 'sudah_dinilai'
                      ? 'Lihat Penilaian'
                      : status === 'sudah_dikumpulkan'
                      ? 'Tinjau Berkas'
                      : 'Kumpulkan Tugas'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="Tidak ada tugas ditemukan"
          description="Tidak ada tugas pada kategori ini atau kata kunci pencarian tidak cocok dengan daftar tugas Anda."
        />
      )}
    </div>
  );
};
