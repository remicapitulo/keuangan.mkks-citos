import React, { useState } from 'react';
import { UserRole } from '../types';
import { LayoutDashboard, Wallet, Receipt, FileText, Database, Menu, X, ChevronDown } from 'lucide-react';

export type ActiveTab = 'dashboard' | 'input-iuran' | 'kelola-pengeluaran' | 'laporan-keuangan';

interface NavigationProps {
  role: UserRole;
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenSpreadsheetModal: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  role,
  activeTab,
  onChangeTab,
  onOpenSpreadsheetModal
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const menuBendahara: { id: ActiveTab; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      desc: 'Ringkasan Keuangan'
    },
    {
      id: 'input-iuran',
      label: 'Input Iuran',
      icon: <Wallet className="w-5 h-5" />,
      desc: 'Bayar Iuran Sekolah'
    },
    {
      id: 'kelola-pengeluaran',
      label: 'Kelola Pengeluaran',
      icon: <Receipt className="w-5 h-5" />,
      desc: 'Pencatatan Kas Keluar'
    },
    {
      id: 'laporan-keuangan',
      label: 'Laporan Keuangan',
      icon: <FileText className="w-5 h-5" />,
      desc: 'Matriks & Rekap Kas'
    }
  ];

  const menuSekolah: { id: ActiveTab; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      desc: 'Ringkasan Status Iuran'
    },
    {
      id: 'laporan-keuangan',
      label: 'Laporan Keuangan',
      icon: <FileText className="w-5 h-5" />,
      desc: 'Rekap Kas & Matriks'
    }
  ];

  const isAdmin = role === 'Admin' || String(role).toLowerCase() === 'admin';
  const currentMenu = (role === 'Bendahara' || role === 'Admin' || isAdmin) ? menuBendahara : menuSekolah;
  const activeMenuItem = currentMenu.find(m => m.id === activeTab) || currentMenu[0];

  const handleSelectTab = (tabId: ActiveTab) => {
    onChangeTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav id="app-navigation" className="bg-white border-b border-slate-200 shadow-sm sticky top-0 md:top-16 z-30">
      <div className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* MOBILE NAVIGATION BAR WITH HAMBURGER BUTTON (Visible on < md) */}
        <div className="flex md:hidden items-center justify-between py-2.5">
          <button
            id="btn-mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center space-x-2.5 bg-teal-50 hover:bg-teal-100/80 text-teal-900 border border-teal-200 px-3.5 py-2 rounded-xl text-sm font-bold shadow-xs transition-all w-full justify-between cursor-pointer"
            aria-expanded={isMobileMenuOpen}
            aria-label="Menu Navigasi Mobile"
          >
            <div className="flex items-center space-x-2.5">
              <span className="p-1.5 bg-teal-600 text-white rounded-lg shadow-xs">
                {activeMenuItem.icon}
              </span>
              <div className="text-left">
                <span className="block text-xs font-semibold text-teal-600 leading-none">Menu Terpilih:</span>
                <span className="block text-sm font-extrabold text-slate-800 leading-tight">{activeMenuItem.label}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 text-teal-700 bg-white px-2.5 py-1 rounded-lg border border-teal-200">
              {isMobileMenuOpen ? <X className="w-4 h-4 text-rose-600" /> : <Menu className="w-4 h-4 text-teal-700" />}
              <span className="text-xs font-bold">{isMobileMenuOpen ? 'Tutup' : 'Menu'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </div>

        {/* MOBILE DROPDOWN DRAWER */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-100 bg-slate-50/90 rounded-b-2xl mb-2 px-1 shadow-inner animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-1.5">
              {currentMenu.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`mobile-nav-item-${item.id}`}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25 ring-1 ring-teal-600'
                        : 'bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`p-2 rounded-lg ${isActive ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-600'}`}>
                        {item.icon}
                      </span>
                      <div>
                        <div className="font-bold text-sm">{item.label}</div>
                        <div className={`text-xs font-normal ${isActive ? 'text-teal-100' : 'text-slate-500'}`}>
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full font-bold">
                        Aktif
                      </span>
                    )}
                  </button>
                );
              })}

              {isAdmin && (
                <div className="pt-2">
                  <button
                    id="mobile-btn-sheet-sync"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenSpreadsheetModal();
                    }}
                    className="w-full flex items-center justify-center space-x-2 text-xs font-bold text-teal-800 bg-teal-100/80 hover:bg-teal-200/80 px-4 py-2.5 rounded-xl border border-teal-300/60 transition-colors"
                  >
                    <Database className="w-4 h-4 text-teal-700" />
                    <span>Koneksi Google Sheets</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DESKTOP NAVIGATION TABS (Visible on >= md) */}
        <div className="hidden md:flex items-center justify-between py-2">
          <div className="flex items-center space-x-2">
            {currentMenu.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onChangeTab(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm lg:text-base transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25 ring-2 ring-teal-600/30'
                      : 'text-slate-600 hover:text-teal-700 hover:bg-teal-50/80'
                  }`}
                >
                  <span className={`${isActive ? 'text-white' : 'text-teal-600'}`}>{item.icon}</span>
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>

          {isAdmin && (
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-4 ml-4 shrink-0">
              <button
                id="btn-sheet-sync-nav"
                onClick={onOpenSpreadsheetModal}
                className="flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-teal-700 bg-slate-100 hover:bg-teal-50 px-3.5 py-2 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <Database className="w-4 h-4 text-teal-600" />
                <span>Database Google Sheets</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
};

