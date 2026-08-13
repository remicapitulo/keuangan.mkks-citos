import React from 'react';
import { User } from '../types';
import { Building2, Database, LogOut, UserCheck, ShieldCheck, RefreshCw } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onOpenSpreadsheetModal: () => void;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  spreadsheetId: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenSpreadsheetModal,
  onOpenLoginModal,
  onLogout,
  spreadsheetId
}) => {
  const isAdmin = currentUser ? (
    currentUser.role === 'Admin' ||
    currentUser.role?.toLowerCase() === 'admin' ||
    currentUser.username?.toLowerCase() === 'admin' ||
    currentUser.username?.toLowerCase().includes('admin')
  ) : false;

  return (
    <header id="app-header" className="bg-gradient-to-r from-teal-700 via-teal-800 to-indigo-900 text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="bg-white/15 p-1.5 sm:p-2.5 rounded-xl backdrop-blur-md border border-white/20 shadow-inner shrink-0">
              <Building2 className="w-5 h-5 sm:w-7 sm:h-7 text-teal-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h1 className="font-extrabold text-sm sm:text-xl lg:text-2xl leading-none tracking-wide text-white truncate">
                  MKKS CITOS
                </h1>
                <span className="hidden sm:inline-block bg-teal-400/20 text-teal-200 text-[10px] sm:text-xs md:text-sm px-2.5 py-0.5 rounded-full border border-teal-300/30 font-bold whitespace-nowrap">
                  Kecamatan Cimanggis & Tapos
                </span>
              </div>
              <p className="text-[10px] sm:text-xs md:text-sm text-teal-100/90 font-normal hidden sm:block">
                Sistem Laporan Keuangan & Iuran Sekolah
              </p>
            </div>
          </div>

          {/* Center / Spreadsheet Sync Badge (Visible ONLY to Admin) */}
          {isAdmin && (
            <div className="hidden lg:flex items-center space-x-2">
              <button
                id="btn-spreadsheet-config"
                onClick={onOpenSpreadsheetModal}
                className="flex items-center space-x-2 bg-teal-900/60 hover:bg-teal-900/90 text-teal-100 text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-teal-500/30 transition-all shadow-sm group cursor-pointer"
                title="Kelola Koneksi Google Spreadsheet"
              >
                <Database className="w-4 h-4 text-teal-300 group-hover:scale-110 transition-transform" />
                <span>Spreadsheet ID: <strong className="font-mono text-white">{spreadsheetId.substring(0, 10)}...</strong></span>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </button>
            </div>
          )}

          {/* Right / User Profile & Role */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-2">
                {/* Role Badge Button to switch account */}
                <button
                  id="btn-switch-user"
                  onClick={onOpenLoginModal}
                  className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-white/20 transition-all"
                  title="Ganti Akun / Role"
                >
                  <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-200" />
                  <span className="inline font-medium text-xs sm:text-sm">{currentUser.username}</span>
                  <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-300 ml-0.5" />
                </button>

                {/* Logout Button */}
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="bg-red-500/20 hover:bg-red-500/40 text-red-100 p-1.5 sm:p-2.5 rounded-xl border border-red-400/30 transition-colors"
                  title="Keluar / Logout"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            ) : (
              <button
                id="btn-login-open"
                onClick={onOpenLoginModal}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl shadow-md transition-all flex items-center space-x-1.5"
              >
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Masuk Akun</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
