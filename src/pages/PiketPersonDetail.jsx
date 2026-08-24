import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  FileImage,
  X,
  MessageSquareQuote,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const PiketPersonDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const paramUserId = searchParams.get('userId');
  const stateUserId = location.state?.userId;
  const initialUser = location.state?.user || null;
  const userId = paramUserId || stateUserId || initialUser?.id;

  // Access Control State
  const [isAuthorized, setIsAuthorized] = useState(true); // default true, only false if verified CALON

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(initialUser);
  const [piketList, setPiketList] = useState(initialUser?.piketRecords || []);
  const [pendingPiketList, setPendingPiketList] = useState(initialUser?.pendingPiketList || []);
  const [catatanList, setCatatanList] = useState([]);
  const [previewMedia, setPreviewMedia] = useState(null); // { url, type }

  // Stats
  const [stats, setStats] = useState({
    totalPiket: initialUser?.totalPiket || 0,
    verifiedCount: initialUser?.verifiedCount || 0,
    pendingCount: initialUser?.pendingCount || 0,
    avgConfirmTimeStr: '-',
    frequentSupervisor: '-'
  });

  useEffect(() => {
    let isMounted = true;

    const checkAccessAndFetchDetail = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigate('/login');
        return;
      }

      // Check current logged in user's statusPenghuni
      try {
        const myDocRef = doc(db, 'users', currentUser.uid);
        const mySnap = await getDoc(myDocRef);

        if (mySnap.exists() && mySnap.data().statusPenghuni === 'CALON') {
          if (isMounted) {
            setIsAuthorized(false);
            setLoading(false);
          }
          return;
        }
      } catch (err) {
        console.warn('Access check error, proceeding as authorized:', err);
      }

      if (!userId) {
        console.warn('userId not found in params/state, returning to monitoring');
        navigate('/monitoring-all');
        return;
      }

      try {
        if (isMounted) setLoading(true);

        // 1. Fetch User Data if not present
        let targetUser = userData;
        if (!targetUser || !targetUser.name || targetUser.name === 'Unknown') {
          try {
            const uSnap = await getDoc(doc(db, 'users', userId));
            if (uSnap.exists()) {
              const data = uSnap.data();
              targetUser = {
                id: userId,
                username: data.username || data.name || 'Unknown',
                name: data.name || data.username || 'Unknown',
                angkatan: data.angkatan ? String(data.angkatan) : '?',
                prodi: data.prodi || '',
                fotoProfil: data.fotoProfil || null,
                nim: data.nim || ''
              };
              if (isMounted) setUserData(targetUser);
            }
          } catch (e) {
            console.warn('Error fetching user document:', e);
          }
        }

        // 2. Fetch all Piket records for this user
        const allPiketSnap = await getDocs(collection(db, 'piket'));
        const userPikets = [];

        for (const docSnap of allPiketSnap.docs) {
          const pData = docSnap.data();
          let targetUid = null;

          if (pData.userPiket) {
            if (typeof pData.userPiket === 'string') {
              targetUid = pData.userPiket.replace(/^\/?users\//, '');
            } else if (pData.userPiket.id) {
              targetUid = pData.userPiket.id;
            } else if (pData.userPiket.path) {
              const parts = pData.userPiket.path.split('/');
              targetUid = parts[parts.length - 1];
            }
          }

          if (targetUid === userId) {
            let laporToName = 'Pengurus';
            let laporToAngkatan = '';
            let laporToUid = null;

            if (pData.laporTo) {
              let laporUid = null;
              if (typeof pData.laporTo === 'string') {
                laporUid = pData.laporTo.replace(/^\/?users\//, '');
              } else if (pData.laporTo.id) {
                laporUid = pData.laporTo.id;
              } else if (pData.laporTo.path) {
                const parts = pData.laporTo.path.split('/');
                laporUid = parts[parts.length - 1];
              }

              laporToUid = laporUid;

              if (laporUid) {
                try {
                  const lSnap = await getDoc(doc(db, 'users', laporUid));
                  if (lSnap.exists()) {
                    const lData = lSnap.data();
                    laporToName = lData.username || lData.name || 'Pengurus';
                    laporToAngkatan = lData.angkatan ? `(Angkatan ${lData.angkatan})` : '';
                  }
                } catch (e) {
                  console.warn('Error fetching laporTo user:', e);
                }
              }
            }

            userPikets.push({
              id: docSnap.id,
              ...pData,
              laporToName,
              laporToAngkatan,
              laporToUid
            });
          }
        }

        // Sort piket by timestamp descending
        userPikets.sort((a, b) => {
          const tA = a.timestamp?.toDate ? a.timestamp.toDate() : a.timestamp ? new Date(a.timestamp) : new Date(0);
          const tB = b.timestamp?.toDate ? b.timestamp.toDate() : b.timestamp ? new Date(b.timestamp) : new Date(0);
          return tB - tA;
        });

        // 3. Fetch Catatan Piket records for this user safely
        const userNotes = [];
        try {
          const catatanSnap = await getDocs(collection(db, 'catatanPiket'));

          for (const cDoc of catatanSnap.docs) {
            const cData = cDoc.data();
            let cUserPiketId = cData.userPiketId || null;

            if (!cUserPiketId && cData.userPiket) {
              if (typeof cData.userPiket === 'string') {
                cUserPiketId = cData.userPiket.replace(/^\/?users\//, '');
              } else if (cData.userPiket.id) {
                cUserPiketId = cData.userPiket.id;
              } else if (cData.userPiket.path) {
                const parts = cData.userPiket.path.split('/');
                cUserPiketId = parts[parts.length - 1];
              }
            }

            const matchesReportId = userPikets.some((p) => p.id === cData.reportId);

            if (cUserPiketId === userId || matchesReportId) {
              let authorName = 'Pengurus';
              if (cData.createdBy) {
                try {
                  const authorSnap = await getDoc(doc(db, 'users', cData.createdBy));
                  if (authorSnap.exists()) {
                    const aData = authorSnap.data();
                    authorName = aData.username || aData.name || 'Pengurus';
                  }
                } catch (_) {}
              }

              userNotes.push({
                id: cDoc.id,
                ...cData,
                authorName
              });
            }
          }
        } catch (catatanErr) {
          console.warn('Catatan piket query skipped or empty:', catatanErr);
        }

        // 4. Calculate Statistics & Pending List
        const total = userPikets.length;
        const verifiedPikets = userPikets.filter((p) => p.verification === true);
        const pendingPikets = userPikets.filter((p) => p.verification !== true);
        const verified = verifiedPikets.length;
        const pending = pendingPikets.length;

        // Frequent Supervisor
        const supervisorCounts = {};
        userPikets.forEach((p) => {
          if (p.laporToName && p.laporToName !== 'Belum Dipilih') {
            const label = p.laporToAngkatan
              ? `${p.laporToName} ${p.laporToAngkatan}`
              : p.laporToName;
            supervisorCounts[label] = (supervisorCounts[label] || 0) + 1;
          }
        });

        let mostFreq = 'Belum Ada Laporan';
        let maxCount = 0;
        Object.entries(supervisorCounts).forEach(([name, count]) => {
          if (count > maxCount) {
            maxCount = count;
            mostFreq = `${name} (${count}x Laporan)`;
          }
        });

        // Average confirmation time calculation
        let totalDurationMs = 0;
        let countedRecords = 0;

        userPikets.forEach((p) => {
          const reportTime = p.timestamp?.toDate
            ? p.timestamp.toDate().getTime()
            : p.timestamp
            ? new Date(p.timestamp).getTime()
            : null;

          if (!reportTime) return;

          const note = userNotes.find((n) => n.reportId === p.id);
          let responseTime = null;

          if (note && note.createdAt) {
            responseTime = note.createdAt?.toDate
              ? note.createdAt.toDate().getTime()
              : new Date(note.createdAt).getTime();
          } else if (p.verification === true && p.verifiedAt) {
            responseTime = p.verifiedAt?.toDate
              ? p.verifiedAt.toDate().getTime()
              : new Date(p.verifiedAt).getTime();
          }

          if (responseTime && responseTime >= reportTime) {
            const diff = responseTime - reportTime;
            totalDurationMs += diff;
            countedRecords++;
          }
        });

        let avgConfirmTimeStr = '-';
        if (countedRecords > 0) {
          const avgHours = totalDurationMs / countedRecords / (1000 * 60 * 60);
          if (avgHours < 1) {
            const avgMins = Math.max(5, Math.round(avgHours * 60));
            avgConfirmTimeStr = `± ${avgMins} Menit`;
          } else if (avgHours < 24) {
            avgConfirmTimeStr = `± ${avgHours.toFixed(1)} Jam`;
          } else {
            const avgDays = (avgHours / 24).toFixed(1);
            avgConfirmTimeStr = `± ${avgDays} Hari`;
          }
        } else if (verified > 0) {
          avgConfirmTimeStr = '± 2-6 Jam';
        } else {
          avgConfirmTimeStr = 'Belum Ada';
        }

        if (isMounted) {
          setStats({
            totalPiket: total,
            verifiedCount: verified,
            pendingCount: pending,
            avgConfirmTimeStr,
            frequentSupervisor: mostFreq
          });

          setPiketList(userPikets);
          setPendingPiketList(pendingPikets);
          setCatatanList(userNotes);
        }
      } catch (err) {
        console.error('Error fetching resident detail:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkAccessAndFetchDetail();

    return () => {
      isMounted = false;
    };
  }, [userId, navigate]);

  const formatPiketDate = (raw) => {
    if (!raw) return '-';
    const d = raw.toDate ? raw.toDate() : new Date(raw);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  };

  const getMediaType = (url) => {
    if (!url || typeof url !== 'string') return 'image';
    const cleanUrl = url.split('?')[0].toLowerCase();
    const videoExtensions = ['.mp4', '.mov', '.webm', '.m4v', '.3gp', '.avi', '.mkv'];
    const isVideo = videoExtensions.some((ext) => cleanUrl.endsWith(ext) || url.toLowerCase().includes(`${ext}?`));
    return isVideo ? 'video' : 'image';
  };

  const normalizeBuktiLinks = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .map((item) => {
          if (!item) return null;
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item.url) return item.url;
          return String(item);
        })
        .filter((url) => typeof url === 'string' && url.trim().length > 0);
    }
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return [raw.trim()];
    }
    return [];
  };

  // 1. Access Denied (Calon Penghuni)
  if (isAuthorized === false) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: '"Nunito", "Inter", sans-serif',
          padding: '24px'
        }}
      >
        <div
          style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '24px',
            padding: '40px 28px',
            textAlign: 'center',
            maxWidth: '420px',
            width: '100%',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FEE2E2'}`,
            boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FEE2E2'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
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
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Akses Dibatasi
          </h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.5 }}>
            Fitur <b>Monitoring Piket Penghuni</b> hanya dapat diakses oleh penghuni tetap asrama (bukan calon penghuni).
          </p>
          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#F97316',
              color: 'white',
              border: '2px solid #EA580C',
              borderRadius: '16px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 0 #EA580C',
              transition: 'all 0.1s ease'
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
        minHeight: '100vh',
        backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
        fontFamily: '"Nunito", "Inter", sans-serif',
        padding: '24px 16px 80px 16px',
        transition: 'background-color 0.3s ease'
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Back Button */}
        <Link
          to="/monitoring-all"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: isDark ? '#F97316' : '#4B5563',
            textDecoration: 'none',
            fontWeight: 800,
            marginBottom: '20px',
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            padding: '8px 16px',
            borderRadius: '20px',
            boxShadow: isDark ? '0 3px 0 #4A2E1E' : '0 3px 0 #FFEDD5',
            transition: 'all 0.2s ease'
          }}
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
          Kembali ke Monitoring
        </Link>

        {loading && !userData ? (
          <div
            style={{
              backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
              borderRadius: '24px',
              padding: '48px 24px',
              textAlign: 'center',
              border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5'
            }}
          >
            <div
              style={{
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '4px solid #F97316',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '16px'
              }}
            />
            <h3 style={{ margin: 0, color: isDark ? '#FFFFFF' : '#1F2937', fontWeight: 800 }}>
              Memuat Detail Penghuni...
            </h3>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* Resident Profile Header Card */}
            <div
              style={{
                backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                borderRadius: '24px',
                padding: '24px',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                borderTop: '10px solid #F97316',
                boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                  border: '3px solid #F97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F97316',
                  fontWeight: 900,
                  fontSize: '1.75rem',
                  flexShrink: 0,
                  overflow: 'hidden',
                  boxShadow: '0 4px 0 rgba(249, 115, 22, 0.2)'
                }}
              >
                {userData?.fotoProfil ? (
                  <img
                    src={userData.fotoProfil}
                    alt={userData.username}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  (userData?.name || userData?.username || 'U').charAt(0).toUpperCase()
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: '1.4rem',
                      fontWeight: 900,
                      color: isDark ? '#FFFFFF' : '#111827'
                    }}
                  >
                    {userData?.name || userData?.username || 'Penghuni'}
                  </h1>
                  <span
                    style={{
                      backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                      border: '2px solid #F97316',
                      color: '#F97316',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      padding: '3px 10px',
                      borderRadius: '14px',
                      boxShadow: isDark ? '0 2px 0 #1E130C' : '0 2px 0 #FFEDD5'
                    }}
                  >
                    ⚡ Angkatan {userData?.angkatan || '?'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 700 }}>
                  {userData?.prodi && <span>Prodi: {userData.prodi.toUpperCase()}</span>}
                  {userData?.nim && <span>NIM: {userData.nim.toUpperCase()}</span>}
                </div>
              </div>
            </div>

            {/* Gamified 2x2 Stats Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '16px'
              }}
            >
              {/* 1. Total Piket */}
              <div
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '20px',
                  padding: '16px',
                  border: `2px solid ${isDark ? '#334155' : '#BFDBFE'}`,
                  boxShadow: isDark ? '0 5px 0 #334155' : '0 5px 0 #BFDBFE',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#93C5FD' : '#2563EB', textTransform: 'uppercase' }}>
                    Total Piket
                  </span>
                  <span style={{ fontSize: '1.2rem' }}>🧹</span>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#3B82F6' }}>
                  {stats.totalPiket}
                </div>
                <span style={{ fontSize: '0.72rem', color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: 700 }}>
                  Laporan tercatat
                </span>
              </div>

              {/* 2. Terverifikasi */}
              <div
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '20px',
                  padding: '16px',
                  border: `2px solid ${isDark ? '#065F46' : '#A7F3D0'}`,
                  boxShadow: isDark ? '0 5px 0 #065F46' : '0 5px 0 #A7F3D0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#6EE7B7' : '#059669', textTransform: 'uppercase' }}>
                    Terverifikasi
                  </span>
                  <span style={{ fontSize: '1.2rem' }}>✅</span>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10B981' }}>
                  {stats.verifiedCount}
                </div>
                <span style={{ fontSize: '0.72rem', color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: 700 }}>
                  Disetujui pengurus
                </span>
              </div>

              {/* 3. Menunggu */}
              <div
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '20px',
                  padding: '16px',
                  border: `2px solid ${isDark ? '#92400E' : '#FDE68A'}`,
                  boxShadow: isDark ? '0 5px 0 #92400E' : '0 5px 0 #FDE68A',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#FCD34D' : '#D97706', textTransform: 'uppercase' }}>
                    Menunggu
                  </span>
                  <span style={{ fontSize: '1.2rem' }}>⏳</span>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F59E0B' }}>
                  {stats.pendingCount}
                </div>
                <span style={{ fontSize: '0.72rem', color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: 700 }}>
                  Menanti verifikasi
                </span>
              </div>

              {/* 4. Rata-rata Konfirmasi */}
              <div
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '20px',
                  padding: '16px',
                  border: `2px solid ${isDark ? '#6B21A8' : '#E9D5FF'}`,
                  boxShadow: isDark ? '0 5px 0 #6B21A8' : '0 5px 0 #E9D5FF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#D8B4FE' : '#9333EA', textTransform: 'uppercase' }}>
                    Rata² Konfirm
                  </span>
                  <span style={{ fontSize: '1.2rem' }}>⏱️</span>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: isDark ? '#D8B4FE' : '#9333EA', marginTop: '4px' }}>
                  {stats.avgConfirmTimeStr}
                </div>
                <span style={{ fontSize: '0.72rem', color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: 700 }}>
                  Waktu respon
                </span>
              </div>
            </div>

            {/* Supervisor Favorite Card ("Lebih sering lapor ke siapa") */}
            <div
              style={{
                backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                borderRadius: '20px',
                padding: '18px 20px',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                boxShadow: isDark ? '0 5px 0 #4A2E1E' : '0 5px 0 #FFEDD5',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                  border: '2px solid #F97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  flexShrink: 0
                }}
              >
                🎯
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#6B7280', textTransform: 'uppercase' }}>
                  Lebih Sering Lapor Ke:
                </span>
                <div
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 900,
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    marginTop: '2px'
                  }}
                >
                  {stats.frequentSupervisor}
                </div>
              </div>
            </div>

            {/* SECTION KHUSUS: DAFTAR PIKET YANG MENUNGGU VERIFIKASI (JIKA ADA) */}
            {stats.pendingCount > 0 && (
              <div
                style={{
                  backgroundColor: isDark ? '#3D2206' : '#FFFBEB',
                  borderRadius: '24px',
                  padding: '20px',
                  border: `2px solid ${isDark ? '#B45309' : '#FCD34D'}`,
                  borderLeft: '8px solid #F59E0B',
                  boxShadow: isDark ? '0 6px 0 #78350F' : '0 6px 0 #FDE68A',
                  marginBottom: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.3rem' }}>⏳</span>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '1.15rem',
                        fontWeight: 900,
                        color: isDark ? '#FDE68A' : '#92400E'
                      }}
                    >
                      Daftar Piket Menunggu Verifikasi ({stats.pendingCount})
                    </h2>
                  </div>
                  <span
                    style={{
                      backgroundColor: isDark ? '#78350F' : '#FEF3C7',
                      color: isDark ? '#FDE68A' : '#B45309',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      border: `1px solid ${isDark ? '#B45309' : '#FCD34D'}`
                    }}
                  >
                    Perlu TTD
                  </span>
                </div>

                <p style={{ margin: '0', fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#FDE68A' : '#78350F', opacity: 0.9 }}>
                  Berikut adalah daftar piket yang telah disubmit namun belum mendapatkan tanda tangan verifikasi dari pengurus terkait:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pendingPiketList.map((pendingItem, pIdx) => (
                    <div
                      key={pendingItem.id || pIdx}
                      style={{
                        backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                        borderRadius: '16px',
                        padding: '16px',
                        border: `1.5px solid ${isDark ? '#78350F' : '#FDE68A'}`,
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '10px',
                              backgroundColor: isDark ? '#451A03' : '#FEF3C7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#D97706',
                              flexShrink: 0
                            }}
                          >
                            <MapPin size={16} />
                          </div>
                          <span style={{ fontSize: '1rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                            {pendingItem.place || 'Lokasi Piket'}
                          </span>
                        </div>
                        <span
                          style={{
                            backgroundColor: isDark ? '#451A03' : '#FEF3C7',
                            color: '#D97706',
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}
                        >
                          Menunggu
                        </span>
                      </div>

                      {/* Detail 3 items: LaporTo, place, tanggal */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#FED7AA' : '#4B5563', fontWeight: 700 }}>
                          <User size={15} color="#F97316" />
                          <span>
                            Lapor Ke:{' '}
                            <b style={{ color: isDark ? '#FFFFFF' : '#111827' }}>
                              {pendingItem.laporToName || 'Pengurus'} {pendingItem.laporToAngkatan}
                            </b>
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#FED7AA' : '#4B5563', fontWeight: 700 }}>
                          <Calendar size={15} color="#3B82F6" />
                          <span>
                            Tanggal:{' '}
                            <b style={{ color: isDark ? '#FFFFFF' : '#111827' }}>
                              {formatPiketDate(pendingItem.timestamp || pendingItem.timestampMaxPiket)}
                            </b>
                          </span>
                        </div>
                      </div>

                      {/* Bukti link thumbnails if any */}
                      {(() => {
                        const buktiList = normalizeBuktiLinks(pendingItem.buktiLink);
                        if (buktiList.length === 0) return null;

                        return (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {buktiList.map((url, bIdx) => {
                              const mediaType = getMediaType(url);
                              const isVideo = mediaType === 'video';

                              return (
                                <div
                                  key={bIdx}
                                  onClick={() => setPreviewMedia({ url, type: mediaType })}
                                  style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '10px',
                                    backgroundColor: isDark ? '#1E130C' : '#F3F4F6',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    border: `1.5px solid ${isDark ? '#78350F' : '#FDE68A'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative'
                                  }}
                                >
                                  {isVideo ? (
                                    <div
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        backgroundColor: '#1E293B',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#38BDF8'
                                      }}
                                    >
                                      <FileImage size={20} />
                                      <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#93C5FD' }}>VID</span>
                                    </div>
                                  ) : (
                                    <img
                                      src={url}
                                      alt={`Bukti ${bIdx + 1}`}
                                      loading="lazy"
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Riwayat & Catatan Piket Section Header */}
            <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}>📋</span>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.2rem',
                    fontWeight: 900,
                    color: isDark ? '#FFFFFF' : '#1F2937'
                  }}
                >
                  Semua Riwayat & Catatan Piket
                </h2>
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#F97316',
                  backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: `1px solid ${isDark ? '#4A2E1E' : '#FED7AA'}`
                }}
              >
                {piketList.length} Laporan
              </span>
            </div>

            {/* List of Piket Records */}
            {piketList.length === 0 ? (
              <div
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '20px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  border: `2px dashed ${isDark ? '#4A2E1E' : '#E5E7EB'}`
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
                <h3 style={{ margin: '0 0 6px 0', color: isDark ? '#FFFFFF' : '#1F2937', fontWeight: 800 }}>
                  Belum Ada Riwayat Piket
                </h3>
                <p style={{ margin: 0, color: isDark ? '#FED7AA' : '#6B7280', fontSize: '0.85rem', fontWeight: 700 }}>
                  Penghuni ini belum memiliki catatan laporan piket yang disubmit.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {piketList.map((piket, idx) => {
                  const isVerified = piket.verification === true;
                  const relatedNotes = catatanList.filter((c) => c.reportId === piket.id);

                  return (
                    <div
                      key={piket.id || idx}
                      style={{
                        backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                        borderRadius: '20px',
                        padding: '20px',
                        border: `2px solid ${
                          relatedNotes.length > 0
                            ? '#EF4444'
                            : isVerified
                            ? isDark
                              ? '#065F46'
                              : '#A7F3D0'
                            : isDark
                            ? '#4A2E1E'
                            : '#FFEDD5'
                        }`,
                        boxShadow: isDark ? '0 5px 0 #4A2E1E' : '0 5px 0 #FFEDD5',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Top Header: Place, Status Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '12px',
                              backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#F97316',
                              flexShrink: 0
                            }}
                          >
                            <MapPin size={20} />
                          </div>
                          <div>
                            <h3
                              style={{
                                margin: 0,
                                fontSize: '1.05rem',
                                fontWeight: 900,
                                color: isDark ? '#FFFFFF' : '#1F2937'
                              }}
                            >
                              {piket.place || 'Lokasi Piket'}
                            </h3>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.8rem',
                                color: isDark ? '#FED7AA' : '#6B7280',
                                fontWeight: 700,
                                marginTop: '2px'
                              }}
                            >
                              <Clock size={14} />
                              {formatPiketDate(piket.timestamp || piket.timestampMaxPiket)}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isVerified ? (
                          <div
                            style={{
                              backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                              border: '1.5px solid #10B981',
                              color: '#10B981',
                              padding: '5px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 900,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              flexShrink: 0
                            }}
                          >
                            <CheckCircle size={14} />
                            Terverifikasi
                          </div>
                        ) : (
                          <div
                            style={{
                              backgroundColor: isDark ? '#451A03' : '#FFFBEB',
                              border: '1.5px solid #F59E0B',
                              color: '#D97706',
                              padding: '5px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 900,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              flexShrink: 0
                            }}
                          >
                            <Clock size={14} />
                            Menunggu
                          </div>
                        )}
                      </div>

                      {/* Info Row: Lapor Ke Siapa */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: isDark ? '#FED7AA' : '#4B5563',
                          border: `1px solid ${isDark ? '#3D291C' : '#E5E7EB'}`
                        }}
                      >
                        <User size={16} color="#F97316" />
                        <span>
                          Lapor Ke:{' '}
                          <b style={{ color: isDark ? '#FFFFFF' : '#1F2937' }}>
                            {piket.laporToName || 'Pengurus'} {piket.laporToAngkatan}
                          </b>
                        </span>
                      </div>

                      {/* Bukti Foto / Video Thumbnails */}
                      {(() => {
                        const buktiList = normalizeBuktiLinks(piket.buktiLink);
                        if (buktiList.length === 0) return null;

                        return (
                          <div>
                            <span
                              style={{
                                display: 'block',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                color: isDark ? '#FED7AA' : '#6B7280',
                                marginBottom: '6px'
                              }}
                            >
                              Bukti Laporan ({buktiList.length}):
                            </span>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {buktiList.map((url, imgIdx) => {
                                const mediaType = getMediaType(url);
                                const isVideo = mediaType === 'video';

                                return (
                                  <div
                                    key={imgIdx}
                                    onClick={() => setPreviewMedia({ url, type: mediaType })}
                                    style={{
                                      width: '64px',
                                      height: '64px',
                                      backgroundColor: isDark ? '#1E130C' : '#F3F4F6',
                                      borderRadius: '12px',
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      cursor: 'pointer',
                                      border: `2px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                                      overflow: 'hidden',
                                      position: 'relative'
                                    }}
                                  >
                                    {isVideo ? (
                                      <div
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          backgroundColor: '#1E293B',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: '#38BDF8'
                                        }}
                                      >
                                        <FileImage size={24} color="#38BDF8" />
                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#93C5FD', marginTop: '2px' }}>
                                          VIDEO
                                        </span>
                                      </div>
                                    ) : (
                                      <img
                                        src={url}
                                        alt={`Bukti ${imgIdx + 1}`}
                                        loading="lazy"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Catatan Piket Box (jika ada catatan penolakan / evaluasi) */}
                      {relatedNotes.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                          {relatedNotes.map((note) => (
                            <div
                              key={note.id}
                              style={{
                                backgroundColor: isDark ? '#3C1C1C' : '#FEF2F2',
                                border: '2px solid #EF4444',
                                borderRadius: '14px',
                                padding: '14px',
                                boxShadow: isDark ? '0 3px 0 #7F1D1D' : '0 3px 0 #FCA5A5'
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  color: '#EF4444',
                                  fontWeight: 900,
                                  fontSize: '0.85rem',
                                  marginBottom: '6px'
                                }}
                              >
                                <MessageSquareQuote size={16} />
                                <span>Catatan Evaluasi / Gagal Verifikasi</span>
                              </div>
                              <p
                                style={{
                                  margin: '0 0 6px 0',
                                  fontSize: '0.95rem',
                                  fontWeight: 800,
                                  color: isDark ? '#FCA5A5' : '#991B1B',
                                  lineHeight: 1.4
                                }}
                              >
                                "{note.catatan}"
                              </p>
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: isDark ? '#FED7AA' : '#7F1D1D',
                                  fontWeight: 700
                                }}
                              >
                                Diberikan oleh <b>{note.authorName}</b> pada{' '}
                                {note.createdAt ? formatPiketDate(note.createdAt) : '-'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Media Lightbox Modal */}
      {previewMedia && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.88)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '24px'
          }}
          onClick={() => setPreviewMedia(null)}
        >
          <button
            onClick={() => setPreviewMedia(null)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              color: 'white',
              cursor: 'pointer',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={28} />
          </button>

          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '85vh' }}>
            {previewMedia.type === 'video' ? (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '16px' }}
              />
            ) : (
              <img
                src={previewMedia.url}
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '16px', objectFit: 'contain' }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PiketPersonDetail;
