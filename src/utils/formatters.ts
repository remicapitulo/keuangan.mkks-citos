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
