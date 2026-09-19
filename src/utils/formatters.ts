/**
 * Utility functions for formatting Indonesian currency, numbers to words (terbilang), and dates.
 */

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

export const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function formatDateIndonesian(dateString?: string | null): string {
  if (!dateString) return '-';
  const raw = String(dateString).trim();
  if (!raw || raw === '-') return '-';

  // Already formatted Indonesian check
  if (/^[0-9]{1,2}\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+[0-9]{4}/i.test(raw)) {
    return raw;
  }

  // Regex parse YYYY-MM-DD safely to prevent UTC timezone day shift
  const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const year = match[1];
    const monthIdx = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${INDO_MONTHS[monthIdx]} ${year}`;
    }
  }

  const date = new Date(raw);
  if (isNaN(date.getTime())) {
    // If all parse fails, strip ISO artifacts
    return raw.replace(/T.*$/, '').replace(/Z$/, '');
  }
  
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch {
    return `${date.getDate()} ${INDO_MONTHS[date.getMonth()] || ''} ${date.getFullYear()}`;
  }
}

/**
 * Format date & time to clean Indonesian with hours and minutes:
 * e.g., "19 September 2026, 13:30 WIB"
 */
export function formatDateTimeIndonesian(dateString?: string | null, withWIB = true): string {
  if (!dateString) return '-';
  const raw = String(dateString).trim();
  if (!raw || raw === '-') return '-';

  // 1. Match YYYY-MM-DD HH:mm or YYYY-MM-DDTHH:mm safely without timezone offset shifts
  const m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2}))?/);
  if (m) {
    const year = m[1];
    const monthIdx = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    const month = INDO_MONTHS[monthIdx] || m[2];
    if (m[4] !== undefined && m[5] !== undefined) {
      return `${day} ${month} ${year}, ${m[4].padStart(2, '0')}:${m[5].padStart(2, '0')}${withWIB ? ' WIB' : ''}`;
    }
    return `${day} ${month} ${year}`;
  }

  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(d);

      const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
      const year = get('year');
      const monthIdx = parseInt(get('month'), 10) - 1;
      const day = parseInt(get('day'), 10);
      const month = INDO_MONTHS[monthIdx] || '';
      const rawHour = parseInt(get('hour'), 10) % 24;
      const hours = String(rawHour).padStart(2, '0');
      const minutes = get('minute').padStart(2, '0');

      if (hours === '00' && minutes === '00' && !raw.includes(':')) {
        return `${day} ${month} ${year}`;
      }

      return `${day} ${month} ${year}, ${hours}:${minutes}${withWIB ? ' WIB' : ''}`;
    } catch {
      const day = d.getDate();
      const month = INDO_MONTHS[d.getMonth()] || '';
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year}, ${hours}:${minutes}${withWIB ? ' WIB' : ''}`;
    }
  }

  return formatDateIndonesian(raw);
}

/**
 * Clean up raw ISO string for input fields (e.g. "2026-09-19T13:30:00.000Z" -> "2026-09-19 13:30")
 * Ensures timezone strings (UTC 'Z' or offsets) are properly converted to Asia/Jakarta (WIB UTC+7).
 */
export function cleanDateInputString(val?: string | null): string {
  if (!val) return '';
  const raw = String(val).trim();
  if (!raw || raw === '-') return '';

  // Already standard format YYYY-MM-DD HH:mm
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }
  // Standard format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // If it's an ISO UTC string (ending with Z or containing timezone offset)
  // e.g. "2026-09-19T15:30:00.000Z" or "2026-09-19T15:30:00+00:00"
  if (raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw)) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      // Calculate WIB (UTC+7) safely via UTC millisecond math
      const wib = new Date(d.getTime() + (7 * 3600 * 1000));
      const year = wib.getUTCFullYear();
      const month = String(wib.getUTCMonth() + 1).padStart(2, '0');
      const day = String(wib.getUTCDate()).padStart(2, '0');
      const hours = String(wib.getUTCHours()).padStart(2, '0');
      const minutes = String(wib.getUTCMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
  }

  return raw
    .replace('T', ' ')
    .replace(/:\d{2}\.\d{3}Z$/, '')
    .replace(/\.\d{3}Z$/, '')
    .replace(/Z$/, '')
    .substring(0, 16);
}

/**
 * Checks if a given date string is an old placeholder/seed or timezone-shifted timestamp
 */
export function isPlaceholderAuditTime(val?: string | null): boolean {
  if (!val) return true;
  const s = String(val).trim();
  return (
    s.startsWith('2026-09-19 09:30') ||
    s.startsWith('2026-09-20 03:14') ||
    s.startsWith('2026-09-20 02:35') ||
    s.startsWith('2026-09-20 02:36') ||
    s.includes('2026-09-20T03:14') ||
    s.includes('2026-09-20T02:35') ||
    s.includes('2026-09-20T02:36') ||
    s === '-'
  );
}

/**
 * Return current date and time in Indonesian Server Timezone: UTC+7 (WIB / Asia/Jakarta)
 * Format: YYYY-MM-DD HH:mm
 */
export function getCurrentWIBDateTimeString(): string {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(now);

    const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
    const year = get('year');
    const month = get('month').padStart(2, '0');
    const day = get('day').padStart(2, '0');
    let rawHour = parseInt(get('hour'), 10);
    if (isNaN(rawHour)) rawHour = 0;
    if (rawHour === 24) rawHour = 0;
    const hours = String(rawHour).padStart(2, '0');
    const minutes = get('minute').padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    // Mathematical UTC+7 calculation:
    // now.getTime() is UTC epoch milliseconds. Adding 7 * 3600 * 1000 gives exact UTC+7 timestamp.
    // getUTC* getters guarantee 100% immunity from host/client machine timezone.
    const now = new Date();
    const wib = new Date(now.getTime() + (7 * 3600 * 1000));
    const year = wib.getUTCFullYear();
    const month = String(wib.getUTCMonth() + 1).padStart(2, '0');
    const day = String(wib.getUTCDate()).padStart(2, '0');
    const hours = String(wib.getUTCHours()).padStart(2, '0');
    const minutes = String(wib.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}

/**
 * Return current date in Indonesian Server Timezone: UTC+7 (WIB / Asia/Jakarta)
 * Format: YYYY-MM-DD
 */
export function getCurrentWIBDateString(): string {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false
    }).formatToParts(now);

    const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
    const year = get('year');
    const month = get('month').padStart(2, '0');
    const day = get('day').padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    const now = new Date();
    const wib = new Date(now.getTime() + (7 * 3600 * 1000));
    const year = wib.getUTCFullYear();
    const month = String(wib.getUTCMonth() + 1).padStart(2, '0');
    const day = String(wib.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Return current local date and time in format YYYY-MM-DD HH:mm (Synchronized to WIB UTC+7)
 */
export function getCurrentLocalDateTimeString(): string {
  return getCurrentWIBDateTimeString();
}

/**
 * Convert numbers to Indonesian words (Terbilang)
 */
export function terbilang(n: number): string {
  if (n < 0) return 'minus ' + terbilang(Math.abs(n));
  if (n === 0) return 'Nol Rupiah';

  const angka = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  
  let hasil = '';

  function spell(x: number): string {
    if (x < 12) {
      return ' ' + angka[x];
    } else if (x < 20) {
      return spell(x - 10) + ' Belas';
    } else if (x < 100) {
      return spell(Math.floor(x / 10)) + ' Puluh' + spell(x % 10);
    } else if (x < 200) {
      return ' Seratus' + spell(x - 100);
    } else if (x < 1000) {
      return spell(Math.floor(x / 100)) + ' Ratus' + spell(x % 100);
    } else if (x < 2000) {
      return ' Seribu' + spell(x - 1000);
    } else if (x < 1000000) {
      return spell(Math.floor(x / 1000)) + ' Ribu' + spell(x % 1000);
    } else if (x < 1000000000) {
      return spell(Math.floor(x / 1000000)) + ' Juta' + spell(x % 1000000);
    } else if (x < 1000000000000) {
      return spell(Math.floor(x / 1000000000)) + ' Milyar' + spell(x % 1000000000);
    }
    return '';
  }

  hasil = spell(Math.floor(n)).trim() + ' Rupiah';
  return hasil;
}

/**
 * Resolve the full formal name of the Bendahara/Kepsek who inputted the transaction,
 * preventing raw usernames like "neng", "bendahara", "admin" from showing up.
 */
export function resolveNamaBendahara(
  diinputOleh: string | undefined | null,
  usersList?: any[],
  sekolahList?: any[]
): string {
  if (!diinputOleh || !diinputOleh.trim()) {
    return 'H. Nurhasan, M.Pd';
  }

  const raw = diinputOleh.trim();
  const rawLower = raw.toLowerCase();

  // Try to get cached lists if not provided
  let users = usersList;
  let sekolahs = sekolahList;
  if (typeof window !== 'undefined') {
    if (!users || users.length === 0) {
      try {
        const uData = localStorage.getItem('mkks_citos_user');
        if (uData) users = JSON.parse(uData);
      } catch (e) {
        // ignore
      }
    }
    if (!sekolahs || sekolahs.length === 0) {
      try {
        const sData = localStorage.getItem('mkks_citos_sekolah');
        if (sData) sekolahs = JSON.parse(sData);
      } catch (e) {
        // ignore
      }
    }
  }

  // 1. Direct match user by username in users list
  if (Array.isArray(users)) {
    const matchedUser = users.find(
      (u: any) => u.username && String(u.username).trim().toLowerCase() === rawLower
    );
    if (matchedUser) {
      if (
        matchedUser.namaKepsek && 
        String(matchedUser.namaKepsek).trim() && 
        String(matchedUser.namaKepsek).trim().toLowerCase() !== rawLower
      ) {
        return String(matchedUser.namaKepsek).trim();
      }
      if (matchedUser.username && Array.isArray(sekolahs)) {
        const schById = sekolahs.find((s: any) => s.idSekolah && String(s.idSekolah).trim().toLowerCase() === String(matchedUser.username).trim().toLowerCase());
        if (schById && schById.namaKepsek && String(schById.namaKepsek).trim()) {
          return String(schById.namaKepsek).trim();
        }
      }
      if (matchedUser.sekolah && Array.isArray(sekolahs)) {
        const sch = sekolahs.find(
          (s: any) => s.namaSekolah && String(s.namaSekolah).toLowerCase().trim() === String(matchedUser.sekolah).toLowerCase().trim()
        );
        if (sch && sch.namaKepsek && String(sch.namaKepsek).trim()) {
          return String(sch.namaKepsek).trim();
        }
      }
    }

    // Match user by namaKepsek
    const matchedByName = users.find(
      (u: any) => u.namaKepsek && String(u.namaKepsek).trim().toLowerCase() === rawLower
    );
    if (matchedByName && matchedByName.namaKepsek) {
      return String(matchedByName.namaKepsek).trim();
    }
  }

  // 2. Direct match in sekolah list
  if (Array.isArray(sekolahs)) {
    const matchedSek = sekolahs.find(
      (s: any) =>
        (s.idSekolah && String(s.idSekolah).toLowerCase().trim() === rawLower) ||
        (s.namaSekolah && String(s.namaSekolah).toLowerCase().trim() === rawLower) ||
        (s.namaKepsek && String(s.namaKepsek).toLowerCase().trim() === rawLower)
    );
    if (matchedSek && matchedSek.namaKepsek && String(matchedSek.namaKepsek).trim()) {
      return String(matchedSek.namaKepsek).trim();
    }
  }

  // 3. Known specific fallbacks for default system users
  if (rawLower === 'neng') {
    return 'Hj. Neng Nurhasanah, M.Pd';
  }
  if (rawLower === 'bendahara') {
    return 'H. Nurhasan, M.Pd';
  }
  if (rawLower === 'admin') {
    return 'Administrator MKKS Citos';
  }

  return raw;
}

/**
 * Menghasilkan daftar Tahun Buku mulai dari tahun 2026 dan otomatis menyertakan
 * 1 tahun ke depan (misal: saat 2026 -> [2026, 2027]; saat 2027 -> [2026, 2027, 2028]),
 * tanpa menghilangkan tahun-tahun sebelumnya, serta mencakup tahun transaksi yang ada.
 */
export function getTahunBukuList(extraYears: (number | string | undefined)[] = []): number[] {
  const START_YEAR = 2026;
  const currentYear = new Date().getFullYear();

  const parsedExtra = extraYears
    .map((y) => Number(y))
    .filter((y) => !isNaN(y) && y >= START_YEAR);

  const maxYear = Math.max(START_YEAR + 1, currentYear + 1, ...parsedExtra);

  const list: number[] = [];
  for (let y = START_YEAR; y <= maxYear; y++) {
    list.push(y);
  }
  return list;
}
