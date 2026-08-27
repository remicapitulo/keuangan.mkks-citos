export type UserRole = 'Admin' | 'Bendahara' | 'Sekolah';

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
