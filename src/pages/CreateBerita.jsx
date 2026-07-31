import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Newspaper, ImagePlus, X, CheckCircle } from 'lucide-react';

const CreateBerita = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const fileInputRef = useRef(null);

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [kategori, setKategori] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!auth.currentUser) { navigate('/login'); return; }
      try {
        const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (!data.jabatan || data.jabatan.trim() === '') {
            alert('Akses ditolak. Hanya pengguna dengan jabatan yang dapat membuat berita.');
            navigate('/home');
            return;
          }
          setUserData(data);
        } else {
          navigate('/home');
        }
      } catch (err) {
        console.error(err);
        navigate('/home');
      }
    };
    fetchUser();
  }, [navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (jpg, png, webp, dll).');
      return;
    }
    // Validasi ukuran maks 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran gambar maksimal 5 MB.');
      return;
    }

    setError('');
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Judul tidak boleh kosong.'); return; }
    if (!kategori.trim()) { setError('Kategori tidak boleh kosong.'); return; }
    if (!deskripsi.trim()) { setError('Deskripsi tidak boleh kosong.'); return; }
    if (!imageFile) { setError('Gambar wajib diunggah.'); return; }

    setLoading(true);
    try {
      // Format tanggal WIB
      const now = new Date();
      const tanggalISO = new Date(now.getTime() + 7 * 60 * 60 * 1000)
        .toISOString()
        .replace('Z', '+07:00');

      // Buat nama file: namauser-judul-tanggal
      const username = userData?.username || 'user';
      const safeTitle = title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const safeDate = now.toISOString().split('T')[0]; // yyyy-mm-dd
      const ext = imageFile.name.split('.').pop();
      const fileName = `${username}-${safeTitle}-${safeDate}.${ext}`;

      // Upload gambar ke Firebase Storage
      const storageRef = ref(storage, `AsramaApp/berita/${fileName}`);
      await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(storageRef);

      // Simpan ke Firestore collection "berita"
      await addDoc(collection(db, 'berita'), {
        title: title.trim(),
        kategori: kategori.trim(),
        deskripsi: deskripsi.trim(),
        gambar: imageUrl,
        tanggal: tanggalISO,
        author: auth.currentUser.uid,
        authorUsername: username,
      });

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError('Gagal mempublish berita: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Success Screen ───────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{
        background: isDark ? '#1E130C' : '#FFF9F5',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: '"Nunito", "Inter", sans-serif',
        gap: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px', height: '80px',
          borderRadius: '50%',
          backgroundColor: '#EFF6FF',
          border: '3px solid #3B82F6',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <CheckCircle size={44} color="#3B82F6" />
        </div>
        <div>
          <h2 style={{ color: isDark ? '#FFFFFF' : '#1F2937', fontWeight: 900, fontSize: '1.6rem', margin: 0 }}>
            Berita Dipublish! 🎉
          </h2>
          <p style={{ color: isDark ? '#93C5FD' : '#3B82F6', fontWeight: 600, margin: '8px 0 0 0' }}>
            Berita berhasil ditambahkan ke website asrama
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '320px' }}>
          <button
            onClick={() => { setSuccess(false); setTitle(''); setKategori(''); setDeskripsi(''); handleRemoveImage(); }}
            style={{
              flex: 1, padding: '14px',
              backgroundColor: isDark ? '#2D1D13' : '#EFF6FF',
              color: '#3B82F6',
              border: '2px solid #3B82F6',
              borderRadius: '16px',
              fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 4px 0 #2563EB'
            }}
          >
            Buat Lagi
          </button>
          <button
            onClick={() => navigate('/home')}
            style={{
              flex: 1, padding: '14px',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: '2px solid #2563EB',
              borderRadius: '16px',
              fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 4px 0 #2563EB'
            }}
          >
            Ke Home
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
      fontFamily: '"Nunito", "Inter", sans-serif',
      maxWidth: '480px',
      margin: '0 auto',
      boxShadow: '0 0 20px rgba(0,0,0,0.05)',
      transition: 'background-color 0.3s ease'
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/home')}
          style={{
            background: isDark ? '#1A1F2E' : '#EFF6FF',
            border: `2px solid ${isDark ? '#2D3A5C' : '#BFDBFE'}`,
            borderRadius: '16px',
            padding: '10px',
            cursor: 'pointer',
            color: '#3B82F6',
            boxShadow: `0 4px 0 ${isDark ? '#2D3A5C' : '#BFDBFE'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.1s, box-shadow 0.1s',
            outline: 'none'
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = `0 2px 0 ${isDark ? '#2D3A5C' : '#BFDBFE'}`; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 0 ${isDark ? '#2D3A5C' : '#BFDBFE'}`; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 0 ${isDark ? '#2D3A5C' : '#BFDBFE'}`; }}
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3B82F6', margin: 0 }}>
            Buat Berita
          </h1>
          <p style={{ color: isDark ? '#93C5FD' : '#60A5FA', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
            Publish ke website asrama
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Info Box */}
        <div style={{
          backgroundColor: isDark ? '#1A1F2E' : '#EFF6FF',
          border: `2px solid ${isDark ? '#2D3A5C' : '#BFDBFE'}`,
          borderRadius: '20px',
          padding: '16px 20px',
          display: 'flex', gap: '12px',
          boxShadow: `0 4px 0 ${isDark ? '#2D3A5C' : '#BFDBFE'}`,
        }}>
          <Newspaper size={22} color="#3B82F6" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Info</span>
            <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#93C5FD' : '#1D4ED8', fontWeight: 600, lineHeight: 1.4 }}>
              Berita yang dipublish akan muncul di website asrama. Pastikan informasi sudah akurat sebelum submit.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5',
            borderRadius: '16px', padding: '16px',
            color: '#B91C1C', fontSize: '0.9rem', fontWeight: 600
          }}>
            {error}
          </div>
        )}

        {/* Input Card */}
        <div style={{
          backgroundColor: isDark ? '#1A1F2E' : '#FFFFFF',
          borderRadius: '24px', padding: '24px',
          border: `2px solid ${isDark ? '#2D3A5C' : '#BFDBFE'}`,
          boxShadow: `0 8px 0 ${isDark ? '#2D3A5C' : '#BFDBFE'}`,
          display: 'flex', flexDirection: 'column', gap: '20px',
          transition: 'all 0.3s ease'
        }}>

          {/* Judul */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle(isDark)}>Judul Berita</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Penghuni Asrama Raih Prestasi Nasional"
              required
              style={inputStyle(isDark)}
            />
          </div>

          {/* Kategori */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle(isDark)}>Kategori</label>
            <input
              type="text"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              placeholder="Contoh: Prestasi, Kegiatan, Pengumuman, Info"
              required
              style={inputStyle(isDark)}
            />
          </div>

          {/* Deskripsi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle(isDark)}>Deskripsi / Isi Berita</label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Tulis isi berita di sini..."
              required
              rows={6}
              style={{
                ...inputStyle(isDark),
                resize: 'vertical',
                minHeight: '140px',
                lineHeight: 1.6
              }}
            />
          </div>

          {/* Upload Gambar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle(isDark)}>Gambar Berita</label>

            {!imagePreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '32px 20px',
                  backgroundColor: isDark ? '#1E130C' : '#F8FAFC',
                  border: `2px dashed ${isDark ? '#2D3A5C' : '#93C5FD'}`,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s ease',
                  color: isDark ? '#93C5FD' : '#3B82F6',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDark ? '#1A1F2E' : '#EFF6FF';
                  e.currentTarget.style.borderColor = '#3B82F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDark ? '#1E130C' : '#F8FAFC';
                  e.currentTarget.style.borderColor = isDark ? '#2D3A5C' : '#93C5FD';
                }}
              >
                <ImagePlus size={36} strokeWidth={1.5} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem' }}>Pilih Gambar</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: isDark ? '#6B7280' : '#9CA3AF', fontWeight: 600 }}>
                    JPG, PNG, WEBP — maks. 5 MB
                  </p>
                </div>
              </button>
            ) : (
              <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: `2px solid ${isDark ? '#2D3A5C' : '#BFDBFE'}` }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block' }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    position: 'absolute', top: '8px', right: '8px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    border: 'none', borderRadius: '50%',
                    width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'white'
                  }}
                >
                  <X size={16} />
                </button>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  padding: '8px 12px'
                }}>
                  <p style={{ margin: 0, color: 'white', fontSize: '0.78rem', fontWeight: 700 }}>
                    {imageFile?.name}
                  </p>
                </div>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
          </div>

        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '16px',
            backgroundColor: loading ? '#93C5FD' : '#3B82F6',
            color: 'white', border: 'none', borderRadius: '20px',
            fontSize: '1.05rem', fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 6px 0 #2563EB',
            transition: 'transform 0.1s, box-shadow 0.1s, background-color 0.3s',
            outline: 'none', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            gap: '8px', marginTop: '8px'
          }}
          onMouseDown={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(6px)'; e.currentTarget.style.boxShadow = '0 0px 0 #2563EB'; } }}
          onMouseUp={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 0 #2563EB'; } }}
          onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 0 #2563EB'; } }}
        >
          {loading ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
              <span>Mempublish...</span>
            </>
          ) : (
            <>
              <Newspaper size={20} />
              <span>Publish Berita</span>
            </>
          )}
        </button>
      </form>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const labelStyle = (isDark) => ({
  fontSize: '0.95rem',
  fontWeight: 800,
  color: isDark ? '#E5E7EB' : '#374151'
});

const inputStyle = (isDark) => ({
  width: '100%',
  padding: '14px',
  borderRadius: '16px',
  border: `2px solid ${isDark ? '#2D3A5C' : '#BFDBFE'}`,
  fontSize: '0.95rem',
  outline: 'none',
  fontFamily: '"Nunito", "Inter", sans-serif',
  boxShadow: `0 4px 0 ${isDark ? '#2D3A5C' : '#BFDBFE'}`,
  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
  fontWeight: 650,
  color: isDark ? '#E5E7EB' : '#1F2937',
  transition: 'all 0.3s ease',
  boxSizing: 'border-box'
});

export default CreateBerita;
