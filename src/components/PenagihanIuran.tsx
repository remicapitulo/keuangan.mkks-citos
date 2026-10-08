import React, { useState, useMemo } from 'react';
import { Sekolah, Iuran, BULAN_LIST, BULAN_SINGKAT, IURAN_PER_BULAN, User, RekonsiliasiKas } from '../types';
import { 
  formatRupiah, 
  formatDateIndonesian, 
  cleanPhoneNumber, 
  formatWhatsAppDisplayNumber, 
  getTahunBukuList, 
  resolveNamaBendahara,
  getSchoolSortKey 
} from '../utils/formatters';
import { StorageService } from '../services/spreadsheetSync';
import { exportInvoicePDF } from '../services/exportUtils';
import { 
  Send, 
  Phone, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  Search, 
  Copy, 
  Check, 
  FileDown, 
  ExternalLink, 
  Clock, 
  Edit3, 
  X, 
  Filter, 
  UserCheck, 
  HelpCircle, 
  MessageSquare, 
  Landmark, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  RefreshCw,
  Wallet
} from 'lucide-react';

interface PenagihanIuranProps {
  sekolahList: Sekolah[];
  iuranList: Iuran[];
  currentUser: User | null;
  usersList?: User[];
  rekonsiliasiKasList?: RekonsiliasiKas[];
  onUpdateSekolahKontak?: (idSekolah: string, newKontak: string) => void;
  onNavigateToInputIuran?: (namaSekolah: string) => void;
}

export const PenagihanIuran: React.FC<PenagihanIuranProps> = ({
  sekolahList,
  iuranList,
  currentUser,
  usersList = [],
  rekonsiliasiKasList = [],
  onUpdateSekolahKontak,
  onNavigateToInputIuran
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth(); // 0-11
  const availableYears = getTahunBukuList(iuranList.map(i => i.tahun));

  // State
  const [selectedYear, setSelectedYear] = useState<number>(() => Math.max(2026, currentYear));
  const [cutoffOption, setCutoffOption] = useState<'running' | 'specific' | 'full'>('running');
  const [selectedCutoffIdx, setSelectedCutoffIdx] = useState<number>(() => {
    // Default to current month or December if past year
    return currentMonthIdx;
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'tunggakan' | 'semua' | 'lunas' | 'no-wa'>('tunggakan');

  // Preview / WA Modal State
  const [previewSchool, setPreviewSchool] = useState<Sekolah | null>(null);
  const [previewUnpaidMonths, setPreviewUnpaidMonths] = useState<string[]>([]);
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);

  // Edit Phone Modal State
  const [editingSchool, setEditingSchool] = useState<Sekolah | null>(null);
  const [editPhoneValue, setEditPhoneValue] = useState<string>('');
  const [savePhoneToast, setSavePhoneToast] = useState<string | null>(null);

  // Tracking sent logs in localStorage (School ID -> timestamp)
  const [sentLogs, setSentLogs] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('mkks_penagihan_sent_logs');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Pejabat and bank account data
  const pejabat = StorageService.getPejabat(usersList);
  const activeAudit = rekonsiliasiKasList.find(r => r.tahun === selectedYear) || StorageService.getRekonsiliasiKas().find(r => r.tahun === selectedYear);
  const namaBank = activeAudit?.namaBank || 'Bank DKI';
  const nomorRekening = activeAudit?.nomorRekening || '102.23.09876.1';
  const atasNamaRekening = activeAudit?.atasNamaRekening || 'MKKS SMP CITOS';
  const currentBendahara = resolveNamaBendahara(
    currentUser?.namaKepsek || currentUser?.username,
    undefined,
    sekolahList
  );

  // Determine effective cut-off month
  const effectiveCutoffIdx = useMemo(() => {
    if (cutoffOption === 'full') return 11; // up to December
    if (cutoffOption === 'running') {
      if (selectedYear < currentYear) return 11;
      if (selectedYear > currentYear) return 0;
      return currentMonthIdx;
    }
    return selectedCutoffIdx;
  }, [cutoffOption, selectedYear, currentYear, currentMonthIdx, selectedCutoffIdx]);

  const namaBulanBatas = BULAN_LIST[effectiveCutoffIdx];
  const targetMonths = useMemo(() => {
    return BULAN_LIST.slice(0, effectiveCutoffIdx + 1);
  }, [effectiveCutoffIdx]);

  // Record sent log
  const markSchoolAsSent = (idSekolah: string) => {
    const newLogs = {
      ...sentLogs,
      [idSekolah]: new Date().toISOString()
    };
    setSentLogs(newLogs);
    try {
      localStorage.setItem('mkks_penagihan_sent_logs', JSON.stringify(newLogs));
    } catch {}
  };

  // Build billing statistics and items for each school
  const schoolBillings = useMemo(() => {
    const iuranThisYear = iuranList.filter(i => i.tahun === selectedYear);

    return sekolahList.map(s => {
      // Find all paid records for this school in selected year
      const paidRecords = iuranThisYear.filter(i => {
        if (i.idSekolah && s.idSekolah && i.idSekolah === s.idSekolah) return true;
        if (i.namaSekolah && s.namaSekolah && i.namaSekolah.toLowerCase().trim() === s.namaSekolah.toLowerCase().trim()) return true;
        return false;
      });

      const paidMonths = paidRecords.map(i => i.bulan);

      // Unpaid months up to cut-off
      const unpaidMonthsCutoff = targetMonths.filter(b => !paidMonths.includes(b));
      
      // Unpaid months for entire year
      const unpaidMonthsFullYear = BULAN_LIST.filter(b => !paidMonths.includes(b));

      const totalTagihanCutoff = unpaidMonthsCutoff.length * IURAN_PER_BULAN;
      const totalTunggakanFullYear = unpaidMonthsFullYear.length * IURAN_PER_BULAN;
      const isLunasCutoff = unpaidMonthsCutoff.length === 0;
      const isLunasFullYear = unpaidMonthsFullYear.length === 0;

      const rawPhone = s.kontak || '';
      const cleanPhone = cleanPhoneNumber(rawPhone);
      const hasValidPhone = cleanPhone.length >= 10;

      const lastSentTime = sentLogs[s.idSekolah];

      return {
        sekolah: s,
        paidCount: paidMonths.length,
        paidMonths,
        unpaidMonthsCutoff,
        unpaidMonthsFullYear,
        totalTagihanCutoff,
        totalTunggakanFullYear,
        isLunasCutoff,
        isLunasFullYear,
        rawPhone,
        cleanPhone,
        hasValidPhone,
        lastSentTime
      };
    });
  }, [sekolahList, iuranList, selectedYear, targetMonths, sentLogs]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalSekolah = schoolBillings.length;
    const menunggakCount = schoolBillings.filter(b => !b.isLunasCutoff).length;
    const lunasCount = totalSekolah - menunggakCount;
    const totalNominalTagihan = schoolBillings.reduce((acc, curr) => acc + curr.totalTagihanCutoff, 0);
    const withPhoneCount = schoolBillings.filter(b => b.hasValidPhone).length;
    const sentTodayCount = schoolBillings.filter(b => {
      if (!b.lastSentTime) return false;
      const sentDate = new Date(b.lastSentTime).toDateString();
      const today = new Date().toDateString();
      return sentDate === today;
    }).length;

    return {
      totalSekolah,
      menunggakCount,
      lunasCount,
      totalNominalTagihan,
      withPhoneCount,
      sentTodayCount
    };
  }, [schoolBillings]);

  // Filter and sort items
  const filteredBillings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return [...schoolBillings]
      .filter(item => {
        // Status filter
        if (statusFilter === 'tunggakan' && item.isLunasCutoff) return false;
        if (statusFilter === 'lunas' && !item.isLunasCutoff) return false;
        if (statusFilter === 'no-wa' && item.hasValidPhone) return false;

        // Search query
        if (q) {
          const matchName = item.sekolah.namaSekolah.toLowerCase().includes(q);
          const matchKepsek = item.sekolah.namaKepsek.toLowerCase().includes(q);
          const matchAlamat = item.sekolah.alamat.toLowerCase().includes(q);
          const matchPhone = (item.rawPhone || '').includes(q);
          return matchName || matchKepsek || matchAlamat || matchPhone;
        }

        return true;
      })
      .sort((a, b) => {
        // Unpaid first, then alphabetically by school name
        if (!a.isLunasCutoff && b.isLunasCutoff) return -1;
        if (a.isLunasCutoff && !b.isLunasCutoff) return 1;

        const keyA = getSchoolSortKey(a.sekolah.namaSekolah || '');
        const keyB = getSchoolSortKey(b.sekolah.namaSekolah || '');
        const comp = keyA.localeCompare(keyB, 'id', { sensitivity: 'base', numeric: true });
        if (comp !== 0) return comp;
        return (a.sekolah.namaSekolah || '').localeCompare(b.sekolah.namaSekolah || '', 'id');
      });
  }, [schoolBillings, statusFilter, searchQuery]);

  // Build formatted WhatsApp message text
  const generateWhatsAppMessage = (
    sekolah: Sekolah, 
    unpaidMonths: string[], 
    nominalTagihan: number
  ) => {
    const daftarBulan = unpaidMonths.join(', ');
    const namaKepsek = sekolah.namaKepsek || 'Bapak/Ibu Kepala Sekolah';
    const invoiceNo = `INV/MKKS-CITOS/${selectedYear}/${String(effectiveCutoffIdx + 1).padStart(2, '0')}/${sekolah.idSekolah || '001'}`;

    return `*INVOICE TAGIHAN IURAN MKKS CITOS*
No: ${invoiceNo}

Kepada Yth.
*${namaKepsek}*
*${sekolah.namaSekolah}*
Kec. ${sekolah.kecamatan || 'Cimanggis & Tapos'}

Assalamu'alaikum Wr. Wb. / Salam Sejahtera,

Dengan hormat,
Kami dari Pengurus Musyawarah Kerja Kepala Sekolah (MKKS) SMP Kecamatan Cimanggis & Tapos menyampaikan informasi kewajiban iuran rutin organisasi untuk *Tahun Buku ${selectedYear}* (periode s.d. Bulan *${namaBulanBatas}*):

📋 *RINCIAN TUNGGAKAN IURAN:*
• Periode Belum Terbayar: *${daftarBulan}*
• Total Tunggakan: *${unpaidMonths.length} Bulan*
• Tarif Resmi: Rp 100.000 / Bulan
• *TOTAL TAGIHAN: ${formatRupiah(nominalTagihan)}*

💳 *METODE PEMBAYARAN:*
Transfer ke Rekening Resmi MKKS CITOS:
• *Bank:* ${namaBank}
• *Nomor Rekening:* ${nomorRekening}
• *Atas Nama:* ${atasNamaRekening}
_(Atau dapat diserahkan tunai kepada Bendahara saat rapat rutin MKKS)_

Mohon konfirmasi bukti transfer atau pembayaran dengan membalas pesan WhatsApp ini.

Terima kasih atas kerja sama, perhatian, dan partisipasi aktif Bapak/Ibu demi kelancaran seluruh program kegiatan MKKS Citos.

Hormat kami,
*Bendahara MKKS SMP CITOS*
${currentBendahara}

_Mengetahui:_
*Ketua MKKS SMP Cimanggis & Tapos*
${pejabat.namaKetuaMkks || 'Ketua MKKS'}`;
  };

  // Direct 1-Click WhatsApp Trigger
  const handleSendWhatsApp = (sekolah: Sekolah, unpaidMonths: string[], totalTagihan: number) => {
    const rawPhone = sekolah.kontak || '';
    const cleanPhone = cleanPhoneNumber(rawPhone);

    // If phone number is missing or invalid, open edit modal
    if (!cleanPhone || cleanPhone.length < 10) {
      setEditingSchool(sekolah);
      setEditPhoneValue(rawPhone);
      return;
    }

    const message = generateWhatsAppMessage(sekolah, unpaidMonths, totalTagihan);
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;

    // Mark as sent in logs
    markSchoolAsSent(sekolah.idSekolah);

    // Open WhatsApp
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Save updated phone number
  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;

    const cleaned = cleanPhoneNumber(editPhoneValue);
    const valueToSave = cleaned || editPhoneValue.trim();

    // Call update callback
    if (onUpdateSekolahKontak) {
      onUpdateSekolahKontak(editingSchool.idSekolah, valueToSave);
    } else {
      StorageService.updateSekolahKontak(editingSchool.idSekolah, valueToSave);
    }

    setSavePhoneToast(`Nomor WhatsApp untuk ${editingSchool.namaSekolah} berhasil diperbarui!`);
    setTimeout(() => setSavePhoneToast(null), 3500);

    // If user clicked send from row before, automatically offer to proceed
    const targetSek = { ...editingSchool, kontak: valueToSave };
    setEditingSchool(null);
  };

  // Open Preview Modal
  const handleOpenPreview = (sekolah: Sekolah, unpaidMonths: string[]) => {
    setPreviewSchool(sekolah);
    setPreviewUnpaidMonths(unpaidMonths);
    setCopiedDraft(false);
  };

  // Copy Draft to Clipboard
  const handleCopyDraft = () => {
    if (!previewSchool) return;
    const nominal = previewUnpaidMonths.length * IURAN_PER_BULAN;
    const message = generateWhatsAppMessage(previewSchool, previewUnpaidMonths, nominal);
    navigator.clipboard.writeText(message);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2500);
  };

  // Export Invoice to PDF
  const handleDownloadPDFInvoice = (sekolah: Sekolah, unpaidMonths: string[], totalTagihan: number) => {
    exportInvoicePDF({
      sekolah,
      tahun: selectedYear,
      bulanTunggakan: unpaidMonths,
      totalTagihan,
      bulanBatas: namaBulanBatas,
      namaBendahara: currentBendahara,
      nipBendahara: pejabat.nipBendahara,
      namaKetua: pejabat.namaKetuaMkks,
      nipKetua: pejabat.nipKetuaMkks,
      namaBank,
      nomorRekening,
      atasNamaRekening
    });
  };

  return (
    <div id="penagihan-iuran-container" className="space-y-6">
      
      {/* Toast Notification */}
      {savePhoneToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-teal-500/50 flex items-center space-x-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savePhoneToast}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800 rounded-2xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1 mb-2">
              <span className="inline-flex items-center space-x-1.5 bg-white/20 px-3 py-1 rounded-full text-xs text-teal-50 backdrop-blur-md border border-white/20 font-bold">
                <Send className="w-3.5 h-3.5 text-emerald-200" />
                <span>Fitur Khusus Admin & Bendahara MKKS</span>
              </span>
              <span className="bg-emerald-400/30 text-emerald-100 border border-emerald-300/40 px-3 py-1 rounded-full font-bold text-xs">
                Kolom G (Kontak WhatsApp)
              </span>
            </div>

            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Penagihan Iuran Sekolah (Invoice WhatsApp Otomatis)
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1.5 max-w-2xl font-light">
              Kirimkan rincian invoice tunggakan iuran anggota secara otomatis ke nomor WhatsApp Kepala Sekolah dengan <strong>1 klik tombol</strong>. Data nomor otomatis diambil dari Sheet Sekolah Kolom G.
            </p>
          </div>

          {/* Quick Cutoff Period Controller */}
          <div className="bg-white/15 p-3 rounded-2xl backdrop-blur-md border border-white/25 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shrink-0">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-200" />
              <div className="text-xs">
                <span className="block text-[10px] text-teal-200 uppercase font-semibold">Tahun Buku</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-teal-950/80 text-white font-bold text-xs py-1 px-2.5 rounded-lg border border-teal-400/40 focus:outline-none focus:ring-2 focus:ring-teal-300 cursor-pointer"
                >
                  {availableYears.map((y) => (
                    <option key={`opt-year-${y}`} value={y}>
                      Tahun {y} {y === currentYear ? '(Berjalan)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="h-6 w-px bg-white/20 hidden sm:block"></div>

            <div className="text-xs">
              <span className="block text-[10px] text-teal-200 uppercase font-semibold">Batas Penagihan</span>
              <select
                value={cutoffOption === 'specific' ? String(selectedCutoffIdx) : cutoffOption}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'running') {
                    setCutoffOption('running');
                  } else if (val === 'full') {
                    setCutoffOption('full');
                  } else {
                    setCutoffOption('specific');
                    setSelectedCutoffIdx(Number(val));
                  }
                }}
                className="bg-teal-950/80 text-white font-bold text-xs py-1 px-2.5 rounded-lg border border-teal-400/40 focus:outline-none focus:ring-2 focus:ring-teal-300 cursor-pointer"
              >
                <option value="running">
                  Sampai Bulan Berjalan ({BULAN_LIST[currentMonthIdx]})
                </option>
                <option value="full">Setahun Penuh (Jan - Des)</option>
                <optgroup label="Pilih Batas Bulan Spesifik:">
                  {BULAN_LIST.map((b, idx) => (
                    <option key={`opt-cut-${b}-${idx}`} value={idx}>
                      Sampai Bulan {b}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Sekolah Menunggak */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sekolah Belum Bayar</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-600 tracking-tight">
              {stats.menunggakCount} <span className="text-sm font-semibold text-slate-400">/ {stats.totalSekolah} Sekolah</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Menunggak s.d. bulan <strong>{namaBulanBatas} {selectedYear}</strong>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Sudah Lunas: <strong className="text-emerald-600">{stats.lunasCount} Sekolah</strong></span>
          </div>
        </div>

        {/* Card 2: Total Nominal Tagihan */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Nominal Tagihan</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
              {formatRupiah(stats.totalNominalTagihan)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tarif iuran resmi: <strong>Rp 100.000 / bulan</strong>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Rekening: <strong>{namaBank} ({nomorRekening})</strong></span>
          </div>
        </div>

        {/* Card 3: Status Nomor WhatsApp */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nomor WA Terdaftar</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <Phone className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-600 tracking-tight">
              {stats.withPhoneCount} <span className="text-sm font-semibold text-slate-400">/ {stats.totalSekolah} Ada WA</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.totalSekolah - stats.withPhoneCount === 0 ? (
                <span className="text-emerald-700 font-bold">Semua sekolah memiliki nomor WA</span>
              ) : (
                <span className="text-amber-700 font-semibold">{stats.totalSekolah - stats.withPhoneCount} sekolah belum ada nomor di Kolom G</span>
              )}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Sumber: <strong>Sheet Sekolah (Kolom G)</strong></span>
          </div>
        </div>

        {/* Card 4: Pengiriman Hari Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ditagih Hari Ini</span>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 group-hover:scale-110 transition-transform">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-teal-700 tracking-tight">
              {stats.sentTodayCount} <span className="text-sm font-semibold text-slate-400">Sekolah</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tercatat invoice telah dibuka ke WhatsApp hari ini
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Pengirim: <strong>{currentBendahara}</strong></span>
          </div>
        </div>

      </div>

      {/* Control Bar: Filter Tabs & Search */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setStatusFilter('tunggakan')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                statusFilter === 'tunggakan'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Belum Bayar ({stats.menunggakCount})</span>
            </button>

            <button
              onClick={() => setStatusFilter('semua')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                statusFilter === 'semua'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Semua Sekolah ({stats.totalSekolah})</span>
            </button>

            <button
              onClick={() => setStatusFilter('no-wa')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                statusFilter === 'no-wa'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Belum Ada WA ({stats.totalSekolah - stats.withPhoneCount})</span>
            </button>

            <button
              onClick={() => setStatusFilter('lunas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                statusFilter === 'lunas'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sudah Lunas ({stats.lunasCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] sm:min-w-[320px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari sekolah, kepsek, atau nomor WA..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

        {/* Info Banner */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="p-1 bg-emerald-600 text-white rounded-lg">
              <Phone className="w-3.5 h-3.5" />
            </span>
            <span>
              Menampilkan rincian tagihan iuran s.d. bulan <strong>{namaBulanBatas} {selectedYear}</strong>. Klik tombol <strong>Kirim Invoice WA</strong> untuk langsung mengirim pesan tagihan resmi ke Kepala Sekolah.
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 font-semibold shrink-0">
            Rek: {namaBank} {nomorRekening} (a.n. {atasNamaRekening})
          </span>
        </div>
      </div>

      {/* Main Table / Cards List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {filteredBillings.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="p-4 bg-slate-100 text-slate-400 rounded-2xl w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Tidak Ada Data Tagihan</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {statusFilter === 'tunggakan'
                ? `Alhamdulillah! Seluruh sekolah telah lunas membayar iuran s.d. bulan ${namaBulanBatas} ${selectedYear}.`
                : 'Tidak ada sekolah yang cocok dengan kriteria pencarian Anda.'}
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE CARD VIEW (Tampilan Khusus Layar HP / Mobile < md) */}
            <div className="block md:hidden p-3 space-y-3 bg-slate-50/60">
              {filteredBillings.map((item, idx) => {
                const s = item.sekolah;
                const isLunas = item.isLunasCutoff;

                return (
                  <div
                    key={`mobile-billing-card-${s.idSekolah}-${idx}`}
                    className={`bg-white rounded-2xl border p-4 shadow-xs space-y-3 transition-all ${
                      isLunas 
                        ? 'border-emerald-200 bg-emerald-50/20' 
                        : 'border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    {/* Header Card: No & Sekolah */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md text-[10px]">
                            #{idx + 1}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isLunas 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {isLunas ? 'LUNAS 100%' : `Sisa ${item.unpaidMonthsCutoff.length} Bln`}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                          {s.namaSekolah}
                        </h4>
                        <div className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                          <UserCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">{s.namaKepsek}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {s.alamat ? `${s.alamat}, Kel. ${s.kelurahan}` : `Kec. ${s.kecamatan}`}
                        </div>
                      </div>
                    </div>

                    {/* Kontak WA (Kolom G) */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-medium">Kontak WhatsApp:</span>
                      {item.hasValidPhone ? (
                        <div className="flex items-center space-x-2">
                          <div className="inline-flex items-center space-x-1.5 font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 text-xs font-bold">
                            <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{formatWhatsAppDisplayNumber(item.cleanPhone)}</span>
                          </div>
                          <button
                            onClick={() => {
                              setEditingSchool(s);
                              setEditPhoneValue(s.kontak || '');
                            }}
                            className="text-slate-400 hover:text-teal-700 p-1 rounded-md"
                            title="Edit Nomor WA"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingSchool(s);
                            setEditPhoneValue('');
                          }}
                          className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-rose-200 transition-colors"
                        >
                          <AlertCircle className="w-3 h-3" />
                          <span>+ Input No WA</span>
                        </button>
                      )}
                    </div>

                    {/* Rincian Tagihan & Bulan Belum Lunas */}
                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 font-medium block">Total Tagihan (s.d. {namaBulanBatas}):</span>
                          <span className={`text-base font-black ${isLunas ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {isLunas ? 'Rp 0' : formatRupiah(item.totalTagihanCutoff)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-medium block">Status Ditagih:</span>
                          {item.lastSentTime ? (
                            <span className="inline-flex items-center space-x-1 text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-teal-600" />
                              <span>Sudah Ditagih</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              {isLunas ? '-' : 'Belum Ditagih'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bulan Belum Lunas Chips */}
                      {!isLunas && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] text-slate-500 font-medium block mb-1">
                            Bulan Belum Lunas ({item.unpaidMonthsCutoff.length} Bulan):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {item.unpaidMonthsCutoff.map((m, mIdx) => (
                              <span
                                key={`mob-unpaid-${s.idSekolah}-${m}-${mIdx}`}
                                className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.5 rounded text-[10px]"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Aksi Invoice Card (1-Klik WhatsApp & Opsi Tambahan) */}
                    <div className="pt-1">
                      {isLunas ? (
                        <div className="p-2 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Iuran Lunas s.d. {namaBulanBatas}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Tombol Utama 1-KLIK WA (Full Width, Sangat Mudah Ditekan di HP) */}
                          <button
                            onClick={() => handleSendWhatsApp(s, item.unpaidMonthsCutoff, item.totalTagihanCutoff)}
                            className="w-full py-2.5 px-4 bg-[#25D366] hover:bg-[#1EBE5D] active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                          >
                            <Send className="w-4 h-4 fill-current shrink-0" />
                            <span>Kirim Invoice WA Sekarang</span>
                          </button>

                          {/* Tombol Sekunder Mobile */}
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => handleOpenPreview(s, item.unpaidMonthsCutoff)}
                              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-colors"
                              title="Lihat Draf & Salin"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                              <span>Draf WA</span>
                            </button>

                            <button
                              onClick={() => handleDownloadPDFInvoice(s, item.unpaidMonthsCutoff, item.totalTagihanCutoff)}
                              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-colors"
                              title="Unduh PDF"
                            >
                              <FileDown className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                              <span>PDF Tagihan</span>
                            </button>

                            {onNavigateToInputIuran && (
                              <button
                                onClick={() => onNavigateToInputIuran(s.namaSekolah)}
                                className="py-1.5 px-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-colors"
                                title="Input Pembayaran Iuran"
                              >
                                <Wallet className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span>Bayar Iuran</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (Tampilan Tabel Khusus Layar Tablet / Komputer >= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4 font-bold">No</th>
                    <th className="py-3.5 px-4 font-bold">Nama Sekolah & Kepala Sekolah</th>
                    <th className="py-3.5 px-4 font-bold">Kontak WA (Kolom G)</th>
                    <th className="py-3.5 px-4 font-bold">Bulan Belum Lunas (s.d. {namaBulanBatas})</th>
                    <th className="py-3.5 px-4 font-bold text-right">Total Tagihan</th>
                    <th className="py-3.5 px-4 font-bold text-center">Status / Log Tagih</th>
                    <th className="py-3.5 px-4 font-bold text-center">Aksi Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBillings.map((item, idx) => {
                    const s = item.sekolah;
                    const isLunas = item.isLunasCutoff;

                    return (
                      <tr 
                        key={`billing-row-${s.idSekolah}-${idx}`}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isLunas ? 'bg-emerald-50/20' : ''
                        }`}
                      >
                        {/* No */}
                        <td className="py-3.5 px-4 text-slate-400 font-semibold">
                          {idx + 1}
                        </td>

                        {/* Nama Sekolah & Kepsek */}
                        <td className="py-3.5 px-4 min-w-[220px]">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">
                            {s.namaSekolah}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-1">
                            <UserCheck className="w-3 h-3 text-teal-600 shrink-0" />
                            <span className="truncate">{s.namaKepsek}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {s.alamat ? `${s.alamat}, Kel. ${s.kelurahan}` : `Kec. ${s.kecamatan}`}
                          </div>
                        </td>

                        {/* Kontak WhatsApp (Kolom G) */}
                        <td className="py-3.5 px-4 min-w-[170px]">
                          {item.hasValidPhone ? (
                            <div className="space-y-1">
                              <div className="inline-flex items-center space-x-1.5 font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs font-bold">
                                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{formatWhatsAppDisplayNumber(item.cleanPhone)}</span>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingSchool(s);
                                  setEditPhoneValue(s.kontak || '');
                                }}
                                className="text-[10px] text-slate-400 hover:text-teal-700 flex items-center space-x-1 cursor-pointer hover:underline"
                                title="Ubah nomor WhatsApp"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit Nomor</span>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-200">
                                <AlertCircle className="w-3 h-3" />
                                <span>Belum Ada Nomor</span>
                              </span>
                              <div>
                                <button
                                  onClick={() => {
                                    setEditingSchool(s);
                                    setEditPhoneValue('');
                                  }}
                                  className="text-[10px] text-teal-700 hover:text-teal-900 font-bold flex items-center space-x-1 cursor-pointer hover:underline"
                                >
                                  <span>+ Input No WA</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Bulan Belum Lunas */}
                        <td className="py-3.5 px-4 min-w-[220px]">
                          {isLunas ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full text-xs font-extrabold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Lunas s.d. {namaBulanBatas}</span>
                            </span>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap gap-1">
                                {item.unpaidMonthsCutoff.map((m, mIdx) => (
                                  <span 
                                    key={`unpaid-chip-${s.idSekolah}-${m}-${mIdx}`}
                                    className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded text-[10px]"
                                  >
                                    {m}
                                  </span>
                                ))}
                              </div>
                              <div className="text-[10px] text-slate-500 font-semibold">
                                Menunggak: <strong className="text-rose-600">{item.unpaidMonthsCutoff.length} Bulan</strong> (Terbayar {item.paidCount} Bln)
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Total Tagihan */}
                        <td className="py-3.5 px-4 text-right min-w-[130px]">
                          <div className={`font-extrabold text-sm ${isLunas ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isLunas ? 'Rp 0' : formatRupiah(item.totalTagihanCutoff)}
                          </div>
                          {!isLunas && item.unpaidMonthsFullYear.length > item.unpaidMonthsCutoff.length && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Setahun: {formatRupiah(item.totalTunggakanFullYear)}
                            </div>
                          )}
                        </td>

                        {/* Status / Log Ditagih */}
                        <td className="py-3.5 px-4 text-center min-w-[130px]">
                          {item.lastSentTime ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center space-x-1 bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3 text-teal-600" />
                                <span>Sudah Ditagih</span>
                              </span>
                              <div className="text-[9px] text-slate-400">
                                {new Date(item.lastSentTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {new Date(item.lastSentTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">
                              {isLunas ? '-' : 'Belum Ditagih'}
                            </span>
                          )}
                        </td>

                        {/* Aksi Invoice (1 Tombol WhatsApp & Opsi Lain) */}
                        <td className="py-3.5 px-4 text-center min-w-[210px]">
                          {isLunas ? (
                            <span className="text-emerald-600 text-xs font-semibold flex items-center justify-center space-x-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Tidak Ada Tagihan</span>
                            </span>
                          ) : (
                            <div className="flex items-center justify-center space-x-1.5 flex-wrap gap-y-1">
                              {/* Tombol 1-KLIK KIRIM WA */}
                              <button
                                onClick={() => handleSendWhatsApp(s, item.unpaidMonthsCutoff, item.totalTagihanCutoff)}
                                className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                                title="Buka WhatsApp & Kirim Invoice Otomatis"
                              >
                                <Send className="w-3.5 h-3.5 fill-current" />
                                <span>Kirim Invoice WA</span>
                              </button>

                              {/* Tombol Preview Draft */}
                              <button
                                onClick={() => handleOpenPreview(s, item.unpaidMonthsCutoff)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                                title="Lihat Draft Pesan WA & Salin"
                              >
                                <MessageSquare className="w-4 h-4 text-teal-700" />
                              </button>

                              {/* Tombol Unduh PDF Invoice */}
                              <button
                                onClick={() => handleDownloadPDFInvoice(s, item.unpaidMonthsCutoff, item.totalTagihanCutoff)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                                title="Cetak / Download Surat Tagihan Resmi (PDF)"
                              >
                                <FileDown className="w-4 h-4 text-slate-700" />
                              </button>

                              {/* Tombol Cepat Bayar (Input Iuran) */}
                              {onNavigateToInputIuran && (
                                <button
                                  onClick={() => onNavigateToInputIuran(s.namaSekolah)}
                                  className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl transition-colors cursor-pointer"
                                  title="Buka Form Input Iuran untuk Sekolah Ini"
                                >
                                  <Wallet className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>

      {/* MODAL: PREVIEW & SALIN PESAN WHATSAPP */}
      {previewSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 relative space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Preview Draft Invoice WhatsApp</h3>
                  <p className="text-xs text-slate-500">{previewSchool.namaSekolah}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewSchool(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Contact Display */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[10px]">Penerima Tagihan:</span>
                <span className="font-bold text-slate-800">{previewSchool.namaKepsek}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">Tujuan WhatsApp:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatWhatsAppDisplayNumber(previewSchool.kontak)}
                </span>
              </div>
            </div>

            {/* Message Box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Isi Pesan WhatsApp yang Dikirimkan:
              </label>
              <pre className="bg-emerald-950/90 text-emerald-100 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed border border-emerald-900 shadow-inner">
                {generateWhatsAppMessage(
                  previewSchool, 
                  previewUnpaidMonths, 
                  previewUnpaidMonths.length * IURAN_PER_BULAN
                )}
              </pre>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={handleCopyDraft}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                {copiedDraft ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedDraft ? 'Tersalin ke Clipboard!' : 'Salin Teks Pesan'}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPreviewSchool(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSendWhatsApp(
                      previewSchool, 
                      previewUnpaidMonths, 
                      previewUnpaidMonths.length * IURAN_PER_BULAN
                    );
                    setPreviewSchool(null);
                  }}
                  className="px-5 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4 fill-current" />
                  <span>Kirim ke WhatsApp Sekarang</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: INPUT / EDIT NOMOR WHATSAPP (KOLOM G) */}
      {editingSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 relative space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Kontak WhatsApp Kepala Sekolah</h3>
                  <p className="text-xs text-slate-500">Sheet Sekolah - Kolom G</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSchool(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePhone} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-800">{editingSchool.namaSekolah}</div>
                <div className="text-slate-500">Kepsek: {editingSchool.namaKepsek}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nomor WhatsApp Kepala Sekolah <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={editPhoneValue}
                    onChange={(e) => setEditPhoneValue(e.target.value)}
                    placeholder="Contoh: 08123456789 atau 628123456789"
                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Format dapat diawali <strong>08...</strong> atau <strong>628...</strong>. Sistem akan otomatis memformat nomor untuk link WhatsApp.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSchool(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Simpan Nomor</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
