import React, { useState } from 'react';
import { Download, Smartphone, X, Zap } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallAppModal } from './InstallAppModal';

export const PWAInstallNavbarButton: React.FC = () => {
  const { isInstallable, isInstalled, install, isAndroid } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If already running in standalone PWA mode, don't clutter the header
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <button
        id="btn-pwa-install-nav"
        onClick={handleClick}
        className="flex items-center space-x-1.5 sm:space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl shadow-md hover:shadow-lg border border-emerald-400/30 transition-all cursor-pointer active:scale-95 group shrink-0"
        title="Instal aplikasi MKKS Citos di HP Android / Chrome"
      >
        <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
        <span className="hidden sm:inline">Instal Aplikasi</span>
        <span className="inline sm:hidden">Instal</span>
        <span className="inline-block px-1.5 py-0.2 bg-white/20 text-emerald-100 rounded text-[9px] sm:text-[10px] font-extrabold uppercase">
          App
        </span>
      </button>

      <InstallAppModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

interface PWAInstallFloatingBannerProps {
  onOpenInstallModal?: () => void;
}

export const PWAInstallFloatingBanner: React.FC<PWAInstallFloatingBannerProps> = ({ onOpenInstallModal }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('pwa_prompt_dismissed') === 'true';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isInstalled || isDismissed) {
    return null;
  }

  const handleOpenGuide = () => {
    if (onOpenInstallModal) {
      onOpenInstallModal();
    } else {
      setIsModalOpen(true);
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        handleOpenGuide();
      }
    } else {
      handleOpenGuide();
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  return (
    <>
      <aside
        id="pwa-install-banner"
        aria-label="Pemberitahuan Instalasi Aplikasi"
        className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-md z-45 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-2xl border border-teal-500/40 animate-in slide-in-from-bottom-5 duration-300"
      >
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-700/80 p-2 flex items-center justify-center shrink-0 border border-teal-400/40 shadow-inner">
            <Smartphone className="w-6 h-6 text-emerald-300" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center space-x-1.5">
              <span className="bg-emerald-400 text-teal-950 text-[10px] font-black px-1.5 py-0.2 rounded-sm uppercase tracking-wider">
                Chrome Android
              </span>
              <span className="text-[11px] font-semibold text-teal-200">
                Aplikasi Web Resmi
              </span>
            </div>
            <h4 className="font-extrabold text-xs sm:text-sm text-white mt-0.5 leading-snug">
              Pasang MKKS CITOS di Layar HP
            </h4>
            <p className="text-[11px] text-teal-100/90 line-clamp-2 mt-0.5">
              Lebih cepat dibuka, hemat kuota, dan langsung 1 klik tanpa buka browser lagi.
            </p>

            <div className="flex items-center space-x-2 mt-2.5">
              <button
                onClick={handleInstallClick}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-transform active:scale-95 flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-950" />
                <span>Instal Sekarang</span>
              </button>

              <button
                onClick={handleOpenGuide}
                className="text-[11px] font-bold text-teal-200 hover:text-white underline underline-offset-2 px-2 py-1 cursor-pointer"
              >
                Lihat Petunjuk
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="absolute top-2.5 right-2.5 text-teal-300/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Tutup Banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <InstallAppModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};
