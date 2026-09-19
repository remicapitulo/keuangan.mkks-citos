import React, { useState } from 'react';
import { Sekolah, Iuran, Pengeluaran, PemasukanLain, RiwayatHapus, BULAN_LIST, BULAN_SINGKAT, IURAN_PER_BULAN, User, RekonsiliasiKas, PejabatPenandatangan } from '../types';
import { formatRupiah, formatDateIndonesian, formatDateTimeIndonesian, resolveNamaBendahara, getTahunBukuList } from '../utils/formatters';
import { exportToExcel, exportToPDF, exportRiwayatHapusToExcel, exportRiwayatHapusToPDF } from '../services/exportUtils';
import { StorageService } from '../services/spreadsheetSync';
import { AuditRekonsiliasiTab } from './AuditRekonsiliasiTab';
import { BeritaAcaraAuditModal } from './BeritaAcaraAuditModal';
import { ModalEditPejabat } from './ModalEditPejabat';
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
  UserCheck,
  HandCoins,
  Printer,
  Trash2,
  History,
  AlertTriangle,
  Clock,
  User as UserIcon,
  Tag,
  Scale,
  Landmark,
  ArrowRight
} from 'lucide-react';

interface LaporanKeuanganProps {
  sekolahList: Sekolah[];
  iuranList: Iuran[];
  pengeluaranList: Pengeluaran[];
  pemasukanLainList?: PemasukanLain[];
  riwayatHapusList?: RiwayatHapus[];
  rekonsiliasiKasList?: RekonsiliasiKas[];
  userSchoolName?: string;
  currentUser?: User | null;
  onOpenStrukModal?: (data: any) => void;
  onDeleteIuran?: (item: Iuran) => void;
  onDeletePemasukanLain?: (item: PemasukanLain) => void;
  onDeletePengeluaran?: (item: Pengeluaran) => void;
  onSaveRekonsiliasiKas?: (record: RekonsiliasiKas) => void;
  onOpenSpreadsheetModal?: () => void;
}

export const LaporanKeuangan: React.FC<LaporanKeuanganProps> = ({
  sekolahList,
  iuranList,
  pengeluaranList,
  pemasukanLainList = [],
  riwayatHapusList = [],
  rekonsiliasiKasList,
  userSchoolName,
  currentUser,
  onOpenStrukModal,
  onDeleteIuran,
  onDeletePemasukanLain,
  onDeletePengeluaran,
  onSaveRekonsiliasiKas,
  onOpenSpreadsheetModal
}) => {
  const currentYear = new Date().getFullYear();
  const availableYears = getTahunBukuList(iuranList.map((i) => i.tahun));
  const [selectedYear, setSelectedYear] = useState<number>(() => Math.max(2026, currentYear));
  const [activeTab, setActiveTab] = useState<'matrix' | 'kas-masuk' | 'pemasukan-lain' | 'kas-keluar' | 'rekap' | 'audit' | 'riwayat-hapus'>('matrix');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [matrixViewMode, setMatrixViewMode] = useState<'cards' | 'table'>('cards');
  const [filterJenisHapus, setFilterJenisHapus] = useState<string>('all');
  const [isBeritaAcaraOpen, setIsBeritaAcaraOpen] = useState<boolean>(false);
  const [isPejabatModalOpen, setIsPejabatModalOpen] = useState<boolean>(false);
  const [pejabatData, setPejabatData] = useState<PejabatPenandatangan>(() => StorageService.getPejabat());

  // Local storage sync fallback for rekonsiliasi kas
  const [localRekonsiliasiList, setLocalRekonsiliasiList] = useState<RekonsiliasiKas[]>(() => {
    return rekonsiliasiKasList && rekonsiliasiKasList.length > 0 
      ? rekonsiliasiKasList 
      : StorageService.getRekonsiliasiKas();
  });

  // Keep local state in sync when prop changes
  React.useEffect(() => {
    if (rekonsiliasiKasList && rekonsiliasiKasList.length > 0) {
      setLocalRekonsiliasiList(rekonsiliasiKasList);
    }
  }, [rekonsiliasiKasList]);

  // Filter dataset by year
  const iuranYear = iuranList.filter(i => i.tahun === selectedYear);
  const pengeluaranYear = pengeluaranList.filter(p => p.tanggal.startsWith(`${selectedYear}`));
  const pemasukanLainYear = pemasukanLainList.filter(p => p.tanggal.startsWith(`${selectedYear}`));

  // Total Kas
  const totalIuranMasuk = iuranYear.reduce((acc, curr) => acc + curr.nominal, 0);
  const totalPemasukanLain = pemasukanLainYear.reduce((acc, curr) => acc + curr.nominal, 0);
  const totalKasMasuk = totalIuranMasuk + totalPemasukanLain;
  const totalKasKeluar = pengeluaranYear.reduce((acc, curr) => acc + curr.nominal, 0);
  const saldoBersih = totalKasMasuk - totalKasKeluar;

  // Active year audit record (Real vs Data)
  const effectiveAuditList = rekonsiliasiKasList && rekonsiliasiKasList.length > 0 ? rekonsiliasiKasList : localRekonsiliasiList;
  const auditTahunThis: RekonsiliasiKas = effectiveAuditList.find(r => r.tahun === selectedYear) || {
    id: `AUDIT-${selectedYear}-1`,
    tahun: selectedYear,
    tanggalAudit: new Date().toISOString().replace('T', ' ').substring(0, 16),
    saldoCash: saldoBersih > 0 ? Math.round((saldoBersih * 0.25) / 50000) * 50000 : 0,
    saldoBank: saldoBersih > 0 ? Math.max(0, saldoBersih - Math.round((saldoBersih * 0.25) / 50000) * 50000) : 0,
    namaBank: 'Bank DKI',
    nomorRekening: '102.23.09876.1',
    atasNamaRekening: 'MKKS SMP CITOS',
    catatanAudit: 'Pencocokan fisik kas dan rekening bank per saldo buku pembukuan sistem.',
    diauditOleh: currentUser?.namaKepsek || currentUser?.username || 'Bendahara MKKS Citos'
  };

  const totalSaldoReal = (auditTahunThis.saldoCash || 0) + (auditTahunThis.saldoBank || 0);
  const selisihAudit = totalSaldoReal - saldoBersih;
  const isAuditBalance = Math.abs(selisihAudit) === 0;
  const isAuditLebih = selisihAudit > 0;

  const handleSaveAudit = (record: RekonsiliasiKas) => {
    if (onSaveRekonsiliasiKas) {
      onSaveRekonsiliasiKas(record);
    }
    const updated = StorageService.saveSingleRekonsiliasi(record);
    setLocalRekonsiliasiList(updated);
  };

  // Export handlers
  const handleExportExcel = () => {
    exportToExcel(selectedYear, sekolahList, iuranList, pengeluaranList, pemasukanLainList, riwayatHapusList, auditTahunThis);
  };

  const handleExportPDF = () => {
    exportToPDF(selectedYear, sekolahList, iuranList, pengeluaranList, currentUser, pemasukanLainList, auditTahunThis);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const isAdmin = currentUser ? (
    currentUser.role === 'Admin' ||
    currentUser.role?.toLowerCase() === 'admin' ||
    currentUser.username?.toLowerCase() === 'admin' ||
    currentUser.username?.toLowerCase().includes('admin')
  ) : false;

  const isBendahara = currentUser?.role === 'Bendahara' || isAdmin;

  // Filtered lists for search
  const query = (searchFilter || '').toLowerCase();
  const filteredSekolah = sekolahList.filter(s =>
    (s.namaSekolah || '').toLowerCase().includes(query) ||
    (s.namaKepsek || '').toLowerCase().includes(query)
  );

  const filteredKasMasuk = iuranYear
    .filter(i =>
      (i.namaSekolah || '').toLowerCase().includes(query) ||
      (i.bulan || '').toLowerCase().includes(query) ||
      (i.keterangan || '').toLowerCase().includes(query)
    )
    .sort((a, b) => {
      const dateA = new Date(a.tanggalInput).getTime() || 0;
      const dateB = new Date(b.tanggalInput).getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });

  const filteredPemasukanLain = pemasukanLainYear
    .filter(p =>
      (p.sumberDana || '').toLowerCase().includes(query) ||
      (p.kategori || '').toLowerCase().includes(query) ||
      (p.keterangan || '').toLowerCase().includes(query)
    )
    .sort((a, b) => {
      const dateA = new Date(a.tanggal).getTime() || 0;
      const dateB = new Date(b.tanggal).getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });

  const filteredKasKeluar = pengeluaranYear
    .filter(p =>
      (p.project || '').toLowerCase().includes(query) ||
      (p.keterangan || '').toLowerCase().includes(query)
    )
    .sort((a, b) => {
      const dateA = new Date(a.tanggal).getTime() || 0;
      const dateB = new Date(b.tanggal).getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });

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
              Matriks kelunasan sekolah anggota, penerimaan iuran, pemasukan non-iuran, pengeluaran operasional, dan rekap arus kas.
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
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y} {y === currentYear ? '(Tahun Berjalan)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Export & Print Buttons Group */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                id="btn-edit-pejabat-laporan"
                type="button"
                onClick={() => setIsPejabatModalOpen(true)}
                className="bg-teal-800/80 hover:bg-teal-700 active:bg-teal-900 text-teal-100 hover:text-white font-bold text-xs px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl shadow-md border border-teal-400/40 transition-all flex items-center justify-center space-x-1 cursor-pointer"
                title="Atur Nama Ketua MKKS & Bendahara untuk Tanda Tangan Laporan & Berita Acara"
              >
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-300 shrink-0" />
                <span className="whitespace-nowrap">Atur Pejabat</span>
              </button>

              <button
                id="btn-export-excel"
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-1 cursor-pointer"
                title="Export Ke Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Excel</span>
              </button>

              <button
                id="btn-export-pdf"
                onClick={handleExportPDF}
                className="bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-1 cursor-pointer"
                title="Export Ke PDF (.pdf)"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>PDF</span>
              </button>

              <button
                id="btn-print-laporan"
                onClick={handlePrintReport}
                className="bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white font-bold text-xs px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-1 cursor-pointer"
                title="Cetak Laporan Keuangan"
              >
                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Cetak</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Kas Masuk */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-emerald-100 shadow-xs flex items-center justify-between sm:block relative overflow-hidden">
          <div className="flex items-center space-x-3 sm:space-x-0 sm:justify-between sm:mb-2">
            <div className="bg-emerald-100 p-2 sm:p-2.5 rounded-xl text-emerald-700 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block sm:inline">Total Masuk</span>
              <p className="text-[10px] text-slate-400 font-medium sm:hidden">Iuran & Non-Iuran ({selectedYear})</p>
            </div>
          </div>
          <div className="text-right sm:text-left">
            <div className="text-base sm:text-xl font-extrabold text-emerald-700">{formatRupiah(totalKasMasuk)}</div>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Iuran & Non-Iuran ({selectedYear})</p>
          </div>
        </div>

        {/* Pemasukan Non-Iuran */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-teal-100 shadow-xs flex items-center justify-between sm:block relative overflow-hidden">
          <div className="flex items-center space-x-3 sm:space-x-0 sm:justify-between sm:mb-2">
            <div className="bg-teal-100 p-2 sm:p-2.5 rounded-xl text-teal-700 shrink-0">
              <HandCoins className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block sm:inline">Non-Iuran</span>
              <p className="text-[10px] text-slate-400 font-medium sm:hidden">Sponsor / Sisa ({selectedYear})</p>
            </div>
          </div>
          <div className="text-right sm:text-left">
            <div className="text-base sm:text-xl font-extrabold text-teal-700">{formatRupiah(totalPemasukanLain)}</div>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">{pemasukanLainYear.length} Transaksi Pemasukan Lain</p>
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
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-indigo-100 shadow-xs flex items-center justify-between sm:block relative overflow-hidden">
          <div className="flex items-center space-x-3 sm:space-x-0 sm:justify-between sm:mb-2">
            <div className="bg-indigo-100 p-2 sm:p-2.5 rounded-xl text-indigo-700 shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block sm:inline">Saldo Bersih</span>
              <p className="text-[10px] text-slate-400 font-medium sm:hidden">Kas Saat Ini</p>
            </div>
          </div>
          <div className="text-right sm:text-left">
            <div className={`text-base sm:text-xl font-extrabold ${saldoBersih >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
              {formatRupiah(saldoBersih)}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Kas Bersih Saat Ini</p>
          </div>
        </div>
      </div>

      {/* Quick Audit / Rekonsiliasi Real vs Data Bar */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-xl ${isAuditBalance ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">
                Audit Kas ({selectedYear})
              </span>
              <span className="text-xs font-black text-slate-800">
                Data vs Real Keuangan
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

          {/* Saldo Data */}
          <div className="bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[9px] font-medium">Saldo Data (Sistem):</span>
            <span className="font-mono font-bold text-slate-800">{formatRupiah(saldoBersih)}</span>
          </div>

          <span className="text-slate-400 hidden sm:inline">↔</span>

          {/* Uang Cash */}
          <div className="bg-amber-50/60 px-2.5 py-1 rounded-xl border border-amber-200/80">
            <span className="text-amber-800 block text-[9px] font-semibold flex items-center gap-1">
              <Wallet className="w-2.5 h-2.5 text-amber-600" /> Uang Cash:
            </span>
            <span className="font-mono font-bold text-amber-900">{formatRupiah(auditTahunThis.saldoCash || 0)}</span>
          </div>

          <span className="text-slate-400 hidden sm:inline">+</span>

          {/* Uang di Rekening */}
          <div className="bg-indigo-50/60 px-2.5 py-1 rounded-xl border border-indigo-200/80">
            <span className="text-indigo-800 block text-[9px] font-semibold flex items-center gap-1">
              <Landmark className="w-2.5 h-2.5 text-indigo-600" /> Uang di Rekening:
            </span>
            <span className="font-mono font-bold text-indigo-900">{formatRupiah(auditTahunThis.saldoBank || 0)}</span>
          </div>

          <span className="text-slate-400 hidden sm:inline">=</span>

          {/* Total Saldo Real */}
          <div className="bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200">
            <span className="text-teal-800 block text-[9px] font-semibold">Total Real:</span>
            <span className="font-mono font-extrabold text-teal-900">{formatRupiah(totalSaldoReal)}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
          <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase ${
            isAuditBalance
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : isAuditLebih
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-rose-100 text-rose-800 border border-rose-300'
          }`}>
            {isAuditBalance ? '✓ BALANCE' : isAuditLebih ? `+${formatRupiah(selisihAudit)} (Lebih)` : `-${formatRupiah(Math.abs(selisihAudit))} (Kurang)`}
          </span>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            <span>{activeTab === 'audit' ? 'Aktif di Tab Audit' : 'Cek Detail Audit'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs & Search Controls */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200 shadow-xs space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-3">
        
        {/* Tab Buttons Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          
          <button
            id="tab-laporan-matriks"
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
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
            className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
              activeTab === 'kas-masuk'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Kas Masuk Iuran</span>
          </button>

          <button
            id="tab-laporan-pemasukan-lain"
            onClick={() => setActiveTab('pemasukan-lain')}
            className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
              activeTab === 'pemasukan-lain'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5" />
            <span>Pemasukan Non-Iuran</span>
            {pemasukanLainYear.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'pemasukan-lain' ? 'bg-teal-800 text-teal-100' : 'bg-teal-100 text-teal-800'}`}>
                {pemasukanLainYear.length}
              </span>
            )}
          </button>

          <button
            id="tab-laporan-kas-keluar"
            onClick={() => setActiveTab('kas-keluar')}
            className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
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
            className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
              activeTab === 'rekap'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Rekap Bulanan</span>
          </button>

          <button
            id="tab-laporan-audit"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
              activeTab === 'audit'
                ? 'bg-slate-900 text-white shadow-md ring-2 ring-emerald-500/50'
                : 'text-slate-700 bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-200/80'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-emerald-500" />
            <span>Audit Kas (Real vs Data)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              isAuditBalance
                ? (activeTab === 'audit' ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-100 text-emerald-800')
                : (activeTab === 'audit' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-800')
            }`}>
              {isAuditBalance ? 'Balance' : isAuditLebih ? '+Lebih' : '-Kurang'}
            </span>
          </button>

          {isBendahara && (
            <button
              id="tab-laporan-riwayat-hapus"
              onClick={() => setActiveTab('riwayat-hapus')}
              className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
                activeTab === 'riwayat-hapus'
                  ? 'bg-rose-700 text-white shadow-md'
                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60'
              }`}
            >
              <History className="w-3.5 h-3.5 text-rose-500" />
              <span>Riwayat Hapus</span>
              {riwayatHapusList.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'riwayat-hapus' ? 'bg-rose-900 text-rose-100' : 'bg-rose-200 text-rose-900'}`}>
                  {riwayatHapusList.length}
                </span>
              )}
            </button>
          )}

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
                const isUserSchool = (currentUser?.username && sek.idSekolah === currentUser.username) || (userSchoolName && userSchoolName === sek.namaSekolah);

                const monthStatusList = BULAN_LIST.map((bulan) => {
                  const isPaid = iuranYear.some(i => 
                    ((i.idSekolah && sek.idSekolah && i.idSekolah === sek.idSekolah) || 
                     (i.namaSekolah && sek.namaSekolah && i.namaSekolah.toLowerCase().trim() === sek.namaSekolah.toLowerCase().trim())
                    ) &&
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
                      {monthStatusList.map((m, bIdx) => {
                        const matchingIuran = m.isPaid ? iuranYear.find(i => 
                          ((i.idSekolah && sek.idSekolah && i.idSekolah === sek.idSekolah) || 
                           (i.namaSekolah && sek.namaSekolah && i.namaSekolah.toLowerCase().trim() === sek.namaSekolah.toLowerCase().trim())
                          ) &&
                          i.bulan === m.bulan
                        ) : undefined;

                        return (
                          <button
                            key={`m-pill-${sek.idSekolah}-${m.bulan}-${bIdx}`}
                            type="button"
                            disabled={!m.isPaid}
                            onClick={() => {
                              if (m.isPaid && onOpenStrukModal && matchingIuran) {
                                onOpenStrukModal({
                                  jenis: 'iuran',
                                  noKuitansi: matchingIuran.noKuitansi || `KWT-IURAN/${matchingIuran.tahun}/${matchingIuran.id}`,
                                  tanggal: matchingIuran.tanggalInput,
                                  namaSekolah: sek.namaSekolah,
                                  namaKepsek: sek.namaKepsek || '-',
                                  alamatSekolah: `${sek.alamat || ''}, ${sek.kelurahan || ''}`,
                                  tahunBuku: matchingIuran.tahun,
                                  bulanList: [m.bulan],
                                  totalNominal: matchingIuran.nominal,
                                  diinputOleh: resolveNamaBendahara(matchingIuran.diinputOleh, undefined, sekolahList),
                                  keterangan: matchingIuran.keterangan || ''
                                });
                              }
                            }}
                            title={m.isPaid ? `Klik untuk cetak kuitansi bulan ${m.bulan}` : `Bulan ${m.bulan} belum lunas`}
                            className={`text-center py-1 rounded-md text-[9px] font-bold border transition-all ${
                              m.isPaid
                                ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white border-emerald-700 cursor-pointer shadow-2xs'
                                : 'bg-white text-slate-400 border-slate-200 cursor-default'
                            }`}
                          >
                            <div>{BULAN_SINGKAT[bIdx]}</div>
                            <div className="text-[8px] opacity-90">{m.isPaid ? 'LUNAS' : '-'}</div>
                          </button>
                        );
                      })}
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

          {/* DESKTOP TABLE VIEW */}
          <div className={`${matrixViewMode === 'table' ? 'block' : 'hidden sm:block'} overflow-x-auto rounded-xl border border-slate-200`}>
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-extrabold">
                  <th className="py-3.5 px-3 text-center w-10 rounded-tl-xl">No</th>
                  <th className="py-3.5 px-4 min-w-[170px]">Nama Sekolah</th>
                  {BULAN_SINGKAT.map((b, idx) => (
                    <th key={`head-month-${idx}`} className="py-3.5 px-1 text-center w-9 font-mono">
                      {b}
                    </th>
                  ))}
                  <th className="py-3.5 px-3 text-right font-black min-w-[105px]">Lunas</th>
                  <th className="py-3.5 px-3 text-right font-black min-w-[105px] rounded-tr-xl">Tunggakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredSekolah.map((sek, idx) => {
                  let lunasCount = 0;
                  const isUserSchool = (currentUser?.username && sek.idSekolah === currentUser.username) || (userSchoolName && userSchoolName === sek.namaSekolah);

                  const monthStatuses = BULAN_LIST.map(bulan => {
                    const isPaid = iuranYear.some(i => 
                      ((i.idSekolah && sek.idSekolah && i.idSekolah === sek.idSekolah) || 
                       (i.namaSekolah && sek.namaSekolah && i.namaSekolah.toLowerCase().trim() === sek.namaSekolah.toLowerCase().trim())
                      ) &&
                      i.bulan === bulan
                    );
                    if (isPaid) lunasCount++;
                    return isPaid;
                  });

                  const totalBayarNominal = lunasCount * IURAN_PER_BULAN;
                  const totalTunggakanNominal = (12 - lunasCount) * IURAN_PER_BULAN;

                  return (
                    <tr 
                      key={`sek-row-${sek.idSekolah || sek.namaSekolah}-${idx}`}
                      className={`transition-colors ${
                        isUserSchool 
                          ? 'bg-amber-50/90 font-semibold' 
                          : 'hover:bg-teal-50/40'
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 text-xs">{sek.namaSekolah}</div>
                        {sek.namaKepsek && (
                          <div className="text-[10px] text-slate-400">{sek.namaKepsek}</div>
                        )}
                      </td>

                      {monthStatuses.map((isPaid, bIdx) => {
                        const currentBulan = BULAN_LIST[bIdx];
                        const matchingIuran = isPaid ? iuranYear.find(i => 
                          ((i.idSekolah && sek.idSekolah && i.idSekolah === sek.idSekolah) || 
                           (i.namaSekolah && sek.namaSekolah && i.namaSekolah.toLowerCase().trim() === sek.namaSekolah.toLowerCase().trim())
                          ) &&
                          i.bulan === currentBulan
                        ) : undefined;

                        return (
                          <td key={`status-${sek.idSekolah}-${bIdx}`} className="py-3 px-1 text-center">
                            {isPaid ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onOpenStrukModal && matchingIuran) {
                                    onOpenStrukModal({
                                      jenis: 'iuran',
                                      noKuitansi: matchingIuran.noKuitansi || `KWT-IURAN/${matchingIuran.tahun}/${matchingIuran.id}`,
                                      tanggal: matchingIuran.tanggalInput,
                                      namaSekolah: sek.namaSekolah,
                                      namaKepsek: sek.namaKepsek || '-',
                                      alamatSekolah: `${sek.alamat || ''}, ${sek.kelurahan || ''}`,
                                      tahunBuku: matchingIuran.tahun,
                                      bulanList: [currentBulan],
                                      totalNominal: matchingIuran.nominal,
                                      diinputOleh: resolveNamaBendahara(matchingIuran.diinputOleh, undefined, sekolahList),
                                      keterangan: matchingIuran.keterangan || ''
                                    });
                                  }
                                }}
                                title={`Lunas (Bulan ${currentBulan}) - Klik untuk cetak kuitansi`}
                                className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100 hover:bg-emerald-200 active:scale-95 text-emerald-700 font-black text-xs shadow-2xs cursor-pointer transition-transform"
                              >
                                ✓
                              </button>
                            ) : (
                              <span 
                                title={`Belum Lunas (Bulan ${currentBulan})`}
                                className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-400 font-bold text-xs"
                              >
                                -
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-3 px-3 text-right font-black text-emerald-700 text-xs">
                        {formatRupiah(totalBayarNominal)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-xs">
                        <span className={totalTunggakanNominal > 0 ? 'text-rose-600' : 'text-slate-400'}>
                          {formatRupiah(totalTunggakanNominal)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-extrabold text-xs">
                  <td colSpan={2} className="py-3.5 px-4 text-left rounded-bl-xl">
                    <div className="flex items-center space-x-1.5">
                      <span>TOTAL KESELURUHAN ({selectedYear}):</span>
                    </div>
                  </td>
                  {BULAN_LIST.map((bulan, bIdx) => {
                    const monthTotal = iuranYear
                      .filter(i => i.bulan === bulan)
                      .reduce((acc, curr) => acc + curr.nominal, 0);

                    return (
                      <td key={`foot-month-${bIdx}`} className="py-3.5 px-1 text-center font-mono text-[10px]">
                        <span className={`inline-block px-1 py-0.5 rounded ${
                          monthTotal > 0 
                            ? 'text-teal-200 bg-teal-950/80 border border-teal-700/50' 
                            : 'text-slate-400 font-semibold'
                        }`}>
                          {monthTotal > 0 ? `${monthTotal / 1000}k` : '0'}
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-3.5 px-3 text-right bg-slate-950/40">
                    <span className="font-mono text-xs sm:text-sm font-black text-emerald-300 drop-shadow-xs">
                      {formatRupiah(totalIuranMasuk)}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right bg-slate-950/60 rounded-br-xl">
                    <span className="font-mono text-xs sm:text-sm font-black text-rose-300 drop-shadow-xs">
                      {formatRupiah(Math.max(0, (sekolahList.length * 12 * IURAN_PER_BULAN) - totalIuranMasuk))}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      )}

      {/* TAB 2: RINCIAN KAS MASUK IURAN */}
      {activeTab === 'kas-masuk' && (
        <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                Rincian Kas Masuk (Penerimaan Iuran Sekolah)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Tahun Buku {selectedYear}</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[10px] sm:text-[11px] text-slate-500">Total Terbayar ({filteredKasMasuk.length} Transaksi)</div>
              <div className="text-base sm:text-lg font-black text-emerald-600">{formatRupiah(totalIuranMasuk)}</div>
            </div>
          </div>

          {/* Mobile Card List for Kas Masuk */}
          <div className="block sm:hidden space-y-2.5">
            {filteredKasMasuk.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada catatan kas masuk iuran pada tahun {selectedYear}.
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
                  {i.keterangan && (
                    <div className="text-[11px] text-teal-900 bg-teal-50 px-2 py-1 rounded-md border border-teal-200/60 flex items-start space-x-1">
                      <span className="font-bold text-teal-800 shrink-0">Tempat / Ket:</span>
                      <span className="break-words">{i.keterangan}</span>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1.5 border-t border-emerald-100">
                    <span>Diinput: {resolveNamaBendahara(i.diinputOleh, undefined, sekolahList)}</span>
                    <div className="flex items-center space-x-1.5">
                      {onOpenStrukModal && (
                        <button
                          type="button"
                          onClick={() => {
                            const schoolOfItem = sekolahList.find(s => (i.idSekolah && s.idSekolah === i.idSekolah) || s.namaSekolah.toLowerCase().trim() === i.namaSekolah.toLowerCase().trim());
                            onOpenStrukModal({
                              jenis: 'iuran',
                              noKuitansi: i.noKuitansi || `KWT-IURAN/${i.tahun}/${i.id}`,
                              tanggal: i.tanggalInput,
                              namaSekolah: i.namaSekolah,
                              namaKepsek: schoolOfItem?.namaKepsek || '-',
                              alamatSekolah: schoolOfItem ? `${schoolOfItem.alamat || ''}, ${schoolOfItem.kelurahan || ''}` : '-',
                              tahunBuku: i.tahun,
                              bulanList: [i.bulan],
                              totalNominal: i.nominal,
                              diinputOleh: resolveNamaBendahara(i.diinputOleh, undefined, sekolahList),
                              keterangan: i.keterangan || ''
                            });
                          }}
                          className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-emerald-200"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Kuitansi</span>
                        </button>
                      )}
                      {isBendahara && onDeleteIuran && (
                        <button
                          type="button"
                          onClick={() => onDeleteIuran(i)}
                          className="text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-rose-200"
                          title="Hapus Catatan Iuran Ini"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
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
                  <th className="py-3 px-3 min-w-[140px]">Keterangan / Tempat Terima</th>
                  <th className="py-3 px-3 text-center">Diinput Oleh</th>
                  <th className="py-3 px-3 text-center rounded-tr-xl">Aksi</th>
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
                    <td className="py-3 px-3 text-slate-600 text-[11px]">
                      {i.keterangan ? (
                        <span className="text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 font-medium inline-block max-w-[200px] truncate" title={i.keterangan}>
                          {i.keterangan}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-700 font-semibold text-[11px]">{resolveNamaBendahara(i.diinputOleh, undefined, sekolahList)}</td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {onOpenStrukModal && (
                          <button
                            type="button"
                            onClick={() => {
                              const schoolOfItem = sekolahList.find(s => (i.idSekolah && s.idSekolah === i.idSekolah) || s.namaSekolah.toLowerCase().trim() === i.namaSekolah.toLowerCase().trim());
                              onOpenStrukModal({
                                jenis: 'iuran',
                                noKuitansi: i.noKuitansi || `KWT-IURAN/${i.tahun}/${i.id}`,
                                tanggal: i.tanggalInput,
                                namaSekolah: i.namaSekolah,
                                namaKepsek: schoolOfItem?.namaKepsek || '-',
                                alamatSekolah: schoolOfItem ? `${schoolOfItem.alamat || ''}, ${schoolOfItem.kelurahan || ''}` : '-',
                                tahunBuku: i.tahun,
                                bulanList: [i.bulan],
                                totalNominal: i.nominal,
                                diinputOleh: resolveNamaBendahara(i.diinputOleh, undefined, sekolahList),
                                keterangan: i.keterangan || ''
                              });
                            }}
                            className="inline-flex items-center space-x-1 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold text-[11px] transition-colors cursor-pointer"
                            title="Cetak Kuitansi Iuran"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Kuitansi</span>
                          </button>
                        )}
                          {onDeleteIuran && (
                            <button
                              type="button"
                              onClick={() => onDeleteIuran(i)}
                              className="inline-flex items-center space-x-1 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Hapus Catatan Iuran Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold text-xs">
                  <td colSpan={5} className="py-3 px-4 text-right rounded-bl-xl">TOTAL IURAN MASUK ({selectedYear}):</td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-black text-sm">{formatRupiah(totalIuranMasuk)}</td>
                  <td colSpan={isBendahara ? 3 : 2} className="rounded-br-xl"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PEMASUKAN NON-IURAN */}
      {activeTab === 'pemasukan-lain' && (
        <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                Rincian Pemasukan Kas Non-Iuran
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Sponsorship, Sisa Kegiatan, Hibah, Sumbangan & Lain-lain ({selectedYear})</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[10px] sm:text-[11px] text-slate-500">Total Non-Iuran ({filteredPemasukanLain.length} Transaksi)</div>
              <div className="text-base sm:text-lg font-black text-teal-600">{formatRupiah(totalPemasukanLain)}</div>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="block sm:hidden space-y-2.5">
            {filteredPemasukanLain.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada catatan pemasukan non-iuran pada tahun {selectedYear}.
              </div>
            ) : (
              filteredPemasukanLain.map((l, idx) => (
                <div key={`pemasukan-lain-card-${l.id || 'noid'}-${idx}`} className="p-3 rounded-xl border border-teal-100 bg-teal-50/30 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{l.sumberDana}</span>
                    <span className="font-black text-teal-700 bg-teal-100 px-2 py-0.5 rounded text-[11px]">{formatRupiah(l.nominal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-semibold text-[10px]">{l.kategori}</span>
                    <span className="text-slate-500">{formatDateIndonesian(l.tanggal)}</span>
                  </div>
                  {l.keterangan && <p className="text-[11px] text-slate-600">{l.keterangan}</p>}
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1.5 border-t border-teal-100">
                    <span>Diinput: {resolveNamaBendahara(l.diinputOleh, undefined, sekolahList)}</span>
                    <div className="flex items-center space-x-1.5">
                      {isBendahara && onOpenStrukModal && (
                        <button
                          type="button"
                          onClick={() => {
                            const year = new Date(l.tanggal).getFullYear();
                            onOpenStrukModal({
                              jenis: 'pemasukan-lain',
                              noKuitansi: l.noKuitansi || `KWT-IN/MKKS-CITOS/${year}/${l.id}`,
                              tanggal: l.tanggal,
                              namaSekolah: l.sumberDana,
                              sumberDana: l.sumberDana,
                              kategori: l.kategori,
                              keterangan: l.keterangan || `Penerimaan ${l.kategori} dari ${l.sumberDana}`,
                              alamatSekolah: l.keterangan || '-',
                              tahunBuku: year,
                              bulanList: [`Penerimaan ${l.kategori}`],
                              totalNominal: l.nominal,
                              diinputOleh: l.diinputOleh
                            });
                          }}
                          className="text-teal-700 hover:text-teal-900 font-bold flex items-center space-x-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-teal-200"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Kuitansi</span>
                        </button>
                      )}
                      {isBendahara && onDeletePemasukanLain && (
                        <button
                          type="button"
                          onClick={() => onDeletePemasukanLain(l)}
                          className="text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-rose-200"
                          title="Hapus Catatan Pemasukan Ini"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-teal-700 text-white font-bold text-[11px]">
                  <th className="py-3 px-3 rounded-tl-xl">No</th>
                  <th className="py-3 px-3">Tanggal Transaksi</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-4">Sumber Dana / Pihak Terkait</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-3 text-right">Jumlah Nominal</th>
                  <th className={`py-3 px-3 text-center ${!isBendahara ? 'rounded-tr-xl' : ''}`}>Diinput Oleh</th>
                  {isBendahara && (
                    <th className="py-3 px-3 text-center rounded-tr-xl">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPemasukanLain.map((l, idx) => (
                  <tr key={`pemasukan-lain-row-${l.id || 'noid'}-${idx}`} className="hover:bg-teal-50/50 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{formatDateIndonesian(l.tanggal)}</td>
                    <td className="py-3 px-3">
                      <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded font-semibold text-[10px]">
                        {l.kategori}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{l.sumberDana}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">{l.keterangan || '-'}</td>
                    <td className="py-3 px-3 text-right font-black text-teal-700 whitespace-nowrap">{formatRupiah(l.nominal)}</td>
                    <td className="py-3 px-3 text-center text-slate-700 font-semibold text-[11px]">{resolveNamaBendahara(l.diinputOleh, undefined, sekolahList)}</td>
                    {isBendahara && (
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {onOpenStrukModal && (
                            <button
                              type="button"
                              onClick={() => {
                                const year = new Date(l.tanggal).getFullYear();
                                onOpenStrukModal({
                                  jenis: 'pemasukan-lain',
                                  noKuitansi: l.noKuitansi || `KWT-IN/MKKS-CITOS/${year}/${l.id}`,
                                  tanggal: l.tanggal,
                                  namaSekolah: l.sumberDana,
                                  sumberDana: l.sumberDana,
                                  kategori: l.kategori,
                                  keterangan: l.keterangan || `Penerimaan ${l.kategori} dari ${l.sumberDana}`,
                                  alamatSekolah: l.keterangan || '-',
                                  tahunBuku: year,
                                  bulanList: [`Penerimaan ${l.kategori}`],
                                  totalNominal: l.nominal,
                                  diinputOleh: l.diinputOleh
                                });
                              }}
                              className="inline-flex items-center space-x-1 text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Cetak Kuitansi Pemasukan"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Kuitansi</span>
                            </button>
                          )}
                          {onDeletePemasukanLain && (
                            <button
                              type="button"
                              onClick={() => onDeletePemasukanLain(l)}
                              className="inline-flex items-center space-x-1 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Hapus Catatan Pemasukan Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold text-xs">
                  <td colSpan={5} className="py-3 px-4 text-right rounded-bl-xl">TOTAL PEMASUKAN NON-IURAN ({selectedYear}):</td>
                  <td className="py-3 px-3 text-right text-teal-400 font-black text-sm">{formatRupiah(totalPemasukanLain)}</td>
                  <td colSpan={isBendahara ? 2 : 1} className="rounded-br-xl"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RINCIAN KAS KELUAR */}
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
                    <div className="flex items-center space-x-1.5">
                      <span>Diinput: {resolveNamaBendahara(p.diinputOleh, undefined, sekolahList)}</span>
                      {isBendahara && onDeletePengeluaran && (
                        <button
                          type="button"
                          onClick={() => onDeletePengeluaran(p)}
                          className="text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-rose-200"
                          title="Hapus Catatan Pengeluaran Ini"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
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
                  <th className={`py-3 px-3 text-center ${!isBendahara ? 'rounded-tr-xl' : ''}`}>Diinput Oleh</th>
                  {isBendahara && (
                    <th className="py-3 px-3 text-center rounded-tr-xl">Aksi</th>
                  )}
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
                    {isBendahara && (
                      <td className="py-3 px-3 text-center">
                        {onDeletePengeluaran && (
                          <button
                            type="button"
                            onClick={() => onDeletePengeluaran(p)}
                            className="inline-flex items-center space-x-1 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 font-bold text-[11px] transition-colors cursor-pointer"
                            title="Hapus Catatan Pengeluaran Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold text-xs">
                  <td colSpan={4} className="py-3 px-4 text-right rounded-bl-xl">TOTAL KAS KELUAR ({selectedYear}):</td>
                  <td className="py-3 px-3 text-right text-rose-400 font-black text-sm">{formatRupiah(totalKasKeluar)}</td>
                  <td colSpan={isBendahara ? 2 : 1} className="rounded-br-xl"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: REKAP BULANAN & SALDO BERSIH */}
      {activeTab === 'rekap' && (
        <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">
              Rekapitulasi Arus Kas Bulanan ({selectedYear})
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">Perbandingan Pemasukan (Iuran & Non-Iuran), Pengeluaran, dan Net Saldo Kas per Bulan</p>
          </div>

          {/* Mobile Card List for Rekap Bulanan */}
          <div className="block sm:hidden space-y-2.5">
            {BULAN_LIST.map((bulanName, idx) => {
              const monthStr = String(idx + 1).padStart(2, '0');
              const inIuran = iuranYear
                .filter(i => i.bulan === bulanName)
                .reduce((a, b) => a + b.nominal, 0);

              const inLain = pemasukanLainYear
                .filter(l => l.tanggal.split('-')[1] === monthStr)
                .reduce((a, b) => a + b.nominal, 0);

              const totalIn = inIuran + inLain;

              const outVal = pengeluaranYear
                .filter(p => p.tanggal.split('-')[1] === monthStr)
                .reduce((a, b) => a + b.nominal, 0);

              const net = totalIn - outVal;
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
                      <span className="text-[10px] text-slate-500 font-medium block">Total Pemasukan</span>
                      <span className="font-extrabold text-emerald-700 text-xs">{formatRupiah(totalIn)}</span>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        Iuran: {formatRupiah(inIuran)} | Lain: {formatRupiah(inLain)}
                      </div>
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
            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-indigo-800 text-white font-bold text-[11px]">
                  <th className="py-3 px-3 rounded-tl-xl">Bulan</th>
                  <th className="py-3 px-3 text-right">Iuran (Rp)</th>
                  <th className="py-3 px-3 text-right">Non-Iuran (Rp)</th>
                  <th className="py-3 px-3 text-right">Total Masuk (Rp)</th>
                  <th className="py-3 px-3 text-right">Pengeluaran (Rp)</th>
                  <th className="py-3 px-3 text-right">Net Cashflow</th>
                  <th className="py-3 px-3 text-right rounded-tr-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {BULAN_LIST.map((bulanName, idx) => {
                  const monthStr = String(idx + 1).padStart(2, '0');
                  const inIuran = iuranYear
                    .filter(i => i.bulan === bulanName)
                    .reduce((a, b) => a + b.nominal, 0);

                  const inLain = pemasukanLainYear
                    .filter(l => l.tanggal.split('-')[1] === monthStr)
                    .reduce((a, b) => a + b.nominal, 0);

                  const totalIn = inIuran + inLain;

                  const outVal = pengeluaranYear
                    .filter(p => p.tanggal.split('-')[1] === monthStr)
                    .reduce((a, b) => a + b.nominal, 0);

                  const net = totalIn - outVal;

                  return (
                    <tr key={`rekap-row-${bulanName}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{bulanName}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{formatRupiah(inIuran)}</td>
                      <td className="py-2.5 px-3 text-right text-teal-600 font-medium">{formatRupiah(inLain)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatRupiah(totalIn)}</td>
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
                  <td className="py-3 px-3 text-right text-slate-300 font-bold">{formatRupiah(totalIuranMasuk)}</td>
                  <td className="py-3 px-3 text-right text-teal-300 font-bold">{formatRupiah(totalPemasukanLain)}</td>
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

          {/* Audit Kas Real vs Data Highlight Card on Rekap Tab */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-xl ${isAuditBalance ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">
                    Hasil Rekonsiliasi Kas (Saldo Data vs Real Keuangan)
                  </h4>
                  <p className="text-xs text-slate-300">
                    Kesesuaian saldo pembukuan sistem dengan fisik uang tunai & mutasi rekening bank
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                  isAuditBalance 
                    ? 'bg-emerald-600 text-white' 
                    : isAuditLebih 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-rose-600 text-white'
                }`}>
                  {isAuditBalance ? '✓ BALANCE' : isAuditLebih ? `SELISIH LEBIH (+${formatRupiah(selisihAudit)})` : `SELISIH KURANG (-${formatRupiah(Math.abs(selisihAudit))})`}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('audit')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Kelola Audit
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[11px] block">Saldo Menurut Pembukuan:</span>
                <span className="text-sm font-mono font-bold text-white">{formatRupiah(saldoBersih)}</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[11px] block">1. Uang Tunai / Cash (Brankas):</span>
                <span className="text-sm font-mono font-bold text-amber-300">{formatRupiah(auditTahunThis.saldoCash || 0)}</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[11px] block">2. Uang di Rekening ({auditTahunThis.namaBank}):</span>
                <span className="text-sm font-mono font-bold text-indigo-300">{formatRupiah(auditTahunThis.saldoBank || 0)}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB AUDIT & REKONSILIASI KAS (REAL VS DATA) */}
      {activeTab === 'audit' && (
        <AuditRekonsiliasiTab
          selectedYear={selectedYear}
          totalKasMasuk={totalKasMasuk}
          totalKasKeluar={totalKasKeluar}
          saldoData={saldoBersih}
          totalIuranMasuk={totalIuranMasuk}
          totalPemasukanLain={totalPemasukanLain}
          currentAudit={auditTahunThis}
          isBendahara={isBendahara}
          currentUser={currentUser}
          sekolahList={sekolahList}
          onSaveAudit={handleSaveAudit}
          onOpenBeritaAcara={() => setIsBeritaAcaraOpen(true)}
          onOpenSpreadsheetModal={onOpenSpreadsheetModal}
        />
      )}

      {/* TAB 6: LAPORAN RIWAYAT PENGHAPUSAN DATA (AUDIT LOG) */}
      {activeTab === 'riwayat-hapus' && isBendahara && (() => {
        // Filter and sort dataset for Riwayat Hapus (newest deletion first)
        const filteredRiwayatHapus = riwayatHapusList
          .filter(item => {
            // Filter by category
            if (filterJenisHapus !== 'all' && item.jenis !== filterJenisHapus) {
              return false;
            }
            // Filter by search query
            if (searchFilter.trim()) {
              const query = searchFilter.toLowerCase();
              const matchJudul = item.judul?.toLowerCase().includes(query);
              const matchAlasan = item.alasan?.toLowerCase().includes(query);
              const matchUser = item.dihapusOleh?.toLowerCase().includes(query);
              const matchKet = item.keteranganAsli?.toLowerCase().includes(query);
              const matchSekolah = item.namaSekolah?.toLowerCase().includes(query);
              return matchJudul || matchAlasan || matchUser || matchKet || matchSekolah;
            }
            return true;
          })
          .sort((a, b) => {
            const timeA = new Date(a.tanggalHapus || a.timestamp || '').getTime() || 0;
            const timeB = new Date(b.tanggalHapus || b.timestamp || '').getTime() || 0;
            if (timeB !== timeA) return timeB - timeA;
            return String(b.id || '').localeCompare(String(a.id || ''));
          });

        // Summary calculations
        const totalNominalHapus = riwayatHapusList.reduce((acc, curr) => acc + (curr.nominal || 0), 0);
        const countIuranHapus = riwayatHapusList.filter(r => r.jenis === 'iuran').length;
        const countPemasukanLainHapus = riwayatHapusList.filter(r => r.jenis === 'pemasukan-lain').length;
        const countPengeluaranHapus = riwayatHapusList.filter(r => r.jenis === 'pengeluaran').length;

        const getJenisBadge = (jenis: string) => {
          switch (jenis) {
            case 'iuran':
              return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-bold text-[10px]">Iuran Masuk</span>;
            case 'pemasukan-lain':
              return <span className="bg-teal-100 text-teal-800 border border-teal-300 px-2 py-0.5 rounded font-bold text-[10px]">Non-Iuran</span>;
            case 'pengeluaran':
              return <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded font-bold text-[10px]">Kas Keluar</span>;
            default:
              return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px]">{jenis}</span>;
          }
        };

        return (
          <div className="space-y-4">
            {/* Header & Export Actions */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <History className="w-5 h-5 text-rose-600" />
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                      Laporan Riwayat Penghapusan Data
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Audit log lengkap seluruh transaksi yang dihapus beserta tanggal, penanggung jawab, dan alasan penghapusan.
                  </p>
                </div>

                {/* Audit Log Dedicated Export Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => exportRiwayatHapusToExcel(riwayatHapusList)}
                    disabled={riwayatHapusList.length === 0}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    title="Export Audit Log ke Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel Audit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportRiwayatHapusToPDF(riwayatHapusList, currentUser)}
                    disabled={riwayatHapusList.length === 0}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    title="Export Audit Log ke PDF"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF Audit</span>
                  </button>
                </div>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-3">
                  <div className="flex items-center justify-between text-rose-700 text-xs font-semibold">
                    <span>Total Dihapus</span>
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <div className="text-xl font-black text-rose-900 mt-1">
                    {riwayatHapusList.length} <span className="text-xs font-normal text-rose-600">Catatan</span>
                  </div>
                  <p className="text-[10px] text-rose-600 mt-0.5">Semua jenis transaksi</p>
                </div>

                <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3">
                  <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
                    <span>Nominal Dihapus</span>
                    <Wallet className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-sm sm:text-base font-black text-amber-900 mt-1 truncate">
                    {formatRupiah(totalNominalHapus)}
                  </div>
                  <p className="text-[10px] text-amber-600 mt-0.5">Akumulasi nilai transaksi</p>
                </div>

                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3">
                  <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
                    <span>Iuran Masuk</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-xl font-black text-emerald-900 mt-1">
                    {countIuranHapus} <span className="text-xs font-normal text-emerald-600">Items</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Pemasukan kas bulanan</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
                    <span>Non-Iuran & Keluar</span>
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-xl font-black text-slate-800 mt-1">
                    {countPemasukanLainHapus + countPengeluaranHapus} <span className="text-xs font-normal text-slate-500">Items</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{countPemasukanLainHapus} Masuk / {countPengeluaranHapus} Keluar</p>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <button
                  type="button"
                  onClick={() => setFilterJenisHapus('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterJenisHapus === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({riwayatHapusList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterJenisHapus('iuran')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterJenisHapus === 'iuran'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Iuran Masuk ({countIuranHapus})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterJenisHapus('pemasukan-lain')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterJenisHapus === 'pemasukan-lain'
                      ? 'bg-teal-700 text-white'
                      : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                  }`}
                >
                  Non-Iuran ({countPemasukanLainHapus})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterJenisHapus('pengeluaran')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterJenisHapus === 'pengeluaran'
                      ? 'bg-rose-700 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Kas Keluar ({countPengeluaranHapus})
                </button>
              </div>
            </div>

            {/* Content Table / Cards */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
              {/* Empty State */}
              {filteredRiwayatHapus.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm">Tidak ada riwayat penghapusan data</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {searchFilter || filterJenisHapus !== 'all' 
                      ? 'Tidak ada data penghapusan yang cocok dengan filter pencarian saat ini.' 
                      : 'Belum ada transaksi yang pernah dihapus oleh bendahara.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile View */}
                  <div className="block sm:hidden space-y-3">
                    {filteredRiwayatHapus.map((item, idx) => (
                      <div
                        key={`riwayat-hapus-card-${item.id || idx}`}
                        className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/20 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              {getJenisBadge(item.jenis)}
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatDateTimeIndonesian(item.tanggalHapus)}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-xs mt-1">{item.judul}</h4>
                          </div>
                          <span className="font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-[11px] shrink-0">
                            {formatRupiah(item.nominal)}
                          </span>
                        </div>

                        {/* Reason Box */}
                        <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2 text-amber-900 space-y-0.5">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-700 block">
                            Alasan Penghapusan:
                          </span>
                          <p className="text-[11px] font-semibold italic">"{item.alasan}"</p>
                        </div>

                        {/* Meta info */}
                        <div className="text-[10px] text-slate-500 pt-1 border-t border-rose-100 flex items-center justify-between">
                          <span className="flex items-center space-x-1">
                            <UserCheck className="w-3 h-3 text-rose-500" />
                            <span>Dihapus oleh: <strong className="text-slate-800">{item.dihapusOleh}</strong></span>
                          </span>
                          <span className="bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold text-[9px]">
                            {item.role || 'Bendahara'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white font-bold text-[11px]">
                          <th className="py-3 px-3 rounded-tl-xl w-10">No</th>
                          <th className="py-3 px-3 w-28">Waktu Hapus</th>
                          <th className="py-3 px-3 w-24">Jenis</th>
                          <th className="py-3 px-4">Deskripsi Data Asli</th>
                          <th className="py-3 px-3 text-right w-28">Nominal</th>
                          <th className="py-3 px-4">Alasan Penghapusan</th>
                          <th className="py-3 px-3 text-center rounded-tr-xl w-36">Dihapus Oleh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredRiwayatHapus.map((item, idx) => (
                          <tr key={`riwayat-hapus-row-${item.id || idx}`} className="hover:bg-rose-50/40 transition-colors">
                            <td className="py-3 px-3 font-mono font-semibold text-slate-500 text-center">{idx + 1}</td>
                            <td className="py-3 px-3 text-slate-600 whitespace-nowrap text-[11px]">
                              {formatDateTimeIndonesian(item.tanggalHapus)}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {getJenisBadge(item.jenis)}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 text-xs">{item.judul}</div>
                              {item.keteranganAsli && (
                                <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.keteranganAsli}</div>
                              )}
                              {item.tanggalTransaksi && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Tgl Transaksi: {formatDateIndonesian(item.tanggalTransaksi)}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-black text-rose-700 whitespace-nowrap">
                              {formatRupiah(item.nominal)}
                            </td>
                            <td className="py-3 px-4">
                              <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-2 text-[11px] text-amber-900 font-medium italic">
                                "{item.alasan}"
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="font-bold text-slate-800 text-[11px]">{item.dihapusOleh}</div>
                              <span className="inline-block bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5">
                                {item.role || 'Bendahara'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900 text-white font-bold text-xs">
                          <td colSpan={4} className="py-3 px-4 text-right rounded-bl-xl">
                            TOTAL TRANSAKSI DIHAPUS ({filteredRiwayatHapus.length} Item):
                          </td>
                          <td className="py-3 px-3 text-right text-rose-400 font-black text-sm">
                            {formatRupiah(filteredRiwayatHapus.reduce((a, b) => a + (b.nominal || 0), 0))}
                          </td>
                          <td colSpan={2} className="rounded-br-xl"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* PRINT-ONLY COMPLETE REPORT VIEW */}
      <div id="printable-laporan-keuangan" className="hidden print:block space-y-6 text-slate-900 bg-white p-4">
        {/* Kop Surat Resmi */}
        <div className="text-center pb-3 border-b-2 border-slate-800">
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
            Musyawarah Kerja Kepala Sekolah (MKKS)
          </h2>
          <h3 className="text-base font-bold text-teal-800 uppercase tracking-wide">
            Kecamatan Cimanggis dan Tapos • Kota Depok
          </h3>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Laporan Keuangan, Penerimaan Iuran, Pemasukan Non-Iuran & Pengeluaran Kas • Tahun Buku {selectedYear}
          </p>
        </div>

        {/* 4 Financial Health Summary Cards on Print */}
        <div className="grid grid-cols-4 gap-3">
          {/* Total Kas Masuk */}
          <div className="border border-emerald-300 bg-emerald-50/60 rounded-xl p-3">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Masuk</span>
            <div className="text-base font-black text-emerald-700 mt-0.5">{formatRupiah(totalKasMasuk)}</div>
            <p className="text-[9px] text-slate-500 mt-0.5">Iuran & Non-Iuran ({selectedYear})</p>
          </div>

          {/* Non-Iuran */}
          <div className="border border-teal-300 bg-teal-50/60 rounded-xl p-3">
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Non-Iuran</span>
            <div className="text-base font-black text-teal-700 mt-0.5">{formatRupiah(totalPemasukanLain)}</div>
            <p className="text-[9px] text-slate-500 mt-0.5">{pemasukanLainYear.length} Transaksi Non-Iuran</p>
          </div>

          {/* Pengeluaran */}
          <div className="border border-rose-300 bg-rose-50/60 rounded-xl p-3">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Pengeluaran</span>
            <div className="text-base font-black text-rose-700 mt-0.5">{formatRupiah(totalKasKeluar)}</div>
            <p className="text-[9px] text-slate-500 mt-0.5">Operasional ({selectedYear})</p>
          </div>

          {/* Saldo Bersih */}
          <div className={`border rounded-xl p-3 ${saldoBersih >= 0 ? 'border-indigo-300 bg-indigo-50/60' : 'border-rose-300 bg-rose-50/60'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${saldoBersih >= 0 ? 'text-indigo-800' : 'text-rose-800'}`}>Saldo Bersih</span>
            <div className={`text-base font-black mt-0.5 ${saldoBersih >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
              {formatRupiah(saldoBersih)}
            </div>
            <p className="text-[9px] text-slate-500 mt-0.5">{saldoBersih >= 0 ? 'Kas Bersih (Surplus)' : 'Kas Bersih (Defisit)'}</p>
          </div>
        </div>

        {/* 1. Matriks Iuran */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            1. Matriks Status Pembayaran Iuran Per Sekolah (Tahun {selectedYear})
          </h4>
          <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-teal-700 text-white font-bold">
                <th className="p-1.5 border border-teal-800 text-center w-6">No</th>
                <th className="p-1.5 border border-teal-800">Nama Sekolah</th>
                {BULAN_SINGKAT.map(b => (
                  <th key={`print-head-${b}`} className="p-1.5 border border-teal-800 text-center w-8">{b}</th>
                ))}
                <th className="p-1.5 border border-teal-800 text-right">Lunas (Rp)</th>
                <th className="p-1.5 border border-teal-800 text-right">Tunggakan (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {sekolahList.map((s, idx) => {
                let lunasCount = 0;
                const monthsStatus = BULAN_LIST.map(bulan => {
                  const isPaid = iuranYear.some(i => i.idSekolah === s.idSekolah && i.bulan === bulan);
                  if (isPaid) {
                    lunasCount++;
                    return 'V';
                  }
                  return '-';
                });
                const totalLunas = lunasCount * IURAN_PER_BULAN;
                const totalTunggakan = (12 - lunasCount) * IURAN_PER_BULAN;

                return (
                  <tr key={`print-matrix-${s.idSekolah || idx}`} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="p-1.5 border border-slate-300 text-center font-bold">{idx + 1}</td>
                    <td className="p-1.5 border border-slate-300 font-semibold">{s.namaSekolah}</td>
                    {monthsStatus.map((st, sIdx) => (
                      <td key={`print-st-${sIdx}`} className={`p-1.5 border border-slate-300 text-center font-bold ${st === 'V' ? 'text-emerald-700' : 'text-slate-300'}`}>
                        {st}
                      </td>
                    ))}
                    <td className="p-1.5 border border-slate-300 text-right font-bold text-emerald-700">{formatRupiah(totalLunas)}</td>
                    <td className="p-1.5 border border-slate-300 text-right font-bold text-rose-600">{formatRupiah(totalTunggakan)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 2. Pemasukan Non-Iuran (if any) */}
        {pemasukanLainYear.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              2. Rincian Pemasukan Kas Non-Iuran (Tahun {selectedYear})
            </h4>
            <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
              <thead>
                <tr className="bg-teal-700 text-white font-bold">
                  <th className="p-1.5 border border-teal-800 text-center w-6">No</th>
                  <th className="p-1.5 border border-teal-800">Tanggal</th>
                  <th className="p-1.5 border border-teal-800">Kategori</th>
                  <th className="p-1.5 border border-teal-800">Sumber Dana / Pihak</th>
                  <th className="p-1.5 border border-teal-800">Keterangan</th>
                  <th className="p-1.5 border border-teal-800 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {pemasukanLainYear.map((l, idx) => (
                  <tr key={`print-lain-${l.id || idx}`} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="p-1.5 border border-slate-300 text-center">{idx + 1}</td>
                    <td className="p-1.5 border border-slate-300">{formatDateIndonesian(l.tanggal)}</td>
                    <td className="p-1.5 border border-slate-300 font-semibold text-teal-800">{l.kategori}</td>
                    <td className="p-1.5 border border-slate-300 font-bold">{l.sumberDana}</td>
                    <td className="p-1.5 border border-slate-300">{l.keterangan || '-'}</td>
                    <td className="p-1.5 border border-slate-300 text-right font-bold text-teal-700">{formatRupiah(l.nominal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold">
                  <td colSpan={5} className="p-1.5 text-right">TOTAL PEMASUKAN NON-IURAN:</td>
                  <td className="p-1.5 text-right text-teal-300 font-black">{formatRupiah(totalPemasukanLain)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* 3. Kas Keluar Operasional */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            {pemasukanLainYear.length > 0 ? '3' : '2'}. Rincian Kas Keluar (Pengeluaran Operasional {selectedYear})
          </h4>
          <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-rose-700 text-white font-bold">
                <th className="p-1.5 border border-rose-800 text-center w-6">No</th>
                <th className="p-1.5 border border-rose-800">Tanggal</th>
                <th className="p-1.5 border border-rose-800">Alokasi Project / Kegiatan</th>
                <th className="p-1.5 border border-rose-800">Keterangan</th>
                <th className="p-1.5 border border-rose-800 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {pengeluaranYear.map((p, idx) => (
                <tr key={`print-out-${p.id || idx}`} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="p-1.5 border border-slate-300 text-center">{idx + 1}</td>
                  <td className="p-1.5 border border-slate-300">{formatDateIndonesian(p.tanggal)}</td>
                  <td className="p-1.5 border border-slate-300 font-bold">{p.project}</td>
                  <td className="p-1.5 border border-slate-300">{p.keterangan}</td>
                  <td className="p-1.5 border border-slate-300 text-right font-bold text-rose-600">{formatRupiah(p.nominal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800 text-white font-bold">
                <td colSpan={4} className="p-1.5 text-right">TOTAL KAS KELUAR:</td>
                <td className="p-1.5 text-right text-rose-300 font-black">{formatRupiah(totalKasKeluar)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 4. Rekapitulasi Arus Kas & Saldo Akhir */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            {pemasukanLainYear.length > 0 ? '4' : '3'}. Ringkasan Rekapitulasi Arus Kas & Saldo Akhir (Tahun {selectedYear})
          </h4>
          <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="p-2 border border-slate-800">Komponen Arus Kas</th>
                <th className="p-2 border border-slate-800 text-right">Jumlah Nominal (Rp)</th>
                <th className="p-2 border border-slate-800">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-slate-300 font-semibold">Total Penerimaan Iuran Anggota</td>
                <td className="p-2 border border-slate-300 text-right font-bold text-slate-800">{formatRupiah(totalIuranMasuk)}</td>
                <td className="p-2 border border-slate-300 text-slate-600">Iuran 10 Sekolah Anggota MKKS ({iuranYear.length} transaksi)</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-300 font-semibold">Total Pemasukan Kas Non-Iuran</td>
                <td className="p-2 border border-slate-300 text-right font-bold text-teal-700">{formatRupiah(totalPemasukanLain)}</td>
                <td className="p-2 border border-slate-300 text-slate-600">{pemasukanLainYear.length} Transaksi Non-Iuran (Sponsor/Sisa/Donasi)</td>
              </tr>
              <tr className="bg-emerald-50">
                <td className="p-2 border border-slate-300 font-extrabold text-emerald-900">TOTAL KAS MASUK (Iuran + Non-Iuran)</td>
                <td className="p-2 border border-slate-300 text-right font-black text-emerald-700">{formatRupiah(totalKasMasuk)}</td>
                <td className="p-2 border border-slate-300 font-semibold text-emerald-800">Akumulasi Seluruh Penerimaan Dana Kas Masuk</td>
              </tr>
              <tr className="bg-rose-50">
                <td className="p-2 border border-slate-300 font-extrabold text-rose-900">TOTAL KAS KELUAR (Pengeluaran)</td>
                <td className="p-2 border border-slate-300 text-right font-black text-rose-700">{formatRupiah(totalKasKeluar)}</td>
                <td className="p-2 border border-slate-300 font-semibold text-rose-800">Akumulasi Seluruh Belanja & Pengeluaran Operasional</td>
              </tr>
              <tr className={saldoBersih >= 0 ? 'bg-indigo-50' : 'bg-rose-100'}>
                <td className="p-2.5 border border-slate-300 font-black text-xs text-slate-900">SALDO BERSIH KAS AKHIR</td>
                <td className={`p-2.5 border border-slate-300 text-right font-black text-xs ${saldoBersih >= 0 ? 'text-indigo-800' : 'text-rose-700'}`}>
                  {formatRupiah(saldoBersih)}
                </td>
                <td className="p-2.5 border border-slate-300 font-extrabold text-xs text-slate-800">
                  {saldoBersih >= 0 ? 'STATUS: SURPLUS KAS' : 'STATUS: DEFISIT KAS'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 5. Hasil Pemeriksaan & Rekonsiliasi Kas (Real vs Data) */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            {pemasukanLainYear.length > 0 ? '5' : '4'}. Hasil Pemeriksaan & Rekonsiliasi Kas (Real Fisik vs Pembukuan Sistem)
          </h4>
          <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-800 text-white font-bold">
                <th className="p-2 border border-slate-700">Parameter Pemeriksaan</th>
                <th className="p-2 border border-slate-700 text-right">Nominal (Rp)</th>
                <th className="p-2 border border-slate-700">Keterangan / Posisi Fisik</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-slate-300 font-semibold">A. Saldo Menurut Pembukuan Sistem (Data)</td>
                <td className="p-2 border border-slate-300 text-right font-bold text-slate-800">{formatRupiah(saldoBersih)}</td>
                <td className="p-2 border border-slate-300 text-slate-600">Total Kas Masuk dikurangi Total Kas Keluar</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-300 font-semibold">B1. Fisik Uang Tunai (Cash) di Bendahara</td>
                <td className="p-2 border border-slate-300 text-right font-bold text-amber-900">{formatRupiah(auditTahunThis.saldoCash || 0)}</td>
                <td className="p-2 border border-slate-300 text-slate-600">Disimpan dalam Brankas / Kas Kecil Bendahara</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-300 font-semibold">B2. Uang di Rekening Bank ({auditTahunThis.namaBank || 'Bank'})</td>
                <td className="p-2 border border-slate-300 text-right font-bold text-indigo-900">{formatRupiah(auditTahunThis.saldoBank || 0)}</td>
                <td className="p-2 border border-slate-300 text-slate-600">No. Rek: {auditTahunThis.nomorRekening || '-'} a.n. {auditTahunThis.atasNamaRekening || '-'}</td>
              </tr>
              <tr className="bg-teal-50">
                <td className="p-2 border border-slate-300 font-black text-teal-900">B. TOTAL REAL KEBERADAAN DANA (Cash + Bank)</td>
                <td className="p-2 border border-slate-300 text-right font-black text-teal-800">{formatRupiah(totalSaldoReal)}</td>
                <td className="p-2 border border-slate-300 font-bold text-teal-800">Akumulasi uang tunai dan saldo bank riil</td>
              </tr>
              <tr className={isAuditBalance ? 'bg-emerald-100' : 'bg-rose-100'}>
                <td className="p-2.5 border border-slate-300 font-black text-xs">STATUS REKONSILIASI / SELISIH (Real - Data)</td>
                <td className={`p-2.5 border border-slate-300 text-right font-black text-xs ${isAuditBalance ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {isAuditBalance ? 'Rp 0' : (selisihAudit > 0 ? `+${formatRupiah(selisihAudit)}` : `-${formatRupiah(Math.abs(selisihAudit))}`)}
                </td>
                <td className={`p-2.5 border border-slate-300 font-black text-xs ${isAuditBalance ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {isAuditBalance ? '✓ BALANCE (COCOK SEMPURNA)' : (selisihAudit > 0 ? 'SELISIH LEBIH (Uang Real > Data)' : 'SELISIH KURANG (Uang Real < Data)')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 6. Riwayat Penghapusan Data (Audit Log if exists) */}
        {isBendahara && riwayatHapusList.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {pemasukanLainYear.length > 0 ? '6' : '5'}. Catatan Audit Riwayat Penghapusan Data
            </h4>
            <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
              <thead>
                <tr className="bg-rose-800 text-white font-bold">
                  <th className="p-1.5 border border-rose-900 text-center w-6">No</th>
                  <th className="p-1.5 border border-rose-900">Waktu Hapus</th>
                  <th className="p-1.5 border border-rose-900">Jenis</th>
                  <th className="p-1.5 border border-rose-900">Deskripsi Data Asli</th>
                  <th className="p-1.5 border border-rose-900 text-right">Nominal</th>
                  <th className="p-1.5 border border-rose-900">Alasan Penghapusan</th>
                  <th className="p-1.5 border border-rose-900 text-center">Dihapus Oleh</th>
                </tr>
              </thead>
              <tbody>
                {riwayatHapusList.map((r, idx) => (
                  <tr key={`print-hapus-${r.id || idx}`} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="p-1.5 border border-slate-300 text-center">{idx + 1}</td>
                    <td className="p-1.5 border border-slate-300 whitespace-nowrap">{formatDateTimeIndonesian(r.tanggalHapus)}</td>
                    <td className="p-1.5 border border-slate-300 font-bold uppercase text-[9px] text-rose-800">{r.jenis}</td>
                    <td className="p-1.5 border border-slate-300 font-semibold">{r.judul}</td>
                    <td className="p-1.5 border border-slate-300 text-right font-bold text-rose-700">{formatRupiah(r.nominal)}</td>
                    <td className="p-1.5 border border-slate-300 italic text-slate-700">"{r.alasan}"</td>
                    <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-800">{r.dihapusOleh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tanda Tangan */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-slate-800">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold">{auditTahunThis?.jabatanKetuaMkks || pejabatData.jabatanKetuaMkks || 'Ketua MKKS SMP Cimanggis & Tapos'}</p>
            <div className="h-16"></div>
            <p className="font-extrabold underline text-slate-900">
              {auditTahunThis?.namaKetuaMkks || pejabatData.namaKetuaMkks || 'Drs. H. M. Supriyadi, M.Pd'}
            </p>
            {(auditTahunThis?.nipKetuaMkks || pejabatData.nipKetuaMkks) && (
              <p className="text-[10px] text-slate-600">NIP. {auditTahunThis?.nipKetuaMkks || pejabatData.nipKetuaMkks}</p>
            )}
          </div>
          <div className="text-right">
            <p>Depok, {formatDateIndonesian(new Date().toISOString().split('T')[0])}</p>
            <p className="font-bold">{auditTahunThis?.jabatanBendahara || pejabatData.jabatanBendahara || 'Bendahara MKKS SMP Citos'}</p>
            <div className="h-16"></div>
            <p className="font-extrabold underline text-slate-900">
              {auditTahunThis?.namaBendahara || pejabatData.namaBendahara || resolveNamaBendahara(currentUser?.namaKepsek || currentUser?.username, undefined, sekolahList)}
            </p>
            {(auditTahunThis?.nipBendahara || pejabatData.nipBendahara) ? (
              <p className="text-[10px] text-slate-600">NIP. {auditTahunThis?.nipBendahara || pejabatData.nipBendahara}</p>
            ) : (
              <p className="text-[10px] text-slate-600">Petugas Pengelola Keuangan</p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL BERITA ACARA PEMERIKSAAN KAS */}
      <BeritaAcaraAuditModal
        isOpen={isBeritaAcaraOpen}
        onClose={() => setIsBeritaAcaraOpen(false)}
        auditData={auditTahunThis}
        totalKasMasuk={totalKasMasuk}
        totalKasKeluar={totalKasKeluar}
        saldoData={saldoBersih}
        totalIuranMasuk={totalIuranMasuk}
        totalPemasukanLain={totalPemasukanLain}
        sekolahList={sekolahList}
        onUpdateAudit={(updated) => {
          handleSaveAudit(updated);
          setPejabatData(StorageService.getPejabat());
        }}
      />

      {/* MODAL EDIT PEJABAT PENANDATANGAN */}
      <ModalEditPejabat
        isOpen={isPejabatModalOpen}
        onClose={() => setIsPejabatModalOpen(false)}
        onSaved={(updated) => {
          setPejabatData(updated);
          // If current audit exists, also update it
          if (auditTahunThis) {
            handleSaveAudit({
              ...auditTahunThis,
              namaKetuaMkks: updated.namaKetuaMkks,
              nipKetuaMkks: updated.nipKetuaMkks,
              jabatanKetuaMkks: updated.jabatanKetuaMkks,
              namaBendahara: updated.namaBendahara,
              nipBendahara: updated.nipBendahara,
              jabatanBendahara: updated.jabatanBendahara
            });
          }
        }}
      />

    </div>
  );
};
