import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Clock, Info, ShieldAlert, BadgeCheck } from 'lucide-react';

const SeeKegiatan = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [kegiatan, setKegiatan] = useState(null);
  const [authorData, setAuthorData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchKegiatanDetails = async () => {
      if (!activityId) {
        setErrorMsg('ID Kegiatan tidak ditemukan.');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'kegiatan', activityId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setKegiatan(data);

          // Resolve author details
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
              const authorDocRef = doc(db, 'users', authorUid);
              const authorSnap = await getDoc(authorDocRef);
              if (authorSnap.exists()) {
                setAuthorData(authorSnap.data());
              } else {
                setAuthorData({
                  username: 'Pengguna Asrama',
                  jabatan: 'Kementerian Asrama',
                  angkatan: '?'
                });
              }
            }
          }
        } else {
          setErrorMsg('Kegiatan tidak ditemukan di database.');
        }
      } catch (error) {
        console.error("Error fetching kegiatan details:", error);
        setErrorMsg('Gagal mengambil data kegiatan.');
      } finally {
        setLoading(false);
      }
    };

    fetchKegiatanDetails();
  }, [activityId]);

  const formatFriendlyDate = (isoString) => {
    if (!isoString) return '-';
    if (isoString.toLowerCase() === 'selesai') return 'Selesai';
    
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;

      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';
    } catch (e) {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div style={{
        background: '#FFF9F5',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#F97316',
        fontWeight: 800,
        fontFamily: '"Nunito", sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>🌀</div>
          <span>Memuat detail kegiatan...</span>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (errorMsg || !kegiatan) {
    return (
      <div style={{
        background: '#FFF9F5',
        minHeight: '100vh',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"Nunito", "Inter", sans-serif',
        maxWidth: '480px',
        margin: '0 auto',
        boxShadow: '0 0 20px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '28px',
          padding: '40px 24px',
          border: '2px solid #FCA5A5',
          boxShadow: '0 8px 0 #FCA5A5',
          textAlign: 'center',
          width: '100%'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#FEF2F2',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            border: '3px solid #FCA5A5',
            boxShadow: '0 4px 0 #FCA5A5'
          }}>
            <ShieldAlert size={36} strokeWidth={2.5} />
          </div>
          
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1F2937', margin: '0 0 12px 0' }}>
            Kesalahan
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5, margin: '0 0 32px 0' }}>
            {errorMsg || 'Terjadi kesalahan yang tidak diketahui.'}
          </p>

          <button
            onClick={() => navigate('/home')}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 0 #DC2626',
              transition: 'transform 0.1s, box-shadow 0.1s',
              outline: 'none'
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
            Kembali ke Home
          </button>
        </div>
      </div>
    );
  }

  // Display details in the requested order:
  // 1. Author's users field `jabatan`
  // 2. Judul
  // 3. Waktu Mulai - Waktu Selesai
  // 4. Deskripsi
  // 5. Author's users field `username`
  // 6. Timestamp
  return (
    <div style={{
      background: '#FFF9F5',
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
        marginBottom: '2rem' 
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
            color: '#F97316',
            margin: 0
          }}>
            Detail Kegiatan
          </h1>
          <p style={{ color: '#FB923C', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
            Agenda dan rincian kementerian
          </p>
        </div>
      </div>

      {/* Detail Container Card */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '28px',
        padding: '28px 24px',
        border: '2px solid #FFEDD5',
        boxShadow: '0 8px 0 #FFEDD5, 0 10px 15px rgba(251, 146, 60, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>

        {/* 1. Author's user field JABATAN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            backgroundColor: '#FFF7ED',
            border: '2px solid #F97316',
            borderRadius: '20px',
            padding: '6px 16px',
            color: '#F97316',
            fontSize: '0.85rem',
            fontWeight: 900,
            boxShadow: '0 3px 0 #FFEDD5',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <BadgeCheck size={16} strokeWidth={3} />
            <span>{authorData?.jabatan || 'Kementerian Asrama'}</span>
          </div>
        </div>

        {/* 2. JUDUL */}
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '1.75rem',
            fontWeight: 900,
            color: '#1F2937',
            lineHeight: 1.25,
            fontFamily: '"Nunito", "Inter", sans-serif'
          }}>
            {kegiatan.judul}
          </h2>
        </div>

        {/* 3. WAKTU MULAI - WAKTU SELESAI */}
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '2px solid #BFDBFE',
          borderRadius: '20px',
          padding: '16px 20px',
          boxShadow: '0 4px 0 #BFDBFE',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            color: '#2563EB',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Clock size={14} strokeWidth={3} /> Jadwal Kegiatan
          </span>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 700 }}>MULAI:</span>
              <span style={{ fontSize: '0.95rem', color: '#1E3A8A', fontWeight: 800 }}>
                {formatFriendlyDate(kegiatan.waktuMulai)}
              </span>
            </div>

            <div style={{ borderTop: '1px dashed #BFDBFE', margin: '4px 0' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 700 }}>SELESAI:</span>
              <span style={{ fontSize: '0.95rem', color: kegiatan.waktuSelesai.toLowerCase() === 'selesai' ? '#047857' : '#1E3A8A', fontWeight: 800 }}>
                {kegiatan.waktuSelesai.toLowerCase() === 'selesai' ? '🕒 Sampai Selesai' : formatFriendlyDate(kegiatan.waktuSelesai)}
              </span>
            </div>
          </div>
        </div>

        {/* 4. DESKRIPSI */}
        <div style={{
          backgroundColor: '#F9FAFB',
          border: '2px solid #E5E7EB',
          borderRadius: '20px',
          padding: '20px',
          boxShadow: '0 4px 0 #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            color: '#4B5563',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Info size={14} strokeWidth={3} /> Deskripsi Lengkap
          </span>
          <p style={{
            margin: 0,
            fontSize: '0.95rem',
            color: '#374151',
            fontWeight: 650,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap'
          }}>
            {kegiatan.deskripsi}
          </p>
        </div>

        {/* 5 & 6. USERNAME & TIMESTAMP */}
        <div style={{
          borderTop: '2px dashed #E5E7EB',
          paddingTop: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Username */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              padding: '8px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={18} strokeWidth={2.5} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dipublikasikan Oleh</span>
              <span style={{ fontSize: '0.95rem', color: '#374151', fontWeight: 800 }}>
                @{authorData?.username || 'user'} <span style={{ color: '#9CA3AF', fontWeight: 600 }}>(Angkatan {authorData?.angkatan || '?'})</span>
              </span>
            </div>
          </div>

          {/* Timestamp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              backgroundColor: '#E5E7EB',
              color: '#4B5563',
              padding: '8px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={18} strokeWidth={2.5} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Waktu Rilis</span>
              <span style={{ fontSize: '0.9rem', color: '#4B5563', fontWeight: 700 }}>
                {formatFriendlyDate(kegiatan.timestamp)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Button to Home */}
      <button
        onClick={() => navigate('/home')}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: '#F97316',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          fontSize: '1rem',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 6px 0 #D97706',
          transition: 'transform 0.1s, box-shadow 0.1s',
          outline: 'none',
          marginTop: '24px'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(6px)';
          e.currentTarget.style.boxShadow = '0 0px 0 #D97706';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 6px 0 #D97706';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 6px 0 #D97706';
        }}
      >
        Kembali ke Beranda
      </button>

    </div>
  );
};

export default SeeKegiatan;
