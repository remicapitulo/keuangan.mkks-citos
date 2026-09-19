import { Sekolah, User, Iuran, Pengeluaran, PemasukanLain, UserRole, RiwayatHapus, RekonsiliasiKas, PejabatPenandatangan } from '../types';
import { INITIAL_SEKOLAH, INITIAL_USER, INITIAL_IURAN, INITIAL_PENGELUARAN, INITIAL_PEMASUKAN_LAIN, INITIAL_RIWAYAT_HAPUS, INITIAL_REKONSILIASI_KAS, DEFAULT_SPREADSHEET_ID, DEFAULT_APPS_SCRIPT_URL } from '../data/initialData';
import { cleanDateInputString } from '../utils/formatters';

export const DEFAULT_PEJABAT: PejabatPenandatangan = {
  namaKetuaMkks: '',
  nipKetuaMkks: '',
  jabatanKetuaMkks: 'Ketua MKKS SMP Cimanggis & Tapos',
  namaBendahara: 'Abu Haripin, M.Pd.',
  nipBendahara: '',
  jabatanBendahara: 'Bendahara MKKS SMP Citos'
};

const STORAGE_KEYS = {
  SEKOLAH: 'mkks_citos_sekolah',
  USER: 'mkks_citos_user',
  IURAN: 'mkks_citos_iuran',
  PENGELUARAN: 'mkks_citos_pengeluaran',
  PEMASUKAN_LAIN: 'mkks_citos_pemasukan_lain',
  RIWAYAT_HAPUS: 'mkks_citos_riwayat_hapus',
  REKONSILIASI_KAS: 'mkks_citos_rekonsiliasi_kas',
  PEJABAT: 'mkks_citos_pejabat',
  SPREADSHEET_ID: 'mkks_citos_sheet_id',
  APPS_SCRIPT_URL: 'mkks_citos_apps_script_url',
  CURRENT_USER: 'mkks_citos_current_user'
};

export interface SyncStatus {
  lastSynced: string | null;
  status: 'idle' | 'syncing' | 'connected' | 'offline' | 'error';
  message: string;
}

// Helper to extract values from raw objects flexibly (handles key casing, spaces, underscores, etc.)
export function getFlexibleValue(obj: any, candidates: string[]): string {
  if (!obj || typeof obj !== 'object') return '';

  // Direct match
  for (const candidate of candidates) {
    if (obj[candidate] !== undefined && obj[candidate] !== null) {
      const val = String(obj[candidate]).trim();
      if (val !== '') return val;
    }
  }

  // Loose match (ignore case, spaces, underscores, dashes)
  const keys = Object.keys(obj);
  const cleanCandidates = candidates.map(c => c.toLowerCase().replace(/[^a-z0-9]/g, ''));

  for (const key of keys) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (let i = 0; i < cleanCandidates.length; i++) {
      if (cleanKey === cleanCandidates[i]) {
        if (obj[key] !== undefined && obj[key] !== null) {
          const val = String(obj[key]).trim();
          if (val !== '') return val;
        }
      }
    }
  }

  // Substring match fallback
  for (const key of keys) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (let i = 0; i < cleanCandidates.length; i++) {
      if (cleanCandidates[i] && (cleanKey.includes(cleanCandidates[i]) || cleanCandidates[i].includes(cleanKey))) {
        if (obj[key] !== undefined && obj[key] !== null) {
          const val = String(obj[key]).trim();
          if (val !== '') return val;
        }
      }
    }
  }

  return '';
}

// Normalizers
export function normalizeSekolahList(rawList: any[]): Sekolah[] {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return INITIAL_SEKOLAH;
  }

  const seen = new Set<string>();
  const normalized: Sekolah[] = [];

  rawList.forEach((s, idx) => {
    if (!s || typeof s !== 'object') return;

    const namaSekolah = getFlexibleValue(s, [
      'namaSekolah', 'Nama Sekolah', 'Nama Sekolah Anggota', 'NAMA SEKOLAH', 'NAMA SEKOLAH ANGGOTA',
      'nama_sekolah', 'sekolah', 'Sekolah', 'nama', 'Nama', 'NAMA'
    ]);

    if (!namaSekolah) return;

    // Deduplicate by cleaned lowercased name
    const cleanKey = namaSekolah.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(cleanKey)) return;
    seen.add(cleanKey);

    let idSekolah = getFlexibleValue(s, [
      'idSekolah', 'ID Sekolah', 'Id Sekolah', 'id_sekolah', 'id', 'ID', 'no', 'NO', 'No.', 'No'
    ]);
    if (!idSekolah) {
      idSekolah = `SKL-${String(normalized.length + 1).padStart(3, '0')}`;
    }

    const namaKepsek = getFlexibleValue(s, [
      'namaKepsek', 'Nama Kepsek', 'NAMA KEPSEK', 'Nama Kepala Sekolah', 'NAMA KEPALA SEKOLAH',
      'Kepala Sekolah', 'nama_kepsek', 'kepsek', 'Kepsek', 'KEPSEK'
    ]);

    const alamat = getFlexibleValue(s, ['alamat', 'Alamat', 'ALAMAT']);
    const kelurahan = getFlexibleValue(s, ['kelurahan', 'Kelurahan', 'KELURAHAN']);
    const kecamatan = getFlexibleValue(s, ['kecamatan', 'Kecamatan', 'KECAMATAN']) || 'Cimanggis Tapos';

    normalized.push({
      idSekolah,
      namaSekolah: namaSekolah.trim(),
      namaKepsek: namaKepsek ? namaKepsek.trim() : `Kepala Sekolah ${namaSekolah.trim()}`,
      alamat: alamat.trim(),
      kelurahan: kelurahan.trim(),
      kecamatan: kecamatan.trim()
    });
  });

  return normalized;
}

export function normalizeUsersList(rawList: any[], sekolahList: Sekolah[] = INITIAL_SEKOLAH): User[] {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return INITIAL_USER;
  }

  const normalized = rawList.map((u) => {
    if (!u) return null;

    const isArrayRow = Array.isArray(u);
    if (!isArrayRow && typeof u !== 'object') return null;

    // Kolom A: Username (bisa dari index 0 atau properti object)
    const username = String(
      isArrayRow 
        ? (u[0] || '') 
        : (getFlexibleValue(u, ['Username', 'User Name', 'User', 'ID Sekolah', 'ID', 'Kolom A']) || (u._rawRow ? u._rawRow[0] : '') || '')
    ).trim();
    if (!username) return null;

    // Kolom B: Password
    const password = String(
      isArrayRow 
        ? (u[1] || '123') 
        : (getFlexibleValue(u, ['Password', 'Pass', 'Kolom B']) || (u._rawRow ? u._rawRow[1] : '') || '123')
    ).trim();

    // Kolom C: ROLE (Kolom C di Sheet User)
    const rawRole = String(
      isArrayRow 
        ? (u[2] || '') 
        : (getFlexibleValue(u, ['Role', 'ROLE', 'Peran', 'Jabatan', 'Status', 'Kolom C']) || (u._rawRow ? u._rawRow[2] : '') || '')
    ).trim().toLowerCase();

    let role: UserRole = 'Sekolah';
    if (rawRole === 'admin' || rawRole.includes('admin')) {
      role = 'Admin';
    } else if (rawRole === 'bendahara' || rawRole.includes('bendahara')) {
      role = 'Bendahara';
    } else if (rawRole === 'ketua' || rawRole.includes('ketua')) {
      // Jika di Kolom C terdapat tulisan "Ketua", maka role = Ketua
      role = 'Ketua';
    }

    // Periksa juga jika ada cell di baris ini yang mengandung tulisan "ketua" (misal susunan kolom bergeser di spreadsheet pengguna)
    if (role === 'Sekolah') {
      const allRowValues = [
        ...Object.values(u).map(v => String(v || '').trim().toLowerCase()),
        ...(u._rawRow && Array.isArray(u._rawRow) ? u._rawRow.map((v: any) => String(v || '').trim().toLowerCase()) : [])
      ];
      if (allRowValues.some(v => v === 'ketua' || v === 'ketua mkks' || v.startsWith('ketua '))) {
        role = 'Ketua';
      }
    }

    // Kolom D: Sekolah / Nama Sekolah
    let sekolah = String(
      isArrayRow 
        ? (u[3] || '') 
        : (getFlexibleValue(u, ['Sekolah', 'Nama Sekolah', 'namaSekolah', 'Instansi', 'Kolom D']) || (u._rawRow ? u._rawRow[3] : '') || '')
    ).trim();

    // Kolom E: Aktif
    const rawAktif = isArrayRow 
      ? u[4] 
      : (getFlexibleValue(u, ['Aktif', 'Status Aktif', 'Kolom E']) || (u._rawRow ? u._rawRow[4] : ''));
    const aktif = rawAktif !== undefined && rawAktif !== null && rawAktif !== '' ? rawAktif : 'Ya';

    // Kolom F: Nama Kepsek / Nama Kepala Sekolah
    let namaKepsek = String(
      isArrayRow 
        ? (u[5] || '') 
        : (getFlexibleValue(u, ['Nama Kepsek', 'Nama Kepala Sekolah', 'Kepala Sekolah', 'Nama Lengkap', 'namaLengkap', 'Nama Petugas', 'Kepsek', 'Nama', 'Kolom F']) || (u._rawRow ? u._rawRow[5] : '') || '')
    ).trim();

    // Jika belum ada namaKepsek atau hanya terisi username, cari dari daftar sekolah (sekolahList) berdasarkan ID Sekolah / Username atau Nama Sekolah
    if (!namaKepsek || namaKepsek.toLowerCase() === username.toLowerCase()) {
      if (sekolahList && sekolahList.length > 0) {
        const matchById = sekolahList.find(s => s.idSekolah && s.idSekolah.toLowerCase().trim() === username.toLowerCase().trim());
        if (matchById && matchById.namaKepsek) {
          namaKepsek = matchById.namaKepsek;
          if (!sekolah) sekolah = matchById.namaSekolah;
        } else if (sekolah) {
          const matchByName = sekolahList.find(s => s.namaSekolah && s.namaSekolah.toLowerCase().trim() === sekolah.toLowerCase().trim());
          if (matchByName && matchByName.namaKepsek) {
            namaKepsek = matchByName.namaKepsek;
          }
        }
      }
    }

    if (role === 'Sekolah') {
      // Primary Key Lock: ID Sekolah = username
      const matchById = sekolahList.find(s => s.idSekolah === username);
      if (matchById) {
        sekolah = matchById.namaSekolah;
        if (!namaKepsek) namaKepsek = matchById.namaKepsek;
      } else if (!sekolah) {
        const matchByName = sekolahList.find(s => s.namaSekolah.toLowerCase().trim() === username.toLowerCase().trim());
        if (matchByName) {
          sekolah = matchByName.namaSekolah;
          if (!namaKepsek) namaKepsek = matchByName.namaKepsek;
        }
      }
    }

    return {
      username,
      password,
      role: role as UserRole,
      sekolah,
      aktif,
      namaKepsek
    } as User;
  }).filter((u): u is User => u !== null);

  return normalized.length > 0 ? normalized : INITIAL_USER;
}

export function normalizeIuranList(rawList: any[], sekolahList: Sekolah[] = INITIAL_SEKOLAH): Iuran[] {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((i, idx) => {
    if (!i || typeof i !== 'object') return null;

    let idSekolah = String(i.idSekolah || i['ID Sekolah'] || i['Id Sekolah'] || i.id_sekolah || '').trim();
    let namaSekolah = String(i.namaSekolah || i['Nama Sekolah'] || i.nama_sekolah || i.sekolah || i.Sekolah || '').trim();

    if (sekolahList && sekolahList.length > 0) {
      // Primary Key Lock: Match by ID Sekolah first!
      let match: Sekolah | undefined = undefined;
      if (idSekolah) {
        match = sekolahList.find(s => s.idSekolah === idSekolah);
      }
      if (!match && namaSekolah) {
        // Fallback: Exact name match ONLY (never substring includes)
        match = sekolahList.find(s => s.namaSekolah.toLowerCase().trim() === namaSekolah.toLowerCase().trim());
      }
      if (match) {
        idSekolah = match.idSekolah;
        namaSekolah = match.namaSekolah;
      }
    }

    const tahun = Number(i.tahun || i.Tahun || 2026);
    const bulan = String(i.bulan || i.Bulan || '').trim();
    const nominalRaw = i.nominal !== undefined ? i.nominal : (i.Nominal !== undefined ? i.Nominal : (i.jumlah || i.Jumlah));
    const nominal = Number(nominalRaw) || 100000;
    const rawTgl = String(i.tanggalInput || i['Tanggal Input'] || i.tanggal || i.Tanggal || '').trim();
    const tanggalInput = rawTgl ? cleanDateInputString(rawTgl).split(' ')[0] : new Date().toISOString().split('T')[0];
    const diinputOleh = String(i.diinputOleh || i['Diinput Oleh'] || i.operator || 'Bendahara MKKS Citos').trim();
    const noKuitansi = String(i.noKuitansi || i['No Kuitansi'] || i.kuitansi || `KWT/MKKS/${tahun}/${idSekolah}`).trim();
    const keteranganRaw = i.keterangan || i.Keterangan || i['Keterangan'] || i['Keterangan / Tempat Terima'] || i['Tempat Terima'] || i.catatan || i.Catatan || '';
    const keterangan = String(keteranganRaw || '').trim();
    const id = String(i.id || i.ID || `IUR-${tahun}-${idx + 1}`).trim();

    if (!bulan || (!idSekolah && !namaSekolah)) return null;

    return {
      id,
      tahun,
      bulan,
      idSekolah,
      namaSekolah,
      nominal,
      tanggalInput,
      diinputOleh,
      noKuitansi,
      keterangan: keterangan || undefined
    } as Iuran;
  }).filter((item): item is Iuran => item !== null);
}

export function normalizePengeluaranList(rawList: any[]): Pengeluaran[] {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((p, idx) => {
    if (!p || typeof p !== 'object') return null;

    const id = String(p.id || p.ID || p.No || `OUT-${idx + 1}`).trim();
    
    // Find tanggal flexibly
    const tanggalRaw = p.tanggal || p.Tanggal || p['Tanggal Transaksi'] || p['Tanggal Input'] || p['Tgl'] || p['TGL'] || '';
    const tanggal = tanggalRaw ? cleanDateInputString(String(tanggalRaw)).split(' ')[0] : new Date().toISOString().split('T')[0];

    // Find project flexibly
    const project = String(
      p.project || p.Project || p.kegiatan || p.Kegiatan || 
      p['Alokasi Project / Kegiatan'] || p['Kegiatan / Project'] || p['Alokasi Project'] || p['Nama Kegiatan'] || ''
    ).trim();

    // Find keterangan flexibly
    const keterangan = String(
      p.keterangan || p.Keterangan || p.deskripsi || p.Deskripsi || 
      p['Keterangan Tambahan'] || p['Catatan'] || '-'
    ).trim();

    // Find nominal flexibly
    let nominalRaw = p.nominal ?? p.Nominal ?? p.jumlah ?? p.Jumlah ?? 
                     p['Jumlah Nominal (Rp)'] ?? p['Nominal (Rp)'] ?? p['Jumlah Nominal'] ?? p['JUMLAH'];
    
    if (typeof nominalRaw === 'string') {
      nominalRaw = nominalRaw.replace(/[^0-9]/g, '');
    }
    const nominal = Number(nominalRaw) || 0;

    // Find diinputOleh flexibly
    const diinputOleh = String(
      p.diinputOleh || p['Diinput Oleh'] || p.Petugas || p.Operator || 'Bendahara MKKS'
    ).trim();

    if (!project && (!keterangan || keterangan === '-') && nominal === 0) return null;

    return {
      id,
      tanggal,
      project,
      keterangan,
      nominal,
      diinputOleh
    };
  }).filter((item): item is Pengeluaran => item !== null);
}

export function normalizePemasukanLainList(rawList: any[]): PemasukanLain[] {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((p, idx) => {
    if (!p || typeof p !== 'object') return null;

    const id = String(p.id || p.ID || p.No || `IN-LAIN-${idx + 1}`).trim();
    
    // Find tanggal flexibly
    const tanggalRaw = p.tanggal || p.Tanggal || p['Tanggal Transaksi'] || p['Tanggal Input'] || p['Tgl'] || p['TGL'] || '';
    const tanggal = tanggalRaw ? cleanDateInputString(String(tanggalRaw)).split(' ')[0] : new Date().toISOString().split('T')[0];

    // Find kategori flexibly
    const kategori = String(
      p.kategori || p.Kategori || p['Kategori Pemasukan'] || p['Jenis Pemasukan'] || p.jenis || 'Pemasukan Lain-lain'
    ).trim();

    // Find sumberDana / nama pihak pemberi flexibly
    const sumberDana = String(
      p.sumberDana || p.sumber || p.Sumber || p['Sumber Dana'] || p['Sumber Dana / Pihak Terkait'] || 
      p['Dari'] || p['Diterima Dari'] || p['Nama Pihak'] || p['Pihak Terkait'] || p['Instansi'] || '-'
    ).trim();

    // Find keterangan flexibly
    const keterangan = String(
      p.keterangan || p.Keterangan || p.deskripsi || p.Deskripsi || 
      p['Keterangan Tambahan'] || p['Catatan'] || '-'
    ).trim();

    // Find nominal flexibly
    let nominalRaw = p.nominal ?? p.Nominal ?? p.jumlah ?? p.Jumlah ?? 
                     p['Jumlah Nominal (Rp)'] ?? p['Nominal (Rp)'] ?? p['Jumlah Nominal'] ?? p['JUMLAH'];
    
    if (typeof nominalRaw === 'string') {
      nominalRaw = nominalRaw.replace(/[^0-9]/g, '');
    }
    const nominal = Number(nominalRaw) || 0;

    // Find diinputOleh flexibly
    const diinputOleh = String(
      p.diinputOleh || p['Diinput Oleh'] || p.Petugas || p.Operator || 'Bendahara MKKS Citos'
    ).trim();

    // Find noKuitansi flexibly
    const noKuitansi = String(
      p.noKuitansi || p['No Kuitansi'] || p['No. Kuitansi'] || p.kuitansi || ''
    ).trim();

    if (!sumberDana && (!keterangan || keterangan === '-') && nominal === 0) return null;

    const result: PemasukanLain = {
      id,
      tanggal,
      kategori,
      sumberDana: sumberDana || 'Pihak Ketiga / Donatur',
      keterangan,
      nominal,
      diinputOleh,
      noKuitansi: noKuitansi || undefined
    };
    return result;
  }).filter((item): item is PemasukanLain => item !== null);
}

export function normalizeRiwayatHapusList(rawList: any[]): RiwayatHapus[] {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((r, idx) => {
    if (!r || typeof r !== 'object') return null;

    const id = String(r.id || r.ID || `DEL-${idx + 1}`).trim();
    const idTransaksi = String(r.idTransaksi || r['ID Transaksi'] || r.id_transaksi || `TX-${idx + 1}`).trim();
    const jenisTransaksi = (r.jenisTransaksi || r['Jenis Transaksi'] || r.jenis || 'Iuran') as any;
    const rincianData = String(r.rincianData || r['Rincian Data'] || r.rincian || r.keterangan || '-').trim();
    
    let nominalRaw = r.nominal ?? r.Nominal ?? r['Jumlah Nominal (Rp)'] ?? r['Nominal (Rp)'] ?? r.jumlah ?? 0;
    if (typeof nominalRaw === 'string') {
      nominalRaw = nominalRaw.replace(/[^0-9]/g, '');
    }
    const nominal = Number(nominalRaw) || 0;

    const rawTglHapus = r.tanggalHapus || r['Tanggal Hapus'] || r['Waktu Penghapusan'] || '';
    const tanggalHapus = rawTglHapus ? cleanDateInputString(String(rawTglHapus)) : cleanDateInputString(new Date().toISOString());
    const dihapusOleh = String(r.dihapusOleh || r['Dihapus Oleh'] || r.petugas || 'Bendahara MKKS').trim();
    const roleUser = String(r.roleUser || r['Role User'] || r.role || 'Bendahara').trim();
    const alasanHapus = String(r.alasanHapus || r['Alasan Hapus'] || r['Keterangan Hapus'] || r.alasan || 'Koreksi Data').trim();
    const noKuitansi = String(r.noKuitansi || r['No Kuitansi'] || '').trim() || undefined;
    const rawTglAsli = r.tanggalTransaksiAsli || r['Tanggal Transaksi Asli'] || '';
    const tanggalTransaksiAsli = rawTglAsli ? cleanDateInputString(String(rawTglAsli)).split(' ')[0] : undefined;

    return {
      id,
      idTransaksi,
      jenisTransaksi,
      rincianData,
      dataOriginal: r.dataOriginal || null,
      nominal,
      tanggalHapus,
      dihapusOleh,
      roleUser,
      alasanHapus,
      noKuitansi,
      tanggalTransaksiAsli,
      // aliases for UI consumption
      judul: rincianData,
      judulItem: rincianData,
      alasan: alasanHapus,
      role: roleUser,
      rolePenghapus: roleUser,
      jenis: jenisTransaksi.toLowerCase().includes('iuran') && !jenisTransaksi.toLowerCase().includes('non')
        ? 'iuran'
        : jenisTransaksi.toLowerCase().includes('pengeluaran') || jenisTransaksi.toLowerCase().includes('keluar')
        ? 'pengeluaran'
        : 'pemasukan-lain'
    } as RiwayatHapus;
  }).filter((item): item is RiwayatHapus => item !== null);
}

export function normalizeRekonsiliasiKasList(rawList: any[]): RekonsiliasiKas[] {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((r, idx) => {
    if (!r || typeof r !== 'object') return null;

    const id = String(r.id || r['ID Audit'] || r.idAudit || r.ID || `AUDIT-${r.tahun || r.Tahun || 2026}-${idx + 1}`).trim();
    const tahun = Number(r.tahun || r.Tahun || 2026);
    const rawTglAudit = r.tanggalAudit || r['Tanggal Audit'] || r.tanggal || '';
    const tanggalAudit = rawTglAudit ? cleanDateInputString(String(rawTglAudit)) : cleanDateInputString(new Date().toISOString());
    
    let cashRaw = r.saldoCash ?? r['Saldo Cash Fisik (Rp)'] ?? r.cash ?? r['Saldo Cash'] ?? r['Uang Cash'] ?? 0;
    if (typeof cashRaw === 'string') cashRaw = cashRaw.replace(/[^0-9]/g, '');
    const saldoCash = Number(cashRaw) || 0;

    let bankRaw = r.saldoBank ?? r['Saldo Rekening Bank (Rp)'] ?? r.bank ?? r['Saldo Bank'] ?? r['Uang di Rekening'] ?? 0;
    if (typeof bankRaw === 'string') bankRaw = bankRaw.replace(/[^0-9]/g, '');
    const saldoBank = Number(bankRaw) || 0;

    const namaBank = String(r.namaBank || r['Nama Bank'] || r.bankName || 'Bank DKI').trim();
    const nomorRekening = String(r.nomorRekening || r['Nomor Rekening'] || r.noRekening || '102.23.09876.1').trim();
    const atasNamaRekening = String(r.atasNamaRekening || r['Atas Nama Rekening'] || r['Atas Nama'] || 'MKKS SMP CITOS').trim();
    const catatanAudit = String(r.catatanAudit || r['Catatan Temuan Audit'] || r['Catatan Audit'] || r.catatan || r.keterangan || '').trim();
    const diauditOleh = String(r.diauditOleh || r['Diaudit Oleh'] || r.auditor || 'Bendahara MKKS Citos').trim();

    const rawNamaKetua = r.namaKetuaMkks || r['Nama Ketua MKKS'] || r.ketuaMkks || r.ketua || '';
    const namaKetuaMkks = rawNamaKetua ? String(rawNamaKetua).trim() : DEFAULT_PEJABAT.namaKetuaMkks;
    const rawNipKetua = r.nipKetuaMkks || r['NIP Ketua MKKS'] || r.nipKetua || '';
    const nipKetuaMkks = rawNipKetua ? String(rawNipKetua).trim() : DEFAULT_PEJABAT.nipKetuaMkks;
    const rawJabatanKetua = r.jabatanKetuaMkks || r['Jabatan Ketua MKKS'] || r.jabatanKetua || '';
    const jabatanKetuaMkks = rawJabatanKetua ? String(rawJabatanKetua).trim() : DEFAULT_PEJABAT.jabatanKetuaMkks;

    const rawNamaBendahara = r.namaBendahara || r['Nama Bendahara'] || '';
    const namaBendahara = rawNamaBendahara ? String(rawNamaBendahara).trim() : undefined;
    const rawNipBendahara = r.nipBendahara || r['NIP Bendahara'] || '';
    const nipBendahara = rawNipBendahara ? String(rawNipBendahara).trim() : undefined;
    const rawJabatanBendahara = r.jabatanBendahara || r['Jabatan Bendahara'] || '';
    const jabatanBendahara = rawJabatanBendahara ? String(rawJabatanBendahara).trim() : DEFAULT_PEJABAT.jabatanBendahara;

    let pecahanCash = r.pecahanCash;
    const rawPecahanStr = r['Rincian Pecahan Cash (JSON)'] || r.pecahan;
    if (!pecahanCash && rawPecahanStr) {
      if (typeof rawPecahanStr === 'object') {
        pecahanCash = rawPecahanStr;
      } else if (typeof rawPecahanStr === 'string' && rawPecahanStr.trim().startsWith('{')) {
        try {
          pecahanCash = JSON.parse(rawPecahanStr);
        } catch {
          // ignore parsing error
        }
      }
    }

    return {
      id,
      tahun,
      tanggalAudit,
      saldoCash,
      saldoBank,
      namaBank,
      nomorRekening,
      atasNamaRekening,
      catatanAudit,
      diauditOleh,
      namaKetuaMkks,
      nipKetuaMkks,
      jabatanKetuaMkks,
      namaBendahara,
      nipBendahara,
      jabatanBendahara,
      pecahanCash: pecahanCash || undefined
    } as RekonsiliasiKas;
  }).filter((item): item is RekonsiliasiKas => item !== null);
}

export class StorageService {
  public static getSpreadsheetId(): string {
    return localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID) || DEFAULT_SPREADSHEET_ID;
  }

  public static setSpreadsheetId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, id);
  }

  public static sanitizeUrl(url: string): string {
    if (!url) return '';
    let cleaned = url.trim().replace(/^['"]|['"]$/g, '');
    const scriptIdx = cleaned.indexOf('script.google.com');
    if (scriptIdx !== -1) {
      return 'https://' + cleaned.substring(scriptIdx);
    }
    if (cleaned.startsWith('https://') || cleaned.startsWith('http://')) {
      return cleaned;
    }
    cleaned = cleaned.replace(/^[a-zA-Z]+:\/*/, 'https://');
    if (cleaned.includes('script.google.com')) {
      return cleaned;
    }
    return '';
  }

  public static getAppsScriptUrl(): string {
    const stored = localStorage.getItem(STORAGE_KEYS.APPS_SCRIPT_URL);
    if (!stored) {
      return DEFAULT_APPS_SCRIPT_URL;
    }
    const clean = this.sanitizeUrl(stored);
    return clean || DEFAULT_APPS_SCRIPT_URL;
  }

  public static setAppsScriptUrl(url: string): void {
    const clean = this.sanitizeUrl(url);
    localStorage.setItem(STORAGE_KEYS.APPS_SCRIPT_URL, clean);
  }

  // Load Data
  public static getSekolah(): Sekolah[] {
    const data = localStorage.getItem(STORAGE_KEYS.SEKOLAH);
    if (!data) {
      return INITIAL_SEKOLAH;
    }
    try {
      const parsed = JSON.parse(data);
      return normalizeSekolahList(parsed);
    } catch {
      return INITIAL_SEKOLAH;
    }
  }

  public static saveSekolah(sekolahList: Sekolah[]): void {
    const normalized = normalizeSekolahList(sekolahList);
    localStorage.setItem(STORAGE_KEYS.SEKOLAH, JSON.stringify(normalized));
  }

  public static getUsers(): User[] {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    const sekolahList = this.getSekolah();
    if (!data) {
      const normalized = normalizeUsersList(INITIAL_USER, sekolahList);
      this.saveUsers(normalized);
      return normalized;
    }
    try {
      const parsed = JSON.parse(data);
      return normalizeUsersList(parsed, sekolahList);
    } catch {
      return INITIAL_USER;
    }
  }

  public static saveUsers(users: User[]): void {
    const sekolahList = this.getSekolah();
    const normalized = normalizeUsersList(users, sekolahList);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(normalized));
  }

  public static getIuran(): Iuran[] {
    const data = localStorage.getItem(STORAGE_KEYS.IURAN);
    const sekolahList = this.getSekolah();
    if (!data) {
      const normalized = normalizeIuranList(INITIAL_IURAN, sekolahList);
      this.saveIuran(normalized, false);
      return normalized;
    }
    try {
      const parsed = JSON.parse(data);
      return normalizeIuranList(parsed, sekolahList);
    } catch {
      return INITIAL_IURAN;
    }
  }

  public static saveIuran(iuranList: Iuran[], syncToRemote = true): void {
    const sekolahList = this.getSekolah();
    const normalized = normalizeIuranList(iuranList, sekolahList);
    localStorage.setItem(STORAGE_KEYS.IURAN, JSON.stringify(normalized));
    if (syncToRemote) {
      this.syncToAppsScript();
    }
  }

  public static getPengeluaran(): Pengeluaran[] {
    const data = localStorage.getItem(STORAGE_KEYS.PENGELUARAN);
    if (!data) {
      const normalized = normalizePengeluaranList(INITIAL_PENGELUARAN);
      this.savePengeluaran(normalized, false);
      return normalized;
    }
    try {
      const parsed = JSON.parse(data);
      return normalizePengeluaranList(parsed);
    } catch {
      return INITIAL_PENGELUARAN;
    }
  }

  public static savePengeluaran(pengeluaranList: Pengeluaran[], syncToRemote = true): void {
    const normalized = normalizePengeluaranList(pengeluaranList);
    localStorage.setItem(STORAGE_KEYS.PENGELUARAN, JSON.stringify(normalized));
    if (syncToRemote) {
      this.syncToAppsScript();
    }
  }

  public static getPemasukanLain(): PemasukanLain[] {
    const data = localStorage.getItem(STORAGE_KEYS.PEMASUKAN_LAIN);
    if (!data) {
      const normalized = normalizePemasukanLainList(INITIAL_PEMASUKAN_LAIN);
      this.savePemasukanLain(normalized, false);
      return normalized;
    }
    try {
      const parsed = JSON.parse(data);
      return normalizePemasukanLainList(parsed);
    } catch {
      return INITIAL_PEMASUKAN_LAIN;
    }
  }

  public static savePemasukanLain(pemasukanLainList: PemasukanLain[], syncToRemote = true): void {
    const normalized = normalizePemasukanLainList(pemasukanLainList);
    localStorage.setItem(STORAGE_KEYS.PEMASUKAN_LAIN, JSON.stringify(normalized));
    if (syncToRemote) {
      this.syncToAppsScript();
    }
  }

  // Riwayat Hapus
  public static getRiwayatHapus(): RiwayatHapus[] {
    const data = localStorage.getItem(STORAGE_KEYS.RIWAYAT_HAPUS);
    if (!data) {
      const normalized = normalizeRiwayatHapusList(INITIAL_RIWAYAT_HAPUS);
      this.saveRiwayatHapus(normalized, false);
      return normalized;
    }
    try {
      const parsed = JSON.parse(data);
      return normalizeRiwayatHapusList(parsed);
    } catch {
      return INITIAL_RIWAYAT_HAPUS;
    }
  }

  public static saveRiwayatHapus(riwayatList: RiwayatHapus[], syncToRemote = true): void {
    const normalized = normalizeRiwayatHapusList(riwayatList);
    localStorage.setItem(STORAGE_KEYS.RIWAYAT_HAPUS, JSON.stringify(normalized));
    if (syncToRemote) {
      this.syncToAppsScript();
    }
  }

  public static addRiwayatHapus(item: RiwayatHapus): RiwayatHapus[] {
    const current = this.getRiwayatHapus();
    const updated = [item, ...current];
    this.saveRiwayatHapus(updated, true);
    return updated;
  }

  // Rekonsiliasi & Audit Kas (Real vs Data)
  public static getRekonsiliasiKas(): RekonsiliasiKas[] {
    const data = localStorage.getItem(STORAGE_KEYS.REKONSILIASI_KAS);
    if (!data) {
      const normalized = normalizeRekonsiliasiKasList(INITIAL_REKONSILIASI_KAS);
      this.saveRekonsiliasiKas(normalized, false);
      return normalized;
    }
    try {
      const parsed = JSON.parse(data);
      return normalizeRekonsiliasiKasList(parsed);
    } catch {
      return INITIAL_REKONSILIASI_KAS;
    }
  }

  public static saveRekonsiliasiKas(list: RekonsiliasiKas[], syncToRemote = true): void {
    const normalized = normalizeRekonsiliasiKasList(list);
    localStorage.setItem(STORAGE_KEYS.REKONSILIASI_KAS, JSON.stringify(normalized));
    if (syncToRemote) {
      this.syncToAppsScript();
    }
  }

  public static saveSingleRekonsiliasi(record: RekonsiliasiKas): RekonsiliasiKas[] {
    const current = this.getRekonsiliasiKas();
    const filtered = current.filter(r => r.tahun !== record.tahun);
    const updated = [record, ...filtered];
    this.saveRekonsiliasiKas(updated, true);
    return updated;
  }

  // Get user with role Ketua from sheet User
  public static getKetuaUser(usersOverride?: User[]): User | undefined {
    const users = usersOverride && usersOverride.length > 0 ? usersOverride : this.getUsers();
    return users.find(u => {
      const r = (u.role || '').toLowerCase().trim();
      const a = String(u.aktif || '').toLowerCase().trim();
      const isKetuaRole = r === 'ketua' || r.includes('ketua');
      const isAktif = a === 'ya' || a === 'true' || a === '1' || a === '' || a === 'aktif';
      return isKetuaRole && isAktif;
    }) || users.find(u => {
      const r = (u.role || '').toLowerCase().trim();
      return r === 'ketua' || r.includes('ketua');
    });
  }

  // Pejabat Penandatangan Organisasi (Ketua MKKS & Bendahara)
  public static getPejabat(usersOverride?: User[]): PejabatPenandatangan {
    const ketuaUser = this.getKetuaUser(usersOverride);
    const currentUser = this.getCurrentUser();

    const dynamicDefault: PejabatPenandatangan = {
      namaKetuaMkks: ketuaUser?.namaKepsek || DEFAULT_PEJABAT.namaKetuaMkks,
      nipKetuaMkks: DEFAULT_PEJABAT.nipKetuaMkks,
      jabatanKetuaMkks: DEFAULT_PEJABAT.jabatanKetuaMkks,
      namaBendahara: (currentUser && (currentUser.role === 'Bendahara' || currentUser.role === 'Admin') && currentUser.namaKepsek)
        ? currentUser.namaKepsek
        : DEFAULT_PEJABAT.namaBendahara,
      nipBendahara: DEFAULT_PEJABAT.nipBendahara,
      jabatanBendahara: DEFAULT_PEJABAT.jabatanBendahara
    };

    const data = localStorage.getItem(STORAGE_KEYS.PEJABAT);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        // Otomatis deteksi Role: "Ketua" dari sheet User jika ada
        if (ketuaUser?.namaKepsek) {
          parsed.namaKetuaMkks = ketuaUser.namaKepsek;
        }
        // If saved namaBendahara is empty or old placeholder "H. Nurhasan...", automatically take active login account
        const isOldBendaharaPlaceholder = 
          !parsed.namaBendahara ||
          parsed.namaBendahara === 'H. Nurhasan, M.Pd' ||
          parsed.namaBendahara === 'H. Nurhasan, M.Pd (Bendahara)' ||
          parsed.namaBendahara === 'Bendahara MKKS Citos' ||
          parsed.namaBendahara === 'Bendahara MKKS';

        if (isOldBendaharaPlaceholder && dynamicDefault.namaBendahara) {
          parsed.namaBendahara = dynamicDefault.namaBendahara;
        }
        return { ...dynamicDefault, ...parsed };
      } catch {
        return dynamicDefault;
      }
    }
    return dynamicDefault;
  }

  public static savePejabat(pejabat: Partial<PejabatPenandatangan>): PejabatPenandatangan {
    const current = this.getPejabat();
    const updated: PejabatPenandatangan = {
      namaKetuaMkks: (pejabat.namaKetuaMkks !== undefined ? pejabat.namaKetuaMkks : current.namaKetuaMkks).trim(),
      nipKetuaMkks: (pejabat.nipKetuaMkks !== undefined ? pejabat.nipKetuaMkks : current.nipKetuaMkks).trim(),
      jabatanKetuaMkks: (pejabat.jabatanKetuaMkks !== undefined ? pejabat.jabatanKetuaMkks : current.jabatanKetuaMkks).trim(),
      namaBendahara: (pejabat.namaBendahara !== undefined ? pejabat.namaBendahara : current.namaBendahara).trim(),
      nipBendahara: (pejabat.nipBendahara !== undefined ? pejabat.nipBendahara : current.nipBendahara).trim(),
      jabatanBendahara: (pejabat.jabatanBendahara !== undefined ? pejabat.jabatanBendahara : current.jabatanBendahara).trim(),
    };
    localStorage.setItem(STORAGE_KEYS.PEJABAT, JSON.stringify(updated));
    return updated;
  }

  // Current logged in user
  public static getCurrentUser(): User | null {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!data) {
      return null;
    }
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  public static setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  // Reset to Default Seed Data
  public static resetToDefault(): void {
    this.saveSekolah(INITIAL_SEKOLAH);
    this.saveUsers(INITIAL_USER);
    this.saveIuran(INITIAL_IURAN, false);
    this.savePengeluaran(INITIAL_PENGELUARAN, false);
    this.savePemasukanLain(INITIAL_PEMASUKAN_LAIN, false);
    this.saveRiwayatHapus(INITIAL_RIWAYAT_HAPUS, false);
    this.saveRekonsiliasiKas(INITIAL_REKONSILIASI_KAS, false);
    this.setSpreadsheetId(DEFAULT_SPREADSHEET_ID);
    this.setAppsScriptUrl(DEFAULT_APPS_SCRIPT_URL);
    this.setCurrentUser(INITIAL_USER[0]);
  }

  // Background Sync to Apps Script (if URL configured)
  public static async syncToAppsScript(): Promise<SyncStatus> {
    const url = this.getAppsScriptUrl();
    if (!url) {
      return {
        lastSynced: new Date().toLocaleTimeString('id-ID'),
        status: 'offline',
        message: 'Aplikasi tersimpan secara lokal. Masukkan URL Google Apps Script di modal Database untuk sinkronisasi ke Google Sheet.'
      };
    }

    const rawIuran = this.getIuran();
    const rawPengeluaran = this.getPengeluaran();
    const rawPemasukanLain = this.getPemasukanLain();

    // Format payload with both Title Case (for Sheet columns) and camelCase
    const formattedIuran = rawIuran.map(item => ({
      'Tahun': item.tahun,
      'Bulan': item.bulan,
      'ID Sekolah': item.idSekolah,
      'Nama Sekolah': item.namaSekolah,
      'Nominal': item.nominal,
      'Keterangan / Tempat Terima': item.keterangan || '',
      'Tanggal Input': item.tanggalInput,
      'Diinput Oleh': item.diinputOleh,
      'No Kuitansi': item.noKuitansi,
      tahun: item.tahun,
      bulan: item.bulan,
      idSekolah: item.idSekolah,
      namaSekolah: item.namaSekolah,
      nominal: item.nominal,
      keterangan: item.keterangan || '',
      tanggalInput: item.tanggalInput,
      diinputOleh: item.diinputOleh,
      noKuitansi: item.noKuitansi,
      id: item.id
    }));

    const formattedPengeluaran = rawPengeluaran.map(item => ({
      'No': item.id,
      'Tanggal Transaksi': item.tanggal,
      'Alokasi Project / Kegiatan': item.project,
      'Keterangan Tambahan': item.keterangan,
      'Jumlah Nominal (Rp)': item.nominal,
      'Diinput Oleh': item.diinputOleh,
      id: item.id,
      tanggal: item.tanggal,
      project: item.project,
      keterangan: item.keterangan,
      nominal: item.nominal,
      diinputOleh: item.diinputOleh
    }));

    const formattedPemasukanLain = rawPemasukanLain.map(item => ({
      'No': item.id,
      'Tanggal Transaksi': item.tanggal,
      'Kategori': item.kategori,
      'Sumber Dana / Pihak Terkait': item.sumberDana,
      'Keterangan Tambahan': item.keterangan,
      'Jumlah Nominal (Rp)': item.nominal,
      'Diinput Oleh': item.diinputOleh,
      'No Kuitansi': item.noKuitansi || '',
      id: item.id,
      tanggal: item.tanggal,
      kategori: item.kategori,
      sumberDana: item.sumberDana,
      keterangan: item.keterangan,
      nominal: item.nominal,
      diinputOleh: item.diinputOleh,
      noKuitansi: item.noKuitansi
    }));

    const rawRiwayatHapus = this.getRiwayatHapus();
    const formattedRiwayatHapus = rawRiwayatHapus.map(item => ({
      'ID Log': item.id,
      'ID Transaksi Asli': item.idTransaksi,
      'Jenis Transaksi': item.jenisTransaksi,
      'Rincian Data': item.rincianData,
      'Jumlah Nominal (Rp)': item.nominal,
      'Waktu Penghapusan': item.tanggalHapus,
      'Dihapus Oleh': item.dihapusOleh,
      'Role User': item.roleUser,
      'Alasan Penghapusan': item.alasanHapus,
      'No Kuitansi': item.noKuitansi || '',
      'Tanggal Transaksi Asli': item.tanggalTransaksiAsli || '',
      id: item.id,
      idTransaksi: item.idTransaksi,
      jenisTransaksi: item.jenisTransaksi,
      rincianData: item.rincianData,
      nominal: item.nominal,
      tanggalHapus: item.tanggalHapus,
      dihapusOleh: item.dihapusOleh,
      roleUser: item.roleUser,
      alasanHapus: item.alasanHapus,
      noKuitansi: item.noKuitansi,
      tanggalTransaksiAsli: item.tanggalTransaksiAsli
    }));

    const rawRekonsiliasiKas = this.getRekonsiliasiKas();
    const formattedRekonsiliasiKas = rawRekonsiliasiKas.map(item => ({
      'ID Audit': item.id,
      'Tahun': item.tahun,
      'Tanggal Audit': item.tanggalAudit,
      'Saldo Cash Fisik (Rp)': item.saldoCash,
      'Saldo Rekening Bank (Rp)': item.saldoBank,
      'Nama Bank': item.namaBank || 'Bank DKI',
      'Nomor Rekening': item.nomorRekening || '',
      'Atas Nama Rekening': item.atasNamaRekening || '',
      'Catatan Temuan Audit': item.catatanAudit || '',
      'Diaudit Oleh': item.diauditOleh || 'Bendahara MKKS',
      'Nama Ketua MKKS': item.namaKetuaMkks || '',
      'NIP Ketua MKKS': item.nipKetuaMkks || '',
      'Jabatan Ketua MKKS': item.jabatanKetuaMkks || '',
      'Nama Bendahara': item.namaBendahara || '',
      'NIP Bendahara': item.nipBendahara || '',
      'Jabatan Bendahara': item.jabatanBendahara || '',
      'Rincian Pecahan Cash (JSON)': item.pecahanCash ? JSON.stringify(item.pecahanCash) : '',
      id: item.id,
      tahun: item.tahun,
      tanggalAudit: item.tanggalAudit,
      saldoCash: item.saldoCash,
      saldoBank: item.saldoBank,
      namaBank: item.namaBank,
      nomorRekening: item.nomorRekening,
      atasNamaRekening: item.atasNamaRekening,
      catatanAudit: item.catatanAudit,
      diauditOleh: item.diauditOleh,
      namaKetuaMkks: item.namaKetuaMkks,
      nipKetuaMkks: item.nipKetuaMkks,
      jabatanKetuaMkks: item.jabatanKetuaMkks,
      namaBendahara: item.namaBendahara,
      nipBendahara: item.nipBendahara,
      jabatanBendahara: item.jabatanBendahara,
      pecahanCash: item.pecahanCash
    }));

    const payload = {
      action: 'syncAll',
      spreadsheetId: this.getSpreadsheetId(),
      sekolah: this.getSekolah(),
      users: this.getUsers(),
      iuran: formattedIuran,
      pengeluaran: formattedPengeluaran,
      pemasukanLain: formattedPemasukanLain,
      riwayatHapus: formattedRiwayatHapus,
      rekonsiliasiKas: formattedRekonsiliasiKas
    };

    let data: any = null;
    let syncSuccess = false;

    // 1. Try Express Backend Proxy
    try {
      const res = await fetch('/api/proxy-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl: url,
          payload: payload
        })
      });

      if (res.ok) {
        const text = await res.text();
        if (text && !text.startsWith('<!DOCTYPE html')) {
          try {
            data = JSON.parse(text);
            syncSuccess = true;
          } catch {
            // Not valid JSON
          }
        }
      }
    } catch {
      // Proxy failed or not available on static host
    }

    // 2. Direct client-side fetch fallback for static hosting (Netlify, Vercel, GitHub Pages)
    if (!syncSuccess || !data) {
      try {
        const directRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow'
        });

        const text = await directRes.text();
        try {
          data = JSON.parse(text);
          syncSuccess = true;
        } catch {
          if (text.includes('<!DOCTYPE html') || text.includes('<html')) {
            return {
              lastSynced: null,
              status: 'error',
              message: "Google Apps Script menolak akses. Pastikan saat Deploy -> New Deployment di Apps Script, 'Who has access' diatur ke 'Anyone' (Siapa Saja)."
            };
          }
          // Accept 200 text response as successful trigger
          data = { status: 'success' };
          syncSuccess = true;
        }
      } catch (directErr: any) {
        return {
          lastSynced: null,
          status: 'error',
          message: directErr.message || 'Gagal terhubung ke Google Apps Script. Pastikan Web App URL valid.'
        };
      }
    }

    if (data && data.status === 'error') {
      return {
        lastSynced: null,
        status: 'error',
        message: `Apps Script Error: ${data.message || 'Gagal menyimpan ke Sheet'}`
      };
    }

    return {
      lastSynced: new Date().toLocaleTimeString('id-ID'),
      status: 'connected',
      message: 'Berhasil terhubung & sinkronisasi dengan Google Spreadsheet ID ' + this.getSpreadsheetId()
    };
  }

  // Fetch Data from Apps Script
  public static async fetchFromAppsScript(): Promise<boolean> {
    const url = this.getAppsScriptUrl();
    if (!url) return false;

    let data: any = null;
    let fetchSuccess = false;

    // 1. Try Express Backend Proxy
    try {
      const fetchUrl = `/api/proxy-sheet?scriptUrl=${encodeURIComponent(url)}&action=getData&spreadsheetId=${encodeURIComponent(this.getSpreadsheetId())}`;
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const text = await res.text();
        if (text && !text.startsWith('<!DOCTYPE html')) {
          try {
            data = JSON.parse(text);
            fetchSuccess = true;
          } catch {
            // ignore non-json
          }
        }
      }
    } catch {
      // ignore
    }

    // 2. Direct client-side fetch fallback for static hosting
    if (!fetchSuccess || !data) {
      try {
        const targetUrl = new URL(url);
        targetUrl.searchParams.set('action', 'getData');
        targetUrl.searchParams.set('spreadsheetId', this.getSpreadsheetId());

        const directRes = await fetch(targetUrl.toString(), {
          method: 'GET',
          redirect: 'follow'
        });

        if (directRes.ok) {
          const text = await directRes.text();
          data = JSON.parse(text);
          fetchSuccess = true;
        }
      } catch (err) {
        console.warn('Apps Script direct fetch failed:', err);
      }
    }

    if (fetchSuccess && data) {
      if (Array.isArray(data.sekolah) && data.sekolah.length > 0) this.saveSekolah(data.sekolah);
      if (Array.isArray(data.users) && data.users.length > 0) this.saveUsers(data.users);
      if (Array.isArray(data.iuran)) this.saveIuran(data.iuran, false);
      if (Array.isArray(data.pengeluaran)) this.savePengeluaran(data.pengeluaran, false);
      if (Array.isArray(data.pemasukanLain)) this.savePemasukanLain(data.pemasukanLain, false);
      if (Array.isArray(data.riwayatHapus)) this.saveRiwayatHapus(data.riwayatHapus, false);
      
      const rekonsiliasiData = data.rekonsiliasiKas || data.rekonsiliasi || data.auditKas || data.Audit_Kas;
      if (Array.isArray(rekonsiliasiData) && rekonsiliasiData.length > 0) {
        this.saveRekonsiliasiKas(rekonsiliasiData, false);
      }
      return true;
    }

    return false;
  }
}

/**
 * Apps Script Code Generator for Google Sheet backend integration
 */
export const GOOGLE_APPS_SCRIPT_CODE = `
/**
 * Apps Script Web App backend untuk Aplikasi MKKS Citos (Versi 7 Sheet Lengkap)
 * Mendukung: Sekolah, User, Iuran, Pengeluaran, Pemasukan_Lain, Riwayat_Hapus, dan Rekonsiliasi_Kas
 * Urutan Kolom Iuran: Tahun -> Bulan -> ID Sekolah -> Nama Sekolah -> Nominal -> Keterangan / Tempat Terima -> Tanggal Input -> Diinput Oleh -> No Kuitansi
 * 
 * Cara Update di Google Sheets:
 * 1. Buka Google Spreadsheet -> Ekstensi -> Apps Script
 * 2. Hapus seluruh isi kode lama di Code.gs, lalu tempelkan (paste) seluruh kode di bawah ini
 * 3. Klik tombol "Simpan" (ikon disket / Ctrl + S)
 * 4. Klik menu "Deploy" (kanan atas) -> "Manage deployments" (Kelola deployment)
 * 5. Klik ikon Pensil (Edit) -> Pada pilihan Version, pilih "New version" (Versi baru) -> Klik "Deploy"
 */

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : '';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Ambil Data dari Google Sheet (7 Sheet Lengkap)
  if (action === 'getData') {
    var users = getSheetData(ss, 'User');
    if (!users || users.length === 0) users = getSheetData(ss, 'Users');
    if (!users || users.length === 0) users = getSheetData(ss, 'Data User');
    if (!users || users.length === 0) users = getSheetData(ss, 'Akun');

    var sekolah = getSheetData(ss, 'Sekolah');
    if (!sekolah || sekolah.length === 0) sekolah = getSheetData(ss, 'Data Sekolah');

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      sekolah: sekolah,
      users: users,
      iuran: getSheetData(ss, 'Iuran'),
      pengeluaran: getSheetData(ss, 'Pengeluaran'),
      pemasukanLain: getSheetData(ss, 'Pemasukan_Lain') || getSheetData(ss, 'PemasukanLain'),
      riwayatHapus: getSheetData(ss, 'Riwayat_Hapus') || getSheetData(ss, 'RiwayatHapus'),
      rekonsiliasiKas: getSheetData(ss, 'Rekonsiliasi_Kas') || getSheetData(ss, 'RekonsiliasiKas') || getSheetData(ss, 'Audit_Kas')
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. Fallback Sync via GET jika POST terhalang proxy
  if (action === 'syncAll' && e && e.parameter && e.parameter.data) {
    try {
      var data = JSON.parse(e.parameter.data);
      if (data.sekolah) writeSheetData(ss, 'Sekolah', data.sekolah);
      if (data.users) writeSheetData(ss, 'User', data.users);
      if (data.iuran) writeSheetData(ss, 'Iuran', data.iuran);
      if (data.pengeluaran) writeSheetData(ss, 'Pengeluaran', data.pengeluaran);
      if (data.pemasukanLain) writeSheetData(ss, 'Pemasukan_Lain', data.pemasukanLain);
      if (data.riwayatHapus) writeSheetData(ss, 'Riwayat_Hapus', data.riwayatHapus);
      if (data.rekonsiliasiKas) writeSheetData(ss, 'Rekonsiliasi_Kas', data.rekonsiliasiKas);
      
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Sync Completed via GET' }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'active', message: 'API MKKS Citos Ready (7 Sheets)' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = null;
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (data && data.action === 'syncAll') {
      if (data.sekolah) writeSheetData(ss, 'Sekolah', data.sekolah);
      if (data.users) writeSheetData(ss, 'User', data.users);
      if (data.iuran) writeSheetData(ss, 'Iuran', data.iuran);
      if (data.pengeluaran) writeSheetData(ss, 'Pengeluaran', data.pengeluaran);
      if (data.pemasukanLain) writeSheetData(ss, 'Pemasukan_Lain', data.pemasukanLain);
      if (data.riwayatHapus) writeSheetData(ss, 'Riwayat_Hapus', data.riwayatHapus);
      if (data.rekonsiliasiKas) writeSheetData(ss, 'Rekonsiliasi_Kas', data.rekonsiliasiKas);
      
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Sync Completed' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No valid action found' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetData(ss, sheetName) {
  var sheet = findSheetByName(ss, sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      var headerKey = String(headers[j] || '').trim();
      if (headerKey) {
        row[headerKey] = data[i][j];
      }
    }
    row['_rawRow'] = data[i];
    result.push(row);
  }
  return result;
}

function writeSheetData(ss, sheetName, rows) {
  var sheet = findSheetByName(ss, sheetName) || ss.insertSheet(sheetName);
  if (!rows || rows.length === 0) return;

  // Header Rapi Standar MKKS Citos (Nominal sebelum Keterangan / Tempat Terima)
  var headerMap = {
    'Iuran': ['Tahun', 'Bulan', 'ID Sekolah', 'Nama Sekolah', 'Nominal', 'Keterangan / Tempat Terima', 'Tanggal Input', 'Diinput Oleh', 'No Kuitansi'],
    'Pengeluaran': ['No', 'Tanggal Transaksi', 'Alokasi Project / Kegiatan', 'Keterangan Tambahan', 'Jumlah Nominal (Rp)', 'Diinput Oleh'],
    'Pemasukan_Lain': ['No', 'Tanggal Transaksi', 'Kategori', 'Sumber Dana / Pihak Terkait', 'Keterangan Tambahan', 'Jumlah Nominal (Rp)', 'Diinput Oleh', 'No Kuitansi'],
    'PemasukanLain': ['No', 'Tanggal Transaksi', 'Kategori', 'Sumber Dana / Pihak Terkait', 'Keterangan Tambahan', 'Jumlah Nominal (Rp)', 'Diinput Oleh', 'No Kuitansi'],
    'Riwayat_Hapus': ['ID Log', 'ID Transaksi Asli', 'Jenis Transaksi', 'Rincian Data', 'Jumlah Nominal (Rp)', 'Waktu Penghapusan', 'Dihapus Oleh', 'Role User', 'Alasan Penghapusan', 'No Kuitansi', 'Tanggal Transaksi Asli'],
    'RiwayatHapus': ['ID Log', 'ID Transaksi Asli', 'Jenis Transaksi', 'Rincian Data', 'Jumlah Nominal (Rp)', 'Waktu Penghapusan', 'Dihapus Oleh', 'Role User', 'Alasan Penghapusan', 'No Kuitansi', 'Tanggal Transaksi Asli'],
    'Rekonsiliasi_Kas': ['ID Audit', 'Tahun', 'Tanggal Audit', 'Saldo Cash Fisik (Rp)', 'Saldo Rekening Bank (Rp)', 'Nama Bank', 'Nomor Rekening', 'Atas Nama Rekening', 'Catatan Temuan Audit', 'Diaudit Oleh', 'Rincian Pecahan Cash (JSON)'],
    'RekonsiliasiKas': ['ID Audit', 'Tahun', 'Tanggal Audit', 'Saldo Cash Fisik (Rp)', 'Saldo Rekening Bank (Rp)', 'Nama Bank', 'Nomor Rekening', 'Atas Nama Rekening', 'Catatan Temuan Audit', 'Diaudit Oleh', 'Rincian Pecahan Cash (JSON)'],
    'Audit_Kas': ['ID Audit', 'Tahun', 'Tanggal Audit', 'Saldo Cash Fisik (Rp)', 'Saldo Rekening Bank (Rp)', 'Nama Bank', 'Nomor Rekening', 'Atas Nama Rekening', 'Catatan Temuan Audit', 'Diaudit Oleh', 'Rincian Pecahan Cash (JSON)'],
    'Sekolah': ['ID Sekolah', 'Nama Sekolah', 'Nama Kepsek', 'Alamat', 'Kelurahan', 'Kecamatan'],
    'User': ['Username', 'Password', 'Role', 'Sekolah', 'Aktif', 'Nama Kepsek']
  };

  // Pemetaan kata kunci alternatif
  var keyAlias = {
    'Tahun': ['Tahun', 'tahun'],
    'Bulan': ['Bulan', 'bulan'],
    'ID Sekolah': ['ID Sekolah', 'idSekolah', 'id_sekolah'],
    'Nama Sekolah': ['Nama Sekolah', 'namaSekolah', 'nama_sekolah', 'sekolah'],
    'Nominal': ['Nominal', 'nominal', 'jumlah'],
    'Keterangan / Tempat Terima': ['Keterangan / Tempat Terima', 'Keterangan', 'keterangan', 'Tempat Terima', 'tempatTerima', 'Catatan', 'catatan'],
    'Keterangan': ['Keterangan', 'keterangan', 'Keterangan / Tempat Terima', 'Tempat Terima', 'Catatan', 'catatan'],
    'Tanggal Input': ['Tanggal Input', 'tanggalInput', 'tanggal'],
    'Diinput Oleh': ['Diinput Oleh', 'diinputOleh', 'operator'],
    'No Kuitansi': ['No Kuitansi', 'noKuitansi', 'kuitansi'],
    'No': ['No', 'id', 'ID'],
    'Tanggal Transaksi': ['Tanggal Transaksi', 'tanggal', 'Tanggal'],
    'Alokasi Project / Kegiatan': ['Alokasi Project / Kegiatan', 'project', 'Kegiatan'],
    'Kategori': ['Kategori', 'kategori', 'Jenis Pemasukan'],
    'Sumber Dana / Pihak Terkait': ['Sumber Dana / Pihak Terkait', 'sumberDana', 'sumber', 'Dari', 'Diterima Dari'],
    'Keterangan Tambahan': ['Keterangan Tambahan', 'keterangan', 'Keterangan', 'Catatan'],
    'Jumlah Nominal (Rp)': ['Jumlah Nominal (Rp)', 'nominal', 'Nominal', 'Jumlah'],
    'ID Log': ['ID Log', 'id', 'ID'],
    'ID Transaksi Asli': ['ID Transaksi Asli', 'idTransaksi', 'id_transaksi'],
    'Jenis Transaksi': ['Jenis Transaksi', 'jenisTransaksi', 'jenis'],
    'Rincian Data': ['Rincian Data', 'rincianData', 'rincian'],
    'Waktu Penghapusan': ['Waktu Penghapusan', 'tanggalHapus', 'tanggal_hapus'],
    'Dihapus Oleh': ['Dihapus Oleh', 'dihapusOleh', 'petugas'],
    'Role User': ['Role User', 'roleUser', 'role'],
    'Alasan Penghapusan': ['Alasan Penghapusan', 'alasanHapus', 'alasan'],
    'Tanggal Transaksi Asli': ['Tanggal Transaksi Asli', 'tanggalTransaksiAsli'],
    'ID Audit': ['ID Audit', 'idAudit', 'id', 'ID'],
    'Tanggal Audit': ['Tanggal Audit', 'tanggalAudit', 'tanggal', 'Waktu Audit'],
    'Saldo Cash Fisik (Rp)': ['Saldo Cash Fisik (Rp)', 'saldoCash', 'Saldo Cash', 'Uang Cash', 'cash', 'Cash', 'saldo_cash'],
    'Saldo Rekening Bank (Rp)': ['Saldo Rekening Bank (Rp)', 'saldoBank', 'Saldo Bank', 'Uang di Rekening', 'bank', 'Bank', 'saldo_bank'],
    'Nama Bank': ['Nama Bank', 'namaBank', 'bankName', 'Bank'],
    'Nomor Rekening': ['Nomor Rekening', 'nomorRekening', 'noRekening', 'No Rekening'],
    'Atas Nama Rekening': ['Atas Nama Rekening', 'atasNamaRekening', 'atasNama', 'Atas Nama'],
    'Catatan Temuan Audit': ['Catatan Temuan Audit', 'catatanAudit', 'catatan', 'Catatan', 'keterangan', 'Keterangan'],
    'Diaudit Oleh': ['Diaudit Oleh', 'diauditOleh', 'auditor', 'Auditor', 'petugas'],
    'Rincian Pecahan Cash (JSON)': ['Rincian Pecahan Cash (JSON)', 'pecahanCash', 'pecahan', 'rincianPecahan'],
    'Nama Kepsek': ['Nama Kepsek', 'namaKepsek', 'Kepala Sekolah'],
    'Alamat': ['Alamat', 'alamat'],
    'Kelurahan': ['Kelurahan', 'kelurahan'],
    'Kecamatan': ['Kecamatan', 'kecamatan'],
    'Username': ['Username', 'username'],
    'Password': ['Password', 'password'],
    'Role': ['Role', 'role'],
    'Sekolah': ['Sekolah', 'sekolah'],
    'Aktif': ['Aktif', 'aktif']
  };

  var headers = headerMap[sheetName] || Object.keys(rows[0]);

  var values = [headers];
  rows.forEach(function(r) {
    var row = [];
    headers.forEach(function(h) {
      var val = '';
      var aliases = keyAlias[h] || [h];
      for (var k = 0; k < aliases.length; k++) {
        if (r[aliases[k]] !== undefined && r[aliases[k]] !== null) {
          val = r[aliases[k]];
          break;
        }
      }
      row.push(val);
    });
    values.push(row);
  });

  sheet.clear();
  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
}

function findSheetByName(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;
  var sheets = ss.getSheets();
  var target = sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (var i = 0; i < sheets.length; i++) {
    var sName = sheets[i].getName().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (sName === target || sName.indexOf(target) !== -1 || target.indexOf(sName) !== -1) {
      return sheets[i];
    }
  }
  return null;
}
`.trim();

