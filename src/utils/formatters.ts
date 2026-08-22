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

export function formatDateIndonesian(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
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
      if (matchedUser.sekolah && Array.isArray(sekolahs)) {
        const sch = sekolahs.find(
          (s: any) => s.namaSekolah && (
            String(s.namaSekolah).toLowerCase().trim() === String(matchedUser.sekolah).toLowerCase().trim() ||
            String(s.namaSekolah).toLowerCase().includes(String(matchedUser.sekolah).toLowerCase().trim())
          )
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
        (s.namaKepsek && String(s.namaKepsek).toLowerCase().trim() === rawLower) ||
        (s.namaKepsek && String(s.namaKepsek).toLowerCase().includes(rawLower))
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
