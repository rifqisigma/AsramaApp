import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { ArrowLeft, CheckCircle, Clock, MapPin, User, FileImage, X, XCircle, RotateCw, AlertTriangle, Filter, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { logToGoogleSheets, formatVerificationData } from '../context/sheetsService';
import { useTheme } from '../context/ThemeContext';

const TandaTanganPiket = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pending', 'rejected', 'approved'
  const [previewMedia, setPreviewMedia] = useState(null); // { url, type }
  const [isAllowed, setIsAllowed] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // reportId being processed
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const checkAccess = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigate('/login');
        return;
      }
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          if (uData.jabatan && uData.jabatan.trim() !== '') {
            setIsAllowed(true);
            fetchReports();
          } else {
            alert('Akses ditolak. Hanya pengguna yang memiliki jabatan yang dapat mengakses halaman tanda tangan piket.');
            navigate('/home');
          }
        } else {
          alert('Akses ditolak. Data pengguna tidak ditemukan.');
          navigate('/home');
        }
      } catch (err) {
        console.error('Error checking access:', err);
        navigate('/home');
      }
    };
    checkAccess();
  }, [navigate]);

  const extractUid = (field) => {
    if (!field) return null;
    if (typeof field === 'string') return field.replace(/^\/?users\//, '');
    if (field.id) return field.id;
    if (field.path) {
      const parts = field.path.split('/');
      return parts[parts.length - 1];
    }
    return null;
  };

  const fetchReports = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      setLoading(true);
      const myUid = auth.currentUser.uid;
      const snap = await getDocs(collection(db, 'piket'));

      const fetchedReports = [];
      for (const d of snap.docs) {
        const data = d.data();
        const laporToUid = extractUid(data.laporTo);

        if (laporToUid === myUid) {
          // Ambil data userPiket
          let username = 'Unknown';
          let angkatan = '?';
          let prodi = '-';
          if (data.userPiket) {
            try {
              const userSnap = await getDoc(data.userPiket);
              if (userSnap.exists()) {
                const userData = userSnap.data();
                username = userData.username || userData.name || 'Unknown';
                angkatan = userData.angkatan || '?';
                prodi = userData.prodi || '-';
              }
            } catch (uErr) {
              console.warn('Error fetching userPiket reference:', uErr);
            }
          }

          // Tentukan status normalisasi
          let itemStatus = 'pending';
          if (data.verification === true || data.status === 'approved') {
            itemStatus = 'approved';
          } else if (data.status === 'rejected' || data.status === 'tidak_disetujui' || data.verification === 'rejected') {
            itemStatus = 'rejected';
          }

          fetchedReports.push({
            id: d.id,
            ...data,
            status: itemStatus,
            pelaporName: username,
            pelaporAngkatan: angkatan,
            pelaporProdi: prodi
          });
        }
      }

      // Sort by timestamp descending
      fetchedReports.sort((a, b) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return tB - tA;
      });

      setReports(fetchedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handler Verifikasi Laporan (Pending -> Approved)
  const handleVerify = async (reportId) => {
    if (!window.confirm("Yakin ingin memverifikasi laporan piket ini?")) return;

    setActionLoading(reportId);
    try {
      const report = reports.find(r => r.id === reportId);
      
      // Update Firebase
      await updateDoc(doc(db, 'piket', reportId), {
        verification: true,
        status: 'approved',
        verifiedAt: new Date().toISOString(),
        verifiedBy: auth.currentUser.uid
      });

      // Log ke Google Sheets (async, non-blocking)
      if (auth.currentUser) {
        const formattedData = formatVerificationData('piket', report);
        logToGoogleSheets({
          type: 'piket',
          verificationData: formattedData,
          verifierName: auth.currentUser.displayName || auth.currentUser.email || 'Unknown',
          verifierId: auth.currentUser.uid
        }).catch(err => console.warn('Sheets logging error:', err));
      }

      // Update state
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, verification: true, status: 'approved' } : r));
      alert("Laporan piket berhasil diverifikasi!");
    } catch (error) {
      console.error("Gagal verifikasi:", error);
      alert("Gagal memverifikasi laporan.");
    } finally {
      setActionLoading(null);
    }
  };

  // Handler Update Laporan Tidak Disetujui -> Disetujui (Rejected -> Approved)
  const handleUpdateToApproved = async (reportId) => {
    if (!window.confirm("Ubah status laporan yang tidak disetujui ini menjadi Disetujui?")) return;

    setActionLoading(reportId);
    try {
      const report = reports.find(r => r.id === reportId);

      await updateDoc(doc(db, 'piket', reportId), {
        verification: true,
        status: 'approved',
        verifiedAt: new Date().toISOString(),
        verifiedBy: auth.currentUser.uid
      });

      // Log ke Google Sheets (async, non-blocking)
      if (auth.currentUser) {
        const formattedData = formatVerificationData('piket', report);
        logToGoogleSheets({
          type: 'piket',
          verificationData: formattedData,
          verifierName: auth.currentUser.displayName || auth.currentUser.email || 'Unknown',
          verifierId: auth.currentUser.uid
        }).catch(err => console.warn('Sheets logging error:', err));
      }

      setReports(prev => prev.map(r => r.id === reportId ? { ...r, verification: true, status: 'approved' } : r));
      alert("Status laporan berhasil diubah menjadi Disetujui!");
    } catch (error) {
      console.error("Gagal mengubah status laporan:", error);
      alert("Gagal memperbarui status laporan.");
    } finally {
      setActionLoading(null);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMediaType = (url) => {
    if (url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.webm') || url.toLowerCase().includes('.mov')) return 'video';
    return 'image';
  };

  const getStatusBadge = (timestamp, status) => {
    if (status === 'approved') {
      return (
        <div style={{
          padding: '6px 12px',
          borderRadius: '12px',
          backgroundColor: isDark ? '#064E3B' : '#D1FAE5',
          border: `1px solid ${isDark ? '#059669' : '#A7F3D0'}`,
          color: isDark ? '#6EE7B7' : '#059669',
          fontSize: '0.75rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <CheckCircle size={14} /> Disetujui
        </div>
      );
    }

    if (status === 'rejected') {
      return (
        <div style={{
          padding: '6px 12px',
          borderRadius: '12px',
          backgroundColor: isDark ? '#4C1A1A' : '#FEE2E2',
          border: `1px solid ${isDark ? '#DC2626' : '#FCA5A5'}`,
          color: isDark ? '#FCA5A5' : '#DC2626',
          fontSize: '0.75rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <XCircle size={14} /> Tidak Disetujui
        </div>
      );
    }

    // Pending: hitung selisih hari
    if (!timestamp) return null;
    const reportDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();

    const reportDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = todayDay - reportDay;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 6) {
      return <div style={{ padding: '6px 10px', borderRadius: '12px', backgroundColor: isDark ? '#4C1A1A' : '#FEE2E2', color: '#DC2626', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center' }}>Kamu terlalu<br />lama ttd</div>;
    } else if (diffDays > 3) {
      return <div style={{ padding: '6px 10px', borderRadius: '12px', backgroundColor: isDark ? '#3D2A00' : '#FEF3C7', color: '#D97706', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center' }}>Jangan lama<br />lama</div>;
    } else {
      return <div style={{ padding: '6px 10px', borderRadius: '12px', backgroundColor: isDark ? '#0D2D1E' : '#D1FAE5', color: '#059669', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center' }}>Segera ttd<br />yaa</div>;
    }
  };

  // Filter list berdasarkan tab aktif
  const filteredReports = reports.filter(r => {
    if (activeFilter === 'all') return true;
    return r.status === activeFilter;
  });

  const countPending = reports.filter(r => r.status === 'pending').length;
  const countRejected = reports.filter(r => r.status === 'rejected').length;
  const countApproved = reports.filter(r => r.status === 'approved').length;

  if (isAllowed === null) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: isDark ? '#1E130C' : '#F3F4F6',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"Nunito", "Inter", sans-serif',
        color: '#3B82F6',
        fontWeight: 800,
        fontSize: '1.2rem',
        transition: 'background-color 0.3s ease'
      }}>
        Memeriksa Hak Akses...
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
      {/* Keyframe animation for refresh spinning */}
      <style>{`
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-active {
          animation: spinSlow 0.8s linear infinite;
        }
      `}</style>

      <div className="page-shell" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Link to="/home" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: isDark ? '#F97316' : '#4B5563',
          textDecoration: 'none',
          fontWeight: 700,
          marginBottom: '24px',
          backgroundColor: isDark ? '#2D1D13' : 'white',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          padding: '8px 16px',
          borderRadius: '20px',
          boxShadow: isDark ? '0 2px 5px rgba(0,0,0,0.3)' : '0 2px 5px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease'
        }}>
          <ArrowLeft size={18} />
          Kembali
        </Link>

        {/* Header Banner */}
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '16px',
          padding: '28px 24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#DBEAFE'}`,
          borderTop: '10px solid #3B82F6',
          boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.4)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          transition: 'all 0.3s ease'
        }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1C1C1E', margin: '0 0 8px 0' }}>
              Tanda Tangan Piket
            </h1>
            <p style={{ color: isDark ? '#93C5FD' : '#6B7280', margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
              Daftar dan verifikasi laporan piket yang ditujukan kepada Anda.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchReports}
            disabled={loading}
            title="Segarkan daftar"
            style={{
              padding: '10px 14px',
              backgroundColor: isDark ? '#3D291C' : '#F3F4F6',
              color: isDark ? '#FED7AA' : '#4B5563',
              border: `1px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0
            }}
          >
            <RotateCw size={16} className={loading ? 'spin-active' : ''} />
            <span>{loading ? 'Memuat...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Filter Status Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '16px'
        }}>
          {[
            { id: 'all', label: 'Semua', count: reports.length, color: '#3B82F6' },
            { id: 'pending', label: 'Menunggu TTD', count: countPending, color: '#F59E0B' },
            { id: 'rejected', label: 'Tidak Disetujui', count: countRejected, color: '#EF4444' },
            { id: 'approved', label: 'Disetujui', count: countApproved, color: '#10B981' }
          ].map(tab => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '14px',
                  border: isActive
                    ? `2px solid ${tab.color}`
                    : `1px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                  backgroundColor: isActive
                    ? (isDark ? '#1E293B' : '#EFF6FF')
                    : (isDark ? '#2D1D13' : '#FFFFFF'),
                  color: isActive
                    ? (isDark ? '#93C5FD' : tab.color)
                    : (isDark ? '#FED7AA' : '#6B7280'),
                  fontWeight: isActive ? 800 : 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? tab.color : (isDark ? '#4A2E1E' : '#E5E7EB'),
                  color: isActive ? '#FFFFFF' : (isDark ? '#FED7AA' : '#4B5563'),
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: isDark ? '#93C5FD' : '#6B7280', fontWeight: 700, padding: '40px 0' }}>
            <RotateCw size={28} className="spin-active" style={{ margin: '0 auto 12px auto', display: 'block', color: '#3B82F6' }} />
            <p style={{ margin: 0 }}>Memuat laporan piket...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{
            textAlign: 'center',
            backgroundColor: isDark ? '#2D1D13' : 'white',
            padding: '40px 20px',
            borderRadius: '16px',
            border: `1px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`
          }}>
            <CheckCircle size={48} color="#10B981" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: isDark ? '#FFFFFF' : '#1F2937' }}>Tidak Ada Laporan</h3>
            <p style={{ margin: 0, color: isDark ? '#9CA3AF' : '#6B7280' }}>
              {activeFilter === 'pending'
                ? 'Tidak ada laporan piket yang menunggu verifikasi saat ini.'
                : activeFilter === 'rejected'
                ? 'Tidak ada laporan piket dengan status Tidak Disetujui.'
                : activeFilter === 'approved'
                ? 'Belum ada laporan piket yang telah diverifikasi.'
                : 'Tidak ada laporan piket yang ditemukan.'}
            </p>
          </div>
        ) : (
          <div className="rs-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredReports.map((report) => (
              <div key={report.id} style={{
                backgroundColor: isDark ? '#2D1D13' : 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.4)' : '0 4px 6px rgba(0,0,0,0.05)',
                border: `1px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                borderLeft: report.status === 'approved'
                  ? '6px solid #10B981'
                  : report.status === 'rejected'
                  ? '6px solid #EF4444'
                  : '6px solid #F59E0B',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: `1px solid ${isDark ? '#4A2E1E' : '#F3F4F6'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: report.status === 'approved'
                        ? (isDark ? '#064E3B' : '#D1FAE5')
                        : report.status === 'rejected'
                        ? (isDark ? '#4C1A1A' : '#FEE2E2')
                        : (isDark ? '#1C2E4A' : '#EFF6FF'),
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      color: report.status === 'approved'
                        ? '#10B981'
                        : report.status === 'rejected'
                        ? '#EF4444'
                        : '#3B82F6',
                      fontWeight: 800,
                      fontSize: '1.2rem'
                    }}>
                      {report.pelaporName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: isDark ? '#FFFFFF' : '#1F2937' }}>
                        {report.pelaporName}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: 700 }}>
                        <User size={14} /> Angkatan {report.pelaporAngkatan} {report.pelaporProdi !== '-' && `• ${report.pelaporProdi}`}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(report.timestamp, report.status)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#FED7AA' : '#4B5563', fontSize: '0.9rem', fontWeight: 600 }}>
                    <MapPin size={16} color="#F97316" />
                    Tempat: <strong style={{ color: isDark ? '#FFFFFF' : '#111827' }}>{report.place}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#93C5FD' : '#4B5563', fontSize: '0.9rem', fontWeight: 600 }}>
                    <Clock size={16} color="#3B82F6" />
                    Waktu Lapor: {formatTimestamp(report.timestamp)}
                  </div>
                </div>

                {/* Catatan Penolakan jika ada */}
                {report.status === 'rejected' && report.rejectionNote && (
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: isDark ? '#3C1C1C' : '#FEF2F2',
                    border: `1px solid ${isDark ? '#7F1D1D' : '#FCA5A5'}`,
                    borderRadius: '12px',
                    marginBottom: '16px',
                    color: isDark ? '#FCA5A5' : '#B91C1C',
                    fontSize: '0.88rem'
                  }}>
                    <div style={{ fontWeight: 800, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={14} /> Alasan / Catatan Penolakan:
                    </div>
                    <div>{report.rejectionNote}</div>
                  </div>
                )}

                {/* Bukti Links */}
                {report.buktiLink && report.buktiLink.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#E5E7EB' : '#374151' }}>Bukti Laporan:</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {report.buktiLink.map((url, i) => (
                        <div
                          key={i}
                          onClick={() => setPreviewMedia({ url, type: getMediaType(url) })}
                          style={{
                            width: '70px',
                            height: '70px',
                            backgroundColor: isDark ? '#1E130C' : '#F3F4F6',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            border: `1px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                            overflow: 'hidden'
                          }}
                        >
                          {getMediaType(url) === 'video' ? (
                            <div style={{ width: '100%', height: '100%', backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <FileImage size={24} color="#FFF" />
                            </div>
                          ) : (
                            <img src={url} alt={`Bukti ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons Sesuai Status */}
                {report.status === 'pending' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      disabled={actionLoading === report.id}
                      onClick={() => handleVerify(report.id)}
                      style={{
                        width: '100%',
                        padding: '14px',
                        backgroundColor: actionLoading === report.id ? '#6EE7B7' : '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: 800,
                        cursor: actionLoading === report.id ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'transform 0.1s'
                      }}
                      onMouseDown={(e) => !actionLoading && (e.currentTarget.style.transform = 'scale(0.98)')}
                      onMouseUp={(e) => !actionLoading && (e.currentTarget.style.transform = 'scale(1)')}
                      onMouseLeave={(e) => !actionLoading && (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <CheckCircle size={20} /> {actionLoading === report.id ? 'Memproses...' : 'Verifikasi Sekarang'}
                    </button>

                    <button
                      onClick={() => navigate('/catatan-piket', { state: { reportId: report.id, reportDate: report.timestamp?.toDate ? report.timestamp.toDate().toISOString() : new Date().toISOString() } })}
                      style={{
                        width: '100%',
                        padding: '14px',
                        backgroundColor: '#EF4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'transform 0.1s'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <XCircle size={20} /> Tidak Mau Verifikasi
                    </button>
                  </div>
                )}

                {/* Jika Status Tidak Disetujui: Pengurus dapat Mengubah Menjadi Disetujui */}
                {report.status === 'rejected' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      disabled={actionLoading === report.id}
                      onClick={() => handleUpdateToApproved(report.id)}
                      style={{
                        width: '100%',
                        padding: '14px',
                        backgroundColor: actionLoading === report.id ? '#6EE7B7' : '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: 800,
                        cursor: actionLoading === report.id ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'transform 0.1s'
                      }}
                      onMouseDown={(e) => !actionLoading && (e.currentTarget.style.transform = 'scale(0.98)')}
                      onMouseUp={(e) => !actionLoading && (e.currentTarget.style.transform = 'scale(1)')}
                      onMouseLeave={(e) => !actionLoading && (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <RotateCw size={18} /> {actionLoading === report.id ? 'Memproses...' : 'Ubah Menjadi Disetujui'}
                    </button>

                    <button
                      onClick={() => navigate('/catatan-piket', { state: { reportId: report.id, reportDate: report.timestamp?.toDate ? report.timestamp.toDate().toISOString() : new Date().toISOString() } })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: isDark ? '#3D291C' : '#F3F4F6',
                        color: isDark ? '#FED7AA' : '#4B5563',
                        border: `1px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>Ubah Catatan Penolakan</span>
                    </button>
                  </div>
                )}

                {/* Jika Status Sudah Disetujui */}
                {report.status === 'approved' && (
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                    color: isDark ? '#6EE7B7' : '#047857',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}>
                    <Check size={18} /> Laporan ini telah diverifikasi dan disetujui.
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Media Preview Modal / Bottom Sheet */}
      {previewMedia && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '24px'
        }}>
          <button
            onClick={() => setPreviewMedia(null)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <X size={32} />
          </button>

          {previewMedia.type === 'video' ? (
            <video
              src={previewMedia.url}
              controls
              autoPlay
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px' }}
            />
          ) : (
            <img
              src={previewMedia.url}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', objectFit: 'contain' }}
            />
          )}
        </div>
      )}

    </div>
  );
};

export default TandaTanganPiket;
