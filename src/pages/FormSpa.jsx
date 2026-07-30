import { useState, useEffect } from 'react';
import { auth, db, storage } from '../firebase';
import { collection, query, where, getDocs, doc, addDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  CheckCircle,
  Calendar,
  CreditCard,
  Image as ImageIcon,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

const FormSpa = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { addNotification } = useNotification();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');

  // Form State
  const [bulan, setBulan] = useState('Januari');
  const [tahun, setTahun] = useState(() => new Date().getFullYear());
  const [statusBayar, setStatusBayar] = useState('lunas'); // lunas or nyicil
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Indonesian Months
  const indonesianMonths = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Fetch current username for storage filename
  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const uDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (uDoc.exists()) {
          setUsername(uDoc.data().username || auth.currentUser.uid);
        } else {
          setUsername(auth.currentUser.uid);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setUsername(auth.currentUser.uid);
      }
    };
    fetchProfile();
  }, []);

  const handleFileSelect = (e) => {
    setErrorMsg('');
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.type.startsWith('image/')) {
        setErrorMsg('Hanya file gambar/foto yang diperbolehkan.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadProgress(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!file) {
      setErrorMsg("Harap unggah bukti pembayaran (foto/gambar receipt).");
      return;
    }

    setLoading(true);

    try {
      // 1. Find a user whose jabatan is "bendahara" (case-insensitive)
      let bendaharaRef = null;
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('jabatan', '==', 'bendahara'));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          bendaharaRef = doc(db, 'users', qSnap.docs[0].id);
        } else {
          // Fallback case-insensitive check by fetching all users
          const allUsersSnap = await getDocs(usersRef);
          let foundId = '';
          allUsersSnap.forEach(d => {
            const data = d.data();
            if (data.jabatan && data.jabatan.toLowerCase() === 'bendahara') {
              foundId = d.id;
            }
          });
          if (foundId) {
            bendaharaRef = doc(db, 'users', foundId);
          } else {
            // Default reference to current user if no Bendahara in DB yet
            bendaharaRef = doc(db, 'users', auth.currentUser.uid);
          }
        }
      } catch (err) {
        console.error("Failed to query bendahara, using current user as fallback:", err);
        bendaharaRef = doc(db, 'users', auth.currentUser.uid);
      }

      // 2. Upload file to Firebase Storage: AsramaApp/buktispa/${username}_${bulan}_${tahun}_${Date.now()}.${ext}
      const extension = file.name.split('.').pop();
      const cleanBulan = bulan.trim().replace(/\s+/g, '-');
      const customFileName = `${username}_${cleanBulan}_${tahun}_${Date.now()}.${extension}`;
      
      const fileRef = ref(storage, `AsramaApp/buktispa/${customFileName}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      let downloadUrl = '';
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
          },
          (error) => reject(error),
          async () => {
            downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve();
          }
        );
      });

      // 3. Save submission to collection 'Spa'
      const submissionData = {
        bulan: bulan,
        tahun: tahun,
        bukti: downloadUrl,
        verification: false,
        author: doc(db, 'users', auth.currentUser.uid),
        statusBayar: statusBayar,
        timestamp: new Date(),
        tipe: "form",
        userWhoReport: bendaharaRef
      };

      await addDoc(collection(db, 'Spa'), submissionData);

      addNotification({
        title: "Pembayaran SPA Terkirim",
        body: "Bukti pembayaran SPA Anda berhasil dikirim. Menunggu verifikasi Bendahara...",
        type: "spa_submission"
      });

      alert("Bukti pembayaran SPA berhasil dikirim dan menunggu verifikasi Bendahara!");
      navigate('/spa');
    } catch (error) {
      console.error("Error submitting SPA payment form:", error);
      setErrorMsg("Terjadi kesalahan saat mengirim bukti. Silakan coba lagi.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark ? '#1E130C' : '#FFF9F5',
      fontFamily: '"Nunito", "Inter", sans-serif',
      padding: '24px 16px 80px 16px',
      maxWidth: '480px',
      margin: '0 auto',
      boxShadow: '0 0 20px rgba(0,0,0,0.05)',
      transition: 'background-color 0.3s ease'
    }}>
      
      {/* Kembali button */}
      <button 
        onClick={() => navigate('/spa')} 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: isDark ? '#F97316' : '#4B5563',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          background: isDark ? '#2D1D13' : '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '20px',
          boxShadow: `0 4px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          fontWeight: 800,
          cursor: 'pointer',
          marginBottom: '24px',
          transition: 'all 0.1s',
          fontSize: '0.9rem',
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
        <ArrowLeft size={18} strokeWidth={3} />
        <span>Kembali</span>
      </button>

      {/* Form Header */}
      <div style={{
        backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
        borderRadius: '28px',
        padding: '32px 24px',
        border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
        borderTop: '10px solid #F97316', // Orange pekat top bar ala Google Forms but Premium
        boxShadow: `0 8px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}, 0 15px 20px rgba(251, 146, 60, 0.05)`,
        marginBottom: '24px',
        transition: 'all 0.3s ease'
      }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: isDark ? '#FFFFFF' : '#1C1C1E', margin: '0 0 8px 0' }}>
          Form Pembayaran SPA
        </h1>
        <p style={{ color: isDark ? '#FED7AA' : '#6B7280', margin: 0, fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.5 }}>
          Harap isi form ini setelah melakukan transfer / scan QRIS. Bukti pembayaran akan langsung dikirim ke Bendahara untuk diverifikasi.
        </p>
      </div>

      {errorMsg && (
        <div style={{
          backgroundColor: isDark ? '#3C1C1C' : '#FEE2E2',
          border: `2px solid ${isDark ? '#7F1D1D' : '#FCA5A5'}`,
          borderRadius: '20px',
          padding: '14px 18px',
          color: '#DC2626',
          fontSize: '0.9rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          boxShadow: `0 4px 0 ${isDark ? '#7F1D1D' : '#FCA5A5'}`,
          transition: 'all 0.3s ease'
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Month Selector (Custom premium Grid Picker) */}
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: `0 8px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}, 0 15px 20px rgba(251, 146, 60, 0.05)`,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#F97316' }}>
            <Calendar size={20} strokeWidth={2.5} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Pilih Bulan Pembayaran</h3>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px'
          }}>
            {indonesianMonths.map((m) => {
              const isSelected = bulan === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBulan(m)}
                  style={{
                    backgroundColor: isSelected ? '#F97316' : (isDark ? '#1E130C' : '#FFFFFF'),
                    color: isSelected ? '#FFFFFF' : (isDark ? '#FED7AA' : '#374151'),
                    border: `2px solid ${isSelected ? '#EA580C' : (isDark ? '#4A2E1E' : '#E5E7EB')}`,
                    borderRadius: '16px',
                    padding: '10px 4px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: `0 3px 0 ${isSelected ? '#EA580C' : (isDark ? '#4A2E1E' : '#E5E7EB')}`,
                    transition: 'all 0.1s',
                    outline: 'none',
                    textAlign: 'center'
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'translateY(2px)';
                    e.currentTarget.style.boxShadow = `0 1px 0 ${isSelected ? '#EA580C' : (isDark ? '#4A2E1E' : '#E5E7EB')}`;
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = `0 3px 0 ${isSelected ? '#EA580C' : (isDark ? '#4A2E1E' : '#E5E7EB')}`;
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Year Selector */}
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: `0 8px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}, 0 15px 20px rgba(251, 146, 60, 0.05)`,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#F97316' }}>
            <Calendar size={20} strokeWidth={2.5} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Tahun Pembayaran</h3>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setTahun(prev => prev - 1)}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                border: `2px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                color: isDark ? '#FED7AA' : '#374151',
                fontSize: '1.25rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: `0 3px 0 ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none',
                transition: 'all 0.1s'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)';
                e.currentTarget.style.boxShadow = `0 1px 0 ${isDark ? '#4A2E1E' : '#E5E7EB'}`;
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = `0 3px 0 ${isDark ? '#4A2E1E' : '#E5E7EB'}`;
              }}
            >
              −
            </button>

            <div style={{
              flex: 1,
              textAlign: 'center',
              padding: '12px',
              borderRadius: '16px',
              backgroundColor: '#F97316',
              color: '#FFFFFF',
              fontSize: '1.3rem',
              fontWeight: 900,
              border: '2px solid #EA580C',
              boxShadow: '0 3px 0 #EA580C',
              letterSpacing: '0.05em'
            }}>
              {tahun}
            </div>

            <button
              type="button"
              onClick={() => setTahun(prev => prev + 1)}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                border: `2px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
                color: isDark ? '#FED7AA' : '#374151',
                fontSize: '1.25rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: `0 3px 0 ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none',
                transition: 'all 0.1s'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)';
                e.currentTarget.style.boxShadow = `0 1px 0 ${isDark ? '#4A2E1E' : '#E5E7EB'}`;
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = `0 3px 0 ${isDark ? '#4A2E1E' : '#E5E7EB'}`;
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Status Bayar Selector (Pill Toggle) */}
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: `0 8px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}, 0 15px 20px rgba(251, 146, 60, 0.05)`,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#F97316' }}>
            <DollarSign size={20} strokeWidth={2.5} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Status Pembayaran</h3>
          </div>

          <div style={{
            display: 'flex',
            backgroundColor: isDark ? '#1E130C' : '#F3F4F6',
            padding: '4px',
            borderRadius: '18px',
            border: `2.5px solid ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
            gap: '4px',
            transition: 'all 0.3s ease'
          }}>
            {['nyicil', 'lunas'].map((option) => {
              const isSelected = statusBayar === option;
              const displayText = option === 'lunas' ? 'Lunas' : 'Cicil / Nyicil';
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatusBayar(option)}
                  style={{
                    flex: 1,
                    backgroundColor: isSelected ? (isDark ? '#2D1D13' : '#FFFFFF') : 'transparent',
                    color: isSelected ? '#F97316' : (isDark ? '#9CA3AF' : '#6B7280'),
                    border: 'none',
                    borderRadius: '14px',
                    padding: '12px 0',
                    fontSize: '0.95rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: isSelected ? (isDark ? '0 3px 0 #1E130C' : '0 3px 0 #D1D5DB') : 'none',
                    transition: 'all 0.2s',
                    outline: 'none',
                    textTransform: 'capitalize'
                  }}
                >
                  {displayText}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload Bukti Card */}
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '28px',
          padding: '24px',
          border: `2px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`,
          boxShadow: `0 8px 0 ${isDark ? '#4A2E1E' : '#FFEDD5'}, 0 15px 20px rgba(251, 146, 60, 0.05)`,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#F97316' }}>
            <ImageIcon size={20} strokeWidth={2.5} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Bukti Pembayaran *</h3>
          </div>
          <p style={{ color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 700, margin: '0 0 16px 0' }}>
            Unggah 1 foto struk transfer / bukti transaksi yang sah.
          </p>

          {!file ? (
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              border: `3px dashed ${isDark ? '#4A2E1E' : '#E5E7EB'}`,
              borderRadius: '24px',
              backgroundColor: isDark ? '#1E130C' : '#FAFAFA',
              cursor: 'pointer',
              transition: 'all 0.2s',
              gap: '10px'
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#F97316'}
              onMouseLeave={e => e.currentTarget.style.borderColor = isDark ? '#4A2E1E' : '#E5E7EB'}
            >
              <Upload size={32} color="#9CA3AF" strokeWidth={2.5} />
              <span style={{ fontWeight: 800, color: isDark ? '#FED7AA' : '#4B5563', fontSize: '0.9rem' }}>Pilih File Foto</span>
              <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 700 }}>Mendukung format PNG, JPG, JPEG</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px',
              border: '2px solid #10B981',
              borderRadius: '20px',
              backgroundColor: isDark ? '#1C3D27' : '#ECFDF5'
            }}>
              <img 
                src={URL.createObjectURL(file)} 
                alt="receipt-preview" 
                style={{
                  width: '64px',
                  height: '64px',
                  objectFit: 'cover',
                  borderRadius: '12px',
                  border: '2px solid #10B981'
                }}
              />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: isDark ? '#10B981' : '#065F46', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', fontWeight: 700, color: isDark ? '#86EFAC' : '#047857' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                style={{
                  color: '#DC2626',
                  background: 'none',
                  border: 'none',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  padding: '8px'
                }}
              >
                Hapus
              </button>
            </div>
          )}

          {loading && uploadProgress > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, color: '#F97316', marginBottom: '6px' }}>
                <span>Mengunggah Foto Struk</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: isDark ? '#3D291C' : '#FFF7ED', borderRadius: '4px', border: `1.5px solid ${isDark ? '#4A2E1E' : '#FFEDD5'}`, overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: '#F97316', transition: 'width 0.15s ease' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: loading ? '#FDBA74' : '#F97316',
            color: '#FFFFFF',
            border: `2px solid ${loading ? '#FED7AA' : '#EA580C'}`,
            borderRadius: '24px',
            padding: '16px',
            fontSize: '1.1rem',
            fontWeight: 900,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: `0 6px 0 ${loading ? '#FED7AA' : '#EA580C'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.1s',
            outline: 'none',
            marginTop: '10px'
          }}
          onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'translateY(4px)', e.currentTarget.style.boxShadow = '0 2px 0 #EA580C')}
          onMouseUp={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0px)', e.currentTarget.style.boxShadow = '0 6px 0 #EA580C')}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0px)', e.currentTarget.style.boxShadow = '0 6px 0 #EA580C')}
        >
          {loading ? 'Sedang Mengirim...' : 'Kirim Bukti Pembayaran'}
        </button>

      </form>
    </div>
  );
};

export default FormSpa;
