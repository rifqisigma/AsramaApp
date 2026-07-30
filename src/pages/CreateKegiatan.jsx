import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, PlusCircle, Calendar, Clock, BookOpen, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

const CreateKegiatan = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { addNotification } = useNotification();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState(null);

  // Form State
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [waktuMulai, setWaktuMulai] = useState(() => {
    const now = new Date();
    // Default 1 hour from now, formatted to local ISO format for datetime-local input
    const future = new Date(now.getTime() + 60 * 60 * 1000);
    return new Date(future.getTime() - future.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  // waktuSelesaiOption: 'datetime' or 'selesai'
  const [waktuSelesaiOption, setWaktuSelesaiOption] = useState('selesai');
  const [waktuSelesaiValue, setWaktuSelesaiValue] = useState(() => {
    const now = new Date();
    // Default 2 hours from now
    const future = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return new Date(future.getTime() - future.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  useEffect(() => {
    const fetchUser = async () => {
      if (!auth.currentUser) {
        // Fallback mock
        setUserData({
          username: 'rifqi',
          jabatan: 'Kepenghunian',
          angkatan: 62
        });
        setLoading(false);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          setUserData({
            username: auth.currentUser.email.split('@')[0],
            jabatan: 'Umum',
            angkatan: 62
          });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!judul.trim()) {
      alert("Harap masukkan Judul Kegiatan.");
      return;
    }
    if (!deskripsi.trim()) {
      alert("Harap masukkan Deskripsi Kegiatan.");
      return;
    }
    if (!waktuMulai) {
      alert("Harap masukkan Waktu Mulai.");
      return;
    }

    setSubmitting(true);

    try {
      const userUid = auth.currentUser ? auth.currentUser.uid : 'mock-user-id';

      // Formatting waktuMulai to ISO String
      const isoWaktuMulai = new Date(waktuMulai).toISOString();

      // Handling waktuSelesai
      let finalWaktuSelesai = 'selesai';
      if (waktuSelesaiOption === 'datetime') {
        if (!waktuSelesaiValue) {
          alert("Harap masukkan Waktu Selesai.");
          setSubmitting(false);
          return;
        }
        // Verify waktuSelesai is after waktuMulai
        if (new Date(waktuSelesaiValue) <= new Date(waktuMulai)) {
          alert("Waktu Selesai harus setelah Waktu Mulai.");
          setSubmitting(false);
          return;
        }
        finalWaktuSelesai = new Date(waktuSelesaiValue).toISOString();
      }

      const kegiatanData = {
        judul: judul.trim(),
        deskripsi: deskripsi.trim(),
        waktuMulai: isoWaktuMulai,
        waktuSelesai: finalWaktuSelesai,
        author: doc(db, 'users', userUid),
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, 'kegiatan'), kegiatanData);

      addNotification({
        title: "Kegiatan Berhasil Dibuat",
        body: `"${judul}" telah dipublikasikan ke seluruh warga asrama.`,
        type: "kegiatan_creation"
      });

      alert("Kegiatan asrama berhasil dibuat!");
      navigate('/home');
    } catch (error) {
      console.error("Error creating kegiatan:", error);
      alert("Gagal membuat kegiatan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        background: isDark ? '#1E130C' : '#FFF9F5',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#F97316',
        fontWeight: 800,
        fontFamily: '"Nunito", sans-serif',
        transition: 'background-color 0.3s ease'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px', animation: 'bounce 1s infinite' }}>📅</div>
          <span>Memuat Form Kegiatan...</span>
        </div>
      </div>
    );
  }

  // Guard: Only users with a jabatan (kementerian role) can create kegiatan
  if (!userData?.jabatan) {
    return (
      <div style={{
        background: isDark ? '#1E130C' : '#FFF9F5',
        minHeight: '100vh',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"Nunito", "Inter", sans-serif',
        maxWidth: '480px',
        margin: '0 auto',
        boxShadow: '0 0 20px rgba(0,0,0,0.05)',
        transition: 'background-color 0.3s ease'
      }}>
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '40px 24px',
          border: `2px solid ${isDark ? '#7F1D1D' : '#FCA5A5'}`,
          boxShadow: `0 8px 0 ${isDark ? '#7F1D1D' : '#FCA5A5'}`,
          textAlign: 'center',
          width: '100%',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: isDark ? '#3C1C1C' : '#FEF2F2',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            border: `3px solid ${isDark ? '#991B1B' : '#FCA5A5'}`,
            boxShadow: `0 4px 0 ${isDark ? '#991B1B' : '#FCA5A5'}`,
            fontSize: '2rem'
          }}>
            🚫
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937', margin: '0 0 12px 0' }}>
            Akses Ditolak
          </h1>
          <p style={{ color: isDark ? '#D1D5DB' : '#6B7280', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5, margin: '0 0 32px 0' }}>
            Hanya penghuni dengan jabatan kementerian yang dapat membuat kegiatan asrama.
          </p>

          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#F97316',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 0 #EA580C',
              transition: 'transform 0.1s, box-shadow 0.1s',
              outline: 'none'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(4px)';
              e.currentTarget.style.boxShadow = '0 0px 0 #EA580C';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 4px 0 #EA580C';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 4px 0 #EA580C';
            }}
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: isDark ? '#1E130C' : '#FFF9F5',
      minHeight: '100vh',
      padding: '2rem 1.5rem 100px 1.5rem',
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
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            borderRadius: '16px',
            padding: '10px',
            cursor: 'pointer',
            color: '#F97316',
            boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.1s, box-shadow 0.1s, background-color 0.3s',
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
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#F97316',
            margin: 0
          }}>
            Buat Kegiatan
          </h1>
          <p style={{ color: isDark ? '#FED7AA' : '#FB923C', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
            Publikasikan agenda kementerian asrama
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Info Box */}
        <div style={{
          backgroundColor: isDark ? '#3D291C' : '#FFF7ED',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          borderRadius: '20px',
          padding: '16px 20px',
          display: 'flex',
          gap: '12px',
          boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          transition: 'all 0.3s ease'
        }}>
          <Sparkles size={22} color="#F97316" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kementerian Info</span>
            <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#FED7AA' : '#7C2D12', fontWeight: 600, lineHeight: 1.4 }}>
              Sebagai <strong>{userData?.jabatan || 'Umum'}</strong>, Anda dapat membuat kegiatan baru yang langsung muncul di beranda seluruh warga asrama.
            </p>
          </div>
        </div>

        {/* Input Card Container */}
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '24px',
          padding: '24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: `0 8px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          transition: 'all 0.3s ease'
        }}>
          
          {/* Judul Kegiatan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
              Nama / Judul Kegiatan
            </label>
            <input
              type="text"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Olahraga Bulanan Minsoc"
              required
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                fontSize: '0.95rem',
                outline: 'none',
                fontFamily: '"Nunito", "Inter", sans-serif',
                boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                fontWeight: 650,
                color: isDark ? '#E5E7EB' : '#1F2937',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          {/* Deskripsi Kegiatan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
              Deskripsi Detail Kegiatan
            </label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Contoh: Latihan olahraga bersama (bulu tangkis, futsal) di lapangan asrama. Jangan lupa bawa perlengkapan masing-masing."
              rows={4}
              required
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                fontSize: '0.95rem',
                outline: 'none',
                fontFamily: '"Nunito", "Inter", sans-serif',
                boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                fontWeight: 650,
                color: isDark ? '#E5E7EB' : '#1F2937',
                resize: 'none',
                lineHeight: 1.4,
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          {/* Waktu Mulai */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} color="#F97316" /> Waktu Mulai
            </label>
            <input
              type="datetime-local"
              value={waktuMulai}
              onChange={(e) => setWaktuMulai(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                fontSize: '0.95rem',
                outline: 'none',
                fontFamily: '"Nunito", "Inter", sans-serif',
                boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                fontWeight: 800,
                color: '#F97316',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          {/* Waktu Selesai Toggle Option */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: `2px dashed ${isDark ? '#4A2E1E' : '#FFEDD5'}`, paddingTop: '16px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
              Waktu Selesai
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setWaktuSelesaiOption('selesai')}
                style={{
                  padding: '12px 6px',
                  borderRadius: '16px',
                  border: waktuSelesaiOption === 'selesai' ? '3px solid #F97316' : `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: waktuSelesaiOption === 'selesai' ? (isDark ? '#3D291C' : '#FFF7ED') : (isDark ? '#1E130C' : '#FFFFFF'),
                  color: waktuSelesaiOption === 'selesai' ? '#F97316' : (isDark ? '#9CA3AF' : '#6B7280'),
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: waktuSelesaiOption === 'selesai' ? `0 4px 0 ${isDark ? '#4A2E1E' : '#FDBA74'}` : `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <span>⏳ Sampai Selesai</span>
              </button>
              <button
                type="button"
                onClick={() => setWaktuSelesaiOption('datetime')}
                style={{
                  padding: '12px 6px',
                  borderRadius: '16px',
                  border: waktuSelesaiOption === 'datetime' ? '3px solid #10B981' : `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: waktuSelesaiOption === 'datetime' ? (isDark ? '#1C3D27' : '#F0FDF4') : (isDark ? '#1E130C' : '#FFFFFF'),
                  color: waktuSelesaiOption === 'datetime' ? '#10B981' : (isDark ? '#9CA3AF' : '#6B7280'),
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: waktuSelesaiOption === 'datetime' ? `0 4px 0 ${isDark ? '#065F46' : '#86EFAC'}` : `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <span>📅 Atur Jam Selesai</span>
              </button>
            </div>

            {waktuSelesaiOption === 'datetime' ? (
              <div style={{ animation: 'fadeIn 0.2s ease-out forwards' }}>
                <input
                  type="datetime-local"
                  value={waktuSelesaiValue}
                  onChange={(e) => setWaktuSelesaiValue(e.target.value)}
                  required={waktuSelesaiOption === 'datetime'}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                    fontSize: '0.95rem',
                    outline: 'none',
                    fontFamily: '"Nunito", "Inter", sans-serif',
                    boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                    backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                    fontWeight: 800,
                    color: '#10B981',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>
            ) : (
              <div style={{
                padding: '12px 16px',
                borderRadius: '16px',
                backgroundColor: isDark ? '#3D291C' : '#FFFBEB',
                border: `1px solid ${isDark ? '#4A2E1E' : '#FEF3C7'}`,
                color: isDark ? '#FBBF24' : '#D97706',
                fontSize: '0.85rem',
                fontWeight: 650,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s ease'
              }}>
                <span style={{ fontSize: '1.1rem' }}>💡</span>
                <span>Waktu selesai akan ditandai secara fleksibel sebagai "selesai" di sistem asrama.</span>
              </div>
            )}
          </div>

        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: submitting ? '#FED7AA' : '#F97316',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            fontSize: '1.05rem',
            fontWeight: 800,
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: submitting ? 'none' : '0 6px 0 #D97706',
            transition: 'transform 0.1s, box-shadow 0.1s',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '8px'
          }}
          onMouseDown={(e) => {
            if (!submitting) {
              e.currentTarget.style.transform = 'translateY(6px)';
              e.currentTarget.style.boxShadow = '0 0px 0 #D97706';
            }
          }}
          onMouseUp={(e) => {
            if (!submitting) {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 6px 0 #D97706';
            }
          }}
          onMouseLeave={(e) => {
            if (!submitting) {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 6px 0 #D97706';
            }
          }}
        >
          <PlusCircle size={20} strokeWidth={2.5} />
          <span>{submitting ? 'Menyimpan...' : 'Publikasikan Kegiatan'}</span>
        </button>
      </form>

      {/* Style for slide animation */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    </div>
  );
};

export default CreateKegiatan;
