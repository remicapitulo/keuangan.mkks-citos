import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Sekolah, User, Pengecualian, BULAN_LIST, BULAN_SINGKAT, IURAN_PER_BULAN, DISKON_OPTIONS, KATEGORI_ALASAN_PENGECUALIAN } from '../types';
import { formatRupiah, getCurrentWIBDateString, formatDateIndonesian, getTahunBukuList } from '../utils/formatters';
import { StorageService } from '../services/spreadsheetSync';
import { 
  Percent, 
  Building2, 
  Calendar, 
  HelpCircle, 
  Info, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  Filter, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  X,
  Database,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PengecualianProps {
  sekolahList: Sekolah[];
  pengecualianList: Pengecualian[];
  onSavePengecualian: (item: Omit<Pengecualian, 'id'>) => void;
  onUpdatePengecualian?: (item: Pengecualian) => void;
  onDeletePengecualian?: (id: string) => void;
  currentUser: User | null;
  readOnly?: boolean;
}

export const MenuPengecualian: React.FC<PengecualianProps> = ({
  sekolahList,
  pengecualianList = [],
  onSavePengecualian,
  onUpdatePengecualian,
  onDeletePengecualian,
  currentUser,
  readOnly = false
}) => {
  const currentYear = new Date().getFullYear();
  const availableYears = getTahunBukuList(pengecualianList.map(p => p.tahun));
  const [selectedYear, setSelectedYear] = useState<number>(() => Math.max(2026, currentYear));

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [searchSchoolQuery, setSearchSchoolQuery] = useState<string>('');
  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState<boolean>(false);
  const schoolDropdownRef = useRef<HTMLDivElement>(null);
  const [diskonPersen, setDiskonPersen] = useState<number>(100); // default 100% (bebas penuh)
  const [selectedMonths, setSelectedMonths] = useState<string[]>([...BULAN_LIST]); // default 12 bulan
  const [alasanKategori, setAlasanKategori] = useState<string>('Panitia Kegiatan MKKS');
  const [keterangan, setKeterangan] = useState<string>('');
  const [tanggalInput, setTanggalInput] = useState<string>(() => getCurrentWIBDateString());
  const [noReferensi, setNoReferensi] = useState<string>('');
  
  // UI states
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [filterKategori, setFilterKategori] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const spreadsheetId = StorageService.getSpreadsheetId();
  const scriptUrl = StorageService.getAppsScriptUrl();
  const isRemoteConfigured = Boolean(scriptUrl && scriptUrl.includes('script.google.com'));

  // Close school dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (schoolDropdownRef.current && !schoolDropdownRef.current.contains(event.target as Node)) {
        setIsSchoolDropdownOpen(false);
      }
    };
    if (isSchoolDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSchoolDropdownOpen]);

  // Selected school detail
  const selectedSchool = useMemo(() => {
    return sekolahList.find(s => s.idSekolah === selectedSchoolId);
  }, [sekolahList, selectedSchoolId]);

  // Filtered schools for searchable dropdown in form
  const filteredSchools = useMemo(() => {
    const q = searchSchoolQuery.toLowerCase().trim();
    if (!q) return sekolahList;
    return sekolahList.filter(s => 
      s.namaSekolah.toLowerCase().includes(q) ||
      (s.namaKepsek && s.namaKepsek.toLowerCase().includes(q)) ||
      (s.alamat && s.alamat.toLowerCase().includes(q)) ||
      (s.kelurahan && s.kelurahan.toLowerCase().includes(q)) ||
      (s.kecamatan && s.kecamatan.toLowerCase().includes(q))
    );
  }, [sekolahList, searchSchoolQuery]);

  // Live calculation
  const jumlahBulan = selectedMonths.length;
  const tarifPerBulan = IURAN_PER_BULAN; // Rp 100.000
  const nominalPotongan = Math.round(jumlahBulan * tarifPerBulan * (diskonPersen / 100));

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await StorageService.syncToAppsScript();
      if (res.status === 'connected') {
        showToast('Data Pengecualian & seluruh keuangan berhasil disinkronkan ke Google Sheet!');
      } else {
        showToast(`Info Sinkronisasi: ${res.message}`);
      }
    } catch (err: any) {
      showToast(`Gagal sinkronisasi: ${err.message || 'Periksa koneksi internet'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Month toggle handlers
  const handleToggleMonth = (bulan: string) => {
    if (selectedMonths.includes(bulan)) {
      setSelectedMonths(prev => prev.filter(b => b !== bulan));
    } else {
      setSelectedMonths(prev => [...prev, bulan]);
    }
  };

  const handleSelectAllMonths = () => {
    setSelectedMonths([...BULAN_LIST]);
  };

  const handleSelectSemester1 = () => {
    setSelectedMonths(BULAN_LIST.slice(0, 6) as unknown as string[]);
  };

  const handleSelectSemester2 = () => {
    setSelectedMonths(BULAN_LIST.slice(6, 12) as unknown as string[]);
  };

  const handleClearMonths = () => {
    setSelectedMonths([]);
  };

  // Reset form
  const handleResetForm = () => {
    setEditingId(null);
    setSelectedSchoolId('');
    setSearchSchoolQuery('');
    setIsSchoolDropdownOpen(false);
    setDiskonPersen(100);
    setSelectedMonths([...BULAN_LIST]);
    setAlasanKategori('Panitia Kegiatan MKKS');
    setKeterangan('');
    setTanggalInput(getCurrentWIBDateString());
    setNoReferensi('');
  };

  // Start edit
  const handleStartEdit = (item: Pengecualian) => {
    setEditingId(item.id);
    setSelectedSchoolId(item.idSekolah);
    setSearchSchoolQuery('');
    setIsSchoolDropdownOpen(false);
    setDiskonPersen(item.diskonPersen);
    setSelectedMonths(item.bulanList || []);
    setAlasanKategori(item.alasan || 'Panitia Kegiatan MKKS');
    setKeterangan(item.keterangan || '');
    setTanggalInput(item.tanggalInput || getCurrentWIBDateString());
    setNoReferensi(item.noReferensi || '');
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    if (!selectedSchool) {
      alert('Silakan pilih nama sekolah terlebih dahulu.');
      return;
    }

    if (selectedMonths.length === 0) {
      alert('Pilih minimal 1 bulan untuk pengecualian / potongan.');
      return;
    }

    const payloadData: Omit<Pengecualian, 'id'> = {
      tahun: selectedYear,
      idSekolah: selectedSchool.idSekolah,
      namaSekolah: selectedSchool.namaSekolah,
      diskonPersen,
      bulanList: selectedMonths,
      jumlahBulan: selectedMonths.length,
      nominalTarifPerBulan: tarifPerBulan,
      nominalPotongan,
      alasan: alasanKategori,
      keterangan: keterangan.trim(),
      tanggalInput,
      diinputOleh: currentUser?.namaKepsek || currentUser?.username || 'Bendahara MKKS',
      noReferensi: noReferensi.trim() || undefined
    };

    if (editingId && onUpdatePengecualian) {
      onUpdatePengecualian({
        ...payloadData,
        id: editingId
      });
      showToast(`Data pengecualian ${selectedSchool.namaSekolah} berhasil diperbarui.`);
    } else {
      onSavePengecualian(payloadData);
      showToast(`Pengecualian ${diskonPersen}% untuk ${selectedSchool.namaSekolah} berhasil disimpan.`);
    }

    handleResetForm();
    setIsFormOpen(false);
  };

  // Delete handler
  const handleConfirmDelete = (id: string) => {
    if (onDeletePengecualian) {
      onDeletePengecualian(id);
    }
    setDeleteConfirmId(null);
  };

  // Filtered list by year and search
  const pengecualianYear = useMemo(() => {
    return pengecualianList.filter(p => p.tahun === selectedYear);
  }, [pengecualianList, selectedYear]);

  const filteredPengecualian = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    return pengecualianYear.filter(p => {
      const matchQuery = !q || 
        p.namaSekolah.toLowerCase().includes(q) ||
        p.alasan.toLowerCase().includes(q) ||
        (p.keterangan || '').toLowerCase().includes(q) ||
        (p.noReferensi || '').toLowerCase().includes(q);

      const matchKategori = filterKategori === 'all' || p.alasan === filterKategori;
      return matchQuery && matchKategori;
    });
  }, [pengecualianYear, searchFilter, filterKategori]);

  // Statistics
  const totalPotonganYear = useMemo(() => {
    return pengecualianYear.reduce((acc, curr) => acc + curr.nominalPotongan, 0);
  }, [pengecualianYear]);

  const uniqueSekolahCount = useMemo(() => {
    return new Set(pengecualianYear.map(p => p.idSekolah)).size;
  }, [pengecualianYear]);

  const totalBulanTerdampak = useMemo(() => {
    return pengecualianYear.reduce((acc, curr) => acc + curr.jumlahBulan, 0);
  }, [pengecualianYear]);

  const rataRataDiskon = useMemo(() => {
    if (pengecualianYear.length === 0) return 0;
    const sum = pengecualianYear.reduce((acc, curr) => acc + curr.diskonPersen, 0);
    return Math.round(sum / pengecualianYear.length);
  }, [pengecualianYear]);

  // Export to Excel
  const handleExportExcel = () => {
    const rows = pengecualianYear.map((p, idx) => ({
      'No': idx + 1,
      'Tahun Buku': p.tahun,
      'Nama Sekolah': p.namaSekolah,
      'Diskon (%)': `${p.diskonPersen}%`,
      'Pilihan Bulan': Array.isArray(p.bulanList) ? p.bulanList.join(', ') : '-',
      'Jumlah Bulan': p.jumlahBulan,
      'Tarif Per Bulan (Rp)': p.nominalTarifPerBulan,
      'Potongan Kebijakan (Rp)': p.nominalPotongan,
      'Alasan Kebijakan': p.alasan,
      'Keterangan Tambahan': p.keterangan || '-',
      'No. Referensi / SK': p.noReferensi || '-',
      'Tanggal Input': formatDateIndonesian(p.tanggalInput),
      'Diinput Oleh': p.diinputOleh
    }));

    rows.push({
      'No': '',
      'Tahun Buku': selectedYear,
      'Nama Sekolah': 'TOTAL POTONGAN KEBIJAKAN',
      'Diskon (%)': '',
      'Pilihan Bulan': '',
      'Jumlah Bulan': totalBulanTerdampak,
      'Tarif Per Bulan (Rp)': '',
      'Potongan Kebijakan (Rp)': totalPotonganYear,
      'Alasan Kebijakan': '',
      'Keterangan Tambahan': '',
      'No. Referensi / SK': '',
      'Tanggal Input': '',
      'Diinput Oleh': ''
    } as any);

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Pengecualian ${selectedYear}`);
    XLSX.writeFile(wb, `MKKS_Citos_Pengecualian_Kebijakan_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-sm font-semibold animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-teal-100 mb-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Kebijakan Manajemen MKKS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pengecualian & Potongan Kebijakan
            </h1>
            <p className="text-teal-100/90 text-xs sm:text-sm max-w-2xl mt-1.5 leading-relaxed">
              Pencatatan diskon kebijakan bagi sekolah yang menjadi Panitia Kegiatan, Pengurus Inti MKKS, atau mengalami kendala keuangan operasional.
            </p>
          </div>

          {/* Action buttons & Year filter */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            {/* Year Selector */}
            <div className="flex items-center bg-white/20 backdrop-blur-md rounded-2xl px-3 py-1.5 border border-white/25">
              <Calendar className="w-4 h-4 text-emerald-200 mr-2" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-white font-extrabold text-sm focus:outline-none cursor-pointer"
              >
                {availableYears.map(year => (
                  <option key={year} value={year} className="text-slate-800">
                    Tahun {year}
                  </option>
                ))}
              </select>
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  if (isFormOpen && editingId) {
                    handleResetForm();
                  }
                  setIsFormOpen(!isFormOpen);
                }}
                className="flex items-center space-x-2 px-4 py-2.5 bg-white text-teal-800 font-extrabold text-xs sm:text-sm rounded-2xl shadow-md hover:bg-teal-50 transition-all cursor-pointer"
              >
                {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{isFormOpen ? 'Tutup Form' : 'Tambah Pengecualian'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-bold text-xs sm:text-sm rounded-2xl border border-white/20 transition-all cursor-pointer"
              title="Export Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>

        {/* FINANCIAL NOTICE BANNER */}
        <div className="mt-5 p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 flex items-start space-x-3 text-xs text-teal-50">
          <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-extrabold text-white">Prinsip Akuntansi Pengecualian: </span>
            Nilai potongan pada menu ini menjadi <strong>pengurangan total keuangan secara keseluruhan</strong> (seperti pos potongan/kebijakan),{' '}
            <span className="underline decoration-amber-300 font-bold">tanpa mengubah nominal inputan bayar iuran</span> (pembayaran tetap tercatat normal) dan{' '}
            <span className="underline decoration-amber-300 font-bold">tidak dimasukkan ke kas keluar riil</span>.
          </div>
        </div>
      </div>

      {/* GOOGLE SHEETS SYNC STATUS BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${isRemoteConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' : 'bg-amber-50 text-amber-700 border border-amber-200/80'}`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-800 text-sm">
                {isRemoteConfigured ? 'Database Google Sheets Aktif' : 'Penyimpanan Lokal Browser'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isRemoteConfigured ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                {isRemoteConfigured ? 'Tersambung (Sheet: Pengecualian)' : 'Mode Lokal Browser'}
              </span>
            </div>
            <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
              {isRemoteConfigured 
                ? 'Inputan pengecualian otomatis tersimpan aman di browser dan disinkronkan ke Google Spreadsheet.'
                : 'Data pengecualian tersimpan di browser ini. Perbarui kode Google Apps Script untuk menghubungkan langsung ke Google Sheet.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
            title="Kirim dan sinkronkan data ke Google Sheet sekarang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
          </button>
        </div>
      </div>

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
            <Percent className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Potongan ({selectedYear})</div>
            <div className="text-base sm:text-lg font-extrabold text-teal-800 truncate">
              {formatRupiah(totalPotonganYear)}
            </div>
            <div className="text-[10px] text-teal-600 font-medium">Pengurang Buku Kas</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sekolah Terbantu</div>
            <div className="text-base sm:text-lg font-extrabold text-slate-800 truncate">
              {uniqueSekolahCount} <span className="text-xs font-normal text-slate-500">Sekolah</span>
            </div>
            <div className="text-[10px] text-slate-500">Dari {sekolahList.length} anggota MKKS</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bulan Tercover</div>
            <div className="text-base sm:text-lg font-extrabold text-slate-800 truncate">
              {totalBulanTerdampak} <span className="text-xs font-normal text-slate-500">Bulan</span>
            </div>
            <div className="text-[10px] text-slate-500">Akumulasi durasi diskon</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rata-rata Diskon</div>
            <div className="text-base sm:text-lg font-extrabold text-slate-800 truncate">
              {rataRataDiskon}%
            </div>
            <div className="text-[10px] text-slate-500">
              {pengecualianYear.length} catatan kebijakan
            </div>
          </div>
        </div>
      </div>

      {/* INPUT / EDIT FORM SECTION */}
      {isFormOpen && !readOnly && (
        <div className="bg-white rounded-3xl border border-teal-200 shadow-md p-5 sm:p-7 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
                {editingId ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {editingId ? 'Edit Pengecualian / Potongan Kebijakan' : 'Input Pengecualian & Potongan Baru'}
                </h2>
                <p className="text-xs text-slate-500">
                  Tahun Buku {selectedYear} • Standar Iuran Rp {formatRupiah(tarifPerBulan)}/bulan
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                handleResetForm();
                setIsFormOpen(false);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Kolom 1: Sekolah, Diskon, dan Referensi */}
              <div className="space-y-5">
                {/* 1. INPUT NAMA SEKOLAH DENGAN FITUR PENCARIAN KATA KUNCI */}
                <div className="relative space-y-1.5" ref={schoolDropdownRef}>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    1. Nama Sekolah Anggota <span className="text-rose-500">*</span>
                  </label>

                  {/* Trigger Box */}
                  <div
                    onClick={() => {
                      setIsSchoolDropdownOpen(prev => !prev);
                    }}
                    className={`w-full bg-slate-50 hover:bg-slate-100/90 border rounded-2xl p-3 flex items-center justify-between cursor-pointer transition-all shadow-xs ${
                      isSchoolDropdownOpen 
                        ? 'border-teal-500 ring-2 ring-teal-500/20 bg-white' 
                        : selectedSchool 
                        ? 'border-teal-400/80 bg-teal-50/40' 
                        : 'border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <Building2 className={`w-5 h-5 shrink-0 ${selectedSchool ? 'text-teal-600' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        {selectedSchool ? (
                          <>
                            <div className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                              {selectedSchool.namaSekolah}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              Kepsek: <span className="font-semibold text-slate-700">{selectedSchool.namaKepsek || '-'}</span>
                              {selectedSchool.kelurahan ? ` • ${selectedSchool.kelurahan}` : ''}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-semibold text-slate-400 text-xs sm:text-sm truncate">
                              -- Klik untuk mencari nama sekolah penerima --
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              Ketik kata kunci untuk mencari dari {sekolahList.length} sekolah
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                        <Search className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Searchable Dropdown Popover */}
                  {isSchoolDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-teal-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-80 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                      {/* Search Input Box */}
                      <div className="p-3 bg-slate-50 border-b border-slate-200">
                        <div className="relative">
                          <Search className="w-4 h-4 text-teal-600 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Ketik nama sekolah, kepsek, atau kelurahan..."
                            value={searchSchoolQuery}
                            onChange={(e) => setSearchSchoolQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all placeholder:text-slate-400 placeholder:font-normal"
                            autoFocus
                          />
                          {searchSchoolQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchSchoolQuery('')}
                              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                              title="Hapus pencarian"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
                          <span>Menemukan <strong>{filteredSchools.length}</strong> sekolah</span>
                          {searchSchoolQuery && (
                            <span className="text-teal-700 font-bold truncate max-w-[150px]">
                              Kata kunci: "{searchSchoolQuery}"
                            </span>
                          )}
                        </div>
                      </div>

                      {/* List of Schools */}
                      <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-60">
                        {filteredSchools.length === 0 ? (
                          <div className="p-6 text-center text-slate-500 text-xs space-y-1">
                            <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                            <div className="font-bold text-slate-700">Sekolah Tidak Ditemukan</div>
                            <p className="text-[11px] text-slate-400">
                              Tidak ada sekolah yang cocok dengan kata kunci "{searchSchoolQuery}".
                            </p>
                          </div>
                        ) : (
                          filteredSchools.map((s, idx) => {
                            const isSelected = selectedSchoolId === s.idSekolah;
                            return (
                              <div
                                key={`sch-opt-${s.idSekolah || s.namaSekolah}-${idx}`}
                                onClick={() => {
                                  setSelectedSchoolId(s.idSekolah);
                                  setIsSchoolDropdownOpen(false);
                                  setSearchSchoolQuery('');
                                }}
                                className={`p-3 hover:bg-teal-50 cursor-pointer transition-colors flex items-center justify-between ${
                                  isSelected ? 'bg-teal-50/90 font-bold border-l-4 border-teal-600' : ''
                                }`}
                              >
                                <div className="min-w-0 pr-3">
                                  <div className="text-xs font-bold text-slate-800 truncate">
                                    {s.namaSekolah}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                    Kepsek: <span className="font-semibold text-slate-700">{s.namaKepsek || '-'}</span>
                                    {s.kelurahan ? ` • ${s.kelurahan}` : ''}
                                    {s.kontak ? ` • WA: ${s.kontak}` : ''}
                                  </div>
                                </div>
                                {isSelected ? (
                                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selected School Info Card */}
                  {selectedSchool && (
                    <div className="mt-2.5 p-3 bg-teal-50/70 border border-teal-200/70 rounded-2xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-extrabold text-teal-900">{selectedSchool.namaSekolah}</div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSchoolDropdownOpen(true);
                            setSearchSchoolQuery('');
                          }}
                          className="text-[11px] text-teal-700 font-bold hover:underline flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded-lg border border-teal-200 shadow-2xs"
                        >
                          <Search className="w-3 h-3" />
                          <span>Ganti Sekolah</span>
                        </button>
                      </div>
                      <div className="text-slate-600">
                        Kepala Sekolah: <span className="font-semibold text-slate-800">{selectedSchool.namaKepsek}</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {selectedSchool.alamat} • {selectedSchool.kelurahan}, {selectedSchool.kecamatan}
                        {selectedSchool.kontak ? ` • WA: ${selectedSchool.kontak}` : ''}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. DISKON (0% hingga 100% kelipatan 5) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      2. Diskon Kebijakan (%) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                      {diskonPersen}% {diskonPersen === 100 ? '• Bebas Penuh' : diskonPersen === 50 ? '• Diskon 50%' : ''}
                    </span>
                  </div>

                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {[100, 75, 50, 25, 10, 0].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setDiskonPersen(val)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          diskonPersen === val
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {val === 100 ? '100% (Penuh)' : `${val}%`}
                      </button>
                    ))}
                  </div>

                  {/* Dropdown kelipatan 5 dari 0% hingga 100% */}
                  <select
                    value={diskonPersen}
                    onChange={(e) => setDiskonPersen(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all cursor-pointer"
                  >
                    {DISKON_OPTIONS.map(d => (
                      <option key={d} value={d}>
                        {d}% {d === 100 ? '(Bebas Penuh / Panitia Inti)' : d === 50 ? '(Diskon Separuh / 50%)' : d === 0 ? '(0% - Tanpa Potongan)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. ALASAN / KATEGORI KEBIJAKAN */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                    4. Alasan / Kategori Kebijakan <span className="text-rose-500">*</span>
                  </label>

                  {/* Quick Reason Chips */}
                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    {KATEGORI_ALASAN_PENGECUALIAN.map(kat => (
                      <button
                        key={kat}
                        type="button"
                        onClick={() => setAlasanKategori(kat)}
                        className={`p-2.5 text-xs font-bold rounded-xl border text-left transition-all cursor-pointer ${
                          alasanKategori === kat
                            ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-2xs font-extrabold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {kat}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={alasanKategori}
                    onChange={(e) => setAlasanKategori(e.target.value)}
                    placeholder="Contoh: Panitia MKKS, Pengurus, Kendala Keuangan"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                  />
                </div>

                {/* Keterangan Tambahan / Nomor SK */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      No. Referensi / SK / Rapat
                    </label>
                    <input
                      type="text"
                      value={noReferensi}
                      onChange={(e) => setNoReferensi(e.target.value)}
                      placeholder="Contoh: SK-04/PAN-MKKS/2026"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tanggal Keputusan / Input
                    </label>
                    <input
                      type="date"
                      value={tanggalInput}
                      onChange={(e) => setTanggalInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Keterangan Rinci / Catatan Tambahan
                  </label>
                  <textarea
                    rows={2}
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    placeholder="Contoh: Terlibat sebagai Ketua Panitia Kegiatan O2SN tingkat SMP Citos tahun 2026."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                  />
                </div>
              </div>

              {/* Kolom 2: 3. JUMLAH BULAN & PILIHAN BULAN + LIVE PREVIEW */}
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      3. Pilihan Bulan & Jumlah Bulan <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Terpilih: {selectedMonths.length} Bulan
                    </span>
                  </div>

                  {/* Quick Select Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <button
                      type="button"
                      onClick={handleSelectAllMonths}
                      className="px-2.5 py-1 text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer"
                    >
                      1 Tahun (12 Bln)
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectSemester1}
                      className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Semester 1 (Jan-Jun)
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectSemester2}
                      className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Semester 2 (Jul-Des)
                    </button>
                    <button
                      type="button"
                      onClick={handleClearMonths}
                      className="px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      Reset Bulan
                    </button>
                  </div>

                  {/* Checkbox Grid for 12 Bulan */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-56 overflow-y-auto">
                    {BULAN_LIST.map((bulan, idx) => {
                      const isChecked = selectedMonths.includes(bulan);
                      return (
                        <button
                          key={bulan}
                          type="button"
                          onClick={() => handleToggleMonth(bulan)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'bg-white text-slate-700 hover:bg-teal-50 border border-slate-200'
                          }`}
                        >
                          <span>{idx + 1}. {BULAN_SINGKAT[idx]}</span>
                          {isChecked ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                          ) : (
                            <span className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* LIVE CALCULATION PREVIEW BOX */}
                <div className="bg-gradient-to-br from-slate-900 to-teal-950 text-white rounded-2xl p-5 shadow-inner space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-teal-300">
                      Rincian Simulasi Potongan
                    </span>
                    <span className="text-[10px] bg-teal-500/20 text-teal-200 px-2 py-0.5 rounded-full border border-teal-500/30 font-bold">
                      Tahun {selectedYear}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Tarif Standar Iuran:</span>
                      <span className="font-bold text-white">{formatRupiah(tarifPerBulan)} / bulan</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Jumlah Bulan Terpilih:</span>
                      <span className="font-bold text-white">{jumlahBulan} Bulan</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Total Tagihan Normal:</span>
                      <span className="font-bold text-slate-300">{formatRupiah(jumlahBulan * tarifPerBulan)}</span>
                    </div>
                    <div className="flex justify-between items-center text-teal-200">
                      <span>Tingkat Diskon Kebijakan:</span>
                      <span className="font-extrabold text-teal-300">{diskonPersen}%</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/15 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-teal-200">Total Potongan Pengecualian:</div>
                      <div className="text-[10px] text-slate-400">Pengurangan pembukuan kas</div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-400">
                      {formatRupiah(nominalPotongan)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FORM ACTION BUTTONS */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  handleResetForm();
                  setIsFormOpen(false);
                }}
                className="px-5 py-2.5 rounded-2xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingId ? 'Simpan Perubahan' : 'Simpan Pengecualian'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Cari sekolah, alasan, atau SK..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="all">Semua Kategori Alasan</option>
            {KATEGORI_ALASAN_PENGECUALIAN.map(kat => (
              <option key={kat} value={kat}>{kat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE / LIST OF PENGECUALIAN */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              Daftar Pengecualian & Potongan Kebijakan
            </h3>
            <p className="text-xs text-slate-500">
              Tahun Buku {selectedYear} • {filteredPengecualian.length} data ditemukan
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-500 block">Total Potongan Terdaftar</span>
            <span className="text-sm sm:text-base font-extrabold text-teal-800">
              {formatRupiah(filteredPengecualian.reduce((acc, curr) => acc + curr.nominalPotongan, 0))}
            </span>
          </div>
        </div>

        {filteredPengecualian.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Percent className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Belum Ada Catatan Pengecualian</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ada data pengecualian atau diskon kebijakan untuk kriteria pencarian ini di tahun buku {selectedYear}.
            </p>
            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  handleResetForm();
                  setIsFormOpen(true);
                }}
                className="mt-2 px-4 py-2 bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-teal-800 transition-colors cursor-pointer"
              >
                + Tambah Pengecualian Baru
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Sekolah</th>
                  <th className="py-3 px-4 text-center">Diskon</th>
                  <th className="py-3 px-4">Bulan Pengecualian</th>
                  <th className="py-3 px-4">Alasan & SK</th>
                  <th className="py-3 px-4 text-right">Nilai Potongan</th>
                  <th className="py-3 px-4">Petugas & Tgl</th>
                  {!readOnly && <th className="py-3 px-4 text-center w-24">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPengecualian.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-teal-50/40 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900">{item.namaSekolah}</div>
                      <div className="text-[11px] text-slate-500">
                        {sekolahList.find(s => s.idSekolah === item.idSekolah)?.namaKepsek || ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-extrabold text-[11px] ${
                        item.diskonPersen === 100
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.diskonPersen >= 50
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {item.diskonPersen}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">
                        {item.jumlahBulan} Bulan
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1 max-w-xs">
                        {Array.isArray(item.bulanList) && item.bulanList.length > 0 
                          ? item.bulanList.map(b => b.substring(0, 3)).join(', ') 
                          : '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.alasan}</div>
                      {item.noReferensi && (
                        <div className="text-[10px] text-teal-700 font-semibold">{item.noReferensi}</div>
                      )}
                      {item.keterangan && (
                        <div className="text-[10px] text-slate-500 italic max-w-xs truncate">{item.keterangan}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-extrabold text-emerald-700">
                        {formatRupiah(item.nominalPotongan)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Pengurangan
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      <div className="font-semibold text-slate-800">{item.diinputOleh}</div>
                      <div className="text-[10px] text-slate-400">{formatDateIndonesian(item.tanggalInput)}</div>
                    </td>
                    {!readOnly && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl w-fit">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Hapus Data Pengecualian?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Data pengecualian ini akan dihapus dari daftar dan nilai pengurangannya tidak akan lagi memotong total keuangan.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
