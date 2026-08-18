import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, doc, GeoPoint } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { ArrowLeft, MapPin, Navigation, CheckCircle, AlertTriangle, RefreshCw, Lock, Clock } from 'lucide-react';

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

  // Time-based lock: only open 22:00-22:30 WIB
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      const openTime = 22 * 60; // 22:00
      const closeTime = 22 * 60 + 30; // 22:30

      if (totalMinutes >= openTime && totalMinutes < closeTime) {
        setIsOpen(true);
        const remainingMinutes = closeTime - totalMinutes;
        const remainingSecs = 60 - now.getSeconds();
        if (remainingMinutes <= 1) {
          setTimeLeft(`${remainingSecs} detik lagi`);
        } else {
          setTimeLeft(`${remainingMinutes} menit lagi`);
        }
      } else {
        setIsOpen(false);
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
    const interval = setInterval(checkTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto request location on mount
  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = () => {
    setLocating(true);
    setLocationError('');
    setCoords(null);
    setAddress('');

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
        
        // Reverse Geocode
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
          setLocationError('Gagal mendeteksi lokasi Anda.');
        }
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    if (!coords || !auth.currentUser) return;
    
    setLoading(true);
    try {
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

      await addDoc(collection(db, 'absenMalam'), newAttendance);

      addNotification({
        title: "Absen Malam Terkirim 📍",
        body: `Absen malam Anda berhasil disubmit dari lokasi ${address.split(',')[0] || 'Asrama'}.`,
        type: "absen_malam_submission"
      });

      setSuccess(true);
    } catch (error) {
      console.error('Gagal mengirim absen:', error);
      alert('Terjadi kesalahan saat mengirim data absen. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

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
            Kirim kehadiran malam Anda
          </p>
        </div>
      </div>

      {success ? (
        // Success View (Duolingo style)
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
          marginTop: '2rem',
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
      ) : (
        // Form View
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
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: isDark ? '#FFFFFF' : '#1F2937' }}>
              📍 Informasi Lokasi
            </h3>

            {locating && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                gap: '12px'
              }}>
                <RefreshCw size={32} className="spin" style={{ color: '#F97316', animation: 'spin 1.5s linear infinite' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
                  Mendeteksi lokasi & koordinat...
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
                      cursor: 'pointer'
                    }}
                  >
                    Coba Lagi
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
                    <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#E5E7EB' : '#4B5563', fontWeight: 600, lineHeight: 1.4 }}>
                      {address || 'Mengambil alamat...'}
                    </p>
                  </div>
                </div>

                {/* Google Maps Embed Preview Frame */}
                <div style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  height: '180px',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  position: 'relative'
                }}>
                  <iframe
                    title="Location Preview"
                    src={`https://maps.google.com/maps?q=${coords.lat},${coords.lon}&z=16&output=embed`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                  ></iframe>
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
