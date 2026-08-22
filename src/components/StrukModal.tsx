import React, { useState, useEffect } from 'react';
import { formatRupiah, terbilang, formatDateIndonesian, resolveNamaBendahara } from '../utils/formatters';
import { Printer, CheckCircle2, X, Download, ShieldCheck, Building2, QrCode, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface StrukModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    noKuitansi: string;
    tanggal: string;
    namaSekolah: string;
    namaKepsek?: string;
    alamatSekolah?: string;
    tahunBuku: number;
    bulanList: string[];
    totalNominal: number;
    diinputOleh: string;
  } | null;
  onOpenValidasiModal?: (data: any) => void;
}

export const StrukModal: React.FC<StrukModalProps> = ({
  isOpen,
  onClose,
  data,
  onOpenValidasiModal
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const bendaharaFullName = data ? resolveNamaBendahara(data.diinputOleh) : 'H. Nurhasan, M.Pd';

  // Generate QR Code data URL when data is present
  useEffect(() => {
    if (!data) {
      setQrCodeUrl('');
      return;
    }

    const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const appPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    
    // Construct the verification URL that when scanned opens the validasi modal
    const verifyUrl = `${appOrigin}${appPath}?verify=${encodeURIComponent(data.noKuitansi)}&sekolah=${encodeURIComponent(data.namaSekolah)}&bulan=${encodeURIComponent(data.bulanList.join(','))}&tahun=${data.tahunBuku}&nominal=${data.totalNominal}&tgl=${encodeURIComponent(data.tanggal)}&petugas=${encodeURIComponent(bendaharaFullName)}`;

    QRCode.toDataURL(verifyUrl, {
      width: 256,
      margin: 1,
      color: {
        dark: '#042f2e',
        light: '#ffffff'
      }
    }).then(url => {
      setQrCodeUrl(url);
    }).catch(err => {
      console.error('Failed to generate QR Code:', err);
    });
  }, [data, bendaharaFullName]);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    const printElement = document.getElementById('printable-kuitansi');
    if (!printElement) {
      window.print();
      return;
    }

    const printWin = window.open('', '_blank', 'width=800,height=700');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Kuitansi MKKS Citos - ${data.noKuitansi}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                padding: 16px;
                background: #ffffff !important;
                color: #1e293b;
                display: flex;
                justify-content: center;
                align-items: center;
              }
              @page {
                size: A5 portrait;
                margin: 6mm;
              }
              .kuitansi-print-card {
                max-width: 560px;
                width: 100%;
                margin: 0 auto;
                border: 2px dashed #0d9488 !important;
                padding: 22px;
                border-radius: 16px !important;
                background: #f8fafc !important;
                box-shadow: none !important;
              }
              .total-terbayar-box {
                background: #0f766e !important;
                background: linear-gradient(to right, #0f766e, #047857) !important;
                color: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              svg {
                display: inline-block !important;
                vertical-align: middle !important;
                color: currentColor !important;
                flex-shrink: 0 !important;
              }
              svg.w-3\.5, svg.w-3 {
                width: 14px !important;
                height: 14px !important;
              }
            </style>
          </head>
          <body>
            <div class="kuitansi-print-card">
              ${printElement.innerHTML}
            </div>
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 600);
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
    } else {
      window.print();
    }
  };

  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    try {
      // Create A5 Portrait PDF: 148 mm width x 210 mm height
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const cardX = 11;
      const cardY = 12;
      const cardWidth = 126;
      const cardHeight = 186;
      const innerLeft = cardX + 6;
      const innerRight = cardX + cardWidth - 6;
      const innerWidth = cardWidth - 12;
      const centerX = 74;

      // 1. Draw outer Card Background with Rounded Corners
      doc.setFillColor(248, 250, 252); // slate-50 (#f8fafc)
      doc.setDrawColor(13, 148, 136); // teal-600 (#0d9488)
      doc.setLineWidth(0.5);
      // Dashed teal border
      doc.setLineDashPattern([2.5, 1.5], 0);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 4, 4, 'FD');
      doc.setLineDashPattern([], 0); // reset dash

      // 2. Top Header Pill Badge
      const headerTitle = 'MKKS CIMANGGIS & TAPOS • DEPOK';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const textW = doc.getTextWidth(headerTitle);
      const iconW = 3.2;
      const iconGap = 1.6;
      const totalHeaderW = iconW + iconGap + textW;

      const badgeW = Math.max(68, totalHeaderW + 8);
      const badgeH = 6.5;
      const badgeX = centerX - (badgeW / 2);
      const badgeY = cardY + 6;
      doc.setFillColor(240, 253, 250); // teal-50 (#f0fdfa)
      doc.setDrawColor(153, 246, 228); // teal-200 (#99f6e4)
      doc.setLineWidth(0.3);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3.25, 3.25, 'FD');

      // Draw Building vector icon in Header Pill
      const iconStartX = centerX - (totalHeaderW / 2);
      const iconStartY = badgeY + 1.6;

      doc.setDrawColor(13, 148, 136); // teal-600
      doc.setFillColor(13, 148, 136);
      doc.setLineWidth(0.28);

      // Building frame
      doc.rect(iconStartX, iconStartY + 0.6, 3.2, 2.5, 'S');
      // Roof / top triangle
      doc.line(iconStartX - 0.2, iconStartY + 0.6, iconStartX + 1.6, iconStartY);
      doc.line(iconStartX + 1.6, iconStartY, iconStartX + 3.4, iconStartY + 0.6);
      // Door
      doc.rect(iconStartX + 1.15, iconStartY + 1.8, 0.9, 1.3, 'FD');
      // Windows
      doc.rect(iconStartX + 0.4, iconStartY + 1.0, 0.5, 0.45, 'FD');
      doc.rect(iconStartX + 2.3, iconStartY + 1.0, 0.5, 0.45, 'FD');

      // Header Text next to icon
      doc.setTextColor(15, 118, 110); // teal-700
      doc.text(headerTitle, iconStartX + iconW + iconGap, badgeY + 4.5);

      // 3. Main Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('KUITANSI PEMBAYARAN IURAN', centerX, badgeY + 13.5, { align: 'center' });

      // 4. No Kuitansi Pill
      const noPillW = 58;
      const noPillH = 5.5;
      const noPillX = centerX - (noPillW / 2);
      const noPillY = badgeY + 16.5;
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(noPillX, noPillY, noPillW, noPillH, 2.75, 2.75, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(13, 148, 136); // teal-600
      doc.text(`No : ${data.noKuitansi}`, centerX, noPillY + 3.8, { align: 'center' });

      // 5. Divider Line
      let y = noPillY + 9;
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.4);
      doc.line(innerLeft, y, innerRight, y);

      // Helper function for standard detail rows
      const drawRow = (label: string, value: string, isBoldVal = false, customColorVal?: [number, number, number]) => {
        y += 6.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(label, innerLeft, y);

        doc.setFont('helvetica', isBoldVal ? 'bold' : 'normal');
        doc.setFontSize(8);
        if (customColorVal) {
          doc.setTextColor(customColorVal[0], customColorVal[1], customColorVal[2]);
        } else {
          doc.setTextColor(15, 23, 42); // slate-900
        }
        doc.text(value, innerRight, y, { align: 'right' });

        // separator line
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.25);
        doc.line(innerLeft, y + 2.5, innerRight, y + 2.5);
      };

      // Row 1: Tanggal Transaksi
      drawRow('Tanggal Transaksi', formatDateIndonesian(data.tanggal), true);

      // Row 2: Telah Terima Dari
      drawRow('Telah Terima Dari', data.namaSekolah, true, [15, 23, 42]);

      // Row 3: Kepala Sekolah (if exists)
      if (data.namaKepsek && data.namaKepsek.trim()) {
        drawRow('Kepala Sekolah', data.namaKepsek, false, [51, 65, 85]);
      }

      // Row 4: Uang Sejumlah (Rounded Box)
      y += 5;
      const boxW = innerWidth;
      const boxH = 12.5;
      doc.setFillColor(240, 253, 250); // teal-50
      doc.setDrawColor(153, 246, 228); // teal-200
      doc.setLineWidth(0.3);
      doc.roundedRect(innerLeft, y, boxW, boxH, 2.5, 2.5, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('Uang Sejumlah :', innerLeft + 3, y + 4.2);

      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(8);
      doc.setTextColor(15, 118, 110); // teal-700
      const terbilangText = `"${terbilang(data.totalNominal)}"`;
      const splitTerbilang = doc.splitTextToSize(terbilangText, boxW - 6);
      doc.text(splitTerbilang, innerLeft + 3, y + 8.5);

      y += boxH + 2;

      // Row 5: Untuk Pembayaran
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('Untuk Pembayaran', innerLeft, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59); // slate-800
      const pembayaranStr = `Iuran Anggota MKKS Bulan ${data.bulanList.join(', ')} (Tahun ${data.tahunBuku})`;
      const splitPem = doc.splitTextToSize(pembayaranStr, 70);
      doc.text(splitPem, innerRight, y, { align: 'right' });

      y += (splitPem.length * 4) + 2;

      // 6. TOTAL TERBAYAR Highlight Box (Identical Rich Teal / Emerald Colors)
      const totalBoxH = 13;
      doc.setFillColor(15, 118, 110); // #0f766e (teal-700)
      doc.setDrawColor(13, 148, 136); // #0d9488 (teal-600)
      doc.setLineWidth(0.4);
      doc.roundedRect(innerLeft, y, innerWidth, totalBoxH, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('TOTAL TERBAYAR :', innerLeft + 4, y + 8.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(255, 255, 255);
      doc.text(formatRupiah(data.totalNominal), innerRight - 4, y + 8.8, { align: 'right' });

      y += totalBoxH + 6;

      // 7. Footer: QR Code Validasi on Left, Signature on Right
      const validationBoxW = 54;
      const validationBoxH = 29;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(204, 251, 241); // teal-100
      doc.setLineWidth(0.3);
      doc.roundedRect(innerLeft, y, validationBoxW, validationBoxH, 2.5, 2.5, 'FD');

      if (qrCodeUrl) {
        try {
          doc.addImage(qrCodeUrl, 'PNG', innerLeft + 2, y + 3.5, 22, 22);
        } catch (e) {
          console.error('Error adding QR code image to PDF:', e);
        }
      }

      // Validasi Resmi header with ShieldCheck vector icon
      const textX = innerLeft + 25.5;
      const shieldX = textX;
      const shieldY = y + 3.6;
      const sW = 3.2;
      const sH = 3.6;

      // Draw Shield icon contour
      doc.setDrawColor(5, 150, 105); // emerald-600
      doc.setLineWidth(0.32);
      doc.line(shieldX, shieldY, shieldX + sW, shieldY);
      doc.line(shieldX, shieldY, shieldX, shieldY + 1.8);
      doc.line(shieldX + sW, shieldY, shieldX + sW, shieldY + 1.8);
      doc.line(shieldX, shieldY + 1.8, shieldX + (sW / 2), shieldY + sH);
      doc.line(shieldX + sW, shieldY + 1.8, shieldX + (sW / 2), shieldY + sH);

      // Draw Checkmark inside shield
      doc.setDrawColor(5, 150, 105);
      doc.setLineWidth(0.36);
      doc.line(shieldX + 0.8, shieldY + 1.7, shieldX + 1.4, shieldY + 2.4);
      doc.line(shieldX + 1.4, shieldY + 2.4, shieldX + 2.4, shieldY + 1.0);

      // Validasi Resmi text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(6, 95, 70); // emerald-800
      doc.text('VALIDASI RESMI', textX + 4.4, y + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('Pindai QR / Barcode', textX, y + 10.5);
      doc.text('untuk cek keaslian', textX, y + 14);
      doc.text('kuitansi sah MKKS Citos.', textX, y + 17.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.8);
      doc.setTextColor(148, 163, 184); // slate-400
      const cleanKwtId = (data.noKuitansi || 'KWT').replace(/[^A-Za-z0-9]/g, '');
      doc.text(`ID: ${cleanKwtId.slice(-10)}`, textX, y + 23);

      // Signature Block on Right side
      const sigX = innerRight;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Depok, ${formatDateIndonesian(data.tanggal)}`, sigX, y + 4.5, { align: 'right' });

      // Bendahara Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(bendaharaFullName, sigX, y + 20, { align: 'right' });

      // Teal Underline beneath signature name
      const nameWidth = doc.getTextWidth(bendaharaFullName);
      doc.setDrawColor(13, 148, 136); // teal-600
      doc.setLineWidth(0.4);
      doc.line(sigX - nameWidth, y + 21, sigX, y + 21);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('Bendahara MKKS Citos', sigX, y + 25.5, { align: 'right' });

      // Save PDF file
      const safeSekolah = (data.namaSekolah || 'Sekolah').replace(/\s+/g, '_');
      const safeKuitansi = (data.noKuitansi || 'KWT').replace(/\//g, '_');
      doc.save(`Kuitansi_MKKS_${safeSekolah}_${safeKuitansi}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal membuat file PDF. Silakan gunakan tombol Cetak Kuitansi.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const validationCode = `MKKS-CITOS-${data.tahunBuku}-${(data.noKuitansi || 'KWT').replace(/[^A-Za-z0-9]/g, '')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 relative animate-in fade-in zoom-in duration-200 my-auto max-h-[95vh] flex flex-col justify-between overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-10 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          title="Tutup Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          {/* Success Alert Banner */}
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl mb-3 flex items-center justify-between text-xs font-semibold shadow-sm gap-2">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Pembukuan Iuran Terdaftar di Database MKKS Citos!</span>
            </div>
            {onOpenValidasiModal && (
              <button
                type="button"
                onClick={() => onOpenValidasiModal(data)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] px-2.5 py-1 rounded-lg shrink-0 font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Cek Asli</span>
              </button>
            )}
          </div>

          {/* Printable Receipt Paper Card */}
          <div 
            id="printable-kuitansi" 
            className="bg-slate-50/95 p-4 sm:p-6 rounded-2xl border-2 border-dashed border-teal-500 space-y-4 shadow-inner relative"
          >
            
            {/* Kop / Header Kuitansi */}
            <div className="text-center border-b-2 border-slate-200 pb-3">
              <div className="inline-flex items-center justify-center space-x-1.5 text-teal-700 font-extrabold text-[10px] sm:text-xs uppercase tracking-wider mb-1 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>MKKS CIMANGGIS & TAPOS • DEPOK</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                KUITANSI PEMBAYARAN IURAN
              </h3>
              <div className="mt-1 inline-block bg-white px-3 py-0.5 rounded-md border border-slate-200 text-[11px] font-mono text-slate-600 font-bold">
                No: <span className="text-teal-700">{data.noKuitansi}</span>
              </div>
            </div>

            {/* Structured Details */}
            <div className="space-y-2.5 text-xs">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 pb-2 gap-1">
                <span className="text-slate-500 font-medium">Tanggal Transaksi</span>
                <span className="font-bold text-slate-800">{formatDateIndonesian(data.tanggal)}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 pb-2 gap-1">
                <span className="text-slate-500 font-medium">Telah Terima Dari</span>
                <span className="font-extrabold text-slate-900 text-sm sm:text-xs text-teal-950 sm:text-right">
                  {data.namaSekolah}
                </span>
              </div>

              {data.namaKepsek && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 pb-2 gap-1">
                  <span className="text-slate-500 font-medium">Kepala Sekolah</span>
                  <span className="font-semibold text-slate-800 sm:text-right">{data.namaKepsek}</span>
                </div>
              )}

              <div className="border-b border-slate-200/80 pb-2 space-y-1">
                <span className="text-slate-500 font-medium block">Uang Sejumlah</span>
                <div className="bg-teal-50/80 border border-teal-200 p-2 rounded-xl text-teal-900 font-semibold italic text-xs leading-relaxed">
                  "{terbilang(data.totalNominal)}"
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-200/80 pb-2 gap-1">
                <span className="text-slate-500 font-medium shrink-0">Untuk Pembayaran</span>
                <span className="font-bold text-slate-800 sm:text-right max-w-xs leading-snug">
                  Iuran Anggota MKKS Bulan {data.bulanList.join(', ')} (Tahun {data.tahunBuku})
                </span>
              </div>

              {/* Total Highlight Box - Styled with vibrant colors for print & screen */}
              <div 
                style={{
                  background: 'linear-gradient(to right, #0f766e, #047857)',
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
                className="total-terbayar-box bg-gradient-to-r from-teal-700 to-emerald-700 text-white p-3.5 rounded-2xl flex items-center justify-between font-bold mt-3 shadow-md border border-teal-600/30"
              >
                <span className="text-xs tracking-wider uppercase opacity-95 text-white">TOTAL TERBAYAR:</span>
                <span className="text-lg sm:text-xl font-black text-white">{formatRupiah(data.totalNominal)}</span>
              </div>
            </div>

            {/* Official Digital Barcode & QR Code Section */}
            <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              
              {/* QR & Barcode Container */}
              <div className="bg-white p-2.5 rounded-xl border border-teal-200 shadow-xs flex items-center space-x-2.5">
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="Barcode Validasi MKKS Citos" 
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-lg border border-slate-200 shrink-0" 
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                    <QrCode className="w-8 h-8" />
                  </div>
                )}

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center space-x-1 text-emerald-800 font-extrabold text-[10px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">VALIDASI RESMI</span>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-tight">
                    Pindai QR / Barcode ini untuk cek keaslian kuitansi sah MKKS Citos.
                  </p>
                  <div className="font-mono text-[8px] font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded truncate">
                    {validationCode}
                  </div>
                </div>
              </div>

              {/* Signature Block */}
              <div className="text-right text-xs">
                <div className="text-[10px] text-slate-500">Depok, {formatDateIndonesian(data.tanggal)}</div>
                <div className="text-xs font-black text-slate-800 mt-3.5 underline decoration-teal-500 decoration-2 underline-offset-2">
                  {bendaharaFullName}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Bendahara MKKS Citos</div>
              </div>

            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={onClose}
            className="w-full order-3 sm:order-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1 cursor-pointer"
          >
            <span>Tutup</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="w-full order-1 sm:order-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                <span>Menyiapkan PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 shrink-0" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="w-full order-2 sm:order-3 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Cetak Kuitansi</span>
          </button>
        </div>

      </div>
    </div>
  );
};

