import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  normalizePiketDoc, buildDayRecap, buildLeaderboard,
  filterByMonth, listAvailableMonths, getLatestDayKey, getTodayDayKey,
} from '../utils/piketGamification';

/**
 * Memuat data piket + users sekali, lalu menurunkannya menjadi
 * rekap per hari dan papan peringkat per bulan secara lokal.
 */
export const usePiketGamification = () => {
  const [rawRecords, setRawRecords] = useState([]);
  const [userMap, setUserMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersSnap, piketSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'piket')),
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

      const recs = piketSnap.docs
        .map(normalizePiketDoc)
        .filter((r) => r.uid && r.at);

      if (!mountedRef.current) return;
      setUserMap(map);
      setRawRecords(recs);
    } catch (err) {
      console.error('Gagal memuat data peringkat piket:', err);
      if (mountedRef.current) setError(err.message || 'Gagal memuat data piket.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => load(), 0);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [load]);

  const months = useMemo(() => listAvailableMonths(rawRecords), [rawRecords]);

  const todayKey = getTodayDayKey();
  const latestDayKey = useMemo(
    () => getLatestDayKey(rawRecords) || todayKey,
    [rawRecords, todayKey]
  );

  const getRecapForMonth = useCallback(
    (monthKey) => buildDayRecap(filterByMonth(rawRecords, monthKey)),
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
    todayKey,
    latestDayKey,
    getRecapForMonth,
    getLeaderboardForMonth,
    getUser,
  };
};

export default usePiketGamification;
