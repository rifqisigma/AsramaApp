// ============================================================
// Gamifikasi Manajemen Piket
// ------------------------------------------------------------
// Aturan poin (per hari):
//   - Piket diurutkan berdasarkan waktu input (timestamp/createdAt) di hari itu.
//   - Juara 1 = 25, juara 2 = 20, juara 3 = 15 poin.
//   - Peringkat 4 dan seterusnya menurun berurutan: 12, 11, 10, 9, ...
//     (minimal 1 poin, tidak pernah negatif).
// Poin dihitung ulang setiap hari dari data piket, jadi total bulanan
// otomatis mengikuti performa harian.
//
// "Hari" ditentukan berdasarkan tanggal KALENDER WIB (UTC+7) dari
// waktu laporan piket.
// ============================================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Poin untuk peringkat 1-3. */
export const POIN_PODIUM = { 1: 25, 2: 20, 3: 15 };
/** Poin untuk peringkat 4 (lalu 11, 10, 9, ... untuk peringkat berikutnya). */
export const POIN_PERINGKAT_4 = 12;

export const hitungPoinPeringkat = (rank) => {
  if (rank <= 0) return 0;
  if (POIN_PODIUM[rank] !== undefined) return POIN_PODIUM[rank];
  return Math.max(1, POIN_PERINGKAT_4 - (rank - 4));
};

/** Ubah berbagai bentuk tanggal piket -> Date | null */
export const toDateObj = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

/**
 * Kunci hari ("YYYY-MM-DD", WIB) dari sebuah Date.
 */
export function getDayKey(date) {
  if (!date) return null;
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wib.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "19:42" (WIB) */
export function formatJamWib(date) {
  if (!date) return '-';
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  const hh = String(wib.getUTCHours()).padStart(2, '0');
  const mm = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** dayKey ("YYYY-MM-DD") -> Date pada tengah malam WIB */
export function dayKeyToDate(dayKey) {
  if (!dayKey) return null;
  const [y, m, d] = dayKey.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d) - WIB_OFFSET_MS);
}

/** "2026-10-20" -> "Selasa, 20 Oktober 2026" */
export function formatDayKey(dayKey, { withDay = true } = {}) {
  const d = dayKeyToDate(dayKey);
  if (!d) return '-';
  const wib = new Date(d.getTime() + WIB_OFFSET_MS);
  const dayName = DAYS_ID[wib.getUTCDay()];
  const label = `${wib.getUTCDate()} ${MONTHS_ID[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`;
  return withDay ? `${dayName}, ${label}` : label;
}

/** "2026-10" -> "Oktober 2026" */
export function formatMonthKey(monthKey) {
  if (!monthKey) return '-';
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return '-';
  return `${MONTHS_ID[m - 1]} ${y}`;
}

/** Ekstrak UID dari referensi user Firestore. */
export function extractUid(field) {
  if (!field) return null;
  if (typeof field === 'string') {
    const trimmed = field.replace(/^\/?users\//, '').trim();
    return trimmed || null;
  }
  if (field.id) return String(field.id);
  if (field.uid) return String(field.uid);
  if (field.path) {
    const parts = field.path.split('/');
    return parts[parts.length - 1];
  }
  return null;
}

/**
 * Normalisasi dokumen piket.
 */
export function normalizePiketDoc(doc) {
  const data = doc.data ? doc.data() : doc;
  const at = toDateObj(data.timestamp || data.createdAt);
  const userField = data.userPiket || data.user || data.userId || data.uid;
  return {
    id: doc.id,
    uid: extractUid(userField),
    at,
    dayKey: getDayKey(at),
    place: data.place || 'Piket',
    verified: data.verification === true,
    status: data.status === 'rejected' ? 'rejected' : (data.verification === true ? 'verified' : 'pending'),
    laporToUid: extractUid(data.laporTo),
    raw: data,
  };
}

/**
 * Bangun rekap per hari.
 * Satu user dihitung sekali per hari (laporan piket tercepat/terawal).
 */
export function buildDayRecap(records) {
  const byDay = new Map();

  for (const r of records) {
    if (!r.dayKey || !r.uid || !r.at) continue;
    if (!byDay.has(r.dayKey)) byDay.set(r.dayKey, []);
    byDay.get(r.dayKey).push(r);
  }

  const recap = new Map();
  for (const [dayKey, entries] of byDay) {
    // Satu orang hanya dihitung sekali per hari (input tercepat).
    const unique = new Map();
    for (const e of entries) {
      const prev = unique.get(e.uid);
      if (!prev || e.at.getTime() < prev.at.getTime()) unique.set(e.uid, e);
    }
    const sorted = [...unique.values()].sort((a, b) => a.at.getTime() - b.at.getTime());

    const ranked = sorted.map((r, idx) => ({
      ...r,
      rank: idx + 1,
      poin: hitungPoinPeringkat(idx + 1),
      jam: formatJamWib(r.at),
    }));

    recap.set(dayKey, {
      dayKey,
      entries: ranked,
      juara: ranked.slice(0, 3),
    });
  }

  return recap;
}

/**
 * Total poin per user dalam satu periode (bulanan).
 */
export function buildLeaderboard(recap) {
  const agg = new Map();

  for (const { dayKey, entries } of recap.values()) {
    for (const e of entries) {
      if (!agg.has(e.uid)) {
        agg.set(e.uid, {
          uid: e.uid,
          totalPoin: 0,
          hadir: 0,
          juara1: 0,
          juara2: 0,
          juara3: 0,
          rankSum: 0,
          days: [],
        });
      }
      const a = agg.get(e.uid);
      a.totalPoin += e.poin;
      a.hadir += 1;
      a.rankSum += e.rank;
      a.days.push(dayKey);
      if (e.rank === 1) a.juara1 += 1;
      else if (e.rank === 2) a.juara2 += 1;
      else if (e.rank === 3) a.juara3 += 1;
    }
  }

  return [...agg.values()]
    .map((a) => ({
      ...a,
      avgRank: a.hadir ? a.rankSum / a.hadir : 0,
    }))
    .sort((a, b) =>
      b.totalPoin - a.totalPoin ||
      b.juara1 - a.juara1 ||
      b.juara2 - a.juara2 ||
      b.juara3 - a.juara3 ||
      a.avgRank - b.avgRank ||
      b.hadir - a.hadir
    );
}

/** Daftar bulan ("YYYY-MM") yang punya data, terbaru dulu. */
export function listAvailableMonths(records) {
  const set = new Set();
  for (const r of records) {
    if (r.dayKey) set.add(r.dayKey.slice(0, 7));
  }
  return [...set].sort().reverse();
}

/** Filter record berdasarkan bulan "YYYY-MM". */
export function filterByMonth(records, monthKey) {
  if (!monthKey) return records;
  return records.filter((r) => r.dayKey && r.dayKey.startsWith(monthKey));
}

/** Hari terbaru yang ada datanya. */
export function getLatestDayKey(records) {
  let latest = null;
  for (const r of records) {
    if (r.dayKey && (!latest || r.dayKey > latest)) latest = r.dayKey;
  }
  return latest;
}

/** Hari untuk "hari ini" (WIB). */
export function getTodayDayKey(now = new Date()) {
  return getDayKey(now);
}

export { MS_PER_DAY, WIB_OFFSET_MS };
