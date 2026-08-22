import React, { useState, useEffect } from 'react';
import { formatRupiah, terbilang, formatDateIndonesian, resolveNamaBendahara } from '../utils/formatters';
import { Printer, CheckCircle2, X, Download, ShieldCheck, Building2, QrCode, Search } from 'lucide-react';
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
              body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; background: #fff; color: #1e293b; }
              @page { size: A5 portrait; margin: 8mm; }
            </style>
          </head>
          <body>
            <div style="max-width: 580px; margin: 0 auto; border: 2px dashed #0d9488; padding: 24px; border-radius: 16px; background: #f8fafc;">
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
    // A5 Portrait = 148 mm x 210 mm
    const doc = new jsPDF('portrait', 'mm', 'a5');

    const centerX = 74;
    const marginLeft = 12;
    const marginRight = 136;
    const printableWidth = 124;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(13, 148, 136); // Teal
    doc.text('MKKS KECAMATAN CIMANGGIS DAN TAPOS - KOTA DEPOK', centerX, 12, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('KUITANSI BUKTI PEMBAYARAN IURAN', centerX, 18, { align: 'center' });

    // Divider Line
    doc.setLineWidth(0.4);
    doc.setDrawColor(200, 210, 220);
    doc.line(marginLeft, 21, marginRight, 21);

    let y = 28;
    doc.setFontSize(8.5);

    // Row 1: No Kuitansi & Tanggal
    doc.setFont('helvetica', 'bold');
    doc.text(`No: ${data.noKuitansi}`, marginLeft, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal: ${formatDateIndonesian(data.tanggal)}`, marginRight, y, { align: 'right' });

    y += 7;
    // Telah terima dari
    doc.setFont('helvetica', 'normal');
    doc.text('Telah Terima Dari', marginLeft, y);
    doc.text(':', marginLeft + 32, y);
    doc.setFont('helvetica', 'bold');
    doc.text(data.namaSekolah, marginLeft + 36, y);

    y += 5.5;
    // Kepala Sekolah
    if (data.namaKepsek) {
      doc.setFont('helvetica', 'normal');
      doc.text('Kepala Sekolah', marginLeft, y);
      doc.text(':', marginLeft + 32, y);
      doc.text(data.namaKepsek, marginLeft + 36, y);
      y += 5.5;
    }

    // Uang sejumlah
    doc.setFont('helvetica', 'normal');
    doc.text('Uang Sejumlah', marginLeft, y);
    doc.text(':', marginLeft + 32, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`"${terbilang(data.totalNominal)}"`, marginLeft + 36, y);

    y += 5.5;
    // Untuk Pembayaran
    doc.setFont('helvetica', 'normal');
    doc.text('Untuk Pembayaran', marginLeft, y);
    doc.text(':', marginLeft + 32, y);

    const perkeuntText = `Iuran Anggota MKKS Bulan ${data.bulanList.join(', ')} (Tahun ${data.tahunBuku})`;
    const splitText = doc.splitTextToSize(perkeuntText, 88);
    doc.text(splitText, marginLeft + 36, y);

    y += (splitText.length * 4.5) + 6;

    // Total Nominal Box
    doc.setFillColor(13, 148, 136); // Teal background
    doc.roundedRect(marginLeft, y, printableWidth, 11, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('TOTAL TERBAYAR :', marginLeft + 4, y + 7.5);
    doc.setFontSize(11);
    doc.text(formatRupiah(data.totalNominal), marginRight - 4, y + 7.5, { align: 'right' });

    // Reset text color
    doc.setTextColor(30, 41, 59);

    y += 16;

    // QR Code & Barcode Validation on Left side, Signature on Right side
    if (qrCodeUrl) {
      try {
        doc.addImage(qrCodeUrl, 'PNG', marginLeft, y, 24, 24);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 148, 136);
        doc.text('BARCODE VALIDASI RESMI', marginLeft + 26, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Scan untuk cek keaslian', marginLeft + 26, y + 10);
        doc.text('Kuitansi Sah MKKS Citos', marginLeft + 26, y + 14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`ID: ${(data.noKuitansi || 'KWT').replace(/[^A-Za-z0-9]/g, '')}`, marginLeft + 26, y + 19);
      } catch (e) {
        console.error('Error adding QR to PDF', e);
      }
    }

    // Signature Block on Right
    const sigX = 92;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`Depok, ${formatDateIndonesian(data.tanggal)}`, sigX, y + 2);
    doc.text('Bendahara MKKS Citos,', sigX, y + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.text(bendaharaFullName, sigX, y + 22);

    const safeSekolah = (data.namaSekolah || 'Sekolah').replace(/\s+/g, '_');
    const safeKuitansi = (data.noKuitansi || 'KWT').replace(/\//g, '_');
    doc.save(`Kuitansi_MKKS_${safeSekolah}_${safeKuitansi}.pdf`);
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
          <div id="printable-kuitansi" className="bg-slate-50/90 p-4 sm:p-6 rounded-2xl border-2 border-dashed border-teal-400 space-y-4 shadow-inner relative">
            
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

              {/* Total Highlight Box */}
              <div className="bg-gradient-to-r from-teal-700 to-emerald-700 text-white p-3.5 rounded-2xl flex items-center justify-between font-bold mt-3 shadow-md">
                <span className="text-xs tracking-wider uppercase opacity-90">TOTAL TERBAYAR:</span>
                <span className="text-lg sm:text-xl font-black">{formatRupiah(data.totalNominal)}</span>
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
            className="w-full order-1 sm:order-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Download PDF</span>
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
