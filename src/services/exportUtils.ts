import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sekolah, Iuran, Pengeluaran, PemasukanLain, RiwayatHapus, BULAN_LIST, BULAN_SINGKAT, IURAN_PER_BULAN, User, RekonsiliasiKas } from '../types';
import { formatRupiah, formatDateIndonesian, formatDateTimeIndonesian, resolveNamaBendahara, getSchoolSortKey } from '../utils/formatters';
import { StorageService } from './spreadsheetSync';

export function exportToExcel(
  tahun: number,
  sekolahList: Sekolah[],
  iuranList: Iuran[],
  pengeluaranList: Pengeluaran[],
  pemasukanLainList: PemasukanLain[] = [],
  riwayatHapusList: RiwayatHapus[] = [],
  rekonsiliasiKas?: RekonsiliasiKas
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet Matriks Iuran
  const iuranTahunThis = iuranList
    .filter(i => i.tahun === tahun)
    .sort((a, b) => {
      const dateA = new Date(a.tanggalInput).getTime() || 0;
      const dateB = new Date(b.tanggalInput).getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  
  const sortedSekolahList = [...sekolahList].sort((a, b) => {
    const keyA = getSchoolSortKey(a.namaSekolah || '');
    const keyB = getSchoolSortKey(b.namaSekolah || '');
    const comp = keyA.localeCompare(keyB, 'id', { sensitivity: 'base', numeric: true });
    if (comp !== 0) return comp;
    return (a.namaSekolah || '').localeCompare(b.namaSekolah || '', 'id');
  });

  const matrixData = sortedSekolahList.map((s, index) => {
    const row: Record<string, any> = {
      'No': index + 1,
      'Nama Sekolah': s.namaSekolah,
      'Kepala Sekolah': s.namaKepsek
    };

    let totalLunasCount = 0;

    BULAN_LIST.forEach((bulan, bIdx) => {
      const paid = iuranTahunThis.some(i => i.idSekolah === s.idSekolah && i.bulan === bulan);
      if (paid) {
        row[BULAN_SINGKAT[bIdx]] = 'Lunas';
        totalLunasCount++;
      } else {
        row[BULAN_SINGKAT[bIdx]] = 'Belum';
      }
    });

    const totalBayarNominal = totalLunasCount * IURAN_PER_BULAN;
    const totalTunggakanNominal = (12 - totalLunasCount) * IURAN_PER_BULAN;

    row['Total Lunas (Rp)'] = totalBayarNominal;
    row['Sisa Tunggakan (Rp)'] = totalTunggakanNominal === 0 ? 'LUNAS' : totalTunggakanNominal;

    return row;
  });

  const wsMatrix = XLSX.utils.json_to_sheet(matrixData);
  XLSX.utils.book_append_sheet(wb, wsMatrix, `Matriks Iuran ${tahun}`);

  // 2. Sheet Rincian Kas Masuk Iuran
  const kasMasukData = iuranTahunThis.map((i, idx) => ({
    'No': idx + 1,
    'Tahun Buku': i.tahun,
    'Bulan Pembayaran': i.bulan,
    'Tanggal Pembayaran': formatDateIndonesian(i.tanggalInput),
    'Nama Instansi': i.namaSekolah,
    'Jumlah Nominal (Rp)': i.nominal,
    'Keterangan / Tempat Terima': i.keterangan || '-',
    'Diinput Oleh': resolveNamaBendahara(i.diinputOleh, undefined, sekolahList),
    'No. Kuitansi': i.noKuitansi || '-'
  }));

  const totalIuranMasuk = iuranTahunThis.reduce((acc, curr) => acc + curr.nominal, 0);
  kasMasukData.push({
    'No': '',
    'Tahun Buku': '',
    'Bulan Pembayaran': '',
    'Tanggal Pembayaran': '',
    'Nama Instansi': 'TOTAL IURAN MASUK',
    'Jumlah Nominal (Rp)': totalIuranMasuk,
    'Keterangan / Tempat Terima': '',
    'Diinput Oleh': '',
    'No. Kuitansi': ''
  } as any);

  const wsKasMasuk = XLSX.utils.json_to_sheet(kasMasukData);
  XLSX.utils.book_append_sheet(wb, wsKasMasuk, `Kas Masuk Iuran ${tahun}`);

  // 3. Sheet Rincian Pemasukan Lain (Non-Iuran)
  const pemasukanLainTahunThis = pemasukanLainList
    .filter(p => p.tanggal.startsWith(`${tahun}`))
    .sort((a, b) => {
      const dateA = new Date(a.tanggal).getTime() || 0;
      const dateB = new Date(b.tanggal).getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  const pemasukanLainData = pemasukanLainTahunThis.map((p, idx) => ({
    'No': idx + 1,
    'Tanggal Transaksi': formatDateIndonesian(p.tanggal),
    'Kategori': p.kategori,
    'Sumber Dana / Pihak Terkait': p.sumberDana,
    'Keterangan Tambahan': p.keterangan,
    'Jumlah Nominal (Rp)': p.nominal,
    'Diinput Oleh': resolveNamaBendahara(p.diinputOleh, undefined, sekolahList),
    'No. Kuitansi': p.noKuitansi || '-'
  }));

  const totalPemasukanLain = pemasukanLainTahunThis.reduce((acc, curr) => acc + curr.nominal, 0);
  pemasukanLainData.push({
    'No': '',
    'Tanggal Transaksi': '',
    'Kategori': '',
    'Sumber Dana / Pihak Terkait': 'TOTAL PEMASUKAN LAIN',
    'Keterangan Tambahan': '',
    'Jumlah Nominal (Rp)': totalPemasukanLain,
    'Diinput Oleh': '',
    'No. Kuitansi': ''
  } as any);

  const wsPemasukanLain = XLSX.utils.json_to_sheet(pemasukanLainData);
  XLSX.utils.book_append_sheet(wb, wsPemasukanLain, `Pemasukan Non-Iuran ${tahun}`);

  // 4. Sheet Rincian Kas Keluar
  const pengeluaranTahunThis = pengeluaranList
    .filter(p => p.tanggal.startsWith(`${tahun}`))
    .sort((a, b) => {
      const dateA = new Date(a.tanggal).getTime() || 0;
      const dateB = new Date(b.tanggal).getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  const kasKeluarData = pengeluaranTahunThis.map((p, idx) => ({
    'No': idx + 1,
    'Tanggal Transaksi': formatDateIndonesian(p.tanggal),
    'Alokasi Project / Kegiatan': p.project,
    'Keterangan Tambahan': p.keterangan,
    'Jumlah Nominal (Rp)': p.nominal,
    'Diinput Oleh': resolveNamaBendahara(p.diinputOleh, undefined, sekolahList)
  }));

  const totalKasKeluar = pengeluaranTahunThis.reduce((acc, curr) => acc + curr.nominal, 0);
  kasKeluarData.push({
    'No': '',
    'Tanggal Transaksi': '',
    'Alokasi Project / Kegiatan': 'TOTAL KAS KELUAR',
    'Keterangan Tambahan': '',
    'Jumlah Nominal (Rp)': totalKasKeluar,
    'Diinput Oleh': ''
  } as any);

  const wsKasKeluar = XLSX.utils.json_to_sheet(kasKeluarData);
  XLSX.utils.book_append_sheet(wb, wsKasKeluar, `Kas Keluar ${tahun}`);

  // 5. Sheet Rekap Arus Kas
  const rekapData = BULAN_LIST.map((bulan, idx) => {
    const mStr = String(idx + 1).padStart(2, '0');
    const inIuran = iuranTahunThis.filter(i => i.bulan === bulan).reduce((a, b) => a + b.nominal, 0);
    const inLain = pemasukanLainTahunThis.filter(l => l.tanggal.split('-')[1] === mStr).reduce((a, b) => a + b.nominal, 0);
    const outExp = pengeluaranTahunThis.filter(p => p.tanggal.split('-')[1] === mStr).reduce((a, b) => a + b.nominal, 0);
    const totalMasukBulan = inIuran + inLain;
    const net = totalMasukBulan - outExp;

    return {
      'Bulan': bulan,
      'Iuran (Rp)': inIuran,
      'Pemasukan Lain (Rp)': inLain,
      'Total Masuk (Rp)': totalMasukBulan,
      'Pengeluaran (Rp)': outExp,
      'Saldo Bersih (Rp)': net,
      'Status': net >= 0 ? 'Surplus' : 'Defisit'
    };
  });

  const totalMasukSemua = totalIuranMasuk + totalPemasukanLain;
  const saldoAkhir = totalMasukSemua - totalKasKeluar;

  rekapData.push({
    'Bulan': 'TOTAL TAHUNAN',
    'Iuran (Rp)': totalIuranMasuk,
    'Pemasukan Lain (Rp)': totalPemasukanLain,
    'Total Masuk (Rp)': totalMasukSemua,
    'Pengeluaran (Rp)': totalKasKeluar,
    'Saldo Bersih (Rp)': saldoAkhir,
    'Status': saldoAkhir >= 0 ? 'SURPLUS' : 'DEFISIT'
  } as any);

  const wsRekap = XLSX.utils.json_to_sheet(rekapData);
  XLSX.utils.book_append_sheet(wb, wsRekap, `Rekap Arus Kas ${tahun}`);

  // 6. Sheet Riwayat Penghapusan Data (Audit Log)
  if (riwayatHapusList && riwayatHapusList.length > 0) {
    const logData = riwayatHapusList.map((r, idx) => ({
      'No': idx + 1,
      'Waktu Penghapusan': formatDateTimeIndonesian(r.timestamp || r.tanggalHapus),
      'Jenis Transaksi': (r.jenisTransaksi || r.jenis || '').toUpperCase(),
      'Identitas Transaksi': r.judulItem || r.judul || r.rincianData || '-',
      'Nominal Transaksi (Rp)': r.nominal || 0,
      'Alasan / Keterangan Penghapusan': r.alasanHapus || r.alasan || '-',
      'Dihapus Oleh': r.dihapusOleh || '-',
      'Role Penghapus': r.rolePenghapus || r.role || r.roleUser || 'Bendahara',
      'ID Data Asli': r.idItemAsli || r.idTransaksi || r.id
    }));

    const wsLog = XLSX.utils.json_to_sheet(logData);
    XLSX.utils.book_append_sheet(wb, wsLog, `Log Hapus Data`);
  }

  // 7. Sheet Audit & Rekonsiliasi Kas (Real vs Data)
  if (rekonsiliasiKas) {
    const totalSaldoReal = (rekonsiliasiKas.saldoCash || 0) + (rekonsiliasiKas.saldoBank || 0);
    const selisih = totalSaldoReal - saldoAkhir;
    const isBal = Math.abs(selisih) === 0;

    const auditExcelData = [
      { 'Komponen Pemeriksaan Kas': 'Saldo Menurut Data Sistem Pembukuan (A)', 'Jumlah Nominal (Rp)': saldoAkhir, 'Status & Keterangan Fisik': 'Hasil kalkulasi Kas Masuk dikurangi Pengeluaran' },
      { 'Komponen Pemeriksaan Kas': '1. Uang Tunai / Cash (Brankas Bendahara)', 'Jumlah Nominal (Rp)': rekonsiliasiKas.saldoCash || 0, 'Status & Keterangan Fisik': 'Hasil hitung fisik uang cash di bendahara' },
      { 'Komponen Pemeriksaan Kas': '2. Uang di Rekening Bank', 'Jumlah Nominal (Rp)': rekonsiliasiKas.saldoBank || 0, 'Status & Keterangan Fisik': `${rekonsiliasiKas.namaBank} - No. ${rekonsiliasiKas.nomorRekening} (a.n. ${rekonsiliasiKas.atasNamaRekening})` },
      { 'Komponen Pemeriksaan Kas': 'TOTAL SALDO REAL FISIK (B = Cash + Bank)', 'Jumlah Nominal (Rp)': totalSaldoReal, 'Status & Keterangan Fisik': 'Akumulasi total uang nyata yang dimiliki' },
      { 'Komponen Pemeriksaan Kas': 'SELISIH KEUANGAN (B - A)', 'Jumlah Nominal (Rp)': selisih, 'Status & Keterangan Fisik': isBal ? 'BALANCE / COCOK 100% (Rp 0)' : (selisih > 0 ? `SELISIH LEBIH (+${selisih})` : `SELISIH KURANG (-${Math.abs(selisih)})`) },
      { 'Komponen Pemeriksaan Kas': 'Waktu Pelaksanaan Audit', 'Jumlah Nominal (Rp)': '', 'Status & Keterangan Fisik': formatDateTimeIndonesian(rekonsiliasiKas.tanggalAudit) },
      { 'Komponen Pemeriksaan Kas': 'Petugas Pemeriksa', 'Jumlah Nominal (Rp)': '', 'Status & Keterangan Fisik': resolveNamaBendahara(rekonsiliasiKas.diauditOleh, undefined, sekolahList) },
      { 'Komponen Pemeriksaan Kas': 'Catatan Temuan Audit', 'Jumlah Nominal (Rp)': '', 'Status & Keterangan Fisik': rekonsiliasiKas.catatanAudit || '-' }
    ];

    const wsAudit = XLSX.utils.json_to_sheet(auditExcelData);
    XLSX.utils.book_append_sheet(wb, wsAudit, `Audit Kas Real ${tahun}`);
  }

  // Trigger browser download
  XLSX.writeFile(wb, `Laporan_Keuangan_MKKS_Citos_${tahun}.xlsx`);
}

export function exportToPDF(
  tahun: number,
  sekolahList: Sekolah[],
  iuranList: Iuran[],
  pengeluaranList: Pengeluaran[],
  currentUser?: User | null,
  pemasukanLainList: PemasukanLain[] = [],
  rekonsiliasiKas?: RekonsiliasiKas
) {
  const doc = new jsPDF('landscape', 'mm', 'a4');

  // Pre-calculate financial totals
  const iuranTahunThis = iuranList
    .filter(i => i.tahun === tahun)
    .sort((a, b) => {
      const dateA = new Date(a.tanggalInput).getTime() || 0;
      const dateB = new Date(b.tanggalInput).getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  const pemasukanLainTahunThis = pemasukanLainList
    .filter(p => p.tanggal.startsWith(`${tahun}`))
    .sort((a, b) => {
      const dateA = new Date(a.tanggal).getTime() || 0;
      const dateB = new Date(b.tanggal).getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  const pengeluaranTahunThis = pengeluaranList
    .filter(p => p.tanggal.startsWith(`${tahun}`))
    .sort((a, b) => {
      const dateA = new Date(a.tanggal).getTime() || 0;
      const dateB = new Date(b.tanggal).getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });

  const totalIuranMasuk = iuranTahunThis.reduce((acc, curr) => acc + curr.nominal, 0);
  const totalPemasukanLain = pemasukanLainTahunThis.reduce((acc, curr) => acc + curr.nominal, 0);
  const totalKasMasuk = totalIuranMasuk + totalPemasukanLain;
  const totalKasKeluar = pengeluaranTahunThis.reduce((acc, curr) => acc + curr.nominal, 0);
  const saldoBersih = totalKasMasuk - totalKasKeluar;

  // Header Laporan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('MUSYAWARAH KERJA KEPALA SEKOLAH (MKKS)', 147, 13, { align: 'center' });
  doc.setFontSize(13);
  doc.setTextColor(13, 148, 136);
  doc.text('KECAMATAN CIMANGGIS DAN TAPOS • KOTA DEPOK', 147, 19.5, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`LAPORAN KEUANGAN & IURAN ANGGOTA TAHUN BUKU ${tahun}`, 147, 25.5, { align: 'center' });
  
  doc.setLineWidth(0.4);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, 28.5, 283, 28.5);

  // ==========================================
  // 4 EXECUTIVE FINANCIAL SUMMARY CARDS
  // ==========================================
  const cardY = 32;
  const cardH = 15;
  const cardW = 64.25;
  const gap = 4;

  // Card 1: TOTAL MASUK
  const c1X = 14;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.setLineWidth(0.35);
  doc.roundedRect(c1X, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text('IURAN SEKOLAH', c1X + 4, cardY + 4.5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text(formatRupiah(totalIuranMasuk), c1X + 4, cardY + 9.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Iuran Bulanan (${tahun})`, c1X + 4, cardY + 13);

  // Card 2: NON-IURAN
  const c2X = c1X + cardW + gap;
  doc.setFillColor(240, 253, 250); // teal-50
  doc.setDrawColor(153, 246, 228); // teal-200
  doc.roundedRect(c2X, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(17, 94, 89);
  doc.text('NON-IURAN', c2X + 4, cardY + 4.5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110); // teal-700
  doc.text(formatRupiah(totalPemasukanLain), c2X + 4, cardY + 9.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${pemasukanLainTahunThis.length} Transaksi Pemasukan Lain`, c2X + 4, cardY + 13);

  // Card 3: PENGELUARAN
  const c3X = c2X + cardW + gap;
  doc.setFillColor(255, 241, 242); // rose-50
  doc.setDrawColor(254, 205, 211); // rose-200
  doc.roundedRect(c3X, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(159, 18, 57);
  doc.text('PENGELUARAN', c3X + 4, cardY + 4.5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(190, 18, 60); // rose-700
  doc.text(formatRupiah(totalKasKeluar), c3X + 4, cardY + 9.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Operasional & Project (${tahun})`, c3X + 4, cardY + 13);

  // Card 4: SALDO BERSIH
  const c4X = c3X + cardW + gap;
  const isSurplus = saldoBersih >= 0;
  if (isSurplus) {
    doc.setFillColor(238, 242, 255); // indigo-50
    doc.setDrawColor(199, 210, 254); // indigo-200
  } else {
    doc.setFillColor(255, 241, 242); // rose-50
    doc.setDrawColor(254, 205, 211); // rose-200
  }
  doc.roundedRect(c4X, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(isSurplus ? 55 : 159, isSurplus ? 48 : 18, isSurplus ? 163 : 57);
  doc.text('SALDO BERSIH', c4X + 4, cardY + 4.5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isSurplus ? 67 : 190, isSurplus ? 56 : 18, isSurplus ? 202 : 60);
  doc.text(formatRupiah(saldoBersih), c4X + 4, cardY + 9.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(isSurplus ? 'Kas Bersih Saat Ini (Surplus)' : 'Kas Bersih Saat Ini (Defisit)', c4X + 4, cardY + 13);

  let currentY = cardY + cardH + 7;

  // 1. Matriks Iuran Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`1. Matriks Status Pembayaran Iuran Per Sekolah (Tahun ${tahun})`, 14, currentY);
  currentY += 3.5;

  const matrixHead = [['No', 'Nama Sekolah', ...BULAN_SINGKAT, 'Lunas (Rp)', 'Tunggakan (Rp)']];
  const sortedPdfSekolah = [...sekolahList].sort((a, b) => {
    const keyA = getSchoolSortKey(a.namaSekolah || '');
    const keyB = getSchoolSortKey(b.namaSekolah || '');
    const comp = keyA.localeCompare(keyB, 'id', { sensitivity: 'base', numeric: true });
    if (comp !== 0) return comp;
    return (a.namaSekolah || '').localeCompare(b.namaSekolah || '', 'id');
  });
  const matrixRows = sortedPdfSekolah.map((s, idx) => {
    let lunasCount = 0;
    const monthsStatus = BULAN_LIST.map(bulan => {
      const isPaid = iuranTahunThis.some(i => i.idSekolah === s.idSekolah && i.bulan === bulan);
      if (isPaid) {
        lunasCount++;
        return 'V';
      }
      return '-';
    });

    const lunasNominal = lunasCount * IURAN_PER_BULAN;
    const tunggakanNominal = (12 - lunasCount) * IURAN_PER_BULAN;

    return [
      idx + 1,
      s.namaSekolah,
      ...monthsStatus,
      formatRupiah(lunasNominal),
      tunggakanNominal === 0 ? 'LUNAS' : formatRupiah(tunggakanNominal)
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: matrixHead,
    body: matrixRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7.5, cellPadding: 1.8, halign: 'center', overflow: 'linebreak' },
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { halign: 'left', cellWidth: 56 },
      14: { halign: 'right', cellWidth: 45.5 },
      15: { halign: 'right', cellWidth: 45.5 }
    },
    theme: 'grid'
  });

  // Continue immediately below without forced page break
  currentY = (doc as any).lastAutoTable.finalY + 8;
  if (currentY > 155) {
    doc.addPage('a4', 'landscape');
    currentY = 15;
  }

  // 2. Table Rincian Kas Masuk Iuran
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Rincian Kas Masuk (Iuran Terbayar)', 14, currentY);
  currentY += 3.5;

  const kasMasukHead = [['No', 'Tahun', 'Bulan', 'Tgl Bayar', 'Nama Instansi', 'Nominal', 'Keterangan / Tempat', 'Petugas']];
  const kasMasukRows = iuranTahunThis.map((i, idx) => [
    idx + 1,
    i.tahun,
    i.bulan,
    formatDateIndonesian(i.tanggalInput),
    i.namaSekolah,
    formatRupiah(i.nominal),
    i.keterangan || '-',
    resolveNamaBendahara(i.diinputOleh, undefined, sekolahList)
  ]);

  kasMasukRows.push(['', '', '', '', 'TOTAL IURAN MASUK', formatRupiah(totalIuranMasuk), '', '']);

  autoTable(doc, {
    startY: currentY,
    head: kasMasukHead,
    body: kasMasukRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 55 },
      5: { cellWidth: 40, halign: 'right' },
      6: { cellWidth: 55 },
      7: { cellWidth: 50 }
    },
    theme: 'striped'
  });

  // 3. Table Rincian Pemasukan Lain (Non-Iuran)
  if (pemasukanLainTahunThis.length > 0) {
    currentY = (doc as any).lastAutoTable.finalY + 8;
    if (currentY > 155) {
      doc.addPage('a4', 'landscape');
      currentY = 15;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('3. Rincian Pemasukan Kas Non-Iuran (Sponsor, Sisa Panitia, Hibah, Sumbangan)', 14, currentY);
    currentY += 3.5;

    const lainHead = [['No', 'Tanggal', 'Kategori', 'Sumber Dana / Pihak', 'Keterangan', 'Nominal', 'Petugas']];
    const lainRows = pemasukanLainTahunThis.map((l, idx) => [
      idx + 1,
      formatDateIndonesian(l.tanggal),
      l.kategori,
      l.sumberDana,
      l.keterangan || '-',
      formatRupiah(l.nominal),
      resolveNamaBendahara(l.diinputOleh, undefined, sekolahList)
    ]);

    lainRows.push(['', '', '', '', 'TOTAL PEMASUKAN NON-IURAN', formatRupiah(totalPemasukanLain), '']);

    autoTable(doc, {
      startY: currentY,
      head: lainHead,
      body: lainRows,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 42 },
        3: { cellWidth: 55 },
        4: { cellWidth: 54 },
        5: { cellWidth: 40, halign: 'right' },
        6: { cellWidth: 40 }
      },
      theme: 'striped'
    });
  }

  currentY = (doc as any).lastAutoTable.finalY + 8;
  if (currentY > 155) {
    doc.addPage('a4', 'landscape');
    currentY = 15;
  }

  // 4. Table Rincian Kas Keluar
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const sectionNum = pemasukanLainTahunThis.length > 0 ? '4' : '3';
  doc.text(`${sectionNum}. Rincian Kas Keluar (Pengeluaran Operasional)`, 14, currentY);
  currentY += 3.5;

  const kasKeluarHead = [['No', 'Tanggal', 'Alokasi Project / Kegiatan', 'Keterangan Tambahan', 'Nominal', 'Petugas']];
  const kasKeluarRows = pengeluaranTahunThis.map((p, idx) => [
    idx + 1,
    formatDateIndonesian(p.tanggal),
    p.project,
    p.keterangan,
    formatRupiah(p.nominal),
    resolveNamaBendahara(p.diinputOleh, undefined, sekolahList)
  ]);

  kasKeluarRows.push(['', '', 'TOTAL KAS KELUAR', '', formatRupiah(totalKasKeluar), '']);

  autoTable(doc, {
    startY: currentY,
    head: kasKeluarHead,
    body: kasKeluarRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 28, halign: 'center' },
      2: { cellWidth: 80 },
      3: { cellWidth: 71 },
      4: { cellWidth: 45, halign: 'right' },
      5: { cellWidth: 35 }
    },
    theme: 'striped'
  });

  // 5. Ringkasan Rekapitulasi Arus Kas Akhir (Total Masuk, Non-Iuran, Pengeluaran, Saldo Bersih)
  currentY = (doc as any).lastAutoTable.finalY + 8;
  if (currentY > 140) {
    doc.addPage('a4', 'landscape');
    currentY = 15;
  }

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const rekapSectionNum = pemasukanLainTahunThis.length > 0 ? '5' : '4';
  doc.text(`${rekapSectionNum}. Ringkasan Rekapitulasi Arus Kas & Saldo Akhir (Tahun ${tahun})`, 14, currentY);
  currentY += 3.5;

  const rekapAkhirHead = [['Komponen Arus Kas', 'Jumlah Nominal (Rp)', 'Rincian & Keterangan']];
  const rekapAkhirRows = [
    ['Total Penerimaan Iuran Anggota', formatRupiah(totalIuranMasuk), 'Iuran Sekolah Anggota MKKS'],
    ['Total Pemasukan Non-Iuran', formatRupiah(totalPemasukanLain), `${pemasukanLainTahunThis.length} Transaksi Non-Iuran (Sponsor/Sisa/Donasi)`],
    ['TOTAL KAS MASUK (Iuran + Non-Iuran)', formatRupiah(totalKasMasuk), 'Akumulasi Seluruh Penerimaan Dana Kas Masuk'],
    ['TOTAL KAS KELUAR (Pengeluaran Operasional)', formatRupiah(totalKasKeluar), `${pengeluaranTahunThis.length} Transaksi Pengeluaran Operasional & Program`],
    ['SALDO BERSIH KAS AKHIR', formatRupiah(saldoBersih), isSurplus ? 'STATUS: SURPLUS KAS' : 'STATUS: DEFISIT KAS']
  ];

  autoTable(doc, {
    startY: currentY,
    head: rekapAkhirHead,
    body: rekapAkhirRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: 'bold' },
      1: { cellWidth: 65, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 104 }
    },
    didParseCell: (data) => {
      // Highlight TOTAL KAS MASUK, TOTAL KAS KELUAR, and SALDO BERSIH rows
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [236, 253, 245];
        data.cell.styles.textColor = [6, 95, 70];
      } else if (data.row.index === 3) {
        data.cell.styles.fillColor = [255, 241, 242];
        data.cell.styles.textColor = [190, 18, 60];
      } else if (data.row.index === 4) {
        if (isSurplus) {
          data.cell.styles.fillColor = [238, 242, 255];
          data.cell.styles.textColor = [55, 48, 163];
        } else {
          data.cell.styles.fillColor = [255, 241, 242];
          data.cell.styles.textColor = [190, 18, 60];
        }
      }
    },
    theme: 'grid'
  });

  // 6. Table Hasil Audit & Rekonsiliasi Kas (Real vs Data)
  if (rekonsiliasiKas) {
    const totalSaldoReal = (rekonsiliasiKas.saldoCash || 0) + (rekonsiliasiKas.saldoBank || 0);
    const selisih = totalSaldoReal - saldoBersih;
    const isBal = Math.abs(selisih) === 0;

    currentY = (doc as any).lastAutoTable.finalY + 8;
    if (currentY > 140) {
      doc.addPage('a4', 'landscape');
      currentY = 15;
    }

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const auditSecNum = pemasukanLainTahunThis.length > 0 ? '6' : '5';
    doc.text(`${auditSecNum}. Hasil Audit & Rekonsiliasi Kas (Saldo Data vs Real Kas Tunai & Bank)`, 14, currentY);
    currentY += 3.5;

    const auditHead = [['Komponen Audit Keuangan', 'Jumlah Nominal (Rp)', 'Status & Keterangan Fisik / Rekening']];
    const auditRows = [
      ['Saldo Kas Menurut Pembukuan (Data Sistem)', formatRupiah(saldoBersih), 'Kalkulasi Total Kas Masuk dikurangi Total Pengeluaran'],
      ['1. Uang Kas Tunai / Cash (Brankas Bendahara)', formatRupiah(rekonsiliasiKas.saldoCash), 'Hasil hitung fisik uang tunai di kas bendahara'],
      ['2. Uang di Rekening Bank', formatRupiah(rekonsiliasiKas.saldoBank), `${rekonsiliasiKas.namaBank} - No. Rek: ${rekonsiliasiKas.nomorRekening} (a.n. ${rekonsiliasiKas.atasNamaRekening})`],
      ['TOTAL SALDO REAL FISIK (Cash + Bank)', formatRupiah(totalSaldoReal), 'Akumulasi seluruh uang nyata yang dimiliki organisasi'],
      ['SELISIH KAS (Real Fisik - Data Sistem)', isBal ? 'Rp 0' : (selisih > 0 ? `+${formatRupiah(selisih)}` : `-${formatRupiah(Math.abs(selisih))}`), isBal ? 'STATUS: BALANCE (SINKRON 100%)' : (selisih > 0 ? 'STATUS: SELISIH LEBIH' : 'STATUS: SELISIH KURANG')]
    ];

    autoTable(doc, {
      startY: currentY,
      head: auditHead,
      body: auditRows,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 100, fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 109 }
      },
      didParseCell: (data) => {
        if (data.row.index === 3) {
          data.cell.styles.fillColor = [204, 251, 241]; // teal-100
          data.cell.styles.textColor = [15, 118, 110];
        } else if (data.row.index === 4) {
          if (isBal) {
            data.cell.styles.fillColor = [236, 253, 245];
            data.cell.styles.textColor = [6, 95, 70];
          } else {
            data.cell.styles.fillColor = [255, 241, 242];
            data.cell.styles.textColor = [190, 18, 60];
          }
        }
      },
      theme: 'grid'
    });
  }

  // Footer Signatures (Ketua MKKS & Bendahara MKKS)
  currentY = (doc as any).lastAutoTable.finalY + 10;
  let signatureY = currentY;
  if (signatureY > 160) {
    doc.addPage('a4', 'landscape');
    signatureY = 25;
  }

  const ketuaUser = StorageService.getKetuaUser();
  const savedPejabat = StorageService.getPejabat();
  const namaKetua = ketuaUser?.namaKepsek || rekonsiliasiKas?.namaKetuaMkks || savedPejabat.namaKetuaMkks || 'Ketua MKKS';
  const nipKetua = rekonsiliasiKas?.nipKetuaMkks || savedPejabat.nipKetuaMkks || '';
  const jabatanKetua = rekonsiliasiKas?.jabatanKetuaMkks || savedPejabat.jabatanKetuaMkks || 'Ketua MKKS SMP Cimanggis & Tapos';

  const defaultBendahara = resolveNamaBendahara(currentUser?.namaKepsek || currentUser?.username, undefined, sekolahList);
  const namaBend = rekonsiliasiKas?.namaBendahara || savedPejabat.namaBendahara || defaultBendahara;
  const nipBend = rekonsiliasiKas?.nipBendahara || savedPejabat.nipBendahara || '';
  const jabatanBend = rekonsiliasiKas?.jabatanBendahara || savedPejabat.jabatanBendahara || 'Bendahara MKKS SMP Citos';

  const printDate = formatDateIndonesian(new Date().toISOString().split('T')[0]);

  // Sisi Kiri: Mengetahui Ketua MKKS
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Mengetahui,', 20, signatureY);
  doc.setFont('helvetica', 'bold');
  doc.text(jabatanKetua, 20, signatureY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.text(namaKetua, 20, signatureY + 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  if (nipKetua && nipKetua !== '-') {
    doc.text(`NIP. ${nipKetua}`, 20, signatureY + 29.5);
  }

  // Sisi Kanan: Bendahara MKKS
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Depok, ${printDate}`, 210, signatureY);
  doc.setFont('helvetica', 'bold');
  doc.text(jabatanBend, 210, signatureY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.text(namaBend, 210, signatureY + 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  if (nipBend && nipBend !== '-') {
    doc.text(`NIP. ${nipBend}`, 210, signatureY + 29.5);
  } else {
    doc.text('Petugas Pengelola Keuangan', 210, signatureY + 29.5);
  }

  doc.save(`Laporan_Keuangan_MKKS_${tahun}.pdf`);
}

export function exportRiwayatHapusToExcel(
  riwayatHapusList: RiwayatHapus[],
  tahun?: number
) {
  const wb = XLSX.utils.book_new();
  const sortedList = [...riwayatHapusList].sort((a, b) => {
    const timeA = new Date(a.tanggalHapus || a.timestamp || '').getTime() || 0;
    const timeB = new Date(b.tanggalHapus || b.timestamp || '').getTime() || 0;
    if (timeB !== timeA) return timeB - timeA;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  const logData = sortedList.map((r, idx) => ({
    'No': idx + 1,
    'Waktu Penghapusan': formatDateTimeIndonesian(r.timestamp || r.tanggalHapus),
    'Jenis Transaksi': (r.jenisTransaksi || r.jenis || '').toUpperCase(),
    'Identitas Transaksi': r.judulItem || r.judul || r.rincianData || '-',
    'Nominal Transaksi (Rp)': r.nominal || 0,
    'Alasan / Keterangan Penghapusan': r.alasanHapus || r.alasan || '-',
    'Dihapus Oleh': r.dihapusOleh || '-',
    'Role': r.rolePenghapus || r.role || r.roleUser || 'Bendahara',
    'ID Data Asli': r.idItemAsli || r.idTransaksi || r.id
  }));

  const ws = XLSX.utils.json_to_sheet(logData);
  XLSX.utils.book_append_sheet(wb, ws, `Riwayat Penghapusan`);
  XLSX.writeFile(wb, `Laporan_Riwayat_Penghapusan_Data_${tahun || 'Semua'}.xlsx`);
}

export function exportRiwayatHapusToPDF(
  riwayatHapusList: RiwayatHapus[],
  currentUser?: User | null,
  sekolahList: Sekolah[] = []
) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const sortedList = [...riwayatHapusList].sort((a, b) => {
    const timeA = new Date(a.tanggalHapus || a.timestamp || '').getTime() || 0;
    const timeB = new Date(b.tanggalHapus || b.timestamp || '').getTime() || 0;
    if (timeB !== timeA) return timeB - timeA;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  // Header Laporan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('MUSYAWARAH KERJA KEPALA SEKOLAH (MKKS)', 147, 13, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text('AUDIT LOG & LAPORAN RIWAYAT PENGHAPUSAN DATA KEUANGAN', 147, 19.5, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Kecamatan Cimanggis dan Tapos • Total ${sortedList.length} Catatan Data Dihapus`, 147, 25.5, { align: 'center' });
  
  doc.setLineWidth(0.4);
  doc.setDrawColor(244, 63, 94);
  doc.line(14, 28.5, 283, 28.5);

  const tableBody = sortedList.map((r, idx) => [
    idx + 1,
    formatDateTimeIndonesian(r.timestamp || r.tanggalHapus),
    (r.jenisTransaksi || r.jenis || '').toUpperCase(),
    r.judulItem || r.judul || r.rincianData || '-',
    formatRupiah(r.nominal || 0),
    r.alasanHapus || r.alasan || '-',
    `${r.dihapusOleh || '-'} (${r.rolePenghapus || r.role || r.roleUser || 'Bendahara'})`
  ]);

  autoTable(doc, {
    startY: 33,
    head: [['No', 'Waktu Hapus', 'Jenis', 'Item / Rincian', 'Nominal', 'Alasan / Keterangan Dihapus', 'Dihapus Oleh']],
    body: tableBody,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [159, 18, 57], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 28, fontStyle: 'bold' },
      3: { cellWidth: 55, fontStyle: 'bold' },
      4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 65 },
      6: { cellWidth: 44 }
    },
    alternateRowStyles: { fillColor: [255, 241, 242] },
    theme: 'grid'
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 140;
  let signatureY = finalY + 10;
  if (signatureY > 165) {
    doc.addPage('a4', 'landscape');
    signatureY = 25;
  }

  const bendaharaName = resolveNamaBendahara(currentUser?.namaKepsek || currentUser?.username, undefined, sekolahList);
  const printDate = formatDateIndonesian(new Date().toISOString().split('T')[0]);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Depok, ${printDate}`, 220, signatureY);
  doc.text('Mengetahui / Penanggung Jawab,', 220, signatureY + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(bendaharaName, 220, signatureY + 25);

  doc.save(`Laporan_Riwayat_Penghapusan_Data_${new Date().toISOString().split('T')[0]}.pdf`);
}

export interface ExportBeritaAcaraPDFParams {
  auditData: RekonsiliasiKas;
  saldoData: number;
  totalKasMasuk: number;
  totalKasKeluar: number;
  totalIuranMasuk: number;
  totalPemasukanLain: number;
  kotaAudit?: string;
  namaKetuaMkks?: string;
  nipKetuaMkks?: string;
  jabatanKetuaMkks?: string;
  namaBendahara?: string;
  nipBendahara?: string;
  jabatanBendahara?: string;
  tanggalAudit?: string;
}

export function exportBeritaAcaraToPDF(params: ExportBeritaAcaraPDFParams) {
  const {
    auditData,
    saldoData,
    totalKasMasuk,
    totalKasKeluar,
    totalIuranMasuk,
    totalPemasukanLain,
    kotaAudit = 'Depok',
    namaKetuaMkks = 'Dra. H. Nurbaiti',
    nipKetuaMkks = '-',
    jabatanKetuaMkks = 'Ketua MKKS SMP Citos',
    namaBendahara = 'H. Nurhasan, M.Pd',
    nipBendahara = '',
    jabatanBendahara = 'Bendahara MKKS SMP Citos',
    tanggalAudit = auditData.tanggalAudit
  } = params;

  const doc = new jsPDF('portrait', 'mm', 'a4');
  const totalSaldoReal = (auditData.saldoCash || 0) + (auditData.saldoBank || 0);
  const selisih = totalSaldoReal - saldoData;
  const isBalance = Math.abs(selisih) === 0;
  const isLebih = selisih > 0;

  // 1. Kop Dokumen Resmi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(71, 85, 105);
  doc.text('MUSYAWARAH KERJA KEPALA SEKOLAH (MKKS) SMP', 105, 16, { align: 'center' });

  doc.setFontSize(14.5);
  doc.setTextColor(15, 23, 42);
  doc.text('KECAMATAN CIMANGGIS & TAPOS (CITOS)', 105, 22.5, { align: 'center' });

  // Double border line kop surat
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(15, 26, 195, 26);
  doc.setLineWidth(0.2);
  doc.line(15, 27.2, 195, 27.2);

  // 2. Judul Berita Acara
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('BERITA ACARA PEMERIKSAAN KAS & REKONSILIASI', 105, 34, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Nomor: BA.KAS/${auditData.tahun}/${auditData.id || '01'}`, 105, 39, { align: 'center' });

  // 3. Kalimat Pengantar
  const tglTeks = formatDateIndonesian(tanggalAudit || auditData.tanggalAudit);
  const introText = `Pada hari ini, tanggal ${tglTeks}, telah dilakukan pemeriksaan dan audit keselarasan keuangan (Kas Opname & Rekonsiliasi Bank) atas pembukuan kas MKKS SMP Cimanggis & Tapos (CITOS) untuk Tahun Anggaran / Buku ${auditData.tahun}. Berdasarkan hasil pemeriksaan data sistem dan penghitungan fisik uang tunai serta rekening bank, diperoleh hasil sebagai berikut:`;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const splitIntro = doc.splitTextToSize(introText, 180);
  doc.text(splitIntro, 15, 45);

  let curY = 45 + (splitIntro.length * 4.2) + 2;

  // 4. Tabel I: Data Pembukuan Sistem
  autoTable(doc, {
    startY: curY,
    margin: { left: 15, right: 15 },
    head: [[
      { content: 'I. SALDO MENURUT PEMBUKUAN DATA (SISTEM)', styles: { halign: 'left', fontStyle: 'bold' } },
      { content: formatRupiah(saldoData), styles: { halign: 'right', fontStyle: 'bold' } }
    ]],
    body: [
      ['Total Penerimaan Iuran Anggota Sekolah', formatRupiah(totalIuranMasuk)],
      ['Total Pemasukan Non-Iuran (Sponsor / Donasi / Sisa)', formatRupiah(totalPemasukanLain)],
      [{ content: 'TOTAL PENERIMAAN KAS (A)', styles: { fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [6, 95, 70] } }, { content: formatRupiah(totalKasMasuk), styles: { fontStyle: 'bold', halign: 'right', fillColor: [236, 253, 245], textColor: [6, 95, 70] } }],
      [{ content: 'TOTAL PENGELUARAN OPERASIONAL & PROGRAM (B)', styles: { fontStyle: 'bold', fillColor: [255, 241, 242], textColor: [159, 18, 57] } }, { content: formatRupiah(totalKasKeluar), styles: { fontStyle: 'bold', halign: 'right', fillColor: [255, 241, 242], textColor: [159, 18, 57] } }],
      [{ content: 'SALDO BERSIH MENURUT DATA (A - B)', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }, { content: formatRupiah(saldoData), styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }]
    ],
    theme: 'grid',
    headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 50, halign: 'right' }
    }
  });

  curY = (doc as any).lastAutoTable.finalY + 4;

  // 5. Tabel II: Saldo Fisik & Bank
  autoTable(doc, {
    startY: curY,
    margin: { left: 15, right: 15 },
    head: [[
      { content: 'II. SALDO KEUANGAN SECARA REAL (FISIK & BANK)', styles: { halign: 'left', fontStyle: 'bold' } },
      { content: formatRupiah(totalSaldoReal), styles: { halign: 'right', fontStyle: 'bold' } }
    ]],
    body: [
      [
        '1. Uang Tunai / Cash (Brankas Bendahara) - Hasil hitung fisik uang tunai',
        formatRupiah(auditData.saldoCash || 0)
      ],
      [
        `2. Uang di Rekening Bank - ${auditData.namaBank || 'Bank'} No. ${auditData.nomorRekening || '-'} (a.n. ${auditData.atasNamaRekening || '-'})`,
        formatRupiah(auditData.saldoBank || 0)
      ],
      [
        { content: 'TOTAL SALDO REAL FISIK (1 + 2)', styles: { fontStyle: 'bold', fillColor: [204, 251, 241], textColor: [19, 78, 74] } },
        { content: formatRupiah(totalSaldoReal), styles: { fontStyle: 'bold', halign: 'right', fillColor: [204, 251, 241], textColor: [19, 78, 74] } }
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [204, 251, 241], textColor: [19, 78, 74], fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 50, halign: 'right' }
    }
  });

  curY = (doc as any).lastAutoTable.finalY + 4;

  // 6. Box III: Kesimpulan & Status
  const statusLabel = isBalance 
    ? 'BALANCE / COCOK (Rp 0)' 
    : isLebih 
    ? `SELISIH LEBIH (+${formatRupiah(selisih)})` 
    : `SELISIH KURANG (-${formatRupiah(Math.abs(selisih))})`;

  const statusExplanation = isBalance
    ? 'Seluruh pencatatan kas menurut sistem pembukuan telah SINKRON SEMPURNA (BALANCE) dengan total uang fisik tunai di bendahara dan saldo di rekening bank. Tidak terdapat selisih pembukuan.'
    : isLebih
    ? `Ditemukan SELISIH LEBIH sebesar ${formatRupiah(selisih)} di mana total uang fisik/rekening lebih banyak daripada saldo yang tercatat di laporan. Harap cek kembali kemungkinan adanya penerimaan yang belum terinput.`
    : `Ditemukan SELISIH KURANG sebesar ${formatRupiah(Math.abs(selisih))} di mana uang fisik/rekening lebih kecil daripada saldo di laporan pembukuan. Harap cek kembali kemungkinan adanya kuitansi pengeluaran yang belum dicatat atau kekurangan kas.`;

  const boxBgColor: [number, number, number] = isBalance ? [236, 253, 245] : isLebih ? [254, 243, 199] : [255, 241, 242];
  const boxBorderColor: [number, number, number] = isBalance ? [110, 231, 183] : isLebih ? [252, 211, 77] : [253, 164, 175];
  const boxTextColor: [number, number, number] = isBalance ? [6, 95, 70] : isLebih ? [146, 64, 14] : [159, 18, 57];

  doc.setFillColor(...boxBgColor);
  doc.setDrawColor(...boxBorderColor);
  doc.setLineWidth(0.35);

  const splitExp = doc.splitTextToSize(statusExplanation, 172);
  const noteLines = auditData.catatanAudit ? doc.splitTextToSize(`Catatan Pemeriksa: "${auditData.catatanAudit}"`, 172) : [];
  const boxHeight = 12 + (splitExp.length * 3.8) + (noteLines.length ? (noteLines.length * 3.8 + 4) : 0);

  doc.roundedRect(15, curY, 180, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...boxTextColor);
  doc.text('III. KESIMPULAN HASIL AUDIT / REKONSILIASI', 19, curY + 6);
  doc.text(statusLabel, 191, curY + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(splitExp, 19, curY + 11);

  if (noteLines.length) {
    const noteY = curY + 11 + (splitExp.length * 3.8) + 2;
    doc.setFont('helvetica', 'italic');
    doc.text(noteLines, 19, noteY);
  }

  curY += boxHeight + 4;

  // 7. Rincian Pecahan Uang Kertas & Koin (jika ada)
  if (auditData.pecahanCash) {
    const p = auditData.pecahanCash;
    const cashDetailText = `Rincian Fisik Kas: 100rb: ${p.pecahan100k || 0} lbr • 50rb: ${p.pecahan50k || 0} lbr • 20rb: ${p.pecahan20k || 0} lbr • 10rb: ${p.pecahan10k || 0} lbr • 5rb: ${p.pecahan5k || 0} lbr • 2rb: ${p.pecahan2k || 0} lbr • 1rb: ${p.pecahan1k || 0} lbr • Koin: ${formatRupiah(p.koin || 0)}`;
    
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(15, curY, 180, 8, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(cashDetailText, 19, curY + 5.2);

    curY += 11;
  }

  // 8. Kalimat Penutup
  const closingText = 'Demikian Berita Acara Pemeriksaan Kas ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya dan menjadi dokumen pertanggungjawaban keuangan organisasi.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const splitClose = doc.splitTextToSize(closingText, 180);
  doc.text(splitClose, 15, curY);

  curY += (splitClose.length * 4) + 6;

  // Check if we need page break for signature or adjust
  if (curY > 240) {
    doc.addPage('a4', 'portrait');
    curY = 25;
  }

  // 9. Kolom Tanda Tangan (2 Kolom Sejajar)
  // Kolom Kiri: Ketua MKKS
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Mengetahui,', 40, curY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(jabatanKetuaMkks || 'Ketua MKKS SMP Citos', 40, curY + 5, { align: 'center' });

  // Kolom Kanan: Bendahara
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${kotaAudit}, ${tglTeks}`, 160, curY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(jabatanBendahara || 'Bendahara MKKS SMP Citos', 160, curY + 5, { align: 'center' });

  // Ruang Tanda Tangan
  const sigY = curY + 26;

  // Nama & NIP Ketua MKKS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(namaKetuaMkks || 'Dra. H. Nurbaiti', 40, sigY, { align: 'center' });
  doc.setLineWidth(0.3);
  const ketuaWidth = doc.getTextWidth(namaKetuaMkks || 'Dra. H. Nurbaiti');
  doc.line(40 - (ketuaWidth / 2), sigY + 1, 40 + (ketuaWidth / 2), sigY + 1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(nipKetuaMkks && nipKetuaMkks !== '-' ? `NIP. ${nipKetuaMkks}` : 'Ketua MKKS SMP Citos', 40, sigY + 5.5, { align: 'center' });

  // Nama & NIP Bendahara
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(namaBendahara || 'H. Nurhasan, M.Pd', 160, sigY, { align: 'center' });
  const bendaharaWidth = doc.getTextWidth(namaBendahara || 'H. Nurhasan, M.Pd');
  doc.line(160 - (bendaharaWidth / 2), sigY + 1, 160 + (bendaharaWidth / 2), sigY + 1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(nipBendahara ? `NIP. ${nipBendahara}` : 'Petugas Pemeriksa Kas', 160, sigY + 5.5, { align: 'center' });

  // Save PDF
  const filename = `Berita-Acara-Audit-Kas-CITOS-${auditData.tahun || 2026}.pdf`;
  doc.save(filename);
  return filename;
}
