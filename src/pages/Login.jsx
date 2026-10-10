import { useState } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';

const inputStyle = {
  width: '100%',
  padding: '16px',
  borderRadius: '16px',
  border: '1px solid #D1D5DB',
  fontSize: '1rem',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#F9FAFB',
  transition: 'border-color 0.2s'
};

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Kolom password untuk proses linking (menghubungkan Google ke akun password lama)
  const [linkEmail, setLinkEmail] = useState('');
  const [pendingCred, setPendingCred] = useState(null);

  // Tampilkan form email/password sebagai opsi cadangan
  const [showEmailForm, setShowEmailForm] = useState(false);

  const navigate = useNavigate();

  const hasUserDoc = async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists();
  };

  const finishLogin = () => {
    localStorage.setItem('auth_timestamp', new Date().getTime().toString());
    navigate('/home');
  };

  const beginLink = (cred, emailToLink) => {
    // Tandai agar App.jsx tidak langsung sign out saat proses linking berjalan
    localStorage.setItem('is_linking', 'true');
    setPendingCred(cred);
    setLinkEmail(emailToLink);
    setError('');
  };

  const resetLink = () => {
    localStorage.removeItem('is_linking');
    setPendingCred(null);
    setLinkEmail('');
    setError('');
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      const googleCred = GoogleAuthProvider.credentialFromResult(result);

      // uid sudah punya data → langsung masuk (akun sudah pernah di-link)
      if (await hasUserDoc(googleUser.uid)) {
        finishLogin();
        return;
      }

      // uid belum punya data: cek apakah email ini punya akun password lama untuk di-link
      let methods = [];
      try {
        methods = await fetchSignInMethodsForEmail(auth, googleUser.email);
      } catch {
        methods = [];
      }

      if (methods.includes('password')) {
        beginLink(googleCred, googleUser.email);
        setError('Email ini sudah terdaftar. Masukkan password akun lamamu sekali saja untuk menghubungkan ke Google.');
      } else {
        await signOut(auth);
        setError('Akun ini belum terdaftar di data asrama. Hubungi pengurus ya.');
      }
    } catch (err) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        const emailErr = err.customData?.email || '';
        const cred = GoogleAuthProvider.credentialFromError(err);
        beginLink(cred, emailErr);
        setError('Email ini sudah terdaftar. Masukkan password akun lamamu sekali saja untuk menghubungkan ke Google.');
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // dibatalkan oleh user, cukup diam
      } else {
        console.error(err);
        setError('Gagal masuk dengan Google. Coba lagi ya.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Hubungkan credential Google ke akun password lama (uid tetap sama)
  const handleLinkAccount = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Masukkan password akun lamamu.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, linkEmail, password);
      if (pendingCred) {
        try {
          await linkWithCredential(userCred.user, pendingCred);
        } catch (linkErr) {
          // Kalau ternyata sudah ter-link ke akun ini, abaikan saja
          if (linkErr.code !== 'auth/provider-already-linked') throw linkErr;
        }
      }
      localStorage.removeItem('is_linking');
      if (await hasUserDoc(userCred.user.uid)) {
        finishLogin();
      } else {
        await signOut(auth);
        setError('Akun ini belum terdaftar di data asrama.');
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Password salah. Coba lagi.');
      } else if (err.code === 'auth/credential-already-in-use') {
        setError('Akun Google ini sudah terhubung ke user lain.');
      } else {
        setError('Gagal menghubungkan akun. ' + (err.message || 'Coba lagi.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      if (await hasUserDoc(userCred.user.uid)) {
        finishLogin();
      } else {
        await signOut(auth);
        setError('Akun tidak terdaftar di database asrama.');
      }
    } catch (err) {
      console.error(err);
      setError('Email atau password salah. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const focusOrange = (e) => (e.target.style.borderColor = '#F97316');
  const blurGray = (e) => (e.target.style.borderColor = '#D1D5DB');

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Nunito", "Inter", sans-serif',
      padding: '24px'
    }}>
      <div className="page-shell-narrow" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '400px', margin: '0 auto', width: '100%' }}>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1C1C1E', marginBottom: '8px' }}>
          Selamat datang kembali
        </h1>
        <p style={{ fontSize: '1rem', color: '#6B7280', marginBottom: '32px', fontWeight: 600 }}>
          Masuk ke AsramaApp untuk melanjutkan
        </p>

        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            color: '#B91C1C',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {linkEmail ? (
          /* ===== Proses linking: password sekali pakai untuk menghubungkan ke Google ===== */
          <form onSubmit={handleLinkAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#4B5563', fontWeight: 600 }}>
              Menghubungkan <strong>{linkEmail}</strong> ke akun Google. Setelah ini kamu bisa masuk pakai Google.
            </p>
            <div>
              <label htmlFor="link-password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>Password akun lama</label>
              <input
                type="password"
                id="link-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password lamamu"
                style={inputStyle}
                onFocus={focusOrange}
                onBlur={blurGray}
              />
            </div>
            <button type="submit" disabled={loading} style={{
              padding: '16px',
              backgroundColor: loading ? '#FDBA74' : '#F97316',
              color: 'white',
              border: 'none',
              borderRadius: '32px',
              fontSize: '1.05rem',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)',
              transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => !loading && (e.target.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.target.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
            >
              {loading ? 'Menghubungkan...' : 'Hubungkan & Masuk'}
            </button>
            <button type="button" onClick={resetLink} style={{
              background: 'none',
              border: 'none',
              color: '#6B7280',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '4px'
            }}>
              Batal, kembali ke login Google
            </button>
          </form>
        ) : (
          <>
            {/* ===== Tombol utama: Masuk dengan Google ===== */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                padding: '16px',
                backgroundColor: '#FFFFFF',
                color: '#1C1C1E',
                border: '1.5px solid #D1D5DB',
                borderRadius: '32px',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'transform 0.1s, box-shadow 0.1s'
              }}
              onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <GoogleLogo />
              <span>{loading ? 'Memproses...' : 'Masuk dengan Google'}</span>
            </button>


            {/* ===== Opsi cadangan: email & password ===== */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
              <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 700 }}>atau</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
            </div>

            {!showEmailForm ? (
              <button
                type="button"
                onClick={() => { setShowEmailForm(true); setError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#F97316',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                Masuk dengan email &amp; password
              </button>
            ) : (
              <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label htmlFor="email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>Email</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Contoh: nama@email.com"
                    required
                    style={inputStyle}
                    onFocus={focusOrange}
                    onBlur={blurGray}
                  />
                </div>

                <div>
                  <label htmlFor="password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>Password</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password Anda"
                    required
                    style={inputStyle}
                    onFocus={focusOrange}
                    onBlur={blurGray}
                  />
                </div>

                <button type="submit" disabled={loading} style={{
                  padding: '16px',
                  backgroundColor: loading ? '#FDBA74' : '#F97316',
                  color: 'white',
                  border: 'none',
                  borderRadius: '32px',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  width: '100%',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)',
                  transition: 'transform 0.1s'
                }}
                onMouseDown={(e) => !loading && (e.target.style.transform = 'scale(0.98)')}
                onMouseUp={(e) => (e.target.style.transform = 'scale(1)')}
                onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                >
                  {loading ? 'Memproses...' : 'Masuk'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
