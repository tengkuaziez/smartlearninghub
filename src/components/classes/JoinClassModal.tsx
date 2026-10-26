import React, { useState } from 'react';
import { KeyRound, X, CheckCircle2, AlertCircle, Sparkles, BookPlus } from 'lucide-react';
import { studentService } from '../../services/studentService.ts';
import type { CourseClass } from '../../types/index.ts';

interface JoinClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClassJoined: (newClass: CourseClass) => void;
}

export const JoinClassModal: React.FC<JoinClassModalProps> = ({
  isOpen,
  onClose,
  onClassJoined,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const result = studentService.joinClassWithCode(code);
      setIsSubmitting(false);

      if (result.success && result.course) {
        setSuccess(result.message);
        setTimeout(() => {
          onClassJoined(result.course!);
          onClose();
          setCode('');
          setSuccess(null);
        }, 1200);
      } else {
        setError(result.message);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-class-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <BookPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 id="join-class-title" className="text-base font-bold text-slate-900 dark:text-white">
                Gabung Kelas Kuliah
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Masukkan kode undangan resmi dari dosen pengampu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label
              htmlFor="class-invite-code"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Kode Undangan Kelas
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="class-invite-code"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="Contoh: MOB-2026 atau CYBER-2026"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Validation Feedback */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Validasi Gagal</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Pendaftaran Berhasil</p>
                <p>{success}</p>
              </div>
            </div>
          )}

          {/* Demo Hint & Prototype Disclaimer */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kode Demo Tersedia untuk Pengujian:</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCode('MOB-2026')}
                className="px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-mono text-[11px]"
              >
                MOB-2026 (Mobile Dev)
              </button>
              <button
                type="button"
                onClick={() => setCode('CYBER-2026')}
                className="px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-mono text-[11px]"
              >
                CYBER-2026 (Cyber Security)
              </button>
              <button
                type="button"
                onClick={() => setCode('PWL-2026')}
                className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px]"
                title="Coba kode yang sudah terdaftar"
              >
                PWL-2026 (Sudah Terdaftar)
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 italic">
              * Mode simulasi prototipe. Pendaftaran akan divalidasi ke Supabase Database pada tahap integrasi backend.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Memverifikasi...' : 'Gabung Kelas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
