import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Cek apakah document user ada di Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userDocRef);
      
      if (!userSnap.exists()) {
        await signOut(auth);
        setError('Akun tidak terdaftar di database asrama.');
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
          
          <button type="submit" disabled={loading} style={{
            marginTop: '20px',
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
      </div>
    </div>
  );
};

export default Login;
