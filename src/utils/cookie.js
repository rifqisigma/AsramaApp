export const setCookie = (name, value, days = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

export const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(?:^|; )' + encodeURIComponent(name) + '=([^;]*)'));
  if (match) {
    try {
      return JSON.parse(decodeURIComponent(match[1]));
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const removeCookie = (name) => {
  document.cookie = `${encodeURIComponent(name)}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
};

export const getWeeklyResetTime = () => {
  const now = new Date();
  const day = now.getUTCDay();
  let daysUntilSunday = (7 - day) % 7;
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilSunday, 16, 59, 59));
  if (reset.getTime() <= now.getTime()) {
    reset.setUTCDate(reset.getUTCDate() + 7);
  }
  return reset;
};

export const isCookieExpired = (expiry) => Date.now() > expiry;

/**
 * Mengubah tanggal atau timestamp menjadi index hari kalender dalam WIB (Asia/Jakarta).
 * Memastikan perbandingan hari Senin -> Kamis dihitung tepat 3 hari kalender.
 */
export const getWibCalendarDay = (dateOrTimestamp) => {
  if (!dateOrTimestamp) return 0;
  const d = dateOrTimestamp instanceof Date ? dateOrTimestamp : new Date(dateOrTimestamp);
  if (isNaN(d.getTime())) return 0;
  // Offset +7 jam untuk WIB
  const wibTime = d.getTime() + (7 * 60 * 60 * 1000);
  return Math.floor(wibTime / (24 * 60 * 60 * 1000));
};

/**
 * Aturan: pelapor tidak bisa melapor ke orang yang sama dengan 3 hari setelahnya.
 * Misal: Senin (day 0) -> Selasa (day 1) -> Rabu (day 2) -> Kamis (day 3 >= 3 -> Boleh).
 */
export const canReportPiket = (lastReportTimestamp, currentTimestamp = Date.now()) => {
  if (!lastReportTimestamp) {
    return { allowed: true, diffDays: Infinity, nextAllowedDate: null };
  }

  const lastDate = lastReportTimestamp instanceof Date ? lastReportTimestamp : new Date(lastReportTimestamp);
  if (isNaN(lastDate.getTime())) {
    return { allowed: true, diffDays: Infinity, nextAllowedDate: null };
  }

  const currentDate = currentTimestamp instanceof Date ? currentTimestamp : new Date(currentTimestamp);

  const lastDay = getWibCalendarDay(lastDate);
  const currentDay = getWibCalendarDay(currentDate);
  const diffDays = currentDay - lastDay;

  // Jika sudah 3 hari kalender atau lebih (misal Senin ke Kamis): Boleh lapor kembali
  if (diffDays >= 3) {
    return { allowed: true, diffDays, nextAllowedDate: null };
  }

  // Jika diffDays < 0 (anomali jam perangkat lokal), cek dengan selisih milidetik (3 * 24 jam)
  if (diffDays < 0) {
    const rawDiffMs = currentDate.getTime() - lastDate.getTime();
    if (rawDiffMs >= 3 * 24 * 60 * 60 * 1000) {
      return { allowed: true, diffDays: Math.floor(rawDiffMs / 86400000), nextAllowedDate: null };
    }
  }

  // Tanggal kapan boleh melapor kembali (hari ke-3 sejak tanggal laporan)
  const nextAllowedDate = new Date(lastDate.getTime() + (3 * 24 * 60 * 60 * 1000));

  return {
    allowed: false,
    diffDays,
    daysRemaining: Math.max(1, 3 - diffDays),
    nextAllowedDate
  };
};

/**
 * Mengambil cache aturan piket untuk user tertentu.
 * Menggabungkan cookie dan localStorage yang di-scope oleh userId.
 * Mengabaikan / membuang data yang lebih lama dari 7 hari agar cache tidak menumpuk.
 */
export const getPiketRulesCache = (uid) => {
  const scopedKey = uid ? `piketRules_${uid}` : 'piketRules';
  let rules = getCookie(scopedKey) || null;

  if (!rules) {
    try {
      const stored = localStorage.getItem(scopedKey);
      if (stored) rules = JSON.parse(stored);
    } catch (_) {}
  }

  // Fallback ke legacy 'piketRules' jika scoped belum ada
  if (!rules && uid) {
    rules = getCookie('piketRules') || null;
    if (!rules) {
      try {
        const stored = localStorage.getItem('piketRules');
        if (stored) rules = JSON.parse(stored);
      } catch (_) {}
    }
  }

  if (!rules || typeof rules !== 'object') return {};

  // Bersihkan data yang lebih lama dari 7 hari
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const cleaned = {};
  for (const [targetId, timestampVal] of Object.entries(rules)) {
    let t = timestampVal;
    if (Array.isArray(timestampVal)) {
      t = timestampVal[timestampVal.length - 1];
    }
    const num = typeof t === 'number' ? t : new Date(t).getTime();
    if (!isNaN(num) && (now - num < sevenDaysMs)) {
      cleaned[targetId] = num;
    }
  }

  return cleaned;
};

/**
 * Menyimpan timestamp laporan piket terakhir ke cache (cookie + localStorage).
 */
export const setPiketRulesCache = (uid, targetId, timestamp = Date.now()) => {
  const rules = getPiketRulesCache(uid);
  rules[targetId] = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();

  const scopedKey = uid ? `piketRules_${uid}` : 'piketRules';
  setCookie(scopedKey, rules, 7);
  // Simpan juga versi generic untuk backward-compatibility
  setCookie('piketRules', rules, 7);

  try {
    localStorage.setItem(scopedKey, JSON.stringify(rules));
    localStorage.setItem('piketRules', JSON.stringify(rules));
  } catch (_) {}
};

/**
 * Menghapus cache piket secara lokal di perangkat.
 */
export const clearPiketCacheLocally = (uid) => {
  removeCookie('piketRules');
  try {
    localStorage.removeItem('piketRules');
  } catch (_) {}

  if (uid) {
    removeCookie(`piketRules_${uid}`);
    try {
      localStorage.removeItem(`piketRules_${uid}`);
    } catch (_) {}
  }
};
