import React, { useState, useEffect } from 'react';
import { User, Sekolah, Iuran, Pengeluaran } from './types';
import { StorageService } from './services/spreadsheetSync';
import { Navbar } from './components/Navbar';
import { Navigation, ActiveTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { InputIuran } from './components/InputIuran';
import { KelolaPengeluaran } from './components/KelolaPengeluaran';
import { LaporanKeuangan } from './components/LaporanKeuangan';
import { StrukModal } from './components/StrukModal';
import { SpreadsheetModal } from './components/SpreadsheetModal';
import { LoginModal } from './components/LoginModal';
import { CheckCircle2, ShieldAlert, Lock, UserCheck } from 'lucide-react';

export default function App() {
  // Application state
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  const [sekolahList, setSekolahList] = useState<Sekolah[]>(() => StorageService.getSekolah());
  const [usersList, setUsersList] = useState<User[]>(() => StorageService.getUsers());
  const [iuranList, setIuranList] = useState<Iuran[]>(() => StorageService.getIuran());
  const [pengeluaranList, setPengeluaranList] = useState<Pengeluaran[]>(() => StorageService.getPengeluaran());
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => StorageService.getSpreadsheetId());

  // Modals state
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => StorageService.getCurrentUser() === null);
  const [isStrukModalOpen, setIsStrukModalOpen] = useState<boolean>(false);
  const [strukData, setStrukData] = useState<any>(null);

  const [selectedSchoolForIuran, setSelectedSchoolForIuran] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync background fetch on load
  useEffect(() => {
    // Re-verify normalized local storage data on mount
    setSekolahList(StorageService.getSekolah());
    setUsersList(StorageService.getUsers());
    setIuranList(StorageService.getIuran());
    setPengeluaranList(StorageService.getPengeluaran());

    StorageService.fetchFromAppsScript().then((success) => {
      if (success) {
        setSekolahList(StorageService.getSekolah());
        setUsersList(StorageService.getUsers());
        setIuranList(StorageService.getIuran());
        setPengeluaranList(StorageService.getPengeluaran());
      }
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Save new Iuran items
  const handleSaveIuran = async (newItems: Omit<Iuran, 'id'>[]) => {
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

  // Save new Pengeluaran item
  const handleSavePengeluaran = async (newExpense: Omit<Pengeluaran, 'id'>) => {
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

  // Delete Pengeluaran item
  const handleDeletePengeluaran = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus catatan pengeluaran ini?')) {
      const updated = pengeluaranList.filter(p => p.id !== id);
      setPengeluaranList(updated);
      StorageService.savePengeluaran(updated);
      
      const syncRes = await StorageService.syncToAppsScript();
      showToast(syncRes.status === 'connected' ? 'Transaksi pengeluaran dihapus dari Database Google Sheet.' : 'Transaksi pengeluaran dihapus lokal.');
    }
  };

  // Open Struk Modal
  const handleOpenStrukModal = (kuitansiData: any) => {
    setStrukData(kuitansiData);
    setIsStrukModalOpen(true);
  };

  // Switch Logged-in User
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    StorageService.setCurrentUser(user);
    setIsLoginModalOpen(false);
    showToast(`Login sebagai ${user.sekolah} (${user.role})`);

    // Reset tab if user is Sekolah role and on Bendahara-only tab
    if (user.role === 'Sekolah' && (activeTab === 'input-iuran' || activeTab === 'kelola-pengeluaran')) {
      setActiveTab('dashboard');
    }
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
    setCurrentUser(StorageService.getCurrentUser());
    showToast('Data aplikasi di-reset ke data default awal.');
  };

  const isAdmin = currentUser ? (
    currentUser.role === 'Admin' ||
    currentUser.role?.toLowerCase() === 'admin' ||
    currentUser.username?.toLowerCase() === 'admin' ||
    currentUser.username?.toLowerCase().includes('admin')
  ) : false;

  const isBendahara = currentUser?.role === 'Bendahara' || isAdmin;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-between selection:bg-teal-500 selection:text-white">
      
      <div>
        {/* Top Header Navbar */}
        <Navbar
          currentUser={currentUser}
          onOpenSpreadsheetModal={() => setIsSpreadsheetModalOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={() => {
            setCurrentUser(null);
            StorageService.setCurrentUser(null);
            setIsLoginModalOpen(true);
          }}
          spreadsheetId={spreadsheetId}
        />

        {/* Navigation Bar */}
        <Navigation
          role={currentUser?.role || 'Bendahara'}
          activeTab={activeTab}
          onChangeTab={(tab) => setActiveTab(tab)}
          onOpenSpreadsheetModal={() => setIsSpreadsheetModalOpen(true)}
        />

        {/* Notification Toast */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-teal-500/40 flex items-center space-x-2 animate-in slide-in-from-bottom duration-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Main Content Area */}
        <main className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-6">
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
                  iuranList={iuranList}
                  pengeluaranList={pengeluaranList}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                  onSelectSchoolForIuran={(namaSekolah) => setSelectedSchoolForIuran(namaSekolah)}
                />
              )}

              {activeTab === 'input-iuran' && isBendahara && (
                <InputIuran
                  sekolahList={sekolahList}
                  iuranList={iuranList}
                  onSaveIuran={handleSaveIuran}
                  onOpenStrukModal={handleOpenStrukModal}
                  selectedSchoolNameFromDashboard={selectedSchoolForIuran}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'kelola-pengeluaran' && isBendahara && (
                <KelolaPengeluaran
                  pengeluaranList={pengeluaranList}
                  onSavePengeluaran={handleSavePengeluaran}
                  onDeletePengeluaran={handleDeletePengeluaran}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'laporan-keuangan' && (
                <LaporanKeuangan
                  sekolahList={sekolahList}
                  iuranList={iuranList}
                  pengeluaranList={pengeluaranList}
                  userSchoolName={currentUser?.sekolah}
                  currentUser={currentUser}
                />
              )}

              {/* Access denied fallback if Sekolah attempts Bendahara route */}
              {!isBendahara && (activeTab === 'input-iuran' || activeTab === 'kelola-pengeluaran') && (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto my-12 space-y-3">
                  <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
                  <h3 className="text-lg font-bold text-slate-800">Akses Terbatas (Khusus Bendahara)</h3>
                  <p className="text-xs text-slate-500">
                    Menu ini khusus diakses oleh pengurus Bendahara MKKS Citos. Akun sekolah dapat mengakses menu Dashboard dan Laporan Keuangan.
                  </p>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="mt-4 px-5 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl shadow-md"
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
      <StrukModal
        isOpen={isStrukModalOpen}
        onClose={() => setIsStrukModalOpen(false)}
        data={strukData}
      />

      <SpreadsheetModal
        isOpen={isSpreadsheetModalOpen}
        onClose={() => setIsSpreadsheetModalOpen(false)}
        spreadsheetId={spreadsheetId}
        onUpdateSpreadsheetConfig={handleUpdateSpreadsheetConfig}
        onResetToDefaultData={handleResetToDefaultData}
      />

      <LoginModal
        isOpen={isLoginModalOpen || !currentUser}
        onClose={() => setIsLoginModalOpen(false)}
        users={usersList}
        sekolahList={sekolahList}
        onSelectUser={handleSelectUser}
        isForceLogin={!currentUser}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs sm:text-sm text-slate-500 mt-12">
        <div className="max-w-[1700px] mx-auto px-4 space-y-2">
          <p className="font-bold text-slate-800 text-sm sm:text-base">
            Aplikasi Laporan Keuangan & Iuran MKKS Kecamatan Cimanggis & Tapos (MKKS CITOS)
          </p>
          <div className="flex items-center justify-center space-x-3 text-xs text-slate-500 flex-wrap gap-y-1">
            <span className="font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              Versi Aplikasi 2.1.0
            </span>
            <span>•</span>
            <span>Tahun Terbit: <strong>2026</strong></span>
            <span>•</span>
            <span>© 2026 MKKS Citos. Hak Cipta Dilindungi Undang-Undang.</span>
          </div>
          {isAdmin && (
            <p className="text-[11px] text-slate-400 pt-1 font-mono">
              Database Sync Status: Terhubung dengan Google Spreadsheet ID <span className="font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{spreadsheetId}</span>
            </p>
          )}
        </div>
      </footer>

    </div>
  );
}

