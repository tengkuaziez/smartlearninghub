import React from 'react';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Megaphone, 
  ChevronRight, 
  CheckCircle2 
} from 'lucide-react';
import type { 
  CourseClass, 
  Meeting, 
  Assignment, 
  AssignmentSubmission, 
  Announcement 
} from '../../types/index.ts';
import { getAssignmentSubmissionStatus } from '../../utils/academicCalculations.ts';

interface ClassCardProps {
  course: CourseClass;
  meetings: Meeting[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  announcements: Announcement[];
  onOpenClass: (courseId: string) => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  course,
  meetings,
  assignments,
  submissions,
  announcements,
  onOpenClass,
}) => {
  // Course specific meetings
  const courseMeetings = meetings.filter((m) => m.courseId === course.id);
  const nextMeeting = courseMeetings[0];

  // Course specific pending assignments
  const pendingAssignments = assignments.filter((a) => {
    if (a.courseId !== course.id) return false;
    const sub = submissions.find((s) => s.assignmentId === a.id);
    const status = getAssignmentSubmissionStatus(a, sub);
    return status === 'belum_dikerjakan' || status === 'terlambat' || status === 'perlu_revisi';
  });

  // Latest announcement for this course
  const latestAnnouncement = announcements.find((a) => a.courseId === course.id);

  // Progress
  const progressPercent = Math.round((course.completedMeetings / course.totalMeetings) * 100);

  return (
    <div
      onClick={() => onOpenClass(course.id)}
      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between cursor-pointer group"
    >
      <div>
        {/* Top badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-mono">
              {course.code}
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {course.credits} SKS
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {course.scheduleDay}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {course.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
          {course.description}
        </p>

        {/* Lecturer Info */}
        <div className="mt-4 flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <img
            src={course.teacher.avatarUrl}
            alt={course.teacher.name}
            className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-300 dark:ring-slate-700"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {course.teacher.name}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {course.teacher.title}
            </p>
          </div>
        </div>

        {/* Learning progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Progres Perkuliahan
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {course.completedMeetings}/{course.totalMeetings} Sesi ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Insights (Upcoming meeting, pending tasks, announcement) */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
          {nextMeeting && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">
                Pertemuan berikutnya: <strong>{nextMeeting.title.split(':')[0]}</strong>
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Tugas pending:</span>
            </span>
            {pendingAssignments.length > 0 ? (
              <span className="font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[11px]">
                {pendingAssignments.length} perlu dikumpulkan
              </span>
            ) : (
              <span className="font-medium text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Lengkap
              </span>
            )}
          </div>

          {latestAnnouncement && (
            <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
              <Megaphone className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <p className="line-clamp-1 text-[11px]">
                <strong>Info:</strong> {latestAnnouncement.title}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {course.room}
        </span>
        <button
          type="button"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 flex items-center gap-1"
        >
          Masuk Kelas
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
