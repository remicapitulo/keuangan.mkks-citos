import React, { useState } from 'react';
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
  if (!isOpen) return null;

  const [inputSheetId, setInputSheetId] = useState<string>(spreadsheetId);
  const [inputScriptUrl, setInputScriptUrl] = useState<string>(StorageService.getAppsScriptUrl());
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

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
            <p className="text-[11px] text-slate-500 mt-1">ID Spreadsheet yang berisi Sheet User, Sekolah, Iuran, dan Pengeluaran.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="apps-script-url-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Google Apps Script Web App URL (Opsional untuk 2-way live sync)
              </label>
              <button
                type="button"
                onClick={handleCopyAppsScript}
                className="text-[11px] text-teal-600 hover:text-teal-800 font-bold flex items-center space-x-1"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Kode Tersalin!' : 'Salin Kode Apps Script'}</span>
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
              Jika diisi, aplikasi akan melakukan 2-way sync otomatis dengan Google Sheet Anda saat ada perubahan data.
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
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2 text-xs">
            <div className="font-bold text-slate-800">Petunjuk Cara Menghubungkan Google Sheet:</div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
              <li>Buka file Google Spreadsheet Anda.</li>
              <li>Klik menu <strong>Ekstensi</strong> &rarr; <strong>Apps Script</strong>.</li>
              <li>Hapus semua kode lama, lalu tempel kode yang sudah disalin (tombol di atas).</li>
              <li>Klik tombol <strong>Deploy</strong> &rarr; <strong>New deployment</strong> &rarr; Pilih type <strong>Web app</strong>.</li>
              <li>Atur <i>Who has access</i> menjadi <strong>Anyone</strong>, lalu klik Deploy dan salin Web App URL-nya ke form di atas.</li>
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
