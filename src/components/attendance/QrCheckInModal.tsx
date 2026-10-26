import React, { useState, useEffect, useRef } from 'react';
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
  RefreshCw,
  SwitchCamera,
  Image as ImageIcon
} from 'lucide-react';
import { studentService } from '../../services/studentService.ts';
import type { AttendanceSession, AttendanceRecord } from '../../types/index.ts';

interface QrCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessions: AttendanceSession[];
  onAttendanceSuccess: (record: AttendanceRecord) => void;
  targetSessionToken?: string;
  targetMeetingTitle?: string;
}

export const QrCheckInModal: React.FC<QrCheckInModalProps> = ({
  isOpen,
  onClose,
  activeSessions,
  onAttendanceSuccess,
  targetSessionToken,
  targetMeetingTitle,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualCode, setManualCode] = useState(targetSessionToken || '');
  const [gpsSimulated, setGpsSimulated] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  // Stop camera tracks cleanly
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
  };

  // Start real camera stream
  const startCameraStream = async (mode: 'environment' | 'user' = facingMode) => {
    try {
      stopCameraStream();
      setError(null);
      setCameraLoading(true);

      // Check mediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Perangkat atau browser ini tidak mendukung akses kamera langsung. Silakan masukkan kode presensi manual di bawah.');
      }

      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        // Fallback constraint if environment/back-camera is rejected
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = mediaStream;
      setCameraActive(true);
      setFacingMode(mode);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play().catch((err) => console.warn('Video play warning:', err));
      }
      setCameraLoading(false);
    } catch (err: any) {
      console.error('Gagal mengakses kamera:', err);
      setCameraLoading(false);
      setCameraActive(false);
      setError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Izin kamera ditolak. Buka pengaturan browser di HP Anda lalu izinkan akses kamera untuk situs ini, atau gunakan opsi input kode manual di bawah.'
          : `Kamera tidak dapat dibuka: ${err.message || 'Kamera sedang digunakan aplikasi lain'}. Gunakan kode presensi manual.`
      );
    }
  };

  // Switch between back and front camera
  const handleToggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCameraStream(nextMode);
  };

  // QR detection loop with native BarcodeDetector if available
  useEffect(() => {
    let timer: any = null;
    if (cameraActive && 'BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        timer = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2 && !isScanning && !success) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const raw = barcodes[0].rawValue;
                if (raw) {
                  handleProcessCheckIn(raw.trim());
                }
              }
            } catch (err) {
              // frame detection error, ignore and continue
            }
          }
        }, 500);
      } catch (e) {
        console.warn('BarcodeDetector error:', e);
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cameraActive, isScanning, success]);

  // Clean up when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
      setManualCode(targetSessionToken || (activeSessions[0]?.sessionToken || ''));
      // Auto-start camera on open
      startCameraStream('environment');
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Process check in token
  const handleProcessCheckIn = (tokenInput: string) => {
    if (!tokenInput || isScanning) return;

    setIsScanning(true);
    setError(null);

    setTimeout(() => {
      setIsScanning(false);

      if (!gpsSimulated) {
        setError('Gagal validasi lokasi: Koordinat GPS berada di luar radius lab kampus (maks. 150m). Silakan pastikan GPS aktif di lokasi kelas.');
        return;
      }

      const res = studentService.recordAttendanceWithToken(tokenInput.trim());
      if (res.success && res.record) {
        setSuccess(res.message);
        stopCameraStream();
        setTimeout(() => {
          onAttendanceSuccess(res.record!);
          onClose();
        }, 1500);
      } else {
        setError(res.message);
      }
    }, 700);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setError('Kode sesi presensi wajib diisi.');
      return;
    }
    handleProcessCheckIn(manualCode.trim());
  };

  const currentSession = activeSessions.find(
    (s) => s.sessionToken.toUpperCase() === manualCode.toUpperCase()
  ) || activeSessions[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-qr-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 id="attendance-qr-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Presensi QR Mahasiswa
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Arahkan kamera ke layar proyektor dosen
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Tutup pemindai"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Target Meeting Info Banner */}
          {targetMeetingTitle || currentSession ? (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  {targetMeetingTitle || currentSession?.title}
                </span>
                {currentSession && (
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 shrink-0">
                    {currentSession.sessionToken}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
              Tidak ada sesi kelas yang sedang membuka presensi saat ini.
            </div>
          )}

          {/* REAL CAMERA SCANNER VIEWPORT */}
          <div className="relative aspect-square max-w-[280px] sm:max-w-[300px] mx-auto rounded-3xl bg-black overflow-hidden border-2 border-slate-800 shadow-inner flex flex-col items-center justify-center">
            {/* Live Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                cameraActive && !cameraLoading ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Overlays on top of video */}
            {cameraActive && !cameraLoading && (
              <>
                {/* Target Scanning Box */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                  <div className="relative w-44 h-44 sm:w-48 sm:h-48 border-2 border-emerald-400 rounded-3xl overflow-hidden shadow-2xl">
                    {/* Laser scanning line */}
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse top-1/2 -translate-y-1/2 shadow-xs shadow-emerald-400" />
                    
                    {/* Corner marks */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-300" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-300" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-300" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-300" />
                  </div>
                </div>

                {/* Flip camera button */}
                <button
                  type="button"
                  onClick={handleToggleCameraFacing}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs transition-colors"
                  title="Ganti Kamera Depan / Belakang"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>

                <div className="absolute bottom-3 inset-x-3 text-center pointer-events-none">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-black/70 text-emerald-300 font-semibold backdrop-blur-xs">
                    {isScanning ? 'Menganalisis kode QR...' : 'Posisikan QR di dalam bingkai'}
                  </span>
                </div>
              </>
            )}

            {/* Camera Inactive / Loading Placeholder */}
            {(!cameraActive || cameraLoading) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-3 bg-slate-950">
                {cameraLoading ? (
                  <>
                    <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                    <p className="text-xs text-slate-300 font-medium">
                      Mengaktifkan kamera perangkat...
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-slate-400 flex items-center justify-center">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Kamera Belum Aktif
                      </h4>
                      <p className="text-xs text-slate-400 max-w-[200px] mt-1">
                        Klik tombol di bawah untuk menyalakan kamera smartphone Anda.
                      </p>
                    </div>
                    <button
                      onClick={() => startCameraStream(facingMode)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Aktifkan Kamera HP</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick Simulated Scan Trigger for Classroom Demo */}
          {cameraActive && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleProcessCheckIn(manualCode || currentSession?.sessionToken || '')}
                disabled={isScanning || !manualCode}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
              >
                {isScanning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>Verifikasi Presensi Sesi Ini</span>
              </button>
              <button
                type="button"
                onClick={stopCameraStream}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                Matikan Kamera
              </button>
            </div>
          )}

          {/* Feedback states */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Presensi Gagal</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Presensi Berhasil Diverifikasi!</p>
                <p className="mt-0.5">{success}</p>
              </div>
            </div>
          )}

          {/* Fallback Manual Token Entry */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-500" />
              <span>Atau Masukkan Kode Token Sesi Manual:</span>
            </span>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Contoh: PWL-M01-482"
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono uppercase text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isScanning || !manualCode.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0 disabled:opacity-50 transition-colors"
              >
                Kirim
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400">
          Sistem Presensi QR Berbasis Pertemuan • Smart Learning Hub
        </div>
      </div>
    </div>
  );
};
