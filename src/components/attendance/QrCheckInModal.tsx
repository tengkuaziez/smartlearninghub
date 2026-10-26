import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  X, 
  Camera, 
  CameraOff, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  KeyRound, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { studentService } from '../../services/studentService.ts';
import type { AttendanceSession, AttendanceRecord } from '../../types/index.ts';

interface QrCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessions: AttendanceSession[];
  onAttendanceSuccess: (record: AttendanceRecord) => void;
}

export const QrCheckInModal: React.FC<QrCheckInModalProps> = ({
  isOpen,
  onClose,
  activeSessions,
  onAttendanceSuccess,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [gpsSimulated, setGpsSimulated] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
      setManualCode('');
      setCameraActive(false);
      setIsScanning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartCamera = () => {
    setCameraActive(true);
    setError(null);
  };

  const handleStopCamera = () => {
    setCameraActive(false);
    setIsScanning(false);
  };

  const handleSimulateScan = (tokenToScan?: string) => {
    const token = tokenToScan || (activeSessions.length > 0 ? activeSessions[0].sessionToken : '');
    if (!token) {
      setError('Tidak ada sesi presensi yang sedang dibuka oleh dosen pengampu saat ini.');
      return;
    }
    setIsScanning(true);
    setError(null);

    setTimeout(() => {
      setIsScanning(false);
      if (!gpsSimulated) {
        setError('Gagal validasi lokasi: Koordinat GPS berada di luar radius lab kampus (maks. 150m). Silakan pastikan GPS aktif di lokasi kelas.');
        return;
      }

      const res = studentService.recordAttendanceWithToken(token);
      if (res.success && res.record) {
        setSuccess(res.message);
        setTimeout(() => {
          onAttendanceSuccess(res.record!);
          onClose();
        }, 1500);
      } else {
        setError(res.message);
      }
    }, 1000);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setError('Kode sesi presensi wajib diisi');
      return;
    }
    handleSimulateScan(manualCode.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-qr-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 id="attendance-qr-title" className="text-base font-bold text-slate-900 dark:text-white">
                Presensi QR Mahasiswa
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pindai kode QR dinamis di layar dosen atau masukkan kode sesi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Tutup pemindai"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Active Sessions Indicator */}
          {activeSessions.length > 0 ? (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Sesi Dibuka: {activeSessions[0].title}
              </span>
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-300">
                Token: {activeSessions[0].sessionToken}
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
              Tidak ada sesi kelas yang sedang membuka presensi saat ini.
            </div>
          )}

          {/* Camera Scanning Viewport Simulation */}
          <div className="relative aspect-square max-w-[320px] mx-auto rounded-2xl bg-slate-950 overflow-hidden border-2 border-slate-700 flex flex-col items-center justify-center text-center p-4">
            {cameraActive ? (
              <>
                {/* Live viewfinder overlays */}
                <div className="relative w-48 h-48 border-2 border-emerald-400/80 rounded-2xl flex items-center justify-center overflow-hidden">
                  {/* Scan line laser animation */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse top-1/2 -translate-y-1/2 shadow-xs shadow-emerald-400" />
                  
                  {/* Corner Target Marks */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

                  <QrCode className="w-20 h-20 text-white/30" />
                </div>

                <div className="absolute bottom-3 inset-x-3 text-center">
                  <p className="text-[11px] text-emerald-300 font-medium">
                    {isScanning ? 'Menganalisis kode QR...' : 'Arahkan kamera ke QR dosen'}
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Kamera Dinonaktifkan
                  </h4>
                  <p className="text-xs text-slate-400 max-w-[200px] mt-1">
                    Aktifkan kamera untuk memindai kode QR kelas secara langsung.
                  </p>
                </div>
                <button
                  onClick={handleStartCamera}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-xs"
                >
                  Aktifkan Kamera
                </button>
              </div>
            )}
          </div>

          {/* Camera Controls & Trigger Simulated Scan */}
          {cameraActive && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleSimulateScan()}
                disabled={isScanning}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-1.5"
              >
                {isScanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Simulasikan Pindai QR</span>
              </button>
              <button
                onClick={handleStopCamera}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                Matikan Kamera
              </button>
            </div>
          )}

          {/* Feedback states */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Presensi Gagal</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Presensi Berhasil Diverifikasi!</p>
                <p>{success}</p>
              </div>
            </div>
          )}

          {/* Geolocation verification status */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Verifikasi Radius Kampus
                </span>
                <span className="text-[11px] text-slate-400">
                  {gpsSimulated ? 'Terdeteksi di Lab Komputasi A-302 (Akurasi ~8m)' : 'Lokasi di luar jangkauan kampus'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGpsSimulated(!gpsSimulated)}
              className="text-[11px] text-blue-600 dark:text-blue-400 underline font-medium"
            >
              Ubah ({gpsSimulated ? 'Dalam Radius' : 'Di Luar Radius'})
            </button>
          </div>

          {/* Fallback: Manual Session Code Entry */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Atau Masukkan Token Sesi Manual (Alternatif Jika Kamera Terkendala):
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: PWL-LAB-M08"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono uppercase text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0"
              >
                Kirim Presensi
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-400">
          * Hak cipta presensi resmi universitas. Validasi keamanan ganda (Timestamp token + Radius Geofence) diimplementasikan pada backend Supabase.
        </div>
      </div>
    </div>
  );
};
