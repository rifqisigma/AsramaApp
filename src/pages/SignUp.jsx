import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';

const SignUp = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // State checks and access
  const [isAllowed, setIsAllowed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mode toggle: false = daftar baru, true = sinkronisasi (auth sudah ada)
  const [isSyncMode, setIsSyncMode] = useState(false);

  // Form Fields State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uid, setUid] = useState(''); // Hanya untuk mode sinkronisasi
  const [prodi, setProdi] = useState('');
  const [angkatan, setAngkatan] = useState('');
  const [nim, setNim] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [fotoProfil, setFotoProfil] = useState('https://firebasestorage.googleapis.com/v0/b/asrama-ipb-sukasari.firebasestorage.app/o/AsramaApp%2FphotoProfil%2Fpp_app.jpeg?alt=media&token=9948e9e5-ad8f-46d9-b881-c44b9be5e0c9');

  useEffect(() => {
    const checkAccess = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigate('/login');
        return;
      }
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists() && userSnap.data().jabatan === 'mediadigi') {
          setIsAllowed(true);
        } else {
          alert('Akses ditolak. Hanya jabatan mediadigi yang diizinkan untuk membuat akun.');
          navigate('/home');
        }
      } catch (err) {
        console.error('Error checking access:', err);
        navigate('/home');
      }
    };
    checkAccess();
  }, [navigate]);

  const handleToggleMode = (checked) => {
    setIsSyncMode(checked);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setUid('');
  };

  // ─── Mode Biasa: buat akun Auth + doc Firestore ───────────────────────────
  const handleSubmitNew = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);

    try {
      localStorage.setItem('is_signing_up', 'true');
      console.log("Mulai create user auth...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User auth berhasil dibuat:", userCredential.user.uid);

      const defaultFotoProfil = 'https://firebasestorage.googleapis.com/v0/b/asrama-ipb-sukasari.firebasestorage.app/o/AsramaApp%2FphotoProfil%2Fpp_app.jpeg?alt=media&token=9948e9e5-ad8f-46d9-b881-c44b9be5e0c9';

      const firestoreWritePromise = setDoc(doc(db, "users", userCredential.user.uid), {
        username: username.trim(),
        email: email.trim(),
        prodi: prodi.trim(),
        angkatan: parseInt(angkatan) || 62,
        nim: nim.trim(),
        jabatan: jabatan.trim() || 'penghuni',
        fotoProfil: fotoProfil.trim() || defaultFotoProfil,
        point: 110,
        createdAt: new Date()
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout saat menyimpan data ke Firestore. Pastikan Firestore sudah dibuat di console Firebase dan rules-nya diizinkan.")), 10000)
      );

      await Promise.race([firestoreWritePromise, timeoutPromise]);
      console.log("Biodata berhasil disimpan di Firestore.");

      await signOut(auth);
      console.log("Berhasil sign out.");

      alert("Pendaftaran berhasil! Akun penghuni baru telah dibuat.");
      navigate('/login');
    } catch (err) {
      console.error("Terjadi error di handleSubmit:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email sudah terdaftar. Jika akun sudah ada tapi belum ada data profil, aktifkan toggle di atas.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password terlalu lemah. Minimal 6 karakter.');
      } else {
        setError('Gagal memproses pendaftaran: ' + err.message);
      }
    } finally {
      localStorage.removeItem('is_signing_up');
      setLoading(false);
    }
  };

  // ─── Mode Sinkronisasi: hanya buat doc Firestore dari UID yang ada ────────
  const handleSubmitSync = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedUid = uid.trim();
    if (!trimmedUid) {
      setError('UID tidak boleh kosong.');
      return;
    }

    setLoading(true);

    try {
      // Cek apakah sudah ada doc users dengan UID ini
      const userDocRef = doc(db, 'users', trimmedUid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        setError('Data profil untuk UID ini sudah ada di Firestore. Tidak perlu sinkronisasi ulang.');
        setLoading(false);
        return;
      }

      // Buat doc Firestore dengan UID yang diberikan
      const defaultFotoProfil = 'https://firebasestorage.googleapis.com/v0/b/asrama-ipb-sukasari.firebasestorage.app/o/AsramaApp%2FphotoProfil%2Fpp_app.jpeg?alt=media&token=9948e9e5-ad8f-46d9-b881-c44b9be5e0c9';

      const firestoreWritePromise = setDoc(userDocRef, {
        username: username.trim(),
        email: email.trim(),
        prodi: prodi.trim(),
        angkatan: parseInt(angkatan) || 62,
        nim: nim.trim(),
        jabatan: jabatan.trim() || 'penghuni',
        fotoProfil: fotoProfil.trim() || defaultFotoProfil,
        point: 110,
        createdAt: new Date()
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout saat menyimpan data ke Firestore.")), 10000)
      );

      await Promise.race([firestoreWritePromise, timeoutPromise]);
      console.log("Sinkronisasi data berhasil untuk UID:", trimmedUid);

      alert("Sinkronisasi berhasil! Data profil penghuni telah ditambahkan ke Firestore.");
      // Reset form
      setUsername(''); setEmail(''); setUid('');
      setProdi(''); setAngkatan(''); setNim('');
      setJabatan('');
      setFotoProfil(defaultFotoProfil);
    } catch (err) {
      console.error("Terjadi error saat sinkronisasi:", err);
      setError('Gagal sinkronisasi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isAllowed === null) {
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
          <div style={{ fontSize: '2.5rem', marginBottom: '12px', animation: 'bounce 1s infinite' }}>👤</div>
          <span>Memeriksa Hak Akses...</span>
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
          onClick={() => navigate('/me')}
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
            Daftar Akun
          </h1>
          <p style={{ color: isDark ? '#FED7AA' : '#FB923C', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
            {isSyncMode ? 'Sinkronisasi data penghuni' : 'Buat akun penghuni asrama baru'}
          </p>
        </div>
      </div>

      {/* ─── Toggle Mode Sinkronisasi ─────────────────────────────────────── */}
      <div style={{
        backgroundColor: isSyncMode
          ? (isDark ? '#1C2A1E' : '#F0FDF4')
          : (isDark ? '#3D291C' : '#FFF7ED'),
        border: `2px solid ${isSyncMode
          ? (isDark ? '#166534' : '#BBF7D0')
          : (isDark ? '#4A2E1E' : '#FFEDD5')}`,
        borderRadius: '20px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: `0 4px 0 ${isSyncMode
          ? (isDark ? '#166534' : '#BBF7D0')
          : (isDark ? '#4A2E1E' : '#FFEDD5')}`,
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <RefreshCw
              size={20}
              color={isSyncMode ? '#16A34A' : '#F97316'}
              style={{ flexShrink: 0, marginTop: '2px', transition: 'color 0.3s' }}
            />
            <div>
              <p style={{
                margin: 0,
                fontWeight: 800,
                fontSize: '0.9rem',
                color: isSyncMode ? (isDark ? '#86EFAC' : '#15803D') : '#F97316',
                transition: 'color 0.3s'
              }}>
                Akun sudah ada, tapi belum ada data profil?
              </p>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '0.78rem',
                color: isDark ? '#9CA3AF' : '#6B7280',
                fontWeight: 600,
                lineHeight: 1.4
              }}>
                {isSyncMode
                  ? 'Mode sinkronisasi aktif — masukkan UID dari Firebase Auth'
                  : 'Aktifkan jika akun Auth sudah ada di project Firebase lain'}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={() => handleToggleMode(!isSyncMode)}
            style={{
              flexShrink: 0,
              width: '52px',
              height: '28px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: isSyncMode ? '#16A34A' : (isDark ? '#4A2E1E' : '#D1D5DB'),
              position: 'relative',
              transition: 'background-color 0.3s ease',
              outline: 'none',
              boxShadow: isSyncMode ? '0 0 0 3px rgba(22, 163, 74, 0.2)' : 'none'
            }}
          >
            <span style={{
              position: 'absolute',
              top: '3px',
              left: isSyncMode ? '27px' : '3px',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: 'white',
              transition: 'left 0.25s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
            }} />
          </button>
        </div>
      </div>

      <form
        onSubmit={isSyncMode ? handleSubmitSync : handleSubmitNew}
        style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        {/* Info Box */}
        {!isSyncMode && (
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
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pendaftaran Akun</span>
              <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#FED7AA' : '#7C2D12', fontWeight: 600, lineHeight: 1.4 }}>
                Poin awal penghuni diset otomatis ke <strong>110 Poin</strong>. Akun dapat langsung digunakan setelah terdaftar.
              </p>
            </div>
          </div>
        )}

        {/* Info Box Sync Mode */}
        {isSyncMode && (
          <div style={{
            backgroundColor: isDark ? '#1C2A1E' : '#F0FDF4',
            border: `2px solid ${isDark ? '#166534' : '#BBF7D0'}`,
            borderRadius: '20px',
            padding: '16px 20px',
            display: 'flex',
            gap: '12px',
            boxShadow: `0 4px 0 ${isDark ? '#166534' : '#BBF7D0'}`,
            transition: 'all 0.3s ease'
          }}>
            <RefreshCw size={22} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mode Sinkronisasi</span>
              <p style={{ margin: 0, fontSize: '0.85rem', color: isDark ? '#86EFAC' : '#166534', fontWeight: 600, lineHeight: 1.4 }}>
                Masukkan UID dari Firebase Authentication Console. Data profil akan dibuat di Firestore tanpa mengubah akun Auth yang sudah ada.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '16px',
            padding: '16px',
            color: '#B91C1C',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        {/* Input Card Container */}
        <div style={{
          backgroundColor: isDark ? '#2D1D13' : '#FFFFFF',
          borderRadius: '24px',
          padding: '24px',
          border: `2px solid ${isSyncMode ? (isDark ? '#166534' : '#BBF7D0') : (isDark ? '#4A2E1E' : '#FFEDD5')}`,
          boxShadow: `0 8px 0 ${isSyncMode ? (isDark ? '#166534' : '#BBF7D0') : (isDark ? '#4A2E1E' : '#FFEDD5')}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          transition: 'all 0.3s ease'
        }}>

          {/* UID — hanya tampil di mode sinkronisasi */}
          {isSyncMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
                UID Firebase Auth
              </label>
              <input
                type="text"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="Contoh: abc123XYZuid..."
                required
                style={inputStyle(isDark, true)}
              />
              <p style={{ margin: 0, fontSize: '0.75rem', color: isDark ? '#6B7280' : '#9CA3AF', fontWeight: 600 }}>
                Dapatkan UID dari Firebase Console → Authentication → Users
              </p>
            </div>
          )}

          {/* Username */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
              Username / Nama Panggilan
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: rifqi"
              required
              style={inputStyle(isDark)}
            />
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
              Email Akun
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Contoh: rifqiadlihernawan@gmail.com"
              required
              style={inputStyle(isDark)}
            />
          </div>

          {/* Password & Konfirmasi — hanya tampil di mode biasa */}
          {!isSyncMode && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Buat password (min. 6 karakter)"
                  required
                  minLength="6"
                  style={inputStyle(isDark)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
                  Konfirmasi Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  required
                  style={inputStyle(isDark)}
                />
              </div>
            </>
          )}

          {/* Prodi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
              Program Studi
            </label>
            <input
              type="text"
              value={prodi}
              onChange={(e) => setProdi(e.target.value)}
              placeholder="Contoh: tek"
              required
              style={inputStyle(isDark)}
            />
          </div>

          {/* Angkatan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
              Angkatan (Angka)
            </label>
            <input
              type="number"
              value={angkatan}
              onChange={(e) => setAngkatan(e.target.value)}
              placeholder="Contoh: 62"
              required
              style={inputStyle(isDark)}
            />
          </div>

          {/* NIM */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
              NIM
            </label>
            <input
              type="text"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              placeholder="Contoh: j0404251076"
              required
              style={inputStyle(isDark)}
            />
          </div>

          {/* Jabatan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
              Jabatan
            </label>
            <input
              type="text"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              placeholder="Contoh: mediadigi, kepenghunian, penghuni"
              required
              style={inputStyle(isDark)}
            />
          </div>

          {/* Foto Profil Link */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 800, color: isDark ? '#E5E7EB' : '#374151' }}>
              Link Foto Profil
            </label>
            <input
              type="url"
              value={fotoProfil}
              onChange={(e) => setFotoProfil(e.target.value)}
              placeholder="Masukkan link foto profil"
              style={inputStyle(isDark)}
            />
          </div>

        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: loading
              ? (isSyncMode ? '#86EFAC' : '#FED7AA')
              : (isSyncMode ? '#16A34A' : '#F97316'),
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            fontSize: '1.05rem',
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : `0 6px 0 ${isSyncMode ? '#166534' : '#D97706'}`,
            transition: 'transform 0.1s, box-shadow 0.1s, background-color 0.3s',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '8px'
          }}
          onMouseDown={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(6px)';
              e.currentTarget.style.boxShadow = `0 0px 0 ${isSyncMode ? '#166534' : '#D97706'}`;
            }
          }}
          onMouseUp={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = `0 6px 0 ${isSyncMode ? '#166534' : '#D97706'}`;
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = `0 6px 0 ${isSyncMode ? '#166534' : '#D97706'}`;
            }
          }}
        >
          {isSyncMode
            ? (loading ? 'Menyinkronkan...' : '🔄 Sinkronkan Data Penghuni')
            : (loading ? 'Mendaftarkan...' : 'Daftarkan Penghuni')
          }
        </button>
      </form>

      {/* Style for animations */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

    </div>
  );
};

const inputStyle = (isDark, isHighlight = false) => ({
  width: '100%',
  padding: '14px',
  borderRadius: '16px',
  border: `2px solid ${isHighlight
    ? (isDark ? '#166534' : '#86EFAC')
    : (isDark ? '#4A2E1E' : '#FFEDD5')}`,
  fontSize: '0.95rem',
  outline: 'none',
  fontFamily: '"Nunito", "Inter", sans-serif',
  boxShadow: `0 4px 0 ${isHighlight
    ? (isDark ? '#166534' : '#BBF7D0')
    : (isDark ? '#4A2E1E' : '#FFEDD5')}`,
  backgroundColor: isDark ? '#1E130C' : '#FFFFFF',
  fontWeight: 650,
  color: isDark ? '#E5E7EB' : '#1F2937',
  transition: 'all 0.3s ease',
  boxSizing: 'border-box'
});

export default SignUp;
