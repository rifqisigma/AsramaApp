import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  normalizeAbsenDoc, buildNightRecap, buildLeaderboard, filterByMonth,
} from '../utils/absenMalamGamification';

/**
 * Memuat seluruh absenMalam + users lalu menghitung klasemen satu bulan.
 * Dipakai di halaman Form Absen Malam untuk menampilkan top-3 klasemen
 * bulan berjalan.
 */
export const useAbsenMalamMonthlyLeaderboard = (monthKey) => {
  const [records, setRecords] = useState([]);
  const [userMap, setUserMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersSnap, absenSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'absenMalam')),
      ]);

      const map = new Map();
      usersSnap.forEach((d) => {
        const u = d.data();
        map.set(d.id, {
          id: d.id,
          name: u.name || u.nama || u.username || 'Warga Asrama',
          username: u.username || '',
          fotoProfil: u.fotoProfil || u.foto || '',
        });
      });

      const recs = absenSnap.docs
        .map(normalizeAbsenDoc)
        .filter((r) => r.uid && r.at);

      if (!mountedRef.current) return;
      setUserMap(map);
      setRecords(recs);
    } catch (err) {
      console.error('Gagal memuat klasemen absen malam:', err);
      if (mountedRef.current) setError(err.message || 'Gagal memuat data.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Muat di tick berikutnya agar setLoading() tidak berjalan sinkron di effect.
    const timer = setTimeout(() => load(), 0);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [load]);

  const leaderboard = useMemo(() => {
    if (!monthKey) return [];
    const recap = buildNightRecap(filterByMonth(records, monthKey));
    return buildLeaderboard(recap);
  }, [records, monthKey]);

  const getUser = useCallback((uid) => userMap.get(uid) || null, [userMap]);

  return { records, userMap, loading, error, reload: load, leaderboard, getUser };
};

export default useAbsenMalamMonthlyLeaderboard;
