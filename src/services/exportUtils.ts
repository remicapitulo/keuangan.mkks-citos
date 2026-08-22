import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sekolah, Iuran, Pengeluaran, BULAN_LIST, BULAN_SINGKAT, IURAN_PER_BULAN, User } from '../types';
import { formatRupiah, formatDateIndonesian, resolveNamaBendahara } from '../utils/formatters';

export function exportToExcel(
  tahun: number,
  sekolahList: Sekolah[],
  iuranList: Iuran[],
  pengeluaranList: Pengeluaran[]
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

  // 2. Sheet Rincian Kas Masuk
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

  const totalKasMasuk = iuranTahunThis.reduce((acc, curr) => acc + curr.nominal, 0);
  kasMasukData.push({
    'No': '',
    'Tahun Buku': '',
    'Bulan Pembayaran': '',
    'Tanggal Pembayaran': '',
    'Nama Instansi': 'TOTAL KAS MASUK',
    'Jumlah Nominal (Rp)': totalKasMasuk,
    'Diinput Oleh': '',
    'No. Kuitansi': ''
  } as any);

  const wsKasMasuk = XLSX.utils.json_to_sheet(kasMasukData);
  XLSX.utils.book_append_sheet(wb, wsKasMasuk, `Kas Masuk ${tahun}`);

  // 3. Sheet Rincian Kas Keluar
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

  // Trigger browser download
  XLSX.writeFile(wb, `Laporan_Keuangan_MKKS_Citos_${tahun}.xlsx`);
}

export function exportToPDF(
  tahun: number,
  sekolahList: Sekolah[],
  iuranList: Iuran[],
  pengeluaranList: Pengeluaran[],
  currentUser?: User | null
) {
  const doc = new jsPDF('landscape', 'mm', 'a4');

  // Header Laporan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MUSYAWARAH KERJA KEPALA SEKOLAH (MKKS)', 147, 15, { align: 'center' });
  doc.setFontSize(14);
  doc.text('KECAMATAN CIMANGGIS DAN TAPOS', 147, 22, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`LAPORAN KEUANGAN & IURAN ANGGOTA TAHUN BUKU ${tahun}`, 147, 29, { align: 'center' });
  
  doc.setLineWidth(0.5);
  doc.line(14, 32, 283, 32);

  let currentY = 38;

  // 1. Matriks Iuran Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`1. Matriks Status Pembayaran Iuran Per Sekolah (Tahun ${tahun})`, 14, currentY);
  currentY += 4;

  const iuranTahunThis = iuranList.filter(i => i.tahun === tahun);

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

  // 2. Table Rincian Kas Masuk
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. Rincian Kas Masuk (Iuran Terbayar)', 14, currentY);
  currentY += 4;

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

  const totalKasMasuk = iuranTahunThis.reduce((acc, curr) => acc + curr.nominal, 0);
  kasMasukRows.push(['', '', '', '', 'TOTAL KAS MASUK', formatRupiah(totalKasMasuk), '']);

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

  currentY = (doc as any).lastAutoTable.finalY + 8;
  if (currentY > 155) {
    doc.addPage('a4', 'landscape');
    currentY = 15;
  }

  // 3. Table Rincian Kas Keluar
  const pengeluaranTahunThis = pengeluaranList.filter(p => p.tanggal.startsWith(`${tahun}`));
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Rincian Kas Keluar (Pengeluaran Operasional)', 14, currentY);
  currentY += 4;

  const kasKeluarHead = [['No', 'Tanggal', 'Alokasi Project / Kegiatan', 'Keterangan Tambahan', 'Nominal', 'Petugas']];
  const kasKeluarRows = pengeluaranTahunThis.map((p, idx) => [
    idx + 1,
    formatDateIndonesian(p.tanggal),
    p.project,
    p.keterangan,
    formatRupiah(p.nominal),
    resolveNamaBendahara(p.diinputOleh, undefined, sekolahList)
  ]);

  const totalKasKeluar = pengeluaranTahunThis.reduce((acc, curr) => acc + curr.nominal, 0);
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
  doc.text(`Depok, ${printDate}`, 220, signatureY);
  doc.text('Bendahara MKKS,', 220, signatureY + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(bendaharaName, 220, signatureY + 25);

  doc.save(`Laporan_Keuangan_MKKS_${tahun}.pdf`);
}
