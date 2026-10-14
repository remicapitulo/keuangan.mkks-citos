import React, { useState, useEffect } from 'react';
import { StorageService, GOOGLE_APPS_SCRIPT_CODE, SyncStatus } from '../services/spreadsheetSync';
import { 
  Database, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  X, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';

interface SpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetId: string;
  onUpdateSpreadsheetConfig: (newId: string, newScriptUrl: string) => void;
  onResetToDefaultData: () => void;
  initialTab?: string;
  isAdmin?: boolean;
}

export const SpreadsheetModal: React.FC<SpreadsheetModalProps> = ({
  isOpen,
  onClose,
  spreadsheetId,
  onUpdateSpreadsheetConfig,
  onResetToDefaultData
}) => {
  // Spreadsheet state
  const [inputSheetId, setInputSheetId] = useState<string>(spreadsheetId);
  const [inputScriptUrl, setInputScriptUrl] = useState<string>(() => StorageService.getAppsScriptUrl());
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setInputSheetId(spreadsheetId);
      setInputScriptUrl(StorageService.getAppsScriptUrl());
      setSyncStatus(null);
    }
  }, [isOpen, spreadsheetId]);

  if (!isOpen) return null;

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    const cleanUrl = StorageService.sanitizeUrl(inputScriptUrl);
    setInputScriptUrl(cleanUrl);
    onUpdateSpreadsheetConfig(inputSheetId.trim(), cleanUrl);

    // Test sync
    const res = await StorageService.syncToAppsScript();
    setSyncStatus(res);
    setIsTesting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 relative animate-in fade-in zoom-in duration-200 my-6 space-y-5 flex flex-col max-h-[92vh]">
        
        {/* Header with Title (Clean without duplicate Install App tab) */}
        <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200/60 shadow-xs">
              <Database className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base sm:text-lg">
                Pengaturan Database Google Sheets
              </h3>
              <p className="text-xs text-slate-500">
                Konfigurasi Sinkronisasi Spreadsheet (Sekolah, User, Iuran, Pengeluaran, Non-Iuran, Audit Kas, Setting)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-4">
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Info Banner */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Database Terhubung: Google Spreadsheet</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Multi-Sheet Aktif (8 Sheet)
                </span>
              </div>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Aplikasi menyimpan data secara lokal di browser dan otomatis melakukan sinkronisasi dua arah ke Google Sheets melalui Google Apps Script Web App.
              </p>
            </div>

            <form id="form-spreadsheet-config" onSubmit={handleSaveConfig} className="space-y-4">
              {/* Spreadsheet ID Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Google Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={inputSheetId}
                  onChange={(e) => setInputSheetId(e.target.value)}
                  placeholder="Contoh: 1egjF_Hfx4gECSpDPV76VxZp6KvMYmgzDD_vxFqVnL_E"
                  required
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                />
                <p className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>ID yang ada pada tautan URL spreadsheet Anda di antara /d/ dan /edit.</span>
                  {inputSheetId && (
                    <a 
                      href={`https://docs.google.com/spreadsheets/d/${inputSheetId}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-teal-700 font-bold hover:underline flex items-center space-x-1"
                    >
                      <span>Buka Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </p>
              </div>

              {/* Google Apps Script Web App URL */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Google Apps Script Web App URL (Deployment Exec URL)
                </label>
                <input
                  type="url"
                  value={inputScriptUrl}
                  onChange={(e) => setInputScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  required
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
                />
                <p className="text-[11px] text-slate-500">
                  URL Web App dari deployment Apps Script dengan akses <strong className="text-teal-800">Anyone (Siapa Saja)</strong>.
                </p>
              </div>

              {/* Sync Test Status Message */}
              {syncStatus && (
                <div className={`p-3 rounded-xl border text-xs flex items-start space-x-2.5 animate-in fade-in duration-200 ${
                  syncStatus.status === 'connected' || syncStatus.status === 'idle'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : syncStatus.status === 'error'
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-amber-50 border-amber-300 text-amber-800'
                }`}>
                  {syncStatus.status === 'connected' || syncStatus.status === 'idle' ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold">
                      {syncStatus.status === 'connected' ? 'Berhasil Terhubung' : 'Informasi Status Koneksi'}
                    </div>
                    <p className="mt-0.5">{syncStatus.message}</p>
                    {syncStatus.lastSynced && (
                      <span className="text-[10px] opacity-75 block mt-1">
                        Terakhir dicoba: {syncStatus.lastSynced}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </form>

            {/* Panduan Deployment & Kode Google Apps Script */}
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">
                    Kode Google Apps Script (Versi 8 Sheet Termasuk Setting)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Mendukung sheet: Sekolah, User, Iuran, Pengeluaran, Pemasukan_Lain, Riwayat_Hapus, Rekonsiliasi_Kas, Setting.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAppsScript}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs ${
                    copiedCode 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-white hover:bg-slate-100 text-teal-800 border border-slate-200'
                  }`}
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
                </button>
              </div>

              {/* Code Preview Box */}
              <div className="relative">
                <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[10px] font-mono overflow-x-auto max-h-40 leading-relaxed border border-slate-800 selection:bg-teal-700">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>

              {/* 4 Step Instructions */}
              <div className="text-[11px] text-slate-600 space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-800">Langkah Memasang / Update di Google Sheets:</p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>Buka spreadsheet Anda di browser, klik menu <strong>Ekstensi</strong> &gt; <strong>Apps Script</strong>.</li>
                  <li>Hapus semua kode lama di <code>Code.gs</code>, lalu paste kode yang telah Anda salin di atas.</li>
                  <li>Klik tombol <strong>Simpan (Ctrl+S)</strong>.</li>
                  <li>Klik tombol biru <strong>Deploy</strong> (kanan atas) &gt; <strong>Manage deployments</strong> &gt; Edit (ikon pensil) &gt; Pada Version pilih <strong>New version</strong> &gt; Pastikan <em>Who has access</em> = <strong>Anyone</strong> &gt; Klik <strong>Deploy</strong>.</li>
                </ol>
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[10px] leading-relaxed">
                  <strong>Penting untuk Sheet "Setting" &amp; Nomor Rekening:</strong> Jika sheet <em>Setting</em> masih kosong di Google Spreadsheet, hal itu karena Apps Script Anda masih menjalankan versi lama. Setelah deploy <strong>New version</strong>, klik tombol hijau <strong>"Simpan &amp; Tes Koneksi"</strong> di bawah, maka sheet Setting dan nomor rekening akan otomatis terisi dan diformat rapi!
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset semua data ke data default awal MKKS Citos?')) {
                onResetToDefaultData();
                alert('Data berhasil di-reset ke default awal.');
                onClose();
              }
            }}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold hover:underline cursor-pointer"
          >
            Reset Data Ke Seed Default
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              form="form-spreadsheet-config"
              disabled={isTesting}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-75"
            >
              {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Simpan &amp; Tes Koneksi</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
