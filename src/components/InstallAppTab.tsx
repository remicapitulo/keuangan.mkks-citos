import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Smartphone, 
  Download, 
  CheckCircle2, 
  MoreVertical, 
  Share2, 
  PlusSquare, 
  Zap, 
  WifiOff, 
  ShieldCheck, 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const InstallAppTab: React.FC = () => {
  const { isInstallable, isInstalled, isAndroid, isIOS, isChrome, install } = usePWAInstall();
  const [activeGuideTab, setActiveGuideTab] = useState<'android' | 'ios' | 'qrcode'>('android');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';

  useEffect(() => {
    if (isIOS) {
      setActiveGuideTab('ios');
    }
    // Generate QR code for opening on phone
    if (currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#0f766e',
          light: '#ffffff'
        }
      }).then(url => {
        setQrCodeUrl(url);
      }).catch(err => {
        console.error('Error generating QR code for PWA install:', err);
      });
    }
  }, [isIOS, currentUrl]);

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      const ok = await install();
      if (ok) {
        setInstallSuccess(true);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      
      {/* Hero Header Card */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-teal-500/30">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center space-x-4 sm:space-x-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2 shadow-2xl shrink-0 flex items-center justify-center border-2 border-teal-300/60">
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
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="bg-teal-400/25 text-teal-200 text-xs font-black px-2.5 py-0.5 rounded-full border border-teal-300/40 uppercase tracking-wider">
                  Progressive Web App (PWA)
                </span>
                <span className="bg-amber-400/25 text-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-300/40">
                  Google Chrome Android
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1.5 leading-tight tracking-tight">
                Instal Aplikasi MKKS CITOS di Android
              </h2>
              <p className="text-xs sm:text-sm text-teal-100/90 mt-1 max-w-2xl leading-relaxed">
                Pasang aplikasi sistem keuangan MKKS Citos langsung di layar utama HP Anda lewat Google Chrome tanpa perlu install dari Play Store. Ringan, praktis, dan dapat diakses 1-sentuhan.
              </p>
            </div>
          </div>

          {/* Quick Action Button if Installable */}
          {isInstallable && !isInstalled && (
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="bg-emerald-400 hover:bg-emerald-300 text-teal-950 font-black text-sm sm:text-base px-6 py-3.5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-2.5 shrink-0 cursor-pointer disabled:opacity-75"
            >
              <Download className="w-5 h-5 text-teal-950" />
              <span>{isInstalling ? 'Memasang Aplikasi...' : 'Pasang Sekarang (1-Klik)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Installed Status Banner */}
      {isInstalled && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3 text-emerald-900 shadow-xs">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div className="text-sm">
            <strong>Aplikasi Telah Terpasang!</strong> Anda saat ini sedang menjalankan MKKS CITOS sebagai aplikasi resmi di perangkat ini.
          </div>
        </div>
      )}

      {installSuccess && (
        <div className="p-4 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-2xl text-sm font-semibold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          Pemasangan berhasil! Ikon MKKS Citos telah ditambahkan ke layar depan HP Anda.
        </div>
      )}

      {/* Main Content: Steps and QR Code */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Step-by-Step Installation Guides */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
          
          {/* Guide Tab Switcher */}
          <div className="flex border-b border-slate-200 gap-2 pb-2">
            <button
              onClick={() => setActiveGuideTab('android')}
              className={`flex items-center space-x-2 py-2 px-4 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer ${
                activeGuideTab === 'android'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Google Chrome (Android)</span>
            </button>

            <button
              onClick={() => setActiveGuideTab('ios')}
              className={`flex items-center space-x-2 py-2 px-4 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer ${
                activeGuideTab === 'ios'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>iPhone / iPad (Safari)</span>
            </button>

            <button
              onClick={() => setActiveGuideTab('qrcode')}
              className={`flex items-center space-x-2 py-2 px-4 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer ${
                activeGuideTab === 'qrcode'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Buka di HP (QR Code)</span>
            </button>
          </div>

          {/* TAB 1: Android Chrome Guide */}
          {activeGuideTab === 'android' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-teal-600" />
                  Cara Memasang di Google Chrome Android
                </h3>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                  Resmi Chrome
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Step 1 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-7 h-7 rounded-lg bg-teal-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      1
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm">Buka di Google Chrome</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pastikan tautan website MKKS Citos dibuka menggunakan browser <strong>Google Chrome</strong> di HP Android Anda.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-7 h-7 rounded-lg bg-teal-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      2
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1">
                      Menu Titik Tiga ( <MoreVertical className="w-4 h-4 inline text-slate-700 -mx-1" /> )
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ketuk ikon <strong>tiga titik vertikal (⋮)</strong> di pojok kanan atas browser Google Chrome.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-7 h-7 rounded-lg bg-teal-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      3
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm">Pilih "Instal Aplikasi"</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pilih menu <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama" (Add to Home screen)</strong>.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      4
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm">Konfirmasi &amp; Selesai</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tekan <strong>"Instal"</strong>. Ikon MKKS Citos langsung terpasang di layar utama HP Anda seperti aplikasi Play Store.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: iOS Safari Guide */}
          {activeGuideTab === 'ios' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 text-base">
                  Cara Memasang di iPhone / iPad (Safari)
                </h3>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                  Safari iOS
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">Buka di Browser Safari</p>
                    <p className="text-slate-500 mt-0.5">Buka tautan website menggunakan browser Safari bawaan iPhone.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <div className="text-xs">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      Ketuk Tombol Share ( <Share2 className="w-3.5 h-3.5 text-indigo-600 inline" /> )
                    </p>
                    <p className="text-slate-500 mt-0.5">Ketuk tombol Bagikan (ikon kotak panah ke atas) di bilah bawah Safari.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">3</span>
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">Pilih "Add to Home Screen"</p>
                    <p className="text-slate-500 mt-0.5">Gulir ke bawah dan ketuk <strong>"Add to Home Screen" (Tambah ke Layar Utama)</strong>, lalu ketuk <strong>Add</strong>.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QR Code Tab */}
          {activeGuideTab === 'qrcode' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-teal-600" />
                Scan QR Code untuk Membuka di HP Android
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Jika Anda sedang membuka aplikasi ini di Komputer atau Laptop, cukup arahkan kamera HP Android atau Google Lens ke kode QR berikut untuk membuka dan menginstal aplikasi:
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-teal-50/50 rounded-2xl border border-teal-200">
                {qrCodeUrl && (
                  <div className="bg-white p-3 rounded-2xl border border-teal-300 shadow-sm shrink-0">
                    <img src={qrCodeUrl} alt="QR Code PWA Install" className="w-44 h-44 object-contain" />
                  </div>
                )}
                <div className="space-y-3 text-xs text-slate-700">
                  <div className="flex items-center space-x-2 text-teal-900 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Langkah Mudah:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                    <li>Buka kamera ponsel Android Anda</li>
                    <li>Arahkan ke kode QR di samping</li>
                    <li>Ketuk link notifikasi yang muncul di layar HP</li>
                    <li>Aplikasi akan terbuka di Chrome dan siap dipasang</li>
                  </ol>
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-teal-800 font-bold px-3 py-1.5 rounded-lg border border-teal-300 shadow-2xs transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-teal-700" />}
                    <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link Aplikasi'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Col: Why Install as PWA */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 font-black text-base border-b border-slate-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <span>Keunggulan Aplikasi</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 rounded-xl bg-teal-50/50 border border-teal-100">
                <Zap className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Akses Cepat 1-Sentuhan</p>
                  <p className="text-slate-500 mt-0.5">Buka aplikasi langsung dari beranda HP tanpa perlu membuka browser dan mengetik alamat URL lagi.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-xl bg-teal-50/50 border border-teal-100">
                <Smartphone className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Tampilan Layar Penuh</p>
                  <p className="text-slate-500 mt-0.5">Tanpa bilah alamat URL atau tombol navigasi browser, sehingga layar kerja terasa lebih luas dan nyaman.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-xl bg-teal-50/50 border border-teal-100">
                <WifiOff className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Hemat Kuota &amp; Cache Cepat</p>
                  <p className="text-slate-500 mt-0.5">Aset halaman disimpan di memori HP, loading jauh lebih instan dan hemat data internet.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-xl bg-teal-50/50 border border-teal-100">
                <Layers className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Ukuran Sangat Ringan</p>
                  <p className="text-slate-500 mt-0.5">Hanya berukuran kurang dari 2 MB, tidak membebani kapasitas penyimpanan memori HP Anda.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            Dikelola resmi untuk <strong>MKKS SMP Kecamatan Cimanggis &amp; Tapos</strong>
          </div>
        </div>

      </div>

    </div>
  );
};
