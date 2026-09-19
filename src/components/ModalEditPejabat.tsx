import React, { useState, useEffect } from 'react';
import { X, UserCheck, CheckCircle2, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { PejabatPenandatangan } from '../types';
import { StorageService, DEFAULT_PEJABAT } from '../services/spreadsheetSync';

interface ModalEditPejabatProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updated: PejabatPenandatangan) => void;
}

export const ModalEditPejabat: React.FC<ModalEditPejabatProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [namaKetuaMkks, setNamaKetuaMkks] = useState<string>('');
  const [nipKetuaMkks, setNipKetuaMkks] = useState<string>('');
  const [jabatanKetuaMkks, setJabatanKetuaMkks] = useState<string>('');

  const [namaBendahara, setNamaBendahara] = useState<string>('');
  const [nipBendahara, setNipBendahara] = useState<string>('');
  const [jabatanBendahara, setJabatanBendahara] = useState<string>('');

  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const current = StorageService.getPejabat();
      const currentUser = StorageService.getCurrentUser();
      const namaLogin = currentUser?.namaKepsek || currentUser?.username || '';
      const isOldBendahara = !current.namaBendahara || current.namaBendahara.includes('Nurhasan');

      setNamaKetuaMkks(current.namaKetuaMkks || DEFAULT_PEJABAT.namaKetuaMkks);
      setNipKetuaMkks(current.nipKetuaMkks || DEFAULT_PEJABAT.nipKetuaMkks);
      setJabatanKetuaMkks(current.jabatanKetuaMkks || DEFAULT_PEJABAT.jabatanKetuaMkks);

      setNamaBendahara(!isOldBendahara ? current.namaBendahara : (namaLogin || DEFAULT_PEJABAT.namaBendahara));
      setNipBendahara(current.nipBendahara || '');
      setJabatanBendahara(current.jabatanBendahara || DEFAULT_PEJABAT.jabatanBendahara);
      setIsSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResetDefault = () => {
    setNamaKetuaMkks(DEFAULT_PEJABAT.namaKetuaMkks);
    setNipKetuaMkks(DEFAULT_PEJABAT.nipKetuaMkks);
    setJabatanKetuaMkks(DEFAULT_PEJABAT.jabatanKetuaMkks);

    setNamaBendahara(DEFAULT_PEJABAT.namaBendahara);
    setNipBendahara(DEFAULT_PEJABAT.nipBendahara || '');
    setJabatanBendahara(DEFAULT_PEJABAT.jabatanBendahara);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = StorageService.savePejabat({
      namaKetuaMkks,
      nipKetuaMkks,
      jabatanKetuaMkks,
      namaBendahara,
      nipBendahara,
      jabatanBendahara
    });

    if (onSaved) {
      onSaved(updated);
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-4 max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-indigo-900 text-white px-5 py-4 flex items-center justify-between border-b border-teal-700 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <UserCheck className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg leading-tight">
                Pengaturan Pejabat Penandatangan
              </h3>
              <p className="text-xs text-teal-100/80">
                Nama Ketua MKKS & Bendahara untuk Berita Acara & Laporan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-teal-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {isSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 flex items-center space-x-2 text-xs font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Data Ketua MKKS dan Bendahara berhasil diperbarui!</span>
            </div>
          )}

          <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-200/80 text-xs text-teal-900 leading-relaxed">
            <p className="font-semibold">
              Perubahan nama di form ini akan otomatis tersimpan dan diterapkan pada:
            </p>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-teal-800 text-[11px]">
              <li>Naskah Berita Acara Pemeriksaan Kas (Audit Opname)</li>
              <li>Dokumen Cetak & PDF Laporan Keuangan Tahunan</li>
              <li>Tanda Tangan Pengesahan Pembukuan Organisasi</li>
            </ul>
          </div>

          {/* Section 1: Ketua MKKS */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block"></span>
                <span>1. Ketua MKKS (Pihak Mengetahui)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Kolom Kiri
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap & Gelar Ketua MKKS <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={namaKetuaMkks}
                onChange={(e) => setNamaKetuaMkks(e.target.value)}
                placeholder="Contoh: Drs. H. M. Supriyadi, M.Pd"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP Ketua MKKS
                </label>
                <input
                  type="text"
                  value={nipKetuaMkks}
                  onChange={(e) => setNipKetuaMkks(e.target.value)}
                  placeholder="Contoh: 196805121994121001"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jabatan / Keterangan di Naskah
                </label>
                <input
                  type="text"
                  value={jabatanKetuaMkks}
                  onChange={(e) => setJabatanKetuaMkks(e.target.value)}
                  placeholder="Ketua MKKS SMP Cimanggis & Tapos"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Bendahara MKKS */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                <span>2. Bendahara MKKS (Pemeriksa Kas)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Kolom Kanan
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Nama Lengkap & Gelar Bendahara <span className="text-rose-500">*</span>
                </label>
                {StorageService.getCurrentUser()?.namaKepsek && (
                  <button
                    type="button"
                    onClick={() => setNamaBendahara(StorageService.getCurrentUser()?.namaKepsek || '')}
                    className="text-[10px] text-teal-700 hover:text-teal-900 font-semibold underline cursor-pointer"
                    title="Klik untuk mengambil nama akun login yang aktif"
                  >
                    Ambil dari Akun Login
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={namaBendahara}
                onChange={(e) => setNamaBendahara(e.target.value)}
                placeholder="Contoh: Abu Haripin, M.Pd."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Secara otomatis di awal mengambil dari akun login. Petugas cetak dapat mengedit secara manual jika ada perubahan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP Bendahara (Opsional)
                </label>
                <input
                  type="text"
                  value={nipBendahara}
                  onChange={(e) => setNipBendahara(e.target.value)}
                  placeholder="NIP atau kosongkan (-)"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jabatan / Keterangan di Naskah
                </label>
                <input
                  type="text"
                  value={jabatanBendahara}
                  onChange={(e) => setJabatanBendahara(e.target.value)}
                  placeholder="Bendahara MKKS SMP Citos"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetDefault}
              className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer w-full sm:w-auto justify-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Pengurus Default</span>
            </button>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-5 py-2 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
