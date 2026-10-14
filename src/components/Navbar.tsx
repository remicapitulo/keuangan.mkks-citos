import React from 'react';
import { User } from '../types';
import { Building2, LogOut, UserCheck, RefreshCw } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onOpenLoginModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenLoginModal,
  onLogout
}) => {

  return (
    <header id="app-header" className="bg-gradient-to-r from-teal-700 via-teal-800 to-indigo-900 text-white shadow-lg sticky top-0 z-40 w-full overflow-x-hidden">
      <div className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-18">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div className="bg-white/15 p-1.5 sm:p-2 rounded-xl backdrop-blur-md border border-white/20 shadow-inner shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-teal-200" />
            </div>
            <div className="shrink-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h1 className="font-extrabold text-base sm:text-lg lg:text-xl leading-none tracking-wide text-white whitespace-nowrap">
                  MKKS CITOS
                </h1>
                <span className="hidden sm:inline-block bg-teal-400/20 text-teal-200 text-[10px] sm:text-xs px-2 py-0.5 rounded-full border border-teal-300/30 font-bold whitespace-nowrap">
                  Kecamatan Cimanggis & Tapos
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-teal-100/90 font-normal hidden sm:block mt-0.5">
                Sistem Laporan Keuangan & Iuran Sekolah
              </p>
            </div>
          </div>

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
