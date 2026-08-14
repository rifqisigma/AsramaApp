import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Hash, 
  User, 
  Book, 
  Shield, 
  Calendar, 
  LogOut, 
  Home as HomeIcon, 
  Brush,
  Clock,
  UserPlus,
  Key
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

const Me = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [userData, setUserData] = useState(null);

  // Fetch User Data
  useEffect(() => {
    const fetchUserData = async () => {
      // Mock data untuk fallback jika user belum login atau data belum ada
      const mockData = {
        angkatan: 62,
        angkatanAis: '62/73',
        createdAt: { toDate: () => new Date('2026-04-30T14:10:32Z') },
        email: "rifqiadlihernawan@gmail.com",
        emailPersonal: "rifqi.personal@gmail.com",
        fotoProfil: "https://i.pinimg.com/736x/48/e1/40/48e140ba1a52fecc6ca87be41cfd0521.jpg",
        jabatan: "kepenghunian",
        nim: "j0404251076",
        prodi: "tek",
        prodiNama: "Teknik Komputer dan Sains Data",
        statusPenghuni: "AKTIF",
        username: "rifqi",
        point: 75
      };

      if (!auth.currentUser) {
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
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div style={{
      background: isDark ? '#1E130C' : '#FFF9F5',
      minHeight: '100vh',
      fontFamily: '"Nunito", "Inter", sans-serif',
      transition: 'background-color 0.3s ease'
    }}>
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      padding: '2rem 1.5rem 120px 1.5rem',
      position: 'relative',
    }}>

      {/* Header Halaman */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '1.5rem' 
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
            transition: 'transform 0.1s, box-shadow 0.1s, background-color 0.3s, border-color 0.3s',
            outline: 'none'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(2px)';
            e.currentTarget.style.boxShadow = isDark ? '0 2px 0 #4A2E1E' : '0 2px 0 #FFEDD5';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5';
          }}
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#F97316', // Orange pekat
            margin: 0
          }}>
            Profil Lengkap
          </h1>
          <p style={{ color: isDark ? '#FED7AA' : '#FB923C', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
            Detail akun asrama kamu
          </p>
        </div>
      </div>

      {/* Profil Card Utama - Style Duolingo / Gojek */}
      {userData && (
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5, 0 15px 20px rgba(251, 146, 60, 0.1)', // Efek 3D
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          marginBottom: '24px',
          transition: 'all 0.3s ease'
        }}>

          {/* Bagian Atas: Avatar & Nama */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img
              src={userData.fotoProfil || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username || 'User')}&background=F97316&color=fff&size=150&bold=true`}
              alt="Profile"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '24px',
                objectFit: 'cover',
                border: '3px solid #F97316',
                padding: '2px'
              }}
            />
            <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1F2937', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {userData.username}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isDark ? '#D1D5DB' : '#6B7280', marginTop: '4px', fontSize: '0.85rem', fontWeight: 650 }}>
                <Mail size={16} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {userData.email}
                </span>
              </div>
              {userData.emailPersonal && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isDark ? '#9CA3AF' : '#9CA3AF', marginTop: '2px', fontSize: '0.8rem', fontWeight: 600 }}>
                  <Mail size={14} style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {userData.emailPersonal}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Garis Pembatas */}
          <div style={{ height: '2px', backgroundColor: isDark ? '#3D291C' : '#FFF7ED', borderRadius: '2px' }}></div>

          {/* Grid Informasi Detail */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            {/* NIM */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>NIM</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151', fontSize: '0.95rem', minWidth: 0 }}>
                <div style={{ backgroundColor: isDark ? '#3D291C' : '#FFEDD5', padding: '6px', borderRadius: '12px', color: '#F97316', flexShrink: 0 }}>
                  <Hash size={18} />
                </div>
                <span style={{ textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{userData.nim}</span>
              </div>
            </div>

            {/* Angkatan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Angkatan</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151', fontSize: '0.95rem', minWidth: 0 }}>
                <div style={{ backgroundColor: isDark ? '#3D291C' : '#FFEDD5', padding: '6px', borderRadius: '12px', color: '#F97316', flexShrink: 0 }}>
                  <User size={18} />
                </div>
                <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {userData.angkatanAis || userData.angkatan}
                </span>
              </div>
            </div>

            {/* Prodi (Kode) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prodi</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151', fontSize: '0.95rem', minWidth: 0 }}>
                <div style={{ backgroundColor: isDark ? '#3D291C' : '#FFEDD5', padding: '6px', borderRadius: '12px', color: '#F97316', flexShrink: 0 }}>
                  <Book size={18} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{userData.prodi}</span>
                  {userData.prodiNama && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: isDark ? '#9CA3AF' : '#6B7280', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {userData.prodiNama}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Jabatan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jabatan</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151', fontSize: '0.95rem', minWidth: 0 }}>
                <div style={{ backgroundColor: isDark ? '#3D291C' : '#FFEDD5', padding: '6px', borderRadius: '12px', color: '#F97316', flexShrink: 0 }}>
                  <Shield size={18} />
                </div>
                <span style={{ textTransform: 'capitalize', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={userData.jabatan}>{userData.jabatan}</span>
              </div>
            </div>

            {/* Status Penghuni */}
            {userData.statusPenghuni && (
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Penghuni</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    backgroundColor: userData.statusPenghuni === 'AKTIF'
                      ? (isDark ? '#1C3D27' : '#DCFCE7')
                      : (isDark ? '#3C1C1C' : '#FEE2E2'),
                    color: userData.statusPenghuni === 'AKTIF' ? '#16A34A' : '#EF4444',
                    border: `2px solid ${userData.statusPenghuni === 'AKTIF' ? '#86EFAC' : '#FCA5A5'}`,
                    boxShadow: `0 3px 0 ${userData.statusPenghuni === 'AKTIF' ? '#86EFAC' : '#FCA5A5'}`
                  }}>
                    <span>{userData.statusPenghuni === 'AKTIF' ? '✅' : '❌'}</span>
                    <span>{userData.statusPenghuni}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Poin Asrama */}
            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skor Poin Asrama</span>
              {(() => {
                const p = userData.point ?? 0;
                let bgColor = '#E6F4EA';
                let borderCol = '#10B981';
                let textCol = '#10B981';
                let label = 'Sangat Layak (Aman) 🟢';

                if (p > 1) {
                  bgColor = isDark ? '#1C3D27' : '#E6F4EA';
                  borderCol = '#10B981';
                  textCol = '#10B981';
                  label = 'Sangat Layak (Aman) 🟢';
                } else if (p >= -25) {
                  bgColor = isDark ? '#3D291C' : '#FFF7ED';
                  borderCol = '#F59E0B';
                  textCol = '#D97706';
                  label = 'Peringatan (Cukup Layak) ⚠️';
                } else {
                  bgColor = isDark ? '#3C1C1C' : '#FEF2F2';
                  borderCol = '#EF4444';
                  textCol = '#EF4444';
                  label = 'Terancam Dikeluarkan (Bahaya) 🚨';
                }

                return (
                  <div style={{
                    backgroundColor: bgColor,
                    border: `2px solid ${borderCol}`,
                    borderRadius: '20px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: `0 4px 0 ${borderCol}`,
                    color: textCol,
                    fontWeight: 800,
                    transition: 'transform 0.1s'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.5rem' }}>🏆</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        <span style={{ fontSize: '0.65rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Kelayakan Huni</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, whiteSpace: 'normal', wordBreak: 'break-word' }}>{label}</span>
                      </div>
                    </div>
                    
                    <div style={{ 
                      alignSelf: 'flex-end', 
                      fontSize: '1.35rem', 
                      fontWeight: 900,
                      backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      border: `1.5px solid ${borderCol}`,
                      boxShadow: `0 2px 0 ${borderCol}`
                    }}>
                      {p} Poin
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>

          {/* Tanggal Pembuatan */}
          <div style={{
            backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
            padding: '16px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginTop: '8px',
            border: isDark ? '1px dashed #4A2E1E' : '1px dashed #FDBA74',
            transition: 'all 0.3s'
          }}>
            <Calendar size={24} color="#F97316" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: '#F97316', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bergabung Sejak
              </span>
              <span style={{ fontSize: '1rem', color: isDark ? '#E5E7EB' : '#374151', fontWeight: 800 }}>
                {userData.createdAt ? formatDate(userData.createdAt) : '-'}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Fitur Khusus MediAdigi */}
      {userData?.jabatan === 'mediadigi' && (
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5, 0 15px 20px rgba(251, 146, 60, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginTop: '20px',
          marginBottom: '24px',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.2rem',
              fontWeight: 900,
              color: isDark ? '#FFFFFF' : '#1F2937'
            }}>
              Panel Admin MediAdigi 🛠️
            </h3>
            <p style={{
              margin: 0,
              fontSize: '0.85rem',
              fontWeight: 700,
              color: isDark ? '#FED7AA' : '#6B7280'
            }}>
              Kelola akun penghuni asrama
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Tombol Sign Up */}
            <button
              onClick={() => navigate('/signup')}
              style={{
                width: '100%',
                backgroundColor: '#F97316',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                padding: '14px',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 0 #C2410C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.1s, box-shadow 0.1s',
                outline: 'none'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)';
                e.currentTarget.style.boxShadow = '0 2px 0 #C2410C';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 4px 0 #C2410C';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 4px 0 #C2410C';
              }}
            >
              <UserPlus size={18} strokeWidth={3} />
              <span>Daftarkan Akun Penghuni</span>
            </button>

            {/* Tombol Lupa Password */}
            <button
              onClick={() => navigate('/forgot-password')}
              style={{
                width: '100%',
                backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                color: '#F97316',
                border: '2px solid #F97316',
                borderRadius: '20px',
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.1s, box-shadow 0.1s',
                outline: 'none'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)';
                e.currentTarget.style.boxShadow = `0 2px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
              }}
            >
              <Key size={18} strokeWidth={3} />
              <span>Reset Password Penghuni</span>
            </button>
          </div>
        </div>
      )}

      {/* History Activity Button - Style Duolingo Orange 3D */}
      <button
        onClick={() => navigate('/history')}
        style={{
          width: '100%',
          backgroundColor: isDark ? '#2D1D13' : '#FFF7ED',
          color: '#F97316',
          border: '2px solid #F97316',
          borderRadius: '20px',
          padding: '16px',
          fontSize: '1.05rem',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: `0 6px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'transform 0.1s, box-shadow 0.1s, background-color 0.3s, border-color 0.3s',
          outline: 'none',
          marginBottom: '20px'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(4px)';
          e.currentTarget.style.boxShadow = `0 2px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = `0 6px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = `0 6px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
        }}
      >
        <Clock size={20} strokeWidth={3} />
        <span>Riwayat Aktivitas</span>
      </button>

      {/* Theme Toggle Card */}
      <div style={{
        backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
        borderRadius: '28px',
        padding: '24px',
        border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
        boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        marginTop: '20px',
        marginBottom: '24px',
        gap: '16px',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.2rem',
            fontWeight: 900,
            color: isDark ? '#FFFFFF' : '#1F2937'
          }}>
            Mau mode terang atau gelap?
          </h3>
          <p style={{
            margin: 0,
            fontSize: '0.85rem',
            fontWeight: 700,
            color: isDark ? '#FED7AA' : '#6B7280'
          }}>
            Nyalain atau matiin saklar sesuai keinginan
          </p>
        </div>

        <ThemeToggle size="lg" showLabel={false} />
      </div>

      {/* Logout Button - Style Duolingo Red 3D */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%',
          backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2', // Latar merah muda / merah gelap
          color: isDark ? '#FCA5A5' : '#EF4444', // Teks merah
          border: `2px solid ${isDark ? '#991B1B' : '#FCA5A5'}`,
          borderRadius: '20px',
          padding: '16px',
          fontSize: '1.05rem',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: `0 6px 0 ${isDark ? '#991B1B' : '#FCA5A5'}`, // Tebal bayangan 3D
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'transform 0.1s, box-shadow 0.1s, background-color 0.3s, border-color 0.3s',
          outline: 'none',
          marginBottom: '40px'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(4px)';
          e.currentTarget.style.boxShadow = `0 2px 0 ${isDark ? '#991B1B' : '#FCA5A5'}`;
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = `0 6px 0 ${isDark ? '#991B1B' : '#FCA5A5'}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = `0 6px 0 ${isDark ? '#991B1B' : '#FCA5A5'}`;
        }}
      >
        <LogOut size={20} strokeWidth={3} />
        <span>Keluar Akun</span>
      </button>

      {/* Bottom Navigation Navbar - Style Duolingo */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        backgroundColor: isDark ? '#2D1D13' : 'white',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '1.25rem 1rem 1.5rem 1rem',
        borderTop: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
        boxShadow: isDark ? '0 -10px 25px rgba(0, 0, 0, 0.2)' : '0 -10px 25px rgba(251, 146, 60, 0.08)',
        zIndex: 10,
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px',
        transition: 'all 0.3s ease'
      }}>
        <div 
          onClick={() => navigate('/home')}
          style={{ color: isDark ? '#6B7280' : '#D1D5DB', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
        >
          <HomeIcon size={28} strokeWidth={3} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Home</span>
        </div>
        <div 
          onClick={() => navigate('/spa')}
          style={{ color: isDark ? '#6B7280' : '#D1D5DB', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
        >
          <Brush size={28} strokeWidth={3} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>SPA</span>
        </div>
        <div style={{ color: '#F97316', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <User size={28} strokeWidth={3} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Profile</span>
        </div>
      </div>

    </div>
    </div>
  );
};

export default Me;
