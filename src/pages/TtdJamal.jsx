import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { ArrowLeft, CheckCircle, Clock, Users, User, FileImage, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const TtdJamal = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingRole, setCheckingRole] = useState(true);
  const [previewMedia, setPreviewMedia] = useState(null); // { url, type }

  // Check Role Protection
  useEffect(() => {
    const checkRoleAndFetch = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const role = (userData.jabatan || '').toLowerCase();
          if (role !== 'kepenghunian') {
            alert("Akses ditolak! Halaman ini hanya boleh diakses oleh Kepenghunian.");
            navigate('/home');
            return;
          }
        } else {
          // Fallback if user document does not exist in dev
          console.warn("User profile document not found. Proceeding with caution.");
        }
        
        setCheckingRole(false);
        await fetchReports();
      } catch (error) {
        console.error("Error verifying user role:", error);
        alert("Gagal memverifikasi jabatan Anda.");
        navigate('/home');
      }
    };

    checkRoleAndFetch();
  }, [navigate]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'jamal'));

      const fetchedReports = [];
      for (const d of snap.docs) {
        const data = d.data();
        if (data.verification === false) {
          // Resolve all user references in usertoJamal
          const userPromises = (data.usertoJamal || []).map(async (userRef) => {
            try {
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const uData = userSnap.data();
                return {
                  id: userSnap.id,
                  name: uData.name || uData.username || 'Unknown',
                  angkatan: uData.angkatan || '?'
                };
              }
            } catch (err) {
              console.error("Error fetching user reference:", err);
            }
            return null;
          });

          const resolvedUsers = (await Promise.all(userPromises)).filter(Boolean);

          fetchedReports.push({
            id: d.id,
            ...data,
            usersList: resolvedUsers
          });
        }
      }

      // Sort by timestamp descending
      fetchedReports.sort((a, b) => {
        const tA = a.timestamp ? new Date(a.timestamp) : new Date(0);
        const tB = b.timestamp ? new Date(b.timestamp) : new Date(0);
        return tB - tA;
      });

      setReports(fetchedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (reportId) => {
    if (!window.confirm("Yakin ingin memverifikasi laporan jam malam ini?")) return;

    try {
      await updateDoc(doc(db, 'jamal', reportId), {
        verification: true,
        WhoVerification: doc(db, 'users', auth.currentUser.uid)
      });
      // Hapus dari daftar
      setReports(prev => prev.filter(r => r.id !== reportId));
      alert("Laporan jam malam berhasil diverifikasi!");
    } catch (error) {
      console.error("Gagal verifikasi:", error);
      alert("Gagal memverifikasi laporan.");
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    const date = new Date(ts);
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
    if (url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.mov') || url.toLowerCase().includes('.avi')) {
      return 'video';
    }
    return 'image';
  };

  const getStatusBadge = (timestamp) => {
    if (!timestamp) return null;
    const reportDate = new Date(timestamp);
    const today = new Date();

    // Set both to midnight to only compare days
    const reportDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = todayDay - reportDay;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 6) {
      return <div style={{ padding: '6px 10px', borderRadius: '12px', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center' }}>Kamu terlalu<br />lama ttd</div>;
    } else if (diffDays > 3) {
      return <div style={{ padding: '6px 10px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center' }}>Jangan lama<br />lama</div>;
    } else {
      return <div style={{ padding: '6px 10px', borderRadius: '12px', backgroundColor: '#D1FAE5', color: '#059669', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center' }}>Segera ttd<br />yaa</div>;
    }
  };

  if (checkingRole) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F3F4F6', color: '#8B5CF6', fontFamily: '"Nunito", sans-serif', fontWeight: 800 }}>
        Memverifikasi Jabatan Anda...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F9F8FD', // Light purple background tint
      fontFamily: '"Nunito", "Inter", sans-serif',
      padding: '24px 16px 80px 16px'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Link to="/home" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#6B7280',
          textDecoration: 'none',
          fontWeight: 700,
          marginBottom: '24px',
          backgroundColor: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
          border: '1px solid #ECE9F6'
        }}>
          <ArrowLeft size={18} />
          Kembali
        </Link>

        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px 24px',
          borderTop: '10px solid #8B5CF6', // Purple color for Jamal
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.03)',
          borderLeft: '1px solid #ECE9F6',
          borderRight: '1px solid #ECE9F6',
          borderBottom: '1px solid #ECE9F6',
          marginBottom: '16px'
        }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1C1C1E', margin: '0 0 12px 0' }}>
            Tanda Tangan Jam Malam
          </h1>
          <p style={{ color: '#6B7280', margin: 0, fontSize: '1rem', fontWeight: 600 }}>
            Daftar laporan jam malam yang menunggu verifikasi dari Kepenghunian.
          </p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#8B5CF6', fontWeight: 700, marginTop: '40px' }}>Memuat laporan jam malam...</p>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', backgroundColor: 'white', padding: '40px 20px', borderRadius: '16px', border: '1px solid #ECE9F6' }}>
            <CheckCircle size={48} color="#8B5CF6" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: '#1F2937', fontWeight: 800 }}>Semua Laporan Selesai!</h3>
            <p style={{ margin: 0, color: '#6B7280', fontWeight: 600 }}>Tidak ada laporan jam malam yang perlu diverifikasi saat ini.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reports.map((report) => (
              <div key={report.id} style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.03)',
                border: '1px solid #ECE9F6'
              }}>
                {/* Card Header: Badges & General Info */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#F5F3FF', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#8B5CF6', fontWeight: 800, fontSize: '1.2rem' }}>
                      <Users size={22} />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#1F2937', fontWeight: 800 }}>Laporan Jam Malam</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#6B7280', fontWeight: 700 }}>
                        <Clock size={14} />
                        {formatTimestamp(report.timestamp)}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(report.timestamp)}
                </div>

                {/* Card Body: Petugas list chips */}
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>Penghuni Bertugas:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {report.usersList.length > 0 ? (
                      report.usersList.map((user, idx) => (
                        <span key={idx} style={{
                          padding: '6px 12px',
                          backgroundColor: '#F3E8FF',
                          color: '#7E22CE',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: '1px solid #E9D5FF'
                        }}>
                          <User size={12} />
                          {user.name} ({user.angkatan})
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: '#9CA3AF', fontStyle: 'italic' }}>Tidak ada data penghuni</span>
                    )}
                  </div>
                </div>

                {/* Bukti Links */}
                {report.buktiLink && report.buktiLink.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>Bukti Laporan:</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {report.buktiLink.map((url, i) => (
                        <div
                          key={i}
                          onClick={() => setPreviewMedia({ url, type: getMediaType(url) })}
                          style={{
                            width: '70px',
                            height: '70px',
                            backgroundColor: '#F3F4F6',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            border: '1px solid #E5E7EB',
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

                {/* Verify Button */}
                <button
                  onClick={() => handleVerify(report.id)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#8B5CF6', // Purple theme
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'transform 0.1s'
                  }}
                  onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
                  onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                  <CheckCircle size={20} /> Verifikasi Sekarang
                </button>

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

export default TtdJamal;
