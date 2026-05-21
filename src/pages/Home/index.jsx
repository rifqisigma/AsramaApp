import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { Home as HomeIcon, Brush, User, Mail, Hash, Book, Shield, Calendar, Moon } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [piketStats, setPiketStats] = useState({
    laporTotal: 0,
    laporVerified: 0,
    laporUnverified: 0,
    ttdTotal: 0,
    ttdVerified: 0,
    ttdUnverified: 0,
  });
  const [jamalStats, setJamalStats] = useState({
    laporTotal: 0,
    laporVerified: 0,
    laporUnverified: 0,
    ttdTotal: 0,
    ttdVerified: 0,
    ttdUnverified: 0,
  });

  useEffect(() => {
    const fetchPiketStats = async () => {
      if (!auth.currentUser) return;
      try {
        const snap = await getDocs(collection(db, 'piket'));
        let laporT = 0, laporV = 0, laporU = 0;
        let ttdT = 0, ttdV = 0, ttdU = 0;
        const myUid = auth.currentUser.uid;

        snap.forEach(d => {
          const data = d.data();
          if (data.userPiket && data.userPiket.id === myUid) {
            laporT++;
            if (data.verification === true) laporV++;
            else laporU++;
          }
          if (data.laporTo && data.laporTo.id === myUid) {
            ttdT++;
            if (data.verification === true) ttdV++;
            else ttdU++;
          }
        });

        setPiketStats({
          laporTotal: laporT, laporVerified: laporV, laporUnverified: laporU,
          ttdTotal: ttdT, ttdVerified: ttdV, ttdUnverified: ttdU
        });
      } catch (error) {
        console.error("Error fetching piket stats:", error);
      }
    };
    fetchPiketStats();
  }, []);

  useEffect(() => {
    const fetchJamalStats = async () => {
      if (!auth.currentUser) return;
      try {
        const snap = await getDocs(collection(db, 'jamal'));
        let laporT = 0, laporV = 0, laporU = 0;
        let ttdT = 0, ttdV = 0, ttdU = 0;
        const myUid = auth.currentUser.uid;

        snap.forEach(d => {
          const data = d.data();
          
          // Lapor Jamal: check if current user is in usertoJamal reference array
          const hasUser = (data.usertoJamal || []).some(ref => ref.id === myUid);
          if (hasUser) {
            laporT++;
            if (data.verification === true) laporV++;
            else laporU++;
          }

          // TTD Jamal: Kepenghunian gets to sign all unverified/verified jamal reports in the system
          ttdT++;
          if (data.verification === true) ttdV++;
          else ttdU++;
        });

        setJamalStats({
          laporTotal: laporT,
          laporVerified: laporV,
          laporUnverified: laporU,
          ttdTotal: ttdT,
          ttdVerified: ttdV,
          ttdUnverified: ttdU,
        });
      } catch (error) {
        console.error("Error fetching jamal stats:", error);
      }
    };
    fetchJamalStats();
  }, [userData]);

  // Fetch User Data
  useEffect(() => {
    const fetchUserData = async () => {
      // Mock data untuk fallback jika user belum login atau data belum ada
      const mockData = {
        angkatan: 62,
        createdAt: { toDate: () => new Date('2026-04-30T14:10:32Z') },
        email: "rifqiadlihernawan@gmail.com",
        fotoProfil: "https://i.pinimg.com/736x/48/e1/40/48e140ba1a52fecc6ca87be41cfd0521.jpg",
        jabatan: "kepenghunian",
        nim: "j0404251076",
        prodi: "tek",
        username: "rifqi",
        point: 75
      };

      if (!auth.currentUser) {
        // Karena ini mungkin environment dev dan belum login, pakai mock data agar UI terlihat
        setUserData(mockData);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        } else {
          setUserData(mockData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserData(mockData);
      }
    };
    fetchUserData();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    // Handle both Firestore timestamp object and standard date strings
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div style={{
      background: '#FFF9F5', // Orange muda background
      minHeight: '100vh',
      padding: '2rem 1.5rem 100px 1.5rem',
      position: 'relative',
      fontFamily: '"Nunito", "Inter", sans-serif'
    }}>

      {/* Mini Profil Header - Style Duolingo / Gojek (No Card Container) */}
      {userData && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          paddingBottom: '0.5rem'
        }}>
          {/* Welcome Greeting & Angkatan Pill */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h1 style={{
              fontSize: '1.65rem',
              fontWeight: 850,
              color: '#1F2937',
              margin: 0,
              fontFamily: '"Nunito", "Inter", sans-serif'
            }}>
              Halo, <span style={{ color: '#F97316' }}>{userData.username}</span>! 👋
            </h1>
            
            {/* Pill Angkatan */}
            <div style={{
              alignSelf: 'flex-start',
              backgroundColor: '#FFF7ED',
              border: '2px solid #F97316',
              borderRadius: '20px',
              padding: '4px 14px',
              color: '#F97316',
              fontSize: '0.8rem',
              fontWeight: 800,
              boxShadow: '0 3px 0 #FFEDD5',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '0.95rem' }}>⚡</span>
              <span>Angkatan {userData.angkatan}</span>
            </div>
          </div>

          {/* Profile Picture Frame (Clickable) */}
          <div 
            onClick={() => navigate('/me')}
            style={{
              position: 'relative',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              borderRadius: '50%',
              padding: '3px',
              background: '#FFFFFF',
              border: '3px solid #F97316',
              boxShadow: '0 4px 0 #FFEDD5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08) rotate(3deg)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
              e.currentTarget.style.boxShadow = '0 1px 0 #FFEDD5';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.08) rotate(3deg)';
              e.currentTarget.style.boxShadow = '0 4px 0 #FFEDD5';
            }}
          >
            <img
              src={userData.fotoProfil || "https://via.placeholder.com/150"}
              alt="Profile"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          </div>
        </div>
      )}

      {/* Poin Asrama Card - Style Duolingo 3D (Gold/Trophy Theme) */}
      {userData && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px',
          border: '2px solid #FEF08A', // Yellow/Gold light border
          boxShadow: '0 8px 0 #FEF08A, 0 10px 15px rgba(250, 204, 21, 0.05)', // Yellow 3D shadow
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1F2937' }}>Skor Poin Asrama</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>Poin kelayakan huni kamu</p>
            </div>
            {/* Trophy Icon Badge */}
            <div style={{
              backgroundColor: '#FEF9C3', // light yellow
              padding: '12px',
              borderRadius: '20px',
              border: '2px solid #F59E0B',
              boxShadow: '0 3px 0 #F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F59E0B'
            }}>
              <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🏆</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: (userData.point ?? 0) >= 0 ? '#10B981' : '#EF4444', // Green if positive, Red if negative
              fontFamily: '"Nunito", "Inter", sans-serif'
            }}>
              {userData.point ?? 0}
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#6B7280' }}>Poin</span>
          </div>

          {/* Buttons Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            {/* Lihat Jenis Poin (All Users) */}
            <button
              onClick={() => navigate('/see-points')}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#F59E0B', // Amber/gold
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 0 #D97706', // 3D Shadow
                transition: 'transform 0.1s, box-shadow 0.1s',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(4px)';
                e.currentTarget.style.boxShadow = '0 0px 0 #D97706';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 4px 0 #D97706';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 4px 0 #D97706';
              }}
            >
              <span>🔍 Lihat Daftar Poin</span>
            </button>

            {/* Admin Kepenghunian Section */}
            {(userData?.jabatan?.toLowerCase() === 'kepenghunian' || userData?.jabatan?.toLowerCase() === 'proteksi') && (
              <div style={{
                marginTop: '8px',
                borderTop: '2px dashed #FEF08A',
                paddingTop: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                  🛠️ Menu Staff Poin
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Buat Jenis Poin */}
                  <button
                    onClick={() => navigate('/create-point')}
                    style={{
                      padding: '12px',
                      backgroundColor: '#10B981', // Emerald green
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 0 #059669',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'translateY(4px)';
                      e.currentTarget.style.boxShadow = '0 0px 0 #059669';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'translateY(0px)';
                      e.currentTarget.style.boxShadow = '0 4px 0 #059669';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0px)';
                      e.currentTarget.style.boxShadow = '0 4px 0 #059669';
                    }}
                  >
                    <span>➕ Buat Jenis Poin</span>
                  </button>

                  {/* Penghakiman Poin */}
                  <button
                    onClick={() => navigate('/penghakiman-point')}
                    style={{
                      padding: '12px',
                      backgroundColor: '#EF4444', // Crimson red
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 0 #DC2626',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'translateY(4px)';
                      e.currentTarget.style.boxShadow = '0 0px 0 #DC2626';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'translateY(0px)';
                      e.currentTarget.style.boxShadow = '0 4px 0 #DC2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0px)';
                      e.currentTarget.style.boxShadow = '0 4px 0 #DC2626';
                    }}
                  >
                    <span>⚖️ Penghakiman</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Piket Section */}
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Piket Unified Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px',
          border: '2px solid #FFEDD5',
          boxShadow: '0 8px 0 #FFEDD5, 0 10px 15px rgba(251, 146, 60, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1C1C1E' }}>Manajemen Piket</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#6B7280', fontWeight: 600 }}>Pantau laporan dan verifikasi</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Lapor Section */}
            <div style={{ backgroundColor: '#FFF7ED', padding: '16px', borderRadius: '20px', border: '1px solid #FDBA74' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '0 8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1F2937' }}>{piketStats.laporTotal}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disubmit</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10B981' }}>{piketStats.laporVerified}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diverifikasi</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F59E0B' }}>{piketStats.laporUnverified}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Menunggu</span>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/lapor-piket'}
                style={{
                  width: '100%', padding: '14px', backgroundColor: '#F97316', color: 'white', border: 'none', borderRadius: '16px', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.2)', transition: 'transform 0.1s'
                }}
                onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
                onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                Lapor Piket
              </button>
            </div>

            {/* TTD Section */}
            <div style={{ backgroundColor: '#EFF6FF', padding: '16px', borderRadius: '20px', border: '1px solid #93C5FD' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '0 8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1F2937' }}>{piketStats.ttdTotal}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Laporan</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10B981' }}>{piketStats.ttdVerified}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diverifikasi</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F59E0B' }}>{piketStats.ttdUnverified}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Perlu TTD</span>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/ttd-piket'}
                style={{
                  width: '100%', padding: '14px', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '16px', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)', transition: 'transform 0.1s'
                }}
                onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
                onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                Tanda Tangan Piket
              </button>
            </div>
          </div>
        </div>

        {/* Jam Malam (Jamal) Unified Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px',
          border: '2px solid #F3E8FF',
          boxShadow: '0 8px 0 #F3E8FF, 0 10px 15px rgba(139, 92, 246, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Moon size={24} color="#8B5CF6" />
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1C1C1E' }}>Manajemen Jam Malam</h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#6B7280', fontWeight: 600 }}>Laporan jam malam & verifikasi</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Lapor Jamal Section */}
            <div style={{ backgroundColor: '#F9F8FD', padding: '16px', borderRadius: '20px', border: '1px solid #E9D5FF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '0 8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1F2937' }}>{jamalStats.laporTotal}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disubmit</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#8B5CF6' }}>{jamalStats.laporVerified}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diverifikasi</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F59E0B' }}>{jamalStats.laporUnverified}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Menunggu</span>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/lapor-jamal'}
                style={{
                  width: '100%', padding: '14px', backgroundColor: '#8B5CF6', color: 'white', border: 'none', borderRadius: '16px', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(139, 92, 246, 0.2)', transition: 'transform 0.1s'
                }}
                onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
                onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                Lapor Jam Malam
              </button>
            </div>

            {/* TTD Jamal Section (Only visible/active if user jabatan is kepenghunian) */}
            {userData?.jabatan?.toLowerCase() === 'kepenghunian' && (
              <div style={{ backgroundColor: '#F5F3FF', padding: '16px', borderRadius: '20px', border: '1px solid #C4B5FD' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '0 8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1F2937' }}>{jamalStats.ttdTotal}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Laporan</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10B981' }}>{jamalStats.ttdVerified}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diverifikasi</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F59E0B' }}>{jamalStats.ttdUnverified}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Perlu TTD</span>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/ttd-jamal'}
                  style={{
                    width: '100%', padding: '14px', backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: '16px', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(124, 58, 237, 0.2)', transition: 'transform 0.1s'
                  }}
                  onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
                  onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                  Tanda Tangan Jam Malam
                </button>
              </div>
            )}
          </div>
        </div>


        {/* Create Piket Card (Only for lingpras) */}
        {userData?.jabatan?.toLowerCase() === 'lingpras' && (
          <div style={{
            backgroundColor: '#FFF7ED',
            borderRadius: '24px',
            padding: '20px',
            border: '2px dashed #FDBA74',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#9A3412' }}>Buat Jadwal Piket</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#C2410C', fontWeight: 600 }}>Khusus Lingpras (via CSV)</p>
            </div>
            <button
              onClick={() => window.location.href = '/create-piket'}
              style={{
                padding: '10px 16px',
                backgroundColor: '#9A3412',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(154, 52, 18, 0.2)',
                transition: 'transform 0.1s'
              }}
              onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              Buat
            </button>
          </div>
        )}

      </div>

      {/* Bottom Navigation Navbar - Style Duolingo */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        backgroundColor: 'white',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '1.25rem 1rem 1.5rem 1rem',
        borderTop: '2px solid #FFEDD5',
        boxShadow: '0 -10px 25px rgba(251, 146, 60, 0.08)',
        zIndex: 10,
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px'
      }}>
        <div 
          onClick={() => navigate('/home')}
          style={{ color: '#F97316', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
        >
          <HomeIcon size={28} strokeWidth={3} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Home</span>
        </div>
        <div style={{ color: '#D1D5DB', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <Brush size={28} strokeWidth={3} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>SPA</span>
        </div>
        <div 
          onClick={() => navigate('/me')}
          style={{ color: '#D1D5DB', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
        >
          <User size={28} strokeWidth={3} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Profile</span>
        </div>
      </div>
    </div>
  );
};

export default Home;
