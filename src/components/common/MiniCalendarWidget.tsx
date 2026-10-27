import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import type { CourseClass, Meeting } from '../../types/index.ts';

interface MiniCalendarWidgetProps {
  courses?: CourseClass[];
  meetings?: Meeting[];
  onOpenCourse?: (courseId: string) => void;
  className?: string;
}

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MiniCalendarWidget: React.FC<MiniCalendarWidgetProps> = ({
  courses = [],
  meetings = [],
  onOpenCourse,
  className = '',
}) => {
  // Realtime ticking clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calendar view month & year (focuses around October 2026 / current semester)
  const [viewYear, setViewYear] = useState(() => currentTime.getFullYear() || 2026);
  const [viewMonth, setViewMonth] = useState(() => currentTime.getMonth() || 9); // 0-indexed: 9 = Oktober
  const [selectedDay, setSelectedDay] = useState<number>(() => currentTime.getDate() || 27);

  // Formatted date string
  const dayName = INDO_DAYS[currentTime.getDay()];
  const dateNum = currentTime.getDate();
  const monthName = INDO_MONTHS[currentTime.getMonth()];
  const yearNum = currentTime.getFullYear();
  const timeFormatted = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Calculate days in month
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  // Start offset for Monday-first: 0 = Senin, 6 = Minggu
  const startOffset = useMemo(() => {
    const sundayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Minggu
    return (sundayIndex + 6) % 7;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDay(now.getDate());
  };

  // Find classes / meetings for selected date
  const selectedDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const selectedDayOfWeekIndex = new Date(viewYear, viewMonth, selectedDay).getDay();
  const selectedDayName = INDO_DAYS[selectedDayOfWeekIndex];

  // Matching meetings
  const matchedMeetings = meetings.filter((m) => m.date === selectedDateStr);

  // Matching weekly courses by day
  const matchedCourses = courses.filter((c) => {
    const dayNorm = (c.scheduleDay || '').toLowerCase();
    const selNorm = selectedDayName.toLowerCase();
    return dayNorm === selNorm;
  });

  // Set of days in current view that have scheduled events
  const daysWithEvents = useMemo(() => {
    const set = new Set<number>();
    meetings.forEach((m) => {
      if (m.date) {
        const [y, mth, d] = m.date.split('-').map(Number);
        if (y === viewYear && mth === viewMonth + 1) {
          set.add(d);
        }
      }
    });

    // Also mark recurring class days in viewMonth
    for (let d = 1; d <= daysInMonth; d++) {
      const dOfWeek = new Date(viewYear, viewMonth, d).getDay();
      const dName = INDO_DAYS[dOfWeek].toLowerCase();
      if (courses.some((c) => (c.scheduleDay || '').toLowerCase() === dName)) {
        set.add(d);
      }
    }
    return set;
  }, [viewYear, viewMonth, daysInMonth, meetings, courses]);

  const isToday = (day: number) => {
    const now = new Date();
    return (
      day === now.getDate() &&
      viewMonth === now.getMonth() &&
      viewYear === now.getFullYear()
    );
  };

  return (
    <div className={`rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between ${className}`}>
      {/* 1. Header: Live Clock & Today's Date */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 text-white relative overflow-hidden">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
              <CalendarIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Kalender Akademik</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold tracking-tight mt-0.5">
              {dayName}, {dateNum} {monthName} {yearNum}
            </h3>
          </div>

          {/* Live Clock Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-cyan-300 font-mono text-xs sm:text-sm font-bold shadow-inner shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{timeFormatted} WIB</span>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute -right-6 -bottom-8 w-28 h-28 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
      </div>

      {/* 2. Interactive Calendar Month Navigation */}
      <div className="p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
            {INDO_MONTHS[viewMonth]} {viewYear}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleJumpToToday}
              className="px-2 py-1 text-[11px] font-semibold rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
              title="Kembali ke Hari Ini"
            >
              Hari Ini
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
          <span>Sen</span>
          <span>Sel</span>
          <span>Rab</span>
          <span>Kam</span>
          <span>Jum</span>
          <span>Sab</span>
          <span>Min</span>
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {/* Leading empty spaces */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const today = isToday(day);
            const selected = day === selectedDay;
            const hasEvent = daysWithEvents.has(day);

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`relative h-8 w-full rounded-xl flex items-center justify-center font-medium transition-all ${
                  selected
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : today
                    ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold ring-1 ring-blue-500'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <span>{day}</span>
                {/* Event dot indicator */}
                {hasEvent && !selected && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-cyan-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* 3. Selected Day Schedule Preview */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>Agenda {selectedDayName}, {selectedDay} {INDO_MONTHS[viewMonth]}:</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {matchedCourses.length + matchedMeetings.length} Jadwal
            </span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
            {matchedCourses.map((crs) => (
              <div
                key={crs.id}
                onClick={() => onOpenCourse && onOpenCourse(crs.id)}
                className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 ${
                  onOpenCourse ? 'hover:border-blue-500 cursor-pointer transition-colors' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {crs.code}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                      {crs.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {crs.scheduleTime}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {crs.room}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {matchedMeetings.length > 0 && matchedCourses.length === 0 && (
              <div className="space-y-1">
                {matchedMeetings.map((m) => (
                  <div
                    key={m.id}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-[11px]"
                  >
                    <p className="font-bold text-slate-800 dark:text-slate-200">{m.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{m.topic}</p>
                  </div>
                ))}
              </div>
            )}

            {matchedCourses.length === 0 && matchedMeetings.length === 0 && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 italic py-1 text-center">
                Tidak ada jadwal perkuliahan pada tanggal ini.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
