import React, { useState, useEffect } from 'react';
import { StorageService, GOOGLE_APPS_SCRIPT_CODE, SyncStatus } from '../services/spreadsheetSync';
import { Database, Copy, Check, ExternalLink, RefreshCw, X, ShieldCheck, AlertCircle } from 'lucide-react';

interface SpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetId: string;
  onUpdateSpreadsheetConfig: (newId: string, newScriptUrl: string) => void;
  onResetToDefaultData: () => void;
}

export const SpreadsheetModal: React.FC<SpreadsheetModalProps> = ({
  isOpen,
  onClose,
  spreadsheetId,
  onUpdateSpreadsheetConfig,
  onResetToDefaultData
}) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 relative animate-in fade-in zoom-in duration-200 my-8 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Integrasi Google Spreadsheet Database</h3>
              <p className="text-xs text-slate-500">Konfigurasi ID Spreadsheet & Google Apps Script Sync Engine</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-600 space-y-1">
          <div className="font-bold text-slate-800 flex items-center justify-between">
            <span>Google Spreadsheet Resmi MKKS Citos:</span>
            <a
              href={`https://docs.google.com/spreadsheets/d/${inputSheetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:underline flex items-center space-x-1"
            >
              <span>Buka Google Sheet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="font-mono bg-white p-1.5 rounded border border-slate-200 text-teal-800 break-all select-all">
            https://docs.google.com/spreadsheets/d/{inputSheetId}
          </p>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSaveConfig} className="space-y-4">
          
          <div>
            <label htmlFor="spreadsheet-id-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Google Spreadsheet ID
            </label>
            <input
              id="spreadsheet-id-input"
              type="text"
              value={inputSheetId}
              onChange={(e) => setInputSheetId(e.target.value)}
              placeholder="e.g. 1egjF_HfX4gECSpDPV76VxZp6KvMYmgzDD_vxFqVnL_E"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">ID Spreadsheet yang berisi 7 Sheet: Sekolah, User, Iuran, Pengeluaran, Pemasukan_Lain, Riwayat_Hapus, dan Rekonsiliasi_Kas.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="apps-script-url-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Google Apps Script Web App URL (7 Sheet Live Sync)
              </label>
              <button
                type="button"
                onClick={handleCopyAppsScript}
                className="text-[11px] text-teal-600 hover:text-teal-800 font-bold flex items-center space-x-1"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Kode 7 Sheet Tersalin!' : 'Salin Kode Apps Script (7 Sheet)'}</span>
              </button>
            </div>

            <input
              id="apps-script-url-input"
              type="text"
              value={inputScriptUrl}
              onChange={(e) => setInputScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Jika diisi, aplikasi akan melakukan 2-way sync otomatis untuk data Kas & Audit Rekonsiliasi Kas dengan Google Sheet Anda.
            </p>
          </div>

          {/* Sync Status Feedback */}
          {syncStatus && (
            <div className={`p-3 rounded-xl text-xs border flex items-center space-x-2 ${
              syncStatus.status === 'connected' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {syncStatus.status === 'connected' ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
              <span>{syncStatus.message}</span>
            </div>
          )}

          {/* Apps Script Guide Instructions */}
          <div className="border border-teal-200 rounded-xl p-3.5 bg-teal-50/50 space-y-2.5 text-xs">
            <div className="font-bold text-teal-900 flex items-center space-x-1.5">
              <span>Langkah Update Kode Google Apps Script (Versi 7 Sheet Lengkap + Rekonsiliasi Kas):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11px] leading-relaxed">
              <li>Klik tombol <strong>Salin Kode Apps Script (7 Sheet)</strong> di atas.</li>
              <li>Buka spreadsheet Anda di Google Sheets &rarr; Klik menu <strong>Ekstensi (Extensions)</strong> &rarr; <strong>Apps Script</strong>.</li>
              <li>Hapus (select all & delete) semua kode lama di file <code className="bg-white px-1 py-0.5 rounded border border-teal-300 font-mono text-[10px]">Code.gs</code>, lalu <strong>Paste</strong> kode baru yang disalin tadi.</li>
              <li>
                <strong>PENTING (Deploy Versi Baru):</strong><br />
                Klik menu <strong>Deploy</strong> (kanan atas) &rarr; pilih <strong>Manage deployments (Kelola deployment)</strong> &rarr; klik ikon <strong>Pensil (Edit)</strong> &rarr; pada bagian <i>Version</i>, pilih <strong>New version (Versi baru)</strong> &rarr; klik <strong>Deploy</strong>.
              </li>
              <li>Setelah selesai di Apps Script, kembali ke sini lalu klik tombol <strong>Simpan & Tes Koneksi</strong> di bawah. Sheet <strong>Rekonsiliasi_Kas</strong> akan otomatis dibuat/diperbarui secara real-time.</li>
            </ol>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset semua data ke data default awal MKKS Citos?')) {
                  onResetToDefaultData();
                  alert('Data berhasil di-reset ke default awal.');
                  onClose();
                }
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold hover:underline"
            >
              Reset Data Ke Seed Default
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isTesting}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-1.5"
              >
                {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Simpan & Tes Koneksi</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
