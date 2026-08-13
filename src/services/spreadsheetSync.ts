import { Sekolah, User, Iuran, Pengeluaran, UserRole } from '../types';
import { INITIAL_SEKOLAH, INITIAL_USER, INITIAL_IURAN, INITIAL_PENGELUARAN, DEFAULT_SPREADSHEET_ID, DEFAULT_APPS_SCRIPT_URL } from '../data/initialData';

const STORAGE_KEYS = {
  SEKOLAH: 'mkks_citos_sekolah',
  USER: 'mkks_citos_user',
  IURAN: 'mkks_citos_iuran',
  PENGELUARAN: 'mkks_citos_pengeluaran',
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
    if (!u || typeof u !== 'object') return null;

    const username = String(u.username || u.Username || u['User Name'] || u.user || '').trim();
    if (!username) return null;

    const password = String(u.password || u.Password || '123').trim();
    const rawRole = String(u.role || u.Role || '').trim().toLowerCase();
    let role: UserRole = 'Sekolah';
    if (rawRole === 'admin') {
      role = 'Admin';
    } else if (rawRole === 'bendahara') {
      role = 'Bendahara';
    }
    let sekolah = String(u.sekolah || u.Sekolah || u['Nama Sekolah'] || u.namaSekolah || '').trim();
    const aktif = u.aktif !== undefined ? u.aktif : (u.Aktif !== undefined ? u.Aktif : 'Ya');
    let namaKepsek = String(u.namaKepsek || u['Nama Kepsek'] || u['Kepala Sekolah'] || '').trim();

    if (!sekolah && role === 'Sekolah') {
      const match = sekolahList.find(s => s.namaSekolah.toLowerCase().includes(username.toLowerCase()));
      if (match) {
        sekolah = match.namaSekolah;
        if (!namaKepsek) namaKepsek = match.namaKepsek;
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
      const match = sekolahList.find(s => 
        (idSekolah && s.idSekolah === idSekolah) ||
        (namaSekolah && s.namaSekolah.toLowerCase().trim() === namaSekolah.toLowerCase().trim()) ||
        (namaSekolah && (s.namaSekolah.toLowerCase().includes(namaSekolah.toLowerCase().trim()) || namaSekolah.toLowerCase().includes(s.namaSekolah.toLowerCase().trim())))
      );
      if (match) {
        idSekolah = match.idSekolah;
        namaSekolah = match.namaSekolah;
      }
    }

    const tahun = Number(i.tahun || i.Tahun || 2026);
    const bulan = String(i.bulan || i.Bulan || '').trim();
    const nominalRaw = i.nominal !== undefined ? i.nominal : (i.Nominal !== undefined ? i.Nominal : (i.jumlah || i.Jumlah));
    const nominal = Number(nominalRaw) || 100000;
    const tanggalInput = String(i.tanggalInput || i['Tanggal Input'] || i.tanggal || i.Tanggal || new Date().toISOString().split('T')[0]).trim();
    const diinputOleh = String(i.diinputOleh || i['Diinput Oleh'] || i.operator || 'Bendahara MKKS Citos').trim();
    const noKuitansi = String(i.noKuitansi || i['No Kuitansi'] || i.kuitansi || `KWT/MKKS/${tahun}/${idSekolah}`).trim();
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
      noKuitansi
    } as Iuran;
  }).filter((item): item is Iuran => item !== null);
}

export function normalizePengeluaranList(rawList: any[]): Pengeluaran[] {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((p, idx) => {
    if (!p || typeof p !== 'object') return null;

    const id = String(p.id || p.ID || p.No || `OUT-${idx + 1}`).trim();
    
    // Find tanggal flexibly
    const tanggalRaw = p.tanggal || p.Tanggal || p['Tanggal Transaksi'] || p['Tanggal Input'] || p['Tgl'] || p['TGL'] || new Date().toISOString().split('T')[0];
    const tanggal = String(tanggalRaw).trim();

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

    try {
      const rawIuran = this.getIuran();
      const rawPengeluaran = this.getPengeluaran();

      // Format payload with both Title Case (for Sheet columns) and camelCase
      const formattedIuran = rawIuran.map(item => ({
        'Tahun': item.tahun,
        'Bulan': item.bulan,
        'ID Sekolah': item.idSekolah,
        'Nama Sekolah': item.namaSekolah,
        'Nominal': item.nominal,
        'Tanggal Input': item.tanggalInput,
        'Diinput Oleh': item.diinputOleh,
        'No Kuitansi': item.noKuitansi,
        tahun: item.tahun,
        bulan: item.bulan,
        idSekolah: item.idSekolah,
        namaSekolah: item.namaSekolah,
        nominal: item.nominal,
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

      const payload = {
        action: 'syncAll',
        spreadsheetId: this.getSpreadsheetId(),
        sekolah: this.getSekolah(),
        users: this.getUsers(),
        iuran: formattedIuran,
        pengeluaran: formattedPengeluaran
      };

      const res = await fetch('/api/proxy-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl: url,
          payload: payload
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'error') {
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
      throw new Error('Gagal menghubungi proxy backend');
    } catch (err: any) {
      return {
        lastSynced: null,
        status: 'error',
        message: err.message || 'Gagal terhubung ke Google Apps Script. Pastikan Web App URL valid.'
      };
    }
  }

  // Fetch Data from Apps Script
  public static async fetchFromAppsScript(): Promise<boolean> {
    const url = this.getAppsScriptUrl();
    if (!url) return false;

    try {
      const fetchUrl = `/api/proxy-sheet?scriptUrl=${encodeURIComponent(url)}&action=getData&spreadsheetId=${encodeURIComponent(this.getSpreadsheetId())}`;
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sekolah) && data.sekolah.length > 0) this.saveSekolah(data.sekolah);
        if (Array.isArray(data.users) && data.users.length > 0) this.saveUsers(data.users);
        if (Array.isArray(data.iuran)) this.saveIuran(data.iuran, false);
        if (Array.isArray(data.pengeluaran)) this.savePengeluaran(data.pengeluaran, false);
        return true;
      }
    } catch (err) {
      console.warn('Apps Script fetch failed:', err);
    }
    return false;
  }
}

/**
 * Apps Script Code Generator for Google Sheet backend integration
 */
export const GOOGLE_APPS_SCRIPT_CODE = `
/**
 * Apps Script Web App backend untuk Aplikasi MKKS Citos
 * Salin kode ini ke Google Spreadsheet -> Ekstensi -> Apps Script
 * Lalu klik "Deploy" -> "New Deployment" -> Select type: "Web app"
 * Execute as: "Me" | Who has access: "Anyone"
 */

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : '';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getData') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      sekolah: getSheetData(ss, 'Sekolah'),
      users: getSheetData(ss, 'User'),
      iuran: getSheetData(ss, 'Iuran'),
      pengeluaran: getSheetData(ss, 'Pengeluaran')
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'syncAll' && e && e.parameter && e.parameter.data) {
    try {
      var data = JSON.parse(e.parameter.data);
      if (data.sekolah) writeSheetData(ss, 'Sekolah', data.sekolah);
      if (data.users) writeSheetData(ss, 'User', data.users);
      if (data.iuran) writeSheetData(ss, 'Iuran', data.iuran);
      if (data.pengeluaran) writeSheetData(ss, 'Pengeluaran', data.pengeluaran);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Sync Completed via GET' }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'active', message: 'API MKKS Citos Ready' }))
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
      row[headers[j]] = data[i][j];
    }
    result.push(row);
  }
  return result;
}

function writeSheetData(ss, sheetName, rows) {
  var sheet = findSheetByName(ss, sheetName) || ss.insertSheet(sheetName);
  if (!rows || rows.length === 0) return;

  var headerMap = {
    'Iuran': ['Tahun', 'Bulan', 'ID Sekolah', 'Nama Sekolah', 'Nominal', 'Tanggal Input', 'Diinput Oleh', 'No Kuitansi'],
    'Pengeluaran': ['No', 'Tanggal Transaksi', 'Alokasi Project / Kegiatan', 'Keterangan Tambahan', 'Jumlah Nominal (Rp)', 'Diinput Oleh'],
    'Sekolah': ['ID Sekolah', 'Nama Sekolah', 'Nama Kepsek', 'Alamat', 'Kelurahan', 'Kecamatan'],
    'User': ['Username', 'Password', 'Role', 'Sekolah', 'Aktif', 'Nama Kepsek']
  };

  var keyAlias = {
    'Tahun': ['Tahun', 'tahun'],
    'Bulan': ['Bulan', 'bulan'],
    'ID Sekolah': ['ID Sekolah', 'idSekolah', 'id_sekolah'],
    'Nama Sekolah': ['Nama Sekolah', 'namaSekolah', 'nama_sekolah', 'sekolah'],
    'Nominal': ['Nominal', 'nominal', 'jumlah'],
    'Tanggal Input': ['Tanggal Input', 'tanggalInput', 'tanggal'],
    'Diinput Oleh': ['Diinput Oleh', 'diinputOleh', 'operator'],
    'No Kuitansi': ['No Kuitansi', 'noKuitansi', 'kuitansi'],
    'No': ['No', 'id', 'ID'],
    'Tanggal Transaksi': ['Tanggal Transaksi', 'tanggal', 'Tanggal'],
    'Alokasi Project / Kegiatan': ['Alokasi Project / Kegiatan', 'project', 'Kegiatan'],
    'Keterangan Tambahan': ['Keterangan Tambahan', 'keterangan', 'Keterangan'],
    'Jumlah Nominal (Rp)': ['Jumlah Nominal (Rp)', 'nominal', 'Nominal'],
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

  var headers = headerMap[sheetName];
  if (!headers) {
    headers = Object.keys(rows[0]);
  }

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
  var target = sheetName.toLowerCase().trim();
  for (var i = 0; i < sheets.length; i++) {
    var sName = sheets[i].getName().toLowerCase().trim();
    if (sName === target || sName.includes(target) || target.includes(sName)) {
      return sheets[i];
    }
  }
  return null;
}
`.trim();

