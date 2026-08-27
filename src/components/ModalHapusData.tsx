import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert, Check, Calendar, Building2, Tag, CreditCard, UserCheck, FileText } from 'lucide-react';
import { JenisTransaksiHapus, User } from '../types';
import { formatRupiah, formatDateIndonesian } from '../utils/formatters';

export interface DataHapusTarget {
  id: string;
  jenis: JenisTransaksiHapus;
  title: string;
  subtitle?: string;
  nominal: number;
  tanggal?: string;
  noKuitansi?: string;
  diinputOleh?: string;
  rawData?: any;
}

interface ModalHapusDataProps {
  isOpen: boolean;
  targetData: DataHapusTarget | null;
  currentUser?: User | null;
  onClose: () => void;
  onConfirmDelete: (targetData: DataHapusTarget, alasan: string, namaPetugas: string, roleUser: string) => void;
}

export const ModalHapusData: React.FC<ModalHapusDataProps> = ({
  isOpen,
  targetData,
  currentUser,
  onClose,
  onConfirmDelete
}) => {
  const [alasan, setAlasan] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setAlasan('');
      setErrorMsg('');
    }
  }, [isOpen, targetData]);

  if (!isOpen || !targetData) return null;

  const namaPetugas = currentUser?.namaKepsek || currentUser?.username || 'Bendahara MKKS Citos';
  const roleUser = currentUser?.role || 'Bendahara';

  const quickReasons = [
    targetData.jenis === 'Iuran' ? 'Salah pilih bulan iuran' : 'Kesalahan input transaksi',
    'Kuitansi ganda / data dobel',
    'Kesalahan nominal pembayaran',
    'Pembatalan transaksi oleh pihak sekolah/terkait',
    'Revisi catatan alokasi pembukuan kas'
  ];

  const handleSelectQuickReason = (reasonText: string) => {
    setAlasan(reasonText);
    setErrorMsg('');
  };

  const handleConfirm = () => {
    if (!alasan.trim()) {
      setErrorMsg('Harap masukkan alasan atau keterangan mengapa data ini dihapus!');
      return;
    }

    onConfirmDelete(targetData, alasan.trim(), namaPetugas, roleUser);
    onClose();
  };

  const getBadgeColor = () => {
    switch (targetData.jenis) {
      case 'Iuran':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Pemasukan Lain':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'Pengeluaran':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-rose-100 flex flex-col my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-red-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">Konfirmasi Hapus Data</h3>
              <p className="text-xs text-rose-100 font-light">Tindakan ini akan dicatat ke dalam Audit Log Riwayat Hapus</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Warning Banner */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-rose-900">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Peringatan Penghapusan Data Transaksi</span>
              Data yang dihapus akan dihilangkan dari kalkulasi kas aktif, dan otomatis dipindahkan ke <strong>Laporan Riwayat Penghapusan</strong> beserta alasan dan identitas penghapus.
            </div>
          </div>

          {/* Target Data Preview Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <span className="text-xs text-slate-500 font-medium">Jenis Transaksi:</span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getBadgeColor()}`}>
                {targetData.jenis}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-start gap-3">
                <span className="text-slate-500 font-medium shrink-0">Nama / Rincian:</span>
                <span className="font-bold text-slate-800 text-right">{targetData.title}</span>
              </div>

              {targetData.subtitle && (
                <div className="flex justify-between items-center gap-3">
                  <span className="text-slate-500 font-medium">Keterangan / Periode:</span>
                  <span className="text-slate-700 font-semibold text-right">{targetData.subtitle}</span>
                </div>
              )}

              <div className="flex justify-between items-center gap-3">
                <span className="text-slate-500 font-medium">Nominal Transaksi:</span>
                <span className="font-extrabold text-rose-600 text-sm">{formatRupiah(targetData.nominal)}</span>
              </div>

              {targetData.tanggal && (
                <div className="flex justify-between items-center gap-3">
                  <span className="text-slate-500 font-medium">Tanggal Transaksi:</span>
                  <span className="text-slate-700">{formatDateIndonesian(targetData.tanggal)}</span>
                </div>
              )}

              {targetData.noKuitansi && (
                <div className="flex justify-between items-center gap-3">
                  <span className="text-slate-500 font-medium">No. Kuitansi:</span>
                  <span className="font-mono text-slate-600">{targetData.noKuitansi}</span>
                </div>
              )}

              {targetData.diinputOleh && (
                <div className="flex justify-between items-center gap-3">
                  <span className="text-slate-500 font-medium">Diinput Oleh (Asli):</span>
                  <span className="text-slate-600">{targetData.diinputOleh}</span>
                </div>
              )}
            </div>
          </div>

          {/* User info who is performing deletion */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-amber-900">
              <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Petugas Penghapus:</span>
            </div>
            <div className="font-bold text-amber-950 text-right">
              {namaPetugas} <span className="text-[10px] font-normal px-1.5 py-0.5 bg-amber-200/70 rounded text-amber-900 ml-1">({roleUser})</span>
            </div>
          </div>

          {/* Form Input Alasan */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Keterangan / Alasan Penghapusan <span className="text-rose-600">* (Wajib Diisi)</span>:
            </label>
            
            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {quickReasons.map((reason, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectQuickReason(reason)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all text-left ${
                    alasan === reason
                      ? 'bg-rose-50 border-rose-400 text-rose-700 font-semibold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  + {reason}
                </button>
              ))}
            </div>

            <textarea
              value={alasan}
              onChange={(e) => {
                setAlasan(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              rows={3}
              placeholder="Contoh: Kesalahan input nama sekolah / bulan ganda oleh operator..."
              className={`w-full text-xs sm:text-sm p-3 rounded-xl border focus:outline-none focus:ring-2 transition-all ${
                errorMsg 
                  ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/30' 
                  : 'border-slate-300 focus:ring-rose-200 focus:border-rose-500'
              }`}
            />
            {errorMsg && (
              <p className="text-[11px] text-rose-600 font-medium flex items-center space-x-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Ya, Hapus Data & Catat Log</span>
          </button>
        </div>

      </div>
    </div>
  );
};
