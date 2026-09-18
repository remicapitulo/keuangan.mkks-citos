import React, { useState } from 'react';
import { PemasukanLain, KATEGORI_PEMASUKAN_LAIN, User } from '../types';
import { formatRupiah, formatDateIndonesian, resolveNamaBendahara } from '../utils/formatters';
import { 
  Coins, 
  PlusCircle, 
  Calendar, 
  Building2, 
  FileText, 
  Search, 
  Trash2, 
  Printer, 
  Filter, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Download,
  HandCoins,
  Receipt,
  Layers
} from 'lucide-react';

interface InputPemasukanLainProps {
  pemasukanLainList: PemasukanLain[];
  onSavePemasukanLain: (newIncome: Omit<PemasukanLain, 'id'>) => void;
  onOpenStrukModal?: (kuitansiData: any) => void;
  currentUser?: User | null;
}

const QUICK_SUGGESTIONS = [
  'Sponsor Bimbel & Buku',
  'Panitia FLS2N 2026',
  'Panitia O2SN 2026',
  'Panitia Raker MKKS',
  'Bank BJB Depok',
  'Donatur Hamba Allah'
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Sponsor & Kemitraan': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Uang Kembali / Sisa Panitia': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Sumbangan & Donasi': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Dana Hibah / Bantuan': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'Bagi Hasil / Jasa Giro': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'Pemasukan Lain-lain': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' }
};

export const InputPemasukanLain: React.FC<InputPemasukanLainProps> = ({
  pemasukanLainList,
  onSavePemasukanLain,
  onOpenStrukModal,
  currentUser
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  // Form State
  const [tanggal, setTanggal] = useState<string>(todayStr);
  const [kategori, setKategori] = useState<string>(KATEGORI_PEMASUKAN_LAIN[0]);
  const [customKategori, setCustomKategori] = useState<string>('');
  const [sumberDana, setSumberDana] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [nominal, setNominal] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Filter & Search State
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Quick Amount Addition
  const handleAddAmount = (addVal: number) => {
    const current = Number(nominal) || 0;
    setNominal(String(current + addVal));
  };

  const generateReceiptNumber = () => {
    const d = new Date(tanggal || todayStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    return `KWT-IN/MKKS-CITOS/${y}/${m}/${randomCode}`;
  };

  const handleSubmit = (e: React.FormEvent, andPrint = false) => {
    e.preventDefault();
    setErrorMsg(null);

    const amount = Number(nominal);
    if (!tanggal) {
      setErrorMsg('Silakan pilih tanggal transaksi.');
      return;
    }

    const finalKategori = kategori === 'Lainnya' ? (customKategori.trim() || 'Pemasukan Lain-lain') : kategori;
    if (!finalKategori) {
      setErrorMsg('Silakan pilih atau isi kategori pemasukan.');
      return;
    }

    if (!sumberDana.trim()) {
      setErrorMsg('Isi sumber dana / pihak pemberi (contoh: PT Penerbit Erlangga, Panitia Lomba FLS2N, dll).');
      return;
    }

    if (!amount || amount <= 0) {
      setErrorMsg('Nominal uang masuk harus lebih besar dari 0.');
      return;
    }

    const currentBendaharaName = resolveNamaBendahara(currentUser?.namaKepsek || currentUser?.username);
    const receiptNo = generateReceiptNumber();

    const newIncomeData = {
      tanggal,
      kategori: finalKategori,
      sumberDana: sumberDana.trim(),
      keterangan: keterangan.trim() || `Penerimaan ${finalKategori} dari ${sumberDana.trim()}`,
      nominal: amount,
      diinputOleh: currentBendaharaName,
      noKuitansi: receiptNo
    };

    onSavePemasukanLain(newIncomeData);

    setSuccessNotice(`Berhasil menyimpan pemasukan kas sebesar ${formatRupiah(amount)}!`);
    setTimeout(() => setSuccessNotice(null), 4000);

    // If user clicked "Simpan & Cetak Kuitansi"
    if (andPrint && onOpenStrukModal) {
      const year = new Date(tanggal).getFullYear();
      onOpenStrukModal({
        jenis: 'pemasukan-lain',
        noKuitansi: receiptNo,
        tanggal: tanggal,
        namaSekolah: sumberDana.trim(),
        sumberDana: sumberDana.trim(),
        kategori: finalKategori,
        keterangan: keterangan.trim() || `Penerimaan ${finalKategori} dari ${sumberDana.trim()}`,
        alamatSekolah: keterangan.trim() || '-',
        tahunBuku: year,
        bulanList: [`Penerimaan ${finalKategori}`],
        totalNominal: amount,
        diinputOleh: currentBendaharaName
      });
    }

    // Reset form fields
    setSumberDana('');
    setKeterangan('');
    setNominal('');
    setCustomKategori('');
  };

  const handlePrintReceipt = (item: PemasukanLain) => {
    if (!onOpenStrukModal) return;
    const year = new Date(item.tanggal).getFullYear();
    const receiptNo = item.noKuitansi || `KWT-IN/MKKS-CITOS/${year}/${item.id}`;

    onOpenStrukModal({
      jenis: 'pemasukan-lain',
      noKuitansi: receiptNo,
      tanggal: item.tanggal,
      namaSekolah: item.sumberDana,
      sumberDana: item.sumberDana,
      kategori: item.kategori,
      keterangan: item.keterangan || `Penerimaan ${item.kategori} dari ${item.sumberDana}`,
      alamatSekolah: item.keterangan || '-',
      tahunBuku: year,
      bulanList: [`Penerimaan ${item.kategori}`],
      totalNominal: item.nominal,
      diinputOleh: item.diinputOleh
    });
  };

  // Filtered List
  const filteredList = pemasukanLainList.filter(item => {
    const matchYear = item.tanggal.startsWith(String(selectedYear));
    const matchCategory = selectedCategoryFilter === 'all' || item.kategori === selectedCategoryFilter;
    const query = searchKeyword.toLowerCase().trim();
    const matchSearch = !query || 
      item.sumberDana.toLowerCase().includes(query) ||
      item.keterangan.toLowerCase().includes(query) ||
      item.kategori.toLowerCase().includes(query) ||
      (item.noKuitansi && item.noKuitansi.toLowerCase().includes(query));

    return matchYear && matchCategory && matchSearch;
  });

  // Calculations for current year
  const listYear = pemasukanLainList.filter(i => i.tanggal.startsWith(String(selectedYear)));
  const totalNominalYear = listYear.reduce((acc, curr) => acc + curr.nominal, 0);

  // Group by category
  const categoryStats = KATEGORI_PEMASUKAN_LAIN.map(cat => {
    const total = listYear.filter(i => i.kategori === cat).reduce((acc, curr) => acc + curr.nominal, 0);
    const count = listYear.filter(i => i.kategori === cat).length;
    return { category: cat, total, count };
  });

  return (
    <div id="pemasukan-lain-container" className="space-y-4 sm:space-y-6">
      
      {/* Top Banner & Header Summary */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-semibold mb-2 border border-teal-200">
            <Coins className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>Penerimaan Kas Masuk Non-Iuran</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">Input Pemasukan Kas Selain Iuran</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Catat sumber uang masuk dari sponsor kemitraan, sisa pengembalian dana panitia kegiatan, sumbangan donatur, dana hibah, dan pendapatan kas lainnya.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-teal-50/90 border border-teal-200 p-3.5 rounded-xl text-left sm:text-right min-w-[200px]">
            <div className="text-[11px] text-teal-700 font-semibold">Total Pemasukan Lain ({selectedYear})</div>
            <div className="text-lg sm:text-xl font-black text-teal-900">{formatRupiah(totalNominalYear)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{listYear.length} transaksi tercatat</div>
          </div>
        </div>
      </div>

      {/* Category Quick Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {categoryStats.map(stat => {
          const style = CATEGORY_COLORS[stat.category] || CATEGORY_COLORS['Pemasukan Lain-lain'];
          const isSelected = selectedCategoryFilter === stat.category;

          return (
            <button
              key={stat.category}
              onClick={() => setSelectedCategoryFilter(isSelected ? 'all' : stat.category)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-teal-700 text-white border-teal-800 shadow-md ring-2 ring-teal-500/30' 
                  : `${style.bg} ${style.border} hover:border-slate-400`
              }`}
            >
              <div className={`text-[11px] font-semibold truncate ${isSelected ? 'text-teal-100' : 'text-slate-600'}`}>
                {stat.category}
              </div>
              <div className={`text-xs sm:text-sm font-black mt-1 ${isSelected ? 'text-white' : style.text}`}>
                {formatRupiah(stat.total)}
              </div>
              <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-teal-200' : 'text-slate-400'}`}>
                {stat.count} Transaksi
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Form on Left, Table/List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        
        {/* FORM TAMBAH PEMASUKAN LAIN (5 COLS) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <PlusCircle className="w-5 h-5 text-teal-600 shrink-0" />
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Form Tambah Pemasukan Baru</h3>
            </div>
            <span className="text-[11px] text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full font-semibold border border-teal-200">
              Bendahara MKKS
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4 text-xs sm:text-sm">
            
            {/* Tanggal Transaksi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>Tanggal Transaksi Uang Masuk <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              />
            </div>

            {/* Kategori Pemasukan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-teal-600" />
                <span>Kategori / Jenis Pemasukan <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all cursor-pointer"
              >
                {KATEGORI_PEMASUKAN_LAIN.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Lainnya">+ Tambah Kategori Baru / Lainnya</option>
              </select>

              {kategori === 'Lainnya' && (
                <input
                  type="text"
                  placeholder="Tuliskan nama kategori baru..."
                  value={customKategori}
                  onChange={(e) => setCustomKategori(e.target.value)}
                  className="mt-2 w-full bg-white border border-teal-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              )}
            </div>

            {/* Sumber Dana / Pihak Pemberi */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Diterima Dari / Sumber Dana <span className="text-rose-500">*</span></span>
                </label>
                <span className="text-[10px] text-slate-400">Instansi / Panitia / Donatur</span>
              </div>
              <input
                type="text"
                placeholder="Contoh: PT Telkom Indonesia / Panitia FLS2N 2026 / H. Ahmad"
                value={sumberDana}
                onChange={(e) => setSumberDana(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              />

              {/* Quick suggestions */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[10px] text-slate-400 self-center">Pilihan cepat:</span>
                {QUICK_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setSumberDana(sug)}
                    className="text-[10px] bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 transition-colors cursor-pointer"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Keterangan / Uraian Rinci */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                <span>Keterangan / Uraian Rinci</span>
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Sisa dana operasional lomba FLS2N setelah pelunasan sewa sound system dan panggung..."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-800 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all resize-none"
              />
            </div>

            {/* Nominal (Rp) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <HandCoins className="w-3.5 h-3.5 text-teal-600" />
                <span>Jumlah Nominal Uang Masuk (Rp) <span className="text-rose-500">*</span></span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-xs sm:text-sm">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value)}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm sm:text-base font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                />
              </div>

              {Number(nominal) > 0 && (
                <div className="mt-1.5 text-xs text-teal-700 font-bold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                  Terbaca: {formatRupiah(Number(nominal))}
                </div>
              )}

              {/* Shortcut buttons */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[100000, 250000, 500000, 1000000, 2500000, 5000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleAddAmount(amt)}
                    className="text-[11px] bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-semibold px-2 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    +{amt >= 1000000 ? `${amt / 1000000} Jt` : `${amt / 1000} Rb`}
                  </button>
                ))}
                {Number(nominal) > 0 && (
                  <button
                    type="button"
                    onClick={() => setNominal('')}
                    className="text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold px-2 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer ml-auto"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Simpan Pemasukan</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98 shrink-0"
              >
                <Printer className="w-4 h-4 text-teal-400" />
                <span>Simpan & Cetak Kuitansi</span>
              </button>
            </div>

          </form>
        </div>

        {/* RIWAYAT & DAFTAR TRANSAKSI (7 COLS) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-teal-600" />
                <span>Daftar Pemasukan Kas Non-Iuran</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Menampilkan {filteredList.length} dari {pemasukanLainList.length} total transaksi
              </p>
            </div>

            {/* Year Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500">Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari sumber dana, sponsor, keterangan, kuitansi..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {searchKeyword && (
                <button
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shrink-0"
            >
              <option value="all">Semua Kategori</option>
              {KATEGORI_PEMASUKAN_LAIN.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Transactions List */}
          {filteredList.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
              <Coins className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="font-bold text-slate-700 text-sm">Belum Ada Catatan Pemasukan Lain</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchKeyword || selectedCategoryFilter !== 'all' 
                  ? 'Tidak ada transaksi yang cocok dengan filter pencarian.'
                  : `Gunakan form di samping untuk mencatat penerimaan uang masuk dari sponsor, sisa panitia, donasi, atau hibah tahun ${selectedYear}.`}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredList.map((item, idx) => {
                const style = CATEGORY_COLORS[item.kategori] || CATEGORY_COLORS['Pemasukan Lain-lain'];

                return (
                  <div
                    key={item.id || idx}
                    className="p-3.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all hover:shadow-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${style.bg} ${style.text} ${style.border}`}>
                            {item.kategori}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {formatDateIndonesian(item.tanggal)}
                          </span>
                          {item.noKuitansi && (
                            <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                              {item.noKuitansi}
                            </span>
                          )}
                        </div>

                        <div className="font-extrabold text-slate-800 text-sm">
                          {item.sumberDana}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed font-normal">
                          {item.keterangan || '-'}
                        </p>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <div className="text-sm sm:text-base font-black text-teal-700">
                          {formatRupiah(item.nominal)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Oleh: {item.diinputOleh}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons footer */}
                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                      <button
                        onClick={() => handlePrintReceipt(item)}
                        className="inline-flex items-center space-x-1.5 text-teal-700 hover:text-teal-800 bg-white hover:bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 font-semibold transition-colors cursor-pointer text-[11px]"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Kuitansi / Bukti</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
