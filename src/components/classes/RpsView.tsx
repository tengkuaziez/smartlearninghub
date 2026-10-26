import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  BookOpen, 
  Award, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  ExternalLink,
  Code2,
  Cpu,
  Edit3,
  X,
  Sparkles,
  Info
} from 'lucide-react';
import { Badge } from '../common/Badge.tsx';
import { formatIndonesianDate } from '../../utils/academicCalculations.ts';
import type { CourseClass, CourseRps, Meeting } from '../../types/index.ts';

interface RpsViewProps {
  course: CourseClass;
  meetings: Meeting[];
  isLecturerMode?: boolean;
  onUpdateRps?: (updates: Partial<CourseRps>) => void;
}

export const RpsView: React.FC<RpsViewProps> = ({
  course,
  meetings,
  isLecturerMode = false,
  onUpdateRps,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const rps = course.rps;

  if (!rps) {
    return (
      <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400 space-y-3">
        <FileText className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
        <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
          Dokumen RPS Belum Tersedia
        </h4>
        <p className="text-xs max-w-md mx-auto">
          Dosen pengampu sedang menyusun silabus resmi Rencana Pembelajaran Semester untuk mata kuliah ini.
        </p>
      </div>
    );
  }

  // Edit form states for lecturer
  const [editDescription, setEditDescription] = useState(rps.shortDescription);
  const [editCurriculum, setEditCurriculum] = useState(rps.curriculumYear);

  const handleCopySummary = () => {
    const textToCopy = `=== RENCANA PEMBELAJARAN SEMESTER (RPS) ===
Mata Kuliah: ${course.code} - ${course.title}
Semester: ${course.semester} (${course.academicYear})
Pengampu: ${course.teacher.name} ${course.secondaryTeacher ? `& ${course.secondaryTeacher.name}` : ''}
Kurikulum: ${rps.curriculumYear}

DESKRIPSI:
${rps.shortDescription}

CAPAIAN PEMBELAJARAN (CPMK):
${rps.cpmk.map((c) => `- [${c.code}] ${c.description}`).join('\n')}
`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateRps) {
      onUpdateRps({
        shortDescription: editDescription,
        curriculumYear: editCurriculum,
      });
    }
    setIsEditModalOpen(false);
  };

  // Sort meetings 1 to 16
  const sortedMeetings = [...meetings].sort((a, b) => a.meetingNumber - b.meetingNumber);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Official RPS Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                DOKUMEN RESMI RPS
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15">
                {rps.curriculumYear}
              </span>
              <span className="text-xs text-slate-300">
                Diperbarui: {formatIndonesianDate(rps.lastUpdated)}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Rencana Pembelajaran Semester (RPS)
              </h1>
              <p className="text-lg font-bold text-blue-300 mt-0.5">
                {course.code} — {course.title}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300 pt-1">
              <span>
                Semester: <strong>{course.semester} ({course.academicYear})</strong>
              </span>
              <span>•</span>
              <span>
                Alokasi: <strong>{course.totalMeetings || 16} Pertemuan Terjadwal</strong>
              </span>
              <span>•</span>
              <span>
                Ruang: <strong>{course.room} ({course.scheduleDay}, {course.scheduleTime})</strong>
              </span>
            </div>

            <div className="text-xs text-slate-300 pt-1">
              <span>Tim Pengampu: </span>
              <strong className="text-white">{course.teacher.name}</strong> (Dosen Utama)
              {course.secondaryTeacher && (
                <>
                  <span> & </span>
                  <strong className="text-white">{course.secondaryTeacher.name}</strong> (Dosen Pendamping)
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row md:flex-col gap-2.5 shrink-0">
            {rps.documentPdfUrl && (
              <a
                href={rps.documentPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <Download className="w-4 h-4" />
                <span>Unduh PDF RPS</span>
              </a>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center justify-center gap-2 transition-colors backdrop-blur-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Silabus</span>
            </button>

            <button
              onClick={handleCopySummary}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center justify-center gap-2 transition-colors backdrop-blur-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : 'Salin Ringkasan'}</span>
            </button>

            {isLecturerMode && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 flex items-center justify-center gap-2 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Deskripsi RPS</span>
              </button>
            )}
          </div>
        </div>

        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Lecturer Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Perbarui Data Silabus RPS</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tahun / Versi Kurikulum:
                </label>
                <input
                  type="text"
                  value={editCurriculum}
                  onChange={(e) => setEditCurriculum(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi Singkat Mata Kuliah:
                </label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Simpan Perubahan RPS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bagian I: Deskripsi Singkat Mata Kuliah */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span>I. Deskripsi Singkat Mata Kuliah</span>
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {rps.shortDescription}
        </p>
      </div>

      {/* Bagian II: Capaian Pembelajaran Lulusan (CPL) & CPMK */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>II. Capaian Pembelajaran Mata Kuliah (CPMK)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kompetensi yang diharapkan dicapai oleh setiap mahasiswa setelah menyelesaikan perkuliahan ini.
          </p>
        </div>

        {/* CPMK Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {rps.cpmk.map((item) => (
            <div
              key={item.code}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {item.code}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* CPL Prodi */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            CPL Program Studi yang Dibebankan pada Mata Kuliah:
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            {rps.cpl.map((cplItem, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
                <span>{cplItem}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bagian III: Pokok Bahasan (Bahan Kajian) & Metode Pembelajaran */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>III. Pokok Bahasan & Bahan Kajian</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {rps.studyMaterials.map((topic, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Metode Pembelajaran</span>
          </h3>
          <div className="space-y-2">
            {rps.learningMethods.map((method, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 font-semibold flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{method}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bagian IV: Komponen & Bobot Penilaian (Asesmen) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" />
            <span>IV. Komponen & Bobot Penilaian Resmi</span>
          </h3>
          <span className="text-xs font-bold text-slate-500">Total Akumulasi: 100%</span>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                <th className="py-3 px-4">Komponen Evaluasi</th>
                <th className="py-3 px-4">Bobot (%)</th>
                <th className="py-3 px-4">Keterangan Bentuk Penugasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rps.assessmentComponents.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {item.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                    {item.weightPercentage}%
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {item.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bagian V: Matriks Rencana Pembelajaran 16 Pertemuan */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>V. Matriks Rencana Pembelajaran 16 Pertemuan</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rincian topik, kemampuan akhir, dan bentuk evaluasi per minggu perkuliahan.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {sortedMeetings.length} Sesi Terjadwal
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                <th className="py-3 px-3 text-center">Minggu / Sesi</th>
                <th className="py-3 px-4">Topik & Judul Perkuliahan</th>
                <th className="py-3 px-4">Kemampuan Akhir / Sub-CPMK</th>
                <th className="py-3 px-3">Metode & Alokasi</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedMeetings.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-3 font-mono font-black text-center text-blue-600 dark:text-blue-400">
                    P{String(m.meetingNumber).padStart(2, '0')}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    <p className="text-xs">{m.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{m.topic}</p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs">
                    {m.learningObjectives && m.learningObjectives.length > 0 ? (
                      <p className="line-clamp-2">{m.learningObjectives[0]}</p>
                    ) : (
                      <span className="text-slate-400 italic">Penguasaan materi modul #{m.meetingNumber}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                    TM: 2x50'<br />
                    PT: 2x60'
                  </td>
                  <td className="py-3.5 px-3">
                    {m.meetingNumber === 8 ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                        UTS / Evaluasi
                      </span>
                    ) : m.meetingNumber === 16 ? (
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                        UAS / Akhir
                      </span>
                    ) : m.meetingNumber < 8 ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">
                        Selesai
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px]">
                        Akan Datang
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bagian VI: Pustaka / Referensi */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span>VI. Referensi & Pustaka Rujukan</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
              Pustaka Utama (Buku Teks):
            </span>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {rps.references.primary.map((ref, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-mono text-slate-400 font-bold">[{idx + 1}]</span>
                  <span className="leading-relaxed">{ref}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
              Pustaka Pendukung / Dokumentasi Resmi:
            </span>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {rps.references.supporting.map((ref, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-mono text-slate-400 font-bold">[{idx + 1}]</span>
                  <span className="leading-relaxed">{ref}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bagian VII: Perangkat Lunak & Perangkat Keras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            <Code2 className="w-4 h-4 text-blue-600" />
            <span>Perangkat Lunak (Software Tools)</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {rps.softwareTools.map((tool, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                {tool}
              </span>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span>Perangkat Keras (Hardware Tools)</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {rps.hardwareTools.map((tool, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                {tool}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
