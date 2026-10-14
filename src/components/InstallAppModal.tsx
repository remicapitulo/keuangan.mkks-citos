import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  X, 
  MoreVertical, 
  PlusSquare, 
  ExternalLink, 
  Zap, 
  WifiOff, 
  ShieldCheck, 
  Chrome 
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDirectInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with App Logo & Gradient */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-indigo-900 text-white p-5 sm:p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3.5">
            <div className="w-13 h-13 rounded-2xl bg-white p-1.5 shadow-lg shrink-0 flex items-center justify-center border-2 border-teal-200/50">
              <img 
                src="/icon.svg" 
                alt="Logo MKKS Citos" 
                className="w-full h-full object-contain" 
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }} 
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-teal-400/20 text-teal-200 text-[11px] font-bold px-2 py-0.5 rounded-full border border-teal-300/30 uppercase tracking-wider">
                  Progressive Web App
                </span>
                <span className="bg-amber-400/20 text-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-300/30">
                  Google Chrome
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 leading-tight">
                Instal Aplikasi MKKS CITOS
              </h2>
              <p className="text-xs sm:text-sm text-teal-100/90 mt-0.5">
                Pasang di Layar Utama HP Android Anda
              </p>
            </div>
          </div>
        </div>

        {/* Tab switcher: Android Chrome vs iOS Safari */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'android'
                ? 'border-teal-600 text-teal-800 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Android (Google Chrome)</span>
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'ios'
                ? 'border-teal-600 text-teal-800 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>iPhone / iPad (Safari)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700">
          
          {/* Status if already installed */}
          {isInstalled && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs sm:text-sm">
                <strong>Aplikasi telah terpasang!</strong> Anda sedang menggunakan MKKS CITOS sebagai aplikasi mandiri.
              </div>
            </div>
          )}

          {/* Quick Direct Install Button if browser supports beforeinstallprompt */}
          {isInstallable && !isInstalled && (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-1.5">
                    <Zap className="w-5 h-5 text-yellow-300" />
                    Pasang Otomatis 1-Klik
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Browser Anda mendukung pemasangan instan langsung ke HP Android.
                  </p>
                </div>
                <button
                  onClick={handleDirectInstall}
                  disabled={isInstalling}
                  className="bg-white hover:bg-emerald-50 text-emerald-800 font-black text-sm px-5 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:opacity-75"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>{isInstalling ? 'Memasang...' : 'Pasang Sekarang'}</span>
                </button>
              </div>
            </div>
          )}

          {installSuccess && (
            <div className="p-3 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Pemasangan berhasil! Ikon MKKS Citos telah ditambahkan ke layar HP Anda.
            </div>
          )}

          {/* Android Chrome Instructions */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Panduan Pemasangan di Google Chrome Android
                </h4>
                <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200">
                  Mudah & Cepat
                </span>
              </div>

              {/* Steps Cards */}
              <div className="space-y-2.5">
                {/* Step 1 */}
                <div className="flex items-start space-x-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-teal-300 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    1
                  </div>
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold text-slate-800">
                      Buka Google Chrome di HP Android
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Pastikan tautan website ini dibuka menggunakan browser <strong>Google Chrome</strong> di ponsel Android Anda.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start space-x-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-teal-300 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    2
                  </div>
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      Ketuk Menu Titik Tiga ( <MoreVertical className="w-3.5 h-3.5 inline text-slate-700 -mx-0.5" /> )
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Lihat pojok kanan atas layar browser Chrome, lalu ketuk ikon <strong>tiga titik vertikal (⋮)</strong>.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start space-x-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-teal-300 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    3
                  </div>
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      Pilih "Instal Aplikasi" atau "Tambahkan ke Layar Utama"
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Cari dan tekan menu <strong>"Instal aplikasi"</strong> (atau <em>"Add to Home screen" / "Tambahkan ke Layar Utama"</em>).
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start space-x-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-teal-300 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    4
                  </div>
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold text-slate-800">
                      Konfirmasi & Selesai!
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Tekan tombol <strong>"Instal"</strong>. Ikon <strong>MKKS CITOS</strong> akan otomatis muncul di menu aplikasi & layar depan HP seperti aplikasi resmi Play Store.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* iOS Safari Instructions */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                Panduan Pemasangan di iPhone / iPad (Safari)
              </h4>
              <div className="space-y-2.5">
                <div className="flex items-start space-x-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold text-slate-800">Buka di Browser Safari</p>
                    <p className="text-slate-500 mt-0.5">Pastikan Anda membuka website ini menggunakan browser Safari di iOS.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold text-slate-800">Ketuk Tombol Share (Bagikan)</p>
                    <p className="text-slate-500 mt-0.5">Ketuk ikon kotak dengan panah ke atas di bilah navigasi bawah Safari.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold text-slate-800">Pilih "Add to Home Screen"</p>
                    <p className="text-slate-500 mt-0.5">Gulir ke bawah dan ketuk menu <strong>"Add to Home Screen" (Tambah ke Layar Utama)</strong>, lalu ketuk <strong>Add</strong>.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advantages of PWA Installation */}
          <div className="border-t border-slate-200 pt-4">
            <h5 className="text-xs font-bold text-slate-600 mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Keunggulan Aplikasi Terpasang di Android:
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2 bg-teal-50/60 p-2 rounded-lg border border-teal-100 text-slate-700">
                <Zap className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Buka 1x klik dari beranda HP</span>
              </div>
              <div className="flex items-center space-x-2 bg-teal-50/60 p-2 rounded-lg border border-teal-100 text-slate-700">
                <Smartphone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Layar penuh tanpa bilah URL</span>
              </div>
              <div className="flex items-center space-x-2 bg-teal-50/60 p-2 rounded-lg border border-teal-100 text-slate-700">
                <WifiOff className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Cache cepat & hemat kuota</span>
              </div>
              <div className="flex items-center space-x-2 bg-teal-50/60 p-2 rounded-lg border border-teal-100 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Ukuran sangat ringan (&lt; 2 MB)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Kompatibel dengan semua ponsel Android &amp; Chrome
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-colors cursor-pointer ml-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
