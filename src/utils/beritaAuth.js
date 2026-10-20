import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Pastikan pengguna login dan memiliki `jabatan` (pengurus) sebelum
 * boleh mengelola berita. Mengembalikan data user atau null.
 */
export async function getAuthorizedBeritaUser() {
  if (!auth.currentUser) return null;
  const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  const hasJabatan = data?.jabatan && data.jabatan.trim() !== '';
  return hasJabatan ? { uid: auth.currentUser.uid, ...data } : null;
}
