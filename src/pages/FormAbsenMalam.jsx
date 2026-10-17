import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, doc, GeoPoint, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  Clock,
  ShieldCheck,
  Users,
  Calendar,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  RotateCw
} from 'lucide-react';

const FormAbsenMalam = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { addNotification } = useNotification();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState('');
  const [success, setSuccess] = useState(false);

  // Daily limit: 1x per day per account
  const [alreadySubmittedToday, setAlreadySubmittedToday] = useState(false);
  const [todaySubmission, setTodaySubmission] = useState(null);
  const [checkingDaily, setCheckingDaily] = useState(true);

  // Time-based lock for Form: only open 21:30-22:00 WIB
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // List of who has already checked in today
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loadingTodayList, setLoadingTodayList] = useState(true);
  const [searchTodayQuery, setSearchTodayQuery] = useState('');
  const [lastListRefreshed, setLastListRefreshed] = useState(null);
  const [expandedMapId, setExpandedMapId] = useState(null);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      // 21:30 = 1290 minutes, 22:00 = 1320 minutes
      const openTime = 21 * 60 + 30; // 21:30
      const closeTime = 22 * 60; // 22:00

      if (totalMinutes >= openTime && totalMinutes < closeTime) {
        setIsTimeOpen(true);
        const remainingMinutes = closeTime - totalMinutes;
        const remainingSecs = 60 - now.getSeconds();
        if (remainingMinutes <= 1) {
          setTimeLeft(`${remainingSecs} detik lagi`);
        } else {
          setTimeLeft(`${remainingMinutes} menit lagi`);
        }
      } else {
        setIsTimeOpen(false);
        if (totalMinutes < openTime) {
          const diff = openTime - totalMinutes;
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          setTimeLeft(h > 0 ? `${h} jam ${m} menit lagi` : `${m} menit lagi`);
        } else {
          const diff = (24 * 60 - totalMinutes) + openTime;
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          setTimeLeft(h > 0 ? `${h} jam ${m} menit lagi` : `${m} menit lagi`);
        }
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 5000);
    return () => clearInterval(interval);
  }, []);

  // Map refresh key
  const [mapKey, setMapKey] = useState(() => Date.now());
  const [refreshSuccessMsg, setRefreshSuccessMsg] = useState(false);

  // Fetch today's attendance list
  const fetchTodayAttendance = useCallback(async () => {
    setLoadingTodayList(true);
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // 1. Fetch Users map
      const usersSnap = await getDocs(collection(db, 'users'));
      const userMap = new Map();
      usersSnap.forEach((d) => {
        userMap.set(d.id, { id: d.id, ...d.data() });
      });

      // 2. Fetch absenMalam
      const absenSnap = await getDocs(collection(db, 'absenMalam'));
      const list = [];

      absenSnap.forEach((d) => {
        const data = d.data();

        // Resolve user reference
        let recordUserId = null;
        if (data.user) {
          if (typeof data.user === 'string') {
            recordUserId = data.user.startsWith('/users/')
              ? data.user.split('/')[2]
              : data.user.replace('users/', '');
          } else if (data.user.id) {
            recordUserId = data.user.id;
          } else if (data.user.path) {
            const parts = data.user.path.split('/');
            recordUserId = parts[parts.length - 1];
          }
        }

        // Check if createdAt is today
        let createdDate = null;
        if (data.createdAt) {
          if (data.createdAt.toDate) {
            createdDate = data.createdAt.toDate();
          } else if (data.createdAt instanceof Date) {
            createdDate = data.createdAt;
          } else {
            createdDate = new Date(data.createdAt);
          }
        }

        if (createdDate && createdDate >= startOfDay && createdDate <= endOfDay) {
          const userData = userMap.get(recordUserId) || null;
          list.push({
            id: d.id,
            ...data,
            createdDate,
            userId: recordUserId,
            userData: userData || {
              username: 'Warga Asrama',
              name: 'Warga Asrama',
              angkatan: '-',
              prodi: '-'
            }
          });
        }
      });

      // Sort newest check-in first
      list.sort((a, b) => b.createdDate - a.createdDate);
      setTodayAttendance(list);
      setLastListRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching today attendance list:', err);
    } finally {
      setLoadingTodayList(false);
    }
  }, []);

  // Check if user already submitted today
  const checkDailyLimit = async (userId) => {
    setCheckingDaily(true);
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const absenRef = collection(db, 'absenMalam');
      const snap = await getDocs(absenRef);

      let submittedData = null;
      snap.forEach((d) => {
        const data = d.data();
        let recordUserId = null;
        if (data.user) {
          if (typeof data.user === 'string') {
            recordUserId = data.user.startsWith('/users/')
              ? data.user.split('/')[2]
              : data.user.replace('users/', '');
          } else if (data.user.id) {
            recordUserId = data.user.id;
          } else if (data.user.path) {
            const parts = data.user.path.split('/');
            recordUserId = parts[parts.length - 1];
          }
        }

        if (recordUserId === userId) {
          let createdDate = null;
          if (data.createdAt) {
            if (data.createdAt.toDate) {
              createdDate = data.createdAt.toDate();
            } else if (data.createdAt instanceof Date) {
              createdDate = data.createdAt;
            } else {
              createdDate = new Date(data.createdAt);
            }
          }
          if (createdDate && createdDate >= startOfDay && createdDate <= endOfDay) {
            submittedData = {
              id: d.id,
              ...data,
              createdDate
            };
          }
        }
      });

      if (submittedData) {
        setAlreadySubmittedToday(true);
        setTodaySubmission(submittedData);
      } else {
        setAlreadySubmittedToday(false);
        setTodaySubmission(null);
      }
    } catch (err) {
      console.error('Error checking daily limit:', err);
    } finally {
      setCheckingDaily(false);
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        checkDailyLimit(currentUser.uid);
      } else {
        setCheckingDaily(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto request location on mount
  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = () => {
    setLocating(true);
    setLocationError('');
    setRefreshSuccessMsg(false);

    if (!navigator.geolocation) {
      setLocationError('Browser Anda tidak mendukung fitur lokasi (Geolocation).');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setCoords({ lat, lon });
        setMapKey(Date.now()); // Force map reload with new timestamp key

        // Reverse Geocode with OpenStreetMap Nominatim
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
            {
              headers: {
                'User-Agent': 'AsramaApp/1.0 (rifqiadlihernawan@gmail.com)'
              }
            }
          );
          if (response.ok) {
            const data = await response.json();
            setAddress(data.display_name || `Koordinat: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
          } else {
            setAddress(`Koordinat: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
          }
        } catch (err) {
          console.error('Nominatim error:', err);
          setAddress(`Koordinat: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        } finally {
          setLocating(false);
          setRefreshSuccessMsg(true);
          setTimeout(() => setRefreshSuccessMsg(false), 3000);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Akses lokasi ditolak. Silakan izinkan akses lokasi pada browser/perangkat Anda.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Lokasi tidak tersedia. Pastikan GPS/layanan lokasi Anda sudah aktif.');
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Waktu pencarian lokasi habis. Silakan coba lagi.');
        } else {
          setLocationError('Gagal mendeteksi lokasi Anda. Silakan coba refresh peta.');
        }
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    if (!coords || !auth.currentUser || alreadySubmittedToday) return;

    setLoading(true);
    try {
      // Re-verify daily submission to prevent concurrent duplicate submissions
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const absenRef = collection(db, 'absenMalam');
      const snap = await getDocs(absenRef);
      let duplicateFound = false;

      snap.forEach((d) => {
        const data = d.data();
        let recordUserId = null;
        if (data.user) {
          if (typeof data.user === 'string') {
            recordUserId = data.user.startsWith('/users/')
              ? data.user.split('/')[2]
              : data.user.replace('users/', '');
          } else if (data.user.id) {
            recordUserId = data.user.id;
          } else if (data.user.path) {
            const parts = data.user.path.split('/');
            recordUserId = parts[parts.length - 1];
          }
        }
        if (recordUserId === auth.currentUser.uid) {
          let createdDate = null;
          if (data.createdAt) {
            if (data.createdAt.toDate) createdDate = data.createdAt.toDate();
            else if (data.createdAt instanceof Date) createdDate = data.createdAt;
            else createdDate = new Date(data.createdAt);
          }
          if (createdDate && createdDate >= startOfDay && createdDate <= endOfDay) {
            duplicateFound = true;
          }
        }
      });

      if (duplicateFound) {
        alert('Anda sudah mengirimkan absen malam hari ini.');
        setAlreadySubmittedToday(true);
        setLoading(false);
        return;
      }

      const dbGeoPoint = new GeoPoint(coords.lat, coords.lon);

      const newAttendance = {
        createdAt: new Date(),
        location: {
          coordinate: dbGeoPoint,
          address: address
        },
        user: doc(db, 'users', auth.currentUser.uid),
        usersVerif: null,
        verification: false
      };

      const docRef = await addDoc(collection(db, 'absenMalam'), newAttendance);

      setTodaySubmission({
        id: docRef.id,
        ...newAttendance,
        createdDate: newAttendance.createdAt
      });
      setAlreadySubmittedToday(true);
      setSuccess(true);

      // Refresh list
      fetchTodayAttendance();

      if (addNotification) {
        addNotification({
          title: "Absen Malam Terkirim 🌙",
          body: "Data absensi malam Anda berhasil dikirim dan menunggu verifikasi.",
          type: "absen_malam_submitted"
        });
      }
    } catch (error) {
      console.error('Gagal mengirim absen:', error);
      alert('Terjadi kesalahan saat mengirim data absen. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeStr = (date) => {
    if (!date) return '';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    } catch {
      return '';
    }
  };

  const todayDateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const filteredTodayAttendance = todayAttendance.filter((item) => {
    if (!searchTodayQuery.trim()) return true;
    const q = searchTodayQuery.toLowerCase();
    const name = (item.userData?.name || '').toLowerCase();
    const username = (item.userData?.username || '').toLowerCase();
    const angkatan = String(item.userData?.angkatan || '').toLowerCase();
    const address = (item.location?.address || '').toLowerCase();
    return name.includes(q) || username.includes(q) || angkatan.includes(q) || address.includes(q);
  });

  return (
    <div className="page-shell-narrow" style={{
      background: isDark ? '#1E130C' : '#FFF9F5',
      minHeight: '100vh',
      padding: '2rem 1.5rem 80px 1.5rem',
      position: 'relative',
      fontFamily: '"Nunito", "Inter", sans-serif',
      maxWidth: '480px',
      margin: '0 auto',
      boxShadow: '0 0 20px rgba(0,0,0,0.05)',
      transition: 'background-color 0.3s ease',
      boxSizing: 'border-box'
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
          disabled={loading}
          style={{
            background: isDark ? '#2D1D13' : '#FFFFFF',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            borderRadius: '16px',
            padding: '10px',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: '#F97316',
            boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.1s, box-shadow 0.1s, background-color 0.3s',
            outline: 'none'
          }}
          onMouseDown={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(2px)';
              e.currentTarget.style.boxShadow = `0 2px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
            }
          }}
          onMouseUp={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
            }
          }}
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#F97316',
            margin: 0
          }}>
            Absen Malam
          </h1>
          <p style={{ color: isDark ? '#FED7AA' : '#FB923C', margin: '0.25rem 0 0 0', fontWeight: 650 }}>
            Kirim kehadiran malam Anda (1x per hari)
          </p>
        </div>
      </div>

      {/* Loading daily check */}
      {checkingDaily && (
        <div style={{
          textAlign: 'center',
          padding: '3rem 0',
          color: '#F97316',
          fontWeight: 800
        }}>
          <RefreshCw size={28} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '12px' }} />
          <div>Memeriksa riwayat absen hari ini...</div>
        </div>
      )}

      {/* 2. Success View (When submission was just completed) */}
      {!checkingDaily && success && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '24px',
          padding: '32px 16px',
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '32px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5',
          marginTop: '1rem',
          animation: 'bounceIn 0.5s'
        }}>
          <div style={{
            backgroundColor: isDark ? '#1C3D27' : '#ECFDF5',
            color: '#10B981',
            padding: '24px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.15)'
          }}>
            <CheckCircle size={64} strokeWidth={2.5} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937', margin: '0 0 8px 0' }}>
              Absen Berhasil! 🎉
            </h2>
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.5 }}>
              Kehadiran malam Anda telah tercatat dan sedang menunggu verifikasi oleh Kepenghunian / Staf Asrama.
            </p>
          </div>
          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%',
              backgroundColor: '#F97316',
              color: 'white',
              border: '2px solid #EA580C',
              borderRadius: '20px',
              padding: '16px',
              fontSize: '1.05rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 6px 0 #EA580C',
              transition: 'transform 0.1s, box-shadow 0.1s',
              outline: 'none',
              marginTop: '8px'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(4px)';
              e.currentTarget.style.boxShadow = '0 2px 0 #EA580C';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 6px 0 #EA580C';
            }}
          >
            Kembali ke Home
          </button>
        </div>
      )}

      {/* 3. Outside 21:30-22:00 WIB - Time Lock Screen */}
      {!checkingDaily && !success && !isTimeOpen && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '20px',
          padding: '36px 20px',
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '32px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5',
          marginTop: '1rem',
          animation: 'bounceIn 0.4s'
        }}>
          <div style={{
            backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
            color: '#F97316',
            padding: '24px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(249, 115, 22, 0.15)'
          }}>
            <Lock size={52} strokeWidth={2.5} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937', margin: '0 0 8px 0' }}>
              Form Absen Malam Terkunci 🔒
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.5 }}>
              Form pengisian absen malam hanya dibuka pada pukul <strong>21:30 – 22:00 WIB</strong>.
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '16px',
            backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.08)',
            border: `1.5px solid ${isDark ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)'}`,
          }}>
            <Clock size={16} color="#F97316" />
            <span style={{
              fontSize: '0.9rem',
              fontWeight: 800,
              color: '#F97316',
            }}>
              Dibuka dalam: {timeLeft}
            </span>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <button
              onClick={() => navigate('/home')}
              style={{
                width: '100%',
                backgroundColor: '#F97316',
                color: 'white',
                border: '2px solid #EA580C',
                borderRadius: '20px',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 5px 0 #EA580C',
                transition: 'transform 0.1s, box-shadow 0.1s',
                outline: 'none'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)';
                e.currentTarget.style.boxShadow = '0 3px 0 #EA580C';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 5px 0 #EA580C';
              }}
            >
              Kembali ke Home
            </button>

            <button
              onClick={() => navigate('/verification-absen-malam')}
              style={{
                width: '100%',
                backgroundColor: isDark ? '#1E293B' : '#EFF6FF',
                color: '#3B82F6',
                border: `2px solid ${isDark ? '#334155' : '#BFDBFE'}`,
                borderRadius: '20px',
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: isDark ? '0 4px 0 #334155' : '0 4px 0 #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <ShieldCheck size={16} />
              <span>Lihat Verifikasi Absen (Buka 24 Jam)</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Already submitted today - locked state (1 akun 1 kali per hari) */}
      {!checkingDaily && !success && isTimeOpen && alreadySubmittedToday && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '20px',
          padding: '32px 20px',
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '32px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5',
          marginTop: '1rem',
          animation: 'bounceIn 0.4s'
        }}>
          <div style={{
            backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
            color: '#F97316',
            padding: '24px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(249, 115, 22, 0.15)'
          }}>
            <Lock size={52} strokeWidth={2.5} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937', margin: '0 0 8px 0' }}>
              Sudah Absen Hari Ini ✅
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.5 }}>
              Setiap akun hanya dapat mengisi absen malam <strong>1 kali per hari</strong>. Kehadiran Anda hari ini sudah berhasil tercatat.
            </p>
          </div>

          {/* Card Detail Absen Hari Ini */}
          {todaySubmission && (
            <div style={{
              width: '100%',
              backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
              border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
              borderRadius: '20px',
              padding: '16px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F97316', fontSize: '0.85rem', fontWeight: 800 }}>
                  <Clock size={16} />
                  <span>Waktu Absen:</span>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                  {formatTimeStr(todaySubmission.createdDate || todaySubmission.createdAt)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <MapPin size={16} color="#F97316" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '0.8rem', color: isDark ? '#FED7AA' : '#4B5563', fontWeight: 650, lineHeight: 1.4 }}>
                  {todaySubmission.location?.address || 'Lokasi tercatat'}
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '12px',
                backgroundColor: todaySubmission.verification ? (isDark ? '#1C3D27' : '#ECFDF5') : (isDark ? '#3D291C' : '#FFF7ED'),
                color: todaySubmission.verification ? '#10B981' : '#F59E0B',
                fontSize: '0.78rem',
                fontWeight: 800,
                alignSelf: 'flex-start',
                marginTop: '4px'
              }}>
                <ShieldCheck size={14} />
                <span>{todaySubmission.verification ? 'Sudah Diverifikasi Staf' : 'Menunggu Verifikasi Staf'}</span>
              </div>
            </div>
          )}

          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%',
              backgroundColor: '#F97316',
              color: 'white',
              border: '2px solid #EA580C',
              borderRadius: '20px',
              padding: '15px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 6px 0 #EA580C',
              transition: 'transform 0.1s, box-shadow 0.1s',
              outline: 'none',
              marginTop: '4px'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(4px)';
              e.currentTarget.style.boxShadow = '0 2px 0 #EA580C';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 6px 0 #EA580C';
            }}
          >
            Kembali ke Home
          </button>
        </div>
      )}

      {/* 5. Form View (Only when time is open and user has not submitted today and not in success state) */}
      {!checkingDaily && !success && isTimeOpen && !alreadySubmittedToday && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card Deteksi Lokasi */}
          <div style={{
            backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
            borderRadius: '28px',
            padding: '24px',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                📍 Informasi Lokasi
              </h3>
              {/* Tombol Refresh Peta Header */}
              <button
                type="button"
                onClick={getLocation}
                disabled={locating}
                style={{
                  backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                  color: '#F97316',
                  border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  borderRadius: '12px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: locating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  outline: 'none',
                  boxShadow: isDark ? '0 2px 0 #4A2E1E' : '0 2px 0 #FFEDD5',
                  opacity: locating ? 0.6 : 1,
                  transition: 'all 0.1s'
                }}
                onMouseDown={(e) => {
                  if (!locating) {
                    e.currentTarget.style.transform = 'translateY(1px)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
                onMouseUp={(e) => {
                  if (!locating) {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = isDark ? '0 2px 0 #4A2E1E' : '0 2px 0 #FFEDD5';
                  }
                }}
              >
                <RefreshCw size={13} style={locating ? { animation: 'spin 1s linear infinite' } : {}} />
                <span>{locating ? 'Memuat...' : 'Refresh Peta'}</span>
              </button>
            </div>

            {/* Notifikasi feedback refresh berhasil */}
            {refreshSuccessMsg && (
              <div style={{
                backgroundColor: isDark ? '#1C3D27' : '#ECFDF5',
                color: '#10B981',
                border: '1.5px solid #10B981',
                borderRadius: '12px',
                padding: '8px 12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <CheckCircle size={14} />
                <span>Lokasi dan peta berhasil diperbarui!</span>
              </div>
            )}

            {locating && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                gap: '12px'
              }}>
                <RefreshCw size={32} style={{ color: '#F97316', animation: 'spin 1.5s linear infinite' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
                  Mendeteksi lokasi & koordinat terbaru...
                </span>
              </div>
            )}

            {locationError && (
              <div style={{
                backgroundColor: isDark ? '#4C1D1D' : '#FEF2F2',
                border: '2px solid #FCA5A5',
                borderRadius: '20px',
                padding: '16px',
                display: 'flex',
                gap: '12px',
                color: '#DC2626'
              }}>
                <AlertTriangle size={24} style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.4 }}>
                    {locationError}
                  </p>
                  <button
                    onClick={getLocation}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '8px 14px',
                      backgroundColor: '#DC2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <RefreshCw size={13} />
                    Coba Refresh Lagi
                  </button>
                </div>
              </div>
            )}

            {coords && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  backgroundColor: isDark ? '#1E130C' : '#FFF7ED',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <Navigation size={18} color="#F97316" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#F97316', textTransform: 'uppercase' }}>Alamat Terdeteksi</span>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#E5E7EB' : '#4B5563', fontWeight: 650, lineHeight: 1.4 }}>
                      {address || 'Mengambil alamat...'}
                    </p>
                  </div>
                </div>

                {/* Google Maps Embed Preview Frame with Refresh Button */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    borderRadius: '20px',
                    overflow: 'hidden',
                    height: '190px',
                    border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                    position: 'relative'
                  }}>
                    <iframe
                      key={mapKey}
                      title="Location Preview"
                      src={`https://maps.google.com/maps?q=${coords.lat},${coords.lon}&z=16&output=embed&t=${mapKey}`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                    ></iframe>
                  </div>

                  {/* Refresh Map Overlay Button */}
                  <button
                    onClick={getLocation}
                    disabled={locating}
                    title="Perbarui koordinat dan reload peta"
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
                      color: '#F97316',
                      border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                      borderRadius: '14px',
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: locating ? 'not-allowed' : 'pointer',
                      boxShadow: isDark ? '0 3px 0 #4A2E1E' : '0 3px 0 #FFEDD5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      zIndex: 5,
                      outline: 'none',
                      opacity: locating ? 0.6 : 1,
                      transition: 'all 0.1s'
                    }}
                    onMouseDown={(e) => {
                      if (!locating) {
                        e.currentTarget.style.transform = 'translateY(2px)';
                        e.currentTarget.style.boxShadow = `0 1px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
                      }
                    }}
                    onMouseUp={(e) => {
                      if (!locating) {
                        e.currentTarget.style.transform = 'translateY(0px)';
                        e.currentTarget.style.boxShadow = `0 3px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`;
                      }
                    }}
                  >
                    <RefreshCw size={14} style={locating ? { animation: 'spin 1s linear infinite' } : {}} />
                    {locating ? 'Memperbarui...' : 'Refresh Peta'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tombol Absen Utama */}
          <button
            onClick={handleSubmit}
            disabled={loading || locating || !coords}
            style={{
              width: '100%',
              backgroundColor: !coords || loading || locating ? (isDark ? '#4A2E1E' : '#E5E7EB') : '#F97316',
              color: !coords || loading || locating ? (isDark ? '#9CA3AF' : '#9CA3AF') : 'white',
              border: !coords || loading || locating ? `2px solid ${isDark ? '#4A2E1E' : '#D1D5DB'}` : '2px solid #EA580C',
              borderRadius: '24px',
              padding: '18px',
              fontSize: '1.1rem',
              fontWeight: 900,
              cursor: !coords || loading || locating ? 'not-allowed' : 'pointer',
              boxShadow: !coords || loading || locating ? 'none' : '0 6px 0 #EA580C',
              transition: 'all 0.1s ease',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '12px'
            }}
            onMouseDown={(e) => {
              if (coords && !loading && !locating) {
                e.currentTarget.style.transform = 'translateY(4px)';
                e.currentTarget.style.boxShadow = '0 2px 0 #EA580C';
              }
            }}
            onMouseUp={(e) => {
              if (coords && !loading && !locating) {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 6px 0 #EA580C';
              }
            }}
          >
            {loading ? 'Mengirim Absen...' : (
              <>
                <MapPin size={22} />
                <span>Kirim Absen Sekarang</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: LIST SIAPA SAJA YANG SUDAH ABSEN HARI INI */}
      {/* ========================================================================= */}
      {!checkingDaily && (
        <div style={{
          marginTop: '28px',
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '24px 20px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          borderTop: '6px solid #F97316',
          boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5',
          transition: 'all 0.3s ease'
        }}>
          {/* Header Section */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            paddingBottom: '16px',
            borderBottom: `1.5px solid ${isDark ? '#4A2E1E' : '#F3F4F6'}`
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  padding: '7px',
                  borderRadius: '12px',
                  backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                  color: '#F97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1.5px solid ${isDark ? '#4A2E1E' : '#FED7AA'}`
                }}>
                  <Users size={18} />
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: isDark ? '#FFFFFF' : '#1F2937'
                }}>
                  Sudah Absen Hari Ini
                </h3>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '6px',
                fontSize: '0.8rem',
                color: isDark ? '#FED7AA' : '#6B7280',
                fontWeight: 700
              }}>
                <Calendar size={13} />
                <span>{todayDateFormatted}</span>
                {lastListRefreshed && (
                  <span style={{ opacity: 0.75 }}>
                    • {lastListRefreshed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

            {/* Total Badge & Refresh Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                padding: '5px 12px',
                backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
                border: `1.5px solid ${isDark ? '#4A2E1E' : '#FDBA74'}`,
                borderRadius: '16px',
                color: '#F97316',
                fontWeight: 900,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Users size={13} />
                <span>{todayAttendance.length} Orang</span>
              </div>

              <button
                type="button"
                onClick={fetchTodayAttendance}
                disabled={loadingTodayList}
                title="Segarkan daftar absen hari ini"
                style={{
                  padding: '7px 12px',
                  backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                  color: isDark ? '#FED7AA' : '#4B5563',
                  border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: loadingTodayList ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  opacity: loadingTodayList ? 0.7 : 1,
                  outline: 'none'
                }}
              >
                <RotateCw size={13} style={loadingTodayList ? { animation: 'spin 1s linear infinite' } : {}} />
                <span>{loadingTodayList ? 'Memuat...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Quick Filter Search jika data lebih dari 3 */}
          {todayAttendance.length > 3 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
                border: `1.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                borderRadius: '14px',
                padding: '8px 12px'
              }}>
                <Search size={15} color={isDark ? '#FED7AA' : '#9CA3AF'} />
                <input
                  type="text"
                  value={searchTodayQuery}
                  onChange={(e) => setSearchTodayQuery(e.target.value)}
                  placeholder="Cari nama, username, atau angkatan..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.82rem',
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    fontWeight: 700
                  }}
                />
                {searchTodayQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchTodayQuery('')}
                    style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Body Content */}
          {loadingTodayList ? (
            <div style={{
              textAlign: 'center',
              padding: '28px 16px',
              color: isDark ? '#FED7AA' : '#6B7280'
            }}>
              <RotateCw size={22} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 10px auto', display: 'block', color: '#F97316' }} />
              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800 }}>Memuat daftar yang sudah absen...</p>
            </div>
          ) : filteredTodayAttendance.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px 16px',
              backgroundColor: isDark ? '#1E130C' : '#FFF9F5',
              borderRadius: '20px',
              border: `1.5px dashed ${isDark ? '#4A2E1E' : '#FED7AA'}`
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: isDark ? '#2D1D13' : '#FFF7ED',
                color: '#F97316',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px auto',
                fontSize: '1.4rem'
              }}>
                🌙
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
                {searchTodayQuery ? 'Penghuni Tidak Ditemukan' : 'Belum Ada yang Absen Hari Ini'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: isDark ? '#FED7AA' : '#6B7280', fontWeight: 650 }}>
                {searchTodayQuery
                  ? 'Coba gunakan kata kunci pencarian yang lain.'
                  : 'Jadilah yang pertama mengisi dan mengirimkan absen malam hari ini!'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredTodayAttendance.map((record, index) => {
                const user = record.userData || {};
                const displayName = user.name || user.username || 'Warga Asrama';
                const initial = displayName.charAt(0).toUpperCase();
                const isExpandedMap = expandedMapId === record.id;

                return (
                  <div
                    key={record.id || `record-${index}`}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: isDark ? '#1E130C' : '#FFFDFB',
                      border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                      borderRadius: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'all 0.2s ease',
                      boxShadow: isDark ? '0 3px 0 #4A2E1E' : '0 3px 0 #FFEDD5'
                    }}
                  >
                    {/* Top Row: User Avatar, Name, Time, and Status */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      {/* User Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        {user.fotoProfil ? (
                          <img
                            src={user.fotoProfil}
                            alt={displayName}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid #F97316',
                              flexShrink: 0
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: '#F97316',
                            color: '#FFFFFF',
                            fontWeight: 900,
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(249, 115, 22, 0.25)'
                          }}>
                            {initial}
                          </div>
                        )}

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontWeight: 900,
                            fontSize: '0.92rem',
                            color: isDark ? '#FFFFFF' : '#1F2937',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {displayName}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: isDark ? '#FED7AA' : '#6B7280',
                            fontWeight: 700,
                            display: 'flex',
                            gap: '5px',
                            flexWrap: 'wrap'
                          }}>
                            {user.username && <span>@{user.username}</span>}
                            {user.angkatan && user.angkatan !== '-' && <span>• Angkatan {user.angkatan}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Status & Time */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          backgroundColor: record.verification ? (isDark ? '#064E3B' : '#ECFDF5') : (isDark ? '#3D291C' : '#FFF7ED'),
                          border: `1px solid ${record.verification ? (isDark ? '#059669' : '#A7F3D0') : (isDark ? '#4A2E1E' : '#FDBA74')}`,
                          color: record.verification ? (isDark ? '#6EE7B7' : '#047857') : '#F97316',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          marginBottom: '3px'
                        }}>
                          {record.verification ? <ShieldCheck size={11} /> : <Clock size={11} />}
                          <span>{record.verification ? 'Diverifikasi' : 'Menunggu'}</span>
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: isDark ? '#FED7AA' : '#F97316',
                          fontWeight: 800
                        }}>
                          {formatTimeStr(record.createdDate || record.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Alamat Absen Box */}
                    <div style={{
                      backgroundColor: isDark ? '#2D1D13' : '#FFF7ED',
                      border: `1px solid ${isDark ? '#4A2E1E' : '#FED7AA'}`,
                      borderRadius: '12px',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px'
                    }}>
                      <MapPin size={14} color="#F97316" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <p style={{
                        margin: 0,
                        fontSize: '0.78rem',
                        color: isDark ? '#FED7AA' : '#4B5563',
                        fontWeight: 650,
                        lineHeight: 1.35,
                        flex: 1
                      }}>
                        {record.location?.address || 'Lokasi tercatat'}
                      </p>
                    </div>

                    {/* Collapsible Map Embed Button (if coordinate exists) */}
                    {record.location?.coordinate && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setExpandedMapId(isExpandedMap ? null : record.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#F97316',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            padding: '2px 0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            outline: 'none'
                          }}
                        >
                          {isExpandedMap ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          <span>{isExpandedMap ? 'Tutup Peta' : 'Lihat Lokasi di Peta'}</span>
                        </button>

                        {isExpandedMap && (
                          <div style={{
                            borderRadius: '14px',
                            overflow: 'hidden',
                            height: '160px',
                            border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                            marginTop: '8px'
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Embedded Spin Animation CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 0.8; }
          70% { transform: scale(0.9); opacity: 0.9; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default FormAbsenMalam;
