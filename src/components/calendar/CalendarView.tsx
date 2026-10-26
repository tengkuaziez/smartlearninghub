import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  FileText, 
  Video, 
  QrCode,
  ArrowRight,
  Filter
} from 'lucide-react';
import { Badge } from '../common/Badge.tsx';
import { formatIndonesianDate } from '../../utils/academicCalculations.ts';
import type { Meeting, Assignment, AttendanceSession, CourseClass } from '../../types/index.ts';

interface CalendarViewProps {
  meetings: Meeting[];
  assignments: Assignment[];
  sessions: AttendanceSession[];
  courses: CourseClass[];
  onOpenMeeting: (id: string) => void;
  onOpenAssignment: (id: string) => void;
  onOpenAttendanceCheckIn: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  meetings,
  assignments,
  sessions,
  courses,
  onOpenMeeting,
  onOpenAssignment,
  onOpenAttendanceCheckIn,
}) => {
  // Calendar focuses around current semester October 2026
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // 0-indexed: 9 = Oktober
  const [selectedDay, setSelectedDay] = useState(26); // Default 26 Okt 2026
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'meeting' | 'assignment' | 'attendance'>('all');

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Days in month
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  // First day offset (0 = Sunday, 1 = Monday ...)
  const startDayOffset = useMemo(() => {
    // 0 = Sunday, convert to Monday-first (0 = Monday, 6 = Sunday)
    const day = new Date(currentYear, currentMonth, 1).getDay();
    return (day + 6) % 7;
  }, [currentYear, currentMonth]);

  // Map events to day numbers
  const eventsByDay = useMemo(() => {
    const map: Record<number, { type: 'meeting' | 'assignment' | 'attendance'; item: any; title: string; courseCode: string }[]> = {};

    meetings.forEach((m) => {
      const d = new Date(m.date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const dayNum = d.getDate();
        if (!map[dayNum]) map[dayNum] = [];
        const course = courses.find((c) => c.id === m.courseId);
        map[dayNum].push({
          type: 'meeting',
          item: m,
          title: m.title,
          courseCode: course?.code || 'IF',
        });
      }
    });

    assignments.forEach((a) => {
      const d = new Date(a.deadline);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const dayNum = d.getDate();
        if (!map[dayNum]) map[dayNum] = [];
        const course = courses.find((c) => c.id === a.courseId);
        map[dayNum].push({
          type: 'assignment',
          item: a,
          title: `Tenggat: ${a.title}`,
          courseCode: course?.code || 'IF',
        });
      }
    });

    sessions.forEach((s) => {
      const d = new Date(s.date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const dayNum = d.getDate();
        if (!map[dayNum]) map[dayNum] = [];
        const course = courses.find((c) => c.id === s.courseId);
        map[dayNum].push({
          type: 'attendance',
          item: s,
          title: `Presensi: ${s.title}`,
          courseCode: course?.code || 'IF',
        });
      }
    });

    return map;
  }, [meetings, assignments, sessions, courses, currentYear, currentMonth]);

  // Filter events on the selected day
  const selectedDayEvents = (eventsByDay[selectedDay] || []).filter((e) => {
    if (eventTypeFilter === 'all') return true;
    return e.type === eventTypeFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Kalender Akademik
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Jadwal tatap muka kuliah, batas waktu pengumpulan tugas, dan sesi presensi resmi.
          </p>
        </div>

        {/* Filter event type */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold self-start sm:self-center">
          <button
            onClick={() => setEventTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              eventTypeFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setEventTypeFilter('meeting')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              eventTypeFilter === 'meeting'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Pertemuan
          </button>
          <button
            onClick={() => setEventTypeFilter('assignment')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              eventTypeFilter === 'assignment'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Tugas
          </button>
          <button
            onClick={() => setEventTypeFilter('attendance')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              eventTypeFilter === 'attendance'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Presensi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month Calendar Grid (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          {/* Month Header Controller */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear(currentYear - 1);
                  } else {
                    setCurrentMonth(currentMonth - 1);
                  }
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setCurrentMonth(9);
                  setCurrentYear(2026);
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Bulan Ini
              </button>
              <button
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear(currentYear + 1);
                  } else {
                    setCurrentMonth(currentMonth + 1);
                  }
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2">
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
            <span>Min</span>
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-xs">
            {/* Empty offset padding */}
            {Array.from({ length: startDayOffset }).map((_, i) => (
              <div key={`offset-${i}`} className="h-16 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 opacity-30" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayEvents = eventsByDay[dayNum] || [];
              const isSelected = selectedDay === dayNum;

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`h-16 sm:h-20 p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/30 bg-blue-50/40 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`font-semibold text-xs ${
                        isSelected
                          ? 'text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>

                  {/* Tiny indicators on desktop */}
                  <div className="hidden sm:flex flex-col gap-0.5 overflow-hidden w-full">
                    {dayEvents.slice(0, 2).map((ev, idx) => (
                      <span
                        key={idx}
                        className={`text-[9px] font-medium px-1 rounded truncate block ${
                          ev.type === 'meeting'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : ev.type === 'assignment'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        {ev.courseCode}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[8px] text-slate-400 font-semibold">
                        +{dayEvents.length - 2} lagi
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda Drawer (1 col) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <span className="text-xs text-slate-400 uppercase font-semibold">Agenda Terpilih</span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {selectedDay} {monthNames[currentMonth]} {currentYear}
            </h3>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        ev.type === 'meeting'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : ev.type === 'assignment'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {ev.type === 'meeting'
                        ? 'Pertemuan Kuliah'
                        : ev.type === 'assignment'
                        ? 'Batas Waktu Tugas'
                        : 'Sesi Presensi'}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                      {ev.courseCode}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {ev.title}
                  </h4>

                  {ev.type === 'meeting' && (
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p>Waktu: {ev.item.startTime} - {ev.item.endTime} WIB</p>
                      <p>Ruang: {ev.item.room}</p>
                      <button
                        onClick={() => onOpenMeeting(ev.item.id)}
                        className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-1"
                      >
                        Buka Pertemuan <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {ev.type === 'assignment' && (
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p>Batas Pengumpulan: {formatIndonesianDate(ev.item.deadline, true)}</p>
                      <button
                        onClick={() => onOpenAssignment(ev.item.id)}
                        className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 flex items-center justify-center gap-1"
                      >
                        Detail Tugas <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {ev.type === 'attendance' && (
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p>Waktu Buka: {ev.item.startTime} - {ev.item.endTime} WIB</p>
                      <button
                        onClick={onOpenAttendanceCheckIn}
                        className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-1"
                      >
                        Presensi QR <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">Tidak ada kegiatan terjadwal pada tanggal ini.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
