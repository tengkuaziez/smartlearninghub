import React, { useState } from 'react';
import { 
  Award, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ExternalLink,
  MessageSquare,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Badge } from '../common/Badge.tsx';
import { calculateCourseGradeAverage, formatIndonesianDate, getAssignmentSubmissionStatus } from '../../utils/academicCalculations.ts';
import type { GradeItem, CourseClass, Assignment, AssignmentSubmission } from '../../types/index.ts';

interface GradesViewProps {
  courses: CourseClass[];
  grades: GradeItem[];
  assignments?: Assignment[];
  submissions?: AssignmentSubmission[];
  onOpenAssignment?: (assignmentId: string) => void;
}

export const GradesView: React.FC<GradesViewProps> = ({
  courses,
  grades,
  assignments = [],
  submissions = [],
  onOpenAssignment,
}) => {
  // State to toggle course details (default all open)
  const [expandedCourseIds, setExpandedCourseIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    courses.forEach((c) => {
      initial[c.id] = true;
    });
    return initial;
  });

  const toggleCourseExpand = (courseId: string) => {
    setExpandedCourseIds((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Nilai & Evaluasi Tugas Perkuliahan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pantau rata-rata penilaian tiap mata kuliah beserta rekapan seluruh tugas yang telah dikerjakan.
          </p>
        </div>
      </div>

      {/* Info Notice: Independent Per-Course Grading (No IPK Concept) */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
        <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-slate-900 dark:text-white">
            Penilaian Berbasis Mata Kuliah
          </p>
          <p className="leading-relaxed">
            Setiap mata kuliah dinilai secara mandiri berdasarkan pengerjaan tugas dan evaluasi dari tim dosen pengampu dalam rentang skor 0–100.
          </p>
        </div>
      </div>

      {/* Course-by-Course Grade & Task Recaps */}
      <div className="space-y-6">
        {courses.length > 0 ? (
          courses.map((course) => {
            const courseGrades = grades.filter((g) => g.courseId === course.id);
            const courseStats = calculateCourseGradeAverage(courseGrades);

            // Assignments for this course
            const courseAssignments = assignments.filter((a) => a.courseId === course.id);
            const isExpanded = expandedCourseIds[course.id] ?? true;

            return (
              <div
                key={course.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
              >
                {/* Course Header Banner */}
                <div
                  onClick={() => toggleCourseExpand(course.id)}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-extrabold text-sm shrink-0 font-mono shadow-xs border border-blue-200 dark:border-blue-900">
                      {course.code}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                          {course.code}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {course.semester} ({course.academicYear})
                        </span>
                        {courseStats.pendingCount > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-900">
                            {courseStats.pendingCount} tugas dalam proses koreksi
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {course.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Dosen Pengampu: {course.teacher.name}
                        {course.secondaryTeacher ? ` & ${course.secondaryTeacher.name}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Course Average Display (0 - 100 Scale) */}
                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="text-right">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                        Rata-rata Nilai Matkul
                      </span>
                      <div className="flex items-center gap-2 justify-end mt-0.5">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                          {courseStats.gradedCount > 0 ? courseStats.averageScore.toFixed(1) : '—'}
                        </span>
                        <span className="text-xs font-normal text-slate-400 font-mono">/ 100</span>
                        {courseStats.gradedCount > 0 && (
                          <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">
                            Grade {courseStats.letterGrade}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {courseStats.gradedCount} dari {courseAssignments.length} tugas telah dinilai
                      </span>
                    </div>

                    <div className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Section: Task Recap for this Course */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40 space-y-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Rekapan Tugas yang Dikerjakan ({courseAssignments.length} Tugas)</span>
                      </h4>
                      <span className="text-xs text-slate-400">
                        Rincian skor dan umpan balik resmi dari dosen
                      </span>
                    </div>

                    {courseAssignments.length > 0 ? (
                      <div className="space-y-3">
                        {courseAssignments.map((asg) => {
                          const sub = submissions.find((s) => s.assignmentId === asg.id);
                          const gradeItem = courseGrades.find((g) => g.assignmentId === asg.id);
                          const status = getAssignmentSubmissionStatus(asg, sub);
                          const score = sub?.grade !== undefined ? sub.grade : (gradeItem?.isPublished ? gradeItem.score : undefined);
                          const feedback = sub?.feedback || gradeItem?.feedback;

                          return (
                            <div
                              key={asg.id}
                              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                            >
                              {/* Task Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                                      {asg.title}
                                    </h5>
                                    <span className="text-[11px] text-slate-400 font-mono">
                                      Batas: {formatIndonesianDate(asg.deadline, true)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {/* Status Badge */}
                                  {status === 'sudah_dinilai' ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Sudah Dinilai
                                    </span>
                                  ) : status === 'sudah_dikumpulkan' ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      Sudah Dikumpulkan (Menunggu Koreksi)
                                    </span>
                                  ) : status === 'perlu_revisi' ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                                      Perlu Revisi
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium">
                                      Belum Dikerjakan
                                    </span>
                                  )}

                                  {/* Score Pill */}
                                  <div className="text-right">
                                    {score !== undefined ? (
                                      <div className="flex items-baseline gap-1 font-mono">
                                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                          {score}
                                        </span>
                                        <span className="text-xs text-slate-400">/ 100</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs italic text-slate-400">
                                        Belum ada nilai
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Submission Info & Attachment */}
                              {sub && (
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                                  <div className="flex items-center justify-between flex-wrap gap-2 text-slate-500 dark:text-slate-400">
                                    <span>
                                      Dikumpulkan pada: <strong className="text-slate-700 dark:text-slate-300">{formatIndonesianDate(sub.submittedAt, true)}</strong>
                                    </span>
                                    {sub.fileName && (
                                      <span className="font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5" />
                                        {sub.fileName}
                                      </span>
                                    )}
                                  </div>
                                  {sub.textResponse && (
                                    <p className="text-slate-600 dark:text-slate-300 italic">
                                      "{sub.textResponse}"
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Lecturer Feedback Box */}
                              {feedback && (
                                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 text-xs space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200">
                                    <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    <span>Catatan & Evaluasi Dosen:</span>
                                  </div>
                                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic pl-5">
                                    "{feedback}"
                                  </p>
                                </div>
                              )}

                              {/* Action to view / submit assignment */}
                              {onOpenAssignment && (
                                <div className="pt-1 flex justify-end">
                                  <button
                                    onClick={() => onOpenAssignment(asg.id)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    <span>Lihat Rincian Tugas & Rubrik</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                        Belum ada tugas yang ditetapkan untuk mata kuliah ini.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400">
            Belum ada mata kuliah yang terdaftar untuk akun Anda.
          </div>
        )}
      </div>
    </div>
  );
};
