import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { 
  LayoutDashboard, 
  Wallet, 
  Receipt, 
  FileText, 
  Database, 
  Menu, 
  X, 
  Coins, 
  Send, 
  Smartphone,
  Check,
  ChevronRight,
  Sparkles,
  Percent
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'input-iuran' | 'pemasukan-lain' | 'kelola-pengeluaran' | 'pengecualian' | 'laporan-keuangan' | 'penagihan' | 'install-app';

interface NavigationProps {
  role: UserRole;
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenSpreadsheetModal: (initialTab?: 'database' | 'install') => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  role,
  activeTab,
  onChangeTab,
  onOpenSpreadsheetModal
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Close mobile drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const menuBendahara: { id: ActiveTab; label: string; shortLabel: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      desc: 'Ringkasan & status kas'
    },
    {
      id: 'input-iuran',
      label: 'Input Iuran',
      shortLabel: 'Input Iuran',
      icon: <Wallet className="w-4 h-4" />,
      desc: 'Bayar iuran sekolah anggota'
    },
    {
      id: 'penagihan',
      label: 'Penagihan',
      shortLabel: 'Penagihan',
      icon: <Send className="w-4 h-4" />,
      desc: 'Kirim invoice WA tunggakan'
    },
    {
      id: 'pemasukan-lain',
      label: 'Pemasukan Lain',
      shortLabel: 'Non-Iuran',
      icon: <Coins className="w-4 h-4" />,
      desc: 'Penerimaan dana sponsor/donatur'
    },
    {
      id: 'kelola-pengeluaran',
      label: 'Pengeluaran',
      shortLabel: 'Pengeluaran',
      icon: <Receipt className="w-4 h-4" />,
      desc: 'Pencatatan kas operasional'
    },
    {
      id: 'pengecualian',
      label: 'Pengecualian',
      shortLabel: 'Pengecualian',
      icon: <Percent className="w-4 h-4" />,
      desc: 'Diskon kebijakan panitia & kendala'
    },
    {
      id: 'laporan-keuangan',
      label: 'Laporan Keuangan',
      shortLabel: 'Laporan',
      icon: <FileText className="w-4 h-4" />,
      desc: 'Matriks iuran & rekap kas'
    }
  ];

  const menuSekolah: { id: ActiveTab; label: string; shortLabel: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      desc: 'Status iuran & profil sekolah'
    },
    {
      id: 'laporan-keuangan',
      label: 'Laporan Keuangan',
      shortLabel: 'Matriks Iuran',
      icon: <FileText className="w-4 h-4" />,
      desc: 'Tabel kelunasan sekolah'
    }
  ];

  const menuKetua: { id: ActiveTab; label: string; shortLabel: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      desc: 'Ringkasan pengawasan umum'
    },
    {
      id: 'pengecualian',
      label: 'Pengecualian',
      shortLabel: 'Pengecualian',
      icon: <Percent className="w-4 h-4" />,
      desc: 'Daftar kebijakan diskon panitia'
    },
    {
      id: 'laporan-keuangan',
      label: 'Laporan Keuangan',
      shortLabel: 'Laporan',
      icon: <FileText className="w-4 h-4" />,
      desc: 'Audit & arus kas MKKS'
    }
  ];

  const isAdmin = role === 'Admin' || String(role).toLowerCase() === 'admin';
  const isBendahara = role === 'Bendahara' || String(role).toLowerCase() === 'bendahara';
  const isKetua = role === 'Ketua' || String(role).toLowerCase() === 'ketua';
  const isSekolah = !isAdmin && !isBendahara && !isKetua;

  const currentMenu = (isBendahara || isAdmin) 
    ? menuBendahara 
    : isKetua 
      ? menuKetua 
      : menuSekolah;

  const activeMenuItem = currentMenu.find(m => m.id === activeTab) || 
    (activeTab === 'install-app' 
      ? { id: 'install-app' as ActiveTab, label: 'Instal Aplikasi', shortLabel: 'Instal', icon: <Smartphone className="w-4 h-4" />, desc: 'Pasang di Layar Utama HP' }
      : currentMenu[0]);

  const handleSelectTab = (tabId: ActiveTab) => {
    onChangeTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* TOP NAVIGATION BAR */}
      <nav 
        id="app-navigation" 
        className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs sticky top-14 sm:top-18 z-30 transition-all duration-200"
      >
        <div className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8">
          
          {/* MOBILE SLIM HEADER STRIP (Visible on screens < md) */}
          <div className="flex md:hidden items-center justify-between py-2 gap-2">
            
            {/* Current Active Indicator Pill */}
            <div className="flex items-center space-x-2 bg-slate-100/90 py-1.5 px-3 rounded-xl border border-slate-200/70 min-w-0">
              <span className="p-1 bg-teal-600 text-white rounded-md shrink-0 shadow-2xs">
                {activeMenuItem.icon}
              </span>
              <div className="truncate">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block leading-tight">Menu:</span>
                <span className="text-xs font-black text-slate-800 leading-none truncate block">
                  {activeMenuItem.label}
                </span>
              </div>
            </div>

            {/* Action Buttons: Drawer Toggle & Quick Install */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onChangeTab('install-app')}
                className={`p-2 rounded-xl text-xs font-bold transition-all border ${
                  activeTab === 'install-app'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
                }`}
                title="Panduan Instal Aplikasi ke HP Android"
              >
                <Smartphone className="w-4 h-4" />
              </button>

              <button
                id="btn-mobile-menu-toggle"
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex items-center space-x-1.5 bg-teal-700 hover:bg-teal-800 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                aria-expanded={isMobileMenuOpen}
                aria-label="Buka Semua Menu"
              >
                <Menu className="w-4 h-4" />
                <span>Semua Menu</span>
              </button>
            </div>
          </div>

          {/* DESKTOP STREAMLINED SEGMENTED BAR (Visible on >= md) */}
          <div className="hidden md:flex items-center justify-between py-2 gap-3">
            
            {/* Primary Navigation Segmented Container */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 overflow-x-auto no-scrollbar gap-1 min-w-0">
              {currentMenu.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => onChangeTab(item.id)}
                    className={`flex items-center space-x-1.5 lg:space-x-2 px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-xl font-bold text-xs lg:text-sm transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-teal-700 text-white shadow-sm ring-1 ring-teal-700'
                        : 'text-slate-600 hover:text-teal-900 hover:bg-white/80'
                    }`}
                  >
                    <span className={`${isActive ? 'text-white' : 'text-teal-700'}`}>{item.icon}</span>
                    <span className="hidden xl:inline whitespace-nowrap">{item.label}</span>
                    <span className="xl:hidden whitespace-nowrap">{item.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Side Utility & Administration Tools */}
            <div className="flex items-center space-x-2 shrink-0">
              {/* Install App Quick Button */}
              <button
                type="button"
                onClick={() => onChangeTab('install-app')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'install-app'
                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                }`}
                title="Panduan Instal Aplikasi ke Layar Utama HP"
              >
                <Smartphone className={`w-3.5 h-3.5 ${activeTab === 'install-app' ? 'text-white' : 'text-emerald-600'}`} />
                <span className="hidden xl:inline">Instal Aplikasi HP</span>
                <span className="xl:hidden">App HP</span>
              </button>

              {/* Database Google Sheets Button (Khusus Role Admin) */}
              {isAdmin && (
                <button
                  id="btn-sheet-sync-nav"
                  type="button"
                  onClick={() => onOpenSpreadsheetModal('database')}
                  className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-teal-800 bg-slate-100/90 hover:bg-slate-200/80 px-3 py-2 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  title="Buka Pengaturan Database Google Sheets (Khusus Admin)"
                >
                  <Database className="w-3.5 h-3.5 text-teal-700" />
                  <span className="hidden xl:inline">Database Sheets</span>
                  <span className="xl:hidden">Database</span>
                </button>
              )}
            </div>

          </div>

        </div>
      </nav>

      {/* MOBILE FULL-FEATURED DRAWER MODAL (With clean backdrop & groups) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Bottom Sheet Drawer */}
          <div className="relative bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 max-h-[85vh] overflow-y-auto flex flex-col z-10 animate-in slide-in-from-bottom duration-250">
            
            {/* Sheet Handle & Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 pt-3 pb-3 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                  <Menu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Menu Navigasi</h3>
                  <p className="text-[11px] text-slate-500">MKKS SMP Cimanggis & Tapos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                aria-label="Tutup Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu List Body */}
            <div className="p-4 space-y-4">
              
              {/* Group 1: Keuangan & Operasional */}
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50/80 px-2.5 py-1 rounded-lg inline-block mb-2">
                  Keuangan & Operasional
                </div>
                <div className="space-y-1.5">
                  {currentMenu.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`drawer-nav-item-${item.id}`}
                        type="button"
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl font-bold text-sm transition-all text-left cursor-pointer ${
                          isActive
                            ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20 ring-1 ring-teal-700'
                            : 'bg-slate-50 hover:bg-teal-50/80 text-slate-700 hover:text-teal-900 border border-slate-200/70'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-white text-teal-700 shadow-2xs border border-slate-200/60'}`}>
                            {item.icon}
                          </span>
                          <div className="truncate">
                            <div className="font-extrabold text-sm leading-tight truncate">{item.label}</div>
                            <div className={`text-xs font-normal truncate mt-0.5 ${isActive ? 'text-teal-100' : 'text-slate-500'}`}>
                              {item.desc}
                            </div>
                          </div>
                        </div>

                        {isActive ? (
                          <span className="p-1 bg-white/20 rounded-full shrink-0">
                            <Check className="w-4 h-4 text-white" />
                          </span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group 2: Alat & Pengaturan */}
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg inline-block mb-2">
                  Alat & Sistem
                </div>
                <div className="space-y-1.5">
                  {/* Install App */}
                  <button
                    type="button"
                    onClick={() => handleSelectTab('install-app')}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl font-bold text-sm transition-all text-left cursor-pointer ${
                      activeTab === 'install-app'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-950 border border-emerald-200/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className={`p-2 rounded-xl shrink-0 ${activeTab === 'install-app' ? 'bg-white/20 text-white' : 'bg-white text-emerald-700 shadow-2xs border border-emerald-200/60'}`}>
                        <Smartphone className="w-4 h-4" />
                      </span>
                      <div className="truncate">
                        <div className="font-extrabold text-sm leading-tight flex items-center gap-1.5">
                          <span>Instal Aplikasi HP</span>
                          <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-md font-bold">PWA</span>
                        </div>
                        <div className={`text-xs font-normal truncate mt-0.5 ${activeTab === 'install-app' ? 'text-emerald-100' : 'text-slate-500'}`}>
                          Pasang langsung di layar utama smartphone
                        </div>
                      </div>
                    </div>
                    {activeTab === 'install-app' ? (
                      <Check className="w-4 h-4 text-white shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-emerald-700 shrink-0" />
                    )}
                  </button>

                  {/* Database Sheets (Khusus Admin) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenSpreadsheetModal('database');
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl font-bold text-sm transition-all text-left cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className="p-2 rounded-xl shrink-0 bg-white text-teal-700 shadow-2xs border border-slate-200/60">
                          <Database className="w-4 h-4" />
                        </span>
                        <div className="truncate">
                          <div className="font-extrabold text-sm leading-tight">Database Google Sheets</div>
                          <div className="text-xs font-normal text-slate-500 truncate mt-0.5">
                            Status sinkronisasi & link spreadsheet
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Close Button */}
            <div className="p-4 pt-1 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                Tutup Menu
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MOBILE QUICK BOTTOM NAVIGATION BAR (Visible on < md) */}
      <div 
        id="mobile-bottom-bar"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1.5 px-3 flex md:hidden items-center justify-around shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"
      >
        {/* Item 1: Dashboard */}
        <button
          type="button"
          onClick={() => onChangeTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-teal-700 font-extrabold scale-105'
              : 'text-slate-500 font-medium hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Dashboard</span>
        </button>

        {/* Item 2: Input Iuran (Bendahara/Admin) or Matriks (Sekolah/Ketua) */}
        {!isSekolah && !isKetua ? (
          <button
            type="button"
            onClick={() => onChangeTab('input-iuran')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'input-iuran'
                ? 'text-teal-700 font-extrabold scale-105'
                : 'text-slate-500 font-medium hover:text-slate-800'
            }`}
          >
            <Wallet className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Input Iuran</span>
          </button>
        ) : null}

        {/* Item 3: Penagihan (Bendahara/Admin only) */}
        {!isSekolah && !isKetua ? (
          <button
            type="button"
            onClick={() => onChangeTab('penagihan')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'penagihan'
                ? 'text-teal-700 font-extrabold scale-105'
                : 'text-slate-500 font-medium hover:text-slate-800'
            }`}
          >
            <Send className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Penagihan</span>
          </button>
        ) : null}

        {/* Item 4: Laporan Keuangan */}
        <button
          type="button"
          onClick={() => onChangeTab('laporan-keuangan')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'laporan-keuangan'
              ? 'text-teal-700 font-extrabold scale-105'
              : 'text-slate-500 font-medium hover:text-slate-800'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Laporan</span>
        </button>

        {/* Item 5: Semua Menu (Drawer trigger) */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-500 font-medium hover:text-teal-700 transition-all cursor-pointer"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Menu Lain</span>
        </button>
      </div>
    </>
  );
};
