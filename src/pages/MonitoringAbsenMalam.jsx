import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  Search,
  Users,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  RotateCw,
  ShieldAlert,
  Calendar,
  Sparkles,
  User,
  MapPin,
  TrendingUp,
  Filter
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const MonitoringAbsenMalam = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Role Access State
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);

  // Data States
  const [loadingData, setLoadingData] = useState(true);
  const [calonUsers, setCalonUsers] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'HAS_PENDING' | 'HAS_ABSEN' | 'NO_ABSEN'
  const [sortBy, setSortBy] = useState('total_desc'); // 'total_desc' | 'total_asc' | 'pending_desc' | 'name_asc' | 'angkatan_desc'

  // Helper UID extractor
  const extractUid = (field) => {
    if (!field) return null;
    if (typeof field === 'string') return field.replace(/^\/?users\//, '').trim();
    if (field.id) return String(field.id).trim();
    if (field.uid) return String(field.uid).trim();
    if (field.path) {
      const parts = field.path.split('/');
      return parts[parts.length - 1].trim();
    }
    return null;
  };

  // 1. Authorize User
  useEffect(() => {
    const checkAccess = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }
      try {
        const myDocRef = doc(db, 'users', auth.currentUser.uid);
        const myDocSnap = await getDoc(myDocRef);
        if (myDocSnap.exists()) {
          const uData = myDocSnap.data();
          setCurrentUserData(uData);

          const status = (uData?.statusPenghuni || uData?.status_penghuni || '').toUpperCase();
          const hasJabatan = uData?.jabatan && uData.jabatan.trim() !== '';
          const allowed = status !== 'CALON' || hasJabatan;

          setIsAuthorized(allowed);
          if (allowed) {
            fetchMonitoringData();
          }
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error('Error checking authorization:', err);
        setIsAuthorized(false);
      } finally {
        setLoadingAuth(false);
      }
    };

    checkAccess();
  }, [navigate]);

  // 2. Fetch Data Monitoring
  const fetchMonitoringData = async () => {
    setLoadingData(true);
    try {
      // A. Ambil semua data users
      const usersSnap = await getDocs(collection(db, 'users'));
      const allCalonList = [];

      usersSnap.forEach(d => {
        const u = d.data();
        const status = (u?.statusPenghuni || u?.status_penghuni || '').toUpperCase();
        if (status === 'CALON') {
          allCalonList.push({
            id: d.id,
            name: u.name || u.username || 'Calon Penghuni',
            username: u.username || '-',
            email: u.email || '-',
            angkatan: u.angkatan || '?',
            prodi: u.prodi || '-',
            kamar: u.kamar || u.noKamar || '-',
            fotoProfil: u.fotoProfil || u.foto || '',
            statusPenghuni: 'CALON',
            jabatan: u.jabatan || ''
          });
        }
      });

      // B. Ambil semua data absenMalam
      const absenSnap = await getDocs(collection(db, 'absenMalam'));
      const userAbsenMap = new Map();

      absenSnap.forEach(d => {
        const data = d.data();
        const submitterUid = extractUid(data.user) || extractUid(data.userId) || extractUid(data.uid);

        if (submitterUid) {
          if (!userAbsenMap.has(submitterUid)) {
            userAbsenMap.set(submitterUid, []);
          }

          let reportDate = null;
          const rawDate = data.createdAt || data.timestamp;
          if (rawDate) {
            reportDate = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
          }

          const isVerified = data.verification === true || data.status === 'verified' || data.status === 'approved';
          const isRejected = data.status === 'rejected' || data.status === 'tidak_disetujui' || data.verification === 'rejected';

          userAbsenMap.get(submitterUid).push({
            id: d.id,
            ...data,
            createdAtDate: reportDate,
            isVerified,
            isRejected
          });
        }
      });

      // C. Hitung ringkasan statistik per calon
      const summarizedCalon = allCalonList.map(calon => {
        const records = userAbsenMap.get(calon.id) || [];
        
        // Urutkan riwayat absen dari paling baru
        records.sort((a, b) => (b.createdAtDate?.getTime() || 0) - (a.createdAtDate?.getTime() || 0));

        const totalAbsen = records.length;
        const verifiedAbsen = records.filter(r => r.isVerified).length;
        const pendingAbsen = records.filter(r => !r.isVerified && !r.isRejected).length;
        const rejectedAbsen = records.filter(r => r.isRejected).length;
        const lastAbsen = records.length > 0 ? records[0].createdAtDate : null;

        return {
          ...calon,
          totalAbsen,
          verifiedAbsen,
          pendingAbsen,
          rejectedAbsen,
          lastAbsen,
          records
        };
      });

      setCalonUsers(summarizedCalon);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Gagal mengambil data monitoring absen malam:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // 3. Global Summary Metrics
  const globalMetrics = useMemo(() => {
    let totalCalon = calonUsers.length;
    let totalAbsen = 0;
    let totalVerified = 0;
    let totalPending = 0;

    calonUsers.forEach(c => {
      totalAbsen += c.totalAbsen;
      totalVerified += c.verifiedAbsen;
      totalPending += c.pendingAbsen;
    });

    return { totalCalon, totalAbsen, totalVerified, totalPending };
  }, [calonUsers]);

  // 4. Filtering & Sorting
  const filteredCalonUsers = useMemo(() => {
    return calonUsers
      .filter(calon => {
        // Filter Pencarian
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = calon.name.toLowerCase().includes(q);
          const matchUname = calon.username.toLowerCase().includes(q);
          const matchAngkatan = String(calon.angkatan).toLowerCase().includes(q);
          const matchProdi = (calon.prodi || '').toLowerCase().includes(q);
          const matchKamar = (calon.kamar || '').toLowerCase().includes(q);
          if (!matchName && !matchUname && !matchAngkatan && !matchProdi && !matchKamar) {
            return false;
          }
        }

        // Filter Status Tab
        if (statusFilter === 'HAS_PENDING' && calon.pendingAbsen === 0) return false;
        if (statusFilter === 'HAS_ABSEN' && calon.totalAbsen === 0) return false;
        if (statusFilter === 'NO_ABSEN' && calon.totalAbsen > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'total_desc') return b.totalAbsen - a.totalAbsen;
        if (sortBy === 'total_asc') return a.totalAbsen - b.totalAbsen;
        if (sortBy === 'pending_desc') return b.pendingAbsen - a.pendingAbsen;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        if (sortBy === 'angkatan_desc') return String(b.angkatan).localeCompare(String(a.angkatan));
        return 0;
      });
  }, [calonUsers, searchQuery, statusFilter, sortBy]);

  // Format Helper
  const formatLastAbsen = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return 'Belum pernah absen';
    return dateObj.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  };

  // Unauthorized Access Screen
  if (!loadingAuth && !isAuthorized) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: isDark ? '#1E130C' : '#F3F4F6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: '"Nunito", "Inter", sans-serif'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '24px',
          padding: '32px 24px',
          textAlign: 'center',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5, 0 12px 20px rgba(0,0,0,0.06)'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            backgroundColor: isDark ? '#4C1A1A' : '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            border: `2px solid ${isDark ? '#DC2626' : '#FCA5A5'}`
          }}>
            <ShieldAlert size={36} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1C1C1E', margin: '0 0 8px 0' }}>
            Akses Dibatasi
          </h2>
          <p style={{ fontSize: '0.92rem', color: isDark ? '#FED7AA' : '#6B7280', margin: '0 0 24px 0', lineHeight: 1.5 }}>
            Halaman <strong>Monitoring Absen Malam</strong> khusus untuk Penghuni Tetap / Pengurus Asrama.
          </p>

          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#F97316',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 0 #EA580C'
            }}
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#1E130C' : '#F3F4F6',
      fontFamily: '"Nunito", "Inter", sans-serif',
      padding: '24px 16px 80px 16px',
      transition: 'background-color 0.3s ease'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Back Link */}
        <Link to="/home" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: isDark ? '#F97316' : '#4B5563',
          textDecoration: 'none',
          fontWeight: 700,
          marginBottom: '20px',
          backgroundColor: isDark ? '#2D1D13' : 'white',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          padding: '8px 16px',
          borderRadius: '20px',
          boxShadow: isDark ? '0 2px 5px rgba(0,0,0,0.3)' : '0 2px 5px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease'
        }}>
          <ArrowLeft size={18} />
          Kembali ke Home
        </Link>

        {/* Header Banner */}
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '24px',
          padding: '28px 24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          borderTop: '8px solid #F43F5E',
          boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5, 0 10px 15px rgba(244, 63, 94, 0.05)',
          marginBottom: '24px',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '14px',
                  backgroundColor: isDark ? '#4C1D24' : '#FFE4E6',
                  color: '#F43F5E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ClipboardCheck size={26} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1C1C1E', margin: 0 }}>
                    Monitoring Absen Malam
                  </h1>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#F43F5E',
                    backgroundColor: isDark ? '#3D1C22' : '#FFF1F2',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    border: '1px solid #F43F5E',
                    display: 'inline-block',
                    marginTop: '4px'
                  }}>
                    Khusus Calon Penghuni
                  </span>
                </div>
              </div>
              <p style={{ color: isDark ? '#FED7AA' : '#6B7280', margin: '8px 0 0 0', fontSize: '0.92rem', fontWeight: 600 }}>
                Pantau keaktifan absensi malam warga berstatus <strong>CALON</strong> secara real-time.
              </p>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchMonitoringData}
              disabled={loadingData}
              style={{
                padding: '10px 16px',
                borderRadius: '14px',
                border: `2px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                color: isDark ? '#FED7AA' : '#4B5563',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: loadingData ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isDark ? '0 3px 0 #4A2E1E' : '0 3px 0 #E5E7EB',
                transition: 'all 0.15s'
              }}
            >
              <RotateCw size={15} style={{ animation: loadingData ? 'spin 1s linear infinite' : 'none', color: '#F43F5E' }} />
              <span>{loadingData ? 'Memuat...' : 'Refresh Data'}</span>
            </button>
          </div>

          {/* 📊 Global Metrics Summary Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: `1px solid ${isDark ? '#4A2E1E' : '#F3F4F6'}`
          }}>
            {/* Metric 1: Total Calon */}
            <div style={{
              padding: '14px',
              borderRadius: '16px',
              backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
              border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#6B7280', textTransform: 'uppercase' }}>
                Total Calon
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#111827' }}>
                {globalMetrics.totalCalon} <small style={{ fontSize: '0.8rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#9CA3AF' }}>orang</small>
              </span>
            </div>

            {/* Metric 2: Total Absen */}
            <div style={{
              padding: '14px',
              borderRadius: '16px',
              backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
              border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#6B7280', textTransform: 'uppercase' }}>
                Total Absen
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#3B82F6' }}>
                {globalMetrics.totalAbsen} <small style={{ fontSize: '0.8rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#9CA3AF' }}>kali</small>
              </span>
            </div>

            {/* Metric 3: Menunggu Verifikasi */}
            <div style={{
              padding: '14px',
              borderRadius: '16px',
              backgroundColor: isDark ? '#3D291C' : '#FFFBEB',
              border: `1.5px solid ${isDark ? '#D97706' : '#FDE68A'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase' }}>
                Menunggu TTD
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#F59E0B' }}>
                {globalMetrics.totalPending} <small style={{ fontSize: '0.8rem', fontWeight: 700, color: '#D97706' }}>laporan</small>
              </span>
            </div>

            {/* Metric 4: Sudah Disetujui */}
            <div style={{
              padding: '14px',
              borderRadius: '16px',
              backgroundColor: isDark ? '#1C3D27' : '#DCFCE7',
              border: `1.5px solid ${isDark ? '#16A34A' : '#86EFAC'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16A34A', textTransform: 'uppercase' }}>
                Disetujui
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10B981' }}>
                {globalMetrics.totalVerified} <small style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16A34A' }}>laporan</small>
              </span>
            </div>
          </div>
        </div>

        {/* 🔍 Search & Filter Bar Section */}
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '20px',
          padding: '16px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5'
        }}>
          {/* Row 1: Search Input & Sort Dropdown */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              flex: 1,
              minWidth: '220px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
              border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
              borderRadius: '14px',
              padding: '10px 14px'
            }}>
              <Search size={16} color={isDark ? '#FED7AA' : '#9CA3AF'} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama calon, angkatan, kamar..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.9rem',
                  color: isDark ? '#FFFFFF' : '#1F2937',
                  fontWeight: 700,
                  fontFamily: '"Nunito", "Inter", sans-serif'
                }}
              />
            </div>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '14px',
                border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                color: isDark ? '#FED7AA' : '#1F2937',
                fontWeight: 750,
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: '"Nunito", "Inter", sans-serif'
              }}
            >
              <option value="total_desc">📊 Absen Terbanyak</option>
              <option value="total_asc">📉 Absen Tersedikit</option>
              <option value="pending_desc">⏳ Paling Banyak Menunggu</option>
              <option value="name_asc">🔤 Nama (A - Z)</option>
              <option value="angkatan_desc">🎓 Angkatan Terbaru</option>
            </select>
          </div>

          {/* Row 2: Status Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: `Semua Calon (${calonUsers.length})` },
              { key: 'HAS_PENDING', label: `Ada Menunggu TTD (${calonUsers.filter(c => c.pendingAbsen > 0).length})` },
              { key: 'HAS_ABSEN', label: `Sudah Pernah Absen (${calonUsers.filter(c => c.totalAbsen > 0).length})` },
              { key: 'NO_ABSEN', label: `Belum Pernah Absen (${calonUsers.filter(c => c.totalAbsen === 0).length})` }
            ].map(tab => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: isActive ? '1.5px solid #F43F5E' : `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                    backgroundColor: isActive ? (isDark ? '#4C1D24' : '#FFE4E6') : (isDark ? '#1E130C' : '#FFFFFF'),
                    color: isActive ? '#F43F5E' : (isDark ? '#FED7AA' : '#6B7280'),
                    transition: 'all 0.1s'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 📋 List of Calon Users */}
        {loadingData ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '24px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`
          }}>
            <RotateCw size={32} style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 16px auto', display: 'block', color: '#F43F5E' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1C1C1E' }}>
              Memuat Data Monitoring Absen...
            </h3>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: isDark ? '#FED7AA' : '#6B7280' }}>
              Sinkronisasi data calon penghuni dan riwayat absensi malam
            </p>
          </div>
        ) : filteredCalonUsers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '50px 20px',
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '24px',
            border: `2px dashed ${isDark ? '#4A2E1E' : '#FFEDD5'}`
          }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>🔍</span>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1C1C1E' }}>
              Tidak Ada Calon Ditemukan
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 600 }}>
              {searchQuery || statusFilter !== 'ALL'
                ? 'Coba ubah filter atau kata kunci pencarian Anda.'
                : 'Belum ada akun dengan statusPenghuni CALON di sistem.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredCalonUsers.map(calon => (
              <div
                key={calon.id}
                onClick={() => navigate(`/detail-person-absen-malam?userId=${calon.id}`, { state: { user: calon, userId: calon.id } })}
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '20px',
                  padding: '18px 20px',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  borderLeft: calon.pendingAbsen > 0 
                    ? '6px solid #F59E0B' 
                    : (calon.totalAbsen > 0 ? '6px solid #10B981' : '6px solid #9CA3AF'),
                  boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5, 0 4px 10px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
              >
                {/* User Info Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <img
                      src={calon.fotoProfil || `https://ui-avatars.com/api/?name=${encodeURIComponent(calon.name)}&background=F43F5E&color=fff&size=100&bold=true`}
                      alt={calon.name}
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2.5px solid #F43F5E',
                        flexShrink: 0
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: '1.05rem',
                        fontWeight: 900,
                        color: isDark ? '#FFFFFF' : '#1C1C1E',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {calon.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
                          @{calon.username}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: '#F43F5E',
                          backgroundColor: isDark ? '#4C1D24' : '#FFE4E6',
                          padding: '1px 6px',
                          borderRadius: '6px'
                        }}>
                          Angkatan {calon.angkatan}
                        </span>
                        {calon.kamar && calon.kamar !== '-' && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
                            • Kamar {calon.kamar}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detail Arrow */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '12px',
                    backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                    border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F43F5E',
                    flexShrink: 0
                  }}>
                    <ChevronRight size={18} />
                  </div>
                </div>

                {/* Statistics Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                  padding: '10px 12px',
                  borderRadius: '14px',
                  border: `1px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`
                }}>
                  {/* Total */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#111827' }}>
                      {calon.totalAbsen}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#6B7280', textTransform: 'uppercase' }}>
                      Total Absen
                    </span>
                  </div>

                  {/* Menunggu */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: calon.pendingAbsen > 0 ? '#F59E0B' : (isDark ? '#9CA3AF' : '#6B7280') }}>
                      {calon.pendingAbsen}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase' }}>
                      Menunggu
                    </span>
                  </div>

                  {/* Disetujui */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10B981' }}>
                      {calon.verifiedAbsen}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#16A34A', textTransform: 'uppercase' }}>
                      Disetujui
                    </span>
                  </div>
                </div>

                {/* Footer: Last Absen Info */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                  color: isDark ? '#FED7AA' : '#6B7280',
                  fontWeight: 600
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={13} color="#F43F5E" />
                    <span>Terakhir: <strong>{formatLastAbsen(calon.lastAbsen)}</strong></span>
                  </div>

                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#F43F5E'
                  }}>
                    Lihat Riwayat & Detail →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default MonitoringAbsenMalam;
