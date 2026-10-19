import React, { useState, useEffect } from 'react';
import { User, Sekolah, Iuran, Pengeluaran, PemasukanLain, RiwayatHapus, RekonsiliasiKas, Pengecualian } from './types';
import { StorageService } from './services/spreadsheetSync';
import { Navbar } from './components/Navbar';
import { Navigation, ActiveTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { InputIuran } from './components/InputIuran';
import { InputPemasukanLain } from './components/InputPemasukanLain';
import { KelolaPengeluaran } from './components/KelolaPengeluaran';
import { MenuPengecualian } from './components/Pengecualian';
import { LaporanKeuangan } from './components/LaporanKeuangan';
import { PenagihanIuran } from './components/PenagihanIuran';
import { StrukModal } from './components/StrukModal';
import { SpreadsheetModal } from './components/SpreadsheetModal';
import { LoginModal } from './components/LoginModal';
import { ModalHapusData, DataHapusTarget } from './components/ModalHapusData';
import { ValidasiKuitansiModal, ValidasiData } from './components/ValidasiKuitansiModal';
import { InstallAppTab } from './components/InstallAppTab';
import { PWAInstallFloatingBanner } from './components/PWAInstallButton';
import { CheckCircle2, ShieldAlert, Lock, UserCheck, MessageCircle, Mail, ExternalLink, X } from 'lucide-react';
import { getMergedIuranReceipt } from './utils/formatters';

export default function App() {
  // Application state
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  const [sekolahList, setSekolahList] = useState<Sekolah[]>(() => StorageService.getSekolah());
  const [usersList, setUsersList] = useState<User[]>(() => StorageService.getUsers());
  const [iuranList, setIuranList] = useState<Iuran[]>(() => StorageService.getIuran());
  const [pengeluaranList, setPengeluaranList] = useState<Pengeluaran[]>(() => StorageService.getPengeluaran());
  const [pemasukanLainList, setPemasukanLainList] = useState<PemasukanLain[]>(() => StorageService.getPemasukanLain());
  const [pengecualianList, setPengecualianList] = useState<Pengecualian[]>(() => StorageService.getPengecualian());
  const [riwayatHapusList, setRiwayatHapusList] = useState<RiwayatHapus[]>(() => StorageService.getRiwayatHapus());
  const [rekonsiliasiKasList, setRekonsiliasiKasList] = useState<RekonsiliasiKas[]>(() => StorageService.getRekonsiliasiKas());
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => StorageService.getSpreadsheetId());

  // Modals state
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState<boolean>(false);
  const [spreadsheetModalTab, setSpreadsheetModalTab] = useState<'database' | 'install'>('database');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => StorageService.getCurrentUser() === null);
  const [isStrukModalOpen, setIsStrukModalOpen] = useState<boolean>(false);
  const [strukData, setStrukData] = useState<any>(null);

  const handleOpenSpreadsheetModal = (initialTab: 'database' | 'install' = 'database') => {
    setSpreadsheetModalTab(initialTab);
    setIsSpreadsheetModalOpen(true);
  };

  // Modal Hapus Data State
  const [isHapusModalOpen, setIsHapusModalOpen] = useState<boolean>(false);
  const [targetHapusData, setTargetHapusData] = useState<DataHapusTarget | null>(null);

  // Digital Validation Modal state (for Barcode / QR Code scan)
  const [isValidasiModalOpen, setIsValidasiModalOpen] = useState<boolean>(false);
  const [validasiData, setValidasiData] = useState<ValidasiData | null>(null);

  const [selectedSchoolForIuran, setSelectedSchoolForIuran] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDevContactOpen, setIsDevContactOpen] = useState<boolean>(false);

  // Sync background fetch on load & check URL for scanned QR code verification
  useEffect(() => {
    // Re-verify normalized local storage data on mount
    setSekolahList(StorageService.getSekolah());
    setUsersList(StorageService.getUsers());
    setIuranList(StorageService.getIuran());
    setPengeluaranList(StorageService.getPengeluaran());
    setPemasukanLainList(StorageService.getPemasukanLain());
    setPengecualianList(StorageService.getPengecualian());
    setRiwayatHapusList(StorageService.getRiwayatHapus());
    setRekonsiliasiKasList(StorageService.getRekonsiliasiKas());

    StorageService.fetchFromAppsScript().then((success) => {
      if (success) {
        setSekolahList(StorageService.getSekolah());
        setUsersList(StorageService.getUsers());
        setIuranList(StorageService.getIuran());
        setPengeluaranList(StorageService.getPengeluaran());
        setPemasukanLainList(StorageService.getPemasukanLain());
        setPengecualianList(StorageService.getPengecualian());
        setRiwayatHapusList(StorageService.getRiwayatHapus());
        setRekonsiliasiKasList(StorageService.getRekonsiliasiKas());
      }
    });

    // Check if user arrived via scanned QR Code or Barcode verification URL (?verify=...)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const verifyNo = urlParams.get('verify') || urlParams.get('kuitansi');
      if (verifyNo) {
        const sekolahParam = urlParams.get('sekolah') || 'Sekolah Anggota MKKS';
        const bulanParam = urlParams.get('bulan') ? urlParams.get('bulan')!.split(',') : ['Januari'];
        const tahunParam = Number(urlParams.get('tahun')) || new Date().getFullYear();
        const nominalParam = Number(urlParams.get('nominal')) || 100000;
        const tglParam = urlParams.get('tgl') || new Date().toISOString().split('T')[0];
        const petugasParam = urlParams.get('petugas') || 'Bendahara MKKS Citos';
        const ketParam = urlParams.get('ket') || '';

        setValidasiData({
          noKuitansi: verifyNo,
          namaSekolah: sekolahParam,
          tahunBuku: tahunParam,
          bulanList: bulanParam,
          totalNominal: nominalParam,
          tanggal: tglParam,
          diinputOleh: petugasParam,
          keterangan: ketParam
        });
        setIsValidasiModalOpen(true);
      }
    } catch (e) {
      console.error('Error parsing QR validation URL parameter', e);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Save new Iuran items
  const handleSaveIuran = async (newItems: Omit<Iuran, 'id'>[]) => {
    if (isKetua) {
      showToast('Aksi Input ditutup: Role Ketua hanya memiliki hak akses Lihat (View Only).');
      return;
    }
    const created: Iuran[] = newItems.map((item, idx) => ({
      ...item,
      id: `IUR-${Date.now()}-${idx}`
    }));

    const updated = [...iuranList, ...created];
    setIuranList(updated);
    StorageService.saveIuran(updated);

    const syncRes = await StorageService.syncToAppsScript();
    if (syncRes.status === 'connected') {
      showToast(`Berhasil menyimpan ${newItems.length} bulan iuran ke Database Google Sheet!`);
    } else {
      showToast(`Tersimpan lokal (${newItems.length} bulan). ${syncRes.message}`);
    }
  };

  // Save new Pemasukan Lain item
  const handleSavePemasukanLain = async (newIncome: Omit<PemasukanLain, 'id'>) => {
    if (isKetua) {
      showToast('Aksi Input ditutup: Role Ketua hanya memiliki hak akses Lihat (View Only).');
      return;
    }
    const created: PemasukanLain = {
      ...newIncome,
      id: `INC-${Date.now()}`
    };

    const updated = [created, ...pemasukanLainList];
    setPemasukanLainList(updated);
    StorageService.savePemasukanLain(updated);

    const syncRes = await StorageService.syncToAppsScript();
    if (syncRes.status === 'connected') {
      showToast('Berhasil mencatat pemasukan non-iuran ke Database Google Sheet!');
    } else {
      showToast(`Tersimpan lokal. ${syncRes.message}`);
    }
  };

  // Save new Pengeluaran item
  const handleSavePengeluaran = async (newExpense: Omit<Pengeluaran, 'id'>) => {
    if (isKetua) {
      showToast('Aksi Input ditutup: Role Ketua hanya memiliki hak akses Lihat (View Only).');
      return;
    }
    const created: Pengeluaran = {
      ...newExpense,
      id: `OUT-${Date.now()}`
    };

    const updated = [created, ...pengeluaranList];
    setPengeluaranList(updated);
    StorageService.savePengeluaran(updated);

    const syncRes = await StorageService.syncToAppsScript();
    if (syncRes.status === 'connected') {
      showToast('Berhasil mencatat pengeluaran ke Database Google Sheet!');
    } else {
      showToast(`Tersimpan lokal. ${syncRes.message}`);
    }
  };

  // Triggers for Deletion from Laporan Keuangan
  const handleRequestDeleteIuran = (item: Iuran) => {
    if (isKetua) {
      showToast('Aksi Delete ditutup: Role Ketua hanya memiliki hak akses Lihat (View Only).');
      return;
    }
    setTargetHapusData({
      id: item.id,
      jenis: 'Iuran',
      title: `Iuran ${item.namaSekolah} (${item.bulan} ${item.tahun})`,
      subtitle: item.keterangan ? `${item.keterangan} (Tahun ${item.tahun})` : `Tahun Buku ${item.tahun}`,
      nominal: item.nominal,
      tanggal: item.tanggalInput,
      noKuitansi: item.noKuitansi,
      diinputOleh: item.diinputOleh,
      rawData: item
    });
    setIsHapusModalOpen(true);
  };

  const handleRequestDeletePemasukanLain = (item: PemasukanLain) => {
    if (isKetua) {
      showToast('Aksi Delete ditutup: Role Ketua hanya memiliki hak akses Lihat (View Only).');
      return;
    }
    setTargetHapusData({
      id: item.id,
      jenis: 'Pemasukan Lain',
      title: `${item.kategori} - ${item.sumberDana}`,
      subtitle: item.keterangan || `Pemasukan Non-Iuran`,
      nominal: item.nominal,
      tanggal: item.tanggal,
      noKuitansi: item.noKuitansi,
      diinputOleh: item.diinputOleh,
      rawData: item
    });
    setIsHapusModalOpen(true);
  };

  const handleRequestDeletePengeluaran = (item: Pengeluaran) => {
    if (isKetua) {
      showToast('Aksi Delete ditutup: Role Ketua hanya memiliki hak akses Lihat (View Only).');
      return;
    }
    setTargetHapusData({
      id: item.id,
      jenis: 'Pengeluaran',
      title: item.project,
      subtitle: item.keterangan || 'Pengeluaran Operasional MKKS',
      nominal: item.nominal,
      tanggal: item.tanggal,
      diinputOleh: item.diinputOleh,
      rawData: item
    });
    setIsHapusModalOpen(true);
  };

  // Confirm Delete Handler with Audit Logging
  const handleConfirmDelete = async (
    target: DataHapusTarget,
    alasan: string,
    namaPetugas: string,
    roleUser: string
  ) => {
    if (isKetua) {
      showToast('Aksi Delete ditutup: Role Ketua hanya memiliki hak akses Lihat (View Only).');
      return;
    }
    const newRiwayat: RiwayatHapus = {
      id: `DEL-${Date.now()}`,
      idTransaksi: target.id,
      jenisTransaksi: target.jenis,
      rincianData: target.title,
      nominal: target.nominal,
      tanggalHapus: new Date().toISOString(),
      dihapusOleh: namaPetugas,
      roleUser: roleUser,
      alasanHapus: alasan,
      noKuitansi: target.noKuitansi,
      tanggalTransaksiAsli: target.tanggal,
      dataOriginal: target.rawData,
      judul: target.title,
      judulItem: target.title,
      alasan: alasan,
      role: roleUser,
      rolePenghapus: roleUser,
      jenis: target.jenis === 'Iuran' ? 'iuran' : target.jenis === 'Pengeluaran' ? 'pengeluaran' : 'pemasukan-lain'
    };

    if (target.jenis === 'Iuran') {
      const updated = iuranList.filter(i => i.id !== target.id);
      setIuranList(updated);
      StorageService.saveIuran(updated, false);
    } else if (target.jenis === 'Pemasukan Lain') {
      const updated = pemasukanLainList.filter(p => p.id !== target.id);
      setPemasukanLainList(updated);
      StorageService.savePemasukanLain(updated, false);
    } else if (target.jenis === 'Pengeluaran') {
      const updated = pengeluaranList.filter(p => p.id !== target.id);
      setPengeluaranList(updated);
      StorageService.savePengeluaran(updated, false);
    }

    const updatedRiwayat = [newRiwayat, ...riwayatHapusList];
    setRiwayatHapusList(updatedRiwayat);
    StorageService.saveRiwayatHapus(updatedRiwayat, true);

    showToast(`Data ${target.jenis} berhasil dihapus & dicatat di Riwayat Hapus.`);
  };

  // Open Struk Modal (with automatic multi-month receipt bundling)
  const handleOpenStrukModal = (kuitansiData: any) => {
    const mergedData = getMergedIuranReceipt(kuitansiData, iuranList, sekolahList);
    setStrukData(mergedData);
    setIsStrukModalOpen(true);
  };

  // Open Validasi Modal
  const handleOpenValidasiModal = (data: any) => {
    setValidasiData(data);
    setIsValidasiModalOpen(true);
  };

  // Switch Logged-in User
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    StorageService.setCurrentUser(user);
    setIsLoginModalOpen(false);
    showToast(`Login sebagai ${user.sekolah} (${user.role})`);

    // Reset tab if user is Sekolah role and on Bendahara-only tab
    if (user.role === 'Sekolah' && (activeTab === 'input-iuran' || activeTab === 'pemasukan-lain' || activeTab === 'kelola-pengeluaran' || activeTab === 'penagihan' || activeTab === 'pengecualian')) {
      setActiveTab('dashboard');
    }
  };

  // Update Kontak Sekolah
  const handleUpdateSekolahKontak = (idSekolah: string, newKontak: string) => {
    const updated = StorageService.updateSekolahKontak(idSekolah, newKontak);
    setSekolahList(updated);
    showToast('Nomor WhatsApp sekolah berhasil diperbarui.');
  };

  // Update Spreadsheet Config
  const handleUpdateSpreadsheetConfig = (newId: string, newScriptUrl: string) => {
    setSpreadsheetId(newId);
    StorageService.setSpreadsheetId(newId);
    StorageService.setAppsScriptUrl(newScriptUrl);
    showToast('Konfigurasi Google Spreadsheet berhasil diperbarui!');
  };

  // Reset Data to Default Seed
  const handleResetToDefaultData = () => {
    StorageService.resetToDefault();
    setSekolahList(StorageService.getSekolah());
    setUsersList(StorageService.getUsers());
    setIuranList(StorageService.getIuran());
    setPengeluaranList(StorageService.getPengeluaran());
    setPemasukanLainList(StorageService.getPemasukanLain());
    setPengecualianList(StorageService.getPengecualian());
    setRiwayatHapusList(StorageService.getRiwayatHapus());
    setRekonsiliasiKasList(StorageService.getRekonsiliasiKas());
    setCurrentUser(StorageService.getCurrentUser());
    showToast('Data aplikasi di-reset ke data default awal.');
  };

  // Pengecualian & Potongan Kebijakan Manajemen Handlers
  const handleSavePengecualian = async (newItem: Omit<Pengecualian, 'id'>) => {
    if (isKetua) {
      showToast('Aksi Input ditutup: Role Ketua hanya memiliki hak akses Lihat (View Only).');
      return;
    }
    const newRecord: Pengecualian = {
      ...newItem,
      id: `PENG-${newItem.tahun}-${Date.now().toString(36).toUpperCase()}`
    };
    const updated = StorageService.addPengecualian(newRecord);
    setPengecualianList(updated);
    
    const syncRes = await StorageService.syncToAppsScript();
    if (syncRes.status === 'connected') {
      showToast(`Pengecualian ${newItem.diskonPersen}% untuk ${newItem.namaSekolah} berhasil disimpan & disinkronkan ke Google Sheets!`);
    } else {
      showToast(`Pengecualian ${newItem.diskonPersen}% tersimpan lokal di browser. Hubungkan Google Apps Script untuk sinkronisasi otomatis.`);
    }
  };

  const handleUpdatePengecualian = async (updatedItem: Pengecualian) => {
    if (isKetua) {
      showToast('Aksi Edit ditutup: Role Ketua hanya memiliki hak akses Lihat (View Only).');
      return;
    }
    const updated = StorageService.addPengecualian(updatedItem);
    setPengecualianList(updated);
    
    const syncRes = await StorageService.syncToAppsScript();
    if (syncRes.status === 'connected') {
      showToast(`Data pengecualian ${updatedItem.namaSekolah} diperbarui & disinkronkan ke Google Sheets!`);
    } else {
      showToast(`Data pengecualian diperbarui di lokal browser.`);
    }
  };

  const handleDeletePengecualian = async (id: string) => {
    if (isKetua) {
      showToast('Aksi Hapus ditutup: Role Ketua hanya memiliki hak akses Lihat (View Only).');
      return;
    }
    const updated = StorageService.deletePengecualian(id);
    setPengecualianList(updated);
    
    const syncRes = await StorageService.syncToAppsScript();
    if (syncRes.status === 'connected') {
      showToast('Data pengecualian berhasil dihapus & disinkronkan ke Google Sheets.');
    } else {
      showToast('Data pengecualian berhasil dihapus dari browser lokal.');
    }
  };

  // Save Audit Rekonsiliasi Kas
  const handleSaveRekonsiliasiKas = async (record: RekonsiliasiKas) => {
    if (isKetua) {
      showToast('Aksi Input/Audit ditutup: Role Ketua hanya memiliki hak akses Lihat (View Only).');
      return;
    }
    const updated = StorageService.saveSingleRekonsiliasi(record);
    setRekonsiliasiKasList(updated);
    
    const syncRes = await StorageService.syncToAppsScript();
    if (syncRes.status === 'connected') {
      showToast(`Hasil audit fisik & rekonsiliasi kas tahun ${record.tahun} berhasil disimpan & disinkronkan ke Google Sheet (Sheet: Rekonsiliasi_Kas)!`);
    } else {
      showToast(`Hasil audit fisik & rekonsiliasi kas tahun ${record.tahun} berhasil disimpan lokal.`);
    }
  };

  const isAdmin = currentUser ? (
    currentUser.role === 'Admin' ||
    currentUser.role?.toLowerCase() === 'admin' ||
    currentUser.username?.toLowerCase() === 'admin' ||
    currentUser.username?.toLowerCase().includes('admin')
  ) : false;

  const isKetua = currentUser ? (
    currentUser.role === 'Ketua' ||
    currentUser.role?.toLowerCase() === 'ketua'
  ) : false;

  const isBendahara = currentUser?.role === 'Bendahara' || isAdmin;
  const canAccessBendaharaMenu = isBendahara && !isKetua;

  // Auto redirect Ketua to dashboard if currently on closed tabs
  useEffect(() => {
    if (isKetua && (activeTab === 'input-iuran' || activeTab === 'pemasukan-lain' || activeTab === 'kelola-pengeluaran' || activeTab === 'penagihan')) {
      setActiveTab('dashboard');
    }
  }, [isKetua, activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-between selection:bg-teal-500 selection:text-white w-full max-w-full overflow-x-hidden">
      
      <div>
        {/* Top Header Navbar */}
        <Navbar
          currentUser={currentUser}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={() => {
            setCurrentUser(null);
            StorageService.setCurrentUser(null);
            setIsLoginModalOpen(true);
          }}
        />

        {/* Navigation Bar */}
        <Navigation
          role={currentUser?.role || 'Bendahara'}
          activeTab={activeTab}
          onChangeTab={(tab) => setActiveTab(tab)}
          onOpenSpreadsheetModal={handleOpenSpreadsheetModal}
        />

        {/* Notification Toast */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-teal-500/40 flex items-center space-x-2 animate-in slide-in-from-bottom duration-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Main Content Area */}
        <main className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 pt-6 pb-4">
          {!currentUser ? (
            <div className="bg-white rounded-2xl p-10 sm:p-16 text-center border border-slate-200 shadow-sm max-w-xl mx-auto my-12 space-y-4">
              <div className="p-4 bg-teal-50 text-teal-700 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-800">Akses Terkunci</h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Untuk melihat isi website Laporan Keuangan & Iuran MKKS Citos ini, Anda wajib untuk login terlebih dahulu.
              </p>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="mt-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 mx-auto cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Masuk Akun Sekarang</span>
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard
                  currentUser={currentUser}
                  sekolahList={sekolahList}
                  usersList={usersList}
                  iuranList={iuranList}
                  pengeluaranList={pengeluaranList}
                  pemasukanLainList={pemasukanLainList}
                  pengecualianList={pengecualianList}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                  onSelectSchoolForIuran={(namaSekolah) => setSelectedSchoolForIuran(namaSekolah)}
                  onOpenStrukModal={handleOpenStrukModal}
                />
              )}

              {activeTab === 'input-iuran' && canAccessBendaharaMenu && (
                <InputIuran
                  sekolahList={sekolahList}
                  iuranList={iuranList}
                  onSaveIuran={handleSaveIuran}
                  onOpenStrukModal={handleOpenStrukModal}
                  selectedSchoolNameFromDashboard={selectedSchoolForIuran}
                  currentUser={currentUser}
                  readOnly={isKetua}
                />
              )}

              {activeTab === 'pemasukan-lain' && canAccessBendaharaMenu && (
                <InputPemasukanLain
                  pemasukanLainList={pemasukanLainList}
                  onSavePemasukanLain={handleSavePemasukanLain}
                  onOpenStrukModal={handleOpenStrukModal}
                  currentUser={currentUser}
                  readOnly={isKetua}
                />
              )}

              {activeTab === 'kelola-pengeluaran' && canAccessBendaharaMenu && (
                <KelolaPengeluaran
                  pengeluaranList={pengeluaranList}
                  onSavePengeluaran={handleSavePengeluaran}
                  currentUser={currentUser}
                  readOnly={isKetua}
                />
              )}

              {activeTab === 'pengecualian' && (canAccessBendaharaMenu || isKetua) && (
                <MenuPengecualian
                  sekolahList={sekolahList}
                  pengecualianList={pengecualianList}
                  onSavePengecualian={handleSavePengecualian}
                  onUpdatePengecualian={handleUpdatePengecualian}
                  onDeletePengecualian={handleDeletePengecualian}
                  currentUser={currentUser}
                  readOnly={isKetua}
                />
              )}

              {activeTab === 'penagihan' && canAccessBendaharaMenu && (
                <PenagihanIuran
                  sekolahList={sekolahList}
                  iuranList={iuranList}
                  currentUser={currentUser}
                  usersList={usersList}
                  rekonsiliasiKasList={rekonsiliasiKasList}
                  onUpdateSekolahKontak={handleUpdateSekolahKontak}
                  onNavigateToInputIuran={(namaSekolah) => {
                    setSelectedSchoolForIuran(namaSekolah);
                    setActiveTab('input-iuran');
                  }}
                />
              )}

              {activeTab === 'laporan-keuangan' && (
                <LaporanKeuangan
                  sekolahList={sekolahList}
                  usersList={usersList}
                  iuranList={iuranList}
                  pengeluaranList={pengeluaranList}
                  pemasukanLainList={pemasukanLainList}
                  pengecualianList={pengecualianList}
                  riwayatHapusList={riwayatHapusList}
                  rekonsiliasiKasList={rekonsiliasiKasList}
                  onSaveRekonsiliasiKas={handleSaveRekonsiliasiKas}
                  userSchoolName={currentUser?.sekolah}
                  currentUser={currentUser}
                  onOpenStrukModal={handleOpenStrukModal}
                  onDeleteIuran={isKetua ? undefined : handleRequestDeleteIuran}
                  onDeletePemasukanLain={isKetua ? undefined : handleRequestDeletePemasukanLain}
                  onDeletePengeluaran={isKetua ? undefined : handleRequestDeletePengeluaran}
                  onOpenSpreadsheetModal={() => setIsSpreadsheetModalOpen(true)}
                />
              )}

              {/* Install Aplikasi PWA Tab (Accessible for all users: Admin, Bendahara, Sekolah, Ketua) */}
              {activeTab === 'install-app' && (
                <InstallAppTab />
              )}

              {/* Access denied fallback if user attempts closed route */}
              {!canAccessBendaharaMenu && !isKetua && (activeTab === 'input-iuran' || activeTab === 'pemasukan-lain' || activeTab === 'kelola-pengeluaran' || activeTab === 'penagihan' || activeTab === 'pengecualian') && (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto my-12 space-y-3">
                  <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
                  <h3 className="text-lg font-bold text-slate-800">Akses Terbatas (Khusus Pengurus & Bendahara)</h3>
                  <p className="text-xs text-slate-500">
                    Menu ini ditutup untuk akun Sekolah. Silakan gunakan menu Dashboard atau Laporan Keuangan.
                  </p>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="mt-4 px-5 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    Kembali ke Dashboard
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* App Modals */}
      <ModalHapusData
        isOpen={isHapusModalOpen}
        targetData={targetHapusData}
        currentUser={currentUser}
        onClose={() => {
          setIsHapusModalOpen(false);
          setTargetHapusData(null);
        }}
        onConfirmDelete={handleConfirmDelete}
      />

      <StrukModal
        isOpen={isStrukModalOpen}
        onClose={() => setIsStrukModalOpen(false)}
        data={strukData}
        onOpenValidasiModal={handleOpenValidasiModal}
      />

      <ValidasiKuitansiModal
        isOpen={isValidasiModalOpen}
        onClose={() => setIsValidasiModalOpen(false)}
        data={validasiData}
        onPrintStruk={(data) => {
          setStrukData(data);
          setIsStrukModalOpen(true);
        }}
      />

      <SpreadsheetModal
        isOpen={isSpreadsheetModalOpen}
        onClose={() => setIsSpreadsheetModalOpen(false)}
        spreadsheetId={spreadsheetId}
        onUpdateSpreadsheetConfig={handleUpdateSpreadsheetConfig}
        onResetToDefaultData={handleResetToDefaultData}
        initialTab={spreadsheetModalTab}
        isAdmin={isAdmin}
      />

      <LoginModal
        isOpen={isLoginModalOpen || !currentUser}
        onClose={() => setIsLoginModalOpen(false)}
        users={usersList}
        sekolahList={sekolahList}
        onSelectUser={handleSelectUser}
        isForceLogin={!currentUser}
      />

      {/* Footer - Raised on mobile (pb-28) so it is never covered by the bottom navigation bar */}
      <footer className="bg-white border-t border-slate-200 pt-5 pb-28 lg:pb-8 text-center text-xs sm:text-sm text-slate-500 mt-4 sm:mt-8">
        <div className="max-w-[1700px] mx-auto px-4 space-y-2.5">
          <p className="font-extrabold text-slate-800 text-sm sm:text-base tracking-tight">
            Sistem Keuangan MKKS Citos
          </p>
          <div className="flex items-center justify-center space-x-2.5 text-xs text-slate-500 flex-wrap gap-y-1.5">
            <span className="font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              Versi 2.2.0
            </span>
            <span>•</span>
            <span>Tahun Terbit: <strong>2026</strong></span>
            <span>•</span>
            <span>© 2026 MKKS Citos. Hak Cipta Dilindungi Undang-Undang.</span>
          </div>
          <div className="pt-1 text-xs text-slate-600 flex items-center justify-center gap-1">
            <span>Dibuat oleh:</span>
            <button
              type="button"
              onClick={() => setIsDevContactOpen(true)}
              className="font-extrabold text-teal-700 hover:text-teal-800 underline decoration-teal-500/60 hover:decoration-teal-700 underline-offset-4 transition-colors cursor-pointer"
            >
              Abu Haripin
            </button>
          </div>
        </div>
      </footer>

      {/* Modal Hubungi Pengembang (Abu Haripin) */}
      {isDevContactOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsDevContactOpen(false)}
        >
          <div
            className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-white leading-snug">
                  Hubungi Pengembang
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Abu Haripin · Jasa Pembuatan Aplikasi Web &amp; PWA
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDevContactOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-4 mb-5">
              Tertarik memesan aplikasi web, sistem SPMB sekolah, atau sistem manajemen lainnya? Silakan pilih saluran komunikasi berikut:
            </p>

            {/* Contact Options */}
            <div className="space-y-3">
              {/* Option 1: WhatsApp */}
              <a
                href="https://wa.me/6285310999527"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/30 hover:border-emerald-400/50 transition-all group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/20">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-400 group-hover:text-emerald-300">
                      Chat via WhatsApp
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      0853-1099-9527
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-400/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
              </a>

              {/* Option 2: Email */}
              <a
                href="mailto:abuharipin@gmail.com"
                className="flex items-center justify-between p-3.5 rounded-xl bg-sky-950/50 hover:bg-sky-900/60 border border-sky-500/30 hover:border-sky-400/50 transition-all group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-sky-500/20">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-sky-400 group-hover:text-sky-300">
                      Kirim Email
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      abuharipin@gmail.com
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-sky-400/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
              </a>
            </div>

            {/* Close Action */}
            <button
              type="button"
              onClick={() => setIsDevContactOpen(false)}
              className="mt-5 w-full py-1.5 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors text-center cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Floating PWA Install Banner (Android Chrome / Mobile) */}
      <PWAInstallFloatingBanner onOpenInstallModal={() => setActiveTab('install-app')} />

    </div>
  );
}
