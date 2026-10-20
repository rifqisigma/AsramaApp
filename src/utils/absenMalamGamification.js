// ============================================================
// Gamifikasi Absen Malam
// ------------------------------------------------------------
// Aturan poin (per malam):
//   - Absen diurutkan berdasarkan waktu input (createdAt) di malam itu.
//   - Juara 1 = 25, juara 2 = 20, juara 3 = 15 poin.
//   - Peringkat 4 dan seterusnya menurun berurutan: 12, 11, 10, 9, ...
//     (minimal 1 poin, tidak pernah negatif).
// Poin dihitung ulang setiap malam dari data absen, jadi total bulanan
// otomatis mengikuti performa harian.
//
// "Malam" ditentukan berdasarkan tanggal KALENDER WIB (UTC+7) dari
// tanggal input, supaya absen pukul 23:59 dan 00:01 dihitung beda malam.
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
  // rank 4 -> 12, rank 5 -> 11, rank 6 -> 10, ...
  return Math.max(1, POIN_PERINGKAT_4 - (rank - 4));
};

/** Ubah berbagai bentuk tanggal absen -> Date | null */
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
 * Kunci malam ("YYYY-MM-DD", WIB) dari sebuah Date.
 * `adalahPagi` = true bila waktu WIB jatuh sebelum tengah hari,
 * dipakai untuk menandai absen yang lewat tengah malam.
 */
export function getNightKey(date) {
  if (!date) return null;
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wib.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "2026-10-20" + "19:42" (WIB) */
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

/** nightKey ("YYYY-MM-DD") -> Date pada tengah malam WIB */
export function nightKeyToDate(nightKey) {
  if (!nightKey) return null;
  const [y, m, d] = nightKey.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d) - WIB_OFFSET_MS);
}

/** "2026-10-20" -> "Selasa, 20 Oktober 2026" */
export function formatNightKey(nightKey, { withDay = true } = {}) {
  const d = nightKeyToDate(nightKey);
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

/** Ekstrak UID dari referensi user Firestore (DocumentReference / string / objek). */
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
 * Normalisasi dokumen absenMalam.
 * @param {{id:string}} doc
 * @returns {{id:string, uid:string|null, at:Date|null, nightKey:string|null, verified:boolean}}
 */
export function normalizeAbsenDoc(doc) {
  const data = doc.data ? doc.data() : doc;
  const at = toDateObj(data.createdAt);
  return {
    id: doc.id,
    uid: extractUid(data.user),
    at,
    nightKey: getNightKey(at),
    verified: data.verification === true,
    raw: data,
  };
}

/**
 * Bangun rekap per malam.
 * @param {Array<{id:string, uid:string|null, at:Date, nightKey:string, verified:boolean}>} records
 * @returns {Map<string, {nightKey:string, entries:Array, juara:Array}>}
 *          Map nilai = peringkat 1..3 (objek record + poin)
 */
export function buildNightRecap(records) {
  const byNight = new Map();

  for (const r of records) {
    if (!r.nightKey || !r.uid || !r.at) continue;
    if (!byNight.has(r.nightKey)) byNight.set(r.nightKey, []);
    byNight.get(r.nightKey).push(r);
  }

  const recap = new Map();
  for (const [nightKey, entries] of byNight) {
    // Satu orang hanya dihitung sekali per malam (input paling awal).
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
    }));

    recap.set(nightKey, {
      nightKey,
      entries: ranked,
      juara: ranked.slice(0, 3),
    });
  }

  return recap;
}

/**
 * Total poin per user dalam rentang tertentu.
 * @param {Map<string, {entries:Array}>} recap
 * @returns {Array<{uid:string, totalPoin:number, hadir:number, juara1:number, juara2:number, juara3:number, nights:string[], avgRank:number}>}
 */
export function buildLeaderboard(recap) {
  const agg = new Map();

  for (const { nightKey, entries } of recap.values()) {
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
          nights: [],
        });
      }
      const a = agg.get(e.uid);
      a.totalPoin += e.poin;
      a.hadir += 1;
      a.rankSum += e.rank;
      a.nights.push(nightKey);
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
    if (r.nightKey) set.add(r.nightKey.slice(0, 7));
  }
  return [...set].sort().reverse();
}

/** Filter record berdasarkan bulan "YYYY-MM". */
export function filterByMonth(records, monthKey) {
  if (!monthKey) return records;
  return records.filter((r) => r.nightKey && r.nightKey.startsWith(monthKey));
}

/** Saring record ke satu malam. */
export function filterByNight(records, nightKey) {
  if (!nightKey) return records;
  return records.filter((r) => r.nightKey === nightKey);
}

/** Malam terbaru yang ada datanya (null jika kosong). */
export function getLatestNightKey(records) {
  let latest = null;
  for (const r of records) {
    if (r.nightKey && (!latest || r.nightKey > latest)) latest = r.nightKey;
  }
  return latest;
}

/** Malam untuk "hari ini" (WIB). */
export function getTodayNightKey(now = new Date()) {
  return getNightKey(now);
}

/** Format tanggal panjang dari Date: "Selasa, 20 Oktober 2026" */
export function formatDateLong(date) {
  if (!date) return '-';
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  return `${DAYS_ID[wib.getUTCDay()]}, ${wib.getUTCDate()} ${MONTHS_ID[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`;
}

export { MS_PER_DAY, WIB_OFFSET_MS };
