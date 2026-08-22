import React, { useState } from 'react';
import { Pengeluaran, User } from '../types';
import { formatRupiah, formatDateIndonesian, resolveNamaBendahara } from '../utils/formatters';
import { Receipt, PlusCircle, Calendar, FileText, TrendingDown, Tag, AlertCircle } from 'lucide-react';

interface KelolaPengeluaranProps {
  pengeluaranList: Pengeluaran[];
  onSavePengeluaran: (newExpense: Omit<Pengeluaran, 'id'>) => void;
  onDeletePengeluaran?: (id: string) => void;
  currentUser?: User | null;
}

const CATEGORY_PROJECTS = [
  'Raker & Silaturahmi Pengurus',
  'Workshop Kurikulum & Pembinaan',
  'Lomba FLS2N Sub Rayon Cimanggis Tapos',
  'Transport & Operasional Dinas',
  'Konsumsi Rapat Bulanan MKKS',
  'Santunan & Kegiatan Sosial',
  'Pengadaan Perlengkapan Kantor'
];

export const KelolaPengeluaran: React.FC<KelolaPengeluaranProps> = ({
  pengeluaranList,
  onSavePengeluaran,
  currentUser
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [tanggal, setTanggal] = useState<string>(todayStr);
  const [project, setProject] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [nominal, setNominal] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amount = Number(nominal);
    if (!tanggal) {
      setErrorMsg('Pilih tanggal transaksi kuitansi.');
      return;
    }
    if (!project.trim()) {
      setErrorMsg('Isi nama kegiatan / alokasi project.');
      return;
    }
    if (!amount || amount <= 0) {
      setErrorMsg('Nominal pengeluaran harus lebih besar dari 0.');
      return;
    }

    const currentBendaharaName = resolveNamaBendahara(currentUser?.namaKepsek || currentUser?.username);

    onSavePengeluaran({
      tanggal,
      project: project.trim(),
      keterangan: keterangan.trim() || '-',
      nominal: amount,
      diinputOleh: currentBendaharaName
    });

    // Reset form
    setProject('');
    setKeterangan('');
    setNominal('');
  };

  const totalPengeluaran = pengeluaranList.reduce((acc, curr) => acc + curr.nominal, 0);

  return (
    <div id="kelola-pengeluaran-container" className="space-y-4 sm:space-y-6">
      
      {/* Title Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-semibold mb-2 border border-rose-200">
            <Receipt className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Pencatatan Kas Keluar Bendahara</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">Kelola Pengeluaran Operasional MKKS Citos</h2>
          <p className="text-xs text-slate-500 mt-1">
            Catat setiap pengeluaran anggaran untuk kegiatan rapat, workshop, lomba, dan operasional pengurus.
          </p>
        </div>

        <div className="bg-rose-50/80 border border-rose-200 p-3 rounded-xl text-left sm:text-right flex items-center justify-between sm:block">
          <div className="text-[11px] text-slate-500">Total Pengeluaran Tercatat</div>
          <div className="text-base sm:text-lg font-black text-rose-700">{formatRupiah(totalPengeluaran)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Input Form (1 Column) */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4 sm:space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <PlusCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <h3 className="font-bold text-slate-800 text-sm">Form Tambah Pengeluaran Baru</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. Tanggal Transaksi Kuitansi */}
            <div>
              <label htmlFor="tanggal-pengeluaran-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                1. Tanggal Transaksi Kuitansi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="tanggal-pengeluaran-input"
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>
            </div>

            {/* 2. Nama Kegiatan / Alokasi Project */}
            <div>
              <label htmlFor="project-pengeluaran-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                2. Nama Kegiatan / Alokasi Project <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="project-pengeluaran-input"
                  type="text"
                  placeholder="Contoh: Raker MKKS Citos..."
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              {/* Quick suggestions */}
              <div className="mt-2 flex flex-wrap gap-1">
                {CATEGORY_PROJECTS.map((cat, idx) => (
                  <button
                    key={`cat-sug-${cat}-${idx}`}
                    type="button"
                    onClick={() => setProject(cat)}
                    className="text-[10px] bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 px-2 py-1 rounded-lg border border-slate-200 transition-colors"
                  >
                    + {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Keterangan Tambahan */}
            <div>
              <label htmlFor="keterangan-pengeluaran-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                3. Keterangan Tambahan
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <textarea
                  id="keterangan-pengeluaran-input"
                  rows={2}
                  placeholder="Rincian nota/kuitansi, jumlah peserta, lokasi..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* 4. Nominal Pengeluaran */}
            <div>
              <label htmlFor="nominal-pengeluaran-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                4. Nominal Pengeluaran (Rp) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">Rp</span>
                <input
                  id="nominal-pengeluaran-input"
                  type="number"
                  placeholder="0"
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>
              {Number(nominal) > 0 && (
                <div className="text-[11px] text-rose-600 font-bold mt-1">
                  {formatRupiah(Number(nominal))}
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="btn-simpan-pengeluaran"
              type="submit"
              className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span>Simpan Pembukuan Pengeluaran</span>
            </button>

          </form>
        </div>

        {/* List of Expenditure Records (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 shrink-0" />
                <span>Daftar Transaksi Pengeluaran MKKS Citos</span>
              </h3>
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium">Total: {pengeluaranList.length} Item</span>
            </div>

            {pengeluaranList.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <span>Belum ada catatan pengeluaran operasional.</span>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block sm:hidden space-y-2.5 mt-3">
                  {pengeluaranList.map((p, idx) => (
                    <div
                      key={`mobile-pengeluaran-card-${p.id || 'noid'}-${p.tanggal}-${idx}`}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                        <span className="font-semibold text-slate-500 text-[11px]">
                          {formatDateIndonesian(p.tanggal)}
                        </span>
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                          Operasional
                        </span>
                      </div>

                      <div className="flex justify-between items-start gap-2 pt-0.5">
                        <div className="space-y-0.5 pr-2 min-w-0">
                          <div className="font-extrabold text-slate-800 text-xs">{p.project}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-2">{p.keterangan || '-'}</div>
                        </div>
                        <div className="text-right font-black text-rose-700 text-xs shrink-0">
                          {formatRupiah(p.nominal)}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Oleh: <strong className="text-slate-600 font-semibold">{p.diinputOleh || 'Bendahara'}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-200">
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Kegiatan / Project</th>
                        <th className="py-2.5 px-3">Keterangan</th>
                        <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pengeluaranList.map((p, idx) => (
                        <tr key={`pengeluaran-row-${p.id || 'noid'}-${p.tanggal}-${idx}`} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                            {formatDateIndonesian(p.tanggal)}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {p.project}
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-xs">
                            {p.keterangan}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-rose-600 whitespace-nowrap">
                            {formatRupiah(p.nominal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
