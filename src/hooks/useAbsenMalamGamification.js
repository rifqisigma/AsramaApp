import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  normalizeAbsenDoc, buildNightRecap, buildLeaderboard,
  filterByMonth, listAvailableMonths, getLatestNightKey, getTodayNightKey,
} from '../utils/absenMalamGamification';

/**
 * Memuat absenMalam + users sekali, lalu menurunkannya menjadi
 * rekap per malam dan papan peringkat per bulan secara lokal.
 */
export const useAbsenMalamGamification = () => {
  const [rawRecords, setRawRecords] = useState([]);
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
          angkatan: u.angkatan || '-',
          prodi: u.prodi || u.prodiNama || '-',
          kamar: u.kamar || u.noKamar || '-',
          fotoProfil: u.fotoProfil || u.foto || '',
        });
      });

      const recs = absenSnap.docs
        .map(normalizeAbsenDoc)
        .filter((r) => r.uid && r.at);

      if (!mountedRef.current) return;
      setUserMap(map);
      setRawRecords(recs);
    } catch (err) {
      console.error('Gagal memuat data absen malam:', err);
      if (mountedRef.current) setError(err.message || 'Gagal memuat data.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Muat data di tick berikutnya agar setLoading() tidak berjalan sinkron
    // di dalam effect (menghindari render berantai).
    const timer = setTimeout(() => load(), 0);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [load]);

  const months = useMemo(() => listAvailableMonths(rawRecords), [rawRecords]);

  const tonightKey = getTodayNightKey();
  const latestNightKey = useMemo(
    () => getLatestNightKey(rawRecords) || tonightKey,
    [rawRecords, tonightKey]
  );

  const getRecapForMonth = useCallback(
    (monthKey) => buildNightRecap(filterByMonth(rawRecords, monthKey)),
    [rawRecords]
  );

  const getLeaderboardForMonth = useCallback(
    (monthKey) => buildLeaderboard(getRecapForMonth(monthKey)),
    [getRecapForMonth]
  );

  const getUser = useCallback(
    (uid) => userMap.get(uid) || null,
    [userMap]
  );

  return {
    rawRecords,
    userMap,
    loading,
    error,
    reload: load,
    months,
    tonightKey,
    latestNightKey,
    getRecapForMonth,
    getLeaderboardForMonth,
    getUser,
  };
};
