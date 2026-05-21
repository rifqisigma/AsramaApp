import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Resend Verification state
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUnverifiedUser(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        setUnverifiedUser({ email, password });
        setError('Email belum terverifikasi. Silakan cek inbox/spam email Anda untuk verifikasi.');
        setLoading(false);
        return;
      }

      // Simpan timestamp untuk cache 15 hari
      localStorage.setItem('auth_timestamp', new Date().getTime().toString());
      navigate('/home');
    } catch (err) {
      setError('Email atau password salah. Silakan coba lagi.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedUser || cooldown > 0) return;
    
    setResending(true);
    try {
      // Re-authenticate silently to send verification email
      const userCredential = await signInWithEmailAndPassword(auth, unverifiedUser.email, unverifiedUser.password);
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      
      setCooldown(90); // 1.30 minutes (90 seconds)
      alert("Link verifikasi telah dikirim ulang! Silakan cek kotak masuk atau spam.");
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/too-many-requests') {
         alert("Terlalu banyak permintaan pengiriman email. Mohon tunggu beberapa saat lagi.");
      } else {
         alert("Gagal mengirim ulang link verifikasi. Coba lagi nanti.");
      }
    } finally {
      setResending(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Nunito", "Inter", sans-serif',
      padding: '24px'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        
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
            {unverifiedUser && (
              <button 
                type="button" 
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                style={{ 
                  marginTop: '12px', 
                  padding: '10px 16px', 
                  backgroundColor: cooldown > 0 ? '#E5E7EB' : '#F97316', 
                  color: cooldown > 0 ? '#9CA3AF' : 'white', 
                  border: 'none', 
                  borderRadius: '24px', 
                  cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  width: '100%',
                  transition: 'background-color 0.2s'
                }}
              >
                {resending ? 'Mengirim...' : cooldown > 0 ? `Kirim ulang dalam ${formatTime(cooldown)}` : 'Kirim Ulang Verifikasi'}
              </button>
            )}
          </div>
        )}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4B5563', marginBottom: '8px' }}>Email</label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Contoh: nama@email.com"
              required 
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #D1D5DB',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#F9FAFB',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#F97316'}
              onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
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
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #D1D5DB',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#F9FAFB',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#F97316'}
              onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
            />
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <Link to="/forgot-password" style={{ fontSize: '0.9rem', color: '#F97316', fontWeight: 700, textDecoration: 'none' }}>Lupa Password?</Link>
          </div>

          <button type="submit" disabled={loading} style={{
            marginTop: '12px',
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
          onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.95rem', color: '#6B7280', fontWeight: 600 }}>
          Belum punya akun?{' '}
          <Link to="/signup" style={{ color: '#F97316', fontWeight: 800, textDecoration: 'none' }}>Daftar sekarang</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
