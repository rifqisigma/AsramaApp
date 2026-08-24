import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  Calendar,
  User,
  ShieldAlert,
  Clock,
  Award,
  AlertTriangle,
  Scale,
  Sparkles,
  ChevronRight,
  Info,
  Tag
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const DetailPersonPoint = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const selectedUserId = searchParams.get('userId');

  // Authorization state (Only statusPenghuni !== 'CALON')
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Detail View State
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [targetUser, setTargetUser] = useState(null);
  const [userHistories, setUserHistories] = useState([]);
  const [detailFilter, setDetailFilter] = useState('ALL'); // ALL, PENGURANGAN, PENAMBAHAN
  const [detailStats, setDetailStats] = useState({
    currentPoint: 110,
    totalPelanggaran: 0,
    minusPointTotal: 0,
    totalPrestasi: 0,
    plusPointTotal: 0,
    totalTransactions: 0
  });

  // 1. Check User Permission on mount
  useEffect(() => {
    const checkUserAccess = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.statusPenghuni === 'CALON') {
            setIsAuthorized(false);
            setLoadingDetail(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Access check warning:', err);
      }
    };

    checkUserAccess();
  }, []);

  // Redirect to /all-person-point if no userId provided
  useEffect(() => {
    if (!selectedUserId && isAuthorized) {
      navigate('/all-person-point', { replace: true });
    }
  }, [selectedUserId, isAuthorized, navigate]);

  // 2. Fetch Resident Point Details & History
  useEffect(() => {
    if (!selectedUserId) return;

    const fetchUserPointDetail = async () => {
      setLoadingDetail(true);
      try {
        // A. Fetch User Profile
        const userSnap = await getDoc(doc(db, 'users', selectedUserId));
        let uData = {
          id: selectedUserId,
          name: 'Penghuni',
          username: 'penghuni',
          angkatan: '?',
          prodi: '',
          nim: '',
          fotoProfil: null,
          point: 110
        };

        if (userSnap.exists()) {
          const rawU = userSnap.data();
          uData = {
            id: selectedUserId,
            name: rawU.name || rawU.username || 'Penghuni',
            username: rawU.username || rawU.name || 'penghuni',
            angkatan: rawU.angkatan ? String(rawU.angkatan) : '?',
            prodi: rawU.prodi || '',
            nim: rawU.nim || '',
            fotoProfil: rawU.fotoProfil || null,
            point: typeof rawU.point === 'number' ? rawU.point : 110
          };
        }
        setTargetUser(uData);

        // B. Fetch System Points & History Points
        const [historySnap, systemSnap] = await Promise.all([
          getDocs(collection(db, 'historyPoint')),
          getDocs(collection(db, 'systemPoint'))
        ]);

        const systemMap = {};
        systemSnap.forEach((d) => {
          systemMap[d.id] = { id: d.id, ...d.data() };
        });

        const rawList = [];
        let totalPelanggaran = 0;
        let minusPointTotal = 0;
        let totalPrestasi = 0;
        let plusPointTotal = 0;

        for (const docSnap of historySnap.docs) {
          const hData = docSnap.data();
          let targetUid = null;

          if (hData.userref) {
            if (typeof hData.userref === 'string') {
              targetUid = hData.userref.replace(/^\/?users\//, '');
            } else if (hData.userref.id) {
              targetUid = hData.userref.id;
            } else if (hData.userref.path) {
              const parts = hData.userref.path.split('/');
              targetUid = parts[parts.length - 1];
            }
          }

          if (targetUid === selectedUserId) {
            let pointrefId = '';
            if (hData.pointref) {
              if (typeof hData.pointref === 'string') {
                pointrefId = hData.pointref.startsWith('/systemPoint/')
                  ? hData.pointref.split('/')[2]
                  : hData.pointref.replace('systemPoint/', '');
              } else {
                pointrefId = hData.pointref.id || hData.pointref.path?.split('/').pop() || '';
              }
            }
            const linkedPoint = systemMap[pointrefId] || {};

            const pointVal = typeof hData.point === 'number' ? hData.point : Number(hData.point) || 0;
            const type = hData.type || (pointVal < 0 ? 'pengurangan' : 'penambahan');
            const isNegative = pointVal < 0 || type === 'pengurangan';

            if (isNegative) {
              totalPelanggaran += 1;
              minusPointTotal += Math.abs(pointVal);
            } else {
              totalPrestasi += 1;
              plusPointTotal += Math.abs(pointVal);
            }

            rawList.push({
              id: docSnap.id,
              ...hData,
              point: pointVal,
              type,
              isNegative,
              code: hData.code || linkedPoint.code || '',
              category: hData.category || linkedPoint.category || (isNegative ? 'PELANGGARAN' : 'PRESTASI'),
              name: hData.name || linkedPoint.name || (isNegative ? 'Pelanggaran Poin' : 'Poin Prestasi'),
              desc: hData.desc || linkedPoint.desc || '',
              target: hData.target || linkedPoint.target || ''
            });
          }
        }

        // Sort latest first
        rawList.sort((a, b) => {
          const tA = a.timestamp?.toDate ? a.timestamp.toDate() : a.timestamp ? new Date(a.timestamp) : new Date(0);
          const tB = b.timestamp?.toDate ? b.timestamp.toDate() : b.timestamp ? new Date(b.timestamp) : new Date(0);
          return tB - tA;
        });

        setUserHistories(rawList);
        setDetailStats({
          currentPoint: uData.point,
          totalPelanggaran,
          minusPointTotal,
          totalPrestasi,
          plusPointTotal,
          totalTransactions: rawList.length
        });
      } catch (err) {
        console.error('Error fetching user point detail:', err);
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchUserPointDetail();
  }, [selectedUserId]);

  const getPointColor = (point) => {
    if (point >= 100) return '#10B981'; // Green
    if (point >= 75) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const getPointBadgeLabel = (point) => {
    if (point >= 100) return 'Aman 🟢';
    if (point >= 75) return 'Perhatian 🟡';
    return 'Kritis! 🔴';
  };

  const formatTxDate = (raw) => {
    if (!raw) return '-';
    const d = raw.toDate ? raw.toDate() : new Date(raw);
    if (isNaN(d.getTime())) return '-';
    return (
      d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB'
    );
  };

  // RESTRICTED ACCESS SCREEN FOR CALON
  if (!isAuthorized) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: '"Nunito", "Inter", sans-serif',
          padding: '20px'
        }}
      >
        <div
          style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '24px',
            padding: '36px 20px',
            textAlign: 'center',
            maxWidth: '420px',
            width: '100%',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FEE2E2'}`,
            boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FEE2E2'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: isDark ? '#3C1C1C' : '#FEF2F2',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
              marginBottom: '16px',
              border: '2px solid #EF4444'
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Akses Dibatasi
          </h2>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.5 }}>
            Fitur <b>Riwayat & Detail Poin Penghuni</b> hanya dapat diakses oleh penghuni tetap asrama (bukan calon penghuni).
          </p>
          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%',
              padding: '13px',
              backgroundColor: '#F59E0B',
              color: 'white',
              border: '2px solid #D97706',
              borderRadius: '14px',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 0 #D97706'
            }}
          >
            Kembali ke Home
          </button>
        </div>
      </div>
    );
  }

  const filteredHistories = userHistories.filter((h) => {
    if (detailFilter === 'PENGURANGAN') return h.isNegative;
    if (detailFilter === 'PENAMBAHAN') return !h.isNegative;
    return true;
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
        fontFamily: '"Nunito", "Inter", sans-serif',
        padding: '16px 12px 80px 12px',
        transition: 'background-color 0.3s ease'
      }}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Back to Monitoring Points Button */}
        <button
          onClick={() => navigate('/all-person-point')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: isDark ? '#F59E0B' : '#4B5563',
            background: isDark ? '#2D1D13' : '#FFFFFF',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FEF08A'}`,
            padding: '7px 14px',
            borderRadius: '16px',
            boxShadow: isDark ? '0 3px 0 #4A2E1E' : '0 3px 0 #FEF08A',
            fontWeight: 800,
            fontSize: '0.86rem',
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          Kembali ke Rekap Poin
        </button>

        {loadingDetail && !targetUser ? (
          <div
            style={{
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              borderRadius: '20px',
              padding: '36px 16px',
              textAlign: 'center',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FEF08A'}`,
              boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FEF08A'
            }}
          >
            <div
              style={{
                display: 'inline-block',
                width: '36px',
                height: '36px',
                border: '4px solid #F59E0B',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '12px'
              }}
            />
            <h3 style={{ margin: 0, color: isDark ? '#FFFFFF' : '#1F2937', fontWeight: 800, fontSize: '0.98rem' }}>
              Memuat Riwayat Poin...
            </h3>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* Resident Profile & Point Score Card */}
            <div
              style={{
                backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                borderRadius: '20px',
                padding: '16px',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FEF08A'}`,
                borderTop: `8px solid ${getPointColor(detailStats.currentPoint)}`,
                boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FEF08A',
                marginBottom: '16px'
              }}
            >
              {/* Profile Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '16px',
                    backgroundColor: isDark ? '#3D291C' : '#FEF9C3',
                    border: `2.5px solid ${getPointColor(detailStats.currentPoint)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getPointColor(detailStats.currentPoint),
                    fontWeight: 900,
                    fontSize: '1.4rem',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}
                >
                  {targetUser?.fotoProfil ? (
                    <img
                      src={targetUser.fotoProfil}
                      alt={targetUser.username}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    (targetUser?.name || targetUser?.username || 'U').charAt(0).toUpperCase()
                  )}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                    <h1
                      style={{
                        margin: 0,
                        fontSize: '1.12rem',
                        fontWeight: 900,
                        color: isDark ? '#FFFFFF' : '#111827',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {targetUser?.name || targetUser?.username}
                    </h1>
                    <span
                      style={{
                        backgroundColor: isDark ? '#3D291C' : '#FEF9C3',
                        border: '1px solid #F59E0B',
                        color: '#D97706',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '1px 6px',
                        borderRadius: '8px'
                      }}
                    >
                      Angkatan {targetUser?.angkatan || '?'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 700 }}>
                    {targetUser?.prodi && <span>Prodi: {targetUser.prodi.toUpperCase()}</span>}
                    {targetUser?.nim && <span>NIM: {targetUser.nim.toUpperCase()}</span>}
                  </div>
                </div>
              </div>

              {/* Score & Progress Indicator */}
              <div
                style={{
                  backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  border: `1px solid ${isDark ? '#3D291C' : '#E5E7EB'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#6B7280', textTransform: 'uppercase' }}>
                      Skor Poin Kelayakan
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '1px' }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: 900, color: getPointColor(detailStats.currentPoint) }}>
                        {detailStats.currentPoint}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#9CA3AF' : '#6B7280' }}>/ 110 Poin</span>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                      border: `1.5px solid ${getPointColor(detailStats.currentPoint)}`,
                      borderRadius: '12px',
                      padding: '5px 10px',
                      fontWeight: 900,
                      fontSize: '0.78rem',
                      color: getPointColor(detailStats.currentPoint)
                    }}
                  >
                    {getPointBadgeLabel(detailStats.currentPoint)}
                  </div>
                </div>

                {/* Progress Bar */}
                <div
                  style={{
                    height: '8px',
                    borderRadius: '8px',
                    backgroundColor: isDark ? '#3D291C' : '#E5E7EB',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(5, (detailStats.currentPoint / 110) * 100))}%`,
                      backgroundColor: getPointColor(detailStats.currentPoint),
                      borderRadius: '8px',
                      transition: 'width 0.5s ease'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 2x2 Stats Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {/* 1. Pelanggaran */}
              <div
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  border: `1.5px solid ${isDark ? '#7F1D1D' : '#FCA5A5'}`,
                  boxShadow: isDark ? '0 4px 0 #7F1D1D' : '0 4px 0 #FCA5A5',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase' }}>
                    Pelanggaran
                  </span>
                  <span style={{ fontSize: '1rem' }}>⚠️</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#EF4444' }}>
                  {detailStats.totalPelanggaran} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Kali</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isDark ? '#FCA5A5' : '#DC2626' }}>
                  -{detailStats.minusPointTotal} Total Poin Minus
                </span>
              </div>

              {/* 2. Prestasi */}
              <div
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  border: `1.5px solid ${isDark ? '#065F46' : '#A7F3D0'}`,
                  boxShadow: isDark ? '0 4px 0 #065F46' : '0 4px 0 #A7F3D0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>
                    Prestasi
                  </span>
                  <span style={{ fontSize: '1rem' }}>🏆</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#10B981' }}>
                  {detailStats.totalPrestasi} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Kali</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isDark ? '#6EE7B7' : '#059669' }}>
                  +{detailStats.plusPointTotal} Total Poin Plus
                </span>
              </div>
            </div>

            {/* History Section Header & Filter Tabs */}
            <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.15rem' }}>📜</span>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                  Riwayat Transaksi Poin
                </h2>
              </div>

              {/* Filter Pills with Horizontal Scroll */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  paddingBottom: '2px',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <button
                  onClick={() => setDetailFilter('ALL')}
                  style={{
                    flexShrink: 0,
                    padding: '6px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: detailFilter === 'ALL' ? '#F59E0B' : isDark ? '#2D1D13' : '#FFFFFF',
                    color: detailFilter === 'ALL' ? '#FFFFFF' : isDark ? '#FED7AA' : '#6B7280',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 0 rgba(0,0,0,0.06)'
                  }}
                >
                  Semua ({userHistories.length})
                </button>
                <button
                  onClick={() => setDetailFilter('PENGURANGAN')}
                  style={{
                    flexShrink: 0,
                    padding: '6px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: detailFilter === 'PENGURANGAN' ? '#EF4444' : isDark ? '#2D1D13' : '#FFFFFF',
                    color: detailFilter === 'PENGURANGAN' ? '#FFFFFF' : isDark ? '#FED7AA' : '#6B7280',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 0 rgba(0,0,0,0.06)'
                  }}
                >
                  Minus ({detailStats.totalPelanggaran})
                </button>
                <button
                  onClick={() => setDetailFilter('PENAMBAHAN')}
                  style={{
                    flexShrink: 0,
                    padding: '6px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: detailFilter === 'PENAMBAHAN' ? '#10B981' : isDark ? '#2D1D13' : '#FFFFFF',
                    color: detailFilter === 'PENAMBAHAN' ? '#FFFFFF' : isDark ? '#FED7AA' : '#6B7280',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 0 rgba(0,0,0,0.06)'
                  }}
                >
                  Plus ({detailStats.totalPrestasi})
                </button>
              </div>
            </div>

            {/* History List */}
            {filteredHistories.length === 0 ? (
              <div
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '18px',
                  padding: '28px 16px',
                  textAlign: 'center',
                  border: `2px dashed ${isDark ? '#4A2E1E' : '#E5E7EB'}`
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🍃</div>
                <h3 style={{ margin: '0 0 4px 0', color: isDark ? '#FFFFFF' : '#1F2937', fontWeight: 800, fontSize: '0.95rem' }}>
                  Belum Ada Riwayat Poin
                </h3>
                <p style={{ margin: 0, color: isDark ? '#FED7AA' : '#6B7280', fontSize: '0.8rem', fontWeight: 700 }}>
                  Penghuni ini belum memiliki catatan transaksi pada kategori yang dipilih.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredHistories.map((item) => {
                  const isNeg = item.isNegative;

                  return (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                        borderRadius: '16px',
                        padding: '14px',
                        border: `1.5px solid ${
                          isDark ? (isNeg ? '#7F1D1D' : '#065F46') : isNeg ? '#FCA5A5' : '#A7F3D0'
                        }`,
                        boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FEF08A',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      {/* Top Header Line: Left Badges & Right Point Delta */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                          {item.code && (
                            <span
                              style={{
                                backgroundColor: isDark ? '#3D291C' : '#FEF3C7',
                                color: '#D97706',
                                fontWeight: 900,
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: '6px'
                              }}
                            >
                              {item.code}
                            </span>
                          )}
                          <span
                            style={{
                              backgroundColor: isDark
                                ? isNeg
                                  ? '#3C1C1C'
                                  : '#064E3B'
                                : isNeg
                                ? '#FEE2E2'
                                : '#ECFDF5',
                              color: isNeg ? '#EF4444' : '#10B981',
                              fontWeight: 800,
                              fontSize: '0.68rem',
                              padding: '1px 6px',
                              borderRadius: '6px'
                            }}
                          >
                            {item.category || (isNeg ? 'PELANGGARAN' : 'PRESTASI')}
                          </span>
                        </div>

                        {/* Point Delta Pill */}
                        <div
                          style={{
                            backgroundColor: isNeg ? (isDark ? '#3C1C1C' : '#FEF2F2') : isDark ? '#064E3B' : '#ECFDF5',
                            border: `1px solid ${isNeg ? '#EF4444' : '#10B981'}`,
                            borderRadius: '8px',
                            padding: '3px 8px',
                            textAlign: 'center',
                            flexShrink: 0
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.92rem',
                              fontWeight: 900,
                              color: isNeg ? '#EF4444' : '#10B981'
                            }}
                          >
                            {isNeg ? item.point : `+${item.point}`} Poin
                          </span>
                        </div>
                      </div>

                      {/* Rule Name / Title */}
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '0.98rem',
                          fontWeight: 900,
                          color: isDark ? '#FFFFFF' : '#111827',
                          lineHeight: 1.35
                        }}
                      >
                        {item.name}
                      </h3>

                      {/* Description */}
                      {item.desc && (
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: isDark ? '#FED7AA' : '#4B5563',
                            lineHeight: 1.35
                          }}
                        >
                          {item.desc}
                        </p>
                      )}

                      {/* Footer: Date & Created By */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          fontSize: '0.72rem',
                          color: isDark ? '#9CA3AF' : '#6B7280',
                          fontWeight: 700,
                          paddingTop: '6px',
                          borderTop: `1px solid ${isDark ? '#3D291C' : '#F3F4F6'}`,
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          <span>{formatTxDate(item.timestamp)}</span>
                        </div>
                        {item.whoCreate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={12} />
                            <span>Staff Kepenghunian</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DetailPersonPoint;
