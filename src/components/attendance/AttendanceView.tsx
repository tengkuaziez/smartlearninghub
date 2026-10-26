import React, { useState } from 'react';
import { 
  QrCode, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Sparkles,
  Search,
  Filter
} from 'lucide-react';
import { Badge, AttendanceStatusBadge } from '../common/Badge.tsx';
import { calculateAttendanceStats, formatIndonesianDate } from '../../utils/academicCalculations.ts';
import type { 
  AttendanceRecord, 
  AttendanceSession, 
  CourseClass 
} from '../../types/index.ts';

interface AttendanceViewProps {
  courses: CourseClass[];
  records: AttendanceRecord[];
  sessions: AttendanceSession[];
  onOpenCheckIn: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  courses,
  records,
  sessions,
  onOpenCheckIn,
}) => {
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchCourse = selectedCourseFilter === 'all' || r.courseId === selectedCourseFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchCourse && matchStatus;
  });

  // Overall attendance calculation
  const totalConducted = records.length;
  const overallStats = calculateAttendanceStats(records, totalConducted);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Presensi & Kehadiran Perkuliahan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pantau rekapitulasi kehadiran resmi Anda dan lakukan presensi melalui pemindai QR digital.
          </p>
        </div>

        <div>
          <button
            onClick={onOpenCheckIn}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>Pindai QR Presensi</span>
          </button>
        </div>
      </div>

      {/* Active Session Notification Banner if open */}
      {sessions.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Sesi Presensi Aktif di Ruang Kuliah
              </span>
              <h3 className="text-base font-bold">
                {sessions[0].title}
              </h3>
              <p className="text-xs text-emerald-100">
                Waktu dibuka: {sessions[0].startTime} - {sessions[0].endTime} WIB • Token: <strong className="font-mono bg-black/20 px-1 rounded">{sessions[0].sessionToken}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onOpenCheckIn}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white text-emerald-800 hover:bg-emerald-50 shadow-sm shrink-0 transition-colors"
          >
            Presensi Sekarang &rarr;
          </button>
        </div>
      )}

      {/* Overall Attendance Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center flex flex-col justify-center">
          <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">Tingkat Kehadiran Total</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 my-0.5 sm:mt-1">
            {overallStats.percentage}%
          </p>
          <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {overallStats.statusLabel}
          </span>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center flex flex-col justify-center">
          <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">Hadir Tepat Waktu</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 my-0.5 sm:mt-1">
            {overallStats.hadir}
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-400">pertemuan</span>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center flex flex-col justify-center">
          <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">Izin / Sakit</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 my-0.5 sm:mt-1">
            {overallStats.izin + overallStats.sakit}
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-400">pertemuan</span>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center flex flex-col justify-center">
          <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">Alpa</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 my-0.5 sm:mt-1">
            {overallStats.alpa}
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-400">pertemuan</span>
        </div>
      </div>

      {/* Class by Class Attendance Summaries */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Ringkasan Kehadiran Tiap Mata Kuliah
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const courseRecs = records.filter((r) => r.courseId === course.id);
            const stats = calculateAttendanceStats(courseRecs, course.completedMeetings);
            return (
              <div
                key={course.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {course.code}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.percentage}%
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                  {course.title}
                </h4>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Hadir: {stats.hadir}</span>
                  <span>Izin: {stats.izin}</span>
                  <span>Sakit: {stats.sakit}</span>
                  <span>Alpa: {stats.alpa}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete Historical Attendance Records */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Riwayat Presensi Masuk
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Mata Kuliah</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="hadir">Hadir</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="alpa">Alpa</option>
            </select>
          </div>
        </div>

        {/* Desktop Table & Mobile Cards */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-400 uppercase font-semibold">
                <th className="py-3 px-4">Pertemuan</th>
                <th className="py-3 px-4">Mata Kuliah</th>
                <th className="py-3 px-4">Tanggal Kuliah</th>
                <th className="py-3 px-4">Waktu Presensi</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Metode Validasi</th>
                <th className="py-3 px-4">Status Lokasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.map((r) => {
                const course = courses.find((c) => c.id === r.courseId);
                return (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold font-mono text-slate-900 dark:text-white">
                      #{r.meetingNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {course?.code || 'IF'}
                      </span>
                      <span className="text-[11px] text-slate-500 line-clamp-1">
                        {course?.title || r.meetingTitle}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatIndonesianDate(r.date)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {r.timestamp}
                    </td>
                    <td className="py-3.5 px-4">
                      <AttendanceStatusBadge status={r.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {r.method === 'qr_scan' ? 'Pemindaian QR Kamera' : 'Kode Sesi Dosen'}
                    </td>
                    <td className="py-3.5 px-4">
                      {r.locationVerified ? (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Kampus Terverifikasi
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Standar
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1">
        <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
          <Info className="w-4 h-4 text-blue-500" />
          <span>Aturan Presensi Mahasiswa</span>
        </div>
        <p className="leading-relaxed">
          Batas minimal kehadiran untuk berhak mengikuti Ujian Akhir Semester (UAS) adalah 75%. Mahasiswa tidak diizinkan mengubah catatan presensi resmi dosen atau membuat sesi presensi secara mandiri.
        </p>
      </div>
    </div>
  );
};
