import React, { useState, useEffect } from 'react';
import { formatRupiah, terbilang, formatDateIndonesian, resolveNamaBendahara } from '../utils/formatters';
import { Printer, CheckCircle2, X, Download, ShieldCheck, Building2, QrCode, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface StrukModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    jenis?: 'iuran' | 'pemasukan-lain';
    noKuitansi: string;
    tanggal: string;
    namaSekolah: string;
    sumberDana?: string;
    kategori?: string;
    keterangan?: string;
    namaKepsek?: string;
    alamatSekolah?: string;
    tahunBuku: number;
    bulanList: string[];
    totalNominal: number;
    diinputOleh: string;
  } | null;
  onOpenValidasiModal?: (data: any) => void;
}

// Draw Lucide Building2 icon onto Canvas 2D context
function drawLucideBuilding2(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  const scale = size / 24;
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.stroke(new Path2D('M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z'));
  ctx.stroke(new Path2D('M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2'));
  ctx.stroke(new Path2D('M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2'));
  ctx.stroke(new Path2D('M10 6h4'));
  ctx.stroke(new Path2D('M10 10h4'));
  ctx.stroke(new Path2D('M10 14h4'));
  ctx.stroke(new Path2D('M10 18h4'));

  ctx.restore();
}

// Draw Lucide ShieldCheck icon onto Canvas 2D context
function drawLucideShieldCheck(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  const scale = size / 24;
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.stroke(new Path2D('M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'));
  ctx.stroke(new Path2D('m9 12 2 2 4-4'));

  ctx.restore();
}

// Helper to draw clean rounded rectangles on Canvas
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill = true,
  stroke = true
) {
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// Helper to split and wrap text with max width
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
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

  const isPemasukanLain = Boolean(
    data && (
      data.jenis === 'pemasukan-lain' ||
      Boolean(data.kategori) ||
      data.bulanList.some(b => b.includes('Pemasukan Non-Iuran') || b.includes('Penerimaan')) ||
      data.noKuitansi?.startsWith('KWT-IN')
    )
  );

  // Generate QR Code data URL when data is present
  useEffect(() => {
    if (!data) {
      setQrCodeUrl('');
      return;
    }

    const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const appPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    
    // Construct the verification URL that when scanned opens the validasi modal
    const verifyUrl = `${appOrigin}${appPath}?verify=${encodeURIComponent(data.noKuitansi)}&sekolah=${encodeURIComponent(data.sumberDana || data.namaSekolah)}&bulan=${encodeURIComponent(isPemasukanLain ? (data.kategori || 'Pemasukan Lain') : data.bulanList.join(','))}&tahun=${data.tahunBuku}&nominal=${data.totalNominal}&tgl=${encodeURIComponent(data.tanggal)}&petugas=${encodeURIComponent(bendaharaFullName)}&ket=${encodeURIComponent(data.keterangan || '')}`;

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
  }, [data, bendaharaFullName, isPemasukanLain]);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    const printElement = document.getElementById('printable-kuitansi');
    if (!printElement) {
      window.print();
      return;
    }

    const printWin = window.open('', '_blank', 'width=800,height=750');
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
                box-sizing: border-box !important;
              }
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                padding: 16px;
                background: #ffffff !important;
                color: #1e293b;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0;
              }
              @page {
                size: A5 portrait;
                margin: 8mm;
              }
              .kuitansi-print-card {
                width: 520px;
                max-width: 520px;
                margin: 0 auto;
                border: 2px dashed #0d9488 !important;
                padding: 24px;
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

  const handleDownloadPDF = async () => {
    if (!data) return;
    setIsGeneratingPdf(true);
    try {
      // Ensure fonts are loaded
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // Load QR Code as an Image object
      const qrImg = new Image();
      if (qrCodeUrl) {
        qrImg.src = qrCodeUrl;
        await new Promise<void>((resolve) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = () => resolve();
        });
      }

      // Set up high-resolution offscreen canvas (scale = 3.0 for 300+ DPI sharpness)
      const scale = 3.0;
      const logicalWidth = 560;
      const logicalHeight = 770;

      const canvas = document.createElement('canvas');
      canvas.width = logicalWidth * scale;
      canvas.height = logicalHeight * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context tidak tersedia');
      }

      ctx.scale(scale, scale);

      // 1. Page Background (Pure White)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      // 2. Receipt Outer Card (#f8fafc with dashed teal border)
      const cardX = 18;
      const cardY = 18;
      const cardW = 524;
      const cardH = 734;

      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 16, true, true);
      ctx.setLineDash([]); // Reset line dash

      // 3. Kop / Header Section
      // Top Pill Badge
      const badgeText = 'MKKS CIMANGGIS & TAPOS • DEPOK';
      ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textMetrics = ctx.measureText(badgeText);
      const badgeW = textMetrics.width + 44;
      const badgeX = (logicalWidth - badgeW) / 2;
      const badgeY = 36;
      const badgeH = 26;

      ctx.fillStyle = '#f0fdfa';
      ctx.strokeStyle = '#99f6e4';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 13, true, true);

      // Building icon inside pill badge
      drawLucideBuilding2(ctx, badgeX + 11, badgeY + 5.5, 15, '#0d9488');

      // Pill text
      ctx.fillStyle = '#0f766e';
      ctx.textAlign = 'left';
      ctx.fillText(badgeText, badgeX + 32, badgeY + 17.5);

      // Main Receipt Title
      ctx.font = '900 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.fillText(isPemasukanLain ? 'KUITANSI PENERIMAAN DANA' : 'KUITANSI PEMBAYARAN IURAN', logicalWidth / 2, 85);

      // No Kuitansi Box
      const prefix = 'No: ';
      const kuitansiText = data.noKuitansi || '-';
      ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      const prefixWidth = ctx.measureText(prefix).width;
      const kuitansiWidth = ctx.measureText(kuitansiText).width;
      const totalTextWidth = prefixWidth + kuitansiWidth;

      const noBoxW = Math.max(260, totalTextWidth + 36);
      const noBoxH = 26;
      const noBoxX = (logicalWidth - noBoxW) / 2;
      const noBoxY = 96;

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, noBoxX, noBoxY, noBoxW, noBoxH, 6, true, true);

      const startTextX = (logicalWidth - totalTextWidth) / 2;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.fillText(prefix, startTextX, noBoxY + 17.5);
      ctx.fillStyle = '#0f766e';
      ctx.fillText(kuitansiText, startTextX + prefixWidth, noBoxY + 17.5);

      // Top Divider Line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(38, 134);
      ctx.lineTo(522, 134);
      ctx.stroke();

      // 4. Structured Data Rows
      let curY = 156;

      // Row 1: Tanggal Transaksi
      ctx.fillStyle = '#64748b';
      ctx.font = '500 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Tanggal Transaksi', 40, curY);

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(formatDateIndonesian(data.tanggal), 520, curY);

      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, curY + 9);
      ctx.lineTo(520, curY + 9);
      ctx.stroke();

      // Row 2: Telah Terima Dari
      curY += 28;
      ctx.fillStyle = '#64748b';
      ctx.font = '500 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Telah Terima Dari', 40, curY);

      ctx.fillStyle = '#0f172a';
      ctx.font = '900 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      const terimaDari = isPemasukanLain ? (data.sumberDana || data.namaSekolah) : data.namaSekolah;
      ctx.fillText(terimaDari, 520, curY);

      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, curY + 9);
      ctx.lineTo(520, curY + 9);
      ctx.stroke();

      // Row 3: Detail Tambahan
      if (isPemasukanLain) {
        // Kategori Penerimaan
        curY += 28;
        ctx.fillStyle = '#64748b';
        ctx.font = '500 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Kategori Penerimaan', 40, curY);

        ctx.fillStyle = '#0f766e';
        ctx.font = 'bold 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(data.kategori || 'Pemasukan Non-Iuran', 520, curY);

        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, curY + 9);
        ctx.lineTo(520, curY + 9);
        ctx.stroke();
      } else if (data.namaKepsek && data.namaKepsek.trim()) {
        // Kepala Sekolah (Khusus Iuran)
        curY += 28;
        ctx.fillStyle = '#64748b';
        ctx.font = '500 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Kepala Sekolah', 40, curY);

        ctx.fillStyle = '#334155';
        ctx.font = '600 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(data.namaKepsek, 520, curY);

        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, curY + 9);
        ctx.lineTo(520, curY + 9);
        ctx.stroke();
      }

      // Row 4: Uang Sejumlah Box
      curY += 24;
      ctx.fillStyle = '#64748b';
      ctx.font = '500 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Uang Sejumlah', 40, curY);

      curY += 7;
      const uangBoxW = 480;
      const uangBoxH = 34;
      ctx.fillStyle = '#f0fdfa';
      ctx.strokeStyle = '#99f6e4';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, 40, curY, uangBoxW, uangBoxH, 10, true, true);

      ctx.fillStyle = '#134e4a';
      ctx.font = 'italic bold 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`"${terbilang(data.totalNominal)}"`, 52, curY + 21);

      // Row 5: Untuk Pembayaran / Untuk Keperluan
      curY += uangBoxH + 18;
      ctx.fillStyle = '#64748b';
      ctx.font = '500 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(isPemasukanLain ? 'Untuk Keperluan' : 'Untuk Pembayaran', 40, curY);

      const pemText = isPemasukanLain
        ? (data.keterangan || `Penerimaan ${data.kategori || 'Dana'} dari ${data.sumberDana || data.namaSekolah}`)
        : `Iuran Anggota MKKS Bulan ${data.bulanList.join(', ')} (Tahun ${data.tahunBuku})`;

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';

      const pemLines = wrapTextLines(ctx, pemText, 320);
      for (let i = 0; i < pemLines.length; i++) {
        ctx.fillText(pemLines[i], 520, curY + (i * 15));
      }
      curY += (pemLines.length - 1) * 15;

      if (!isPemasukanLain && data.keterangan) {
        curY += 16;
        ctx.fillStyle = '#64748b';
        ctx.font = '500 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Catatan / Keterangan', 40, curY);

        ctx.fillStyle = '#0f766e';
        ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        const ketLines = wrapTextLines(ctx, data.keterangan, 320);
        for (let i = 0; i < ketLines.length; i++) {
          ctx.fillText(ketLines[i], 520, curY + (i * 14));
        }
        curY += (ketLines.length - 1) * 14;
      }

      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, curY + 11);
      ctx.lineTo(520, curY + 11);
      ctx.stroke();

      // 5. Highlight Box: TOTAL DITERIMA / TOTAL TERBAYAR
      curY += 24;
      const totalBoxW = 480;
      const totalBoxH = 48;

      const grad = ctx.createLinearGradient(40, curY, 520, curY);
      grad.addColorStop(0, '#0f766e');
      grad.addColorStop(1, '#047857');

      ctx.fillStyle = grad;
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, 40, curY, totalBoxW, totalBoxH, 14, true, true);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(isPemasukanLain ? 'TOTAL DITERIMA:' : 'TOTAL TERBAYAR:', 56, curY + 29);

      ctx.font = '900 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(formatRupiah(data.totalNominal), 504, curY + 31);

      // 6. Validation Box (Memanjang / Full Width)
      curY += totalBoxH + 16;
      const valBoxW = 480;
      const valBoxH = 88;

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#99f6e4';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, 40, curY, valBoxW, valBoxH, 12, true, true);

      // QR Code on Left
      if (qrImg.src) {
        // Draw image frame
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, 50, curY + 8, 72, 72, 8, true, true);
        ctx.drawImage(qrImg, 52, curY + 10, 68, 68);
      }

      // Validasi Header (ShieldCheck icon + VALIDASI RESMI)
      const valContentX = 136;
      drawLucideShieldCheck(ctx, valContentX, curY + 12, 17, '#059669');

      ctx.fillStyle = '#065f46';
      ctx.font = '900 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('VALIDASI RESMI', valContentX + 22, curY + 25);

      // Helper Text
      ctx.fillStyle = '#64748b';
      ctx.font = '500 10.5px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Pindai QR / Barcode ini untuk cek keaslian kuitansi sah MKKS Citos.', valContentX, curY + 44);

      // Monospace Code Pill Box
      const codeBoxW = 370;
      const codeBoxH = 24;
      const codeBoxY = curY + 54;
      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, valContentX, codeBoxY, codeBoxW, codeBoxH, 6, true, true);

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.fillText(validationCode, valContentX + 10, codeBoxY + 16.5);

      // 7. Signature Block (Directly below validation box, Right-Aligned)
      curY += valBoxH + 16;
      ctx.fillStyle = '#64748b';
      ctx.font = '500 11.5px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Depok, ${formatDateIndonesian(data.tanggal)}`, 520, curY);

      // Bendahara Name
      curY += 18;
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 13.5px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(bendaharaFullName, 520, curY);

      // Underline
      const nameWidth = ctx.measureText(bendaharaFullName).width;
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(520 - nameWidth, curY + 3.5);
      ctx.lineTo(520, curY + 3.5);
      ctx.stroke();

      // Title
      curY += 17;
      ctx.fillStyle = '#64748b';
      ctx.font = '500 11.5px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Bendahara MKKS Citos', 520, curY);

      // Convert Canvas to High Quality PNG
      const imgData = canvas.toDataURL('image/png', 1.0);

      // Generate Standard A5 PDF (148mm x 210mm)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const pageWidth = 148;
      const pageHeight = 210;
      const margin = 8;
      const maxContentWidth = pageWidth - (margin * 2); // 132 mm
      const maxContentHeight = pageHeight - (margin * 2); // 194 mm

      let renderWidth = maxContentWidth;
      let renderHeight = (logicalHeight * renderWidth) / logicalWidth;

      if (renderHeight > maxContentHeight) {
        renderHeight = maxContentHeight;
        renderWidth = (logicalWidth * renderHeight) / logicalHeight;
      }

      const posX = (pageWidth - renderWidth) / 2;
      const posY = (pageHeight - renderHeight) / 2;

      doc.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');

      const safeSekolah = (data.namaSekolah || 'Sekolah').replace(/[^a-zA-Z0-9]/g, '_');
      const safeKuitansi = (data.noKuitansi || 'KWT').replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Kuitansi_MKKS_${safeSekolah}_${safeKuitansi}.pdf`);
    } catch (error) {
      console.error('Error generating PDF with Canvas:', error);
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
              <span>{isPemasukanLain ? 'Penerimaan Kas Non-Iuran Terdaftar di Database MKKS Citos!' : 'Pembukuan Iuran Terdaftar di Database MKKS Citos!'}</span>
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
              <div className="inline-flex items-center justify-center space-x-1.5 text-teal-700 font-extrabold text-xs uppercase tracking-wider mb-1 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>MKKS CIMANGGIS & TAPOS • DEPOK</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                {isPemasukanLain ? 'KUITANSI PENERIMAAN DANA' : 'KUITANSI PEMBAYARAN IURAN'}
              </h3>
              <div className="mt-1 inline-block bg-white px-3 py-0.5 rounded-md border border-slate-200 text-xs font-mono text-slate-600 font-bold">
                No: <span className="text-teal-700 font-extrabold">{data.noKuitansi}</span>
              </div>
            </div>

            {/* Structured Details */}
            <div className="space-y-2.5 text-xs">
              
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Tanggal Transaksi</span>
                <span className="font-bold text-slate-800">{formatDateIndonesian(data.tanggal)}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-medium">Telah Terima Dari</span>
                <span className="font-extrabold text-slate-900 text-sm text-right">
                  {isPemasukanLain ? (data.sumberDana || data.namaSekolah) : data.namaSekolah}
                </span>
              </div>

              {isPemasukanLain ? (
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500 font-medium">Kategori Penerimaan</span>
                  <span className="font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200 text-right">
                    {data.kategori || 'Pemasukan Non-Iuran'}
                  </span>
                </div>
              ) : (
                data.namaKepsek && (
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-medium">Kepala Sekolah</span>
                    <span className="font-semibold text-slate-800 text-right">{data.namaKepsek}</span>
                  </div>
                )
              )}

              <div className="border-b border-slate-200/80 pb-2 space-y-1">
                <span className="text-slate-500 font-medium block">Uang Sejumlah</span>
                <div className="bg-teal-50/90 border border-teal-200 p-2.5 rounded-xl text-teal-900 font-bold italic text-xs leading-relaxed">
                  "{terbilang(data.totalNominal)}"
                </div>
              </div>

              <div className="flex items-start justify-between border-b border-slate-200/80 pb-2 gap-2">
                <span className="text-slate-500 font-medium shrink-0">
                  {isPemasukanLain ? 'Untuk Keperluan' : 'Untuk Pembayaran'}
                </span>
                <span className="font-bold text-slate-800 text-right max-w-xs leading-snug">
                  {isPemasukanLain 
                    ? (data.keterangan || `Penerimaan ${data.kategori || 'Dana'} dari ${data.sumberDana || data.namaSekolah}`)
                    : `Iuran Anggota MKKS Bulan ${data.bulanList.join(', ')} (Tahun ${data.tahunBuku})`
                  }
                </span>
              </div>

              {!isPemasukanLain && data.keterangan && (
                <div className="flex items-start justify-between border-b border-slate-200/80 pb-2 gap-2 bg-teal-50/70 p-2 rounded-lg border border-teal-200/60">
                  <span className="text-teal-900 font-bold shrink-0 text-xs">
                    Catatan / Keterangan
                  </span>
                  <span className="font-bold text-teal-800 text-right max-w-xs text-xs leading-snug break-words">
                    {data.keterangan}
                  </span>
                </div>
              )}

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
                <span className="text-xs tracking-wider uppercase opacity-95 text-white font-bold">
                  {isPemasukanLain ? 'TOTAL DITERIMA:' : 'TOTAL TERBAYAR:'}
                </span>
                <span className="text-xl font-black text-white">{formatRupiah(data.totalNominal)}</span>
              </div>
            </div>

            {/* Official Digital Barcode & QR Code Section - Memanjang (Full Width) */}
            <div className="pt-2 border-t border-slate-200/80 space-y-3">
              
              {/* QR & Barcode Container - Spans full width so all critical info is clearly readable */}
              <div className="w-full bg-white p-3 rounded-xl border border-teal-200 shadow-xs flex items-center space-x-3.5">
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="Barcode Validasi MKKS Citos" 
                    className="w-18 h-18 sm:w-20 sm:h-20 rounded-lg border border-slate-200 shrink-0 object-contain p-0.5 bg-white" 
                  />
                ) : (
                  <div className="w-18 h-18 sm:w-20 sm:h-20 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                    <QrCode className="w-8 h-8" />
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center space-x-1.5 text-emerald-800 font-extrabold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>VALIDASI RESMI</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Pindai QR / Barcode ini untuk cek keaslian kuitansi sah MKKS Citos.
                  </p>
                  <div className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100/90 px-2 py-1 rounded border border-slate-200 break-all select-all">
                    {validationCode}
                  </div>
                </div>
              </div>

              {/* Signature Block - Directly below validation box (No empty blank signature area) */}
              <div className="text-right text-xs pr-1">
                <div className="text-xs text-slate-500">
                  Depok, {formatDateIndonesian(data.tanggal)}
                </div>
                <div className="text-sm font-extrabold text-slate-900 mt-1 inline-block pb-0.5 border-b-2 border-teal-600">
                  {bendaharaFullName}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  Bendahara MKKS Citos
                </div>
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

