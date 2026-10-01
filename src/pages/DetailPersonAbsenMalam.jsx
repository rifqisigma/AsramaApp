import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  FileImage,
  X,
  RotateCw,
  ExternalLink,
  Users,
  Search,
  Filter,
  Navigation
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

const DetailPersonAbsenMalam = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const { addNotification } = useNotification();
  const isDark = theme === 'dark';

  const paramUserId = searchParams.get('userId') || searchParams.get('id');
  const stateUserId = location.state?.userId;
  const initialUser = location.state?.user || null;
  const targetUserId = paramUserId || stateUserId || initialUser?.id;

  // Access Control State
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);

  // Target User Data & Attendance Records
  const [loadingData, setLoadingData] = useState(true);
  const [targetUser, setTargetUser] = useState(initialUser);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [verifiersMap, setVerifiersMap] = useState({});
  const [verifyingId, setVerifyingId] = useState(null);

  // Filters & Preview Modal
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'pending' | 'verified' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMedia, setPreviewMedia] = useState(null); // { url, type }

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
          if (allowed && targetUserId) {
            fetchUserAndAttendance();
          } else if (!targetUserId) {
            navigate('/monitoring-absen-malam');
          }
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error('Error checking authorization in DetailPersonAbsenMalam:', err);
        setIsAuthorized(false);
      } finally {
        setLoadingAuth(false);
      }
    };

    checkAccess();
  }, [targetUserId, navigate]);

  // 2. Fetch Target User Profile and Attendance List
  const fetchUserAndAttendance = async () => {
    if (!targetUserId) return;
    setLoadingData(true);
    try {
      // A. Fetch Users Map for Verifiers Lookup & Target User Data
      const usersSnap = await getDocs(collection(db, 'users'));
      const uMap = {};
      usersSnap.forEach(d => {
        uMap[d.id] = { id: d.id, ...d.data() };
      });
      setVerifiersMap(uMap);

      // Set target user profile
      const foundUser = uMap[targetUserId];
      if (foundUser) {
        setTargetUser({
          id: targetUserId,
          name: foundUser.name || foundUser.username || 'Calon Penghuni',
          username: foundUser.username || '-',
          email: foundUser.email || '-',
          angkatan: foundUser.angkatan || '?',
          prodi: foundUser.prodi || '-',
          kamar: foundUser.kamar || foundUser.noKamar || '-',
          fotoProfil: foundUser.fotoProfil || foundUser.foto || '',
          statusPenghuni: (foundUser.statusPenghuni || 'CALON').toUpperCase(),
          jabatan: foundUser.jabatan || ''
        });
      }

      // B. Fetch Absen Malam Records for this user
      const absenSnap = await getDocs(collection(db, 'absenMalam'));
      const records = [];

      absenSnap.forEach(d => {
        const data = d.data();
        const submitterUid = extractUid(data.user) || extractUid(data.userId) || extractUid(data.uid);

        if (submitterUid === targetUserId) {
          let reportDate = null;
          const rawDate = data.createdAt || data.timestamp;
          if (rawDate) {
            reportDate = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
          }

          const verifierUid = extractUid(data.usersVerif) || extractUid(data.verifierId);
          const verifierData = verifierUid ? uMap[verifierUid] : null;

          const isVerified = data.verification === true || data.status === 'verified' || data.status === 'approved';
          const isRejected = data.status === 'rejected' || data.status === 'tidak_disetujui' || data.verification === 'rejected';

          // Foto bukti
          let fotoUrl = data.fotoBukti || data.foto || data.buktiLink || data.photoUrl || null;
          if (Array.isArray(fotoUrl)) {
            fotoUrl = fotoUrl[0];
          }

          records.push({
            id: d.id,
            ...data,
            createdAtDate: reportDate,
            isVerified,
            isRejected,
            status: isRejected ? 'rejected' : (isVerified ? 'verified' : 'pending'),
            verifierUid,
            verifierName: verifierData?.name || verifierData?.username || (verifierUid ? 'Pengurus' : '-'),
            verifierUsername: verifierData?.username || '-',
            fotoUrl
          });
        }
      });

      // Urutkan dari yang paling baru
      records.sort((a, b) => (b.createdAtDate?.getTime() || 0) - (a.createdAtDate?.getTime() || 0));
      setAttendanceRecords(records);
    } catch (err) {
      console.error('Gagal mengambil detail absen calon:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // 3. Quick Verify Action by Verifier / Pengurus
  const handleQuickVerify = async (recordId) => {
    if (!auth.currentUser) return;
    const confirm = window.confirm(`Verifikasi absensi malam untuk ${targetUser?.name || 'calon ini'}?`);
    if (!confirm) return;

    setVerifyingId(recordId);
    try {
      const docRef = doc(db, 'absenMalam', recordId);
      const verifierRef = doc(db, 'users', auth.currentUser.uid);

      await updateDoc(docRef, {
        verification: true,
        usersVerif: verifierRef
      });

      // Notifikasi
      if (addNotification) {
        addNotification({
          title: "Absen Terverifikasi 🛡️",
          body: `Absen malam untuk ${targetUser?.name} berhasil diverifikasi.`,
          type: "absen_malam_verified"
        });
      }

      // Update state locally
      setAttendanceRecords(prev => prev.map(rec => {
        if (rec.id === recordId) {
          return {
            ...rec,
            isVerified: true,
            status: 'verified',
            verifierUid: auth.currentUser.uid,
            verifierName: currentUserData?.name || currentUserData?.username || 'Saya'
          };
        }
        return rec;
      }));

      alert('Absen berhasil diverifikasi!');
    } catch (err) {
      console.error('Gagal memverifikasi absen:', err);
      alert('Terjadi kesalahan saat memverifikasi.');
    } finally {
      setVerifyingId(null);
    }
  };

  // 4. Summary Metrics for Target User
  const stats = useMemo(() => {
    const total = attendanceRecords.length;
    const verified = attendanceRecords.filter(r => r.isVerified).length;
    const pending = attendanceRecords.filter(r => !r.isVerified && !r.isRejected).length;
    const rejected = attendanceRecords.filter(r => r.isRejected).length;
    return { total, verified, pending, rejected };
  }, [attendanceRecords]);

  // 5. Filtered Records
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(rec => {
      // Filter Status
      if (statusFilter === 'pending' && (rec.isVerified || rec.isRejected)) return false;
      if (statusFilter === 'verified' && !rec.isVerified) return false;
      if (statusFilter === 'rejected' && !rec.isRejected) return false;

      // Filter Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const address = (rec.location?.address || '').toLowerCase();
        const verifier = (rec.verifierName || '').toLowerCase();
        const dateStr = rec.createdAtDate ? rec.createdAtDate.toLocaleDateString('id-ID') : '';
        if (!address.includes(q) && !verifier.includes(q) && !dateStr.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [attendanceRecords, statusFilter, searchQuery]);

  // Format Helper
  const formatAbsenDate = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return '-';
    return dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  };

  // Unauthorized Screen
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
          boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5'
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
          <p style={{ fontSize: '0.92rem', color: isDark ? '#FED7AA' : '#6B7280', margin: '0 0 24px 0' }}>
            Halaman ini hanya dapat diakses oleh Penghuni Tetap / Pengurus Asrama.
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
            Kembali ke Home
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

        {/* Back Link to Monitoring List */}
        <Link to="/monitoring-absen-malam" style={{
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
          Kembali ke List Monitoring
        </Link>

        {/* 👤 Target User Profile Header Card */}
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '24px',
          padding: '24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          borderTop: '8px solid #F43F5E',
          boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5, 0 10px 15px rgba(0,0,0,0.04)',
          marginBottom: '24px',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
              <img
                src={targetUser?.fotoProfil || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser?.name || 'Calon')}&background=F43F5E&color=fff&size=120&bold=true`}
                alt={targetUser?.name}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #F43F5E',
                  flexShrink: 0
                }}
              />
              <div style={{ minWidth: 0 }}>
                <h1 style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  color: isDark ? '#FFFFFF' : '#1C1C1E',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {targetUser?.name || 'Memuat Profil...'}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
                    @{targetUser?.username}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#F43F5E',
                    backgroundColor: isDark ? '#4C1D24' : '#FFE4E6',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    border: '1px solid #F43F5E'
                  }}>
                    CALON PENGHUNI
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#3B82F6',
                    backgroundColor: isDark ? '#1C2E4A' : '#EFF6FF',
                    padding: '2px 8px',
                    borderRadius: '8px'
                  }}>
                    Angkatan {targetUser?.angkatan}
                  </span>
                  {targetUser?.kamar && targetUser.kamar !== '-' && (
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
                      • Kamar {targetUser.kamar}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchUserAndAttendance}
              disabled={loadingData}
              style={{
                padding: '8px 14px',
                borderRadius: '12px',
                border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                color: isDark ? '#FED7AA' : '#4B5563',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: loadingData ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RotateCw size={14} style={{ animation: loadingData ? 'spin 1s linear infinite' : 'none', color: '#F43F5E' }} />
              <span>Refresh</span>
            </button>
          </div>

          {/* 📊 Summary Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: `1px solid ${isDark ? '#4A2E1E' : '#F3F4F6'}`
          }}>
            {/* Total Absen */}
            <div style={{
              padding: '12px',
              borderRadius: '14px',
              backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
              border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isDark ? '#FED7AA' : '#6B7280', textTransform: 'uppercase' }}>
                Total Absen
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#3B82F6', marginTop: '2px' }}>
                {stats.total}
              </div>
            </div>

            {/* Menunggu Verifikasi */}
            <div style={{
              padding: '12px',
              borderRadius: '14px',
              backgroundColor: isDark ? '#3D291C' : '#FFFBEB',
              border: `1.5px solid ${isDark ? '#D97706' : '#FDE68A'}`,
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#D97706', textTransform: 'uppercase' }}>
                Menunggu TTD
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#F59E0B', marginTop: '2px' }}>
                {stats.pending}
              </div>
            </div>

            {/* Sudah Disetujui */}
            <div style={{
              padding: '12px',
              borderRadius: '14px',
              backgroundColor: isDark ? '#1C3D27' : '#DCFCE7',
              border: `1.5px solid ${isDark ? '#16A34A' : '#86EFAC'}`,
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16A34A', textTransform: 'uppercase' }}>
                Sudah Disetujui
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10B981', marginTop: '2px' }}>
                {stats.verified}
              </div>
            </div>

            {/* Tidak Disetujui */}
            <div style={{
              padding: '12px',
              borderRadius: '14px',
              backgroundColor: isDark ? '#4C1A1A' : '#FEE2E2',
              border: `1.5px solid ${isDark ? '#DC2626' : '#FCA5A5'}`,
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>
                Tidak Disetujui
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#EF4444', marginTop: '2px' }}>
                {stats.rejected}
              </div>
            </div>
          </div>
        </div>

        {/* 🔍 Search & Filter Pills for Absen List */}
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
          {/* Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
            border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
            borderRadius: '14px',
            padding: '8px 14px'
          }}>
            <Search size={16} color={isDark ? '#FED7AA' : '#9CA3AF'} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan alamat / verifikator / tanggal..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.88rem',
                color: isDark ? '#FFFFFF' : '#1F2937',
                fontWeight: 700,
                fontFamily: '"Nunito", "Inter", sans-serif'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: `Semua (${stats.total})` },
              { key: 'pending', label: `Menunggu TTD (${stats.pending})` },
              { key: 'verified', label: `Sudah Disetujui (${stats.verified})` },
              { key: 'rejected', label: `Tidak Disetujui (${stats.rejected})` }
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

        {/* 📋 List of Absen Records */}
        {loadingData ? (
          <div style={{
            textAlign: 'center',
            padding: '50px 20px',
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '24px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`
          }}>
            <RotateCw size={28} style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 12px auto', display: 'block', color: '#F43F5E' }} />
            <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1C1C1E' }}>
              Memuat riwayat absensi malam...
            </p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '24px',
            border: `2px dashed ${isDark ? '#4A2E1E' : '#FFEDD5'}`
          }}>
            <span style={{ fontSize: '2.8rem', display: 'block', marginBottom: '8px' }}>🌙</span>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1C1C1E' }}>
              {searchQuery ? 'Data Absen Tidak Ditemukan' : 'Belum Ada Riwayat Absen'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 600 }}>
              {searchQuery
                ? 'Coba gunakan kata kunci pencarian yang lain.'
                : 'Calon penghuni ini belum memiliki catatan absensi malam untuk filter ini.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredRecords.map((record, index) => {
              const lat = record.location?.coordinate?.latitude || record.location?.coordinate?._lat || record.location?.latitude;
              const lng = record.location?.coordinate?.longitude || record.location?.coordinate?._long || record.location?.longitude;
              const hasCoords = lat !== undefined && lng !== undefined;

              return (
                <div
                  key={record.id || index}
                  style={{
                    backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                    borderRadius: '20px',
                    padding: '18px 20px',
                    border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                    borderLeft: record.isVerified 
                      ? '6px solid #10B981' 
                      : (record.isRejected ? '6px solid #EF4444' : '6px solid #F59E0B'),
                    boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5, 0 4px 10px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Row 1: Tanggal/Jam & Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        padding: '6px',
                        borderRadius: '10px',
                        backgroundColor: isDark ? '#4C1D24' : '#FFE4E6',
                        color: '#F43F5E',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Calendar size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#111827' }}>
                          {formatAbsenDate(record.createdAtDate)}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {record.isVerified ? (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        backgroundColor: isDark ? '#1C3D27' : '#DCFCE7',
                        border: `1px solid ${isDark ? '#16A34A' : '#86EFAC'}`,
                        color: isDark ? '#86EFAC' : '#15803D',
                        fontSize: '0.75rem',
                        fontWeight: 850,
                        flexShrink: 0
                      }}>
                        <CheckCircle2 size={13} />
                        <span>Disetujui</span>
                      </div>
                    ) : record.isRejected ? (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        backgroundColor: isDark ? '#4C1A1A' : '#FEE2E2',
                        border: `1px solid ${isDark ? '#DC2626' : '#FCA5A5'}`,
                        color: isDark ? '#FCA5A5' : '#DC2626',
                        fontSize: '0.75rem',
                        fontWeight: 850,
                        flexShrink: 0
                      }}>
                        <AlertCircle size={13} />
                        <span>Tidak Disetujui</span>
                      </div>
                    ) : (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        backgroundColor: isDark ? '#451A03' : '#FFFBEB',
                        border: `1px solid ${isDark ? '#D97706' : '#FDE68A'}`,
                        color: isDark ? '#FCD34D' : '#B45309',
                        fontSize: '0.75rem',
                        fontWeight: 850,
                        flexShrink: 0
                      }}>
                        <Clock size={13} />
                        <span>Menunggu TTD</span>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Alamat / Lokasi GPS */}
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '14px',
                    backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                    border: `1px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <MapPin size={16} color="#F43F5E" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ fontSize: '0.85rem', color: isDark ? '#FED7AA' : '#374151', lineHeight: 1.4 }}>
                        {record.location?.address || 'Lokasi tercatat via GPS'}
                      </div>
                    </div>

                    {hasCoords && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', paddingTop: '6px', borderTop: `1px dashed ${isDark ? '#4A2E1E' : '#E5E7EB'}` }}>
                        <span style={{ fontSize: '0.72rem', color: isDark ? '#FED7AA' : '#6B7280', fontFamily: 'monospace' }}>
                          📍 Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${lat},${lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#3B82F6',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Navigation size={12} /> Buka Maps <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Row 3: Verifier & Action */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    paddingTop: '2px'
                  }}>
                    {/* Verifier details */}
                    <div style={{ fontSize: '0.8rem', color: isDark ? '#FED7AA' : '#6B7280' }}>
                      {record.isVerified ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ShieldCheck size={14} color="#10B981" />
                          <span>Diverifikasi oleh: <strong style={{ color: isDark ? '#FFFFFF' : '#111827' }}>{record.verifierName}</strong></span>
                        </div>
                      ) : record.isRejected ? (
                        <div style={{ color: '#EF4444', fontWeight: 600 }}>
                          ❌ Absen ditolak / tidak memenuhi syarat
                        </div>
                      ) : (
                        <div style={{ color: '#D97706', fontWeight: 600 }}>
                          ⏳ Menunggu verifikasi dari pengurus / penghuni
                        </div>
                      )}
                    </div>

                    {/* Foto Bukti Thumbnail or Action Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {record.fotoUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewMedia({ url: record.fotoUrl, type: 'image' })}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '10px',
                            border: `1.5px solid ${isDark ? '#4A2E1E' : '#D1D5DB'}`,
                            backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                            color: isDark ? '#FED7AA' : '#374151',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FileImage size={13} color="#F43F5E" />
                          <span>Lihat Foto Bukti</span>
                        </button>
                      )}

                      {/* Quick Verify Button for pending records */}
                      {!record.isVerified && !record.isRejected && (
                        <button
                          type="button"
                          onClick={() => handleQuickVerify(record.id)}
                          disabled={verifyingId === record.id}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '10px',
                            backgroundColor: '#10B981',
                            color: 'white',
                            border: 'none',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: verifyingId === record.id ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 0 #059669',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <CheckCircle2 size={13} />
                          <span>{verifyingId === record.id ? 'Memproses...' : 'Verifikasi'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Modal Popup Pratinjau Foto */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <button
              type="button"
              onClick={() => setPreviewMedia(null)}
              style={{
                position: 'absolute',
                top: '-44px',
                right: 0,
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
              }}
            >
              <X size={20} color="#000000" />
            </button>

            <img
              src={previewMedia.url}
              alt="Foto Bukti Absen"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default DetailPersonAbsenMalam;
