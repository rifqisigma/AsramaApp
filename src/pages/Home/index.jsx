import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { Home as HomeIcon, Brush, User, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

// Import newly modularized components
import CardPoint from '../../components/CardPoint';
import CardKegiatan from '../../components/CardKegiatan';
import CardPiket from '../../components/CardPiket';
import CardJamal from '../../components/CardJamal';
import CardCreatePiket from '../../components/CardCreatePiket';
import CardAbsenMalam from '../../components/CardAbsenMalam';
import CardBerita from '../../components/CardBerita';

const Home = () => {
  const navigate = useNavigate();

  // Theme state synced globally
  const { theme, toggleTheme } = useTheme();

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

  // State for Kegiatan Asrama
  const [kegiatanList, setKegiatanList] = useState([]);
  const [loadingKegiatan, setLoadingKegiatan] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Fetch Piket Stats
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
          laporTotal: laporT,
          laporVerified: laporV,
          laporUnverified: laporU,
          ttdTotal: ttdT,
          ttdVerified: ttdV,
          ttdUnverified: ttdU
        });
      } catch (error) {
        console.error("Error fetching piket stats:", error);
      }
    };
    fetchPiketStats();
  }, []);

  // Fetch Jamal Stats
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

          const hasUser = (data.usertoJamal || []).some(ref => ref.id === myUid);
          if (hasUser) {
            laporT++;
            if (data.verification === true) laporV++;
            else laporU++;
          }

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

  // Fetch Kegiatan and Resolve Author Jabatan
  useEffect(() => {
    const fetchKegiatan = async () => {
      setLoadingKegiatan(true);
      try {
        const snap = await getDocs(collection(db, 'kegiatan'));
        const list = [];

        for (const docObj of snap.docs) {
          const data = docObj.data();
          let authorJabatan = 'Kementerian';
          if (data.author) {
            let authorUid = '';
            if (typeof data.author === 'string') {
              authorUid = data.author;
            } else if (data.author.id) {
              authorUid = data.author.id;
            } else if (data.author.path) {
              const pathParts = data.author.path.split('/');
              authorUid = pathParts[pathParts.length - 1];
            }

            if (authorUid) {
              try {
                const userSnap = await getDoc(doc(db, 'users', authorUid));
                if (userSnap.exists()) {
                  authorJabatan = userSnap.data().jabatan || 'Warga';
                }
              } catch (err) {
                console.error("Error resolving author doc:", err);
              }
            }
          }
          list.push({
            id: docObj.id,
            ...data,
            authorJabatan
          });
        }
        setKegiatanList(list);
      } catch (error) {
        console.error("Error fetching kegiatan:", error);
      } finally {
        setLoadingKegiatan(false);
      }
    };
    fetchKegiatan();
  }, []);

  // Kegiatan Date Picker Helper List Generator
  const getNext7Days = () => {
    const days = [];
    const nameDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      days.push({
        date: d,
        dayNum: d.getDate(),
        dayName: nameDays[d.getDay()],
        isoStr: d.toISOString().split('T')[0]
      });
    }
    return days;
  };

  const formatKegiatanTime = (isoString) => {
    if (!isoString) return '';
    if (isoString.toLowerCase() === 'selesai') return 'Selesai';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';
    } catch (e) {
      return isoString;
    }
  };

  const isDark = theme === 'dark';

  return (
    <div style={{
      background: isDark ? '#1E130C' : '#FFF9F5', // Theme adaptive background
      minHeight: '100vh',
      padding: '2rem 1.5rem 120px 1.5rem',
      position: 'relative',
      fontFamily: '"Nunito", "Inter", sans-serif',
      transition: 'background-color 0.3s ease'
    }}>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Mini Profile Header */}
      {userData && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          {/* Username and Angkatan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 800,
              color: isDark ? '#FFFFFF' : '#1F2937',
              fontFamily: '"Nunito", "Inter", sans-serif',
              transition: 'color 0.3s'
            }}>
              {userData.username}
            </h2>
            <div style={{
              alignSelf: 'flex-start',
              backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
              border: '2px solid #F97316',
              borderRadius: '20px',
              padding: '4px 14px',
              color: '#F97316',
              fontSize: '0.8rem',
              fontWeight: 800,
              boxShadow: isDark ? '0 3px 0 #1E130C' : '0 3px 0 #FFEDD5',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s'
            }}>
              <span style={{ fontSize: '0.95rem' }}>⚡</span>
              <span>Angkatan {userData.angkatan}</span>
            </div>
          </div>
          {/* Profile Picture */}
          <div
            onClick={() => navigate('/me')}
            style={{
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              borderRadius: '50%',
              padding: '3px',
              background: isDark ? '#2D1D13' : '#FFFFFF',
              border: '3px solid #F97316',
              boxShadow: isDark ? '0 4px 0 #1E130C' : '0 4px 0 #FFEDD5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08) rotate(3deg)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
          >
            <img
              src={userData.fotoProfil || "https://via.placeholder.com/150"}
              alt="Profile"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          </div>
        </div>
      )}

      {/* 1. COMPONENT: Card Kegiatan (Datepicker at the bottom) */}
      <CardKegiatan
        kegiatanList={kegiatanList}
        loadingKegiatan={loadingKegiatan}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        getNext7Days={getNext7Days}
        formatKegiatanTime={formatKegiatanTime}
        navigate={navigate}
        theme={theme}
        userData={userData}
      />

      {/* 2. COMPONENT: Card Poin Asrama */}
      {userData && <CardPoint userData={userData} theme={theme} />}

      {/* Cards Section */}
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* 3. COMPONENT: Card Piket */}
        <CardPiket piketStats={piketStats} userData={userData} theme={theme} />

        {/* 4. COMPONENT: Card Jam Malam */}
        <CardJamal jamalStats={jamalStats} userData={userData} theme={theme} />

        {/* 5. COMPONENT: Card Buat Piket (Staff Only) */}
        <CardCreatePiket userData={userData} theme={theme} />

        {/* 6. COMPONENT: Card Absen Malam */}
        <CardAbsenMalam userData={userData} theme={theme} navigate={navigate} />

        {/* 7. COMPONENT: Card Berita (hanya untuk user dengan jabatan) */}
        <CardBerita userData={userData} theme={theme} navigate={navigate} />

      </div>

      {/* GoPay-inspired Theme Toggle Card */}
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
        marginTop: '40px',
        marginBottom: '20px',
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

        {/* Giant GoPay Vertical Switch Capsule Container */}
        <div
          onClick={toggleTheme}
          style={{
            width: '100px',
            height: '140px',
            backgroundColor: isDark ? '#1E130C' : '#F3F4F6',
            borderRadius: '24px',
            border: `3px solid ${isDark ? '#F97316' : '#E5E7EB'}`,
            boxShadow: isDark ? 'inset 0 4px 8px rgba(0,0,0,0.4)' : 'inset 0 4px 8px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            position: 'relative',
            transition: 'all 0.3s ease'
          }}
        >
          {/* The Switch Track slot (The capsule socket) */}
          <div style={{
            width: '46px',
            height: '96px',
            backgroundColor: isDark ? '#F97316' : '#D1D5DB',
            borderRadius: '24px',
            border: `2px solid ${isDark ? '#EA580C' : '#9CA3AF'}`,
            position: 'relative',
            overflow: 'hidden',
            transition: 'background-color 0.3s ease'
          }}>
            {/* Switch Handle (The Vertical Switch Thumb) */}
            <div style={{
              position: 'absolute',
              width: '38px',
              height: '38px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              left: '2px',
              top: isDark ? '4px' : '50px', // Slides between top (ON/dark) and bottom (OFF/light)
              boxShadow: '0 4px 6px rgba(0,0,0,0.15), inset 0 -3px 4px rgba(0,0,0,0.1), inset 0 3px 4px rgba(255,255,255,0.8)',
              transition: 'top 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}>
              {isDark ? '🌙' : '☀️'}
            </div>
          </div>
        </div>
      </div>

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
          style={{ color: '#F97316', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
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
        <div
          onClick={() => navigate('/me')}
          style={{ color: isDark ? '#6B7280' : '#D1D5DB', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
        >
          <User size={28} strokeWidth={3} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Profile</span>
        </div>
      </div>

    </div>
  );
};

export default Home;
