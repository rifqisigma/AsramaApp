import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import {
  ArrowLeft,
  Search,
  Calendar,
  Layers,
  Tag,
  Clock,
  Trash2,
  Pencil,
  X,
  AlertTriangle,
  RotateCcw,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  CheckCircle2,
  Scale
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const PAGE_SIZE = 10;

const ListPenghakimanPoin = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Authorization state (strictly kepenghunian, presiden, wakil presiden only)
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState('');

  // Master Caches (Users & SystemPoints are small collections, ~57 & ~43 docs)
  const [usersMap, setUsersMap] = useState({});
  const [systemMap, setSystemMap] = useState({});

  // Paginated List State
  const [histories, setHistories] = useState([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter States
  const [searchUser, setSearchUser] = useState('');
  const [filterDatePreset, setFilterDatePreset] = useState('ALL'); // ALL, TODAY, 7DAYS, MONTH, CUSTOM
  const [customDate, setCustomDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL'); // ALL, BERAT, SEDANG, RINGAN, PRESTASI
  const [filterCode, setFilterCode] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, PENGURANGAN, PENAMBAHAN
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Bottom Sheet Delete State
  const [selectedDeleteHistory, setSelectedDeleteHistory] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sentinel ref for infinite scroll
  const bottomSentinelRef = useRef(null);

  // Helper to extract clean ID from ref or string
  const extractId = (ref, prefix) => {
    if (!ref) return null;
    if (typeof ref === 'string') {
      return ref.replace(new RegExp(`^/?${prefix}/`), '');
    }
    if (ref.id) return ref.id;
    if (ref.path) return ref.path.split('/').pop();
    return null;
  };

  // Helper to resolve raw Firestore docs into rich objects
  const resolveDocs = useCallback((docs, uMap, sMap) => {
    return docs.map((d) => {
      const data = d.data();
      const targetUserId = extractId(data.userref, 'users');
      const pointRefId = extractId(data.pointref, 'systemPoint');
      const judgeUserId = extractId(data.whoJudge, 'users');

      const targetUser = uMap[targetUserId] || null;
      const judgeUser = uMap[judgeUserId] || null;
      const linkedPoint = sMap[pointRefId] || {};

      const code = data.code || linkedPoint.code || '';
      const category = data.category || linkedPoint.category || '';
      const name = data.name || linkedPoint.name || 'Transaksi Poin';
      const desc = data.desc || linkedPoint.desc || '';
      const target = data.target || linkedPoint.target || 'Seluruh penghuni';
      const point = typeof data.point === 'number' ? data.point : (linkedPoint.point ?? 0);
      const type = data.type || linkedPoint.type || (point < 0 ? 'pengurangan' : 'penambahan');

      let dateObj = null;
      if (data.timestamp) {
        if (data.timestamp.toDate && typeof data.timestamp.toDate === 'function') {
          dateObj = data.timestamp.toDate();
        } else {
          const parsed = new Date(data.timestamp);
          if (!isNaN(parsed.getTime())) dateObj = parsed;
        }
      }

      return {
        id: d.id,
        ...data,
        code,
        category,
        name,
        desc,
        target,
        point,
        type,
        parsedDate: dateObj,
        targetUserId,
        targetUser,
        targetUsername: targetUser?.username || targetUser?.name || 'Penghuni',
        targetName: targetUser?.name || targetUser?.username || 'Penghuni',
        targetNim: targetUser?.nim || '',
        targetAngkatan: targetUser?.angkatan || '',
        targetCurrentPoint: typeof targetUser?.point === 'number' ? targetUser.point : 110,
        targetFotoProfil: targetUser?.fotoProfil || null,
        judgeName: judgeUser?.name || judgeUser?.username || 'Staff Kepenghunian'
      };
    });
  }, []);

  // 1. Strict Auth Check: Only Kepenghunian, Presiden, Wakil Presiden
  useEffect(() => {
    const verifyStrictAuth = async () => {
      if (!auth.currentUser) {
        setIsAuthorized(false);
        setLoadingAuth(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const uData = docSnap.data();
          const cleanJabatan = (uData.jabatan || '').toLowerCase().replace(/\s+/g, '').trim();
          setUserRole(uData.jabatan || '');

          // Strictly allow only kepenghunian, presiden, wakil presiden
          const allowedJabatan = ['kepenghunian', 'presiden', 'wakilpresiden', 'wapres'];
          const allowed = allowedJabatan.includes(cleanJabatan);

          if (allowed) {
            setIsAuthorized(true);
            await initializeData();
          } else {
            setIsAuthorized(false);
          }
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error('Error verifying strict authorization:', err);
        setIsAuthorized(false);
      } finally {
        setLoadingAuth(false);
      }
    };

    verifyStrictAuth();
  }, []);

  // 2. Initialize Master Data & Fetch Initial 10 Items from Firestore
  const initializeData = async () => {
    setLoadingInitial(true);
    try {
      // Fetch users and systemPoint once to avoid N extra network calls
      const [usersSnap, systemSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'systemPoint'))
      ]);

      const uMap = {};
      usersSnap.forEach((d) => {
        uMap[d.id] = { id: d.id, ...d.data() };
      });
      setUsersMap(uMap);

      const sMap = {};
      systemSnap.forEach((d) => {
        sMap[d.id] = { id: d.id, ...d.data() };
      });
      setSystemMap(sMap);

      // Query Firestore with LIMIT 10 (never dump all 1030 data at once!)
      const q = query(
        collection(db, 'historyPoint'),
        orderBy('timestamp', 'desc'),
        limit(PAGE_SIZE)
      );

      const historySnap = await getDocs(q);
      const docs = historySnap.docs;

      if (docs.length > 0) {
        const resolved = resolveDocs(docs, uMap, sMap);
        setHistories(resolved);
        setLastVisibleDoc(docs[docs.length - 1]);
        setHasMore(docs.length === PAGE_SIZE);
      } else {
        setHistories([]);
        setLastVisibleDoc(null);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error initializing paginated points:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  // 3. Fetch Next 10 Items from Firestore (startAfter lastVisibleDoc)
  const fetchNextBatch = async () => {
    if (!lastVisibleDoc || loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const q = query(
        collection(db, 'historyPoint'),
        orderBy('timestamp', 'desc'),
        startAfter(lastVisibleDoc),
        limit(PAGE_SIZE)
      );

      const nextSnap = await getDocs(q);
      const docs = nextSnap.docs;

      if (docs.length > 0) {
        const newResolved = resolveDocs(docs, usersMap, systemMap);
        setHistories((prev) => [...prev, ...newResolved]);
        setLastVisibleDoc(docs[docs.length - 1]);
        setHasMore(docs.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching next batch:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // 4. Infinite Scroll Observer ("kalau udah di ujung di get data lagi")
  useEffect(() => {
    if (!bottomSentinelRef.current || !hasMore || loadingMore || loadingInitial) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loadingInitial) {
          fetchNextBatch();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '160px' // Pre-fetch slightly before hitting the exact bottom for smooth UX
      }
    );

    const target = bottomSentinelRef.current;
    observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMore, loadingMore, loadingInitial, lastVisibleDoc, usersMap, systemMap]);

  // Format Date Helper
  const formatDate = (dateObj) => {
    if (!dateObj) return '-';
    return dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  };

  // Category Styling Helper
  const getCategoryColor = (cat) => {
    const c = (cat || '').toUpperCase();
    if (c === 'BERAT') return { bg: isDark ? '#4C1D1D' : '#FEE2E2', border: '#EF4444', text: '#EF4444' };
    if (c === 'SEDANG') return { bg: isDark ? '#452A14' : '#FFEDD5', border: '#F97316', text: '#EA580C' };
    if (c === 'RINGAN') return { bg: isDark ? '#3D2F14' : '#FEF9C3', border: '#EAB308', text: '#CA8A04' };
    if (c === 'PRESTASI') return { bg: isDark ? '#143823' : '#DCFCE7', border: '#22C55E', text: '#16A34A' };
    return { bg: isDark ? '#2D1D13' : '#F3F4F6', border: '#9CA3AF', text: isDark ? '#FED7AA' : '#4B5563' };
  };

  // 5. Client Filtering on Loaded Data
  const filteredHistories = histories.filter((item) => {
    // A. Username / Name
    if (searchUser.trim()) {
      const q = searchUser.toLowerCase().trim();
      const matchUsername = (item.targetUsername || '').toLowerCase().includes(q);
      const matchName = (item.targetName || '').toLowerCase().includes(q);
      const matchNim = (item.targetNim || '').toLowerCase().includes(q);
      const matchAngkatan = String(item.targetAngkatan || '').includes(q);
      if (!matchUsername && !matchName && !matchNim && !matchAngkatan) {
        return false;
      }
    }

    // B. Tanggal Poin
    if (item.parsedDate) {
      const itemDate = new Date(item.parsedDate);
      const today = new Date();

      if (filterDatePreset === 'TODAY') {
        const isToday =
          itemDate.getDate() === today.getDate() &&
          itemDate.getMonth() === today.getMonth() &&
          itemDate.getFullYear() === today.getFullYear();
        if (!isToday) return false;
      } else if (filterDatePreset === '7DAYS') {
        const diffDays = (today.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (filterDatePreset === 'MONTH') {
        const isThisMonth =
          itemDate.getMonth() === today.getMonth() &&
          itemDate.getFullYear() === today.getFullYear();
        if (!isThisMonth) return false;
      } else if (filterDatePreset === 'CUSTOM' && customDate) {
        const itemYMD = itemDate.toISOString().slice(0, 10);
        if (itemYMD !== customDate) return false;
      }
    } else if (filterDatePreset !== 'ALL') {
      return false;
    }

    // C. Jenis Poin (Kategori, Kode, Tipe)
    if (filterCategory !== 'ALL') {
      if ((item.category || '').toUpperCase() !== filterCategory.toUpperCase()) {
        return false;
      }
    }

    if (filterCode.trim()) {
      const codeQuery = filterCode.toLowerCase().trim();
      if (!(item.code || '').toLowerCase().includes(codeQuery)) {
        return false;
      }
    }

    if (filterType !== 'ALL') {
      if (filterType === 'PENGURANGAN' && item.point >= 0) return false;
      if (filterType === 'PENAMBAHAN' && item.point <= 0) return false;
    }

    return true;
  });

  const totalPointsAccumulated = filteredHistories.reduce((acc, curr) => acc + (curr.point || 0), 0);

  const hasActiveFilters =
    searchUser.trim() !== '' ||
    filterDatePreset !== 'ALL' ||
    customDate !== '' ||
    filterCategory !== 'ALL' ||
    filterCode.trim() !== '' ||
    filterType !== 'ALL';

  const resetFilters = () => {
    setSearchUser('');
    setFilterDatePreset('ALL');
    setCustomDate('');
    setFilterCategory('ALL');
    setFilterCode('');
    setFilterType('ALL');
  };

  // 6. Delete Action with Score Reversion
  const handleConfirmDelete = async () => {
    if (!selectedDeleteHistory) return;
    setIsDeleting(true);

    try {
      const { id, targetUserId, point } = selectedDeleteHistory;

      // Revert user score in users collection
      if (targetUserId) {
        const userRef = doc(db, 'users', targetUserId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const currentPoint = userSnap.data().point ?? 110;
          const restoredPoint = Math.min(110, Math.max(0, currentPoint - (point || 0)));
          await updateDoc(userRef, { point: restoredPoint });
        }
      }

      // Delete from historyPoint collection
      await deleteDoc(doc(db, 'historyPoint', id));

      // Remove from loaded state
      setHistories((prev) => prev.filter((item) => item.id !== id));
      setSelectedDeleteHistory(null);
      alert('Riwayat poin berhasil dihapus dan skor santri telah dipulihkan!');
    } catch (err) {
      console.error('Error deleting point history:', err);
      alert('Gagal menghapus riwayat poin: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loadingAuth) {
    return (
      <div
        style={{
          background: isDark ? '#1E130C' : '#FFF9F5',
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#F97316',
          fontWeight: 800,
          fontFamily: '"Nunito", "Inter", sans-serif'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏳</div>
          <span style={{ fontSize: '1.05rem' }}>Memeriksa Izin Akses...</span>
        </div>
      </div>
    );
  }

  // Strict Denied Screen
  if (!isAuthorized) {
    return (
      <div
        style={{
          background: isDark ? '#1E130C' : '#FFF9F5',
          minHeight: '100vh',
          fontFamily: '"Nunito", "Inter", sans-serif',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px'
        }}
      >
        <div
          style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '28px',
            padding: '36px 24px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FECACA'}`,
            boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FEE2E2',
            textAlign: 'center',
            maxWidth: '420px',
            width: '100%'
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: isDark ? '#4C1D1D' : '#FEE2E2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              border: '2px solid #EF4444'
            }}
          >
            <Scale size={34} strokeWidth={2.5} />
          </div>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Akses Ditolak 🔒
          </h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', fontWeight: 650, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.5 }}>
            Halaman ini <strong>hanya dapat diakses oleh jabatan Kepenghunian, Presiden, atau Wakil Presiden</strong>. Jabatan akun Anda saat ini: <strong>{userRole || 'Umum'}</strong>.
          </p>
          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%',
              backgroundColor: '#F97316',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              padding: '13px',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 0 #EA580C'
            }}
          >
            Kembali ke Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: isDark ? '#1E130C' : '#FFF9F5',
        minHeight: '100vh',
        fontFamily: '"Nunito", "Inter", sans-serif',
        padding: '1.75rem 1.25rem 120px 1.25rem',
        maxWidth: '480px',
        margin: '0 auto',
        boxSizing: 'border-box',
        transition: 'background-color 0.3s ease'
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              background: isDark ? '#2D1D13' : '#FFFFFF',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              borderRadius: '14px',
              padding: '9px',
              cursor: 'pointer',
              color: '#F97316',
              boxShadow: `0 3px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none'
            }}
          >
            <ArrowLeft size={19} strokeWidth={3} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#F97316', margin: 0, lineHeight: 1.2 }}>
              Histori Poin
            </h1>
            <p style={{ color: isDark ? '#FED7AA' : '#FB923C', margin: '2px 0 0 0', fontWeight: 650, fontSize: '0.8rem' }}>
              Paginasi 10 data & infinite scroll
            </p>
          </div>
        </div>

        {/* Shortcut to Add Judgement */}
        <button
          onClick={() => navigate('/penghakiman-point')}
          style={{
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '14px',
            padding: '8px 12px',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 3px 0 #DC2626',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            flexShrink: 0
          }}
        >
          <Plus size={16} strokeWidth={3} />
          <span>Hakim</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <input
          type="text"
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          placeholder="Cari username, nama santri, angkatan..."
          style={{
            width: '100%',
            padding: '13px 40px 13px 42px',
            borderRadius: '18px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            fontSize: '0.9rem',
            outline: 'none',
            fontFamily: '"Nunito", "Inter", sans-serif',
            boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            fontWeight: 700,
            color: isDark ? '#FFFFFF' : '#1F2937',
            boxSizing: 'border-box'
          }}
        />
        <Search
          size={18}
          color="#FB923C"
          style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        {searchUser && (
          <button
            onClick={() => setSearchUser('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Toggle Button & Active Filter Tags */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
        <button
          onClick={() => setShowFilterDrawer((prev) => !prev)}
          style={{
            backgroundColor: showFilterDrawer ? '#F97316' : isDark ? '#2D1D13' : '#FFFFFF',
            color: showFilterDrawer ? '#FFFFFF' : '#F97316',
            border: `2px solid ${showFilterDrawer ? '#EA580C' : isDark ? '#4A2E1E' : '#FFEDD5'}`,
            boxShadow: `0 3px 0 ${showFilterDrawer ? '#EA580C' : isDark ? '#4A2E1E' : '#FFEDD5'}`,
            borderRadius: '14px',
            padding: '8px 14px',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <SlidersHorizontal size={15} strokeWidth={2.5} />
          <span>Filter Lanjutan</span>
          {showFilterDrawer ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            style={{
              background: 'none',
              border: 'none',
              color: '#EF4444',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 8px'
            }}
          >
            <RotateCcw size={13} />
            <span>Reset Filter</span>
          </button>
        )}
      </div>

      {/* Filter Drawer / Panel */}
      {showFilterDrawer && (
        <div
          style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '20px',
            padding: '16px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {/* 1. Filter Tanggal Poin */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: '#F97316', marginBottom: '8px' }}>
              <Calendar size={14} /> Tanggal Poin
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { id: 'ALL', label: 'Semua' },
                { id: 'TODAY', label: 'Hari Ini' },
                { id: '7DAYS', label: '7 Hari' },
                { id: 'MONTH', label: 'Bulan Ini' },
                { id: 'CUSTOM', label: 'Pilih Tanggal' }
              ].map((p) => {
                const isSelected = filterDatePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFilterDatePreset(p.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: `1.5px solid ${isSelected ? '#F97316' : isDark ? '#4A2E1E' : '#E5E7EB'}`,
                      backgroundColor: isSelected ? '#F97316' : isDark ? '#1E130C' : '#F9FAFB',
                      color: isSelected ? '#FFFFFF' : isDark ? '#D1D5DB' : '#4B5563',
                      transition: 'all 0.15s'
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {filterDatePreset === 'CUSTOM' && (
              <div style={{ marginTop: '8px' }}>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                    backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}
          </div>

          {/* 2. Filter Kategori Poin */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: '#F97316', marginBottom: '8px' }}>
              <Layers size={14} /> Kategori Poin
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['ALL', 'BERAT', 'SEDANG', 'RINGAN', 'PRESTASI'].map((cat) => {
                const isSelected = filterCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterCategory(cat)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: `1.5px solid ${isSelected ? '#F97316' : isDark ? '#4A2E1E' : '#E5E7EB'}`,
                      backgroundColor: isSelected ? '#F97316' : isDark ? '#1E130C' : '#F9FAFB',
                      color: isSelected ? '#FFFFFF' : isDark ? '#D1D5DB' : '#4B5563',
                      textTransform: 'uppercase'
                    }}
                  >
                    {cat === 'ALL' ? 'Semua' : cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Filter Kode Poin & Tipe */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: '#F97316', marginBottom: '6px' }}>
                <Tag size={14} /> Kode Poin
              </label>
              <input
                type="text"
                value={filterCode}
                onChange={(e) => setFilterCode(e.target.value)}
                placeholder="Contoh: B-01"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                  color: isDark ? '#FFFFFF' : '#1F2937',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#F97316', marginBottom: '6px' }}>
                Tipe Poin
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                  color: isDark ? '#FFFFFF' : '#1F2937',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  boxSizing: 'border-box'
                }}
              >
                <option value="ALL">Semua Tipe</option>
                <option value="PENGURANGAN">Pengurangan (-)</option>
                <option value="PENAMBAHAN">Penambahan (+)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary Bar with Batch Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          padding: '9px 14px',
          borderRadius: '14px',
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          fontSize: '0.78rem',
          fontWeight: 800,
          color: isDark ? '#FED7AA' : '#6B7280'
        }}
      >
        <span>
          Tampil: <strong style={{ color: '#F97316' }}>{filteredHistories.length}</strong> data ({histories.length} termuat)
        </span>
        <span>
          Akumulasi: <strong style={{ color: totalPointsAccumulated < 0 ? '#EF4444' : '#10B981' }}>
            {totalPointsAccumulated > 0 ? '+' : ''}{totalPointsAccumulated} Poin
          </strong>
        </span>
      </div>

      {/* Main List */}
      {loadingInitial ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 0', color: '#F97316', fontWeight: 800 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏳</div>
          Memuat 10 data pertama...
        </div>
      ) : filteredHistories.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '24px',
            border: `2px dashed ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            color: '#FB923C',
            fontWeight: 700
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📋</div>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            {hasActiveFilters ? 'Tidak ada riwayat poin yang cocok pada data saat ini.' : 'Belum ada riwayat penghakiman poin.'}
          </p>
          {hasMore && hasActiveFilters && (
            <button
              onClick={fetchNextBatch}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Cari di 10 Data Berikutnya ➔
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredHistories.map((item) => {
            const isNeg = (item.point || 0) < 0;
            const accentColor = isNeg ? '#EF4444' : '#10B981';
            const bgColor = isNeg ? (isDark ? '#3C1C1C' : '#FEF2F2') : (isDark ? '#1C3D27' : '#F0FDF4');
            const borderColor = isNeg ? (isDark ? '#5C2222' : '#FCA5A5') : (isDark ? '#1C3D27' : '#86EFAC');
            const catStyle = getCategoryColor(item.category);

            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '22px',
                  padding: '16px',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.15s ease'
                }}
              >
                {/* Header: User Info & Point Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: isDark ? '#3D291C' : '#FEF9C3',
                        border: `1.5px solid ${isDark ? '#4A2E1E' : '#FDE047'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden'
                      }}
                    >
                      {item.targetFotoProfil ? (
                        <img src={item.targetFotoProfil} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1rem' }}>👤</span>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.targetName}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 650 }}>
                        <span>@{item.targetUsername}</span>
                        {item.targetAngkatan && (
                          <span style={{ backgroundColor: isDark ? '#3D291C' : '#F3F4F6', padding: '1px 5px', borderRadius: '4px' }}>
                            ' {item.targetAngkatan}
                          </span>
                        )}
                        <span style={{ color: '#F97316', fontWeight: 800 }}>• {item.targetCurrentPoint} Poin</span>
                      </div>
                    </div>
                  </div>

                  {/* Point Badge */}
                  <div
                    style={{
                      padding: '6px 12px',
                      borderRadius: '12px',
                      backgroundColor: bgColor,
                      border: `1.5px solid ${borderColor}`,
                      color: accentColor,
                      fontWeight: 900,
                      fontSize: '1.05rem',
                      flexShrink: 0
                    }}
                  >
                    {isNeg ? '' : '+'}{item.point}
                  </div>
                </div>

                {/* Point details: Code, Category, Rule Title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    {item.code && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          backgroundColor: '#F97316',
                          color: '#FFFFFF'
                        }}
                      >
                        🏷️ {item.code}
                      </span>
                    )}
                    {item.category && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          backgroundColor: catStyle.bg,
                          color: catStyle.text,
                          border: `1px solid ${catStyle.border}`
                        }}
                      >
                        {item.category}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 750,
                        color: isDark ? '#FED7AA' : '#9CA3AF'
                      }}
                    >
                      Target: {item.target || 'Seluruh penghuni'}
                    </span>
                  </div>

                  <h3
                    style={{
                      margin: 0,
                      fontSize: '0.96rem',
                      fontWeight: 850,
                      color: isDark ? '#FFFFFF' : '#1F2937',
                      lineHeight: 1.35
                    }}
                  >
                    {item.name}
                  </h3>

                  {item.desc && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        color: isDark ? '#D1D5DB' : '#6B7280',
                        fontWeight: 600,
                        lineHeight: 1.4
                      }}
                    >
                      {item.desc}
                    </p>
                  )}
                </div>

                {/* Metadata: Date & Judge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: isDark ? '#FED7AA' : '#9CA3AF',
                    fontWeight: 700,
                    borderTop: `1px dashed ${isDark ? '#3D291C' : '#FFEDD5'}`,
                    paddingTop: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    <span>{formatDate(item.parsedDate)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Oleh: <strong style={{ color: '#F97316' }}>{item.judgeName}</strong></span>
                  </div>
                </div>

                {/* Action Buttons: Edit & Delete */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
                  {/* Edit Button */}
                  <button
                    onClick={() => navigate(`/detail-penghakiman-poin?id=${item.id}`)}
                    style={{
                      backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                      color: '#F97316',
                      border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFDBB5'}`,
                      borderRadius: '12px',
                      padding: '9px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      boxShadow: isDark ? '0 2px 0 #4A2E1E' : '0 2px 0 #FFDBB5',
                      outline: 'none'
                    }}
                  >
                    <Pencil size={14} strokeWidth={2.5} />
                    <span>Edit Poin</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => setSelectedDeleteHistory(item)}
                    style={{
                      backgroundColor: isDark ? '#3C1C1C' : '#FEF2F2',
                      color: '#EF4444',
                      border: `1.5px solid ${isDark ? '#5C2222' : '#FCA5A5'}`,
                      borderRadius: '12px',
                      padding: '9px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      boxShadow: isDark ? '0 2px 0 #5C2222' : '0 2px 0 #FCA5A5',
                      outline: 'none'
                    }}
                  >
                    <Trash2 size={14} strokeWidth={2.5} />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION / INFINITE SCROLL CONTROLS AT THE BOTTOM */}
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        {/* Loading Spinner Indicator */}
        {loadingMore && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#F97316',
              fontSize: '0.85rem',
              fontWeight: 800,
              padding: '8px 16px',
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              borderRadius: '20px',
              border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`
            }}
          >
            <Loader2 size={16} className="animate-spin" />
            <span>Memuat 10 riwayat poin berikutnya...</span>
          </div>
        )}

        {/* Manual Load More / Next 10 Data Button */}
        {hasMore && !loadingMore && !loadingInitial && (
          <button
            onClick={fetchNextBatch}
            style={{
              padding: '12px 24px',
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              color: '#F97316',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              borderRadius: '18px',
              fontSize: '0.88rem',
              fontWeight: 850,
              cursor: 'pointer',
              boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              outline: 'none'
            }}
          >
            <span>⬇️ Muat 10 Data Berikutnya</span>
            <span
              style={{
                fontSize: '0.72rem',
                backgroundColor: '#F97316',
                color: 'white',
                padding: '2px 7px',
                borderRadius: '8px'
              }}
            >
              +10
            </span>
          </button>
        )}

        {/* End of list message */}
        {!hasMore && histories.length > 0 && !loadingInitial && (
          <div
            style={{
              fontSize: '0.8rem',
              color: isDark ? '#FED7AA' : '#9CA3AF',
              fontWeight: 700,
              padding: '8px 16px',
              textAlign: 'center'
            }}
          >
            ✨ Seluruh riwayat poin telah selesai dimuat ({histories.length} data).
          </div>
        )}

        {/* Invisible Sentinel Element to trigger IntersectionObserver automatically when scrolling to end */}
        <div ref={bottomSentinelRef} style={{ height: '24px', width: '100%', pointerEvents: 'none' }} />
      </div>

      {/* BOTTOM SHEET FOR DELETE ACTION */}
      {selectedDeleteHistory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end'
          }}
          onClick={() => !isDeleting && setSelectedDeleteHistory(null)}
        >
          <div
            style={{
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              width: '100%',
              maxWidth: '480px',
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              padding: '24px 22px 36px 22px',
              boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: `3px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              borderBottom: 'none',
              boxSizing: 'border-box',
              animation: 'slideUp 0.22s ease-out forwards'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Drag Handle */}
            <div
              style={{
                width: '42px',
                height: '5px',
                backgroundColor: isDark ? '#4A2E1E' : '#E5E7EB',
                borderRadius: '3px',
                alignSelf: 'center',
                marginBottom: '2px'
              }}
            />

            {/* Bottom Sheet Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: isDark ? '#4C1D1D' : '#FEE2E2',
                    color: '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <AlertTriangle size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                    Hapus Riwayat Poin?
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 650 }}>
                    Tindakan ini akan mengembalikan skor santri
                  </p>
                </div>
              </div>

              <button
                disabled={isDeleting}
                onClick={() => setSelectedDeleteHistory(null)}
                style={{
                  background: isDark ? '#3D291C' : '#F3F4F6',
                  border: 'none',
                  borderRadius: '50%',
                  padding: '7px',
                  cursor: 'pointer',
                  color: isDark ? '#FED7AA' : '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>

            {/* Chosen History Card Preview */}
            <div
              style={{
                backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
                borderRadius: '18px',
                padding: '14px',
                border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F97316' }}>
                  Santri Penerima
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
                  @{selectedDeleteHistory.targetUsername}
                </span>
              </div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                {selectedDeleteHistory.targetName}
              </h4>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {selectedDeleteHistory.code && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '2px 6px', borderRadius: '6px', backgroundColor: '#F97316', color: 'white' }}>
                    {selectedDeleteHistory.code}
                  </span>
                )}
                {selectedDeleteHistory.category && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      ...getCategoryColor(selectedDeleteHistory.category)
                    }}
                  >
                    {selectedDeleteHistory.category}
                  </span>
                )}
                <span style={{ fontSize: '0.88rem', fontWeight: 900, color: selectedDeleteHistory.point < 0 ? '#EF4444' : '#10B981', marginLeft: 'auto' }}>
                  {selectedDeleteHistory.point > 0 ? '+' : ''}{selectedDeleteHistory.point} Poin
                </span>
              </div>

              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', fontWeight: 750, color: isDark ? '#E5E7EB' : '#374151', lineHeight: 1.3 }}>
                {selectedDeleteHistory.name}
              </p>
              {selectedDeleteHistory.desc && (
                <p style={{ margin: 0, fontSize: '0.75rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 600 }}>
                  {selectedDeleteHistory.desc}
                </p>
              )}
            </div>

            {/* Score Reversal Impact Box */}
            <div
              style={{
                backgroundColor: isDark ? '#3C1C1C' : '#FEF2F2',
                borderRadius: '16px',
                padding: '12px 14px',
                border: `1.5px solid ${isDark ? '#5C2222' : '#FCA5A5'}`,
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
              }}
            >
              <Info size={20} color="#EF4444" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: isDark ? '#FED7AA' : '#7F1D1D', fontWeight: 700, lineHeight: 1.4 }}>
                Skor saat ini: <strong>{selectedDeleteHistory.targetCurrentPoint} Poin</strong>.
                <br />
                Setelah dihapus menjadi:{' '}
                <strong style={{ color: '#EF4444', fontSize: '0.88rem' }}>
                  {Math.min(110, Math.max(0, selectedDeleteHistory.targetCurrentPoint - (selectedDeleteHistory.point || 0)))} Poin
                </strong>{' '}
                ({selectedDeleteHistory.point < 0 ? 'dipulihkan +' : 'dikurangi -'}{Math.abs(selectedDeleteHistory.point || 0)}).
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setSelectedDeleteHistory(null)}
                style={{
                  padding: '13px',
                  backgroundColor: isDark ? '#3D291C' : '#F3F4F6',
                  color: isDark ? '#FFFFFF' : '#4B5563',
                  border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                  borderRadius: '16px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                style={{
                  padding: '13px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 0 #DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={16} strokeWidth={2.5} />
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        input::placeholder { color: #9CA3AF; }
      `}</style>
    </div>
  );
};

export default ListPenghakimanPoin;
