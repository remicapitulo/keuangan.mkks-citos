export type UserRole = 'Admin' | 'Bendahara' | 'Sekolah' | 'Ketua';

export interface User {
  username: string;
  password?: string;
  role: UserRole;
  sekolah: string;
  aktif: boolean | string;
  namaKepsek?: string;
}

export interface Sekolah {
  idSekolah: string;
  namaSekolah: string;
  namaKepsek: string;
  alamat: string;
  kelurahan: string;
  kecamatan: string;
}

export interface Iuran {
  id: string;
  tahun: number;
  bulan: string; // e.g. "Januari", "Februari"
  idSekolah: string;
  namaSekolah: string;
  nominal: number;
  tanggalInput: string; // YYYY-MM-DD
  diinputOleh: string;
  noKuitansi?: string;
  keterangan?: string;
}

export interface Pengeluaran {
  id: string;
  tanggal: string; // YYYY-MM-DD
  project: string;
  keterangan: string;
  nominal: number;
  diinputOleh: string;
}

export interface PemasukanLain {
  id: string;
  tanggal: string; // YYYY-MM-DD
  kategori: string; // 'Sponsor & Kemitraan' | 'Uang Kembali / Sisa Panitia' | 'Sumbangan & Donasi' | 'Dana Hibah / Bantuan' | 'Bagi Hasil / Jasa Giro' | 'Pemasukan Lain-lain'
  sumberDana: string; // Nama Pihak Pemberi / Sponsor / Panitia / Donatur
  keterangan: string;
  nominal: number;
  diinputOleh: string;
  noKuitansi?: string;
}

export const KATEGORI_PEMASUKAN_LAIN = [
  'Sponsor & Kemitraan',
  'Uang Kembali / Sisa Panitia',
  'Sumbangan & Donasi',
  'Dana Hibah / Bantuan',
  'Bagi Hasil / Jasa Giro',
  'Pemasukan Lain-lain'
] as const;

export interface PaketDurasi {
  label: string;
  bulanCount: number;
  nominal: number;
}

export const BULAN_LIST = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
] as const;

export const BULAN_SINGKAT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
] as const;

export const IURAN_PER_BULAN = 100000; // Rp 100.000 per bulan

export type JenisTransaksiHapus = 'Iuran' | 'Pemasukan Lain' | 'Pengeluaran' | string;

export interface RiwayatHapus {
  id: string;
  idTransaksi?: string;
  idItemAsli?: string;
  jenisTransaksi?: JenisTransaksiHapus;
  jenis?: string; // 'iuran' | 'pemasukan-lain' | 'pengeluaran'
  rincianData?: string;
  judul?: string;
  judulItem?: string;
  dataOriginal?: any;
  nominal: number;
  tanggalHapus: string; // YYYY-MM-DD HH:mm:ss
  timestamp?: string;
  dihapusOleh: string;
  roleUser?: string;
  role?: string;
  rolePenghapus?: string;
  alasanHapus?: string;
  alasan?: string;
  noKuitansi?: string;
  tanggalTransaksiAsli?: string;
  tanggalTransaksi?: string;
  keteranganAsli?: string;
  namaSekolah?: string;
}

export interface PecahanUangCash {
  pecahan100k: number; // lembar Rp 100.000
  pecahan50k: number;  // lembar Rp 50.000
  pecahan20k: number;  // lembar Rp 20.000
  pecahan10k: number;  // lembar Rp 10.000
  pecahan5k: number;   // lembar Rp 5.000
  pecahan2k: number;   // lembar Rp 2.000
  pecahan1k: number;   // lembar Rp 1.000
  koin: number;        // total rupiah koin
}

export interface RekonsiliasiKas {
  id: string;
  tahun: number;
  tanggalAudit: string; // YYYY-MM-DD HH:mm:ss
  saldoCash: number;    // Uang Cash Fisik (Brankas Bendahara)
  saldoBank: number;    // Uang di Rekening Bank
  namaBank: string;     // Contoh: "Bank DKI", "Bank BJB", "Bank Mandiri"
  nomorRekening: string;
  atasNamaRekening: string;
  catatanAudit: string;
  diauditOleh: string;
  namaKetuaMkks?: string;
  nipKetuaMkks?: string;
  jabatanKetuaMkks?: string;
  namaBendahara?: string;
  nipBendahara?: string;
  jabatanBendahara?: string;
  pecahanCash?: PecahanUangCash;
}

export interface PejabatPenandatangan {
  namaKetuaMkks: string;
  nipKetuaMkks: string;
  jabatanKetuaMkks: string;
  namaBendahara: string;
  nipBendahara: string;
  jabatanBendahara: string;
}
