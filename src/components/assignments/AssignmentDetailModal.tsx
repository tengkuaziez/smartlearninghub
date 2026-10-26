import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Calendar, 
  Clock, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  File, 
  Trash2, 
  Sparkles, 
  Award,
  Layers,
  Info,
  ExternalLink,
  CloudUpload
} from 'lucide-react';
import { Badge, SubmissionStatusBadge } from '../common/Badge.tsx';
import { getAssignmentSubmissionStatus, formatIndonesianDate } from '../../utils/academicCalculations.ts';
import { studentService } from '../../services/studentService.ts';
import { googleDriveService } from '../../services/googleDriveService.ts';
import type { 
  Assignment, 
  AssignmentSubmission, 
  CourseClass 
} from '../../types/index.ts';

interface AssignmentDetailModalProps {
  assignment: Assignment;
  submission?: AssignmentSubmission;
  course?: CourseClass;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: (newSub: AssignmentSubmission) => void;
}

export const AssignmentDetailModal: React.FC<AssignmentDetailModalProps> = ({
  assignment,
  submission,
  course,
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mockFileName, setMockFileName] = useState('');
  const [mockFileSize, setMockFileSize] = useState(0);
  const [textNotes, setTextNotes] = useState(submission?.textResponse || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  if (!isOpen) return null;

  const currentStatus = getAssignmentSubmissionStatus(assignment, submission);
  const isPastDeadline = new Date(assignment.deadline).getTime() < Date.now();
  const canSubmit = !submission || isReplacing || assignment.allowResubmission;

  const handleSimulateFileSelect = (fileName: string, sizeBytes: number) => {
    setMockFileName(fileName);
    setMockFileSize(sizeBytes);
    setError(null);
  };

  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      setMockFileName(f.name);
      setMockFileSize(f.size);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockFileName && !selectedFile) {
      setError('Harap pilih berkas tugas sebelum mengirimkan jawaban.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setUploadFeedback('Mengunggah berkas ke Google Drive dosen...');

    try {
      let driveUrl = 'https://drive.google.com/file/d/sample/view';
      let driveFileId: string | undefined = undefined;

      if (selectedFile) {
        const uploadRes = await googleDriveService.uploadFile(selectedFile, {
          courseCode: course?.code || 'IF',
          category: 'Tugas',
          uploaderEmail: studentService.getCurrentUser().email,
        });
        driveUrl = uploadRes.fileUrl;
        driveFileId = uploadRes.fileId;
        setUploadFeedback(uploadRes.message || 'Tersimpan ke Google Drive!');
      } else {
        // Simulasi cepat jika memilih berkas contoh
        await new Promise((res) => setTimeout(res, 600));
        driveUrl = `https://drive.google.com/file/d/drive_${Date.now()}/view?usp=sharing`;
      }

      const result = studentService.submitAssignment({
        assignmentId: assignment.id,
        fileName: mockFileName || selectedFile?.name || 'Tugas_Mahasiswa.pdf',
        fileSizeBytes: mockFileSize || selectedFile?.size || 1024 * 1024 * 2.5,
        fileUrl: driveUrl,
        driveFileId,
        textResponse: textNotes,
      });

      setIsSubmitting(false);
      setIsReplacing(false);
      onSubmitted(result);
    } catch (err: any) {
      setError('Gagal mengirimkan tugas: ' + err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-title"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {course?.code || 'IF'}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {course?.title}
              </span>
              <SubmissionStatusBadge status={currentStatus} />
            </div>
            <h2 id="assignment-title" className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {assignment.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Deadline and Policy Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Batas Waktu Pengumpulan:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-sm">
                <Clock className="w-4 h-4 text-amber-500" />
                {formatIndonesianDate(assignment.deadline, true)}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Kebijakan Keterlambatan:</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {assignment.latePenaltyPolicy}
              </p>
            </div>
          </div>

          {/* Graded Feedback Banner if already graded */}
          {submission?.grade !== undefined && (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Nilai & Umpan Balik Dosen Telah Dipublikasikan
                </span>
                <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                  {submission.grade}/{submission.maxGrade || 100}
                </span>
              </div>
              {submission.feedback && (
                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-200">
                  <span className="font-semibold block mb-1">Catatan Evaluasi:</span>
                  <p className="leading-relaxed">{submission.feedback}</p>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Petunjuk Pengerjaan
            </h3>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {assignment.instructions}
            </div>
          </div>

          {/* Teacher Attachments */}
          {assignment.attachments && assignment.attachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Lampiran Berkas dari Dosen
              </h3>
              <div className="space-y-2">
                {assignment.attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {att.name}
                      </span>
                      <span className="text-slate-400 font-mono">({att.size})</span>
                    </div>
                    <a
                      href={att.url}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grading Rubric Preview */}
          {assignment.rubric && assignment.rubric.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Rubrik Kriteria Penilaian
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                {assignment.rubric.map((crit) => (
                  <div key={crit.id} className="p-3 flex items-start justify-between gap-3 bg-white dark:bg-slate-900">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{crit.title}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{crit.description}</p>
                    </div>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      Maks {crit.maxScore} poin
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submission Section */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Status & Berkas Pengumpulan Jawaban</span>
              {submission && !isReplacing && assignment.allowResubmission && (
                <button
                  type="button"
                  onClick={() => setIsReplacing(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  Perbarui Pengumpulan
                </button>
              )}
            </h3>

            {submission && !isReplacing ? (
              /* Already submitted card */
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Tugas Telah Dikumpulkan {submission.isLate && '(Terlambat)'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {formatIndonesianDate(submission.submittedAt, true)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <File className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {submission.fileName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {((submission.fileSizeBytes || 2500000) / (1024 * 1024)).toFixed(1)} MB • Google Drive
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {submission.fileUrl && (
                      <a
                        href={submission.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka di Google Drive</span>
                      </a>
                    )}
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Tersimpan
                    </span>
                  </div>
                </div>

                {submission.textResponse && (
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold block mb-0.5">Catatan Mahasiswa:</span>
                    <p className="italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      "{submission.textResponse}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Submission Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Requirements info */}
                <div className="text-xs text-slate-500 flex flex-wrap gap-3">
                  <span>Format diizinkan: <strong>{assignment.allowedFormats.join(', ')}</strong></span>
                  <span>•</span>
                  <span>Ukuran maks: <strong>{assignment.maxFileSizeMb} MB</strong></span>
                </div>

                {/* File picker area */}
                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-center space-y-3">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <label
                      htmlFor="assignment-file"
                      className="cursor-pointer text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Pilih berkas dari komputer Anda
                    </label>
                    <input
                      id="assignment-file"
                      type="file"
                      onChange={handleNativeFileChange}
                      className="hidden"
                    />
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      atau gunakan contoh cepat untuk simulasi
                    </p>
                  </div>

                  {/* Simulated sample files buttons */}
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSimulateFileSelect('Altaf_Jawaban_Tugas_Final.zip', 4200000)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 font-mono"
                    >
                      + Altaf_Jawaban_Tugas_Final.zip (4.2 MB)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimulateFileSelect('Dokumen_Laporan_Tugas.pdf', 1850000)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-100 font-mono"
                    >
                      + Dokumen_Laporan_Tugas.pdf (1.8 MB)
                    </button>
                  </div>

                  {/* Selected File Card */}
                  {mockFileName && (
                    <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-left">
                      <div className="flex items-center gap-2.5">
                        <File className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            {mockFileName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {(mockFileSize / (1024 * 1024)).toFixed(2)} MB • Berkas Terpilih
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMockFileName('');
                          setSelectedFile(null);
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        aria-label="Hapus berkas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Optional Text Response */}
                {assignment.allowTextResponse && (
                  <div>
                    <label
                      htmlFor="student-notes"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Catatan atau Ringkasan untuk Dosen (Opsional)
                    </label>
                    <textarea
                      id="student-notes"
                      value={textNotes}
                      onChange={(e) => setTextNotes(e.target.value)}
                      rows={3}
                      placeholder="Tuliskan keterangan mengenai repositori GitHub, link demo, atau catatan khusus pengujian..."
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  {isReplacing && (
                    <button
                      type="button"
                      onClick={() => setIsReplacing(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                    >
                      Batal Ganti Berkas
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-1.5 animate-pulse">
                        <CloudUpload className="w-4 h-4 animate-bounce" />
                        <span>{uploadFeedback || 'Mengunggah berkas ke Google Drive...'}</span>
                      </span>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Kirim Jawaban Tugas Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-400">
          * Mode prototipe. Pengiriman berkas akan disimpan ke penyimpanan privat cloud dan diasosiasikan dengan akun mahasiswa saat backend Supabase Storage diaktifkan.
        </div>
      </div>
    </div>
  );
};
