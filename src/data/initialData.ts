import { Sekolah, User, Iuran, Pengeluaran } from '../types';

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
    sekolah: 'Pengurus MKKS Citos',
    aktif: 'Ya',
    namaKepsek: 'Hj. Neng Nurhasanah, M.Pd'
  }
];

export const INITIAL_IURAN: Iuran[] = [];

export const INITIAL_PENGELUARAN: Pengeluaran[] = [];

export const DEFAULT_SPREADSHEET_ID = '1egjF_HfX4gECSpDPV76VxZp6KvMYmgzDD_vxFqVnL_E';
export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw8dLJAKYL70qpuQky2kKdS56rXUJZaSvXY_JgOdrI3SgoHLOYVayGKdsDJgiRe2SEP/exec';


