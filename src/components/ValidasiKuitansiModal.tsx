import React from 'react';
import { formatRupiah, formatDateIndonesian, resolveNamaBendahara } from '../utils/formatters';
import { 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Building2, 
  Calendar, 
  UserCheck, 
  Printer, 
  Download,
  ExternalLink,
  QrCode
} from 'lucide-react';

export interface ValidasiData {
  noKuitansi: string;
  namaSekolah: string;
  namaKepsek?: string;
  alamatSekolah?: string;
  tahunBuku: number;
  bulanList: string[];
  totalNominal: number;
  tanggal: string;
  diinputOleh: string;
}

interface ValidasiKuitansiModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ValidasiData | null;
  onPrintStruk?: (data: ValidasiData) => void;
}

export const ValidasiKuitansiModal: React.FC<ValidasiKuitansiModalProps> = ({
  isOpen,
  onClose,
  data,
  onPrintStruk
}) => {
  if (!isOpen || !data) return null;

  const verificationHash = `MKKS-CITOS-${data.tahunBuku}-${(data.noKuitansi || 'KWT').replace(/[^A-Za-z0-9]/g, '')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-500 max-w-lg w-full p-4 sm:p-6 relative animate-in fade-in zoom-in duration-200 my-auto max-h-[92vh] flex flex-col justify-between overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          title="Tutup Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4">
          
          {/* Official Verification Badge */}
          <div className="text-center pt-2">
            <div className="inline-flex p-3.5 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl shadow-lg shadow-emerald-600/30 mb-2.5 animate-bounce">
              <ShieldCheck className="w-10 h-10" />
            </div>
            
            <div className="inline-flex items-center space-x-1.5 bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-1.5 border border-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>DOKUMEN RESMI & TERVERIFIKASI</span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
              Kuitansi Sah MKKS Cimanggis & Tapos
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Dokumen kuitansi ini 100% asli, sah, dan tercatat dalam basis data pembukuan resmi MKKS Citos Kota Depok.
            </p>
          </div>

          {/* Verification Details Box */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-2xl p-4 sm:p-5 border border-emerald-200/80 space-y-3 text-xs">
            
            {/* Header info */}
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-200/60">
              <span className="text-slate-500 font-semibold">Nomor Kuitansi</span>
              <span className="font-mono font-extrabold text-teal-800 bg-white px-2.5 py-0.5 rounded-md border border-teal-200">
                {data.noKuitansi}
              </span>
            </div>

            {/* Sekolah */}
            <div className="flex items-start justify-between pb-2.5 border-b border-emerald-200/60 gap-2">
              <span className="text-slate-500 font-semibold shrink-0">Instansi / Sekolah</span>
              <span className="font-extrabold text-slate-900 text-right">{data.namaSekolah}</span>
            </div>

            {/* Kepsek if exists */}
            {data.namaKepsek && (
              <div className="flex items-start justify-between pb-2.5 border-b border-emerald-200/60 gap-2">
                <span className="text-slate-500 font-semibold shrink-0">Kepala Sekolah</span>
                <span className="font-semibold text-slate-800 text-right">{data.namaKepsek}</span>
              </div>
            )}

            {/* Peruntukan */}
            <div className="flex items-start justify-between pb-2.5 border-b border-emerald-200/60 gap-2">
              <span className="text-slate-500 font-semibold shrink-0">Bulan Iuran</span>
              <span className="font-bold text-emerald-800 text-right">
                {data.bulanList.join(', ')} (Tahun {data.tahunBuku})
              </span>
            </div>

            {/* Nominal */}
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-200/60">
              <span className="text-slate-500 font-semibold">Jumlah Nominal</span>
              <span className="font-black text-emerald-700 text-sm sm:text-base">
                {formatRupiah(data.totalNominal)}
              </span>
            </div>

            {/* Tanggal & Petugas */}
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-200/60">
              <span className="text-slate-500 font-semibold">Tanggal Pembayaran</span>
              <span className="font-bold text-slate-800">{formatDateIndonesian(data.tanggal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Petugas Pembukuan</span>
              <span className="font-bold text-slate-800">{resolveNamaBendahara(data.diinputOleh)} (Bendahara)</span>
            </div>

          </div>

          {/* Security Signature Block */}
          <div className="p-3 bg-slate-900 text-slate-300 rounded-xl text-[11px] space-y-1 font-mono">
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <span>KODE VALIDASI SISTEM:</span>
              <span className="text-emerald-400 font-bold">STATUS: VALID</span>
            </div>
            <div className="text-white font-bold tracking-wider text-xs break-all">
              {verificationHash}
            </div>
            <div className="text-[10px] text-slate-400 pt-0.5">
              Musyawarah Kerja Kepala Sekolah (MKKS) Kec. Cimanggis & Tapos Depok
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
          {onPrintStruk && (
            <button
              onClick={() => {
                onClose();
                onPrintStruk(data);
              }}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Buka & Cetak Kuitansi</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
