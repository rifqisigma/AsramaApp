import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldAlert, 
  Check, 
  User, 
  Calendar, 
  DollarSign, 
  Clock, 
  Eye,
  ImageIcon,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { logToGoogleSheets, formatVerificationData } from '../context/sheetsService';

const AcceptingSpa = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [currentUserData, setCurrentUserData] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [authorized, setAuthorized] = useState(false);

  // 1. Fetch current user data and authorize
  useEffect(() => {
    const authorizeUser = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          setCurrentUserData(uData);
          if (uData.jabatan && uData.jabatan.toLowerCase() === 'bendahara') {
            setAuthorized(true);
            await fetchPendingPayments();
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
    authorizeUser();
  }, []);

  // 2. Fetch pending payments and map authors
  const fetchPendingPayments = async () => {
    setLoading(true);
    try {
      // Fetch all users to construct an efficient lookup map
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersMap = {};
      usersSnap.forEach(d => {
        usersMap[d.id] = { id: d.id, ...d.data() };
      });

      // Fetch all Spa form submissions
      const spaSnap = await getDocs(collection(db, 'Spa'));
      const list = [];

      spaSnap.forEach(d => {
        const data = d.data();
        // Filter for tipe == 'form' and verification == false
        if (data.tipe === 'form' && data.verification === false) {
          // Resolve author ID from DocumentReference or string path
          let authorId = '';
          if (data.author) {
            if (typeof data.author === 'string') {
              if (data.author.startsWith('/users/')) {
                authorId = data.author.split('/')[2];
              } else {
                authorId = data.author;
              }
            } else if (data.author.id) {
              authorId = data.author.id;
            } else if (data.author.path) {
              const parts = data.author.path.split('/');
              authorId = parts[parts.length - 1];
            }
          }

          const authorInfo = usersMap[authorId] || {
            username: 'Siswa Tidak Diketahui',
            angkatan: '?',
            jabatan: 'Warga'
          };

          list.push({
            id: d.id,
            ...data,
            authorInfo
          });
        }
      });

      // Sort by timestamp descending
      list.sort((a, b) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return tB - tA;
      });

      setPendingPayments(list);
    } catch (error) {
      console.error("Error fetching pending payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPayment = async (payId) => {
    setSubmitting(true);
    try {
      const payment = pendingPayments.find(p => p.id === payId);
      const docRef = doc(db, 'Spa', payId);
      
      await updateDoc(docRef, {
        verification: true
      });

      // Log ke Google Sheets (async, non-blocking)
      if (auth.currentUser && payment) {
        const bulanFormatted = Array.isArray(payment.bulan) ? payment.bulan.join(', ') : (payment.bulan || '-');
        const formattedData = formatVerificationData('spa', {
          kategori: `SPA ${bulanFormatted}`,
          deskripsi: `Pembayaran SPA Bulan ${bulanFormatted} (${payment.statusBayar === 'lunas' ? 'Lunas' : 'Cicil'})`,
          pengusulName: payment.authorInfo?.username || payment.authorName || '-',
          statusPersetujuan: 'Disetujui',
          timestamp: payment.tanggalPelaporan || new Date().toISOString(),
          id: payId
        });
        logToGoogleSheets({
          type: 'spa',
          verificationData: formattedData,
          verifierName: auth.currentUser.displayName || auth.currentUser.email || 'Unknown',
          verifierId: auth.currentUser.uid
        }).catch(err => console.warn('Sheets logging error:', err));
      }

      alert("Pembayaran berhasil diverifikasi!");
      setSelectedPayment(null);
      // Remove from list
      setPendingPayments(prev => prev.filter(p => p.id !== payId));
    } catch (error) {
      console.error("Error verifying payment:", error);
      alert("Gagal memverifikasi pembayaran. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';
    } catch (e) {
      return String(ts);
    }
  };

  const formatBulanDisplay = (bulanData) => {
    if (!bulanData) return '-';
    if (Array.isArray(bulanData)) {
      if (bulanData.length === 0) return '-';
      return bulanData.join(', ');
    }
    return String(bulanData);
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
        <span style={{ fontWeight: 800 }}>Memeriksa Otorisasi Bendahara...</span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Access Denied Screen (Light/Dark adaptive Duolingo)
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
            Akses Khusus Bendahara 🛡️
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.5 }}>
            Mohon maaf, halaman ini dilindungi dan hanya dapat diakses oleh pengguna dengan jabatan **Bendahara** untuk verifikasi keuangan asrama.
          </p>
          <button
            onClick={() => navigate('/spa')}
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
              transition: 'all 0.1s',
              outline: 'none',
              marginTop: '10px'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(2px)';
              e.currentTarget.style.boxShadow = '0 2px 0 #EA580C';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 4px 0 #EA580C';
            }}
          >
            Kembali ke SPA
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

      {/* Header page */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '2rem' 
      }}>
        <button 
          onClick={() => navigate('/spa')}
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
              Verifikasi SPA
            </h1>
            <ShieldCheck size={20} color="#EAB308" strokeWidth={2.5} />
          </div>
          <p style={{ color: isDark ? '#FED7AA' : '#FB923C', margin: '0.25rem 0 0 0', fontWeight: 650 }}>
            Halaman Verifikasi Bendahara
          </p>
        </div>
      </div>

      {/* Pending List Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: isDark ? '#E5E7EB' : '#4B5563' }}>
          Menunggu Verifikasi ({pendingPayments.length})
        </span>
      </div>

      {/* Pending items list */}
      {pendingPayments.length === 0 ? (
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '40px 24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px'
        }}>
          <span style={{ fontSize: '3rem' }}>🎉</span>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Semua Lunas!
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#9CA3AF' : '#6B7280' }}>
            Tidak ada bukti pembayaran SPA baru yang memerlukan verifikasi saat ini.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {pendingPayments.map((payment) => (
            <div
              key={payment.id}
              style={{
                backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                borderRadius: '24px',
                padding: '18px 20px',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                boxShadow: isDark ? '0 6px 0 #4A2E1E' : '0 6px 0 #FFEDD5, 0 10px 15px rgba(251, 146, 60, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {payment.authorInfo.username}
                </span>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                    color: '#F97316',
                    border: '1.5px solid #F97316'
                  }}>
                    Angkatan {payment.authorInfo.angkatan}
                  </span>
                  
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: payment.statusBayar === 'lunas' ? (isDark ? '#1C3D27' : '#E6F4EA') : (isDark ? '#3D291C' : '#FEF3C7'),
                    color: payment.statusBayar === 'lunas' ? '#10B981' : '#D97706',
                    border: `1.5px solid ${payment.statusBayar === 'lunas' ? '#10B981' : '#F59E0B'}`
                  }}>
                    {payment.statusBayar === 'lunas' ? 'Lunas' : 'Cicil'}
                  </span>

                  {payment.tahun && (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: isDark ? '#2D1D13' : '#F3F4F6',
                      color: isDark ? '#FED7AA' : '#4B5563',
                      border: `1px solid ${isDark ? '#4A2E1E' : '#D1D5DB'}`
                    }}>
                      {payment.tahun}
                    </span>
                  )}
                </div>

                {/* Months Chips / Text */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Calendar size={13} color="#F97316" style={{ flexShrink: 0 }} />
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 750,
                    color: isDark ? '#FED7AA' : '#4B5563',
                    lineHeight: 1.3
                  }}>
                    {formatBulanDisplay(payment.bulan)}
                  </span>
                </div>
              </div>

              {/* Action Button: Lihat Detail */}
              <button
                onClick={() => setSelectedPayment(payment)}
                style={{
                  backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                  border: '2.5px solid #F97316',
                  borderRadius: '16px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: '#F97316',
                  boxShadow: `0 3px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  flexShrink: 0,
                  transition: 'all 0.1s'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(2px)';
                  e.currentTarget.style.boxShadow = `0 1px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = `0 3px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
                }}
              >
                <Eye size={14} strokeWidth={3} />
                <span>Detail</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal Overlay */}
      {selectedPayment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
          padding: '1rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '32px',
            padding: '24px',
            maxWidth: '420px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            border: `2px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`
          }}>
            
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937', textAlign: 'center' }}>
              Bukti Transaksi SPA
            </h3>

            {/* Frame Bukti Image */}
            <div style={{
              backgroundColor: '#000000',
              borderRadius: '20px',
              overflow: 'hidden',
              height: '240px',
              border: '2px solid #E5E7EB',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {selectedPayment.bukti ? (
                <img 
                  src={selectedPayment.bukti} 
                  alt="Struk Receipt" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#9CA3AF' }}>
                  <ImageIcon size={40} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Foto tidak tersedia</span>
                </div>
              )}
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '4px' }}>
              
              {/* User details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pengirim</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
                  <User size={14} color="#F97316" />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedPayment.authorInfo.username} ({selectedPayment.authorInfo.angkatan})
                  </span>
                </div>
              </div>

              {/* Jabatan */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jabatan</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151', textTransform: 'capitalize' }}>
                  {selectedPayment.authorInfo.jabatan || 'Warga'}
                </span>
              </div>

              {/* Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Bayar</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
                  <DollarSign size={14} color="#F97316" />
                  <span style={{ textTransform: 'capitalize' }}>
                    {selectedPayment.statusBayar === 'lunas' ? 'Lunas' : 'Cicil / Nyicil'}
                  </span>
                </div>
              </div>

              {/* Tahun */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tahun</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
                  {selectedPayment.tahun || '-'}
                </span>
              </div>

              {/* Bulan Target (Multiple choice render as badges) */}
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bulan Target {Array.isArray(selectedPayment.bulan) ? `(${selectedPayment.bulan.length} Bulan)` : ''}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {Array.isArray(selectedPayment.bulan) ? (
                    selectedPayment.bulan.map((b, idx) => (
                      <span key={idx} style={{
                        fontSize: '0.78rem',
                        fontWeight: 850,
                        backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                        color: '#F97316',
                        border: `1.5px solid ${isDark ? '#4A2E1E' : '#FED7AA'}`,
                        borderRadius: '10px',
                        padding: '3px 10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        📅 {b}
                      </span>
                    ))
                  ) : (
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 850,
                      backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                      color: '#F97316',
                      border: `1.5px solid ${isDark ? '#4A2E1E' : '#FED7AA'}`,
                      borderRadius: '10px',
                      padding: '3px 10px'
                    }}>
                      📅 {selectedPayment.bulan || '-'}
                    </span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Waktu Transaksi</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
                  <Clock size={14} color="#F97316" />
                  <span>{formatTimestamp(selectedPayment.timestamp)}</span>
                </div>
              </div>

            </div>

            {/* Action Buttons: Accept & Close */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={() => setSelectedPayment(null)}
                style={{
                  flex: 1,
                  backgroundColor: isDark ? '#3D291C' : '#FFFFFF',
                  color: isDark ? '#D1D5DB' : '#6B7280',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#D1D5DB'}`,
                  borderRadius: '20px',
                  padding: '14px',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#D1D5DB'}`,
                  transition: 'all 0.1s',
                  outline: 'none'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(2px)';
                  e.currentTarget.style.boxShadow = `0 2px 0 ${isDark ? '#4A2E1E' : '#D1D5DB'}`;
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = `0 4px 0 ${isDark ? '#4A2E1E' : '#D1D5DB'}`;
                }}
              >
                Tutup
              </button>

              <button
                onClick={() => handleAcceptPayment(selectedPayment.id)}
                disabled={submitting}
                style={{
                  flex: 1.5,
                  backgroundColor: '#22C55E',
                  color: '#FFFFFF',
                  border: '2px solid #16A34A',
                  borderRadius: '20px',
                  padding: '14px',
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 0 #16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.1s',
                  outline: 'none'
                }}
                onMouseDown={(e) => !submitting && (e.currentTarget.style.transform = 'translateY(2px)', e.currentTarget.style.boxShadow = '0 2px 0 #16A34A')}
                onMouseUp={(e) => !submitting && (e.currentTarget.style.transform = 'translateY(0px)', e.currentTarget.style.boxShadow = '0 4px 0 #16A34A')}
              >
                <Check size={18} strokeWidth={3} />
                <span>{submitting ? 'Menyimpan...' : 'Terima Pembayaran'}</span>
              </button>
            </div>

          </div>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleUp {
              from { transform: scale(0.85); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}

    </div>
  );
};

export default AcceptingSpa;
