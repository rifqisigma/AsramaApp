import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import { ArrowLeft, Send } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const MAX_CHARS = 35;

const CatatanPiket = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const reportId = state?.reportId || null;
  const reportDateRaw = state?.reportDate ? new Date(state.reportDate) : new Date();
  const formattedDate = reportDateRaw.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!catatan.trim()) {
      alert('Catatan tidak boleh kosong.');
      return;
    }
    if (catatan.trim().length > MAX_CHARS) {
      alert(`Catatan maksimal ${MAX_CHARS} karakter.`);
      return;
    }
    if (!reportId) {
      alert('Data laporan tidak ditemukan.');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
      const username = userSnap.exists() ? (userSnap.data().username || currentUser.email) : currentUser.email;

      // Ambil data piket untuk mendapatkan userPiket
      const piketRef = doc(db, 'piket', reportId);
      const piketSnap = await getDoc(piketRef);
      
      let userPiketId = null;
      if (piketSnap.exists()) {
        const piketData = piketSnap.data();
        if (piketData.userPiket) {
          userPiketId = typeof piketData.userPiket === 'string'
            ? piketData.userPiket
            : (piketData.userPiket.id || piketData.userPiket.path?.split('/').pop());
        }
      }

      // Simpan catatan ke Firestore
      await addDoc(collection(db, 'catatanPiket'), {
        reportId: reportId,
        catatan: catatan.trim(),
        createdBy: doc(db, 'users', currentUser.uid),
        createdAt: new Date(),
        reportDate: reportDateRaw,
        userPiket: userPiketId
      });

      // Hapus dokumen piket karena ditolak
      await deleteDoc(piketRef);

      setSent(true);
    } catch (err) {
      console.error('Gagal mengirim catatan:', err);
      alert('Terjadi kesalahan saat mengirim catatan.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: isDark ? '#1E130C' : '#F3F4F6',
        fontFamily: '"Nunito", "Inter", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '24px',
          padding: '48px 32px',
          textAlign: 'center',
          maxWidth: '380px',
          width: '100%',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: isDark ? '0 8px 0 #4A2E1E' : '0 8px 0 #FFEDD5'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>✅</div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '1.4rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937' }}>
            Catatan Terkirim!
          </h2>
          <p style={{ margin: '0 0 28px 0', fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280', lineHeight: 1.6 }}>
            Catatan gagal verifikasi telah dikirim sebagai notifikasi.
          </p>
          <button
            onClick={() => navigate('/tanda-tangan-piket')}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#F97316',
              color: 'white',
              border: '2px solid #EA580C',
              borderRadius: '16px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 0 #EA580C',
              transition: 'all 0.1s'
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = '0 2px 0 #EA580C'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 #EA580C'; }}
          >
            Kembali ke Daftar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#1E130C' : '#F3F4F6',
      fontFamily: '"Nunito", "Inter", sans-serif',
      padding: '24px 16px 80px 16px',
      transition: 'background-color 0.3s ease'
    }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: isDark ? '#F97316' : '#4B5563',
            background: isDark ? '#2D1D13' : 'white',
            border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
            padding: '8px 16px',
            borderRadius: '20px',
            boxShadow: isDark ? '0 2px 5px rgba(0,0,0,0.3)' : '0 2px 5px rgba(0,0,0,0.05)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            marginBottom: '24px',
            textDecoration: 'none',
            outline: 'none'
          }}
        >
          <ArrowLeft size={18} />
          Kembali
        </button>

        {/* Header Card */}
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '20px',
          padding: '28px 24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FEE2E2'}`,
          borderTop: '10px solid #EF4444',
          boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FEE2E2',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.6rem' }}>📝</span>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#EF4444' }}>
              Gagal Verifikasi Piket
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#FED7AA' : '#6B7280' }}>
            {formattedDate}
          </p>
        </div>

        {/* Catatan Input Card */}
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '20px',
          padding: '28px 24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: isDark ? '0 4px 0 #4A2E1E' : '0 4px 0 #FFEDD5'
        }}>
          <label style={{
            display: 'block',
            fontSize: '0.95rem',
            fontWeight: 800,
            color: isDark ? '#FED7AA' : '#374151',
            marginBottom: '12px'
          }}>
            Alasan / Catatan <span style={{ color: '#EF4444' }}>*</span>
          </label>

          <textarea
            value={catatan}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) setCatatan(e.target.value);
            }}
            placeholder="Tulis alasan singkat di sini..."
            rows={4}
            maxLength={MAX_CHARS}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              border: isDark ? `2px solid #4A2E1E` : `2px solid #E5E7EB`,
              fontSize: '1rem',
              fontFamily: '"Nunito", "Inter", sans-serif',
              fontWeight: 700,
              outline: 'none',
              boxSizing: 'border-box',
              backgroundColor: isDark ? '#1E130C' : '#F9FAFB',
              color: isDark ? '#FFFFFF' : '#1F2937',
              resize: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#EF4444'}
            onBlur={(e) => e.target.style.borderColor = isDark ? '#4A2E1E' : '#E5E7EB'}
          />

          {/* Character counter */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '6px',
            fontSize: '0.8rem',
            fontWeight: 800,
            color: catatan.length >= MAX_CHARS ? '#EF4444' : (isDark ? '#9CA3AF' : '#6B7280')
          }}>
            {catatan.length}/{MAX_CHARS}
          </div>

          <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem', fontWeight: 700, color: isDark ? '#9CA3AF' : '#9CA3AF', fontStyle: 'italic' }}>
            Catatan ini akan dikirim sebagai notifikasi ke pengirim laporan.
          </p>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={loading || !catatan.trim()}
            style={{
              width: '100%',
              marginTop: '20px',
              padding: '16px',
              backgroundColor: loading || !catatan.trim() ? '#FCA5A5' : '#EF4444',
              color: 'white',
              border: `2px solid ${loading || !catatan.trim() ? '#FCA5A5' : '#DC2626'}`,
              borderRadius: '16px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: loading || !catatan.trim() ? 'not-allowed' : 'pointer',
              boxShadow: loading || !catatan.trim() ? 'none' : '0 4px 0 #DC2626',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.1s'
            }}
            onMouseDown={(e) => {
              if (!loading && catatan.trim()) {
                e.currentTarget.style.transform = 'translateY(2px)';
                e.currentTarget.style.boxShadow = '0 2px 0 #DC2626';
              }
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 0 #DC2626';
            }}
          >
            <Send size={18} />
            {loading ? 'Mengirim...' : 'Kirim Catatan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CatatanPiket;
