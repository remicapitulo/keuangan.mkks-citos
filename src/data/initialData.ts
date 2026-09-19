import { Sekolah, User, Iuran, Pengeluaran, PemasukanLain, RiwayatHapus, RekonsiliasiKas } from '../types';

// Default initial schools fallback (empty - loaded dynamically from Google Spreadsheet)
export const INITIAL_SEKOLAH: Sekolah[] = [];

export const INITIAL_USER: User[] = [
  {
    username: 'admin',
    password: '123',
    role: 'Admin',
    sekolah: 'Pengurus Admin MKKS Citos',
    aktif: 'Ya',
    namaKepsek: 'Administrator MKKS Citos'
  },
  {
    username: 'abu',
    password: '123',
    role: 'Admin',
    sekolah: 'Super Admin',
    aktif: 'YA',
    namaKepsek: 'Abu Haripin, M.Pd.'
  },
  {
    username: 'brighton',
    password: '123',
    role: 'Sekolah',
    sekolah: 'SMP BRIGHTON',
    aktif: 'YA',
    namaKepsek: 'Ignatius Widi Nugroho, S.Sos.'
  },
  {
    username: 'gustian',
    password: '123',
    role: 'Sekolah',
    sekolah: 'SMP GENESIS MEDICARE',
    aktif: 'YA',
    namaKepsek: 'H. Gustian Maskat, S.Ag., M.M.'
  },
  {
    username: 'bendahara',
    password: '123',
    role: 'Bendahara',
    sekolah: 'Pengurus MKKS Citos',
    aktif: 'Ya',
    namaKepsek: 'H. Nurhasan, M.Pd'
  },
  {
    username: 'neng',
    password: '123',
    role: 'Bendahara',
    sekolah: 'SMP FATAHILLAH',
    aktif: 'YA',
    namaKepsek: 'Siti Rogaya, S.Pd.'
  },
  {
    username: 'marlina',
    password: '123',
    role: 'Bendahara',
    sekolah: 'SMP ISLAM AL ATTASIYAH',
    aktif: 'YA',
    namaKepsek: 'Marlina, S.Pd.'
  },
  {
    username: 'lisna',
    password: '123',
    role: 'Bendahara',
    sekolah: 'SMP ISLAM KREATIF AL KHOERIYAH',
    aktif: 'YA',
    namaKepsek: 'Lisnawati Suparta, M.Pd'
  }
];

export const INITIAL_IURAN: Iuran[] = [];

export const INITIAL_PENGELUARAN: Pengeluaran[] = [];

export const INITIAL_PEMASUKAN_LAIN: PemasukanLain[] = [];

export const INITIAL_RIWAYAT_HAPUS: RiwayatHapus[] = [];

export const INITIAL_REKONSILIASI_KAS: RekonsiliasiKas[] = [
  {
    id: 'AUDIT-2026-01',
    tahun: 2026,
    tanggalAudit: '2026-09-19 09:30',
    saldoCash: 1200000,
    saldoBank: 4800000,
    namaBank: 'Bank DKI',
    nomorRekening: '102.23.09876.1',
    atasNamaRekening: 'MKKS SMP Cilandak',
    catatanAudit: 'Pemeriksaan fisik brankas bendahara dan pencocokan saldo mutasi m-Banking per September 2026.',
    diauditOleh: 'Abu Haripin, M.Pd.',
    pecahanCash: {
      pecahan100k: 10,
      pecahan50k: 4,
      pecahan20k: 0,
      pecahan10k: 0,
      pecahan5k: 0,
      pecahan2k: 0,
      pecahan1k: 0,
      koin: 0
    }
  }
];

export const DEFAULT_SPREADSHEET_ID = '1egjF_HfX4gECSpDPV76VxZp6KvMYmgzDD_vxFqVnL_E';
export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw8dLJAKYL70qpuQky2kKdS56rXUJZaSvXY_JgOdrI3SgoHLOYVayGKdsDJgiRe2SEP/exec';


