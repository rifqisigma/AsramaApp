import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { ArrowLeft, ShieldAlert, Check, Calendar, MapPin, Eye, EyeOff, ShieldCheck, User } from 'lucide-react';

const VerificationAbsenMalam = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { addNotification } = useNotification();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [usersMap, setUsersMap] = useState({});
  const [allAttendance, setAllAttendance] = useState([]);
  const [expandedMapId, setExpandedMapId] = useState(null);

  // Selected Date state (defaults to today in local time YYYY-MM-DD)
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // 1. Authorize User and Fetch Data
  useEffect(() => {
    const checkAuthorization = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.jabatan && userData.jabatan.trim() !== '') {
            setAuthorized(true);
            await loadData();
          } else {
            setAuthorized(false);
            setLoading(false);
          }
        } else {
          setAuthorized(false);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error authorizing user:", error);
        setAuthorized(false);
        setLoading(false);
      }
    };
    checkAuthorization();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users lookup map
      const usersSnap = await getDocs(collection(db, 'users'));
      const lookup = {};
      usersSnap.forEach(d => {
        lookup[d.id] = { id: d.id, ...d.data() };
      });
      setUsersMap(lookup);

      // 2. Fetch Absen Malam
      const absenSnap = await getDocs(collection(db, 'absenMalam'));
      const records = [];
      absenSnap.forEach(d => {
        const data = d.data();
        
        // Resolve submitter user id
        let submitterId = '';
        if (data.user) {
          if (typeof data.user === 'string') {
            submitterId = data.user.startsWith('/users/') ? data.user.split('/')[2] : data.user;
          } else {
            submitterId = data.user.id || data.user.path?.split('/').pop();
          }
        }

        // Resolve verifier user id
        let verifierId = '';
        if (data.usersVerif) {
          if (typeof data.usersVerif === 'string') {
            verifierId = data.usersVerif.startsWith('/users/') ? data.usersVerif.split('/')[2] : data.usersVerif;
          } else {
            verifierId = data.usersVerif.id || data.usersVerif.path?.split('/').pop();
          }
        }

        records.push({
          id: d.id,
          ...data,
          submitterId,
          verifierId
        });
      });

      // Sort by createdAt descending
      records.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return timeB - timeA;
      });

      setAllAttendance(records);
    } catch (error) {
      console.error("Error loading verification data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (recordId, submitterName) => {
    setSubmitting(true);
    try {
      const docRef = doc(db, 'absenMalam', recordId);
      const verifierRef = doc(db, 'users', auth.currentUser.uid);

      await updateDoc(docRef, {
        verification: true,
        usersVerif: verifierRef
      });

      addNotification({
        title: "Absen Terverifikasi 🛡️",
        body: `Absen malam untuk ${submitterName} telah berhasil diverifikasi.`,
        type: "absen_malam_verified"
      });

      // Update locally
      setAllAttendance(prev => prev.map(rec => {
        if (rec.id === recordId) {
          return {
            ...rec,
            verification: true,
            verifierId: auth.currentUser.uid
          };
        }
        return rec;
      }));

      alert(`Absen malam ${submitterName} berhasil diverifikasi!`);
    } catch (err) {
      console.error("Error verifying attendance:", err);
      alert("Gagal memverifikasi absen. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMap = (id) => {
    setExpandedMapId(prev => prev === id ? null : id);
  };

  // Filter attendance by selected date (local time matching YYYY-MM-DD)
  const filteredAttendance = allAttendance.filter(record => {
    if (!record.createdAt) return false;
    const dateObj = record.createdAt.toDate ? record.createdAt.toDate() : new Date(record.createdAt);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const recordDateStr = `${year}-${month}-${day}`;
    return recordDateStr === selectedDateStr;
  });

  const formatTimeStr = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    } catch (e) {
      return '';
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
        fontFamily: '"Nunito", "Inter", sans-serif',
        color: '#F97316'
      }}>
        <div style={{
          border: '6px solid #FFF7ED',
          borderTop: '6px solid #F97316',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }}></div>
        <span style={{ fontWeight: 800 }}>Memeriksa Otorisasi Staf...</span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: '"Nunito", "Inter", sans-serif'
      }}>
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '40px 24px',
          border: `2.5px solid ${isDark ? '#4A2E1E' : '#FECACA'}`,
          boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FEE2E2',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            backgroundColor: isDark ? '#4C1D1D' : '#FEE2E2',
            color: '#EF4444',
            padding: '16px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(239, 68, 68, 0.15)'
          }}>
            <ShieldAlert size={48} strokeWidth={2.5} />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Akses Ditolak 🛡️
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.5 }}>
            Mohon maaf, halaman verifikasi ini hanya dapat diakses oleh Kepenghunian / Staf Asrama yang memiliki jabatan aktif.
          </p>
          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%',
              backgroundColor: '#F97316',
              color: '#FFFFFF',
              border: '2px solid #EA580C',
              borderRadius: '20px',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 0 #EA580C',
              outline: 'none',
              marginTop: '10px'
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
      background: isDark ? '#1E130C' : '#FFF9F5',
      minHeight: '100vh',
      padding: '2rem 1.5rem 80px 1.5rem',
      position: 'relative',
      fontFamily: '"Nunito", "Inter", sans-serif',
      maxWidth: '480px',
      margin: '0 auto',
      boxShadow: '0 0 20px rgba(0,0,0,0.05)',
      transition: 'background-color 0.3s ease'
    }}>
      {/* Header Halaman */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '2rem' 
      }}>
        <button 
          onClick={() => navigate('/home')}
          style={{
            background: isDark ? '#2D1D13' : '#FFFFFF',
            border: isDark ? '2px solid #4A2E1E' : '2px solid #FFEDD5',
            borderRadius: '16px',
            padding: '10px',
            cursor: 'pointer',
            color: '#F97316',
            boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.1s'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(2px)';
            e.currentTarget.style.boxShadow = isDark ? '0 2px 0 #4A2E1E' : '0 2px 0 #FFEDD5';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5';
          }}
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h1 style={{
              fontSize: '1.6rem',
              fontWeight: 900,
              color: '#F97316',
              margin: 0
            }}>
              Verifikasi Absen
            </h1>
            <ShieldCheck size={20} color="#EAB308" strokeWidth={2.5} />
          </div>
          <p style={{ color: isDark ? '#FED7AA' : '#FB923C', margin: '0.25rem 0 0 0', fontWeight: 650 }}>
            Verifikasi kehadiran malam warga
          </p>
        </div>
      </div>

      {/* Bagian 1: Calendar Date Picker */}
      <div style={{
        backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
        borderRadius: '24px',
        padding: '20px',
        border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
        boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Calendar size={20} color="#F97316" />
          <span style={{ fontSize: '0.95rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Pilih Tanggal Absen
          </span>
        </div>
        <input 
          type="date"
          value={selectedDateStr}
          onChange={(e) => setSelectedDateStr(e.target.value)}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '16px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            fontSize: '1rem',
            fontWeight: 700,
            outline: 'none',
            boxSizing: 'border-box',
            backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
            color: isDark ? '#FFFFFF' : '#1F2937',
            transition: 'border-color 0.2s'
          }}
        />
      </div>

      {/* Bagian 2: List Data Absen */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: isDark ? '#E5E7EB' : '#4B5563' }}>
          Absensi Tanggal {new Date(selectedDateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, backgroundColor: '#F97316', color: 'white', padding: '2px 10px', borderRadius: '12px' }}>
          {filteredAttendance.length} Orang
        </span>
      </div>

      {filteredAttendance.length === 0 ? (
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '24px',
          padding: '40px 24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '3rem' }}>💤</span>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Belum Ada Absen
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#9CA3AF' : '#6B7280', lineHeight: 1.4 }}>
            Tidak ada warga yang mengirimkan absen malam pada tanggal terpilih ini.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredAttendance.map((record) => {
            const userDetails = usersMap[record.submitterId] || {
              username: 'Warga Tidak Dikenal',
              angkatan: '?',
              fotoProfil: 'https://via.placeholder.com/150'
            };
            const verifierDetails = usersMap[record.verifierId];

            return (
              <div
                key={record.id}
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  borderRadius: '24px',
                  padding: '20px',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Info Profil & Jam Kirim */}
                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: '12px' }}>
                  <img
                    src={userDetails.fotoProfil || `https://ui-avatars.com/api/?name=${encodeURIComponent(userDetails.username || 'User')}&background=F97316&color=fff&size=150&bold=true`}
                    alt={userDetails.username}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #F97316' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {userDetails.username}
                    </h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF' }}>
                      Angkatan {userDetails.angkatan}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#F97316' }}>
                      {formatTimeStr(record.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Alamat Absen */}
                <div style={{
                  backgroundColor: isDark ? '#1E130C' : '#FFF7ED',
                  border: `1px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  borderRadius: '16px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <MapPin size={16} color="#F97316" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ margin: 0, fontSize: '0.8rem', color: isDark ? '#E5E7EB' : '#4B5563', fontWeight: 650, lineHeight: 1.4 }}>
                    {record.location?.address || 'Detail alamat tidak tersedia'}
                  </p>
                </div>

                {/* Collapsible Map Embed */}
                {expandedMapId === record.id && record.location?.coordinate && (
                  <div style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    height: '200px',
                    border: `2px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                    animation: 'slideDown 0.3s ease'
                  }}>
                    <iframe
                      title={`Map-${record.id}`}
                      src={`https://maps.google.com/maps?q=${record.location.coordinate.latitude},${record.location.coordinate.longitude}&z=16&output=embed`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                    ></iframe>
                  </div>
                )}

                {/* Bar Tombol Aksi */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                  {/* Tombol Toggle Map */}
                  <button
                    onClick={() => toggleMap(record.id)}
                    style={{
                      flex: 1,
                      backgroundColor: isDark ? '#3D291C' : '#F3F4F6',
                      color: isDark ? '#FED7AA' : '#4B5563',
                      border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                      borderRadius: '14px',
                      padding: '10px 14px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      outline: 'none'
                    }}
                  >
                    {expandedMapId === record.id ? (
                      <>
                        <EyeOff size={14} />
                        <span>Sembunyikan Peta</span>
                      </>
                    ) : (
                      <>
                        <Eye size={14} />
                        <span>Lihat Peta</span>
                      </>
                    )}
                  </button>

                  {/* Status / Tombol Verifikasi */}
                  {record.verification ? (
                    <div style={{
                      flex: 1.5,
                      backgroundColor: isDark ? '#1C3D27' : '#ECFDF5',
                      color: '#10B981',
                      border: '1.5px solid #10B981',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      fontSize: '0.8rem',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}>
                      <ShieldCheck size={14} />
                      <span style={{ textTransform: 'capitalize' }}>
                        Diverifikasi: {verifierDetails?.username || 'Admin'}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleVerify(record.id, userDetails.username)}
                      disabled={submitting}
                      style={{
                        flex: 1.5,
                        backgroundColor: '#22C55E',
                        color: 'white',
                        border: '2px solid #16A34A',
                        borderRadius: '14px',
                        padding: '10px 14px',
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        boxShadow: '0 3px 0 #16A34A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        outline: 'none',
                        transition: 'transform 0.1s'
                      }}
                      onMouseDown={(e) => {
                        if (!submitting) {
                          e.currentTarget.style.transform = 'translateY(2px)';
                          e.currentTarget.style.boxShadow = '0 1px 0 #16A34A';
                        }
                      }}
                      onMouseUp={(e) => {
                        if (!submitting) {
                          e.currentTarget.style.transform = 'translateY(0px)';
                          e.currentTarget.style.boxShadow = '0 3px 0 #16A34A';
                        }
                      }}
                    >
                      <Check size={14} strokeWidth={3} />
                      <span>Verifikasi</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide down animation for map preview */}
      <style>{`
        @keyframes slideDown {
          from { height: 0; opacity: 0; }
          to { height: 200px; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default VerificationAbsenMalam;
