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
