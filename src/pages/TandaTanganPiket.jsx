import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { ArrowLeft, CheckCircle, Clock, MapPin, User, FileImage, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const TandaTanganPiket = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewMedia, setPreviewMedia] = useState(null); // { url, type }

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    if (!auth.currentUser) return;
    try {
      setLoading(true);
      const myUid = auth.currentUser.uid;
      const snap = await getDocs(collection(db, 'piket'));

      const fetchedReports = [];
      for (const d of snap.docs) {
        const data = d.data();
        if (data.laporTo && data.laporTo.id === myUid && data.verification === false) {
          // Ambil data userPiket
          let username = 'Unknown';
          let angkatan = '?';
          if (data.userPiket) {
            const userSnap = await getDoc(data.userPiket);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              username = userData.username || userData.name || 'Unknown';
              angkatan = userData.angkatan || '?';
            }
          }

          fetchedReports.push({
            id: d.id,
            ...data,
            pelaporName: username,
            pelaporAngkatan: angkatan
          });
        }
      }

      // Sort by timestamp descending
      fetchedReports.sort((a, b) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
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
    if (!window.confirm("Yakin ingin memverifikasi laporan piket ini?")) return;

    try {
      await updateDoc(doc(db, 'piket', reportId), {
        verification: true
      });
      // Hapus dari daftar
      setReports(prev => prev.filter(r => r.id !== reportId));
      alert("Berhasil diverifikasi!");
    } catch (error) {
      console.error("Gagal verifikasi:", error);
      alert("Gagal memverifikasi laporan.");
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
    // Basic check for video vs image based on URL extension or token
    if (url.toLowerCase().includes('.mp4')) return 'video';
    return 'image'; // Default to image
  };

  const getStatusBadge = (timestamp) => {
    if (!timestamp) return null;
    const reportDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F3F4F6',
      fontFamily: '"Nunito", "Inter", sans-serif',
      padding: '24px 16px 80px 16px'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Link to="/home" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#4B5563',
          textDecoration: 'none',
          fontWeight: 700,
          marginBottom: '24px',
          backgroundColor: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
        }}>
          <ArrowLeft size={18} />
          Kembali
        </Link>

        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px 24px',
          borderTop: '10px solid #3B82F6',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          marginBottom: '16px'
        }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1C1C1E', margin: '0 0 12px 0' }}>
            Tanda Tangan Piket
          </h1>
          <p style={{ color: '#6B7280', margin: 0, fontSize: '1rem', fontWeight: 600 }}>
            Daftar laporan piket yang menunggu verifikasi dari Anda.
          </p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#6B7280', fontWeight: 700, marginTop: '40px' }}>Memuat laporan...</p>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', backgroundColor: 'white', padding: '40px 20px', borderRadius: '16px' }}>
            <CheckCircle size={48} color="#10B981" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: '#1F2937' }}>Semua Sudah Beres!</h3>
            <p style={{ margin: 0, color: '#6B7280' }}>Tidak ada laporan piket yang perlu diverifikasi saat ini.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reports.map((report) => (
              <div key={report.id} style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#3B82F6', fontWeight: 800, fontSize: '1.2rem' }}>
                      {report.pelaporName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#1F2937' }}>{report.pelaporName}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#6B7280', fontWeight: 700 }}>
                        <User size={14} /> Angkatan {report.pelaporAngkatan}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(report.timestamp)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4B5563', fontSize: '0.9rem', fontWeight: 600 }}>
                    <MapPin size={16} color="#F97316" />
                    Tempat: {report.place}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4B5563', fontSize: '0.9rem', fontWeight: 600 }}>
                    <Clock size={16} color="#3B82F6" />
                    Waktu: {formatTimestamp(report.timestamp)}
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

                <button
                  onClick={() => handleVerify(report.id)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
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

export default TandaTanganPiket;
