import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Calendar, 
  FileText, 
  Scale, 
  Wallet, 
  Landmark, 
  Edit3, 
  UserCheck, 
  Save, 
  RotateCcw,
  Download,
  Loader2,
  Clock
} from 'lucide-react';
import { RekonsiliasiKas, Sekolah, PejabatPenandatangan, User } from '../types';
import { 
  formatRupiah, 
  formatDateIndonesian, 
  formatDateTimeIndonesian, 
  cleanDateInputString, 
  getCurrentLocalDateTimeString, 
  getCurrentWIBDateTimeString,
  isPlaceholderAuditTime,
  resolveNamaBendahara 
} from '../utils/formatters';
import { StorageService, DEFAULT_PEJABAT } from '../services/spreadsheetSync';
import { exportBeritaAcaraToPDF } from '../services/exportUtils';

interface BeritaAcaraAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditData: RekonsiliasiKas | null;
  totalKasMasuk: number;
  totalKasKeluar: number;
  saldoData: number;
  totalIuranMasuk: number;
  totalPemasukanLain: number;
  sekolahList: Sekolah[];
  usersList?: User[];
  onUpdateAudit?: (updated: RekonsiliasiKas) => void;
  currentUser?: User | null;
  readOnly?: boolean;
}

export const BeritaAcaraAuditModal: React.FC<BeritaAcaraAuditModalProps> = ({
  isOpen,
  onClose,
  auditData,
  totalKasMasuk,
  totalKasKeluar,
  saldoData,
  totalIuranMasuk,
  totalPemasukanLain,
  sekolahList,
  usersList = [],
  onUpdateAudit,
  currentUser: propCurrentUser,
  readOnly = false
}) => {
  const defaultPejabat = StorageService.getPejabat(usersList);
  const currentUser = propCurrentUser || StorageService.getCurrentUser();
  const isKetua = currentUser?.role === 'Ketua' || currentUser?.role?.toLowerCase() === 'ketua';
  const isReadOnly = Boolean(readOnly || isKetua);
  const namaPemeriksaLogin = currentUser?.namaKepsek || currentUser?.username || '';
  const ketuaUser = StorageService.getKetuaUser(usersList);

  const isOldKetuaPlaceholder = (name?: string) => {
    if (!name) return true;
    const lower = name.trim().toLowerCase();
    return (
      lower.includes('supriyadi') ||
      lower.includes('gustian') ||
      lower.includes('maskat') ||
      lower === 'ketua mkks' ||
      lower === 'ketua' ||
      lower === '-'
    );
  };

  const isOldBendaharaPlaceholder = (name?: string) => {
    if (!name) return true;
    const lower = name.trim().toLowerCase();
    return (
      lower.includes('nurhasan') ||
      lower === 'bendahara mkks citos' ||
      lower === 'bendahara mkks'
    );
  };

  const autoKetua = ketuaUser?.namaKepsek || defaultPejabat.namaKetuaMkks || DEFAULT_PEJABAT.namaKetuaMkks;

  // Signer / Pejabat states
  const [isEditingPejabat, setIsEditingPejabat] = useState<boolean>(false);
  const [namaKetuaMkks, setNamaKetuaMkks] = useState<string>(() => {
    if (ketuaUser?.namaKepsek) {
      return ketuaUser.namaKepsek;
    }
    return auditData?.namaKetuaMkks || defaultPejabat.namaKetuaMkks || '';
  });
  const [nipKetuaMkks, setNipKetuaMkks] = useState<string>(
    auditData?.nipKetuaMkks || defaultPejabat.nipKetuaMkks || DEFAULT_PEJABAT.nipKetuaMkks
  );
  const [jabatanKetuaMkks, setJabatanKetuaMkks] = useState<string>(
    auditData?.jabatanKetuaMkks || defaultPejabat.jabatanKetuaMkks || DEFAULT_PEJABAT.jabatanKetuaMkks
  );

  const [namaBendahara, setNamaBendahara] = useState<string>(() => {
    if (auditData?.namaBendahara && !isOldBendaharaPlaceholder(auditData.namaBendahara)) {
      return auditData.namaBendahara;
    }
    return namaPemeriksaLogin || defaultPejabat.namaBendahara || DEFAULT_PEJABAT.namaBendahara;
  });
  const [nipBendahara, setNipBendahara] = useState<string>(
    auditData?.nipBendahara || defaultPejabat.nipBendahara || ''
  );
  const [jabatanBendahara, setJabatanBendahara] = useState<string>(
    auditData?.jabatanBendahara || defaultPejabat.jabatanBendahara || DEFAULT_PEJABAT.jabatanBendahara
  );

  const [kotaAudit, setKotaAudit] = useState<string>('Depok');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  const isPlaceholderAudit = (audit?: RekonsiliasiKas | null) => {
    if (!audit || !audit.tanggalAudit) return true;
    if (isPlaceholderAuditTime(audit.tanggalAudit)) return true;
    if (audit.id === 'AUDIT-2026-01' && (audit.diauditOleh === 'Abu Haripin, M.Pd.' || audit.atasNamaRekening === 'MKKS SMP Cilandak')) {
      return true;
    }
    return false;
  };

  const [tanggalAuditLocal, setTanggalAuditLocal] = useState<string>(() => {
    if (isPlaceholderAudit(auditData)) {
      return getCurrentWIBDateTimeString();
    }
    return cleanDateInputString(auditData?.tanggalAudit) || getCurrentWIBDateTimeString();
  });

  // Sync state when auditData changes
  useEffect(() => {
    if (auditData) {
      const pej = StorageService.getPejabat(usersList);
      const ketua = StorageService.getKetuaUser(usersList);
      const curr = StorageService.getCurrentUser();
      const loginName = curr?.namaKepsek || curr?.username || '';
      const autoK = ketua?.namaKepsek || pej.namaKetuaMkks || DEFAULT_PEJABAT.namaKetuaMkks;

      const resolvedKetua = ketua?.namaKepsek || auditData.namaKetuaMkks || autoK || '';

      setNamaKetuaMkks(resolvedKetua);
      setNipKetuaMkks(auditData.nipKetuaMkks || pej.nipKetuaMkks || DEFAULT_PEJABAT.nipKetuaMkks);
      setJabatanKetuaMkks(auditData.jabatanKetuaMkks || pej.jabatanKetuaMkks || DEFAULT_PEJABAT.jabatanKetuaMkks);

      const resolvedBendahara = (auditData.namaBendahara && !isOldBendaharaPlaceholder(auditData.namaBendahara))
        ? auditData.namaBendahara
        : (loginName || pej.namaBendahara || DEFAULT_PEJABAT.namaBendahara);

      setNamaBendahara(resolvedBendahara);
      setNipBendahara(auditData.nipBendahara || pej.nipBendahara || '');
      setJabatanBendahara(auditData.jabatanBendahara || pej.jabatanBendahara || DEFAULT_PEJABAT.jabatanBendahara);

      const isOldDefault = isPlaceholderAudit(auditData);
      setTanggalAuditLocal(isOldDefault ? getCurrentWIBDateTimeString() : (cleanDateInputString(auditData.tanggalAudit) || getCurrentWIBDateTimeString()));
    }
  }, [auditData, usersList]);

  if (!isOpen || !auditData) return null;

  const totalSaldoReal = (auditData.saldoCash || 0) + (auditData.saldoBank || 0);
  const selisih = totalSaldoReal - saldoData;
  const isBalance = Math.abs(selisih) === 0;
  const isLebih = selisih > 0;

  const handlePrint = () => {
    const printElement = document.getElementById('berita-acara-printable');
    if (!printElement) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById('audit-print-iframe');
      if (existingFrame) {
        existingFrame.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'audit-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Berita Acara Audit Kas MKKS Citos - ${auditData.tahun}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page {
                size: A4 portrait;
                margin: 12mm 15mm 12mm 15mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                box-sizing: border-box !important;
              }
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #ffffff !important;
                color: #0f172a !important;
                margin: 0;
                padding: 0;
              }
              table {
                border-collapse: collapse !important;
                width: 100% !important;
              }
            </style>
          </head>
          <body>
            <div>
              ${printElement.innerHTML}
            </div>
            <script>
              setTimeout(() => {
                window.focus();
                window.print();
              }, 500);
            </script>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          window.print();
        }
      }, 600);
    } catch (e) {
      window.print();
    }
  };

  const handleDownloadPDF = async () => {
    if (!auditData) return;
    setIsDownloadingPdf(true);

    try {
      // Small pause to ensure button shows loading state
      await new Promise(resolve => setTimeout(resolve, 80));

      const filename = exportBeritaAcaraToPDF({
        auditData,
        saldoData,
        totalKasMasuk,
        totalKasKeluar,
        totalIuranMasuk,
        totalPemasukanLain,
        kotaAudit,
        namaKetuaMkks,
        nipKetuaMkks,
        jabatanKetuaMkks,
        namaBendahara,
        nipBendahara,
        jabatanBendahara,
        tanggalAudit: cleanDateInputString(tanggalAuditLocal) || cleanDateInputString(auditData.tanggalAudit) || getCurrentWIBDateTimeString()
      });

      setToastMessage(`Dokumen PDF berhasil diunduh: ${filename}`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (error) {
      console.error('Gagal membuat PDF:', error);
      setToastMessage('Terjadi kendala teknis saat mengunduh PDF. Silakan gunakan menu Cetak Dokumen.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSavePejabat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isReadOnly) return;

    // 1. Save globally to localStorage for all documents
    StorageService.savePejabat({
      namaKetuaMkks,
      nipKetuaMkks,
      jabatanKetuaMkks,
      namaBendahara,
      nipBendahara,
      jabatanBendahara
    });

    // 2. Update current audit record
    const updatedRecord: RekonsiliasiKas = {
      ...auditData,
      namaKetuaMkks,
      nipKetuaMkks,
      jabatanKetuaMkks,
      namaBendahara,
      nipBendahara,
      jabatanBendahara,
      diauditOleh: auditData.diauditOleh || namaBendahara,
      tanggalAudit: cleanDateInputString(tanggalAuditLocal) || getCurrentWIBDateTimeString()
    };

    StorageService.saveSingleRekonsiliasi(updatedRecord);

    if (onUpdateAudit) {
      onUpdateAudit(updatedRecord);
    }

    setIsEditingPejabat(false);
    setToastMessage('Data Berita Acara & Pejabat berhasil diperbarui!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleResetPejabat = () => {
    const pej = StorageService.getPejabat();
    setNamaKetuaMkks(pej.namaKetuaMkks);
    setNipKetuaMkks(pej.nipKetuaMkks);
    setJabatanKetuaMkks(pej.jabatanKetuaMkks);
    setNamaBendahara(pej.namaBendahara);
    setNipBendahara(pej.nipBendahara || '');
    setJabatanBendahara(pej.jabatanBendahara);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 md:p-6 bg-slate-900/75 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-2 sm:my-4 max-h-[94vh] sm:max-h-[92vh] overflow-hidden print:border-none print:shadow-none print:m-0 print:max-w-none print:max-h-none print:overflow-visible">
        
        {/* Header Modal - Sticky at Top (Hidden when printing) */}
        <div className="shrink-0 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-700 shadow-xs print:hidden z-20">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base leading-tight truncate">
                Berita Acara Pemeriksaan Kas (Audit Opname)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                Tahun Buku {auditData.tahun} • Rekonsiliasi Real vs Data
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 ml-2">
            {/* Button Toggle Edit Pejabat */}
            {!isReadOnly && (
              <button
                onClick={() => setIsEditingPejabat(!isEditingPejabat)}
                type="button"
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 sm:px-3 sm:py-2 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                  isEditingPejabat
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-teal-700/80 hover:bg-teal-600 text-white border border-teal-500/40'
                }`}
                title="Edit nama Ketua MKKS, Bendahara, dan tanggal pemeriksaan"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isEditingPejabat ? 'Tutup Edit Pejabat' : 'Edit Pejabat & Tanggal'}</span>
                <span className="sm:hidden">{isEditingPejabat ? 'Tutup' : 'Edit'}</span>
              </button>
            )}

            <button
              onClick={handleDownloadPDF}
              disabled={isDownloadingPdf}
              type="button"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 sm:px-3 sm:py-2 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Unduh langsung file PDF Berita Acara"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{isDownloadingPdf ? 'Membuat PDF...' : 'Unduh PDF'}</span>
              <span className="sm:hidden">PDF</span>
            </button>

            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              title="Cetak Berita Acara Audit"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 sm:p-2 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-xl transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Notifikasi Perubahan Disimpan */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md print:hidden animate-fadeIn shrink-0">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-100 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Printable Document Body - Scrollable Container */}
        <div 
          id="berita-acara-printable" 
          className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-10 text-slate-800 font-sans print:overflow-visible print:p-6 print:text-black scroll-smooth bg-white"
        >
          
          {/* Kop Dokumen Resmi */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
              Musyawarah Kerja Kepala Sekolah (MKKS) SMP
            </div>
            <div className="text-lg sm:text-2xl font-black uppercase text-slate-900 tracking-tight mt-0.5">
              Kecamatan Cimanggis & Tapos (CITOS)
            </div>
          </div>

          {/* Judul Surat Berita Acara */}
          <div className="text-center mb-6">
            <h2 className="text-sm sm:text-lg font-black uppercase underline tracking-wide text-slate-900">
              BERITA ACARA PEMERIKSAAN KAS & REKONSILIASI
            </h2>
            <p className="text-xs font-mono font-bold text-slate-600 mt-0.5">
              Nomor: BA.KAS/{auditData.tahun}/{auditData.id || '01'}
            </p>
          </div>

          {/* Pernyataan Pengantar */}
          <p className="text-xs leading-relaxed text-slate-700 mb-5 text-justify">
            Pada hari ini, tanggal <strong className="text-slate-900">{formatDateIndonesian(tanggalAuditLocal || auditData.tanggalAudit)}</strong>, telah dilakukan pemeriksaan dan audit keselarasan keuangan (Kas Opname & Rekonsiliasi Bank) atas pembukuan kas MKKS SMP Cimanggis & Tapos (CITOS) untuk Tahun Anggaran / Buku <strong>{auditData.tahun}</strong>. Berdasarkan hasil pemeriksaan data sistem dan penghitungan fisik uang tunai serta rekening bank, diperoleh hasil sebagai berikut:
          </p>

          {/* Tabel Komparasi Data vs Real */}
          <div className="space-y-4 mb-6">
            
            {/* Bagian 1: Data Buku Kas */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-3.5 py-2 font-black text-xs text-slate-800 flex items-center justify-between border-b border-slate-200">
                <span className="flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>I. SALDO MENURUT PEMBUKUAN DATA (SISTEM)</span>
                </span>
                <span className="font-mono text-emerald-800 font-extrabold">{formatRupiah(saldoData)}</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3.5 text-slate-600">Total Penerimaan Iuran Anggota Sekolah</td>
                    <td className="py-2 px-3.5 text-right font-mono font-semibold">{formatRupiah(totalIuranMasuk)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3.5 text-slate-600">Total Pemasukan Non-Iuran (Sponsor / Donasi / Sisa)</td>
                    <td className="py-2 px-3.5 text-right font-mono font-semibold">{formatRupiah(totalPemasukanLain)}</td>
                  </tr>
                  <tr className="bg-emerald-50/60 font-bold text-emerald-900">
                    <td className="py-2 px-3.5">TOTAL PENERIMAAN KAS (A)</td>
                    <td className="py-2 px-3.5 text-right font-mono">{formatRupiah(totalKasMasuk)}</td>
                  </tr>
                  <tr className="bg-rose-50/60 font-bold text-rose-900">
                    <td className="py-2 px-3.5">TOTAL PENGELUARAN OPERASIONAL & PROGRAM (B)</td>
                    <td className="py-2 px-3.5 text-right font-mono">{formatRupiah(totalKasKeluar)}</td>
                  </tr>
                  <tr className="bg-slate-100/80 font-black text-slate-900 border-t border-slate-300">
                    <td className="py-2 px-3.5">SALDO BERSIH MENURUT DATA (A - B)</td>
                    <td className="py-2 px-3.5 text-right font-mono text-sm">{formatRupiah(saldoData)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bagian 2: Fisik Real Kas & Bank */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-teal-50 px-3.5 py-2 font-black text-xs text-teal-900 flex items-center justify-between border-b border-teal-200">
                <span className="flex items-center space-x-1.5">
                  <Wallet className="w-3.5 h-3.5 text-teal-700" />
                  <span>II. SALDO KEUANGAN SECARA REAL (FISIK & BANK)</span>
                </span>
                <span className="font-mono text-teal-800 font-extrabold">{formatRupiah(totalSaldoReal)}</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3.5">
                      <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                        <Wallet className="w-3.5 h-3.5 text-amber-600" />
                        <span>1. Uang Tunai / Cash (Brankas Bendahara)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-5">Hasil hitung fisik uang tunai di bendahara</p>
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono font-bold text-slate-800">{formatRupiah(auditData.saldoCash)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3.5">
                      <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                        <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                        <span>2. Uang di Rekening Bank</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-5">
                        {auditData.namaBank} - No. Rek: <span className="font-mono font-semibold">{auditData.nomorRekening}</span> (a.n. {auditData.atasNamaRekening})
                      </p>
                    </td>
                    <td className="py-2 px-3.5 text-right font-mono font-bold text-slate-800">{formatRupiah(auditData.saldoBank)}</td>
                  </tr>
                  <tr className="bg-teal-100/70 font-black text-teal-950 border-t border-teal-300">
                    <td className="py-2 px-3.5">TOTAL SALDO REAL FISIK (1 + 2)</td>
                    <td className="py-2 px-3.5 text-right font-mono text-sm">{formatRupiah(totalSaldoReal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bagian 3: Analisis Selisih & Status Audit */}
            <div className={`p-4 rounded-xl border ${
              isBalance 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                : isLebih 
                ? 'bg-amber-50 border-amber-300 text-amber-900' 
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2">
                  {isBalance ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <span className="font-black text-xs uppercase tracking-wider">
                    III. KESIMPULAN HASIL AUDIT / REKONSILIASI
                  </span>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
                  isBalance ? 'bg-emerald-600 text-white' : isLebih ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                  {isBalance ? 'BALANCE / COCOK (Rp 0)' : isLebih ? `SELISIH LEBIH (+${formatRupiah(selisih)})` : `SELISIH KURANG (-${formatRupiah(Math.abs(selisih))})`}
                </span>
              </div>
              <p className="text-xs leading-relaxed">
                {isBalance ? (
                  <>Seluruh pencatatan kas menurut sistem pembukuan telah <strong>SINKRON SEMPURNA (BALANCE)</strong> dengan total uang fisik tunai di bendahara dan saldo di rekening bank. Tidak terdapat selisih pembukuan.</>
                ) : isLebih ? (
                  <>Ditemukan <strong>SELISIH LEBIH</strong> sebesar <strong>{formatRupiah(selisih)}</strong> di mana total uang fisik/rekening lebih banyak daripada saldo yang tercatat di laporan. Harap cek kembali kemungkinan adanya penerimaan iuran atau dana bantuan yang belum terinput.</>
                ) : (
                  <>Ditemukan <strong>SELISIH KURANG</strong> sebesar <strong>{formatRupiah(Math.abs(selisih))}</strong> di mana uang fisik/rekening lebih kecil daripada saldo di laporan pembukuan. Harap cek kembali kemungkinan adanya kuitansi pengeluaran yang belum dicatat atau kekurangan kas.</>
                )}
              </p>
              {auditData.catatanAudit && (
                <div className="mt-2.5 pt-2.5 border-t border-current/20 text-xs italic">
                  <strong>Catatan Pemeriksa:</strong> "{auditData.catatanAudit}"
                </div>
              )}
            </div>

          </div>

          {/* Rincian Pecahan Uang Kertas & Koin (Jika Tersedia) */}
          {auditData.pecahanCash && (
            <div className="mb-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                <Wallet className="w-3.5 h-3.5 text-slate-600" />
                <span>Rincian Fisik Lembaran Uang Kas Tunai (Cash Opname):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div className="bg-white p-1.5 rounded border border-slate-200">Rp 100.000: <strong>{auditData.pecahanCash.pecahan100k || 0}</strong> lbr</div>
                <div className="bg-white p-1.5 rounded border border-slate-200">Rp 50.000: <strong>{auditData.pecahanCash.pecahan50k || 0}</strong> lbr</div>
                <div className="bg-white p-1.5 rounded border border-slate-200">Rp 20.000: <strong>{auditData.pecahanCash.pecahan20k || 0}</strong> lbr</div>
                <div className="bg-white p-1.5 rounded border border-slate-200">Rp 10.000: <strong>{auditData.pecahanCash.pecahan10k || 0}</strong> lbr</div>
                <div className="bg-white p-1.5 rounded border border-slate-200">Rp 5.000: <strong>{auditData.pecahanCash.pecahan5k || 0}</strong> lbr</div>
                <div className="bg-white p-1.5 rounded border border-slate-200">Rp 2.000: <strong>{auditData.pecahanCash.pecahan2k || 0}</strong> lbr</div>
                <div className="bg-white p-1.5 rounded border border-slate-200">Rp 1.000: <strong>{auditData.pecahanCash.pecahan1k || 0}</strong> lbr</div>
                <div className="bg-white p-1.5 rounded border border-slate-200">Uang Logam/Koin: <strong>{formatRupiah(auditData.pecahanCash.koin || 0)}</strong></div>
              </div>
            </div>
          )}

          {/* Penutup */}
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Demikian Berita Acara Pemeriksaan Kas ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya dan menjadi dokumen pertanggungjawaban keuangan organisasi.
          </p>

          {/* Form Editor Pejabat Penandatangan (Muncul saat isEditingPejabat aktif) */}
          {isEditingPejabat && (
            <div className="mb-6 p-4 sm:p-5 bg-amber-50/80 border-2 border-amber-300 rounded-2xl print:hidden animate-fadeIn space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
                <div className="flex items-center space-x-2 text-amber-950 font-bold text-xs sm:text-sm">
                  <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Edit Data Penandatangan Berita Acara</span>
                </div>
                <span className="text-[11px] text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full font-semibold">
                  Mode Edit Aktif
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Kolom Kiri: Ketua MKKS */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2.5">
                  <div className="font-bold text-slate-800 flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-600 inline-block"></span>
                    <span>1. Pihak Mengetahui (Ketua MKKS)</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Nama Lengkap & Gelar Ketua MKKS <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={namaKetuaMkks}
                      onChange={(e) => setNamaKetuaMkks(e.target.value)}
                      placeholder="Contoh: H. Gustian Maskat, S.Ag., M.M."
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Secara otomatis mendeteksi dari sheet User (Role: Ketua).
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      NIP Ketua MKKS
                    </label>
                    <input
                      type="text"
                      value={nipKetuaMkks}
                      onChange={(e) => setNipKetuaMkks(e.target.value)}
                      placeholder="196805121994121001"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Jabatan / Organisasi
                    </label>
                    <input
                      type="text"
                      value={jabatanKetuaMkks}
                      onChange={(e) => setJabatanKetuaMkks(e.target.value)}
                      placeholder="Ketua MKKS SMP Cimanggis & Tapos"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>

                {/* Kolom Kanan: Bendahara MKKS */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2.5">
                  <div className="font-bold text-slate-800 flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
                    <span>2. Pihak Pemeriksa (Bendahara MKKS)</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Nama Lengkap & Gelar Bendahara <span className="text-rose-500">*</span>
                      </label>
                      {namaPemeriksaLogin && (
                        <button
                          type="button"
                          onClick={() => setNamaBendahara(namaPemeriksaLogin)}
                          className="text-[10px] text-teal-700 hover:text-teal-900 font-semibold underline cursor-pointer"
                          title="Klik untuk mengambil nama akun login yang aktif"
                        >
                          Ambil dari Akun Login
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={namaBendahara}
                      onChange={(e) => setNamaBendahara(e.target.value)}
                      placeholder={namaPemeriksaLogin || "Nama Bendahara / Petugas Cetak"}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      NIP Bendahara (Opsional)
                    </label>
                    <input
                      type="text"
                      value={nipBendahara}
                      onChange={(e) => setNipBendahara(e.target.value)}
                      placeholder="NIP Bendahara atau kosongkan"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Jabatan / Keterangan
                    </label>
                    <input
                      type="text"
                      value={jabatanBendahara}
                      onChange={(e) => setJabatanBendahara(e.target.value)}
                      placeholder="Bendahara MKKS SMP Citos"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>
              </div>

              {/* Kota & Tanggal */}
              <div className="bg-white p-3 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <div className="flex items-center space-x-1.5">
                    <label className="font-semibold text-slate-700 shrink-0">Kota:</label>
                    <input
                      type="text"
                      value={kotaAudit}
                      onChange={(e) => setKotaAudit(e.target.value)}
                      placeholder="Depok"
                      className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 w-24 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <label className="font-semibold text-slate-700 shrink-0">Waktu & Tanggal (WIB):</label>
                    <input
                      type="text"
                      value={tanggalAuditLocal}
                      onChange={(e) => setTanggalAuditLocal(e.target.value)}
                      placeholder="YYYY-MM-DD HH:mm"
                      className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 w-36 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <button
                      type="button"
                      onClick={() => setTanggalAuditLocal(getCurrentWIBDateTimeString())}
                      className="inline-flex items-center space-x-1 text-[10px] text-teal-700 hover:text-teal-900 font-semibold bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded border border-teal-200 transition-all cursor-pointer"
                      title="Set ke waktu aktif saat ini (WIB / UTC+7)"
                    >
                      <Clock className="w-3 h-3 text-teal-600" />
                      <span>Sekarang (WIB)</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleResetPejabat}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Default</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPejabat(false)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePejabat}
                    className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Edit Prompt (Print Hidden) */}
          {!isEditingPejabat && (
            <div className="mb-4 p-2.5 bg-slate-50 hover:bg-teal-50/60 border border-dashed border-slate-300 hover:border-teal-400 rounded-xl flex items-center justify-between text-xs text-slate-600 print:hidden transition-colors">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                <span className="font-medium">Ingin mengubah nama Ketua MKKS atau Bendahara pada tanda tangan di bawah?</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingPejabat(true)}
                className="font-bold text-teal-700 hover:text-teal-900 bg-white hover:bg-teal-100/60 px-3 py-1 rounded-lg border border-teal-200 shadow-2xs transition-all cursor-pointer"
              >
                Ubah Nama Pejabat
              </button>
            </div>
          )}

          {/* Tanda Tangan Resmi Penandatangan */}
          <div className="grid grid-cols-2 gap-6 sm:gap-8 text-center text-xs pb-4">
            {/* Kolom Kiri: Ketua MKKS */}
            <div 
              onClick={() => !isEditingPejabat && setIsEditingPejabat(true)}
              className={`rounded-xl p-2 transition-all group ${
                !isEditingPejabat ? 'hover:bg-slate-50 cursor-pointer' : ''
              }`}
              title={!isEditingPejabat ? 'Klik untuk mengedit data Ketua MKKS' : undefined}
            >
              <p className="text-slate-500 mb-1">Mengetahui,</p>
              <p className="font-bold text-slate-800">{jabatanKetuaMkks || 'Ketua MKKS SMP Cimanggis & Tapos'}</p>
              <div className="h-16 flex items-center justify-center">
                <span className="text-[10px] text-slate-300 print:hidden group-hover:text-teal-600 font-sans italic">
                  (Tanda Tangan & Cap Organisasi)
                </span>
              </div>
              <p className="font-black text-slate-900 underline group-hover:text-teal-700 transition-colors">
                {namaKetuaMkks || 'Ketua MKKS'}
              </p>
              <p className="text-[10px] text-slate-500">
                {nipKetuaMkks ? `NIP. ${nipKetuaMkks}` : 'NIP. -'}
              </p>
              {!isEditingPejabat && (
                <span className="inline-block mt-1 text-[9px] text-teal-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                  ✏️ Klik untuk ubah
                </span>
              )}
            </div>

            {/* Kolom Kanan: Bendahara MKKS */}
            <div 
              onClick={() => !isEditingPejabat && setIsEditingPejabat(true)}
              className={`rounded-xl p-2 transition-all group ${
                !isEditingPejabat ? 'hover:bg-slate-50 cursor-pointer' : ''
              }`}
              title={!isEditingPejabat ? 'Klik untuk mengedit data Bendahara' : undefined}
            >
              <p className="text-slate-500 mb-1">{kotaAudit}, {formatDateIndonesian(tanggalAuditLocal || auditData.tanggalAudit)}</p>
              <p className="font-bold text-slate-800">{jabatanBendahara || 'Bendahara MKKS SMP Citos'}</p>
              <div className="h-16 flex items-center justify-center">
                <span className="text-[10px] text-slate-300 print:hidden group-hover:text-teal-600 font-sans italic">
                  (Tanda Tangan Petugas)
                </span>
              </div>
              <p className="font-black text-slate-900 underline group-hover:text-teal-700 transition-colors">
                {namaBendahara || 'H. Nurhasan, M.Pd'}
              </p>
              <p className="text-[10px] text-slate-500">
                {nipBendahara ? `NIP. ${nipBendahara}` : 'Petugas Pemeriksa Kas'}
              </p>
              {!isEditingPejabat && (
                <span className="inline-block mt-1 text-[9px] text-teal-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                  ✏️ Klik untuk ubah
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions - Sticky at Bottom (Hidden when printing) */}
        <div className="shrink-0 bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between print:hidden z-20">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Tutup
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloadingPdf}
              type="button"
              className="inline-flex items-center space-x-2 px-4 py-2 sm:py-2.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isDownloadingPdf ? 'Memproses PDF...' : 'Unduh File PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center space-x-2 px-5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Berita Acara</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
