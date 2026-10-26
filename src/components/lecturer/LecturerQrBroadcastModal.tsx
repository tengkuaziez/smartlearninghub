import React, { useState } from 'react';
import { 
  QrCode, 
  X, 
  Users, 
  MapPin, 
  CheckCircle2, 
  Copy, 
  Check, 
  UserX, 
  UserCheck, 
  Clock, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { studentService, type MeetingAttendanceRosterSummary } from '../../services/studentService.ts';
import type { AttendanceSession, AttendanceRecord, CourseClass } from '../../types/index.ts';

interface LecturerQrBroadcastModalProps {
  session: AttendanceSession;
  course: CourseClass;
  records: AttendanceRecord[];
  isOpen: boolean;
  onClose: () => void;
  onToggleSession: (isOpen: boolean) => void;
  onDataUpdated?: () => void;
}

export const LecturerQrBroadcastModal: React.FC<LecturerQrBroadcastModalProps> = ({
  session,
  course,
  records,
  isOpen,
  onClose,
  onToggleSession,
  onDataUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeListTab, setActiveListTab] = useState<'hadir' | 'belum'>('hadir');

  if (!isOpen) return null;

  // Real-time calculation of attendee roster for this specific meeting
  const rosterSummary: MeetingAttendanceRosterSummary = studentService.getMeetingAttendanceRoster(
    course.id,
    session.meetingId
  );

  const presentList = rosterSummary.items.filter((i) => i.status === 'hadir');
  const absentList = rosterSummary.items.filter((i) => i.status === 'belum_hadir' || i.status === 'alpa');

  const handleCopyToken = () => {
    navigator.clipboard.writeText(session.sessionToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkPresentDirect = (studentEmail: string) => {
    studentService.markAttendanceManual(course.id, session.meetingId, studentEmail, 'hadir');
    if (onDataUpdated) onDataUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 text-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-broadcast-title"
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                  MODE PROYEKTOR KELAS • PERTEMUAN {session.meetingNumber || 8}
                </span>
                {session.isOpen ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE AKTIF
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded-full">
                    SESI DITUTUP
                  </span>
                )}
              </div>
              <h2 id="qr-broadcast-title" className="text-base sm:text-lg font-bold mt-1 text-slate-100">
                {course.code} — {session.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSession(!session.isOpen)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                session.isOpen
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {session.isOpen ? 'Tutup Sesi Presensi' : 'Buka Kembali Sesi'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-5 sm:p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left Column: Big QR Code display for projector */}
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative p-6 bg-white rounded-3xl shadow-2xl flex items-center justify-center">
              {/* High-Contrast Crisp QR Simulation */}
              <div className="w-64 h-64 border-4 border-slate-900 rounded-2xl p-3 flex flex-col justify-between bg-white relative">
                {/* 3 Corner Markers */}
                <div className="w-14 h-14 border-4 border-slate-950 rounded-lg p-1.5 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-xs" />
                </div>
                <div className="absolute top-3 right-3 w-14 h-14 border-4 border-slate-950 rounded-lg p-1.5 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-xs" />
                </div>
                <div className="w-14 h-14 border-4 border-slate-950 rounded-lg p-1.5 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-xs" />
                </div>

                {/* Central dynamic token badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center font-black text-xs shadow-lg">
                    <span>SLH</span>
                    <span className="text-[9px] font-normal opacity-80">QR</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-900 font-black mt-2 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    {session.sessionToken}
                  </span>
                </div>
              </div>

              {!session.isOpen && (
                <div className="absolute inset-0 bg-slate-950/85 rounded-3xl backdrop-blur-xs flex flex-col items-center justify-center text-rose-400 font-bold text-sm p-4">
                  <AlertCircle className="w-8 h-8 mb-2" />
                  <span>Sesi Presensi Telah Ditutup</span>
                  <span className="text-xs text-slate-400 mt-1">Mahasiswa tidak dapat lagi memindai kode ini</span>
                </div>
              )}
            </div>

            <div className="space-y-2 w-full max-w-xs">
              <p className="text-xs text-slate-400">
                Arahkan mahasiswa scan QR di atas melalui menu <strong>Absensi</strong> di portal mahasiswa.
              </p>
              <div className="inline-flex items-center justify-between w-full px-3 py-1.5 bg-slate-800 rounded-xl text-xs font-mono text-slate-300 border border-slate-700">
                <span className="text-slate-400">Kode Token:</span>
                <span className="font-bold text-emerald-400 tracking-wider">{session.sessionToken}</span>
                <button
                  onClick={handleCopyToken}
                  className="hover:text-blue-400 p-1 text-slate-400 rounded hover:bg-slate-700"
                  title="Salin token"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Real-time Attendee List & Who is Missing */}
          <div className="space-y-4">
            {/* Live Progress Bar */}
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-400 block">Tingkat Kehadiran Kelas:</span>
                  <span className="text-xs text-emerald-400 font-medium">
                    Pertemuan {session.meetingNumber || 8}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400">
                    {rosterSummary.presentCount} / {rosterSummary.totalEnrolled}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">({rosterSummary.attendanceRate}%)</span>
                </div>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                  style={{ width: `${rosterSummary.attendanceRate}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>Geofence Lab Aktif (150m)</span>
                </span>
                <span className="text-slate-400">
                  {rosterSummary.absentCount} Mahasiswa Belum Scan
                </span>
              </div>
            </div>

            {/* Tabs for attendee list vs absent list */}
            <div className="flex rounded-xl bg-slate-800 p-1 text-xs">
              <button
                onClick={() => setActiveListTab('hadir')}
                className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  activeListTab === 'hadir'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sudah Hadir ({rosterSummary.presentCount})</span>
              </button>
              <button
                onClick={() => setActiveListTab('belum')}
                className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  activeListTab === 'belum'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Belum Hadir ({rosterSummary.absentCount})</span>
              </button>
            </div>

            {/* List content */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {activeListTab === 'hadir' ? (
                presentList.length > 0 ? (
                  presentList.map((item) => (
                    <div
                      key={item.studentEmail}
                      className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-200">{item.studentName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            NIM: {item.studentNim} • {item.studentEmail}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-emerald-400 text-[11px] font-semibold block">
                          {item.timestamp || '08:00 WIB'}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {item.method === 'qr_scan' ? 'Scan QR' : item.method === 'manual_code' ? 'Token' : 'Manual Dosen'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-700 text-center text-xs text-slate-400 space-y-1">
                    <p className="font-semibold">Belum ada mahasiswa yang memindai</p>
                    <p className="text-[11px] text-slate-500">Tampilkan QR di proyektor kelas dan minta mahasiswa scan.</p>
                  </div>
                )
              ) : (
                absentList.length > 0 ? (
                  absentList.map((item) => (
                    <div
                      key={item.studentEmail}
                      className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs hover:border-slate-600 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{item.studentName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          NIM: {item.studentNim} • {item.studentEmail}
                        </p>
                      </div>
                      <button
                        onClick={() => handleMarkPresentDirect(item.studentEmail)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600/80 hover:bg-emerald-600 text-white flex items-center gap-1 transition-colors"
                        title="Tandai hadir jika mahasiswa hadir tapi terkendala HP"
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>Tandai Hadir</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-emerald-900/50 bg-emerald-950/20 text-center text-xs text-emerald-300">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
                    <p className="font-bold">Luar biasa! Seluruh mahasiswa kelas telah hadir.</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Sesi: {session.startTime} - {session.endTime} WIB</span>
          </div>
          <span className="font-mono text-slate-500">Real-time sync aktif • Data tersimpan di roster kelas</span>
        </div>
      </div>
    </div>
  );
};
