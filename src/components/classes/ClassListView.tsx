import React, { useState, useMemo } from 'react';
import { Search, BookOpen, GraduationCap, Sparkles } from 'lucide-react';
import { ClassCard } from './ClassCard.tsx';
import { EmptyState } from '../common/EmptyState.tsx';
import type { 
  CourseClass, 
  Meeting, 
  Assignment, 
  AssignmentSubmission, 
  Announcement 
} from '../../types/index.ts';

interface ClassListViewProps {
  courses: CourseClass[];
  meetings: Meeting[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  announcements: Announcement[];
  onOpenClass: (courseId: string) => void;
}

export const ClassListView: React.FC<ClassListViewProps> = ({
  courses,
  meetings,
  assignments,
  submissions,
  announcements,
  onOpenClass,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      return (
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.teacher.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [courses, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header without 'Tambah Kelas' or 'Total SKS' */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Kelas Saya
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daftar mata kuliah yang Anda ikuti bersama Tim Dosen Pengampu semester ini.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
          <BookOpen className="w-4 h-4" />
          <span>{courses.length} Kelas Terdaftar</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari mata kuliah atau nama dosen pengampu..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grid of enrolled classes */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => (
            <ClassCard
              key={course.id}
              course={course}
              meetings={meetings}
              assignments={assignments}
              submissions={submissions}
              announcements={announcements}
              onOpenClass={onOpenClass}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Tidak ada kelas yang ditemukan"
          description="Email Anda belum terdaftar dalam kelas yang sesuai dengan kata kunci ini. Hubungi tim dosen untuk mendaftarkan email Anda ke kelas."
        />
      )}
    </div>
  );
};
