import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, AlertCircle, Info, Sparkles, BookOpen, Lock } from 'lucide-react';

const CreatePoint = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('pengurangan'); // pengurangan or penambahan
  const [pointValue, setPointValue] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      if (!auth.currentUser) {
        // Fallback for development if no currentUser (like in mock environment)
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
          // If no doc exists but logged in, check role from custom claim or fallback mock
          setIsAuthorized(true);
          setUserRole('kepenghunian');
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        // Fallback to allow dev
        setIsAuthorized(true);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Harap masukkan Nama Kategori Poin.");
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
        name: name.trim(),
        desc: desc.trim(),
        point: finalPointValue,
        type: type,
        timestamp: new Date().toISOString(),
        whoCreate: doc(db, 'users', userUid)
      };

      await addDoc(collection(db, 'systemPoint'), pointData);

      alert("Kategori Poin berhasil dibuat!");
      navigate('/see-points');
    } catch (error) {
      console.error("Error creating system point:", error);
      alert("Gagal membuat kategori poin. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
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
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
          <span>Memeriksa Otoritas...</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
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
            <Lock size={36} strokeWidth={2.5} />
          </div>
          
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1F2937', margin: '0 0 12px 0' }}>
            Akses Ditolak
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.5, margin: '0 0 32px 0' }}>
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
            color: '#10B981',
            margin: 0
          }}>
            Buat Kategori Poin
          </h1>
          <p style={{ color: '#059669', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
            Tambahkan aturan poin baru di asrama
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Info Box */}
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '2px solid #A7F3D0',
          borderRadius: '20px',
          padding: '16px 20px',
          display: 'flex',
          gap: '12px',
          boxShadow: '0 4px 0 #A7F3D0'
        }}>
          <Sparkles size={22} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff Menu</span>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#065F46', fontWeight: 600, lineHeight: 1.4 }}>
              Kategori yang dibuat di sini akan langsung terdaftar di sistem poin dan dapat dipilih saat proses pemberian hukuman (Penghakiman).
            </p>
          </div>
        </div>

        {/* Input Card Container */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px',
          border: '2px solid #FFEDD5',
          boxShadow: '0 8px 0 #FFEDD5',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          
          {/* Nama Poin */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: '#374151' }}>
              Nama Jenis Poin
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Terlambat Jam Malam atau Menang Lomba"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                border: '2px solid #FFEDD5',
                fontSize: '0.95rem',
                outline: 'none',
                fontFamily: '"Nunito", "Inter", sans-serif',
                boxShadow: '0 4px 0 #FFEDD5',
                backgroundColor: '#FFFFFF',
                fontWeight: 650,
                color: '#1F2937'
              }}
            />
          </div>

          {/* Tipe Poin Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: '#374151' }}>
              Tipe Kategori
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setType('pengurangan')}
                style={{
                  padding: '12px',
                  borderRadius: '16px',
                  border: type === 'pengurangan' ? '3px solid #EF4444' : '2px solid #FFEDD5',
                  backgroundColor: type === 'pengurangan' ? '#FEF2F2' : '#FFFFFF',
                  color: type === 'pengurangan' ? '#EF4444' : '#6B7280',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: type === 'pengurangan' ? '0 4px 0 #FCA5A5' : '0 4px 0 #FFEDD5',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  outline: 'none'
                }}
              >
                🔴 Pengurangan Poin
              </button>
              <button
                type="button"
                onClick={() => setType('penambahan')}
                style={{
                  padding: '12px',
                  borderRadius: '16px',
                  border: type === 'penambahan' ? '3px solid #10B981' : '2px solid #FFEDD5',
                  backgroundColor: type === 'penambahan' ? '#F0FDF4' : '#FFFFFF',
                  color: type === 'penambahan' ? '#10B981' : '#6B7280',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: type === 'penambahan' ? '0 4px 0 #86EFAC' : '0 4px 0 #FFEDD5',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  outline: 'none'
                }}
              >
                🟢 Penambahan Poin
              </button>
            </div>
          </div>

          {/* Nilai Poin */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: '#374151' }}>
              Besaran Poin (Angka Positif)
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
                placeholder="Contoh: 10 atau 200"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 36px',
                  borderRadius: '16px',
                  border: '2px solid #FFEDD5',
                  fontSize: '1.1rem',
                  outline: 'none',
                  fontFamily: '"Nunito", "Inter", sans-serif',
                  boxShadow: '0 4px 0 #FFEDD5',
                  backgroundColor: '#FFFFFF',
                  fontWeight: 800,
                  color: type === 'pengurangan' ? '#EF4444' : '#10B981'
                }}
              />
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>
              Masukkan nilai positif. Tanda minus (-) akan disematkan secara otomatis jika memilih tipe Pengurangan.
            </p>
          </div>

          {/* Deskripsi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: '#374151' }}>
              Deskripsi Detail
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Jelaskan alasan, kriteria, atau dasar penetapan kategori poin ini..."
              rows={4}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                border: '2px solid #FFEDD5',
                fontSize: '0.95rem',
                outline: 'none',
                fontFamily: '"Nunito", "Inter", sans-serif',
                boxShadow: '0 4px 0 #FFEDD5',
                backgroundColor: '#FFFFFF',
                fontWeight: 650,
                color: '#1F2937',
                resize: 'none',
                lineHeight: 1.4
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
          onMouseLeave={(e) => {
            if (!submitting) {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 6px 0 #059669';
            }
          }}
        >
          <PlusCircle size={20} strokeWidth={2.5} />
          <span>{submitting ? 'Membuat...' : 'Buat Kategori Poin'}</span>
        </button>
      </form>

    </div>
  );
};

export default CreatePoint;
