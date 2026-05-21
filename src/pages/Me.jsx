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
  Brush 
} from 'lucide-react';

const Me = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);

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
      background: '#FFF9F5', // Orange muda background
      minHeight: '100vh',
      padding: '2rem 1.5rem 100px 1.5rem',
      position: 'relative',
      fontFamily: '"Nunito", "Inter", sans-serif',
      maxWidth: '480px',
      margin: '0 auto',
      boxShadow: '0 0 20px rgba(0,0,0,0.05)'
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
            background: '#FFFFFF',
            border: '2px solid #FFEDD5',
            borderRadius: '16px',
            padding: '10px',
            cursor: 'pointer',
            color: '#F97316',
            boxShadow: '0 4px 0 #FFEDD5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.1s, box-shadow 0.1s',
            outline: 'none'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(2px)';
            e.currentTarget.style.boxShadow = '0 2px 0 #FFEDD5';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 4px 0 #FFEDD5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 4px 0 #FFEDD5';
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
          <p style={{ color: '#FB923C', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
            Detail akun asrama kamu
          </p>
        </div>
      </div>

      {/* Profil Card Utama - Style Duolingo / Gojek */}
      {userData && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '28px',
          padding: '24px',
          border: '2px solid #FFEDD5',
          boxShadow: '0 8px 0 #FFEDD5, 0 15px 20px rgba(251, 146, 60, 0.1)', // Efek 3D
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          marginBottom: '24px'
        }}>

          {/* Bagian Atas: Avatar & Nama */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img
              src={userData.fotoProfil || "https://via.placeholder.com/150"}
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
            <div style={{ overflow: 'hidden' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1F2937', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {userData.username}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280', marginTop: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                <Mail size={16} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {userData.email}
                </span>
              </div>
            </div>
          </div>

          {/* Garis Pembatas */}
          <div style={{ height: '2px', backgroundColor: '#FFF7ED', borderRadius: '2px' }}></div>

          {/* Grid Informasi Detail */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            {/* NIM */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>NIM</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#374151', fontSize: '1.05rem' }}>
                <div style={{ backgroundColor: '#FFEDD5', padding: '6px', borderRadius: '12px', color: '#F97316' }}>
                  <Hash size={18} />
                </div>
                <span style={{ textTransform: 'uppercase' }}>{userData.nim}</span>
              </div>
            </div>

            {/* Angkatan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Angkatan</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#374151', fontSize: '1.05rem' }}>
                <div style={{ backgroundColor: '#FFEDD5', padding: '6px', borderRadius: '12px', color: '#F97316' }}>
                  <User size={18} />
                </div>
                {userData.angkatan}
              </div>
            </div>

            {/* Prodi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prodi</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#374151', fontSize: '1.05rem' }}>
                <div style={{ backgroundColor: '#FFEDD5', padding: '6px', borderRadius: '12px', color: '#F97316' }}>
                  <Book size={18} />
                </div>
                <span style={{ textTransform: 'uppercase' }}>{userData.prodi}</span>
              </div>
            </div>

            {/* Jabatan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jabatan</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#374151', fontSize: '1.05rem' }}>
                <div style={{ backgroundColor: '#FFEDD5', padding: '6px', borderRadius: '12px', color: '#F97316' }}>
                  <Shield size={18} />
                </div>
                <span style={{ textTransform: 'capitalize' }}>{userData.jabatan}</span>
              </div>
            </div>

          </div>

          {/* Tanggal Pembuatan */}
          <div style={{
            backgroundColor: '#FFF7ED',
            padding: '16px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginTop: '8px',
            border: '1px dashed #FDBA74'
          }}>
            <Calendar size={24} color="#F97316" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: '#F97316', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bergabung Sejak
              </span>
              <span style={{ fontSize: '1rem', color: '#374151', fontWeight: 800 }}>
                {userData.createdAt ? formatDate(userData.createdAt) : '-'}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Logout Button - Style Duolingo Red 3D */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%',
          backgroundColor: '#FEE2E2', // Latar merah muda
          color: '#EF4444', // Teks merah
          border: '2px solid #FCA5A5',
          borderRadius: '20px',
          padding: '16px',
          fontSize: '1.05rem',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 6px 0 #FCA5A5', // Tebal bayangan 3D
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'transform 0.1s, box-shadow 0.1s',
          outline: 'none',
          marginBottom: '40px'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(4px)';
          e.currentTarget.style.boxShadow = '0 2px 0 #FCA5A5';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 6px 0 #FCA5A5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 6px 0 #FCA5A5';
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
          style={{ color: '#D1D5DB', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
        >
          <HomeIcon size={28} strokeWidth={3} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Home</span>
        </div>
        <div style={{ color: '#D1D5DB', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <Brush size={28} strokeWidth={3} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>SPA</span>
        </div>
        <div style={{ color: '#F97316', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <User size={28} strokeWidth={3} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Profile</span>
        </div>
      </div>

    </div>
  );
};

export default Me;
