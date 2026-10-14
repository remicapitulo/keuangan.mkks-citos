import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Wallet, 
  Landmark, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Save, 
  RefreshCw, 
  Calculator, 
  FileText, 
  Info, 
  HelpCircle,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  Database,
  UserCheck,
  Edit3,
  ShieldCheck,
  Clock,
  Lock,
  History,
  PlusCircle,
  Trash2,
  Eye,
  Layers
} from 'lucide-react';
import { RekonsiliasiKas, PecahanUangCash, User, Sekolah } from '../types';
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

interface AuditRekonsiliasiTabProps {
  selectedYear: number;
  totalKasMasuk: number;
  totalKasKeluar: number;
  saldoData: number;
  totalIuranMasuk: number;
  totalPemasukanLain: number;
  currentAudit: RekonsiliasiKas;
  allAudits?: RekonsiliasiKas[];
  onSelectAudit?: (audit: RekonsiliasiKas) => void;
  onDeleteAudit?: (id: string) => void;
  isBendahara: boolean;
  currentUser: User | null;
  usersList?: User[];
  sekolahList: Sekolah[];
  onSaveAudit: (record: RekonsiliasiKas) => void;
  onOpenBeritaAcara: (audit?: RekonsiliasiKas) => void;
  onOpenSpreadsheetModal?: () => void;
  readOnly?: boolean;
}

export const AuditRekonsiliasiTab: React.FC<AuditRekonsiliasiTabProps> = ({
  selectedYear,
  totalKasMasuk,
  totalKasKeluar,
  saldoData,
  totalIuranMasuk,
  totalPemasukanLain,
  currentAudit,
  allAudits = [],
  onSelectAudit,
  onDeleteAudit,
  isBendahara,
  currentUser,
  usersList = [],
  sekolahList,
  onSaveAudit,
  onOpenBeritaAcara,
  onOpenSpreadsheetModal,
  readOnly = false
}) => {
  const isKetua = currentUser?.role === 'Ketua' || currentUser?.role?.toLowerCase() === 'ketua';
  const isReadOnly = Boolean(readOnly || isKetua || !isBendahara);

  // App settings for bank account
  const appSettings = StorageService.getSettings();

  // Audit state - Support multiple audits on different dates without overwriting history
  const [editingAuditId, setEditingAuditId] = useState<string>(currentAudit.id || `AUDIT-${selectedYear}-01`);
  const [isNewAuditMode, setIsNewAuditMode] = useState<boolean>(false);

  // Form state
  const [saldoCash, setSaldoCash] = useState<number>(currentAudit.saldoCash || 0);
  const [saldoBank, setSaldoBank] = useState<number>(currentAudit.saldoBank || 0);
  const [namaBank, setNamaBank] = useState<string>(currentAudit.namaBank || appSettings.namaBank || 'Bank BJB');
  const [nomorRekening, setNomorRekening] = useState<string>(currentAudit.nomorRekening || appSettings.nomorRekening || '102.23.09876.1');
  const [atasNamaRekening, setAtasNamaRekening] = useState<string>(currentAudit.atasNamaRekening || appSettings.atasNamaRekening || 'MKKS SMP CITOS');
  const [catatanAudit, setCatatanAudit] = useState<string>(currentAudit.catatanAudit || '');
  // Helper to detect placeholder/sample audit records or dummy/shifted dates
  const isPlaceholderAudit = (audit?: RekonsiliasiKas | null) => {
    if (!audit || !audit.tanggalAudit) return true;
    if (isPlaceholderAuditTime(audit.tanggalAudit)) return true;
    if (audit.id === 'AUDIT-2026-01' && (audit.diauditOleh === 'Abu Haripin, M.Pd.' || audit.atasNamaRekening === 'MKKS SMP Cilandak')) {
      return true;
    }
    return false;
  };

  const [liveWIB, setLiveWIB] = useState<string>(() => getCurrentWIBDateTimeString());
  const [otomatisWaktuSekarang, setOtomatisWaktuSekarang] = useState<boolean>(() => {
    return isPlaceholderAudit(currentAudit);
  });

  const [tanggalAudit, setTanggalAudit] = useState<string>(() => {
    // If no tanggalAudit saved yet or it matches old default static seed/timezone shift, always use live WIB now
    if (isPlaceholderAudit(currentAudit)) {
      return getCurrentWIBDateTimeString();
    }
    return cleanDateInputString(currentAudit.tanggalAudit) || getCurrentWIBDateTimeString();
  });

  // Keep live time updated every 5 seconds if automatic mode is on
  useEffect(() => {
    const timer = setInterval(() => {
      const nowWib = getCurrentWIBDateTimeString();
      setLiveWIB(nowWib);
      if (otomatisWaktuSekarang) {
        setTanggalAudit(nowWib);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [otomatisWaktuSekarang]);

  // Helper to detect old initial placeholders
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

  // Derive Ketua MKKS secara otomatis dari sheet User (Role: "Ketua")
  const detectedKetuaUser = StorageService.getKetuaUser(usersList);
  const ketuaFromUserSheet = detectedKetuaUser?.namaKepsek || '';
  // Derive logged in Bendahara/Admin name
  const namaPemeriksaLogin = currentUser?.namaKepsek || currentUser?.username || 'Bendahara MKKS';

  // Signer / Pejabat states
  const defaultPejabat = StorageService.getPejabat(usersList);
  const [namaKetuaMkks, setNamaKetuaMkks] = useState<string>(() => {
    if (detectedKetuaUser?.namaKepsek) {
      return detectedKetuaUser.namaKepsek;
    }
    return currentAudit.namaKetuaMkks || defaultPejabat.namaKetuaMkks || '';
  });
  const [nipKetuaMkks, setNipKetuaMkks] = useState<string>(() => 
    currentAudit.nipKetuaMkks || defaultPejabat.nipKetuaMkks || ''
  );
  const [jabatanKetuaMkks, setJabatanKetuaMkks] = useState<string>(() => 
    currentAudit.jabatanKetuaMkks || defaultPejabat.jabatanKetuaMkks || 'Ketua MKKS SMP Cimanggis & Tapos'
  );
  const [isSyncingKetua, setIsSyncingKetua] = useState<boolean>(false);

  const handleSyncKetuaFromSheet = async () => {
    setIsSyncingKetua(true);
    try {
      const ok = await StorageService.fetchFromAppsScript();
      const freshUsers = StorageService.getUsers();
      const freshKetua = StorageService.getKetuaUser(freshUsers);
      if (freshKetua?.namaKepsek) {
        setNamaKetuaMkks(freshKetua.namaKepsek);
        if (onSaveAudit) {
          onSaveAudit({ ...currentAudit, namaKetuaMkks: freshKetua.namaKepsek });
        }
      }
    } catch (e) {
      console.error('Sync Ketua failed:', e);
    } finally {
      setIsSyncingKetua(false);
    }
  };

  // Pejabat 2 Bendahara: secara otomatis di awal mengambil dari akun login. Baru nanti jika ada perubahan, petugas cetak dapat mengedit manual.
  const [namaBendahara, setNamaBendahara] = useState<string>(() => {
    if (currentAudit.namaBendahara && !isOldBendaharaPlaceholder(currentAudit.namaBendahara)) {
      return currentAudit.namaBendahara;
    }
    return namaPemeriksaLogin || defaultPejabat.namaBendahara || 'Bendahara MKKS';
  });
  const [nipBendahara, setNipBendahara] = useState<string>(() => 
    currentAudit.nipBendahara || defaultPejabat.nipBendahara || ''
  );
  const [jabatanBendahara, setJabatanBendahara] = useState<string>(() => 
    currentAudit.jabatanBendahara || defaultPejabat.jabatanBendahara || 'Bendahara MKKS SMP Citos'
  );

  // Cash Calculator state
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [pecahan, setPecahan] = useState<PecahanUangCash>(() => ({
    pecahan100k: currentAudit.pecahanCash?.pecahan100k || 0,
    pecahan50k: currentAudit.pecahanCash?.pecahan50k || 0,
    pecahan20k: currentAudit.pecahanCash?.pecahan20k || 0,
    pecahan10k: currentAudit.pecahanCash?.pecahan10k || 0,
    pecahan5k: currentAudit.pecahanCash?.pecahan5k || 0,
    pecahan2k: currentAudit.pecahanCash?.pecahan2k || 0,
    pecahan1k: currentAudit.pecahanCash?.pecahan1k || 0,
    koin: currentAudit.pecahanCash?.koin || 0
  }));

  const [toastSave, setToastSave] = useState<boolean>(false);

  // Sync state when currentAudit prop changes (e.g. year changed) or usersList updates
  useEffect(() => {
    setEditingAuditId(currentAudit.id || `AUDIT-${selectedYear}-01`);
    setIsNewAuditMode(false);
    setSaldoCash(currentAudit.saldoCash || 0);
    setSaldoBank(currentAudit.saldoBank || 0);
    setNamaBank(currentAudit.namaBank || appSettings.namaBank || 'Bank BJB');
    setNomorRekening(currentAudit.nomorRekening || appSettings.nomorRekening || '102.23.09876.1');
    setAtasNamaRekening(currentAudit.atasNamaRekening || appSettings.atasNamaRekening || 'MKKS SMP CITOS');
    setCatatanAudit(currentAudit.catatanAudit || '');
    const isOldPlaceholderTime = isPlaceholderAudit(currentAudit);
    if (isOldPlaceholderTime || otomatisWaktuSekarang) {
      setTanggalAudit(getCurrentWIBDateTimeString());
    } else {
      setTanggalAudit(cleanDateInputString(currentAudit.tanggalAudit) || getCurrentWIBDateTimeString());
    }
    if (currentAudit.pecahanCash) {
      setPecahan(currentAudit.pecahanCash);
    }
    const pej = StorageService.getPejabat(usersList);
    const ketuaUser = StorageService.getKetuaUser(usersList);
    
    // Otomatis deteksi Role: "Ketua" dari sheet User: jika terdeteksi dari sheet User, SELALU prioritaskan
    const resolvedKetua = ketuaUser?.namaKepsek || currentAudit.namaKetuaMkks || pej.namaKetuaMkks || '';
    
    // Otomatis di awal mengambil dari akun login, kecuali ada edit manual spesifik yang bukan placeholder lama
    const resolvedBendahara = (currentAudit.namaBendahara && !isOldBendaharaPlaceholder(currentAudit.namaBendahara))
      ? currentAudit.namaBendahara
      : (namaPemeriksaLogin || pej.namaBendahara || 'Bendahara MKKS');

    setNamaKetuaMkks(resolvedKetua);
    setNipKetuaMkks(currentAudit.nipKetuaMkks || pej.nipKetuaMkks || '');
    setJabatanKetuaMkks(currentAudit.jabatanKetuaMkks || pej.jabatanKetuaMkks || 'Ketua MKKS SMP Cimanggis & Tapos');
    setNamaBendahara(resolvedBendahara);
    setNipBendahara(currentAudit.nipBendahara || pej.nipBendahara || '');
    setJabatanBendahara(currentAudit.jabatanBendahara || pej.jabatanBendahara || 'Bendahara MKKS SMP Citos');
  }, [currentAudit, currentUser, usersList, selectedYear]);

  const startNewAudit = () => {
    const historyList = allAudits && allAudits.length > 0 ? allAudits : StorageService.getRekonsiliasiKas().filter(r => r.tahun === selectedYear);
    const existingIds = new Set(historyList.map(h => h.id));
    let nextNum = historyList.length + 1;
    let newId = `AUDIT-${selectedYear}-${String(nextNum).padStart(2, '0')}`;
    while (existingIds.has(newId)) {
      nextNum++;
      newId = `AUDIT-${selectedYear}-${String(nextNum).padStart(2, '0')}`;
    }
    setEditingAuditId(newId);
    setIsNewAuditMode(true);
    setSaldoCash(0);
    setSaldoBank(0);
    setNamaBank(appSettings.namaBank || 'Bank BJB');
    setNomorRekening(appSettings.nomorRekening || '102.23.09876.1');
    setAtasNamaRekening(appSettings.atasNamaRekening || 'MKKS SMP CITOS');
    setCatatanAudit('');
    setTanggalAudit(getCurrentWIBDateTimeString());
    setOtomatisWaktuSekarang(true);
    
    // Smooth scroll to form
    const formElem = document.getElementById('form-audit-rekonsiliasi');
    if (formElem) {
      formElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSaveAsNew = () => {
    const historyList = allAudits && allAudits.length > 0 ? allAudits : StorageService.getRekonsiliasiKas().filter(r => r.tahun === selectedYear);
    const existingIds = new Set(historyList.map(h => h.id));
    let nextNum = historyList.length + 1;
    let newId = `AUDIT-${selectedYear}-${String(nextNum).padStart(2, '0')}`;
    while (existingIds.has(newId)) {
      nextNum++;
      newId = `AUDIT-${selectedYear}-${String(nextNum).padStart(2, '0')}`;
    }

    const diauditOleh = namaPemeriksaLogin;
    const penandatanganBendahara = namaBendahara.trim() || namaPemeriksaLogin;
    
    StorageService.savePejabat({
      namaKetuaMkks,
      nipKetuaMkks,
      jabatanKetuaMkks,
      namaBendahara: penandatanganBendahara,
      nipBendahara,
      jabatanBendahara
    });

    const finalTanggalAudit = otomatisWaktuSekarang 
      ? getCurrentWIBDateTimeString() 
      : (cleanDateInputString(tanggalAudit) || getCurrentWIBDateTimeString());

    const recordToSave: RekonsiliasiKas = {
      id: newId,
      tahun: selectedYear,
      tanggalAudit: finalTanggalAudit,
      saldoCash: Number(saldoCash) || 0,
      saldoBank: Number(saldoBank) || 0,
      namaBank: namaBank || appSettings.namaBank || 'Bank BJB',
      nomorRekening: nomorRekening || appSettings.nomorRekening || '-',
      atasNamaRekening: atasNamaRekening || appSettings.atasNamaRekening || 'MKKS SMP CITOS',
      catatanAudit: catatanAudit || '',
      diauditOleh,
      namaKetuaMkks,
      nipKetuaMkks,
      jabatanKetuaMkks,
      namaBendahara: penandatanganBendahara,
      nipBendahara,
      jabatanBendahara,
      pecahanCash: isCalculatorOpen || totalHitungFisikCash > 0 ? pecahan : currentAudit.pecahanCash
    };

    // Sinkronkan informasi bank ke AppSettings (Sheet Setting) jika diubah di form audit
    if (namaBank || nomorRekening || atasNamaRekening) {
      StorageService.saveSettings({
        namaBank: (namaBank || appSettings.namaBank || 'Bank BJB').trim(),
        nomorRekening: (nomorRekening || appSettings.nomorRekening || '').trim(),
        atasNamaRekening: (atasNamaRekening || appSettings.atasNamaRekening || 'MKKS SMP CITOS').trim()
      }, false);
    }

    onSaveAudit(recordToSave);
    setEditingAuditId(newId);
    setIsNewAuditMode(false);
    setToastSave(true);
    setTimeout(() => setToastSave(false), 3000);
  };

  const loadAuditForEditing = (audit: RekonsiliasiKas) => {
    setEditingAuditId(audit.id);
    setIsNewAuditMode(false);
    setSaldoCash(audit.saldoCash || 0);
    setSaldoBank(audit.saldoBank || 0);
    setNamaBank(audit.namaBank || appSettings.namaBank || 'Bank BJB');
    setNomorRekening(audit.nomorRekening || appSettings.nomorRekening || '102.23.09876.1');
    setAtasNamaRekening(audit.atasNamaRekening || appSettings.atasNamaRekening || 'MKKS SMP CITOS');
    setCatatanAudit(audit.catatanAudit || '');
    setTanggalAudit(cleanDateInputString(audit.tanggalAudit) || getCurrentWIBDateTimeString());
    setOtomatisWaktuSekarang(false);
    if (audit.pecahanCash) {
      setPecahan(audit.pecahanCash);
    }
    if (onSelectAudit) {
      onSelectAudit(audit);
    }
  };

  // Total calculated from physical cash bills
  const totalHitungFisikCash = 
    (pecahan.pecahan100k * 100000) +
    (pecahan.pecahan50k * 50000) +
    (pecahan.pecahan20k * 20000) +
    (pecahan.pecahan10k * 10000) +
    (pecahan.pecahan5k * 5000) +
    (pecahan.pecahan2k * 2000) +
    (pecahan.pecahan1k * 1000) +
    (Number(pecahan.koin) || 0);

  // Apply cash calculation to cash field
  const handleApplyCalculator = () => {
    setSaldoCash(totalHitungFisikCash);
    setIsCalculatorOpen(false);
  };

  // Real vs Data Calculations
  const isAdmin = currentUser ? (
    currentUser.role === 'Admin' ||
    currentUser.role?.toLowerCase() === 'admin' ||
    currentUser.username?.toLowerCase() === 'admin' ||
    currentUser.username?.toLowerCase().includes('admin')
  ) : false;

  const totalSaldoReal = (Number(saldoCash) || 0) + (Number(saldoBank) || 0);
  const selisih = totalSaldoReal - saldoData;
  const isBalance = Math.abs(selisih) === 0;
  const isLebih = selisih > 0;

  // Auto balance helper: splits current saldoData into cash & bank
  const handleAutoBalance = () => {
    // split: 25% cash, 75% bank rounded to nearest 50,000
    const cashShare = Math.max(0, Math.round((saldoData * 0.25) / 50000) * 50000);
    const bankShare = Math.max(0, saldoData - cashShare);
    setSaldoCash(cashShare);
    setSaldoBank(bankShare);
    setCatatanAudit(`Penyelarasan otomatis kas fisik dan rekening bank per saldo buku data ${selectedYear}.`);
  };

  // Save audit data - Never overwrites audits from other dates or other records!
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const diauditOleh = namaPemeriksaLogin;
    const penandatanganBendahara = namaBendahara.trim() || namaPemeriksaLogin;
    
    // Save to persistent storage for all documents
    StorageService.savePejabat({
      namaKetuaMkks,
      nipKetuaMkks,
      jabatanKetuaMkks,
      namaBendahara: penandatanganBendahara,
      nipBendahara,
      jabatanBendahara
    });

    const finalTanggalAudit = otomatisWaktuSekarang 
      ? getCurrentWIBDateTimeString() 
      : (cleanDateInputString(tanggalAudit) || getCurrentWIBDateTimeString());

    const finalId = editingAuditId || currentAudit.id || `AUDIT-${selectedYear}-01`;

    const recordToSave: RekonsiliasiKas = {
      id: finalId,
      tahun: selectedYear,
      tanggalAudit: finalTanggalAudit,
      saldoCash: Number(saldoCash) || 0,
      saldoBank: Number(saldoBank) || 0,
      namaBank: namaBank || appSettings.namaBank || 'Bank BJB',
      nomorRekening: nomorRekening || appSettings.nomorRekening || '-',
      atasNamaRekening: atasNamaRekening || appSettings.atasNamaRekening || 'MKKS SMP CITOS',
      catatanAudit: catatanAudit || '',
      diauditOleh,
      namaKetuaMkks,
      nipKetuaMkks,
      jabatanKetuaMkks,
      namaBendahara: penandatanganBendahara,
      nipBendahara,
      jabatanBendahara,
      pecahanCash: isCalculatorOpen || totalHitungFisikCash > 0 ? pecahan : currentAudit.pecahanCash
    };

    onSaveAudit(recordToSave);
    setIsNewAuditMode(false);
    setToastSave(true);
    setTimeout(() => setToastSave(false), 3000);
  };

  const handleOpenBeritaAcaraWithSync = () => {
    const effectiveTanggal = cleanDateInputString(tanggalAudit) || getCurrentWIBDateTimeString();
    const penandatanganBendahara = (namaBendahara && !isOldBendaharaPlaceholder(namaBendahara))
      ? namaBendahara
      : (namaPemeriksaLogin || StorageService.getPejabat(usersList).namaBendahara || DEFAULT_PEJABAT.namaBendahara);

    const finalId = editingAuditId || currentAudit.id || `AUDIT-${selectedYear}-01`;

    const record: RekonsiliasiKas = {
      ...currentAudit,
      id: finalId,
      tahun: selectedYear,
      saldoCash: Number(saldoCash) || 0,
      saldoBank: Number(saldoBank) || 0,
      namaBank: namaBank || appSettings.namaBank || 'Bank BJB',
      nomorRekening: nomorRekening || appSettings.nomorRekening || '-',
      atasNamaRekening: atasNamaRekening || appSettings.atasNamaRekening || 'MKKS SMP CITOS',
      catatanAudit: catatanAudit || '',
      tanggalAudit: effectiveTanggal,
      namaKetuaMkks,
      nipKetuaMkks,
      jabatanKetuaMkks,
      namaBendahara: penandatanganBendahara,
      nipBendahara,
      jabatanBendahara,
      pecahanCash: isCalculatorOpen || totalHitungFisikCash > 0 ? pecahan : currentAudit.pecahanCash
    };

    if (onSaveAudit) {
      onSaveAudit(record);
    }
    onOpenBeritaAcara(record);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastSave && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 animate-bounce border border-emerald-500/50">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Audit Rekonsiliasi Kas Berhasil Disimpan!</p>
            <p className="text-[11px] text-emerald-200">Data tersinkron otomatis ke Google Spreadsheet (Sheet: Rekonsiliasi_Kas).</p>
          </div>
        </div>
      )}

      {/* Top Banner Penjelasan & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-5 sm:p-7 rounded-2xl shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-extrabold border border-emerald-500/30">
                <Scale className="w-3.5 h-3.5" />
                <span>Sistem Pengawasan & Audit Keuangan Real vs Data</span>
              </div>
              {isAdmin && onOpenSpreadsheetModal ? (
                <button
                  type="button"
                  onClick={onOpenSpreadsheetModal}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-500/25 hover:bg-teal-500/40 text-teal-200 text-xs font-bold border border-teal-400/40 transition-all cursor-pointer group shadow-2xs"
                  title="Klik untuk membuka Pengaturan Spreadsheet & Tes Koneksi (Admin)"
                >
                  <Database className="w-3.5 h-3.5 text-teal-300 group-hover:scale-110 transition-transform" />
                  <span>Database: Sheet Rekonsiliasi_Kas</span>
                  <span className="text-[10px] bg-teal-400/30 text-teal-100 px-1.5 py-0.2 rounded font-semibold ml-1">Kelola & Tes</span>
                </button>
              ) : (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 text-xs font-bold border border-teal-500/30">
                  <Database className="w-3.5 h-3.5 text-teal-300" />
                  <span>Database Sheet: Rekonsiliasi_Kas</span>
                </div>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Audit & Rekonsiliasi Kas Tahun {selectedYear}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Memverifikasi kesesuaian antara <strong>Saldo Menurut Data Laporan</strong> dengan <strong>Uang Fisik Secara Real</strong> (Uang Tunai/Cash di Bendahara & Uang di Rekening Bank). Tersinkronisasi penuh dengan Google Spreadsheet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && onOpenSpreadsheetModal && (
              <button
                type="button"
                id="btn-open-spreadsheet-audit"
                onClick={onOpenSpreadsheetModal}
                className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-teal-800/80 hover:bg-teal-700 active:scale-95 text-teal-100 hover:text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer border border-teal-500/40"
                title="Buka Pengaturan Database Google Spreadsheet (Khusus Admin)"
              >
                <Database className="w-4 h-4 text-teal-300" />
                <span>Koneksi Spreadsheet</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenBeritaAcaraWithSync}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Berita Acara Audit</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Bento Cards: Data vs Real vs Selisih */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Saldo Data (Sistem) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Pembukuan Sistem
              </span>
            </div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Saldo Menurut Data
            </h3>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {formatRupiah(saldoData)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Penerimaan Kas (Masuk):</span>
              <span className="font-mono font-bold text-emerald-700">{formatRupiah(totalKasMasuk)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Pengeluaran Kas (Keluar):</span>
              <span className="font-mono font-bold text-rose-700">{formatRupiah(totalKasKeluar)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-100">
              <span>Net Saldo Kas Sistem:</span>
              <span className="font-mono text-slate-900">{formatRupiah(saldoData)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Saldo Real Fisik (Cash + Bank) */}
        <div className="bg-white rounded-2xl p-5 border border-teal-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">
                Fisik & Rekening
              </span>
            </div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Total Saldo Real Keuangan
            </h3>
            <div className="text-2xl font-black text-teal-800 mt-1 font-mono">
              {formatRupiah(totalSaldoReal)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-teal-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-700 items-center">
              <span className="flex items-center space-x-1">
                <Wallet className="w-3.5 h-3.5 text-amber-600" />
                <span>1. Uang Cash (Brankas):</span>
              </span>
              <span className="font-mono font-bold text-slate-900">{formatRupiah(saldoCash)}</span>
            </div>
            <div className="flex justify-between text-slate-700 items-center">
              <span className="flex items-center space-x-1">
                <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. Saldo Bank ({namaBank}):</span>
              </span>
              <span className="font-mono font-bold text-slate-900">{formatRupiah(saldoBank)}</span>
            </div>
            <div className="flex justify-between font-bold text-teal-900 pt-1 border-t border-teal-100">
              <span>Total Uang Nyata:</span>
              <span className="font-mono">{formatRupiah(totalSaldoReal)}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Selisih & Status Audit */}
        <div className={`rounded-2xl p-5 border shadow-xs flex flex-col justify-between ${
          isBalance 
            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' 
            : isLebih 
            ? 'bg-amber-50/70 border-amber-300 text-amber-950' 
            : 'bg-rose-50/70 border-rose-300 text-rose-950'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl ${
                isBalance ? 'bg-emerald-200 text-emerald-800' : isLebih ? 'bg-amber-200 text-amber-800' : 'bg-rose-200 text-rose-800'
              }`}>
                {isBalance ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                isBalance ? 'bg-emerald-700 text-white' : isLebih ? 'bg-amber-700 text-white' : 'bg-rose-700 text-white'
              }`}>
                {isBalance ? 'BALANCE' : isLebih ? 'SELISIH LEBIH' : 'SELISIH KURANG'}
              </span>
            </div>
            <h3 className="text-xs font-bold opacity-80 uppercase tracking-wide">
              Selisih (Real vs Data)
            </h3>
            <div className="text-2xl font-black mt-1 font-mono">
              {isBalance ? 'Rp 0' : (isLebih ? `+${formatRupiah(selisih)}` : `-${formatRupiah(Math.abs(selisih))}`)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-current/15 text-xs leading-relaxed">
            {isBalance ? (
              <p className="font-medium text-emerald-800">
                ✅ <strong>Sempurna & Sinkron</strong>. Total uang fisik dan rekening bank tepat sama 100% dengan catatan pembukuan sistem.
              </p>
            ) : isLebih ? (
              <p className="font-medium text-amber-800">
                ⚠️ <strong>Uang Lebih Banyak</strong>. Saldo fisik & bank melebihi data buku sebesar {formatRupiah(selisih)}. Kemungkinan ada iuran/sponsor belum dicatat.
              </p>
            ) : (
              <p className="font-medium text-rose-800">
                🚨 <strong>Uang Lebih Sedikit</strong>. Saldo fisik & bank kurang sebesar {formatRupiah(Math.abs(selisih))} dari data buku. Harap cek pengeluaran yang belum diinput.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* SECTION HISTORI CATATAN AUDIT KAS OPNAME (TIDAK MENIMPA DATA SEBELUMNYA) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 px-5 sm:px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Histori Catatan Audit & Rekonsiliasi Kas (Tahun {selectedYear})
                </h3>
                <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                  {allAudits.length} Riwayat Tersimpan
                </span>
              </div>
              <p className="text-xs text-teal-200/80 mt-0.5">
                Setiap hasil audit kas opname pada tanggal tertentu tersimpan permanen dan tidak saling menimpa data sebelumnya.
              </p>
            </div>
          </div>

          {isBendahara && (
            <button
              type="button"
              onClick={startNewAudit}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
              title="Buat catatan audit baru untuk tanggal atau sesi kas opname lainnya"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>+ Catat Audit Baru (Tanggal Lain)</span>
            </button>
          )}
        </div>

        {/* Audit History List / Table */}
        <div className="p-4 sm:p-5">
          {allAudits.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Belum ada riwayat audit untuk tahun {selectedYear}. Klik tombol di atas untuk mencatat audit kas opname baru.
            </div>
          ) : (
            <>
              {/* Mobile Card List */}
              <div className="block lg:hidden space-y-3">
                {allAudits.map((item, idx) => {
                  const totalReal = (Number(item.saldoCash) || 0) + (Number(item.saldoBank) || 0);
                  const sel = totalReal - saldoData;
                  const isMatch = Math.abs(sel) === 0;
                  const isActive = item.id === editingAuditId;

                  return (
                    <div
                      key={`audit-mob-${item.id || idx}`}
                      className={`p-4 rounded-xl border transition-all ${
                        isActive 
                          ? 'border-teal-500 bg-teal-50/50 shadow-sm ring-2 ring-teal-500/20' 
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-xs text-slate-800">{item.id}</span>
                            {isActive && (
                              <span className="bg-teal-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                Sedang Dipilih
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-teal-800 mt-1 flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{formatDateTimeIndonesian(item.tanggalAudit)}</span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          isMatch 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : sel > 0 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isMatch ? 'BALANCE' : sel > 0 ? `+${formatRupiah(sel)}` : `-${formatRupiah(Math.abs(sel))}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Kas Tunai</span>
                          <span className="font-mono font-bold text-slate-800">{formatRupiah(item.saldoCash)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Rekening Bank</span>
                          <span className="font-mono font-bold text-slate-800">{formatRupiah(item.saldoBank)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Total Real</span>
                          <span className="font-mono font-black text-teal-800">{formatRupiah(totalReal)}</span>
                        </div>
                      </div>

                      {item.catatanAudit && (
                        <p className="text-[11px] text-slate-500 italic mt-2 line-clamp-1 bg-slate-50 p-1.5 rounded">
                          "{item.catatanAudit}"
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400">
                          Oleh: <strong className="text-slate-700">{item.diauditOleh || item.namaBendahara || 'Bendahara'}</strong>
                        </span>

                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => loadAuditForEditing(item)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg border border-teal-200 cursor-pointer"
                          >
                            Muat Form
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenBeritaAcara(item)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                          >
                            Berita Acara
                          </button>
                          {isBendahara && onDeleteAudit && allAudits.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Hapus catatan audit tanggal ${formatDateTimeIndonesian(item.tanggalAudit)} (${item.id})?`)) {
                                  onDeleteAudit(item.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                              title="Hapus riwayat audit ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold text-[11px]">
                      <th className="py-2.5 px-3 rounded-tl-xl w-12 text-center">No</th>
                      <th className="py-2.5 px-3 w-44">Tanggal &amp; Waktu Audit</th>
                      <th className="py-2.5 px-3 w-28">ID Audit</th>
                      <th className="py-2.5 px-3 text-right">Kas Fisik (Tunai)</th>
                      <th className="py-2.5 px-3 text-right">Rekening Bank</th>
                      <th className="py-2.5 px-3 text-right">Total Uang Real</th>
                      <th className="py-2.5 px-3 text-center">Status Audit</th>
                      <th className="py-2.5 px-3">Pemeriksa / Bendahara</th>
                      <th className="py-2.5 px-3 rounded-tr-xl text-center w-52">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allAudits.map((item, idx) => {
                      const totalReal = (Number(item.saldoCash) || 0) + (Number(item.saldoBank) || 0);
                      const sel = totalReal - saldoData;
                      const isMatch = Math.abs(sel) === 0;
                      const isActive = item.id === editingAuditId;

                      return (
                        <tr 
                          key={`audit-row-${item.id || idx}`}
                          className={`transition-colors ${
                            isActive 
                              ? 'bg-teal-50/70 font-semibold text-slate-900' 
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                              <Clock className="w-3.5 h-3.5 text-teal-600" />
                              <span>{formatDateTimeIndonesian(item.tanggalAudit)}</span>
                            </div>
                            {isActive && (
                              <span className="text-[10px] text-teal-700 font-bold block mt-0.5">
                                • Sedang Ditampilkan di Form
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-600 text-xs">
                            {item.id}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                            {formatRupiah(item.saldoCash)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                            {formatRupiah(item.saldoBank)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-teal-800">
                            {formatRupiah(totalReal)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center space-x-1 ${
                              isMatch 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                : sel > 0 
                                ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {isMatch ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertTriangle className="w-3 h-3 text-amber-600" />}
                              <span>{isMatch ? 'BALANCE' : sel > 0 ? `+${formatRupiah(sel)}` : `-${formatRupiah(Math.abs(sel))}`}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800 text-xs">{item.diauditOleh || item.namaBendahara || 'Bendahara'}</div>
                            {item.catatanAudit && (
                              <div className="text-[10px] text-slate-400 italic line-clamp-1 max-w-[200px]">
                                "{item.catatanAudit}"
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => loadAuditForEditing(item)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                  isActive
                                    ? 'bg-teal-700 text-white'
                                    : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                                }`}
                                title="Pilih dan muat data audit ini ke formulir"
                              >
                                {isActive ? 'Dipilih' : 'Muat Form'}
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenBeritaAcara(item)}
                                className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center space-x-1"
                                title="Cetak Berita Acara Audit tanggal ini"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Cetak</span>
                              </button>
                              {isBendahara && onDeleteAudit && allAudits.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Hapus catatan audit tanggal ${formatDateTimeIndonesian(item.tanggalAudit)} (${item.id})?`)) {
                                      onDeleteAudit(item.id);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                                  title="Hapus riwayat audit ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
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
      </div>

      {/* Formulir Audit & Pemeriksaan Fisik (Bendahara & Admin) */}
      <div id="form-audit-rekonsiliasi" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-5 sm:px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-teal-700" />
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="font-black text-sm text-slate-800">
                  Formulir Hasil Cek Fisik Kas Tunai &amp; Rekening Bank
                </h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  isNewAuditMode 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                }`}>
                  {isNewAuditMode ? '➕ Mode: Catat Audit Baru' : `✏️ ID: ${editingAuditId}`}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Input hasil penghitungan fisik uang cash di brankas dan saldo mutasi rekening bank
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isBendahara && (
              <button
                type="button"
                onClick={handleAutoBalance}
                title="Sesuaikan otomatis nilai kas & bank dari saldo pembukuan sistem"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Auto-Sesuaikan Saldo Data</span>
              </button>
            )}

            {isBendahara && !isNewAuditMode && (
              <button
                type="button"
                onClick={startNewAudit}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                title="Mulai input audit baru untuk tanggal lain"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Audit Baru</span>
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="p-5 sm:p-7 space-y-6">
          
          {/* Bagian 1 & 2: 2 Kolom Uang Cash & Uang Rekening */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Kolom 1: Uang Kas Tunai (Cash) */}
            <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-200">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                      1. Uang Kas Tunai (Cash)
                    </h4>
                    <p className="text-[11px] text-slate-500">Fisik uang kertas & koin di brankas bendahara</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
                  className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    isCalculatorOpen
                      ? 'bg-amber-600 text-white border-amber-700'
                      : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{isCalculatorOpen ? 'Tutup Hitung Fisik' : 'Hitung Lembaran'}</span>
                </button>
              </div>

              {/* Input Saldo Cash Langsung */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Jumlah Nominal Uang Cash (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    disabled={!isBendahara}
                    value={saldoCash === 0 ? '' : saldoCash}
                    onChange={(e) => setSaldoCash(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2 bg-white border border-amber-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Terbilang: <strong>{formatRupiah(saldoCash)}</strong>
                </p>
              </div>

              {/* Kalkulator Pecahan Uang Fisik Lembaran */}
              {isCalculatorOpen && (
                <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                      <Calculator className="w-3.5 h-3.5 text-amber-600" />
                      <span>Rincian Penghitungan Fisik Lembar Uang:</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-700">
                      Total: {formatRupiah(totalHitungFisikCash)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Rp 100.000</label>
                      <input
                        type="number"
                        min="0"
                        value={pecahan.pecahan100k || ''}
                        onChange={(e) => setPecahan({ ...pecahan, pecahan100k: Number(e.target.value) || 0 })}
                        placeholder="0 lbr"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Rp 50.000</label>
                      <input
                        type="number"
                        min="0"
                        value={pecahan.pecahan50k || ''}
                        onChange={(e) => setPecahan({ ...pecahan, pecahan50k: Number(e.target.value) || 0 })}
                        placeholder="0 lbr"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Rp 20.000</label>
                      <input
                        type="number"
                        min="0"
                        value={pecahan.pecahan20k || ''}
                        onChange={(e) => setPecahan({ ...pecahan, pecahan20k: Number(e.target.value) || 0 })}
                        placeholder="0 lbr"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Rp 10.000</label>
                      <input
                        type="number"
                        min="0"
                        value={pecahan.pecahan10k || ''}
                        onChange={(e) => setPecahan({ ...pecahan, pecahan10k: Number(e.target.value) || 0 })}
                        placeholder="0 lbr"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Rp 5.000</label>
                      <input
                        type="number"
                        min="0"
                        value={pecahan.pecahan5k || ''}
                        onChange={(e) => setPecahan({ ...pecahan, pecahan5k: Number(e.target.value) || 0 })}
                        placeholder="0 lbr"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Rp 2.000</label>
                      <input
                        type="number"
                        min="0"
                        value={pecahan.pecahan2k || ''}
                        onChange={(e) => setPecahan({ ...pecahan, pecahan2k: Number(e.target.value) || 0 })}
                        placeholder="0 lbr"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Rp 1.000</label>
                      <input
                        type="number"
                        min="0"
                        value={pecahan.pecahan1k || ''}
                        onChange={(e) => setPecahan({ ...pecahan, pecahan1k: Number(e.target.value) || 0 })}
                        placeholder="0 lbr"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Koin (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        value={pecahan.koin || ''}
                        onChange={(e) => setPecahan({ ...pecahan, koin: Number(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-center"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">
                      Klik terapkan untuk memperbarui nilai uang cash di atas
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyCalculator}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Terapkan ({formatRupiah(totalHitungFisikCash)})
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Kolom 2: Uang di Rekening Bank */}
            <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-indigo-200">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    2. Uang di Rekening Bank
                  </h4>
                  <p className="text-[11px] text-slate-500">Saldo rekening koran / mutasi m-banking MKKS</p>
                </div>
              </div>

              {/* Nama Bank & Nomor Rekening */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Bank</label>
                  <input
                    type="text"
                    disabled={!isBendahara}
                    value={namaBank}
                    onChange={(e) => setNamaBank(e.target.value)}
                    placeholder="Contoh: Bank DKI"
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    disabled={!isBendahara}
                    value={nomorRekening}
                    onChange={(e) => setNomorRekening(e.target.value)}
                    placeholder="Contoh: 102.23.09876.1"
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* Atas Nama Rekening */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Atas Nama Rekening</label>
                <input
                  type="text"
                  disabled={!isBendahara}
                  value={atasNamaRekening}
                  onChange={(e) => setAtasNamaRekening(e.target.value)}
                  placeholder="Contoh: MKKS SMP Cilandak"
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                />
              </div>

              {/* Saldo Rekening Bank */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Saldo Akhir di Rekening Bank (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    disabled={!isBendahara}
                    value={saldoBank === 0 ? '' : saldoBank}
                    onChange={(e) => setSaldoBank(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2 bg-white border border-indigo-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Terbilang: <strong>{formatRupiah(saldoBank)}</strong>
                </p>
              </div>

            </div>

          </div>

          {/* Bagian 3: Tanggal Pemeriksaan & Catatan Hasil Temuan Audit */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Waktu & Tanggal Audit / Kas Opname
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const nowWib = getCurrentWIBDateTimeString();
                      setTanggalAudit(nowWib);
                      setOtomatisWaktuSekarang(true);
                    }}
                    className="inline-flex items-center space-x-1 text-[10px] text-teal-700 hover:text-teal-900 font-semibold bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Perbarui langsung ke tanggal dan jam saat ini"
                  >
                    <Clock className="w-3 h-3 text-teal-600" />
                    <span>Waktu Sekarang</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!isBendahara}
                    value={tanggalAudit}
                    onChange={(e) => {
                      setTanggalAudit(e.target.value);
                      setOtomatisWaktuSekarang(false);
                    }}
                    placeholder="YYYY-MM-DD HH:mm"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5">
                  <p className="text-[11px] text-teal-700 font-semibold">
                    Format Laporan: <strong>{formatDateTimeIndonesian(tanggalAudit)}</strong>
                  </p>
                  <label className="inline-flex items-center space-x-1.5 text-[11px] text-slate-600 font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={otomatisWaktuSekarang}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setOtomatisWaktuSekarang(checked);
                        if (checked) {
                          setTanggalAudit(getCurrentWIBDateTimeString());
                        }
                      }}
                      className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                    />
                    <span>Otomatis ikuti tanggal & jam sekarang</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Petugas Pemeriksa Utama (Bendahara)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={namaPemeriksaLogin}
                    className="w-full pl-9 pr-3 py-2 bg-slate-100/90 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-not-allowed select-all focus:outline-none"
                  />
                  <ShieldCheck className="w-4 h-4 text-teal-600 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Temuan / Berita Acara Audit Kas
              </label>
              <textarea
                rows={2}
                disabled={!isBendahara}
                value={catatanAudit}
                onChange={(e) => setCatatanAudit(e.target.value)}
                placeholder="Tuliskan catatan pemeriksaan kas, misal: 'Uang fisik brankas telah dihitung lengkap dan saldo rekening bank sesuai bukti mutasi m-banking per September 2026.'"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Bagian 4: Pengaturan Nama & Tanda Tangan Pejabat (Ketua MKKS & Bendahara) */}
          <div className="bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-50 rounded-2xl p-4 sm:p-5 border border-teal-200/70 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-teal-100">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Pejabat Penandatangan Laporan & Berita Acara
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-teal-700 font-semibold bg-teal-100/70 px-2 py-0.5 rounded-md w-fit">
                  Dapat Diketik Manual • Sesuai SK Asli
                </span>
                <button
                  type="button"
                  onClick={() => {
                    StorageService.savePejabat({
                      namaKetuaMkks,
                      nipKetuaMkks,
                      jabatanKetuaMkks,
                      namaBendahara,
                      nipBendahara,
                      jabatanBendahara
                    });
                    setToastSave(true);
                    setTimeout(() => setToastSave(false), 3000);
                  }}
                  className="inline-flex items-center space-x-1 px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors cursor-pointer"
                  title="Simpan perubahan nama Ketua MKKS dan Bendahara"
                >
                  <Save className="w-3 h-3" />
                  <span>Simpan Pejabat</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Kolom Kiri: Ketua MKKS */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    <span>1. Ketua MKKS (Mengetahui)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Posisi Kiri</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Nama Lengkap & Gelar Ketua <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSyncKetuaFromSheet}
                      disabled={isSyncingKetua}
                      className="inline-flex items-center space-x-1 text-[10px] text-teal-800 font-bold bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-300 transition-all cursor-pointer shadow-2xs"
                      title="Sinkronkan & deteksi ulang akun Role 'Ketua' langsung dari Sheet User Google Spreadsheet"
                    >
                      <RefreshCw className={`w-3 h-3 text-teal-600 ${isSyncingKetua ? 'animate-spin' : ''}`} />
                      <span>{isSyncingKetua ? 'Menyinkronkan...' : 'Deteksi Ketua'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={namaKetuaMkks}
                    onChange={(e) => setNamaKetuaMkks(e.target.value)}
                    placeholder="Nama Lengkap & Gelar Ketua MKKS"
                    className="w-full px-3 py-1.5 bg-teal-50/20 border border-teal-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      NIP Ketua MKKS
                    </label>
                    <input
                      type="text"
                      value={nipKetuaMkks}
                      onChange={(e) => setNipKetuaMkks(e.target.value)}
                      placeholder="196805121994121001"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Jabatan di Naskah
                    </label>
                    <input
                      type="text"
                      value={jabatanKetuaMkks}
                      onChange={(e) => setJabatanKetuaMkks(e.target.value)}
                      placeholder="Ketua MKKS SMP Cimanggis & Tapos"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Bendahara MKKS */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>2. Bendahara MKKS (Pemeriksa)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Posisi Kanan</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block text-[11px] font-semibold text-slate-700">
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
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      NIP Bendahara (Opsional)
                    </label>
                    <input
                      type="text"
                      value={nipBendahara}
                      onChange={(e) => setNipBendahara(e.target.value)}
                      placeholder="NIP atau kosongkan (-)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Jabatan di Naskah
                    </label>
                    <input
                      type="text"
                      value={jabatanBendahara}
                      onChange={(e) => setJabatanBendahara(e.target.value)}
                      placeholder="Bendahara MKKS SMP Citos"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Simpan & Cetak */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                Status Audit Saat Ini: <strong className={isBalance ? 'text-emerald-700' : 'text-rose-700'}>
                  {isBalance ? 'SEIMBANG / MATCH' : isLebih ? 'SELISIH LEBIH' : 'SELISIH KURANG'}
                </strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleOpenBeritaAcaraWithSync}
                className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Lihat Berita Acara</span>
              </button>

              {isBendahara && !isNewAuditMode && (
                <button
                  type="button"
                  onClick={handleSaveAsNew}
                  className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  title="Simpan input ini sebagai catatan audit baru di riwayat histori tanpa menimpa data sebelumnya"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Simpan Sebagai Histori Baru</span>
                </button>
              )}

              {isBendahara && (
                <button
                  type="submit"
                  className="inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  title={isNewAuditMode ? "Simpan hasil audit baru ke riwayat histori" : `Perbarui hasil audit untuk ${editingAuditId}`}
                >
                  <Save className="w-4 h-4" />
                  <span>{isNewAuditMode ? 'Simpan Audit Baru' : `Perbarui Audit (${editingAuditId})`}</span>
                </button>
              )}
            </div>
          </div>

        </form>
      </div>

      {/* Info Panduan SOP Audit Keuangan */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 space-y-2">
        <h4 className="font-bold text-slate-800 flex items-center space-x-1.5">
          <HelpCircle className="w-4 h-4 text-teal-600" />
          <span>Panduan Standar Audit Kas Organisasi (Kas Opname & Rekonsiliasi Bank)</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <strong className="text-slate-800 block mb-1">1. Cek Saldo Pembukuan</strong>
            Lihat saldo akhir kas pada sistem di menu Laporan Keuangan (Penerimaan Iuran & Non-Iuran dikurangi Pengeluaran).
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <strong className="text-slate-800 block mb-1">2. Hitung Fisik Kas & Bank</strong>
            Lakukan hitung fisik uang tunai di brankas (gunakan fitur Hitung Lembaran) dan cetak mutasi rekening bank terbaru.
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <strong className="text-slate-800 block mb-1">3. Rekonsiliasi Selisih</strong>
            Pastikan status tercatat <strong>BALANCE</strong>. Bila timbul selisih, telusuri nota belanja atau iuran yang belum dicatat sebelum mencetak Berita Acara.
          </div>
        </div>
      </div>

    </div>
  );
};
