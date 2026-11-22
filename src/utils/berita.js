// ============================================================
// Berita — operasi Firestore (collection "berita")
// Skema dokumen HARUS sama dengan web/src/utils/berita.js supaya
// berita yang dibuat di app langsung tampil di website asrama.
//   title, kategori, content (Markdown), imageUrl, author,
//   published, date (Timestamp), createdAt, updatedAt
// ============================================================
import { db, storage } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const BERITA_COLLECTION = 'berita';

export const KATEGORI_BERITA = [
  { value: 'umum', label: 'Umum' },
  { value: 'prestasi', label: 'Prestasi' },
  { value: 'event', label: 'Event' },
];

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** Terima Firestore Timestamp / Date / number / string -> Date | null */
export function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** "4 Oktober 2026, 21:15" */
export function formatDateId(value, withTime = false) {
  const d = toDate(value);
  if (!d) return '';
  const base = `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
  if (!withTime) return base;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${base}, ${hh}:${mm}`;
}

/** "YYYY-MM-DD" untuk input type="date" (zona waktu lokal). */
export function toDateInputValue(value) {
  const d = toDate(value) || new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Cuplikan teks polos dari Markdown untuk kartu/list. */
export function toExcerpt(markdown, maxLength = 160) {
  if (!markdown) return '';
  const plain = String(markdown)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength).trimEnd()}…` : plain;
}

/** Normalisasi dokumen Firestore -> bentuk yang dipakai UI. */
export function normalizeBerita(raw) {
  const rawDate = raw.date ?? raw.createdAt ?? null;
  const d = toDate(rawDate);
  return {
    id: raw.id,
    title: raw.title || '',
    kategori: (raw.kategori || raw.category || 'umum').toLowerCase(),
    // `content` adalah field skema baru (Markdown). `desc`/`deskripsi`
    // adalah fallback untuk dokumen lama yang dibuat CreateBerita versi awal.
    content: raw.content ?? raw.desc ?? raw.deskripsi ?? '',
    imageUrl: raw.imageUrl || raw.img || raw.gambar || '',
    author: raw.author || raw.authorUsername || '',
    published: raw.published !== false,
    createdAt: raw.createdAt ?? null,
    date: rawDate,
    dateLabel: formatDateId(rawDate),
    _ts: d ? d.getTime() : 0,
  };
}

/** Ambil semua berita (terbaru lebih dulu). */
export async function fetchBerita({ includeDrafts = true } = {}) {
  const snap = await getDocs(
    query(collection(db, BERITA_COLLECTION), orderBy('createdAt', 'desc'))
  );
  return snap.docs
    .map((d) => normalizeBerita({ id: d.id, ...d.data() }))
    .filter((b) => includeDrafts || b.published)
    .sort((a, b) => b._ts - a._ts);
}

/** Ambil satu berita berdasarkan ID. */
export async function fetchBeritaById(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, BERITA_COLLECTION, id));
  if (!snap.exists()) return null;
  return normalizeBerita({ id: snap.id, ...snap.data() });
}

function buildPayload(data) {
  return {
    title: data.title?.trim() || '',
    kategori: (data.kategori || 'umum').toLowerCase(),
    content: data.content || '',
    imageUrl: data.imageUrl || '',
    author: data.author || '',
    published: data.published !== false,
    date: data.dateInput
      ? Timestamp.fromDate(new Date(`${data.dateInput}T00:00:00`))
      : data.date || Timestamp.now(),
  };
}

export async function createBerita(data) {
  const ref = await addDoc(collection(db, BERITA_COLLECTION), {
    ...buildPayload(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBerita(id, data) {
  await updateDoc(doc(db, BERITA_COLLECTION, id), {
    ...buildPayload(data),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBerita(id) {
  await deleteDoc(doc(db, BERITA_COLLECTION, id));
}

/** Upload gambar cover berita, kembalikan download URL. */
export async function uploadBeritaImage(file) {
  if (!file) return '';
  const safe = (file.name || 'gambar')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-');
  const path = `AsramaApp/berita/cover/${Date.now()}-${safe}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/** Upload gambar inline (dari dalam editor Markdown). */
export async function uploadBeritaInlineImage(file) {
  if (!file) return '';
  const safe = (file.name || 'gambar')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-');
  const path = `AsramaApp/berita/inline/${Date.now()}-${safe}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
