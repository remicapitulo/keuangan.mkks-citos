import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sekolah, Iuran, Pengeluaran, PemasukanLain, BULAN_LIST, BULAN_SINGKAT, IURAN_PER_BULAN, User } from '../types';
import { formatRupiah, formatDateIndonesian, resolveNamaBendahara } from '../utils/formatters';

export function exportToExcel(
  tahun: number,
  sekolahList: Sekolah[],
  iuranList: Iuran[],
  pengeluaranList: Pengeluaran[],
  pemasukanLainList: PemasukanLain[] = []
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet Matriks Iuran
  const iuranTahunThis = iuranList.filter(i => i.tahun === tahun);
  
  const matrixData = sekolahList.map((s, index) => {
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
    row['Sisa Tunggakan (Rp)'] = totalTunggakanNominal;

    return row;
  });

  const wsMatrix = XLSX.utils.json_to_sheet(matrixData);
  XLSX.utils.book_append_sheet(wb, wsMatrix, `Matriks Iuran ${tahun}`);

  // 2. Sheet Rincian Kas Masuk Iuran
  const kasMasukData = iuranTahunThis.map((i, idx) => ({
    'No': idx + 1,
    'Tahun Buku': i.tahun,
    'Bulan Pembayaran': i.bulan,
    'Tanggal Pembayaran': i.tanggalInput,
    'Nama Instansi': i.namaSekolah,
    'Jumlah Nominal (Rp)': i.nominal,
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
    'Diinput Oleh': '',
    'No. Kuitansi': ''
  } as any);

  const wsKasMasuk = XLSX.utils.json_to_sheet(kasMasukData);
  XLSX.utils.book_append_sheet(wb, wsKasMasuk, `Kas Masuk Iuran ${tahun}`);

  // 3. Sheet Rincian Pemasukan Lain (Non-Iuran)
  const pemasukanLainTahunThis = pemasukanLainList.filter(p => p.tanggal.startsWith(`${tahun}`));
  const pemasukanLainData = pemasukanLainTahunThis.map((p, idx) => ({
    'No': idx + 1,
    'Tanggal Transaksi': p.tanggal,
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
  const pengeluaranTahunThis = pengeluaranList.filter(p => p.tanggal.startsWith(`${tahun}`));
  const kasKeluarData = pengeluaranTahunThis.map((p, idx) => ({
    'No': idx + 1,
    'Tanggal Transaksi': p.tanggal,
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

  // Trigger browser download
  XLSX.writeFile(wb, `Laporan_Keuangan_MKKS_Citos_${tahun}.xlsx`);
}

export function exportToPDF(
  tahun: number,
  sekolahList: Sekolah[],
  iuranList: Iuran[],
  pengeluaranList: Pengeluaran[],
  currentUser?: User | null,
  pemasukanLainList: PemasukanLain[] = []
) {
  const doc = new jsPDF('landscape', 'mm', 'a4');

  // Pre-calculate financial totals
  const iuranTahunThis = iuranList.filter(i => i.tahun === tahun);
  const pemasukanLainTahunThis = pemasukanLainList.filter(p => p.tanggal.startsWith(`${tahun}`));
  const pengeluaranTahunThis = pengeluaranList.filter(p => p.tanggal.startsWith(`${tahun}`));

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
  doc.text('TOTAL MASUK', c1X + 4, cardY + 4.5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text(formatRupiah(totalKasMasuk), c1X + 4, cardY + 9.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Iuran & Non-Iuran (${tahun})`, c1X + 4, cardY + 13);

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
  const matrixRows = sekolahList.map((s, idx) => {
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
      formatRupiah(tunggakanNominal)
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

  const kasMasukHead = [['No', 'Tahun', 'Bulan', 'Tgl Bayar', 'Nama Instansi', 'Nominal', 'Petugas']];
  const kasMasukRows = iuranTahunThis.map((i, idx) => [
    idx + 1,
    i.tahun,
    i.bulan,
    formatDateIndonesian(i.tanggalInput),
    i.namaSekolah,
    formatRupiah(i.nominal),
    resolveNamaBendahara(i.diinputOleh, undefined, sekolahList)
  ]);

  kasMasukRows.push(['', '', '', '', 'TOTAL IURAN MASUK', formatRupiah(totalIuranMasuk), '']);

  autoTable(doc, {
    startY: currentY,
    head: kasMasukHead,
    body: kasMasukRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 28, halign: 'center' },
      4: { cellWidth: 84 },
      5: { cellWidth: 45, halign: 'right' },
      6: { cellWidth: 65 }
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
    ['Total Penerimaan Iuran Anggota', formatRupiah(totalIuranMasuk), `Iuran 10 Sekolah Anggota MKKS (${iuranTahunThis.length} kali bayar)`],
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

  // Footer Signature
  currentY = (doc as any).lastAutoTable.finalY + 10;
  let signatureY = currentY;
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
  doc.text('Bendahara MKKS,', 220, signatureY + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(bendaharaName, 220, signatureY + 25);

  doc.save(`Laporan_Keuangan_MKKS_${tahun}.pdf`);
}
