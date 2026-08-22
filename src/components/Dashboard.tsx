import React, { useState } from 'react';
import { User, Sekolah, Iuran, Pengeluaran, BULAN_LIST, BULAN_SINGKAT, IURAN_PER_BULAN } from '../types';
import { formatRupiah, formatDateIndonesian, formatNumber, resolveNamaBendahara } from '../utils/formatters';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart,
  Coins,
  ShieldAlert,
  UserCheck,
  Printer,
  FileCheck
} from 'lucide-react';

interface DashboardProps {
  currentUser: User | null;
  sekolahList: Sekolah[];
  iuranList: Iuran[];
  pengeluaranList: Pengeluaran[];
  onNavigateToTab: (tab: 'input-iuran' | 'kelola-pengeluaran' | 'laporan-keuangan') => void;
  onSelectSchoolForIuran?: (namaSekolah: string) => void;
  onOpenStrukModal?: (kuitansiData: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  sekolahList,
  iuranList,
  pengeluaranList,
  onNavigateToTab,
  onSelectSchoolForIuran,
  onOpenStrukModal
}) => {
  const currentYear = new Date().getFullYear(); // 2026
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Filter lists by selected year
  const iuranYear = iuranList.filter(i => i.tahun === selectedYear);
  const pengeluaranYear = pengeluaranList.filter(p => p.tanggal.startsWith(`${selectedYear}`));

  // Calculations
  const totalKasMasuk = iuranYear.reduce((acc, curr) => acc + curr.nominal, 0);
  const totalKasKeluar = pengeluaranYear.reduce((acc, curr) => acc + curr.nominal, 0);
  const totalKasBersih = totalKasMasuk - totalKasKeluar;

  // Target total expected iuran per year = 10 Sekolah * 12 Bulan * Rp 100.000 = Rp 12.000.000
  const totalExpectedIuran = sekolahList.length * 12 * IURAN_PER_BULAN; // Rp 12,000,000
  const totalTunggakan = Math.max(0, totalExpectedIuran - totalKasMasuk);
  const percentageLunas = Math.min(100, Math.round((totalKasMasuk / (totalExpectedIuran || 1)) * 100));

  // Monthly breakdown for trend chart
  const monthlyTrends = BULAN_LIST.map((bulanName, index) => {
    const monthIndexStr = String(index + 1).padStart(2, '0');
    
    // Total iuran for this month
    const masukan = iuranYear
      .filter(i => i.bulan === bulanName)
      .reduce((acc, curr) => acc + curr.nominal, 0);

    // Total pengeluaran in this month
    const keluaran = pengeluaranYear
      .filter(p => {
        const pMonth = p.tanggal.split('-')[1];
        return pMonth === monthIndexStr;
      })
      .reduce((acc, curr) => acc + curr.nominal, 0);

    return {
      bulanSingkat: BULAN_SINGKAT[index],
      bulanName,
      masukan,
      keluaran,
      selisih: masukan - keluaran
    };
  });

  const isAdmin = currentUser ? (
    currentUser.role === 'Admin' ||
    currentUser.role?.toLowerCase() === 'admin' ||
    currentUser.username?.toLowerCase() === 'admin' ||
    currentUser.username?.toLowerCase().includes('admin')
  ) : false;

  const isBendahara = currentUser?.role === 'Bendahara' || isAdmin;
  
  // Sekolah role data
  const mySekolahObj = sekolahList.find(s => 
    s.namaSekolah.toLowerCase().trim() === (currentUser?.sekolah || '').toLowerCase().trim() ||
    s.namaSekolah.toLowerCase().includes((currentUser?.sekolah || '').toLowerCase().trim())
  );
  const myIuran = iuranYear.filter(i => 
    (mySekolahObj && i.idSekolah === mySekolahObj.idSekolah) ||
    i.namaSekolah.toLowerCase().trim() === (currentUser?.sekolah || '').toLowerCase().trim()
  );
  const myTotalPaidMonths = myIuran.length;
  const myTotalPaidNominal = myIuran.reduce((a, b) => a + b.nominal, 0);
  const myTunggakan = Math.max(0, (12 - myTotalPaidMonths) * IURAN_PER_BULAN);

  // Handler when a paid month is clicked in Info Sekolah
  const handlePaidMonthClick = (bulan: string, index: number) => {
    if (!onOpenStrukModal) return;

    const paidRecord = myIuran.find(i => i.bulan === bulan);
    const monthNum = String(index + 1).padStart(2, '0');
    const receiptNo = paidRecord?.noKuitansi || `KWT/${selectedYear}/${monthNum}/${mySekolahObj?.idSekolah || 'CITOS'}`;
    const tanggalBayar = paidRecord?.tanggalInput || `${selectedYear}-${monthNum}-10`;

    const inputterFullName = resolveNamaBendahara(paidRecord?.diinputOleh, undefined, sekolahList);

    onOpenStrukModal({
      noKuitansi: receiptNo,
      tanggal: tanggalBayar,
      namaSekolah: mySekolahObj?.namaSekolah || currentUser?.sekolah || 'Sekolah Anggota MKKS',
      namaKepsek: mySekolahObj?.namaKepsek || currentUser?.namaKepsek,
      alamatSekolah: mySekolahObj ? `${mySekolahObj.alamat}, Kel. ${mySekolahObj.kelurahan}` : undefined,
      tahunBuku: selectedYear,
      bulanList: [bulan],
      totalNominal: paidRecord?.nominal || IURAN_PER_BULAN,
      diinputOleh: inputterFullName
    });
  };

  return (
    <div id="dashboard-container" className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-800 rounded-2xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1 mb-1.5">
              <div className="inline-flex items-center space-x-1.5 bg-white/15 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs text-teal-100 backdrop-blur-md border border-white/20">
                <Building2 className="w-3 h-3 text-teal-200" />
                <span>MKKS SMP Cimanggis & Tapos</span>
              </div>
              <span className="bg-amber-400/25 text-amber-200 border border-amber-300/40 px-2.5 py-0.5 rounded-full font-bold text-[10px] sm:text-xs flex items-center space-x-1">
                <span>Role:</span>
                <strong className="text-white font-extrabold uppercase">{currentUser?.role || 'Sekolah'}</strong>
              </span>
            </div>

            <h2 className="text-base sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-snug">
              {isBendahara ? 'Dashboard Pengelolaan Keuangan Bendahara' : `Dashboard Status Iuran: ${currentUser?.sekolah}`}
            </h2>

            {(currentUser?.namaKepsek || mySekolahObj?.namaKepsek) && (
              <div className="mt-2 inline-flex items-center space-x-1.5 bg-emerald-500/25 text-emerald-100 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-semibold border border-emerald-300/30 backdrop-blur-md shadow-xs">
                <UserCheck className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                <span>Kepala Sekolah: <strong className="text-white font-bold">{currentUser?.namaKepsek || mySekolahObj?.namaKepsek}</strong></span>
              </div>
            )}

            <p className="hidden sm:block text-sm text-teal-100/90 mt-1.5 max-w-2xl font-light">
              {isBendahara 
                ? 'Kelola penerimaan iuran 10 sekolah anggota MKKS Citos dan alokasi pengeluaran operasional secara transparan.'
                : 'Pantau riwayat pembayaran iuran sekolah Anda dan cetak kuitansi resmi langsung dari dashboard.'}
            </p>
          </div>

          {/* Filter Year Selector */}
          <div className="flex items-center space-x-2 bg-white/15 p-1 sm:p-1.5 rounded-xl backdrop-blur-md border border-white/20 self-start md:self-auto shrink-0 mt-0.5 md:mt-0">
            <Calendar className="w-3.5 h-3.5 text-teal-200 ml-1.5" />
            <span className="text-[11px] sm:text-xs text-teal-100 font-medium">Tahun Buku:</span>
            <select
              id="dashboard-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="Pilih Tahun Buku Dashboard"
              className="bg-teal-900/80 text-white font-bold text-xs py-1 px-2.5 rounded-lg border border-teal-400/30 focus:outline-none focus:ring-2 focus:ring-teal-300 cursor-pointer"
            >
              <option value={2026}>2026 (Tahun Berjalan)</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Kas Bersih */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Saldo Kas Bersih</span>
            <div className="p-2.5 sm:p-3 rounded-xl bg-teal-50 text-teal-600 group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl lg:text-3xl font-black text-slate-900 tracking-tight">
              {formatRupiah(totalKasBersih)}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center font-medium">
              <span>Akumulasi saldo hingga {selectedYear}</span>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm text-slate-600 font-semibold">
            <span>Penerimaan: {formatRupiah(totalKasMasuk)}</span>
          </div>
        </div>

        {/* Card 2: Total Kas Masuk */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Kas Masuk (Iuran)</span>
            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl lg:text-3xl font-black text-emerald-600 tracking-tight">
              {formatRupiah(totalKasMasuk)}
            </div>
            <p className="text-xs sm:text-sm text-emerald-700 font-bold mt-1 flex items-center">
              <ArrowUpRight className="w-4 h-4 mr-0.5" />
              <span>{iuranYear.length} Transaksi iuran lunas</span>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm text-slate-600 font-medium">
            <span>Target: {formatRupiah(totalExpectedIuran)}</span>
            <span className="font-bold text-emerald-600">{percentageLunas}% Tercapai</span>
          </div>
        </div>

        {/* Card 3: Total Kas Keluar */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Kas Keluar</span>
            <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl lg:text-3xl font-black text-rose-600 tracking-tight">
              {formatRupiah(totalKasKeluar)}
            </div>
            <p className="text-xs sm:text-sm text-rose-700 font-bold mt-1 flex items-center">
              <ArrowDownRight className="w-4 h-4 mr-0.5" />
              <span>{pengeluaranYear.length} Transaksi pengeluaran</span>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm text-slate-600 font-medium">
            <span>Rata-rata: {formatRupiah(pengeluaranYear.length ? totalKasKeluar / pengeluaranYear.length : 0)} / item</span>
          </div>
        </div>

        {/* Card 4: Sisa Tunggakan / Status Sekolah */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">
              {isBendahara ? 'Sisa Tunggakan MKKS' : 'Tunggakan Sekolah Anda'}
            </span>
            <div className={`p-2.5 sm:p-3 rounded-xl ${isBendahara ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'} group-hover:scale-110 transition-transform`}>
              {isBendahara ? <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" /> : <Coins className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl lg:text-3xl font-black tracking-tight ${isBendahara ? 'text-amber-600' : 'text-indigo-600'}`}>
              {formatRupiah(isBendahara ? totalTunggakan : myTunggakan)}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              {isBendahara 
                ? `${10 * 12 - iuranYear.length} Bulan iuran belum terbayar dari 10 sekolah`
                : `${myTotalPaidMonths} / 12 Bulan telah dibayar`}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-600 font-medium">Status Pembayaran:</span>
            {isBendahara ? (
              <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                {100 - percentageLunas}% Tunggakan
              </span>
            ) : (
              <span className={`font-bold px-2 py-0.5 rounded-full ${myTotalPaidMonths === 12 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {myTotalPaidMonths === 12 ? 'LUNAS 1 TAHUN' : `${12 - myTotalPaidMonths} Bulan Belum Lunas`}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Sekolah Specific Highlight (If logged in as Sekolah role) */}
      {!isBendahara && mySekolahObj && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-2 border-teal-300/80 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="bg-emerald-600 text-white font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-lg shrink-0">
                  INFO SEKOLAH
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-snug">{mySekolahObj.namaSekolah}</h3>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Kepala Sekolah: <strong className="text-slate-800">{mySekolahObj.namaKepsek}</strong> • Alamat: {mySekolahObj.alamat}, Kel. {mySekolahObj.kelurahan}
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-teal-200/60">
              <div className="text-left sm:text-right">
                <div className="text-[11px] sm:text-xs text-slate-500">Total Terbayar ({selectedYear})</div>
                <div className="text-lg sm:text-xl font-extrabold text-emerald-700">{formatRupiah(myTotalPaidNominal)}</div>
              </div>
              <button
                id="btn-lihat-laporan-sekolah"
                onClick={() => onNavigateToTab('laporan-keuangan')}
                className="bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-md transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer"
              >
                <span>Lihat Laporan</span>
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Month progress pills for this school (Clickable on LUNAS to print receipt) */}
          <div className="mt-4 pt-3.5 border-t border-teal-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <span>Status Pembayaran Iuran Per Bulan (Rp 100.000 / Bulan):</span>
              </span>
              <span className="text-[11px] text-teal-800 font-semibold bg-teal-100/80 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                💡 Klik bulan berstatus <strong className="text-emerald-700">LUNAS</strong> untuk cetak kuitansi
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
              {BULAN_LIST.map((bulan, idx) => {
                const isPaid = myIuran.some(i => i.bulan === bulan);
                return (
                  <button
                    key={`school-month-pill-${bulan}-${idx}`}
                    type="button"
                    disabled={!isPaid}
                    onClick={() => isPaid && handlePaidMonthClick(bulan, idx)}
                    title={isPaid ? `Klik untuk mencetak kuitansi iuran bulan ${bulan} ${selectedYear}` : `Bulan ${bulan} belum lunas`}
                    className={`text-center py-2.5 px-1.5 rounded-xl text-xs font-bold border transition-all relative ${
                      isPaid
                        ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white border-emerald-700 shadow-sm cursor-pointer ring-2 ring-emerald-400/40 group hover:shadow-md'
                        : 'bg-white text-slate-400 border-slate-200 cursor-not-allowed opacity-80'
                    }`}
                  >
                    <div className="text-[10px] sm:text-[11px] uppercase tracking-wide font-extrabold">{BULAN_SINGKAT[idx]}</div>
                    <div className="text-[9px] sm:text-[10px] mt-0.5 flex items-center justify-center space-x-1">
                      {isPaid ? (
                        <>
                          <Printer className="w-3 h-3 text-emerald-200 group-hover:text-white" />
                          <span>LUNAS</span>
                        </>
                      ) : (
                        <span>BELUM</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Financial Trend Chart & Quick Actions (For Bendahara: 2 cols chart + 1 col Ringkasan; For Sekolah: Full width chart only) */}
      <div className={`grid grid-cols-1 ${isBendahara ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
        
        {/* Visual Trend Bar Chart */}
        <div className={`${isBendahara ? 'lg:col-span-2' : 'w-full'} bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between`}>
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center space-x-2">
                  <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 shrink-0" />
                  <span>Grafik Tren Anggaran (Pemasukan vs Pengeluaran)</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Perbandingan kas masuk iuran dan pengeluaran operasional per bulan ({selectedYear})</p>
              </div>
              
              <div className="flex items-center space-x-3 text-xs shrink-0 self-start sm:self-auto">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
                  <span className="text-slate-600 font-medium">Masuk</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block"></span>
                  <span className="text-slate-600 font-medium">Keluar</span>
                </div>
              </div>
            </div>

            {/* Custom Bar Chart Representation */}
            <div className="mt-4 sm:mt-6 space-y-2.5 sm:space-y-3">
              {monthlyTrends.map((m, idx) => {
                const maxVal = 2000000; // max scale
                const widthMasuk = Math.min(100, (m.masukan / maxVal) * 100);
                const widthKeluaran = Math.min(100, (m.keluaran / maxVal) * 100);

                return (
                  <div key={`trend-bar-${m.bulanName}-${idx}`} className="flex items-center text-xs space-x-2 sm:space-x-3">
                    <span className="w-8 sm:w-10 font-bold text-slate-600 text-right shrink-0 text-[11px] sm:text-xs">{m.bulanSingkat}</span>
                    <div className="flex-1 bg-slate-100 h-6 rounded-lg overflow-hidden flex items-center p-0.5 space-x-1 border border-slate-200/60 relative">
                      {/* Masukan bar */}
                      <div
                        style={{ width: `${Math.max(widthMasuk, 2)}%` }}
                        className={`h-full rounded transition-all flex items-center justify-end px-1.5 ${
                          m.masukan > 0 ? 'bg-emerald-500 text-white font-medium' : 'bg-transparent'
                        }`}
                        title={`Masuk: ${formatRupiah(m.masukan)}`}
                      >
                        {m.masukan > 0 && widthMasuk > 15 && <span className="text-[10px]">{formatNumber(m.masukan)}</span>}
                      </div>

                      {/* Keluaran bar */}
                      <div
                        style={{ width: `${Math.max(widthKeluaran, 2)}%` }}
                        className={`h-full rounded transition-all flex items-center justify-end px-1.5 ${
                          m.keluaran > 0 ? 'bg-rose-500 text-white font-medium' : 'bg-transparent'
                        }`}
                        title={`Keluar: ${formatRupiah(m.keluaran)}`}
                      >
                        {m.keluaran > 0 && widthKeluaran > 15 && <span className="text-[10px]">{formatNumber(m.keluaran)}</span>}
                      </div>

                      {/* If both zero */}
                      {m.masukan === 0 && m.keluaran === 0 && (
                        <span className="text-[10px] text-slate-400 pl-2">Tidak ada transaksi</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs text-slate-500">
            <span>Satuan grafik dalam Rupiah (Rp)</span>
            <button
              id="btn-chart-to-laporan"
              onClick={() => onNavigateToTab('laporan-keuangan')}
              className="text-teal-600 hover:text-teal-700 font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <span>Detail Laporan</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Overview Per School Status (ONLY SHOWN FOR BENDAHARA / ADMIN) */}
        {isBendahara && (
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center space-x-2">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 shrink-0" />
                  <span>Ringkasan Iuran Sekolah ({selectedYear})</span>
                </h3>
                <span className="text-[11px] sm:text-xs bg-teal-100 text-teal-800 font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                  {sekolahList.length} Sekolah
                </span>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {sekolahList.map((sek, idx) => {
                  const paidCount = iuranYear.filter(i => i.idSekolah === sek.idSekolah).length;
                  const isFullyPaid = paidCount === 12;

                  return (
                    <div
                      key={`dash-sek-${sek.idSekolah || sek.namaSekolah}-${idx}`}
                      className="p-2.5 sm:p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/40 transition-all flex items-center justify-between text-xs gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 truncate">{sek.namaSekolah}</div>
                        <div className="text-slate-500 text-[10px] sm:text-[11px] truncate">Kepsek: {sek.namaKepsek}</div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="text-right">
                          <div className={`font-bold text-xs ${isFullyPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {paidCount} / 12 Bln
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {isFullyPaid ? 'Lunas 100%' : `Sisa ${12 - paidCount} Bln`}
                          </div>
                        </div>

                        {!isFullyPaid && onSelectSchoolForIuran && (
                          <button
                            id={`btn-quick-iuran-${sek.idSekolah}`}
                            onClick={() => {
                              onSelectSchoolForIuran(sek.namaSekolah);
                              onNavigateToTab('input-iuran');
                            }}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
                            title="Input Iuran Sekolah Ini"
                          >
                            + Bayar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-100">
              <button
                id="btn-goto-input-iuran"
                onClick={() => onNavigateToTab('input-iuran')}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>+ Input Pembayaran Iuran Baru</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Recent Activity Section (ONLY SHOWN FOR BENDAHARA / ADMIN) */}
      {isBendahara && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Riwayat Transaksi Terakhir MKKS Citos</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Pemasukan iuran dan pengeluaran ter-update dalam database</p>
            </div>
            <button
              id="btn-view-all-reports"
              onClick={() => onNavigateToTab('laporan-keuangan')}
              className="text-teal-600 hover:text-teal-700 text-xs font-semibold hover:underline self-start sm:self-auto flex items-center space-x-1 cursor-pointer"
            >
              <span>Lihat Semua Transaksi</span>
              <span>&rarr;</span>
            </button>
          </div>

          {/* Combined recent transactions array */}
          {(() => {
            const recentList = [
              ...iuranYear.slice(-10).map(i => ({
                type: 'MASUK' as const,
                date: i.tanggalInput,
                title: i.namaSekolah,
                desc: `Iuran Bulan ${i.bulan} ${i.tahun}`,
                amount: i.nominal,
                by: i.diinputOleh
              })),
              ...pengeluaranYear.slice(-10).map(p => ({
                type: 'KELUAR' as const,
                date: p.tanggal,
                title: p.project,
                desc: p.keterangan,
                amount: p.nominal,
                by: p.diinputOleh
              }))
            ]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 7);

            return (
              <>
                {/* Mobile Card List View */}
                <div className="block sm:hidden space-y-2.5">
                  {recentList.map((row, idx) => (
                    <div
                      key={`mobile-recent-tx-${row.type}-${row.title}-${row.date}-${idx}`}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                        {row.type === 'MASUK' ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-800 bg-emerald-100/90 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Pemasukan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-rose-800 bg-rose-100/90 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                            <ArrowDownRight className="w-3 h-3" />
                            <span>Pengeluaran</span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-medium">
                          {formatDateIndonesian(row.date)}
                        </span>
                      </div>

                      <div className="flex justify-between items-start pt-0.5 gap-2">
                        <div className="space-y-0.5 pr-2 min-w-0">
                          <div className="font-extrabold text-slate-800 text-xs truncate">{row.title}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-2">{row.desc}</div>
                        </div>
                        <div className={`text-right font-black text-xs shrink-0 ${
                          row.type === 'MASUK' ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {row.type === 'MASUK' ? '+' : '-'}{formatRupiah(row.amount)}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Petugas: <strong className="text-slate-600 font-semibold">{row.by}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-200">
                        <th className="py-3 px-4">Jenis Transaksi</th>
                        <th className="py-3 px-4">Tanggal / Waktu</th>
                        <th className="py-3 px-4">Detail Instansi / Kegiatan</th>
                        <th className="py-3 px-4">Bulan / Keterangan</th>
                        <th className="py-3 px-4 text-right">Nominal (Rp)</th>
                        <th className="py-3 px-4 text-center">Petugas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentList.map((row, idx) => (
                        <tr key={`recent-tx-${row.type}-${row.title}-${row.date}-${row.amount}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold">
                            {row.type === 'MASUK' ? (
                              <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>Pemasukan</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                                <ArrowDownRight className="w-3 h-3" />
                                <span>Pengeluaran</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{formatDateIndonesian(row.date)}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{row.title}</td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{row.desc}</td>
                          <td className={`py-3 px-4 text-right font-black ${row.type === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {row.type === 'MASUK' ? '+' : '-'}{formatRupiah(row.amount)}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-500 text-[11px]">{row.by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}

    </div>
  );
};
