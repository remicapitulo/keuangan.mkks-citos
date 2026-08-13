import React, { useState, useEffect } from 'react';
import { Sekolah, Iuran, BULAN_LIST, IURAN_PER_BULAN, PaketDurasi, User } from '../types';
import { formatRupiah, formatDateIndonesian } from '../utils/formatters';
import { Search, CheckCircle2, AlertCircle, Printer, History, PlusCircle, CheckSquare, Calendar, Building2 } from 'lucide-react';

interface InputIuranProps {
  sekolahList: Sekolah[];
  iuranList: Iuran[];
  onSaveIuran: (newIuranList: Omit<Iuran, 'id'>[], noKuitansi: string) => void;
  onOpenStrukModal: (kuitansiData: any) => void;
  selectedSchoolNameFromDashboard?: string;
  currentUser?: User | null;
}

const PAKET_LIST: PaketDurasi[] = [
  { label: '1 Bulan (Rp 100.000)', bulanCount: 1, nominal: 100000 },
  { label: '2 Bulan (Rp 200.000)', bulanCount: 2, nominal: 200000 },
  { label: '3 Bulan (Rp 300.000)', bulanCount: 3, nominal: 300000 },
  { label: '6 Bulan / 1 Semester (Rp 600.000)', bulanCount: 6, nominal: 600000 },
  { label: '1 Tahun / 12 Bulan (Rp 1.200.000)', bulanCount: 12, nominal: 1200000 },
];

export const InputIuran: React.FC<InputIuranProps> = ({
  sekolahList,
  iuranList,
  onSaveIuran,
  onOpenStrukModal,
  selectedSchoolNameFromDashboard,
  currentUser
}) => {
  const currentYear = new Date().getFullYear();

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [tahunBuku, setTahunBuku] = useState<number>(currentYear);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedPaketIndex, setSelectedPaketIndex] = useState<number>(0);
  const [searchSchoolQuery, setSearchSchoolQuery] = useState<string>('');
  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set initial selected school if passed from dashboard
  useEffect(() => {
    if (selectedSchoolNameFromDashboard) {
      const match = sekolahList.find(s => s.namaSekolah === selectedSchoolNameFromDashboard);
      if (match) {
        setSelectedSchoolId(match.idSekolah);
      }
    }
  }, [selectedSchoolNameFromDashboard, sekolahList]);

  // Helper function to match iuran record to a school reliably
  const isMatchSchool = (i: Iuran, school?: Sekolah) => {
    if (!school) return false;
    if (i.idSekolah && school.idSekolah && i.idSekolah === school.idSekolah) return true;
    if (!i.namaSekolah || !school.namaSekolah) return false;
    const a = i.namaSekolah.trim().toLowerCase();
    const b = school.namaSekolah.trim().toLowerCase();
    return a === b || a.includes(b) || b.includes(a);
  };

  // Selected school object (or undefined if none chosen)
  const activeSchool = sekolahList.find(s => s.idSekolah === selectedSchoolId);

  // Already paid months for this school & year
  const paidMonthsForSchoolAndYear = iuranList
    .filter(i => isMatchSchool(i, activeSchool) && Number(i.tahun) === Number(tahunBuku))
    .map(i => i.bulan);

  // Unpaid months
  const unpaidMonths = BULAN_LIST.filter(b => !paidMonthsForSchoolAndYear.includes(b));

  // Handle Paket change: Auto-select the first N unpaid months
  const handlePaketSelect = (index: number) => {
    setSelectedPaketIndex(index);
    const count = PAKET_LIST[index].bulanCount;
    const monthsToSelect = unpaidMonths.slice(0, count);
    setSelectedMonths(monthsToSelect);
    setErrorMsg(null);
  };

  // Toggle single month selection with duplicate validation
  const handleToggleMonth = (bulan: string) => {
    setErrorMsg(null);

    // If month is already paid, prevent selection!
    if (paidMonthsForSchoolAndYear.includes(bulan)) {
      setErrorMsg(`Bulan ${bulan} sudah lunas terbayar untuk ${activeSchool?.namaSekolah || 'Sekolah'} tahun ${tahunBuku}. Inputan tidak boleh dobel bulan iuran!`);
      return;
    }

    if (selectedMonths.includes(bulan)) {
      setSelectedMonths(prev => prev.filter(b => b !== bulan));
    } else {
      setSelectedMonths(prev => [...prev, bulan]);
    }
  };

  // Submit Handler
  const handleSubmitPembukuan = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!activeSchool) {
      setErrorMsg('Silakan pilih nama sekolah terlebih dahulu.');
      return;
    }

    if (selectedMonths.length === 0) {
      setErrorMsg('Pilih minimal 1 bulan iuran yang akan dibayarkan.');
      return;
    }

    // Double check duplicate months validation
    const duplicates = selectedMonths.filter(b => paidMonthsForSchoolAndYear.includes(b));
    if (duplicates.length > 0) {
      setErrorMsg(`Bulan ${duplicates.join(', ')} sudah terbayar sebelumnya. Inputan tidak boleh dobel bulan iuran!`);
      return;
    }

    // Generate Kuitansi No
    const timestamp = Date.now();
    const noKuitansi = `KWT/MKKS-CITOS/${tahunBuku}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${timestamp.toString().slice(-4)}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const currentBendaharaName = currentUser?.namaKepsek || currentUser?.username || 'Bendahara MKKS';

    // Build new iuran records
    const newItems = selectedMonths.map(bulan => ({
      tahun: tahunBuku,
      bulan,
      idSekolah: activeSchool.idSekolah,
      namaSekolah: activeSchool.namaSekolah,
      nominal: IURAN_PER_BULAN,
      tanggalInput: todayStr,
      diinputOleh: currentBendaharaName,
      noKuitansi
    }));

    // Save to store
    onSaveIuran(newItems, noKuitansi);

    // Prepare Struk Modal Data
    const totalNominal = selectedMonths.length * IURAN_PER_BULAN;
    const kuitansiData = {
      noKuitansi,
      tanggal: todayStr,
      namaSekolah: activeSchool.namaSekolah,
      namaKepsek: activeSchool.namaKepsek,
      alamatSekolah: `${activeSchool.alamat}, Kel. ${activeSchool.kelurahan}, Kec. ${activeSchool.kecamatan}`,
      tahunBuku,
      bulanList: selectedMonths,
      totalNominal,
      diinputOleh: currentBendaharaName
    };

    // Open Struk Receipt Popup
    onOpenStrukModal(kuitansiData);

    // Reset form selection
    setSelectedMonths([]);
  };

  // Payment history for active school
  const historyForActiveSchool = iuranList
    .filter(i => isMatchSchool(i, activeSchool))
    .sort((a, b) => new Date(b.tanggalInput).getTime() - new Date(a.tanggalInput).getTime());

  // Filter schools for search
  const schoolSearchQuery = (searchSchoolQuery || '').toLowerCase();
  const filteredSchools = sekolahList.filter(s =>
    (s.namaSekolah || '').toLowerCase().includes(schoolSearchQuery) ||
    (s.namaKepsek || '').toLowerCase().includes(schoolSearchQuery)
  );

  return (
    <div id="input-iuran-container" className="space-y-4 sm:space-y-6">
      
      {/* Title Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs sm:text-sm font-bold mb-2 border border-teal-200">
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 shrink-0" />
            <span>Form Pembukuan Kas Masuk Bendahara</span>
          </div>
          <h2 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-slate-800">Input Pembayaran Iuran Sekolah</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pilih sekolah, paket durasi, dan bulan yang akan dibayarkan. Sistem akan memvalidasi agar tidak terjadi dobel pembayaran.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl text-left sm:text-right flex items-center justify-between sm:block">
          <div className="text-xs text-slate-500 font-medium">Tarif Resmi Iuran MKKS</div>
          <div className="text-lg sm:text-2xl font-black text-teal-700">Rp 100.000 <span className="text-xs font-semibold text-slate-500">/ Bln</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Form Input Iuran (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-5 sm:space-y-6">
          <form onSubmit={handleSubmitPembukuan} className="space-y-5 sm:space-y-6">
            
            {/* 1. Nama Sekolah Searchable Selector */}
            <div className="relative space-y-1.5">
              <label htmlFor="school-search-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Nama Sekolah Anggota <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <div
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors shadow-sm"
                  onClick={() => setIsSchoolDropdownOpen(!isSchoolDropdownOpen)}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <Building2 className="w-5 h-5 text-teal-600 shrink-0" />
                    <div className="min-w-0">
                      {activeSchool ? (
                        <>
                          <div className="font-bold text-slate-800 text-xs sm:text-sm truncate">{activeSchool.namaSekolah}</div>
                          <div className="text-[11px] text-slate-500 truncate">Kepsek: {activeSchool.namaKepsek}</div>
                        </>
                      ) : (
                        <>
                          <div className="font-semibold text-slate-400 text-xs sm:text-sm truncate">-- Pilih Nama Sekolah Anggota --</div>
                          <div className="text-[11px] text-slate-400">Klik di sini untuk memilih sekolah</div>
                        </>
                      )}
                    </div>
                  </div>
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                </div>

                {/* Dropdown Menu */}
                {isSchoolDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-72 flex flex-col">
                    <div className="p-2.5 sm:p-3 bg-slate-50 border-b border-slate-200">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          id="school-search-input"
                          type="text"
                          placeholder="Cari nama sekolah..."
                          value={searchSchoolQuery}
                          onChange={(e) => setSearchSchoolQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="overflow-y-auto divide-y divide-slate-100">
                      {filteredSchools.map((s, idx) => (
                        <div
                          key={`sch-dropdown-${s.idSekolah || s.namaSekolah}-${idx}`}
                          onClick={() => {
                            setSelectedSchoolId(s.idSekolah);
                            setIsSchoolDropdownOpen(false);
                            setSelectedMonths([]);
                            setErrorMsg(null);
                          }}
                          className={`p-3 hover:bg-teal-50 cursor-pointer transition-colors flex items-center justify-between ${
                            activeSchool && s.idSekolah === activeSchool.idSekolah ? 'bg-teal-50/80 font-bold border-l-4 border-teal-600' : ''
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-bold text-slate-800 truncate">{s.namaSekolah}</div>
                            <div className="text-[10px] text-slate-500 truncate">{s.namaKepsek} • {s.alamat}</div>
                          </div>
                          {activeSchool && s.idSekolah === activeSchool.idSekolah && (
                            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Tahun Buku Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="tahun-buku-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Tahun Buku <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <select
                    id="tahun-buku-select"
                    value={tahunBuku}
                    onChange={(e) => {
                      setTahunBuku(Number(e.target.value));
                      setSelectedMonths([]);
                      setErrorMsg(null);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value={2026}>Tahun 2026 (Tahun Berjalan)</option>
                    <option value={2025}>Tahun 2025</option>
                    <option value={2024}>Tahun 2024</option>
                  </select>
                </div>
              </div>

              {/* Paket Durasi Selector */}
              <div>
                <label htmlFor="paket-durasi-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Paket Durasi Pembayaran
                </label>
                <select
                  id="paket-durasi-select"
                  value={selectedPaketIndex}
                  onChange={(e) => handlePaketSelect(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {PAKET_LIST.map((pkt, idx) => (
                    <option key={`pkt-opt-${pkt.bulanCount}-${idx}`} value={idx}>{pkt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Month Checkbox Grid with Duplicate Month Validation */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  4. Pilih Bulan Iuran <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  Terpilih: <strong className="text-teal-700">{selectedMonths.length} Bulan</strong> (Total: {formatRupiah(selectedMonths.length * IURAN_PER_BULAN)})
                </span>
              </div>

              {/* Month Selection Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
                {BULAN_LIST.map((bulan, idx) => {
                  const isPaid = paidMonthsForSchoolAndYear.includes(bulan);
                  const isSelected = selectedMonths.includes(bulan);

                  return (
                    <button
                      type="button"
                      key={`input-bulan-btn-${bulan}-${idx}`}
                      disabled={isPaid}
                      onClick={() => handleToggleMonth(bulan)}
                      className={`p-2.5 sm:p-3 rounded-xl border text-left text-xs font-semibold transition-all relative flex flex-col justify-between min-h-[60px] sm:min-h-[64px] ${
                        isPaid
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
                          : isSelected
                          ? 'bg-teal-600 text-white border-teal-700 shadow-md ring-2 ring-teal-500/30'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold">{bulan}</span>
                        {isPaid && <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />}
                        {isSelected && !isPaid && <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />}
                      </div>

                      <div className="mt-1.5 text-[10px] font-bold">
                        {isPaid ? (
                          <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px]">LUNAS</span>
                        ) : (
                          <span className={isSelected ? 'text-teal-100' : 'text-slate-400'}>Rp 100.000</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error / Validation Warning */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Submit Button */}
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 gap-3">
              <div className="flex items-center justify-between sm:block">
                <div className="text-xs text-slate-500">Total Nominal Pembukuan:</div>
                <div className="text-xl sm:text-2xl font-black text-teal-700">
                  {formatRupiah(selectedMonths.length * IURAN_PER_BULAN)}
                </div>
              </div>

              <button
                id="btn-simpan-pembukuan-iuran"
                type="submit"
                disabled={selectedMonths.length === 0}
                className={`w-full sm:w-auto px-6 py-3.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center space-x-2 ${
                  selectedMonths.length > 0
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-teal-600/30'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <PlusCircle className="w-5 h-5 shrink-0" />
                <span>Simpan Pembukuan & Cetak Struk</span>
              </button>
            </div>

          </form>
        </div>

        {/* Payment History Card for Selected School (1 Column) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-3 pb-3 border-b border-slate-100">
              <History className="w-5 h-5 text-teal-600" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Riwayat Pembayaran Iuran</h3>
                <p className="text-[11px] text-slate-500">{activeSchool ? activeSchool.namaSekolah : 'Silakan Pilih Sekolah'}</p>
              </div>
            </div>

            {historyForActiveSchool.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>Belum ada riwayat pembayaran iuran tercatat untuk sekolah ini.</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {historyForActiveSchool.map((item, idx) => (
                  <div
                    key={`sch-hist-${item.id || 'noid'}-${item.bulan}-${item.tanggalInput}-${idx}`}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-teal-50/50 hover:border-teal-200 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        Bulan {item.bulan} {item.tahun}
                      </span>
                      <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                        {formatRupiah(item.nominal)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Tgl: {formatDateIndonesian(item.tanggalInput)}</span>
                      <span className="font-mono text-[10px]">{item.noKuitansi || 'KWT-LOKAL'}</span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/50 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Oleh: {item.diinputOleh}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const schoolOfItem = sekolahList.find(s => isMatchSchool(item, s)) || activeSchool;
                          onOpenStrukModal({
                            noKuitansi: item.noKuitansi || 'KWT-RE-PRINT',
                            tanggal: item.tanggalInput,
                            namaSekolah: item.namaSekolah || schoolOfItem?.namaSekolah || 'Sekolah',
                            namaKepsek: schoolOfItem?.namaKepsek || '-',
                            alamatSekolah: schoolOfItem ? `${schoolOfItem.alamat || ''}, ${schoolOfItem.kelurahan || ''}` : '-',
                            tahunBuku: item.tahun,
                            bulanList: [item.bulan],
                            totalNominal: item.nominal,
                            diinputOleh: currentUser?.namaKepsek || currentUser?.username || item.diinputOleh || 'Bendahara MKKS'
                          });
                        }}
                        className="text-teal-600 hover:text-teal-800 font-bold text-[10px] flex items-center space-x-1"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Cetak Struk</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center">
            Total Iuran Terbayar: <strong className="text-emerald-700">{formatRupiah(historyForActiveSchool.reduce((a, b) => a + b.nominal, 0))}</strong>
          </div>
        </div>

      </div>

    </div>
  );
};
