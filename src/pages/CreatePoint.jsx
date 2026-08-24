import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Sparkles, Lock, Tag, Layers, Target, Shield, FileText, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const CreatePoint = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState('');

  // Form State
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('BERAT');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('pengurangan'); // pengurangan or penambahan
  const [pointValue, setPointValue] = useState('');
  const [target, setTarget] = useState('Seluruh penghuni');
  const [pic, setPic] = useState('');

  const quickCategories = ['BERAT', 'SEDANG', 'RINGAN', 'PRESTASI', 'DISIPLIN', 'KEBERSIHAN'];

  useEffect(() => {
    const checkAuth = async () => {
      if (!auth.currentUser) {
        setIsAuthorized(true);
        setUserRole('kepenghunian');
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const role = (data.jabatan || '').toLowerCase();
          setUserRole(role);
          if (role === 'kepenghunian' || role === 'proteksi') {
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
          }
        } else {
          setIsAuthorized(true);
          setUserRole('kepenghunian');
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        setIsAuthorized(true);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!code.trim()) {
      alert("Harap masukkan Kode Poin (Contoh: B-01, S-02, P-01).");
      return;
    }
    if (!category.trim()) {
      alert("Harap tentukan Kategori Poin (Contoh: BERAT, SEDANG, PRESTASI).");
      return;
    }
    if (!name.trim()) {
      alert("Harap masukkan Nama Kategori / Pelanggaran Poin.");
      return;
    }
    if (!desc.trim()) {
      alert("Harap masukkan Deskripsi Poin.");
      return;
    }
    if (!pointValue || isNaN(pointValue)) {
      alert("Harap masukkan nilai poin yang valid (angka).");
      return;
    }
    if (!target.trim()) {
      alert("Harap masukkan Target poin.");
      return;
    }

    const numericPoint = Math.abs(parseInt(pointValue));
    if (numericPoint === 0) {
      alert("Nilai poin harus lebih besar dari 0.");
      return;
    }

    setSubmitting(true);

    try {
      // Tipe: pengurangan = negatif, penambahan = positif
      const finalPointValue = type === 'pengurangan' ? -numericPoint : numericPoint;
      const userUid = auth.currentUser ? auth.currentUser.uid : 'mock-user-id';

      const pointData = {
        code: code.trim().toUpperCase(),
        category: category.trim().toUpperCase(),
        name: name.trim(),
        desc: desc.trim(),
        point: finalPointValue,
        type: type,
        target: target.trim(),
        ...(type === 'penambahan' && pic.trim() ? { pic: pic.trim() } : {}),
        timestamp: new Date().toISOString(),
        whoCreate: doc(db, 'users', userUid),
      };

      await addDoc(collection(db, 'systemPoint'), pointData);

      alert(`Ketentuan Poin [${pointData.code}] berhasil dibuat!`);
      navigate('/see-points');
    } catch (error) {
      console.error("Error creating system point:", error);
      alert("Gagal membuat ketentuan poin. Silakan coba lagi.");
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
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
          <span>Memeriksa Otoritas...</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div style={{
        background: isDark ? '#1E130C' : '#FFF9F5',
        minHeight: '100vh',
        fontFamily: '"Nunito", "Inter", sans-serif',
        transition: 'background-color 0.3s ease',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem 1.5rem'
      }}>
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '40px 24px',
          border: '2px solid #FCA5A5',
          boxShadow: '0 8px 0 #FCA5A5',
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
            border: '3px solid #FCA5A5',
            boxShadow: '0 4px 0 #FCA5A5'
          }}>
            <Lock size={36} strokeWidth={2.5} />
          </div>
          
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1F2937', margin: '0 0 12px 0' }}>
            Akses Ditolak
          </h1>
          <p style={{ color: isDark ? '#D1D5DB' : '#6B7280', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5, margin: '0 0 32px 0' }}>
            Halaman ini khusus untuk Staff **Kepenghunian** dan **Proteksi**. Jabatan Anda saat ini adalah: **{userRole || 'Umum'}**.
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
          >
            Kembali ke Home
          </button>
        </div>
      </div>
    );
  }

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
      padding: '2rem 1.5rem 100px 1.5rem',
      position: 'relative',
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
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#10B981',
            margin: 0
          }}>
            Buat Ketentuan Poin
          </h1>
          <p style={{ color: isDark ? '#86EFAC' : '#059669', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
            Tambahkan aturan kode & poin baru
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Info Box */}
        <div style={{
          backgroundColor: isDark ? '#1C3D27' : '#ECFDF5',
          border: `2px solid ${isDark ? '#065F46' : '#A7F3D0'}`,
          borderRadius: '20px',
          padding: '16px 20px',
          display: 'flex',
          gap: '12px',
          boxShadow: `0 4px 0 ${isDark ? '#065F46' : '#A7F3D0'}`,
          transition: 'all 0.3s ease'
        }}>
          <Sparkles size={22} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff Menu</span>
            <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#86EFAC' : '#065F46', fontWeight: 600, lineHeight: 1.4 }}>
              Setiap ketentuan wajib memiliki <strong>Kode Poin</strong> (misal B-01) dan <strong>Kategori</strong> agar tersinkronisasi rapi pada proses Penghakiman.
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
          gap: '18px',
          transition: 'all 0.3s ease'
        }}>
          
          {/* Kode Poin & Kategori Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '14px' }}>
            {/* Kode Poin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={15} color="#F97316" />
                <span>Kode Poin *</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Misal: B-01"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '16px',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  fontSize: '1rem',
                  outline: 'none',
                  fontFamily: '"Nunito", "Inter", sans-serif',
                  boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                  color: '#F97316',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease'
                }}
              />
            </div>

            {/* Kategori */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Layers size={15} color="#3B82F6" />
                <span>Kategori *</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value.toUpperCase())}
                placeholder="Misal: BERAT"
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
                  color: isDark ? '#E5E7EB' : '#1F2937',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease'
                }}
              />
            </div>
          </div>

          {/* Quick Category Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '-6px' }}>
            {quickCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '10px',
                  border: category === cat ? '2px solid #F97316' : `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: category === cat ? (isDark ? '#3D291C' : '#FFF7ED') : (isDark ? '#1E130C' : '#FFFFFF'),
                  color: category === cat ? '#F97316' : (isDark ? '#9CA3AF' : '#6B7280'),
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Nama Poin */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={15} color="#10B981" />
              <span>Nama Jenis Poin / Judul *</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Merokok di lingkungan asrama"
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
                fontWeight: 700,
                color: isDark ? '#E5E7EB' : '#1F2937',
                boxSizing: 'border-box',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          {/* Tipe Poin */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
              Tipe Pengaruh Poin
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setType('pengurangan')}
                style={{
                  padding: '12px',
                  borderRadius: '16px',
                  border: type === 'pengurangan' ? '3px solid #EF4444' : `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: type === 'pengurangan' ? (isDark ? '#3C1C1C' : '#FEF2F2') : (isDark ? '#1E130C' : '#FFFFFF'),
                  color: type === 'pengurangan' ? '#EF4444' : (isDark ? '#9CA3AF' : '#6B7280'),
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: type === 'pengurangan' ? `0 4px 0 ${isDark ? '#7F1D1D' : '#FCA5A5'}` : `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  outline: 'none'
                }}
              >
                🔴 Pengurangan (-)
              </button>
              <button
                type="button"
                onClick={() => setType('penambahan')}
                style={{
                  padding: '12px',
                  borderRadius: '16px',
                  border: type === 'penambahan' ? '3px solid #10B981' : `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: type === 'penambahan' ? (isDark ? '#1C3D27' : '#F0FDF4') : (isDark ? '#1E130C' : '#FFFFFF'),
                  color: type === 'penambahan' ? '#10B981' : (isDark ? '#9CA3AF' : '#6B7280'),
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: type === 'penambahan' ? `0 4px 0 ${isDark ? '#065F46' : '#86EFAC'}` : `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  outline: 'none'
                }}
              >
                🟢 Penambahan (+)
              </button>
            </div>
          </div>

          {/* Nilai Poin */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
              Besaran Nilai Poin *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '1.2rem',
                fontWeight: 900,
                color: type === 'pengurangan' ? '#EF4444' : '#10B981'
              }}>
                {type === 'pengurangan' ? '-' : '+'}
              </span>
              <input
                type="number"
                pattern="[0-9]*"
                inputMode="numeric"
                value={pointValue}
                onChange={(e) => setPointValue(e.target.value)}
                placeholder="Contoh: 50"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 36px',
                  borderRadius: '16px',
                  border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  fontSize: '1.1rem',
                  outline: 'none',
                  fontFamily: '"Nunito", "Inter", sans-serif',
                  boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
                  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                  fontWeight: 800,
                  color: type === 'pengurangan' ? '#EF4444' : '#10B981',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease'
                }}
              />
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>
              Masukkan nilai numerik positif. Tanda minus (-) akan disimpan otomatis jika tipe Pengurangan dipilih.
            </p>
          </div>

          {/* Target */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Target size={15} color="#EF4444" />
              <span>Target Berlakunya Poin *</span>
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Contoh: Seluruh penghuni, Kamar Tertentu, dll."
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
                boxSizing: 'border-box',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

          {/* PIC - opsional untuk penambahan */}
          {type === 'penambahan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={15} color="#10B981" />
                <span>PIC (Penanggung Jawab Penambahan)</span>
              </label>
              <input
                type="text"
                value={pic}
                onChange={(e) => setPic(e.target.value)}
                placeholder="Contoh: Pembina Asrama, Staff Kepenghunian..."
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '16px',
                  border: `2px solid ${isDark ? '#065F46' : '#86EFAC'}`,
                  fontSize: '0.95rem',
                  outline: 'none',
                  fontFamily: '"Nunito", "Inter", sans-serif',
                  boxShadow: `0 4px 0 ${isDark ? '#065F46' : '#86EFAC'}`,
                  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                  fontWeight: 650,
                  color: isDark ? '#E5E7EB' : '#1F2937',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease'
                }}
              />
            </div>
          )}

          {/* Deskripsi Detail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
              Deskripsi Lengkap *
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Jelaskan secara detail bunyi pasal/aturan, kriteria pelanggaran atau prestasi..."
              rows={4}
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
                boxSizing: 'border-box',
                transition: 'all 0.3s ease'
              }}
            />
          </div>

        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: submitting ? '#A7F3D0' : '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            fontSize: '1.05rem',
            fontWeight: 800,
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: submitting ? 'none' : '0 6px 0 #059669',
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
              e.currentTarget.style.boxShadow = '0 0px 0 #059669';
            }
          }}
          onMouseUp={(e) => {
            if (!submitting) {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 6px 0 #059669';
            }
          }}
        >
          <PlusCircle size={20} strokeWidth={2.5} />
          <span>{submitting ? 'Menyimpan...' : 'Simpan Ketentuan Poin'}</span>
        </button>
      </form>

    </div>
    </div>
  );
};

export default CreatePoint;
