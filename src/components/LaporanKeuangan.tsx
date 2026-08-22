import React, { useState } from 'react';
import { Sekolah, Iuran, Pengeluaran, BULAN_LIST, BULAN_SINGKAT, IURAN_PER_BULAN, User } from '../types';
import { formatRupiah, formatDateIndonesian, resolveNamaBendahara } from '../utils/formatters';
import { exportToExcel, exportToPDF } from '../services/exportUtils';
import { 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Table, 
  Download,
  Search,
  Building2,
  Wallet,
  CreditCard,
  LayoutGrid,
  ListFilter,
  ArrowUpRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface LaporanKeuanganProps {
  sekolahList: Sekolah[];
  iuranList: Iuran[];
  pengeluaranList: Pengeluaran[];
  userSchoolName?: string;
  currentUser?: User | null;
}

export const LaporanKeuangan: React.FC<LaporanKeuanganProps> = ({
  sekolahList,
  iuranList,
  pengeluaranList,
  userSchoolName,
  currentUser
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [activeTab, setActiveTab] = useState<'matrix' | 'kas-masuk' | 'kas-keluar' | 'rekap'>('matrix');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [matrixViewMode, setMatrixViewMode] = useState<'cards' | 'table'>('cards');

  // Filter dataset by year
  const iuranYear = iuranList.filter(i => i.tahun === selectedYear);
  const pengeluaranYear = pengeluaranList.filter(p => p.tanggal.startsWith(`${selectedYear}`));

  // Total Kas
  const totalKasMasuk = iuranYear.reduce((acc, curr) => acc + curr.nominal, 0);
  const totalKasKeluar = pengeluaranYear.reduce((acc, curr) => acc + curr.nominal, 0);
  const saldoBersih = totalKasMasuk - totalKasKeluar;

  // Export handlers
  const handleExportExcel = () => {
    exportToExcel(selectedYear, sekolahList, iuranList, pengeluaranList);
  };

  const handleExportPDF = () => {
    exportToPDF(selectedYear, sekolahList, iuranList, pengeluaranList, currentUser);
  };

  // Filtered lists for search
  const query = (searchFilter || '').toLowerCase();
  const filteredSekolah = sekolahList.filter(s =>
    (s.namaSekolah || '').toLowerCase().includes(query) ||
    (s.namaKepsek || '').toLowerCase().includes(query)
  );

  const filteredKasMasuk = iuranYear.filter(i =>
    (i.namaSekolah || '').toLowerCase().includes(query) ||
    (i.bulan || '').toLowerCase().includes(query)
  );

  const filteredKasKeluar = pengeluaranYear.filter(p =>
    (p.project || '').toLowerCase().includes(query) ||
    (p.keterangan || '').toLowerCase().includes(query)
  );

  return (
    <div id="laporan-keuangan-container" className="space-y-4 sm:space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-white/15 text-teal-100 px-3 py-1 rounded-full text-xs font-semibold mb-2 border border-white/20 backdrop-blur-md">
              <FileText className="w-3.5 h-3.5 text-teal-200" />
              <span>Pembukuan MKKS Citos</span>
            </div>
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug">
              Laporan Keuangan & Matriks Iuran
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/80 mt-1 max-w-xl font-light hidden sm:block">
              Matriks kelunasan 10 sekolah anggota, rincian penerimaan iuran, pengeluaran operasional, dan rekap arus kas.
            </p>
          </div>

          {/* Filter & Export Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            
            {/* Year Filter */}
            <div className="flex items-center space-x-2 bg-white/10 p-1.5 rounded-xl border border-white/20 backdrop-blur-md">
              <Calendar className="w-4 h-4 text-teal-200 ml-1.5" />
              <span className="text-xs text-teal-100 font-medium whitespace-nowrap">Tahun:</span>
              <select
                id="laporan-year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                aria-label="Filter Tahun Laporan Keuangan"
                className="bg-teal-950 text-white font-bold text-xs py-1.5 px-3 rounded-lg border border-teal-400/30 focus:outline-none focus:ring-2 focus:ring-teal-300 cursor-pointer w-full sm:w-auto"
              >
                <option value={2026}>2026 (Tahun Berjalan)</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>

            {/* Export Buttons Group */}
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-export-excel"
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                title="Export Ke Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Excel</span>
              </button>

              <button
                id="btn-export-pdf"
                onClick={handleExportPDF}
                className="bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                title="Export Ke PDF (.pdf)"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>PDF</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Kas Masuk */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-emerald-100 shadow-xs flex items-center justify-between sm:block relative overflow-hidden">
          <div className="flex items-center space-x-3 sm:space-x-0 sm:justify-between sm:mb-2">
            <div className="bg-emerald-100 p-2 sm:p-2.5 rounded-xl text-emerald-700 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block sm:inline">Pemasukan</span>
              <p className="text-[10px] text-slate-400 font-medium sm:hidden">Iuran Terkumpul ({selectedYear})</p>
            </div>
          </div>
          <div className="text-right sm:text-left">
            <div className="text-base sm:text-xl font-extrabold text-emerald-700">{formatRupiah(totalKasMasuk)}</div>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Iuran Terkumpul ({selectedYear})</p>
          </div>
        </div>

        {/* Total Kas Keluar */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-rose-100 shadow-xs flex items-center justify-between sm:block relative overflow-hidden">
          <div className="flex items-center space-x-3 sm:space-x-0 sm:justify-between sm:mb-2">
            <div className="bg-rose-100 p-2 sm:p-2.5 rounded-xl text-rose-700 shrink-0">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block sm:inline">Pengeluaran</span>
              <p className="text-[10px] text-slate-400 font-medium sm:hidden">Operasional ({selectedYear})</p>
            </div>
          </div>
          <div className="text-right sm:text-left">
            <div className="text-base sm:text-xl font-extrabold text-rose-700">{formatRupiah(totalKasKeluar)}</div>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Operasional ({selectedYear})</p>
          </div>
        </div>

        {/* Saldo Kas Bersih */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-teal-100 shadow-xs flex items-center justify-between sm:block relative overflow-hidden">
          <div className="flex items-center space-x-3 sm:space-x-0 sm:justify-between sm:mb-2">
            <div className="bg-teal-100 p-2 sm:p-2.5 rounded-xl text-teal-700 shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block sm:inline">Saldo Bersih</span>
              <p className="text-[10px] text-slate-400 font-medium sm:hidden">Kas Saat Ini</p>
            </div>
          </div>
          <div className="text-right sm:text-left">
            <div className={`text-base sm:text-xl font-extrabold ${saldoBersih >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>
              {formatRupiah(saldoBersih)}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Kas Saat Ini</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Search Controls */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200 shadow-xs space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-3">
        
        {/* Tab Buttons Strip */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 overflow-x-auto no-scrollbar">
          
          <button
            id="tab-laporan-matriks"
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
              activeTab === 'matrix'
                ? 'bg-teal-700 text-white shadow-md'
                : 'text-slate-600 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Matriks Iuran</span>
          </button>

          <button
            id="tab-laporan-kas-masuk"
            onClick={() => setActiveTab('kas-masuk')}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
              activeTab === 'kas-masuk'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Kas Masuk</span>
          </button>

          <button
            id="tab-laporan-kas-keluar"
            onClick={() => setActiveTab('kas-keluar')}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
              activeTab === 'kas-keluar'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-600 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Kas Keluar</span>
          </button>

          <button
            id="tab-laporan-rekap"
            onClick={() => setActiveTab('rekap')}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
              activeTab === 'rekap'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Rekap Bulanan</span>
          </button>

        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="search-laporan-input"
            type="text"
            placeholder="Cari sekolah / transaksi..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

      </div>

      {/* TAB 1: MATRIKS STATUS PEMBAYARAN PER SEKOLAH */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          
          {/* Header Controls for Matrix */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                Matriks Status Iuran Per Sekolah ({selectedYear})
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Iuran Rp 100.000 / bulan. Menampilkan status kelunasan Januari s.d. Desember.
              </p>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end space-x-3 pt-1 sm:pt-0">
              
              {/* Mobile View Toggle Buttons */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 sm:hidden">
                <button
                  type="button"
                  onClick={() => setMatrixViewMode('cards')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all ${
                    matrixViewMode === 'cards'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>Kartu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all ${
                    matrixViewMode === 'table'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  <Table className="w-3 h-3" />
                  <span>Tabel</span>
                </button>
              </div>

              {/* Status Legend */}
              <div className="flex items-center space-x-2 text-[11px] sm:text-xs">
                <span className="flex items-center space-x-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Lunas</span>
                </span>
                <span className="flex items-center space-x-1 font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  <XCircle className="w-3 h-3" />
                  <span>Belum</span>
                </span>
              </div>

            </div>
          </div>

          {/* MOBILE CARDS VIEW (Clean Mobile Layout) */}
          <div className={`${matrixViewMode === 'cards' ? 'block sm:hidden' : 'hidden'} space-y-3`}>
            {filteredSekolah.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Tidak ada sekolah yang cocok dengan pencarian "{searchFilter}".
              </div>
            ) : (
              filteredSekolah.map((sek, idx) => {
                let lunasCount = 0;
                const isUserSchool = userSchoolName && userSchoolName === sek.namaSekolah;

                const monthStatusList = BULAN_LIST.map((bulan) => {
                  const isPaid = iuranYear.some(i => 
                    ((i.idSekolah && sek.idSekolah && i.idSekolah === sek.idSekolah) || 
                     (i.namaSekolah && sek.namaSekolah && (
                       i.namaSekolah.toLowerCase().trim() === sek.namaSekolah.toLowerCase().trim() ||
                       i.namaSekolah.toLowerCase().includes(sek.namaSekolah.toLowerCase().trim()) ||
                       sek.namaSekolah.toLowerCase().includes(i.namaSekolah.toLowerCase().trim())
                     ))) &&
                    i.bulan === bulan
                  );
                  if (isPaid) lunasCount++;
                  return { bulan, isPaid };
                });

                const totalTerbayar = lunasCount * IURAN_PER_BULAN;
                const sisaTunggakan = (12 - lunasCount) * IURAN_PER_BULAN;
                const isFullyPaid = lunasCount === 12;

                return (
                  <div 
                    key={`mobile-matrix-card-${sek.idSekolah || sek.namaSekolah}-${idx}`}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isUserSchool 
                        ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/30 shadow-xs' 
                        : 'bg-slate-50/80 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    {/* Header Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className="text-[10px] font-mono font-extrabold text-slate-400">#{idx + 1}</span>
                          <h4 className="font-bold text-slate-800 text-xs leading-snug">
                            {sek.namaSekolah}
                          </h4>
                          {isUserSchool && (
                            <span className="bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md">
                              Sekolah Anda
                            </span>
                          )}
                        </div>
                        {sek.namaKepsek && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Kepsek: <strong className="text-slate-700">{sek.namaKepsek}</strong>
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                          isFullyPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {lunasCount}/12 Bln
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2.5">
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full rounded-full transition-all"
                          style={{ width: `${(lunasCount / 12) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* 12 Months Pills Grid */}
                    <div className="grid grid-cols-6 gap-1 mt-3">
                      {monthStatusList.map((m, bIdx) => (
                        <div
                          key={`m-pill-${sek.idSekolah}-${m.bulan}-${bIdx}`}
                          className={`text-center py-1 rounded-md text-[9px] font-bold border ${
                            m.isPaid
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-white text-slate-400 border-slate-200'
                          }`}
                        >
                          <div>{BULAN_SINGKAT[bIdx]}</div>
                          <div className="text-[8px] opacity-90">{m.isPaid ? 'LUNAS' : '-'}</div>
                        </div>
                      ))}
                    </div>

                    {/* Card Footer Nominal */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-slate-500">Terbayar: </span>
                        <span className="font-extrabold text-emerald-700">{formatRupiah(totalTerbayar)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Tunggakan: </span>
                        <span className={`font-extrabold ${sisaTunggakan > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {formatRupiah(sisaTunggakan)}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* TABLE VIEW (Desktop Default & Mobile Toggle Table) */}
          <div className={`${matrixViewMode === 'table' ? 'block' : 'hidden sm:block'} overflow-x-auto no-scrollbar touch-pan-x -mx-2 sm:mx-0 px-2 sm:px-0`}>
            <table className="w-full text-center text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-teal-800 text-white font-bold text-xs">
                  <th className="py-3 px-2 text-left rounded-tl-xl w-8">No</th>
                  <th className="py-3 px-3 text-left min-w-[180px]">Nama Sekolah Anggota</th>
                  {BULAN_SINGKAT.map((b, bIdx) => (
                    <th key={`b-singkat-${b}-${bIdx}`} className="py-3 px-1 min-w-[38px]">{b}</th>
                  ))}
                  <th className="py-3 px-3 text-right bg-teal-900">Total Lunas</th>
                  <th className="py-3 px-3 text-right bg-teal-950 rounded-tr-xl">Sisa Tunggakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSekolah.map((sek, idx) => {
                  let lunasCount = 0;
                  const isUserSchool = userSchoolName && userSchoolName === sek.namaSekolah;

                  return (
                    <tr 
                      key={`sek-matrix-${sek.idSekolah || sek.namaSekolah}-${idx}`} 
                      className={`hover:bg-teal-50/50 transition-colors ${
                        isUserSchool ? 'bg-amber-50/80 font-bold border-l-4 border-amber-500' : ''
                      }`}
                    >
                      <td className="py-3 px-2 text-left font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3 text-left">
                        <div className="font-bold text-slate-800 leading-snug">
                          {sek.namaSekolah}
                          {isUserSchool && (
                            <span className="ml-1.5 text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">Sekolah Anda</span>
                          )}
                        </div>
                        {sek.namaKepsek && (
                          <div className="text-[10px] text-slate-500 font-normal">
                            Kepsek: <strong className="text-slate-700">{sek.namaKepsek}</strong>
                          </div>
                        )}
                      </td>

                      {BULAN_LIST.map((bulan, bIdx) => {
                        const isPaid = iuranYear.some(i => 
                          ((i.idSekolah && sek.idSekolah && i.idSekolah === sek.idSekolah) || 
                           (i.namaSekolah && sek.namaSekolah && (
                             i.namaSekolah.toLowerCase().trim() === sek.namaSekolah.toLowerCase().trim() ||
                             i.namaSekolah.toLowerCase().includes(sek.namaSekolah.toLowerCase().trim()) ||
                             sek.namaSekolah.toLowerCase().includes(i.namaSekolah.toLowerCase().trim())
                           ))) &&
                          i.bulan === bulan
                        );
                        if (isPaid) lunasCount++;

                        return (
                          <td key={`cell-${sek.idSekolah || idx}-${bulan}-${bIdx}`} className="py-2.5 px-0.5">
                            {isPaid ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[11px]" title={`${bulan}: Lunas`}>
                                V
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-300 font-bold text-[11px]" title={`${bulan}: Belum Lunas`}>
                                -
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-3 text-right font-black text-emerald-700 bg-emerald-50/50">
                        {formatRupiah(lunasCount * IURAN_PER_BULAN)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-600 bg-rose-50/50">
                        {formatRupiah((12 - lunasCount) * IURAN_PER_BULAN)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer Summary Row */}
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold text-xs">
                  <td colSpan={2} className="py-3 px-3 text-left rounded-bl-xl">TOTAL KAS MASUK:</td>
                  {BULAN_LIST.map((bulan, bIdx) => {
                    const monthTotal = iuranYear
                      .filter(i => i.bulan === bulan)
                      .reduce((acc, curr) => acc + curr.nominal, 0);
                    return (
                      <td key={`foot-b-${bulan}-${bIdx}`} className="py-3 px-0.5 text-[9px] font-mono text-teal-300">
                        {monthTotal > 0 ? `${monthTotal / 1000}k` : '0'}
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-right text-emerald-400 font-black">{formatRupiah(totalKasMasuk)}</td>
                  <td className="py-3 px-3 text-right text-rose-300 font-black rounded-br-xl">
                    {formatRupiah(Math.max(0, (sekolahList.length * 12 * IURAN_PER_BULAN) - totalKasMasuk))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      )}

      {/* TAB 2: RINCIAN KAS MASUK */}
      {activeTab === 'kas-masuk' && (
        <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                Rincian Kas Masuk (Penerimaan Iuran)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Tahun Buku {selectedYear}</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[10px] sm:text-[11px] text-slate-500">Total Terbayar ({filteredKasMasuk.length} Transaksi)</div>
              <div className="text-base sm:text-lg font-black text-emerald-600">{formatRupiah(totalKasMasuk)}</div>
            </div>
          </div>

          {/* Mobile Card List for Kas Masuk */}
          <div className="block sm:hidden space-y-2.5">
            {filteredKasMasuk.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada catatan kas masuk pada tahun {selectedYear}.
              </div>
            ) : (
              filteredKasMasuk.map((i, idx) => (
                <div key={`kas-masuk-card-${i.id || 'noid'}-${idx}`} className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{i.namaSekolah}</span>
                    <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">{formatRupiah(i.nominal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Bulan: <strong className="text-emerald-800">{i.bulan}</strong> ({i.tahun})</span>
                    <span>{formatDateIndonesian(i.tanggalInput)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">Diinput: {resolveNamaBendahara(i.diinputOleh, undefined, sekolahList)}</div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-700 text-white font-bold text-[11px]">
                  <th className="py-3 px-3 rounded-tl-xl">No</th>
                  <th className="py-3 px-3">Tahun Buku</th>
                  <th className="py-3 px-3">Bulan Pembayaran</th>
                  <th className="py-3 px-3">Tanggal Pembayaran</th>
                  <th className="py-3 px-4">Nama Instansi / Sekolah</th>
                  <th className="py-3 px-3 text-right">Jumlah Nominal</th>
                  <th className="py-3 px-3 text-center rounded-tr-xl">Diinput Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredKasMasuk.map((i, idx) => (
                  <tr key={`kas-masuk-row-${i.id || 'noid'}-${idx}`} className="hover:bg-emerald-50/50 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-700">{i.tahun}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-800">{i.bulan}</td>
                    <td className="py-3 px-3 text-slate-600">{formatDateIndonesian(i.tanggalInput)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{i.namaSekolah}</td>
                    <td className="py-3 px-3 text-right font-black text-emerald-600">{formatRupiah(i.nominal)}</td>
                    <td className="py-3 px-3 text-center text-slate-700 font-semibold text-[11px]">{resolveNamaBendahara(i.diinputOleh, undefined, sekolahList)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold text-xs">
                  <td colSpan={5} className="py-3 px-4 text-right rounded-bl-xl">TOTAL KAS MASUK ({selectedYear}):</td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-black text-sm">{formatRupiah(totalKasMasuk)}</td>
                  <td className="rounded-br-xl"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RINCIAN KAS KELUAR */}
      {activeTab === 'kas-keluar' && (
        <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                Rincian Kas Keluar (Pengeluaran Operasional)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Tahun Transaksi {selectedYear}</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[10px] sm:text-[11px] text-slate-500">Total Pengeluaran ({filteredKasKeluar.length} Items)</div>
              <div className="text-base sm:text-lg font-black text-rose-600">{formatRupiah(totalKasKeluar)}</div>
            </div>
          </div>

          {/* Mobile Card List for Kas Keluar */}
          <div className="block sm:hidden space-y-2.5">
            {filteredKasKeluar.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada catatan kas keluar pada tahun {selectedYear}.
              </div>
            ) : (
              filteredKasKeluar.map((p, idx) => (
                <div key={`kas-keluar-card-${p.id || 'noid'}-${idx}`} className="p-3 rounded-xl border border-rose-100 bg-rose-50/30 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{p.project}</span>
                    <span className="font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-[11px]">{formatRupiah(p.nominal)}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">{p.keterangan}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-rose-200/50">
                    <span>Tgl: {formatDateIndonesian(p.tanggal)}</span>
                    <span>Diinput: {resolveNamaBendahara(p.diinputOleh, undefined, sekolahList)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-rose-700 text-white font-bold text-[11px]">
                  <th className="py-3 px-3 rounded-tl-xl">No</th>
                  <th className="py-3 px-3">Tanggal Transaksi</th>
                  <th className="py-3 px-4">Alokasi Project / Kegiatan</th>
                  <th className="py-3 px-4">Keterangan Tambahan</th>
                  <th className="py-3 px-3 text-right">Jumlah Nominal</th>
                  <th className="py-3 px-3 text-center rounded-tr-xl">Diinput Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredKasKeluar.map((p, idx) => (
                  <tr key={`kas-keluar-row-${p.id || 'noid'}-${idx}`} className="hover:bg-rose-50/50 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{formatDateIndonesian(p.tanggal)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{p.project}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm">{p.keterangan}</td>
                    <td className="py-3 px-3 text-right font-black text-rose-600 whitespace-nowrap">{formatRupiah(p.nominal)}</td>
                    <td className="py-3 px-3 text-center text-slate-700 font-semibold text-[11px]">{resolveNamaBendahara(p.diinputOleh, undefined, sekolahList)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold text-xs">
                  <td colSpan={4} className="py-3 px-4 text-right rounded-bl-xl">TOTAL KAS KELUAR ({selectedYear}):</td>
                  <td className="py-3 px-3 text-right text-rose-400 font-black text-sm">{formatRupiah(totalKasKeluar)}</td>
                  <td className="rounded-br-xl"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: REKAP BULANAN & SALDO BERSIH */}
      {activeTab === 'rekap' && (
        <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">
              Rekapitulasi Arus Kas Bulanan ({selectedYear})
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">Perbandingan Pemasukan, Pengeluaran, dan Net Saldo Kas per Bulan</p>
          </div>

          {/* Mobile Card List for Rekap Bulanan */}
          <div className="block sm:hidden space-y-2.5">
            {BULAN_LIST.map((bulanName, idx) => {
              const monthStr = String(idx + 1).padStart(2, '0');
              const inVal = iuranYear
                .filter(i => i.bulan === bulanName)
                .reduce((a, b) => a + b.nominal, 0);

              const outVal = pengeluaranYear
                .filter(p => p.tanggal.split('-')[1] === monthStr)
                .reduce((a, b) => a + b.nominal, 0);

              const net = inVal - outVal;
              const isSurplus = net >= 0;

              return (
                <div
                  key={`mobile-rekap-card-${bulanName}-${idx}`}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5 text-xs"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <div className="font-extrabold text-slate-800 text-sm flex items-center space-x-1.5">
                      <span>{bulanName} {selectedYear}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isSurplus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {isSurplus ? 'Surplus' : 'Defisit'}
                    </span>
                  </div>

                  {/* Card Body Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-100/80">
                      <span className="text-[10px] text-slate-500 font-medium block">Pemasukan</span>
                      <span className="font-extrabold text-emerald-700 text-xs">{formatRupiah(inVal)}</span>
                    </div>

                    <div className="bg-rose-50/80 p-2 rounded-xl border border-rose-100/80">
                      <span className="text-[10px] text-slate-500 font-medium block">Pengeluaran</span>
                      <span className="font-extrabold text-rose-700 text-xs">{formatRupiah(outVal)}</span>
                    </div>
                  </div>

                  {/* Card Net Cashflow Footer */}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-600">Net Cashflow:</span>
                    <span className={`font-black text-xs ${isSurplus ? 'text-teal-700' : 'text-rose-700'}`}>
                      {formatRupiah(net)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[550px]">
              <thead>
                <tr className="bg-indigo-800 text-white font-bold text-[11px]">
                  <th className="py-3 px-3 rounded-tl-xl">Bulan</th>
                  <th className="py-3 px-3 text-right">Pemasukan (Iuran)</th>
                  <th className="py-3 px-3 text-right">Pengeluaran</th>
                  <th className="py-3 px-3 text-right">Net Cashflow</th>
                  <th className="py-3 px-3 text-right rounded-tr-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {BULAN_LIST.map((bulanName, idx) => {
                  const monthStr = String(idx + 1).padStart(2, '0');
                  const inVal = iuranYear
                    .filter(i => i.bulan === bulanName)
                    .reduce((a, b) => a + b.nominal, 0);

                  const outVal = pengeluaranYear
                    .filter(p => p.tanggal.split('-')[1] === monthStr)
                    .reduce((a, b) => a + b.nominal, 0);

                  const net = inVal - outVal;

                  return (
                    <tr key={`rekap-row-${bulanName}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{bulanName}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{formatRupiah(inVal)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-rose-600">{formatRupiah(outVal)}</td>
                      <td className={`py-2.5 px-3 text-right font-black ${net >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>
                        {formatRupiah(net)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {net >= 0 ? (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-extrabold">Surplus</span>
                        ) : (
                          <span className="text-[9px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-extrabold">Defisit</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td className="py-3 px-3 rounded-bl-xl">TOTAL AKUMULASI:</td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-black">{formatRupiah(totalKasMasuk)}</td>
                  <td className="py-3 px-3 text-right text-rose-400 font-black">{formatRupiah(totalKasKeluar)}</td>
                  <td className={`py-3 px-3 text-right text-sm font-black ${saldoBersih >= 0 ? 'text-teal-300' : 'text-rose-300'}`}>
                    {formatRupiah(saldoBersih)}
                  </td>
                  <td className="rounded-br-xl"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
